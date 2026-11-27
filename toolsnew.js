// Homestar System Hub - TOOLS, NEW layout (v0.52, Jacob 2026-11-25, Calvin OK on the redesign). Built to match the Tools mockup
// (mockups/hub-redesign-preview.html > Tools). Only used when html[data-layout=new]; Classic keeps tools.js.
// v0.63 (Calvin 2026-11-27): Job cost calculator hidden for the owner (sees_all_boards); #/tools/jobcost shows the Tools home for him.
// Home grid + Job cost calculator (NEW tool, New layout only) + Pricing (same price() and RATES as tools.js) + Timesheets
// (timesheets.js with look:'new' - same logic, data and filing). HVAC Monitoring is NOT here: #/tools/hvac keeps the Classic page.
import { price, RATES } from './tools.js?v=66';

const BASE = `
:host{display:block}
.k{--page:#F4F6F9;--panel:#FFFFFF;--card:#FFFFFF;--raised:#F5F7FA;--border:#E5E7EB;--text:#111827;--text2:#4B5563;--muted:#64748B;
 --accent:#2596BE;--btn:#2596BE;--btntext:#FFFFFF;--green:#3f9e62;--red:#d9534f;--amber:#c7930f;--tint:.12;
 font-family:Lato,system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--text);font-size:14px}
.k.dark{--page:#0f1722;--panel:#172131;--card:#1e2a3c;--raised:#26354a;--border:#2c3b52;--text:#e8eef4;--text2:#a9b8c9;--muted:#7c8ba1;
 --accent:#38b6e0;--btn:#38b6e0;--btntext:#0f1722;--green:#6abf8a;--red:#f9a8a8;--amber:#e5b130;--tint:.15}
/* v0.65 (Calvin 2026-11-27): Homestar brand accent (html[data-accent=brand], per person) - logo blue #1048D0 + orange #F08010; Jacob's default (cyan) untouched */
.k.brand{--accent:#1048D0;--btn:#1048D0;--btntext:#FFFFFF;--s1:#1048D0;--s2:#F08010}
.k.brand.dark{--accent:#4f7ff0;--btn:#4f7ff0;--btntext:#FFFFFF;--s1:#4f7ff0;--s2:#F59A3C}
.k.brand .tic,.k.brand .pays{background:linear-gradient(135deg,#0C379E,#1048D0)}

*{box-sizing:border-box}
.top{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.top h1{margin:0;font-size:22px;font-weight:900}
.top .sub{color:var(--muted);font-size:13px}
.back{display:inline-block;color:var(--accent);font-weight:700;font-size:13px;cursor:pointer;margin-bottom:6px;text-decoration:none}
.btn{background:var(--btn);color:var(--btntext);border:0;border-radius:8px;padding:9px 14px;font-weight:700;font-family:inherit;cursor:pointer;font-size:14px}
.btn.ghost{background:transparent;color:var(--text2);border:1px solid var(--border)}
.btn.sm{padding:5px 12px;font-size:12px}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;min-width:0}
.ph{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.ph h2{margin:0;font-size:15px;font-weight:900}
.badge{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;color:var(--c);background:color-mix(in srgb,var(--c) calc(var(--tint)*100%),transparent)}
svg.i{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.tgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
.tool{display:flex;gap:14px;align-items:flex-start;background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:18px;cursor:pointer;transition:.15s;color:var(--text);text-decoration:none}
.tool:hover{border-color:var(--accent);transform:translateY(-1px)}
.tool b{display:block;font-size:16px}.tool p{margin:4px 0 10px;color:var(--text2);font-size:13px;line-height:1.4}
.tic{width:42px;height:42px;border-radius:11px;flex-shrink:0;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#1a7f6e,#2596BE)}
.tic svg.i{width:20px;height:20px}
.chev{margin-left:auto;color:var(--muted);font-size:22px}
.jc{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}
.jc .panel{margin-bottom:0}
.jc .ph .btn{margin-left:6px}.jc .ph h2{margin-right:auto}
#jin{width:100%;min-height:320px;background:var(--raised);border:1px solid var(--border);border-radius:10px;padding:12px;color:var(--text);font-family:ui-monospace,Menlo,monospace;font-size:12px;resize:vertical}
.sw{font-size:13px;color:var(--text2);display:flex;gap:6px;align-items:center;margin:10px 0 4px;cursor:pointer}
.muted{color:var(--muted)}
.empty{color:var(--muted);font-size:13px;padding:10px 0}
.empty.big{text-align:center;padding:80px 0}
.pays{background:linear-gradient(135deg,#1a7f6e,#2596BE);border-radius:12px;padding:20px;text-align:center;color:#fff}
.pays span{display:block;font-size:10px;font-weight:700;letter-spacing:.14em;opacity:.8}
.pays b{display:block;font-size:34px;font-weight:900;margin-top:6px;font-variant-numeric:tabular-nums}
.k4{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.k4 div{background:var(--raised);border:1px solid var(--border);border-radius:10px;padding:10px 12px}
.k4 span{display:block;font-size:11px;color:var(--muted);font-weight:700}
.k4 b{display:block;font-size:16px;margin-top:3px;font-variant-numeric:tabular-nums}
.k4 .reb{background:color-mix(in srgb,var(--red) calc(var(--tint)*100%),var(--card));border-color:color-mix(in srgb,var(--red) 40%,var(--border))}
.k4 .reb b{color:var(--red)}
h4{margin:18px 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.lines{border:1px solid var(--border);border-radius:10px;overflow:hidden}
.ln{display:flex;justify-content:space-between;gap:10px;padding:8px 12px;border-top:1px solid var(--border);font-size:13px}
.ln:first-child{border-top:0}.ln em{color:var(--muted);font-style:normal}.ln b{font-variant-numeric:tabular-nums;white-space:nowrap}.ln.neg b{color:var(--red)}
.ln.tot{font-weight:900}
.cpy{display:flex;justify-content:flex-end;gap:8px;margin-top:12px;flex-wrap:wrap}
.flag{border-left:4px solid var(--c);background:color-mix(in srgb,var(--c) calc(var(--tint)*100%),var(--card));border-radius:8px;padding:10px 12px;margin-top:10px}
.flag b{display:block}.flag small{color:var(--text2)}
.fl{display:block;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px}
.fl input,.fl select{display:block;width:100%;margin-top:5px;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:9px 10px;color:var(--text);font-family:inherit;font-size:14px}
.fl input.bad{border-color:var(--red);background:color-mix(in srgb,var(--red) 12%,var(--card))}
.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sticky{position:sticky;top:80px}
.seg{display:flex;gap:4px;background:var(--raised);border:1px solid var(--border);border-radius:999px;padding:4px}
.seg button{border:0;background:transparent;color:var(--text2);font-family:inherit;font-weight:700;font-size:13px;padding:7px 14px;border-radius:999px;cursor:pointer;white-space:nowrap}
.seg button.on{background:var(--accent);color:var(--btntext)}
.pseg{width:fit-content;max-width:100%;flex-wrap:wrap}
.pstep{margin-bottom:16px}.plbl{font-weight:700;margin-bottom:8px;display:flex;gap:8px;align-items:center}
.pn{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--accent);color:var(--btntext);font-size:12px}
.prow{display:flex;gap:6px;margin-bottom:6px}.prow input{flex:1;min-width:0;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:9px 10px;color:var(--text);font-family:inherit;font-size:14px}
.rm{border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:8px;cursor:pointer;width:38px}
.addl{border:0;background:none;color:var(--accent);font-family:inherit;font-weight:700;cursor:pointer;padding:6px 0}
.mrow{display:flex;align-items:center;gap:10px}.mrow input{flex:1;accent-color:var(--accent)}
.stepb{width:36px;height:36px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);font-weight:900;cursor:pointer}
.int{margin-top:10px;background:var(--raised);border-radius:10px;padding:10px 12px}
.int summary{cursor:pointer;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.int .ln{padding:6px 0;border-top:1px solid var(--border)}
.toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:var(--text);color:var(--page);padding:10px 16px;border-radius:10px;font-weight:700;z-index:60}
@media(max-width:820px){.jc{grid-template-columns:minmax(0,1fr)}.sticky{position:static}#jin{min-height:200px}.tgrid{grid-template-columns:minmax(0,1fr)}.two{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
`;

// Timesheets in the New look: restyles timesheets.js's own markup (passed in as css; it uses the Hub's New colour variables)
const TS_CSS = `
:host{font-family:Lato,system-ui,sans-serif;font-size:14px}
a.back{display:inline-block;color:var(--accent);font-weight:700;font-size:13px;margin-bottom:6px}
.top{margin-bottom:14px}.top h1{margin:0;font-size:22px;font-weight:900;font-family:Lato,sans-serif}.top .sub{color:var(--muted);font-size:13px}
.tabs{display:flex;gap:4px;background:var(--sunk);border:1px solid var(--line);border-radius:999px;padding:4px;width:fit-content;max-width:100%;margin:0 0 14px;flex-wrap:nowrap}
.tabs button{border:0;background:transparent;color:var(--muted);font-family:Lato,sans-serif;font-weight:700;font-size:13px;padding:7px 14px;border-radius:999px;min-height:0;white-space:nowrap}
.tabs button[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border:0}
h2,h3{font-family:Lato,sans-serif;font-weight:900}h3{font-size:15px;margin:0 0 10px}
.card{border-radius:12px;padding:16px;margin-bottom:16px;max-width:none}
.ts-gen > .card:has(.hello), .ts-hist > .card, .ts-dates > .card{max-width:760px}
.hello{font-family:Lato,sans-serif;font-size:18px;font-weight:900;margin-bottom:2px}
label.f{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
select,input{font-size:14px;background:var(--surface)}
.btn{font-family:Lato,sans-serif;border-radius:8px;padding:9px 14px;min-height:0;font-size:14px;background:transparent;color:var(--ink)}
.btn.pri,.btn.go{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.btn.go{font-size:15px;padding:12px;width:100%}
.tiles{grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin:10px 0}
.tile{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column-reverse;gap:4px}
.tile b{font-family:Lato,sans-serif;font-size:24px;font-weight:900}
.tile span{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.tile.big{background:color-mix(in srgb,var(--accent) 12%,var(--surface));border-color:color-mix(in srgb,var(--accent) 40%,var(--line));color:var(--ink)}.tile.big span{color:var(--muted);opacity:1}
.tl{border:0;border-radius:0;gap:0}
.tday{background:var(--sunk);border-radius:8px;font-size:13px;margin-top:10px}.tday:first-child{margin-top:0}
.te{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;border-top:0;border-bottom:1px solid var(--line);padding:10px 12px}
.te .tm{flex:1}.tn{flex-basis:100%}
.tj{font-size:14px}.tt{font-size:12px}
.th b{font-family:Lato,sans-serif;font-size:16px}
.ed{border-radius:8px;font-size:12px;padding:4px 10px;color:var(--muted);background:transparent}
.pill{font-size:11px;padding:2px 8px;border-radius:10px;--c:var(--muted);color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent)}
.pill.I{--c:var(--accent)}.pill.S{--c:var(--warn)}.pill.M{--c:var(--ok)}.pill.O{--c:var(--muted)}.pill.sk{--c:var(--hot)}.pill.ed-p{--c:var(--accent)}
.flag{color:var(--warn)}.trim{color:var(--hot)}
.warn,.good,.bankbox{border:0;border-left:4px solid var(--c);border-radius:8px;background:color-mix(in srgb,var(--c) 12%,var(--surface));padding:10px 12px}
.warn{--c:var(--warn)}.good{--c:var(--ok)}.bankbox{--c:var(--accent)}
.hl{gap:0}
.hrow{border:0;border-top:1px solid var(--line);border-radius:0;background:transparent;padding:10px 0}
.hl > .hrow:first-child{border-top:0}
.ht b{font-family:Lato,sans-serif;font-size:14px}
.chipb{font-size:11px;padding:2px 8px;border-radius:10px;border:0;--c:var(--muted);color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent)}
.chipb.ok{--c:var(--ok);border:0}.chipb.bad{--c:var(--hot);border:0}
.curp{box-shadow:none;background:color-mix(in srgb,var(--accent) 8%,transparent);border-radius:8px;padding:10px}
.two2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}.two2 > .card{margin-bottom:0}
.bl{border-radius:10px;background:transparent}.bl .bh{font-family:Lato,sans-serif;font-size:16px;font-weight:900}
.kv{font-size:13px}
.modal{background:rgba(10,15,25,.5)}
.sheet{border-radius:16px;padding:20px;max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.sheet h3{font-size:18px}
.load .steps{font-family:Lato,sans-serif;font-weight:900}
.logo svg circle{stroke:var(--accent)}
.bar i{background:var(--accent)}
@media(max-width:820px){.tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));width:100%}.tabs button{white-space:normal;font-size:11px;padding:6px 2px;line-height:1.15}.two2{grid-template-columns:minmax(0,1fr)}.two2 > .card{margin-bottom:16px}}
`;

const ICON = {
 jobcost: '<svg class="i" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
 timesheets: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 pricing: '<svg class="i" viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
 hvac: '<svg class="i" viewBox="0 0 24 24"><path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/></svg>' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n) => (isFinite(n) ? (n * 100).toFixed(1) : '0.0') + '%';
const num = (v) => { const x = parseFloat(String(v).replace(/[$,\s]/g, '')); return isFinite(x) && x > 0 ? x : 0; };

export function mountToolsNew(host, db, extra) {
 const R0 = host.shadowRoot || host.attachShadow({ mode: 'open' });
 const tool = (extra && extra.tool) || '';
 const sb = extra && extra.sb, me = (extra && extra.me) || {};
 if (tool === 'timesheets') {
  let off = null, gone = false;
  R0.innerHTML = '<div style="padding:12px;color:var(--muted)">Loading timesheets…</div>';
  import('./timesheets.js?v=19').then(m => { if (!gone) off = m.mountTimesheets(R0, { ...(extra || {}), look: 'new', css: TS_CSS }); }).catch(e => { R0.textContent = "Couldn't load Timesheets (" + e.message + '). Reload the page.'; });
  return () => { gone = true; if (off) off(); else R0.innerHTML = ''; };
 }
 R0.innerHTML = `<style>${BASE}</style><div class="k" id="k"><div id="tv"></div></div>`;
 const K_ = R0.getElementById('k'), T = R0.getElementById('tv'); const offs = [];
 const mq = matchMedia('(prefers-color-scheme: dark)');
 const syncTheme = () => { const t = document.documentElement.dataset.theme; K_.classList.toggle('dark', t ? t === 'dark' : mq.matches); K_.classList.toggle('brand', document.documentElement.dataset.accent === 'brand'); };
 syncTheme(); const tObs = new MutationObserver(syncTheme); tObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-accent'] });
 mq.addEventListener('change', syncTheme); offs.push(() => { tObs.disconnect(); mq.removeEventListener('change', syncTheme); });
 const toast = (t) => { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; K_.appendChild(d); setTimeout(() => d.remove(), 2400); };
 const copy = (t, ok) => { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast(ok), () => toast("Couldn't copy on this device")); };
 const head = (t, sub) => `<a class="back" href="#/tools">‹ Tools</a><div class="top"><div><h1>${t}</h1><div class="sub">${sub}</div></div></div>`;

 // ---------- HOME ----------
 const noJC = !!(me && me.sees_all_boards);   // v0.63 Calvin 2026-11-27: Job cost calculator removed from Calvin's Tools (Jacob keeps it)
 if ((tool !== 'jobcost' || noJC) && tool !== 'pricing') {
  const TOOLS = [['jobcost', 'Job cost calculator', 'Paste an HCP job – get subtotal, GST, rebate and what the customer pays.', 'New', 'accent'],
   ['timesheets', 'Timesheets', 'Build your pay period from HCP, send it to Harlow, track banked hours and sick days.', '', 'green'],
   ['pricing', 'Pricing', 'Price an install, service repair or diagnostic from the company rate model.', 'Rates as of ' + String(RATES.asOf).split(' ')[0], 'muted'],
   ['hvac', 'HVAC Monitoring', 'Live temperatures and power from monitored homes.', '', 'green']].filter(t => !(noJC && t[0] === 'jobcost'));
  const drawHome = (badge) => { T.innerHTML = `<div class="top"><div><h1>Tools</h1><div class="sub">Homestar's own tools</div></div></div>
   <div class="tgrid">${TOOLS.map(([k, n, d, st, c]) => { const b = badge[k] != null ? badge[k] : st; return `<a class="tool" href="#/tools/${k}"><span class="tic">${ICON[k]}</span><div><b>${n}</b><p>${d}</p>${b ? `<span class="badge" style="--c:var(--${c})">${esc(b)}</span>` : ''}</div><span class="chev">›</span></a>`; }).join('')}</div>`; };
  const badge = {}; drawHome(badge);
  if (sb && me.id) {
   (async () => {
    try { const [{ data: ts }, { data: bl }] = await Promise.all([sb.from('timesheets').select('period_start,status').eq('person_id', me.id).order('period_start', { ascending: false }).limit(1), sb.from('bank_ledger').select('hours').eq('person_id', me.id)]);
     const parts = []; const t = ts && ts[0];
     if (t) { const s = new Date(t.period_start + 'T12:00'), e = new Date(s); e.setDate(e.getDate() + 13); const f = (d) => d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }); parts.push(`${f(s)}–${s.getMonth() === e.getMonth() ? e.getDate() : f(e)} ${t.status === 'filed' ? 'filed' : t.status}`); }
     const bal = (bl || []).reduce((a, l) => a + Number(l.hours), 0); parts.push(`${(Math.round(bal * 10) / 10).toFixed(1)} h banked`);
     badge.timesheets = parts.join(' · '); } catch (e) {}
    try { const { count } = await sb.from('monitor_sites').select('*', { count: 'exact', head: true }); if (count != null) badge.hvac = `${count} house${count === 1 ? '' : 's'}`; } catch (e) {}
    if (!gone) drawHome(badge);
   })();
  }
  let gone = false;
  return () => { gone = true; offs.forEach(f => { try { f(); } catch (e) {} }); R0.innerHTML = ''; };
 }

 // ---------- JOB COST CALCULATOR (new tool) ----------
 if (tool === 'jobcost') {
  const SAMPLE = 'Heat pump outdoor unit – Moovair 24K\nQty 1\nUnit price\n$6,850.00\nWall head 12K\nQty 2\nUnit price\n$1,450.00\nInstall labour\nQty 1\nUnit price\n$3,200.00\nBC Hydro heat pump rebate\nQty 1\nUnit price\n-$3,000.00';
  T.innerHTML = head('Job cost calculator', 'Paste HCP job text – results update as you type') + `<div class="jc">
   <section class="panel"><div class="ph"><h2>Paste</h2><button class="btn ghost sm" data-sample>Use sample</button><button class="btn ghost sm" data-clear>Clear</button></div>
    <textarea id="jin" placeholder="Paste HCP job text here…"></textarea>
    <label class="sw"><input type="checkbox" id="jqty" checked> Multiply by Qty when HCP shows it</label>
    <small class="muted">Each "Unit price" line is read. Negative prices (rebates) come off after GST.</small></section>
   <section class="panel"><div class="ph"><h2>Summary</h2></div><div id="jout"></div></section></div>`;
  const jin = R0.getElementById('jin'), jq = R0.getElementById('jqty'), out = R0.getElementById('jout'); let last = null;
  // Same reading as Jacob's Power Fx calculator: split on "Unit price", take the $ amount after it, the item name and Qty from just before it
  const parse = (t, useQty) => { const parts = t.split(/Unit price/i), L = [];
   for (let i = 1; i < parts.length; i++) { const c = parts[i].trim(); if (!c.slice(0, 20).includes('$')) continue;
    const m = c.match(/(-?)\s*\$\s*(-?)([\d,]+(?:\.\d+)?)/); if (!m) continue; const v = parseFloat(m[3].replace(/,/g, '')) * ((m[1] || m[2]) ? -1 : 1);
    const prev = parts[i - 1].split('\n').map(x => x.trim()).filter(Boolean);
    const qm = prev.slice(-3).join(' ').match(/(?:Qty|Quantity)[:\s]*([\d.]+)/i); const qty = qm ? parseFloat(qm[1]) : 1;
    const name = prev.filter(x => !/^(?:Qty|Quantity)\b/i.test(x) && !/^-?\$/.test(x) && !/^Unit price/i.test(x)).slice(-1)[0] || 'Line ' + i;
    L.push({ name, qty, total: useQty ? v * qty : v }); }
   return L; };
  const calc = () => { const L = parse(jin.value, jq.checked);
   if (!L.length) { last = null; out.innerHTML = '<div class="empty big">Paste job text to see results</div>'; return; }
   const sub = L.filter(x => x.total > 0).reduce((a, x) => a + x.total, 0), reb = -L.filter(x => x.total < 0).reduce((a, x) => a + x.total, 0);
   const gst = Math.round(sub * 5) / 100, tot = Math.round((sub + gst) * 100) / 100, net = Math.max(0, Math.round((tot - reb) * 100) / 100);
   const qtyWarn = !jq.checked && L.some(x => x.qty > 1); last = { sub, gst, tot, reb, net };
   out.innerHTML = `<div class="pays"><span>CUSTOMER PAYS</span><b>${money(net)}</b></div>
    <div class="k4"><div><span>Subtotal</span><b>${money(sub)}</b></div><div><span>GST (5%)</span><b>${money(gst)}</b></div><div><span>Total with GST</span><b>${money(tot)}</b></div><div class="reb"><span>Rebate (max)</span><b>− ${money(reb)}</b></div></div>
    ${qtyWarn ? '<div class="flag" style="--c:var(--amber)"><b>Some lines have Qty above 1</b><small>They are only counted once – turn on "Multiply by Qty"</small></div>' : ''}
    <h4>Lines read (${L.length})</h4><div class="lines">${L.map(x => `<div class="ln ${x.total < 0 ? 'neg' : ''}"><span>${esc(x.name)}${x.qty !== 1 ? ` <em>× ${x.qty}</em>` : ''}</span><b>${x.total < 0 ? '− ' + money(-x.total) : money(x.total)}</b></div>`).join('')}</div>
    <div class="cpy"><button class="btn" data-copysum>Copy summary</button></div>`; };
  const onClick = (e) => { const t = e.target;
   if (t.closest('[data-sample]')) { jin.value = SAMPLE; calc(); return; }
   if (t.closest('[data-clear]')) { jin.value = ''; calc(); return; }
   if (t.closest('[data-copysum]') && last) { const { sub, gst, tot, reb, net } = last; copy(`Job Cost = ${money(sub)} + ${money(gst)} GST (5%) = ${money(tot)}\nTotal Job Cost = ${money(tot)} - ${money(reb)} Rebate (max) = ${money(net)}\nTotal amount paid by customer = ${money(net)}`, 'Summary copied'); } };
  R0.addEventListener('click', onClick); jin.addEventListener('input', calc); jq.addEventListener('change', calc); calc();
  return () => { offs.forEach(f => { try { f(); } catch (e) {} }); R0.removeEventListener('click', onClick); R0.innerHTML = ''; };
 }

 // ---------- PRICING (same rules as tools.js: price() and RATES are imported from it) ----------
 const R = RATES;
 const PS = { pst: true, dept: 'install', kind: 'repair', crew: ['calvin'], hours: '', travel: '', materials: '', subs: '', parts: [''], warranty: false, net: R.dept.install.net, ref: false, refType: 'R410A', refQty: '', refUnit: 'lb' };
 T.innerHTML = head('Pricing', `Starts at the company minimum – you can raise the margin, never lower it. Rates as of ${esc(R.asOf)}.`) + `<div class="jc"><section class="panel" id="pin"></section><section class="panel sticky" id="pout"></section></div>`;
 const pin = R0.getElementById('pin'), pout = R0.getElementById('pout');
 const seg = (g, opts, cur) => `<div class="seg pseg" data-g="${g}">${opts.map(([v, l]) => `<button class="${v === cur ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;
 const fld = (k, l, ph, id) => `<label class="fl">${l}<input inputmode="decimal" data-k="${k}"${id ? ` id="${id}"` : ''} value="${esc(PS[k])}" placeholder="${ph}"></label>`;
 function pDraw() { const d = PS.dept, svc = d === 'service', diag = svc && PS.kind === 'diag'; let n = 1; const st = (t, b) => `<div class="pstep"><div class="plbl"><span class="pn">${n++}</span>${t}</div>${b}</div>`;
  const pst = `<label class="sw"><input type="checkbox" data-pst ${PS.pst ? 'checked' : ''}> Add 7% PST to ${svc ? 'parts' : 'materials'} (not subs)</label>`;
  let h = st('Department', seg('dept', Object.entries(R.dept).filter(([k]) => k !== 'maint').map(([k, v]) => [k, v.label]), d) + (svc ? `<div style="margin-top:8px">${seg('kind', [['repair', 'Repair'], ['diag', 'Diagnostic']], PS.kind)}</div>` : ''));
  if (!diag) {
   h += st("Who's going", `<div class="seg pseg">${R.crew.map(c => `<button class="${PS.crew.includes(c.id) ? 'on' : ''}" data-crew="${c.id}">${PS.crew.includes(c.id) ? '✓ ' : ''}${c.name}</button>`).join('')}</div>`);
   h += st('Time', `<div class="two">${fld('hours', (d === 'install' ? 'Job hours on site' : 'Repair hours on site') + ' (clock time)', 'e.g. 8')}${fld('travel', 'Travel hours, round trip (clock time)', 'e.g. 1')}</div>`);
   if (svc) {
    h += st('Parts (your cost before tax)', `${PS.parts.map((p, i) => `<div class="prow"><input inputmode="decimal" data-part="${i}" value="${esc(p)}" placeholder="Part ${i + 1} cost">${PS.parts.length > 1 ? `<button class="rm" data-del="${i}" aria-label="Remove part">✕</button>` : ''}</div>`).join('')}
     <button class="addl" data-addpart>+ Add another part</button>
     <label class="sw"><input type="checkbox" data-warranty ${PS.warranty ? 'checked' : ''}> Warranty parts (no charge to the customer)</label>${pst}`);
    h += st('Refrigerant needed?', seg('ref', [['no', 'No'], ['yes', 'Yes']], PS.ref ? 'yes' : 'no') + (PS.ref ? `<div style="margin-top:8px">${seg('reftype', Object.entries(R.refrigerant).map(([k, g]) => [k, g.label]), PS.refType)}</div>
     <div class="two" style="margin-top:8px">${fld('refQty', 'Amount added', PS.refUnit === 'oz' ? 'e.g. 12' : 'e.g. 1.5', 'refq')}<div style="align-self:end;margin-bottom:12px">${seg('refunit', [['lb', 'lb'], ['oz', 'oz']], PS.refUnit)}</div></div>
     <small class="muted" id="refnote">${R.refrigerant[PS.refType].label}: ${money(R.refrigerant[PS.refType].price)}/lb, minimum ½ lb (8 oz).</small>` : ''));
   } else h += st('Costs (your cost before tax)', `<div class="two">${fld('materials', 'Materials', 'e.g. 6500')}${d === 'install' ? fld('subs', 'Subcontractors (real quotes)', 'e.g. 1200') : ''}</div>${pst}`);
   h += st('Net margin', `<div class="mrow"><button class="stepb" data-net="-1" aria-label="Lower margin">−</button><input type="range" min="${R.dept[d].net}" max="50" step="1" value="${PS.net}" data-netr><button class="stepb" data-net="1" aria-label="Raise margin">+</button><b id="mv">${PS.net}%</b></div><small class="muted">Minimum ${R.dept[d].net}% net${d === 'install' ? ` (aim for ${R.dept[d].gross}% gross)` : ''}.</small>`);
  }
  pin.innerHTML = h; pOut(); }
 function pOut() { const k = PS.pst ? 1 + R.pst : 1, rq = num(PS.refQty);
  const s = { ref: (PS.ref && PS.dept === 'service' && PS.kind !== 'diag') ? { type: PS.refType, lb: PS.refUnit === 'oz' ? rq / 16 : rq, k } : null, dept: PS.dept, kind: PS.kind, crew: (PS.dept === 'service' && PS.kind === 'diag') ? ['calvin'] : PS.crew, hours: num(PS.hours), travel: num(PS.travel), materials: num(PS.materials) * k, subs: num(PS.subs), parts: PS.parts.map(num).filter(Boolean).map(x => x * k), warranty: PS.warranty, net: PS.net };
  const r = price(s); const refLow = !!(s.ref && rq > 0 && (PS.refUnit === 'oz' ? rq < 16 * R.refMinLb : rq < R.refMinLb));   // below 1/2 lb or 8 oz = not allowed (Calvin 2026-11-21)
  const ri = R0.getElementById('refq'); if (ri) ri.classList.toggle('bad', refLow); const rn = R0.getElementById('refnote'); if (rn) { rn.style.color = refLow ? 'var(--red)' : ''; rn.textContent = refLow ? `Below the minimum charge: enter at least ${PS.refUnit === 'oz' ? '8 oz' : '0.5 lb'}.` : `${R.refrigerant[PS.refType].label}: ${money(R.refrigerant[PS.refType].price)}/lb, minimum ½ lb (8 oz).`; }
  const H = '<div class="ph"><h2>Price</h2></div>';
  if (refLow) { pout.innerHTML = H + `<div class="flag" style="--c:var(--amber)"><b>Refrigerant is below the ½ lb (8 oz) minimum</b><small>Enter ${PS.refUnit === 'oz' ? '8 oz' : '0.5 lb'} or more.</small></div>`; return; }
  if (r.error) { pout.innerHTML = H + `<div class="empty">${esc(r.error)}</div>`; return; }
  if (!s.hours && !s.travel && !(PS.dept === 'service' && PS.kind === 'diag')) { pout.innerHTML = H + '<div class="empty big">Enter the hours to see the price.</div>'; return; }
  const rows = r.lines.map(([l, v]) => `<div class="ln c"><span>${esc(l)}</span><b>${money(v)}</b></div>`).join('');
  if (r.loss) { pout.innerHTML = `<div class="ph"><h2>Maintenance</h2></div><div class="muted">Maintenance is our loss leader: charge the price book price.</div><div class="pays" style="margin-top:10px"><span>THIS VISIT COSTS US</span><b>${money(r.cost)}</b></div><div class="lines" style="margin-top:10px">${rows}</div>`; return; }
  const raised = Math.round(r.net * 100) > r.minNet && !r.flat; const big = PS.dept === 'service' && s.parts.some(c => c > 1000);
  const int = `<details class="int" open><summary>Internal – never show the customer</summary>
    <div class="ln"><span>${r.flat ? 'Our cost (1 h of Calvin at break-even, travel not included)' : 'Our full cost (labour, overhead, materials, travel)'}</span><b>${money(r.cost)}</b></div>
    <div class="ln"><span>Profit</span><b>${money(r.profit)}</b></div><div class="ln"><span>Net margin</span><b>${pct(r.netPct)}</b></div><div class="ln"><span>Gross margin</span><b>${pct(r.grossPct)}</b></div>
    ${r.hourly && !r.flat ? `<div class="ln"><span>Crew rate per hour on site</span><b>${money(r.hourly)}/h</b></div>` : ''}<div class="ln"><span>${r.flat ? 'Break-even per hour (Calvin)' : 'Break-even per crew hour'}</span><b>${money(r.crewHour)}/h</b></div></details>`;
  pout.innerHTML = `<div class="ph"><h2>Price before GST</h2><span class="badge" style="--c:var(--${r.flat ? 'green' : raised ? 'accent' : 'green'})">${r.flat ? 'flat rate' : raised ? 'above minimum' : 'company minimum'}</span></div>
   <div class="pays"><span>PRICE BEFORE GST</span><b id="pre">${money(r.pre)}</b></div>
   <div class="lines" style="margin-top:10px">${rows}<div class="ln c"><span>GST 5%</span><b>${money(r.gst)}</b></div><div class="ln c tot"><span>Total with GST</span><b>${money(r.total)}</b></div></div>
   ${int}
   ${r.flat ? `<div class="flag" style="--c:var(--accent)"><b>Diagnostic is a flat $${R.diag.calvin}</b><small>Travel included, no added hours. Repairs are quoted separately.</small></div>` : ''}
   ${big ? '<div class="flag" style="--c:var(--amber)"><b>A part over $1,000 is marked up 30% instead of 50%</b><small>Check this price with Calvin.</small></div>' : ''}
   ${PS.dept === 'install' && r.grossPct < 0.4 ? `<div class="flag" style="--c:var(--amber)"><b>Gross margin is ${pct(r.grossPct)}, under the 40% target</b><small>Installs are priced on 12% net; raise the margin if the job allows.</small></div>` : ''}
   ${PS.dept === 'install' ? '<div class="flag" style="--c:var(--muted)"><b>Custom or multi-system installs</b><small>Also run the Project Estimating Sheet. Subcontractor costs must be real quotes, never guesses.</small></div>' : ''}
   <div class="cpy"><button class="btn ghost" data-reset>Start over</button><button class="btn" data-pcopy>Copy summary</button></div><small class="muted">Copies customer lines only – no internal numbers.</small>`; }
 const onClick = (e) => { const t = e.target.closest('button'); if (!t) return;
  const g = t.parentElement && t.parentElement.dataset.g;
  if (g === 'dept') { PS.dept = t.dataset.v; PS.net = R.dept[PS.dept].net; return pDraw(); }
  if (g === 'kind') { PS.kind = t.dataset.v; return pDraw(); }
  if (g === 'ref') { PS.ref = t.dataset.v === 'yes'; return pDraw(); }
  if (g === 'reftype') { PS.refType = t.dataset.v; return pDraw(); }
  if (g === 'refunit') { PS.refUnit = t.dataset.v; return pDraw(); }
  if (t.dataset.crew) { const id = t.dataset.crew; PS.crew = PS.crew.includes(id) ? PS.crew.filter(x => x !== id) : [...PS.crew, id]; return pDraw(); }
  if (t.hasAttribute('data-addpart')) { PS.parts.push(''); pDraw(); const ins = R0.querySelectorAll('[data-part]'); ins[ins.length - 1].focus(); return; }
  if (t.dataset.del != null) { PS.parts.splice(+t.dataset.del, 1); return pDraw(); }
  if (t.dataset.net) { PS.net = Math.min(50, Math.max(R.dept[PS.dept].net, PS.net + +t.dataset.net)); const rr = R0.querySelector('[data-netr]'); if (rr) rr.value = PS.net; const mv = R0.getElementById('mv'); if (mv) mv.textContent = PS.net + '%'; return pOut(); }
  if (t.hasAttribute('data-reset')) { Object.assign(PS, { pst: true, hours: '', travel: '', materials: '', subs: '', parts: [''], warranty: false, net: R.dept[PS.dept].net, ref: false, refType: 'R410A', refQty: '', refUnit: 'lb' }); return pDraw(); }
  if (t.hasAttribute('data-pcopy')) { const lines = [...pout.querySelectorAll('.ln.c')].map(x => x.children[0].textContent + ': ' + x.children[1].textContent).filter(x => !/\$0\.00$/.test(x));
   copy(`Homestar price (${R.dept[PS.dept].label}${PS.dept === 'service' ? ' - ' + (PS.kind === 'diag' ? 'diagnostic' : 'repair') : ''})\nPrice before GST: ${R0.getElementById('pre').textContent}\n` + lines.join('\n'), 'Copied – customer lines only'); } };
 const onInput = (e) => { const t = e.target;
  if (t.dataset.k) PS[t.dataset.k] = t.value; else if (t.dataset.part != null) PS.parts[+t.dataset.part] = t.value;
  else if (t.hasAttribute('data-warranty')) PS.warranty = t.checked; else if (t.hasAttribute('data-pst')) PS.pst = t.checked;
  else if (t.hasAttribute('data-netr')) { PS.net = Math.max(R.dept[PS.dept].net, +t.value); const mv = R0.getElementById('mv'); if (mv) mv.textContent = PS.net + '%'; }
  else return; pOut(); };
 R0.addEventListener('click', onClick); R0.addEventListener('input', onInput); R0.addEventListener('change', onInput);
 pDraw();
 return () => { offs.forEach(f => { try { f(); } catch (e) {} }); R0.removeEventListener('click', onClick); R0.removeEventListener('input', onInput); R0.removeEventListener('change', onInput); R0.innerHTML = ''; };
}
