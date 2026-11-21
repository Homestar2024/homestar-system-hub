// Homestar HQ - Timesheets (v2 2026-11-20: instant filing via Microsoft Graph; v1 same day, Calvin). mountTimesheets(root, {sb, me, people})
// Data: time_entries (HCP time, synced by Claude), pay_periods, timesheets (sent/filed), bank_ledger (banked hours vault).
// Rules (Timesheets\00 TIMESHEETS README.md): start = first of On my way / Time started; each row rounds to 0.1 h (Excel ROUND half up);
// never over 80 h: the excess is trimmed off rows on the longest days and BANKED at 1.5x; under 80 h with a bank balance -> offer to draw.
const DEPT = { I: 'Install', S: 'Service', M: 'Maintenance', O: 'Office' };
const DEPT_X = { I: 'I - Install', S: 'S - Service', M: 'M - Maintenance', O: 'O - Office' };
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mins = (t) => { const [h, m] = String(t).slice(0, 5).split(':').map(Number); return h * 60 + m; };
const hm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const t12 = (t) => { const m = mins(t); const h = Math.floor(m / 60); return ((h % 12) || 12) + ':' + String(m % 60).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); };
const rh = (m) => Math.round(m / 6) / 10;                 // row hours, 0.1 h half up (exact on whole minutes)
const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
const D = (iso) => new Date(iso + 'T12:00:00');
const fmtD = (iso, o) => D(iso).toLocaleDateString('en-CA', o || { weekday: 'short', month: 'short', day: 'numeric' });
const addDays = (iso, n) => { const d = D(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver' }).format(new Date());
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const fileName = (first, p) => { const pd = D(p.pay_date), s = D(p.start_date), e = D(p.end_date);
  return `${first} ${MONL[pd.getMonth()]} ${pd.getDate()}, ${pd.getFullYear()} - ${MON[s.getMonth()]} ${s.getDate()} - ${MON[e.getMonth()]} ${e.getDate()}.xlsx`; };
export const folderOf = (p) => { const pd = D(p.pay_date); return `Harlow Bookkeeping\\Timesheets\\${pd.getFullYear()}\\${String(pd.getMonth() + 1).padStart(2, '0')}. ${MONL[pd.getMonth()]}`; };

// Pure: build the timesheet from entries. Returns rows (sorted), totals, and the >80 trim plan.
export function build(entries, cap = 80) {
  const rows = entries.map(e => ({ id: e.id, date: e.work_date, job: e.job_no, customer: e.customer || '', dept: e.dept, s: mins(e.start_t), e: mins(e.end_t), note: e.note || '', flag: e.flag || '' }))
    .filter(r => r.e > r.s).sort((a, b) => (a.date + hm(a.s)).localeCompare(b.date + hm(b.s)));
  const tot = (rs) => Math.round(rs.reduce((a, r) => a + rh(r.e - r.s) * 10, 0)) / 10;
  const raw = tot(rows); const bank = [];
  if (raw > cap) {
    let need = Math.round((raw - cap) * 10);               // tenths of an hour
    const day = (d) => rows.filter(r => r.date === d).reduce((a, r) => a + rh(r.e - r.s), 0);
    const pass = (onlyLong) => {
      while (need > 0) {
        const days = [...new Set(rows.map(r => r.date))].map(d => [d, day(d)]).filter(([, h]) => !onlyLong || h > 8.0001).sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]));
        if (!days.length) return;
        const [d, h] = days[0]; const room = onlyLong ? Math.round((h - 8) * 10) : need;
        const r = rows.filter(x => x.date === d && rh(x.e - x.s) > 0.1).sort((a, b) => b.e - a.e)[0]; if (!r) return;
        const take = Math.min(need, room, Math.round(rh(r.e - r.s) * 10) - 1); if (take <= 0) return;
        const before = r.e; r.e -= take * 6; need -= take;
        bank.push({ date: d, job: r.job, customer: r.customer, dept: r.dept, hours: take / 10, from: hm(before), to: hm(r.e) });
      }
    };
    pass(true); pass(false);
  }
  const byDept = { I: 0, S: 0, M: 0, O: 0 }; rows.forEach(r => byDept[r.dept] = Math.round((byDept[r.dept] + rh(r.e - r.s)) * 10) / 10);
  return { rows, raw, total: tot(rows), byDept, bank };
}

const CSS = `
:host{display:block;color:var(--ink);font-family:var(--body);font-size:15px;line-height:1.45}
*{box-sizing:border-box}
h2{font-family:var(--display);font-size:26px;margin:4px 0 2px}h3{font-family:var(--display);font-size:18px;margin:0 0 8px}
.muted{color:var(--muted)}.small{font-size:13px}
a.back{color:var(--brand);text-decoration:none;font-weight:600}
.tabs{display:flex;gap:6px;margin:12px 0;flex-wrap:wrap}
.tabs button{font:inherit;font-weight:600;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:999px;padding:8px 14px;cursor:pointer;min-height:40px}
.tabs button[aria-pressed=true]{background:var(--brand);border-color:var(--brand);color:var(--accent-ink)}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px;min-width:0;margin-bottom:12px;max-width:1100px}
.hello{font-family:var(--display);font-size:22px;font-weight:600}
.row2{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:10px}
label.f{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--muted);min-width:0}
select,input{font:inherit;font-size:16px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:9px 10px;width:100%;min-width:0}
.btn{font:inherit;font-weight:700;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:10px;padding:11px 18px;cursor:pointer;min-height:44px}
.btn.pri{background:var(--brand);border-color:var(--brand);color:var(--accent-ink)}
.btn.go{background:var(--brand2);border-color:var(--brand2);color:#1a1200;font-size:17px;width:100%;margin-top:12px}
.btn[disabled]{opacity:.5;cursor:default}
.acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin:8px 0}
.tile{background:var(--sunk);border-radius:10px;padding:10px}.tile b{display:block;font-family:var(--display);font-size:24px}.tile span{font-size:12px;color:var(--muted)}
.tile.big{background:var(--brand);color:var(--accent-ink)}.tile.big span{color:inherit;opacity:.85}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}
table{border-collapse:collapse;width:100%;min-width:560px;font-size:14px}
th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.03em}
td.n,th.n{text-align:right;white-space:nowrap}
tr.day td{background:var(--sunk);font-weight:700}
tr.day td .dh{float:right}
.pill{display:inline-block;border-radius:999px;padding:1px 8px;font-size:12px;font-weight:700;background:var(--sunk)}
.pill.I{background:#dbe7ff;color:#123e9c}.pill.S{background:#ffe9d2;color:#8a4500}.pill.M{background:#d9f3e6;color:#1d6b45}.pill.O{background:#e9e4ff;color:#4b3aa6}
.flag{color:var(--warn);font-size:12.5px;margin-top:2px}.note{color:var(--muted);font-size:12.5px;margin-top:2px}
.trim{color:var(--hot);font-size:12.5px}
.warn{border:1px solid var(--warn);background:color-mix(in srgb,var(--warn) 12%,transparent);border-radius:10px;padding:10px 12px;margin:10px 0}
.good{border:1px solid var(--ok);background:color-mix(in srgb,var(--ok) 12%,transparent);border-radius:10px;padding:10px 12px;margin:10px 0}
.bankbox{border:1px solid var(--brand);background:color-mix(in srgb,var(--brand) 10%,transparent);border-radius:10px;padding:12px;margin:10px 0}
.load{display:flex;flex-direction:column;align-items:center;gap:14px;padding:34px 10px;text-align:center}
.logo{position:relative;width:110px;height:110px}
.logo img{position:absolute;inset:18px;width:74px;height:74px;animation:pulse 1.4s ease-in-out infinite}
.logo svg{position:absolute;inset:0;animation:spin 1.6s linear infinite}
.logo svg circle{fill:none;stroke:var(--brand2);stroke-width:6;stroke-linecap:round;stroke-dasharray:90 250}
.steps{font-family:var(--display);font-size:19px;min-height:28px}
.bar{width:220px;height:6px;border-radius:6px;background:var(--sunk);overflow:hidden}.bar i{display:block;height:100%;background:var(--brand);width:0;transition:width .5s}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{50%{transform:scale(1.08)}}
@keyframes pop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
.done{font-size:46px;animation:pop .35s ease-out}
.modal{position:fixed;inset:0;background:rgba(10,14,25,.55);display:grid;place-items:center;padding:16px;z-index:50}
.sheet{background:var(--surface);color:var(--ink);border-radius:14px;padding:18px;max-width:420px;width:100%;border:1px solid var(--line)}
.stepper{display:flex;gap:8px;align-items:center;margin:10px 0}.stepper input{text-align:center;font-size:22px;font-weight:700}
.stepper button{width:48px;height:48px;font-size:22px;flex:none}
.err{color:var(--hot);font-weight:600;margin-top:6px}
br.mob,span.mob{display:none}
@media(max-width:600px){.btn{flex:1}.dc{display:none}span.mob{display:inline-block;margin-top:3px}br.mob{display:inline}table{min-width:0}th,td{padding:7px 5px}}
`;

export function mountTimesheets(root, { sb, me, people }) {
  const all = !!me.sees_all_timesheets;
  const team = (people || []).filter(p => p.active !== false && (all || p.id === me.id));
  const first = (p) => (p?.name || '').split(' ')[0];
  const S = { fileErr: '', fileStep: '', tab: 'gen', person: me.id, period: null, periods: [], phase: 'pick', res: null, draw: null, bal: 0, ledger: [], err: '', sheet: null, synced: null };
  root.innerHTML = `<style>${CSS}</style><a class="back" href="#/tools">← Tools</a><h2>Timesheets</h2><div id="tabs" class="tabs"></div><div id="body"></div><div id="modal"></div>`;
  const body = root.getElementById('body'), tabsEl = root.getElementById('tabs'), modal = root.getElementById('modal');
  let dead = false, poll = null;
  const personName = (id) => (people.find(p => p.id === id) || {}).name || 'Someone';

  function drawTabs() {
    tabsEl.innerHTML = [['gen', 'Generate'], ['hist', 'History'], ['bank', 'Banked hours']].map(([k, l]) => `<button aria-pressed="${S.tab === k}" data-tab="${k}">${l}</button>`).join('');
  }
  tabsEl.onclick = (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; S.tab = b.dataset.tab; drawTabs(); draw(); };

  async function loadPeriods() {
    const { data, error } = await sb.from('pay_periods').select('*').order('start_date');
    if (error) throw error; S.periods = data || [];
    const lim = addDays(todayIso(), 1); const past = S.periods.filter(p => p.end_date <= lim);
    S.period = (past[past.length - 1] || S.periods[0] || {}).start_date;
  }
  const P = () => S.periods.find(p => p.start_date === S.period);
  async function loadBank(pid) {
    const { data } = await sb.from('bank_ledger').select('*').eq('person_id', pid).order('created_at');
    S.ledger = data || []; S.bal = Math.round(S.ledger.reduce((a, l) => a + Number(l.hours), 0) * 100) / 100;
  }
  async function loadSheet(pid, start) {
    const { data } = await sb.from('timesheets').select('*').eq('person_id', pid).eq('period_start', start).maybeSingle();
    S.sheet = data || null;
  }

  // ---------- Generate ----------
  function drawPick() {
    const p = P(); const who = people.find(x => x.id === S.person) || me;
    const opts = S.periods.slice().reverse().filter(x => x.start_date <= addDays(todayIso(), 14)).slice(0, 30)
      .map(x => `<option value="${x.start_date}" ${x.start_date === S.period ? 'selected' : ''}>${fmtD(x.start_date, { month: 'short', day: 'numeric' })} – ${fmtD(x.end_date, { month: 'short', day: 'numeric', year: 'numeric' })}  (paid ${fmtD(x.pay_date, { month: 'short', day: 'numeric' })})</option>`).join('');
    body.innerHTML = `<div class="card"><div class="hello">Welcome, ${esc(first(me))} 👋</div>
      <div class="muted">${S.person === me.id ? "Let's build your timesheet." : `Building ${esc(first(who))}'s timesheet.`} I've picked the pay period for today; change it if you need a different one.</div>
      <div class="row2">${all ? `<label class="f">Employee<select data-person>${team.map(t => `<option value="${t.id}" ${t.id === S.person ? 'selected' : ''}>${esc(t.name)}${t.id === me.id ? ' (you)' : ''}</option>`).join('')}</select></label>` : ''}
        <label class="f">Pay period<select data-period>${opts}</select></label></div>
      ${p ? `<div class="small muted" style="margin-top:8px">Sat ${fmtD(p.start_date, { month: 'short', day: 'numeric' })} to Fri ${fmtD(p.end_date, { month: 'short', day: 'numeric' })} · payday ${fmtD(p.pay_date, { weekday: 'long', month: 'short', day: 'numeric' })}</div>` : ''}
      ${S.sheet && S.sheet.status === 'filed' ? `<div class="good">Already filed ${new Date(S.sheet.filed_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}: <b>${esc(S.sheet.file_name)}</b>. See History.</div>` : ''}
      <button class="btn go" data-go>Generate timesheet</button>
      ${S.err ? `<div class="err">${esc(S.err)}</div>` : ''}</div>`;
  }
  async function generate() {
    S.err = ''; S.phase = 'load'; const steps = ['Reading Housecall Pro time…', 'Checking notes and corrections…', 'Applying the 80-hour rule…', 'Checking your banked hours…', 'Building your timesheet…'];
    body.innerHTML = `<div class="card load"><div class="logo"><svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="48"/></svg><img src="./icon-192.png" alt=""></div><div class="steps" id="st">${steps[0]}</div><div class="bar"><i id="bar"></i></div></div>`;
    const st = root.getElementById('st'), bar = root.getElementById('bar'); let i = 0;
    const tick = setInterval(() => { i = Math.min(i + 1, steps.length - 1); if (st) st.textContent = steps[i]; if (bar) bar.style.width = (20 + i * 20) + '%'; }, 650);
    const p = P();
    const [q] = await Promise.all([
      sb.from('time_entries').select('*').eq('person_id', S.person).gte('work_date', p.start_date).lte('work_date', p.end_date),
      loadBank(S.person), loadSheet(S.person, p.start_date), new Promise(r => setTimeout(r, 3300))]);
    clearInterval(tick); if (dead) return;
    if (q.error) { S.phase = 'pick'; S.err = "Couldn't read the time entries: " + q.error.message; return draw(); }
    const { data: sy } = await sb.from('time_entries').select('synced_at').eq('person_id', S.person).order('synced_at', { ascending: false }).limit(1);
    S.synced = sy && sy[0] ? sy[0].synced_at : null;
    S.res = build(q.data || []); S.draw = null; S.noDraw = false; S.phase = 'res';
    body.innerHTML = `<div class="card load"><div class="done">✅</div><div class="steps">Timesheet ready</div></div>`;
    setTimeout(() => { if (!dead) draw(); }, 900);
  }
  function drawRows(addRows) {
    const r = S.res; const rows = [...r.rows.map(x => ({ ...x })), ...(addRows || [])].sort((a, b) => (a.date + hm(a.s)).localeCompare(b.date + hm(b.s)));
    const days = [...new Set(rows.map(x => x.date))];
    return `<div class="scroll"><table><thead><tr><th>Job #</th><th>Customer</th><th class="dc">Dept</th><th>Start – End</th><th class="n">Hours</th></tr></thead><tbody>${days.map(d => {
      const rs = rows.filter(x => x.date === d); const dh = rs.reduce((a, x) => a + rh(x.e - x.s), 0);
      return `<tr class="day"><td colspan="5">${fmtD(d, { weekday: 'long', month: 'short', day: 'numeric' })}<span class="dh">${f1(dh)} h${dh > 10.0001 ? ' ⚠ over 10' : ''}</span></td></tr>` + rs.map(x => {
        const tr = r.bank.filter(b => b.date === d && b.job === x.job && b.to === hm(x.e));
        return `<tr><td style="white-space:nowrap">${esc(x.job)}${x.drawn ? ' <span class="pill">banked</span>' : ''}</td><td>${esc(x.customer)} <span class="pill ${x.dept} mob">${DEPT[x.dept]}</span>${x.flag ? `<div class="flag">⚑ ${esc(x.flag)}</div>` : ''}${x.note ? `<div class="note">${esc(x.note)}</div>` : ''}${tr.map(b => `<div class="trim">−${f1(b.hours)} h moved to the bank (ended ${t12(b.from)} → ${t12(b.to)})</div>`).join('')}</td><td class="dc"><span class="pill ${x.dept}">${DEPT[x.dept]}</span></td><td style="white-space:nowrap">${t12(hm(x.s))} –<br class="mob"> ${t12(hm(x.e))}</td><td class="n">${f1(rh(x.e - x.s))}</td></tr>`;
      }).join('');
    }).join('')}</tbody></table></div>`;
  }
  function finalRows() {
    const add = (S.draw && S.draw.rows) || [];
    return [...S.res.rows, ...add].sort((a, b) => (a.date + hm(a.s)).localeCompare(b.date + hm(b.s)));
  }
  function totals(rows) { const byDept = { I: 0, S: 0, M: 0, O: 0 }; rows.forEach(r => byDept[r.dept] = Math.round((byDept[r.dept] + rh(r.e - r.s)) * 10) / 10); return { byDept, total: Math.round(rows.reduce((a, r) => a + rh(r.e - r.s) * 10, 0)) / 10 }; }
  function drawRes() {
    const p = P(); const r = S.res; const rows = finalRows(); const t = totals(rows); const who = people.find(x => x.id === S.person) || me;
    const flagged = rows.filter(x => x.flag).length; const banked = Math.round(r.bank.reduce((a, b) => a + b.hours, 0) * 10) / 10;
    const under = Math.round((80 - t.total) * 10) / 10; const canDraw = !S.draw && !S.noDraw && under > 0 && S.bal > 0.04;
    const filed = S.sheet && S.sheet.status === 'filed';
    body.innerHTML = `<div class="card"><h3>${esc(first(who))} · ${fmtD(p.start_date, { month: 'short', day: 'numeric' })} – ${fmtD(p.end_date, { month: 'short', day: 'numeric', year: 'numeric' })}</h3>
      <div class="tiles"><div class="tile big"><b>${f1(t.total)}</b><span>hours on the sheet</span></div>${Object.entries(t.byDept).filter(([, v]) => v).map(([k, v]) => `<div class="tile"><b>${f1(v)}</b><span>${DEPT[k]}</span></div>`).join('')}<div class="tile"><b>${f1(S.bal)}</b><span>banked hours available</span></div></div>
      <div class="small muted">HCP time last pulled: ${S.synced ? new Date(S.synced).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' }) : 'never'} — anything tracked after that isn't here yet.</div>
      ${banked ? `<div class="warn"><b>Over 80 hours.</b> HCP shows ${f1(r.raw)} h. ${f1(banked)} h came off the longest days (marked in red below) and go to your bank at time and a half = <b>${f1(banked * 1.5)} banked hours</b>. The sheet Harlow gets shows ${f1(t.total)} h.</div>` : ''}
      ${S.draw ? `<div class="good"><b>${f1(S.draw.hours)} banked hours added</b>, bringing you to ${f1(t.total)} h. Balance after this: ${f1(S.bal - S.draw.hours)} h.</div>` : ''}
      ${canDraw ? `<div class="bankbox"><b>You're at ${f1(t.total)} hours — ${f1(under)} under 80.</b><br>You have <b>${f1(S.bal)} banked hours</b>. Want to use some to bring this pay period up?<div class="acts"><button class="btn pri" data-drawask>Yes, use banked hours</button><button class="btn" data-nodraw>No thanks</button></div></div>` : ''}
      ${flagged ? `<div class="warn">⚑ ${flagged} row${flagged > 1 ? 's' : ''} flagged for a look (see below). Fix the time in HCP and generate again, or send as is.</div>` : ''}
      ${drawRows((S.draw && S.draw.rows) || [])}
      <div class="acts">${filed ? `<div class="good" style="flex:1">Already filed for this pay period (${esc(S.sheet.file_name)}).</div>` : `<button class="btn go" data-send style="margin-top:0">📤 Send to Harlow Bookkeeping</button>`}<button class="btn" data-again>Start over</button></div>
      <div class="small muted" style="margin-top:6px">Files as <b>${esc(fileName(first(who), p))}</b> in ${esc(folderOf(p))}.</div>
      ${S.err ? `<div class="err">${esc(S.err)}</div>` : ''}</div>`;
  }
  function drawAsk() {
    const t = totals(finalRows()); const max = Math.min(Math.round((80 - t.total) * 10) / 10, Math.floor(S.bal * 10) / 10);
    modal.innerHTML = `<div class="modal"><div class="sheet"><h3>Use banked hours</h3>
      <div class="tiles"><div class="tile"><b>${f1(t.total)}</b><span>this pay period</span></div><div class="tile"><b>${f1(S.bal)}</b><span>banked available</span></div><div class="tile"><b>${f1(max)}</b><span>most you can use</span></div></div>
      <label class="f">How many hours for this pay period?</label><div class="stepper"><button class="btn" data-dd="-1">−</button><input inputmode="decimal" id="dh" value="${f1(max)}"><button class="btn" data-dd="1">+</button></div>
      <div class="small muted">You can't go over 80 hours, and you can't use more than you've banked.</div><div class="err" id="derr"></div>
      <div class="acts"><button class="btn" data-x>Cancel</button><button class="btn pri" data-dnext>Next</button></div></div></div>`;
    const inp = modal.querySelector('#dh'), er = modal.querySelector('#derr');
    modal.onclick = (e) => {
      if (e.target.closest('[data-x]')) { modal.innerHTML = ''; return; }
      const dd = e.target.closest('[data-dd]'); if (dd) { inp.value = f1(Math.max(0.1, Math.min(max, (parseFloat(inp.value) || 0) + Number(dd.dataset.dd)))); return; }
      if (e.target.closest('[data-dnext]')) {
        const v = Math.round((parseFloat(inp.value) || 0) * 10) / 10;
        if (v <= 0) { er.textContent = 'Enter the hours to use.'; return; }
        if (v > max + 1e-9) { er.textContent = `Sorry, you can only use ${f1(max)} h — that brings you to ${f1(t.total + max)} h${max < Math.round((80 - t.total) * 10) / 10 ? ' (all your banked hours)' : ' (80 h)'}.`; return; }
        modal.innerHTML = `<div class="modal"><div class="sheet"><h3>Please confirm</h3><p>Add <b>${f1(v)} banked hours</b> to this timesheet, bringing it to a total of <b>${f1(t.total + v)} hours</b>?</p><p class="small muted">Your bank goes from ${f1(S.bal)} h to ${f1(S.bal - v)} h when you send it to Harlow.</p><div class="acts"><button class="btn" data-x>Back</button><button class="btn pri" data-dok>Yes, add them</button></div></div></div>`;
        modal.onclick = (e2) => { if (e2.target.closest('[data-x]')) { drawAsk(); return; } if (e2.target.closest('[data-dok]')) { applyDraw(v); modal.innerHTML = ''; drawRes(); } };
      }
    };
  }
  // drawn hours become their own rows with the ORIGINAL job # and dept (FIFO from the bank), on the lightest weekdays, never past 10 h a day
  function applyDraw(v) {
    const banks = S.ledger.filter(l => l.kind === 'bank' || l.kind === 'opening').map(l => ({ ...l, left: Number(l.hours) }));
    let used = -S.ledger.filter(l => l.kind === 'draw').reduce((a, l) => a + Number(l.hours), 0);
    for (const b of banks) { const u = Math.min(b.left, used); b.left -= u; used -= u; }
    const p = P(); const load = {}; for (let d = 0; d < 14; d++) { const iso = addDays(p.start_date, d); const wd = D(iso).getDay(); if (wd > 0 && wd < 6) load[iso] = 0; }
    S.res.rows.forEach(r => { if (r.date in load) load[r.date] += rh(r.e - r.s); });
    let need = Math.round(v * 10); const rows = []; const ledger = [];
    for (const b of banks) {
      let take = Math.min(need, Math.round(b.left * 10)); if (take <= 0) continue; need -= take;
      ledger.push({ kind: 'draw', hours: take / 10, job_no: b.job_no, customer: b.customer, dept: b.dept, note: 'Used on this timesheet' });
      while (take > 0) {
        const d = Object.keys(load).sort((a, c) => load[a] - load[c] || a.localeCompare(c))[0];
        const room = Math.round((10 - load[d]) * 10); const piece = Math.min(take, room); if (piece <= 0) break;
        const busy = S.res.rows.concat(rows).filter(r => r.date === d).reduce((m, r) => Math.max(m, r.e), 0);
        const s = Math.max(8 * 60, busy); rows.push({ id: 'draw' + rows.length, date: d, job: b.job_no || 'BANKED', customer: b.customer || '', dept: b.dept || 'O', s, e: s + piece * 6, note: `Banked hours (from ${b.period_start ? fmtD(b.period_start, { month: 'short', day: 'numeric' }) + ' pay period' : 'earlier'})`, drawn: true });
        load[d] += piece / 10; take -= piece;
      }
      if (need <= 0) break;
    }
    S.draw = { hours: v, rows, ledger };
  }
  async function send() {
    const p = P(); const rows = finalRows(); const t = totals(rows); const who = people.find(x => x.id === S.person) || me;
    const ledger = [...S.res.bank.map(b => ({ kind: 'bank', work_date: b.date, job_no: b.job, customer: b.customer, dept: b.dept, hours_original: b.hours, multiplier: 1.5, note: `Over 80 h: ${t12(b.from)} → ${t12(b.to)}` })), ...((S.draw && S.draw.ledger) || [])];
    const payload = rows.map(r => ({ date: r.date, job: r.job, customer: r.customer, dept: DEPT_X[r.dept], start: hm(r.s), end: hm(r.e), hours: rh(r.e - r.s), note: r.note || '', flag: r.flag || '', drawn: !!r.drawn }));
    const btn = body.querySelector('[data-send]'); if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    const { error } = await sb.rpc('ts_send', { p_person: S.person, p_period: p.start_date, p_rows: payload, p_totals: { total: t.total, byDept: t.byDept, raw: S.res.raw, file_name: fileName(first(who), p), folder: folderOf(p) }, p_ledger: ledger });
    if (error) { S.err = "Couldn't send: " + error.message; drawRes(); return; }
    await loadSheet(S.person, p.start_date); S.phase = 'sent'; draw(); fileNow();
  }
  // ---------- Instant filing: Excel built here, saved to Harlow with the person's own Microsoft sign-in ----------
  const GRAPH = 'https://graph.microsoft.com/v1.0';
  async function msToken() {
    const { MS } = await import('./ts_ms.js?v=1'); const { PublicClientApplication } = await import(MS.lib);
    const pca = new PublicClientApplication(MS.config); await pca.initialize();
    const acct = pca.getActiveAccount() || pca.getAllAccounts().find(a => (a.username || '').toLowerCase() === (me.email || '').toLowerCase()) || pca.getAllAccounts()[0];
    if (acct) { try { return (await pca.acquireTokenSilent({ scopes: MS.scopes, account: acct })).accessToken; } catch (e) { /* needs sign-in */ } }
    S.fileStep = 'Opening Microsoft sign-in…'; drawSent();
    try { sessionStorage.setItem('ts_resume', S.sheet.id); sessionStorage.setItem('ts_back', location.href.split('#')[0] + '#/tools/timesheets'); } catch (e) {}
    await pca.acquireTokenRedirect({ scopes: MS.scopes, loginHint: me.email || undefined, redirectUri: MS.config.auth.redirectUri });
    return new Promise(() => {});   // the page navigates to Microsoft
  }
  const gget = async (tok, path) => { const r = await fetch(GRAPH + path, { headers: { Authorization: 'Bearer ' + tok } }); return r.ok ? r.json() : null; };
  async function harlowFolder(tok) {
    try { const c = JSON.parse(localStorage.getItem('ts_harlow') || 'null'); if (c && c.user === me.id) return c; } catch (e) {}
    let h = null; const own = await gget(tok, '/me/drive/root:/Harlow%20Bookkeeping?$select=id,name,parentReference');
    if (own && own.id) h = { d: own.parentReference.driveId, id: own.id, base: '' };
    if (!h) {
      const sw = await gget(tok, '/me/drive/sharedWithMe?$top=200'); const items = (sw && sw.value) || [];
      const hb = items.find(i => (i.remoteItem || i).name === 'Harlow Bookkeeping'); const ts = items.find(i => (i.remoteItem || i).name === 'Timesheets' && JSON.stringify(i).includes('Harlow'));
      const it = hb || ts; if (it) { const ri = it.remoteItem || it; h = { d: ri.parentReference.driveId, id: ri.id, base: hb ? '' : 'skipTimesheets' }; }
    }
    if (!h) throw new Error("Your Microsoft account can't see the Harlow Bookkeeping folder. Ask Calvin to share it with you.");
    h.user = me.id; try { localStorage.setItem('ts_harlow', JSON.stringify(h)); } catch (e) {}
    return h;
  }
  async function fileNow() {
    const sh = S.sheet; if (!sh || sh.status === 'filed') return draw();
    const p = S.periods.find(x => x.start_date === sh.period_start); S.fileErr = ''; S.fileStep = 'Building the Excel…'; drawSent();
    try {
      const tok = await msToken();
      S.fileStep = 'Building the Excel…'; drawSent();
      const [{ default: JSZip }, { buildTimesheetXlsx }] = await Promise.all([import('https://esm.sh/jszip@3.10.1'), import('./ts_excel.js?v=1')]);
      const { data: tpl, error: te } = await sb.storage.from('timesheets').download('_template/timesheet_template.xlsx');
      if (te) throw new Error("Couldn't load the timesheet template: " + te.message);
      const rows = (sh.rows || []).map(r => ({ date: r.date, job: r.job, dept: r.dept, start: r.start, end: r.end }));
      const out = await buildTimesheetXlsx(JSZip, await tpl.arrayBuffer(), rows, p.start_date, p.end_date);
      if (Math.abs(out.total - Number((sh.totals || {}).total || 0)) > 0.05) throw new Error(`Excel total ${out.total} doesn't match HQ total ${(sh.totals || {}).total}. Not filed.`);
      S.fileStep = 'Saving to Harlow Bookkeeping…'; drawSent();
      const h = await harlowFolder(tok); const pd = D(p.pay_date);
      const parts = [...(h.base === 'skipTimesheets' ? [] : ['Timesheets']), String(pd.getFullYear()), `${String(pd.getMonth() + 1).padStart(2, '0')}. ${MONL[pd.getMonth()]}`, sh.totals.file_name];
      const url = `${GRAPH}/drives/${h.d}/items/${h.id}:/${parts.map(encodeURIComponent).join('/')}:/content?@microsoft.graph.conflictBehavior=fail`;
      const r = await fetch(url, { method: 'PUT', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/octet-stream' }, body: out.bytes });
      if (r.status === 409) throw new Error(`"${sh.totals.file_name}" is already in that Harlow folder. Nothing was overwritten.`);
      if (!r.ok) throw new Error('OneDrive said ' + r.status + ': ' + ((await r.text()).slice(0, 160)));
      const blob = new Blob([out.bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const sp = `${sh.person_id}/${sh.totals.file_name}`;
      await sb.storage.from('timesheets').upload(sp, blob, { upsert: true, contentType: blob.type });
      const { error: me2 } = await sb.rpc('ts_mark_filed', { p_id: sh.id, p_file_name: sh.totals.file_name, p_file_path: sh.totals.folder + '\\' + sh.totals.file_name, p_storage_path: sp });
      if (me2) throw new Error('Saved to Harlow, but HQ could not mark it filed: ' + me2.message);
      await loadSheet(sh.person_id, sh.period_start); S.fileStep = ''; drawSent();
    } catch (e) { S.fileErr = e.message || String(e); drawSent(); startPoll(); }
  }
  function drawSent() {
    const p = P(); const sh = S.sheet || {}; const filed = sh.status === 'filed';
    body.innerHTML = `<div class="card load"><div class="${filed ? 'done' : 'logo'}">${filed ? '📁' : '<svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="48"/></svg><img src="./icon-192.png" alt="">'}</div>
      <div class="steps">${filed ? 'Filed to Harlow Bookkeeping ✅' : S.fileErr ? "Couldn't save to Harlow yet" : (S.fileStep || 'Saving to Harlow Bookkeeping…')}</div>
      <div class="muted" style="max-width:520px">${filed ? `<b>${esc(sh.file_name)}</b> is in ${esc(folderOf(p))}. A copy is saved in History.` : S.fileErr ? `${esc(S.fileErr)}<br>Your timesheet is saved in HQ; tap Try again, or Claude files it on the next hourly run.` : `Building the Excel from the company template and saving it as <b>${esc((sh.totals || {}).file_name || '')}</b> in ${esc(folderOf(p))}.`}</div>
      <div class="acts">${filed && sh.storage_path ? '<button class="btn pri" data-dl>Download Excel</button>' : ''}${!filed && S.fileErr ? '<button class="btn pri" data-refile>Try again</button>' : ''}<button class="btn" data-again>New timesheet</button></div></div>`;
  }
  function startPoll() {
    clearInterval(poll); poll = setInterval(async () => { const p = P(); await loadSheet(S.person, p.start_date); if (dead) return clearInterval(poll); if (S.phase === 'sent' && S.tab === 'gen') drawSent(); if (S.sheet && S.sheet.status !== 'queued') clearInterval(poll); }, 15000);
  }
  async function download(path) {
    const { data, error } = await sb.storage.from('timesheets').createSignedUrl(path, 300, { download: true });
    if (error) { S.err = "Couldn't get the file: " + error.message; draw(); return; } location.href = data.signedUrl;
  }

  // ---------- History ----------
  async function drawHist() {
    body.innerHTML = '<div class="card muted">Loading…</div>';
    let q = sb.from('timesheets').select('id,person_id,period_start,status,totals,banked,drawn,file_name,storage_path,sent_at,filed_at').order('period_start', { ascending: false }).limit(60);
    if (!all) q = q.eq('person_id', me.id);
    const { data, error } = await q; if (dead) return;
    if (error) { body.innerHTML = `<div class="card err">${esc(error.message)}</div>`; return; }
    const list = data || [];
    body.innerHTML = `<div class="card"><h3>Past timesheets</h3>${list.length ? `<div class="scroll"><table><thead><tr>${all ? '<th>Who</th>' : ''}<th>Pay period</th><th class="n">Hours</th><th class="n">Banked</th><th class="n">Used</th><th>Status</th><th></th></tr></thead><tbody>${list.map(t => {
      const p = S.periods.find(x => x.start_date === t.period_start) || { start_date: t.period_start, end_date: addDays(t.period_start, 13) };
      return `<tr>${all ? `<td>${esc(personName(t.person_id))}</td>` : ''}<td>${fmtD(p.start_date, { month: 'short', day: 'numeric' })} – ${fmtD(p.end_date, { month: 'short', day: 'numeric', year: 'numeric' })}</td><td class="n">${f1((t.totals || {}).total || 0)}</td><td class="n">${Number(t.banked) ? f1(t.banked) : '—'}</td><td class="n">${Number(t.drawn) ? f1(t.drawn) : '—'}</td><td>${t.status === 'filed' ? '✅ Filed' : t.status === 'queued' ? '⏳ Filing' : '⚠ ' + esc(t.status)}</td><td>${t.storage_path ? `<button class="btn" data-dlp="${esc(t.storage_path)}" style="min-height:34px;padding:6px 12px">Excel</button>` : ''}</td></tr>`;
    }).join('')}</tbody></table></div>` : '<div class="muted">Nothing sent yet. Timesheets you send to Harlow show up here.</div>'}</div>`;
  }

  // ---------- Banked hours ----------
  async function drawBank() {
    body.innerHTML = '<div class="card muted">Loading…</div>';
    let q = sb.from('bank_ledger').select('*').order('created_at', { ascending: false });
    if (!all) q = q.eq('person_id', me.id);
    const { data, error } = await q; if (dead) return;
    if (error) { body.innerHTML = `<div class="card err">${esc(error.message)}</div>`; return; }
    const list = data || []; const ids = all ? team.map(t => t.id) : [me.id];
    const bal = (id) => list.filter(l => l.person_id === id).reduce((a, l) => a + Number(l.hours), 0);
    body.innerHTML = `<div class="card"><h3>Banked hours vault</h3><div class="small muted">Hours over 80 in a pay period come off the timesheet and bank here at time and a half (1 h over = 1.5 h banked). Use them on short pay periods to get back to 80.</div>
      <div class="tiles">${ids.map(id => `<div class="tile ${id === me.id ? 'big' : ''}"><b>${f1(bal(id))}</b><span>${esc(first(people.find(p => p.id === id)))} · banked hours</span></div>`).join('')}</div>
      ${list.length ? `<div class="scroll"><table><thead><tr>${all ? '<th>Who</th>' : ''}<th>Pay period</th><th>Type</th><th>Job #</th><th>Customer</th><th>Dept</th><th class="n">Hours over</th><th class="n">× 1.5</th><th class="n">Bank</th></tr></thead><tbody>${list.map(l => `<tr>${all ? `<td>${esc(first(people.find(p => p.id === l.person_id)))}</td>` : ''}<td>${l.period_start ? fmtD(l.period_start, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}${l.work_date ? `<div class="note">worked ${fmtD(l.work_date)}</div>` : ''}</td><td>${l.kind === 'bank' ? 'Banked' : l.kind === 'draw' ? 'Used' : 'Opening'}${l.note ? `<div class="note">${esc(l.note)}</div>` : ''}</td><td>${esc(l.job_no || '—')}</td><td>${esc(l.customer || '')}</td><td>${l.dept ? `<span class="pill ${l.dept}">${DEPT[l.dept] || esc(l.dept)}</span>` : ''}</td><td class="n">${l.kind === 'bank' ? f1(l.hours_original) : ''}</td><td class="n">${l.kind === 'bank' ? '×' + Number(l.multiplier) : ''}</td><td class="n" style="font-weight:700;color:${Number(l.hours) < 0 ? 'var(--hot)' : 'var(--ok)'}">${Number(l.hours) > 0 ? '+' : ''}${Number(l.hours).toFixed(2)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="muted" style="margin-top:8px">No banked hours yet.</div>'}</div>`;
  }

  function draw() {
    if (dead) return; drawTabs(); modal.innerHTML = '';
    if (S.tab === 'hist') return drawHist();
    if (S.tab === 'bank') return drawBank();
    if (S.phase === 'res') return drawRes();
    if (S.phase === 'sent') return drawSent();
    if (S.phase !== 'load') return drawPick();
  }
  body.onchange = async (e) => {
    if (e.target.matches('[data-person]')) { S.person = e.target.value; await loadSheet(S.person, S.period); drawPick(); }
    if (e.target.matches('[data-period]')) { S.period = e.target.value; await loadSheet(S.person, S.period); drawPick(); }
  };
  body.onclick = (e) => {
    if (e.target.closest('[data-go]')) return generate();
    if (e.target.closest('[data-again]')) { S.phase = 'pick'; S.res = null; S.draw = null; S.noDraw = false; S.err = ''; clearInterval(poll); return draw(); }
    if (e.target.closest('[data-drawask]')) return drawAsk();
    if (e.target.closest('[data-nodraw]')) { S.noDraw = true; return drawRes(); }
    if (e.target.closest('[data-send]')) return send();
    if (e.target.closest('[data-dl]')) return download(S.sheet.storage_path);
    if (e.target.closest('[data-refile]')) return fileNow();
    const dl = e.target.closest('[data-dlp]'); if (dl) return download(dl.dataset.dlp);
  };
  (async () => {
    try { await loadPeriods(); await loadSheet(S.person, S.period); } catch (e) { body.innerHTML = `<div class="card err">Couldn't load pay periods: ${esc(e.message)}</div>`; return; }
    let resume = null; try { resume = sessionStorage.getItem('ts_resume'); sessionStorage.removeItem('ts_resume'); } catch (e) {}
    if (resume) {
      const { data } = await sb.from('timesheets').select('*').eq('id', resume).maybeSingle();
      if (data) { S.person = data.person_id; S.period = data.period_start; S.sheet = data; S.phase = 'sent'; draw(); if (data.status !== 'filed') fileNow(); return; }
    }
    draw();
  })();
  return () => { dead = true; clearInterval(poll); root.innerHTML = ''; };
}
