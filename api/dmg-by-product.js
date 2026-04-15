const { supabase, cors, num, mapDmg, mapProduct } = require('./_lib/db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const [dmgRes, prodRes] = await Promise.all([
      supabase.from('dmg_claims').select('*').order('created_at'),
      supabase.from('products').select('id,thumb').order('created_at')
    ]);

    const claims = (dmgRes.data || []).map(mapDmg);
    const prods  = (prodRes.data || []);
    const prodThumbMap = {};
    prods.forEach(p => { prodThumbMap[String(p.id)] = p.thumb || ''; });

    const map = {};
    claims.forEach(c => {
      const pid = c.productId; if (!pid) return;
      if (!map[pid]) map[pid] = {
        productId: pid, name: c.productName, sku: c.sku, thumb: '',
        pendingUnits: 0, pendingCost: 0, clearedUnits: 0, clearedCost: 0, lastClearedDate: ''
      };
      const u = num(c.totalUnits), cost = num(c.totalCost);
      if (c.status === 'cleared') {
        map[pid].clearedUnits += u;
        map[pid].clearedCost  += cost;
        if (c.clearedDate && c.clearedDate > map[pid].lastClearedDate)
          map[pid].lastClearedDate = c.clearedDate;
      } else {
        map[pid].pendingUnits += u;
        map[pid].pendingCost  += cost;
      }
    });

    // Attach product thumbs
    Object.values(map).forEach(m => {
      if (prodThumbMap[m.productId]) m.thumb = prodThumbMap[m.productId];
    });

    const list = Object.values(map).sort((a, b) => b.pendingCost - a.pendingCost);
    res.json(list);
  } catch (e) {
    res.json([]);
  }
};
