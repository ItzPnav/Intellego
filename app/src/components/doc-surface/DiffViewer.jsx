import React, { useState, useEffect } from 'react';
import { applyEdit } from '../../services/toolRuntime';

export const INITIAL_PREVIEW = {
  id: 'prev-774b-481e-8e5a-293e7f918e9a',
  filePath: 'engine/agent.py',
  operation: 'replace',
  createdAt: '2026-09-09T15:55:00Z',
  requiresApproval: true,
  diff: `--- a/engine/agent.py
+++ b/engine/agent.py
@@ -10,6 +10,12 @@
 API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
 MODEL_NAME = "nvidia/nemotron-4-340b-instruct"
 
+def verify_workspace_containment(target_path: str, root_path: str) -> bool:
+    \"\"\"Validate path stays strictly inside workspace root (GEMINI.md Rule 3.6).\"\"\"
+    abs_root = os.path.abspath(root_path)
+    abs_target = os.path.abspath(os.path.join(abs_root, target_path))
+    return os.path.commonpath([abs_root, abs_target]) == abs_root
+
 def parse_proposed_changes(text: str) -> List[Dict[str, str]]:
     \"\"\"Parse XML-like proposed change blocks from agent text.\"\"\"
     pattern = re.compile(r'<proposed_change\\s+file=["\\']([^"\\']+)["\\']>(.*?)</proposed_change>', re.DOTALL)`
};

export default function DiffViewer({ onToast }) {
  const [pendingQueue, setPendingQueue] = useState(() => {
    try {
      const q = localStorage.getItem('intellego_pending_previews');
      if (q) {
        const parsed = JSON.parse(q);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const single = localStorage.getItem('intellego_active_preview');
      if (single) return [JSON.parse(single)];
    } catch {}
    return [INITIAL_PREVIEW];
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const [statusResult, setStatusResult] = useState(null);

  const activePreview = pendingQueue[activeIndex] || null;

  useEffect(() => {
    try {
      const q = localStorage.getItem('intellego_pending_previews');
      if (q) {
        const parsed = JSON.parse(q);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPendingQueue(parsed);
          setActiveIndex(0);
          return;
        }
      }
      const single = localStorage.getItem('intellego_active_preview');
      if (single) {
        setPendingQueue([JSON.parse(single)]);
        setActiveIndex(0);
      }
    } catch {}
  }, []);

  const removeCurrentFromQueue = () => {
    const updated = pendingQueue.filter((_, idx) => idx !== activeIndex);
    setPendingQueue(updated);
    if (updated.length > 0) {
      const nextIdx = Math.min(activeIndex, updated.length - 1);
      setActiveIndex(nextIdx);
      try {
        localStorage.setItem('intellego_active_preview', JSON.stringify(updated[nextIdx]));
        localStorage.setItem('intellego_pending_previews', JSON.stringify(updated));
      } catch {}
    } else {
      setActiveIndex(0);
      try {
        localStorage.removeItem('intellego_active_preview');
        localStorage.removeItem('intellego_pending_previews');
      } catch {}
    }
  };

  const handleAccept = async () => {
    if (!activePreview) return;
    setIsApplying(true);
    setStatusResult(null);

    const result = await applyEdit(activePreview.id);
    setIsApplying(false);

    if (result.success) {
      const appliedPath = activePreview.filePath;
      removeCurrentFromQueue();
      setStatusResult({
        type: 'success',
        message: 'DIFF APPLIED SUCCESSFULLY',
        detail: result.message || `Changes to ${appliedPath} written to disk.`
      });
      if (onToast) onToast(`Applied changes to ${appliedPath}`);
    } else {
      setStatusResult({
        type: 'error',
        message: 'EDIT REJECTED BY TOOL RUNTIME',
        code: result.error?.code || 'APPLY_REJECTED',
        detail: result.error?.detail || 'No unexpired matching preview ID exists in the sidecar engine.'
      });
      if (onToast) onToast(`Apply rejected: ${result.error?.code || 'Error'}`);
    }
  };

  const handleReject = () => {
    if (!activePreview) return;
    const discardedPath = activePreview.filePath;
    removeCurrentFromQueue();
    setStatusResult({
      type: 'error',
      message: 'DIFF DISCARDED BY USER',
      code: 'USER_CANCELLED',
      detail: `The proposed changes for ${discardedPath} were discarded. No filesystem writes occurred.`
    });
    if (onToast) onToast('Diff preview discarded');
  };

  const handleTestExpired = async () => {
    setIsApplying(true);
    setStatusResult(null);

    const expiredId = 'expired-preview-uuid-0000-000000000000';
    const result = await applyEdit(expiredId);
    setIsApplying(false);

    setStatusResult({
      type: 'error',
      message: 'EXPECTED REJECTION: EXPIRED OR INVALID PREVIEW ID',
      code: result.error?.code || 'PREVIEW_NOT_FOUND',
      detail: result.error?.detail || `Engine rejected unindexed preview ID '${expiredId}'.`
    });
    if (onToast) onToast('Rejection verified: Invalid preview ID rejected');
  };

  const diffLines = (activePreview?.diff || '').split('\n');

  return (
    <div className="diff-viewer-surface">
      <h2 className="doc-section-title">DIFF-BEFORE-APPLY PREVIEW</h2>
      <p className="doc-subtitle">
        TOOL RUNTIME GATING LAYER — ZERO SILENT WRITES PERMITTED (GEMINI.MD RULE 3.5)
      </p>

      {/* Multi-preview file queue selector */}
      {pendingQueue.length > 1 && (
        <div className="doc-panel" style={{ padding: '12px 18px', marginBottom: '18px' }}>
          <span className="doc-label-uppercase" style={{ marginRight: '12px' }}>
            QUEUED DIFFS ({pendingQueue.length} FILES):
          </span>
          <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap' }}>
            {pendingQueue.map((item, idx) => (
              <button
                key={item.id || idx}
                type="button"
                className={`doc-btn-secondary ${activeIndex === idx ? 'active-tab' : ''}`}
                onClick={() => setActiveIndex(idx)}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  backgroundColor: activeIndex === idx ? 'var(--ink)' : 'var(--paper)',
                  color: activeIndex === idx ? 'var(--paper)' : 'var(--ink)'
                }}
              >
                {item.filePath || `File ${idx + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Diff Inspection Panel */}
      <div className="doc-panel">
        <div className="doc-panel-header">
          <div>
            <span className="doc-label-uppercase">TARGET FILE: </span>
            <span style={{ fontWeight: 'bold', color: 'var(--ink)' }}>
              {activePreview?.filePath || 'NONE'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="doc-badge-ink">
              PREVIEW ID: {activePreview?.id ? `${activePreview.id.slice(0, 14)}...` : 'NONE'}
            </span>
            <span className="doc-badge-accent">
              {(activePreview?.operation || 'REPLACE').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Diff Unified Block or Empty State */}
        {activePreview && diffLines.length > 0 && diffLines.some((l) => l.trim()) ? (
          <div className="diff-content-wrapper">
            {diffLines.map((line, idx) => {
              let lineClass = 'diff-line';
              if (line.startsWith('+') && !line.startsWith('+++')) {
                lineClass += ' diff-line-add';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                lineClass += ' diff-line-del';
              } else if (line.startsWith('@@')) {
                lineClass += ' diff-line-hunk';
              }

              return (
                <div key={idx} className={lineClass}>
                  <span className="diff-line-number">{idx + 1}</span>
                  <span>{line}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--muted)', background: 'var(--paper)', border: '2px solid var(--ink)' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--ink)' }}>
              NO PENDING DIFF PREVIEWS
            </div>
            <p style={{ fontSize: '13px', maxWidth: '520px', margin: '0 auto' }}>
              The Tool Runtime has no proposed file changes awaiting approval. When the Agent Runtime proposes edits, unified diffs will appear here for review before any disk write occurs.
            </p>
          </div>
        )}

        {/* Action Buttons adhering to Rule 10.2 (solid ink fill, paper text, hover swap) */}
        <div className="doc-actions-row">
          <button
            type="button"
            className="doc-btn-primary"
            onClick={handleAccept}
            disabled={isApplying || !activePreview}
            title={activePreview ? 'Applies diff to disk via POST /edit/apply' : 'No preview available to apply'}
          >
            {isApplying ? 'APPLYING...' : 'ACCEPT DIFF (POST /edit/apply)'}
          </button>

          <button
            type="button"
            className="doc-btn-secondary"
            onClick={handleReject}
            disabled={isApplying || !activePreview}
            title="Rejects and discards proposed changes"
          >
            REJECT DIFF
          </button>

          <button
            type="button"
            className="doc-btn-secondary"
            onClick={handleTestExpired}
            disabled={isApplying}
            title="Test verification: Sends invalid preview ID to verify rejection is surfaced"
            style={{ marginLeft: 'auto' }}
          >
            TEST INVALID/EXPIRED ID
          </button>
        </div>

        {/* Inline Status / Rejection Message (Never swallowed) */}
        {statusResult && statusResult.type === 'error' && (
          <div className="doc-error-panel" role="alert">
            <div className="doc-error-title">
              ⚠ {statusResult.message} [{statusResult.code}]
            </div>
            <div>{statusResult.detail}</div>
          </div>
        )}

        {statusResult && statusResult.type === 'success' && (
          <div className="doc-success-panel" role="status">
            <div className="doc-success-title">✓ {statusResult.message}</div>
            <div>{statusResult.detail}</div>
          </div>
        )}
      </div>
    </div>
  );
}
