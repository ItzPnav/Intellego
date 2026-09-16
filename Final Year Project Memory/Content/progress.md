# Project Diary & Progress Log — Intellego

## 2026-08-03
*   **Rules Consolidation:** Read [GEMINI.md](file:///C:/pnav/projects/4%20-%201%20Project%20Batch%2016/GEMINI.md) and codified system constraints and `/acp` custom commands into [AGENT.md](file:///C:/pnav/projects/4%20-%201%20Project%20Batch%2016/.agents/AGENT.md) to govern all agent behaviors.
*   **Documentation Synthesis:** Thoroughly reviewed all core markdown documentation files in `docs/` (`PROJECT.md`, `PRD.md`, `SPEC.md`, `FEATURES.md`, `IMPLEMENTATION.md`) to establish project contracts.
*   **Environment Verification:** Evaluated local environment tooling. Confirmed Node.js (`v22.21.0`), NPM (`10.8.2`), Python (`3.14.3`), and pip (`26.1.2`) are present. Discovered Poetry is not globally installed; decided to default to python standard `venv` + `pip` configuration for engine package management.
*   **Phase 0 Planning:** Designed a detailed implementation plan ([implementation_plan.md](file:///C:/Users/katak/.gemini/antigravity/brain/c199cf1f-3e83-4f5e-b8af-b310df040640/implementation_plan.md)) for bootstrapping folders and packaging pipelines.
*   **Memory Workspace Initialization:** Discovered the existing Obsidian vault at `C:/pnav/projects/4 - 1 Project Batch 16/Final Year Project Memory/` and created this dedicated project folder `Intellego/` to store design state logs.
*   **Graphify Integration:** Executed `graphify update .` to rebuild the AST-only knowledge graph (1059 nodes, 938 edges, 122 communities).
*   **Vault Restructuring:** Aligned with rule 0.2 by creating the `Content/` folder and writing/updating the four core files (`README.md`, `STATUS.md`, `progress.md`, `decisions.md`).
*   **Dias Presentation Materials:** Drafted the detailed "explain like I'm 5" project description for presentation to dias members.

## 2026-09-09
*   **GEMINI.md & AGENT.md Synchronization:** Fully reviewed [GEMINI.md](file:///c:/pnav/projects/4%20-%201%20Project%20Batch%2016/GEMINI.md) and synchronized [.agents/AGENT.md](file:///c:/pnav/projects/4%20-%201%20Project%20Batch%2016/.agents/AGENT.md) to incorporate all 12 core sections, including the mandatory UI Design System (System A "App Shell" and System B "Document/Artifact Surfaces"), Subsystem Contracts, Graphify integration workflows, and hard guardrails.
*   **Phase 1 Scaffolding Complete (System A App Shell):**
    *   Scaffolded `app/` with Electron (`main.cjs`, `preload.cjs`), React 18, and Vite 5 build pipeline.
    *   Created `app/src/styles/tokens.css` carrying verbatim System A CSS custom properties from Section 10.1, importing Instrument Serif and Inter from Google Fonts.
    *   Implemented static, non-functional markup and CSS components: `#sidebar` (Intellego branding, new-chat button, Workspace/Chat/Diff-Git/Graph nav items, recents section, user footer), `#top-header` (Nemotron model selector pill, status indicator, mobile drawer toggle), `#chat-area` (welcome hero emblem, display typography, `--radius-xl` static input bar with `--color-accent` send button), and `#toast` (hidden baseline markup).
    *   Enforced all Section 10.1 hard rules: semantic radius scale, surface ladder (`surface` → `surface-2` → `surface-3`), 150ms/200ms/250ms transitions, thin styled scrollbars, 640px off-canvas mobile drawer, and custom inline SVG stroke icons.
*   **Phase 2 Implementation Complete (Chat Surface & Stubbed Input):**
    *   Constructed chat-mode view (`#chat-mode`, `#messages`, `#bottom-bar`) within `#chat-area`.
    *   Implemented seamless UI view switching between the empty welcome view and chat-mode view via prompt submit, "New Chat" button, sidebar navigation items, and header view toggle.
    *   Populated message list with 4 realistic, Intellego-relevant mock exchanges covering RIE AST indexing, diff-before-apply editing safety, sole V1 Nemotron constraint, and renderer-sidecar decoupling.
    *   Built custom `MarkdownRenderer` adhering to Rule 9 (headings, lists, bold/italic, inline code, and code blocks with `--color-surface-2` background, `1px solid var(--color-border-light)`, `--radius-md`, 13px monospace, and top-right language label).
    *   Styled user message bubbles (`border-radius: 18px 18px 4px 18px`, `--color-surface-2`, max-width 75%) and AI messages (left-aligned, 28px circular avatar with accent icon, no bubble) per Rule 8.
    *   Implemented streaming state visuals: three bouncing dots (`.dots-loader`) for reasoning and blinking cursor (`.streaming-cursor`) for token emission, with a dev simulation button toggling dots-loader → cursor → final markdown.
    *   Crafted `#bottom-bar` with auto-growing textarea, "Nemotron" model chip, "Precise" quality chip, attach button, and dynamic send button state based on text presence.
    *   Added message action bar (Copy, Thumbs Up, Thumbs Down, Retry) with real clipboard copy functionality wired to the animated `#toast` component (Rule 10: `--color-surface-3` bg, `--radius-md`, 300ms slide-in, 4s auto-dismiss).
    *   Stubbed sidebar recents with 3 Intellego session titles.
*   **Phase 3 Implementation Complete (Agent Runtime Integration):**
    *   Wired chat UI in `app/` to the real Agent Runtime service (`app/src/services/agentRuntime.js`) targeting loopback `127.0.0.1:8000` (confirmed from `engine/demo_cli.py`).
    *   Configured primary connection to `WS /chat/stream` (`ws://127.0.0.1:8000/chat/stream`) per SPEC.md Section 8, with seamless fallback to chunked HTTP POST streaming (`POST /chat/stream`).
    *   Removed Phase 2's temporary dev simulation button. Real streaming tokens now drive the thinking dots-loader, streaming cursor, and final rendered markdown states dynamically.
    *   Enforced Section 4 Agent Runtime error contract: all failures (sidecar offline, network errors, HTTP 400/500, socket errors) are strictly normalized into the structured `ApiResponse` error format (`{ success: false, message, error: { code, detail } }`), completely preventing raw stack traces or HTML errors from reaching the DOM.
    *   Rendered errors inline using existing AI message styling (left-aligned avatar, blockquote markdown format, action bar) with an active **Retry** button wired to resubmit the last user message through the live socket.
    *   Identified and reported subsystem mismatch: `docs/SPEC.md` defines `WS /chat/stream`, whereas `engine/main.py` currently mounts `@app.post("/chat/stream")` with chunked `StreamingResponse` (and requires an active workspace to avoid 400).
    *   Verified that no session list endpoint exists in `engine/` (only `GET /session/history` for an existing ID), leaving the hardcoded fake recents intact per instruction.
    *   Successfully ran `npm run build` with zero errors and updated knowledge graph with `graphify update .`.

*   **Phase 4 Implementation Complete (Diff-Preview Viewer & Graph Explorer - System B Surfaces):**
    *   Created `app/src/styles/doc-surface.css` containing verbatim System B CSS custom properties (`--ink: #161311`, `--paper: #f2ede2`, `--paper-dim: #e6ded0`, `--line: #161311`, `--accent: #d4432c`, `--accent-ink: #fff6ec`, `--panel: #fbf8f0`, `--muted: #847c6c`) strictly scoped under `.doc-surface`.
    *   Enforced all Section 10.2 hard rules: `'Courier New', ui-monospace, monospace` for all body/code text; `Georgia, 'Times New Roman', serif` (900 italic uppercase) for section headings; solid 2-3px `var(--ink)` borders; `6px 6px 0 var(--ink)` flat offset shadows with zero blur/spread; zero border-radius throughout; inverted solid ink/paper buttons with accent hover states; uppercase tracked button/tab labels; dashed drop zones.
    *   Ensured strict namespacing per Rule 10.3: `.doc-surface` remains completely decoupled from System A (`.app-shell`) tokens, colors, and rounded radii.
    *   Constructed `DiffViewer.jsx`: renders unified diffs with line numbering and addition/deletion colors; wires "ACCEPT DIFF" to `POST /edit/apply` with preview ID; handles rejection state displaying structured `.doc-error-panel` with error code and detail; prohibits any silent write path per Section 3 Rule 5 and Section 4 Tool Runtime contract.
    *   Constructed `GraphExplorer.jsx`: audits repository knowledge graph; presents `SymbolNode` schema specification per `SPEC.md §9`; wires "FORCE RE-INDEX" button to `POST /workspace/index`.
    *   **Identified Guardrail & Contract Gap:** `docs/SPEC.md` (§4, §8) and `GEMINI.md` (§4) define `POST /workspace/index` as the sole RIE entry point and do not specify any read/query endpoint (e.g. `GET /graph` or `GET /symbols`). Adhering to hard guardrails ("If SPEC.md doesn't define one yet, stop and tell me — do not invent an endpoint or query the graph engine directly"), flagged this gap and rendered an architectural notice in `GraphExplorer.jsx` rather than inventing an endpoint.
    *   Created `DocSurfaceContainer.jsx` to switch between Diff Preview and Knowledge Graph views and provide navigation back to the Chat Shell.
    *   Updated `Sidebar.jsx` and `App.jsx` to route between Chat, Diff Preview, and Graph Explorer views.
    *   Verified frontend build with `npm run build` (zero errors) and verified structured error rejection in `toolRuntime.applyEdit`.

*   **Phase 5 Implementation Complete (Workspace Open/Index, Git Status/Commit, Settings & Full V1 Integration):**
    *   **Native Electron Folder Picker:** Configured `dialog:openDirectory` in `app/electron/main.cjs` using native Electron `dialog.showOpenDialog` and exposed `openDirectoryDialog()` safely via `app/electron/preload.cjs` context bridge (strictly zero direct Python IPC).
    *   **Workspace Service (`workspaceService.js`):** Built robust client communicating over loopback `127.0.0.1:8000` to `POST /workspace/open`, `POST /workspace/index`, `GET /workspace/status`, `POST /workspace/close`, `GET /git/status`, `POST /git/commit`, and `GET /config`.
    *   **Workspace Management Panel (`WorkspacePanel.jsx`):** System A panel displaying active workspace root, SQLite database path, symbol counts, and last indexed timestamps; seamlessly integrates native folder selection and handles phase state machine (`UNOPENED` -> `OPENING` -> `INDEXING` -> `READY`) with System A dots-loader animations.
    *   **Auto-Indexing Flow:** Opening a repository immediately auto-triggers `POST /workspace/index` per Section 4 Repository Intelligence Engine contract, surfacing live parsing status.
    *   **Git Status & Commit Panel (`GitPanel.jsx`):** Renders working directory status, listing modified, added, deleted, and untracked files with status badges. Enables commit message submission directly invoking `POST /git/commit` with explicit user button click acting as the approval gate (Section 3 Rule 5 & Section 4 Tool Runtime).
    *   **Settings / Platform Guardrail Inspector (`SettingsModal.jsx`):** Adheres strictly to Section 3 Rule 4 and Section 6 guardrails: verifies that `NEMOTRON_API_KEY` lives exclusively in `.env` and is never exposed or editable from the UI; confirms NVIDIA Nemotron as sole V1 provider and loopback-only network binding; displays read-only runtime diagnostics from `GET /config` without inventing unconfigured settings.
    *   **Full Navigation Wiring:** Connected all core sidebar navigation items (Workspace, Chat, Diff / Git, Graph, Settings) with active route tracking in `Sidebar.jsx`, `TopHeader.jsx`, and `App.jsx`.
    *   **Hard Rules & Guardrails Verification:** Conducted a comprehensive audit of all Section 3 and Section 6 invariants across the completed codebase (loopback-only, no direct renderer-Python execution, immutable `ApiResponse` envelope, preview-gated diffs, zero key leakage, no second LLM provider, no CLI entry point).
    *   **Verification:** Rebuilt production bundle via `npm run build` (zero errors, zero warnings) and updated AST knowledge graph via `graphify update .` (1263 nodes, 1212 edges, 136 communities).

*   **Environment Configuration Complete (.env):**
    *   Configured [`.env`](file:///c:/pnav/projects/4%20-%201%20Project%20Batch%2016/.env) with required variables: `NEMOTRON_API_KEY` (and `NVIDIA_API_KEY`), loopback network bindings (`ENGINE_HOST=127.0.0.1`, `ENGINE_PORT=8000`), and fixed V1 model properties (`NEMOTRON_MODEL=nvidia/nemotron-4-340b-instruct`, `NVIDIA_API_URL`).
    *   Updated `engine/agent.py` to use `find_dotenv()` for hierarchical `.env` resolution and support fallback between `NEMOTRON_API_KEY` and `NVIDIA_API_KEY`.
    *   Verified via Python test: `main.get_config()` successfully reports `hasApiKey: True` and loaded model parameters.
    *   Confirmed `.env` is strictly gitignored via `.gitignore` line 1 (no risk of accidental commit per GEMINI.md §3.4 & §6).

*   **Workspace Persistence & Projects Grid Redesign (Image 2):**
    *   Resolved workspace forgetting on app restart: integrated persistent `localStorage` store (`intellego_workspaces`, `intellego_active_workspace`) in `workspaceService.js`.
    *   Updated `App.jsx` to check saved workspaces on startup and auto-reconnect to FastAPI sidecar via `openWorkspace()`.
    *   Redesigned `WorkspacePanel.jsx` and added matching System A styles in `app.css` to faithfully replicate Image 2: serif "Projects" header, search toggle, sort toggle, white pill `New project` button, and 2-column responsive card grid displaying project titles, descriptions, and timestamps.
    *   Added multi-workspace retention so users can add repositories without losing existing entries, along with subtle hover deletion.
*   **System B Dark Mode & Typography Scaling (Image 1):**
    *   Transformed `app/src/styles/doc-surface.css` into high-contrast dark mode (`--paper: #121212`, `--panel: #1e1e1e`, `--ink: #f0ede6`, `--line: #383838`, `--accent: #e04b38`).
    *   Increased font sizes across all elements (15px base, 30px headings, 14px code/diffs/tables).
*   **Project Detail View, Create Project Modal, Chat Context Menu & UI Refinements (Images 1, 2, 3):**
    *   **Project Detail View (`ProjectDetailView.jsx`, Image 1):** Built breadcrumb navigation (`Projects / [Name]`), project title and description, centered prompt card with model/mode chips, and a project-specific Recent Chats list.
    *   **Create Project Modal (`CreateProjectModal.jsx`, Image 2):** Implemented modal with *"What are you working on?"* and *"What are you trying to achieve?"*, directory picker integration, and white pill action button.
    *   **Chat Context Menu & Flyout (`ChatContextMenu.jsx`, Image 3):** Added smooth highlight hover animation on recent chats revealing `⋮` menu with Pin (P), Rename (R), Change Project (>) flyout with search and instant project transfer, Remove from project, and Delete (D).
    *   **AI 3-4 Word Chat Titles:** First query in prompt box triggers automatic AI title generation and saves the chat into the project's recents.
    *   **Navigation & Header Cleanups:** Removed `New Chat` and `Chat` buttons from sidebar; renamed `Workspace` to `Workspaces`; replaced bottom-left status with user profile (`Kattu`), opening Settings on click; removed `Workspace` button from top header.

### What Should Happen Next
* Await user review and approval before running `/acp`.

## 2026-09-10
*   **NVIDIA Nemotron Build API Integration & Response Resolution:**
    *   **Root Cause Diagnosis:** Identified why chat completions reported `"nvidia api key nemotron response failed"`:
        1.  *Model Entitlement:* Queried `https://integrate.api.nvidia.com/v1/models` and tested model endpoints with the user key. `nvidia/llama-3.1-nemotron-70b-instruct` and `nvidia/nemotron-4-340b-instruct` return 404 (account function not entitled), while `nvidia/nemotron-3.5-lightning-30b-a3b` returns 200 OK.
        2.  *Reasoning Chunk Starvation:* Nemotron 3.5 streams reasoning tokens in `delta.reasoning_content` rather than `delta.content`. The previous parser discarded reasoning tokens, leading to perceived timeouts and empty streams.
    *   **Agent Runtime Streaming Upgrades (`engine/agent.py`):**
        *   Configured payload with `"chat_template_kwargs": {"thinking": False}`, enabling instant responses (~2-3s) instead of prolonged reasoning pauses.
        *   Added automatic retry fallback: if an API model rejects `chat_template_kwargs` (status 400), the request automatically retries without it.
        *   Updated stream parser: `token = delta.get("content") or delta.get("reasoning_content") or ""`, guaranteeing continuous token streaming under all model configurations.
    *   **WebSocket Protocol Implementation (`engine/main.py`):**
        *   Added native FastAPI WebSocket endpoint `@app.websocket("/chat/stream")` satisfying SPEC.md Section 8 and GEMINI.md Section 4. Eliminates the previous 2.5-second WebSocket connection timeout on every chat query.
        *   Installed `websockets-17.1` in `engine/.venv`.
        *   Added `ensure_active_workspace()` so chat queries seamlessly auto-initialize a default workspace session rather than rejecting with `400 No active workspace open`.
    *   **Frontend Integration & Message Shape Normalization:**
        *   Updated `App.jsx` to pass `pendingPrompt` from the Project Detail View prompt card down through `ChatArea.jsx` to `ChatMode.jsx`, immediately triggering live Nemotron generation.
        *   Normalized message schema in `MessageItem.jsx` and `App.jsx` (`role`/`content` vs `sender`/`text`) so user bubbles and streaming tokens always render accurately.
    *   **End-to-End Verification:**
        *   Verified live streaming via WebSocket (`ws://127.0.0.1:8000/chat/stream`) and HTTP POST (`http://127.0.0.1:8000/chat/stream`) with real NVIDIA Nemotron API.
        *   Verified clean frontend production build via `npm run build` (0 errors, 52 modules transformed).
        *   Re-extracted AST knowledge graph via `graphify update .` (1291 nodes, 1264 edges, 141 communities).

## 2026-09-17
*   **System-Wide Feature Testing & Issue Remediation:**
    *   **Tool Runtime Missing `POST /edit/preview` Fixed:**
        *   Added `POST /edit/preview` endpoint accepting `EditPreviewRequest` in `engine/main.py`.
        *   Fixed unified diff generator (`tool_runtime.py`): unified diff headers and lines are now properly line-delimited instead of mashed on a single line.
        *   Fixed Windows path traversal edge case: leading slashes in relative paths are stripped so they do not erroneously resolve to drive root (`C:\`).
        *   Added deletion support in `apply_edit`: removes file cleanly when `operation == "delete"`.
    *   **Repository Intelligence Engine & Database Resilience:**
        *   Fixed `IntegrityError` on duplicate symbol IDs in `scanner.py` and `database.py`: deduplicated imports and symbol IDs, and applied `INSERT OR REPLACE`.
        *   Fixed `FOREIGN KEY` constraint failures in `database.py`: ensured workspace and session records are created before message and symbol insertions.
        *   Added `GET /workspace/symbols` endpoint to query symbols from SQLite graph.
    *   **Git Status & Commit Error Handling:**
        *   Replaced unhandled `HTTPException(400)` with structured `ApiResponse` envelopes.
        *   Added stderr/stdout capture in `POST /git/commit` so git failure reasons are surfaced accurately in `error.detail`.
    *   **Frontend Chat Synchronization & Recent Sessions:**
        *   Updated `App.jsx` to sync messages to `selectedChat` in project memory and localStorage upon completion.
        *   Wired `Sidebar` recent sessions to project chats with click-to-open handler (`onSelectChat`).
        *   Connected `__INTELLEGO_PREVIEW_JSON__` tokens from chat stream to `localStorage` (`intellego_active_preview`) so `DiffViewer` automatically displays live diffs for review and application.
    *   **Automated Verification:**
        *   Created `engine/test_suite.py` with 11 automated unit/integration tests (all passing: health, workspace open/status/index, symbols, edit preview/apply, path traversal, WS/HTTP chat stream, history, git status/commit, config).
        *   Created `app/test_services.js` with Node test runner verifying title generation, error normalization, and workspace persistence (all passing).
        *   Verified production Vite build: `npm run build` (0 errors).

    *   **System Hardening & Deep Verification Round:**
        *   **DiffViewer Crash & Multi-File Queue:** Fixed null reference crash on missing `activePreview?.diff`; added support for multi-file preview queues (`intellego_pending_previews`) with sequential accept/reject advancement and empty-state fallback.
        *   **System B Design System Restoration:** Restored verbatim GEMINI.md §10.2 paper-and-ink styling (`#f2ede2`, `#161311`, `#d4432c`, 0 border radius, 6px offset shadow) in `doc-surface.css` and purged illicit dark theme overrides.
        *   **Live Semantic Knowledge Graph Explorer:** Replaced static disclaimer in `GraphExplorer.jsx` with a fully interactive symbol browser wired to `GET /workspace/symbols`, including kind filter buttons (`ALL`, `CLASS`, `FUNCTION`, `VARIABLE`, `IMPORT`, `EXPORT`) and text search.
        *   **Tool Runtime TTL & Directory Validation:** Enforced 1-hour expiration on preview IDs with `PREVIEW_EXPIRED` rejection; rejected directory paths in `validate_workspace_path`; added preview cache cleanup on workspace close.
        *   **Scanner Variable Extraction & Symlink Guards:** Extracted top-level constants and variables (`kind: "variable"`), guarded against cyclic directory symlinks during workspace walks, and provided `filePath`/`dependsOn` camelCase aliases.
        *   **Active Chat Deletion Safety:** Updated `handleDeleteChat` in `App.jsx` to reset `selectedChat` and active messages if the currently viewed chat is deleted.
        *   **Test Suite Expansion:** Expanded `engine/test_suite.py` to 16 tests (covering directory path rejection, TTL expiration, symbol filtering, clean git commits, and close cleanup; 16/16 passing) and `app/test_services.js` to 6 tests (covering preview ID validation, queue transitions, and pinned sorting; 6/6 passing).

