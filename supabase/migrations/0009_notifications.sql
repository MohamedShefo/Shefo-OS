-- ==============================================================================
-- SHEFO OS PHASE 7 — notifications foundation
-- ==============================================================================
-- Minimal owner-scoped notification store for future use (reminders, shares,
-- system notices). No automation, no triggers, no external services: rows are
-- created explicitly by server code. Reads/deletes are user-scoped.
-- ------------------------------------------------------------------------------

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    body TEXT NULL,
    link_href TEXT NULL,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL AND deleted_at IS NULL;

CREATE TRIGGER set_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can SELECT their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);
