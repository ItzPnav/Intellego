# AI Agent Rules & System Instructions — Intellego
# Project memory & operational manual for AI coding agents. Read this before touching ANY file.

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
engine/             ← FastAPI backend: Repository Intelligence Engine, Context Engine,
                        Agent Runtime (LangGraph), Tool Runtime.
docs/               ← PROJECT.md, FEATURES.md, SPEC.md, IMPLEMENTATION.md, PRD.md.
.env.example        ← Edit with extreme caution — see Section 5. Contains NEMOTRON_API_KEY template.
README.md           ← Always regenerate using README BUILDER rules in Section 5.
FUTURE_FEATURES.md  ← Append-only roadmap. Never delete existing items.
PROGRESS.md         ← Append-only checklist. Check off items, never remove them.
docs/               ← Research notes. Read-only reference. Never modify content in-place — regenerate via the PIFS builders instead.
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

Every time `README.md` is regenerated, follow these rules exactly — mirrored from the current README's own structure.

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
8. **Footer always ends with:**
   ```markdown
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
|---|---|
| **Desktop shell** | Electron |
| **Renderer** | React + Vite |
| **Backend engine** | Python + FastAPI |
| **Parsing** | Tree-sitter |
| **Agent orchestration** | LangGraph (Planner → Coder → Reviewer) |
| **Storage backend** | SQLite (per-workspace) |
| **LLM provider** | NVIDIA Nemotron (Build API) — sole V1 provider |
| **Network binding** | Engine bound to `127.0.0.1` only |
| **Edit safety** | `edit/preview` → `edit/apply`, no silent writes |
| **Core features** | AI Chat, Semantic Knowledge Graph, Context Engine, Agent Runtime, Diff-Before-Apply Editing, Native Desktop Shell |

---

## 8. CUSTOM SLASH COMMANDS

### `/acp` — Add, Commit, Push

When the user types `/acp`:

1. Stage everything: `git add .`
2. Write a commit message summarizing the actual staged changes — **max 6–7 words, imperative mood, no trailing period** (e.g. `fix workspace open race condition`, `add diff viewer accept-all button`).
3. Commit: `git commit -m "{generated message}"`
4. Push: run `git push`. If the current branch has no upstream, run `git push -u origin main` instead.

**Rules:**
- Never ask the user to approve or edit the commit message — write it and proceed.
- Never skip `git add .` even if only one file changed.
- If `git commit` reports nothing to commit, say so and stop — do not push.
- If the push is rejected (e.g. diverged branch), report the exact git error; do not force-push without being explicitly told to.

---

## 9. GRAPHIFY / KNOWLEDGE-GRAPH INTEGRATION

Installed and run automatically per Section 0.1 before any other task.

**Rules:**
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

## 10. UI DESIGN SYSTEM — MANDATORY, NO DEVIATION

`app/` (the Electron/React renderer) must visually match the two systems defined below, which together are a mix distilled from two internal reference builds. These are not moodboards — the tokens and rules below are the literal spec. Copy tokens, class names, and structural patterns exactly as written in this section. Do not invent new colors, radii, fonts, or spacing values. If a component isn't covered here, derive its values from the closest analog already defined below rather than improvising — and never by opening, searching for, or reading any external/original reference HTML file. Nothing outside this document should ever be consulted for styling.

There are **two locked style systems** in this project, used for different surfaces. Never blend their tokens together on the same surface, and never substitute one where the other is specified.

### 10.1 System A — "App Shell" (chat, sidebar, all primary app UI)

This governs the main Electron window: sidebar, chat/messages, top header, input bar, toasts, modals, settings. The tokens and rules below are self-contained. Do not search for, open, or read any external/original reference HTML file for this — everything needed is already written out below.

**Tokens (copy verbatim as CSS custom properties):**
```css
:root {
  --color-bg: #1a1a1a;
  --color-sidebar: #161616;
  --color-surface: #212121;
  --color-surface-2: #2a2a2a;
  --color-surface-3: #333333;
  --color-border: #2a2a2a;
  --color-border-light: #333333;
  --color-text: #ececec;
  --color-text-dim: #8e8e8e;
  --color-text-muted: #666666;
  --color-accent: #d97757;
  --color-accent-glow: rgba(217,119,87,0.15);
  --color-focus: rgba(217,119,87,0.5);
  --font-display: 'Instrument Serif', Georgia, serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --sidebar-w: 260px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --transition-sidebar: 250ms cubic-bezier(0.16,1,0.3,1);
}
```

**Hard rules:**
1. Base font size is `14px`, body line-height `1.6`, font family `var(--font-body)`. Headings/greetings/display text use `var(--font-display)` ('Instrument Serif') — never use the display font for body copy or vice versa.
2. All interactive surfaces (buttons, nav items, pills) use the surface ladder in order on hover/active: `--color-surface` → `--color-surface-2` → `--color-surface-3`. Never skip a rung (e.g. never jump straight from base to `--color-surface-3` on hover).
3. Radii are semantic, not arbitrary: `--radius-sm` (6px) for icon buttons/nav items, `--radius-md` (10px) for pills/panels/code blocks, `--radius-lg` (16px) reserved, `--radius-xl` (20px) for the input wrapper only.
4. Accent color (`--color-accent`, `#d97757`) is used ONLY for: primary send button, active/selected states, links inside AI text, and focus glow. Never use accent as a background fill for large surfaces or body text color.
5. Buttons: `cursor: pointer; border: none; background: none; color: inherit; font: inherit;` as the reset baseline — every custom button builds up from this, never from browser defaults.
6. Scrollbars are always thin (`4–6px`) and styled with `--color-surface-3` thumbs, no visible track — apply this to every scrollable region (sidebar recents, messages, textarea, code blocks).
7. Transitions on interactive elements are `150ms` for color/background, `200ms` for focus rings, `250ms cubic-bezier(0.16,1,0.3,1)` for the sidebar collapse/expand only. Do not invent other easing curves.
8. Message bubbles: user messages are right-aligned pills (`border-radius: 18px 18px 4px 18px`, `--color-surface-2` background, max-width 75%). AI messages are left-aligned, full-width text (no bubble), with a small circular avatar (`28px`, `--color-surface-2` bg, accent-colored icon).
9. Code blocks inside AI text: `--color-surface-2` background, `1px solid var(--color-border-light)`, `--radius-md`, monospace `13px`, language label top-right in `--color-text-muted`.
10. Toasts: fixed bottom-right, `--color-surface-3` background, `--radius-md`, slide-in from the right (`translateX(20px) → 0`, 300ms), auto-dismiss after 4s.
11. Mobile breakpoint is `640px`: sidebar becomes an off-canvas drawer (`translateX(-100%)` when closed) with a `rgba(0,0,0,0.55)` overlay — do not use a different breakpoint or overlay opacity.
12. Icons are inline SVG, `stroke="currentColor"`, `stroke-width` of `1.8–2.5` depending on weight needed, `stroke-linecap="round"` — never use filled icon sets or an icon font here.

### 10.2 System B — "Document/Artifact Surfaces" (diff previews, graph explorer panels, exported reports, any print-like or archival view)

This governs surfaces that are conceptually a physical artifact the user is inspecting or producing — e.g. the diff-preview viewer, the Semantic Knowledge Graph explorer/report panel, exported docs — anything that should feel like a printed/zine artifact rather than a live chat. The tokens and rules below are self-contained. Do not search for, open, or read any external/original reference HTML file for this — everything needed is already written out below.

**Tokens (copy verbatim as CSS custom properties):**
```css
:root {
  --ink: #161311;
  --paper: #f2ede2;
  --paper-dim: #e6ded0;
  --line: #161311;
  --accent: #d4432c;
  --accent-ink: #fff6ec;
  --panel: #fbf8f0;
  --muted: #847c6c;
}
```

**Hard rules:**
1. Font family is `'Courier New', ui-monospace, monospace` for ALL text on these surfaces except section titles, which use `Georgia, 'Times New Roman', serif` with `font-weight: 900; font-style: italic; text-transform: uppercase;`. Never use `--font-body`/`--font-display` from System A here.
2. Every bordered element uses a **solid 2–3px `var(--ink)` border** — never a soft/rgba border, never a box-shadow-only edge. Panels additionally carry a hard offset shadow: `box-shadow: 6px 6px 0 var(--ink);` (no blur, no spread).
3. No border-radius anywhere in System B. Every corner is square. This is a strict inversion of System A's rounded-corner language and must never be softened.
4. Buttons: solid `var(--ink)` fill with `var(--paper)` text and a `3px solid var(--ink)` border by default; hover swaps fill/border to `var(--accent)`. Secondary buttons invert (paper fill, ink text) and swap to ink-fill on hover.
5. Uppercase + letter-spacing (`1–2px`) on all button labels, tab labels, and badges. Body copy stays lowercase/sentence case.
6. The accent color here (`#d4432c`, a red — distinct from System A's `#d97757` orange) marks: active tab state is inverted to solid ink instead; badges, trigger tags, and highlighted labels use the red accent with `--accent-ink` text.
7. Drop-zones / file-input areas: `3px dashed var(--muted)` border, `var(--paper)` background, switching to `var(--accent)` dashed border + light red tint background only while actively dragging a file over them.
8. Never introduce shadows other than the flat offset shadow in rule 2 — no blurred/soft shadows anywhere in System B.

### 10.3 Cross-system rules

- These two token sets must never appear in the same stylesheet scope without a namespacing wrapper (e.g. `.app-shell { ... }` vs `.doc-surface { ... }`) — a component must fully commit to one system, not cherry-pick tokens from both.
- If a new surface doesn't clearly belong to either category, default to System A (it's the primary app shell language) and flag the ambiguity back to the user rather than guessing.
- Both systems' color tokens must stay as CSS custom properties (`:root` or scoped) — never hardcode hex values inline in components; always reference the variable.
- Any new component added to `app/` must be checked against this section before being considered complete. A component that introduces an undocumented color, radius, font, or shadow value is a spec violation, not a stylistic choice.

---

## 11. OBSIDIAN VAULT — ONGOING MAINTENANCE

Initial creation happens once, automatically, per Section 0.2. After that:

- Update `STATUS.md` whenever the project's current state, next action, or blockers change materially — not on every single edit.
- Append a dated entry to `progress.md` at the end of any work session that changed something real — never delete or rewrite prior entries.
- Append new entries to `decisions.md` whenever a real decision is made (what, why, when to revisit) — never delete or rewrite prior entries.
- Keep the vault's `README.md` in sync with the project's actual `README.md` when they materially diverge — the vault's version can be more narrative, but must not contradict the real one.
