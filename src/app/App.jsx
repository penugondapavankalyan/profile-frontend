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
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastMessage, setLastMessage] = useState('');
  const [failCount, setFailCount] = useState(0);
  const conversationId = useRef(crypto.randomUUID());
  const requestController = useRef(null);

  useEffect(() => () => requestController.current?.abort(), []);
  async function submitMessage(event, candidate = input) {
    event?.preventDefault();
    const message = candidate.trim();
    if (!message || loading) return;
    setInput(''); setError(''); setLoading(true); setLastMessage(message);
    setMessages(current => [...current, { role: 'user', text: message }]);
    requestController.current = new AbortController();
    try {
      const answer = await sendChatMessage(message, { signal: requestController.current.signal, conversationId: conversationId.current });
      setMessages(current => [...current, { role: 'assistant', text: answer }]);
      setFailCount(0);
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
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
    }
  }

  return <div className={theme}>
    <SiteHeader activeSection={activeSection} theme={theme} toggleTheme={toggleTheme} />
    <main>
      <ProfileSection />
      <ProfileInformationSection />
      <ProjectsSection />
      <ChatSection messages={messages} input={input} loading={loading} error={error} failCount={failCount} lastMessage={lastMessage} onInputChange={event => setInput(event.target.value)} onSubmit={submitMessage} onRetry={message => submitMessage(undefined, message)} />
      <ExperienceSection />
      <ContactSection />
    </main><ChatWidget/><a className="back-to-top-btn button" href="#profile">↑</a><footer className="container footer"><span>© 2026 {env.profileName}</span><span>Built with curiosity</span></footer>
  </div>;
}

function ThemeIcon({ theme }) {
  return <span className={`theme-icon ${theme}`} aria-hidden="true">{theme === 'dark' ? <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="5"/><path d="M16 2v5M16 25v5M2 16h5M25 16h5M6.1 6.1l3.5 3.5M22.4 22.4l3.5 3.5M25.9 6.1l-3.5 3.5M9.6 22.4l-3.5 3.5" /></svg> : <svg viewBox="0 0 32 32"><path d="M22.5 5.5A11 11 0 1 0 26.5 24 10 10 0 0 1 22.5 5.5Z" /></svg>}</span>;
}

export default App;
