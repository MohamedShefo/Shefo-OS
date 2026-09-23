# Shefo OS — AI Handoff & Baseline Documentation

## Executive Summary
Shefo OS has completed **Phase 0 (Live Audit)**, **Phase 1 (Stabilization)**, **Phase 2 (Core + Shell Foundations)**, and the **Phase 2.1 verification pass**. The application features a unified black-first personal brand shell layout (`AppShell`), centralized navigation config, shared UI primitives (`Input`, `Select`, `Badge`, `Card`, `Dialog`, `PageHeader`, `EmptyState`, `LoadingState`), minimal domain contracts (`EntityType`, `EntityRef`), lifecycle semantics (`TRASH_RETENTION_DAYS = 30`), and a registered but currently **blocked** `db:types` script (no container runtime available). See §4–§5 for the Phase 2.1 recovery and verification record.

---

## 1. Current Repository Architecture

```
shefo-os/
├── docs/
│   ├── ARCHITECTURE_DECISIONS.md
│   ├── IMPLEMENTATION_STATUS.md
│   └── AI_HANDOFF.md
├── src/
│   ├── app/                    # Next.js App Router Pages (Dashboard, Capture, Notes, Projects, Tasks, Auth)
│   ├── components/             
│   │   ├── common/             # PageHeader, EmptyState, LoadingState
│   │   ├── shell/              # AppShell, Sidebar, Header
│   │   └── ui/                 # Button, Input, Select, Badge, Card, Dialog
│   ├── config/
│   │   └── navigation.ts       # Centralized navigation item registry
│   ├── features/               # Domain feature modules (captures, notes, projects, tasks)
│   ├── lib/                    # Shared utilities (cn, normalizeTags)
│   ├── proxy.ts                # Next.js 16 Edge Middleware session updater
│   ├── types/                  
│   │   ├── database.ts         # Supabase database interfaces
│   │   ├── domain.ts           # EntityType, EntityRef, CoreMetadata
│   │   └── lifecycle.ts        # EntityLifecycleState, TRASH_RETENTION_DAYS, getLifecycleState
│   └── utils/supabase/         # Supabase client/server/middleware factories
├── supabase/
│   └── migrations/             # PostgreSQL DDL migrations (0000_schema.sql)
├── package.json                # Includes "db:types" generation script
└── tsconfig.json
```

---

## 2. Phase 2 Architecture Added

1. **Shared Domain Contracts (`src/types/domain.ts`)**:
   - `EntityType` (`capture` | `note` | `project` | `task` | `goal` | `learning`)
   - `EntityRef` (`{ entityType: EntityType; entityId: string }`)
   - `CoreMetadata` (`created_at`, `updated_at`, `deleted_at`)
2. **Database Type Generation**:
   - Script added to `package.json`: `"db:types": "npx supabase gen types typescript --local > src/types/database.ts"`.
3. **Application Shell & Navigation (`src/components/shell/`, `src/config/navigation.ts`)**:
   - Centralized navigation registry `NAV_ITEMS` covering Command Center, Quick Capture, Notes & Concepts, Projects, and Tasks.
   - `AppShell` layout component combining desktop `Sidebar`, mobile drawer `Header`, and responsive page content container.
4. **Shared UI Primitives & Common Components**:
   - High-value primitives: `Input`, `Select`, `Badge`, `Card`, `Dialog`, `PageHeader`, `EmptyState`, `LoadingState`.
5. **Design Tokens / Theme Foundation (`src/app/globals.css`)**:
   - Personal brand: Black-first.
   - Added semantic tokens: `--surface`, `--success`, `--warning`, `--danger`.
6. **Lifecycle Semantics (`src/types/lifecycle.ts`)**:
   - Defined `EntityLifecycleState` (`active` | `archived` | `trash` | `restored` | `deleted`) and default `TRASH_RETENTION_DAYS = 30`.

---

## 3. What Was Intentionally NOT Changed

- **No Domain Service Layer / Repository Abstraction**: Server Actions remain the primary data mutation mechanism.
- **No Schema Redesign**: Database tables, columns, and foreign keys remain untouched.
- **No Premature Feature Modules**: Goals, Timer, Knowledge Graph, Journal, Analytics, AI, Export, and Offline sync were explicitly omitted.

---

## 4. Phase 2.1 Verification Pass (Interrupted → Recovered)

### 4.1 Interruption Diagnosis

The only interrupted operation carried over from Antigravity was `npm run db:types`:

```
npx supabase gen types typescript --local > src/types/database.ts
```

The shell redirect `>` truncated `src/types/database.ts` **first**, then the Supabase CLI
failed because no container runtime is installed. The CLI's error payload was therefore
written into the emptied file:

```json
{"_tag":"Error","error":{"code":"LegacyContainerRuntimeNotFoundError","message":"docker: command not found (podman also not found) ..."}}
```

This was **not** a Phase 2.1 code change. It was a failed-command artifact that broke all
14 modules importing from `@/types/database`.

**Recovery performed:**
1. Restored `src/types/database.ts` from HEAD (`468bac8`) — content verified against the
   committed hand-written module types (`Capture`, `Project`, `Note`, `Task` + status unions).
2. Added `/supabase/.temp/` to `.gitignore` (Supabase CLI local cache left by the aborted run).

No other uncommitted changes existed. No Phase 2.1 source edits were ever made.

### 4.2 `db:types` Result — BLOCKED

| Item | Observed |
| :--- | :--- |
| Script | `npx supabase gen types typescript --local > src/types/database.ts` |
| Supabase CLI | Installed, `2.117.0` |
| `docker` | **Not found on PATH** |
| `podman` | **Not found on PATH** |
| Local Supabase stack | Not running / not configured (no `supabase/config.toml`, no container runtime) |

**Conclusion:** `db:types` **cannot be executed in this environment.** It requires a running
local Supabase stack backed by Docker or Podman. Per project rules, no container runtime was
installed, no local stack was bootstrapped, and the script was **not** modified or replaced.
This is an environment limitation only — it is not a reason to redesign the project.

> ⚠️ Running `npm run db:types` again without a container runtime will **re-corrupt**
> `src/types/database.ts`. Do not run it until Docker/Podman is available.

---

## 5. Empirical Verification Results (Phase 2.1)

| Verification Check | Command | Result |
| :--- | :--- | :--- |
| **Database Type Generation** | `npm run db:types` | **BLOCKED** — no Docker/Podman container runtime |
| **TypeScript Typecheck** | `npx tsc --noEmit` | **PASS** (exit 0, 0 errors) |
| **ESLint Check** | `npm run lint` | **PASS** (exit 0, 0 errors, 0 warnings) |
| **Production Build** | `npm run build` | **PASS** (exit 0) — Compiled successfully, TypeScript passed, 11/11 static pages, Next.js 16.3.4 Turbopack |
| **Runtime Smoke Test** | HTTP route sweep + dev server log review | **PASS (unauthenticated surface)** — see below |

### Runtime Smoke Test — detail

`GET` sweep against `http://localhost:3000`, all **HTTP 200**, no error markers
(`Application error`, `Internal Server Error`, `__next_error__`):

| Route | Status | Behaviour |
| :--- | :--- | :--- |
| `/` | 200 | Redirects to `/login` (auth gate) |
| `/capture` | 200 | Redirects to `/login` (auth gate) |
| `/notes` | 200 | Redirects to `/login` (auth gate) |
| `/projects` | 200 | Redirects to `/login` (auth gate) |
| `/tasks` | 200 | Redirects to `/login` (auth gate) |
| `/login` | 200 | Renders `Shefo OS` sign-in screen |
| `/signup` | 200 | Renders `Shefo OS` sign-up screen (public) |

Dev server log review: all requests `200`, `proxy.ts` middleware executing on every request,
**no 5xx responses, no runtime exceptions, no hydration errors reported**.

### Verification Limitations (explicitly NOT verified)

- **Authenticated screens were not visually verified**: Command Center content, desktop
  sidebar, mobile drawer/header, and the Capture/Notes/Projects/Tasks UI could not be
  inspected because no desktop browser is connected to this session and no test credentials
  were available. Routing, auth gating, compile-time integrity, and server-side rendering
  were verified; interactive/hydrated UI state was **not**.
- No CRUD mutations were exercised end-to-end during this pass.

### Known Remaining Issues

1. `npm run db:types` is unusable until a container runtime is installed (script left intact).
2. Authenticated UI runtime verification still outstanding.

---

## 6. Next Recommended Phase

**Phase 3 authorized — Trash slice implemented (see §7).** Goals and Learning sectors
remain unstarted (blocked, see §7).

---

## 7. Phase 3 — Trash Lifecycle View (Implemented)

**Scope implemented:** read-only Trash view over the four existing entities, reusing the
established soft-delete mechanism (`deleted_at`) and lifecycle semantics
(`TRASH_RETENTION_DAYS = 30`, `getLifecycleState`).

| Piece | Location |
| :--- | :--- |
| Route (auth-gated, `AppShell` + `PageHeader`) | `src/app/trash/page.tsx` |
| Server Actions (`getTrashedItems`, `restoreItem`, `permanentlyDeleteItem`) | `src/features/trash/actions.ts` |
| Client list (entity filter tabs, Restore / Delete forever, `EmptyState`) | `src/features/trash/components/trash-list.tsx` |
| Nav entry (`Trash`, `/trash`) — picked up by desktop `Sidebar` and mobile `Header` | `src/config/navigation.ts` |

- No migration, no schema change, no `src/types/database.ts` change.
- `restoreItem` sets `deleted_at = NULL`; `permanentlyDeleteItem` hard-deletes only rows
  already soft-deleted (`.not('deleted_at', 'is', null)` guard), user-scoped (`user_id`).
- Verification: `tsc` PASS, `lint` PASS, `build` PASS (12/12 pages, `/trash` listed),
  `/trash` smoke test 200 → redirects to `/login` unauthenticated, no error markers.

**Goals / Learning — NOT implemented (STOP condition).** No `goals`/`learning` tables exist
in `0000_schema.sql`; no `Goal`/`Learning` interfaces exist (only `EntityType` union members);
no field/status/relation spec exists in docs or code. ADR-005 bounds v0 to four entities and
ADR-014 freezes the schema (no new tables). Building them would require inventing schema,
RLS policies, and domain semantics — a database/design decision not yet made.

---

## 8. Cross-Module Linking Layer (Implemented)

Optional nullable foreign keys connecting the four existing entities, no generic relations
table, no many-to-many, no mandatory relations, `ON DELETE SET NULL` throughout.

| Piece | Location |
| :--- | :--- |
| Migration (new columns + indexes only) | `supabase/migrations/0001_cross_links.sql` — **must be applied to remote Supabase** |
| Manual type updates (`Capture.project_id`, `Task.source_capture_id`) | `src/types/database.ts` |
| Scoped getters (`getCapturesByProject`, `getNotesByProject`, `getTasksByProject`, `getProjectById`) + link-aware create payloads | `src/features/*/actions.ts` (colocated per entity) |
| Project selector in fast capture; project badge in inbox | `capture-input.tsx`, `capture-list.tsx`, `src/app/capture/page.tsx` |
| Note + source-capture selectors in task creation; link badges in task rows | `create-task-dialog.tsx`, `task-list.tsx`, `task-item.tsx`, `src/app/tasks/page.tsx` |
| Project hub (linked Captures / Notes / Tasks, loaded only on visit) | `src/app/projects/[id]/page.tsx`, card title link in `project-card.tsx` |

Verification: `tsc` PASS, `lint` PASS, `build` PASS (`/projects/[id]` listed), affected
routes (`/capture`, `/tasks`, `/projects`, `/notes`) all 200 with no error markers.
Dashboard untouched (no new queries, no optimization).

---

## 9. Phase 3 — System Expansion Foundation (Implemented)

Single coherent batch (no migrations, no new dependencies, no Auth surgery):

1. **Global Search** — `src/features/search/actions.ts`.
2. **Command Palette** — `src/components/command-palette.tsx` (+⌘K, quick capture, navigation, results).
3. **Filters Foundation** — `src/components/common/search-field.tsx` + `src/lib/search.ts`, wired into Capture/Project/Task lists.
4. **Floating Capture** — `src/components/floating-capture.tsx` (shell-wide, hideable, RTL-aware).
5. **Timer Engine** — `src/features/timer/use-timer.ts` + `src/components/timer-widget.tsx` (no Task/Calendar coupling).
6. **PARA Foundation** — `src/types/para.ts` + `/archives` route (archive ≠ trash, enforced in `classifyPara`).
7. **Unified Shell** — `Breadcrumbs`, overlay mounts, palette entry points, theme toggle placement.
8. **Visual Identity + Motion** — dark-by-default + light toggle, FOUC-safe init, reduced-motion guard.
9. **Perf/Security** — server-side search with limits, user scoping everywhere, LIKE escaping (+ `or=` sanitization), no full-table reads, no new indexes needed at personal scale, no service-role exposure.

Review fixes applied in one pass: capture-list JSX paren, 5× `setState-in-effect` lint refactors (lazy init + render-time adjustment + async-callback sets), hydration guards (`suppressHydrationWarning`) on persisted-preference widgets, PostgREST `or=` sanitization.

Verification: `tsc` PASS, `lint` PASS, `build` PASS (13/13 pages incl. `/archives`), 8/8 routes HTTP 200 with auth gates intact and no error markers.
Authenticated interactive testing remains blocked by the known remote Auth issue (no session obtainable) and no connected desktop browser — recorded, not caused by this phase.

---

## 10. Phase 4 — Work/Experience + Knowledge (Implemented)

Single coherent batch. Migration `0005_phase4_work_knowledge.sql` applied remotely; history fully synced (`0000/0001/0002/0004/0005`).

**Schema (all user-owned, RLS enforced, verified 4 policies × 9 tables):**
- `work_experiences`, `skills`, `journal_entries` (unique live user+date), `habits`, `habit_completions` (unique habit+day, CASCADE), `note_blocks` (CASCADE), `note_links` (directed, no-self CHECK, CASCADE), `work_experience_skills`, `note_skills`.
- Additive nullable columns: `notes.work_experience_id` + `notes.note_type`, `projects.work_experience_id` (all SET NULL).

**App:** `/work`, `/work/[id]`, `/skills`, `/journal?date=`, `/habits`, `/notes/[id]` (blocks editor, split view, SVG graph, link/skill managers, meta editor), `/export` (JSON/Markdown/CSV). Notes Layer A extended in place (card edit + create dialog). Search covers work/skills/journal/habits; palette gained 4 commands; nav gained Work/Skills/Journal/Habits/Export.

**Review fixes (one pass):** to-one embed casts normalized via `toOne` (+ trashed-skill filtering in relation lists), `classifyPara` made exhaustive for new entity types, empty-interface lint fix, `todayISO` extracted from `'use server'` modules to `src/lib/date.ts`, PostgREST embed hint names verified against live constraints.

**Verification:** `tsc` PASS, `lint` PASS, `build` PASS (18/18 pages), 6/6 new routes HTTP 200 with auth gates intact and no error markers. Authenticated interactive testing still blocked by the known remote Auth login-500 issue (no Auth surgery performed).

---

## 11. Phase 5 — Multi-User, Workspaces & Security (Implemented)

**Auth root cause (diagnosed, repair documented — NOT applied):**
remote `auth.*` tables carry RLS with zero policies while `supabase_auth_admin`
lacks BYPASSRLS, so GoTrue cannot create sessions (login 500s post-validation).
CLI temp role is not table owner (`must be owner` on push), so the fix needs a
one-time superuser run. Exact SQL + safety case + verification live in
`docs/AUTH_REPAIR.md`; the failed migration file was removed so pushes stay clean.

**Delivered:** profiles/avatars (`avatars` bucket), workspaces + memberships
(owner/admin/member, helpers, last-owner guards), explicit authorization
(server + RLS on every mutation), native TOTP MFA (opt-in), password step-up
device trust (hash-based, IP never identity), opt-in approximate activity
location (admin-visible only), append-only security events, `/security` hub,
workspace switcher + project/note workspace filing, shell integration
(search/palette/nav/breadcrumbs compatible).

**Review fixes (one pass):** cookie constants extracted from `'use server'`
modules (`src/lib/cookies.ts`), empty-object-type lint, avatar directive
placement, MFA effect refactor, username null-safety, trashed-skill filtering.

**Verification:** `tsc` PASS, `lint` PASS, `build` PASS (21/21 pages),
migration history synced through `0006`, new tables RLS-verified remotely,
route smoke (see report). Authenticated interactive testing still blocked by
the Auth issue above — recorded with repair procedure ready.

---

## 12. Phase 6 — Dashboard, Goals, Reports & Personal Finance (Implemented)

Single coherent batch. Migration `0007_phase6_goals_finance.sql` applied remotely;
history fully synced (`0000/0001/0002/0004/0005/0006/0007`).

**Schema (user-owned, RLS verified 4 policies × 4 tables):**
- `goals` (+ status CHECK) + `goal_milestones` (ordered, CASCADE).
- `finance_transactions` (income/expense CHECK, non-negative amount, strictly
  personal — no workspace column by design).
- `dashboard_state` (one row per user: mode + widget id list).
- Nullable `goal_id` links (SET NULL) on projects/tasks/habits/notes.

**App:** Normal/Focus dashboard with 10-widget registry (show/hide/reorder/reset,
persisted); `/goals` + `/goals/[id]` (progress semantics, milestones, attach
managers); `/finance` (entry flow, filters, month summary, trend + donut);
`/reports` (7/14/30/90d, server-side modular metrics, SVG charts); export
extended (goals/finance CSVs + JSON); search + palette + nav cover new domains.

**Review fixes (one pass):** embed-cast normalization pattern reused;
`DashboardWidgetId`/constants extracted from `'use server'` modules;
donut math made pure for the immutability lint; username null-safety carried over.

**Verification:** `tsc` PASS, `lint` PASS (0/0), `build` PASS (24/24 pages),
7/7 routes HTTP 200 with auth gates intact and no error markers.
Authenticated interactive testing still blocked by the documented Auth
login-500 (no Auth surgery performed).

---

## 14. Phase 7 — Extensions Foundation (Implemented)

Minimal production-safe batch, no redesign:
- **Global search foundation:** new `/search?q=` page (server-rendered, grouped
  by entity with badges/links/empty states) on top of the existing `globalSearch`
  action; palette + sidebar/mobile entry points unchanged.
- **Notifications foundation:** `0009_notifications.sql` applied remotely
  (owner-scoped table, RLS + 4 policies verified live); actions for
  unread-count/list/read/mark-all plus a self-only create helper for future
  producers; shell bell with unread badge + panel on desktop and mobile.
  No push, email, SMS, automation, or third-party services.
- **Extension architecture:** `src/extensions/README.md` recipe only —
  migration → types → actions → UI → shell registration. No runtime abstraction.

**Verification:** `tsc` PASS, `lint` PASS, `build` PASS (25/25 incl. `/search`),
history synced through `0009`, 4/4 routes HTTP 200 with gates intact and no
error markers. Authenticated testing still blocked by the documented Auth issue.

---

## 15. Phase 7 — Completion (CLOSED)

Remaining extensions implemented in the existing architecture, no redesign:
- **Calendar:** `calendar_events` + `/calendar` (month grid, agenda, validated
  create/edit/delete, all-day). Internal only, no sync.
- **Task reminders:** `tasks.reminder_at` + lazy shell-load materialization into
  the notifications foundation; DB-enforced dedupe (`ref_key` partial unique
  index); no cron/automation.
- **Files:** private `attachments` bucket + metadata rows + reusable manager on
  project/note detail pages; 5 MB, executable blocklist, signed downloads.
- **Import/export:** existing export + new bounded tasks-CSV import (parsed +
  previewed client-side, validated + user-scoped server-side).
- **Daily summary:** `/today` (overdue/due/reminders, events, notifications,
  inbox, journal) — deterministic, no AI.
- **Rich linking:** badge→hub links (captures, tasks), capture→inbox link.
- **Goals:** already satisfied by Phase 6 — no new work.
- **PWA:** `icon.svg` + `manifest.ts`; no service worker/offline (deferred).

Migrations `0010_calendar_files_reminders.sql` + `0011_notification_refkey.sql`
applied; history synced through `0011`; RLS verified on all new tables and the
attachments storage path.

**Verification:** `tsc` PASS, `lint` PASS (0/0), `build` PASS (29/29),
10/10 routes HTTP 200 with gates intact and no error markers. Authenticated
interactive testing still blocked by the documented Auth login-500.

---

## 16. Phase 8 — Knowledge Layer + Sidebar UX (Implemented)

- **Sidebar fix:** navigation column scrolls independently with a bottom fade
  affordance and thin scrollbar; footer (theme, profile, logout) pinned and
  always reachable; mobile drawer capped at 70vh. No viewport or identity change.
- **Knowledge:** same `notes` entity; `0012_notes_pinned.sql` applied remotely
  (single `is_pinned` column + index, history synced through `0012`, no RLS
  change needed); pin toggle + pinned-first ordering; tag filter (from distinct
  user tags) + updated/created sort; deterministic `getRelatedNotes`
  (project/tags/manual-links scoring); related-notes section + project/workplace
  quick-nav chips on the detail page. Tags and `note_type` reused instead of a
  new category system; standalone notes unchanged.

**Verification:** `tsc` PASS, `lint` PASS, `build` PASS (29/29), 10/10 routes
HTTP 200 with gates intact and no error markers. Authenticated interactive
testing still blocked by the documented Auth login-500.

---

## 17. Phase 9 — Productivity & Task Workflow (Implemented)

- **Task workflow:** overdue highlighting (red, "Overdue since"), due-first
  sorting with done-sinking, sort selector (due/priority/newest), recurrence
  badge, ⏰ reminder display, 📅 schedule-to-calendar action on open tasks.
- **Recurring tasks:** migration `0013_task_recurrence.sql` applied remotely
  (`recurrence` CHECK daily/weekly/monthly + `parent_task_id` SET NULL);
  `completeTaskOccurrence` marks done and spawns the next open occurrence
  (dates advanced) only when no live child exists — toggling can never
  duplicate or corrupt the series.
- **Task→Calendar→Notifications→Today:** `createEventFromTask` (owned-task
  guard, due-date required, +1h default); reminders already materialize via
  Phase 7 lazy check; `/today` gained quick actions and deep links.
- **No automation engine, no new tables beyond the two task columns.**

**Verification:** `tsc` PASS, `lint` PASS (0/0), `build` PASS (29/29),
new columns live remotely, history synced through `0013`, 5/5 routes HTTP 200
with gates intact and no error markers. Authenticated interactive testing
still blocked by the documented Auth login-500.

---

## 13. Phase 6 Correction Pass — CLOSED

- **Theme script:** raw `<script dangerouslySetInnerHTML>` in root layout replaced
  with `next/script` (`beforeInteractive`); FOUC-safe persisted theme, RTL/LTR,
  dark/light all preserved; `suppressHydrationWarning` kept on `<html>` only.
  Verified in rendered HTML (script present, dark class, no errors).
- **formatMoney boundary:** pure formatter extracted to `src/lib/format.ts`
  (no directives); charts module keeps client-only SVG; all 4 importers updated.
- **Exact workspace location:** migration `0008_exact_location.sql` applied
  (lat/lng + precision + consent/update timestamps + pair/precision CHECKs);
  3-mode consent (off/approximate/exact), high-accuracy exact capture with
  graceful denial fallback, revocable with coordinate clearing, pluggable
  server-side geocode interface (default: coords only, no API keys), admin-only
  display with consent/update times. RLS unchanged (existing rules cover it).
- **Auth:** full live forensics completed (see `docs/AUTH_REPAIR.md`); diagnosis
  confirmed, no alternative cause found; repair remains a one-time superuser
  step this environment cannot execute — no fake repair, no security weakening.
- **Regression:** `tsc`/`lint`/`build` PASS (24/24); 20/20 routes HTTP 200 with
  auth gates intact and zero error markers.
