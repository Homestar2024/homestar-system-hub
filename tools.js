// Homestar HQ - Tools (v0.30.8 refrigerant: below 1/2 lb (8 oz) goes red and is not priced; order R-22, R-410A, R-32, R-454B (Calvin 2026-11-21); v0.30.7 refrigerant picker on service repairs: R-22/R-410A/R-32/R-454B, qty in lb or oz, 1/2 lb minimum, HCP per-lb prices, Masters cost (Calvin 2026-11-21); v0.30.6 diagnostic: flat $159, no time or who's-going inputs; internal margin panel back, costed as 1 h of Calvin at break-even, travel not included (Calvin 2026-11-21); v0.30.5 diagnostic = FLAT $159, period: no hours, no travel, no extra time (Calvin 2026-11-21, matches HCP 'Diagnostic Visit - Flat Rate'); v0.30.4 diagnostic = FLAT $159 for the first hour on site, travel included, extra hours $159/h only with the customer's OK (Calvin 2026-11-21; replaces v0.30.3 travel-at-break-even, which a later deploy had overwritten); v0.30.2 departments = Installation + Service only; diagnostic bills one person, no parts/PST (Calvin 2026-11-20); v0.30.1 installs priced on 12% net only, 40% gross = target shown as a note (Calvin 2026-11-20); v0.30 RATE RESET 2026-11-20 (Calvin confirmed): overhead $96.24 per PERSON-hour on the job (QBO Jun-Oct overhead $78,415 / HCP job hours Calvin 585 + Jacob 230); Calvin $44.47, Jacob $29.87 burdened; install 12% net -> Calvin $159.90 / Jacob $143.30; service 18% -> $172 / $154; travel at break-even $140.71 / $126.11. Earlier v0.29.x crew models are retired.)
// mountTools(host, db, extra) renders into a shadow root on host and returns a cleanup function. extra.tool = '' (list) or 'pricing'.
// RATES = the company rate model - the RATE RESET line in START HERE s8 is the source. Change them here AND there the same day; recompute at each month-end close.
export const RATES = {
  asOf: '2026-11-20 (Jun-Oct data)',
  overheadPerPersonHour: 96.24,
  crew: [{ id: 'calvin', name: 'Calvin', rate: 44.47 }, { id: 'jacob', name: 'Jacob', rate: 29.87 }],
  dept: {
    install: { label: 'Installation', net: 12, gross: 40 },
    service: { label: 'Service', net: 18, gross: 55 },
    maint: { label: 'Maintenance', net: 25, gross: 65 }
  },
  diag: { calvin: 159, jacob: 143 },            // diagnostic FLAT fee, travel included, no added hours (Calvin 2026-11-21)
  partsMarkupSmall: 1.5, partsMarkupLarge: 1.3, partsMarkupBreak: 1000,
  cardFeeInstall: 0.03,                         // always added on installs (Calvin 2026-11-20)
  gst: 0.05,
  pst: 0.07,                                    // added to materials/parts by default (box can be unticked), never to subs (Calvin 2026-11-20)
  // Refrigerant (Calvin 2026-11-21): sell per lb = HCP price book, 1/2 lb minimum; cost per lb = Masters Nanaimo price 2026-11-21 (deposit excluded)
  refrigerant: {
    R22: { label: 'R-22', price: 145, cost: 19.36 },
    R410A: { label: 'R-410A', price: 125, cost: 12.57 },
    R32: { label: 'R-32', price: 145, cost: 21.89 },
    R454B: { label: 'R-454B', price: 185, cost: 37.98 }
  },
  refMinLb: 0.5
};

const $ = (n) => Math.round(n * 100) / 100;
const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n) => (isFinite(n) ? (n * 100).toFixed(1) : '0.0') + '%';
const num = (v) => { const x = parseFloat(String(v).replace(/[$,\s]/g, '')); return isFinite(x) && x > 0 ? x : 0; };
const parts$ = (R, list) => list.reduce((a, c) => a + c * (c > R.partsMarkupBreak ? R.partsMarkupLarge : R.partsMarkupSmall), 0);

// Pure pricing maths. s = { dept, kind, crew:[ids], hours, travel, materials, subs, parts:[cost], warranty, net }  (hours = clock hours on site; each person on the crew works them)
// Every person-hour carries its own burdened wage + $96.24 overhead. Break-even: Calvin $140.71/h, Jacob $126.11/h.
export function price(s, R = RATES) {
  const crew = R.crew.filter(c => s.crew.includes(c.id));
  const oh = R.overheadPerPersonHour;
  const be = (c) => c.rate + oh;
  const crewBE = crew.reduce((a, c) => a + be(c), 0);                  // travel break-even per clock hour: 140.71 / 126.11 / 266.82
  const crewLab = crew.reduce((a, c) => a + c.rate, 0);
  const d = R.dept[s.dept]; const minNet = d.net; const net = Math.max(minNet, s.net || minNet) / 100;
  const out = { lines: [], crewHour: crewBE, net, minNet };
  if (!crew.length) return { ...out, error: 'Pick who is going.' };
  if (!s.crew.includes('calvin')) return { ...out, error: "Jacob is an apprentice and can't run a job alone. Add Calvin." };
  const travelPrice = s.travel * crewBE;
  const names = crew.map(c => c.name).join(' + ');
  if (s.dept === 'install') {
    const labour = s.hours * crewLab, direct = s.materials + s.subs + labour, ohCost = s.hours * oh * crew.length;
    const byNet = (direct + ohCost) / (1 - net), byGross = direct / (1 - d.gross / 100);
    const job = byNet;                                                   // priced on 12% net (Calvin 2026-11-20); 40% gross is a target, shown below
    const sub = job + travelPrice; const card = sub * R.cardFeeInstall / (1 - R.cardFeeInstall);
    out.lines = [[`Job (materials, subs, ${names} labour + overhead, margin)`, job], ['Travel at break-even', travelPrice], ['Card fee 3%', card]];
    Object.assign(out, { pre: sub + card, fee: card, direct: direct + s.travel * crewLab, cost: direct + ohCost + travelPrice, floor: byGross > byNet ? 'gross' : 'net' });
  } else if (s.dept === 'service' && s.kind === 'diag') {   // FLAT diagnostic (Calvin 2026-11-21): $159 flat, travel included, no added hours, one person, no parts
    const hr = R.diag.calvin;
    const be1 = R.crew[0].rate + oh;                                     // cost basis: 1 h of Calvin at break-even ($140.71), travel not included
    out.lines = [['Diagnostic - flat rate (travel included)', hr]];
    Object.assign(out, { pre: hr, flat: true, direct: R.crew[0].rate, cost: be1, hourly: hr, crewHour: be1 });
  } else if (s.dept === 'service') {
    const rates = crew.map(c => ({ c, hr: Math.round(be(c) / (1 - net)) }));      // 18% -> Calvin $172, Jacob $154
    const rows = rates.map(({ c, hr }) => [`Labour ${c.name} ${s.hours} h × ${money(hr)}/h`, s.hours * hr]);
    const partsCost = s.parts.reduce((a, c) => a + c, 0), parts = s.warranty ? 0 : parts$(R, s.parts);
    const ownParts = s.warranty ? 0 : partsCost;
    let refPrice = 0, refCost = 0, refLine = null;
    if (s.ref && s.ref.lb > 0 && R.refrigerant[s.ref.type]) {      // refrigerant: billed per lb with a 1/2 lb minimum; our cost on the lb actually used (+PST when ticked)
      const g = R.refrigerant[s.ref.type], billed = Math.max(R.refMinLb, s.ref.lb);
      refPrice = billed * g.price; refCost = s.ref.lb * g.cost * (s.ref.k || 1);
      refLine = [`Refrigerant ${g.label} ${+billed.toFixed(2)} lb × ${money(g.price)}/lb${billed > s.ref.lb ? ' (½ lb minimum)' : ''}`, refPrice];
    }
    out.lines = [...rows, [s.warranty ? 'Parts (warranty, no charge)' : 'Parts (marked up)', parts], ...(refLine ? [refLine] : []), ['Travel at break-even', travelPrice]];
    Object.assign(out, { pre: rows.reduce((a, r) => a + r[1], 0) + parts + refPrice + travelPrice, direct: (s.hours + s.travel) * crewLab + ownParts + refCost, cost: s.hours * crewBE + ownParts + refCost + travelPrice, hourly: rates.reduce((a, r) => a + r.hr, 0) });
  } else {   // maintenance: deliberate loss leader - show the cost and the price-book reminder
    const cost = (s.hours + s.travel) * crewBE + s.materials;
    out.lines = [['Cost to do this visit (break-even)', cost]];
    Object.assign(out, { pre: null, direct: (s.hours + s.travel) * crewLab + s.materials, cost, loss: true });
  }
  if (out.pre != null) {
    out.pre = $(out.pre); out.gst = $(out.pre * R.gst); out.total = $(out.pre + out.gst);
    const base = out.pre - (out.fee || 0); out.profit = base - out.cost; out.netPct = out.profit / base; out.grossPct = (base - out.direct) / base;
  }
  return out;
}

const CSS = `
:host{display:block;color:var(--ink);font-family:var(--body);font-size:15px;line-height:1.45}
*{box-sizing:border-box}
h2{font-family:var(--display);font-size:26px;margin:4px 0 2px}
h3{font-family:var(--display);font-size:18px;margin:0 0 8px}
.muted{color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:14px}
.tool{display:block;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px;color:var(--ink);text-decoration:none}
.tool:hover{border-color:var(--brand)}
.tool b{font-family:var(--display);font-size:20px;display:block}
.tool .i{font-size:26px}
.soon{opacity:.55;border-style:dashed}
.wrap{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;margin-top:12px;max-width:1100px}
@media(min-width:900px){.wrap{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);align-items:start}.res{position:sticky;top:12px}}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px;min-width:0}
.step{margin-bottom:16px}.step:last-child{margin-bottom:0}
.lbl{font-weight:600;margin-bottom:6px;display:flex;gap:8px;align-items:baseline}
.lbl .n{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--brand);color:var(--accent-ink);font-size:12px;flex:none}
.seg{display:flex;flex-wrap:wrap;gap:6px}
.seg button,.chk{font:inherit;font-weight:600;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:999px;padding:8px 14px;cursor:pointer;min-height:40px}
.seg button[aria-pressed=true],.chk.on{background:var(--brand);border-color:var(--brand);color:var(--accent-ink)}
.chk small{font-weight:500;opacity:.8}
.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
label.f{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--muted);min-width:0}
input{font:inherit;font-size:16px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:9px 10px;width:100%;min-width:0}
input:focus{outline:2px solid var(--brand);outline-offset:1px}
.parts{display:flex;flex-direction:column;gap:6px}
.prow{display:flex;gap:6px;align-items:center}
.prow input{flex:1}
.x{font:inherit;border:1px solid var(--line);background:var(--bg);color:var(--muted);border-radius:8px;width:40px;height:40px;cursor:pointer;flex:none}
.add{font:inherit;font-weight:600;color:var(--brand);background:none;border:0;padding:6px 0;cursor:pointer;text-align:left}
.mrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.mrow input[type=range]{flex:1 1 160px;padding:0;accent-color:var(--brand2);background:none;border:0}
.step-btn{font:inherit;font-weight:700;width:40px;height:40px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);cursor:pointer}
.mv{font-family:var(--mono);font-size:18px;min-width:64px;text-align:center}
.big{font-family:var(--display);font-size:40px;line-height:1.05;margin:2px 0}
.sub{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--line);font-size:14px}
.sub:last-child{border-bottom:0}
.sub span:last-child{font-family:var(--mono);white-space:nowrap}
.tot{font-weight:700;font-size:16px}
.int{margin-top:12px;background:var(--sunk);border-radius:10px;padding:10px 12px}
.int h4{margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.tag{display:inline-block;font-size:12px;font-weight:700;border-radius:999px;padding:2px 8px;background:color-mix(in srgb,var(--ok) 16%,var(--surface));color:var(--ok)}
.tag.up{background:color-mix(in srgb,var(--brand2) 18%,var(--surface));color:var(--brand2)}
.warn{background:color-mix(in srgb,var(--warn) 14%,var(--surface));border:1px solid color-mix(in srgb,var(--warn) 40%,var(--line));border-radius:10px;padding:10px 12px;margin-top:10px;font-size:14px}
.acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.btn{font:inherit;font-weight:600;border-radius:8px;padding:9px 14px;border:1px solid var(--line);background:var(--bg);color:var(--ink);cursor:pointer}
.btn.pri{background:var(--brand);border-color:var(--brand);color:var(--accent-ink)}
a.back{color:var(--brand);text-decoration:none;font-weight:600}
`;

export function mountTools(host, db, extra) {
  const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
  const tool = (extra && extra.tool) || '';
  if (tool === 'timesheets') {   // v0.31 Timesheets tool (timesheets.js)
    let off = null, gone = false;
    root.innerHTML = '<div class="muted" style="padding:12px">Loading timesheets…</div>';
    import('./timesheets.js?v=13').then(m => { if (!gone) off = m.mountTimesheets(root, extra || {}); }).catch(e => { root.textContent = "Couldn't load Timesheets (" + e.message + '). Reload the page.'; });
    return () => { gone = true; if (off) off(); else root.innerHTML = ''; };
  }
  if (tool !== 'pricing') {
    root.innerHTML = `<style>${CSS}</style><h2>Tools</h2><div class="muted">Homestar's own tools and apps. More get added here as they're built.</div>
      <div class="grid"><a class="tool" href="#/tools/timesheets"><div class="i">⏱️</div><b>Timesheets</b><span class="muted">Build your pay-period timesheet from Housecall Pro in seconds, send it to Harlow, and track banked hours.</span></a>
      <a class="tool" href="#/tools/pricing"><div class="i">💲</div><b>Pricing</b><span class="muted">Price an install, service call or repair from the company rate model in under a minute.</span></a>
      <div class="tool soon"><div class="i">➕</div><b>More coming</b><span class="muted">Next tools go here.</span></div></div>`;
    return () => { root.innerHTML = ''; };
  }
  const R = RATES;
  const S = { pst: true, dept: 'install', kind: 'repair', crew: ['calvin'], hours: '', travel: '', materials: '', subs: '', parts: [''], warranty: false, net: R.dept.install.net, ref: false, refType: 'R410A', refQty: '', refUnit: 'lb' };
  root.innerHTML = `<style>${CSS}</style><a class="back" href="#/tools">← Tools</a><h2>Pricing</h2>
    <div class="muted">Starts at the company minimum. You can raise the margin, never lower it. Rates as of ${R.asOf}.</div>
    <div class="wrap"><div class="card" id="in"></div><div class="card res" id="out"></div></div>`;
  const inEl = root.getElementById('in'), outEl = root.getElementById('out');
  const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const field = (k, label, ph) => `<label class="f">${label}<input inputmode="decimal" data-k="${k}" value="${esc(S[k])}" placeholder="${ph}"></label>`;
  function drawIn() {
    const d = S.dept, svc = d === 'service', diag = svc && S.kind === 'diag';
    let n = 1;
    const pstBox = `<label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px"><input type="checkbox" data-pst style="width:auto" ${S.pst ? 'checked' : ''}> Add 7% PST to ${svc ? 'parts' : 'materials'} (not subs)</label>`;
    inEl.innerHTML = `
      <div class="step"><div class="lbl"><span class="n">${n++}</span>Department</div><div class="seg" data-g="dept">${Object.entries(R.dept).filter(([k]) => k !== 'maint').map(([k, v]) => `<button aria-pressed="${d === k}" data-v="${k}">${v.label}</button>`).join('')}</div>
        ${svc ? `<div class="seg" data-g="kind" style="margin-top:8px"><button aria-pressed="${S.kind === 'repair'}" data-v="repair">Repair</button><button aria-pressed="${diag}" data-v="diag">Diagnostic</button></div>` : ''}</div>
      ${diag ? '' : `<div class="step"><div class="lbl"><span class="n">${n++}</span>Who's going</div><div class="seg">${R.crew.map(c => `<button class="chk ${S.crew.includes(c.id) ? 'on' : ''}" data-crew="${c.id}">${S.crew.includes(c.id) ? '✓ ' : ''}${c.name}</button>`).join('')}</div>${diag ? `<div class="muted" style="font-size:13px;margin-top:6px">Diagnostic is a flat $${R.diag.calvin}, travel included, no matter who goes.</div>` : ''}</div>`}
      ${diag ? '' : `<div class="step"><div class="lbl"><span class="n">${n++}</span>Time</div><div class="fields">${field('hours', (d === 'install' ? 'Job hours on site' : 'Repair hours on site') + ' (clock time)', 'e.g. 8')}${field('travel', 'Travel hours, round trip (clock time)', 'e.g. 1')}</div></div>`}
      ${diag ? '' : svc ? `<div class="step"><div class="lbl"><span class="n">${n++}</span>Parts (your cost before tax)</div><div class="parts">${S.parts.map((p, i) => `<div class="prow"><input inputmode="decimal" data-part="${i}" value="${esc(p)}" placeholder="Part ${i + 1} cost">${S.parts.length > 1 ? `<button class="x" data-del="${i}" aria-label="Remove part">✕</button>` : ''}</div>`).join('')}<button class="add" data-addpart>+ Add another part</button></div>
          <label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px"><input type="checkbox" data-warranty style="width:auto" ${S.warranty ? 'checked' : ''}> Warranty parts (no charge to the customer)</label>${pstBox}</div>
      <div class="step"><div class="lbl"><span class="n">${n++}</span>Refrigerant needed?</div><div class="seg" data-g="ref"><button aria-pressed="${!S.ref}" data-v="no">No</button><button aria-pressed="${S.ref}" data-v="yes">Yes</button></div>
        ${S.ref ? `<div class="seg" data-g="reftype" style="margin-top:8px">${Object.entries(R.refrigerant).map(([k, g]) => `<button aria-pressed="${S.refType === k}" data-v="${k}">${g.label}</button>`).join('')}</div>
        <div class="fields" style="margin-top:8px">${field('refQty', 'Amount added', S.refUnit === 'oz' ? 'e.g. 12' : 'e.g. 1.5')}<div class="seg" data-g="refunit" style="align-self:end"><button aria-pressed="${S.refUnit === 'lb'}" data-v="lb">lb</button><button aria-pressed="${S.refUnit === 'oz'}" data-v="oz">oz</button></div></div>
        <div class="muted" id="refnote" style="font-size:13px;margin-top:6px">${R.refrigerant[S.refType].label}: ${money(R.refrigerant[S.refType].price)}/lb, minimum ½ lb (8 oz).</div>` : ''}</div>`
        : `<div class="step"><div class="lbl"><span class="n">${n++}</span>Costs (your cost before tax)</div><div class="fields">${field('materials', 'Materials', 'e.g. 6500')}${d === 'install' ? field('subs', 'Subcontractors (real quotes)', 'e.g. 1200') : ''}</div>${pstBox}</div>`}
      ${d !== 'maint' && !diag ? `<div class="step"><div class="lbl"><span class="n">${n++}</span>Net margin</div><div class="mrow"><button class="step-btn" data-net="-1" aria-label="Lower margin">−</button><input type="range" min="${R.dept[d].net}" max="50" step="1" value="${S.net}" data-netr><button class="step-btn" data-net="1" aria-label="Raise margin">+</button><span class="mv" id="mv">${S.net}%</span></div><div class="muted" style="font-size:13px;margin-top:4px">Minimum ${R.dept[d].net}% net${d === 'install' ? ` (aim for ${R.dept[d].gross}% gross)` : ''}.</div></div>` : ''}`;
  }
  function drawOut() {
    const k = S.pst ? 1 + R.pst : 1; const rq = num(S.refQty), s = { ref: (S.ref && S.dept === 'service' && S.kind !== 'diag') ? { type: S.refType, lb: S.refUnit === 'oz' ? rq / 16 : rq, k } : null, dept: S.dept, kind: S.kind, crew: (S.dept === 'service' && S.kind === 'diag') ? ['calvin'] : S.crew, hours: num(S.hours), travel: num(S.travel), materials: num(S.materials) * k, subs: num(S.subs), parts: S.parts.map(num).filter(Boolean).map(x => x * k), warranty: S.warranty, net: S.net };
    const r = price(s);
    const refIn = root.querySelector('[data-k="refQty"]'), refNote = root.getElementById('refnote');
    const refLow = !!(s.ref && rq > 0 && (S.refUnit === 'oz' ? rq < 16 * R.refMinLb : rq < R.refMinLb));   // below 1/2 lb or 8 oz = not allowed (Calvin 2026-11-21)
    if (refIn) { refIn.style.borderColor = refLow ? '#e5484d' : ''; refIn.style.background = refLow ? 'rgba(229,72,77,.15)' : ''; refIn.style.color = refLow ? '#ff8b8f' : ''; }
    if (refNote) { refNote.style.color = refLow ? '#ff8b8f' : ''; refNote.textContent = refLow ? `Below the minimum charge: enter at least ${S.refUnit === 'oz' ? '8 oz' : '0.5 lb'}.` : `${R.refrigerant[S.refType].label}: ${money(R.refrigerant[S.refType].price)}/lb, minimum ½ lb (8 oz).`; }
    if (refLow) { outEl.innerHTML = `<h3>Price</h3><div class="warn">Refrigerant is below the ½ lb (8 oz) minimum. Enter ${S.refUnit === 'oz' ? '8 oz' : '0.5 lb'} or more.</div>`; return; }
    if (r.error) { outEl.innerHTML = `<h3>Price</h3><div class="muted">${r.error}</div>`; return; }
    if (!s.hours && !s.travel && !(S.dept === 'service' && S.kind === 'diag')) { outEl.innerHTML = `<h3>Price</h3><div class="muted">Enter the hours to see the price.</div>`; return; }
    const rows = r.lines.map(([l, v]) => `<div class="sub c"><span>${esc(l)}</span><span>${money(v)}</span></div>`).join('');
    if (r.flat) {
      outEl.innerHTML = `<h3>Price before GST <span class="tag">flat rate</span></h3><div class="big" id="pre">${money(r.pre)}</div>${rows}
      <div class="sub c"><span>GST 5%</span><span>${money(r.gst)}</span></div><div class="sub c tot"><span>Total with GST</span><span>${money(r.total)}</span></div>
      <div class="int"><h4>Internal - never show the customer</h4>
        <div class="sub"><span>Our cost (1 h of Calvin at break-even, travel not included)</span><span>${money(r.cost)}</span></div>
        <div class="sub"><span>Profit</span><span>${money(r.profit)}</span></div>
        <div class="sub"><span>Net margin</span><span>${pct(r.netPct)}</span></div>
        <div class="sub"><span>Gross margin</span><span>${pct(r.grossPct)}</span></div>
        <div class="sub"><span>Break-even per hour (Calvin)</span><span>${money(r.crewHour)}/h</span></div></div>
      <div class="warn">Diagnostic is a flat $${R.diag.calvin}: travel included, no added hours. Repairs are quoted separately.</div>
      <div class="acts"><button class="btn pri" data-copy>Copy summary</button><button class="btn" data-reset>Start over</button></div><div class="muted" id="copied" style="font-size:13px;margin-top:6px"></div>`;
      return;
    }
    if (r.loss) {
      outEl.innerHTML = `<h3>Maintenance</h3><div class="muted">Maintenance is our loss leader: charge the price book price.</div><div class="big">${money(r.cost)}</div><div class="muted">is what this visit costs us (labour + overhead + materials).</div><div style="margin-top:10px">${rows}</div>`;
      return;
    }
    const raised = Math.round(r.net * 100) > r.minNet && !(S.dept === 'service' && S.kind === 'diag');
    const big = S.dept === 'service' && s.parts.some(c => c > 1000);
    outEl.innerHTML = `<h3>Price before GST ${raised ? '<span class="tag up">above minimum</span>' : '<span class="tag">company minimum</span>'}</h3>
      <div class="big" id="pre">${money(r.pre)}</div>
      ${rows}
      <div class="sub c"><span>GST 5%</span><span>${money(r.gst)}</span></div>
      <div class="sub c tot"><span>Total with GST</span><span>${money(r.total)}</span></div>
      <div class="int"><h4>Internal - never show the customer</h4>
        <div class="sub"><span>Our full cost (labour, overhead, materials, travel)</span><span>${money(r.cost)}</span></div>
        <div class="sub"><span>Profit</span><span>${money(r.profit)}</span></div>
        <div class="sub"><span>Net margin</span><span>${pct(r.netPct)}</span></div>
        <div class="sub"><span>Gross margin</span><span>${pct(r.grossPct)}</span></div>
        ${r.hourly ? `<div class="sub"><span>Crew rate per hour on site</span><span>${money(r.hourly)}/h</span></div>` : ''}
        <div class="sub"><span>Break-even per crew hour</span><span>${money(r.crewHour)}/h</span></div></div>
      ${big ? `<div class="warn">A part over $1,000 is marked up 30% instead of 50%. Check this price with Calvin.</div>` : ''}
      ${S.dept === 'install' && r.grossPct < 0.4 ? `<div class="warn">Gross margin is ${pct(r.grossPct)}, under the 40% target. Installs are priced on 12% net; raise the margin if the job allows.</div>` : ''}
      ${S.dept === 'install' ? `<div class="warn" style="background:var(--sunk);border-color:var(--line)">Custom or multi-system installs: also run the Project Estimating Sheet. Subcontractor costs must be real quotes, never guesses.</div>` : ''}
      <div class="acts"><button class="btn pri" data-copy>Copy summary</button><button class="btn" data-reset>Start over</button></div><div class="muted" id="copied" style="font-size:13px;margin-top:6px"></div>`;
  }
  const draw = () => { drawIn(); drawOut(); };
  const onClick = (e) => {
    const t = e.target.closest('button,[data-addpart]'); if (!t) return;
    const g = t.parentElement && t.parentElement.dataset.g;
    if (g === 'dept') { S.dept = t.dataset.v; S.net = R.dept[S.dept].net; return draw(); }
    if (g === 'kind') { S.kind = t.dataset.v; return draw(); }
    if (g === 'ref') { S.ref = t.dataset.v === 'yes'; return draw(); }
    if (g === 'reftype') { S.refType = t.dataset.v; return draw(); }
    if (g === 'refunit') { S.refUnit = t.dataset.v; return draw(); }
    if (t.dataset.crew) { const id = t.dataset.crew; S.crew = S.crew.includes(id) ? S.crew.filter(x => x !== id) : [...S.crew, id]; return draw(); }
    if (t.dataset.addpart !== undefined) { S.parts.push(''); draw(); const ins = root.querySelectorAll('[data-part]'); ins[ins.length - 1].focus(); return; }
    if (t.dataset.del) { S.parts.splice(+t.dataset.del, 1); return draw(); }
    if (t.dataset.net) { S.net = Math.min(50, Math.max(R.dept[S.dept].net, S.net + +t.dataset.net)); const r = root.querySelector('[data-netr]'); if (r) r.value = S.net; const mv = root.getElementById('mv'); if (mv) mv.textContent = S.net + '%'; return drawOut(); }
    if (t.dataset.reset !== undefined) { Object.assign(S, { pst: true, hours: '', travel: '', materials: '', subs: '', parts: [''], warranty: false, net: R.dept[S.dept].net, ref: false, refType: 'R410A', refQty: '', refUnit: 'lb' }); return draw(); }
    if (t.dataset.copy !== undefined) {
      const lines = [...outEl.querySelectorAll('.sub.c')].filter(x => !/\$0\.00$/.test(x.innerText.trim())).map(x => x.innerText.replace(/\s*\n\s*/, ': '));
      const pre = root.getElementById('pre').textContent; const txt = `Homestar price (${R.dept[S.dept].label}${S.dept === 'service' ? ' - ' + (S.kind === 'diag' ? 'diagnostic' : 'repair') : ''})\n` + 'Price before GST: ' + pre + '\n' + lines.join('\n');
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { root.getElementById('copied').textContent = 'Copied (customer lines only, no internal numbers).'; }, () => { root.getElementById('copied').textContent = "Couldn't copy on this device."; });
    }
  };
  const onInput = (e) => {
    const t = e.target;
    if (t.dataset.k) S[t.dataset.k] = t.value;
    else if (t.dataset.part !== undefined) S.parts[+t.dataset.part] = t.value;
    else if (t.dataset.warranty !== undefined) S.warranty = t.checked;
    else if (t.dataset.pst !== undefined) S.pst = t.checked;
    else if (t.dataset.netr !== undefined) { S.net = Math.max(R.dept[S.dept].net, +t.value); const mv = root.getElementById('mv'); if (mv) mv.textContent = S.net + '%'; }
    else return;
    drawOut();
  };
  root.addEventListener('click', onClick); root.addEventListener('input', onInput); root.addEventListener('change', onInput);
  draw();
  return () => { root.removeEventListener('click', onClick); root.removeEventListener('input', onInput); root.removeEventListener('change', onInput); root.innerHTML = ''; };
}
