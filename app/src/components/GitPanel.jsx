import React, { useState, useEffect } from 'react';
import { getGitStatus, commitGit } from '../services/workspaceService';

export default function GitPanel({ activeWorkspace, setCurrentView, onToast }) {
  const [gitData, setGitData] = useState({ status: 'unknown', changes: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastCommitted, setLastCommitted] = useState(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const res = await getGitStatus();
    setIsLoading(false);

    if (res.success) {
      setGitData(res.data || { status: 'tracked', changes: [] });
    } else {
      setErrorMessage(res.error?.detail || res.message);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [activeWorkspace?.rootPath]);

  const handleCommit = async (e) => {
    e.preventDefault();
    if (!commitMessage.trim()) {
      if (onToast) onToast('Please enter a commit message');
      return;
    }

    setIsCommitting(true);
    setErrorMessage(null);

    // Section 3 Rule 5 & Section 4 Tool Runtime:
    // The explicit click on "Commit" acts as the required approval gate.
    const res = await commitGit(commitMessage.trim());
    setIsCommitting(false);

    if (res.success) {
      setLastCommitted(commitMessage.trim());
      setCommitMessage('');
      if (onToast) onToast('Changes committed successfully');
      fetchStatus();
    } else {
      setErrorMessage(res.error?.detail || res.message);
      if (onToast) onToast(`Commit failed: ${res.message}`);
    }
  };

  const getStatusBadge = (state) => {
    switch (state) {
      case 'M':
        return <span className="git-badge modified">Modified</span>;
      case 'A':
        return <span className="git-badge added">Added</span>;
      case 'D':
        return <span className="git-badge deleted">Deleted</span>;
      case '??':
        return <span className="git-badge untracked">Untracked</span>;
      default:
        return <span className="git-badge">{state}</span>;
    }
  };

  const hasChanges = (gitData.changes || []).length > 0;

  return (
    <div className="panel-container" id="git-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Git Status & Commit</h2>
          <p className="panel-subtitle">
            Track repository status and commit approved changes through the Tool Runtime gate.
          </p>
        </div>

        <div className="panel-header-actions">
          <button
            type="button"
            className="action-btn secondary"
            onClick={fetchStatus}
            disabled={isLoading}
            title="Refresh Git status"
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
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{isLoading ? 'Checking...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            className="action-btn secondary"
            onClick={() => setCurrentView('diff')}
            title="Switch to System B Diff Preview"
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
            >
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            <span>View Diff Preview</span>
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="error-card" role="alert">
          <div className="error-card-header">
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
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="error-title">Git Operation Notice</span>
          </div>
          <div className="error-detail-text">{errorMessage}</div>
        </div>
      )}

      {/* Success banner for last commit */}
      {lastCommitted && !errorMessage && (
        <div className="success-card" role="status">
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
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>
            Successfully committed: <strong>&ldquo;{lastCommitted}&rdquo;</strong>
          </span>
        </div>
      )}

      {/* Working Tree Changes List */}
      <div className="git-content-layout">
        <div className="git-changes-section">
          <div className="section-title-row">
            <span className="section-heading">
              Working Directory Changes ({gitData.changes?.length || 0})
            </span>
            <span className="repo-badge">
              {gitData.status === 'tracked' ? 'GIT TRACKED' : 'UNTRACKED'}
            </span>
          </div>

          {hasChanges ? (
            <div className="git-file-list">
              {gitData.changes.map((item, idx) => (
                <div key={idx} className="git-file-item">
                  <div className="git-file-meta">
                    {getStatusBadge(item.state)}
                    <span className="git-file-path" title={item.file}>
                      {item.file}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="view-diff-link"
                    onClick={() => setCurrentView('diff')}
                  >
                    inspect diff
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="git-clean-state">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p>Working tree clean. No uncommitted modifications detected.</p>
            </div>
          )}
        </div>

        {/* Commit Form Section */}
        <div className="git-commit-section">
          <h3 className="section-heading">Commit Staged Changes</h3>
          <p className="commit-discipline-note">
            Per GEMINI.md §3 Rule 5 &amp; §4: Git mutation requires your explicit commit submission.
          </p>

          <form onSubmit={handleCommit} className="commit-form">
            <textarea
              className="commit-textarea"
              placeholder="Commit message (e.g. 'implement AST scanner fallback')..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={3}
              disabled={isCommitting || !hasChanges}
            />

            <button
              type="submit"
              className="action-btn primary commit-submit-btn"
              disabled={isCommitting || !hasChanges || !commitMessage.trim()}
            >
              {isCommitting ? (
                <>
                  <div className="dots-loader mini">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span>Committing...</span>
                </>
              ) : (
                <>
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
                    <circle cx="12" cy="12" r="4" />
                    <line x1="1.05" y1="12" x2="7" y2="12" />
                    <line x1="17.01" y1="12" x2="22.96" y2="12" />
                  </svg>
                  <span>Commit Approved Changes</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
