module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    const { data, error } = await supabase
      .from('user_passwords')
      .select('count')
      .limit(1);
    res.json({ 
      ok: true, 
      error: error ? error.message : null,
      data: data 
    });
  } catch(e) {
    res.json({ ok: false, crash: e.message, stack: e.stack });
  }
};
