const { supabase, cors } = require('./_lib/db');
const crypto = require('crypto');

function hashPw(pw) {
  return crypto.createHash('sha256').update(String(pw) + 'axiion_salt_v9').digest('hex');
}

function mapUser(r) {
  return {
    id:           String(r.id || ''),
    name:         r.name || '',
    role:         r.role || '',
    srId:         String(r.sr_id || ''),
    supervisorId: String(r.supervisor_id || ''),
    createdAt:    r.created_at || ''
  };
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const action = req.query.action || (req.body && req.body.action) || '';

    // ── LOGIN ──────────────────────────────────────────────
    if (action === 'login') {
      const pw = String((req.body && req.body.password) || '').trim();
      if (!pw) return res.json({ ok: false, error: 'পাসওয়ার্ড দিন' });
      const hash = hashPw(pw);
      const { data, error } = await supabase
        .from('app_users').select('*').eq('password', hash).maybeSingle();
      if (error || !data) return res.json({ ok: false, error: 'ভুল পাসওয়ার্ড' });
      return res.json({
        ok: true,
        role:         data.role,
        name:         data.name,
        srId:         data.sr_id || '',
        supervisorId: data.supervisor_id || '',
        userId:       String(data.id)
      });
    }

    // ── LIST USERS ─────────────────────────────────────────
    if (action === 'list') {
      const { data } = await supabase
        .from('app_users')
        .select('id,name,role,sr_id,supervisor_id,created_at')
        .order('created_at');
      return res.json((data || []).map(mapUser));
    }

    // ── CREATE USER ────────────────────────────────────────
    if (action === 'create') {
      const d = req.body || {};
      if (!d.name || !d.role || !d.password)
        return res.json({ ok: false, error: 'নাম, ভূমিকা ও পাসওয়ার্ড দিন' });
      if (String(d.password).length < 4)
        return res.json({ ok: false, error: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষর' });
      const hash = hashPw(d.password);
      const { data, error } = await supabase.from('app_users').insert({
        name:          String(d.name).trim(),
        role:          d.role,
        password:      hash,
        sr_id:         d.srId || '',
        supervisor_id: d.supervisorId || ''
      }).select().single();
      if (error) throw error;
      return res.json({ ok: true, id: data.id });
    }

    // ── RESET PASSWORD (owner resets any user) ─────────────
    if (action === 'reset') {
      const d = req.body || {};
      if (!d.id || !d.password)
        return res.json({ ok: false, error: 'id ও পাসওয়ার্ড দিন' });
      if (String(d.password).length < 4)
        return res.json({ ok: false, error: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষর' });
      const hash = hashPw(d.password);
      const { error } = await supabase.from('app_users').update({ password: hash }).eq('id', d.id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    // ── CHANGE OWN PASSWORD ────────────────────────────────
    if (action === 'change') {
      const d = req.body || {};
      if (!d.userId || !d.oldPassword || !d.newPassword)
        return res.json({ ok: false, error: 'পুরোনো ও নতুন পাসওয়ার্ড দিন' });
      if (String(d.newPassword).length < 4)
        return res.json({ ok: false, error: 'নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষর' });
      const oldHash = hashPw(d.oldPassword);
      const { data: u } = await supabase.from('app_users')
        .select('id').eq('id', d.userId).eq('password', oldHash).maybeSingle();
      if (!u) return res.json({ ok: false, error: 'পুরোনো পাসওয়ার্ড ভুল' });
      const newHash = hashPw(d.newPassword);
      const { error } = await supabase.from('app_users').update({ password: newHash }).eq('id', d.userId);
      if (error) throw error;
      return res.json({ ok: true });
    }

    // ── DELETE USER ────────────────────────────────────────
    if (action === 'delete') {
      const id = (req.body && req.body.id) || req.query.id;
      if (!id) return res.json({ ok: false, error: 'id দিন' });
      const { error } = await supabase.from('app_users').delete().eq('id', id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    // ── ASSIGN SUPERVISOR (SO assigns DSR) ─────────────────
    if (action === 'assign') {
      const d = req.body || {};
      if (!d.dsrUserId) return res.json({ ok: false, error: 'dsrUserId দিন' });
      const { error } = await supabase.from('app_users')
        .update({ supervisor_id: d.supervisorId || '' }).eq('id', d.dsrUserId);
      if (error) throw error;
      return res.json({ ok: true });
    }

    res.status(400).json({ ok: false, error: 'Unknown action: ' + action });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
