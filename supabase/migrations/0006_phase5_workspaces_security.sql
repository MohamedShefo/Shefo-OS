-- ==============================================================================
-- SHEFO OS PHASE 5 — workspaces, profiles, memberships, devices, audit
-- ==============================================================================
-- New tables only (+ two additive nullable workspace link columns).
-- Personal data stays personal (user_id ownership, existing policies kept).
-- Shared visibility is strictly membership + role based via SECURITY DEFINER
-- helpers (avoids RLS self-reference recursion on memberships).
-- No existing table is altered except projects/notes gaining a nullable
-- workspace_id (SET NULL). No data is touched.
-- ------------------------------------------------------------------------------

-- ------------------------------------------------------------------------------
-- 1. Profiles (one row per auth user, app-provisioned)
-- ------------------------------------------------------------------------------

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NULL,
    username TEXT NULL UNIQUE,
    avatar_url TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. Workspaces (personal by default; shared possible later)
-- ------------------------------------------------------------------------------

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'personal',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- ------------------------------------------------------------------------------
-- 3. Memberships (owner / admin / member)
-- ------------------------------------------------------------------------------

CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_membership UNIQUE (workspace_id, user_id),
    CONSTRAINT chk_membership_role CHECK (role IN ('owner', 'admin', 'member'))
);

-- ------------------------------------------------------------------------------
-- 4. Trusted devices (hash, never raw secrets; IP is not identity)
-- ------------------------------------------------------------------------------

CREATE TABLE trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_label TEXT NULL,
    device_hash TEXT NOT NULL,
    trusted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_device UNIQUE (user_id, device_hash)
);

-- ------------------------------------------------------------------------------
-- 5. Security events (append-only: no UPDATE/DELETE policies by design)
-- ------------------------------------------------------------------------------

CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_security_events_user_created ON security_events(user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. Workspace activity (opt-in approximate location; never auth-relevant)
-- ------------------------------------------------------------------------------

CREATE TABLE workspace_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    city_label TEXT NULL,
    device_label TEXT NULL,
    share_location BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workspace_activity UNIQUE (workspace_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 7. Workspace links on hub entities (nullable; personal rows stay personal)
-- ------------------------------------------------------------------------------

ALTER TABLE projects
  ADD COLUMN workspace_id UUID NULL REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE notes
  ADD COLUMN workspace_id UUID NULL REFERENCES workspaces(id) ON DELETE SET NULL;

CREATE INDEX idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX idx_notes_workspace_id ON notes(workspace_id);

-- ------------------------------------------------------------------------------
-- 8. updated_at triggers + isolation indexes
-- ------------------------------------------------------------------------------

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_workspaces_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_workspace_activity_updated_at
BEFORE UPDATE ON workspace_activity
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX idx_memberships_workspace_id ON memberships(workspace_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX idx_workspace_activity_workspace_id ON workspace_activity(workspace_id);

-- ------------------------------------------------------------------------------
-- 9. Membership helper functions (SECURITY DEFINER: no RLS recursion)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_workspace_member(wid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE workspace_id = wid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.workspace_user_role(wid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM memberships
  WHERE workspace_id = wid AND user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_user_role(UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 10. RLS
-- ------------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_activity ENABLE ROW LEVEL SECURITY;

-- Profiles: strictly self-managed, no public profiles.
CREATE POLICY "Users manage own profile - select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users manage own profile - insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users manage own profile - update" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users manage own profile - delete" ON profiles FOR DELETE USING (auth.uid() = id);

-- Workspaces: owner manages; members read.
CREATE POLICY "Workspace readable by members" ON workspaces
  FOR SELECT USING (auth.uid() = owner_id OR public.is_workspace_member(id));
CREATE POLICY "Authenticated users create own workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Workspace owner updates" ON workspaces
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Workspace owner deletes" ON workspaces
  FOR DELETE USING (auth.uid() = owner_id);

-- Memberships: members see roster; owner/admin manage; anyone may leave.
CREATE POLICY "Members view roster" ON memberships
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Owner or admin adds members" ON memberships
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
    OR public.workspace_user_role(workspace_id) IN ('owner', 'admin')
  );
CREATE POLICY "Owner or admin changes roles" ON memberships
  FOR UPDATE USING (public.workspace_user_role(workspace_id) IN ('owner', 'admin'))
  WITH CHECK (public.workspace_user_role(workspace_id) IN ('owner', 'admin'));
CREATE POLICY "Owner admin removes, member leaves" ON memberships
  FOR DELETE USING (
    auth.uid() = user_id
    OR public.workspace_user_role(workspace_id) IN ('owner', 'admin')
  );

-- Trusted devices: strictly self-managed.
CREATE POLICY "Users manage own devices - select" ON trusted_devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own devices - insert" ON trusted_devices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own devices - update" ON trusted_devices FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own devices - delete" ON trusted_devices FOR DELETE USING (auth.uid() = user_id);

-- Security events: owner reads + appends; immutable (no update/delete).
CREATE POLICY "Users read own security events" ON security_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users append own security events" ON security_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Workspace activity: own rows + workspace owner/admin overview. Never auth.
CREATE POLICY "Activity visible to self and workspace admins" ON workspace_activity
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.workspace_user_role(workspace_id) IN ('owner', 'admin')
  );
CREATE POLICY "Users record own activity" ON workspace_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own activity" ON workspace_activity
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 11. Avatar storage (public read; strictly own-folder writes)
-- ------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
