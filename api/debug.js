module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    SUPABASE_URL:         process.env.SUPABASE_URL         ? '✅ ' + process.env.SUPABASE_URL.slice(0,30) : '❌ MISSING',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY  ? '✅ found' : '❌ MISSING',
    SUPABASE_ANON_KEY:    process.env.SUPABASE_ANON_KEY     ? '✅ found' : '❌ MISSING',
  });
};
