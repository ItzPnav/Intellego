import React, { useState } from 'react';
import { selectDirectoryNative } from '../services/workspaceService';

export default function CreateProjectModal({ isOpen, onClose, onCreateProject }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rootPath, setRootPath] = useState('');
  const [isSelectingDir, setIsSelectingDir] = useState(false);

  if (!isOpen) return null;

  const handleSelectFolder = async () => {
    setIsSelectingDir(true);
    const selected = await selectDirectoryNative();
    setIsSelectingDir(false);
    if (selected) {
      setRootPath(selected);
      if (!name) {
        const folderName = selected.split(/[\\/]/).filter(Boolean).pop() || '';
        setName(folderName);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateProject({
      name: name.trim(),
      description: description.trim(),
      rootPath: rootPath.trim() || undefined
    });

    setName('');
    setDescription('');
    setRootPath('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="create-project-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="create-project-header">
          <h2 id="create-project-title" className="create-project-title">
            Create a project
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-project-form">
          <div className="form-group">
            <label className="form-label" htmlFor="project-name-input">
              What are you working on?
            </label>
            <input
              id="project-name-input"
              type="text"
              className="create-project-input"
              placeholder="Name your project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="project-desc-input">
              What are you trying to achieve?
            </label>
            <textarea
              id="project-desc-input"
              className="create-project-textarea"
              placeholder="Describe your project, goals, subject, etc..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <div className="folder-select-row">
              <button
                type="button"
                className="folder-select-btn"
                onClick={handleSelectFolder}
                disabled={isSelectingDir}
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
                  aria-hidden="true"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>{rootPath ? 'Change folder' : 'Attach repository folder (optional)'}</span>
              </button>
              {rootPath && <span className="selected-path-tag" title={rootPath}>{rootPath}</span>}
            </div>
          </div>

          <div className="create-project-footer">
            <button
              type="button"
              className="modal-cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-submit-btn"
              disabled={!name.trim()}
            >
              Create project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
