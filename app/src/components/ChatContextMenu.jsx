import React, { useState, useEffect, useRef } from 'react';

export default function ChatContextMenu({
  chat,
  currentProjectId,
  projects,
  position,
  onClose,
  onPin,
  onRename,
  onMoveToProject,
  onRemoveFromProject,
  onDelete,
  onStartNewProject
}) {
  const [showFlyout, setShowFlyout] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const menuRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  // Keyboard shortcut listener (P, R, D)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key.toLowerCase() === 'p' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        onPin(chat);
        onClose();
      } else if (e.key.toLowerCase() === 'r' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        onRename(chat);
        onClose();
      } else if (e.key.toLowerCase() === 'd' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        onDelete(chat);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chat, onPin, onRename, onDelete, onClose]);

  const filteredProjects = projects.filter((p) =>
    (p.name || '').toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <div
      ref={menuRef}
      className="chat-context-menu"
      style={{
        top: position?.y ?? 0,
        left: position?.x ?? 0
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Pin */}
      <button
        type="button"
        className="context-menu-item"
        onClick={() => {
          onPin(chat);
          onClose();
        }}
      >
        <span className="menu-item-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="17" x2="12" y2="22" />
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
          </svg>
          <span>{chat.pinned ? 'Unpin' : 'Pin'}</span>
        </span>
        <span className="menu-item-shortcut">P</span>
      </button>

      {/* 2. Rename */}
      <button
        type="button"
        className="context-menu-item"
        onClick={() => {
          onRename(chat);
          onClose();
        }}
      >
        <span className="menu-item-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
          <span>Rename</span>
        </span>
        <span className="menu-item-shortcut">R</span>
      </button>

      {/* 3. Change project (cascading flyout) */}
      <div
        className="context-menu-item-wrapper"
        onMouseEnter={() => setShowFlyout(true)}
        onMouseLeave={() => setShowFlyout(false)}
      >
        <button
          type="button"
          className="context-menu-item"
          onClick={() => setShowFlyout((prev) => !prev)}
        >
          <span className="menu-item-left">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <span>Change project</span>
          </span>
          <span className="menu-item-arrow">›</span>
        </button>

        {showFlyout && (
          <div className="context-menu-flyout">
            <div className="flyout-search-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search or create a project"
                className="flyout-search-input"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flyout-project-list">
              {filteredProjects.map((p) => {
                const isCurrent = p.id === currentProjectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`flyout-project-row ${isCurrent ? 'active' : ''}`}
                    onClick={() => {
                      if (!isCurrent) {
                        onMoveToProject(chat, p.id);
                      }
                      onClose();
                    }}
                  >
                    <span className="flyout-project-name">{p.name}</span>
                    {isCurrent && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flyout-divider" />

            <button
              type="button"
              className="flyout-new-project-btn"
              onClick={() => {
                onClose();
                if (onStartNewProject) onStartNewProject();
              }}
            >
              <span className="flyout-plus-icon">+</span>
              <span>Start a new project</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Remove from project */}
      <button
        type="button"
        className="context-menu-item"
        onClick={() => {
          onRemoveFromProject(chat);
          onClose();
        }}
      >
        <span className="menu-item-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Remove from project</span>
        </span>
      </button>

      {/* 5. Delete (Red) */}
      <button
        type="button"
        className="context-menu-item item-danger"
        onClick={() => {
          onDelete(chat);
          onClose();
        }}
      >
        <span className="menu-item-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span>Delete</span>
        </span>
        <span className="menu-item-shortcut">D</span>
      </button>
    </div>
  );
}
