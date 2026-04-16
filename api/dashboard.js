const { supabase, cors, num, ds, today, mapProduct, mapSR, mapTx, mapDmg, mapPayment, calcStock, computeBonusSummary } = require('./_lib/db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const todayStr = today();
    const mS = todayStr.slice(0, 7) + '-01';
    const mE = todayStr.slice(0, 7) + '-31';

    const [pRes, sRes, tRes, payRes, dmgRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at'),
      supabase.from('srs').select('*').order('created_at'),
      supabase.from('transactions').select('*').order('created_at'),
      supabase.from('sr_payments').select('*').order('created_at'),
      supabase.from('dmg_claims').select('*').order('created_at')
    ]);

    const prods  = (pRes.data  || []).map(mapProduct);
    const srs    = (sRes.data  || []).map(mapSR);
    const allTx  = (tRes.data  || []).map(mapTx);
    const allPay = (payRes.data|| []).map(mapPayment);
    const allDmg = (dmgRes.data|| []).map(mapDmg);

    const todTx = allTx.filter(r => ds(r.date) === todayStr);
    const monTx = allTx.filter(r => { const d = ds(r.date); return d >= mS && d <= mE; });
    const monPay= allPay.filter(r => { const d = ds(r.date); return d >= mS && d <= mE; });

    const sU = (a, t) => a.filter(r => r.type === t).reduce((s, r) => s + num(r.totalUnits), 0);
    const sR = (a, t) => a.filter(r => r.type === t).reduce((s, r) => s + num(r.totalRevenue), 0);
    const sC = (a, t) => a.filter(r => r.type === t).reduce((s, r) => s + num(r.totalCost), 0);

    const tGR = sR(todTx,'give'), tRR = sR(todTx,'return');
    const tGC = sC(todTx,'give'), tRC = sC(todTx,'return');
    const todaySale = {
      givenUnits: sU(todTx,'give'), returnUnits: sU(todTx,'return'),
      revenue: tGR - tRR, cost: tGC - tRC, profit: (tGR - tRR) - (tGC - tRC)
    };

    const mGR = sR(monTx,'give'), mRR = sR(monTx,'return');
    const mGC = sC(monTx,'give'), mRC = sC(monTx,'return');
    const mPay = monPay.reduce((s, r) => s + num(r.amount), 0);
    const monthSale = {
      givenUnits: sU(monTx,'give'), returnUnits: sU(monTx,'return'),
      dmgUnits: sU(monTx,'damage'), revenue: mGR - mRR, cost: mGC - mRC,
      profit: (mGR - mRR) - (mGC - mRC), payments: mPay
    };

    const stMap = calcStock(allTx);
    const stockList = prods.map(p => ({
      id: p.id, name: p.name, sku: p.sku, caseSize: num(p.caseSize) || 1,
      purchasePrice: num(p.purchasePrice), sellingPrice: num(p.sellingPrice),
      thumb: p.thumb || '', units: stMap[p.id] || 0,
      sellValue: (stMap[p.id] || 0) * num(p.sellingPrice),
      costValue: (stMap[p.id] || 0) * num(p.purchasePrice)
    }));

    const pendDmg = allDmg.filter(c => c.status === 'pending');
    const pendDmgAmt = pendDmg.reduce((s, c) => s + num(c.totalCost), 0);
    const bonusSummary = await computeBonusSummary();
    const pendBonusAmt = bonusSummary.reduce((s, b) => s + b.accAmount, 0);

    const srDues = srs.map(sr => {
      const sTx  = allTx.filter(r => r.srId === sr.id);
      const sPay = allPay.filter(r => r.srId === sr.id);
      const given  = sTx.filter(r => r.type === 'give').reduce((s, r) => s + num(r.totalRevenue), 0);
      const ret    = sTx.filter(r => r.type === 'return').reduce((s, r) => s + num(r.totalRevenue), 0);
      const paid   = sPay.reduce((s, r) => s + num(r.amount), 0);
      const gU = sTx.filter(r => r.type === 'give').reduce((s, r) => s + num(r.totalUnits), 0);
      const rU = sTx.filter(r => r.type === 'return').reduce((s, r) => s + num(r.totalUnits), 0);
      return {
        srId: sr.id, name: sr.name, phone: sr.phone, area: sr.area, thumb: sr.thumb || '',
        givenRev: given, returnRev: ret, payments: paid, due: given - ret - paid,
        givenUnits: gU, returnUnits: rU, soldUnits: gU - rU
      };
    });

    const recent = allTx.slice(-15).reverse();

    res.json({
      ok: true, today: todaySale, month: monthSale,
      stock: {
        list: stockList,
        totalSell: stockList.reduce((s, p) => s + p.sellValue, 0),
        totalCost: stockList.reduce((s, p) => s + p.costValue, 0)
      },
      dues: { total: srDues.reduce((s, sr) => s + sr.due, 0), list: srDues },
      damage: { pendingAmt: pendDmgAmt, pendingCount: pendDmg.length },
      bonus: { pendingAmt: pendBonusAmt },
      recent
    });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};
