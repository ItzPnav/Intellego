import React, { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

export default function MessageItem({ message, onToast, onRetry }) {
  const role = message.role || (message.sender === 'user' ? 'user' : 'assistant');
  const content = message.content ?? message.text ?? '';
  const { status, error } = message;
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'up' | 'down' | null
  const [retryActive, setRetryActive] = useState(false);

  const handleCopy = async () => {
    const textToCopy = error ? `Error [${error.code}]: ${error.detail}` : (content || '');
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      if (onToast) onToast('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (onToast) onToast('Failed to copy to clipboard');
    }
  };

  const handleFeedback = (type) => {
    setFeedback((prev) => (prev === type ? null : type));
    if (onToast) {
      onToast(feedback === type ? 'Feedback cleared' : `Marked as ${type === 'up' ? 'helpful' : 'not helpful'}`);
    }
  };

  const handleRetry = () => {
    setRetryActive(true);
    if (onRetry) onRetry(message);
    setTimeout(() => setRetryActive(false), 600);
  };

  if (role === 'user') {
    return (
      <div className="message-row user-row">
        <div className="user-bubble">
          <p className="user-bubble-text">{content}</p>
        </div>
      </div>
    );
  }

  // AI Message (Section 10.1 Rule 8: left-aligned, circular 28px avatar, no bubble)
  return (
    <div className="message-row ai-row">
      <div className="ai-avatar" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>

      <div className="ai-content-container">
        {/* Error Handling: Rendered inline using existing AI message styling, never raw stack trace */}
        {error ? (
          <div className="ai-error-message">
            <MarkdownRenderer
              content={`> **Agent Runtime Error (\`${error.code}\`)**\n>\n> ${error.detail}`}
            />
            <div className="message-action-bar" role="toolbar" aria-label="Error Actions">
              <button
                type="button"
                className={`action-btn ${retryActive ? 'active' : ''}`}
                onClick={handleRetry}
                aria-label="Retry response"
                title="Retry request"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>Retry</span>
              </button>

              <button
                type="button"
                className={`action-btn ${copied ? 'active' : ''}`}
                onClick={handleCopy}
                aria-label="Copy error to clipboard"
                title="Copy error details"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* State: Agent Thinking (Dots loader) */}
            {status === 'thinking' && (
              <div className="thinking-indicator" role="status" aria-label="Thinking">
                <span className="dots-loader">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
                <span className="thinking-label">Nemotron is reasoning...</span>
              </div>
            )}

            {/* State: Streaming (Partial text + blinking cursor) */}
            {status === 'streaming' && (
              <div className="streaming-container">
                <MarkdownRenderer content={content} />
                <span className="streaming-cursor" aria-hidden="true" />
              </div>
            )}

            {/* State: Complete Rendered Output */}
            {(!status || status === 'done') && (
              <>
                <MarkdownRenderer content={content} />

                {/* Message Action Bar (Rule 5) */}
                <div className="message-action-bar" role="toolbar" aria-label="Message Actions">
                  <button
                    type="button"
                    className={`action-btn ${copied ? 'active' : ''}`}
                    onClick={handleCopy}
                    aria-label="Copy to clipboard"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    className={`action-btn ${feedback === 'up' ? 'active-feedback' : ''}`}
                    onClick={() => handleFeedback('up')}
                    aria-label="Good response"
                    title="Helpful"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className={`action-btn ${feedback === 'down' ? 'active-feedback' : ''}`}
                    onClick={() => handleFeedback('down')}
                    aria-label="Bad response"
                    title="Not helpful"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className={`action-btn ${retryActive ? 'active' : ''}`}
                    onClick={handleRetry}
                    aria-label="Retry response"
                    title="Retry response"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    <span>Retry</span>
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
