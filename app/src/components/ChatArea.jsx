import React, { useState } from 'react';
import ChatMode from './ChatMode';

export default function ChatArea({
  currentView,
  setCurrentView,
  messages,
  setMessages,
  onToast,
  activeWorkspace,
  pendingPrompt: externalPendingPrompt,
  onClearPendingPrompt: externalOnClearPendingPrompt
}) {
  const [welcomeInput, setWelcomeInput] = useState('');
  const [internalPendingPrompt, setInternalPendingPrompt] = useState(null);

  const activePendingPrompt = externalPendingPrompt || internalPendingPrompt;
  const handleClearPendingPrompt = () => {
    setInternalPendingPrompt(null);
    if (externalOnClearPendingPrompt) externalOnClearPendingPrompt();
  };

  const handleWelcomeSubmit = (e) => {
    e?.preventDefault();
    const trimmed = welcomeInput.trim();
    if (trimmed) {
      const newUserMsg = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed
      };
      setMessages((prev) => [...prev, newUserMsg]);
      setInternalPendingPrompt(trimmed);
      setWelcomeInput('');
    }
    // Switch from welcome view to chat-mode view
    setCurrentView('chat');
    if (onToast) onToast('Connecting to Agent Runtime...');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleWelcomeSubmit();
    }
  };

  return (
    <main id="chat-area">
      {currentView === 'welcome' ? (
        <div className="welcome-mode-wrapper">
          {/* Welcome Emblem & Title */}
          <div className="welcome-container">
            <div className="welcome-emblem" aria-hidden="true">
              <svg
                width="28"
                height="28"
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

            <h2 className="welcome-title">Intellego</h2>
            <p className="welcome-tagline">Native AI Software Engineering Platform</p>
            <p className="welcome-desc">
              Persistent Semantic Knowledge Graph · Diff-preview before apply · Local-first sidecar engine
            </p>

            <div className="welcome-actions-group">
              {!activeWorkspace?.rootPath && (
                <button
                  type="button"
                  className="view-chat-btn highlight-btn"
                  onClick={() => setCurrentView('workspace')}
                  title="Select and index a repository directory"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Open Workspace Folder</span>
                </button>
              )}

              <button
                type="button"
                className="view-chat-btn"
                onClick={() => setCurrentView('chat')}
                title="Inspect conversation and active Agent Runtime socket"
              >
                <span>Explore Active Chat Mode →</span>
              </button>
            </div>
          </div>

          {/* Welcome input bar with --radius-xl (20px) */}
          <div className="input-container">
            <form className="input-wrapper" onSubmit={handleWelcomeSubmit}>
              <input
                type="text"
                className="static-input-field"
                placeholder="Ask Nemotron about this workspace, explore symbols, or plan changes..."
                value={welcomeInput}
                onChange={(e) => setWelcomeInput(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Welcome chat input"
              />
              <button
                type="submit"
                className={`send-btn-static ${welcomeInput.trim() ? 'active' : ''}`}
                aria-label="Send Message and enter chat mode"
              >
                <svg
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
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      ) : (
        <ChatMode
          messages={messages}
          setMessages={setMessages}
          onToast={onToast}
          pendingPrompt={activePendingPrompt}
          onClearPendingPrompt={handleClearPendingPrompt}
        />
      )}
    </main>
  );
}
