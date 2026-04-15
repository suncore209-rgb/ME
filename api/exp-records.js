const { supabase, cors, num, now_ } = require('./_lib/db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
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

    res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};
