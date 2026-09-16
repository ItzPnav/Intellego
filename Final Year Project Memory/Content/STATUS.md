# Project Status — Intellego

## Current Snapshot
*   **Active Phase:** V1 Implementation Complete — All 5 Phases Delivered and Verified.
*   **State:** V1 Ready for Final Review.
*   **Key Environment Versions:**
    *   Node.js: `v22.21.0`
    *   NPM: `10.8.2`
    *   Python: `3.14.3`
    *   pip: `26.1.2`
    *   Electron: `29.4.6`
    *   Vite: `5.4.21`

---

## Current Status Summary (All Phases Delivered)
*   **Phase 1 (App Shell Scaffold & System A Tokens):** Complete. Implemented verbatim System A CSS custom properties, responsive Electron shell with React 18, sidebar navigation, top header, input wrapper, and mobile drawer.
*   **Phase 2 (Chat Surface & Message Rendering):** Complete. Mode switching from welcome to chat, custom `MarkdownRenderer` with code blocks, user/assistant message bubbles, thinking dots-loader, streaming cursor, auto-growing bottom bar, and toast notifications.
*   **Phase 3 (Agent Runtime Integration):** Complete. Live client connected to loopback `127.0.0.1:8000`, chunked streaming response parser, strict `ApiResponse` error normalization preventing raw exceptions, and inline retry handling.
*   **Phase 4 (System B Document Surfaces — Diff Viewer & Graph Explorer):** Complete. Pure `.doc-surface` isolation with `--ink`, `--paper`, `--accent: #d4432c`, Courier New typography, 900 italic uppercase Georgia headers, zero border-radius, hard `6px 6px 0 var(--ink)` offset shadows; unified diff preview with multi-file queue management and explicit preview-id-gated acceptance (`POST /edit/apply`); live Semantic Knowledge Graph Explorer querying `GET /workspace/symbols` with interactive kind filtering and search.
*   **Phase 5 (Workspace Open/Index, Git Status/Commit, Settings & Guardrail Verification):** Complete.
    *   Native Electron directory picker via `dialog:openDirectory` IPC without direct Python execution.
    *   `POST /workspace/open` connected with automatic `POST /workspace/index` triggering per Section 4 Repository Intelligence Engine contract.
    *   `WorkspacePanel.jsx` with full state machine (`UNOPENED` → `OPENING` → `INDEXING` → `READY` → `ERROR`) and live symbol stats.
    *   `GitPanel.jsx` querying `GET /git/status` and committing via `POST /git/commit`, with user button click acting as the required approval gate.
    *   `SettingsModal.jsx` displaying read-only platform invariants and verifying that `NEMOTRON_API_KEY` is securely sourced from `.env` and never editable from the UI.
    *   Sidebar navigation fully wired across all views: Workspace, Chat, Diff / Git, Graph, and Settings.
    *   Automated test suites: 16 engine unit tests (`engine/test_suite.py`) and 6 frontend test suites (`app/test_services.js`), both 100% passing. Production Vite build passing (0 errors).

---

## Hard Rules & Guardrails Audit (GEMINI.md §3 & §6)
1. **Local-First, Loopback-Only (§3.1):** Engine bound strictly to `127.0.0.1:8000`. No external network exposure.
2. **Renderer-Engine Decoupling (§3.2):** Renderer communicates strictly across HTTP JSON and WebSocket boundaries; never imports or executes Python directly.
3. **Fixed V1 Stack (§3.3):** Electron + React/Vite + FastAPI + Tree-sitter + LangGraph + SQLite + NVIDIA Nemotron. No secondary stack layers introduced.
4. **Secrets Isolation (§3.4):** `NEMOTRON_API_KEY` exists exclusively in `.env` sourced from `.env.example`. Never hardcoded, never logged, never editable from UI.
5. **Gated Filesystem & Git Writes (§3.5):** All filesystem writes gated by `edit/preview` → `edit/apply` with unexpired preview IDs. Git commits require explicit user submit click.
6. **Workspace Scope (§3.6):** All tool calls and index operations strictly scoped to the active workspace `rootPath`.
7. **No Second LLM Provider (§6):** NVIDIA Nemotron Build API is the sole provider across all services and configuration screens.
8. **No CLI Entry Point (§6):** Pure native desktop application interface.
9. **Immutable ApiResponse Envelope (§6):** All endpoints strictly adhere to `{ success, message, data?, error? }`.

---

## Next Actions
1.  **Final User Review:** Present completed V1 system architecture and verification to user.
2.  **ACP Approval:** Wait for user instruction before running custom command `/acp`.

---

## Blockers
*   None.


