import React from 'react';

export const HARDCODED_RECENTS = [];

export default function Sidebar({
  currentView,
  setCurrentView,
  onToast,
  activeWorkspace,
  onOpenSettings,
  recentSessions = [],
  onSelectChat
}) {
  const handleNewChat = () => {
    setCurrentView('welcome');
    if (onToast) onToast('Started new conversation');
  };

  const handleSelectRecent = (recent) => {
    if (onSelectChat) {
      onSelectChat(recent);
    } else {
      setCurrentView('chat');
    }
    if (onToast) onToast(`Opened "${recent.title}"`);
  };

  const workspaceName = activeWorkspace?.rootPath
    ? activeWorkspace.rootPath.split(/[\\/]/).filter(Boolean).pop()
    : 'No Workspace';

  return (
    <aside id="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="logo-badge" aria-hidden="true">
          <svg
            width="18"
            height="18"
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
        <h1 className="logo-text">Intellego</h1>
      </div>

      {/* Intellego Core Nav Items */}
      <nav className="sidebar-nav" aria-label="Main Navigation">
        <button
          type="button"
          className={`nav-item ${currentView === 'workspace' || currentView === 'project-detail' ? 'active' : ''}`}
          aria-label="Workspaces Manager"
          aria-current={currentView === 'workspace' || currentView === 'project-detail' ? 'page' : undefined}
          onClick={() => setCurrentView('workspace')}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span>Workspaces</span>
        </button>

        <button
          type="button"
          className={`nav-item ${currentView === 'git' || currentView === 'diff' ? 'active' : ''}`}
          aria-label="Diff and Git"
          aria-current={currentView === 'git' || currentView === 'diff' ? 'page' : undefined}
          onClick={() => setCurrentView('git')}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="6" y1="3" x2="6" y2="15" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M18 9a9 9 0 0 1-9 9" />
          </svg>
          <span>Diff / Git</span>
        </button>

        <button
          type="button"
          className={`nav-item ${currentView === 'graph' ? 'active' : ''}`}
          aria-label="Semantic Knowledge Graph"
          aria-current={currentView === 'graph' ? 'page' : undefined}
          onClick={() => {
            setCurrentView('graph');
            if (onToast) onToast('Opened System B Graph Explorer');
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="12" cy="18" r="3" />
            <line x1="8.5" y1="7.5" x2="15.5" y2="7.5" />
            <line x1="7.5" y1="8.5" x2="10.5" y2="15.5" />
            <line x1="16.5" y1="8.5" x2="13.5" y2="15.5" />
          </svg>
          <span>Graph</span>
        </button>

        <button
          type="button"
          className="nav-item"
          aria-label="Platform Settings"
          onClick={onOpenSettings}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Settings</span>
        </button>
      </nav>

      <div className="sidebar-divider" />

      {/* Recents Section */}
      <div className="sidebar-section">
        <span className="section-label">Recent Sessions</span>
        <div className="recents-list">
          {recentSessions.length > 0 ? (
            recentSessions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="recent-item-btn"
                onClick={() => handleSelectRecent(item)}
                title={item.title}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="recent-title">{item.title}</span>
              </button>
            ))
          ) : (
            <div className="empty-recents-text">No recent sessions</div>
          )}
        </div>
      </div>


      {/* Footer Profile: Show user profile and open settings on click */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="user-profile-pill"
          aria-label="User Profile & Settings"
          onClick={onOpenSettings}
          title="Open Settings"
        >
          <div className="user-avatar-placeholder" aria-hidden="true">
            <span className="user-avatar-initial">K</span>
          </div>
          <div className="user-details">
            <span className="user-name">Kattu</span>
            <span className="user-status">Settings</span>
          </div>
        </button>
      </div>
    </aside>
  );
}

