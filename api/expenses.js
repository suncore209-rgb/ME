const { supabase, cors, num, ds, now_, mapExpCat, mapExpRecord } = require('./_lib/db');

// Single file handles: categories CRUD + expense entries + expense report
// Dispatch via ?action= query param:
//   GET  ?action=cats          → list expense categories
//   POST ?action=cat           → add category   { name }
//   DELETE ?action=cat         → delete category { id }
//   POST ?action=record        → add expense entry
//   GET  ?action=report&from=&to= → expense report

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query?.action || req.body?.action || '';

  try {
    // ── GET cats ────────────────────────────────────────────
    if (req.method === 'GET' && action === 'cats') {
      const { data, error } = await supabase.from('exp_cats').select('*').order('created_at');
      if (error) throw error;
      return res.json({ ok: true, categories: (data || []).map(mapExpCat) });
    }

    // ── POST cat (add) ───────────────────────────────────────
    if (req.method === 'POST' && action === 'cat') {
      const name = String(req.body?.name || '').trim();
      if (!name) return res.json({ ok: false, error: 'নাম প্রয়োজন' });
      const { error } = await supabase.from('exp_cats').insert({ name, created_at: now_() });
      if (error) throw error;
      return res.json({ ok: true });
    }

    // ── DELETE cat ───────────────────────────────────────────
    if (req.method === 'DELETE' && action === 'cat') {
      const id = req.body?.id || req.query?.id;
      if (!id) return res.json({ ok: false, error: 'id প্রয়োজন' });
      const { error } = await supabase.from('exp_cats').delete().eq('id', id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    // ── POST record (add expense entry) ──────────────────────
    if (req.method === 'POST' && action === 'record') {
      const d = req.body;
      const { error } = await supabase.from('exp_records').insert({
        category_id:   String(d.categoryId   || ''),
        category_name: String(d.categoryName || ''),
        date:          d.date,
        amount:        num(d.amount),
        note:          d.note || '',
        created_at:    now_()
      });
      if (error) throw error;
      return res.json({ ok: true });
    }

    // ── GET report ───────────────────────────────────────────
    if (req.method === 'GET' && action === 'report') {
      const { from, to } = req.query;
      if (!from || !to) return res.json({ ok: false, error: 'from/to প্রয়োজন' });

      const [catRes, recRes] = await Promise.all([
        supabase.from('exp_cats').select('*').order('created_at'),
        supabase.from('exp_records').select('*').gte('date', from).lte('date', to).order('date')
      ]);
      const cats = (catRes.data || []).map(mapExpCat);
      const rows = (recRes.data || []).map(mapExpRecord);

      const catMap = {};
      cats.forEach(c => { catMap[c.id] = { id: c.id, name: c.name, total: 0 }; });
      rows.forEach(r => {
        if (!catMap[r.categoryId]) catMap[r.categoryId] = { id: r.categoryId, name: r.categoryName, total: 0 };
        catMap[r.categoryId].total += num(r.amount);
      });
      const dayMap = {};
      rows.forEach(r => {
        const d = ds(r.date);
        if (!dayMap[d]) dayMap[d] = { date: d, total: 0, items: [] };
        dayMap[d].total += num(r.amount);
        dayMap[d].items.push({ cat: r.categoryName, amount: num(r.amount), note: r.note });
      });
      return res.json({
        ok: true, from, to,
        grandTotal:  rows.reduce((s, r) => s + num(r.amount), 0),
        byCategory:  Object.values(catMap).filter(c => c.total > 0).sort((a, b) => b.total - a.total),
        byDate:      Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date))
      });
    }

    res.status(400).json({ ok: false, error: 'অজানা action: ' + action });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};
