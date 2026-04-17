const { supabase, cors, num, now_, mapPayment } = require('./_lib/db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('sr_payments').select('*').order('created_at');
      if (error) throw error;
      return res.json((data || []).map(mapPayment));
    }

    if (req.method === 'POST') {
      const d = req.body;
      const total = num(d.amount);
      const { error } = await supabase.from('sr_payments').insert({
        sr_id:        d.srId    || '',
        sr_name:      d.srName  || '',
        date:         d.date,
        amount:       total,
        cash_amount:  num(d.cash_amount)  || total, // fallback: full amount as cash
        commission:   num(d.commission)   || 0,
        discount:     num(d.discount)     || 0,
        note:         d.note    || '',
        created_at:   now_()
      });
      if (error) throw error;
      return res.json({ ok: true });
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};
