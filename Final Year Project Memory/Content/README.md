# Intellego — Obsidian Project Memory README

Welcome to the Obsidian memory space for **Intellego**. This folder is the centralized repository of project understanding, design decisions, roadmap status, and developer progress logs.

---

## 1. Project Overview

### What is Intellego?
Intellego is a native desktop AI software-engineering platform designed to run locally on a developer's machine. It consists of:
*   **Frontend:** Electron shell + React/Vite renderer.
*   **Backend Engine:** FastAPI local python server sidecar binding strictly to `127.0.0.1`.
*   **Orchestration:** A LangGraph-orchestrated Planner → Coder → Reviewer agent chain backed by NVIDIA Nemotron (Build API).

### Why It Matters
Unlike modern coding assistants that re-read and re-embed entire codebases on every interaction (resulting in high token consumption and stateless contexts), Intellego maintains a persistent, continuously-updated **Semantic Knowledge Graph** of the repository using a local **Repository Intelligence Engine (RIE)** and SQLite database. This drastically reduces token overhead and enables deep architectural understanding.

### Who It Is For
*   **Professional Developers:** For day-to-day pairing, convention-aware code generation, refactoring, and debugging.
*   **Open-Source Maintainers:** For fast codebase onboarding, issue triage, and PR review.
*   **Students/Learners:** For navigating and understanding new architectures and frameworks.

---

## 2. Core Safety Rule
No tool or agent may write to disk or mutate git state silently. Every change is formatted as a diff preview and requires explicit developer approval.

---

## 3. How to Help (Developer/Agent Guidelines)
*   **Step-by-Step Implementation:** Adhere to the dependency-driven roadmap outlined in the documentation.
*   **Edit Safety:** Ensure all file modification proposals go through the `edit/preview` → `edit/apply` endpoints.
*   **Code Quality & Verification:** Write unit tests for all new functionalities using `pytest` (backend) and `vitest` (frontend).

---

## 4. Useful Project Links
*   **Codebase Root:** [Workspace Root](file:///C:/pnav/projects/4%20-%201%20Project%20Batch%2016/)
*   **Core Configuration Rules:** [AGENT.md](file:///C:/pnav/projects/4%20-%201%20Project%20Batch%2016/.agents/AGENT.md)
*   **Main Documentation Files:**
    *   [PROJECT.md](file:///C:/pnav/projects/4%20-%201%20Project%20Batch%2016/docs/PROJECT.md) — Executive vision and competitive analysis.
    *   [PRD.md](file:///C:/pnav/projects/4%20-%201%20Project%20Batch%2016/docs/PRD.md) — Product requirements and definition of success.
    *   [SPEC.md](file:///C:/pnav/projects/4%20-%201%20Project%20Batch%2016/docs/SPEC.md) — API schemas, state machines, and contracts between subsystems.
    *   [FEATURES.md](file:///C:/pnav/projects/4%20-%201%20Project%20Batch%2016/docs/FEATURES.md) — Detailed feature breakdowns and release tiers.
    *   [IMPLEMENTATION.md](file:///C:/pnav/projects/4%20-%201%20Project%20Batch%2016/docs/IMPLEMENTATION.md) — Phase timeline and checklist.
