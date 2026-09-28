import { useEffect, useRef, useState } from 'react';
import { LoadingIndicator } from '../components/LoadingIndicator.jsx';

export function ChatSection({ messages, input, loading, error, failCount, lastMessage, onInputChange, onSubmit, onRetry }) {
  const [expanded, setExpanded] = useState(false);
  // Track which suggestions have been used and remove them
  const [suggestions, setSuggestions] = useState([]);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const hasSubmitted = useRef(false);

  // Fetch suggestions from public data
  useEffect(() => {
    fetch('/data/ask_me_suggestions.json')
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
  // hasSubmitted flips to true the first time loading becomes true (i.e. a real submit).
  useEffect(() => {
    if (loading) { hasSubmitted.current = true; return; }
    if (hasSubmitted.current) inputRef.current?.focus();
  }, [loading]);

  function handleSuggestion(question) {
    setSuggestions(prev => prev.filter(s => s !== question));
    onSubmit(undefined, question);
  }

  // Warning icon — shown beside error messages
  const WarningIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="currentColor" style={{ flexShrink: 0, marginTop: 2 }}>
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );

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
                <div className={`message ${message.role}`} key={`${message.role}-${index}`}>{message.text}</div>
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
            <form onSubmit={onSubmit} className="chat-input">
              <input
                ref={inputRef}
                value={input}
                onChange={onInputChange}
                aria-label="Ask a question"
                placeholder="Ask a question..."
                disabled={loading}
              />
              <button className="send" disabled={loading || !input.trim()} aria-label="Send question">↑</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
