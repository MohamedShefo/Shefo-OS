# Shefo OS — Project State Checkpoint

> Canonical handoff/state document for future AI agents and conversations.
> Every important statement is labeled with its source:
> `[verified from code]` · `[from user]` `[unverified]`

---

## Project Identity

* **Project:** Shefo OS `[from user]`
* **Purpose / vision:** Personal Operating System & External Cognitive Cortex `[from user]` (also stated in root layout metadata `[verified from code]`)
* **Core principles:** Manual-first, AI-optional; minimal token-efficient changes; reuse existing architecture; no semantic/vector search, automation engines, or speculative abstractions `[from user]`
* **Current architectural direction:** Next.js 16 App Router + Supabase (Auth/Postgres/Storage); Server Actions as the single mutation mechanism; hand-maintained `src/types/database.ts`; Tailwind CSS v4; no new dependencies unless justified `[verified from code]` (package.json, src structure)

---

## Current Version

* **Current checkpoint:** V1 RC1 `[from user]`
* **RC commit:** `d9ef0b3` `[verified from code]`
* **RC tag:** `v1-rc1` (points exactly to `d9ef0b31e108fcbf3cf30a8ac4c8122588e5a741`) `[verified from code]`
* **Current branch:** `fix/second-ui-crud-calendar-finance-pass` `[verified from code]`
* **Master status:** local and `origin/master` both at `486b791` ("fix(notes): graph on list page; fix(fab): pointer-events passthrough") — master does NOT contain the RC commits; RC branch is 3 commits ahead of master `[verified from code]`
* **Checkpoint date:** 2026-09-28 `[verified from code]` (session date)
* **V1 status:** `V1 RC1 — implementation checkpoint; Preview verification pending` `[from user]`

V1 is NOT officially closed. See "V1 closure rule" below.

---

## Completed Implementation

Feature existence below was verified against the current tree at `d9ef0b3` unless marked otherwise. Detailed behavior of pre-RC features is documented in `docs/AI_HANDOFF.md` / `docs/IMPLEMENTATION_STATUS.md` `[verified from code]` (files exist).

### Core / Shell

* App shell with sidebar (desktop) + mobile header/drawer, breadcrumbs, command palette, floating capture, timer widget, shell trackers `[verified from code]` (src/components/shell/*)
* Authenticated user avatar rendered in sidebar footer and mobile header drawer via shared `Avatar` component (initials fallback) `[verified from code]`
* Sign-out flow with hardened session teardown `[verified from code]` (commit `236633c` in history)

### Search / Command Palette

* Global search/command palette (⌘K) `[verified from code]` (src/components/command-palette.tsx, src/features/search/*)
* Cross-module search with filters `[from user]` (historical; module exists in tree)

### Capture

* Quick Capture inbox: create (with optional project link), list, search, soft-delete (Archive) `[verified from code]`
* Inline edit of capture text (added in RC batch 2) `[verified from code]`
* Floating Quick Capture widget (FAB) with visibility persistence `[verified from code]`
* Draggable FAB with viewport bounds + position persistence (added in RC batch 2) `[verified from code]`

### Projects

* Projects CRUD: create dialog, detail pages, status workflow (active/paused/archived), soft-delete `[verified from code]`
* Full edit via combined create/edit dialog + Edit button on project cards (added in RC batch 2) `[verified from code]`
* Goal/work linking on projects `[verified from code]` (updateProjectGoal / updateProjectWork actions)

### Tasks

* Tasks CRUD: create dialog (priority, due date, reminder, recurrence, project/note/capture links), status workflow, soft-delete, CSV import `[verified from code]`
* Recurring tasks spawn next occurrence on completion `[verified from code]` (completeTaskOccurrence)
* Full edit via combined create/edit dialog + Edit button on task items (added in RC batch 2) `[verified from code]`
* Task → Calendar scheduling integration `[verified from code]` (createEventFromTask)

### Notes / Knowledge

* Notes with blocks, tags (normalized at data boundary via `normalizeTags`), pinning, wikilinks `[[Title]]` rendering + backlinks `[verified from code]`
* Obsidian-style knowledge graph (SVG) on note detail (split layout) and on the notes list page (side panel) `[verified from code]`
* Note export `[verified from code]`

### Learning

* Skills module: create/list/search/soft-delete + full edit (added in RC batch 2) + work/note linking `[verified from code]`

### Career / Work Experience

* Work experiences CRUD with combined create/edit dialog; edit entry on detail page and in list (list Edit button added in RC batch 2) `[verified from code]`

### Skills

* See "Learning" above (skills module lives under Learning in this codebase) `[verified from code]`

### Habits

* Habits with daily completion toggles, streaks, pause/resume, soft-delete + full edit (added in RC batch 2) `[verified from code]`

### Journal

* Journal entries with editor `[verified from code]` (src/features/journal/*)

### Goals

* Goals CRUD with milestones, progress calculation, entity attachments (project/task/note/habit) `[verified from code]`
* Goal Target Value is a free-form TEXT field (migration `0014`; type `string | null`; text input) `[verified from code]`
* Combined create/edit GoalDialog `[verified from code]`

### Calendar

* Calendar month view + event list + search `[verified from code]`
* Direct event creation via `EventDialog` (title, start/end datetime, all-day, description) with edit + delete — full CRUD `[verified from code]`
* Task → Calendar integration `[verified from code]`

### Finance

* Personal finance: transactions CRUD (income/expense), monthly summary, category aggregation, net trend + category charts `[verified from code]`
* Available/Fixed Money and Frozen/Held Money balances: `finance_balances` table (migration `0015`), view + inline edit on the finance page (added in RC batch 2) `[verified from code]`
* Balances are separate from monthly income/expense calculations `[verified from code]`

### Dashboard

* Dashboard with widgets + reports (custom date range) `[verified from code]` (src/features/dashboard/*, src/features/reports/*, /reports route)

### Graph / Obsidian-style linking

* Wikilinks + backlinks + SVG knowledge graph (see Notes/Knowledge) `[verified from code]`

### Profiles / Avatars

* Profile page with display name/username editing, avatar upload/remove via Supabase Storage (`avatars` bucket, versioned public URL) `[verified from code]`
* Avatar shown in shell (sidebar + mobile drawer) `[verified from code]`

### Workspaces / Memberships / Roles

* Workspaces with roles (owner/admin/member), workspace switcher, per-workspace project scoping `[verified from code]` (src/features/workspaces/*, /workspaces routes)

### Authorization / RLS

* RLS enabled on all application tables with user-owned policies (`auth.uid() = user_id`) `[verified from code]` (migrations 0004, 0006, 0007, 0009, 0010, 0015)
* Server Actions enforce auth + ownership on every mutation `[verified from code]`
* Auth-schema repair (GoTrue RLS) documented in `docs/AUTH_REPAIR.md`; NOT applied from this environment `[from user]`

### MFA / Trusted Devices / Security

* Security area with devices management + security event logging `[verified from code]` (src/features/security/*, src/features/devices/*, /security route)
* MFA/phone/SMS/2FA provider integrations explicitly OUT OF SCOPE per user `[from user]`

### Notifications

* Notifications: bell with unread count, recent list, mark read/all, dismiss, reminder generation `[verified from code]`
* Centered modal notification panel (added in RC batch 2) `[verified from code]`

### Quick Capture

* See "Capture" above `[verified from code]`

### Timer

* Focus timer widget (presets, custom minutes, start/pause/resume/reset, document.title indicator) `[verified from code]`
* Draggable with viewport bounds + position persistence (added in RC batch 2) `[verified from code]`

### Theme system

* Light/Dark theme: class-based (`dark` on `<html>`), pre-paint inline script from `localStorage['shefo:theme']` (default dark), `ThemeToggle` component, CSS variables in `globals.css` `[verified from code]`
* No hardcoded `dark` class in SSR output (fixed in RC batch 1) `[verified from code]`
* Live-verified in RC batch 1: light preference renders light, dark renders dark, stable through hydration `[from user]` (manual browser test performed by agent in earlier session)

### Export

* Export bundle (CSV/Markdown) including goals with target_value `[verified from code]` (src/features/export/*, /export route)

---

## Current RC Changes

### First controlled UI bug batch — commit `545f9a9` `[verified from code]`

* **Notification positioning:** `NotificationBell` gained a `direction` prop; sidebar instance opens the dropdown upward (`bottom-10`) so it is not clipped at the bottom-left edge `[verified from code]`
* **Theme handling:** removed hardcoded `dark` class from SSR `<html>`; pre-paint script is the single source of pre-paint truth `[verified from code]`
* **Avatar visibility:** `AppShell` fetches profile via existing `getProfile()` and passes `avatarUrl`/`displayName` to sidebar + mobile header; shared `Avatar` component rendered in both `[verified from code]`
* **Goal Target Value:** root cause was `notes.tags`-style data-boundary issue — actually `target_value` NUMERIC column + `Number()` coercion; fixed via migration `0014` (NUMERIC → TEXT with safe cast), type → `string | null`, text input, measurable check parses number `[verified from code]`
* Also in this batch (commit `379925d`, same branch line): `normalizeTags` hardened to parse JSON-array strings + legacy array literals; all raw `.map/.join/.some` call sites route through it `[verified from code]`
* Trash revalidation fix (commit `a949ceb`): `permanentlyDeleteItem`/`restoreItem` revalidate entity list paths `[verified from code]`
* Floating widgets z-index fix (commit `90d457a`): FAB/timer at `z-40`, below dialogs `[verified from code]`
* Notes list graph + FAB pointer-events passthrough (commit `486b791`) `[verified from code]`

### Second controlled feature/fix batch — commit `d9ef0b3` `[verified from code]`

* **Universal editing:** new `updateCapture`, `updateProject`, `updateTask`, `updateSkill`, `updateHabit` server actions (all user-scoped, revalidating); combined create/edit forms for projects and tasks; inline edit for captures, skills, habits; Edit buttons on project cards, task items, skill cards, habit cards, work list `[verified from code]`
* **Calendar direct event creation:** verified already implemented (`EventDialog` create/edit/delete + `createEventFromTask`); no changes needed `[verified from code]`
* **Notification modal positioning:** absolute dropdown replaced with centered modal panel (existing dialog pattern), `direction` prop removed `[verified from code]`
* **Draggable Quick Capture:** `src/lib/use-draggable.ts` hook (Pointer Events, mouse+touch, viewport-bounded, click/drag threshold, localStorage persistence) wired into `FloatingCapture` `[verified from code]`
* **Draggable Timer:** same hook wired into `TimerWidget`; drag starts only on non-interactive areas so timer controls keep working `[verified from code]`
* **Finance available/frozen balances:** migration `0015` (`finance_balances` table + RLS), `getFinanceBalances`/`updateFinanceBalances` actions, `FinanceBalancesCard` with inline edit `[verified from code]`
* **Mobile theme verification:** re-verified correct (no hardcoded dark, pre-paint script works, no hydration mismatch); left unchanged `[verified from code]`

---

## Database / Migrations State

Migration files present in `supabase/migrations/` `[verified from code]`:

`0000_schema.sql`, `0001_cross_links.sql`, `0002_fix_project_fk_delete_behavior.sql`, `0004_strict_rls.sql`, `0005_phase4_work_knowledge.sql`, `0006_phase5_workspaces_security.sql`, `0007_phase6_goals_finance.sql`, `0008_exact_location.sql`, `0009_notifications.sql`, `0010_calendar_files_reminders.sql`, `0011_notification_refkey.sql`, `0012_notes_pinned.sql`, `0013_task_recurrence.sql`, `0014_goal_target_value_text.sql`, `0015_finance_balances.sql`

(Note: there is intentionally no `0003` file.) `[verified from code]`

* **Latest migration:** `0015_finance_balances.sql` — new `finance_balances` table (user_id UNIQUE, available/frozen NUMERIC, updated_at trigger, RLS + 5 policies) `[verified from code]`
* **Goal Target Value migration:** `0014_goal_target_value_text.sql` — `ALTER TABLE goals ALTER COLUMN target_value TYPE TEXT USING target_value::text` `[verified from code]`
* **Finance balances migration:** `0015` (above) `[verified from code]`
* **RLS-related migrations:** `0004_strict_rls.sql`, plus per-table RLS in `0006`, `0007`, `0009`, `0010`, `0015` `[verified from code]`

Remote application status:

* `0014` and `0015`: **applied remotely — verified** via `supabase db push --linked` success output during the RC batches; column type change and existing goal data (`"6"` preserved) confirmed by live query `[verified from code]`
* `0000`–`0013`: applied remotely per project history (phases 2–10); **not re-verified in this checkpoint** `[unverified]`

---

## Routes

Application routes under `src/app/` `[verified from code]`:

* `/` (home/dashboard), `/today`
* `/capture` (Quick Capture inbox)
* `/projects`, `/projects/[id]`
* `/tasks`
* `/notes`, `/notes/[id]`
* `/work`, `/work/[id]`
* `/skills`
* `/habits`
* `/journal`
* `/goals`, `/goals/[id]`
* `/calendar`
* `/finance`
* `/reports`
* `/search`
* `/profile`
* `/security`
* `/workspaces`, `/workspaces/[id]`
* `/archives`
* `/trash`
* `/export`
* `/login`, `/signup`, `/auth/confirm`

---

## Pending Manual Verification

The following items are supplied by the user and are NOT automatically verified by code inspection `[from user]`:

### Production/Preview verification checklist

* Notifications visible and correctly positioned `[from user]`
* Mobile Light/Dark mode on a REAL mobile device `[from user]`
* Profile avatar visibility `[from user]`
* Avatar isolation between Account A and Account B — Account B must never display Account A's avatar `[from user]`
* Goal Target Value accepts text/string correctly `[from user]`
* Universal edit for: Captures, Projects, Tasks, Goals, Work/Experience, Skills, Habits `[from user]`
* Calendar direct event creation `[from user]`
* Calendar edit/delete if implemented `[from user]`
* Quick Capture dragging `[from user]`
* Timer dragging `[from user]`
* Quick Capture + Timer behavior in RTL/Arabic `[from user]`
* Notifications in RTL/Arabic `[from user]`
* Finance Available / Fixed Money `[from user]`
* Finance Frozen / Held Money `[from user]`
* Existing monthly income/expense behavior `[from user]`
* Security functionality `[from user]`
* Export functionality `[from user]`
* No regressions in existing core functionality `[from user]`

---

## Next Stage — Preview Verification

Required next stage — NOT completed work:

Before deploying the RC Preview, verify `[from user]`:

1. All required Supabase migrations are applied to the database used by the Preview. (Migrations `0014`/`0015` confirmed applied to the linked project `pnulvnqffmmrhicldbup` `[verified from code]`; whether the Preview uses that same project is `[unverified]`.)
2. The Preview deployment's URL is included in Supabase Auth Redirect URLs. `[unverified]`
3. Determine whether Preview and Production use the same Supabase project. `[unverified]`
4. If they share the same database, testing must avoid destructive or misleading real-user data. `[from user]`

---

## V1 Closure Rule

V1 is NOT considered closed merely because implementation is complete.

V1 becomes officially closed only when `[from user]`:

1. The V1 RC Preview is deployed.
2. The complete manual verification checklist passes.
3. No blocking regression remains.
4. The result is explicitly accepted as the V1 baseline.

Until then:

`V1 status = RC / Preview verification pending`

---

## Permanent Project-State Rule

> After every completed meaningful implementation batch, the responsible AI agent must update `docs/PROJECT_STATE.md` as the final project-state step before committing the batch.
>
> The document must distinguish verified repository facts, user-provided decisions/history, and unverified information.
>
> Do not update the project state after every tiny edit or micro-fix. Update it after a meaningful completed implementation batch or milestone.
>
> Never invent project history or infer human decisions from code.

This rule applies to all future AI agents working on Shefo OS.

---

## Handoff — What To Do Next

Current starting point: `v1-rc1 / d9ef0b3` `[verified from code]`

Next sequence `[from user]`:

1. Verify Supabase migration state.
2. Verify Supabase Auth Redirect URLs for Preview.
3. Determine Preview/Production database relationship.
4. Deploy V1 RC to Vercel Preview.
5. Perform the complete manual verification checklist.
6. Fix only blocking issues found during Preview verification.
7. Update PROJECT_STATE.md after the fix batch if any.
8. Re-verify Preview.
9. Explicitly close V1 only after all checklist items pass.
10. Promote the verified Preview to Production.
11. Begin V2 planning only after V1 closure.

Do NOT define V2 scope in this checkpoint.
