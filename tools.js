// Homestar HQ - Tools (v0.29.5 PST 7% added to materials/parts by default with an untick box, not subs; v0.29.4 follows the LOCKED crew rates: Jacob apprentice $65/h billed, $29.87 cost, no overhead; travel $139.38 / $169.25; v0.29.3 overhead charged per person-hour - Calvin 2026-11-20: HCP hours are per person, so 2 people = 2 field hours; v0.29.2 cost labels say incl. PST - PST is a real cost, GST is not; v0.29.1 gross-floor note; v0.29, Calvin 2026-11-20): a list of company tools; first tool = Pricing.
// mountTools(host, db, extra) renders into a shadow root on host and returns a cleanup function. extra.tool = '' (list) or 'pricing'.
// RATES = the company rate model (START HERE s8 + Finance & KPIs README, FYTD Jun-Oct 2026). Change them here AND in those two files the same day.
export const RATES = {
  asOf: '2026-11-20',
  overheadPerFieldHour: 94.91,                 // overhead per field hour - carried by Calvin's hours (LOCKED crew rates, START HERE s8 2026-11-20)
  calvin: 44.47,                                // Calvin burdened $/h
  jacobCost: 29.87, jacobBill: 65,              // Jacob = apprentice: cost $29.87/h, no overhead; billed $65/h after margin, no markup
  crew: [{ id: 'calvin', name: 'Calvin' }, { id: 'jacob', name: 'Jacob (apprentice)' }],
  dept: {
    install: { label: 'Installation', net: 12, gross: 40 },
    service: { label: 'Service', net: 18, gross: 55 },
    maint: { label: 'Maintenance', net: 25, gross: 65 }
  },
  diagPerHour: 159,                             // diagnostic, Calvin; every hour incl. travel
  partsMarkupSmall: 1.5, partsMarkupLarge: 1.3, partsMarkupBreak: 1000,
  cardFeeInstall: 0.03,                         // always added on installs (Calvin 2026-11-20)
  gst: 0.05,
  pst: 0.07                                     // added to materials/parts by default (box can be unticked), never to subs (Calvin 2026-11-20)
};

const $ = (n) => Math.round(n * 100) / 100;
const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n) => (isFinite(n) ? (n * 100).toFixed(1) : '0.0') + '%';
const num = (v) => { const x = parseFloat(String(v).replace(/[$,\s]/g, '')); return isFinite(x) && x > 0 ? x : 0; };

// Pure pricing maths. s = { dept, kind, crew:[ids], hours, travel, materials, subs, parts:[cost], warranty, net }  (hours = clock hours)
// LOCKED crew rates (Calvin 2026-11-20): Calvin carries labour + overhead; Jacob (apprentice) costs $29.87/h and is billed $65/h, no markup.
export function price(s, R = RATES) {
  const cal = s.crew.includes('calvin'), jac = s.crew.includes('jacob');
  const oh = R.overheadPerFieldHour, calHour = R.calvin + oh;          // Calvin break-even $139.38/h
  const crewHour = calHour + (jac ? R.jacobCost : 0);                   // travel break-even: $139.38 alone, $169.25 with Jacob
  const travelPrice = s.travel * crewHour;
  const d = R.dept[s.dept]; const minNet = d.net; const net = Math.max(minNet, s.net || minNet) / 100;
  const out = { lines: [], crewHour, net, minNet };
  if (!cal) return { ...out, error: jac ? 'Jacob is an apprentice and can\'t run a job alone. Add Calvin.' : 'Pick who is going.' };
  const jacH = jac ? s.hours : 0, jacBill = jacH * R.jacobBill, jacCost = jacH * R.jacobCost;
  if (s.dept === 'install') {
    const labour = s.hours * R.calvin, direct = s.materials + s.subs + labour, ohCost = s.hours * oh;
    const byNet = (direct + ohCost) / (1 - net), byGross = direct / (1 - d.gross / 100);
    const job = Math.max(byNet, byGross);
    const sub = job + jacBill + travelPrice; const card = sub * R.cardFeeInstall / (1 - R.cardFeeInstall);
    out.lines = [['Job (materials, subs, Calvin labour, overhead, margin)', job], ...(jac ? [[`Apprentice (Jacob) ${s.hours} h × $${R.jacobBill}/h`, jacBill]] : []), ['Travel at break-even', travelPrice], ['Card fee 3%', card]];
    Object.assign(out, { pre: sub + card, fee: card, direct: direct + jacCost + s.travel * (R.calvin + (jac ? R.jacobCost : 0)), cost: direct + ohCost + jacCost + travelPrice, floor: byGross > byNet ? 'gross' : 'net' });
  } else if (s.dept === 'service' && s.kind === 'diag') {
    const all = s.hours + s.travel; const labourPrice = all * R.diagPerHour + (jac ? all * R.jacobBill : 0);
    const parts = s.warranty ? 0 : s.parts.reduce((a, c) => a + c * (c > R.partsMarkupBreak ? R.partsMarkupLarge : R.partsMarkupSmall), 0);
    const partsCost = s.warranty ? 0 : s.parts.reduce((a, c) => a + c, 0);
    out.lines = [[`Diagnostic ${all} h × ${money(R.diagPerHour)}/h (incl. travel)`, all * R.diagPerHour], ...(jac ? [[`Apprentice (Jacob) ${all} h × $${R.jacobBill}/h`, all * R.jacobBill]] : []), ...(partsCost ? [['Parts (marked up)', parts]] : [])];
    Object.assign(out, { pre: labourPrice + parts, direct: all * R.calvin + (jac ? all * R.jacobCost : 0) + partsCost, cost: all * crewHour + partsCost, hourly: R.diagPerHour });
  } else if (s.dept === 'service') {
    const hr = Math.ceil(calHour / (1 - net));
    const labourPrice = s.hours * hr + jacBill;
    const partsCost = s.parts.reduce((a, c) => a + c, 0);
    const parts = s.warranty ? 0 : s.parts.reduce((a, c) => a + c * (c > R.partsMarkupBreak ? R.partsMarkupLarge : R.partsMarkupSmall), 0);
    out.lines = [[`Labour ${s.hours} h × ${money(hr)}/h`, s.hours * hr], ...(jac ? [[`Apprentice (Jacob) ${s.hours} h × $${R.jacobBill}/h`, jacBill]] : []), [s.warranty ? 'Parts (warranty, no charge)' : 'Parts (marked up)', parts], ['Travel at break-even', travelPrice]];
    const ownParts = s.warranty ? 0 : partsCost;
    Object.assign(out, { pre: labourPrice + parts + travelPrice, direct: s.hours * R.calvin + jacCost + s.travel * (R.calvin + (jac ? R.jacobCost : 0)) + ownParts, cost: s.hours * calHour + jacCost + ownParts + travelPrice, hourly: hr });
  } else {
    const cost = (s.hours + s.travel) * crewHour + s.materials;
    out.lines = [['Cost to do this visit (break-even)', cost]];
    Object.assign(out, { pre: null, direct: (s.hours + s.travel) * (R.calvin + (jac ? R.jacobCost : 0)) + s.materials, cost, loss: true });
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
  if (tool !== 'pricing') {
    root.innerHTML = `<style>${CSS}</style><h2>Tools</h2><div class="muted">Homestar's own tools and apps. More get added here as they're built.</div>
      <div class="grid"><a class="tool" href="#/tools/pricing"><div class="i">💲</div><b>Pricing</b><span class="muted">Price an install, service call or repair from the company rate model in under a minute.</span></a>
      <div class="tool soon"><div class="i">➕</div><b>More coming</b><span class="muted">Next tools go here.</span></div></div>`;
    return () => { root.innerHTML = ''; };
  }
  const R = RATES;
  const S = { pst: true, dept: 'install', kind: 'repair', crew: ['calvin'], hours: '', travel: '', materials: '', subs: '', parts: [''], warranty: false, net: R.dept.install.net };
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
      <div class="step"><div class="lbl"><span class="n">${n++}</span>Department</div><div class="seg" data-g="dept">${Object.entries(R.dept).map(([k, v]) => `<button aria-pressed="${d === k}" data-v="${k}">${v.label}</button>`).join('')}</div>
        ${svc ? `<div class="seg" data-g="kind" style="margin-top:8px"><button aria-pressed="${S.kind === 'repair'}" data-v="repair">Repair</button><button aria-pressed="${diag}" data-v="diag">Diagnostic</button></div>` : ''}</div>
      <div class="step"><div class="lbl"><span class="n">${n++}</span>Who's going</div><div class="seg">${R.crew.map(c => `<button class="chk ${S.crew.includes(c.id) ? 'on' : ''}" data-crew="${c.id}">${S.crew.includes(c.id) ? '✓ ' : ''}${c.name}</button>`).join('')}</div></div>
      <div class="step"><div class="lbl"><span class="n">${n++}</span>Time</div><div class="fields">${field('hours', (d === 'install' ? 'Job hours on site' : diag ? 'Hours on site' : 'Repair hours on site') + ' (clock time)', 'e.g. 8')}${field('travel', 'Travel hours, round trip (clock time)', 'e.g. 1')}</div></div>
      ${svc ? `<div class="step"><div class="lbl"><span class="n">${n++}</span>Parts (your cost before tax)</div><div class="parts">${S.parts.map((p, i) => `<div class="prow"><input inputmode="decimal" data-part="${i}" value="${esc(p)}" placeholder="Part ${i + 1} cost">${S.parts.length > 1 ? `<button class="x" data-del="${i}" aria-label="Remove part">✕</button>` : ''}</div>`).join('')}<button class="add" data-addpart>+ Add another part</button></div>
          <label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px"><input type="checkbox" data-warranty style="width:auto" ${S.warranty ? 'checked' : ''}> Warranty parts (no charge to the customer)</label>${pstBox}</div>`
        : `<div class="step"><div class="lbl"><span class="n">${n++}</span>Costs (your cost before tax)</div><div class="fields">${field('materials', 'Materials', 'e.g. 6500')}${d === 'install' ? field('subs', 'Subcontractors (real quotes)', 'e.g. 1200') : ''}</div>${pstBox}</div>`}
      ${d !== 'maint' && !diag ? `<div class="step"><div class="lbl"><span class="n">${n++}</span>Net margin</div><div class="mrow"><button class="step-btn" data-net="-1" aria-label="Lower margin">−</button><input type="range" min="${R.dept[d].net}" max="50" step="1" value="${S.net}" data-netr><button class="step-btn" data-net="1" aria-label="Raise margin">+</button><span class="mv" id="mv">${S.net}%</span></div><div class="muted" style="font-size:13px;margin-top:4px">Minimum ${R.dept[d].net}% net${d === 'install' ? ` and ${R.dept[d].gross}% gross` : ''}.</div></div>` : ''}`;
  }
  function drawOut() {
    const k = S.pst ? 1 + R.pst : 1; const s = { dept: S.dept, kind: S.kind, crew: S.crew, hours: num(S.hours), travel: num(S.travel), materials: num(S.materials) * k, subs: num(S.subs), parts: S.parts.map(num).filter(Boolean).map(x => x * k), warranty: S.warranty, net: S.net };
    const r = price(s);
    if (r.error) { outEl.innerHTML = `<h3>Price</h3><div class="muted">${r.error}</div>`; return; }
    if (!s.hours && !s.travel) { outEl.innerHTML = `<h3>Price</h3><div class="muted">Enter the hours to see the price.</div>`; return; }
    const rows = r.lines.map(([l, v]) => `<div class="sub c"><span>${esc(l)}</span><span>${money(v)}</span></div>`).join('');
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
        ${r.hourly ? `<div class="sub"><span>Hourly rate used</span><span>${money(r.hourly)}/h</span></div>` : ''}
        <div class="sub"><span>Break-even per crew hour</span><span>${money(r.crewHour)}/h</span></div></div>
      ${S.dept === 'service' && S.kind === 'diag' ? `<div class="warn">Diagnostic is billed by the hour incl. travel, near break-even on purpose. Tell the customer before passing the first hour.</div>` : ''}
      ${big ? `<div class="warn">A part over $1,000 is marked up 30% instead of 50%. Check this price with Calvin.</div>` : ''}
      ${S.dept === 'install' && r.floor === 'gross' ? `<div class="warn">The 40% gross minimum sets this price (net is already ${pct(r.netPct)}). Raising the net margin only changes the price once it passes that.</div>` : ''}
      ${S.dept === 'install' ? `<div class="warn" style="background:var(--sunk);border-color:var(--line)">Custom or multi-system installs: also run the Project Estimating Sheet. Subcontractor costs must be real quotes, never guesses.</div>` : ''}
      <div class="acts"><button class="btn pri" data-copy>Copy summary</button><button class="btn" data-reset>Start over</button></div><div class="muted" id="copied" style="font-size:13px;margin-top:6px"></div>`;
  }
  const draw = () => { drawIn(); drawOut(); };
  const onClick = (e) => {
    const t = e.target.closest('button,[data-addpart]'); if (!t) return;
    const g = t.parentElement && t.parentElement.dataset.g;
    if (g === 'dept') { S.dept = t.dataset.v; S.net = R.dept[S.dept].net; return draw(); }
    if (g === 'kind') { S.kind = t.dataset.v; return draw(); }
    if (t.dataset.crew) { const id = t.dataset.crew; S.crew = S.crew.includes(id) ? S.crew.filter(x => x !== id) : [...S.crew, id]; return draw(); }
    if (t.dataset.addpart !== undefined) { S.parts.push(''); draw(); const ins = root.querySelectorAll('[data-part]'); ins[ins.length - 1].focus(); return; }
    if (t.dataset.del) { S.parts.splice(+t.dataset.del, 1); return draw(); }
    if (t.dataset.net) { S.net = Math.min(50, Math.max(R.dept[S.dept].net, S.net + +t.dataset.net)); const r = root.querySelector('[data-netr]'); if (r) r.value = S.net; const mv = root.getElementById('mv'); if (mv) mv.textContent = S.net + '%'; return drawOut(); }
    if (t.dataset.reset !== undefined) { Object.assign(S, { pst: true, hours: '', travel: '', materials: '', subs: '', parts: [''], warranty: false, net: R.dept[S.dept].net }); return draw(); }
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
