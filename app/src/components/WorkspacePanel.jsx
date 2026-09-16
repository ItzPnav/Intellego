import React, { useState, useEffect } from 'react';
import {
  openWorkspace,
  getSavedWorkspaces,
  saveWorkspaceToList,
  setSavedActiveWorkspace,
  removeSavedWorkspace
} from '../services/workspaceService';
import CreateProjectModal from './CreateProjectModal';

export default function WorkspacePanel({
  activeWorkspace,
  setActiveWorkspace,
  setCurrentView,
  onSelectProject,
  onToast
}) {
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Load saved projects from localStorage on mount
  useEffect(() => {
    let saved = getSavedWorkspaces();
    // Default seed projects if empty (matches user's screenshot context: Hintify, etc.)
    if (saved.length === 0) {
      const defaultProjects = [
        {
          id: 'ws-hintify',
          name: 'Hintify',
          description: '**Hintify** is a React-based web application designed to facilitate intelligent tutoring through an AI-powered hint system. It’s built for teachers to upload educational documents (PDFs) and for students to interact with those documents using a chatbot-style interface that provides progressive hints and solutions. The application features a modern, responsive UI with theme support (light/dark mode), role-based authentication, and document analysis capabilities.',
          dateStr: 'Mar 12',
          chats: [
            { id: 'chat-1', title: 'Hintify platform development roadmap', dateStr: 'Mar 14', pinned: false },
            { id: 'chat-2', title: 'Teaching dashboard implementation', dateStr: 'Mar 14', pinned: false },
            { id: 'chat-3', title: 'Implementing AI now', dateStr: 'Mar 13', pinned: false },
            { id: 'chat-4', title: 'Fixing PDF upload in frontend', dateStr: 'Mar 13', pinned: false },
            { id: 'chat-5', title: 'Greeting', dateStr: 'Mar 12', pinned: false },
            { id: 'chat-6', title: 'Frontend feature fix files', dateStr: 'Mar 12', pinned: false }
          ]
        },
        {
          id: 'ws-daily-code',
          name: 'DAILY CODE TRACKER',
          description: 'Daily algorithmic problem tracker and engineering metrics logger.',
          dateStr: 'May 25',
          chats: []
        },
        {
          id: 'ws-ideas',
          name: 'Ideas',
          description: 'just dump your ideas here',
          dateStr: 'Mar 17',
          chats: []
        },
        {
          id: 'ws-python-app',
          name: 'Python app for everything',
          description: 'image to text(OCR), images to pdf, FILE to FILE conversion, url link video donwloader, a comic book downloader (web will have tons of photos, we scrape...',
          dateStr: 'Mar 11',
          chats: []
        }
      ];
      defaultProjects.forEach((p) => saveWorkspaceToList(p));
      saved = defaultProjects;
    }
    setProjects(saved);
  }, [activeWorkspace]);

  // Handle creating project from modal (Image 2)
  const handleCreateProject = async ({ name, description, rootPath }) => {
    setIsBusy(true);
    setStatusMessage(`Creating project "${name}"...`);

    let symbolCount = 0;
    let state = 'READY';

    if (rootPath) {
      setStatusMessage(`Indexing ${rootPath}...`);
      const res = await openWorkspace(rootPath);
      if (res.success) {
        symbolCount = res.data?.symbolCount || 0;
      }
    }

    setIsBusy(false);

    const newProject = {
      id: `ws-${Date.now()}`,
      name,
      description: description || (rootPath ? `Repository workspace at ${rootPath}` : 'Project workspace'),
      rootPath: rootPath || undefined,
      state,
      symbolCount,
      dateStr: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      chats: []
    };

    const updatedList = saveWorkspaceToList(newProject);
    setProjects(updatedList);
    setActiveWorkspace(newProject);
    setSavedActiveWorkspace(newProject);

    if (onToast) onToast(`Project "${name}" created!`);

    if (onSelectProject) {
      onSelectProject(newProject);
    } else {
      setCurrentView('project-detail');
    }
  };

  // Handle selecting an existing workspace card
  const handleSelectWorkspace = async (project) => {
    let targetProject = project;
    if (project.rootPath) {
      setIsBusy(true);
      setStatusMessage(`Attaching ${project.name}...`);
      const res = await openWorkspace(project.rootPath);
      setIsBusy(false);
      if (res.success) {
        targetProject = {
          ...project,
          state: res.data?.state || 'READY',
          symbolCount: res.data?.symbolCount ?? project.symbolCount
        };
        setActiveWorkspace(targetProject);
        setSavedActiveWorkspace(targetProject);
        saveWorkspaceToList(targetProject);
      }
    } else {
      setActiveWorkspace(targetProject);
      setSavedActiveWorkspace(targetProject);
    }

    if (onSelectProject) {
      onSelectProject(targetProject);
    } else {
      setCurrentView('project-detail');
    }
  };

  // Handle removing a project from saved list
  const handleRemoveProject = (e, project) => {
    e.stopPropagation();
    const updated = removeSavedWorkspace(project.id);
    setProjects(updated);
    if (activeWorkspace?.id === project.id) {
      setSavedActiveWorkspace(null);
      setActiveWorkspace(null);
    }
    if (onToast) onToast(`Removed "${project.name}" from projects`);
  };

  // Filter & sort projects (pinned projects prioritized at top)
  const filteredProjects = projects
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.rootPath && p.rootPath.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (sortAsc) {
        return (a.name || '').localeCompare(b.name || '');
      }
      return (b.name || '').localeCompare(a.name || '');
    });

  return (
    <div className="projects-container" id="projects-view">
      {/* Projects Top Bar matching Image 2 */}
      <div className="projects-header">
        <h2 className="projects-title">Projects</h2>

        <div className="projects-header-actions">
          {/* Search Toggle / Input */}
          <div className="projects-search-wrapper">
            {isSearchOpen ? (
              <div className="search-input-box">
                <input
                  type="text"
                  className="projects-search-input"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  onBlur={() => {
                    if (!searchQuery) setIsSearchOpen(false);
                  }}
                />
                <button
                  type="button"
                  className="search-close-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                >
                  &times;
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="icon-action-btn"
                onClick={() => setIsSearchOpen(true)}
                title="Search projects"
                aria-label="Search projects"
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
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort Toggle Button */}
          <button
            type="button"
            className="icon-action-btn"
            onClick={() => setSortAsc((prev) => !prev)}
            title="Sort projects"
            aria-label="Sort projects"
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
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </button>

          {/* White Pill "+ New project" Button matching Image 2 */}
          <button
            type="button"
            className="new-project-pill-btn"
            onClick={() => setIsCreateModalOpen(true)}
            disabled={isBusy}
          >
            <span>New project</span>
          </button>
        </div>
      </div>

      {/* Loading In-Progress Card */}
      {isBusy && (
        <div className="loading-card" role="status">
          <div className="loading-card-content">
            <div className="dots-loader">
              <span />
              <span />
              <span />
            </div>
            <span className="loading-message">{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Error Card */}
      {errorDetails && (
        <div className="error-card" role="alert">
          <div className="error-card-header">
            <span className="error-title">Workspace Operation Notice</span>
          </div>
          <div className="error-detail-text">
            {errorDetails.detail || JSON.stringify(errorDetails)}
          </div>
        </div>
      )}

      {/* 2-Column Projects Grid matching Image 2 */}
      {filteredProjects.length > 0 ? (
        <div className="projects-grid">
          {filteredProjects.map((project) => {
            const isActive = activeWorkspace?.id === project.id || activeWorkspace?.rootPath === project.rootPath;
            return (
              <div
                key={project.id || project.rootPath}
                className={`project-card ${isActive ? 'active-project' : ''}`}
                onClick={() => handleSelectWorkspace(project)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSelectWorkspace(project);
                }}
              >
                <div className="project-card-header">
                  <h3 className="project-card-title">{project.name}</h3>
                  <div className="project-card-actions">
                    {project.pinned && <span className="project-pinned-badge" title="Pinned project">📌</span>}
                    {isActive && <span className="project-active-badge">ACTIVE</span>}
                    <button
                      type="button"
                      className="project-remove-btn"
                      title="Remove from project list"
                      onClick={(e) => handleRemoveProject(e, project)}
                    >
                      &times;
                    </button>
                  </div>
                </div>

                <p className="project-card-desc">
                  {project.description || `Repository directory at ${project.rootPath}`}
                </p>

                <div className="project-card-footer">
                  <span className="project-card-date">{project.dateStr || 'Recent'}</span>
                  {project.symbolCount > 0 ? (
                    <span className="project-card-stats">{project.symbolCount} symbols</span>
                  ) : project.chats?.length > 0 ? (
                    <span className="project-card-stats">{project.chats.length} chats</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-projects-state">
          <div className="empty-projects-icon">
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="empty-projects-title">No projects added yet</h3>
          <p className="empty-projects-subtitle">
            Create your projects here to organize your repositories and chat conversations.
          </p>
          <button
            type="button"
            className="new-project-pill-btn"
            onClick={() => setIsCreateModalOpen(true)}
            disabled={isBusy}
          >
            <span>New project</span>
          </button>
        </div>
      )}

      {/* Create Project Modal (Image 2) */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}
