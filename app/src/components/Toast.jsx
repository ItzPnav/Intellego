import React from 'react';

/**
 * Toast notification per GEMINI.md Section 10.1 Rule 10:
 * Fixed bottom-right, --color-surface-3 background, --radius-md,
 * slide-in from right (translateX(20px) → 0, 300ms), auto-dismiss after 4s.
 */
export default function Toast({ message, visible, onClose }) {
  return (
    <aside
      id="toast"
      className={`toast-container ${visible ? 'toast-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <div className="toast-inner">
        <svg
          className="toast-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span className="toast-message">{message}</span>
      </div>

      <button
        type="button"
        className="toast-close-btn"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </aside>
  );
}
