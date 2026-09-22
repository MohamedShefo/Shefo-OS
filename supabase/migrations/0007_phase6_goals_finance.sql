-- ==============================================================================
-- SHEFO OS PHASE 6 — goals, personal finance, dashboard state
-- ==============================================================================
-- New tables only (+ four additive nullable goal link columns).
-- Personal finance is strictly user-owned (NO workspace scoping — future ERP
-- finance must not mix with it). Goals link to actionable entities through
-- direct nullable FKs (no generic relation engine). Dashboard preferences are
-- a single per-user JSONB row. No data is touched.
-- ------------------------------------------------------------------------------

-- ------------------------------------------------------------------------------
-- 1. Goals (+ milestones)
-- ------------------------------------------------------------------------------

CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    start_date DATE NULL,
    target_date DATE NULL,
    target_value NUMERIC NULL,
    current_value NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT chk_goal_status CHECK (status IN ('active', 'paused', 'completed', 'archived'))
);

CREATE TABLE goal_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goal_milestones_goal_position ON goal_milestones(goal_id, position);

-- ------------------------------------------------------------------------------
-- 2. Personal finance (user-owned only; never workspace-scoped)
-- ------------------------------------------------------------------------------

CREATE TABLE finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    transaction_date DATE NOT NULL,
    category TEXT NULL,
    description TEXT NULL,
    payment_method TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT chk_finance_type CHECK (type IN ('income', 'expense'))
);

CREATE INDEX idx_finance_user_date ON finance_transactions(user_id, transaction_date DESC);

-- ------------------------------------------------------------------------------
-- 3. Dashboard state (one row per user: mode + widget config)
-- ------------------------------------------------------------------------------

CREATE TABLE dashboard_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'normal',
    widgets JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dashboard_mode CHECK (mode IN ('normal', 'focus'))
);

-- ------------------------------------------------------------------------------
-- 4. Goal links on actionable entities (nullable, SET NULL)
-- ------------------------------------------------------------------------------

ALTER TABLE projects
  ADD COLUMN goal_id UUID NULL REFERENCES goals(id) ON DELETE SET NULL;
ALTER TABLE tasks
  ADD COLUMN goal_id UUID NULL REFERENCES goals(id) ON DELETE SET NULL;
ALTER TABLE habits
  ADD COLUMN goal_id UUID NULL REFERENCES goals(id) ON DELETE SET NULL;
ALTER TABLE notes
  ADD COLUMN goal_id UUID NULL REFERENCES goals(id) ON DELETE SET NULL;

CREATE INDEX idx_projects_goal_id ON projects(goal_id);
CREATE INDEX idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX idx_habits_goal_id ON habits(goal_id);
CREATE INDEX idx_notes_goal_id ON notes(goal_id);

-- ------------------------------------------------------------------------------
-- 5. updated_at triggers + isolation indexes
-- ------------------------------------------------------------------------------

CREATE TRIGGER set_goals_updated_at
BEFORE UPDATE ON goals
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_goal_milestones_updated_at
BEFORE UPDATE ON goal_milestones
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_finance_transactions_updated_at
BEFORE UPDATE ON finance_transactions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goal_milestones_user_id ON goal_milestones(user_id);
CREATE INDEX idx_finance_transactions_user_id ON finance_transactions(user_id);

-- ------------------------------------------------------------------------------
-- 6. RLS (same ownership contract; finance strictly personal)
-- ------------------------------------------------------------------------------

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can SELECT their own goals" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own goals" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own goals" ON goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own goals" ON goals FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can SELECT their own goal_milestones" ON goal_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own goal_milestones" ON goal_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own goal_milestones" ON goal_milestones FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own goal_milestones" ON goal_milestones FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can SELECT their own finance_transactions" ON finance_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own finance_transactions" ON finance_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own finance_transactions" ON finance_transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own finance_transactions" ON finance_transactions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can SELECT their own dashboard_state" ON dashboard_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own dashboard_state" ON dashboard_state FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own dashboard_state" ON dashboard_state FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own dashboard_state" ON dashboard_state FOR DELETE USING (auth.uid() = user_id);
