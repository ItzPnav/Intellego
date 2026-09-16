/**
 * Workspace, Git, and Engine Configuration Service (Phase 5)
 *
 * Adheres strictly to GEMINI.md:
 * - Section 3.1: Bound to loopback 127.0.0.1 only.
 * - Section 3.2: Renderer communicates with FastAPI sidecar solely via HTTP JSON endpoints.
 * - Section 3.5: All actions follow explicit user-approval gates.
 * - Section 4: Auto-triggers indexing on workspace/open via Repository Intelligence Engine.
 * - Section 6: Maintains immutable ApiResponse envelope: { success, message, data, error }.
 */

import { ENGINE_BASE_URL, normalizeApiResponseError } from './agentRuntime.js';

/**
 * Triggers native Electron folder picker to select a directory path.
 * Falls back to prompt() in browser/mock environments.
 */
export async function selectDirectoryNative() {
  if (window.electronAPI?.openDirectoryDialog) {
    try {
      const selectedPath = await window.electronAPI.openDirectoryDialog();
      return selectedPath || null;
    } catch (err) {
      console.warn('Native openDirectoryDialog failed, falling back:', err);
    }
  }

  // Fallback for browser dev mode
  const manualPath = window.prompt('Enter workspace root directory path:');
  return manualPath ? manualPath.trim() : null;
}

/**
 * Opens a workspace and automatically triggers indexing per Section 4 RIE contract.
 *
 * @param {string} path Absolute path to workspace root
 * @param {function} onPhaseChange Optional progress callback ('OPENING' | 'INDEXING' | 'READY' | 'ERROR')
 */
export async function openWorkspace(path, onPhaseChange) {
  if (!path || typeof path !== 'string') {
    return {
      success: false,
      message: 'Workspace path must be specified',
      error: { code: 'INVALID_PATH', detail: 'A valid filesystem directory path is required.' }
    };
  }

  try {
    if (onPhaseChange) onPhaseChange('OPENING', 'Opening workspace directory and initializing SQLite store...');

    // 1. POST /workspace/open
    const openRes = await fetch(`${ENGINE_BASE_URL}/workspace/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });

    const openData = await openRes.json().catch(() => null);

    if (!openRes.ok || !openData?.success) {
      const err = {
        success: false,
        message: openData?.message || `Failed to open workspace (HTTP ${openRes.status})`,
        error: {
          code: openData?.error?.code || `HTTP_${openRes.status}`,
          detail: openData?.error?.detail || 'Directory does not exist or could not be accessed.'
        }
      };
      if (onPhaseChange) onPhaseChange('ERROR', err.message);
      return err;
    }

    // 2. Auto-trigger Repository Intelligence Engine indexing (Section 4 contract)
    if (onPhaseChange) onPhaseChange('INDEXING', 'Indexing repository symbols with Tree-sitter...');

    const indexRes = await fetch(`${ENGINE_BASE_URL}/workspace/index`, {
      method: 'POST'
    });

    const indexData = await indexRes.json().catch(() => null);

    if (!indexRes.ok || !indexData?.success) {
      console.warn('Auto-index encountered an issue:', indexData);
      // Even if indexing errors, workspace is still open in degraded state per SPEC.md §2
      if (onPhaseChange) onPhaseChange('ERROR', indexData?.message || 'Indexing failed to complete');
      return {
        success: true,
        message: 'Workspace opened, but indexing encountered an issue',
        data: {
          ...openData.data,
          state: 'ERROR',
          indexError: indexData?.error
        }
      };
    }

    if (onPhaseChange) onPhaseChange('READY', 'Workspace indexed and ready');

    return {
      success: true,
      message: 'Workspace opened and indexed successfully',
      data: {
        ...openData.data,
        state: 'READY',
        symbolCount: indexData?.data?.symbolCount || 0,
        lastIndexedAt: indexData?.data?.lastIndexedAt
      }
    };
  } catch (err) {
    const norm = normalizeApiResponseError(err, 'Failed to connect to workspace service');
    if (onPhaseChange) onPhaseChange('ERROR', norm.message);
    return norm;
  }
}

/**
 * Retrieves the current workspace status from FastAPI sidecar (GET /workspace/status).
 */
export async function getWorkspaceStatus() {
  try {
    const res = await fetch(`${ENGINE_BASE_URL}/workspace/status`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return {
        success: false,
        message: data?.message || 'Failed to fetch workspace status',
        error: {
          code: data?.error?.code || `HTTP_${res.status}`,
          detail: data?.error?.detail || 'Could not query workspace status'
        }
      };
    }
    return data;
  } catch (err) {
    return normalizeApiResponseError(err, 'FastAPI sidecar unreachable for workspace status');
  }
}

/**
 * Closes the active workspace (POST /workspace/close).
 */
export async function closeWorkspace() {
  try {
    const res = await fetch(`${ENGINE_BASE_URL}/workspace/close`, {
      method: 'POST'
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return {
        success: false,
        message: data?.message || 'Failed to close workspace',
        error: {
          code: data?.error?.code || `HTTP_${res.status}`,
          detail: data?.error?.detail || 'Could not close workspace'
        }
      };
    }
    return data;
  } catch (err) {
    return normalizeApiResponseError(err, 'Failed to close workspace');
  }
}

/**
 * Retrieves git status for the active workspace (GET /git/status).
 */
export async function getGitStatus() {
  try {
    const res = await fetch(`${ENGINE_BASE_URL}/git/status`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return {
        success: false,
        message: data?.message || 'Failed to retrieve git status',
        error: {
          code: data?.error?.code || `HTTP_${res.status}`,
          detail: data?.error?.detail || 'Git status check failed'
        }
      };
    }
    return data;
  } catch (err) {
    return normalizeApiResponseError(err, 'Failed to retrieve git status');
  }
}

/**
 * Commits approved changes (POST /git/commit).
 *
 * Gating rule: The user's explicit click on "Commit" acts as the approval gate.
 * Never executes automatically or silently.
 */
export async function commitGit(message) {
  if (!message || !message.trim()) {
    return {
      success: false,
      message: 'Commit message cannot be empty',
      error: { code: 'EMPTY_COMMIT_MESSAGE', detail: 'A descriptive commit message is required.' }
    };
  }

  try {
    const res = await fetch(`${ENGINE_BASE_URL}/git/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.trim() })
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return {
        success: false,
        message: data?.message || 'Failed to execute git commit',
        error: {
          code: data?.error?.code || `HTTP_${res.status}`,
          detail: data?.error?.detail || 'Git commit command failed.'
        }
      };
    }
    return data;
  } catch (err) {
    return normalizeApiResponseError(err, 'Git commit operation failed');
  }
}

/**
 * Reads effective configuration from FastAPI sidecar (GET /config).
 * Strictly read-only for inspection.
 */
export async function getEngineConfig() {
  try {
    const res = await fetch(`${ENGINE_BASE_URL}/config`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return {
        success: false,
        message: data?.message || 'Failed to retrieve configuration',
        error: {
          code: data?.error?.code || `HTTP_${res.status}`,
          detail: data?.error?.detail || 'Could not fetch engine config'
        }
      };
    }
    return data;
  } catch (err) {
    return normalizeApiResponseError(err, 'Configuration retrieval failed');
  }
}

/**
 * Retrieves persisted symbols for active workspace (GET /workspace/symbols).
 * Supports optional filtering by kind ('class' | 'function' | 'variable' | 'import' | 'export') or query.
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

/* ==========================================================================
   Workspace Persistence Helpers (LocalStorage)
   Keeps track of all added workspaces across app restarts
   ========================================================================== */
const WORKSPACES_STORAGE_KEY = 'intellego_workspaces';
const ACTIVE_WORKSPACE_KEY = 'intellego_active_workspace';

export function getSavedWorkspaces() {
  try {
    const raw = localStorage.getItem(WORKSPACES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveWorkspaceToList(ws) {
  try {
    const list = getSavedWorkspaces();
    const folderName = ws.rootPath ? ws.rootPath.split(/[\\/]/).filter(Boolean).pop() : 'Untitled Workspace';
    const existingIndex = list.findIndex(
      (item) => (item.rootPath && ws.rootPath && item.rootPath.toLowerCase() === ws.rootPath.toLowerCase()) || item.id === ws.id
    );
    const existing = existingIndex >= 0 ? list[existingIndex] : null;
    const updated = {
      ...existing,
      ...ws,
      id: ws.id || existing?.id || `ws-${Date.now()}`,
      name: ws.name || existing?.name || folderName,
      description: ws.description || existing?.description || `Repository workspace at ${ws.rootPath || ''}`,
      dateStr: ws.dateStr || existing?.dateStr || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pinned: ws.pinned ?? existing?.pinned ?? false,
      chats: ws.chats || existing?.chats || []
    };
    if (existingIndex >= 0) {
      list[existingIndex] = updated;
    } else {
      list.unshift(updated);
    }
    localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(list));
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, JSON.stringify(updated));
    return list;
  } catch (err) {
    console.error('Failed to save workspace to localStorage:', err);
    return getSavedWorkspaces();
  }
}

export function getSavedActiveWorkspace() {
  try {
    const raw = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSavedActiveWorkspace(ws) {
  try {
    if (ws) {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, JSON.stringify(ws));
    } else {
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    }
  } catch (err) {
    console.error('Failed to update active workspace in localStorage:', err);
  }
}

export function removeSavedWorkspace(wsId) {
  try {
    const list = getSavedWorkspaces().filter((item) => item.id !== wsId);
    localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(list));
    return list;
  } catch {
    return getSavedWorkspaces();
  }
}

/* ==========================================================================
   Project Chat Session Helpers
   ========================================================================== */
export function addProjectChat(projectId, chat) {
  try {
    const list = getSavedWorkspaces();
    const pIndex = list.findIndex((p) => p.id === projectId);
    if (pIndex >= 0) {
      const chats = list[pIndex].chats || [];
      const newChat = {
        id: chat.id || `chat-${Date.now()}`,
        title: chat.title || 'New Chat',
        dateStr: chat.dateStr || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        pinned: false,
        messages: chat.messages || [],
        createdAt: new Date().toISOString()
      };
      list[pIndex].chats = [newChat, ...chats];
      localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(list));
      return { list, newChat };
    }
  } catch (err) {
    console.error('Failed to add project chat:', err);
  }
  return { list: getSavedWorkspaces(), newChat: chat };
}

export function updateProjectChat(projectId, chatId, updates) {
  try {
    const list = getSavedWorkspaces();
    const pIndex = list.findIndex((p) => p.id === projectId);
    if (pIndex >= 0) {
      list[pIndex].chats = (list[pIndex].chats || []).map((c) =>
        c.id === chatId ? { ...c, ...updates } : c
      );
      localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(list));
      return list;
    }
  } catch (err) {
    console.error('Failed to update project chat:', err);
  }
  return getSavedWorkspaces();
}

export function deleteProjectChat(projectId, chatId) {
  try {
    const list = getSavedWorkspaces();
    const pIndex = list.findIndex((p) => p.id === projectId);
    if (pIndex >= 0) {
      list[pIndex].chats = (list[pIndex].chats || []).filter((c) => c.id !== chatId);
      localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(list));
      return list;
    }
  } catch (err) {
    console.error('Failed to delete project chat:', err);
  }
  return getSavedWorkspaces();
}

export function moveChatToProject(sourceProjectId, targetProjectId, chatId) {
  try {
    const list = getSavedWorkspaces();
    const srcIndex = list.findIndex((p) => p.id === sourceProjectId);
    const tgtIndex = list.findIndex((p) => p.id === targetProjectId);
    if (srcIndex >= 0 && tgtIndex >= 0) {
      const chatToMove = (list[srcIndex].chats || []).find((c) => c.id === chatId);
      if (chatToMove) {
        list[srcIndex].chats = list[srcIndex].chats.filter((c) => c.id !== chatId);
        list[tgtIndex].chats = [chatToMove, ...(list[tgtIndex].chats || [])];
        localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(list));
        return list;
      }
    }
  } catch (err) {
    console.error('Failed to move chat between projects:', err);
  }
  return getSavedWorkspaces();
}

/**
 * Generates an AI-styled 3-4 word chat title based on the first prompt.
 */
export async function generateChatTitle(firstPrompt) {
  if (!firstPrompt || typeof firstPrompt !== 'string') return 'New chat';
  const clean = firstPrompt.trim().replace(/[^\w\s]/gi, '');
  
  // Fast heuristic extraction (3-4 words)
  const stopWords = new Set(['how', 'can', 'you', 'i', 'the', 'a', 'an', 'to', 'in', 'for', 'of', 'and', 'is', 'it', 'on', 'please', 'help', 'me']);
  const words = clean.split(/\s+/).filter((w) => w.length > 0 && !stopWords.has(w.toLowerCase()));
  
  let title = '';
  if (words.length >= 3) {
    title = words.slice(0, 4).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  } else {
    title = clean.split(/\s+/).slice(0, 4).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  
  return title || 'New chat';
}


