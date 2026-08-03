# IMPLEMENTATION.md — Intellego

## Purpose

This document defines the implementation roadmap for Intellego. Phase order is **dependency-driven, not feature-driven** — every phase introduces a self-contained subsystem that becomes the foundation for the next, and every phase must leave the system in a stable, testable state before the next begins.

---

## Development Principles

**Build Incrementally**
Large systems are built through small, independently testable milestones. Each phase should leave the project in a working, demoable state.

**Stable Foundations**
Never build a higher layer before the lower one is complete. Concretely, for this project: the Repository Intelligence Engine must exist before the Context Engine can retrieve anything meaningful; the Context Engine must exist before the Agent Runtime has anything worth reasoning over; the Agent Runtime must exist before the Tool Runtime is exercised end-to-end (there's nothing to gate a permission layer against until an agent actually requests an action).

**Reuse Proven Infrastructure**
Do not rebuild existing infrastructure. Adopted as-is: **Electron** (desktop shell), **React + Vite** (renderer), **FastAPI** (local backend engine), **Tree-sitter** (parsing), **LangGraph** (agent orchestration), **SQLite** (persistence), **NVIDIA Nemotron / Build API** (LLM provider). Custom engineering effort is reserved for the Repository Intelligence Engine, the Semantic Knowledge Graph, the Context Engine, and the Tool Runtime's permission layer — see SPEC.md's Guiding Principles for the full reasoning; it is not re-argued here.

**Keep Components Independent**
Subsystems communicate through the defined interfaces in SPEC.md, not through shared internal state. Replacing one subsystem (e.g., swapping Nemotron for a second provider later) should require minimal changes elsewhere.

---

## Overall Development Timeline

```
Foundation
    │
Desktop Shell & Sidecar Bootstrap
    │
Workspace Manager
    │
Repository Intelligence Engine
    │
Retrieval & Context Engine
    │
Conversation State & Memory
    │
Agent Runtime (Minimal)
    │
Tool Runtime
    │
NVIDIA Nemotron LLM Integration
    │
AI Chat UI & Code Generation/Editing UI
    │
Git Integration & Basic Documentation
    │
Release (V1)
```

---

## Phase 0 — Foundation

**Objective:** create the project structure and development environment for both halves of the stack.

**Deliverables**
- Monorepo structure (`/app` for Electron+React+Vite, `/engine` for the FastAPI/Python backend)
- Build system for both (Vite for the renderer, Poetry/uv or equivalent for the Python engine)
- TypeScript configuration (renderer + Electron main)
- Linting/formatting for both stacks (ESLint/Prettier, Ruff/Black)
- Testing frameworks for both stacks (Vitest, Pytest)
- CI pipeline running both test suites
- Logging (structured, both processes)
- Configuration loader (global + per-project)

**Acceptance Criteria:** the renderer builds, the engine imports cleanly, both test suites execute, CI passes end to end.

---

## Phase 1 — Desktop Shell & Sidecar Bootstrap

**Objective:** get the Electron app launching and successfully spawning/managing the FastAPI sidecar.

**Responsibilities**
- Electron main process: app lifecycle, native file dialogs, auto-update scaffolding
- Spawn the FastAPI sidecar as a child process on app launch; negotiate its loopback port and pass it to the renderer via `contextBridge` IPC
- Health-check the sidecar at startup with a bounded timeout
- Bare renderer shell (empty Workspace Switcher screen)

**Acceptance Criteria:** launching the app starts both processes; the renderer can confirm the sidecar is alive via a health-check call; killing the sidecar surfaces a clear "Engine failed to start" state rather than a frozen UI.

---

## Phase 2 — Workspace Manager

**Objective:** implement the Workspace abstraction and its state machine (SPEC.md §2).

**Responsibilities:** open/close a workspace, detect the repository at a given path, load per-workspace configuration, initialize the workspace's SQLite database.

**Acceptance Criteria:** opening a folder via the native picker creates or loads a Workspace and transitions it through `OPENING → INDEXING → READY`; reopening a previously-indexed folder skips straight to a valid state without re-scanning from zero.

---

## Phase 3 — Repository Intelligence Engine

**Objective:** build the core intelligence layer — the heart of the platform.

**Responsibilities:** repository scanner, language/framework/build-tool detection, Tree-sitter-based AST parsing, symbol extraction (classes, functions, variables, imports, exports), dependency-graph construction, project/module summaries, and persistence of all of it as the Semantic Knowledge Graph in the workspace's SQLite database. Includes the file-watcher hook that triggers incremental re-indexing.

**Acceptance Criteria:** indexing a real multi-file repository produces a queryable symbol/dependency graph in SQLite; editing a file on disk triggers an incremental (not full) re-index within a bounded time.

---

## Phase 4 — Retrieval & Context Engine

**Objective:** allow the platform to retrieve only relevant repository information, and assemble it into minimal context.

**Responsibilities:** symbol retrieval, keyword retrieval, graph traversal retrieval, summary retrieval; Context Engine assembly logic pulling from the graph, Project Memory, git history, and prior conversation.

**Acceptance Criteria:** a test query for "where is X used" returns the correct symbol set without a full-repository scan; token count of assembled context for a fixed test query stays under an agreed ceiling.

---

## Phase 5 — Conversation State & Memory

**Objective:** maintain contextual continuity within and across sessions.

**Responsibilities:** Session and Message persistence; tracking of current goal, referenced entities, and pending/completed tasks; Project Memory (conventions, decisions, preferred libraries) and local Global Memory.

**Acceptance Criteria:** closing and reopening a workspace resumes the prior conversation without replaying it; a convention stated once in Project Memory is applied in a later, unrelated session without being re-stated.

---

## Phase 6 — Agent Runtime (Minimal)

**Objective:** introduce structured AI reasoning via LangGraph.

**Responsibilities:** Planner, Coder, and Reviewer agents, each with a defined role, tool access, memory scope, and prompt; retry handling; a human-approval checkpoint before any action that would touch the filesystem or git.

**Acceptance Criteria:** a single chat request flows through Planner → Coder → Reviewer and produces either a direct answer or a proposed edit awaiting approval — never a silent file change.

---

## Phase 7 — Tool Runtime

**Objective:** provide deterministic, permissioned actions. Agents reason; tools execute.

**Responsibilities:** Filesystem, Terminal, Git, and Search tools; the permission layer gating every call; the `edit/preview` → `edit/apply` contract from SPEC.md §8–9.

**Acceptance Criteria:** every filesystem-write or git-mutating action produces a diff preview the renderer can display; no `edit/apply` call succeeds without a matching prior `edit/preview` id; a tool call targeting a path outside the workspace root is rejected.

---

## Phase 8 — NVIDIA Nemotron LLM Integration

**Objective:** connect the Agent Runtime to NVIDIA Nemotron via the Build API.

**Responsibilities:** prompt execution, streaming (token-by-token to the WebSocket), retry logic, rate-limiting, and a provider-abstraction interface designed so a second provider is a config/adapter change, not a rewrite.

**Acceptance Criteria:** chat responses stream into the UI incrementally, not as one blocking response; a simulated provider outage triggers the defined retry/backoff behavior instead of a hard failure.

---

## Phase 9 — AI Chat UI & Code Generation/Editing UI

**Objective:** wire the Agent + Tool Runtimes into the desktop UI.

**Responsibilities:** Chat Panel (streaming, markdown rendering, code highlighting, file references), Diff Viewer (accept/reject per hunk), File Explorer live updates via the file-watcher.

**Acceptance Criteria:** a user can ask for a new function, see it streamed into the chat, see the resulting diff, and accept or reject it — all without leaving the app or touching a terminal.

---

## Phase 10 — Git Integration & Basic Documentation

**Objective:** surface git operations and basic documentation generation natively.

**Responsibilities:** status/diff/commit/branch/checkout/stash/blame/history through the Tool Runtime's Git tool, rendered in-app; README/comment/basic architecture-summary generation.

**Acceptance Criteria:** a commit made through the app UI is verifiable via an external `git log`; a generated README accurately reflects the actual detected stack from Phase 3.

---

## Phase 11 — Release (V1)

**Objective:** prepare Intellego V1 for distribution.

**Deliverables:** documentation, cross-platform packaging (Windows/macOS/Linux via electron-builder), auto-update wiring, versioning, release automation, benchmarks (token-consumption and time-to-first-useful-answer per the PRD's Definition of Success), public examples.

**Acceptance Criteria:** a clean install on each target OS opens a real repository, indexes it, and completes a full chat → edit → approve → commit loop without manual setup steps beyond entering the Nemotron API key.

---

## Future Roadmap

**V2 (Advanced tier — see FEATURES.md §17):** Full Multi-Agent Runtime expansion (Architect, Tester, Debugger, Security Auditor, Documenter), Skills System, Testing Automation, Security Analysis, dedicated Refactoring Engine, Plugin SDK, Project Generation (empty repo → scaffolded project), Advanced Documentation. Deferred because each depends on the V1 Agent Runtime and Tool Runtime being proven stable first — per Development Principles above, higher layers don't get built before the ones under them are solid.

**V3 (Enterprise/Future tier — see FEATURES.md §18):** Cloud Sync & Team Memory, Multi-Provider LLM Support, Enterprise Support, IDE Extensions, CI/CD Agent Integrations, Autonomous Engineering Workflows, Repository Analytics, Live Collaboration. Deferred because each requires infrastructure (a server-side component, a second proven LLM provider, or a stable Plugin SDK) that doesn't exist until V1/V2 ship.

---

## Completion Criteria

Intellego V1 is production-ready when:

- Workspaces open, index, and incrementally re-index automatically (Phases 2–3).
- The Semantic Knowledge Graph is continuously and correctly maintained (Phase 3).
- Retrieval returns accurate, minimal repository context without full-repo scans (Phase 4).
- Conversation State and Project Memory persist across app restarts (Phase 5).
- The Agent Runtime coordinates Planner/Coder/Reviewer for a single request (Phase 6).
- No file or git modification ever occurs without a diff preview and explicit approval (Phase 7).
- NVIDIA Nemotron responses stream into the UI with working retry/rate-limit handling (Phase 8).
- A full chat → generate/edit → preview → approve loop works entirely inside the desktop app (Phase 9).
- Git operations performed in-app are verifiable via standard git tooling (Phase 10).
- The app installs and runs a complete first-use loop on Windows, macOS, and Linux (Phase 11).
