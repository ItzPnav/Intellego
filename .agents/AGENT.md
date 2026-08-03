# AI Agent Rules & System Instructions — Intellego

This file defines the core behavioral rules, architectural constraints, and workflow guardrails that any AI agent working on the Intellego repository **must** strictly follow.

---

## 1. Core Guardrails (Hard Rules)

*   **Local-First, Loopback-Only:** The FastAPI engine sidecar must bind strictly to `127.0.0.1`. It must never be exposed to the network or reachable by other processes on the machine.
*   **Renderer-Engine Boundary:** The Electron renderer must never talk to Python directly. All Electron ↔ engine communication must cross the `localhost` HTTP/WebSocket boundary. The renderer does not import or execute Python; the engine does not touch the DOM.
*   **Fixed Stack for V1:** Do not swap, replace, or add alternatives to any of these stack components:
    *   **Desktop Shell:** Electron
    *   **Renderer:** React + Vite
    *   **Backend Engine:** Python + FastAPI
    *   **AST Parsing:** Tree-sitter
    *   **Agent Orchestration:** LangGraph (Planner → Coder → Reviewer)
    *   **Storage Backend:** SQLite (per-workspace)
    *   **LLM Provider:** NVIDIA Nemotron / Build API (sole V1 provider)
*   **Edit Safety Workflow:** Every filesystem write or git-mutating action must go through `edit/preview` → `edit/apply`. **No tool, agent, or shortcut may write to disk or mutate git state without a preceding preview and explicit user approval.**
*   **Workspace Scoping:** All tool calls must be strictly scoped to the active Workspace root. Any tool call targeting a path outside it must be rejected.
*   **Secrets Safety:** `NEMOTRON_API_KEY` must only live in `.env` (sourced from `.env.example`). Never hardcode it in source code, never log it, and never commit `.env`.
*   **AST Re-Indexing:** Never rebuild the Semantic Knowledge Graph from scratch on routine file changes. Use incremental re-indexing only; a full rescan is a fallback, not the default.
*   **API Response Envelope:** Never rename the API response envelope fields: `success`, `message`, `data`, `error`.
*   **No CLI Entry Point:** Do not add a CLI entry point. All interaction is designed to go through the native desktop UI.
*   **No Alternatives:** Never create a second database engine alongside SQLite or a second LLM provider integration.

---

## 2. File Ownership & Permissions

Refer to this ownership mapping before editing any files:

*   `app/` — **Electron main process + React/Vite renderer.** Handles UI, IPC, and file dialogs.
*   `engine/` — **FastAPI backend.** Contains Repository Intelligence Engine, Context Engine, Agent Runtime (LangGraph), and Tool Runtime.
*   `docs/` — **Project documentation.** Contains `PROJECT.md`, `FEATURES.md`, `SPEC.md`, `IMPLEMENTATION.md`, and `PRD.md`.
*   `.env.example` — **API Keys Template.** Edit with extreme caution.
*   `README.md` — **Main Readme.** Must only be regenerated using the **README Builder Rules** (see Section 3).
*   `FUTURE_FEATURES.md` — **Roadmap (Append-only).** Never delete existing items.
*   `PROGRESS.md` — **Checklist (Append-only).** Mark items as completed, never remove them.
*   `docs/` research notes — **Read-only.** Never modify content in-place; regenerate via PIFS builders instead.

---

## 3. README Builder Rules

Every time `README.md` is regenerated, follow these rules exactly:

1.  **Section Order (Fixed):**
    Header (title + tagline + badges) → Overview → Architecture → Features → Tech Stack → Setup → Production Tips → API Endpoints → Roadmap → Security Notes → Folder Structure → Contributing → License → Credits → Footer
2.  **Badges:** Use shields.io (`style=for-the-badge`), one badge per stack layer, wrapped in `<div align="center">...</div>`.
3.  **Section Headers:** Use `#` heading with an inline Tabler Icons outline SVG (`<img>` tag, 22×22, `align="center"`) immediately before the bold heading text. Feature sub-headings use `###` with an 18×18 SVG icon.
4.  **Architecture:** Provide exactly one ASCII diagram inside a fenced code block (no separate prose diagrams).
5.  **Features:** Use `###` + icon + short title, followed by 1–3 lines of plain description. No bullet lists inside feature blocks.
6.  **Tech Stack:** Use a two-column markdown table (`| Layer | Technology |`).
7.  **Setup:** Use numbered steps with shell commands in fenced `bash` blocks (never inline).
8.  **API Endpoints:** Group by subsystem (`### Workspace`, `### Chat & Sessions`, `### Editing & Git`), with each group as a single fenced block listing `METHOD /path — purpose`.
9.  **Footer:** Always end with:
    ```markdown
    # Made with passion by **Kattu**
    > *{one-line closing statement}*
    ```

---

## 4. Custom Slash Commands

### `/acp` — Add, Commit, Push
When `/acp` is triggered, execute the following sequence:
1.  Stage all changes: `git add .`
2.  Generate a commit message summarizing the staged changes:
    *   **Format:** Max 6–7 words, imperative mood, no trailing period.
    *   *Example:* `fix workspace open race condition` or `add diff viewer accept-all button`.
3.  Commit: `git commit -m "{generated message}"`
4.  Push: Run `git push`. If there is no upstream branch, run `git push -u origin main`.

**Rules for `/acp`:**
*   Never ask the user to approve or edit the commit message.
*   Never skip `git add .`, even if only one file changed.
*   If `git commit` reports nothing to commit, stop immediately and report this.
*   If the push is rejected, report the exact git error (never force-push without explicit user instruction).
