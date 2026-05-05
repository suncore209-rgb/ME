const { supabase, cors, num, now_, mapPayment } = require('./_lib/db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { srId, from, to } = req.query;
      let q = supabase.from('sr_payments').select('*').order('created_at');
      if (srId) q = q.eq('sr_id', srId);
      if (from) q = q.gte('date', from);
      if (to)   q = q.lte('date', to);
      const { data, error } = await q;
      if (error) throw error;
      return res.json((data || []).map(mapPayment));
    }

    if (req.method === 'POST') {
      const d = req.body;
      const cashAmt   = num(d.cashAmount)   || 0;
      const commAmt   = num(d.commissionAmt) || 0;
      const discAmt   = num(d.discountAmt)  || 0;
      const dmgAmt    = num(d.damageAmt)    || 0;
      // Total payment = sum of all 4 types
      const total = cashAmt + commAmt + discAmt + dmgAmt || num(d.amount);
      const { error } = await supabase.from('sr_payments').insert({
        sr_id:          d.srId    || '',
        sr_name:        d.srName  || '',
        date:           d.date,
        amount:         total,
        cash_amount:    cashAmt,
        commission_amt: commAmt,
        discount_amt:   discAmt,
        damage_amt:     dmgAmt,
        note:           d.note    || '',
        created_at:     now_()
      });
      if (error) throw error;
      return res.json({ ok: true });
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};
