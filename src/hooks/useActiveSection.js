import { useEffect, useState } from 'react';

export function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id);
    }), { rootMargin: '-35% 0px -55% 0px' });
    ids.map(id => document.getElementById(id)).filter(Boolean).forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [ids]);
  return active;
}
