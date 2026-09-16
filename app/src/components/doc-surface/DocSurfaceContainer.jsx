import React from 'react';
import DiffViewer from './DiffViewer';
import GraphExplorer from './GraphExplorer';
import '../../styles/doc-surface.css';

/**
 * Top-level container strictly namespaced under `.doc-surface`
 * per GEMINI.md Section 10.2 & 10.3.
 *
 * System B tokens and styles are scoped here and never mix with System A.
 */
export default function DocSurfaceContainer({ view, setCurrentView, onToast, activeWorkspace }) {
  return (
    <div className="doc-surface">
      {/* Top Document Header */}
      <div className="doc-surface-header">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className="doc-badge-ink">SYSTEM B ARTIFACT SURFACE</span>
          <button
            type="button"
            className="doc-back-link"
            onClick={() => setCurrentView(view === 'diff' ? 'graph' : 'diff')}
            title="Switch between Diff Viewer and Graph Explorer"
          >
            {view === 'diff' ? 'SWITCH TO GRAPH EXPLORER →' : 'SWITCH TO DIFF VIEWER →'}
          </button>
        </div>

        <div>
          <button
            type="button"
            className="doc-back-link"
            onClick={() => setCurrentView('chat')}
            title="Return to primary System A Chat Shell"
          >
            ← RETURN TO CHAT SHELL
          </button>
        </div>
      </div>

      {/* Main Document Body */}
      <div className="doc-surface-body">
        {view === 'diff' && <DiffViewer onToast={onToast} activeWorkspace={activeWorkspace} />}
        {view === 'graph' && <GraphExplorer onToast={onToast} activeWorkspace={activeWorkspace} />}
      </div>
    </div>
  );
}
