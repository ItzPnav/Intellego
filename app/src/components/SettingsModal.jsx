import React, { useState, useEffect } from 'react';
import { getEngineConfig } from '../services/workspaceService';

export default function SettingsModal({ isOpen, onClose }) {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getEngineConfig().then((res) => {
        setIsLoading(false);
        if (res.success) {
          setConfig(res.data);
        } else {
          setConfig({
            modelName: 'nvidia/nemotron-4-340b-instruct',
            apiBase: 'https://integrate.api.nvidia.com/v1',
            hasApiKey: false,
            offline: true
          });
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 className="modal-title">Settings &amp; Platform Status</h3>
            <span className="modal-subtitle">Platform Hard Rules &amp; Guardrail Invariants (V1)</span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close settings modal"
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Guardrail Policy Notice */}
          <div className="guardrail-notice-box">
            <div className="guardrail-badge">V1 PLATFORM GUARDRAIL</div>
            <p className="guardrail-text">
              Per <strong>GEMINI.md §3 (Platform Hard Rules)</strong> and{' '}
              <strong>§6 (Hard Guardrails)</strong>, core platform runtime settings are immutable in
              the UI. Secrets (<code>NEMOTRON_API_KEY</code>) live exclusively in <code>.env</code> and
              are strictly non-editable and non-exposed from the renderer shell.
            </p>
          </div>

          {/* System Invariants Grid */}
          <div className="config-grid">
            <div className="config-row">
              <span className="config-label">LLM Provider (Fixed V1)</span>
              <span className="config-value highlight">
                {config?.modelName || 'nvidia/nemotron-4-340b-instruct'} (Sole Provider)
              </span>
            </div>

            <div className="config-row">
              <span className="config-label">NVIDIA Build API Base</span>
              <span className="config-value code-font">
                {config?.apiBase || 'https://integrate.api.nvidia.com/v1'}
              </span>
            </div>

            <div className="config-row">
              <span className="config-label">Sidecar Network Binding</span>
              <span className="config-value code-font">127.0.0.1:8000 (Loopback-Only)</span>
            </div>

            <div className="config-row">
              <span className="config-label">NEMOTRON_API_KEY Status</span>
              <span className="config-value">
                {config?.hasApiKey ? (
                  <span className="status-pill-ok">Active (.env sourced)</span>
                ) : (
                  <span className="status-pill-warn">Not Configured in .env</span>
                )}
              </span>
            </div>

            <div className="config-row">
              <span className="config-label">Persistent Storage</span>
              <span className="config-value">SQLite (Per-Workspace Embedded)</span>
            </div>

            <div className="config-row">
              <span className="config-label">Parsing &amp; Intelligence</span>
              <span className="config-value">Tree-sitter AST Graph Engine</span>
            </div>

            <div className="config-row">
              <span className="config-label">Safety Discipline</span>
              <span className="config-value highlight">
                edit/preview &rarr; edit/apply (No Silent Writes)
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <span className="footer-spec-version">Specification: spec-v1.0.0</span>
          <button type="button" className="action-btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
