# GEMINI.md — Intellego
# Project memory for the coding agent. Read this before touching ANY file.

---

## 0. BOOTSTRAP — DO THIS FIRST, BEFORE ANY OTHER TASK

### 0.1 Install and run graphify

1. Check whether the `graphify` CLI is available (`graphify --version`). If not installed, install it first (matching this project's tooling — e.g. `npm install -g graphify` given the Electron/React side, or `pip install graphify` if it ships as a Python package).
2. Run `graphify update .` in the project root to build the initial `graphify-out/` knowledge graph (AST-only, no API cost).
3. Proceed per the rules in Section 9 (Graphify Integration) for every subsequent codebase question — do not fall back to raw source browsing once the graph exists.
4. If graphify fails to install or run, report the exact error and continue with the rest of the project's tasks — do not block all other work on this step.

### 0.2 Create the Obsidian memory vault

1. Check whether an Obsidian vault for this project already exists (a folder containing a `.obsidian/` directory). If one exists, use it. If not, create one at `../intellego-vault/` alongside the project.
2. Inside that vault, create a folder named `Content`.
3. Inside `Content`, create these four files directly, extracting real content from `docs/PROJECT.md`, `docs/FEATURES.md`, `docs/SPEC.md`, `docs/IMPLEMENTATION.md`, `docs/PRD.md`, and `README.md` — never placeholder text:
   - `README.md` — stable overview: Intellego is a native desktop AI software-engineering platform (Electron + React/Vite, local FastAPI engine) that maintains a persistent Semantic Knowledge Graph instead of re-reading files per request. Who it's for: developers, OSS maintainers, students. How the agent should help: ground answers in the graph, never write without a diff preview + approval.
   - `STATUS.md` — current snapshot: where the project stands (docs complete: PRD, PROJECT, FEATURES, SPEC, IMPLEMENTATION, README, GEMINI.md; `app/` and `engine/` not yet built), next action, blockers.
   - `progress.md` — dated diary log.
   - `decisions.md` — decisions made: e.g. desktop app over CLI/web (for unsandboxed filesystem access), FastAPI sidecar over embedding Python in Electron, NVIDIA Nemotron as sole V1 provider.
4. Create extra files/folders only if the project clearly needs them — keep the structure lean.
5. If genuinely important context is missing, ask before inventing it.
6. Do this directly with file-write access — actually create the vault, the `Content` folder, and the four files, then report what was created.

---

## 1. PROJECT IDENTITY

- **Name:** Intellego
- **Type:** Native desktop AI software-engineering platform (Electron shell + FastAPI engine)
- **Author handle:** ItzPnav
- **Purpose:** A native desktop AI engineer that maintains a persistent, continuously-updated understanding of a repository (via a Repository Intelligence Engine and Semantic Knowledge Graph) instead of re-reading files on every request, and proposes changes through a diff-preview-before-apply workflow.

---

## 2. FILE OWNERSHIP — WHO TOUCHES WHAT

```
app/                ← Electron main process + React/Vite renderer. UI, IPC, file dialogs.
engine/              ← FastAPI backend: Repository Intelligence Engine, Context Engine,
                        Agent Runtime (LangGraph), Tool Runtime.
docs/                ← PROJECT.md, FEATURES.md, SPEC.md, IMPLEMENTATION.md, PRD.md.
.env.example         ← Edit with extreme caution — see Section 5. Contains NEMOTRON_API_KEY template.
README.md            ← Always regenerate using README BUILDER rules in Section 7.
FUTURE_FEATURES.md   ← Append-only roadmap. Never delete existing items.
PROGRESS.md          ← Append-only checklist. Check off items, never remove them.
docs/                ← Research notes. Read-only reference. Never modify content in-place — regenerate via the PIFS builders instead.
```

**Never create:** a second database engine alongside SQLite, a second LLM provider integration, or a CLI entry point — unless explicitly instructed.

---

## 3. PLATFORM HARD RULES

1. **Local-first, loopback-only** — the FastAPI sidecar must bind strictly to `127.0.0.1`. It is never exposed to the network or reachable by any other process on the machine.
2. **Renderer never talks to Python directly** — all Electron ↔ engine communication crosses the `localhost` HTTP/WebSocket boundary described in SPEC.md. The renderer does not import or execute Python; the engine does not touch the DOM.
3. **Stack, fixed for V1** — do not swap any of these without an explicit instruction:
   ```
   Electron (desktop shell)
   React + Vite (renderer)
   Python + FastAPI (backend engine)
   Tree-sitter (AST parsing)
   LangGraph (agent orchestration)
   SQLite (persistence)
   NVIDIA Nemotron / Build API (sole V1 LLM provider)
   ```
4. **Secrets** — `NEMOTRON_API_KEY` lives in `.env` only, sourced from `.env.example`. Never hardcode it in source, never log it, never commit `.env`.
5. **Every filesystem write or git-mutating action must go through `edit/preview` → `edit/apply`.** No tool, agent, or shortcut may write to disk or mutate git state without a preceding preview and explicit user approval.
6. **Tool calls are scoped to the active Workspace root.** Any call targeting a path outside it is rejected outright, regardless of which agent requested it.

---

## 4. CORE SUBSYSTEM CONTRACTS

### Repository Intelligence Engine
- **Entry point:** `POST /workspace/index` (also runs automatically after `workspace/open`)
- **Key mechanism:** Tree-sitter AST parsing → symbol/dependency extraction → Semantic Knowledge Graph, persisted in SQLite
- **Fallback:** none — this subsystem is the source of truth for repo structure; nothing else re-derives it independently

### Context Engine
- **Entry point:** invoked internally by the Agent Runtime before each reasoning step, not exposed as its own endpoint
- **Key mechanism:** pulls minimal relevant slices from the graph, project memory, and git history
- **Fallback:** if the graph is mid-re-index, the Context Engine must serve last-known-good context rather than blocking

### Agent Runtime (LangGraph)
- **Entry point:** `WS /chat/stream`
- **Key mechanism:** Planner → Coder → Reviewer chain, each step calling NVIDIA Nemotron
- **Fallback:** on a provider error, retry per the backoff policy in `engine/`; never surface a raw stack trace to the renderer — always a structured `ApiResponse` error

### Tool Runtime
- **Entry point:** `POST /edit/preview`, `POST /edit/apply`, `GET /git/status`, `POST /git/commit`
- **Key mechanism:** permission layer gating every filesystem/git action; diff generation before any write
- **Fallback:** if no matching, unexpired preview id exists for an `apply` call, reject it — never apply blind

---

## 5. README BUILDER RULES

Every time README.md is regenerated, follow these rules exactly — mirrored from the current README's own structure.

**Section order (fixed, no exceptions):**
Header (title + tagline + badges) → Overview → Architecture → Features → Tech Stack → Setup → Production Tips → API Endpoints → Roadmap → Security Notes → Folder Structure → Contributing → License → Credits → Footer

**Formatting rules:**
1. **Badges:** shields.io, `style=for-the-badge`, one badge per stack layer, wrapped in `<div align="center">...</div>`.
2. **Section headers:** `#` heading with an inline Tabler Icons outline SVG (`<img>` tag, 22×22, `align="center"`) immediately before the bold heading text. Feature sub-headings use `###` with an 18×18 icon of the same style.
3. **Architecture:** one ASCII diagram inside a fenced code block — no separate prose diagram elsewhere.
4. **Features:** `###` + icon + short title, followed by 1–3 lines of plain description. No bullet lists inside a feature block.
5. **Tech Stack:** a two-column markdown table, `| Layer | Technology |`.
6. **Setup:** numbered steps; every shell command in its own fenced `bash` block, never inlined into prose.
7. **API Endpoints:** grouped by subsystem (`### Workspace`, `### Chat & Sessions`, `### Editing & Git`), each group a single fenced block listing `METHOD /path — purpose`.
8. Footer always ends with:
   ```
   # Made with passion by **Kattu**
   > *{one-line closing statement}*
   ```

**What to pull from where:**
- Roadmap items → `FUTURE_FEATURES.md` (append-only; mirror its current unchecked items)
- Folder structure → the actual `app/` / `engine/` / `docs/` tree
- Feature descriptions → the actual current behavior of `engine/` and `app/`, not aspirational copy

---

## 6. WHAT NOT TO DO — HARD GUARDRAILS

- **Never let the renderer call the FastAPI engine over anything but `127.0.0.1`** — always loopback-only.
- **Never apply an edit without a matching `edit/preview` id** — there is no silent-apply path, ever.
- **Never add a second LLM provider integration in V1** — Nemotron is the sole provider until the roadmap's multi-provider item is explicitly picked up.
- **Never widen Tool Runtime scope beyond the active Workspace root** — no exceptions, even for "read-only" convenience calls.
- **Never commit `.env` or hardcode `NEMOTRON_API_KEY`** — template only lives in `.env.example`.
- **Never rebuild the Semantic Knowledge Graph from scratch on a routine file change** — incremental re-indexing only; a full rescan is a fallback, not the default path.
- **Never rename the API response envelope fields** (`success`, `message`, `data`, `error`) — every endpoint depends on this exact shape.
- **Never add a CLI entry point** — this project deliberately moved away from a terminal-based interaction model; all interaction is through the desktop UI.

---

## 7. QUICK REFERENCE — CURRENT STATE SNAPSHOT

| Thing | Value |
|-------|-------|
| Desktop shell | Electron |
| Renderer | React + Vite |
| Backend engine | Python + FastAPI |
| Parsing | Tree-sitter |
| Agent orchestration | LangGraph (Planner → Coder → Reviewer) |
| Storage backend | SQLite (per-workspace) |
| LLM provider | NVIDIA Nemotron (Build API) — sole V1 provider |
| Network binding | Engine bound to `127.0.0.1` only |
| Edit safety | `edit/preview` → `edit/apply`, no silent writes |
| Core features | AI Chat, Semantic Knowledge Graph, Context Engine, Agent Runtime, Diff-Before-Apply Editing, Native Desktop Shell |

---

## 8. CUSTOM SLASH COMMANDS

### /acp — Add, Commit, Push

When the user types `/acp`:

1. Stage everything: `git add .`
2. Write a commit message summarizing the actual staged changes — **max 6–7 words, imperative mood, no trailing period** (e.g. `fix workspace open race condition`, `add diff viewer accept-all button`).
3. Commit: `git commit -m "{generated message}"`
4. Push: run `git push`. If the current branch has no upstream, run `git push -u origin main` instead.

Rules:
- Never ask the user to approve or edit the commit message — write it and proceed.
- Never skip `git add .` even if only one file changed.
- If `git commit` reports nothing to commit, say so and stop — do not push.
- If the push is rejected (e.g. diverged branch), report the exact git error; do not force-push without being explicitly told to.

---

## 9. GRAPHIFY / KNOWLEDGE-GRAPH INTEGRATION

Installed and run automatically per Section 0.1 before any other task.

Rules:
- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain don't surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- This is separate from the Semantic Knowledge Graph in `engine/` (SQLite-backed, application-level) — graphify's graph is a standalone dev-tooling aid for the agent, not something Intellego's own runtime reads.

### 9.1 Staleness Check

Before trusting the graph, run:
```bash
git rev-parse HEAD
```
If it doesn't match the commit the graph was last built from, run `graphify update .` (zero API cost) to rebuild.

---

## 10. OBSIDIAN VAULT — ONGOING MAINTENANCE

Initial creation happens once, automatically, per Section 0.2. After that:

- Update `STATUS.md` whenever the project's current state, next action, or blockers change materially — not on every single edit.
- Append a dated entry to `progress.md` at the end of any work session that changed something real — never delete or rewrite prior entries.
- Append new entries to `decisions.md` whenever a real decision is made (what, why, when to revisit) — never delete or rewrite prior entries.
- Keep the vault's `README.md` in sync with the project's actual `README.md` when they materially diverge — the vault's version can be more narrative, but must not contradict the real one.
