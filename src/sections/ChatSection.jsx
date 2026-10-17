import { useEffect, useRef, useState } from 'react';
import { LoadingIndicator } from '../components/LoadingIndicator.jsx';
import { MarkdownMessage } from '../components/MarkdownMessage.jsx';

// Warning icon — shown beside error messages
const WarningIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="currentColor" style={{ flexShrink: 0, marginTop: 2 }}>
    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
  </svg>
);

// Info icon for the stream toggle tooltip
const InfoIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="currentColor" style={{ flexShrink: 0, display: 'block' }}>
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
  </svg>
);

export function ChatSection({ messages, input, loading, streaming, streamEnabled, onStreamToggle, error, failCount, lastMessage, onInputChange, onSubmit, onRetry }) {
  const [expanded, setExpanded] = useState(false);
  // Track which suggestions have been used and remove them
  const [suggestions, setSuggestions] = useState([]);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const hasSubmitted = useRef(false);

  // Fetch suggestions from public data
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/ask_me_suggestions.json`)
      .then(res => res.json())
      .then(data => setSuggestions(data))
      .catch(() => setSuggestions([]));
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, error]);

  // Keep input focused after every submit — but NOT on initial page load.
  // hasSubmitted flips to true the first time loading or streaming becomes true (i.e. a real submit).
  useEffect(() => {
    if (loading || streaming) { hasSubmitted.current = true; return; }
    if (hasSubmitted.current) inputRef.current?.focus();
  }, [loading, streaming]);

  function handleSuggestion(question) {
    setSuggestions(prev => prev.filter(s => s !== question));
    onSubmit(undefined, question);
  }

  return (
    <section id="chat" className="section morph-section">
      <div className="container">
        <div className="chat-layout">
          <div>
            <p className="eyebrow">04 / Ask about me</p>
            <h2>Have a question?</h2>
            <p className="muted">Ask about experience, projects, technologies, or how I think about building things.</p>
          </div>
          <div className={`chatbox${expanded ? ' expanded' : ''}`} aria-live="polite">
            <div className="chatbox-header">
              <span className="eyebrow">Conversation</span>
              <button className="chat-expand" type="button" onClick={() => setExpanded(c => !c)} aria-label={expanded ? 'Restore chat size' : 'Enlarge chat'} title={expanded ? 'minimize chat window' : 'Enlarge chat window'}>
                {expanded ? '↙' : '↗'}
              </button>
            </div>
            <div className="messages" ref={messagesRef}>
              {messages.length === 0 && <p className="empty-message">Ask a question or choose a suggestion below.</p>}
              {messages.map((message, index) => (
                message.role === 'notice' ? (
                  <div className="chat-notice" role="status" key={`notice-${index}`}>
                    <InfoIcon />
                    <span>{message.text}</span>
                  </div>
                ) : (
                  <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                    {message.role === 'assistant' ? <MarkdownMessage text={message.text} /> : message.text}
                  </div>
                )
              ))}
              {loading && <LoadingIndicator />}
              {error && (
                <div className={`error${failCount >= 3 ? ' error-persistent' : ''}`} role="alert">
                  <WarningIcon />
                  <span>{error}</span>
                  {failCount < 3 && (
                    <button className="retry" type="button" onClick={() => onRetry(lastMessage)}>Retry</button>
                  )}
                </div>
              )}
            </div>
            {suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map(question => (
                  <button
                    className="suggestion"
                    type="button"
                    key={question}
                    onClick={() => handleSuggestion(question)}
                    disabled={loading}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
            <div className="chat-toolbar">
              <div className="stream-toggle-wrap">
                <label className="stream-toggle-label" htmlFor="stream-toggle">
                  Live typing
                </label>
                <div
                  className="info-icon-wrap"
                  onMouseEnter={() => setTooltipVisible(true)}
                  onMouseLeave={() => setTooltipVisible(false)}
                  onClick={() => setTooltipVisible(v => !v)}
                  role="button"
                  tabIndex={0}
                  aria-label="About live typing"
                  onKeyDown={e => e.key === 'Enter' && setTooltipVisible(v => !v)}
                >
                  <InfoIcon />
                  {tooltipVisible && (
                    <div className="stream-tooltip" role="tooltip">
                      When enabled, the assistant's reply streams word-by-word as it's generated. Turn off to receive the full answer at once.
                    </div>
                  )}
                </div>
                <button
                  id="stream-toggle"
                  type="button"
                  role="switch"
                  aria-checked={streamEnabled}
                  className={`stream-switch${streamEnabled ? ' on' : ''}`}
                  onClick={onStreamToggle}
                  aria-label={`Live typing ${streamEnabled ? 'on' : 'off'}`}
                />
              </div>
            </div>
            <form onSubmit={onSubmit} className="chat-input">
              <input
                ref={inputRef}
                value={input}
                onChange={onInputChange}
                aria-label="Ask a question"
                placeholder="Ask a question..."
                disabled={loading || streaming}
              />
              <button className="send" disabled={loading || streaming || !input.trim()} aria-label="Send question">↑</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
