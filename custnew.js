// Homestar System Hub - CUSTOMERS, NEW layout (v0.51, Jacob 2026-11-25, Calvin OK on the redesign). Built to match the Maintenance/Customers mockup
// (mockups/hub-redesign-preview.html > Customers). Only used when html[data-layout=new]; Classic keeps maint.js untouched.
// Data: customers/* (same rows as maint.js, company docs), meta/info (last import), meta/waitlist (NEW: {rows:[...], zones:[...]}).
// Writes: customers/<id> merge-updates (Edit record), meta/waitlist, and To Do cards for Claude on the signed-in person's board.
const CSS = `
:host{display:block}
.k{--page:#F4F6F9;--panel:#FFFFFF;--card:#FFFFFF;--raised:#F5F7FA;--border:#E5E7EB;--text:#111827;--text2:#4B5563;--muted:#64748B;
 --accent:#2596BE;--btn:#2596BE;--btntext:#FFFFFF;--green:#3f9e62;--red:#d9534f;--amber:#c7930f;--tint:.12;
 font-family:Lato,system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--text);font-size:14px}
.k.dark{--page:#0f1722;--panel:#172131;--card:#1e2a3c;--raised:#26354a;--border:#2c3b52;--text:#e8eef4;--text2:#a9b8c9;--muted:#7c8ba1;
 --accent:#38b6e0;--btn:#38b6e0;--btntext:#0f1722;--green:#6abf8a;--red:#f9a8a8;--amber:#e5b130;--tint:.15}
*{box-sizing:border-box}
a{color:var(--accent)}
.top{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.top h1{margin:0;font-size:22px;font-weight:900}
.top .sub{color:var(--muted);font-size:13px}
.top .r{margin-left:auto;display:flex;gap:8px;align-items:center}
.btn{background:var(--btn);color:var(--btntext);border:0;border-radius:8px;padding:9px 14px;font-weight:700;font-family:inherit;cursor:pointer;font-size:14px;text-decoration:none;display:inline-block}
.btn.ghost{background:transparent;color:var(--text2);border:1px solid var(--border)}
.btn.sm{padding:5px 12px;font-size:12px}
.btn:disabled{opacity:.5;cursor:default}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;min-width:0}
.ph{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.ph h2{margin:0;font-size:15px;font-weight:900}
.ph .meta{color:var(--muted);font-size:12px;margin-left:auto}
.badge{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;color:var(--c);background:color-mix(in srgb,var(--c) calc(var(--tint)*100%),transparent);white-space:nowrap}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--text2);margin:0 0 10px}
.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.filters{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.seg{display:flex;gap:4px;background:var(--raised);border:1px solid var(--border);border-radius:999px;padding:4px}
.seg button{border:0;background:transparent;color:var(--text2);font-family:inherit;font-weight:700;font-size:13px;padding:7px 14px;border-radius:999px;cursor:pointer;white-space:nowrap}
.seg button.on{background:var(--accent);color:var(--btntext)}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.stat{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:12px 14px;min-width:0}
.sl{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:6px}
.sv{font-size:24px;font-weight:900;margin:4px 0 2px}
.ss{font-size:12px;color:var(--text2);display:block;min-height:1.3em}
.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.stat.good .dot{background:var(--green)}.stat.warn .dot{background:var(--amber)}.stat.bad .dot{background:var(--red)}
.em{font-size:12px;color:var(--text2);margin-top:6px}
.em.none{color:var(--muted);font-style:italic}
.slots{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.slot{font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;background:color-mix(in srgb,var(--accent) calc(var(--tint)*100%),var(--card));color:var(--accent);border:1px solid color-mix(in srgb,var(--accent) 35%,transparent)}
.slot.clash{background:color-mix(in srgb,var(--red) calc(var(--tint)*100%),var(--card));color:var(--red);border-color:var(--red)}
.form label{display:block;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:12px}
.form input,.form select,.form textarea{display:block;width:100%;margin-top:4px;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:9px 10px;color:var(--text);font-family:inherit;font-size:14px;text-transform:none;letter-spacing:0;font-weight:400}
.form .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.form h4 .muted{text-transform:none;letter-spacing:0;font-weight:700;color:var(--accent)}
.er{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.8fr) minmax(0,1fr) 34px;gap:6px;margin-bottom:6px}
.fi .er{grid-template-columns:minmax(0,1fr) 34px}
.er input,.er select{margin:0!important}
.rm{border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:8px;cursor:pointer}
.rm:hover{color:var(--red);border-color:var(--red)}
.savebar2{position:sticky;bottom:-20px;background:var(--panel);display:flex;gap:8px;padding:14px 0 18px;margin-top:14px;border-top:1px solid var(--border)}
.wlbar{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chips button{border:1px solid var(--border);background:var(--panel);color:var(--text2);border-radius:999px;padding:6px 12px;font-family:inherit;font-weight:700;font-size:12px;cursor:pointer}
.chips button span{opacity:.7;margin-left:2px}
.chips button.on{background:var(--accent);border-color:var(--accent);color:var(--btntext)}
.addw{width:100%;border:1.5px dashed var(--border);background:transparent;color:var(--accent);font-family:inherit;font-weight:700;font-size:14px;border-radius:12px;padding:12px;cursor:pointer;margin-bottom:16px;text-align:left}
.addw:hover{border-color:var(--accent)}
.zgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:16px;align-items:start}
.zgrid .panel{margin-bottom:0}
.tripb{display:flex;justify-content:space-between;align-items:center;gap:10px;background:color-mix(in srgb,var(--green) calc(var(--tint)*100%),var(--card));border-left:4px solid var(--green);border-radius:8px;padding:10px 12px;margin-bottom:6px}
.tripb b{display:block;font-size:13px}.tripb small{color:var(--text2);font-size:12px}
.tripn{font-size:12px;color:var(--muted);font-style:italic;margin-bottom:6px}
.gaps{font-size:13px;font-weight:700;color:var(--muted);cursor:pointer;border:1px dashed var(--border);padding:6px 10px;border-radius:8px;background:none;font-family:inherit}
.gaps:hover{color:var(--amber);border-color:var(--amber)}
.calnav{display:flex;align-items:center;gap:10px}
.calnav b{min-width:130px;text-align:center}
.sw{font-size:13px;color:var(--text2);display:flex;gap:6px;align-items:center;margin-left:8px;cursor:pointer}
.mgrid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px}
.mgrid .panel{margin-bottom:0}
.cal7{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border:1px solid var(--border);border-radius:10px;overflow:hidden}
.ch{background:var(--raised);font-size:11px;font-weight:700;color:var(--muted);padding:6px 8px;text-transform:uppercase;letter-spacing:.06em}
.cd{min-height:96px;border-top:1px solid var(--border);border-left:1px solid var(--border);padding:4px;display:flex;flex-direction:column;gap:3px;min-width:0}
.cd:nth-child(7n+1){border-left:0}
.cd.out{background:var(--raised);opacity:.5}
.cd .dn{font-size:12px;font-weight:700;color:var(--muted);padding:2px 4px}
.cd.today .dn{background:var(--accent);color:var(--btntext);border-radius:999px;width:22px;text-align:center;padding:2px 0}
.mc{font-size:11px;border-radius:6px;padding:3px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;line-height:1.35}
.mc .t{font-weight:900}
.mc.solid{background:var(--accent);color:var(--btntext)}
.mc.solid.done{background:color-mix(in srgb,var(--accent) 45%,var(--card))}
.mc.ghost{border:1.5px dashed var(--amber);color:var(--text);background:color-mix(in srgb,var(--amber) 8%,transparent)}
.mc.ghost .t{color:var(--amber)}
.mc.ghost.overdue{border-color:var(--red);background:color-mix(in srgb,var(--red) 8%,transparent)}
.mc.ghost.overdue .t{color:var(--red)}
.lg-g{border:1.5px dashed var(--amber)}.lg-o{border:1.5px dashed var(--red)}
.agenda{display:none}
.agd{font-size:12px;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 6px}
.agenda .mc{font-size:13px;padding:9px 11px;margin-bottom:6px;white-space:normal}
.sr{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid var(--border);cursor:pointer}
.sr:first-child{border-top:0}
.sr b{display:block;font-size:14px}.sr small{display:block;color:var(--text2);font-size:12px;margin-top:2px}
.sre{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
.empty{color:var(--muted);font-size:13px;padding:10px 0}
.srch{width:100%;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-family:inherit;font-size:14px;margin-bottom:6px}
.wt{font-size:13px}
.wh,.wr{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:10px;padding:10px 4px;border-bottom:1px solid var(--border);align-items:center}
.wh{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.wr{cursor:pointer}.wr:hover{background:var(--raised)}
.wr small{display:block;color:var(--muted);font-size:11px;margin-top:3px}
.vis{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}
.vis div{background:var(--raised);border-radius:10px;padding:10px;min-width:0}
.vis span{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:700}
.vis b{display:block;font-size:16px;margin-top:3px;overflow-wrap:anywhere}.vis small{color:var(--text2);font-size:11px}
.flag{border-left:4px solid var(--c);background:color-mix(in srgb,var(--c) calc(var(--tint)*100%),var(--card));border-radius:8px;padding:10px 12px;margin-top:8px}
.flag b{display:block}.flag small{color:var(--text2)}
.eq{display:flex;gap:10px;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px}
.eq small{color:var(--text2)}.eq em{margin-left:auto;font-style:normal;color:var(--muted);font-size:12px;white-space:nowrap}
h4{margin:18px 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.lanepick{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.lanepick button{border:1px solid var(--border);background:var(--card);color:var(--text2);border-radius:20px;padding:5px 11px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer}
.lanepick button.on{background:var(--accent);color:var(--btntext);border-color:var(--accent)}
.row{border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-top:10px;background:var(--card);cursor:pointer}
.row b{display:block}.row small{color:var(--text2)}
.row .names{display:none;margin-top:6px}.row.open .names{display:block}
.row .names a{display:block;padding:4px 0;cursor:pointer;font-size:13px}
.sidep{position:relative;display:flex;flex-direction:column;min-height:0}
.sidelist{position:absolute;left:16px;right:8px;top:58px;bottom:12px;overflow-y:auto;padding-right:8px;scrollbar-width:thin;-webkit-mask-image:linear-gradient(#000 calc(100% - 28px),transparent);mask-image:linear-gradient(#000 calc(100% - 28px),transparent)}
.sidelist::after{content:"";display:block;height:24px}
.note{font-size:12px;color:var(--muted);margin-top:24px;text-align:center;line-height:1.5}
.scrim{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.35);display:none}
.drawer{position:fixed;top:0;right:0;height:100%;width:min(440px,100%);background:var(--panel);border-left:1px solid var(--border);color:var(--text);
 transform:translateX(100%);transition:transform .2s,visibility 0s .2s;visibility:hidden;padding:20px;overflow-y:auto;z-index:51}
.open .scrim{display:block}.open .drawer{transform:none;visibility:visible;transition:transform .2s}
.drawer h2{margin:0 0 4px;font-size:20px}
.drawer .x{float:right;cursor:pointer;font-size:20px;color:var(--muted);background:none;border:0;font-family:inherit}
.handle{display:none;width:40px;height:4px;border-radius:4px;background:var(--border);margin:-8px auto 12px}
.acts{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}
.toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:var(--text);color:var(--page);padding:10px 16px;border-radius:10px;font-weight:700;z-index:60;max-width:90vw;text-align:center}
@media(max-width:1000px){.mgrid{grid-template-columns:minmax(0,1fr)}.sidelist{position:static;max-height:none;padding-right:0;-webkit-mask-image:none;mask-image:none}}
@media(max-width:820px){
 .stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .gaps{font-size:11px;padding:5px 8px}
 .filters{flex-direction:column}
 #tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}
 #tabs button{font-size:12px;padding:7px 2px;white-space:normal;line-height:1.15}
 .calnav{flex-wrap:wrap;justify-content:space-between;width:100%}
 .sw{margin-left:0;width:100%;justify-content:center}
 .cal7{display:none}.agenda{display:block}
 .wh,.wr{grid-template-columns:1.2fr 1fr 1fr;gap:6px}
 .zgrid{grid-template-columns:minmax(0,1fr)}.tripb{flex-direction:column;align-items:flex-start}
 .er{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 34px}.er select{grid-column:1/-1}
 .drawer{top:auto;bottom:0;left:0;right:0;width:100%;height:auto;max-height:88vh;border-left:0;border-top:1px solid var(--border);border-radius:18px 18px 0 0;transform:translateY(100%)}
 .open .drawer{transform:none}
 .handle{display:block}
}`;

export function mountCustNew(host, db, extra) {
const R = host.shadowRoot || host.attachShadow({ mode: 'open' });
R.innerHTML = `<style>${CSS}</style><div class="k" id="k">
 <div class="top"><div><h1>Customers</h1><div class="sub" id="sub">Maintenance, waitlist and warranty</div></div><div class="r"><button class="gaps" id="gapbtn" hidden></button></div></div>
 <div class="filters"><div class="seg" id="tabs"></div>
  <div class="calnav" id="calnav"><button class="btn ghost sm" data-mon="-1" aria-label="Previous month">‹</button><b id="mlabel"></b><button class="btn ghost sm" data-mon="1" aria-label="Next month">›</button>
   <label class="sw"><input type="checkbox" id="ghost"> Show due dates</label></div></div>
 <section class="stats" id="stats"></section>
 <div id="view"><div class="empty">Loading customers…</div></div>
 <div class="note" id="note"></div>
 <div class="scrim" id="scrim"></div><aside class="drawer" id="drawer"></aside>
</div>`;
const $ = s => R.querySelector(s);
const K_ = $('#k');
const offs = [];
const me = (extra && extra.me) || null;
// theme follows the Hub
const mq = matchMedia('(prefers-color-scheme: dark)');
const syncTheme = () => { const t = document.documentElement.dataset.theme; K_.classList.toggle('dark', t ? t === 'dark' : mq.matches); };
syncTheme(); const tObs = new MutationObserver(syncTheme); tObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
mq.addEventListener('change', syncTheme); offs.push(() => { tObs.disconnect(); mq.removeEventListener('change', syncTheme); });

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const TODAY_S = iso(TODAY);
const pd = s => { if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null; const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const nice = s => { const d = pd(s); return d ? d.toLocaleDateString('en-CA', d.getFullYear() === TODAY.getFullYear() ? { weekday: 'short', month: 'short', day: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'; };
const md = s => { const d = pd(s); return d ? d.toLocaleDateString('en-CA', d.getFullYear() === TODAY.getFullYear() ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; };
const my = s => { const d = pd(s); return d ? d.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' }) : '—'; };
const full = s => { const d = pd(s); return d ? d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; };
const yrs = s => { const d = pd(s); return d ? (TODAY - d) / (365.25 * 864e5) : null; };
const fmtT = m => { if (!m) return '0 min'; const h = Math.floor(m / 60), r = m % 60; return `${h ? h + ' h ' : ''}${r ? r + ' min' : ''}`.trim(); };
const HCP = 'https://pro.housecallpro.com/app/';
const hcpCust = id => /^cus_[0-9a-f]+$/.test(id) ? HCP + 'customers/' + id : null;
const nowIso = () => new Date().toISOString();
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; K_.appendChild(d); setTimeout(() => d.remove(), 2600); }

const due = r => r.nextDueOverride || r.nextDue || null;
const VIS_BOOKED = ['scheduled', 'future'];
const upcoming = r => (r.visits || []).filter(v => VIS_BOOKED.includes(v.status) && v.date >= TODAY_S).sort((a, b) => a.date < b.date ? -1 : 1)[0] || null;
// a "unit" = one piece of heating/cooling equipment that takes ~45 min to maintain (Jacob: rule of thumb 45 min per unit)
const UNIT = /heat ?pump|ductless|\bhead\b|air handler|furnace|boiler|hrv|erv|air.to.water/i, NOTUNIT = /heat kit|coil|filter|thermostat|bath fan/i;
const units = r => (r.equipment || []).filter(e => UNIT.test(e.type || '') && !NOTUNIT.test(e.type || ''));
const mins = r => units(r).length * 45;
const lastDeep = r => { if (r.lastDeepClean) return r.lastDeepClean; let b = null; (r.visits || []).forEach(v => { if (v.status === 'done' && /deep clean/i.test((v.items || []).join(' ')) && (!b || v.date > b)) b = v.date; }); return b; };
const lastMaintVisit = r => (r.visits || []).filter(v => v.status === 'done').sort((a, b) => a.date < b.date ? 1 : -1)[0] || null;
// Deep clean rule (Jacob): suggested at 2 years, highly suggested at 4 (Jacob 2026-11-25: never 'required'). No deep clean on file -> counted from the install date.
function deepFlag(r) { const ld = lastDeep(r), base = ld || r.installDate; const y = yrs(base); if (y == null) return null; const why = ld ? `${y.toFixed(1)} yrs since last deep clean` : `${y.toFixed(1)} yrs since install, no deep clean on file`; return y >= 4 ? ['Deep clean highly suggested', 'red', why] : y >= 2 ? ['Deep clean suggested', 'amber', why] : null; }
const LOCAL_TOWN = /,\s*([^,]+?),\s*(?:BC|British Columbia)/i;
const town = r => (r.town && r.town !== 'null' ? r.town : ((r.address || '').match(LOCAL_TOWN) || [])[1] || '');
const price = r => { const o = r.outreach; if (o && o.price) return [o.price, 'from the booking email']; const v = (r.visits || []).filter(x => x.price).sort((a, b) => a.date < b.date ? 1 : -1)[0]; return v ? [v.price, 'last invoice'] : null; };
// visit time "8:00 AM-12:00 PM" -> [480, 720]
const tmin = s => { const m = String(s || '').match(/(\d{1,2})(?::(\d\d))?\s*(am|pm)/i); if (!m) return null; let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12; return h * 60 + (+m[2] || 0); };
const vRange = v => { if (!v.time) return null; const p = String(v.time).split(/\s*[-–]\s*/); const a = tmin(p[0]), b = tmin(p[1]); return a == null ? null : [a, b == null ? a + 60 : b]; };
const vStart = v => { const r = vRange(v); return r ? String(v.time).split(/\s*[-–]\s*/)[0].trim() : ''; };
// booking-email slots are text like "Tuesday, January 5 · 8am" -> {d:'2027-01-05', m:480, label}
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
function parseSlot(s, sent) {
 const m = String(s).match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})\b[^0-9]*?(\d{1,2}(?::\d\d)?\s*(?:am|pm))/i); if (!m) return { label: String(s) };
 const mi = MON.indexOf(m[1].toLowerCase()); if (mi < 0) return { label: String(s) };
 const base = pd((sent || '').slice(0, 10)) || TODAY; let y = base.getFullYear(); let d = new Date(y, mi, +m[2]); if (d < new Date(base.getFullYear(), base.getMonth(), base.getDate() - 7)) d = new Date(y + 1, mi, +m[2]);
 return { d: iso(d), m: tmin(m[3]), label: String(s) };
}
function offerSlots(r) { const o = r.outreach || {}; const L = (/round 2/i.test(o.status || '') && o.round2Slots) ? o.round2Slots : (o.slots || o.offered || []); return (Array.isArray(L) ? L : []).map(s => parseSlot(s, o.sentAt || o.since)); }
let BOOKED = [];   // every booked visit with a known time: {r, d, a, b}
function clash(r, sl) { if (!sl.d || sl.m == null) return null; const a = sl.m, b = a + Math.max(45, mins(r)); const x = BOOKED.find(v => v.r.id !== r.id && v.d === sl.d && v.a < b && v.b > a); return x ? x.r : null; }
function offers(r) {
 const o = r.outreach; if (!o || !o.status) return `<div class="em none">Not emailed yet</div>`;
 const sl = offerSlots(r);
 return `<div class="em">${o.sentAt || o.since ? 'Emailed ' + esc(md((o.sentAt || o.since).slice(0, 10))) + ' · ' : ''}${esc(o.status)}${sl.length ? ' · offered:' : ''}</div>${sl.length ? `<div class="slots">${sl.map(s => { const x = clash(r, s); return `<span class="slot ${x ? 'clash' : ''}">${esc(s.d ? nice(s.d) + ' ' + (String(s.label).match(/\d{1,2}(?::\d\d)?\s*(?:am|pm)/i) || [''])[0] : s.label)}${x ? ' · taken by ' + esc(x.name) : ''}</span>`; }).join('')}</div>` : ''}`;
}
const st = r => upcoming(r) ? 'booked' : (due(r) && due(r) < TODAY_S ? 'overdue' : 'due');

// ---------- state ----------
const S = { rows: [], meta: null, wl: null, tab: 'Maintenance', loaded: false };
let vm = TODAY.getMonth(), vy = TODAY.getFullYear(), wz = 'All', wfs = 'All', q = '', openId = null;
try { S.tab = localStorage.getItem('hb-ctab') || 'Maintenance'; $('#ghost').checked = localStorage.getItem('hb-cghost') === '1'; } catch (e) {}
const TABS = ['Maintenance', 'Waitlist', 'Warranty', 'All customers'];
if (!TABS.includes(S.tab)) S.tab = 'Maintenance';
const byId = id => S.rows.find(r => r.id === id);

// ---------- writes ----------
async function saveCust(r, patch, msg) {
 if (!db) { toast('Not saved: no connection'); return false; }
 const before = {}; Object.keys(patch).forEach(k => before[k] = r[k]); Object.assign(r, patch); draw();
 try { await db.doc('customers/' + r.id).update(patch); toast(msg || 'Saved'); return true; }
 catch (e) { Object.assign(r, before); draw(); toast('Not saved, try again'); return false; }
}
async function askClaude(title, text) {
 if (!db) { toast('Not sent: no connection'); return; }
 const id = 'req-' + Date.now().toString(36), at = nowIso(), by = me && me.name ? String(me.name).split(/\s+/)[0] : undefined;
 try { await db.doc('cards/' + id).set({ title: title.length > 70 ? title.slice(0, 67) + '…' : title, detail: text, column: 'todo', priority: 'normal', source: 'calvin', needsClaude: true, created: at, updated: at, msgs: [{ from: 'calvin', ...(by ? { by } : {}), text, at }] }); toast('Sent – a To Do card was made for Claude on your board'); }
 catch (e) { toast('Not sent, try again'); }
}
const WL = () => (S.wl && Array.isArray(S.wl.rows)) ? S.wl.rows : [];
const ZONES = () => (S.wl && Array.isArray(S.wl.zones) && S.wl.zones.length) ? S.wl.zones : ['Sayward', 'Campbell River', 'Port Alberni', 'Gold River / Tahsis', 'Cumberland / Union Bay'];
async function saveWl(rows, msg) {
 if (!db) { toast('Not saved: no connection'); return; }
 const prev = S.wl; S.wl = { ...(S.wl || {}), rows, zones: ZONES() }; draw();
 try { await db.doc('meta/waitlist').update({ rows, zones: ZONES(), updated: nowIso() }); if (msg) toast(msg); }
 catch (e) { S.wl = prev; draw(); toast('Not saved, try again'); }
}

// ---------- gaps ----------
const GAPS = [['No phone', r => !r.phone], ['No email', r => !r.email], ['No install date', r => !r.installDate], ['No equipment on file', r => !units(r).length], ['Equipment missing model or serial', r => (r.equipment || []).some(e => UNIT.test(e.type || '') && (!e.model || !e.serial))], ['No filter size', r => !(r.filters || []).length], ['No due date', r => !due(r)]];
function openGaps() {
openId = null;  setDrawer(`<div class="handle"></div><button class="x" data-close aria-label="Close">✕</button><h2>Records missing info</h2><small style="color:var(--muted)">Fix these so due dates, times and prices are right. Tap a line to see who.</small>
 ${GAPS.map(([l, fn]) => { const a = S.rows.filter(fn).sort((x, y) => String(x.name).localeCompare(String(y.name))); return a.length ? `<div class="row" data-gaprow><b>${esc(l)}</b><small>${a.length} customer${a.length === 1 ? '' : 's'}</small><div class="names">${a.map(r => `<a data-open="${esc(r.id)}">${esc(r.name)}</a>`).join('')}</div></div>` : ''; }).join('')}`);
}

// ---------- draw ----------
function draw() {
 $('#tabs').innerHTML = TABS.map(t => `<button data-tab="${t}" class="${t === S.tab ? 'on' : ''}">${t}</button>`).join('');
 $('#calnav').style.display = S.tab === 'Maintenance' ? 'flex' : 'none';
 $('#stats').style.display = (S.tab === 'Maintenance' || S.tab === 'Waitlist') ? 'grid' : 'none';
 $('#mlabel').textContent = new Date(vy, vm, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
 const gapN = S.rows.filter(r => GAPS.some(([, fn]) => fn(r))).length; const gb = $('#gapbtn'); gb.hidden = !gapN; gb.textContent = gapN + ' records missing info ›';
 $('#note').textContent = S.loaded ? `${S.rows.length} customers with heating or cooling equipment${S.meta && S.meta.syncedAt ? ' · last import ' + full(String(S.meta.syncedAt).slice(0, 10)) + ' from Housecall Pro' : ''} · next due = 1 year after the last maintenance (or install)` : '';
 if (!S.loaded) return;
 BOOKED = []; S.rows.forEach(r => (r.visits || []).forEach(v => { if (VIS_BOOKED.includes(v.status)) { const rg = vRange(v); if (rg) BOOKED.push({ r, d: v.date, a: rg[0], b: rg[1] }); } }));
 const V = $('#view');
 if (S.tab === 'Waitlist') { V.innerHTML = waitlist(); return; }
 if (S.tab === 'Maintenance') V.innerHTML = calendar();
 if (S.tab === 'All customers') { V.innerHTML = customers(); const i = $('#srch'); if (i) { i.value = q; filt(); } }
 if (S.tab === 'Warranty') V.innerHTML = warranty();
}
function stat(l, v, s, sub) { return `<div class="stat ${s}"><div class="sl">${s ? '<span class="dot"></span>' : ''}${esc(l)}</div><div class="sv">${v}</div><div class="ss">${sub}</div></div>`; }
function chip(r, v, ghost) {
 if (ghost) { const o = st(r) === 'overdue'; return `<div class="mc ghost ${o ? 'overdue' : ''}" data-open="${esc(r.id)}" title="${esc(r.name)}"><span class="t">${o ? 'overdue' : 'due'}</span> ${esc(r.name)}</div>`; }
 const done = v.status === 'done', t = done ? 'done' : (vStart(v) || 'booked');
 return `<div class="mc solid ${done ? 'done' : ''}" data-open="${esc(r.id)}" title="${esc(r.name)}"><span class="t">${esc(t)}</span> ${esc(r.name)}${mins(r) ? ' · ' + fmtT(mins(r)) : ''}</div>`;
}
function calendar() {
 const showG = $('#ghost').checked;
 const ym = `${vy}-${String(vm + 1).padStart(2, '0')}`, cur = ym === TODAY_S.slice(0, 7), future = ym > TODAY_S.slice(0, 7);
 const inM = S.rows.filter(r => (due(r) || '').startsWith(ym));
 const visits = []; S.rows.forEach(r => (r.visits || []).forEach(v => { if ((VIS_BOOKED.includes(v.status) || v.status === 'done') && (v.date || '').startsWith(ym)) visits.push({ r, v }); }));
 const bookedIds = new Set(visits.map(x => x.r.id));
 const isBooked = r => !!upcoming(r) || bookedIds.has(r.id);
 const notBm = inM.filter(r => !isBooked(r));
 // the current month also lists everyone overdue from earlier months, so nobody drops off
 const overAll = S.rows.filter(r => !upcoming(r) && due(r) && due(r) < TODAY_S);
 const side = (cur ? [...new Map([...overAll, ...notBm].map(r => [r.id, r])).values()] : future ? notBm : notBm).sort((a, b) => (due(a) || '') < (due(b) || '') ? -1 : 1);
 const bk = inM.filter(isBooked), em = side.filter(r => r.outreach && r.outreach.status).length, cl = side.filter(r => offerSlots(r).some(s => clash(r, s))).length;
 const oldest = overAll.slice().sort((a, b) => due(a) < due(b) ? -1 : 1)[0];
 $('#stats').innerHTML = [stat('Due this month', inM.length, '', `${fmtT(inM.reduce((a, r) => a + mins(r), 0))} of work in total`),
  stat('Booked', bk.length, 'good', `${fmtT(bk.reduce((a, r) => a + mins(r), 0))} scheduled`),
  stat('Not booked', side.length, side.length ? 'warn' : 'good', `${em} emailed · ${side.length - em} not yet${cl ? ` · <span style="color:var(--red)">${cl} clash</span>` : ''}`),
  stat('Overdue', overAll.length, overAll.length ? 'bad' : 'good', oldest ? `oldest due ${md(due(oldest))}` : 'none')].join('');
 const first = new Date(vy, vm, 1), start = first.getDay(), days = new Date(vy, vm + 1, 0).getDate();
 let cells = ''; for (let i = 0; i < start; i++) cells += '<div class="cd out"></div>';
 for (let d = 1; d <= days; d++) { const key = `${ym}-${String(d).padStart(2, '0')}`;
  const b = visits.filter(x => x.v.date === key).sort((a, c) => (vRange(a.v) || [0])[0] - (vRange(c.v) || [0])[0]).map(x => chip(x.r, x.v, false)).join('');
  const g = showG ? notBm.filter(r => due(r) === key).map(r => chip(r, null, true)).join('') : '';
  cells += `<div class="cd ${key === TODAY_S ? 'today' : ''}"><span class="dn">${d}</span>${b}${g}</div>`; }
 const items = [...visits.map(x => [x.v.date, chip(x.r, x.v, false)]), ...(showG ? notBm.map(r => [due(r), chip(r, null, true)]) : [])].sort((a, b) => a[0] < b[0] ? -1 : 1);
 let ag = '', last = ''; items.forEach(([d, h]) => { if (d !== last) { ag += `<div class="agd">${nice(d)}</div>`; last = d; } ag += h; });
 const sideH = side.map(r => { const s = st(r), f = deepFlag(r), u = units(r).length;
  return `<div class="sr" data-open="${esc(r.id)}"><div><b>${esc(r.name)}</b><small>${esc(r.address || town(r) || 'No address on file')}</small><small>${u ? u + ' unit' + (u === 1 ? '' : 's') + ' · ' + fmtT(mins(r)) : 'equipment not on file'}${f ? ` · <span style="color:var(--${f[1]})">${f[0]}</span>` : ''}</small>${offers(r)}</div>
  <div class="sre"><span class="badge" style="--c:var(--${s === 'overdue' ? 'red' : 'amber'})">${s === 'overdue' ? 'Overdue' : 'Due'} ${md(due(r))}</span></div></div>`; }).join('') || '<div class="empty">Everyone due this month is booked.</div>';
 return `<div class="mgrid"><section class="panel calp">
   <div class="legend"><span><i style="background:var(--accent)"></i>Booked</span><span><i class="lg-g"></i>Due, not booked</span><span><i class="lg-o"></i>Overdue</span></div>
   <div class="cal7">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(x => `<div class="ch">${x}</div>`).join('')}${cells}</div>
   <div class="agenda">${ag || '<div class="empty">Nothing booked this month.' + (showG ? '' : ' Turn on Show due dates to see who is due.') + '</div>'}</div></section>
  <section class="panel sidep"><div class="ph"><h2>Due, not booked</h2><span class="meta">${side.length}</span></div><div class="sidelist">${sideH}</div></section></div>`;
}
function customers() {
 const rows = S.rows.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
 return `<section class="panel"><div class="ph"><h2>Customers</h2><span class="meta">${rows.length} on file</span></div><input class="srch" id="srch" placeholder="Search name, address, phone, filter size…">
 <div id="clist">${rows.map(r => { const f = deepFlag(r), u = units(r).length, hay = [r.name, r.company, r.address, town(r), r.email, r.phone, r.phone2, ...(r.filters || []), ...(r.equipment || []).map(e => [e.make, e.model, e.serial].join(' '))].join(' ').toLowerCase();
  return `<div class="sr cr" data-s="${esc(hay)}" data-open="${esc(r.id)}"><div><b>${esc(r.name)}</b><small>${esc(r.address || town(r) || 'No address on file')}</small><small>${u ? u + ' unit' + (u === 1 ? '' : 's') + ' · ' + fmtT(mins(r)) + ' · ' : ''}next due ${nice(due(r))}</small></div><div class="sre">${upcoming(r) ? '<span class="badge" style="--c:var(--green)">Booked</span>' : ''}${f ? `<span class="badge" style="--c:var(--${f[1]})">${f[0].replace('Deep clean ', 'Deep clean – ')}</span>` : ''}</div></div>`; }).join('')}</div></section>`;
}
function filt() { const ql = q.toLowerCase(), dg = ql.replace(/\D/g, ''); R.querySelectorAll('#clist .cr').forEach(r => { const s = r.dataset.s; r.style.display = !ql || s.includes(ql) || (dg.length >= 3 && s.replace(/\D/g, '').includes(dg)) ? '' : 'none'; }); }
function wst(d) { const p = pd(d); if (!p) return null; const m = (p - TODAY) / (30.4 * 864e5); return m < 0 ? ['Expired', 'muted'] : m < 3 ? ['Expires soon', 'amber'] : ['Active', 'green']; }
const wParts = r => r.warranty && r.warranty.parts && r.warranty.parts.expires || null, wLab = r => r.warranty && r.warranty.labour && r.warranty.labour.expires || null;
function warranty() {
 const rows = S.rows.filter(r => wParts(r) || wLab(r)).map(r => { const ds = [wParts(r), wLab(r)].filter(Boolean).map(pd).map(d => d - TODAY).filter(x => x > 0); return { r, soon: ds.length ? Math.min(...ds) : 9e15 }; }).sort((a, b) => a.soon - b.soon);
 const cell = d => { const w = wst(d); return w ? `<span><span class="badge" style="--c:var(--${w[1]})">${w[0]}</span><small>${my(d)}</small></span>` : `<span><small>Not on file</small></span>`; };
 return `<section class="panel"><div class="ph"><h2>Warranty</h2><span class="meta">soonest to expire first · ${rows.length} with dates on file</span></div>
 <div class="wt"><div class="wh"><span>Customer</span><span>Parts</span><span>Labour</span></div>${rows.map(({ r }) => `<div class="wr" data-open="${esc(r.id)}"><span><b>${esc(r.name)}</b><small>Installed ${my(r.installDate)}</small></span>${cell(wParts(r))}${cell(wLab(r))}</div>`).join('') || '<div class="empty">No warranty dates on file yet.</div>'}</div></section>`;
}

// ---------- customer drawer ----------
function setDrawer(h) { const d = $('#drawer'); d.innerHTML = h; d.scrollTop = 0; K_.classList.add('open'); }
function closeD() { K_.classList.remove('open'); openId = null; }
function openC(id) {
 const r = byId(id); if (!r) return; openId = id; const f = deepFlag(r), m = mins(r), s = st(r), up = upcoming(r), u = units(r), pr = price(r), ld = lastDeep(r), url = hcpCust(r.id);
 const tel = String(r.phone || '').replace(/[^\d+]/g, '');
 const openFlags = (r.flags || []).filter(x => x.status !== 'done');
 const done = (r.visits || []).filter(v => v.status === 'done').sort((a, b) => a.date < b.date ? 1 : -1);
 setDrawer(`<div class="handle"></div><button class="x" data-close aria-label="Close">✕</button>
 <h2>${esc(r.name)}</h2><small style="color:var(--muted)">${esc(r.address || 'No address on file')}${r.phone ? ` · <a href="tel:${esc(tel)}">${esc(r.phone)}</a>` : ''}</small>
 <div class="vis"><div><span>Next due</span><b>${nice(due(r))}</b>${r.nextDueOverride ? '<small>set by hand</small>' : ''}</div><div><span>Status</span><b style="color:var(--${s === 'booked' ? 'green' : s === 'overdue' ? 'red' : 'amber'})">${s === 'booked' ? 'Booked ' + nice(up.date) + (vStart(up) ? ' ' + esc(vStart(up)) : '') : s === 'overdue' ? 'Overdue' : 'Not booked'}</b></div>
 <div><span>Time</span><b>${u.length ? fmtT(m) : '—'}</b><small>${u.length ? u.length + ' unit' + (u.length === 1 ? '' : 's') + ' × 45 min' : 'equipment not on file'}</small></div><div><span>Price</span><b>${pr ? esc(String(pr[0]).split(/\s[-–(]/)[0]) : '—'}</b><small>${pr ? esc(pr[1]) : 'not on file'}</small></div></div>
 ${f ? `<div class="flag" style="--c:var(--${f[1]})"><b>${f[0]}</b><small>${esc(f[2])} · rule: suggested at 2 yrs, highly suggested at 4</small></div>` : `<div class="flag" style="--c:var(--${ld || r.installDate ? 'green' : 'muted'})"><b>${ld || r.installDate ? 'No deep clean needed' : 'Deep clean: not enough info'}</b><small>${ld ? 'last deep clean ' + full(ld) : r.installDate ? 'installed ' + full(r.installDate) : 'no install date or deep clean on file'}</small></div>`}
 ${openFlags.length ? `<h4>Raise at next visit</h4>${openFlags.map(x => `<div class="eq"><span>${esc(x.text)}</span>${x.date ? `<em>${md(x.date)}</em>` : ''}</div>`).join('')}` : ''}
 ${up ? '' : `<h4>Booking email</h4>${offers(r)}`}
 ${r.notes ? `<h4>Notes</h4><div class="eq"><span>${esc(r.notes)}</span></div>` : ''}
 <h4>Equipment</h4>${(r.equipment || []).map(e => `<div class="eq"><span>${esc(e.type || 'Equipment')}</span><small>${esc([e.make, e.model].filter(Boolean).join(' '))}</small><em>${UNIT.test(e.type || '') && !NOTUNIT.test(e.type || '') ? '45 min' : ''}</em></div>`).join('') || '<div class="eq"><small>None on file</small></div>'}
 <h4>Filters</h4>${(r.filters || []).map(x => `<div class="eq"><span>${esc(x)}</span></div>`).join('') || '<div class="eq"><small>None on file</small></div>'}
 <h4>Warranty</h4><div class="eq"><span>Parts</span><small>${wParts(r) ? 'until ' + full(wParts(r)) : 'not on file'}</small></div><div class="eq"><span>Labour</span><small>${wLab(r) ? 'until ' + full(wLab(r)) : 'not on file'}</small></div>
 <h4>Past visits</h4>${done.slice(0, 6).map(v => `<div class="eq"><span>${esc(/deep clean/i.test((v.items || []).join(' ')) ? 'Deep clean' : (v.items || [])[0] || 'Maintenance')}</span><small>${nice(v.date)}</small>${v.job ? `<em>#${esc(v.job)}</em>` : ''}</div>`).join('')}${r.installDate ? `<div class="eq"><span>Install</span><small>${nice(r.installDate)}</small></div>` : ''}${!done.length && !r.installDate ? '<div class="eq"><small>None on file</small></div>' : ''}
 <div class="acts">${up ? `<button class="btn ghost" data-resched="${esc(r.id)}">Reschedule</button>` : ''}${url ? `<a class="btn ghost" href="${url}" target="_blank" rel="noopener">Open in HCP</a>` : ''}<button class="btn ghost" data-edit="${esc(r.id)}">Edit record</button></div>`);
}
const TYPES = ['Ducted heat pump', 'Ductless heat pump (outdoor)', 'Ductless head (indoor)', 'Air handler', 'Gas furnace', 'Oil furnace', 'Electric furnace', 'Air-to-water heat pump', 'Boiler', 'HRV / ERV', 'Thermostat', 'Air filter', 'Heat kit', 'Evaporator coil', 'Other'];
const eqRow = (e, i) => { e = e || { type: 'Ductless head (indoor)' }; const ty = TYPES.includes(e.type) ? TYPES : [...TYPES, e.type];
 return `<div class="er" data-i="${i == null ? '' : i}"><select>${ty.map(t => `<option ${t === e.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select><input class="mk" value="${esc(e.make || '')}" placeholder="Make"><input class="md" value="${esc(e.model || '')}" placeholder="Model"><button class="rm" data-rm title="Remove">✕</button></div>`; };
const fRow = f => `<div class="er"><input value="${esc(f || '')}" placeholder="e.g. Air handler: 16x25x5 MERV 11"><button class="rm" data-rm title="Remove">✕</button></div>`;
function editC(id) {
 const r = byId(id); if (!r) return; openId = id;
 setDrawer(`<div class="handle"></div><button class="x" data-open="${esc(r.id)}" aria-label="Back">✕</button>
 <h2>Edit ${esc(r.name)}</h2><small style="color:var(--muted)">Changes update the due list, visit time and deep clean flag</small>
 <div class="form">
  <label>Phone<input id="f-ph" value="${esc(r.phone || '')}"></label>
  <label>Address<input id="f-a" value="${esc(r.address || '')}"></label>
  <div class="two"><label>Next due<input type="date" id="f-due" value="${esc(due(r) || '')}"></label><label>Install date<input type="date" id="f-inst" value="${esc((r.installDate || '').slice(0, 10))}"></label></div>
  <div class="two"><label>Last maintenance<input type="date" id="f-last" value="${esc((r.lastMaint || '').slice(0, 10))}"></label><label>Last deep clean<input type="date" id="f-deep" value="${esc(lastDeep(r) || '')}"></label></div>
  <h4>Equipment <span id="eqc" class="muted"></span></h4><div id="f-eq">${(r.equipment || []).map((e, i) => eqRow(e, i)).join('')}</div>
  <button class="btn ghost sm" data-addeq>+ Add unit</button>
  <h4>Filters</h4><div id="f-fi" class="fi">${(r.filters || []).map(fRow).join('')}</div>
  <button class="btn ghost sm" data-addfi>+ Add filter</button>
  <h4>Warranty</h4><div class="two"><label>Parts until<input type="date" id="f-wp" value="${esc(wParts(r) || '')}"></label><label>Labour until<input type="date" id="f-wl" value="${esc(wLab(r) || '')}"></label></div>
  <label>Notes<textarea id="f-no" rows="3" placeholder="Gate code, dog, park on street…">${esc(r.notes || '')}</textarea></label>
 </div>
 <div class="savebar2"><button class="btn" data-save="${esc(r.id)}">Save</button><button class="btn ghost" data-open="${esc(r.id)}">Cancel</button></div>`);
 eqCount();
}
function eqCount() { const n = [...R.querySelectorAll('#f-eq .er select')].filter(s => UNIT.test(s.value) && !NOTUNIT.test(s.value)).length; const el = $('#eqc'); if (el) el.textContent = `· ${n} unit${n === 1 ? '' : 's'} = ${fmtT(n * 45)}`; }
async function saveC(id) {
 const r = byId(id); if (!r) return; const v = k => { const el = R.getElementById(k); return el ? el.value.trim() : ''; };
 const patch = {}, edited = {}; const mark = (k, val) => { patch[k] = val; edited[k] = TODAY_S; };
 if (v('f-ph') !== (r.phone || '')) mark('phone', v('f-ph'));
 if (v('f-a') !== (r.address || '')) mark('address', v('f-a'));
 if (v('f-due') && v('f-due') !== due(r)) mark('nextDueOverride', v('f-due'));
 if (v('f-inst') !== (r.installDate || '').slice(0, 10)) mark('installDate', v('f-inst') || null);
 if (v('f-last') !== (r.lastMaint || '').slice(0, 10)) mark('lastMaint', v('f-last') || null);
 if (v('f-deep') !== (lastDeep(r) || '')) mark('lastDeepClean', v('f-deep') || null);
 if (v('f-no') !== (r.notes || '')) patch.notes = v('f-no');
 // equipment: keep every field we don't show (serial, size, filter, install date…); only type/make/model change here
 const old = (r.equipment || []).map(x => ({ ...x })), keep = new Set();
 const eq = [...R.querySelectorAll('#f-eq .er')].map(row => { const i = row.dataset.i, t = row.querySelector('select').value, mk = row.querySelector('.mk').value.trim(), mo = row.querySelector('.md').value.trim();
  if (i !== '') { keep.add(+i); const o = old[+i]; return (o.type === t && (o.make || '') === mk && (o.model || '') === mo) ? o : { ...o, type: t, make: mk, model: mo, src: 'app' }; }
  return { type: t, make: mk, model: mo, serial: null, src: 'app' }; });
 if (JSON.stringify(eq) !== JSON.stringify(old)) { mark('equipment', eq); const gone = old.filter((_, i) => !keep.has(i)); if (gone.length) patch.equipmentRemoved = [...(r.equipmentRemoved || []), ...gone.map(g => ({ ...g, removedDate: TODAY_S, removedBy: 'app' }))]; }
 const fi = [...R.querySelectorAll('#f-fi .er input')].map(i => i.value.trim()).filter(Boolean);
 if (JSON.stringify(fi) !== JSON.stringify(r.filters || [])) mark('filters', fi);
 if (v('f-wp') !== (wParts(r) || '') || v('f-wl') !== (wLab(r) || '')) { const w = JSON.parse(JSON.stringify(r.warranty || {})); if (v('f-wp') !== (wParts(r) || '')) w.parts = { ...(w.parts || {}), expires: v('f-wp') || null, src: 'edited in app ' + TODAY_S }; if (v('f-wl') !== (wLab(r) || '')) w.labour = { ...(w.labour || {}), expires: v('f-wl') || null, src: 'edited in app ' + TODAY_S }; mark('warranty', w); }
 if (!Object.keys(patch).length) { openC(id); return; }
 if (Object.keys(edited).length) patch.appEdits = { ...(r.appEdits || {}), ...edited };   // tells Claude's HCP import which fields were changed by hand
 const ok = await saveCust(r, patch, 'Saved – record updated'); if (ok) openC(id);
}

// ---------- waitlist ----------
const zoneOf = (txt) => { const t = String(txt || '').toLowerCase(); return ZONES().find(z => z.toLowerCase().split(/\s*\/\s*/).some(k => k && t.includes(k))) || null; };
// a "trip" = a booked visit in the zone (from the customers' booked maintenance in HCP)
function trip(z) { let best = null; S.rows.forEach(r => { if (zoneOf((r.address || '') + ' ' + town(r)) !== z) return; (r.visits || []).forEach(v => { if (VIS_BOOKED.includes(v.status) && v.date >= TODAY_S && (!best || v.date < best.d)) best = { d: v.date, job: ((v.items || [])[0] || 'Maintenance') + ' – ' + r.name, time: vStart(v) }; }); }); return best; }
const urgC = { High: 'red', Medium: 'amber', Low: 'green' };
function waitlist() {
 const W = WL(), w = W.filter(x => x.st !== 'Booked'), m = w.filter(x => trip(x.z));
 $('#stats').innerHTML = [stat('On the waitlist', w.length, '', `${new Set(w.map(x => x.z)).size} zone${new Set(w.map(x => x.z)).size === 1 ? '' : 's'}`),
  stat('Trip coming up', m.length, m.length ? 'good' : '', m.length ? `in ${new Set(m.map(x => x.z)).size} zone${new Set(m.map(x => x.z)).size === 1 ? '' : 's'} with a booked job` : 'no matches yet'),
  stat('High urgency', w.filter(x => x.urg === 'High').length, w.some(x => x.urg === 'High') ? 'bad' : '', 'need a visit soon'),
  stat('Contacted', w.filter(x => x.st === 'Contacted').length, '', 'offered a day, no reply yet')].join('');
 const f = w.filter(x => (wz === 'All' || x.z === wz) && (wfs === 'All' || (wfs === 'High urgency' ? x.urg === 'High' : x.st === wfs)));
 const zl = [...new Set([...ZONES(), ...w.map(x => x.z)])];
 const zones = zl.filter(z => f.some(x => x.z === z)).sort((a, b) => { const ta = trip(a), tb = trip(b); return ta && tb ? (ta.d < tb.d ? -1 : 1) : ta ? -1 : tb ? 1 : 0; });
 const chipsZ = ['All', ...zl.filter(z => w.some(x => x.z === z))].map(z => `<button data-wz="${esc(z)}" class="${z === wz ? 'on' : ''}">${esc(z)}${z !== 'All' ? ` <span>${w.filter(x => x.z === z).length}</span>` : ''}</button>`).join('');
 const chipsS = ['All', 'Waiting', 'Contacted', 'High urgency'].map(z => `<button data-wfs="${z}" class="${z === wfs ? 'on' : ''}">${z}</button>`).join('');
 const groups = zones.map(z => { const t = trip(z), list = f.filter(x => x.z === z).sort((a, b) => a.added < b.added ? -1 : 1), tot = list.reduce((a, x) => a + (+x.t || 0), 0);
  return `<section class="panel zone"><div class="ph"><h2>${esc(z)}</h2><span class="meta">${list.length} waiting · ${fmtT(tot)}</span></div>
  ${t ? `<div class="tripb"><div><b>A job is booked in ${esc(z)} ${nice(t.d)}${t.time ? ' ' + esc(t.time) : ''}</b><small>Booked: ${esc(t.job)} · room for ${fmtT(tot)} of extra work?</small></div><button class="btn sm" data-offer="${esc(z)}">Draft offer emails</button></div>` : `<div class="tripn">No booked job in ${esc(z)} yet – it will show here when one is booked</div>`}
  ${list.map(x => `<div class="sr" data-w="${esc(x.id)}"><div><b>${esc(x.n)}</b><small>${esc(x.a)}</small><small>${esc(x.what)}${x.eq ? ' · ' + esc(x.eq) : ''} · ${fmtT(+x.t || 0)} · added ${md(x.added)}</small></div>
   <div class="sre"><span class="badge" style="--c:var(--${x.st === 'Contacted' ? 'accent' : 'amber'})">${esc(x.st)}</span><span class="badge" style="--c:var(--${urgC[x.urg] || 'muted'})">${esc(x.urg)}</span></div></div>`).join('')}</section>`; }).join('');
 return `<div class="wlbar"><div class="chips">${chipsZ}</div><div class="chips">${chipsS}</div></div>
 <button class="addw" data-addw>+ Add to waitlist</button>
 <div class="zgrid">${groups || `<section class="panel"><div class="empty">${w.length ? 'Nobody waiting with these filters.' : 'Nobody on the waitlist yet. Add far-away customers here and they show up when a job is booked near them.'}</div></section>`}</div>`;
}
function openW(id) { openId = null; const x = WL().find(y => y.id === id); if (!x) return; const t = trip(x.z);
 setDrawer(`<div class="handle"></div><button class="x" data-close aria-label="Close">✕</button>
 <h2>${esc(x.n)}</h2><small style="color:var(--muted)">${esc(x.a)}${x.ph ? ' · ' + esc(x.ph) : ''}</small>
 <div class="vis"><div><span>Zone</span><b>${esc(x.z)}</b></div><div><span>Wants</span><b>${esc(x.what)}</b><small>${esc(x.eq || '')}</small></div>
 <div><span>Time</span><b>${fmtT(+x.t || 0)}</b></div><div><span>Urgency</span><b style="color:var(--${urgC[x.urg] || 'muted'})">${esc(x.urg)}</b></div></div>
 ${t ? `<div class="flag" style="--c:var(--green)"><b>Trip coming up: ${nice(t.d)}</b><small>${esc(t.job)}</small></div>` : `<div class="flag" style="--c:var(--muted)"><b>No trip to ${esc(x.z)} booked yet</b><small>It shows here as soon as a job is booked in this zone</small></div>`}
 ${x.note ? `<h4>Notes</h4><div class="eq"><span>${esc(x.note)}</span></div>` : ''}
 <h4>Status</h4><div class="lanepick">${['Waiting', 'Contacted', 'Booked'].map(s => `<button class="${s === x.st ? 'on' : ''}" data-setw="${esc(x.id)}" data-s="${s}">${s}</button>`).join('')}</div>
 <div class="acts">${t ? `<button class="btn" data-offer1="${esc(x.id)}">Draft offer for ${nice(t.d)}</button>` : ''}${x.cid && hcpCust(x.cid) ? `<a class="btn ghost" href="${hcpCust(x.cid)}" target="_blank" rel="noopener">Open in HCP</a>` : ''}<button class="btn ghost" data-editw="${esc(x.id)}">Edit</button><button class="btn ghost" data-rmw="${esc(x.id)}">Remove</button></div>`); }
function addW(id) { openId = null; const x = id ? WL().find(y => y.id === id) : { n: '', a: '', ph: '', z: ZONES()[0], what: 'Maintenance', eq: '', t: 60, urg: 'Low', st: 'Waiting', note: '' };
 const zl = [...new Set([...ZONES(), x.z])];
 setDrawer(`<div class="handle"></div><button class="x" data-close aria-label="Close">✕</button>
 <h2>${id ? 'Edit ' + esc(x.n) : 'Add to waitlist'}</h2><small style="color:var(--muted)">They show up with a trip banner when a job is booked in their zone</small>
 <div class="form">
  <label>Customer<input id="w-n" list="custlist2" value="${esc(x.n)}" placeholder="Search customers or type a new name" autocomplete="off"></label>
  <label>Address<input id="w-a" value="${esc(x.a)}"></label>
  <label>Phone<input id="w-ph" value="${esc(x.ph || '')}"></label>
  <div class="two"><label>Zone<select id="w-z">${zl.map(z => `<option ${z === x.z ? 'selected' : ''}>${esc(z)}</option>`).join('')}</select></label>
  <label>Wants<select id="w-w">${['Maintenance', 'Repair', 'Diagnostic', 'Quote', 'Startup', 'Install'].map(z => `<option ${z === x.what ? 'selected' : ''}>${z}</option>`).join('')}</select></label></div>
  <label>Equipment / details<input id="w-e" value="${esc(x.eq || '')}" placeholder="e.g. Heat pump + 2 heads"></label>
  <div class="two"><label>Time needed (min)<input id="w-t" type="number" step="15" value="${esc(x.t)}"></label>
  <label>Urgency<select id="w-u">${['Low', 'Medium', 'High'].map(z => `<option ${z === x.urg ? 'selected' : ''}>${z}</option>`).join('')}</select></label></div>
  <label>Notes<textarea id="w-no" rows="2" placeholder="Only Fridays, call first…">${esc(x.note || '')}</textarea></label>
 </div>
 <datalist id="custlist2">${S.rows.map(r => `<option value="${esc(r.name)}">`).join('')}</datalist>
 <div class="savebar2"><button class="btn" data-savew="${esc(id || '')}">Save</button><button class="btn ghost" data-close>Cancel</button></div>`); }
async function saveW(id) { const v = k => { const el = R.getElementById(k); return el ? el.value.trim() : ''; };
 if (!v('w-n')) { toast('Add a customer name'); return; }
 const c = S.rows.find(r => String(r.name).toLowerCase() === v('w-n').toLowerCase());
 const o = { n: v('w-n'), a: v('w-a'), ph: v('w-ph'), z: v('w-z'), what: v('w-w'), eq: v('w-e'), t: +v('w-t') || 60, urg: v('w-u'), note: v('w-no'), ...(c ? { cid: c.id } : {}) };
 const rows = WL().map(x => ({ ...x }));
 if (id) { const x = rows.find(y => y.id === id); Object.assign(x, o, { edited: TODAY_S }); }
 else rows.push({ id: 'w' + Date.now().toString(36), ...o, st: 'Waiting', added: TODAY_S, by: me && me.name ? String(me.name).split(/\s+/)[0] : '' });
 closeD(); await saveW2(rows, id ? 'Saved' : 'Added to waitlist'); }
const saveW2 = (rows, msg) => saveWl(rows, msg);

// ---------- events ----------
R.addEventListener('click', async e => {
 const t = e.target;
 const tab = t.closest('[data-tab]'); if (tab) { S.tab = tab.dataset.tab; try { localStorage.setItem('hb-ctab', S.tab); } catch (_) {} draw(); return; }
 const mo = t.closest('[data-mon]'); if (mo) { vm += +mo.dataset.mon; if (vm < 0) { vm = 11; vy--; } if (vm > 11) { vm = 0; vy++; } draw(); return; }
 if (t.closest('#gapbtn')) { openGaps(); return; }
 if (t.closest('[data-close]') || t.closest('#scrim')) { closeD(); return; }
 const gr = t.closest('[data-gaprow]'); if (gr && !t.closest('[data-open]')) { gr.classList.toggle('open'); return; }
 const op = t.closest('[data-open]'); if (op) { openC(op.dataset.open); return; }
 const ed = t.closest('[data-edit]'); if (ed) { editC(ed.dataset.edit); return; }
 const sv = t.closest('[data-save]'); if (sv) { sv.disabled = true; await saveC(sv.dataset.save); sv.disabled = false; return; }
 if (t.closest('[data-addeq]')) { $('#f-eq').insertAdjacentHTML('beforeend', eqRow(null, null)); eqCount(); return; }
 if (t.closest('[data-addfi]')) { $('#f-fi').insertAdjacentHTML('beforeend', fRow('')); return; }
 const rm = t.closest('[data-rm]'); if (rm) { rm.parentNode.remove(); eqCount(); return; }
 const rs = t.closest('[data-resched]'); if (rs) { const r = byId(rs.dataset.resched), up = r && upcoming(r); if (r && up) askClaude('Reschedule maintenance: ' + r.name, `Please reschedule ${r.name}'s maintenance (now booked ${nice(up.date)}${vStart(up) ? ' ' + vStart(up) : ''}${up.job ? ', job #' + up.job : ''}). Offer new times and draft the email for my OK.`); return; }
 const wzb = t.closest('[data-wz]'); if (wzb) { wz = wzb.dataset.wz; draw(); return; }
 const wfb = t.closest('[data-wfs]'); if (wfb) { wfs = wfb.dataset.wfs; draw(); return; }
 if (t.closest('[data-addw]')) { addW(null); return; }
 const wr = t.closest('[data-w]'); if (wr) { openW(wr.dataset.w); return; }
 const ew = t.closest('[data-editw]'); if (ew) { addW(ew.dataset.editw); return; }
 const sw = t.closest('[data-savew]'); if (sw) { await saveW(sw.dataset.savew); return; }
 const rw = t.closest('[data-rmw]'); if (rw) { if (!confirmRm(rw)) return; await saveWl(WL().filter(y => y.id !== rw.dataset.rmw), 'Removed from waitlist'); closeD(); return; }
 const sw2 = t.closest('[data-setw]'); if (sw2) { const id = sw2.dataset.setw, s = sw2.dataset.s; await saveWl(WL().map(y => y.id === id ? { ...y, st: s, ...(s === 'Booked' ? { bookedOn: TODAY_S } : {}) } : y), s === 'Booked' ? 'Booked – moved off the waitlist' : 'Status saved'); if (s === 'Booked') closeD(); else openW(id); return; }
 const of = t.closest('[data-offer]'); if (of) { const z = of.dataset.offer, tr = trip(z), list = WL().filter(x => x.z === z && x.st !== 'Booked'); if (tr) askClaude(`Waitlist offers: ${z} trip ${md(tr.d)}`, `A job is booked in ${z} on ${nice(tr.d)}${tr.time ? ' ' + tr.time : ''} (${tr.job}). Please draft offer emails for the waitlist there, for my OK before anything is sent:\n${list.map(x => `- ${x.n}, ${x.a}: ${x.what}${x.eq ? ' (' + x.eq + ')' : ''}, ${fmtT(+x.t || 0)}, ${x.urg} urgency${x.note ? ' – ' + x.note : ''}`).join('\n')}`); return; }
 const o1 = t.closest('[data-offer1]'); if (o1) { const x = WL().find(y => y.id === o1.dataset.offer1), tr = x && trip(x.z); if (x && tr) askClaude(`Waitlist offer: ${x.n} (${x.z} ${md(tr.d)})`, `A job is booked in ${x.z} on ${nice(tr.d)}${tr.time ? ' ' + tr.time : ''} (${tr.job}). Please draft an offer email to ${x.n}, ${x.a}, for ${x.what}${x.eq ? ' (' + x.eq + ')' : ''}, about ${fmtT(+x.t || 0)}, for my OK before it is sent.${x.note ? ' Note: ' + x.note : ''}`); return; }
});
function confirmRm(btn) { if (btn.dataset.sure) return true; btn.dataset.sure = '1'; btn.textContent = 'Tap again to remove'; setTimeout(() => { if (btn.isConnected) { delete btn.dataset.sure; btn.textContent = 'Remove'; } }, 3000); return false; }
R.addEventListener('change', e => { if (e.target.id === 'ghost') { try { localStorage.setItem('hb-cghost', e.target.checked ? '1' : '0'); } catch (_) {} draw(); } if (e.target.matches && e.target.matches('#f-eq select')) eqCount();
 if (e.target.id === 'w-n') { const c = S.rows.find(r => String(r.name).toLowerCase() === e.target.value.trim().toLowerCase()); if (c) { const a = R.getElementById('w-a'), p = R.getElementById('w-ph'), z = R.getElementById('w-z'); if (a && !a.value) a.value = c.address || ''; if (p && !p.value) p.value = c.phone || ''; const zz = zoneOf((c.address || '') + ' ' + town(c)); if (z && zz) z.value = zz; } } });
R.addEventListener('input', e => { if (e.target.id === 'srch') { q = e.target.value; filt(); } });
R.addEventListener('keydown', e => { if (e.key === 'Escape') closeD(); });

// ---------- data ----------
let deep = false;
draw();
if (db) {
 offs.push(db.collection('customers').onSnapshot(snap => { S.rows = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => !r.removed); S.loaded = true; draw();
  if (!deep) { deep = true; try { const m = ((location.hash || '') + '&' + (location.search || '')).match(/(?:[#&?]|^)c(?:ust)?=(cus_[0-9a-f]+)/); if (m && byId(m[1])) openC(m[1]); } catch (_) {} }
  else if (openId && K_.classList.contains('open') && !R.querySelector('#drawer .form')) openC(openId); }, () => { $('#view').innerHTML = '<div class="empty">Couldn\'t load customers. Reload the page.</div>'; }));
 offs.push(db.doc('meta/info').onSnapshot(s => { S.meta = s.exists ? s.data() : null; draw(); }, () => {}));
 offs.push(db.doc('meta/waitlist').onSnapshot(s => { S.wl = s.exists ? s.data() : null; draw(); }, () => {}));
}
return () => { offs.forEach(f => { try { f(); } catch (e) {} }); R.innerHTML = ''; };
}
