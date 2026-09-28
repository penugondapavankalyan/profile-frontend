import { env } from '../config/env.js';

const developmentAnswer = message => `Thanks for asking about “${message}”. The profile chatbot is being connected, but this local preview can still demonstrate the conversation flow.`;

export async function sendChatMessage(message, { signal, conversationId } = {}) {
  if (env.appEnvironment === 'development' && !env.apiBaseUrl) return developmentAnswer(message);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  const requestSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  try {
    const response = await fetch(`${env.apiBaseUrl}${env.apiPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationId, requestId: crypto.randomUUID() }),
      signal: requestSignal
    });
    if (!response.ok) throw new Error('Chat request failed');
    const data = await response.json();
    if (typeof data.answer !== 'string') throw new Error('Invalid chat response');
    return data.answer;
  } catch (error) {
    if (env.appEnvironment === 'development' && error.name !== 'AbortError') return developmentAnswer(message);
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
