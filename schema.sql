-- ══════════════════════════════════════════════════════════════════
--  AXIION স্টক ম্যানেজমেন্ট — Supabase Schema V8
--  Miron Electronics
--
--  Fresh install — paste the entire file in Supabase SQL Editor
--  and click Run. Nothing else needed.
-- ══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Products ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  sku              TEXT NOT NULL,
  case_size        INTEGER DEFAULT 1,
  unit_type        TEXT DEFAULT 'কেস',        -- কেস | ডজন | কার্টুন | পলি
  purchase_price   NUMERIC(12,2) DEFAULT 0,
  selling_price    NUMERIC(12,2) DEFAULT 0,
  bonus_free_units NUMERIC(10,2) DEFAULT 0,
  bonus_cases_req  NUMERIC(10,2) DEFAULT 1,
  bonus_free_money NUMERIC(10,2) DEFAULT 0,
  low_stock_alert  NUMERIC(10,2) DEFAULT 0,   -- 0 = off
  thumb            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── SRs / DSRs ────────────────────────────────────────────────────
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
  type           TEXT NOT NULL CHECK (type IN (
                   'give', 'return', 'damage', 'buy',
                   'point_sale', 'point_damage_return'
                 )),
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
CREATE INDEX IF NOT EXISTS idx_tx_type  ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_tx_date  ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_sr_id ON transactions(sr_id);

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
CREATE TABLE IF NOT EXISTS sr_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_id          TEXT NOT NULL,
  sr_name        TEXT DEFAULT '',
  date           DATE NOT NULL,
  amount         NUMERIC(14,2) DEFAULT 0,   -- total (sum of 4 below)
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
--   client_type: 'dsr' = linked SR/DSR  |  'custom' = free-text customer
--   shop_name:   optional store name, shown only in detail view
--   status:      pending → partial → cleared
CREATE TABLE IF NOT EXISTS due_calendar (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dsr_id       TEXT DEFAULT '',
  dsr_name     TEXT DEFAULT '',
  client_type  TEXT DEFAULT 'dsr',
  shop_name    TEXT DEFAULT '',
  due_date     DATE NOT NULL,
  amount       NUMERIC(14,2) DEFAULT 0,
  paid_amount  NUMERIC(14,2) DEFAULT 0,
  note         TEXT DEFAULT '',
  status       TEXT DEFAULT 'pending'
                 CHECK (status IN ('pending','partial','cleared')),
  cleared_date DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_due_date   ON due_calendar(due_date);
CREATE INDEX IF NOT EXISTS idx_due_status ON due_calendar(status);

-- ── User Passwords ────────────────────────────────────────────────
--   user_key: 'owner' | 'manager' | <srs.id>
--   role:     'owner' | 'manager' | 'so' | 'dsr'
--   Each password MUST be globally unique — role is auto-detected from it.
CREATE TABLE IF NOT EXISTS user_passwords (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key   TEXT NOT NULL UNIQUE,
  user_name  TEXT DEFAULT '',
  role       TEXT NOT NULL CHECK (role IN ('owner','manager','so','dsr')),
  password   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_up_password ON user_passwords(password);

-- Seed owner with initial password 1234 (owner must change on first login)
INSERT INTO user_passwords (user_key, user_name, role, password)
VALUES ('owner', 'Owner', 'owner', '1234')
ON CONFLICT (user_key) DO NOTHING;

-- ── Disable RLS ───────────────────────────────────────────────────
ALTER TABLE products       DISABLE ROW LEVEL SECURITY;
ALTER TABLE srs            DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions   DISABLE ROW LEVEL SECURITY;
ALTER TABLE dmg_claims     DISABLE ROW LEVEL SECURITY;
ALTER TABLE bonus          DISABLE ROW LEVEL SECURITY;
ALTER TABLE sr_payments    DISABLE ROW LEVEL SECURITY;
ALTER TABLE exp_cats       DISABLE ROW LEVEL SECURITY;
ALTER TABLE exp_records    DISABLE ROW LEVEL SECURITY;
ALTER TABLE due_calendar   DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_passwords DISABLE ROW LEVEL SECURITY;
