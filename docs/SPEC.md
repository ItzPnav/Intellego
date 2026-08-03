# SPEC.md — Intellego

## Purpose

This document defines the **contracts between subsystems** — not why they exist (PROJECT.md) and not what they do for the user (FEATURES.md), and not the internal implementation of any one subsystem (a future ARCHITECTURE.md, if written). If two subsystems both touch a piece of data or a call boundary, its shape is defined here, once, and referenced everywhere else.

---

## Guiding Principles

**Reuse proven infrastructure — do not rebuild it:**
- **Electron** — native desktop shell and OS-level filesystem/process access
- **React + Vite** — renderer UI
- **FastAPI** — local backend engine, spawned as a sidecar process
- **Tree-sitter** — multi-language AST parsing / symbol extraction
- **LangGraph** — multi-agent orchestration
- **SQLite** — embedded, local, per-workspace persistence (no server to run or manage)
- **NVIDIA Nemotron (Build API)** — sole V1 LLM provider, accessed via an OpenAI-compatible chat-completions endpoint

**Custom-build only where it differentiates the product:**
- The Repository Intelligence Engine (scanner + symbol/dependency extraction pipeline)
- The Semantic Knowledge Graph schema and its incremental-update logic
- The Context Engine's retrieval-and-ranking logic
- The Tool Runtime's permission layer
- The localhost Electron ↔ FastAPI contract itself

Everything else is commodity infrastructure, adopted as-is.

---

## Table of Contents

1. System Overview
2. Workspace Model
3. Session & Message Model
4. Repository Intelligence Model
5. Context Engine Contract
6. Agent Runtime Contract
7. Tool Runtime Contract
8. Local API Specification
9. Data Types
10. Validation Rules
11. Specification Versioning

---

## 1. System Overview

```
┌─────────────────────────────┐        ┌───────────────────────────────────┐
│   Electron Renderer (React)  │        │      FastAPI Sidecar (Python)      │
│  - Workspace Switcher         │        │  - Workspace Manager                │
│  - File Explorer               │        │  - Repository Intelligence Engine  │
│  - Chat Panel                  │◄──────►│  - Context Engine                   │
│  - Diff Viewer                 │  HTTP  │  - Agent Runtime (LangGraph)        │
│  - Command Palette             │  + WS  │  - Tool Runtime (permission layer) │
│  - Settings Panel               │       │  - Session/Memory Store            │
└───────────────┬───────────────┘        └────────────┬────────────────────┘
                │ IPC (contextBridge)                   │
┌───────────────▼───────────────┐        ┌────────────▼────────────────────┐
│   Electron Main Process        │        │  Local Persistence (per          │
│  - Spawns/monitors FastAPI      │       │  workspace, SQLite)               │
│    sidecar process              │       │  - Symbol DB / Dependency Graph   │
│  - Native OS file dialogs       │       │  - Sessions / Messages            │
│  - App lifecycle, auto-update   │       │  - Project Memory                  │
└─────────────────────────────────┘        └───────────┬────────────────────┘
                                                          │
                                             ┌────────────▼────────────────┐
                                             │  Tree-sitter (parsing)        │
                                             │  NVIDIA Nemotron (Build API)  │
                                             │  (only external network call) │
                                             └───────────────────────────────┘
```

The renderer never talks to the FastAPI sidecar directly across the OS network stack in a way that bypasses `localhost` — it's always `http://127.0.0.1:<port>` bound to loopback only, with the port negotiated and passed to the renderer via Electron's IPC at startup. No other process on the machine, and nothing over the network, can reach the sidecar.

---

## 2. Workspace Model

A **Workspace** represents one opened repository. Its state machine:

```
        open()                index()              close()
UNOPENED ────► OPENING ────► INDEXING ────► READY ────► CLOSED
                   │                            │  ▲
                   │ index error                │  │ file change detected
                   ▼                            ▼  │
                 ERROR                      RE-INDEXING
```

- **UNOPENED** — no workspace selected.
- **OPENING** — path validated, config loaded, SQLite DB attached or created.
- **INDEXING** — Repository Intelligence Engine performs the initial full scan.
- **READY** — graph is current; chat, generation, and editing are available.
- **RE-INDEXING** — an incremental update is running (triggered by file-watcher events); the UI remains usable in a degraded ("index may be slightly stale") state rather than blocking.
- **ERROR** — indexing failed; the UI surfaces the error and offers retry, without crashing the app.
- **CLOSED** — workspace released; sidecar frees in-memory resources for it.

**Responsibilities:** open/close a workspace, detect the repository, load per-workspace configuration, initialize/attach the SQLite database.
**Explicitly does not:** parse source files itself (that's the Repository Intelligence Engine), or decide what context to retrieve (that's the Context Engine).

---

## 3. Session & Message Model

A **Session** is one continuous conversation within a Workspace.

**Responsibilities:** persist messages in order, track the current goal/topic/referenced entities, allow resume after app restart.
**Explicitly does not:** decide what context to attach to a message (Context Engine's job) or execute any tool calls itself (Tool Runtime's job).

---

## 4. Repository Intelligence Model

**Responsibilities:** repository scan (language/framework/build-tool/dependency detection), Tree-sitter-based AST parsing, symbol extraction (classes, functions, variables, imports, exports), dependency-graph construction, incremental re-indexing on file-watcher events, project/module summaries, persistence of all of the above into the workspace's SQLite database.
**Explicitly does not:** answer chat questions directly, decide what to retrieve for a given prompt (Context Engine's job), or generate/edit any code.

---

## 5. Context Engine Contract

**Responsibilities:** given a task/prompt, query the Semantic Knowledge Graph, Project/Session Memory, git history, and prior conversation turns, and assemble the minimal context needed — nothing more.
**Explicitly does not:** call the LLM itself, reason about the task, or decide what agent should handle it (Agent Runtime's job). It is a pure retrieval-and-assembly boundary.

---

## 6. Agent Runtime Contract

**Responsibilities:** orchestrate the Planner → Coder → Reviewer chain (V1) via LangGraph, given the context assembled by the Context Engine; call NVIDIA Nemotron for each agent's reasoning step; request Tool Runtime execution when an agent needs a deterministic action; surface a human-approval checkpoint before any Tool Runtime call that would modify the filesystem or git state.
**Explicitly does not:** execute filesystem, terminal, or git operations directly — every such action is delegated to, and gated by, the Tool Runtime.

---

## 7. Tool Runtime Contract

**Responsibilities:** expose a fixed set of deterministic tools (V1: Filesystem, Terminal, Git, Search) behind a permission layer; every filesystem-write or git-mutating call must be preceded by a diff/preview object the renderer can display, and must not execute until the renderer sends an explicit approval message back.
**Explicitly does not:** decide *what* to do — only executes what the Agent Runtime requests, after permission and preview checks pass.

---

## 8. Local API Specification

All sidecar responses share one envelope, defined once here and never redefined per-endpoint:

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: { code: string; detail: string };
}
```

**Core endpoints (V1):**

| Method | Path | Purpose |
|---|---|---|
| POST | `/workspace/open` | Open or create a Workspace for a given filesystem path |
| POST | `/workspace/close` | Close the active Workspace |
| GET | `/workspace/status` | Current Workspace state (per the state machine in §2) |
| POST | `/workspace/index` | Force a full re-index |
| WS | `/chat/stream` | Bidirectional chat stream — user messages in, token-streamed agent responses out |
| GET | `/session/history` | Retrieve message history for the active Session |
| POST | `/edit/preview` | Request a diff preview for a proposed change (no write yet) |
| POST | `/edit/apply` | Apply a previously previewed edit, identified by its preview id |
| GET | `/git/status` | Current git status for the Workspace |
| POST | `/git/commit` | Commit approved changes |
| GET | `/config` | Read effective (global + project-merged) configuration |
| POST | `/config` | Update configuration |

All V1 endpoints are served over `127.0.0.1` only. No authentication layer is required in V1 since the sidecar is not reachable outside the local loopback interface — this is re-evaluated if/when V3 cloud sync introduces any network-facing surface.

---

## 9. Data Types

```typescript
interface Workspace {
  id: string;
  rootPath: string;
  state: "UNOPENED" | "OPENING" | "INDEXING" | "READY" | "RE-INDEXING" | "ERROR" | "CLOSED";
  lastIndexedAt: string | null; // ISO 8601
}

interface Session {
  id: string;
  workspaceId: string;
  createdAt: string;
  messages: Message[];
}

interface Message {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  fileReferences?: string[]; // paths, relative to workspace root
  createdAt: string;
}

interface SymbolNode {
  id: string;
  workspaceId: string;
  filePath: string;
  kind: "class" | "function" | "variable" | "import" | "export";
  name: string;
  dependsOn: string[]; // SymbolNode ids
}

interface EditPreview {
  id: string;
  filePath: string;
  operation: "insert" | "replace" | "delete" | "rename" | "move";
  diff: string; // unified diff text
  requiresApproval: true; // always true in V1 — no silent-apply path exists
}
```

Python-side (FastAPI/Pydantic) models mirror these field-for-field; the localhost JSON contract is the single source of truth, not either language's native type system.

---

## 10. Validation Rules

- A Workspace `open()` call must reject paths that don't exist or aren't readable — with a structured `ApiResponse.error`, never an unhandled exception reaching the renderer.
- No `edit/apply` call succeeds without a matching, unexpired `edit/preview` id — an edit can never bypass the preview step, even if requested by an agent directly.
- The sidecar must respond to a health-check ping within a fixed timeout at Electron-main startup; if it doesn't, the renderer shows a clear "Engine failed to start" state rather than a silently frozen UI.
- Any tool call that would write outside the current Workspace's `rootPath` is rejected outright, regardless of which agent requested it.
- Validation failures always degrade gracefully into a structured `ApiResponse` with `success: false` — the sidecar process itself must never crash on malformed input from the renderer.

---

## 11. Specification Versioning

This spec is versioned independently using SemVer (`spec-v1.0.0` at V1 ship). Every persisted artifact — the SQLite schema, session/message records, and the local API envelope itself — must declare which spec version it targets, so a future engine version can detect and migrate older on-disk workspace data instead of failing silently.
