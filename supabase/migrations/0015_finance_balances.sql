-- ==============================================================================
-- Finance: persistent Available / Frozen balances (separate from monthly
-- income/expense). One row per user, same ownership/RLS contract as
-- finance_transactions. No existing data is touched.
-- ------------------------------------------------------------------------------

CREATE TABLE finance_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    available NUMERIC NOT NULL DEFAULT 0,
    frozen NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_finance_balances_updated_at
BEFORE UPDATE ON finance_balances
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_finance_balances_user_id ON finance_balances(user_id);

ALTER TABLE finance_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can SELECT their own finance_balances" ON finance_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own finance_balances" ON finance_balances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own finance_balances" ON finance_balances FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own finance_balances" ON finance_balances FOR DELETE USING (auth.uid() = user_id);
