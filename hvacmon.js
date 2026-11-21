// Homestar HQ - HVAC Monitoring (v4 2026-11-21: Equipment vs Ambient groups, room RH under the temperature; v3 2026-11-21: press-and-hold to reorder sensors; v2 2026-11-21: axis labels clear of ticks; v1 same day, Calvin). Tools > HVAC Monitoring: list of houses -> one house's dashboard:
// graph of every sensor over time (temps on the left axis, watts on the right), 24 h / 7 d / 30 d / 1 y, legend with colour,
// show/hide checkbox and editable names. Data: monitor_sites / monitor_sensors / monitor_series() (db/025). Until a house has
// readings the dashboard shows clearly-labelled SAMPLE data so the layout can be judged.
const CSS = `
:host{display:block}
*{box-sizing:border-box}
h2{font-family:var(--display);margin:6px 0 4px}h3{font-family:var(--display);margin:0 0 6px;font-size:18px}
.muted{color:var(--muted)}.small{font-size:13px}
a.back{color:var(--brand);text-decoration:none;font-weight:600;display:inline-block;margin-bottom:6px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px;margin-top:12px;min-width:0}
.list{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.house{display:flex;align-items:center;gap:12px;width:100%;text-align:left;font:inherit;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px;cursor:pointer}
.house b{font-family:var(--display);font-size:18px;display:block}.house .chev{margin-left:auto;color:var(--muted);font-size:22px}
.house .ic{font-size:26px}
.btn{font:inherit;font-weight:700;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:10px;padding:10px 16px;cursor:pointer;min-height:44px}
.btn.pri{background:var(--brand);border-color:var(--brand);color:var(--accent-ink)}
.acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{font:inherit;font-size:14px;font-weight:700;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:999px;padding:7px 13px;cursor:pointer;min-height:36px}
.chip.on{background:var(--brand);border-color:var(--brand);color:var(--accent-ink)}
.bar{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}
.sample{border:1px dashed var(--warn);background:color-mix(in srgb,var(--warn) 12%,transparent);border-radius:10px;padding:8px 12px;margin-top:10px;font-size:14px}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-top:6px}
.tgh{font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:14px 0 2px}
.tile em{display:block;font-style:normal;font-weight:700;font-size:14px;color:var(--ink);opacity:.85;margin-top:-2px}
.lgg{display:flex;flex-direction:column;gap:6px}
.tile{background:var(--sunk);border-radius:10px;padding:9px 11px;border-left:4px solid var(--c,var(--line));min-width:0}
.tile b{display:block;font-family:var(--display);font-size:22px}.tile span{font-size:12.5px;color:var(--muted);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chartbox{position:relative;margin-top:12px;touch-action:pan-y}
svg{display:block;width:100%;height:auto;user-select:none}
.ax{font-size:11px;fill:var(--muted)}
.grid line{stroke:var(--line);stroke-width:1}
.tip{position:absolute;top:6px;pointer-events:none;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:12.5px;box-shadow:0 6px 20px rgba(0,0,0,.18);min-width:150px;max-width:230px}
.tip .r{display:flex;justify-content:space-between;gap:10px}.tip i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}
.legend{display:flex;flex-direction:column;gap:6px;margin-top:12px}
.lg{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;transition:box-shadow .15s,transform .15s}
.lg .hd{color:var(--muted);font-size:18px;cursor:grab;flex:none;line-height:1}
.lg.drag{position:relative;z-index:5;transform:scale(1.02);box-shadow:0 10px 28px rgba(0,0,0,.28);border-color:var(--brand);cursor:grabbing}
.hint{font-size:12.5px;color:var(--muted);margin-top:8px}
.lg input[type=checkbox]{width:22px;height:22px;flex:none;accent-color:var(--brand)}
.sw{width:22px;height:6px;border-radius:3px;flex:none}
.lg .nm{flex:1;min-width:0}.lg .nm b{display:block;font-weight:600;overflow-wrap:anywhere}.lg .nm span{font-size:12px;color:var(--muted)}
.ed{font:inherit;border:1px solid var(--line);background:var(--surface);color:var(--brand);border-radius:8px;padding:6px 10px;cursor:pointer;flex:none}
.modal{position:fixed;inset:0;background:rgba(10,14,25,.55);display:grid;place-items:center;padding:16px;z-index:50}
.sheet{background:var(--surface);color:var(--ink);border-radius:14px;padding:18px;max-width:420px;width:100%;border:1px solid var(--line);max-height:90vh;overflow:auto}
label.f{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--muted);margin-top:10px}
input,select{font:inherit;font-size:16px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:9px 10px;width:100%;min-width:0}
input[type=color]{height:44px;padding:3px}
.err{color:var(--hot);font-weight:600;margin-top:8px}
`;
const RANGES = [{ k: '24h', label: '24 h', ms: 864e5, bucket: 300 }, { k: '7d', label: '7 days', ms: 7 * 864e5, bucket: 1800 }, { k: '30d', label: '30 days', ms: 30 * 864e5, bucket: 7200 }, { k: '1y', label: '1 year', ms: 365 * 864e5, bucket: 86400 }];
const KIND = { supply: 'Supply air', return: 'Return air', outdoor: 'Outdoor', room: 'Room', power: 'Power (W)', fan_power: 'Fan power (W)', humidity: 'Humidity (%)', other: 'Other' };
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isTemp = (s) => s.unit === 'C';
const GRP = { equipment: 'Equipment', ambient: 'Ambient' };
const grpOf = (s) => s.grp || (['room', 'outdoor', 'humidity'].includes(s.kind) ? 'ambient' : 'equipment');
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

export function mountHvacMon(root, { sb }) {
  root.innerHTML = `<style>${CSS}</style><a class="back" href="#/tools">← Tools</a><div id="body"></div><div id="modal"></div>`;
  const body = root.getElementById('body'), modal = root.getElementById('modal');
  const S = { sites: [], site: null, sensors: [], range: lsGet('hm_range', '24h'), unit: lsGet('hm_unit', 'F'), hidden: new Set(JSON.parse(lsGet('hm_hidden', '[]'))), series: null, sample: false };
  let dead = false, timer = null;
  const cv = (c) => S.unit === 'F' ? c * 9 / 5 + 32 : c;   // stored C -> shown unit
  const tU = () => '°' + S.unit;

  // ---------- house list ----------
  async function list() {
    S.site = null; clearInterval(timer);
    body.innerHTML = '<h2>HVAC Monitoring</h2><div class="muted">Loading houses…</div>';
    const { data, error } = await sb.from('monitor_sites').select('*').eq('active', true).order('last_name');
    if (dead) return;
    if (error) { body.innerHTML = `<h2>HVAC Monitoring</h2><div class="err">${esc(error.message)}</div>`; return; }
    S.sites = data || [];
    body.innerHTML = `<h2>HVAC Monitoring</h2><div class="muted">Live system data from monitored homes. Pick a house.</div>
      <div class="list">${S.sites.map(s => `<button class="house" data-site="${s.id}"><span class="ic">🏠</span><span><b>${esc((s.first_name + ' ' + s.last_name).trim() || 'Unnamed')}</b><span class="muted small">${esc(s.address || 'No address yet')}</span></span><span class="chev">›</span></button>`).join('') || '<div class="muted">No houses yet.</div>'}</div>
      <div class="acts"><button class="btn" data-addsite>+ Add a house</button></div>`;
  }
  function siteForm(s) {
    const v = s || { first_name: '', last_name: '', address: '', equipment: '', notes: '' };
    modal.innerHTML = `<div class="modal"><div class="sheet"><h3>${s ? 'Edit house' : 'Add a house'}</h3>
      <label class="f">First name<input data-f="first_name" value="${esc(v.first_name)}"></label>
      <label class="f">Last name<input data-f="last_name" value="${esc(v.last_name)}"></label>
      <label class="f">Address<input data-f="address" value="${esc(v.address)}"></label>
      <label class="f">Equipment (model numbers)<input data-f="equipment" value="${esc(v.equipment)}"></label>
      <label class="f">Notes<input data-f="notes" value="${esc(v.notes)}"></label>
      <div class="err" data-err></div><div class="acts"><button class="btn" data-x>Cancel</button><button class="btn pri" data-save>Save</button></div></div></div>`;
    modal.onclick = async (e) => {
      if (e.target.closest('[data-x]') || e.target === modal.firstElementChild) { modal.innerHTML = ''; return; }
      if (!e.target.closest('[data-save]')) return;
      const row = {}; modal.querySelectorAll('[data-f]').forEach(i => row[i.dataset.f] = i.value.trim());
      if (!row.first_name && !row.last_name) { modal.querySelector('[data-err]').textContent = 'Add a name.'; return; }
      const q = s ? sb.from('monitor_sites').update(row).eq('id', s.id) : sb.from('monitor_sites').insert(row);
      const { error } = await q; if (error) { modal.querySelector('[data-err]').textContent = error.message; return; }
      modal.innerHTML = ''; if (s) { Object.assign(S.site, row); dash(); } else list();
    };
  }

  // ---------- sample data (until real readings exist) ----------
  function sampleSeries(from, to, bucket) {
    const out = {}; const n = Math.floor((to - from) / (bucket * 1000));
    const seed = (x) => { const s = Math.sin(x * 12.9898) * 43758.5453; return s - Math.floor(s); };
    const pts = []; for (let i = 0; i <= n; i++) pts.push(from + i * bucket * 1000);
    const outdoor = pts.map((t, i) => { const d = new Date(t); const day = (d.getHours() + d.getMinutes() / 60) / 24; const yr = (t / 864e5) / 365.25 * 2 * Math.PI; return 6 - 7 * Math.cos(yr) * 0 + 4 * Math.sin((day - 0.35) * 2 * Math.PI) + 3 * Math.cos(yr + 0.3) + (seed(i) - 0.5) * 0.8; });
    (S.all || S.sensors).forEach((s, k) => {
      out[s.id] = pts.map((t, i) => {
        const od = outdoor[i]; const load = Math.max(0, Math.min(1, (18 - od) / 22)); const defrost = od < 3 && (Math.floor(t / 36e5) % 2 === 0) && (new Date(t).getMinutes() < 8);
        if (s.kind === 'outdoor') return od;
        if (s.kind === 'room') return 21 + (k % 2 ? -0.6 : 0.3) + Math.sin(i / 9) * 0.3 + (seed(i + k) - 0.5) * 0.3;
        if (s.kind === 'return') return 21.4 + (seed(i + 7) - 0.5) * 0.4;
        if (s.kind === 'supply') return defrost ? 24 : 21.4 + 12 + load * 14 + (seed(i + 3) - 0.5);
        if (s.kind === 'power') return defrost ? 180 : 250 + load * 1500 + (seed(i + 5) - 0.5) * 40;
        if (s.kind === 'fan_power') return 18 + load * 22;
        if (s.kind === 'humidity') return 44 + (k % 2 ? -4 : 2) + Math.sin(i / 15) * 2 + (seed(i + k) - 0.5);
        return 0;
      }).map((v, i) => [pts[i], v]);
    });
    return out;
  }

  // ---------- dashboard ----------
  async function openSite(id) {
    S.site = S.sites.find(x => x.id === id); if (!S.site) return list();
    body.innerHTML = '<div class="muted">Loading…</div>';
    const { data, error } = await sb.from('monitor_sensors').select('*').eq('site_id', id).eq('active', true).order('sort');
    if (dead) return; if (error) { body.innerHTML = `<div class="err">${esc(error.message)}</div>`; return; }
    S.all = data || []; S.sensors = S.all.filter(x => x.kind !== 'humidity'); S.rh = {}; S.all.filter(x => x.kind === 'humidity' && x.pair_id).forEach(h => { S.rh[h.pair_id] = h; });
    await load(); dash();
    clearInterval(timer); timer = setInterval(async () => { if (S.site && !dead) { await load(); drawChart(); drawTiles(); } }, 60000);
  }
  async function load() {
    const R = RANGES.find(r => r.k === S.range) || RANGES[0]; const to = Date.now(), from = to - R.ms;
    const { data, error } = await sb.rpc('monitor_series', { p_site: S.site.id, p_from: new Date(from).toISOString(), p_to: new Date(to).toISOString(), p_bucket: R.bucket });
    const ser = {}; (data || []).forEach(r => (ser[r.sensor_id] = ser[r.sensor_id] || []).push([Date.parse(r.t), Number(r.v)]));
    S.sample = !error && !(data || []).length; S.err = error ? error.message : '';
    S.series = S.sample ? sampleSeries(from, to, R.bucket) : ser; S.from = from; S.to = to;
  }
  function dash() {
    const s = S.site;
    body.innerHTML = `<div class="head"><div><h2>${esc((s.first_name + ' ' + s.last_name).trim())}</h2><div class="muted small">${esc(s.address)}</div>${s.equipment ? `<div class="muted small">${esc(s.equipment)}</div>` : ''}</div>
        <div class="chips"><button class="chip" data-editsite>Edit house</button><button class="chip" data-list>All houses</button></div></div>
      ${S.err ? `<div class="err">${esc(S.err)}</div>` : ''}
      ${S.sample ? '<div class="sample"><b>Sample data.</b> These sensors aren\'t connected yet - the lines show made-up readings so you can judge the layout. Real readings replace them automatically.</div>' : ''}
      <div class="bar"><div class="chips">${RANGES.map(r => `<button class="chip${r.k === S.range ? ' on' : ''}" data-range="${r.k}">${r.label}</button>`).join('')}</div>
        <div class="chips"><button class="chip${S.unit === 'F' ? ' on' : ''}" data-unit="F">°F</button><button class="chip${S.unit === 'C' ? ' on' : ''}" data-unit="C">°C</button></div></div>
      <div class="card"><div class="chartbox" id="cb"></div><div class="legend" id="lg"></div></div>
      <div id="tiles"></div>`;
    drawChart(); drawLegend(); drawTiles();
  }
  const last = (id) => { const a = (S.series && S.series[id]) || []; return a.length ? a[a.length - 1] : null; };
  function drawTiles() {
    const el = root.getElementById('tiles'); if (!el) return;
    const tile = (s) => { const l = last(s.id); const h = S.rh && S.rh[s.id] && last(S.rh[s.id].id); return `<div class="tile" style="--c:${esc(s.color)}"><b>${l ? (isTemp(s) ? cv(l[1]).toFixed(1) + tU() : Math.round(l[1]) + ' ' + esc(s.unit)) : '–'}</b>${S.rh && S.rh[s.id] ? `<em>${h ? Math.round(h[1]) + '% RH' : '– RH'}</em>` : ''}<span>${esc(s.label)}</span></div>`; };
    const out = [];
    for (const g of Object.keys(GRP)) {
      const list = S.sensors.filter(s => grpOf(s) === g).map(tile);
      if (g === 'equipment') { const sup = S.sensors.find(s => s.kind === 'supply'), ret = S.sensors.find(s => s.kind === 'return'); if (sup && ret && last(sup.id) && last(ret.id)) { const d = last(sup.id)[1] - last(ret.id)[1]; list.unshift(`<div class="tile" style="--c:var(--brand)"><b>${(S.unit === 'F' ? d * 9 / 5 : d).toFixed(1)}${tU()}</b><span>Supply − return (ΔT)</span></div>`); } }
      if (list.length) out.push(`<div class="tgh">${GRP[g]}</div><div class="tiles">${list.join('')}</div>`);
    }
    el.innerHTML = out.join('');
  }
  function drawLegend() {
    const el = root.getElementById('lg');
    const row = (s) => `<div class="lg" data-row="${s.id}"><span class="hd" aria-hidden="true">⠿</span><input type="checkbox" data-show="${s.id}" ${S.hidden.has(s.id) ? '' : 'checked'} aria-label="Show ${esc(s.label)}"><span class="sw" style="background:${esc(s.color)}"></span><span class="nm"><b>${esc(s.label)}</b><span>${esc(KIND[s.kind] || s.kind)}${S.rh && S.rh[s.id] ? ' + humidity' : ''}${s.model ? ' · ' + esc(s.model) : ''}</span></span><button class="ed" data-editsensor="${s.id}">✎ Edit</button></div>`;
    el.innerHTML = Object.keys(GRP).map(g => { const l = S.sensors.filter(s => grpOf(s) === g); return l.length ? `<div class="tgh">${GRP[g]} sensors</div><div class="lgg" data-grp="${g}">${l.map(row).join('')}</div>` : ''; }).join('') + '<div class="hint">Press and hold a sensor, then drag to change the order.</div>';
    el.querySelectorAll('.lgg').forEach(bindDrag);
  }
  // press-and-hold to reorder (touch + mouse); order saved to monitor_sensors.sort for everyone
  function bindDrag(el) {
    if (el._dragBound) return; el._dragBound = true;
    let timer = null, drag = null, sx = 0, sy = 0;
    const cancelHold = () => { clearTimeout(timer); timer = null; };
    el.addEventListener('pointerdown', (e) => {
      const row = e.target.closest('.lg'); if (!row || e.target.closest('input,button')) return;
      sx = e.clientX; sy = e.clientY; cancelHold();
      timer = setTimeout(() => { timer = null; drag = row; row.classList.add('drag'); try { row.setPointerCapture(e.pointerId); } catch (x) {} if (navigator.vibrate) navigator.vibrate(15); }, e.pointerType === 'mouse' ? 180 : 400);
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag) { if (timer && (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8)) cancelHold(); return; }
      e.preventDefault();
      const rows = [...el.querySelectorAll('.lg')].filter(r => r !== drag); let before = null;
      for (const r of rows) { const b = r.getBoundingClientRect(); if (e.clientY < b.top + b.height / 2) { before = r; break; } }
      if (before) { if (drag.nextSibling !== before) el.insertBefore(drag, before); } else { const lastRow = rows[rows.length - 1]; if (lastRow && lastRow.nextSibling !== drag) lastRow.after(drag); }
    });
    const end = () => { cancelHold(); if (drag) finish(); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('touchmove', (e) => { if (drag) e.preventDefault(); }, { passive: false });
    el.addEventListener('contextmenu', (e) => { if (drag || timer) e.preventDefault(); });
    async function finish() {
      drag.classList.remove('drag'); drag = null;
      const ids = [...root.querySelectorAll('#lg .lg')].map(r => r.dataset.row);
      if (!ids.some((id, i) => (S.sensors[i] || {}).id !== id)) return;
      S.sensors.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)); S.sensors.forEach((s, i) => { s.sort = i + 1; });
      drawTiles(); drawChart();
      const res = await Promise.all(S.sensors.map(s => sb.from('monitor_sensors').update({ sort: s.sort }).eq('id', s.id)));
      const bad = res.find(r => r.error); if (bad) alertMsg("Couldn't save the new order: " + bad.error.message);
    }
  }
  function alertMsg(t) { const h = el2('hint'); if (h) h.textContent = t; }
  const el2 = (c) => root.querySelector('#lg .' + c);
  function niceStep(span, n) { const raw = span / n; const p = Math.pow(10, Math.floor(Math.log10(raw))); const f = raw / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }
  function drawChart() {
    const box = root.getElementById('cb'); if (!box) return;
    const W = Math.max(320, box.clientWidth || 600), H = W < 500 ? 310 : 390, L = 44, Rr = 50, T = 26, B = 30;
    const vis = S.sensors.filter(s => !S.hidden.has(s.id) && (S.series[s.id] || []).length);
    const temps = vis.filter(isTemp), pw = vis.filter(s => !isTemp(s));
    const rng = (arr, f) => { let lo = Infinity, hi = -Infinity; arr.forEach(s => S.series[s.id].forEach(p => { const v = f(p[1]); if (v < lo) lo = v; if (v > hi) hi = v; })); return lo === Infinity ? [0, 1] : lo === hi ? [lo - 1, hi + 1] : [lo, hi]; };
    let [tl, th] = rng(temps, cv); const ts = niceStep(th - tl, 5); tl = Math.floor(tl / ts) * ts; th = Math.ceil(th / ts) * ts;
    let [pl, ph] = rng(pw, v => v); pl = Math.min(0, pl); const ps = niceStep(ph - pl, 5); ph = Math.ceil(ph / ps) * ps || 1;
    const x = (t) => L + (t - S.from) / (S.to - S.from) * (W - L - Rr), yT = (v) => T + (1 - (v - tl) / (th - tl || 1)) * (H - T - B), yP = (v) => T + (1 - (v - pl) / (ph - pl || 1)) * (H - T - B);
    const R = S.range; const fmtX = (t) => { const d = new Date(t); return R === '24h' ? d.toLocaleTimeString('en-CA', { hour: 'numeric' }) : R === '1y' ? d.toLocaleDateString('en-CA', { month: 'short' }) : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }); };
    const nx = W < 500 ? 4 : 7; let grid = '', axes = '';
    for (let v = tl; v <= th + 1e-9; v += ts) { grid += `<line x1="${L}" x2="${W - Rr}" y1="${yT(v)}" y2="${yT(v)}"/>`; axes += `<text class="ax" x="${L - 6}" y="${yT(v) + 4}" text-anchor="end">${Math.round(v * 10) / 10}°</text>`; }
    if (pw.length) for (let v = pl; v <= ph + 1e-9; v += ps) axes += `<text class="ax" x="${W - Rr + 6}" y="${yP(v) + 4}">${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v)}</text>`;
    for (let i = 0; i <= nx; i++) { const t = S.from + i * (S.to - S.from) / nx; axes += `<text class="ax" x="${x(t)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === nx ? 'end' : 'middle'}">${fmtX(t)}</text>`; }
    const lines = vis.map(s => { const f = isTemp(s) ? (v) => yT(cv(v)) : yP; const d = S.series[s.id].map((p, i) => (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + f(p[1]).toFixed(1)).join(''); return `<path d="${d}" fill="none" stroke="${esc(s.color)}" stroke-width="${isTemp(s) ? 2 : 1.6}" stroke-linejoin="round" ${isTemp(s) ? '' : 'stroke-dasharray="5 3" opacity=".85"'}/>`; }).join('');
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Sensor graph"><text class="ax" x="${L - 6}" y="11" text-anchor="end" font-weight="700">${tU()}</text>${pw.length ? `<text class="ax" x="${W - Rr + 6}" y="11" font-weight="700">Watts</text>` : ''}<g class="grid">${grid}</g>${axes}${lines}<line id="cx" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--muted)" stroke-width="1" visibility="hidden"/></svg><div class="tip" id="tip" hidden></div>`;
    const svg = box.querySelector('svg'), cx = box.querySelector('#cx'), tip = box.querySelector('#tip');
    const near = (arr, t) => { let lo = 0, hi = arr.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m][0] < t) lo = m; else hi = m; } return Math.abs(arr[lo][0] - t) < Math.abs(arr[hi][0] - t) ? arr[lo] : arr[hi]; };
    const move = (ev) => {
      const r = svg.getBoundingClientRect(); const px = (ev.clientX - r.left) * W / r.width; if (px < L || px > W - Rr || !vis.length) return hide();
      const t = S.from + (px - L) / (W - L - Rr) * (S.to - S.from);
      cx.setAttribute('x1', px); cx.setAttribute('x2', px); cx.setAttribute('visibility', 'visible');
      tip.hidden = false; tip.innerHTML = `<div class="muted" style="margin-bottom:4px">${new Date(t).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>` + vis.map(s => { const p = near(S.series[s.id], t); return `<div class="r"><span><i style="background:${esc(s.color)}"></i>${esc(s.label)}</span><b>${isTemp(s) ? cv(p[1]).toFixed(1) + tU() : Math.round(p[1]) + ' W'}</b></div>`; }).join('');
      const left = (px / W) * r.width; tip.style.left = (left > r.width / 2 ? left - tip.offsetWidth - 12 : left + 12) + 'px';
    };
    const hide = () => { cx.setAttribute('visibility', 'hidden'); tip.hidden = true; };
    svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move); svg.addEventListener('pointerleave', hide);
  }
  function sensorForm(id) {
    const s = S.sensors.find(x => x.id === id); if (!s) return;
    modal.innerHTML = `<div class="modal"><div class="sheet"><h3>Edit sensor</h3>
      <label class="f">Name (location)<input data-f="label" value="${esc(s.label)}"></label>
      <label class="f">Line colour<input type="color" data-f="color" value="${esc(s.color)}"></label>
      <label class="f">Group<select data-f="grp">${Object.entries(GRP).map(([k, v]) => `<option value="${k}" ${k === grpOf(s) ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="f">What it measures<select data-f="kind">${Object.entries(KIND).map(([k, v]) => `<option value="${k}" ${k === s.kind ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <div class="small muted" style="margin-top:8px">${esc(s.provider)} ${esc(s.model)}${s.external_id ? ' · ' + esc(s.external_id) : ' · not connected yet'}</div>
      <div class="err" data-err></div><div class="acts"><button class="btn" data-x>Cancel</button><button class="btn pri" data-save>Save</button></div></div></div>`;
    modal.onclick = async (e) => {
      if (e.target.closest('[data-x]') || e.target === modal.firstElementChild) { modal.innerHTML = ''; return; }
      if (!e.target.closest('[data-save]')) return;
      const row = {}; modal.querySelectorAll('[data-f]').forEach(i => row[i.dataset.f] = i.value.trim());
      if (!row.label) { modal.querySelector('[data-err]').textContent = 'Give it a name.'; return; }
      const { error } = await sb.from('monitor_sensors').update(row).eq('id', id);
      if (error) { modal.querySelector('[data-err]').textContent = error.message; return; }
      Object.assign(s, row); modal.innerHTML = ''; drawLegend(); drawChart(); drawTiles();
    };
  }

  body.onclick = async (e) => {
    const h = e.target.closest('[data-site]'); if (h) return openSite(h.dataset.site);
    if (e.target.closest('[data-addsite]')) return siteForm(null);
    if (e.target.closest('[data-editsite]')) return siteForm(S.site);
    if (e.target.closest('[data-list]')) return list();
    const r = e.target.closest('[data-range]'); if (r) { S.range = r.dataset.range; lsSet('hm_range', S.range); body.querySelectorAll('[data-range]').forEach(b => b.classList.toggle('on', b === r)); await load(); drawChart(); drawTiles(); return; }
    const u = e.target.closest('[data-unit]'); if (u) { S.unit = u.dataset.unit; lsSet('hm_unit', S.unit); body.querySelectorAll('[data-unit]').forEach(b => b.classList.toggle('on', b === u)); drawChart(); drawTiles(); return; }
    const ed = e.target.closest('[data-editsensor]'); if (ed) return sensorForm(ed.dataset.editsensor);
  };
  body.onchange = (e) => {
    const c = e.target.closest('[data-show]'); if (!c) return;
    if (c.checked) S.hidden.delete(c.dataset.show); else S.hidden.add(c.dataset.show);
    lsSet('hm_hidden', JSON.stringify([...S.hidden])); drawChart();
  };
  const onResize = () => { if (S.site && root.getElementById('cb')) drawChart(); };
  window.addEventListener('resize', onResize);
  list();
  return () => { dead = true; clearInterval(timer); window.removeEventListener('resize', onResize); root.innerHTML = ''; };
}
