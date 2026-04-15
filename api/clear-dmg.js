const { supabase, cors, num, today } = require('./_lib/db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const productId = req.body?.productId;
    if (!productId) return res.json({ ok: false, error: 'productId প্রয়োজন' });

    // Get all pending claims for this product
    const { data: pending, error: fetchErr } = await supabase
      .from('dmg_claims')
      .select('id,total_cost')
      .eq('product_id', productId)
      .eq('status', 'pending');
    if (fetchErr) throw fetchErr;

    if (!pending || pending.length === 0) {
      return res.json({ ok: true, totalCleared: 0 });
    }

    const totalCleared = pending.reduce((s, r) => s + num(r.total_cost), 0);
    const ids = pending.map(r => r.id);

    const { error: updateErr } = await supabase
      .from('dmg_claims')
      .update({ status: 'cleared', cleared_date: today() })
      .in('id', ids);
    if (updateErr) throw updateErr;

    res.json({ ok: true, totalCleared });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};
