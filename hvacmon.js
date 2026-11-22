// Homestar HQ - HVAC Monitoring (v8 2026-11-22: server collector status, Export (CSV) + printable report, capacity monitoring - fan watts mapped to rated CFM per fan speed by the fan law, sensible BTU/h; v7 2026-11-21: minimal sensor list - tap a sensor for its details, collapsible sections, press-and-hold to move tiles anywhere (shared layout in monitor_sites.tile_layout); v5 2026-11-21: clients picked from Maintenance customers, equipment by system with outdoor/indoor units, model/serial/nameplate photos, sensors mapped to a unit, add/remove sensors, event markers on the graph; v4 2026-11-21: Equipment vs Ambient groups, room RH under the temperature; v3 2026-11-21: press-and-hold to reorder sensors; v2 2026-11-21: axis labels clear of ticks; v1 same day, Calvin). Tools > HVAC Monitoring: list of houses -> one house's dashboard:
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
.sys{border:1px solid var(--line);border-radius:12px;padding:10px;margin-top:10px;background:var(--bg)}
.sysh{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.sysh b{font-family:var(--display);font-size:17px}
.badge{font-size:12px;font-weight:700;border-radius:999px;padding:2px 9px;background:color-mix(in srgb,var(--brand) 14%,transparent);color:var(--brand)}
.sysh .ed{margin-left:auto}
.unit{display:flex;align-items:center;gap:10px;width:100%;text-align:left;font:inherit;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:9px 11px;margin-top:6px;cursor:pointer;min-width:0}
.unit .ui{font-size:20px;flex:none}.unit .ut{min-width:0;flex:1}.unit b{display:block;font-weight:600;overflow-wrap:anywhere}.unit .ut span{font-size:12.5px;color:var(--muted);display:block;overflow-wrap:anywhere}
.unit.out{border-left:4px solid var(--brand2,var(--brand))}.unit.in{border-left:4px solid var(--brand)}
.mini{font:inherit;font-size:13.5px;font-weight:600;border:1px dashed var(--line);background:none;color:var(--brand);border-radius:10px;padding:8px 12px;cursor:pointer;margin-top:8px;min-height:40px}
.ev{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;width:100%;text-align:left;font:inherit;color:var(--ink);background:none;border:0;border-top:1px solid var(--line);padding:9px 2px;cursor:pointer}
.ev:first-of-type{border-top:0}.ev .ei{font-size:18px;line-height:1.2}.ev b{display:block;font-weight:600}.ev span{font-size:12.5px;color:var(--muted);display:block;overflow-wrap:anywhere}
.ph{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.ph .p{position:relative}.ph img{width:84px;height:84px;object-fit:cover;border-radius:8px;border:1px solid var(--line);display:block;cursor:pointer}
.ph .p button{position:absolute;top:-6px;right:-6px;width:24px;height:24px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:var(--hot);font-weight:700;cursor:pointer;line-height:1;padding:0}
.btn.del{color:var(--hot);border-color:color-mix(in srgb,var(--hot) 45%,var(--line))}
.res{display:flex;flex-direction:column;gap:4px;margin-top:6px;max-height:220px;overflow:auto}
.res button{font:inherit;text-align:left;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:8px;padding:8px 10px;cursor:pointer}.res button span{display:block;font-size:12.5px;color:var(--muted)}
.linked{font-size:13px;color:var(--ok,var(--brand));font-weight:600;margin-top:6px}
textarea{font:inherit;font-size:16px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:9px 10px;width:100%;min-height:70px;resize:vertical}
.two{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}
.colh{cursor:pointer;user-select:none;-webkit-user-select:none;display:flex;align-items:center;gap:7px}
.colh::before{content:"";width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid currentColor;flex:none;transition:transform .15s}
.colh.shut::before{transform:rotate(-90deg)}
.tgh.colh.shut + *{display:none}
.card.shut > .cb{display:none}
h3.ch{margin:0;font-size:18px}
.tiles,.lgg{min-height:40px}
.tile{cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;transition:box-shadow .15s,transform .15s}
.tile.drag{position:relative;z-index:5;transform:scale(1.04);box-shadow:0 10px 28px rgba(0,0,0,.35);outline:2px solid var(--brand)}
.lg{cursor:pointer}
.lg .chev{font-size:20px;flex:none}
.kv{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid var(--line);font-size:14.5px}.kv span{color:var(--muted)}.kv b{font-weight:600;text-align:right;overflow-wrap:anywhere}
.tog{display:flex;gap:10px;align-items:center;margin-top:8px;font-weight:600;font-size:15px;color:var(--ink)}.tog input{width:22px;height:22px;accent-color:var(--brand);flex:none}
.spd{display:grid;grid-template-columns:minmax(0,1fr) 78px 60px auto;gap:6px;align-items:center;margin-top:6px}.spd input{padding:8px;font-size:15px}.spd span{font-size:13px;text-align:right;color:var(--muted)}.spd .mini{margin:0;padding:6px 9px;min-height:38px}
.spdh{display:grid;grid-template-columns:minmax(0,1fr) 78px 60px auto;gap:6px;font-size:11.5px;color:var(--muted);margin-top:8px;text-transform:uppercase;letter-spacing:.04em}
.capbox{border:1px solid var(--brand);border-radius:10px;padding:12px;margin-top:10px;background:color-mix(in srgb,var(--brand) 10%,transparent)}.capbox b.w{display:block;font-family:var(--display);font-size:30px}
.big{font-family:var(--display);font-size:34px;font-weight:700;margin:4px 0 10px}.big small{font-size:18px;color:var(--muted)}
`;
const RANGES = [{ k: '24h', label: '24 h', ms: 864e5, bucket: 300 }, { k: '7d', label: '7 days', ms: 7 * 864e5, bucket: 1800 }, { k: '30d', label: '30 days', ms: 30 * 864e5, bucket: 7200 }, { k: '1y', label: '1 year', ms: 365 * 864e5, bucket: 86400 }];
const KIND = { supply: 'Supply air', return: 'Return air', outdoor: 'Outdoor', room: 'Room', power: 'Power (W)', fan_power: 'Fan power (W)', humidity: 'Humidity (%)', other: 'Other' };
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isTemp = (s) => s.unit === 'C';
const GRP = { equipment: 'Equipment', ambient: 'Ambient' };
const grpOf = (s) => s.grp || (['room', 'outdoor', 'humidity'].includes(s.kind) ? 'ambient' : 'equipment');
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

const SYSTYPE = { central_ducted: 'Central ducted', single_zone: 'Single-zone ductless', multi_zone: 'Multi-zone ductless', ducted_mini: 'Ducted mini-split', air_to_water: 'Air-to-water', other: 'Other' };
const STYLE = { wall: 'Wall head', ducted: 'Ducted (concealed)', cassette: 'Cassette', console: 'Floor console', ceiling: 'Ceiling suspended', air_handler: 'Air handler', furnace_coil: 'Furnace + coil', hydronic: 'Hydronic module', outdoor: 'Outdoor unit', other: 'Other' };
const INDOOR_DEFAULT = { central_ducted: 'air_handler', single_zone: 'wall', multi_zone: 'wall', ducted_mini: 'ducted', air_to_water: 'hydronic', other: 'other' };
const EVK = { service: ['🛠️', 'Service visit'], filter: ['🧽', 'Filter change'], setting: ['🎛️', 'Setting change'], repair: ['🔧', 'Repair'], install: ['📦', 'Install'], note: ['📝', 'Note'] };
const EVC = { service: '#3e63dd', filter: '#30a46c', setting: '#f5a524', repair: '#e5484d', install: '#8e4ec6', note: '#8b8d98' };
const UNIT_OF = (kind) => kind === 'power' || kind === 'fan_power' ? 'W' : kind === 'humidity' ? '%' : 'C';
const PALETTE = ['#e5484d', '#3e63dd', '#30a46c', '#f5a524', '#8e4ec6', '#12a594', '#d6409f', '#0090ff', '#ff8b3e', '#a18072'];
const localInput = (t) => { const d = new Date(t); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
const fmtDT = (t) => new Date(t).toLocaleString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const SPEED_NAMES = { 1: ['Fan'], 2: ['Low', 'High'], 3: ['Low', 'Medium', 'High'], 4: ['Quiet', 'Low', 'Medium', 'High'], 5: ['Quiet', 'Low', 'Medium', 'High', 'Powerful'] };
const capPts = (u) => (u.fan_speeds || []).filter(p => +p.rated_cfm > 0 && +p.watts > 0).map(p => ({ w: +p.watts, c: +p.rated_cfm })).sort((a, b) => a.w - b.w);
// fan law: CFM ~ RPM and W ~ RPM^3, so CFM ~ W^(1/3). Between two captured speeds interpolate CFM on the cube root of watts; beyond the ends scale from the nearest speed.
function cfmAt(pts, w) {
  if (w == null || !pts.length) return null; if (w < Math.max(2, pts[0].w * 0.3)) return 0;
  const x = Math.cbrt(w), a = pts[0], z = pts[pts.length - 1];
  if (w <= a.w) return a.c * x / Math.cbrt(a.w); if (w >= z.w) return z.c * x / Math.cbrt(z.w);
  for (let i = 1; i < pts.length; i++) if (w <= pts[i].w) { const p = pts[i - 1], q = pts[i], xp = Math.cbrt(p.w), xq = Math.cbrt(q.w); return p.c + (q.c - p.c) * (x - xp) / (xq - xp); }
  return null;
}
const holdAt = (arr, t, maxMs = 2 * 36e5) => { if (!arr || !arr.length || arr[0][0] > t) return null; let lo = 0, hi = arr.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (arr[m][0] <= t) lo = m; else hi = m - 1; } return t - arr[lo][0] <= maxMs ? arr[lo][1] : null; };
const csvCell = (v) => { const t = v == null ? '' : String(v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
const dIn = (t) => { const d = new Date(t); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

export function mountHvacMon(root, { sb }) {
  root.innerHTML = `<style>${CSS}</style><a class="back" href="#/tools">← Tools</a><div id="body"></div><div id="modal"></div>`;
  const body = root.getElementById('body'), modal = root.getElementById('modal');
  const S = { sites: [], site: null, sensors: [], all: [], systems: [], units: [], events: [], cust: null, custs: null, range: lsGet('hm_range', '24h'), unit: lsGet('hm_unit', 'F'), hidden: new Set(JSON.parse(lsGet('hm_hidden', '[]'))), shut: new Set(JSON.parse(lsGet('hm_shut', '[]'))), rh: {}, series: null, sample: false };
  let dead = false, timer = null;
  const cv = (c) => S.unit === 'F' ? c * 9 / 5 + 32 : c;   // stored C -> shown unit
  const tU = () => '°' + S.unit;
  const nameOf = (s) => (s.first_name + ' ' + s.last_name).trim() || 'Unnamed';
  const sysOf = (id) => S.systems.find(x => x.id === id);
  const unitById = (id) => S.units.find(x => x.id === id);
  const unitName = (u) => { if (!u) return ''; const sy = sysOf(u.system_id); return (u.role === 'outdoor' ? 'Outdoor unit' : (u.location || 'Indoor unit')) + (S.systems.length > 1 && sy ? ' · ' + (sy.name || SYSTYPE[sy.type]) : ''); };
  let capTimer = null;
  const closeModal = () => { clearInterval(capTimer); capTimer = null; modal.innerHTML = ''; modal.onclick = null; modal.onchange = null; modal.oninput = null; };
  const sheet = (title, inner) => { modal.innerHTML = `<div class="modal"><div class="sheet"><h3>${title}</h3>${inner}<div class="err" data-err></div></div></div>`; };
  const errOut = (t) => { const e = modal.querySelector('[data-err]'); if (e) e.textContent = t; };
  const isBackdrop = (e) => e.target === modal.firstElementChild || e.target.closest('[data-x]');
  const vals = () => { const row = {}; modal.querySelectorAll('[data-f]').forEach(i => row[i.dataset.f] = i.value.trim()); return row; };
  const unitOptions = (sel) => `<option value="">Not attached (room / outdoor air)</option>` + S.systems.map(sy => S.units.filter(u => u.system_id === sy.id).map(u => `<option value="${u.id}" ${u.id === sel ? 'selected' : ''}>${esc((sy.name || SYSTYPE[sy.type]) + ' - ' + (u.role === 'outdoor' ? 'Outdoor unit' : (u.location || 'Indoor unit')))}</option>`).join('')).join('');

  // ---------- house list ----------
  async function list() {
    S.site = null; clearInterval(timer);
    body.innerHTML = '<h2>HVAC Monitoring</h2><div class="muted">Loading houses…</div>';
    const { data, error } = await sb.from('monitor_sites').select('*').eq('active', true).order('last_name');
    if (dead) return;
    if (error) { body.innerHTML = `<h2>HVAC Monitoring</h2><div class="err">${esc(error.message)}</div>`; return; }
    S.sites = data || [];
    body.innerHTML = `<h2>HVAC Monitoring</h2><div class="muted">Live system data from monitored homes. Pick a house.</div>
      <div class="list">${S.sites.map(s => `<button class="house" data-site="${s.id}"><span class="ic">🏠</span><span><b>${esc(nameOf(s))}</b><span class="muted small">${esc(s.address || 'No address yet')}</span></span><span class="chev">›</span></button>`).join('') || '<div class="muted">No houses yet.</div>'}</div>
      <div class="acts"><button class="btn pri" data-addsite>+ Add a client</button></div>`;
  }
  async function customers() {
    if (S.custs) return S.custs;
    const out = [];
    for (let from = 0; from < 5000; from += 1000) {
      const { data, error } = await sb.from('board_docs').select('doc_id,name:data->>name,address:data->>address,town:data->>town,phone:data->>phone,email:data->>email,removed:data->>removed').eq('collection', 'customers').is('owner_id', null).range(from, from + 999);
      if (error) throw error; out.push(...data.filter(c => !c.removed)); if (data.length < 1000) break;
    }
    return (S.custs = out);
  }
  async function custEquipment(id) {
    if (!id) return [];
    const { data } = await sb.from('board_docs').select('equipment:data->equipment').eq('collection', 'customers').is('owner_id', null).eq('doc_id', id).maybeSingle();
    return Array.isArray(data && data.equipment) ? data.equipment.filter(e => e && (e.model || e.serial)) : [];
  }
  function siteForm(s) {
    const v = s || { first_name: '', last_name: '', phone: '', email: '', address: '', notes: '', customer_id: '' };
    let link = v.customer_id || '';
    sheet(s ? 'Edit client' : 'Add a client', `
      <label class="f">Find an existing customer<input data-q placeholder="Name, address or phone" autocomplete="off"></label><div class="res" data-res></div>
      <div class="linked" data-linked>${link ? 'Linked to the Maintenance customer record' : ''}</div>
      <div class="two"><label class="f">First name<input data-f="first_name" value="${esc(v.first_name)}"></label><label class="f">Last name<input data-f="last_name" value="${esc(v.last_name)}"></label></div>
      <div class="two"><label class="f">Phone<input data-f="phone" type="tel" value="${esc(v.phone)}"></label><label class="f">Email<input data-f="email" type="email" value="${esc(v.email)}"></label></div>
      <label class="f">Address<input data-f="address" value="${esc(v.address)}"></label>
      <label class="f">Notes<textarea data-f="notes">${esc(v.notes)}</textarea></label>
      <div class="acts"><button class="btn" data-x>Cancel</button><button class="btn pri" data-save>Save</button>${s ? '<button class="btn del" data-rm>Remove client</button>' : ''}</div>`);
    let hits = [];
    modal.oninput = async (e) => {
      if (!e.target.closest('[data-q]')) return;
      const q = e.target.value.trim().toLowerCase(); const box = modal.querySelector('[data-res]');
      if (q.length < 2) { box.innerHTML = ''; return; }
      try { const all = await customers(); const dq = q.replace(/\D/g, '');
        hits = all.filter(c => (c.name || '').toLowerCase().includes(q) || (c.address || '').toLowerCase().includes(q) || (dq.length >= 3 && (c.phone || '').replace(/\D/g, '').includes(dq))).slice(0, 8);
        box.innerHTML = hits.map((c, i) => `<button data-hit="${i}">${esc(c.name)}<span>${esc(c.address || c.town || '')}${c.phone ? ' · ' + esc(c.phone) : ''}</span></button>`).join('') || '<div class="muted small">No match. Fill it in below.</div>';
      } catch (x) { box.innerHTML = `<div class="err">${esc(x.message)}</div>`; }
    };
    modal.onclick = async (e) => {
      if (isBackdrop(e)) return closeModal();
      const h = e.target.closest('[data-hit]');
      if (h) { const c = hits[+h.dataset.hit]; const parts = (c.name || '').trim().split(/\s+/); const set = (f, x) => { const i = modal.querySelector(`[data-f="${f}"]`); if (i) i.value = x || ''; };
        set('first_name', parts[0]); set('last_name', parts.slice(1).join(' ')); set('phone', c.phone); set('email', c.email); set('address', c.address || c.town);
        link = c.doc_id; modal.querySelector('[data-linked]').textContent = 'Linked to ' + c.name + "'s Maintenance record - their equipment on file shows when you add units."; modal.querySelector('[data-res]').innerHTML = ''; modal.querySelector('[data-q]').value = ''; return; }
      if (e.target.closest('[data-rm]')) { if (!confirm('Remove ' + nameOf(s) + ' from HVAC Monitoring? Their readings stay stored.')) return; const { error } = await sb.from('monitor_sites').update({ active: false }).eq('id', s.id); if (error) return errOut(error.message); closeModal(); return list(); }
      if (!e.target.closest('[data-save]')) return;
      const row = vals(); row.customer_id = link;
      if (!row.first_name && !row.last_name) return errOut('Add a name.');
      const q = s ? sb.from('monitor_sites').update(row).eq('id', s.id) : sb.from('monitor_sites').insert(row).select().single();
      const { data, error } = await q; if (error) return errOut(error.message);
      closeModal(); if (s) { Object.assign(S.site, row); S.cust = null; dash(); } else { S.sites.push(data); openSite(data.id); }
    };
  }

  // ---------- sample data (until real readings exist) ----------
  function sampleSeries(from, to, bucket) {
    const out = {}; const n = Math.floor((to - from) / (bucket * 1000));
    const seed = (x) => { const s = Math.sin(x * 12.9898) * 43758.5453; return s - Math.floor(s); };
    const pts = []; for (let i = 0; i <= n; i++) pts.push(from + i * bucket * 1000);
    const outdoor = pts.map((t, i) => { const d = new Date(t); const day = (d.getHours() + d.getMinutes() / 60) / 24; const yr = (t / 864e5) / 365.25 * 2 * Math.PI; return 6 + 4 * Math.sin((day - 0.35) * 2 * Math.PI) + 3 * Math.cos(yr + 0.3) + (seed(i) - 0.5) * 0.8; });
    S.all.forEach((s, k) => {
      out[s.id] = pts.map((t, i) => {
        const od = outdoor[i]; const load = Math.max(0, Math.min(1, (18 - od) / 22)); const defrost = od < 3 && (Math.floor(t / 36e5) % 2 === 0) && (new Date(t).getMinutes() < 8);
        if (s.kind === 'outdoor') return od;
        if (s.kind === 'room') return 21 + (k % 2 ? -0.6 : 0.3) + Math.sin(i / 9) * 0.3 + (seed(i + k) - 0.5) * 0.3;
        if (s.kind === 'return') return 21.4 + (seed(i + 7) - 0.5) * 0.4;
        if (s.kind === 'supply') return defrost ? 24 : 21.4 + 12 + load * 14 + (seed(i + 3) - 0.5);
        if (s.kind === 'power') return defrost ? 180 : 250 + load * 1500 + (seed(i + 5) - 0.5) * 40;
        if (s.kind === 'fan_power') return 18 + load * 22;
        if (s.kind === 'humidity') return 44 + (k % 2 ? -4 : 2) + Math.sin(i / 15) * 2 + (seed(i + k) - 0.5);
        return 20 + (seed(i + k) - 0.5);
      }).map((v, i) => [pts[i], v]);
    });
    return out;
  }

  // ---------- dashboard ----------
  async function openSite(id) {
    S.site = S.sites.find(x => x.id === id); if (!S.site) return list();
    body.innerHTML = '<div class="muted">Loading…</div>'; S.cust = null;
    const ok = await reloadMeta(); if (!ok) return;
    await load(); dash();
    clearInterval(timer); timer = setInterval(async () => { if (S.site && !dead) { await load(); drawChart(); drawTiles(); } }, 60000);
  }
  async function reloadMeta() {
    const id = S.site.id;
    const [a, b, c] = await Promise.all([
      sb.from('monitor_sensors').select('*').eq('site_id', id).eq('active', true).order('sort'),
      sb.from('monitor_systems').select('*, monitor_units(*)').eq('site_id', id).order('sort').order('created_at'),
      sb.from('monitor_events').select('*').eq('site_id', id).order('ts', { ascending: false })]);
    if (dead) return false;
    const err = a.error || b.error || c.error; if (err) { body.innerHTML = `<div class="err">${esc(err.message)}</div>`; return false; }
    S.all = a.data || []; S.sensors = S.all.filter(x => x.kind !== 'humidity'); S.rh = {}; S.all.filter(x => x.kind === 'humidity' && x.pair_id).forEach(h => { S.rh[h.pair_id] = h; });
    S.systems = (b.data || []).map(sy => { const u = sy.monitor_units || []; delete sy.monitor_units; return Object.assign(sy, { _u: u }); });
    S.units = S.systems.flatMap(sy => sy._u.sort((x, y) => (x.role === 'outdoor' ? -1 : 0) - (y.role === 'outdoor' ? -1 : 0) || x.sort - y.sort));
    S.events = c.data || [];
    return true;
  }
  async function load() {
    const R = RANGES.find(r => r.k === S.range) || RANGES[0]; const to = Date.now(), from = to - R.ms;
    const { data, error } = await seriesAll(from, to, R.bucket);
    const ser = {}; (data || []).forEach(r => (ser[r.sensor_id] = ser[r.sensor_id] || []).push([Date.parse(r.t), Number(r.v)]));
    S.sample = !error && !(data || []).length; S.err = error ? error.message : '';
    S.series = S.sample ? sampleSeries(from, to, R.bucket) : ser; S.from = from; S.to = to; S.bucket = R.bucket;
    S.derived = derive(S.series);
  }
  // every row of monitor_series for a window (the API returns 1000 rows per call)
  async function seriesAll(from, to, bucket) {
    const rows = [];
    for (let off = 0; off < 2e6; off += 1000) {
      const { data, error } = await sb.rpc('monitor_series', { p_site: S.site.id, p_from: new Date(from).toISOString(), p_to: new Date(to).toISOString(), p_bucket: bucket }).range(off, off + 999);
      if (error) return { error }; rows.push(...data); if (data.length < 1000) break;
    }
    return { data: rows };
  }
  // ---- capacity: indoor units with monitoring on, a fan-power sensor, captured speeds and supply + return sensors
  function capUnits() { return S.units.filter(u => u.role === 'indoor' && u.cap_enabled && u.fan_sensor && capPts(u).length && S.sensors.some(s => s.kind === 'supply' && s.unit_id === u.id) && S.sensors.some(s => s.kind === 'return' && s.unit_id === u.id)); }
  function derive(ser) {
    const out = {};
    for (const u of capUnits()) {
      const sup = S.sensors.find(s => s.kind === 'supply' && s.unit_id === u.id), ret = S.sensors.find(s => s.kind === 'return' && s.unit_id === u.id), pts = capPts(u);
      const cfm = [], btu = [];
      for (const [t, w] of (ser[u.fan_sensor] || [])) { const c = cfmAt(pts, w); cfm.push([t, c]); const a = holdAt(ser[sup.id], t), b = holdAt(ser[ret.id], t); if (c != null && a != null && b != null) btu.push([t, 1.08 * c * (a - b) * 1.8]); }
      out[u.id] = { cfm, btu };
    }
    return out;
  }
  function dash() {
    const s = S.site;
    const contact = [s.phone ? `<a href="tel:${esc(s.phone.replace(/[^\d+]/g, ''))}">${esc(s.phone)}</a>` : '', s.email ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : ''].filter(Boolean).join(' · ');
    body.innerHTML = `<div class="head"><div><h2>${esc(nameOf(s))}</h2><div class="muted small">${esc(s.address)}</div>${contact ? `<div class="small" style="margin-top:2px">${contact}</div>` : ''}</div>
        <div class="chips"><button class="chip" data-editsite>Edit client</button><button class="chip" data-list>All houses</button></div></div>
      ${S.err ? `<div class="err">${esc(S.err)}</div>` : ''}
      ${S.sample ? '<div class="sample"><b>Sample data</b> - sensors not connected yet.</div>' : ''}
      <div class="bar"><div class="chips">${RANGES.map(r => `<button class="chip${r.k === S.range ? ' on' : ''}" data-range="${r.k}">${r.label}</button>`).join('')}</div>
        <div class="chips"><button class="chip${S.unit === 'F' ? ' on' : ''}" data-unit="F">°F</button><button class="chip${S.unit === 'C' ? ' on' : ''}" data-unit="C">°C</button><button class="chip" data-export>⬇ Export</button></div></div>
      <div class="card"><div class="chartbox" id="cb"></div><div class="legend" id="lg"></div></div>
      <div id="tiles"></div>
      <div class="card${S.shut.has('eq') ? ' shut' : ''}" id="eq" data-card="eq"></div>
      <div class="card${S.shut.has('evs') ? ' shut' : ''}" id="evs" data-card="evs"></div>`;
    drawChart(); drawLegend(); drawTiles(); drawEquipment(); drawEvents();
  }
  const last = (id) => { const a = (S.series && S.series[id]) || []; return a.length ? a[a.length - 1] : null; };
  const colh = (key, label, tag = 'div', cls = 'tgh') => `<${tag} class="${cls} colh${S.shut.has(key) ? ' shut' : ''}" data-col="${key}">${label}</${tag}>`;
  const fmtVal = (s, v) => v == null ? '–' : isTemp(s) ? cv(v).toFixed(1) + tU() : Math.round(v) + ' ' + esc(s.unit);
  // ---- tiles: one layout for everyone (monitor_sites.tile_layout = {equipment:[keys], ambient:[keys]}); keys = sensor id or dt:<unit id>
  function tileItems() {
    const items = S.sensors.map(s => ({ key: s.id, s, grp: grpOf(s) }));
    const seen = new Set();
    S.sensors.filter(s => s.kind === 'supply').forEach(sup => { const ret = S.sensors.find(r => r.kind === 'return' && (r.unit_id || null) === (sup.unit_id || null)); const k = 'dt:' + (sup.unit_id || 'house'); if (ret && !seen.has(k)) { seen.add(k); items.push({ key: k, dt: [sup, ret], der: 1, grp: 'equipment' }); } });
    capUnits().forEach(u => { items.push({ key: 'cfm:' + u.id, cap: 'cfm', u, der: 1, grp: 'equipment' }); items.push({ key: 'btu:' + u.id, cap: 'btu', u, der: 1, grp: 'equipment' }); });
    const lay = S.site.tile_layout || {};
    items.forEach(it => { if (it.der) for (const g of Object.keys(GRP)) if ((lay[g] || []).includes(it.key)) it.grp = g; });
    const out = {}; for (const g of Object.keys(GRP)) { const order = lay[g] || []; const mine = items.filter(it => it.grp === g); const rank = (it) => { const i = order.indexOf(it.key); return i < 0 ? 1e6 + (it.der ? -1 : items.indexOf(it)) : i; }; out[g] = mine.sort((a, b) => rank(a) - rank(b)); }
    return out;
  }
  function drawTiles() {
    const el = root.getElementById('tiles'); if (!el || !S.site) return;
    const tile = (it) => {
      if (it.cap) { const a = ((S.derived[it.u.id] || {})[it.cap] || []); const v = a.length ? a[a.length - 1][1] : null; const nm = esc(unitName(it.u));
        return it.cap === 'cfm' ? `<div class="tile" data-tile="${it.key}" style="--c:var(--brand)"><b>${v == null ? '–' : Math.round(v) + ' CFM'}</b><span>Airflow · ${nm}</span></div>` : `<div class="tile" data-tile="${it.key}" style="--c:var(--brand)"><b>${v == null ? '–' : Math.round(Math.abs(v)).toLocaleString('en-CA') + ' BTU/h'}</b><span>${v == null || Math.abs(v) < 1 ? 'Sensible' : v > 0 ? 'Sensible heating' : 'Sensible cooling'} · ${nm}</span></div>`; }
      if (it.dt) { const [sup, ret] = it.dt; const a = last(sup.id), b = last(ret.id); const d = a && b ? a[1] - b[1] : null; const u = unitById(sup.unit_id); return `<div class="tile" data-tile="${it.key}" style="--c:var(--brand)"><b>${d == null ? '–' : (S.unit === 'F' ? d * 9 / 5 : d).toFixed(1) + tU()}</b><span>ΔT${u ? ' · ' + esc(unitName(u)) : ''}</span></div>`; }
      const s = it.s, l = last(s.id), h = S.rh[s.id] && last(S.rh[s.id].id);
      return `<div class="tile" data-tile="${it.key}" style="--c:${esc(s.color)}"><b>${fmtVal(s, l && l[1])}</b>${S.rh[s.id] ? `<em>${h ? Math.round(h[1]) + '% RH' : '– RH'}</em>` : ''}<span>${esc(s.label)}</span></div>`;
    };
    const by = tileItems();
    el.innerHTML = Object.keys(GRP).map(g => `${colh('t-' + g, GRP[g])}<div class="tiles" data-grp="${g}">${by[g].map(tile).join('')}</div>`).join('');
    bindDrag(el, '.tile', '.tiles', saveTiles);
  }
  async function saveTiles(moved, toGrp) {
    const lay = {}; root.querySelectorAll('#tiles .tiles').forEach(g => { lay[g.dataset.grp] = [...g.querySelectorAll('.tile')].map(t => t.dataset.tile); });
    S.site.tile_layout = lay;
    const s = S.sensors.find(x => x.id === moved);
    const jobs = [sb.from('monitor_sites').update({ tile_layout: lay }).eq('id', S.site.id)];
    if (s && grpOf(s) !== toGrp) { s.grp = toGrp; jobs.push(sb.from('monitor_sensors').update({ grp: toGrp }).eq('id', s.id)); drawLegend(); }
    const res = await Promise.all(jobs); const bad = res.find(r => r.error); if (bad) toast("Couldn't save the layout: " + bad.error.message);
  }
  // ---- legend: name only; tap a sensor for its details, press and hold to move it (also between groups)
  function drawLegend() {
    const el = root.getElementById('lg'); if (!el) return;
    const row = (s) => `<div class="lg" data-row="${s.id}"><span class="hd" aria-hidden="true">⠿</span><input type="checkbox" data-show="${s.id}" ${S.hidden.has(s.id) ? '' : 'checked'} aria-label="Show ${esc(s.label)}"><span class="sw" style="background:${esc(s.color)}"></span><span class="nm"><b>${esc(s.label)}</b></span><span class="chev muted">›</span></div>`;
    el.innerHTML = Object.keys(GRP).map(g => `${colh('lg-' + g, GRP[g] + ' sensors')}<div class="lgg" data-grp="${g}">${S.sensors.filter(s => grpOf(s) === g).map(row).join('')}</div>`).join('') + '<button class="mini" data-addsensor>+ Add a sensor</button>';
    bindDrag(el, '.lg', '.lgg', saveLegend);
  }
  async function saveLegend(moved, toGrp) {
    const ids = [...root.querySelectorAll('#lg .lg')].map(r => r.dataset.row);
    S.sensors.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)); S.sensors.forEach((s, i) => { s.sort = i + 1; });
    const m = S.sensors.find(x => x.id === moved); const regrp = m && grpOf(m) !== toGrp; if (regrp) m.grp = toGrp;
    drawChart(); if (regrp) drawTiles();
    const res = await Promise.all(S.sensors.map(s => sb.from('monitor_sensors').update(s === m && regrp ? { sort: s.sort, grp: toGrp } : { sort: s.sort }).eq('id', s.id)));
    const bad = res.find(r => r.error); if (bad) toast("Couldn't save the new order: " + bad.error.message);
  }
  function drawEquipment() {
    const el = root.getElementById('eq'); if (!el) return;
    const unitBtn = (u) => { const sub = [STYLE[u.style] && u.role !== 'outdoor' ? STYLE[u.style] : '', u.capacity].filter(Boolean).join(' · ');
      return `<button class="unit ${u.role === 'outdoor' ? 'out' : 'in'}" data-eunit="${u.id}"><span class="ui">${u.role === 'outdoor' ? '🌀' : '❄️'}</span><span class="ut"><b>${esc(u.role === 'outdoor' ? 'Outdoor unit' : (u.location || 'Indoor unit'))}</b>${sub || u.model ? `<span>${esc([u.model, sub].filter(Boolean).join(' · '))}</span>` : ''}</span><span class="chev muted">›</span></button>`; };
    el.innerHTML = `<div class="head">${colh('eq', 'Equipment', 'h3', 'ch')}<button class="chip" data-addsys>+ System</button></div><div class="cb">
      ${S.systems.map(sy => { const us = S.units.filter(u => u.system_id === sy.id); return `<div class="sys"><div class="sysh"><b>${esc(sy.name || SYSTYPE[sy.type] || 'System')}</b><span class="badge">${esc(SYSTYPE[sy.type] || sy.type)}</span><button class="ed" data-editsys="${sy.id}">✎</button></div>
        ${us.map(unitBtn).join('')}<button class="mini" data-addunit="${sy.id}">+ Unit</button></div>`; }).join('') || '<div class="muted small">No equipment yet.</div>'}</div>`;
  }
  function eventsInRange() { return S.events.filter(ev => Date.parse(ev.ts) >= S.from); }
  function drawEvents() {
    const el = root.getElementById('evs'); if (!el) return;
    const inR = eventsInRange(); const older = S.events.length - inR.length;
    el.innerHTML = `<div class="head">${colh('evs', 'Events', 'h3', 'ch')}<button class="chip" data-addev>+ Event</button></div><div class="cb">
      ${inR.map(ev => { const k = EVK[ev.kind] || EVK.note; const u = unitById(ev.unit_id); return `<button class="ev" data-ev="${ev.id}"><span class="ei">${k[0]}</span><span><b>${esc(ev.title || k[1])}</b><span>${esc(fmtDT(ev.ts))}${u ? ' · ' + esc(unitName(u)) : ''}</span></span></button>`; }).join('') || '<div class="muted small">None in this range.</div>'}
      ${older ? `<div class="hint">${older} older - pick a longer range.</div>` : ''}</div>`;
  }
  function toast(t) { const d = document.createElement('div'); d.className = 'err'; d.textContent = t; body.prepend(d); setTimeout(() => d.remove(), 6000); }
  // ---- press-and-hold drag for any list or grid: items `sel` inside groups `gsel`; moves within and between groups
  function bindDrag(el, sel, gsel, onDone) {
    if (el._dragBound) return; el._dragBound = true;
    let timer = null, drag = null, sx = 0, sy = 0, from = null;
    const cancelHold = () => { clearTimeout(timer); timer = null; };
    el.addEventListener('pointerdown', (e) => {
      const it = e.target.closest(sel); if (!it || e.target.closest('input,button')) return;
      sx = e.clientX; sy = e.clientY; cancelHold();
      timer = setTimeout(() => { timer = null; drag = it; from = it.parentElement.dataset.grp + ':' + [...it.parentElement.children].indexOf(it); it.classList.add('drag'); try { it.setPointerCapture(e.pointerId); } catch (x) {} if (navigator.vibrate) navigator.vibrate(15); }, e.pointerType === 'mouse' ? 220 : 400);
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag) { if (timer && (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8)) cancelHold(); return; }
      e.preventDefault();
      const hit = (root.elementFromPoint ? root.elementFromPoint(e.clientX, e.clientY) : document.elementFromPoint(e.clientX, e.clientY));
      const over = hit && hit.closest && hit.closest(sel); const grp = hit && hit.closest && hit.closest(gsel);
      if (over && over !== drag && el.contains(over)) { const b = over.getBoundingClientRect(); const grid = getComputedStyle(over.parentElement).display === 'grid'; const after = grid ? e.clientX > b.left + b.width / 2 : e.clientY > b.top + b.height / 2; if (after) { if (over.nextSibling !== drag) over.after(drag); } else if (over.previousSibling !== drag) over.before(drag); }
      else if (grp && el.contains(grp) && !grp.contains(drag)) grp.appendChild(drag);
    });
    const end = () => { cancelHold(); if (!drag) return; const it = drag; drag = null; it.classList.remove('drag'); el._justDragged = Date.now(); const to = it.parentElement.dataset.grp + ':' + [...it.parentElement.children].indexOf(it); if (to !== from) onDone(it.dataset.row || it.dataset.tile, it.parentElement.dataset.grp); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('touchmove', (e) => { if (drag) e.preventDefault(); }, { passive: false });
    el.addEventListener('contextmenu', (e) => { if (drag || timer) e.preventDefault(); });
  }
  const recentDrag = (e) => { const c = e.target.closest('#lg,#tiles'); return c && c._justDragged && Date.now() - c._justDragged < 400; };
  // ---- sensor details (tap a sensor in the list or its tile)
  function sensorInfo(id) {
    const s = S.sensors.find(x => x.id === id); if (!s) return;
    const l = last(s.id), h = S.rh[s.id] && last(S.rh[s.id].id), u = unitById(s.unit_id);
    const row = (k, v) => v ? `<div class="kv"><span>${k}</span><b>${v}</b></div>` : '';
    sheet(`<span class="sw" style="background:${esc(s.color)};display:inline-block;vertical-align:middle;margin-right:8px"></span>${esc(s.label)}`, `
      <div class="big">${fmtVal(s, l && l[1])}${S.rh[s.id] ? ` <small>${h ? Math.round(h[1]) + '% RH' : ''}</small>` : ''}</div>
      ${row('Measures', esc(KIND[s.kind] || s.kind) + (S.rh[s.id] ? ' + humidity' : ''))}
      ${row('Attached to', u ? esc(unitName(u)) + (u.model ? ' · ' + esc(u.model) : '') : 'Not attached')}
      ${row('Group', GRP[grpOf(s)])}
      ${row('Sensor', esc([s.provider === 'yolink' ? 'YoLink' : s.provider === 'shelly' ? 'Shelly' : s.provider, s.model].filter(Boolean).join(' ')))}
      ${row('Status', !s.external_id ? 'Not connected yet' : !s.last_ts ? 'Connected · waiting for first reading' : (Date.now() - Date.parse(s.last_ts) > (s.provider === 'shelly' ? 15 * 6e4 : 2 * 36e5) ? '<span style="color:var(--hot)">No data since ' + esc(fmtDT(s.last_ts)) + '</span>' : 'Reporting'))}
      ${row('Last report', s.last_ts ? esc(fmtDT(s.last_ts)) : '')}
      <div class="acts"><button class="btn" data-x>Close</button><button class="btn pri" data-edit>✎ Edit</button></div>`);
    modal.onclick = (e) => { if (isBackdrop(e)) return closeModal(); if (e.target.closest('[data-edit]')) { closeModal(); sensorForm(id); } };
  }
  function niceStep(span, n) { const raw = span / n; const p = Math.pow(10, Math.floor(Math.log10(raw))); const f = raw / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }
  function drawChart(boxArg, width) {
    const box = boxArg || root.getElementById('cb'); if (!box) return;
    const W = width || Math.max(320, box.clientWidth || 600), H = W < 500 ? 310 : 390, L = 44, Rr = 50, T = 26, B = 30;
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
    const evs = eventsInRange();
    const marks = evs.map(ev => { const px = Math.min(W - Rr, x(Date.parse(ev.ts))).toFixed(1); const c = EVC[ev.kind] || EVC.note; return `<line x1="${px}" x2="${px}" y1="${T}" y2="${H - B}" stroke="${c}" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M${px - 6} ${T - 9}h12l-6 8z" fill="${c}"/>`; }).join('');
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Sensor graph"><text class="ax" x="${L - 6}" y="11" text-anchor="end" font-weight="700">${tU()}</text>${pw.length ? `<text class="ax" x="${W - Rr + 6}" y="11" font-weight="700">Watts</text>` : ''}<g class="grid">${grid}</g>${axes}${lines}${marks}<line id="cx" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--muted)" stroke-width="1" visibility="hidden"/></svg><div class="tip" id="tip" hidden></div>`;
    const svg = box.querySelector('svg'), cx = box.querySelector('#cx'), tip = box.querySelector('#tip');
    const near = (arr, t) => { let lo = 0, hi = arr.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m][0] < t) lo = m; else hi = m; } return Math.abs(arr[lo][0] - t) < Math.abs(arr[hi][0] - t) ? arr[lo] : arr[hi]; };
    const move = (ev) => {
      const r = svg.getBoundingClientRect(); const px = (ev.clientX - r.left) * W / r.width; if (px < L || px > W - Rr || (!vis.length && !evs.length)) return hide();
      const t = S.from + (px - L) / (W - L - Rr) * (S.to - S.from); const win = 10 / (W - L - Rr) * (S.to - S.from);
      cx.setAttribute('x1', px); cx.setAttribute('x2', px); cx.setAttribute('visibility', 'visible');
      const nearEv = evs.filter(e2 => Math.abs(Date.parse(e2.ts) - t) <= win);
      tip.hidden = false; tip.innerHTML = `<div class="muted" style="margin-bottom:4px">${new Date(t).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>` + nearEv.map(e2 => `<div style="margin-bottom:4px"><b>${(EVK[e2.kind] || EVK.note)[0]} ${esc(e2.title || (EVK[e2.kind] || EVK.note)[1])}</b></div>`).join('') + vis.map(s => { const p = near(S.series[s.id], t); return `<div class="r"><span><i style="background:${esc(s.color)}"></i>${esc(s.label)}</span><b>${isTemp(s) ? cv(p[1]).toFixed(1) + tU() : Math.round(p[1]) + ' W'}</b></div>`; }).join('');
      const left = (px / W) * r.width; tip.style.left = (left > r.width / 2 ? left - tip.offsetWidth - 12 : left + 12) + 'px';
    };
    const hide = () => { cx.setAttribute('visibility', 'hidden'); tip.hidden = true; };
    svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move); svg.addEventListener('pointerleave', hide);
  }

  // ---------- sensors ----------
  function sensorForm(id) {
    const s = id ? S.sensors.find(x => x.id === id) : null; if (id && !s) return;
    const v = s || { label: '', color: PALETTE[S.all.length % PALETTE.length], kind: 'room', grp: '', unit_id: '', provider: 'yolink', model: '', external_id: '' };
    sheet(s ? 'Edit sensor' : 'Add a sensor', `
      <label class="f">Name (location)<input data-f="label" value="${esc(v.label)}" placeholder="e.g. Supply air - basement head"></label>
      <label class="f">What it measures<select data-f="kind">${Object.entries(KIND).filter(([k]) => k !== 'humidity').map(([k, t]) => `<option value="${k}" ${k === v.kind ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="f">Attached to<select data-f="unit_id">${unitOptions(v.unit_id)}</select></label>
      <div class="two"><label class="f">Group<select data-f="grp">${Object.entries(GRP).map(([k, t]) => `<option value="${k}" ${k === grpOf(v) ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label class="f">Line colour<input type="color" data-f="color" value="${esc(v.color)}"></label></div>
      <div class="two"><label class="f">Brand<select data-f="provider"><option value="yolink" ${v.provider === 'yolink' ? 'selected' : ''}>YoLink</option><option value="shelly" ${v.provider === 'shelly' ? 'selected' : ''}>Shelly</option><option value="other" ${!['yolink', 'shelly'].includes(v.provider) ? 'selected' : ''}>Other</option></select></label><label class="f">Sensor model<input data-f="model" value="${esc(v.model)}" placeholder="YS8004-UC"></label></div>
      <label class="f">Device ID<input data-f="external_id" value="${esc(v.external_id)}" placeholder="Not connected yet" autocapitalize="off"></label>
      <div data-yl ${v.provider === 'yolink' ? '' : 'hidden'}><button class="mini" data-findyl>Find my YoLink sensors</button><div class="res" data-ylres></div></div>
      <label class="f" data-shch ${v.provider === 'shelly' ? '' : 'hidden'}>Shelly channel<select data-f="channel"><option value="em1:0" ${v.channel !== 'em1:1' ? 'selected' : ''}>Channel 1 (em1:0)</option><option value="em1:1" ${v.channel === 'em1:1' ? 'selected' : ''}>Channel 2 (em1:1)</option></select></label>
      ${s && s.model === 'YS8003-UC' && S.rh[s.id] ? '<div class="muted small" style="margin-top:6px">Includes its humidity reading.</div>' : ''}
      <div class="acts"><button class="btn" data-x>Cancel</button><button class="btn pri" data-save>Save</button>${s ? '<button class="btn del" data-rm>Remove sensor</button>' : ''}</div>`);
    let ylList = [];
    modal.onchange = (e) => { const k = e.target.closest('[data-f="kind"]'); if (k) { const g = modal.querySelector('[data-f="grp"]'); g.value = ['room', 'outdoor'].includes(k.value) ? 'ambient' : 'equipment'; }
      const p = e.target.closest('[data-f="provider"]'); if (p) { modal.querySelector('[data-yl]').hidden = p.value !== 'yolink'; modal.querySelector('[data-shch]').hidden = p.value !== 'shelly'; } };
    modal.onclick = async (e) => {
      if (isBackdrop(e)) return closeModal();
      if (e.target.closest('[data-findyl]')) { const box = modal.querySelector('[data-ylres]'); box.innerHTML = '<span class="muted small">Asking YoLink…</span>';
        const { data, error } = await sb.functions.invoke('hvac-poll', { body: { devices: true } });
        if (error || (data && data.error)) { box.innerHTML = `<div class="err">${esc((data && data.error) || error.message)}</div>`; return; }
        if (!data.configured || !data.configured.yolink) { box.innerHTML = '<div class="muted small">The YoLink key isn\'t set up in Supabase yet.</div>'; return; }
        ylList = (data.devices || []).filter(d => /THSensor|Temperature/i.test(d.type + ' ' + d.model) || true);
        box.innerHTML = ylList.map((d, i) => `<button data-yli="${i}">${esc(d.name)}<span>${esc(d.type)}${d.model ? ' · ' + esc(d.model) : ''}</span></button>`).join('') || '<div class="muted small">No devices on this YoLink account.</div>'; return; }
      const yi = e.target.closest('[data-yli]'); if (yi) { const d = ylList[+yi.dataset.yli]; modal.querySelector('[data-f="external_id"]').value = d.deviceId; const m = modal.querySelector('[data-f="model"]'); if (!m.value && d.model) m.value = d.model; const lb = modal.querySelector('[data-f="label"]'); if (!lb.value) lb.value = d.name; modal.querySelector('[data-ylres]').innerHTML = `<div class="linked">Linked to ${esc(d.name)}</div>`; return; }
      if (e.target.closest('[data-rm]')) { if (!confirm('Remove "' + s.label + '"? Its past readings stay stored.')) return; const ids = [s.id].concat(S.rh[s.id] ? [S.rh[s.id].id] : []); const { error } = await sb.from('monitor_sensors').update({ active: false }).in('id', ids); if (error) return errOut(error.message); closeModal(); await reloadMeta(); return dash(); }
      if (!e.target.closest('[data-save]')) return;
      const row = vals(); row.unit_id = row.unit_id || null; row.unit = UNIT_OF(row.kind); if (row.provider !== 'shelly') row.channel = 'temperature';
      if (!row.label) return errOut('Give it a name.');
      if (s) { const { error } = await sb.from('monitor_sensors').update(row).eq('id', s.id); if (error) return errOut(error.message);
        if (S.rh[s.id]) await sb.from('monitor_sensors').update({ label: row.label + ' RH', color: row.color, unit_id: row.unit_id, provider: row.provider, external_id: row.external_id }).eq('id', S.rh[s.id].id); }
      else { row.site_id = S.site.id; row.sort = S.sensors.length + 1;
        const { data, error } = await sb.from('monitor_sensors').insert(row).select().single(); if (error) return errOut(error.message);
        if (row.model.toUpperCase() === 'YS8003-UC' && row.kind === 'room') await sb.from('monitor_sensors').insert({ site_id: S.site.id, kind: 'humidity', label: row.label + ' RH', color: row.color, unit: '%', provider: row.provider, model: row.model, channel: 'humidity', sort: row.sort, grp: 'ambient', pair_id: data.id, unit_id: row.unit_id, external_id: row.external_id }); }
      closeModal(); await reloadMeta(); if (S.sample) await load(); dash();
    };
  }

  // ---------- equipment ----------
  function systemForm(id) {
    const sy = id ? sysOf(id) : null;
    const v = sy || { name: '', type: 'multi_zone', installed: '', notes: '' };
    sheet(sy ? 'Edit system' : 'Add a system', `
      <label class="f">Type<select data-f="type">${Object.entries(SYSTYPE).map(([k, t]) => `<option value="${k}" ${k === v.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="f">Name<input data-f="name" value="${esc(v.name)}" placeholder="e.g. Main house heat pump"></label>
      <label class="f">Installed<input data-f="installed" value="${esc(v.installed)}" placeholder="e.g. 2024-05-14"></label>
      <label class="f">Notes<textarea data-f="notes">${esc(v.notes)}</textarea></label>
      ${sy ? '' : '<div class="muted small" style="margin-top:8px">Creates the outdoor unit and one indoor unit. Add more indoor units after.</div>'}
      <div class="acts"><button class="btn" data-x>Cancel</button><button class="btn pri" data-save>Save</button>${sy ? '<button class="btn del" data-rm>Delete system</button>' : ''}</div>`);
    modal.onclick = async (e) => {
      if (isBackdrop(e)) return closeModal();
      if (e.target.closest('[data-rm]')) { if (!confirm('Delete "' + (sy.name || SYSTYPE[sy.type]) + '" and its units? Sensors stay, unattached.')) return; const { error } = await sb.from('monitor_systems').delete().eq('id', sy.id); if (error) return errOut(error.message); closeModal(); await reloadMeta(); return dash(); }
      if (!e.target.closest('[data-save]')) return;
      const row = vals(); if (!row.name) row.name = SYSTYPE[row.type];
      if (sy) { const { error } = await sb.from('monitor_systems').update(row).eq('id', sy.id); if (error) return errOut(error.message); }
      else { row.site_id = S.site.id; row.sort = S.systems.length + 1;
        const { data, error } = await sb.from('monitor_systems').insert(row).select().single(); if (error) return errOut(error.message);
        const r2 = await sb.from('monitor_units').insert([{ system_id: data.id, role: 'outdoor', style: 'outdoor', location: 'Outside', sort: 0 }, { system_id: data.id, role: 'indoor', style: INDOOR_DEFAULT[row.type] || 'other', sort: 1 }]); if (r2.error) return errOut(r2.error.message); }
      closeModal(); await reloadMeta(); drawEquipment(); drawLegend();
    };
  }
  async function unitForm(id, sysId) {
    const u = id ? unitById(id) : null; const sy = sysOf(u ? u.system_id : sysId); if (!sy) return;
    const v = u || { role: 'indoor', style: INDOOR_DEFAULT[sy.type] || 'other', location: '', make: '', model: '', serial: '', capacity: '', installed: sy.installed || '', notes: '', photos: [] };
    if (S.cust == null) { try { S.cust = await custEquipment(S.site.customer_id); } catch (x) { S.cust = []; } }
    const onFile = S.cust || [];
    sheet(u ? (u.role === 'outdoor' ? 'Outdoor unit' : 'Indoor unit') : 'Add a unit', `
      <div class="muted small">${esc(sy.name || SYSTYPE[sy.type])}</div>
      ${onFile.length ? `<label class="f">Fill from equipment on file<select data-fill><option value="">Pick from ${esc(nameOf(S.site))}'s record…</option>${onFile.map((q, i) => `<option value="${i}">${esc([q.make, q.model, q.desc || q.type].filter(Boolean).join(' · '))}${q.serial ? ' · S/N ' + esc(q.serial) : ''}</option>`).join('')}</select></label>` : ''}
      <div class="two"><label class="f">Role<select data-f="role"><option value="indoor" ${v.role === 'indoor' ? 'selected' : ''}>Indoor</option><option value="outdoor" ${v.role === 'outdoor' ? 'selected' : ''}>Outdoor</option></select></label>
      <label class="f">Style<select data-f="style">${Object.entries(STYLE).map(([k, t]) => `<option value="${k}" ${k === v.style ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      <label class="f">Location / zone<input data-f="location" value="${esc(v.location)}" placeholder="e.g. Main floor living room"></label>
      <div class="two"><label class="f">Make<input data-f="make" value="${esc(v.make)}"></label><label class="f">Capacity<input data-f="capacity" value="${esc(v.capacity)}" placeholder="12000 BTU"></label></div>
      <label class="f">Model number<input data-f="model" value="${esc(v.model)}" autocapitalize="characters"></label>
      <label class="f">Serial number<input data-f="serial" value="${esc(v.serial)}" autocapitalize="characters"></label>
      <label class="f">Installed<input data-f="installed" value="${esc(v.installed)}" placeholder="e.g. 2024-05-14"></label>
      <label class="f">Notes<textarea data-f="notes">${esc(v.notes)}</textarea></label>
      ${u && u.role === 'indoor' ? `<div class="tgh">Capacity monitoring</div>
        <label class="tog"><input type="checkbox" data-cap ${u.cap_enabled ? 'checked' : ''}>Airflow &amp; capacity</label>
        <div data-capbody ${u.cap_enabled ? '' : 'hidden'}>
          <label class="f">Fan power sensor<select data-fan><option value="">Pick the head's fan channel…</option>${S.all.filter(x => x.kind === 'fan_power').map(x => `<option value="${x.id}" ${x.id === u.fan_sensor ? 'selected' : ''}>${esc(x.label)}${x.external_id ? '' : ' (not connected)'}</option>`).join('')}</select></label>
          ${S.all.some(x => x.kind === 'fan_power') ? '' : '<div class="muted small">Add a sensor measuring Fan power (W) first.</div>'}
          <label class="f">Fan speeds<select data-nsp>${[1, 2, 3, 4, 5, 6, 7].map(n => `<option ${n === ((u.fan_speeds || []).length || 4) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <div data-speeds></div><div data-capbox></div>
        </div>` : ''}
      ${u ? `<div class="tgh">Nameplate photos</div><div class="ph" data-ph></div><label class="mini" style="display:inline-block">📷 Add photo<input type="file" accept="image/*" data-photo hidden></label>` : '<div class="muted small" style="margin-top:8px">Save first, then add nameplate photos.</div>'}
      <div class="acts"><button class="btn" data-x>Cancel</button><button class="btn pri" data-save>Save</button>${u ? '<button class="btn del" data-rm>Delete unit</button>' : ''}</div>`);
    const photos = u ? [...(u.photos || [])] : [];
    const names = (n) => SPEED_NAMES[n] || Array.from({ length: n }, (_, i) => 'Speed ' + (i + 1));
    let speeds = u && u.fan_speeds && u.fan_speeds.length ? JSON.parse(JSON.stringify(u.fan_speeds)) : names(4).map(n => ({ name: n, rated_cfm: '', watts: null }));
    const drawSpeeds = () => { const el = modal.querySelector('[data-speeds]'); if (!el) return;
      el.innerHTML = `<div class="spdh"><span>Speed</span><span>Rated CFM</span><span>Watts</span><span></span></div>` + speeds.map((p, i) => `<div class="spd"><input data-sn="${i}" value="${esc(p.name)}"><input data-sc="${i}" type="number" inputmode="numeric" value="${esc(p.rated_cfm)}" placeholder="CFM"><span>${p.watts ? (+p.watts).toFixed(1) : '–'}</span><button class="mini" data-capt="${i}">${p.watts ? 'Redo' : 'Capture'}</button></div>`).join(''); };
    drawSpeeds();
    modal.oninput = (e) => { const a = e.target.closest('[data-sn]'); if (a) speeds[+a.dataset.sn].name = a.value; const b = e.target.closest('[data-sc]'); if (b) speeds[+b.dataset.sc].rated_cfm = b.value === '' ? '' : +b.value; };
    async function capture(i) {
      const fan = modal.querySelector('[data-fan]').value; const box = modal.querySelector('[data-capbox]');
      if (!fan) return errOut('Pick the fan power sensor first.'); errOut('');
      const sp = speeds[i]; const samples = []; const t0 = Date.now(); const DUR = 120000;
      const paint = (w, msg) => { const n = samples.length, avg = n ? samples.reduce((x, y) => x + y, 0) / n : null; const left = Math.max(0, Math.ceil((DUR - (Date.now() - t0)) / 1000));
        box.innerHTML = `<div class="capbox"><div class="muted small">${esc(sp.name)} fan · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} left</div><b class="w">${w == null ? '–' : w.toFixed(1) + ' W'}</b><div class="small">${n ? 'Average ' + avg.toFixed(1) + ' W · ' + n + ' readings' : 'Starting…'}${msg ? ' · ' + esc(msg) : ''}</div><div class="acts"><button class="btn" data-capstop>Cancel</button></div></div>`; };
      paint(null);
      const tick = async () => {
        if (Date.now() - t0 >= DUR) { clearInterval(capTimer); capTimer = null;
          if (samples.length < 6) { box.innerHTML = '<div class="err">Not enough readings - check the Shelly is online and try again.</div>'; return; }
          const use = samples.slice(2); const avg = use.reduce((x, y) => x + y, 0) / use.length; const sd = Math.sqrt(use.reduce((x, y) => x + (y - avg) ** 2, 0) / use.length);
          Object.assign(sp, { watts: Math.round(avg * 10) / 10, sd: Math.round(sd * 10) / 10, samples: use.length, captured_at: new Date().toISOString() });
          box.innerHTML = `<div class="linked">${esc(sp.name)}: ${sp.watts} W (±${sp.sd}) from ${use.length} readings. Save to keep it.</div>`; drawSpeeds(); return; }
        const { data, error } = await sb.functions.invoke('hvac-poll', { body: { live: fan } });
        if (!capTimer) return;
        if (error || !data || data.error) { paint(null, (data && data.error) || (error && error.message) || 'no reading'); return; }
        if (typeof data.watts === 'number') samples.push(data.watts); paint(data.watts);
      };
      clearInterval(capTimer); capTimer = setInterval(tick, 5000); tick();
    }
    const drawPh = async () => { const el = modal.querySelector('[data-ph]'); if (!el) return; el.innerHTML = photos.length ? '<span class="muted small">Loading…</span>' : '<span class="muted small">None yet.</span>'; if (!photos.length) return;
      const urls = await Promise.all(photos.map(k => sb.storage.from('images').createSignedUrl(k, 3600).then(r => (r.data && r.data.signedUrl) || '')));
      el.innerHTML = photos.map((k, i) => `<div class="p"><img src="${esc(urls[i])}" data-open="${esc(urls[i])}" alt="Nameplate photo ${i + 1}"><button data-delph="${i}" aria-label="Remove photo">×</button></div>`).join(''); };
    drawPh();
    modal.onchange = async (e) => {
      const cb = e.target.closest('[data-cap]'); if (cb) { modal.querySelector('[data-capbody]').hidden = !cb.checked; return; }
      const ns = e.target.closest('[data-nsp]'); if (ns) { const n = +ns.value, nm = names(n); speeds = Array.from({ length: n }, (_, i) => speeds[i] || { name: nm[i], rated_cfm: '', watts: null }); if (n === speeds.length) speeds.forEach((p, i) => { if (!p.watts && !p.rated_cfm) p.name = nm[i]; }); drawSpeeds(); return; }
      const f = e.target.closest('[data-fill]'); if (f && f.value !== '') { const q = onFile[+f.value]; const set = (k, x) => { const i = modal.querySelector(`[data-f="${k}"]`); if (i && x) i.value = x; }; set('make', q.make); set('model', q.model); set('serial', q.serial); set('capacity', q.size); set('installed', q.installed); return; }
      const p = e.target.closest('[data-photo]'); if (p && p.files && p.files[0]) {
        errOut(''); const file = p.files[0]; p.value = '';
        try { const img = await shrink(file); const key = `${u.id}__${Date.now().toString(36)}-nameplate.jpg`;
          const { error } = await sb.storage.from('images').upload(key, img, { contentType: 'image/jpeg', upsert: false }); if (error) throw error;
          photos.push(key); const r = await sb.from('monitor_units').update({ photos }).eq('id', u.id); if (r.error) throw r.error; u.photos = [...photos]; drawPh();
        } catch (x) { errOut("Couldn't add the photo: " + (x.message || x)); }
      }
    };
    modal.onclick = async (e) => {
      if (isBackdrop(e)) return closeModal();
      const o = e.target.closest('[data-open]'); if (o) { window.open(o.dataset.open, '_blank'); return; }
      const ct = e.target.closest('[data-capt]'); if (ct) return capture(+ct.dataset.capt);
      if (e.target.closest('[data-capstop]')) { clearInterval(capTimer); capTimer = null; modal.querySelector('[data-capbox]').innerHTML = ''; return; }
      const d = e.target.closest('[data-delph]'); if (d) { if (!confirm('Remove this photo?')) return; photos.splice(+d.dataset.delph, 1); const r = await sb.from('monitor_units').update({ photos }).eq('id', u.id); if (r.error) return errOut(r.error.message); u.photos = [...photos]; return drawPh(); }
      if (e.target.closest('[data-rm]')) { if (!confirm('Delete this unit? Sensors on it stay, unattached.')) return; const { error } = await sb.from('monitor_units').delete().eq('id', u.id); if (error) return errOut(error.message); closeModal(); await reloadMeta(); drawEquipment(); return drawLegend(); }
      if (!e.target.closest('[data-save]')) return;
      const row = vals();
      const capEl = modal.querySelector('[data-cap]');
      if (u && capEl) { row.cap_enabled = capEl.checked; row.fan_sensor = modal.querySelector('[data-fan]').value || null; row.fan_speeds = speeds.map(p => ({ ...p, name: (p.name || '').trim() || 'Speed', rated_cfm: p.rated_cfm === '' ? null : +p.rated_cfm }));
        if (row.cap_enabled && row.fan_sensor) { const f = S.all.find(x => x.id === row.fan_sensor); if (f && f.unit_id !== u.id) await sb.from('monitor_sensors').update({ unit_id: u.id }).eq('id', f.id); } }
      if (u) { const { error } = await sb.from('monitor_units').update(row).eq('id', u.id); if (error) return errOut(error.message); }
      else { row.system_id = sy.id; row.sort = S.units.filter(x => x.system_id === sy.id).length + 1; const { error } = await sb.from('monitor_units').insert(row); if (error) return errOut(error.message); }
      closeModal(); await reloadMeta(); S.derived = derive(S.series); drawEquipment(); drawLegend(); drawTiles(); drawEvents();
    };
  }

  // ---------- export + report ----------
  function exportForm() {
    sheet('Export', `
      <div class="two"><label class="f">From<input type="date" data-from value="${dIn(S.from)}"></label><label class="f">To<input type="date" data-to value="${dIn(S.to)}"></label></div>
      <label class="f">Interval<select data-step><option value="60">Every minute</option><option value="300">5 minutes</option><option value="900">15 minutes</option><option value="3600" ${S.range === '1y' ? 'selected' : ''}>Hourly</option><option value="86400">Daily</option></select></label>
      <div class="acts"><button class="btn pri" data-csv>⬇ Spreadsheet</button><button class="btn" data-rep>🖨 Report</button><button class="btn" data-x>Close</button></div>
      <div class="muted small" data-msg></div>`);
    const win = () => { const f = new Date(modal.querySelector('[data-from]').value + 'T00:00'), t = new Date(modal.querySelector('[data-to]').value + 'T00:00'); t.setDate(t.getDate() + 1); return [f.getTime(), Math.min(t.getTime(), Date.now() + 6e4), +modal.querySelector('[data-step]').value]; };
    const msg = (t) => { modal.querySelector('[data-msg]').textContent = t; };
    modal.onclick = async (e) => {
      if (isBackdrop(e)) return closeModal();
      const csv = e.target.closest('[data-csv]'), rep = e.target.closest('[data-rep]'); if (!csv && !rep) return;
      const [from, to, step] = win(); if (!(to > from)) return msg('Pick a To date after the From date.');
      if (csv && (to - from) / 1000 / step > 120000) return msg('That is too many rows - pick a longer interval.');
      const w = rep ? window.open('', '_blank') : null; if (rep && w) w.document.write('<p style="font-family:sans-serif">Building report…</p>');
      msg('Getting readings…');
      try {
        const st = rep ? Math.max(step, Math.ceil((to - from) / 1000 / 1500 / 60) * 60) : step;   // a report graph needs ~1500 points at most
        const { data, error } = await seriesAll(from, to, st); if (error) throw error;
        if (!data.length) { if (w) w.close(); return msg('No readings in that range yet.'); }
        const ser = {}; data.forEach(r => (ser[r.sensor_id] = ser[r.sensor_id] || []).push([Date.parse(r.t), Number(r.v)]));
        if (csv) { download(buildCsv(ser, from, to, step), from, to); msg('Downloaded.'); }
        else { report(w, ser, from, to, st); msg('Report opened - use Print / Save as PDF.'); }
      } catch (x) { if (w) w.close(); msg('Export failed: ' + (x.message || x)); }
    };
  }
  function columns(ser, step) {
    const cols = []; const dec = (v, n) => v == null ? '' : (Math.round(v * 10 ** n) / 10 ** n).toFixed(n);
    for (const s of S.sensors) {
      const a = ser[s.id] || [], map = new Map(a);
      if (isTemp(s)) cols.push({ h: s.label + ' (' + tU() + ')', f: t => dec(holdAt(a, t) == null ? null : cv(holdAt(a, t)), 1) });
      else cols.push({ h: s.label + ' (' + s.unit + ')', f: t => { const v = map.get(t); return v == null ? '' : dec(v, 1); } });
      if (S.rh[s.id]) { const h = ser[S.rh[s.id].id] || []; cols.push({ h: s.label + ' RH (%)', f: t => dec(holdAt(h, t), 0) }); }
    }
    const done = new Set();
    for (const sup of S.sensors.filter(x => x.kind === 'supply')) { const ret = S.sensors.find(r => r.kind === 'return' && (r.unit_id || null) === (sup.unit_id || null)); const k = sup.unit_id || 'h'; if (!ret || done.has(k)) continue; done.add(k); const u = unitById(sup.unit_id);
      cols.push({ h: 'ΔT ' + (u ? unitName(u) + ' ' : '') + '(' + tU() + ')', f: t => { const a = holdAt(ser[sup.id], t), b = holdAt(ser[ret.id], t); return a == null || b == null ? '' : dec((a - b) * (S.unit === 'F' ? 1.8 : 1), 1); } }); }
    const der = derive(ser);
    for (const u of capUnits()) { const m1 = new Map(der[u.id].cfm), m2 = new Map(der[u.id].btu); const nm = unitName(u);
      cols.push({ h: 'Airflow ' + nm + ' (CFM)', f: t => dec(m1.get(t), 0) }); cols.push({ h: 'Sensible ' + nm + ' (BTU/h, + heating / - cooling)', f: t => dec(m2.get(t), 0) }); }
    cols.push({ h: 'Events', f: t => S.events.filter(ev => { const x = Date.parse(ev.ts); return x >= t && x < t + step * 1000; }).map(ev => ev.title || (EVK[ev.kind] || EVK.note)[1]).join('; ') });
    return cols;
  }
  function buildCsv(ser, from, to, step) {
    const cols = columns(ser, step); const lines = [['Time'].concat(cols.map(c => c.h)).map(csvCell).join(',')];
    for (let t = Math.floor(from / 1000 / step) * step * 1000; t < to; t += step * 1000) {
      const d = new Date(t); const ts = dIn(t) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      const vals2 = cols.map(c => c.f(t)); if (vals2.slice(0, -1).every(v => v === '')) continue;
      lines.push([ts].concat(vals2).map(csvCell).join(','));
    }
    return lines.join('\r\n');
  }
  function download(text, from, to) {
    const name = `${nameOf(S.site)} HVAC data ${dIn(from)} to ${dIn(to - 1)}.csv`.replace(/[\\/:*?"<>|]+/g, '-');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function report(w, ser, from, to, step) {
    if (!w) { msgFallback(); return; }
    // graph: draw with the report's data into a detached box, then restore the dashboard state
    const keep = { series: S.series, from: S.from, to: S.to, range: S.range }; const span = to - from;
    S.series = ser; S.from = from; S.to = to; S.range = span <= 2 * 864e5 ? '24h' : span > 120 * 864e5 ? '1y' : '30d';
    const box = document.createElement('div'); drawChart(box, 900); const svg = box.innerHTML.replace(/<div class="tip"[\s\S]*$/, '');
    Object.assign(S, keep);
    const f1 = (v, n = 1) => v == null || isNaN(v) ? '–' : (Math.round(v * 10 ** n) / 10 ** n).toLocaleString('en-CA', { minimumFractionDigits: n, maximumFractionDigits: n });
    const rows = S.sensors.map(s => { const a = (ser[s.id] || []).map(p => p[1]); if (!a.length) return `<tr><td><i style="background:${esc(s.color)}"></i>${esc(s.label)}</td><td colspan="4">No readings</td></tr>`;
      const mn = Math.min(...a), mx = Math.max(...a), av = a.reduce((x, y) => x + y, 0) / a.length;
      if (isTemp(s)) return `<tr><td><i style="background:${esc(s.color)}"></i>${esc(s.label)}</td><td>${f1(cv(mn))}${tU()}</td><td>${f1(cv(av))}${tU()}</td><td>${f1(cv(mx))}${tU()}</td><td>${S.rh[s.id] && ser[S.rh[s.id].id] ? 'RH avg ' + f1(ser[S.rh[s.id].id].reduce((x, p) => x + p[1], 0) / ser[S.rh[s.id].id].length, 0) + '%' : ''}</td></tr>`;
      const on = a.filter(v => v > (s.kind === 'fan_power' ? 3 : 100)).length; const kwh = a.reduce((x, v) => x + v, 0) * step / 3600 / 1000;
      return `<tr><td><i style="background:${esc(s.color)}"></i>${esc(s.label)}</td><td>${f1(mn, 0)} W</td><td>${f1(av, 0)} W</td><td>${f1(mx, 0)} W</td><td>≈ ${f1(kwh, 1)} kWh · running ${f1(100 * on / a.length, 0)}% of the time</td></tr>`; }).join('');
    const der = derive(ser);
    const cap = capUnits().map(u => { const c = der[u.id].cfm.filter(p => p[1] > 0), b = der[u.id].btu.filter(p => Math.abs(p[1]) > 500); const h = b.filter(p => p[1] > 0), k = b.filter(p => p[1] < 0); const avg = (x) => x.length ? x.reduce((m, p) => m + p[1], 0) / x.length : null;
      return `<tr><td>${esc(unitName(u))}</td><td>${f1(avg(c), 0)} CFM</td><td>${h.length ? f1(avg(h), 0) + ' BTU/h' : '–'}</td><td>${h.length ? f1(Math.max(...h.map(p => p[1])), 0) + ' BTU/h' : '–'}</td><td>${k.length ? f1(Math.abs(avg(k)), 0) + ' BTU/h cooling avg' : ''}</td></tr>`; }).join('');
    const evs = S.events.filter(ev => { const t = Date.parse(ev.ts); return t >= from && t < to; }).sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
    const eq = S.systems.map(sy => `<div><b>${esc(sy.name || SYSTYPE[sy.type])}</b> (${esc(SYSTYPE[sy.type] || sy.type)}): ${S.units.filter(u => u.system_id === sy.id).map(u => esc((u.role === 'outdoor' ? 'Outdoor' : u.location || 'Indoor') + (u.model ? ' ' + u.model : '') + (u.serial ? ' S/N ' + u.serial : ''))).join(' · ')}</div>`).join('');
    const d = (t) => new Date(t).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
    w.document.open(); w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(nameOf(S.site))} - HVAC report</title><style>
      :root{--muted:#666;--line:#ddd;--brand:#3e63dd}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:24px;max-width:980px}h1{margin:0;font-size:24px}h2{font-size:16px;margin:22px 0 6px;border-bottom:2px solid #111;padding-bottom:3px}
      .sub{color:#555;font-size:13px}.ax{font-size:11px;fill:#666}.grid line{stroke:#e3e3e3}svg{width:100%;height:auto}table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;padding:6px 6px;border-bottom:1px solid #ddd;vertical-align:top}th{font-size:11px;text-transform:uppercase;color:#555}
      td i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}.top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.btn{font:inherit;padding:8px 14px;border-radius:8px;border:1px solid #111;background:#111;color:#fff;cursor:pointer}@media print{.btn{display:none}body{margin:10mm}}
      </style></head><body><div class="top"><div><h1>HVAC performance report</h1><div class="sub">Homestar HVAC Solutions · ${esc(d(from))} to ${esc(d(to - 1))}</div></div><button class="btn" onclick="print()">Print / Save PDF</button></div>
      <h2>${esc(nameOf(S.site))}</h2><div class="sub">${esc(S.site.address || '')}</div><div style="font-size:13px;margin-top:6px">${eq}</div>
      <h2>Readings</h2>${svg}
      <table><tr><th>Sensor</th><th>Min</th><th>Average</th><th>Max</th><th></th></tr>${rows}</table>
      ${cap ? `<h2>Airflow &amp; capacity (sensible)</h2><table><tr><th>Indoor unit</th><th>Avg airflow running</th><th>Avg heating</th><th>Peak heating</th><th></th></tr>${cap}</table><div class="sub" style="margin-top:6px">Airflow from fan watts mapped to rated CFM per fan speed (fan law). Sensible capacity = 1.08 × CFM × ΔT.</div>` : ''}
      ${evs.length ? `<h2>Events</h2><table>${evs.map(ev => `<tr><td style="width:170px">${esc(fmtDT(ev.ts))}</td><td><b>${esc(ev.title || (EVK[ev.kind] || EVK.note)[1])}</b>${ev.note ? '<br>' + esc(ev.note) : ''}</td></tr>`).join('')}</table>` : ''}
      <div class="sub" style="margin-top:18px">Generated ${esc(fmtDT(Date.now()))} · readings averaged every ${step >= 3600 ? step / 3600 + ' h' : step / 60 + ' min'} for this report.</div></body></html>`); w.document.close();
  }
  function msgFallback() { const m = modal.querySelector('[data-msg]'); if (m) m.textContent = 'Your browser blocked the report window - allow pop-ups for HQ and try again.'; }
  async function shrink(file) {
    if (!/^image\//.test(file.type)) throw new Error('Not an image');
    const bmp = await createImageBitmap(file); const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
  }

  // ---------- events ----------
  function eventForm(id) {
    const ev = id ? S.events.find(x => x.id === id) : null;
    const v = ev || { ts: new Date().toISOString(), kind: 'service', title: '', note: '', unit_id: '' };
    sheet(ev ? 'Edit event' : 'Log an event', `
      <div class="two"><label class="f">Type<select data-f="kind">${Object.entries(EVK).map(([k, t]) => `<option value="${k}" ${k === v.kind ? 'selected' : ''}>${t[0]} ${t[1]}</option>`).join('')}</select></label>
      <label class="f">When<input type="datetime-local" data-f="ts" value="${localInput(v.ts)}"></label></div>
      <label class="f">Title<input data-f="title" value="${esc(v.title)}" placeholder="e.g. Fan speed set to high"></label>
      <label class="f">Equipment<select data-f="unit_id">${unitOptions(v.unit_id).replace('Not attached (room / outdoor air)', 'Whole house / not specific')}</select></label>
      <label class="f">Details<textarea data-f="note">${esc(v.note)}</textarea></label>
      <div class="acts"><button class="btn" data-x>Cancel</button><button class="btn pri" data-save>Save</button>${ev ? '<button class="btn del" data-rm>Delete</button>' : ''}</div>`);
    modal.onclick = async (e) => {
      if (isBackdrop(e)) return closeModal();
      if (e.target.closest('[data-rm]')) { if (!confirm('Delete this event?')) return; const { error } = await sb.from('monitor_events').delete().eq('id', ev.id); if (error) return errOut(error.message); closeModal(); await reloadMeta(); drawEvents(); return drawChart(); }
      if (!e.target.closest('[data-save]')) return;
      const row = vals(); row.unit_id = row.unit_id || null; const t = new Date(row.ts); if (isNaN(t)) return errOut('Pick a date and time.'); row.ts = t.toISOString();
      if (!row.title) row.title = EVK[row.kind][1];
      const q = ev ? sb.from('monitor_events').update(row).eq('id', ev.id) : sb.from('monitor_events').insert(Object.assign(row, { site_id: S.site.id }));
      const { error } = await q; if (error) return errOut(error.message);
      closeModal(); await reloadMeta(); await load(); drawEvents(); drawChart(); drawTiles();
    };
  }

  body.onclick = async (e) => {
    const h = e.target.closest('[data-site]'); if (h) return openSite(h.dataset.site);
    if (e.target.closest('[data-addsite]')) return siteForm(null);
    if (e.target.closest('[data-editsite]')) return siteForm(S.site);
    if (e.target.closest('[data-list]')) return list();
    const r = e.target.closest('[data-range]'); if (r) { S.range = r.dataset.range; lsSet('hm_range', S.range); body.querySelectorAll('[data-range]').forEach(b => b.classList.toggle('on', b === r)); await load(); drawChart(); drawTiles(); drawEvents(); return; }
    const u = e.target.closest('[data-unit]'); if (u) { S.unit = u.dataset.unit; lsSet('hm_unit', S.unit); body.querySelectorAll('[data-unit]').forEach(b => b.classList.toggle('on', b === u)); drawChart(); drawTiles(); return; }
    const col = e.target.closest('[data-col]'); if (col) { const k = col.dataset.col; if (S.shut.has(k)) S.shut.delete(k); else S.shut.add(k); lsSet('hm_shut', JSON.stringify([...S.shut])); col.classList.toggle('shut', S.shut.has(k)); const card = col.closest('[data-card]'); if (card) card.classList.toggle('shut', S.shut.has(k)); return; }
    if (recentDrag(e)) return;
    const lr = e.target.closest('.lg'); if (lr && !e.target.closest('input,button')) return sensorInfo(lr.dataset.row);
    const tl = e.target.closest('[data-tile]'); if (tl && !tl.dataset.tile.includes(':')) return sensorInfo(tl.dataset.tile);
    const eu = e.target.closest('[data-eunit]'); if (eu) return unitForm(eu.dataset.eunit);
    const ed = e.target.closest('[data-editsensor]'); if (ed) return sensorForm(ed.dataset.editsensor);
    if (e.target.closest('[data-addsensor]')) return sensorForm(null);
    if (e.target.closest('[data-export]')) return exportForm();
    if (e.target.closest('[data-addsys]')) return systemForm(null);
    const es = e.target.closest('[data-editsys]'); if (es) return systemForm(es.dataset.editsys);
    const au = e.target.closest('[data-addunit]'); if (au) return unitForm(null, au.dataset.addunit);
    if (e.target.closest('[data-addev]')) return eventForm(null);
    const ev = e.target.closest('[data-ev]'); if (ev) return eventForm(ev.dataset.ev);
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
