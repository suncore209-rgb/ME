const { supabase, cors, num, ds, now_, today, mapExpCat, mapExpRecord, mapDue } = require('./_lib/db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const action = req.query?.action || req.body?.action || '';
  try {
    // ── Expense Categories ─────────────────────────
    if (req.method === 'GET' && action === 'cats') {
      const { data, error } = await supabase.from('exp_cats').select('*').order('created_at');
      if (error) throw error;
      return res.json({ ok: true, categories: (data||[]).map(mapExpCat) });
    }
    if (req.method === 'POST' && action === 'cat') {
      const name = String(req.body?.name||'').trim();
      if (!name) return res.json({ ok: false, error: 'নাম প্রয়োজন' });
      const { error } = await supabase.from('exp_cats').insert({ name, created_at: now_() });
      if (error) throw error;
      return res.json({ ok: true });
    }
    if (req.method === 'DELETE' && action === 'cat') {
      const id = req.body?.id || req.query?.id;
      const { error } = await supabase.from('exp_cats').delete().eq('id', id);
      if (error) throw error;
      return res.json({ ok: true });
    }
    if (req.method === 'POST' && action === 'record') {
      const d = req.body;
      const { error } = await supabase.from('exp_records').insert({
        category_id: String(d.categoryId||''), category_name: String(d.categoryName||''),
        date: d.date, amount: num(d.amount), note: d.note||'', created_at: now_()
      });
      if (error) throw error;
      return res.json({ ok: true });
    }
    if (req.method === 'GET' && action === 'report') {
      const { from, to } = req.query;
      if (!from || !to) return res.json({ ok: false, error: 'from/to প্রয়োজন' });
      const [catRes, recRes] = await Promise.all([
        supabase.from('exp_cats').select('*').order('created_at'),
        supabase.from('exp_records').select('*').gte('date',from).lte('date',to).order('date')
      ]);
      const cats = (catRes.data||[]).map(mapExpCat);
      const rows = (recRes.data||[]).map(mapExpRecord);
      const catMap = {};
      cats.forEach(c => { catMap[c.id] = { id: c.id, name: c.name, total: 0 }; });
      rows.forEach(r => {
        if (!catMap[r.categoryId]) catMap[r.categoryId] = { id:r.categoryId, name:r.categoryName, total:0 };
        catMap[r.categoryId].total += num(r.amount);
      });
      const dayMap = {};
      rows.forEach(r => {
        const d = ds(r.date);
        if (!dayMap[d]) dayMap[d] = { date:d, total:0, items:[] };
        dayMap[d].total += num(r.amount);
        dayMap[d].items.push({ cat:r.categoryName, amount:num(r.amount), note:r.note });
      });
      return res.json({
        ok:true, from, to,
        grandTotal: rows.reduce((s,r)=>s+num(r.amount),0),
        byCategory: Object.values(catMap).filter(c=>c.total>0).sort((a,b)=>b.total-a.total),
        byDate: Object.values(dayMap).sort((a,b)=>b.date.localeCompare(a.date))
      });
    }

    // ── Due Calendar ───────────────────────────────
    if (req.method === 'GET' && action === 'dues') {
      const { month } = req.query;
      let q = supabase.from('due_calendar').select('*').order('due_date');
      if (month) q = q.gte('due_date', month+'-01').lte('due_date', month+'-31');
      const { data, error } = await q;
      if (error) throw error;
      return res.json({ ok: true, dues: (data||[]).map(mapDue) });
    }
    if (req.method === 'POST' && action === 'due') {
      const d = req.body;
      const { error } = await supabase.from('due_calendar').insert({
        dsr_id: d.dsrId||'', dsr_name: d.dsrName||'',
        due_date: d.dueDate, amount: num(d.amount),
        note: d.note||'', status: 'pending', created_at: now_()
      });
      if (error) throw error;
      return res.json({ ok: true });
    }
    if (req.method === 'POST' && action === 'due-clear') {
      const id = req.body?.id;
      const { error } = await supabase.from('due_calendar')
        .update({ status: 'cleared', cleared_date: today() }).eq('id', id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    // ── Payment Breakdown Report (with damage_amt) ──
    if (req.method === 'GET' && action === 'pay-report') {
      const { from, to } = req.query;
      let q = supabase.from('sr_payments').select('*').order('date');
      if (from) q = q.gte('date', from);
      if (to)   q = q.lte('date', to);
      const { data, error } = await q;
      if (error) throw error;
      const rows = data || [];
      const totalCash = rows.reduce((s,r)=>s+num(r.cash_amount),0);
      const totalComm = rows.reduce((s,r)=>s+num(r.commission_amt),0);
      const totalDisc = rows.reduce((s,r)=>s+num(r.discount_amt),0);
      const totalDmg  = rows.reduce((s,r)=>s+num(r.damage_amt),0);
      const totalAmt  = rows.reduce((s,r)=>s+num(r.amount),0);
      return res.json({ ok:true, from, to,
        totalCash, totalComm, totalDisc, totalDmg, totalAmt,
        rows: rows.map(r=>({
          id: String(r.id), srId: String(r.sr_id), srName: r.sr_name,
          date: String(r.date||'').slice(0,10), amount: num(r.amount),
          cashAmount: num(r.cash_amount), commissionAmt: num(r.commission_amt),
          discountAmt: num(r.discount_amt), damageAmt: num(r.damage_amt), note: r.note
        }))
      });
    }

    res.status(400).json({ ok: false, error: 'অজানা action: ' + action });
  } catch (e) { res.json({ ok: false, error: e.message }); }
};
