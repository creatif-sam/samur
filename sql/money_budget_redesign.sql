-- Redesign the money budgeting schema around one global budget period
-- with category allocations stored beneath it.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_money_budget_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS money_budget_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('week', 'month')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_budget NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_budget >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT money_budget_periods_user_scope_start_key UNIQUE (user_id, scope, period_start),
  CONSTRAINT money_budget_periods_date_order CHECK (period_end > period_start)
);

CREATE TABLE IF NOT EXISTS money_budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_period_id UUID NOT NULL REFERENCES money_budget_periods(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES money_categories(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT money_budget_allocations_period_category_key UNIQUE (budget_period_id, category_id)
);

CREATE TABLE IF NOT EXISTS money_budget_threshold_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_period_id UUID NOT NULL REFERENCES money_budget_periods(id) ON DELETE CASCADE,
  threshold_percent INTEGER NOT NULL CHECK (threshold_percent IN (50, 75, 90, 95)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT money_budget_threshold_alerts_period_threshold_key UNIQUE (budget_period_id, threshold_percent)
);

CREATE INDEX IF NOT EXISTS idx_money_budget_periods_user_scope_start
  ON money_budget_periods(user_id, scope, period_start);

CREATE INDEX IF NOT EXISTS idx_money_budget_allocations_user_budget
  ON money_budget_allocations(user_id, budget_period_id);

CREATE INDEX IF NOT EXISTS idx_money_budget_allocations_category
  ON money_budget_allocations(category_id);

CREATE INDEX IF NOT EXISTS idx_money_budget_threshold_alerts_user_budget
  ON money_budget_threshold_alerts(user_id, budget_period_id);

DROP TRIGGER IF EXISTS trigger_money_budget_periods_updated_at ON money_budget_periods;
CREATE TRIGGER trigger_money_budget_periods_updated_at
  BEFORE UPDATE ON money_budget_periods
  FOR EACH ROW
  EXECUTE FUNCTION set_money_budget_updated_at();

DROP TRIGGER IF EXISTS trigger_money_budget_allocations_updated_at ON money_budget_allocations;
CREATE TRIGGER trigger_money_budget_allocations_updated_at
  BEFORE UPDATE ON money_budget_allocations
  FOR EACH ROW
  EXECUTE FUNCTION set_money_budget_updated_at();

ALTER TABLE money_budget_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_budget_threshold_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own money budget periods" ON money_budget_periods;
CREATE POLICY "Users can view their own money budget periods"
  ON money_budget_periods
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own money budget periods" ON money_budget_periods;
CREATE POLICY "Users can create their own money budget periods"
  ON money_budget_periods
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own money budget periods" ON money_budget_periods;
CREATE POLICY "Users can update their own money budget periods"
  ON money_budget_periods
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own money budget periods" ON money_budget_periods;
CREATE POLICY "Users can delete their own money budget periods"
  ON money_budget_periods
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own money budget allocations" ON money_budget_allocations;
CREATE POLICY "Users can view their own money budget allocations"
  ON money_budget_allocations
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own money budget allocations" ON money_budget_allocations;
CREATE POLICY "Users can create their own money budget allocations"
  ON money_budget_allocations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own money budget allocations" ON money_budget_allocations;
CREATE POLICY "Users can update their own money budget allocations"
  ON money_budget_allocations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own money budget allocations" ON money_budget_allocations;
CREATE POLICY "Users can delete their own money budget allocations"
  ON money_budget_allocations
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own money budget threshold alerts" ON money_budget_threshold_alerts;
CREATE POLICY "Users can view their own money budget threshold alerts"
  ON money_budget_threshold_alerts
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own money budget threshold alerts" ON money_budget_threshold_alerts;
CREATE POLICY "Users can create their own money budget threshold alerts"
  ON money_budget_threshold_alerts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own money budget threshold alerts" ON money_budget_threshold_alerts;
CREATE POLICY "Users can delete their own money budget threshold alerts"
  ON money_budget_threshold_alerts
  FOR DELETE
  USING (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'money_budgets'
  ) THEN
    INSERT INTO money_budget_periods (
      user_id,
      scope,
      period_start,
      period_end,
      total_budget
    )
    SELECT
      mb.user_id,
      mb.scope,
      mb.period_start,
      CASE
        WHEN mb.scope = 'week' THEN mb.period_start + INTERVAL '7 days'
        ELSE (mb.period_start + INTERVAL '1 month')
      END::date,
      COALESCE(mb.amount, 0)
    FROM money_budgets mb
    ON CONFLICT (user_id, scope, period_start)
    DO UPDATE SET
      period_end = EXCLUDED.period_end,
      total_budget = EXCLUDED.total_budget,
      updated_at = now();
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'money_category_budgets'
  ) THEN
    INSERT INTO money_budget_allocations (
      user_id,
      budget_period_id,
      category_id,
      amount
    )
    SELECT
      mcb.user_id,
      mbp.id,
      mcb.category_id,
      COALESCE(mcb.amount, 0)
    FROM money_category_budgets mcb
    JOIN money_budget_periods mbp
      ON mbp.user_id = mcb.user_id
     AND mbp.scope = mcb.scope
     AND mbp.period_start = mcb.period_start
    ON CONFLICT (budget_period_id, category_id)
    DO UPDATE SET
      amount = EXCLUDED.amount,
      updated_at = now();
  END IF;
END $$;

DROP TABLE IF EXISTS money_category_budgets;
DROP TABLE IF EXISTS money_budgets;