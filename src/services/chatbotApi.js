import { env } from '../config/env.js';

// Abort limits: 3 minutes while streaming, 2 minutes for a single JSON response.
const STREAM_TIMEOUT_MS = 180000;
const JSON_TIMEOUT_MS = 120000;

/**
 * Send a chat message.
 *
 * @param {string} message
 * @param {{ signal?: AbortSignal, conversationId?: string, stream?: boolean, onChunk?: (answer: string) => void }} options
 *   - stream: when true, reads an SSE stream and calls onChunk(accumulatedAnswer) on each token.
 *   - onChunk: called incrementally during streaming; not used in non-stream mode.
 * @returns {Promise<{ answer: string, conversationId?: string, disabled?: boolean }>}
 *   `disabled: true` means VITE_ENABLE_CHAT is off and no request was made.
 */
export async function sendChatMessage(message, { signal, conversationId, stream = false, onChunk } = {}) {
  // Backend switched off: make no network call, let the UI show a "not connected" notice.
  if (!env.chatEnabled) return { answer: '', conversationId, disabled: true };

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), stream ? STREAM_TIMEOUT_MS : JSON_TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

  try {
    const body = { message, request_id: crypto.randomUUID(), stream };
    if (conversationId) body.conversation_id = conversationId;
    const payload = JSON.stringify(body);

    const response = await fetch(`${env.apiBaseUrl}${env.apiPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Backend expects an API Gateway-style event with a string body.
      body: JSON.stringify({ body: payload }),
      signal: requestSignal,
    });

    if (!response.ok) throw new Error('Chat request failed');

    // ── SSE / streaming path ─────────────────────────────────────────────────
    if (stream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = '';
      let buffer = '';
      let finished = false;

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const chunk = line.slice(6);
          if (chunk === '[DONE]') { finished = true; break; }
          if (chunk === '[ERROR]') throw new Error('Chat request failed');
          if (chunk.startsWith('{')) {
            // JSON-wrapped token: {"token": "..."}
            try {
              const parsed = JSON.parse(chunk);
              if (typeof parsed.token === 'string') answer += parsed.token;
            } catch {
              answer += chunk;
            }
          } else {
            // Plain-text token
            answer += chunk;
          }
          if (onChunk) onChunk(answer);
        }
      }

      if (finished) await reader.cancel().catch(() => {});
      // conversation_id is not part of the stream; keep the one the caller holds.
      return { answer, conversationId };
    }

    // ── Standard JSON path ───────────────────────────────────────────────────
    let data = await response.json();
    if (env.lambdaInvoke) {
      if (data.statusCode !== 200) throw new Error('Chat request failed');
      data = JSON.parse(data.body);
    }
    if (typeof data.answer !== 'string') throw new Error('Invalid chat response');
    return { answer: data.answer, conversationId: data.conversation_id };

  } finally {
    window.clearTimeout(timeout);
  }
}
