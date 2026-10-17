import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// LLM output is untrusted: parse markdown, then sanitize before injecting HTML.
export function MarkdownMessage({ text }) {
  const html = useMemo(() => {
    const raw = marked.parse(text, { gfm: true, breaks: true, async: false });
    // Wrap tables so wide ones scroll horizontally inside the bubble instead of overflowing it.
    const wrapped = raw
      .replace(/<table/g, '<div class="table-wrap"><table')
      .replace(/<\/table>/g, '</table></div>');
    return DOMPurify.sanitize(wrapped);
  }, [text]);
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
