-- ══════════════════════════════════════════════════════════════════
--  AXIION স্টক ম্যানেজমেন্ট — Supabase Schema V9
--  Miron Electronics
--
--  ✅ FRESH INSTALL — নতুন Supabase project এ পুরোটা paste করুন
--  ✅ পুরানো data নেই, পুরানো table নেই — সম্পূর্ণ নতুন
--  ✅ শেষে Owner এর PIN সেট আছে: 12345
--  ✅ NEW: chat_messages, important_numbers tables
--  ✅ FIX: password column এ UNIQUE constraint নেই (app-level check)
--         → এখন DSR ও SO উভয়ই সঠিকভাবে password dashboard এ দেখাবে
--
--  HOW TO RUN:
--  Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ══════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────
--  STEP 1 — পুরানো সব table মুছে ফেলো (fresh start)
-- ──────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS important_numbers  CASCADE;
DROP TABLE IF EXISTS chat_messages      CASCADE;
DROP TABLE IF EXISTS user_passwords     CASCADE;
DROP TABLE IF EXISTS due_calendar       CASCADE;
DROP TABLE IF EXISTS exp_records        CASCADE;
DROP TABLE IF EXISTS exp_cats           CASCADE;
DROP TABLE IF EXISTS sr_payments        CASCADE;
DROP TABLE IF EXISTS bonus              CASCADE;
DROP TABLE IF EXISTS dmg_claims         CASCADE;
DROP TABLE IF EXISTS transactions       CASCADE;
DROP TABLE IF EXISTS srs                CASCADE;
DROP TABLE IF EXISTS products           CASCADE;


-- ──────────────────────────────────────────────────────────────────
--  STEP 2 — Extension
-- ──────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ──────────────────────────────────────────────────────────────────
--  STEP 3 — Tables
-- ──────────────────────────────────────────────────────────────────

-- ── Products ──────────────────────────────────────────────────────
CREATE TABLE products (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT          NOT NULL,
  sku              TEXT          NOT NULL,
  case_size        INTEGER       DEFAULT 1,
  unit_type        TEXT          DEFAULT 'কেস',   -- কেস | ডজন | কার্টুন | পলি
  purchase_price   NUMERIC(12,2) DEFAULT 0,
  selling_price    NUMERIC(12,2) DEFAULT 0,
  bonus_free_units NUMERIC(10,2) DEFAULT 0,
  bonus_cases_req  NUMERIC(10,2) DEFAULT 1,
  bonus_free_money NUMERIC(10,2) DEFAULT 0,
  low_stock_alert  NUMERIC(10,2) DEFAULT 0,       -- 0 = off
  thumb            TEXT          DEFAULT '',
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);


-- ── SRs / DSRs / SOs ──────────────────────────────────────────────
CREATE TABLE srs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  phone      TEXT        DEFAULT '',
  area       TEXT        DEFAULT '',
  role       TEXT        DEFAULT 'dsr' CHECK (role IN ('dsr', 'so')),
  thumb      TEXT        DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── Transactions ──────────────────────────────────────────────────
CREATE TABLE transactions (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id          UUID          NOT NULL,
  type           TEXT          NOT NULL CHECK (type IN (
                   'give', 'return', 'damage', 'buy',
                   'point_sale', 'point_damage_return'
                 )),
  sr_id          TEXT          DEFAULT '',
  sr_name        TEXT          DEFAULT '',
  date           DATE          NOT NULL,
  slip_no        TEXT          DEFAULT '',
  product_id     TEXT          NOT NULL,
  product_name   TEXT          DEFAULT '',
  sku            TEXT          DEFAULT '',
  cases          NUMERIC(10,2) DEFAULT 0,
  pcs            NUMERIC(10,2) DEFAULT 0,
  total_units    NUMERIC(12,2) DEFAULT 0,
  purchase_price NUMERIC(12,2) DEFAULT 0,
  selling_price  NUMERIC(12,2) DEFAULT 0,
  total_cost     NUMERIC(14,2) DEFAULT 0,
  total_revenue  NUMERIC(14,2) DEFAULT 0,
  note           TEXT          DEFAULT '',
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_tx_type  ON transactions(type);
CREATE INDEX idx_tx_date  ON transactions(date);
CREATE INDEX idx_tx_sr_id ON transactions(sr_id);


-- ── Damage Claims ─────────────────────────────────────────────────
CREATE TABLE dmg_claims (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id          TEXT          DEFAULT '',
  product_id     TEXT          NOT NULL,
  product_name   TEXT          DEFAULT '',
  sku            TEXT          DEFAULT '',
  total_units    NUMERIC(12,2) DEFAULT 0,
  purchase_price NUMERIC(12,2) DEFAULT 0,
  total_cost     NUMERIC(14,2) DEFAULT 0,
  date           DATE,
  sr_id          TEXT          DEFAULT '',
  sr_name        TEXT          DEFAULT '',
  status         TEXT          DEFAULT 'pending' CHECK (status IN ('pending', 'cleared')),
  cleared_date   DATE,
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_dmg_product ON dmg_claims(product_id);
CREATE INDEX idx_dmg_status  ON dmg_claims(status);


-- ── Bonus Records ─────────────────────────────────────────────────
CREATE TABLE bonus (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    TEXT          NOT NULL,
  product_name  TEXT          DEFAULT '',
  sku           TEXT          DEFAULT '',
  from_date     DATE,
  to_date       DATE,
  given_units   NUMERIC(12,2) DEFAULT 0,
  bonus_amount  NUMERIC(14,2) DEFAULT 0,
  status        TEXT          DEFAULT 'cleared',
  cleared_date  DATE,
  note          TEXT          DEFAULT '',
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);


-- ── SR Payments ───────────────────────────────────────────────────
CREATE TABLE sr_payments (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_id          TEXT          NOT NULL,
  sr_name        TEXT          DEFAULT '',
  date           DATE          NOT NULL,
  amount         NUMERIC(14,2) DEFAULT 0,   -- মোট (নিচের ৪টার যোগফল)
  cash_amount    NUMERIC(14,2) DEFAULT 0,   -- নগদ
  commission_amt NUMERIC(14,2) DEFAULT 0,   -- কমিশন
  discount_amt   NUMERIC(14,2) DEFAULT 0,   -- ছাড়
  damage_amt     NUMERIC(14,2) DEFAULT 0,   -- ড্যামেজ
  note           TEXT          DEFAULT '',
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_pay_sr   ON sr_payments(sr_id);
CREATE INDEX idx_pay_date ON sr_payments(date);


-- ── Expense Categories ────────────────────────────────────────────
CREATE TABLE exp_cats (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── Expense Records ───────────────────────────────────────────────
CREATE TABLE exp_records (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   TEXT          NOT NULL,
  category_name TEXT          DEFAULT '',
  date          DATE          NOT NULL,
  amount        NUMERIC(14,2) DEFAULT 0,
  note          TEXT          DEFAULT '',
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_exp_date ON exp_records(date);


-- ── Due Calendar ──────────────────────────────────────────────────
--   client_type : 'dsr'    = linked DSR/SO
--                 'custom' = free-text customer name
--   status      : pending → partial → cleared
CREATE TABLE due_calendar (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  dsr_id       TEXT          DEFAULT '',
  dsr_name     TEXT          DEFAULT '',
  client_type  TEXT          DEFAULT 'dsr',
  shop_name    TEXT          DEFAULT '',
  due_date     DATE          NOT NULL,
  amount       NUMERIC(14,2) DEFAULT 0,
  paid_amount  NUMERIC(14,2) DEFAULT 0,
  note         TEXT          DEFAULT '',
  status       TEXT          DEFAULT 'pending'
                 CHECK (status IN ('pending', 'partial', 'cleared')),
  cleared_date DATE,
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_due_date   ON due_calendar(due_date);
CREATE INDEX idx_due_status ON due_calendar(status);


-- ── User Passwords (PIN Auth) ──────────────────────────────────────
--   user_key : 'owner' | 'manager' | <srs.id (UUID as text)>
--   role     : 'owner' | 'manager' | 'so' | 'dsr'
--   password : 5-digit numeric PIN
--
--   ✅ FIX V9: UNIQUE constraint removed from password column.
--      Uniqueness is now enforced at the application level when a PIN
--      is being SET (auth.js checks for duplicate before saving).
--      This prevents the silent upsert failure that caused SO accounts
--      to be missing from the Password Manager dashboard.
--
CREATE TABLE user_passwords (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key   TEXT        NOT NULL UNIQUE,
  user_name  TEXT        DEFAULT '',
  role       TEXT        NOT NULL CHECK (role IN ('owner', 'manager', 'so', 'dsr')),
  password   TEXT        NOT NULL,           -- 5-digit PIN, unique enforced by app
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast PIN lookup (used on every login)
CREATE UNIQUE INDEX idx_up_user_key ON user_passwords(user_key);
CREATE INDEX        idx_up_password ON user_passwords(password);


-- ── Group Chat Messages ───────────────────────────────────────────
--   All users (owner/manager/so/dsr) can send and read messages.
--   Messages are stored permanently; soft-delete not needed.
CREATE TABLE chat_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   TEXT        NOT NULL,          -- user_key value
  sender_name TEXT        DEFAULT '',
  sender_role TEXT        DEFAULT 'dsr' CHECK (sender_role IN ('owner','manager','so','dsr')),
  message     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_created ON chat_messages(created_at);
CREATE INDEX idx_chat_sender  ON chat_messages(sender_id);


-- ── Important Numbers ─────────────────────────────────────────────
--   Owner / Manager can add numbers.
--   All users can view and tap-to-call.
CREATE TABLE important_numbers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  role_label TEXT        DEFAULT '',    -- free text: "Owner", "Area Manager", etc.
  phone      TEXT        NOT NULL,
  note       TEXT        DEFAULT '',
  added_by   TEXT        DEFAULT '',    -- user name who added
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_num_created ON important_numbers(created_at);


-- ──────────────────────────────────────────────────────────────────
--  STEP 4 — Disable Row Level Security (সব table এ)
-- ──────────────────────────────────────────────────────────────────

ALTER TABLE products          DISABLE ROW LEVEL SECURITY;
ALTER TABLE srs               DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      DISABLE ROW LEVEL SECURITY;
ALTER TABLE dmg_claims        DISABLE ROW LEVEL SECURITY;
ALTER TABLE bonus             DISABLE ROW LEVEL SECURITY;
ALTER TABLE sr_payments       DISABLE ROW LEVEL SECURITY;
ALTER TABLE exp_cats          DISABLE ROW LEVEL SECURITY;
ALTER TABLE exp_records       DISABLE ROW LEVEL SECURITY;
ALTER TABLE due_calendar      DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_passwords    DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages     DISABLE ROW LEVEL SECURITY;
ALTER TABLE important_numbers DISABLE ROW LEVEL SECURITY;


-- ──────────────────────────────────────────────────────────────────
--  STEP 5 — Seed Data
-- ──────────────────────────────────────────────────────────────────

-- Owner এর initial PIN: 12345
-- প্রথম login এর পরে ⚙️ অতিরিক্ত → 🔑 পাসওয়ার্ড ম্যানেজার থেকে PIN পরিবর্তন করুন
INSERT INTO user_passwords (user_key, user_name, role, password)
VALUES ('owner', 'Owner', 'owner', '12345');

-- Manager PIN এখনো নেই — Owner login করে পাসওয়ার্ড ম্যানেজার থেকে set করবে

-- Sample important number (optional — delete if not needed)
INSERT INTO important_numbers (name, role_label, phone, note, added_by)
VALUES ('Owner', 'মালিক', '01700000000', 'অফিস নম্বর', 'System');


-- ══════════════════════════════════════════════════════════════════
--  ✅ Done! এখন app deploy করুন এবং PIN: 12345 দিয়ে Owner login করুন
--
--  নতুন features:
--  • ⚙️ অতিরিক্ত → 💬 গ্রুপ চ্যাট  (সবাই মেসেজ পাঠাতে পারবে)
--  • ⚙️ অতিরিক্ত → 📞 গুরুত্বপূর্ণ নম্বর  (Owner/Manager যোগ করতে পারবে)
--  • ⚙️ অতিরিক্ত → 🔑 পাসওয়ার্ড ম্যানেজার  (DSR ও SO উভয়ই দেখাবে)
-- ══════════════════════════════════════════════════════════════════
