-- ══════════════════════════════════════════════════════════════
--  AXIION Due Calendar Upgrade — V5 Migration
--  Run this in your Supabase SQL editor
-- ══════════════════════════════════════════════════════════════

-- 1. Add paid_amount column to due_calendar
ALTER TABLE due_calendar
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14,2) DEFAULT 0;

-- 2. Update status CHECK to include 'partial'
--    (Supabase/Postgres: drop and recreate the constraint)
ALTER TABLE due_calendar
  DROP CONSTRAINT IF EXISTS due_calendar_status_check;

ALTER TABLE due_calendar
  ADD CONSTRAINT due_calendar_status_check
  CHECK (status IN ('pending', 'partial', 'cleared'));

-- 3. Create due_payments table for instalment history
CREATE TABLE IF NOT EXISTS due_payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  due_id      UUID NOT NULL REFERENCES due_calendar(id) ON DELETE CASCADE,
  paid_date   DATE NOT NULL,
  amount      NUMERIC(14,2) DEFAULT 0,
  note        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_due_payments_due_id ON due_payments(due_id);
CREATE INDEX IF NOT EXISTS idx_due_payments_date   ON due_payments(paid_date);

-- 4. Disable RLS
ALTER TABLE due_payments DISABLE ROW LEVEL SECURITY;

-- 5. Backfill: set paid_amount = amount for already-cleared entries
UPDATE due_calendar
  SET paid_amount = amount
  WHERE status = 'cleared' AND (paid_amount IS NULL OR paid_amount = 0);

-- Done!
