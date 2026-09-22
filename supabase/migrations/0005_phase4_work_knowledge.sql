-- ==============================================================================
-- SHEFO OS PHASE 4 — Work/Experience + Knowledge foundation
-- ==============================================================================
-- New tables only. No existing table is altered except for two additive
-- nullable link columns (notes.work_experience_id, projects.work_experience_id)
-- and one nullable note_type column. No data is touched. Every new table is
-- user-owned (user_id + RLS) and soft-deletable where it represents a
-- long-lived entity. Junction rows and completions/blocks are hard-deleted
-- with their parents (they carry no independent lifecycle / Trash state).
-- ------------------------------------------------------------------------------

-- ------------------------------------------------------------------------------
-- 1. Work experiences (generic; any workplace, incl. historical ones)
-- ------------------------------------------------------------------------------

CREATE TABLE work_experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization TEXT NOT NULL,
    role TEXT NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT NULL,
    responsibilities TEXT NULL,
    key_people TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- ------------------------------------------------------------------------------
-- 2. Skills (lightweight, extensible; no grading/certification model)
-- ------------------------------------------------------------------------------

CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NULL,
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- ------------------------------------------------------------------------------
-- 3. Daily journal (one entry per day, text-first)
-- ------------------------------------------------------------------------------

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    title TEXT NULL,
    content TEXT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- One live entry per user per day.
CREATE UNIQUE INDEX uq_journal_user_date
  ON journal_entries(user_id, entry_date)
  WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------------------
-- 4. Habits (manual tracking) + daily completions
-- ------------------------------------------------------------------------------

CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NULL,
    frequency TEXT NOT NULL DEFAULT 'daily',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE habit_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    completion_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_habit_day UNIQUE (habit_id, completion_date)
);

-- ------------------------------------------------------------------------------
-- 5. Note blocks (ordered, stable identity; note.content stays as fallback)
-- ------------------------------------------------------------------------------

CREATE TABLE note_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL DEFAULT 'text',
    content TEXT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_note_blocks_note_position ON note_blocks(note_id, position);

-- ------------------------------------------------------------------------------
-- 6. Manual link junctions (directed note links; skill links)
-- ------------------------------------------------------------------------------

CREATE TABLE note_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    to_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_note_link UNIQUE (from_note_id, to_note_id),
    CONSTRAINT chk_note_link_not_self CHECK (from_note_id <> to_note_id)
);

CREATE INDEX idx_note_links_from ON note_links(from_note_id);
CREATE INDEX idx_note_links_to ON note_links(to_note_id);

CREATE TABLE work_experience_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    work_experience_id UUID NOT NULL REFERENCES work_experiences(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_work_skill UNIQUE (work_experience_id, skill_id)
);

CREATE INDEX idx_work_skills_work ON work_experience_skills(work_experience_id);
CREATE INDEX idx_work_skills_skill ON work_experience_skills(skill_id);

CREATE TABLE note_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_note_skill UNIQUE (note_id, skill_id)
);

CREATE INDEX idx_note_skills_note ON note_skills(note_id);
CREATE INDEX idx_note_skills_skill ON note_skills(skill_id);

-- ------------------------------------------------------------------------------
-- 7. Additive link/type columns on existing tables (nullable, SET NULL)
-- ------------------------------------------------------------------------------

ALTER TABLE notes
  ADD COLUMN work_experience_id UUID NULL REFERENCES work_experiences(id) ON DELETE SET NULL;
ALTER TABLE notes
  ADD COLUMN note_type TEXT NULL;

ALTER TABLE projects
  ADD COLUMN work_experience_id UUID NULL REFERENCES work_experiences(id) ON DELETE SET NULL;

CREATE INDEX idx_notes_work_experience_id ON notes(work_experience_id);
CREATE INDEX idx_projects_work_experience_id ON projects(work_experience_id);

-- ------------------------------------------------------------------------------
-- 8. updated_at triggers for the new long-lived tables
-- ------------------------------------------------------------------------------

CREATE TRIGGER set_work_experiences_updated_at
BEFORE UPDATE ON work_experiences
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_skills_updated_at
BEFORE UPDATE ON skills
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_journal_entries_updated_at
BEFORE UPDATE ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_habits_updated_at
BEFORE UPDATE ON habits
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_note_blocks_updated_at
BEFORE UPDATE ON note_blocks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 9. User isolation indexes
-- ------------------------------------------------------------------------------

CREATE INDEX idx_work_experiences_user_id ON work_experiences(user_id);
CREATE INDEX idx_skills_user_id ON skills(user_id);
CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habit_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX idx_habit_completions_user_id ON habit_completions(user_id);
CREATE INDEX idx_note_blocks_user_id ON note_blocks(user_id);

-- ------------------------------------------------------------------------------
-- 10. Row Level Security (same ownership contract as the core tables)
-- ------------------------------------------------------------------------------

ALTER TABLE work_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_experience_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can SELECT their own work_experiences" ON work_experiences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own work_experiences" ON work_experiences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own work_experiences" ON work_experiences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own work_experiences" ON work_experiences FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can SELECT their own skills" ON skills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own skills" ON skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own skills" ON skills FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own skills" ON skills FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can SELECT their own journal_entries" ON journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own journal_entries" ON journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own journal_entries" ON journal_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own journal_entries" ON journal_entries FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can SELECT their own habits" ON habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own habits" ON habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own habits" ON habits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own habits" ON habits FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can SELECT their own habit_completions" ON habit_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own habit_completions" ON habit_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own habit_completions" ON habit_completions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own habit_completions" ON habit_completions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can SELECT their own note_blocks" ON note_blocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own note_blocks" ON note_blocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own note_blocks" ON note_blocks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own note_blocks" ON note_blocks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can SELECT their own note_links" ON note_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own note_links" ON note_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own note_links" ON note_links FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own note_links" ON note_links FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can SELECT their own work_experience_skills" ON work_experience_skills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own work_experience_skills" ON work_experience_skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own work_experience_skills" ON work_experience_skills FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own work_experience_skills" ON work_experience_skills FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can SELECT their own note_skills" ON note_skills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own note_skills" ON note_skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own note_skills" ON note_skills FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own note_skills" ON note_skills FOR DELETE USING (auth.uid() = user_id);
