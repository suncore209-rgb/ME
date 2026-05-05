-- ══════════════════════════════════════════════════════════
--  AXIION স্টক ম্যানেজমেন্ট — Supabase Schema V4
--  Run the full CREATE section for new installs.
--  For existing installs, run only the ALTER section below.
-- ══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Products ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  sku              TEXT NOT NULL,
  case_size        INTEGER DEFAULT 1,
  purchase_price   NUMERIC(12,2) DEFAULT 0,
  selling_price    NUMERIC(12,2) DEFAULT 0,
  bonus_free_units NUMERIC(10,2) DEFAULT 0,
  bonus_cases_req  NUMERIC(10,2) DEFAULT 1,
  bonus_free_money NUMERIC(10,2) DEFAULT 0,   -- V4: free money (৳) per N cases
  low_stock_alert  NUMERIC(10,2) DEFAULT 0,   -- V4: alert threshold in pcs (0=off)
  thumb            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── SRs (Sales Representatives) ───────────────────────────
CREATE TABLE IF NOT EXISTS srs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  phone      TEXT DEFAULT '',
  area       TEXT DEFAULT '',
  role       TEXT DEFAULT 'dsr' CHECK (role IN ('dsr','so')),  -- V4: DSR or SO
  thumb      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Transactions ──────────────────────────────────────────
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

-- ── Damage Claims ─────────────────────────────────────────
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

-- ── Bonus Records ─────────────────────────────────────────
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

-- ── SR Payments (V4: 4-type breakdown) ────────────────────
CREATE TABLE IF NOT EXISTS sr_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_id          TEXT NOT NULL,
  sr_name        TEXT DEFAULT '',
  date           DATE NOT NULL,
  amount         NUMERIC(14,2) DEFAULT 0,  -- total = sum of all 4 types
  cash_amount    NUMERIC(14,2) DEFAULT 0,  -- নগদ
  commission_amt NUMERIC(14,2) DEFAULT 0,  -- কমিশন
  discount_amt   NUMERIC(14,2) DEFAULT 0,  -- ছাড়
  damage_amt     NUMERIC(14,2) DEFAULT 0,  -- ড্যামেজ (V4 new)
  note           TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pay_sr   ON sr_payments(sr_id);
CREATE INDEX IF NOT EXISTS idx_pay_date ON sr_payments(date);

-- ── Expense Categories ────────────────────────────────────
CREATE TABLE IF NOT EXISTS exp_cats (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Expense Records ───────────────────────────────────────
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

-- ── Due Calendar ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS due_calendar (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dsr_id       TEXT DEFAULT '',
  dsr_name     TEXT DEFAULT '',
  due_date     DATE NOT NULL,
  amount       NUMERIC(14,2) DEFAULT 0,
  note         TEXT DEFAULT '',
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','cleared')),
  cleared_date DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Disable RLS (private app — service key server-side) ───
ALTER TABLE products     DISABLE ROW LEVEL SECURITY;
ALTER TABLE srs          DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE dmg_claims   DISABLE ROW LEVEL SECURITY;
ALTER TABLE bonus        DISABLE ROW LEVEL SECURITY;
ALTER TABLE sr_payments  DISABLE ROW LEVEL SECURITY;
ALTER TABLE exp_cats     DISABLE ROW LEVEL SECURITY;
ALTER TABLE exp_records  DISABLE ROW LEVEL SECURITY;
ALTER TABLE due_calendar DISABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════
--  MIGRATION — Run this if upgrading from V3 to V4
-- ════════════════════════════════════════════════════════
-- ALTER TABLE products    ADD COLUMN IF NOT EXISTS bonus_free_money NUMERIC(10,2) DEFAULT 0;
-- ALTER TABLE products    ADD COLUMN IF NOT EXISTS low_stock_alert  NUMERIC(10,2) DEFAULT 0;
-- ALTER TABLE srs         ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'dsr';
-- ALTER TABLE sr_payments ADD COLUMN IF NOT EXISTS cash_amount    NUMERIC(14,2) DEFAULT 0;
-- ALTER TABLE sr_payments ADD COLUMN IF NOT EXISTS commission_amt NUMERIC(14,2) DEFAULT 0;
-- ALTER TABLE sr_payments ADD COLUMN IF NOT EXISTS discount_amt   NUMERIC(14,2) DEFAULT 0;
-- ALTER TABLE sr_payments ADD COLUMN IF NOT EXISTS damage_amt     NUMERIC(14,2) DEFAULT 0;
-- CREATE TABLE IF NOT EXISTS due_calendar (...); -- see full definition above
