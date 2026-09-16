/**
 * Tool Runtime Client Service (Phase 4)
 *
 * Implements the strict edit/preview -> edit/apply permission gating contract
 * defined in GEMINI.md Section 3.5 and Section 4.
 *
 * Every filesystem write is strictly gated behind an unexpired preview ID
 * and explicit user acceptance.
 */

import { ENGINE_BASE_URL, normalizeApiResponseError } from './agentRuntime.js';

/**
 * Requests an edit preview from the Tool Runtime (POST /edit/preview).
 * Does NOT perform any filesystem writes.
 */
export async function requestEditPreview({ filePath, proposedContent, operation = 'replace' }) {
  try {
    const res = await fetch(`${ENGINE_BASE_URL}/edit/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filePath,
        proposedContent,
        operation
      })
    });

    if (!res.ok) {
      let errBody;
      try {
        errBody = await res.json();
      } catch {
        errBody = { detail: await res.text().catch(() => res.statusText) };
      }
      throw {
        success: false,
        message: errBody.message || `Preview request failed with HTTP ${res.status}`,
        error: {
          code: errBody.error?.code || `HTTP_${res.status}`,
          detail: errBody.error?.detail || errBody.detail || 'Could not generate edit preview'
        }
      };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    throw normalizeApiResponseError(err, 'Failed to request edit preview');
  }
}

/**
 * Applies a previously previewed edit (POST /edit/apply).
 *
 * Hard Contract:
 * If no matching unexpired preview ID exists, the engine rejects the call.
 * This function NEVER applies blind or silently.
 */
export async function applyEdit(previewId) {
  if (!previewId || typeof previewId !== 'string') {
    return {
      success: false,
      message: 'Invalid preview ID',
      error: {
        code: 'INVALID_PREVIEW_ID',
        detail: 'A valid preview ID is strictly required before any filesystem change can be applied.'
      }
    };
  }

  try {
    const res = await fetch(`${ENGINE_BASE_URL}/edit/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ previewId })
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      return {
        success: false,
        message: data?.message || `Apply request rejected (HTTP ${res.status})`,
        error: {
          code: data?.error?.code || 'APPLY_REJECTED',
          detail: data?.error?.detail || data?.message || `The Tool Runtime rejected preview ID '${previewId}'. It may be expired or already applied.`
        }
      };
    }

    return data;
  } catch (err) {
    return normalizeApiResponseError(err, 'Failed to apply previewed edit');
  }
}

/**
 * Triggers a workspace full re-index (POST /workspace/index).
 * Only valid RIE entry point registered in SPEC.md Section 4 & 8.
 */
export async function triggerWorkspaceIndex() {
  try {
    const res = await fetch(`${ENGINE_BASE_URL}/workspace/index`, {
      method: 'POST'
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return {
        success: false,
        message: data?.message || 'Failed to index workspace',
        error: {
          code: data?.error?.code || `HTTP_${res.status}`,
          detail: data?.error?.detail || 'Indexing failed or no workspace is active.'
        }
      };
    }
    return data;
  } catch (err) {
    return normalizeApiResponseError(err, 'Failed to reach workspace indexer');
  }
}

/**
 * Retrieves persisted symbols for active workspace (GET /workspace/symbols).
 */
export async function getWorkspaceSymbols({ kind, query } = {}) {
  try {
    const params = new URLSearchParams();
    if (kind) params.append('kind', kind);
    if (query) params.append('query', query);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${ENGINE_BASE_URL}/workspace/symbols${queryString}`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return {
        success: false,
        message: data?.message || 'Failed to retrieve workspace symbols',
        error: {
          code: data?.error?.code || `HTTP_${res.status}`,
          detail: data?.error?.detail || 'Could not query workspace symbols'
        }
      };
    }
    return data;
  } catch (err) {
    return normalizeApiResponseError(err, 'Failed to fetch symbols from knowledge graph');
  }
}
