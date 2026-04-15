const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── CORS helper ───────────────────────────────────────────
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Utility ───────────────────────────────────────────────
function num(v) { return Number(v) || 0; }
function ds(v) { if (!v) return ''; return String(v).slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }
function now_() { return new Date().toISOString(); }

// ── Row mappers: DB snake_case → camelCase ────────────────
function mapProduct(r) {
  return {
    id: String(r.id || ''),
    name: r.name || '',
    sku: r.sku || '',
    caseSize: String(r.case_size || 1),
    purchasePrice: String(r.purchase_price || 0),
    sellingPrice: String(r.selling_price || 0),
    bonusFreeUnits: String(r.bonus_free_units || 0),
    bonusCasesReq: String(r.bonus_cases_req || 1),
    thumb: r.thumb || '',
    createdAt: r.created_at || ''
  };
}

function mapSR(r) {
  return {
    id: String(r.id || ''),
    name: r.name || '',
    phone: r.phone || '',
    area: r.area || '',
    thumb: r.thumb || '',
    createdAt: r.created_at || ''
  };
}

function mapTx(r) {
  return {
    txId: String(r.tx_id || ''),
    type: r.type || '',
    srId: String(r.sr_id || ''),
    srName: r.sr_name || '',
    date: r.date ? String(r.date).slice(0, 10) : '',
    slipNo: r.slip_no || '',
    productId: String(r.product_id || ''),
    productName: r.product_name || '',
    sku: r.sku || '',
    cases: String(r.cases || 0),
    pcs: String(r.pcs || 0),
    totalUnits: String(r.total_units || 0),
    purchasePrice: String(r.purchase_price || 0),
    sellingPrice: String(r.selling_price || 0),
    totalCost: String(r.total_cost || 0),
    totalRevenue: String(r.total_revenue || 0),
    note: r.note || '',
    createdAt: r.created_at || ''
  };
}

function mapDmg(r) {
  return {
    id: String(r.id || ''),
    txId: String(r.tx_id || ''),
    productId: String(r.product_id || ''),
    productName: r.product_name || '',
    sku: r.sku || '',
    totalUnits: String(r.total_units || 0),
    purchasePrice: String(r.purchase_price || 0),
    totalCost: String(r.total_cost || 0),
    date: r.date ? String(r.date).slice(0, 10) : '',
    srId: String(r.sr_id || ''),
    srName: r.sr_name || '',
    status: r.status || 'pending',
    clearedDate: r.cleared_date ? String(r.cleared_date).slice(0, 10) : '',
    createdAt: r.created_at || ''
  };
}

function mapBonus(r) {
  return {
    id: String(r.id || ''),
    productId: String(r.product_id || ''),
    productName: r.product_name || '',
    sku: r.sku || '',
    fromDate: r.from_date ? String(r.from_date).slice(0, 10) : '',
    toDate: r.to_date ? String(r.to_date).slice(0, 10) : '',
    givenUnits: String(r.given_units || 0),
    bonusAmount: String(r.bonus_amount || 0),
    status: r.status || '',
    clearedDate: r.cleared_date ? String(r.cleared_date).slice(0, 10) : '',
    note: r.note || '',
    createdAt: r.created_at || ''
  };
}

function mapPayment(r) {
  return {
    id: String(r.id || ''),
    srId: String(r.sr_id || ''),
    srName: r.sr_name || '',
    date: r.date ? String(r.date).slice(0, 10) : '',
    amount: String(r.amount || 0),
    note: r.note || '',
    createdAt: r.created_at || ''
  };
}

function mapExpCat(r) {
  return { id: String(r.id || ''), name: r.name || '', createdAt: r.created_at || '' };
}

function mapExpRecord(r) {
  return {
    id: String(r.id || ''),
    categoryId: String(r.category_id || ''),
    categoryName: r.category_name || '',
    date: r.date ? String(r.date).slice(0, 10) : '',
    amount: String(r.amount || 0),
    note: r.note || '',
    createdAt: r.created_at || ''
  };
}

// ── Stock calculation ─────────────────────────────────────
function calcStock(allTx) {
  const m = {};
  allTx.forEach(r => {
    const pid = r.productId; if (!pid) return;
    if (!m[pid]) m[pid] = 0;
    const u = num(r.totalUnits);
    if (r.type === 'buy')    m[pid] += u;
    if (r.type === 'give')   m[pid] -= u;
    if (r.type === 'return') m[pid] += u;
    if (r.type === 'damage') m[pid] -= u;
  });
  return m;
}

// ── Bonus summary calculation ─────────────────────────────
async function computeBonusSummary() {
  const { data: prodsRaw } = await supabase.from('products').select('*').order('created_at');
  const { data: txRaw }    = await supabase.from('transactions').select('*').order('created_at');
  const { data: bonusRaw } = await supabase.from('bonus').select('*').order('created_at');

  const prods     = (prodsRaw || []).map(mapProduct);
  const allTx     = (txRaw    || []).map(mapTx);
  const bonusRecs = (bonusRaw || []).map(mapBonus);

  return prods.filter(p => num(p.bonusFreeUnits) > 0).map(p => {
    const cleared = bonusRecs
      .filter(b => String(b.productId) === String(p.id) && b.status === 'cleared' && b.clearedDate)
      .sort((a, b) => String(b.clearedDate).localeCompare(String(a.clearedDate)));
    const lastCleared = cleared.length > 0 ? String(cleared[0].clearedDate) : '';
    const fromDate    = lastCleared || '2000-01-01';
    const txSince     = allTx.filter(r =>
      String(r.productId) === String(p.id) && r.type === 'give' && ds(r.date) > fromDate
    );
    const totalGiven  = txSince.reduce((s, r) => s + num(r.totalUnits), 0);
    const cs          = num(p.caseSize) || 1;
    const bcr         = num(p.bonusCasesReq) || 1;
    const totalCases  = Math.floor(totalGiven / cs);
    const accUnits    = Math.floor(totalCases / bcr) * num(p.bonusFreeUnits);
    const accAmount   = accUnits * num(p.purchasePrice);
    const totalRec    = bonusRecs
      .filter(b => String(b.productId) === String(p.id) && b.status === 'cleared')
      .reduce((s, b) => s + num(b.bonusAmount), 0);
    return {
      productId: p.id, name: p.name, sku: p.sku, thumb: p.thumb || '',
      caseSize: cs, purchasePrice: num(p.purchasePrice),
      bonusFreeUnits: num(p.bonusFreeUnits), bonusCasesReq: bcr,
      fromDate, lastCleared, totalGiven, totalCases,
      accUnits, accAmount, totalReceived: totalRec
    };
  });
}

module.exports = {
  supabase, cors, num, ds, today, now_,
  mapProduct, mapSR, mapTx, mapDmg, mapBonus, mapPayment, mapExpCat, mapExpRecord,
  calcStock, computeBonusSummary
};
