// Timesheets HCP extract (run in a pro.housecallpro.com tab). Input: window.__TS = {from:'YYYY-MM-DD', to:'YYYY-MM-DD', pros:{pro_uuid: person_id}, fix:{entryId:{start?,end?,note}}}
// Output: window.__TSOUT = [{id, person_id, work_date, job_no, customer, dept, start_t, end_t, note, flag}] ; returns a short summary.
(async () => {
  const T = window.__TS, tz = 'America/Vancouver';
  const get = async (u) => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); };
  const loc = (iso) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso)).map(x => [x.type, x.value])); return { d: `${p.year}-${p.month}-${p.day}`, t: `${p.hour}:${p.minute}` }; };
  let jobs = []; for (let p = 1; p < 40; p++) { const j = await get('/alpha/jobs?page=' + p + '&page_size=100'); const d = j.data.data; if (!d || !d.length) break; jobs = jobs.concat(d); }
  const BU = { buu_7a62: 'I', buu_9f77: 'S', buu_ce1d: 'M' }, cust = {}, out = [], flags = [];
  const isStart = (t) => t === 'on_the_way' || t === 'job_time_started';
  const isEnd = (t) => /stop|finish|complete|pause/.test(t);
  for (const j of jobs) {
    for (const tr of (j.pro_time_trackers?.data || [])) {
      const person = T.pros[tr.pro_uuid]; if (!person) continue;
      const ev = (tr.time_tracking_history?.data || []).slice().sort((a, b) => a.timestamp < b.timestamp ? -1 : 1);
      const runs = []; let cur = null;
      for (const e of ev) {
        if (isStart(e.type)) { if (!cur) cur = { s: e.timestamp, omw: e.type === 'on_the_way' ? e.timestamp : null, st: e.type === 'job_time_started' ? e.timestamp : null, notes: [] }; else if (e.type === 'job_time_started' && !cur.st) cur.st = e.timestamp; }
        else if (isEnd(e.type) && cur) { cur.e = e.timestamp; runs.push(cur); cur = null; }
        if (e.note && cur) cur.notes.push(e.note); else if (e.note && runs.length) runs[runs.length - 1].notes.push(e.note);
      }
      if (cur) { cur.open = true; runs.push(cur); }
      runs.forEach((r, i) => {
        const a = loc(r.s); if (a.d < T.from || a.d > T.to) return;
        const id = tr.id + ':' + i; const fx = (T.fix || {})[id] || {};
        let endIso = r.e || new Date().toISOString(); const b = loc(endIso);
        const f = [];
        if (r.open) f.push('timer still running');
        if (b.d !== a.d) f.push('runs past midnight');
        const hrs = (new Date(endIso) - new Date(r.s)) / 3.6e6;
        if (hrs > 10) f.push('over 10 h in one run');
        if (r.omw && r.st && (new Date(r.st) - new Date(r.omw)) > 2 * 3.6e6) f.push('long travel (' + ((new Date(r.st) - new Date(r.omw)) / 3.6e6).toFixed(1) + ' h on my way)');
        if (r.st && r.e && (new Date(r.e) - new Date(r.st)) < 120000 && r.omw) f.push('job timer started and paused within 2 min');
        const edits = (tr.edit_history?.data || []).filter(e => loc(e.timestamp).d >= T.from && loc(e.timestamp).d <= T.to);
        if (edits.length) f.push('HCP total edited (' + edits.map(e => (e.duration_seconds / 3600).toFixed(2) + ' h').join(', ') + ')');
        out.push({ id, person_id: person, work_date: a.d, job_no: j.invoice_number, customer_id: j.customer_id, job_id: j.id, start_t: fx.start || a.t, end_t: fx.end || (b.d !== a.d ? '23:59' : b.t), note: [fx.note, ...r.notes].filter(Boolean).join(' | ') || null, flag: f.join('; ') || null });
      });
    }
  }
  for (const o of out) {
    if (!(o.customer_id in cust)) { try { const c = await get('/alpha/customers/' + o.customer_id); cust[o.customer_id] = ((c.first_name || '') + ' ' + (c.last_name || '')).trim() || c.company || ''; } catch (e) { cust[o.customer_id] = ''; } }
    o.customer = cust[o.customer_id];
    try { const an = await (await fetch('/alpha/jobs/' + o.job_id + '/analytics', { headers: { Accept: 'application/json' } })).text(); o.dept = BU[(an.match(/buu_[0-9a-f]{4}/) || [''])[0]] || 'S'; if (!(an.match(/buu_[0-9a-f]{4}/))) o.flag = (o.flag ? o.flag + '; ' : '') + 'no business unit on the job (set to Service)'; } catch (e) { o.dept = 'S'; }
    delete o.customer_id; delete o.job_id;
  }
  window.__TSOUT = out;
  // delta vs what HQ already has (T.known = {id: sig}); one line per change: U~id~personKey~date~job~customer~dept~start~end~note~flag  or  D~id
  const cl = (s) => (s || '').replace(/[~\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
  const sig = (o) => fnv([o.start_t, o.end_t, o.dept, o.job_no, cl(o.flag), cl(o.note)].join('|'));
  const known = Object.fromEntries(Object.entries(T.known || {}).map(([k, v]) => ['ptt_' + k, v])), seen = new Set(), lines = [];
  for (const o of out) { seen.add(o.id); if (known[o.id] !== sig(o)) lines.push(['U', o.id, o.person_id.slice(0, 8), o.work_date, o.job_no, o.customer, o.dept, o.start_t, o.end_t, cl(o.note), cl(o.flag)].join('~')); }
  for (const id of Object.keys(known)) if (!seen.has(id)) lines.push('D~' + id);
  window.__TSD = lines.join('\n');
  return out.length + ' entries; ' + lines.length + ' changes; ' + window.__TSD.length + ' chars (read window.__TSD in 900-char slices)';
})()
