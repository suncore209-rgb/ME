# 📦 মিরন ইলেকট্রনিক্স — Vercel + Supabase Edition

> **আকিজ ফুড এন্ড বেভারেজ পরিবেশক**  
> স্টক ও ব্যবসা ব্যবস্থাপনা সফটওয়্যার  
> Developed by Suncore Ltd

---

## 🗂️ প্রজেক্ট কাঠামো

```
miron-app/
├── api/
│   ├── _lib/
│   │   └── db.js              ← Supabase client + data mappers
│   ├── load-all.js            ← পণ্য, SR, স্টক লোড
│   ├── dashboard.js           ← ড্যাশবোর্ড
│   ├── products.js            ← পণ্য CRUD
│   ├── srs.js                 ← SR CRUD
│   ├── transactions.js        ← লেনদেন
│   ├── dmg-by-product.js      ← ক্ষতির দাবি দেখুন
│   ├── clear-dmg.js           ← ক্ষতি পরিশোধ
│   ├── bonus.js               ← বোনাস সারসংক্ষেপ
│   ├── pay-bonus.js           ← বোনাস পেমেন্ট
│   ├── sr-payments.js         ← SR পেমেন্ট
│   ├── exp-cats.js            ← খরচের ধরন
│   ├── exp-records.js         ← খরচ রেকর্ড
│   ├── exp-report.js          ← খরচ রিপোর্ট
│   └── report.js              ← ব্যবসায়িক রিপোর্ট
├── public/
│   └── index.html             ← সম্পূর্ণ ফ্রন্টেন্ড (Bengali UI)
├── schema.sql                 ← Supabase ডাটাবেস স্কিমা
├── package.json
├── vercel.json
└── .env.example
```

---

## 🚀 ধাপে ধাপে সেটআপ

### ধাপ ১ — Supabase ডাটাবেস তৈরি করুন

1. [supabase.com](https://supabase.com) এ যান এবং **New Project** তৈরি করুন
2. বাম মেনু → **SQL Editor** খুলুন
3. `schema.sql` ফাইলের সম্পূর্ণ কোড পেস্ট করে **Run** চাপুন
4. সব টেবিল তৈরি হয়ে গেলে পরের ধাপে যান

### ধাপ ২ — Supabase API Keys সংগ্রহ করুন

Supabase Dashboard → **Project Settings** → **API**:

- **Project URL** → `SUPABASE_URL`
- **service_role key** (secret) → `SUPABASE_SERVICE_KEY`  
  ⚠️ `anon` key নয়, `service_role` key লাগবে

### ধাপ ৩ — Vercel-এ Deploy করুন

**Option A: GitHub দিয়ে (সহজ)**
1. প্রজেক্টটি GitHub-এ push করুন
2. [vercel.com](https://vercel.com) → **New Project** → GitHub repo বাছাই করুন
3. **Environment Variables** যোগ করুন:
   ```
   SUPABASE_URL         = https://xxx.supabase.co
   SUPABASE_SERVICE_KEY = eyJ...
   ```
4. **Deploy** চাপুন

**Option B: Vercel CLI দিয়ে**
```bash
npm install -g vercel
cd miron-app
vercel
# প্রথমবার: vercel link করুন, তারপর env variables যোগ করুন
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel --prod
```

### ধাপ ৪ — লোকাল টেস্ট (ঐচ্ছিক)

```bash
# .env.local ফাইল তৈরি করুন
cp .env.example .env.local
# SUPABASE_URL এবং SUPABASE_SERVICE_KEY পূরণ করুন

npm install
npx vercel dev
# http://localhost:3000 খুলুন
```

---

## 🔄 Google Sheets থেকে পার্থক্য

| বিষয়              | Google Sheets সংস্করণ     | Vercel + Supabase সংস্করণ  |
|-------------------|---------------------------|----------------------------|
| ডাটাবেস           | Google Sheets             | Supabase PostgreSQL         |
| ব্যাকএন্ড          | Google Apps Script         | Vercel Serverless Functions |
| ফ্রন্টেন্ড API     | `google.script.run`        | `fetch()` (একই UI)          |
| Excel/Sheet Export | Google Sheet তৈরি         | **CSV ডাউনলোড**             |
| ছবি স্টোরেজ       | base64 Sheets cell        | base64 Supabase TEXT column |
| ডোমেইন            | script.google.com         | আপনার Vercel domain         |

---

## 🗃️ ডাটাবেস টেবিল

| টেবিল          | বিবরণ                         |
|----------------|-------------------------------|
| `products`     | পণ্য তালিকা + বোনাস সেটিং    |
| `srs`          | Sales Representative          |
| `transactions` | সব লেনদেন (দেওয়া/ফেরত/ক্ষতি/কেনা) |
| `dmg_claims`   | ক্ষতির দাবি                   |
| `bonus`        | বোনাস পেমেন্ট রেকর্ড          |
| `sr_payments`  | SR থেকে পেমেন্ট               |
| `exp_cats`     | খরচের ধরন                     |
| `exp_records`  | দৈনিক খরচ রেকর্ড              |

---

## 📡 API Endpoints

| Endpoint              | Method | কাজ                        |
|-----------------------|--------|-----------------------------|
| `/api/load-all`       | GET    | স্টার্টআপ ডেটা লোড         |
| `/api/dashboard`      | GET    | ড্যাশবোর্ড ডেটা            |
| `/api/products`       | GET/POST/PUT/DELETE | পণ্য ব্যবস্থাপনা |
| `/api/srs`            | GET/POST/PUT/DELETE | SR ব্যবস্থাপনা   |
| `/api/transactions`   | POST   | লেনদেন যোগ                 |
| `/api/report`         | GET    | ব্যবসায়িক রিপোর্ট         |
| `/api/dmg-by-product` | GET    | পণ্যভিত্তিক ক্ষতি          |
| `/api/clear-dmg`      | POST   | ক্ষতি পরিশোধ               |
| `/api/bonus`          | GET    | বোনাস সারসংক্ষেপ           |
| `/api/pay-bonus`      | POST   | বোনাস পেমেন্ট              |
| `/api/sr-payments`    | GET/POST | SR পেমেন্ট               |
| `/api/exp-cats`       | GET/POST/DELETE | খরচের ধরন       |
| `/api/exp-records`    | POST   | খরচ রেকর্ড                 |
| `/api/exp-report`     | GET    | খরচ রিপোর্ট               |

---

## 🛡️ নিরাপত্তা

- `SUPABASE_SERVICE_KEY` শুধুমাত্র সার্ভার-সাইড API তে ব্যবহার হয়
- ফ্রন্টেন্ড কোডে কোনো API key নেই
- Supabase RLS disabled (private app — API layer handles auth)
- প্রয়োজনে Vercel Password Protection যোগ করুন: Dashboard → Settings → Security

---

*Developed by Suncore Ltd | মিরন ইলেকট্রনিক্স*
