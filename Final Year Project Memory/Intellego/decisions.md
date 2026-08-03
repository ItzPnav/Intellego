# Design & Architectural Decisions — Intellego

This document acts as a persistent record of decisions made during the architecture and implementation phases of the Intellego platform.

---

## 1. Stack and Subsystems (Fixed for V1)
*   **Decision:** Standardize V1 strictly on Electron (desktop shell), React + Vite (renderer), Python + FastAPI (local backend engine sidecar), Tree-sitter (parsing), LangGraph (agent orchestration), SQLite (persistence), and NVIDIA Nemotron Build API (sole V1 LLM provider).
*   **Rationale:** Reuses robust, proven commodity infrastructure. Saves custom development hours to focus entirely on the custom Repository Intelligence Engine, Context Engine, and Retrieval systems.
*   **Date:** 2026-08-03
*   **Revisit Date:** Not to be swapped or replaced during V1 lifecycle.

---

## 2. Local-Only and Loopback Binding
*   **Decision:** FastAPI engine sidecar binds strictly to local loopback (`127.0.0.1`) and never opens raw network-facing endpoints. Electron renderer communicates only via port negotiation using localhost HTTP/WebSocket.
*   **Rationale:** Secures the workspace from unauthorized remote execution and aligns with local-first, privacy-respecting design principles.
*   **Date:** 2026-08-03
*   **Revisit Date:** Re-evaluate in V3 if cloud synchronization or multi-seat features are introduced.

---

## 3. Strict Write Previews (Edit Safety)
*   **Decision:** Every filesystem-write or git-mutating action must generate an `EditPreview` object containing unified diff text. The Tool Runtime blocks application until the user explicitly accepts it via `edit/apply`.
*   **Rationale:** Establishes non-negotiable user control. Prevents AI hallucinations or errors from corrupting working directory code state.
*   **Date:** 2026-08-03
*   **Revisit Date:** Core architecture principle; permanent.

---

## 4. Python Package Environment (Local-First Alternative)
*   **Decision:** Since Poetry is not globally installed on the development machine, use Python's built-in `venv` virtual environment manager combined with a standard `requirements.txt` file inside the `/engine` directory.
*   **Rationale:** Avoids forcing third-party installer downloads, matching the local-first startup principles.
*   **Date:** 2026-08-03
*   **Revisit Date:** If complex monorepo dependency resolution issues occur in future phases, re-evaluate.
