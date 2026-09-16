# Intellego — Project Description

## 1. What is this project about?

**Intellego** is an AI Software Engineering Platform. In simple terms: it's an AI system that writes and maintains code — but unlike typical AI coding assistants (Copilot-style tools), it doesn't just look at a few open files and guess. It actually *builds an understanding* of your entire codebase first, and keeps that understanding up to date as the project grows.

Think of it like the difference between:
- A freelancer who skims your project folder every single time you ask them a question, vs.
- A senior engineer who has worked on the codebase for months and already knows how everything connects.

Intellego is designed to behave like the second one — for every request.

The core of this is a component called the **Repository Intelligence Engine (RIE)**: a persistent, continuously-updated "brain" that understands the structure, symbols, dependencies, and relationships inside a codebase, so the AI doesn't have to rediscover the project from scratch every time.

---

## 2. What problem is it solving?

**The problem, in plain language:** most AI coding tools have no memory of your codebase. Every time you ask them something, they re-scan files, re-read code, and re-build their understanding from zero — even if you asked something related five minutes ago.

**Why this is bad:**
- **Slow** — re-scanning a repo for every prompt takes time.
- **Expensive** — re-reading files means burning tokens repeatedly on the same information.
- **Redundant** — the AI is redoing work it already did.
- **Inconsistent** — since context is rebuilt each time, the AI's "understanding" of the project can shift or contradict itself between requests.
- **Doesn't scale** — this approach breaks down badly on large codebases or monorepos, where scanning everything for every request isn't realistic.

**In technical terms:** current AI coding assistants operate in a stateless, brute-force retrieval loop — `User → Ask AI → AI scans repo → builds context → writes code` — repeated on every single prompt, with no persistent representation of the repository carried over between requests.

---

## 3. What is the workflow (general terms)?

Instead of the AI rediscovering the repository every time, Intellego flips the model:

```
Repository
   ↓
Repository Intelligence Engine (builds & maintains understanding)
   ↓
Relevant Context (only what's needed, not everything)
   ↓
LLM / Agents (reasoning + code generation)
```

**In plain terms:** the repository is analyzed once and kept up to date incrementally (not rebuilt from scratch each time). When a request comes in, the system doesn't ask "what does this whole repo look like?" — it asks "what parts of my existing understanding are relevant to this specific request?" and retrieves just that.

**A single request, end to end, looks like this:**

```
User asks a question
   ↓
Planner understands the intent
   ↓
Retrieval Engine picks the right retrieval strategy
   ↓
Relevant context is assembled
   ↓
LLM reasons over that context
   ↓
Specialized agents (architect, coder, reviewer, tester) act on it
   ↓
Tools execute deterministic actions (file edits, git, tests)
   ↓
Reviewer validates the result
   ↓
Repository understanding is updated
   ↓
Response is returned to the user
```

This applies to two situations: building a brand-new project from an empty folder ("greenfield"), or working inside an existing, possibly large, codebase.

---

## 4. What technologies are being used?

| Technology | Role |
|---|---|
| **LangGraph** | Orchestrates the multi-agent workflow (planner → architect → coder → reviewer → tester) |
| **Tree-sitter** | Parses source code into Abstract Syntax Trees (ASTs) for structural understanding |
| **SQLite** | Stores the structured repository knowledge (symbols, dependencies, metadata) |
| **Knowledge Graph** | Represents relationships between code entities (files, functions, dependencies) semantically |
| **Retrieval Engine** | Fetches only the relevant context for a given task, using multiple strategies (symbol-based, keyword, graph-based, git history, memory, and vector search as a future addition) |
| **Tool Runtime** | Executes deterministic, non-AI actions — file operations, terminal commands, Git actions, running tests |
| **LLM (provider-independent)** | Performs reasoning, planning, and code generation on top of retrieved context |

A guiding principle here is **build vs. buy**: proven infrastructure (LangGraph, Tree-sitter, SQLite) is reused rather than reinvented, and custom engineering effort is reserved for the parts that are genuinely unique to this project — the RIE, the Context Engine, and the Retrieval Engine.

---

## 5. How do these technologies connect?

This is the part that ties everything together — how raw code becomes something an AI agent can reason about intelligently:

1. **Tree-sitter** reads the raw source files and parses them into an **AST** — a structured, machine-readable representation of the code's syntax (not just plain text).
2. From that AST, the system extracts **symbols** (functions, classes, variables) and traces **dependencies** (what imports/calls/depends on what).
3. This structured information is stored in **SQLite** and organized into a **knowledge graph**, which captures how different parts of the codebase relate to each other — not just what the code *says*, but how it's *connected*.
4. When a request comes in, the **Retrieval Engine** queries this knowledge graph (and other strategies like keyword or git-history search) to pull out only the pieces of context relevant to that specific task — instead of dumping the whole repository into the AI.
5. That focused context is handed to the **LLM**, which reasons over it.
6. **LangGraph** coordinates a sequence of specialized AI agents (planner, architect, coder, reviewer, tester) that each do a specific job using that context.
7. Any action that doesn't require AI judgment — editing a file, running a terminal command, committing to git, running a test suite — is handled by the **Tool Runtime**, a deterministic execution layer, rather than by the LLM guessing.
8. After the task completes, the **Repository Intelligence Engine** updates its understanding incrementally, so the next request starts from an already-current picture of the codebase — not from zero.

**In one sentence:** Tree-sitter and the knowledge graph give the system *structural memory* of the codebase, the Retrieval Engine turns that memory into *just the right context* for a task, LangGraph turns that context into *coordinated AI action*, and the Tool Runtime turns AI decisions into *real, deterministic changes* — all without re-scanning the repository from scratch every time.
