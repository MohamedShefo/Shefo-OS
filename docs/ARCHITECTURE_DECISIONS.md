# Architecture Decision Record (ADR) — Shefo OS

This document records the foundational architectural decisions approved for **Shefo OS (v0)**. All technical implementations must strictly adhere to these decisions.

---

## ADR-001: Manual-First Architecture / AI as Optional Layer

- **Status**: Approved
- **Context**: Many knowledge/personal OS systems over-rely on autonomous AI agents for triage, tagging, and organization, leading to loss of user trust, unexpected modifications, and opaque failures.
- **Decision**: Shefo OS is built **manual-first**. Every core feature (capturing, tagging, organizing, project/task tracking) must function fully and reliably without AI involvement. AI capabilities will act solely as optional helper layers (e.g., suggestions, summaries, structured extraction) operating under explicit user control.

---

## ADR-002: Structured but Flexible Data Model

- **Status**: Approved
- **Context**: Overly rigid database schemas restrict organic thought capture, while completely unstructured collections lead to chaos and poor query performance.
- **Decision**: Standardize on a hybrid data structure: fixed relational columns for core operational metadata (IDs, user references, statuses, priorities, timestamps) combined with flexible text/rich content fields (`body`, `tags` arrays) to allow free-form thought organization.

---

## ADR-003: Note + Concept Unified into One Entity in v0

- **Status**: Approved
- **Context**: Early architecture proposals considered separating free-form "Notes" from structured "Concepts/Knowledge Items".
- **Decision**: In v0, **Note and Concept are unified into a single `notes` entity**. Differentiating between notes and concepts introduces unnecessary schema complexity before real usage patterns emerge. A single `notes` entity with tagging support accommodates both notes and concept documentation seamlessly.

---

## ADR-004: No Generic Relations Table in v0

- **Status**: Approved
- **Context**: Complex knowledge graphs often use generic polymorphic link/edge tables (`relations` or `graph_edges`) to connect arbitrary entities.
- **Decision**: **No generic relations table in v0**. Relationships are strictly modeled via direct foreign key references (e.g., `tasks.project_id`, `notes.project_id`). This eliminates premature graph complexity, keeps SQL queries simple, and prevents maintenance overhead during initial development.

---

## ADR-005: Core v0 Entity Boundaries

- **Status**: Approved
- **Context**: Defining clear scope boundaries for foundational domain entities.
- **Decision**: v0 is strictly bounded to four primary user-owned entities:
  1. **Capture**: Quick inbox entries for raw, unprocessed thoughts/ideas (`captures`).
  2. **Project**: Outcome-oriented initiatives with statuses (`projects`).
  3. **Note**: Knowledge items, meeting notes, concepts, and synthesized information (`notes`).
  4. **Task**: Actionable items with status, priority, due date, and optional project linkage (`tasks`).

---

## ADR-006: RLS and Database-Level User Isolation

- **Status**: Approved
- **Context**: Security and data privacy require that users can never access or modify another user's data.
- **Decision**: Enforce user isolation strictly at the **database layer** using PostgreSQL **Row Level Security (RLS)** policies on all tables (`auth.uid() = user_id`). Security is not reliant solely on application-level filtering.

---

## ADR-007: Soft Deletion via `deleted_at`

- **Status**: Approved
- **Context**: Accidental hard deletion in personal knowledge and project management applications causes data loss and user panic.
- **Decision**: Implement **soft deletion** across all core entities (`captures`, `projects`, `notes`, `tasks`) via a `deleted_at TIMESTAMPTZ NULL` column. All application queries must filter out records where `deleted_at IS NOT NULL` unless explicitly requesting trash/archive items.

---

## ADR-008: Database-Controlled `updated_at` Triggers

- **Status**: Approved
- **Context**: Application-managed modification timestamps are prone to drift, missed updates, and client clock skew.
- **Decision**: Timestamps for record modifications (`updated_at`) are strictly managed inside PostgreSQL using a centralized `plpgsql` trigger function (`update_updated_at_column()`) attached to `BEFORE UPDATE` events on all core tables.

---

## ADR-009: Explicit Foreign Key Deletion Behavior

- **Status**: Approved
- **Context**: Cascading hard deletes can wipe out related notes or tasks when a project is deleted.
- **Decision**: Define explicit `ON DELETE` semantics:
  - User references (`user_id` -> `auth.users`): `ON DELETE CASCADE`.
  - Dependent entities (`tasks.project_id` -> `projects.id`, `notes.project_id` -> `projects.id`): `ON DELETE SET NULL` to preserve orphan tasks and notes when a parent project is hard-deleted.

---

## ADR-010: Real PostgreSQL Native Enums

- **Status**: Approved
- **Context**: Using text check constraints or application-only enums leads to invalid status strings entering the database via raw queries or API calls.
- **Decision**: Define and use native PostgreSQL enum types:
  - `capture_status`: `'inbox'`, `'processed'`, `'archived'`
  - `project_status`: `'backlog'`, `'in_progress'`, `'completed'`, `'archived'`
  - `task_status`: `'todo'`, `'in_progress'`, `'completed'`, `'cancelled'`
  - `task_priority`: `'low'`, `'medium'`, `'high'`, `'urgent'`

---

## ADR-011: Web / PWA-First Platform Strategy

- **Status**: Approved
- **Context**: Cross-platform deployment complexity can stall v0 delivery.
- **Decision**: Build Shefo OS as a **Web application first**, optimized for mobile and desktop viewports, designed to be deployed as a Progressive Web App (PWA). Native desktop (Tauri/Electron) or native mobile (React Native) are deferred to future major versions.

---

## ADR-012: Privacy-by-Design

- **Status**: Approved
- **Context**: Personal operating systems store sensitive personal and cognitive data.
- **Decision**: Privacy is guaranteed through user-isolated database RLS, standard secure HTTPS endpoints, zero third-party tracking scripts, and isolated per-user data tenancy in Supabase.

---

## ADR-013: Standard Search Before Semantic Search

- **Status**: Approved
- **Context**: Vector embeddings and semantic search add infrastructure overhead, latency, cost, and complexity.
- **Decision**: Rely on **standard PostgreSQL full-text search** (and basic keyword indexing) for v0. Vector embeddings, pgvector, and semantic search are explicitly out of scope until v0 core mechanics are proven in actual usage.

---

## ADR-014: Architecture Freeze Until Real Usage Evidence

- **Status**: Approved
- **Context**: Architecture fatigue occurs when schemas and frameworks are continually modified without user feedback.
- **Decision**: The v0 architecture is **frozen**. No new database tables, fields, or framework structural changes will be accepted until v0 is fully implemented and used in real scenarios to generate empirical usage data.

---

## ADR-015: Minimal Auth & Strict Key Separation

- **Status**: Approved
- **Context**: Exposing administrative credentials on the frontend creates high-severity security vulnerabilities.
- **Decision**: Authenticate users strictly via standard Supabase Email/Password authentication. The frontend application MUST ONLY utilize `@supabase/ssr` with `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The administrative `SUPABASE_SERVICE_ROLE_KEY` must **NEVER** be included in browser client code or bundled into public assets.

---

## ADR-016: Phase 0 Schema & Middleware Baseline Conventions

- **Status**: Approved (Phase 0 Baseline Discovery)
- **Context**: During the Phase 0 audit, small discrepancies were identified between early draft ADR texts and actual PostgreSQL DDL (`0000_schema.sql`), as well as Next.js 16 conventions.
- **Decision**:
  1. The canonical SQL ENUM definitions are anchored to `0000_schema.sql`:
     - `capture_status`: `'unprocessed'`, `'processed'`
     - `project_status`: `'active'`, `'paused'`, `'archived'`
     - `task_status`: `'todo'`, `'in_progress'`, `'done'`
     - `task_priority`: `'low'`, `'medium'`, `'high'`
  2. Next.js 16 uses `src/proxy.ts` for Edge Middleware session handling. `proxy.ts` delegates to `updateSession` from `@/utils/supabase/middleware`.

---

## ADR-017: Phase 2 Core + Shell Foundation Architecture

- **Status**: Approved (Phase 2 Baseline)
- **Context**: Shefo OS requires a unified application shell, centralized navigation, shared visual design tokens, and lightweight shared domain contracts without over-architecting or decoupling existing Server Actions.
- **Decision**:
  1. **Minimal Domain Contracts**: Standardize `EntityType` and `EntityRef` in `src/types/domain.ts`. Maintain existing module types in `src/types/database.ts`.
  2. **Database Type Generation**: Introduce `npm run db:types` (`npx supabase gen types typescript --local > src/types/database.ts`) anchored to the Supabase PostgreSQL schema.
  3. **Centralized Application Shell & Navigation**: Route definitions managed in `src/config/navigation.ts`. Pages use `AppShell` with desktop `Sidebar` and mobile drawer `Header`.
  4. **Shared UI Primitives**: Standardize high-value primitives (`Input`, `Select`, `Badge`, `Card`, `Dialog`, `PageHeader`, `EmptyState`, `LoadingState`) while preserving direct Server Action mutations.
  5. **Black-First Personal Brand Design Tokens**: Theme variables centralized in `globals.css` with semantic color tokens (`--surface`, `--success`, `--warning`, `--danger`).
  6. **Lifecycle Semantics**: Define `EntityLifecycleState` (`active` | `archived` | `trash` | `restored` | `deleted`) and `TRASH_RETENTION_DAYS = 30` in `src/types/lifecycle.ts`.


