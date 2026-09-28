import { useEffect } from 'react';

// Two CSS variables per .morph-section, updated every scroll frame:
//
//   --card-enter  1→0   plays while the section is scrolling IN from below
//                        (from when its top hits the viewport bottom, until
//                         its top reaches the viewport top)
//                        0 = section top is at or above the viewport top → fully visible
//
//   --card-exit   0→1   plays while the section is scrolling OUT at the top
//                        (from when its bottom starts leaving the top of the viewport)
//                        0 = section still occupies the viewport → fully visible
//
// Result: every section is at full opacity/scale while it fills the viewport.
// The morph effect is only visible during the brief overlap — when one section
// is sliding in from below or sliding out at the top.

export function useScrollTransition() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = () => Array.from(document.querySelectorAll('.morph-section'));

    if (reduce) {
      els().forEach(el => {
        el.style.setProperty('--card-enter', '0');
        el.style.setProperty('--card-exit',  '0');
      });
      return;
    }

    // Same clearance used by scroll-margin-top in CSS — keeps section heading
    // clear of the fixed nav bar when the enter transition completes.
    const NAV = 110;

    const update = () => {
      const vh = window.innerHeight;
      const atBottom = window.scrollY + vh >= document.documentElement.scrollHeight - 2;
      const all = els();
      all.forEach((el, i) => {
        const { top, bottom } = el.getBoundingClientRect();

        // --card-enter: 1 when section top is at viewport bottom, 0 once the
        // section top has risen past the nav bar (top <= NAV).
        // Travel window = (vh * 0.45), measured from viewport bottom down to NAV.
        // Last section at page bottom: force 0 so it's always fully visible.
        const isFirst = i === 0;
        const isLast  = i === all.length - 1;

        // Hero (first) section: never apply enter transition — it is the landing
        // view and must be fully visible at scroll position 0, regardless of zoom
        // level or viewport height. Only the exit transition applies to it.
        const enter = (isFirst || (isLast && atBottom))
          ? 0
          : Math.max(0, Math.min(1, (top - NAV) / (vh * 0.45 - NAV)));

        // --card-exit: plays over the top 45% of the viewport.
        // 0 while section bottom is still visible, 1 when 45vh above fold.
        const exit = Math.max(0, Math.min(1, -bottom / (vh * 0.45)));

        el.style.setProperty('--card-enter', enter.toFixed(4));
        el.style.setProperty('--card-exit',  exit.toFixed(4));
      });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
}
