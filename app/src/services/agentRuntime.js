/**
 * Agent Runtime Integration Service (Phase 3)
 *
 * Connects to Intellego's FastAPI sidecar on loopback (127.0.0.1:8000).
 * Conforms strictly to GEMINI.md Section 3 (Platform Hard Rules) & Section 4 (Core Contracts).
 *
 * Ensures only structured ApiResponse error shapes reach the renderer — never raw stack traces.
 */

export const ENGINE_HOST = '127.0.0.1';
export const ENGINE_PORT = 8000;
export const ENGINE_BASE_URL = `http://${ENGINE_HOST}:${ENGINE_PORT}`;
export const WS_STREAM_URL = `ws://${ENGINE_HOST}:${ENGINE_PORT}/chat/stream`;
export const HTTP_STREAM_URL = `http://${ENGINE_HOST}:${ENGINE_PORT}/chat/stream`;

/**
 * Normalizes any error into the strict ApiResponse error shape defined in SPEC.md Section 8:
 * {
 *   success: false,
 *   message: string,
 *   error: { code: string, detail: string }
 * }
 */
export function normalizeApiResponseError(err, fallbackMessage = 'Agent Runtime error') {
  if (err && typeof err === 'object' && err.error && err.error.code) {
    return {
      success: false,
      message: err.message || fallbackMessage,
      error: {
        code: String(err.error.code),
        detail: String(err.error.detail || err.message || 'Unknown error')
      }
    };
  }

  const message = err?.message || String(err || fallbackMessage);
  let code = 'AGENT_RUNTIME_ERROR';
  let detail = message;

  if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('ECONNREFUSED')) {
    code = 'ENGINE_UNREACHABLE';
    detail = `FastAPI engine sidecar is not responding on ${ENGINE_HOST}:${ENGINE_PORT}. Ensure the sidecar process is running on loopback.`;
  } else if (message.includes('WebSocket')) {
    code = 'WS_CONNECTION_ERROR';
    detail = `WebSocket stream could not connect to ${WS_STREAM_URL}. The endpoint may be offline or rejecting connections.`;
  }

  return {
    success: false,
    message: fallbackMessage,
    error: {
      code,
      detail
    }
  };
}

/**
 * Checks health of the local FastAPI sidecar.
 */
export async function checkEngineHealth(timeoutMs = 1500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${ENGINE_BASE_URL}/health`, {
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) {
      return {
        online: false,
        error: {
          code: `HTTP_${res.status}`,
          detail: `Health check returned status ${res.status} ${res.statusText}`
        }
      };
    }
    const data = await res.json();
    return { online: true, data };
  } catch (e) {
    clearTimeout(timer);
    return {
      online: false,
      error: {
        code: 'SIDE_CAR_OFFLINE',
        detail: `Could not reach ${ENGINE_BASE_URL}/health. Engine sidecar is not running.`
      }
    };
  }
}

function processStreamChunk(chunk, currentFullText) {
  let combined = currentFullText + chunk;
  const previewTag = '__INTELLEGO_PREVIEW_JSON__:';
  const tagIndex = combined.indexOf(previewTag);
  if (tagIndex !== -1) {
    const jsonStr = combined.slice(tagIndex + previewTag.length).trim();
    try {
      const previews = JSON.parse(jsonStr);
      if (Array.isArray(previews) && previews.length > 0) {
        localStorage.setItem('intellego_active_preview', JSON.stringify(previews[0]));
        localStorage.setItem('intellego_pending_previews', JSON.stringify(previews));
      }
    } catch {}
    combined = combined.slice(0, tagIndex).trimEnd();
  }
  return combined;
}

function cleanPreviewJsonFromText(text) {
  if (!text) return '';
  const previewTag = '__INTELLEGO_PREVIEW_JSON__:';
  const tagIndex = text.indexOf(previewTag);
  if (tagIndex !== -1) {
    const jsonStr = text.slice(tagIndex + previewTag.length).trim();
    try {
      const previews = JSON.parse(jsonStr);
      if (Array.isArray(previews) && previews.length > 0) {
        localStorage.setItem('intellego_active_preview', JSON.stringify(previews[0]));
        localStorage.setItem('intellego_pending_previews', JSON.stringify(previews));
      }
    } catch {}
    return text.slice(0, tagIndex).trimEnd();
  }
  return text;
}

/**
 * Streams chat messages using real socket / HTTP stream from Agent Runtime.
 *
 * Protocol handling:
 * 1. Attempts WebSocket connection to `WS /chat/stream` per SPEC.md Section 8.
 * 2. If WS is unavailable or rejects (e.g. engine implements POST /chat/stream instead of WS),
 *    gracefully falls back to chunked HTTP POST streaming to preserve runtime integration.
 * 3. Enforces structured ApiResponse error normalization on all error branches.
 */
export async function streamChatMessage({
  message,
  sessionId,
  onThinking,
  onToken,
  onComplete,
  onError
}) {
  onThinking?.();

  // Try WebSocket connection first per SPEC.md Section 8
  const tryWebSocket = () => {
    return new Promise((resolve, reject) => {
      let ws;
      let connected = false;
      let hasError = false;
      let fullText = '';
      const connectionTimer = setTimeout(() => {
        if (!connected) {
          try {
            ws?.close();
          } catch {}
          reject(new Error('WebSocket connection timed out'));
        }
      }, 2500);

      try {
        ws = new WebSocket(WS_STREAM_URL);
      } catch (err) {
        clearTimeout(connectionTimer);
        return reject(err);
      }

      ws.onopen = () => {
        connected = true;
        clearTimeout(connectionTimer);
        const payload = JSON.stringify({
          message,
          sessionId: sessionId || null
        });
        ws.send(payload);
      };

      ws.onmessage = (event) => {
        try {
          const raw = event.data;
          // Check if payload is JSON-structured
          if (typeof raw === 'string' && raw.trim().startsWith('{') && !raw.includes('__INTELLEGO_PREVIEW_JSON__')) {
            const parsed = JSON.parse(raw);
            if (parsed.error) {
              hasError = true;
              onError?.(normalizeApiResponseError(parsed, 'Agent Runtime error from WebSocket'));
              try { ws?.close(); } catch {}
              return;
            }
            if (parsed.token) {
              fullText = processStreamChunk(parsed.token, fullText);
              onToken?.(parsed.token, fullText);
              return;
            }
          }
          fullText = processStreamChunk(raw, fullText);
          onToken?.(raw, fullText);
        } catch {
          fullText = processStreamChunk(event.data, fullText);
          onToken?.(event.data, fullText);
        }
      };

      ws.onerror = (e) => {
        clearTimeout(connectionTimer);
        reject(new Error('WebSocket stream connection failed'));
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimer);
        if (hasError) {
          return;
        }
        if (connected) {
          const cleanedText = cleanPreviewJsonFromText(fullText);
          onComplete?.(cleanedText);
          resolve(cleanedText);
        } else {
          reject(new Error(`WebSocket closed before handshake (code ${event.code})`));
        }
      };
    });
  };

  // Fallback to HTTP POST stream if WebSocket is not registered on the sidecar
  const tryHttpStream = async () => {
    let response;
    try {
      response = await fetch(HTTP_STREAM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain, application/json'
        },
        body: JSON.stringify({
          message,
          sessionId: sessionId || null
        })
      });
    } catch (networkErr) {
      throw normalizeApiResponseError(networkErr, 'Failed to connect to FastAPI Agent Runtime');
    }

    if (!response.ok) {
      let errBody;
      try {
        errBody = await response.json();
      } catch {
        const text = await response.text().catch(() => '');
        errBody = { detail: text || response.statusText };
      }

      throw {
        success: false,
        message: errBody.message || `Agent Runtime returned HTTP ${response.status}`,
        error: {
          code: errBody.error?.code || (response.status === 400 && errBody.detail?.includes('workspace') ? 'NO_ACTIVE_WORKSPACE' : `HTTP_${response.status}`),
          detail: errBody.error?.detail || errBody.detail || `Server responded with HTTP ${response.status} ${response.statusText}`
        }
      };
    }

    if (!response.body) {
      throw {
        success: false,
        message: 'Empty response stream from Agent Runtime',
        error: { code: 'EMPTY_STREAM', detail: 'Server did not return a readable stream.' }
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText = processStreamChunk(chunk, fullText);
        onToken?.(chunk, fullText);
      }
      const cleanedText = cleanPreviewJsonFromText(fullText);
      onComplete?.(cleanedText);
      return cleanedText;
    } catch (streamErr) {
      throw normalizeApiResponseError(streamErr, 'Stream read interrupted');
    }
  };

  // Execute WS first, fall back to HTTP stream
  try {
    await tryWebSocket();
  } catch (wsErr) {
    // Attempt HTTP stream as fallback because engine/main.py currently mounts POST /chat/stream
    try {
      await tryHttpStream();
    } catch (httpErr) {
      const normalized = normalizeApiResponseError(httpErr, 'Agent Runtime failed to respond');
      onError?.(normalized);
    }
  }
}
