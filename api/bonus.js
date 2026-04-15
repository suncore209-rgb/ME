const { cors, computeBonusSummary } = require('./_lib/db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const summary = await computeBonusSummary();
    res.json(summary);
  } catch (e) {
    res.json([]);
  }
};
