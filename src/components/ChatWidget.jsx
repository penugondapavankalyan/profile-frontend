import { useEffect, useState } from 'react';

export function ChatWidget() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const chat = document.getElementById('chat');
    if (!chat) return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0.2 });
    observer.observe(chat);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;
  return <button className="chat-widget" type="button" aria-label="Open profile chatbot" onClick={() => document.getElementById('chat')?.scrollIntoView({ behavior: 'smooth' })}><span className="chat-widget-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7a2.5 2.5 0 0 1-2.5 2.5H12l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 12.5z" /></svg></span><span className="chat-widget-label">Ask about me</span></button>;
}
