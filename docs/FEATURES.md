# Features — Intellego

> This document defines every user-facing capability of the platform: what the system does, why the feature exists, how users interact with it, expected behavior, priority, and future expansion. It does **not** describe implementation details — that's SPEC.md's job.

---

# Table of Contents

1. Feature Philosophy
2. Feature Classification
3. Core Features (Overview)
4. AI Chat
5. Repository Intelligence
6. Semantic Knowledge Graph
7. Context Engine
8. Agent Runtime
9. Tool Runtime
10. Code Generation
11. Code Editing
12. Git Integration
13. Documentation
14. Memory
15. Desktop Application Experience
16. Configuration
17. Advanced Features (V2)
18. Enterprise & Future Features (V3+)
19. Feature Roadmap
20. Success Criteria

---

# 1. Feature Philosophy

Every feature must satisfy at least one of the goals set out in the PRD's Objectives — no new criteria invented here:

- Save developer time
- Reduce repetitive work
- Improve repository understanding
- Improve code quality
- Reduce LLM token usage
- Increase developer confidence (via preview-before-apply)
- Automate engineering workflows

---

# 2. Feature Classification

- **Core** — required for V1. Without these, the product is incomplete.
- **Advanced** — improves productivity; ships after MVP (V2).
- **Enterprise** — designed for large organizations (V3).
- **Future** — long-term roadmap, postponed intentionally.

---

# 3. Core Features (Overview)

## AI Chat
**Priority:** Core
Interactive software-engineering assistant, streamed into the desktop chat panel, capable of understanding the open repository.

## Repository Intelligence
**Priority:** Core
The assistant understands folders, modules, classes, functions, imports, dependencies, and APIs as structured knowledge, not plain text.

## Semantic Knowledge Graph
**Priority:** Core
A continuously-updated graph (files, symbols, dependencies, architecture, business domains, documentation, ownership) persisted locally in SQLite — replacing repeated file re-reading.

## Context Engine
**Priority:** Core
Selects only the information required for the current task, from the graph, memory, repository, git, and prior conversation.

## Agent Runtime (Minimal)
**Priority:** Core
A Planner → Coder → Reviewer chain, orchestrated via LangGraph, calling NVIDIA Nemotron. Full multi-agent expansion (Architect, Tester, Debugger, Security Auditor, Documenter) is Advanced/V2.

## Tool Runtime
**Priority:** Core
Deterministic execution layer (filesystem, terminal, git, search) behind a permission gate — agents reason, tools act.

## Code Generation & Editing
**Priority:** Core
Generate new code and modify existing files, every edit shown as a diff before it's applied.

## Git Integration
**Priority:** Core
Status, diff, commit, branch, checkout, stash, blame, history — surfaced natively in the desktop UI.

## Documentation (Basic)
**Priority:** Core
Generate README content, inline comments, and simple architecture summaries. Deeper doc generation (sequence/Mermaid diagrams, migration guides) is Advanced/V2.

## Memory
**Priority:** Core
Session and Project memory persist locally. Global (cross-project) memory ships in V1 as a local-only concept — cross-*device* global memory requires cloud sync (V3).

## Desktop Application Experience
**Priority:** Core
Native Electron + React shell: workspace switcher, file explorer, chat panel, diff viewer, settings — replacing any terminal/CLI interaction model entirely.

---

# 4. AI Chat

**Capabilities**
- Answer repository questions grounded in the Semantic Knowledge Graph
- Explain code
- Generate code
- Refactor (basic, single-file/function scope in V1 — multi-file refactoring engine is V2)
- Debug (explain an error, trace to root cause, suggest a fix)
- Review a diff before it's applied

**User Flow**
```
User types in Chat Panel
   ↓
Context Engine retrieves minimal relevant context
   ↓
Agent Runtime reasons (Planner → Coder → Reviewer)
   ↓
NVIDIA Nemotron generates the response
   ↓
Response streams into the Chat Panel (WebSocket)
```

**Interface details**
- Streaming responses (token-by-token via WebSocket, not polling)
- Markdown rendering with syntax-highlighted code blocks
- Clickable file references that open the file in the built-in viewer
- Conversation history, per-workspace
- Session resume — reopening a workspace restores the last conversation

**Future:** voice interface, image understanding, diagram generation (V3+).

---

# 5. Repository Intelligence

**Repository Scan** — automatically detects programming language, framework, package manager, build tools, config files, dependencies, monorepo/microservice structure, and existing documentation.

**Dependency Mapping** — builds relationships between modules, classes, interfaces, functions, services, databases, and external APIs.

**Architecture Detection** — identifies MVC, Clean Architecture, Hexagonal, DDD, Microservices, Serverless, Monolith, or Hybrid patterns, to ground code generation in the project's actual conventions rather than generic defaults.

---

# 6. Semantic Knowledge Graph

Instead of repeatedly reading files, the engine maintains a continuously-updated graph representing files, symbols, dependencies, architecture, business domains, documentation, and ownership — persisted in a local SQLite database per workspace.

**Benefits:** faster retrieval, better reasoning, materially lower LLM token usage per task (this is the platform's primary Definition-of-Success metric from the PRD).

---

# 7. Context Engine

Responsible for selecting only the information required for the current task.

**Sources:** the Semantic Knowledge Graph, Memory, the raw repository (fallback), git history, and prior conversation turns.

**Output:** minimal, high-quality context handed to the Agent Runtime — never a raw dump of "everything possibly relevant."

---

# 8. Agent Runtime

**V1 (Core):** three agents — Planner, Coder, Reviewer — coordinated by LangGraph. Each has a defined role, tool access, memory scope, and prompt.

**V2 (Advanced):** expansion to Architect, Tester, Debugger, Security Auditor, and Documenter agents, enabling the full Skills system and automated Project Generation (empty repo → scaffolded, indexed project).

Every agent reasons; none of them touch the filesystem, git, or terminal directly — that always goes through the Tool Runtime's permission layer.

---

# 9. Tool Runtime

**V1 tools:** Filesystem, Terminal, Git, Search.
**V2 tools:** Testing, Docker, Package Managers.
**V3/Future tools:** Kubernetes, HTTP, Database, Browser.

Every tool executes through a permission layer. No tool call reaches disk, git, or the terminal without the Tool Runtime checking it against the current permission scope — this is the technical enforcement of the "Developer Control" principle from PROJECT.md.

---

# 10. Code Generation

**Generates:** classes, functions, components, tests, documentation, SQL, API endpoints, configuration, infrastructure code.

**Example prompts:** "Create a REST endpoint for X," "Add authentication to Y," "Implement caching for Z," "Convert this file to TypeScript."

---

# 11. Code Editing

**Supported operations:** rename, move, delete, insert, replace, refactor (single-scope), extract, inline, optimize imports.

**Hard rule:** every edit produces a diff preview in the desktop UI before it's applied — this is enforced by the Tool Runtime, not just a UI nicety, and cannot be bypassed by any agent or skill.

---

# 12. Git Integration

**Supported operations:** status, diff, commit, branch, checkout, merge, rebase, cherry-pick, stash, blame, history. Pull request creation/review and repository statistics ship in V2 once the Tool Runtime's Git tool is stable.

---

# 13. Documentation

**V1 (Core):** README generation, inline code comments, basic architecture summaries.
**V2 (Advanced):** API docs, full architecture/design docs, sequence diagrams, Mermaid diagrams, migration guides, release notes.

---

# 14. Memory

**Session Memory** — scoped to the current chat session; cleared/archived on close.
**Project Memory** — scoped to the workspace; persists across sessions (coding conventions, architecture decisions, preferred libraries).
**Global Memory** — local, cross-project developer preferences (e.g., preferred formatting, general conventions), stored on the same machine. *Cross-device* global memory requires cloud sync and is out of scope until V3.

---

# 15. Desktop Application Experience

Replaces any terminal/CLI interaction model. This is a native Electron + React/Vite application with full, unsandboxed filesystem access.

**Core UI surfaces**
- **Workspace Switcher** — open/close a repository via native OS file picker; recent workspaces list
- **File Explorer** — live-updating tree view (backed by file-watching, not manual refresh)
- **Chat Panel** — the AI Chat interface described in Section 4
- **Diff Viewer** — every proposed edit rendered as a reviewable diff, with accept/reject per hunk
- **Command Palette** — quick-action launcher inside the app (the in-app equivalent of CLI commands: "Index workspace," "New chat," "Open settings," etc.) — not a terminal, a searchable in-app menu
- **Settings Panel** — global and per-project configuration (Section 16)

**Experience qualities:** fast startup, native OS installers (Windows/macOS/Linux via electron-builder), offline-capable indexing (only the LLM call itself requires network access), auto-update, minimal required configuration to get started.

---

# 16. Configuration

**Global Configuration** — applies across all workspaces (theme, logging, telemetry opt-in/out, default model settings).
**Project Configuration** — per-workspace settings stored alongside the workspace's local SQLite database (tool permissions, memory settings).
**Model Configuration** — provider selection (NVIDIA Nemotron only in V1, behind a provider-abstraction interface for future providers), temperature, and other generation parameters.

---

# 17. Advanced Features (V2)

- **Full Multi-Agent Runtime** — Architect, Tester, Debugger, Security Auditor, Documenter agents added to the V1 Planner/Coder/Reviewer chain.
- **Skills System** — `/architect`, `/reviewer`, `/tester`, `/security`, `/explain`, `/commit`, and similar, each defining a prompt, allowed tools, behavior, and expected output.
- **Testing Automation** — generate unit, integration, and E2E tests, mocks, fixtures, coverage reports, and regression suites.
- **Security Analysis** — detect secrets, hardcoded credentials, SQL injection, XSS, CSRF, dependency vulnerabilities, unsafe APIs, and auth flaws; generate remediation recommendations.
- **Refactoring Engine** — dedicated multi-file refactors: extract class/function, rename symbol across the graph, move/split/merge modules, convert architecture, dead-code removal.
- **Plugin SDK** — third-party extension points for commands, tools, agents, retrievers, languages, and prompts.
- **Project Generation** — empty workspace → Planner → Architect → Scaffold → Coder → Reviewer → fully indexed generated project.

---

# 18. Enterprise & Future Features (V3+)

- Cloud synchronization and shared/team project memory *(deferred — requires a server-side component the local-first V1/V2 architecture deliberately doesn't have)*
- Multi-provider LLM support: OpenAI, Anthropic, Google, Ollama, local models *(deferred — V1 ships one provider to prove the abstraction layer before adding a second)*
- Enterprise multi-seat governance and knowledge sharing *(deferred — no team/org concept exists until cloud sync lands)*
- IDE-embedded companion extensions: VS Code, JetBrains, Neovim, browser extension *(deferred — V1/V2 focus is the standalone desktop app)*
- CI/CD agents: GitHub Actions, Jira, Slack, Linear integrations *(deferred — depends on the full multi-agent runtime and a stable Plugin SDK)*
- Voice interaction, image understanding beyond code screenshots *(deferred — not core to the repository-understanding value proposition)*
- Repository analytics dashboards *(deferred — nice-to-have, not required for the core loop)*
- Live multi-user collaboration *(deferred — requires real-time sync infrastructure not built until V3)*
- Self-improving / autonomous engineering workflows *(deferred — explicitly gated behind a proven, stable multi-agent runtime per the Development Principles in IMPLEMENTATION.md)*
- Private/self-hosted model hosting, GPU acceleration *(deferred — irrelevant until multi-provider support exists)*

---

# 19. Feature Roadmap

*(These groupings must exactly match IMPLEMENTATION.md's phase groupings.)*

**V1**
- Desktop Application Shell (Electron + React/Vite)
- Backend Engine Bootstrap (FastAPI sidecar, localhost contract)
- Workspace Manager
- Repository Intelligence Engine
- Semantic Knowledge Graph
- Context Engine
- Retrieval (symbol/keyword/graph/summary)
- Conversation State & Session Memory
- Minimal Agent Runtime (Planner, Coder, Reviewer)
- NVIDIA Nemotron LLM Integration
- Tool Runtime (Filesystem, Terminal, Git, Search)
- Code Generation & Editing (with diff preview)
- Git Integration
- Basic Documentation Generation
- Project Memory
- Configuration

**V2**
- Full Multi-Agent Runtime (Architect, Tester, Debugger, Security Auditor, Documenter)
- Skills System
- Testing Automation
- Security Analysis
- Refactoring Engine
- Plugin SDK
- Project Generation (empty repo → scaffolded project)
- Advanced Documentation (API docs, diagrams, migration guides)

**V3**
- Cloud Sync & Team Memory
- Multi-Provider LLM Support
- Enterprise Support
- IDE Extensions
- CI/CD Agent Integrations
- Autonomous Engineering Workflows
- Repository Analytics
- Live Collaboration

---

# 20. Success Criteria

The platform should allow developers to:

✓ Understand unfamiliar repositories in minutes, inside a native desktop app.
✓ Generate production-ready code grounded in the actual dependency graph.
✓ Navigate architecture efficiently via the Semantic Knowledge Graph and file explorer.
✓ Review and approve every file change as a diff before it touches disk.
✓ Maintain project memory across sessions without re-explaining conventions.
✓ Automate repetitive engineering tasks through the Agent and Tool Runtimes.
✓ Reduce context size sent to the LLM while improving answer quality.
✓ Serve as an intelligent software engineering partner, not a simple code-completion tool.
