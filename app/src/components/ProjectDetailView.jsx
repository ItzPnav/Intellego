import React, { useState } from 'react';
import ChatContextMenu from './ChatContextMenu';

export default function ProjectDetailView({
  project,
  allProjects,
  onBack,
  onOpenChat,
  onNewChatWithPrompt,
  onUpdateProject,
  onMoveChat,
  onDeleteChat,
  onStartNewProject,
  onToast
}) {
  const [promptInput, setPromptInput] = useState('');
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'cowork'
  const [activeMenuChat, setActiveMenuChat] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [chatToDelete, setChatToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!project) return null;

  const handlePromptSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!promptInput.trim() || isSubmitting) return;

    const query = promptInput.trim();
    setPromptInput('');
    setIsSubmitting(true);
    try {
      await onNewChatWithPrompt(query);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePromptSubmit();
    }
  };

  const handleOpenMenu = (e, chat) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: Math.min(rect.right - 180, window.innerWidth - 220),
      y: rect.bottom + 6
    });
    setActiveMenuChat(chat);
  };

  const handlePinChat = (chat) => {
    if (onUpdateProject) {
      const chats = (project.chats || []).map((c) =>
        c.id === chat.id ? { ...c, pinned: !c.pinned } : c
      );
      onUpdateProject({ ...project, chats });
      if (onToast) onToast(chat.pinned ? 'Chat unpinned' : 'Chat pinned');
    }
  };

  const handleRenameChat = (chat) => {
    const newTitle = window.prompt('Rename chat:', chat.title);
    if (newTitle && newTitle.trim()) {
      const chats = (project.chats || []).map((c) =>
        c.id === chat.id ? { ...c, title: newTitle.trim() } : c
      );
      onUpdateProject({ ...project, chats });
      if (onToast) onToast('Chat renamed');
    }
  };

  const handleRemoveFromProject = (chat) => {
    onDeleteChat(project.id, chat.id);
    if (onToast) onToast('Removed from project');
  };

  const handleDelete = (chat) => {
    setChatToDelete(chat);
  };

  const handleToggleProjectPin = () => {
    const newPinned = !project.pinned;
    onUpdateProject({ ...project, pinned: newPinned });
    if (onToast) onToast(newPinned ? 'Project pinned' : 'Project unpinned');
  };

  const rawChats = project.chats || [];
  const chats = [...rawChats].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <div className="project-detail-container" id="project-detail-view">
      {/* Top Breadcrumb Navigation */}
      <nav className="project-breadcrumb" aria-label="Breadcrumb">
        <button
          type="button"
          className="breadcrumb-link"
          onClick={onBack}
        >
          Projects
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{project.name}</span>
      </nav>

      {/* Project Title Row */}
      <div className="project-detail-header">
        <h1 className="project-detail-title">{project.name}</h1>

        <div className="project-header-actions">
          <button
            type="button"
            className={`project-action-icon-btn ${project.pinned ? 'is-pinned' : ''}`}
            onClick={handleToggleProjectPin}
            title={project.pinned ? 'Unpin project' : 'Pin project'}
            aria-label="Toggle pin"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="17" x2="12" y2="22" />
              <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
            </svg>
          </button>

          <button
            type="button"
            className="project-action-icon-btn"
            title="Project options"
            aria-label="Project options"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Project Description */}
      {project.description && (
        <div className="project-detail-desc">
          <p>{project.description}</p>
        </div>
      )}

      {/* Center Prompt Card matching Image 1 */}
      <div className="project-prompt-card">
        <textarea
          className="project-prompt-textarea"
          placeholder="How can I help you today?"
          rows={3}
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
        />

        <div className="prompt-card-bottom">
          <div className="prompt-bottom-left">
            <button
              type="button"
              className="prompt-attach-btn"
              title="Attach files or context"
              aria-label="Attach context"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* Chat / Cowork Mode Toggle Pill */}
            <div className="chat-cowork-pill">
              <button
                type="button"
                className={`mode-subpill ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                Chat
              </button>
              <button
                type="button"
                className={`mode-subpill ${activeTab === 'cowork' ? 'active' : ''}`}
                onClick={() => setActiveTab('cowork')}
              >
                Cowork
              </button>
            </div>
          </div>

          <div className="prompt-bottom-right">
            {/* Model & Thinking Level Chip */}
            <div className="model-chip-group" title="NVIDIA Nemotron 3.5">
              <span className="model-chip-name">Nemotron</span>
              <span className="model-chip-level">Low</span>
            </div>

            {/* Audio & Mic Icons */}
            <button type="button" className="prompt-icon-btn" title="Voice input" aria-label="Microphone">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>

            <button type="button" className="prompt-icon-btn" title="Audio response mode" aria-label="Audio waveform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 10v4" />
                <path d="M6 6v12" />
                <path d="M10 3v18" />
                <path d="M14 8v8" />
                <path d="M18 5v14" />
                <path d="M22 10v4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="prompt-card-subtext">
        <span>Messages left: N/A</span>
      </div>

      {/* Recents Section matching Image 1 & Image 3 */}
      <div className="project-recents-section">
        <h2 className="project-recents-title">Recents</h2>

        {chats.length > 0 ? (
          <div className="project-recents-list">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className="recent-chat-row"
                onClick={() => onOpenChat(chat)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpenChat(chat);
                }}
              >
                <div className="recent-chat-title-group">
                  {chat.pinned && (
                    <span className="chat-pinned-dot" title="Pinned chat">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="6" />
                      </svg>
                    </span>
                  )}
                  <span className="recent-chat-title">{chat.title}</span>
                </div>

                <div className="recent-chat-meta">
                  {/* Context Menu Button ⋮ matching Image 3 */}
                  <button
                    type="button"
                    className="chat-menu-trigger-btn"
                    onClick={(e) => handleOpenMenu(e, chat)}
                    title="Chat options"
                    aria-label="Chat options"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>
                  <span className="recent-chat-date">{chat.dateStr || 'Recent'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-recents-state">
            <p>No recent chats in this project yet.</p>
            <span>Type a prompt in the box above to start a new chat.</span>
          </div>
        )}
      </div>

      {/* Floating Context Menu */}
      {activeMenuChat && (
        <ChatContextMenu
          chat={activeMenuChat}
          currentProjectId={project.id}
          projects={allProjects}
          position={menuPosition}
          onClose={() => setActiveMenuChat(null)}
          onPin={handlePinChat}
          onRename={handleRenameChat}
          onMoveToProject={onMoveChat}
          onRemoveFromProject={handleRemoveFromProject}
          onDelete={handleDelete}
          onStartNewProject={onStartNewProject}
        />
      )}

      {/* Delete Chat Confirmation Modal matching Image */}
      {chatToDelete && (
        <div className="modal-backdrop" onClick={() => setChatToDelete(null)}>
          <div
            className="delete-chat-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-chat-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-chat-title" className="delete-chat-title">
              Delete chat?
            </h3>
            <p className="delete-chat-desc">
              Are you sure you want to delete this chat?
            </p>
            <div className="delete-chat-actions">
              <button
                type="button"
                className="delete-cancel-btn"
                onClick={() => setChatToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-confirm-btn"
                onClick={() => {
                  onDeleteChat(project.id, chatToDelete.id);
                  if (onToast) onToast('Chat deleted');
                  setChatToDelete(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
