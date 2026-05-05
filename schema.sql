-- ══════════════════════════════════════════════════════════════════
--  AXIION স্টক ম্যানেজমেন্ট — Supabase Schema V5
--  Miron Electronics
--
--  HOW TO USE:
--  ┌─ Fresh install  → Run this entire file as-is.
--  └─ Existing DB    → Run the MIGRATION block at the bottom.
--
--  All CREATE statements use IF NOT EXISTS — safe to re-run.
-- ══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Products ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  sku              TEXT NOT NULL,
  case_size        INTEGER DEFAULT 1,
  purchase_price   NUMERIC(12,2) DEFAULT 0,
  selling_price    NUMERIC(12,2) DEFAULT 0,
  bonus_free_units NUMERIC(10,2) DEFAULT 0,   -- free units per N cases
  bonus_cases_req  NUMERIC(10,2) DEFAULT 1,   -- cases required to earn bonus
  bonus_free_money NUMERIC(10,2) DEFAULT 0,   -- free money (৳) per N cases
  low_stock_alert  NUMERIC(10,2) DEFAULT 0,   -- alert threshold in pcs (0 = off)
  thumb            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── SRs (Sales Representatives) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS srs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  phone      TEXT DEFAULT '',
  area       TEXT DEFAULT '',
  role       TEXT DEFAULT 'dsr' CHECK (role IN ('dsr','so')),
  thumb      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Transactions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id          UUID NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('give','return','damage','buy')),
  sr_id          TEXT DEFAULT '',
  sr_name        TEXT DEFAULT '',
  date           DATE NOT NULL,
  slip_no        TEXT DEFAULT '',
  product_id     TEXT NOT NULL,
  product_name   TEXT DEFAULT '',
  sku            TEXT DEFAULT '',
  cases          NUMERIC(10,2) DEFAULT 0,
  pcs            NUMERIC(10,2) DEFAULT 0,
  total_units    NUMERIC(12,2) DEFAULT 0,
  purchase_price NUMERIC(12,2) DEFAULT 0,
  selling_price  NUMERIC(12,2) DEFAULT 0,
  total_cost     NUMERIC(14,2) DEFAULT 0,
  total_revenue  NUMERIC(14,2) DEFAULT 0,
  note           TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_type   ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_tx_date   ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_sr_id  ON transactions(sr_id);

-- ── Damage Claims ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dmg_claims (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id          TEXT DEFAULT '',
  product_id     TEXT NOT NULL,
  product_name   TEXT DEFAULT '',
  sku            TEXT DEFAULT '',
  total_units    NUMERIC(12,2) DEFAULT 0,
  purchase_price NUMERIC(12,2) DEFAULT 0,
  total_cost     NUMERIC(14,2) DEFAULT 0,
  date           DATE,
  sr_id          TEXT DEFAULT '',
  sr_name        TEXT DEFAULT '',
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','cleared')),
  cleared_date   DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dmg_product ON dmg_claims(product_id);
CREATE INDEX IF NOT EXISTS idx_dmg_status  ON dmg_claims(status);

-- ── Bonus Records ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bonus (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    TEXT NOT NULL,
  product_name  TEXT DEFAULT '',
  sku           TEXT DEFAULT '',
  from_date     DATE,
  to_date       DATE,
  given_units   NUMERIC(12,2) DEFAULT 0,
  bonus_amount  NUMERIC(14,2) DEFAULT 0,
  status        TEXT DEFAULT 'cleared',
  cleared_date  DATE,
  note          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── SR Payments ───────────────────────────────────────────────────
--   amount = total; broken down into 4 types below
CREATE TABLE IF NOT EXISTS sr_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_id          TEXT NOT NULL,
  sr_name        TEXT DEFAULT '',
  date           DATE NOT NULL,
  amount         NUMERIC(14,2) DEFAULT 0,   -- total (sum of 4 types)
  cash_amount    NUMERIC(14,2) DEFAULT 0,   -- নগদ
  commission_amt NUMERIC(14,2) DEFAULT 0,   -- কমিশন
  discount_amt   NUMERIC(14,2) DEFAULT 0,   -- ছাড়
  damage_amt     NUMERIC(14,2) DEFAULT 0,   -- ড্যামেজ
  note           TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pay_sr   ON sr_payments(sr_id);
CREATE INDEX IF NOT EXISTS idx_pay_date ON sr_payments(date);

-- ── Expense Categories ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exp_cats (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Expense Records ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exp_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   TEXT NOT NULL,
  category_name TEXT DEFAULT '',
  date          DATE NOT NULL,
  amount        NUMERIC(14,2) DEFAULT 0,
  note          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exp_date ON exp_records(date);

-- ── Due Calendar ──────────────────────────────────────────────────
--   Supports partial (instalment) payments.
--   status: pending → partial → cleared
CREATE TABLE IF NOT EXISTS due_calendar (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dsr_id       TEXT DEFAULT '',
  dsr_name     TEXT DEFAULT '',
  due_date     DATE NOT NULL,
  amount       NUMERIC(14,2) DEFAULT 0,     -- original total due
  paid_amount  NUMERIC(14,2) DEFAULT 0,     -- cumulative amount paid so far
  note         TEXT DEFAULT '',
  status       TEXT DEFAULT 'pending'
                 CHECK (status IN ('pending','partial','cleared')),
  cleared_date DATE,                         -- set when status = cleared
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_due_date   ON due_calendar(due_date);
CREATE INDEX IF NOT EXISTS idx_due_status ON due_calendar(status);

-- ── Disable RLS (private app — server-side service key only) ──────
ALTER TABLE products     DISABLE ROW LEVEL SECURITY;
ALTER TABLE srs          DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE dmg_claims   DISABLE ROW LEVEL SECURITY;
ALTER TABLE bonus        DISABLE ROW LEVEL SECURITY;
ALTER TABLE sr_payments  DISABLE ROW LEVEL SECURITY;
ALTER TABLE exp_cats     DISABLE ROW LEVEL SECURITY;
ALTER TABLE exp_records  DISABLE ROW LEVEL SECURITY;
ALTER TABLE due_calendar DISABLE ROW LEVEL SECURITY;


-- ══════════════════════════════════════════════════════════════════
--  MIGRATION — existing database only (skip for fresh installs)
--  Safe to run: every statement is guarded with IF NOT EXISTS / IF EXISTS.
--  Just paste and run the whole block in Supabase SQL editor.
-- ══════════════════════════════════════════════════════════════════

-- Products: bonus money + low-stock alert columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS bonus_free_money NUMERIC(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_alert  NUMERIC(10,2) DEFAULT 0;

-- SRs: role column
ALTER TABLE srs ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'dsr';

-- SR Payments: 4-type breakdown columns
ALTER TABLE sr_payments ADD COLUMN IF NOT EXISTS cash_amount    NUMERIC(14,2) DEFAULT 0;
ALTER TABLE sr_payments ADD COLUMN IF NOT EXISTS commission_amt NUMERIC(14,2) DEFAULT 0;
ALTER TABLE sr_payments ADD COLUMN IF NOT EXISTS discount_amt   NUMERIC(14,2) DEFAULT 0;
ALTER TABLE sr_payments ADD COLUMN IF NOT EXISTS damage_amt     NUMERIC(14,2) DEFAULT 0;

-- Due Calendar: create table if it didn't exist yet
CREATE TABLE IF NOT EXISTS due_calendar (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dsr_id       TEXT DEFAULT '',
  dsr_name     TEXT DEFAULT '',
  due_date     DATE NOT NULL,
  amount       NUMERIC(14,2) DEFAULT 0,
  paid_amount  NUMERIC(14,2) DEFAULT 0,
  note         TEXT DEFAULT '',
  status       TEXT DEFAULT 'pending',
  cleared_date DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE due_calendar DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_due_date   ON due_calendar(due_date);
CREATE INDEX IF NOT EXISTS idx_due_status ON due_calendar(status);

-- Due Calendar: paid_amount column (V5)
ALTER TABLE due_calendar ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14,2) DEFAULT 0;

-- Due Calendar: update status constraint to allow 'partial' (V5)
ALTER TABLE due_calendar DROP CONSTRAINT IF EXISTS due_calendar_status_check;
ALTER TABLE due_calendar ADD CONSTRAINT due_calendar_status_check
  CHECK (status IN ('pending','partial','cleared'));
