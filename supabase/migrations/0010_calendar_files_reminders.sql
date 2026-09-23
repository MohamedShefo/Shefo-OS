-- ==============================================================================
-- SHEFO OS PHASE 7 COMPLETION — calendar, attachments, task reminders
-- ==============================================================================
-- New tables only (+ one additive nullable column on tasks).
-- Calendar events and attachment records are user-owned with the standard
-- ownership contract. Attachment bytes live in a private Storage bucket with
-- strictly own-folder policies. No automation, no external services.
-- ------------------------------------------------------------------------------

-- ------------------------------------------------------------------------------
-- 1. Calendar events (internal only, no external sync)
-- ------------------------------------------------------------------------------

CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NULL,
    is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_calendar_events_user_start
  ON calendar_events(user_id, starts_at)
  WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------------------
-- 2. Attachment records (bytes in Storage; rows reference entity + path)
-- ------------------------------------------------------------------------------

CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_attachment_entity CHECK (entity_type IN ('project', 'note', 'task', 'capture'))
);

CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX idx_attachments_user_id ON attachments(user_id);

-- ------------------------------------------------------------------------------
-- 3. Optional task reminder timestamp (materialized lazily, no cron)
-- ------------------------------------------------------------------------------

ALTER TABLE tasks
  ADD COLUMN reminder_at TIMESTAMPTZ NULL;

CREATE INDEX idx_tasks_reminder
  ON tasks(user_id, reminder_at)
  WHERE reminder_at IS NOT NULL AND deleted_at IS NULL;

-- ------------------------------------------------------------------------------
-- 4. updated_at triggers
-- ------------------------------------------------------------------------------

CREATE TRIGGER set_calendar_events_updated_at
BEFORE UPDATE ON calendar_events
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 5. RLS (same ownership contract)
-- ------------------------------------------------------------------------------

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can SELECT their own calendar_events" ON calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own calendar_events" ON calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own calendar_events" ON calendar_events FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own calendar_events" ON calendar_events FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can SELECT their own attachments" ON attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own attachments" ON attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own attachments" ON attachments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own attachments" ON attachments FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. Private attachments bucket (authenticated reads; strictly own-folder writes)
-- ------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users upload own attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own attachments" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
