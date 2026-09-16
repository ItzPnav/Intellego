import React, { useState, useEffect } from 'react';
import { triggerWorkspaceIndex, getWorkspaceSymbols } from '../../services/toolRuntime';

export default function GraphExplorer({ onToast, activeWorkspace }) {
  const [indexing, setIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState(null);
  const [symbols, setSymbols] = useState([]);
  const [totalSymbols, setTotalSymbols] = useState(0);
  const [isLoadingSymbols, setIsLoadingSymbols] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('all');

  const fetchSymbols = async (kind = kindFilter, search = searchFilter) => {
    setIsLoadingSymbols(true);
    try {
      const res = await getWorkspaceSymbols({
        kind: kind !== 'all' ? kind : undefined,
        query: search ? search.trim() : undefined
      });
      if (res.success && res.data) {
        setSymbols(res.data.symbols || []);
        setTotalSymbols(res.data.total ?? (res.data.symbols || []).length);
      }
    } catch {
      // Degrade gracefully
    } finally {
      setIsLoadingSymbols(false);
    }
  };

  useEffect(() => {
    fetchSymbols();
  }, []);

  const handleTriggerIndex = async () => {
    setIndexing(true);
    setIndexResult(null);

    const result = await triggerWorkspaceIndex();
    setIndexing(false);

    if (result.success) {
      setIndexResult({
        type: 'success',
        message: 'INDEXING COMPLETE',
        detail: `Indexed ${result.data?.symbolCount || 0} AST symbols at ${result.data?.lastIndexedAt || new Date().toISOString()}`
      });
      if (onToast) onToast('Workspace re-indexed');
      // Refresh live symbols
      fetchSymbols();
    } else {
      setIndexResult({
        type: 'error',
        message: 'INDEXING REJECTED',
        code: result.error?.code || 'INDEX_FAILED',
        detail: result.error?.detail || 'Workspace indexing failed or no workspace is active.'
      });
      if (onToast) onToast('Indexing error');
    }
  };

  const handleKindChange = (k) => {
    setKindFilter(k);
    fetchSymbols(k, searchFilter);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchFilter(val);
    fetchSymbols(kindFilter, val);
  };

  const kinds = ['all', 'class', 'function', 'variable', 'import', 'export'];

  return (
    <div className="graph-explorer-surface">
      <h2 className="doc-section-title">SEMANTIC KNOWLEDGE GRAPH EXPLORER</h2>
      <p className="doc-subtitle">
        REPOSITORY INTELLIGENCE ENGINE (RIE) PERSISTED AST SYMBOL ARCHIVE
        {activeWorkspace?.name ? ` — ACTIVE: ${activeWorkspace.name.toUpperCase()}` : ''}
      </p>

      {/* Live Graph Symbols Explorer Panel */}
      <div className="doc-panel">
        <div className="doc-panel-header">
          <div>
            <span className="doc-label-uppercase">PERSISTED AST SYMBOLS </span>
            <span style={{ fontWeight: 'bold', color: 'var(--ink)' }}>
              ({totalSymbols} RECORD{totalSymbols === 1 ? '' : 'S'})
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="doc-badge-accent">SQLITE PERSISTED</span>
            <span className="doc-badge-ink">GET /workspace/symbols</span>
          </div>
        </div>

        {/* Search & Kind Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
          <input
            type="text"
            className="doc-search-input"
            placeholder="Search symbols or paths..."
            value={searchFilter}
            onChange={handleSearchChange}
            style={{
              flex: '1',
              minWidth: '220px',
              padding: '8px 12px',
              background: 'var(--paper)',
              color: 'var(--ink)',
              border: '2px solid var(--ink)',
              fontFamily: "'Courier New', monospace",
              fontSize: '13px',
              textTransform: 'none'
            }}
          />

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                className={`doc-btn-secondary ${kindFilter === k ? 'active-kind' : ''}`}
                onClick={() => handleKindChange(k)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  backgroundColor: kindFilter === k ? 'var(--ink)' : 'var(--paper)',
                  color: kindFilter === k ? 'var(--paper)' : 'var(--ink)',
                  borderColor: 'var(--ink)'
                }}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Symbols Table */}
        <div style={{ overflowX: 'auto', border: '2px solid var(--ink)', background: 'var(--paper)', maxHeight: '360px', overflowY: 'auto' }}>
          {isLoadingSymbols ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
              LOADING PERSISTED SYMBOLS FROM SQLITE...
            </div>
          ) : symbols.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--paper-dim)', borderBottom: '2px solid var(--ink)' }}>
                  <th style={{ padding: '8px 12px', borderRight: '1px solid var(--ink)', width: '25%' }}>SYMBOL NAME</th>
                  <th style={{ padding: '8px 12px', borderRight: '1px solid var(--ink)', width: '15%' }}>KIND</th>
                  <th style={{ padding: '8px 12px', borderRight: '1px solid var(--ink)', width: '35%' }}>FILE PATH</th>
                  <th style={{ padding: '8px 12px', width: '25%' }}>DEPENDS ON</th>
                </tr>
              </thead>
              <tbody>
                {symbols.map((sym, idx) => (
                  <tr key={sym.id || idx} style={{ borderBottom: '1px solid var(--paper-dim)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', borderRight: '1px solid var(--paper-dim)', wordBreak: 'break-all' }}>
                      {sym.name}
                    </td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid var(--paper-dim)' }}>
                      <span className="doc-badge-accent" style={{ fontSize: '10px', padding: '2px 6px' }}>
                        {(sym.kind || 'unknown').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid var(--paper-dim)', color: 'var(--muted)', wordBreak: 'break-all' }}>
                      {sym.filePath || sym.file_path}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--muted)', wordBreak: 'break-all' }}>
                      {Array.isArray(sym.dependsOn || sym.depends_on) && (sym.dependsOn || sym.depends_on).length > 0
                        ? (sym.dependsOn || sym.depends_on).join(', ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--muted)' }}>
              NO SYMBOLS FOUND MATCHING FILTER. CLICK "FORCE RE-INDEX" BELOW TO SCAN REPOSITORY.
            </div>
          )}
        </div>

        <div className="doc-actions-row">
          <button
            type="button"
            className="doc-btn-primary"
            onClick={handleTriggerIndex}
            disabled={indexing}
            title="Triggers full repository AST re-index via POST /workspace/index"
          >
            {indexing ? 'INDEXING REPO...' : 'FORCE RE-INDEX (POST /workspace/index)'}
          </button>
        </div>

        {/* Status result */}
        {indexResult && indexResult.type === 'error' && (
          <div className="doc-error-panel" role="alert">
            <div className="doc-error-title">
              ⚠ {indexResult.message} [{indexResult.code}]
            </div>
            <div>{indexResult.detail}</div>
          </div>
        )}

        {indexResult && indexResult.type === 'success' && (
          <div className="doc-success-panel" role="status">
            <div className="doc-success-title">✓ {indexResult.message}</div>
            <div>{indexResult.detail}</div>
          </div>
        )}
      </div>

      {/* SymbolNode Spec Sheet (per SPEC.md §9) */}
      <div className="doc-panel">
        <div className="doc-panel-header">
          <span className="doc-label-uppercase">SPEC.MD §9 — SYMBOLNODE DATA CONTRACT</span>
          <span className="doc-badge-ink">SQLITE SCHEMA</span>
        </div>

        <div className="graph-spec-sheet">
          <div className="graph-spec-row">
            <span className="graph-spec-key">id</span>
            <span className="graph-spec-val">string (unique deterministic hash)</span>
          </div>
          <div className="graph-spec-row">
            <span className="graph-spec-key">workspaceId</span>
            <span className="graph-spec-val">string (MD5 path hash of workspace root)</span>
          </div>
          <div className="graph-spec-row">
            <span className="graph-spec-key">filePath</span>
            <span className="graph-spec-val">string (workspace-relative path)</span>
          </div>
          <div className="graph-spec-row">
            <span className="graph-spec-key">kind</span>
            <span className="graph-spec-val">"class" | "function" | "variable" | "import" | "export"</span>
          </div>
          <div className="graph-spec-row">
            <span className="graph-spec-key">name</span>
            <span className="graph-spec-val">string (symbol identifier)</span>
          </div>
          <div className="graph-spec-row">
            <span className="graph-spec-key">dependsOn</span>
            <span className="graph-spec-val">string[] (referenced SymbolNode IDs)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
