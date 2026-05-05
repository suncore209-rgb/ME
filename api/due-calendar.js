const { supabase, cors, num, now_, mapDue } = require('./_lib/db');
const { randomUUID } = require('crypto');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET ── fetch dues for a month (or all), plus payment history
    if (req.method === 'GET') {
      const { month, id: fetchId } = req.query;

      // Fetch payment history for a single due
      if (fetchId) {
        const { data, error } = await supabase
          .from('due_payments')
          .select('*')
          .eq('due_id', fetchId)
          .order('paid_date');
        if (error) throw error;
        return res.json({ ok: true, payments: (data || []).map(mapDuePayment) });
      }

      // Fetch dues for month
      let q = supabase.from('due_calendar').select('*').order('due_date');
      if (month) {
        const [calY, calM] = month.split('-').map(Number);
        const lastDay  = new Date(calY, calM, 0).getDate();
        const lastDate = month + '-' + String(lastDay).padStart(2, '0');
        q = q.gte('due_date', month + '-01').lte('due_date', lastDate);
      }
      const { data, error } = await q;
      if (error) throw error;
      return res.json({ ok: true, dues: (data || []).map(mapDue) });
    }

    // ── POST ── add a new due entry OR record a payment
    if (req.method === 'POST') {
      const d = req.body;

      // Record a partial/full payment
      if (d.action === 'pay') {
        if (!d.id || !d.payAmount) return res.json({ ok: false, error: 'id ও payAmount প্রয়োজন' });
        const payAmt = num(d.payAmount);
        if (payAmt <= 0) return res.json({ ok: false, error: 'পরিমাণ শূন্যের বেশি হতে হবে' });

        // Fetch current due
        const { data: due, error: fe } = await supabase
          .from('due_calendar').select('*').eq('id', d.id).single();
        if (fe) throw fe;

        const totalAmt   = num(due.amount);
        const alreadyPaid = num(due.paid_amount);
        const remaining  = totalAmt - alreadyPaid;

        if (payAmt > remaining + 0.01) {
          return res.json({ ok: false, error: 'পরিশোধের পরিমাণ বাকির চেয়ে বেশি হতে পারবে না (বাকি: ৳' + remaining + ')' });
        }

        const newPaid  = Math.min(alreadyPaid + payAmt, totalAmt);
        const newStatus = newPaid >= totalAmt ? 'cleared' : 'partial';

        // Insert payment record
        const { error: pie } = await supabase.from('due_payments').insert({
          id:         randomUUID(),
          due_id:     d.id,
          paid_date:  d.paidDate || new Date().toISOString().slice(0, 10),
          amount:     payAmt,
          note:       d.note || '',
          created_at: now_()
        });
        if (pie) throw pie;

        // Update due record
        const updates = { paid_amount: newPaid, status: newStatus };
        if (newStatus === 'cleared') {
          updates.cleared_date = new Date().toISOString().slice(0, 10);
        }
        const { error: ue } = await supabase
          .from('due_calendar').update(updates).eq('id', d.id);
        if (ue) throw ue;

        return res.json({ ok: true, status: newStatus, paidAmount: newPaid, remaining: totalAmt - newPaid });
      }

      // Add new due entry
      if (!d.dueDate || !d.amount) return res.json({ ok: false, error: 'dueDate ও amount প্রয়োজন' });
      const { data, error } = await supabase.from('due_calendar').insert({
        id:           randomUUID(),
        dsr_id:       d.dsrId   || '',
        dsr_name:     d.dsrName || '',
        due_date:     d.dueDate,
        amount:       num(d.amount),
        paid_amount:  0,
        note:         d.note || '',
        status:       'pending',
        cleared_date: null,
        created_at:   now_()
      }).select().single();
      if (error) throw error;
      return res.json({ ok: true, due: mapDue(data) });
    }

    // ── PUT ── edit due or reset status
    if (req.method === 'PUT') {
      const d = req.body;
      if (!d.id) return res.json({ ok: false, error: 'id প্রয়োজন' });

      const updates = {};

      if (d.status === 'cleared') {
        const { data: due } = await supabase.from('due_calendar').select('amount').eq('id', d.id).single();
        updates.status       = 'cleared';
        updates.paid_amount  = num(due?.amount || 0);
        updates.cleared_date = new Date().toISOString().slice(0, 10);
      } else if (d.status === 'pending') {
        updates.status       = 'pending';
        updates.paid_amount  = 0;
        updates.cleared_date = null;
        await supabase.from('due_payments').delete().eq('due_id', d.id);
      }

      if (d.dueDate)             updates.due_date = d.dueDate;
      if (d.amount)              updates.amount   = num(d.amount);
      if (d.dsrName)             updates.dsr_name = d.dsrName;
      if (d.dsrId)               updates.dsr_id   = d.dsrId;
      if (d.note !== undefined)  updates.note     = d.note;

      const { error } = await supabase.from('due_calendar').update(updates).eq('id', d.id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    // ── DELETE ── remove a due entry (and its payment history)
    if (req.method === 'DELETE') {
      const d = req.body;
      if (!d.id) return res.json({ ok: false, error: 'id প্রয়োজন' });
      await supabase.from('due_payments').delete().eq('due_id', d.id);
      const { error } = await supabase.from('due_calendar').delete().eq('id', d.id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};

function mapDuePayment(r) {
  return {
    id:        String(r.id || ''),
    dueId:     String(r.due_id || ''),
    paidDate:  r.paid_date ? String(r.paid_date).slice(0, 10) : '',
    amount:    String(r.amount || 0),
    note:      r.note || '',
    createdAt: r.created_at || ''
  };
}
