const { supabase, cors, num, now_, mapDue } = require('./_lib/db');
const { randomUUID } = require('crypto');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET — fetch dues for a month or all
    if (req.method === 'GET') {
      const { month } = req.query; // e.g. "2026-04"
      let q = supabase.from('due_calendar').select('*').order('due_date');
      if (month) {
        q = q.gte('due_date', month + '-01').lte('due_date', month + '-31');
      }
      const { data, error } = await q;
      if (error) throw error;
      return res.json({ ok: true, dues: (data || []).map(mapDue) });
    }

    // POST — add a new due entry
    if (req.method === 'POST') {
      const d = req.body;
      if (!d.dueDate || !d.amount) return res.json({ ok: false, error: 'dueDate ও amount প্রয়োজন' });
      const { data, error } = await supabase.from('due_calendar').insert({
        id:         randomUUID(),
        dsr_id:     d.dsrId   || '',
        dsr_name:   d.dsrName || '',
        due_date:   d.dueDate,
        amount:     num(d.amount),
        note:       d.note || '',
        status:     'pending',
        cleared_date: null,
        created_at: now_()
      }).select().single();
      if (error) throw error;
      return res.json({ ok: true, due: mapDue(data) });
    }

    // PUT — mark as cleared (paid) or edit
    if (req.method === 'PUT') {
      const d = req.body;
      if (!d.id) return res.json({ ok: false, error: 'id প্রয়োজন' });
      const updates = {};
      if (d.status === 'cleared') {
        updates.status       = 'cleared';
        updates.cleared_date = new Date().toISOString().slice(0, 10);
      } else if (d.status === 'pending') {
        updates.status       = 'pending';
        updates.cleared_date = null;
      }
      if (d.dueDate)   updates.due_date  = d.dueDate;
      if (d.amount)    updates.amount    = num(d.amount);
      if (d.dsrName)   updates.dsr_name  = d.dsrName;
      if (d.dsrId)     updates.dsr_id    = d.dsrId;
      if (d.note !== undefined) updates.note = d.note;

      const { error } = await supabase.from('due_calendar').update(updates).eq('id', d.id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    // DELETE — remove a due entry
    if (req.method === 'DELETE') {
      const d = req.body;
      if (!d.id) return res.json({ ok: false, error: 'id প্রয়োজন' });
      const { error } = await supabase.from('due_calendar').delete().eq('id', d.id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};
