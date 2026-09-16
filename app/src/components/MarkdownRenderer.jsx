import React from 'react';

/**
 * Parses inline markdown: bold, italic, code, links.
 */
function parseInline(text) {
  // Regex to match inline tokens: links, bold, italic, inline code
  const tokens = [];
  const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const label = token.slice(1, token.indexOf(']('));
      const url = token.slice(token.indexOf('](') + 2, -1);
      tokens.push(
        <a key={match.index} href={url} className="ai-markdown-link" target="_blank" rel="noreferrer">
          {label}
        </a>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code key={match.index} className="ai-inline-code">
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.substring(lastIndex));
  }

  return tokens.length > 0 ? tokens : text;
}

/**
 * Lightweight React Markdown renderer conforming to GEMINI.md Section 10.1:
 * Rule 9: Code blocks inside AI text: --color-surface-2 bg, 1px solid var(--color-border-light),
 * --radius-md, monospace 13px, language label top-right in --color-text-muted.
 * Rule 4: Links inside AI text use --color-accent.
 */
export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  // Split by fenced code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="ai-markdown-body">
      {parts.map((part, partIdx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineBreak = part.indexOf('\n');
          let lang = 'code';
          let code = '';
          if (firstLineBreak !== -1) {
            lang = part.slice(3, firstLineBreak).trim() || 'code';
            code = part.slice(firstLineBreak + 1, -3);
          } else {
            code = part.slice(3, -3);
          }

          return (
            <div key={partIdx} className="ai-code-block-wrapper">
              <div className="ai-code-block-header">
                <span className="ai-code-lang">{lang}</span>
              </div>
              <pre className="ai-code-block">
                <code>{code.replace(/\n$/, '')}</code>
              </pre>
            </div>
          );
        }

        // Process line-by-line for headings, lists, blockquotes, paragraphs
        const lines = part.split('\n');
        const elements = [];
        let listItems = [];
        let listType = null; // 'ul' or 'ol'

        const flushList = (key) => {
          if (listItems.length > 0) {
            if (listType === 'ol') {
              elements.push(
                <ol key={`ol-${key}`} className="ai-ordered-list">
                  {listItems.map((item, idx) => (
                    <li key={idx}>{parseInline(item)}</li>
                  ))}
                </ol>
              );
            } else {
              elements.push(
                <ul key={`ul-${key}`} className="ai-unordered-list">
                  {listItems.map((item, idx) => (
                    <li key={idx}>{parseInline(item)}</li>
                  ))}
                </ul>
              );
            }
            listItems = [];
            listType = null;
          }
        };

        lines.forEach((line, lineIdx) => {
          const trimmed = line.trim();

          if (!trimmed) {
            flushList(lineIdx);
            return;
          }

          // Ordered list (1. item)
          const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (olMatch) {
            if (listType !== 'ol') flushList(lineIdx);
            listType = 'ol';
            listItems.push(olMatch[2]);
            return;
          }

          // Unordered list (- item or * item)
          const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
          if (ulMatch) {
            if (listType !== 'ul') flushList(lineIdx);
            listType = 'ul';
            listItems.push(ulMatch[1]);
            return;
          }

          flushList(lineIdx);

          // Headings
          if (trimmed.startsWith('### ')) {
            elements.push(
              <h4 key={lineIdx} className="ai-heading-3">
                {parseInline(trimmed.slice(4))}
              </h4>
            );
          } else if (trimmed.startsWith('## ')) {
            elements.push(
              <h3 key={lineIdx} className="ai-heading-2">
                {parseInline(trimmed.slice(3))}
              </h3>
            );
          } else if (trimmed.startsWith('# ')) {
            elements.push(
              <h2 key={lineIdx} className="ai-heading-1">
                {parseInline(trimmed.slice(2))}
              </h2>
            );
          } else if (trimmed.startsWith('> ')) {
            elements.push(
              <blockquote key={lineIdx} className="ai-blockquote">
                {parseInline(trimmed.slice(2))}
              </blockquote>
            );
          } else {
            elements.push(
              <p key={lineIdx} className="ai-paragraph">
                {parseInline(trimmed)}
              </p>
            );
          }
        });

        flushList('final');
        return <React.Fragment key={partIdx}>{elements}</React.Fragment>;
      })}
    </div>
  );
}
