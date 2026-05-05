const {
  supabase, cors, num, ds,
  mapProduct, mapSR, mapTx, mapPayment, mapDmg, mapBonus
} = require('./_lib/db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + '-01';

    const [pRes, sRes, txTodayRes, txMonthRes, txAllRes, payMonthRes, dmgRes, bonRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at'),
      supabase.from('srs').select('*').order('created_at'),
      supabase.from('transactions').select('*').eq('date', today).order('created_at'),
      supabase.from('transactions').select('*').gte('date', monthStart).lte('date', today).order('created_at'),
      supabase.from('transactions').select('tx_id,type,product_id,total_units').order('created_at'),
      supabase.from('sr_payments').select('*').gte('date', monthStart).lte('date', today).order('date'),
      supabase.from('dmg_claims').select('*').eq('status', 'pending').order('created_at'),
      supabase.from('bonus').select('*').order('created_at')
    ]);

    const products    = (pRes.data  || []).map(mapProduct);
    const srs         = (sRes.data  || []).map(mapSR);
    const txToday     = (txTodayRes.data  || []).map(mapTx);
    const txMonth     = (txMonthRes.data  || []).map(mapTx);
    const txAll       = (txAllRes.data    || []);
    const payMonth    = (payMonthRes.data || []).map(mapPayment);
    const dmgPending  = (dmgRes.data      || []).map(mapDmg);
    const bonusRecs   = (bonRes.data      || []).map(mapBonus);

    // ── Stock map (from all transactions) ─────────────────
    const stockMap = {};
    txAll.forEach(r => {
      const pid = String(r.product_id || ''); if (!pid) return;
      if (!stockMap[pid]) stockMap[pid] = 0;
      const u = num(r.total_units);
      if (r.type === 'buy')    stockMap[pid] += u;
      if (r.type === 'give')   stockMap[pid] -= u;
      if (r.type === 'return') stockMap[pid] += u;
      if (r.type === 'damage') stockMap[pid] -= u;
    });

    // ── TODAY stats ────────────────────────────────────────
    const gU  = txToday.filter(r=>r.type==='give').reduce((s,r)=>s+num(r.totalUnits),0);
    const rtU = txToday.filter(r=>r.type==='return').reduce((s,r)=>s+num(r.totalUnits),0);
    const gR  = txToday.filter(r=>r.type==='give').reduce((s,r)=>s+num(r.totalRevenue),0);
    const rtR = txToday.filter(r=>r.type==='return').reduce((s,r)=>s+num(r.totalRevenue),0);
    const gC  = txToday.filter(r=>r.type==='give').reduce((s,r)=>s+num(r.totalCost),0);
    const rtC = txToday.filter(r=>r.type==='return').reduce((s,r)=>s+num(r.totalCost),0);
    const todayRevenue = gR - rtR;
    const todayProfit  = todayRevenue - (gC - rtC);

    // ── MONTH stats ────────────────────────────────────────
    const mgR  = txMonth.filter(r=>r.type==='give').reduce((s,r)=>s+num(r.totalRevenue),0);
    const mrtR = txMonth.filter(r=>r.type==='return').reduce((s,r)=>s+num(r.totalRevenue),0);
    const mgC  = txMonth.filter(r=>r.type==='give').reduce((s,r)=>s+num(r.totalCost),0);
    const mrtC = txMonth.filter(r=>r.type==='return').reduce((s,r)=>s+num(r.totalCost),0);
    const monthRevenue = mgR - mrtR;
    const monthProfit  = monthRevenue - (mgC - mrtC);
    const monthPayments = payMonth.reduce((s,r)=>s+num(r.amount),0);

    // ── STOCK list ─────────────────────────────────────────
    const stockList = products.map(p => {
      const units = stockMap[p.id] || 0;
      return {
        id: p.id, name: p.name, sku: p.sku,
        caseSize: num(p.caseSize) || 1,
        lowStockAlert: num(p.lowStockAlert),
        thumb: p.thumb || '',
        units,
        sellValue: units * num(p.sellingPrice)
      };
    });
    const totalSell = stockList.reduce((s,p)=>s+p.sellValue,0);

    // ── DUES (SR-wise) ─────────────────────────────────────
    const srDueMap = {};
    srs.forEach(sr => {
      srDueMap[sr.id] = {
        srId: sr.id, name: sr.name, area: sr.area,
        phone: sr.phone, thumb: sr.thumb || '',
        givenUnits: 0, returnUnits: 0,
        givenRev: 0, returnRev: 0, payments: 0
      };
    });

    // Use ALL transactions for dues (historical)
    const [txAllForDues] = await Promise.all([
      supabase.from('transactions')
        .select('type,sr_id,total_units,total_revenue')
        .in('type',['give','return','damage'])
        .order('created_at')
    ]);
    const [payAllRes] = await Promise.all([
      supabase.from('sr_payments').select('sr_id,amount').order('date')
    ]);

    (txAllForDues.data || []).forEach(r => {
      const sid = String(r.sr_id || ''); if (!sid) return;
      if (!srDueMap[sid]) srDueMap[sid] = { srId:sid, name:r.sr_name||'', area:'', phone:'', thumb:'', givenUnits:0, returnUnits:0, givenRev:0, returnRev:0, payments:0 };
      const u = num(r.total_units), rev = num(r.total_revenue);
      if (r.type==='give')   { srDueMap[sid].givenUnits += u; srDueMap[sid].givenRev += rev; }
      if (r.type==='return') { srDueMap[sid].returnUnits+= u; srDueMap[sid].returnRev+= rev; }
    });
    (payAllRes.data || []).forEach(r => {
      const sid = String(r.sr_id || ''); if (!sid) return;
      if (srDueMap[sid]) srDueMap[sid].payments += num(r.amount);
    });

    const duesList = Object.values(srDueMap).map(sr => ({
      ...sr,
      due: (sr.givenRev - sr.returnRev) - sr.payments
    }));
    const totalDue = duesList.reduce((s,sr)=>s+(sr.due>0?sr.due:0),0);

    // ── DAMAGE pending amount ──────────────────────────────
    const dmgPendingAmt = dmgPending.reduce((s,r)=>s+num(r.totalCost),0);

    // ── BONUS pending ──────────────────────────────────────
    // Compute accured vs received
    let bonusPendingAmt = 0;
    products.filter(p=>num(p.bonusFreeUnits)>0||num(p.bonusFreeMoney)>0).forEach(p => {
      const cleared = bonusRecs.filter(b=>String(b.productId)===String(p.id)&&b.status==='cleared'&&b.clearedDate)
        .sort((a,b)=>String(b.clearedDate).localeCompare(String(a.clearedDate)));
      const lastCleared = cleared.length>0?String(cleared[0].clearedDate):'';
      const fromDate = lastCleared||'2000-01-01';
      const txSince = txAll.filter(r=>String(r.product_id)===String(p.id)&&r.type==='give'&&ds(r.date)>fromDate);
      const totalGiven = txSince.reduce((s,r)=>s+num(r.total_units),0);
      const cs = num(p.caseSize)||1, bcr = num(p.bonusCasesReq)||1;
      const totalCases = Math.floor(totalGiven/cs);
      const accUnits = Math.floor(totalCases/bcr)*num(p.bonusFreeUnits);
      const accMoney = Math.floor(totalCases/bcr)*num(p.bonusFreeMoney||0);
      const accAmount = accUnits*num(p.purchasePrice)+accMoney;
      const totalRec = bonusRecs.filter(b=>String(b.productId)===String(p.id)&&b.status==='cleared').reduce((s,b)=>s+num(b.bonusAmount),0);
      bonusPendingAmt += Math.max(0, accAmount - totalRec);
    });

    // ── RECENT transactions (last 10) ──────────────────────
    const recentRes = await supabase.from('transactions').select('*').order('created_at',{ascending:false}).limit(10);
    const recent = (recentRes.data||[]).map(mapTx);

    res.json({
      ok: true,
      today: { revenue: todayRevenue, profit: todayProfit, givenUnits: gU, returnUnits: rtU },
      month: { revenue: monthRevenue, profit: monthProfit, payments: monthPayments },
      stock: { list: stockList, totalSell },
      dues:  { total: totalDue, list: duesList },
      damage: { pendingAmt: dmgPendingAmt },
      bonus:  { pendingAmt: bonusPendingAmt },
      recent
    });

  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};
