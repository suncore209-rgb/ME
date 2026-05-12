-- ══════════════════════════════════════════════════════════════════
--  Miron Electronics — Full Schema (v9)
--  Safe to run on a fresh Supabase project OR an existing one.
--  All statements use IF NOT EXISTS / ON CONFLICT DO NOTHING.
--  No existing data is deleted or reset.
-- ══════════════════════════════════════════════════════════════════

-- ── 1. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT        NOT NULL DEFAULT '',
  sku            TEXT        NOT NULL DEFAULT '',
  case_size      INTEGER     NOT NULL DEFAULT 1,
  unit_type      TEXT        NOT NULL DEFAULT 'কেস',
  purchase_price NUMERIC     NOT NULL DEFAULT 0,
  selling_price  NUMERIC     NOT NULL DEFAULT 0,
  bonus_free_units INTEGER   NOT NULL DEFAULT 0,
  bonus_cases_req  INTEGER   NOT NULL DEFAULT 1,
  bonus_free_money NUMERIC   NOT NULL DEFAULT 0,
  low_stock_alert  INTEGER   NOT NULL DEFAULT 0,
  thumb          TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. SRS  (DSR / SO — sales reps)
CREATE TABLE IF NOT EXISTS srs (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT        NOT NULL DEFAULT '',
  phone      TEXT        NOT NULL DEFAULT '',
  area       TEXT        NOT NULL DEFAULT '',
  role       TEXT        NOT NULL DEFAULT 'dsr',   -- 'dsr' | 'so'
  thumb      TEXT        NOT NULL DEFAULT '',
  password   TEXT        NOT NULL DEFAULT '1234',  -- v9: per-user login password
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  tx_id          BIGSERIAL PRIMARY KEY,
  type           TEXT        NOT NULL DEFAULT '',
  sr_id          BIGINT      REFERENCES srs(id) ON DELETE SET NULL,
  sr_name        TEXT        NOT NULL DEFAULT '',
  date           DATE        NOT NULL DEFAULT CURRENT_DATE,
  slip_no        TEXT        NOT NULL DEFAULT '',
  product_id     BIGINT      REFERENCES products(id) ON DELETE SET NULL,
  product_name   TEXT        NOT NULL DEFAULT '',
  sku            TEXT        NOT NULL DEFAULT '',
  cases          INTEGER     NOT NULL DEFAULT 0,
  pcs            INTEGER     NOT NULL DEFAULT 0,
  total_units    INTEGER     NOT NULL DEFAULT 0,
  purchase_price NUMERIC     NOT NULL DEFAULT 0,
  selling_price  NUMERIC     NOT NULL DEFAULT 0,
  total_cost     NUMERIC     NOT NULL DEFAULT 0,
  total_revenue  NUMERIC     NOT NULL DEFAULT 0,
  note           TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. DAMAGE
CREATE TABLE IF NOT EXISTS damage (
  id             BIGSERIAL PRIMARY KEY,
  tx_id          BIGINT,
  product_id     BIGINT      REFERENCES products(id) ON DELETE SET NULL,
  product_name   TEXT        NOT NULL DEFAULT '',
  sku            TEXT        NOT NULL DEFAULT '',
  total_units    INTEGER     NOT NULL DEFAULT 0,
  purchase_price NUMERIC     NOT NULL DEFAULT 0,
  total_cost     NUMERIC     NOT NULL DEFAULT 0,
  date           DATE        NOT NULL DEFAULT CURRENT_DATE,
  sr_id          BIGINT      REFERENCES srs(id) ON DELETE SET NULL,
  sr_name        TEXT        NOT NULL DEFAULT '',
  status         TEXT        NOT NULL DEFAULT 'pending',  -- 'pending' | 'cleared'
  cleared_date   DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. BONUS
CREATE TABLE IF NOT EXISTS bonus (
  id             BIGSERIAL PRIMARY KEY,
  product_id     BIGINT      REFERENCES products(id) ON DELETE SET NULL,
  product_name   TEXT        NOT NULL DEFAULT '',
  sku            TEXT        NOT NULL DEFAULT '',
  from_date      DATE,
  to_date        DATE,
  given_units    INTEGER     NOT NULL DEFAULT 0,
  bonus_amount   NUMERIC     NOT NULL DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'pending',  -- 'pending' | 'cleared'
  cleared_date   DATE,
  note           TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. SR_PAYMENTS  (DSR/SO payment records)
CREATE TABLE IF NOT EXISTS sr_payments (
  id             BIGSERIAL PRIMARY KEY,
  sr_id          BIGINT      REFERENCES srs(id) ON DELETE SET NULL,
  sr_name        TEXT        NOT NULL DEFAULT '',
  date           DATE        NOT NULL DEFAULT CURRENT_DATE,
  amount         NUMERIC     NOT NULL DEFAULT 0,
  cash_amount    NUMERIC     NOT NULL DEFAULT 0,
  commission_amt NUMERIC     NOT NULL DEFAULT 0,
  discount_amt   NUMERIC     NOT NULL DEFAULT 0,
  damage_amt     NUMERIC     NOT NULL DEFAULT 0,
  note           TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. EXPENSE_CATEGORIES
CREATE TABLE IF NOT EXISTS expense_categories (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 8. EXPENSE_RECORDS
CREATE TABLE IF NOT EXISTS expense_records (
  id            BIGSERIAL PRIMARY KEY,
  category_id   BIGINT      REFERENCES expense_categories(id) ON DELETE SET NULL,
  category_name TEXT        NOT NULL DEFAULT '',
  date          DATE        NOT NULL DEFAULT CURRENT_DATE,
  amount        NUMERIC     NOT NULL DEFAULT 0,
  note          TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 9. DUE_CALENDAR  (বাকি / due tracking)
CREATE TABLE IF NOT EXISTS due_calendar (
  id           BIGSERIAL PRIMARY KEY,
  dsr_id       BIGINT      REFERENCES srs(id) ON DELETE SET NULL,
  dsr_name     TEXT        NOT NULL DEFAULT '',
  client_type  TEXT        NOT NULL DEFAULT 'dsr',  -- 'dsr' | 'shop'
  shop_name    TEXT        NOT NULL DEFAULT '',
  due_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  amount       NUMERIC     NOT NULL DEFAULT 0,
  paid_amount  NUMERIC     NOT NULL DEFAULT 0,
  note         TEXT        NOT NULL DEFAULT '',
  status       TEXT        NOT NULL DEFAULT 'pending',  -- 'pending' | 'paid'
  cleared_date DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 10. APP_CONFIG  (v9: owner & manager passwords)
CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Default passwords (only inserted if not already set)
INSERT INTO app_config (key, value) VALUES ('owner_password',   'owner123')   ON CONFLICT (key) DO NOTHING;
INSERT INTO app_config (key, value) VALUES ('manager_password', 'manager123') ON CONFLICT (key) DO NOTHING;

-- ── Safe column additions for existing installs upgrading from v8
ALTER TABLE srs ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '1234';

-- ── Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_transactions_sr_id     ON transactions(sr_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date       ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_damage_sr_id            ON damage(sr_id);
CREATE INDEX IF NOT EXISTS idx_sr_payments_sr_id       ON sr_payments(sr_id);
CREATE INDEX IF NOT EXISTS idx_due_calendar_dsr_id     ON due_calendar(dsr_id);
CREATE INDEX IF NOT EXISTS idx_due_calendar_due_date   ON due_calendar(due_date);
