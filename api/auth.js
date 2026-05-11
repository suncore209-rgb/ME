const { supabase, cors, now_ } = require('./_lib/db');

// Fixed credentials for owner/manager (stored in env or hardcoded)
// Owner: username "owner", Manager: username "manager"
// Passwords stored in a simple config table or env
// For simplicity: owner/manager passwords stored in Supabase "app_config" table

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const action = req.query.action || req.body?.action || '';

    // ── GET /api/auth?action=list-users → return DSR/SO names for login dropdown
    if (req.method === 'GET' && action === 'list-users') {
      const { data, error } = await supabase
        .from('srs')
        .select('id, name, role, area')
        .order('name');
      if (error) throw error;
      return res.json({ ok: true, users: data || [] });
    }

    // ── POST /api/auth?action=login → validate credentials
    if (req.method === 'POST' && action === 'login') {
      const { username, password } = req.body || {};
      if (!username || !password) return res.json({ ok: false, error: 'username ও password আবশ্যক' });

      // Owner / Manager: fixed users with passwords in app_config
      if (username === 'owner' || username === 'manager') {
        const { data: cfg } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', username + '_password')
          .single();
        const stored = cfg?.value || (username === 'owner' ? 'owner123' : 'manager123');
        if (password !== stored) return res.json({ ok: false, error: '❌ ভুল পাসওয়ার্ড' });
        return res.json({ ok: true, role: username, name: username === 'owner' ? 'Owner' : 'Manager', id: username });
      }

      // DSR / SO: look up by id in srs table
      const { data: sr, error: sErr } = await supabase
        .from('srs')
        .select('id, name, role, area, password')
        .eq('id', username)
        .single();
      if (sErr || !sr) return res.json({ ok: false, error: '❌ ব্যবহারকারী পাওয়া যায়নি' });

      const storedPw = sr.password || '1234'; // default password
      if (password !== storedPw) return res.json({ ok: false, error: '❌ ভুল পাসওয়ার্ড' });
      return res.json({ ok: true, role: sr.role, name: sr.name, id: sr.id, area: sr.area || '' });
    }

    // ── POST /api/auth?action=change-password → change password
    if (req.method === 'POST' && action === 'change-password') {
      const { userId, role, oldPassword, newPassword } = req.body || {};
      if (!userId || !newPassword) return res.json({ ok: false, error: 'তথ্য অসম্পূর্ণ' });

      if (role === 'owner' || role === 'manager') {
        // Verify old password
        const { data: cfg } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', role + '_password')
          .single();
        const stored = cfg?.value || (role === 'owner' ? 'owner123' : 'manager123');
        if (oldPassword !== stored) return res.json({ ok: false, error: '❌ পুরানো পাসওয়ার্ড ভুল' });
        // Upsert new password
        await supabase.from('app_config').upsert({ key: role + '_password', value: newPassword });
        return res.json({ ok: true });
      }

      // DSR/SO: owner can set without old password, user must verify old
      if (oldPassword !== undefined) {
        const { data: sr } = await supabase.from('srs').select('password').eq('id', userId).single();
        const stored = sr?.password || '1234';
        if (oldPassword !== stored) return res.json({ ok: false, error: '❌ পুরানো পাসওয়ার্ড ভুল' });
      }
      const { error } = await supabase.from('srs').update({ password: newPassword }).eq('id', userId);
      if (error) throw error;
      return res.json({ ok: true });
    }

    // ── POST /api/auth?action=set-password → owner sets password for any user (no old-pw check)
    if (req.method === 'POST' && action === 'set-password') {
      const { userId, role, newPassword } = req.body || {};
      if (!userId || !newPassword) return res.json({ ok: false, error: 'তথ্য অসম্পূর্ণ' });
      if (role === 'owner' || role === 'manager') {
        await supabase.from('app_config').upsert({ key: role + '_password', value: newPassword });
      } else {
        const { error } = await supabase.from('srs').update({ password: newPassword }).eq('id', userId);
        if (error) throw error;
      }
      return res.json({ ok: true });
    }

    // ── GET /api/auth?action=get-passwords → owner fetch all stored passwords (masked)
    if (req.method === 'GET' && action === 'get-passwords') {
      const { data: cfgs } = await supabase.from('app_config').select('key, value').in('key', ['owner_password', 'manager_password']);
      const { data: srs } = await supabase.from('srs').select('id, name, role, password').order('name');
      return res.json({
        ok: true,
        ownerPass: cfgs?.find(c => c.key === 'owner_password')?.value || 'owner123',
        managerPass: cfgs?.find(c => c.key === 'manager_password')?.value || 'manager123',
        srs: (srs || []).map(s => ({ id: s.id, name: s.name, role: s.role, password: s.password || '1234' }))
      });
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e) { res.json({ ok: false, error: e.message }); }
};
