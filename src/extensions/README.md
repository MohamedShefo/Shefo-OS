# Shefo OS — Extension Recipe (Phase 7 foundation)

Future modules (Calendar, Files, AI, PWA/Mobile, …) plug into the existing
architecture by following this recipe. No framework, no registry to update —
each step reuses established patterns.

## 1. Data (only if a new entity is truly needed)

- Add ONE migration: `supabase/migrations/NNNN_descriptive_name.sql`.
- Every user-owned table needs: `user_id UUID NOT NULL REFERENCES auth.users(id)
  ON DELETE CASCADE`, `created_at`/`updated_at` (+ `set_updated_at()` trigger),
  `deleted_at TIMESTAMPTZ NULL` for long-lived entities, a `user_id` index,
  `ENABLE ROW LEVEL SECURITY`, and the standard four ownership policies
  (`SELECT USING`, `INSERT WITH CHECK`, `UPDATE USING + WITH CHECK`,
  `DELETE USING` on `auth.uid() = user_id`).
- Relations: direct nullable FKs with `ON DELETE SET NULL`. No generic
  relations table, no many-to-many unless the domain demands it.
- Verify remotely: `supabase migration list --linked`, `db push --dry-run`,
  `db push`, then confirm tables + RLS + policies.

## 2. Types

- Extend `src/types/database.ts` by hand. Never run local `db:types`
  (no container runtime in this environment; see `docs/AI_HANDOFF.md`).
- Extend `src/types/domain.ts` `EntityType` only if the module is linkable.

## 3. Server actions (`src/features/<name>/actions.ts`)

- `'use server'` modules export ONLY async functions.
- Every action: `auth.getUser()` gate → `eq('user_id', user.id)` reads,
  `user_id: user.id` inserts, `.eq('id', …).eq('user_id', …)` mutations.
- Soft-delete long-lived entities (`deleted_at`); hard-delete only
  dependent rows (junctions, completions, blocks).
- `revalidatePath()` for every route the mutation affects.

## 4. UI

- Route page: auth gate + `AppShell` + `PageHeader` + shared primitives
  (`Button`, `Input`, `Select`, `Badge`, `Card`, `Dialog`, `EmptyState`,
  `SearchField`, `matchesQuery`).
- Client components: no synchronous `setState` in effects, lazy `useState`
  initializers for persisted preferences, `suppressHydrationWarning` where SSR
  defaults can differ.
- RTL: logical utilities (`start`/`end`, `ms`/`me`) for positioned elements.
- Motion: CSS only; global `prefers-reduced-motion` guard already applies.

## 5. Shell integration (automatic once registered)

- Add the route to `src/config/navigation.ts` → sidebar, mobile drawer,
  breadcrumbs, and command-palette navigation pick it up automatically.
- Extend `globalSearch` (`src/features/search/actions.ts`) + palette
  `ENTITY_ICON`/`ENTITY_LABEL` for search coverage.
- Add creation commands to the palette `createCommands` list where useful.

## 6. What NOT to build

- No service-role usage in client code, no custom auth/session systems.
- No AI/semantic/vector search without an explicit decision.
- No push/email/SMS, no automation engines, no paid services or API keys.
- No enterprise ACL engine — membership + role + ownership checks only.
