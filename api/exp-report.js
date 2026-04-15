const { supabase, cors, num, ds, mapExpCat, mapExpRecord } = require('./_lib/db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
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

    res.json({
      ok: true, from, to,
      grandTotal: rows.reduce((s, r) => s + num(r.amount), 0),
      byCategory: Object.values(catMap).filter(c => c.total > 0).sort((a, b) => b.total - a.total),
      byDate:     Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date))
    });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};
