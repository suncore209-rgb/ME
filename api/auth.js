const { supabase, cors } = require('./_lib/db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // POST: validate password → return role + user info
    if (req.method === 'POST') {
      const { password } = req.body || {};
      if (!password) return res.json({ ok: false, error: 'পাসওয়ার্ড দিন' });

      const { data, error } = await supabase
        .from('user_passwords')
        .select('*')
        .eq('password', String(password).trim())
        .limit(1);

      if (error) throw error;
      if (!data || !data.length) return res.json({ ok: false, error: 'ভুল পাসওয়ার্ড' });

      const u = data[0];
      return res.json({
        ok: true,
        role:     u.role,
        userId:   u.user_key,
        userName: u.user_name
      });
    }

    // GET: list all users (for owner's password manager)
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('user_passwords')
        .select('user_key,user_name,role,password')
        .order('created_at');
      if (error) throw error;
      return res.json({ ok: true, users: data || [] });
    }

    // PUT: change/set passwords
    if (req.method === 'PUT') {
      const d = req.body || {};

      // User changing own password (requires old password)
      if (d.action === 'change') {
        const { data: existing } = await supabase
          .from('user_passwords')
          .select('id')
          .eq('user_key', d.userKey)
          .eq('password', String(d.oldPass || '').trim())
          .limit(1);
        if (!existing || !existing.length)
          return res.json({ ok: false, error: 'পুরানো পাসওয়ার্ড ভুল' });
        const { error } = await supabase
          .from('user_passwords')
          .update({ password: String(d.newPass).trim() })
          .eq('user_key', d.userKey);
        if (error) throw error;
        return res.json({ ok: true });
      }

      // Owner setting any user's password (no old pass needed)
      if (d.action === 'owner_set') {
        const { error } = await supabase
          .from('user_passwords')
          .update({ password: String(d.newPass).trim() })
          .eq('user_key', d.userKey);
        if (error) throw error;
        return res.json({ ok: true });
      }

      // Create or update a user entry (called when DSR/SO is enrolled)
      if (d.action === 'upsert') {
        const { error } = await supabase
          .from('user_passwords')
          .upsert({
            user_key:  String(d.userKey),
            user_name: String(d.userName || ''),
            role:      String(d.role || 'dsr'),
            password:  String(d.password || '0000')
          }, { onConflict: 'user_key' });
        if (error) throw error;
        return res.json({ ok: true });
      }

      // Delete a user entry (when DSR/SO is removed)
      if (d.action === 'delete') {
        const { error } = await supabase
          .from('user_passwords')
          .delete()
          .eq('user_key', d.userKey);
        if (error) throw error;
        return res.json({ ok: true });
      }

      return res.json({ ok: false, error: 'অজানা action' });
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};
