import React, { useState, useRef, useEffect } from 'react';
import MessageItem from './MessageItem';
import { streamChatMessage, normalizeApiResponseError } from '../services/agentRuntime';

export const INITIAL_MOCK_MESSAGES = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'How does the Repository Intelligence Engine extract AST symbols and persist them to the SQLite knowledge graph?'
  },
  {
    id: 'msg-2',
    role: 'assistant',
    status: 'done',
    content: `The **Repository Intelligence Engine (RIE)** utilizes Tree-sitter grammars to parse source files into Abstract Syntax Trees without executing code.

### Parser & Extraction Workflow
1. **Parser Pipeline**: Tree-sitter generates an AST for each source file in the active Workspace root.
2. **Symbol Extraction**: Classes, methods, functions, and import dependencies are mapped into nodes and relational edges.
3. **Incremental SQLite Storage**: Symbols and checksums are persisted into SQLite (\`.intellego/workspace.db\`). When a file changes, only affected subtrees are re-indexed rather than performing a full repository rescan.

Here is an architectural excerpt of how symbol nodes are defined:
\`\`\`python
@dataclass(frozen=True)
class SymbolNode:
    symbol_id: str
    file_path: str
    symbol_type: str  # 'function' | 'class' | 'module'
    name: str
    line_start: int
    line_end: int
    dependencies: list[str]
\`\`\`
The Context Engine queries this graph directly before passing minimal context slices to LangGraph.`
  },
  {
    id: 'msg-3',
    role: 'user',
    content: 'What are the rules governing filesystem edits before they are written to disk?'
  },
  {
    id: 'msg-4',
    role: 'assistant',
    status: 'done',
    content: `Under **Section 3.5 of GEMINI.md**, Intellego strictly enforces a **diff-before-apply** security protocol:

* Every mutation must pass through \`POST /edit/preview\` before reaching \`POST /edit/apply\`.
* The Tool Runtime produces a unified diff and returns an unexpired \`preview_id\`.
* No tool, agent, or shortcut may write to disk or mutate git state without explicit user review and approval in the desktop UI.
* All file operations are strictly scoped to the active Workspace root.`
  },
  {
    id: 'msg-5',
    role: 'user',
    content: 'Can we add an Ollama or OpenAI fallback provider to the backend engine?'
  },
  {
    id: 'msg-6',
    role: 'assistant',
    status: 'done',
    content: `No. Per **Section 3.3 and Section 6 of GEMINI.md**:

> **Hard Guardrail**: NVIDIA Nemotron (via NVIDIA Build API) is the **sole LLM provider for V1**. Never introduce a second provider integration until multi-provider support is officially scheduled on the roadmap.`
  },
  {
    id: 'msg-7',
    role: 'user',
    content: 'How is the communication boundary structured between the Electron renderer and FastAPI?'
  },
  {
    id: 'msg-8',
    role: 'assistant',
    status: 'done',
    content: `The boundary is strictly decoupled across localhost:

1. **Electron Renderer**: Runs React + Vite with no direct Python runtime access.
2. **FastAPI Sidecar**: Binds exclusively to \`127.0.0.1\` (loopback only, never exposed to external networks).
3. **Transport Protocol**: Standard JSON API over HTTP for workspace and editing endpoints, and \`WS /chat/stream\` for streaming agent reasoning events.`
  }
];

export default function ChatMode({ messages, setMessages, onToast, pendingPrompt, onClearPendingPrompt }) {
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll on new message or streaming chunk
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (pendingPrompt) {
      executeAgentStream(pendingPrompt);
      onClearPendingPrompt?.();
    }
  }, [pendingPrompt]);

  // Textarea auto-grow up to max height
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  };

  /**
   * Dispatches a real streamed prompt to the Agent Runtime.
   */
  const executeAgentStream = async (promptText) => {
    if (!promptText || isStreaming) return;
    setIsStreaming(true);

    const asstMsgId = `asst-${Date.now()}`;

    // Place placeholder assistant message in thinking state
    setMessages((prev) => [
      ...prev,
      {
        id: asstMsgId,
        role: 'assistant',
        status: 'thinking',
        content: '',
        error: null
      }
    ]);

    await streamChatMessage({
      message: promptText,
      sessionId: null, // Let engine associate with active session
      onThinking: () => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === asstMsgId ? { ...msg, status: 'thinking' } : msg
          )
        );
      },
      onToken: (token, fullText) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === asstMsgId
              ? { ...msg, status: 'streaming', content: fullText }
              : msg
          )
        );
      },
      onComplete: (finalText) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === asstMsgId
              ? { ...msg, status: 'done', content: finalText }
              : msg
          )
        );
        setIsStreaming(false);
        if (onToast) onToast('Response complete');
      },
      onError: (structuredError) => {
        // Enforce Section 4: Only structured ApiResponse error reaches the DOM
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === asstMsgId
              ? {
                  ...msg,
                  status: 'done',
                  error: structuredError.error || {
                    code: 'UNKNOWN_ERROR',
                    detail: structuredError.message || 'An error occurred'
                  }
                }
              : msg
          )
        );
        setIsStreaming(false);
        if (onToast) onToast(`Agent error: ${structuredError.error?.code || 'Failed'}`);
      }
    });
  };

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isStreaming) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Call real Agent Runtime
    executeAgentStream(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Rule 4: Wire retry button to resubmit the last user message through the real socket.
   */
  const handleRetry = (failedMessage) => {
    if (isStreaming) return;

    // Find the closest preceding user message
    let lastUserPrompt = '';
    const failedIndex = messages.findIndex((m) => m.id === failedMessage.id);
    for (let i = failedIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserPrompt = messages[i].content;
        break;
      }
    }

    if (!lastUserPrompt) {
      lastUserPrompt = 'Please retry the last request';
    }

    // Remove the failed message and re-execute
    setMessages((prev) => prev.filter((m) => m.id !== failedMessage.id));
    executeAgentStream(lastUserPrompt);
    if (onToast) onToast('Retrying message with Agent Runtime...');
  };

  const hasContent = inputText.trim().length > 0;

  return (
    <div id="chat-mode">
      {/* Messages Scrollable Region (#messages) */}
      <div id="messages" tabIndex={0} role="region" aria-label="Chat messages">
        <div className="messages-inner">
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              onToast={onToast}
              onRetry={handleRetry}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar Region (#bottom-bar) */}
      <div id="bottom-bar">
        <div className="input-wrapper-chat">
          {/* Main auto-grow textarea */}
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            rows={1}
            placeholder="Ask Nemotron about this workspace, repository AST, or plan diff..."
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            aria-label="Message prompt input"
          />

          {/* Bottom Bar Controls: model pill, quality pill, attach button, send button */}
          <div className="bottom-bar-controls">
            <div className="controls-left">
              {/* Sole V1 Model Pill */}
              <div className="model-chip" title="NVIDIA Nemotron (Sole V1 LLM Provider)">
                <span className="chip-dot" />
                <span className="chip-label">Nemotron</span>
              </div>

              {/* Quality Pill */}
              <div className="quality-chip" title="Context Profile">
                <span className="chip-label">Precise (Tree-sitter AST)</span>
              </div>

              {/* Non-functional attach icon button */}
              <button
                type="button"
                className="attach-btn"
                aria-label="Attach File (Not in scope for V1)"
                title="File attach (Out of scope for V1)"
                onClick={() => onToast && onToast('File attach is out of scope for V1')}
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
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
            </div>

            <div className="controls-right">
              {/* Send Button enabled/disabled strictly on textarea content */}
              <button
                type="button"
                className={`chat-send-btn ${hasContent && !isStreaming ? 'active' : 'disabled'}`}
                disabled={!hasContent || isStreaming}
                onClick={handleSend}
                aria-label="Send Message"
                title={hasContent ? 'Send message to Agent Runtime' : 'Type a prompt to send'}
              >
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
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
