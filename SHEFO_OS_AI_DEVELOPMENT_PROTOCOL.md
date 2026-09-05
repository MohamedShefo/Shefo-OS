# Shefo OS — AI Development Protocol

This document defines the mandatory operating guidelines and rules for AI agents and human contributors developing **Shefo OS**.

---

## 1. Overview & Core Philosophy

Shefo OS is built with strict architectural discipline. To ensure stability, maintainability, and long-term clarity, all development performed by AI assistants must strictly follow a **specification-driven, phase-gated execution model**.

AI developers function as precision execution engines under human oversight—not speculative architects.

---

## 2. Mandatory Rules for AI Development

### Rule 1: Specification-First Development
- **Single Source of Truth**: The approved master specification and architectural decision record (`docs/ARCHITECTURE_DECISIONS.md`) govern all implementation details.
- **Strict Scope Boundaries**: Implement *only* what is explicitly requested for the active phase.
- **No Unrequested Scope Expansion**: Do not introduce speculative "future-proofing", unapproved features, or additional entity types.

### Rule 2: Small, Atomic Working Increments
- **Phase-Gated Execution**: Work must proceed in distinct, well-defined phases.
- **Incremental Verification**: Each phase or task must be verified as fully operational before advancing to the next.
- **Clean Git Hygiene**: Automatically or explicitly stage and commit working states at phase boundaries to ensure rollback safety.

### Rule 3: Zero Unauthorized Architecture or Schema Changes
- **Entity Freeze**: Entity definitions (`Capture`, `Project`, `Note`, `Task`) and their fields are locked once approved.
- **Schema Protection**: Database schemas, PostgreSQL enums, soft deletion policies (`deleted_at`), and `updated_at` trigger patterns must not be altered without explicit re-approval.
- **No Premature Abstractions**: Do not introduce generic relation graphs, polymorphic links, or non-approved tables in early versions (v0).

### Rule 4: Requirement for Explicit Approval on Major Changes
- **Approval Gate**: Any proposed change affecting database schemas, API boundaries, entity relationships, security architecture, or authentication models requires explicit human review and approval.
- **Blocker Resolution**: If a technical blocker or specification ambiguity arises:
  1. Halt execution on the affected component.
  2. Clearly document the issue and present options.
  3. Wait for explicit human direction before proceeding.

### Rule 5: Strict Security & Key Separation
- **No Admin Keys in Client Bundles**: The `SUPABASE_SERVICE_ROLE_KEY` must **never** be referenced in client-side code or exposed via `NEXT_PUBLIC_` environment variables.
- **Database-Level Isolation**: All data isolation must be enforced via PostgreSQL Row Level Security (RLS) using `auth.uid() = user_id`.
- **Secret Protection**: Commit zero real credentials or API keys to git repositories.

---

## 3. Workflow Checklist for AI Execution

When executing a phase or task:
1. [ ] Review master specification & `docs/ARCHITECTURE_DECISIONS.md`.
2. [ ] Identify exact requirements for the target phase.
3. [ ] Implement changes in physical files on disk without modifying unauthorized modules.
4. [ ] Verify compilation, linting, and execution.
5. [ ] Stage and commit changes with clean commit messages.
6. [ ] Report completion with concise summary of work accomplished.
