# Supabase Auth Repair — one-time superuser procedure (NOT applied)

## Status

**NOT APPLIED.** Requires a PostgreSQL superuser (Supabase Dashboard → SQL editor).
The CLI temp role is not the owner of the `auth.*` tables, so this cannot run
through `supabase db push` (`ERROR: must be owner of table audit_log_entries`).
The corresponding migration file was intentionally removed from
`supabase/migrations/` so it can never half-apply or block future pushes.

## Forensic record (all evidence gathered live, no assumptions)

For the RLS hypothesis:
- Controlled experiment: valid credentials → HTTP 500
  (`unexpected_failure` / `Database error querying schema`) AFTER credential
  validation; wrong password → clean HTTP 400 `invalid_credentials`. The failure
  sits at session/identity creation, not user lookup.
- RLS enabled with ZERO policies on every GoTrue-operated table
  (`users`, `sessions`, `refresh_tokens`, `identities`, `mfa_factors`,
  `mfa_challenges`, `mfa_amr_claims`, `audit_log_entries`, `flow_state`,
  `instances`, `one_time_tokens`, `saml_*`, `sso_*`, `schema_migrations`).
- `supabase_auth_admin` (GoTrue's role) has `rolbypassrls = false`.
- `relforcerowsecurity = false` everywhere checked (no forced-RLS twist).
- Zero grants on the `auth` schema to `anon`/`authenticated`.

Alternative causes eliminated:
- No custom triggers on any `auth` table (`information_schema.triggers` empty).
- Table owners are stock (`supabase_auth_admin`).
- `auth.instances` shape is current (`raw_base_config`, no legacy `raw_config`).
- Representative `auth.users` rows are well-formed (bcrypt hash, confirmed email).
- No schema change can be applied from this environment at all: the CLI role
  lacks ownership/superuser rights, so no smaller CLI-side repair exists.

## Root cause (verified live, no guessing)

- Password login deterministically returns HTTP 500
  (`"error_code":"unexpected_failure","msg":"Database error querying schema"`)
  AFTER credential validation; a wrong-password attempt correctly returns 400.
- The `auth` schema has ROW LEVEL SECURITY enabled on its operational tables
  with ZERO policies on every one of them (verified via `pg_class` +
  `pg_policies` inventory).
- The `supabase_auth_admin` role used by GoTrue has `rolbypassrls = false`
  (verified via `pg_roles`), so policy-less RLS (deny-all) blocks GoTrue from
  reading identities and writing sessions/refresh tokens. No user can log in.

## Why the fix below is safe

1. `information_schema.role_table_grants` shows ZERO grants on the `auth`
   schema to the `anon`/`authenticated` roles, so PostgREST API consumers gain
   no new access — the RLS flags were purely decorative for them.
2. It restores the functional pre-surgery state; it creates no new policies
   and no new access paths.
3. Only tables verified as (RLS enabled AND zero policies) are listed.
4. No users, credentials, sessions, or data are modified, created, or deleted.

## Procedure (Dashboard SQL editor, run once as `postgres`)

```sql
ALTER TABLE auth.audit_log_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.flow_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_amr_claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_factors DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.one_time_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.refresh_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.saml_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.saml_relay_states DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.schema_migrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sso_domains DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sso_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
```

## Verification after running

1. `POST /auth/v1/token?grant_type=password` with valid credentials returns
   HTTP 200 with `access_token` (previously HTTP 500).
2. Wrong password still returns HTTP 400 `invalid_credentials`.
3. Confirm no new grants exist for `anon`/`authenticated` on the `auth` schema.
4. Re-run the Shefo OS authenticated smoke test (login → CRUD → logout).
