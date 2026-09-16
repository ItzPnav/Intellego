import React from 'react';

export default function TopHeader({
  currentView,
  setCurrentView,
  onToast,
  activeWorkspace,
  onOpenSettings
}) {
  const handleModelClick = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else if (onToast) {
      onToast('Nemotron is the sole V1 LLM provider (GEMINI.md Section 6)');
    }
  };

  const workspaceName = activeWorkspace?.rootPath
    ? activeWorkspace.rootPath.split(/[\\/]/).filter(Boolean).pop()
    : null;

  return (
    <header id="top-header">
      <div className="header-left">
        {/* Mobile drawer toggle */}
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label="Toggle Sidebar Menu"
          onClick={() => {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            sidebar?.classList.toggle('open');
            overlay?.classList.toggle('open');
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
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Status indicator / Navigation */}
        <div className="status-indicator-group">
          {currentView === 'chat' ? (
            <button
              type="button"
              className="header-back-btn"
              onClick={() => setCurrentView('project-detail')}
              title="Return to Project details and recents"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back to Project</span>
            </button>
          ) : activeWorkspace?.state === 'INDEXING' ? (
            <span className="status-text loading-accent">
              <span className="pulsing-dot" /> Indexing AST Symbols...
            </span>
          ) : (
            <span
              className="status-text clickable-ws"
              onClick={() => setCurrentView('workspace')}
              title="Click to view all projects"
            >
              Projects: <strong>{workspaceName || 'Select'}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="header-right">
        {/* View Switcher Pill */}
        <button
          type="button"
          className="view-toggle-pill"
          onClick={() => setCurrentView(currentView === 'welcome' ? 'chat' : 'welcome')}
          title="Toggle between Welcome View and Chat Mode"
        >
          <span>{currentView === 'welcome' ? 'Chat View' : 'Welcome View'}</span>
        </button>

        {/* Sole V1 Model Selector — NVIDIA Nemotron */}
        <button
          type="button"
          className="model-selector-pill"
          onClick={handleModelClick}
          aria-label="Model Selector: Nemotron"
          title="NVIDIA Nemotron (Sole V1 LLM Provider — Click for Settings & Guardrails)"
        >
          <span className="model-dot" aria-hidden="true" />
          <span className="model-name">Nemotron</span>
          <svg
            className="chevron-icon"
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
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </header>
  );
}

