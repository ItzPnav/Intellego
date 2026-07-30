# <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/brain.svg" width="28" height="28" align="center"/> **Intellego**

### *Native AI desktop engineer that understands your repo instead of re-reading it every time*

<div align="center">
<img src="https://img.shields.io/badge/Shell-Electron-47848F?style=for-the-badge">
<img src="https://img.shields.io/badge/Renderer-React%20%2B%20Vite-61DAFB?style=for-the-badge&labelColor=20232A">
<img src="https://img.shields.io/badge/Engine-FastAPI-009688?style=for-the-badge">
<img src="https://img.shields.io/badge/Storage-SQLite-003B57?style=for-the-badge">
<img src="https://img.shields.io/badge/LLM-NVIDIA%20Nemotron-76B900?style=for-the-badge">
</div>

---

# <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/info-circle.svg" width="22" height="22" align="center"/> **Overview**

**Intellego** is a native desktop AI software-engineering platform for developers who need real, unsandboxed access to their own codebase — not a terminal-only assistant, not a browser-sandboxed web app.

It uses:

* **Repository Intelligence Engine** — parses the repo once via Tree-sitter and maintains a continuously-updated symbol/dependency graph instead of re-reading files on every request
* **Context Engine** — pulls only the minimal, relevant slice of that graph, memory, and git history for each task, keeping token usage low
* **LangGraph Agent Runtime** — a Planner → Coder → Reviewer chain that reasons over the assembled context and proposes changes
* **NVIDIA Nemotron (Build API)** — the LLM provider behind every agent's reasoning step

> Local-first by design: everything except the actual model call runs on the developer's own machine.

---

# <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/sitemap.svg" width="22" height="22" align="center"/> **Architecture**

```
Repository (on disk)
            ↓
Electron Renderer (React) ←──HTTP/WS──→ FastAPI Sidecar Engine
            ↓                                    ↓
┌─────────────────────────────┐   ┌───────────────────────────────┐
│  Desktop UI                 │   │  1. Repository Intelligence   │
│  - File Explorer            │   │     Engine (Tree-sitter)      │
│  - Chat Panel               │   │  2. Context Engine            │
│  - Diff Viewer              │   │  3. Agent Runtime (LangGraph) │
│  - Command Palette          │   │  4. Tool Runtime (permission) │
└─────────────────────────────┘   └───────────────┬───────────────┘
                                                  ↓
                                    SQLite (graph, sessions, memory)
                                                  ↓
                                    NVIDIA Nemotron (only external call)
```

---

# <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/sparkles.svg" width="22" height="22" align="center"/> **Features**

### <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/message-circle.svg" width="18" height="18" align="center"/> AI Chat
Ask architecture and "where is X" questions grounded in the actual dependency graph, with streamed, markdown-rendered answers and clickable file references.

### <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/topology-star.svg" width="18" height="18" align="center"/> Semantic Knowledge Graph
The repository is parsed once and kept as a live graph of files, symbols, and dependencies — updated incrementally on file changes, never rebuilt from scratch.

### <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/filter.svg" width="18" height="18" align="center"/> Context Engine
Assembles only the context a task actually needs from the graph, project memory, and git history, instead of dumping whole files into every prompt.

### <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/git-branch.svg" width="18" height="18" align="center"/> Agent Runtime
A Planner → Coder → Reviewer chain orchestrated with LangGraph, reasoning over the assembled context before proposing any change.

### <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/diff.svg" width="18" height="18" align="center"/> Diff-Before-Apply Editing
Every file edit is shown as a reviewable diff first. Nothing writes to disk without explicit approval — enforced at the Tool Runtime, not just the UI.

### <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/device-desktop.svg" width="18" height="18" align="center"/> Native Desktop Shell
Full, unsandboxed filesystem access via Electron — live file-watching, a real file explorer, and OS-native install/update, not a browser tab.

---

# <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/stack-2.svg" width="22" height="22" align="center"/> **Tech Stack**

| Layer | Technology |
|-------|------------|
| Desktop Shell | Electron |
| Renderer UI | React + Vite |
| Backend Engine | Python + FastAPI |
| Code Parsing | Tree-sitter |
| Agent Orchestration | LangGraph |
| Persistence | SQLite |
| LLM Provider | NVIDIA Nemotron (Build API) |

---

# <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/terminal-2.svg" width="22" height="22" align="center"/> **Setup**

1. **Clone the repo:**

```bash
git clone https://github.com/ItzPnav/intellego.git
cd intellego
```

2. **Install renderer/shell dependencies:**

```bash
cd app && npm install
```

3. **Install engine dependencies:**

```bash
cd ../engine && pip install -r requirements.txt --break-system-packages
```

4. **Configure environment:**

```bash
cp .env.example .env
# Fill in NEMOTRON_API_KEY inside .env
```

5. **Run the app:**

```bash
npm run dev
# spawns the FastAPI sidecar and launches the Electron shell
```

---

# <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/shield-check.svg" width="22" height="22" align="center"/> **Production Tips**

* Keep `NEMOTRON_API_KEY` in `.env` only — never commit it or hardcode it in source.
* Bind the FastAPI sidecar strictly to `127.0.0.1` — it should never be reachable off-loopback.
* Cap incremental re-index frequency on very large repos to avoid thrashing the file-watcher.
* Back up each workspace's SQLite database before running a spec-version migration.

---

# <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/plug.svg" width="22" height="22" align="center"/> **API Endpoints**

### Workspace

```
POST /workspace/open      — Open or create a Workspace for a given path
POST /workspace/close     — Close the active Workspace
GET  /workspace/status    — Current Workspace state
POST /workspace/index     — Force a full re-index
```

### Chat & Sessions

```
WS   /chat/stream         — Bidirectional streamed chat
GET  /session/history     — Message history for the active Session
```

### Editing & Git

```
POST /edit/preview        — Request a diff preview for a proposed change
POST /edit/apply          — Apply a previously previewed edit
GET  /git/status          — Current git status for the Workspace
POST /git/commit          — Commit approved changes
```

---

# <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/map.svg" width="22" height="22" align="center"/> **Roadmap**

* [ ] Full multi-agent runtime (Architect, Tester, Debugger, Security Auditor, Documenter)
* [ ] Skills system (`/architect`, `/reviewer`, `/security`, ...)
* [ ] Testing automation and security analysis
* [ ] Dedicated multi-file refactoring engine
* [ ] Plugin SDK
* [ ] Empty-repo project generation
* [ ] Cloud sync and shared team memory
* [ ] Multi-provider LLM support (OpenAI, Anthropic, Google, Ollama, local)

---

# <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/lock.svg" width="22" height="22" align="center"/> **Security Notes**

* API keys live in `.env` only and are never committed.
* The FastAPI sidecar is bound to `127.0.0.1` — no other process or network peer can reach it.
* Every filesystem write or git-mutating action requires a prior `edit/preview` and explicit user approval; there is no silent-apply path.
* Tool calls targeting a path outside the active Workspace root are rejected outright.

---

# <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/folder.svg" width="22" height="22" align="center"/> **Folder Structure**

```
intellego/
│
├── app/                # Electron main process + React/Vite renderer
├── engine/              # FastAPI backend: RIE, Context Engine, Agent & Tool Runtime
├── docs/                # PROJECT.md, FEATURES.md, SPEC.md, IMPLEMENTATION.md, PRD.md
├── .env.example         # NEMOTRON_API_KEY and other config template
└── README.md
```

---

# <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/git-branch.svg" width="22" height="22" align="center"/> **Contributing**

PRs and issues are welcome. Fork freely and build on top of this.

---

# <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/scale.svg" width="22" height="22" align="center"/> **License**

MIT License — use freely.

---

# <img src="https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/heart.svg" width="22" height="22" align="center"/> **Credits**

* **Electron** — native desktop shell and filesystem access
* **Tree-sitter** — multi-language AST parsing
* **LangGraph** — multi-agent orchestration
* **SQLite** — embedded, local, per-workspace persistence
* **NVIDIA Nemotron (Build API)** — LLM provider

---

# Made with passion by **Kattu**

> *Understand the repo once, act on it forever — no more re-reading the same codebase on every question.*
# Intellego
