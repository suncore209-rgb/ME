const { supabase, cors, now_, today, computeBonusSummary } = require('./_lib/db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const productId = req.body?.productId;
    if (!productId) return res.json({ ok: false, error: 'productId প্রয়োজন' });

    const summary = await computeBonusSummary();
    const s = summary.find(x => String(x.productId) === String(productId));

    if (!s)          return res.json({ ok: false, error: 'পণ্য পাওয়া যায়নি' });
    if (s.accAmount <= 0) return res.json({ ok: false, error: 'কোনো বোনাস জমা হয়নি' });

    const td = today();
    const { error } = await supabase.from('bonus').insert({
      product_id:   productId,
      product_name: s.name,
      sku:          s.sku,
      from_date:    s.fromDate,
      to_date:      td,
      given_units:  s.totalGiven,
      bonus_amount: s.accAmount,
      status:       'cleared',
      cleared_date: td,
      note:         '',
      created_at:   now_()
    });
    if (error) throw error;

    res.json({ ok: true, amount: s.accAmount });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};
