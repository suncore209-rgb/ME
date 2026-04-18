# ⚡ AXIION স্টক ম্যানেজমেন্ট সিস্টেম — V4

**Developed by AXIION TECHNOLOGY**

## 🔑 PIN লগইন (Auto Role Detection)

| ভূমিকা    | PIN  |
|-----------|------|
| Owner     | 2713 |
| Manager   | 5620 |
| SO        | 1280 |
| DSR       | 1275 |

> PIN দিলে সিস্টেম স্বয়ংক্রিয়ভাবে ভূমিকা শনাক্ত করবে।

---

## 🚀 Vercel Deploy

1. GitHub-এ push করুন
2. Vercel-এ import করুন
3. Environment variables যোগ করুন:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
4. Deploy করুন

---

## 🗄️ Supabase Setup

1. Supabase Dashboard → SQL Editor
2. `schema.sql` ফাইলের পুরো কন্টেন্ট রান করুন
3. **Upgrade করলে** — `schema.sql`-এর নিচের MIGRATION সেকশনের ALTER লাইনগুলো আনকমেন্ট করে রান করুন

---

## 📡 API Routes (10টি — Hobby plan এর মধ্যে)

| Route             | Method        | কাজ                           |
|-------------------|---------------|-------------------------------|
| `/api/load-all`   | GET           | Products, SRs, StockMap লোড  |
| `/api/dashboard`  | GET           | Dashboard ডেটা               |
| `/api/products`   | GET/POST/PUT/DELETE | পণ্য ব্যবস্থাপনা       |
| `/api/srs`        | GET/POST/PUT/DELETE | SR ব্যবস্থাপনা         |
| `/api/transactions`| GET/POST     | লেনদেন রেকর্ড               |
| `/api/sr-payments`| GET/POST     | SR পেমেন্ট (4-type)          |
| `/api/damage`     | GET/POST     | ড্যামেজ ক্লেইম               |
| `/api/bonus`      | GET/POST     | বোনাস সিস্টেম               |
| `/api/report`     | GET          | রিপোর্ট (তারিখ ভিত্তিক)     |
| `/api/expenses`   | GET/POST/DELETE | খরচ + পেমেন্ট রিপোর্ট    |

---

## 🆕 V4 পরিবর্তনসমূহ

### ✅ Bug Fixes
- **google.script.run সরানো হয়েছে** — এখন সব API calls `fetch()` দিয়ে হয়
- **Keyboard auto-close ঠিক হয়েছে** — input-এ কোনো re-render নেই
- **PIN auto role detection** — role button সরানো হয়েছে

### ✨ নতুন ফিচার
- **PIN Auto-detect**: শুধু PIN দিন, ভূমিকা নিজেই শনাক্ত হবে
- **DSR Dashboard**: শুধু আজকের দেওয়া/ফেরত/ড্যামেজ (কেস+পিস আলাদা), তারিখ ফিল্টার
- **SO Dashboard**: Product-wise স্টক (কেস+পিস), বিক্রয় মূল্য, মোট মূল্যমান
- **Manager Daily Summary**: আজ বিক্রি + আজ লাভ ব্যানার
- **4-type Payment**: নগদ + কমিশন + ছাড় + ড্যামেজ = মোট পেমেন্ট
- **SKU স্টক page**: কেস + পিস আলাদা, নিচে মোট পিস
- **Product Offer System**: ফ্রি পিস + ফ্রি টাকা (৳) per N কেস
- **Low Stock Alert**: প্রতি পণ্যে threshold সেট, alert দেখাবে
- **SR Role Field**: DSR বা SO সেট করুন
- **ড্যামেজ/বোনাস**: নিচে মোট summary
- **Payment Breakdown**: নগদ/কমিশন/ছাড়/ড্যামেজ আলাদা রিপোর্ট
- **Reports**: শুধু PDF (Excel সরানো হয়েছে)

### 🔤 টেক্সট পরিবর্তন
- "ক্ষতি" → "ড্যামেজ"
- "ইউ"/"ইউনিট" → "পিস"
- ব্র্যান্ডিং: "AXIION TECHNOLOGY"

---

## 🔐 ভূমিকা অনুযায়ী অ্যাক্সেস

| ফিচার              | Owner | Manager | SO  | DSR |
|--------------------|-------|---------|-----|-----|
| ক্রয় মূল্য দেখা  | ✅    | ❌      | ❌  | ❌  |
| বিক্রয় মূল্য      | ✅    | ✅      | ✅  | ❌  |
| পণ্য যোগ/সম্পাদনা  | ✅    | ❌      | ❌  | ❌  |
| SR যোগ/সম্পাদনা    | ✅    | ❌      | ❌  | ❌  |
| লেনদেন রেকর্ড      | ✅    | ✅      | ❌  | ❌  |
| রিপোর্ট            | ✅    | ✅      | ❌  | ❌  |
| খরচ                | ✅    | ✅      | ❌  | ❌  |
| স্টক দেখা          | ✅    | ✅      | ✅  | ❌  |
| DSR Dashboard      | —     | —       | —   | ✅  |
