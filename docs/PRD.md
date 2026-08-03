# [PRD] Intellego — AI-Native Software Engineering Platform (Repository Intelligence Engine)

> Consolidated from PROJECT.md, FEATURES.md, SPEC.md, and IMPLEMENTATION.md.
> Working name: **Intellego** (CLI binary `vc`), internal engine codename: **Intellego / Repository Intelligence Engine (RIE)**.

---

## Problem Alignment (or Opportunity)

Modern AI coding assistants (Claude Code, GitHub Copilot, Cursor, Windsurf, OpenAI Codex CLI) generate code, explain implementations, and automate parts of development. But they share a structural weakness: **they treat a repository as text to be re-read on every request**, not as a system to be understood once and maintained.

Concretely, the current generation of tools follows this loop on every single interaction:

```
Repository → Read Files → Chunk Files → Embed Files → Retrieve Chunks → LLM → Answer
```

This creates four compounding problems:

1. **High token consumption.** Large repositories require large contexts; whole files get re-inserted into prompts on every request, repeating work the assistant already "did" moments earlier.
2. **Limited architectural understanding.** Module hierarchy, ownership, service interactions, and dependency graphs are reconstructed from scratch each time rather than modeled explicitly — relationships stay implicit.
3. **Stateless sessions.** Developers re-explain architecture, conventions, preferred libraries, and past decisions every session, which caps long-term productivity gains.
4. **Poor scaling behavior.** As repositories grow (monorepos, microservices), the "read everything relevant" strategy gets slower, more expensive, and less accurate.

None of this is a model-quality problem — it's an **information-architecture** problem. The fix is not a smarter prompt; it's a persistent, incrementally-updated semantic model of the codebase that the LLM consults instead of re-deriving.

### Why Now

- The current wave of coding assistants (Copilot, Cursor, Windsurf, Codex CLI) has proven developer demand for AI-native tooling, but all of them are converging on the same RAG-over-files architecture — leaving an open lane for a **structured-knowledge-first** competitor.
- LLM API costs and context-window limits still make "reread everything" workflows economically and technically painful on large/enterprise repos — a gap that will only widen as codebases grow faster than context windows do.
- Mature, reusable infrastructure now exists to build this without reinventing it: Tree-sitter (AST parsing across languages), LangGraph (multi-agent orchestration), and SQLite (embedded persistence) mean the differentiated engineering effort can be focused entirely on the Repository Intelligence Engine, Context Engine, and Retrieval layer — not plumbing.
- Waiting increases switching cost: the longer developers standardize on stateless, file-rereading assistants, the harder it becomes to introduce a persistent-memory paradigm later.

### Background & Evidence

- **Architectural pattern observed across incumbents:** Copilot, Cursor, Windsurf, and Codex CLI all rely on retrieval-augmented generation over chunked/embedded files rather than an explicit, queryable knowledge graph of the repository.
- **Reported friction (qualitative, from competitive analysis):** repeated context reconstruction, duplicate reasoning across turns, and context-window ceilings on large repos are consistently the practical limits developers hit with existing tools.
- **Design precedent:** the project's own SPEC.md and IMPLEMENTATION.md already commit to a "build vs. buy" philosophy — reuse commodity infra (LangGraph, Tree-sitter, SQLite, Ink, Commander, Execa) and invest custom engineering only where it's differentiating (RIE, Context Engine, Semantic Knowledge Graph, Hybrid Retrieval, Project Memory, Tool Runtime, Plugin Framework) — which is itself evidence the team has already validated where the real technical risk and value concentrate.

---

## Solution Summary

Build an AI-native software engineering platform that treats the repository as **structured knowledge, not plain text**. Instead of repeatedly reading and re-embedding files, the platform maintains a continuously-updated **Semantic Knowledge Graph** (files, symbols, dependencies, architecture, ownership, documentation) via a **Repository Intelligence Engine (RIE)**. A **Context Engine** pulls the minimal high-quality context needed per task from that graph, project memory, git history, and prior conversation — which is then handed to a **multi-agent runtime** (Planner, Coder, Reviewer, and future Architect/Tester/Debugger/Security/Documentation agents) orchestrated by LangGraph, which reason and call a permissioned **Tool Runtime** to safely act on the repo (filesystem, terminal, git, tests, etc.).

```
Repository → Repository Analysis → AI Semantic Analysis → Knowledge Representation
           → Context Engine → Agent Runtime → Developer
```

Core direction:
- **Understand before you generate.** Every interaction begins with repository understanding, not repository reading.
- **Structured over stochastic retrieval.** A graph of files/symbols/dependencies/domains beats repeated chunk-and-embed.
- **Deterministic actions, probabilistic reasoning.** Agents reason; Tools execute — with a permission layer between them.
- **Developer stays in control.** No file modification without explicit approval; every edit produces a preview first.
- **Everything replaceable.** LLM provider, agent, tool, skill, memory, and context engine are all swappable subsystems.

Assumptions this solution depends on:
- Tree-sitter can adequately parse the target language set for AST/symbol extraction.
- Incremental (not full-repo) re-indexing is sufficient to keep the graph fresh at interactive speed.
- LangGraph's orchestration model scales cleanly from 2–3 agents (V1) to 7+ agents (V2) without a redesign.
- A local-first (SQLite-backed) architecture is acceptable for V1; cloud/team sync is explicitly deferred.

### Target Users

**Primary users**
- **Professional developers** working in existing codebases — code generation, refactoring, debugging, documentation, day-to-day AI pairing.
- **Open-source maintainers** — fast repository onboarding, issue triage, PR review, and code explanation for contributors.

**Secondary users**
- **Students / learners** — using the assistant to understand unfamiliar repositories, frameworks, and system design.
- **Engineering teams** — shared project memory, standardized workflows, and living architecture documentation (V3+; requires cloud sync, explicitly out of scope for V1).

**Explicitly not for (V1)**
- Large enterprises needing multi-seat governance, SSO, or compliance tooling (Enterprise-tier features, deferred).
- Teams requiring real-time multi-user collaborative sessions (Future roadmap, not V1/V2).
- Non-technical stakeholders — this is a developer tool, not a no-code product builder.

### Definition of Success

| Metric | Type | What it proves |
|---|---|---|
| Median tokens consumed per resolved task, vs. a file-rereading baseline | Customer outcome (efficiency) | The graph + Context Engine actually reduces redundant context, not just in theory |
| Time-to-first-useful-answer on an unfamiliar repository (cold workspace → correct architectural question answered) | Customer outcome (time saved) | Repository understanding is fast enough to be usable, not just accurate |
| % of agent-proposed edits accepted without manual correction | Customer outcome (quality/trust) | Multi-agent reasoning + context quality translates into usable output |
| Weekly active workspaces (repos with `vc chat` sessions) | Business (adoption) | Developers keep coming back after the first index |
| Graph freshness lag after a file change (time until incremental update reflected) | Product health | Repository Intelligence Engine is actually "continuously updated," not batch-stale |

*(Baselines to be established during Phase 3–4 benchmarking against IMPLEMENTATION.md's Repository Intelligence Engine and Retrieval Engine milestones.)*

### UX / Design Principles

- **Understanding before action.** The assistant should be able to explain *why* before it proposes *what* — no code changes without demonstrated repo context.
- **Nothing happens without approval.** Every file modification produces a preview/diff first; developer control is non-negotiable, not a setting.
- **Minimal, not maximal, context.** When in doubt, the Context Engine should retrieve less — surfacing exactly what's relevant beats surfacing everything possibly relevant.
- **Fast feedback in the terminal.** Streaming responses, live progress/log panels, and responsive interactive mode — the CLI should never feel like it's silently "thinking."
- **Deterministic actions stay deterministic.** Tools never reason and agents never directly touch the filesystem/git/terminal — reasoning and execution are always separated by the permission layer.
- **Every subsystem is swappable.** LLM provider, agent, skill, tool, and memory implementations should be replaceable without cascading changes — this is a design constraint, not just an implementation detail.

---

## Scope & Capabilities

**In scope (V1):** a working CLI-based assistant that can open a workspace, build and incrementally maintain a Repository Intelligence Engine (scan → parse → extract symbols → map dependencies → build the semantic graph), retrieve minimal relevant context for a request, generate/edit code and documentation through a single LLM provider, and safely execute git/filesystem/terminal actions through a permissioned Tool Runtime.

**Explicitly out of scope (V1):** multi-agent orchestration beyond a minimal Planner→Coder→Reviewer flow, the full skill/plugin ecosystem, security/testing automation, and anything requiring cloud sync or multi-user collaboration.

### Key Capabilities (AI + Human Friendly)

- **Understand a repository's structure** — languages, frameworks, package managers, build tools, monorepo/microservice layout — without the developer explaining it.
- **Answer questions about the codebase** — architecture, symbol locations, "why does X call Y" — grounded in the actual dependency graph, not guesswork.
- **Generate new code** — classes, functions, components, tests, docs, API endpoints, SQL, config — that fits existing conventions.
- **Edit existing code safely** — rename, move, extract, inline, refactor — with a preview before every change lands.
- **Explain and fix errors** — trace an error to its root cause and propose a patch, including likely side effects.
- **Track project-specific knowledge over time** — coding conventions, architecture decisions, and preferences persist across sessions instead of being re-explained.
- **Resume prior work** — a developer can close a session and pick the conversation back up with full context intact.
- **Turn an empty directory into a working project** — scaffold, generate, and index a brand-new codebase end-to-end (V1 stretch / early V2).

### In-Scope: Detailed User Stories

*(Priority: P0 = required for V1 ship, P1 = V1 stretch / early V2)*

- **P0 — Professional developer, onboarding to a legacy repo:** "As a developer joining an unfamiliar codebase, I want to ask `vc chat` where a specific business rule is implemented and get an answer grounded in the actual dependency graph, so I don't have to grep and guess."
- **P0 — Professional developer, daily coding:** "As a developer mid-feature, I want to ask the assistant to add a REST endpoint that follows my project's existing patterns, so I don't have to restate my conventions every time."
- **P0 — Professional developer, safety:** "As a developer, I want every proposed edit shown as a diff before it's applied, so an AI mistake never silently lands in my working tree."
- **P0 — Open-source maintainer, triage:** "As a maintainer, I want to ask the assistant to explain what a submitted PR changes and which modules it touches, so I can review faster."
- **P1 — Student, learning:** "As a student, I want to ask the assistant to explain the overall architecture of a repo I've never seen, so I can ramp up on unfamiliar frameworks."
- **P1 — Developer, resuming work:** "As a developer, I want to close my laptop mid-task and resume the same `vc chat` session tomorrow without re-explaining what I was doing."
- **P1 — Developer, greenfield:** "As a developer starting from an empty folder, I want to describe what I'm building and get a scaffolded, indexed starting project."

### Out-of-Scope

Deferred to **V2**: full multi-agent runtime (Architect, Tester, Debugger, Security Auditor, Documentation Writer agents), the Skills system (`/architect`, `/reviewer`, `/security`, etc.), the Plugin SDK, automated testing generation, and security/vulnerability analysis.

Deferred to **V3 / Future roadmap**: cloud synchronization, shared/team project memory, remote and distributed agent execution, IDE extensions (VS Code, JetBrains, Neovim), a browser extension, CI/CD agents (GitHub Actions, Jira, Slack, Linear integrations), voice interaction, self-improving/autonomous engineering workflows, private/self-hosted model hosting, GPU acceleration, live collaboration, and repository analytics dashboards.

**Reasoning for exclusion:** every deferred item either depends on a subsystem that doesn't exist yet in V1 (e.g., team memory requires cloud sync; autonomous workflows require a proven multi-agent runtime first), or trades core-loop reliability for breadth too early. IMPLEMENTATION.md's dependency-driven phasing is explicit that "Repository Intelligence must exist before Retrieval. Retrieval must exist before AI Agents. AI Agents must exist before autonomous workflows" — scope here mirrors that ordering.

---

## Delivery, Risks & Open Questions

### Release Plan & Milestones

Implementation is dependency-driven, not feature-driven — each phase must leave the system stable and testable before the next begins.

| Phase | Deliverable | Acceptance Criteria |
|---|---|---|
| 0 — Foundation | Repo structure, build system, TS config, lint/format, test framework, CI, logging, config loader | Project builds, tests pass, CLI launches, CI green |
| 1 — CLI Runtime | `vc open`, `vc chat`, `vc index`, `vc status`, `vc config` | Users can interact with the platform entirely through the CLI |
| 2 — Workspace Manager | Workspace abstraction (repo detection, config load, storage init) | Opening a repository creates or loads a Workspace |
| 3 — Repository Intelligence Engine | Scanner, language detection, AST parser, symbol extraction, dependency analysis, project summaries, repository DB | Repository intelligence updates automatically after code changes |
| 4 — Retrieval Engine | Symbol / keyword / graph / summary retrieval (vector + hybrid deferred) | Relevant context retrievable without scanning the whole repo |
| 5 — Conversation State | Goal/topic/entity tracking, session persistence, summaries | Users resume previous chats without replaying the full conversation |
| 6 — LangGraph Runtime | Planner, Coder, Reviewer agents; retry, state, human approval | A single request flows through multiple coordinated agents |
| 7 — Tool Runtime | Filesystem, terminal, git, search, testing tools behind a permission layer | Agents can safely modify repositories |
| 8 — LLM Integration | Initial provider (NVIDIA Build API); provider abstraction for future OpenAI/Anthropic/Google/Ollama/local | Changing providers requires no architectural changes |
| 9 — Project Generation | Empty workspace → Planner → Architect → Scaffold → Coder → Reviewer → indexed project | Users can generate a complete project from an empty directory |
| 10 — Plugin System | Plugin types: commands, tools, agents, retrievers, languages, prompts | Third-party plugins integrate without core modification |
| 11 — Optimization | Incremental indexing, caching, parallel parsing, lazy/background loading | Large repositories remain responsive |
| 12 — Release | Docs, packaging, installers, versioning, release automation, benchmarks, public examples | Platform is ready for public release |

**Version roadmap (feature grouping):**
- **V1:** AI Chat, Repository Scanner, Semantic Knowledge Graph, Context Engine, Tool Runtime, Memory, Code Generation, Git integration, Documentation generation.
- **V2:** Multi-agent runtime, Skills system, Plugin SDK, Testing automation, Security analysis, Refactoring engine.
- **V3:** Cloud sync, Team memory, IDE plugins, Enterprise support, Autonomous engineering workflows.

Outcomes should be reviewed at each phase boundary against the Definition of Success metrics above — particularly token-consumption and time-to-first-useful-answer, which are directly testable once Phase 3 (RIE) and Phase 4 (Retrieval) land.

### Constraints & Assumptions

- **Build vs. buy is a hard constraint, not a preference.** Reuse LangGraph (orchestration), Tree-sitter (parsing), SQLite (persistence), Ink (terminal UI), Commander (CLI), and Execa (process execution). Custom engineering effort is reserved for the RIE, Context Engine, Semantic Knowledge Graph, Hybrid Retrieval, Project Memory, Tool Runtime, and Plugin Framework — the components that actually differentiate the product.
- **Local-first for V1.** All persistence (repo graph, memory, sessions) is local (SQLite); no cloud dependency until V3.
- **Single LLM provider at launch** (NVIDIA Build API), with a provider-abstraction layer designed in from Phase 8 so switching providers is a config change, not a rewrite.
- **Every persisted artifact (config, graph, memory, plugins, sessions) must declare a spec version** (SemVer) for forward/backward compatibility as the platform evolves — this is a technical contract from SPEC.md, not optional polish.
- **No file modification without explicit developer approval**, enforced at the Tool Runtime's permission layer — this is both a UX principle and a hard technical constraint.
- **Assumption:** incremental indexing (not full rescans) will be sufficient to keep the graph "fresh" at interactive speed even on large repos — unvalidated until Phase 11 (Optimization) benchmarking.
- **Assumption:** Tree-sitter grammar coverage is sufficient for the initially targeted language set (TypeScript, JavaScript, Python, Go, Java, Rust, C#, C++, plus HTML/CSS/Markdown as non-code artifacts).

### Open Questions & Risks

- **Competitive risk:** Claude Code, Cursor, Copilot, Windsurf, and Codex CLI are all shipping fast and well-funded. Open question: does a persistent semantic graph produce a *user-perceptible* quality/speed advantage large enough to justify switching, or does it only show up in token-cost metrics developers don't directly see?
- **Scaling risk:** the architecture is designed to scale from small → medium → enterprise repos "without architectural redesign" — this claim is untested until a genuinely large (monorepo-scale) repository is indexed end-to-end. Risk of graph-construction or retrieval latency degrading non-linearly with repo size.
- **Provider risk:** launching on NVIDIA Build API as the sole V1 provider is a dependency risk if pricing, availability, or model quality shifts before the provider-abstraction layer (Phase 8) is proven out with a second provider.
- **Scope risk:** the feature surface across FEATURES.md (22 sections) is large relative to the V1 phase list in IMPLEMENTATION.md — there's a real risk of scope creep pulling V2/V3 features (skills, plugins, multi-agent) into V1 before the foundation (RIE, Retrieval, Tool Runtime) is proven stable. Mitigation: the phase-dependency ordering in IMPLEMENTATION.md should be treated as a hard gate, not a suggestion.
- **Open question:** what's the actual acceptance bar for "graph accurately reflects the repository" (the Consistency guarantee in SPEC.md)? No automated correctness benchmark is currently defined.
- **Open question:** how is Project Memory scoped and reconciled if a developer works across multiple workspaces referencing shared conventions — is memory purely per-workspace in V1, with cross-workspace/team memory correctly deferred to V3?
- **Dependency:** Phase 6 (LangGraph Runtime) and Phase 9 (Project Generation) both assume Phase 3 (RIE) and Phase 4 (Retrieval) are fully stable — any slippage in Phase 3/4 timelines cascades directly into every later phase, per the project's own "never build higher layers before lower layers are complete" principle.
