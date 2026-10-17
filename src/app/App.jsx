import { useEffect, useRef, useState } from 'react';
import { env } from '../config/env.js';
import { sendChatMessage } from '../services/chatbotApi.js';
import { useActiveSection } from '../hooks/useActiveSection.js';
import { useScrollTransition } from '../hooks/useScrollTransition.js';
import { useTheme } from '../hooks/useTheme.js';
import { ChatWidget } from '../components/ChatWidget.jsx';
import { ChatSection } from '../sections/ChatSection.jsx';
import { ContactSection } from '../sections/ContactSection.jsx';
import { ExperienceSection } from '../sections/ExperienceSection.jsx';
import { ProfileInformationSection, ProfileSection } from '../sections/ProfileSections.jsx';
import { ProjectsSection } from '../sections/ProjectsSection.jsx';

const sections = [
  ['profile', 'Profile'], ['profile-information', 'Information'], ['projects', 'Projects'],
  ['chat', 'Chat'], ['experience', 'Experience'], ['contact', 'Contact']
];

const CHAT_ID_KEY = 'chat.conversationId';
const CHAT_MESSAGES_KEY = 'chat.messages';
const BACKEND_DISABLED_NOTICE = "Thank you for your question! The assistant isn't connected to a backend right now, so I can't answer it yet.";

// sessionStorage keeps the chat across refreshes but is cleared when the tab closes.
function readSession(key, fallback) {
  try {
    const value = window.sessionStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeSession(key, value) {
  try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked or full */ }
}

function SiteHeader({ activeSection, theme, toggleTheme }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <header className={`site-header${collapsed ? ' site-header-collapsed' : ''}`}>
      {/* Brand: P circle (collapse toggle) + name (navigate to top) — separate elements */}
      <div className="brand">
        <button
          className={`mark${collapsed ? ' mark-expanded' : ''}`}
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!collapsed}
        >
          {env.profileName[0]}
        </button>
        <a className="brand-name" href="#profile">{env.profileName}</a>
      </div>

      <nav
        className={`primary-nav${collapsed ? ' nav-collapsed' : ''}`}
        aria-label="Primary navigation"
        aria-hidden={collapsed}
      >
        {sections.map(([id, label]) => (
          <a className={activeSection === id ? 'active' : ''} href={`#${id}`} key={id}>{label}</a>
        ))}
      </nav>

      <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
        <ThemeIcon theme={theme} />
      </button>
    </header>
  );
}

function App() {
  const activeSection = useActiveSection(sections.map(([id]) => id));
  const { theme, toggleTheme } = useTheme();
  useScrollTransition();
  useEffect(() => { document.title = env.profileName; }, []);
  const [messages, setMessages] = useState(() => {
    const stored = readSession(CHAT_MESSAGES_KEY, []);
    return Array.isArray(stored) ? stored : [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false); // true while SSE chunks are arriving
  const [streamEnabled, setStreamEnabled] = useState(true); // user toggle: default ON
  const [error, setError] = useState('');
  const [lastMessage, setLastMessage] = useState('');
  const [failCount, setFailCount] = useState(0);
  const conversationId = useRef(readSession(CHAT_ID_KEY, null));
  const requestController = useRef(null);

  useEffect(() => () => requestController.current?.abort(), []);
  useEffect(() => { writeSession(CHAT_MESSAGES_KEY, messages); }, [messages]);

  async function submitMessage(event, candidate = input) {
    event?.preventDefault();
    const message = candidate.trim();
    if (!message || loading) return;
    setInput(''); setError(''); setLoading(true); setLastMessage(message);
    setMessages(current => [...current, { role: 'user', text: message }]);
    requestController.current = new AbortController();

    try {
      if (streamEnabled) {
        // Keep loading dots visible until the first token arrives, then
        // swap them out for the assistant bubble and stream into it.
        let firstChunk = true;

        const { answer, conversationId: id, disabled } = await sendChatMessage(message, {
          signal: requestController.current.signal,
          conversationId: conversationId.current,
          stream: true,
          onChunk: (accumulated) => {
            if (firstChunk) {
              firstChunk = false;
              // First token: hide loading dots, create the bubble, start streaming
              setLoading(false);
              setStreaming(true);
              setMessages(current => [...current, { role: 'assistant', text: accumulated, streaming: true }]);
            } else {
              // Subsequent tokens: update text in-place
              setMessages(current => {
                const copy = [...current];
                const last = copy[copy.length - 1];
                if (last?.role === 'assistant' && last?.streaming) {
                  copy[copy.length - 1] = { ...last, text: accumulated };
                }
                return copy;
              });
            }
          },
        });

        if (disabled) {
          setMessages(current => [...current, { role: 'notice', text: BACKEND_DISABLED_NOTICE }]);
          return;
        }

        // Finalise: strip the streaming flag
        setMessages(current => {
          const copy = [...current];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant') copy[copy.length - 1] = { role: 'assistant', text: answer };
          return copy;
        });

        if (id && id !== conversationId.current) {
          conversationId.current = id;
          writeSession(CHAT_ID_KEY, id);
        }
        setFailCount(0);
      } else {
        // Non-streaming: existing behaviour
        const { answer, conversationId: id, disabled } = await sendChatMessage(message, {
          signal: requestController.current.signal,
          conversationId: conversationId.current,
          stream: false,
        });
        if (disabled) {
          setMessages(current => [...current, { role: 'notice', text: BACKEND_DISABLED_NOTICE }]);
          return;
        }
        if (id && id !== conversationId.current) {
          conversationId.current = id;
          writeSession(CHAT_ID_KEY, id);
        }
        setMessages(current => [...current, { role: 'assistant', text: answer }]);
        setFailCount(0);
      }
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        // Remove the empty streaming bubble if one was added
        setMessages(current => {
          const last = current[current.length - 1];
          return last?.role === 'assistant' && last?.streaming ? current.slice(0, -1) : current;
        });
        setFailCount(n => {
          const next = n + 1;
          setError(next >= 3
            ? 'Unable to reach the service. Please try again after some time.'
            : 'Unable to reach the service at the moment. Please try again.');
          return next;
        });
      }
    } finally {
      requestController.current = null;
      setLoading(false);
      setStreaming(false);
    }
  }

  return <div className={theme}>
    <SiteHeader activeSection={activeSection} theme={theme} toggleTheme={toggleTheme} />
    <main>
      <ProfileSection />
      <ProfileInformationSection />
      <ProjectsSection />
      <ChatSection messages={messages} input={input} loading={loading} streaming={streaming} streamEnabled={streamEnabled} onStreamToggle={() => setStreamEnabled(v => !v)} error={error} failCount={failCount} lastMessage={lastMessage} onInputChange={event => setInput(event.target.value)} onSubmit={submitMessage} onRetry={message => submitMessage(undefined, message)} />
      <ExperienceSection />
      <ContactSection />
    </main><ChatWidget/><a className="back-to-top-btn button" href="#profile">↑</a><footer className="container footer"><span>© 2026 {env.profileName}</span><span>Built with curiosity</span></footer>
  </div>;
}

function ThemeIcon({ theme }) {
  return <span className={`theme-icon ${theme}`} aria-hidden="true">{theme === 'dark' ? <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="5"/><path d="M16 2v5M16 25v5M2 16h5M25 16h5M6.1 6.1l3.5 3.5M22.4 22.4l3.5 3.5M25.9 6.1l-3.5 3.5M9.6 22.4l-3.5 3.5" /></svg> : <svg viewBox="0 0 32 32"><path d="M22.5 5.5A11 11 0 1 0 26.5 24 10 10 0 0 1 22.5 5.5Z" /></svg>}</span>;
}

export default App;
