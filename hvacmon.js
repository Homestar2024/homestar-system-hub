// Homestar HQ - HVAC Monitoring (v36 2026-11-27: Quick read redesigned - status banner, number tiles, 7-day kWh/outdoor chart, one coloured card per section, off cycles shown apart from defrosts, separate Actions card (Calvin: no walls of text); v35 2026-11-27: ⚡ Quick read button on a house -> side panel with a written overview (Edge Function hvac-read); v34 2026-11-22: Bin hours card - hours in each 1 °C outdoor band from 18 °C down to the coldest reading, with kWh, average kW, COP and aux-heat hours per band; v33 2026-11-22: filter health tile per indoor unit - blower watts per speed vs a clean-filter baseline (captured speeds, or the 3 days after the last Filter change event), steady fan-only runs with heat off, direction by motor type; v32 2026-11-22: blower motor type per indoor unit (PSC / ECM constant torque / ECM constant airflow); heat kit on the same feed as the blower - one clamp on the main feed, map each fan speed with heat off and with heat on, the app splits blower vs heat kit watts; v30 2026-11-22: vertical pinch removed; the °F/W scale stays fixed while zoomed or sliding (taken from the full-range view, never changes until Reset); v28 2026-11-22: finer °F grid (~5° per line, 1-2° zoomed), vertical scale fits the time on screen, 2-finger pinch up/down zooms the °F scale (watts follow), Reset clears both; v27 2026-11-22: equipment icons drawn like the real kit - outdoor heat pump, wall head, air handler, ducted, cassette, console, hydronic; v26 2026-11-22: watts scale lines up with the °F grid lines; v25 2026-11-22: short tag before each live number on the graph - S/A, R/A, ODT, PWR, rooms from their name; v24 2026-11-22: scrub shows no value where there is no reading; v23 2026-11-22: °F and W axes side by side on the left, live value of every line on the right in its colour; 1 finger = white scrub line with readings (no pop-up box), 2 fingers = pinch zoom + slide timeline; v22 2026-11-22: gesture freeze fix - pointers captured on the chart box (svg is rebuilt each frame), stale fingers cleared, background reloads paused mid-gesture and late loads dropped, empty zoomed window no longer flips to sample data; v21 2026-11-22: one-finger slide along the timeline, pinch zoom follows the fingers, double-tap removed (desktop double-click kept), zoomed loads pad half a window each side; v20 2026-11-22: zoom anchor fix; v19 2026-11-22: round clock-time x labels up to 2 days; v18 2026-11-22: zoom the graph - pinch or double-tap (ctrl/trackpad-pinch + double-click on desktop), arrows to slide, Reset; zoomed data loads at up to 1-minute detail; v17 2026-11-22: always live while a dashboard is on screen, Live button removed; v16 2026-11-22: Live on by default, no time limit; v15 2026-11-22: Live button - Shelly watts every 5 s, YoLink latest report every 15 s, auto-off after 30 min; v14 2026-11-22: live tiles - latest reading every 15 s, refresh when the app comes back to the screen, 'Latest reading' time; v13 2026-11-22: shows the server's real error text from hvac-poll; v11 2026-11-22: Performance card - heat delivered and COP vs outdoor temp against the outdoor unit's rated capacity, house heat loss line from daily energy balance, balance point, load at design temp vs F280; v10 2026-11-22: auxiliary heat per indoor unit (kW rating + its power channel), power monitoring map per unit (outdoor / fan / aux), aux tiles + heat pump share; v8 2026-11-22: server collector status, Export (CSV) + printable report, capacity monitoring - fan watts mapped to rated CFM per fan speed by the fan law, sensible BTU/h; v7 2026-11-21: minimal sensor list - tap a sensor for its details, collapsible sections, press-and-hold to move tiles anywhere (shared layout in monitor_sites.tile_layout); v5 2026-11-21: clients picked from Maintenance customers, equipment by system with outdoor/indoor units, model/serial/nameplate photos, sensors mapped to a unit, add/remove sensors, event markers on the graph; v4 2026-11-21: Equipment vs Ambient groups, room RH under the temperature; v3 2026-11-21: press-and-hold to reorder sensors; v2 2026-11-21: axis labels clear of ticks; v1 same day, Calvin). Tools > HVAC Monitoring: list of houses -> one house's dashboard:
// graph of every sensor over time (temps on the left axis, watts on the right), 24 h / 7 d / 30 d / 1 y, legend with colour,
// show/hide checkbox and editable names. Data: monitor_sites / monitor_sensors / monitor_series() (db/025). Until a house has
// readings the dashboard shows clearly-labelled SAMPLE data so the layout can be judged.
const CSS = `
.qrs{position:fixed;inset:0;background:rgba(10,14,25,.45);z-index:80}
.qrp{position:fixed;top:0;right:0;bottom:0;width:min(480px,100vw);background:var(--surface);border-left:1px solid var(--line);z-index:81;overflow-y:auto;padding:18px 18px 40px;box-shadow:-10px 0 30px rgba(0,0,0,.25);color:var(--ink)}
.qrp h3{margin:0 34px 2px 0}.qrp .x{position:absolute;top:12px;right:14px;font:inherit;font-size:20px;background:none;border:0;color:var(--muted);cursor:pointer}
.qrst{display:block;border-radius:10px;padding:10px 12px;margin:10px 0 4px;font-weight:700;font-size:15px;line-height:1.35}
.qrst.good{background:color-mix(in srgb,#1E9E5A 15%,transparent);border:1px solid color-mix(in srgb,#1E9E5A 45%,transparent)}
.qrst.watch{background:color-mix(in srgb,#F08010 15%,transparent);border:1px solid color-mix(in srgb,#F08010 45%,transparent)}
.qrst.problem{background:color-mix(in srgb,#d92d20 14%,transparent);border:1px solid color-mix(in srgb,#d92d20 45%,transparent)}
.qrp h4{margin:14px 0 4px;font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.qrp ul{margin:0;padding-left:18px;font-size:14.5px;line-height:1.45}.qrp li{margin:3px 0}
.qrt{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;margin:12px 0}
.qrt div{border:1px solid var(--line);border-radius:10px;padding:8px 9px;background:color-mix(in srgb,var(--ink) 3%,transparent)}
.qrt b{display:block;font-size:18px;line-height:1.15;font-variant-numeric:tabular-nums}.qrt span{display:block;font-size:11px;color:var(--muted);margin-top:2px;line-height:1.25}
.qrch{border:1px solid var(--line);border-radius:12px;padding:10px 10px 4px;margin:10px 0}.qrch svg{display:block;width:100%;height:auto}.qrch .lg{font-size:11px;color:var(--muted);display:flex;gap:12px;margin-bottom:4px}
.qrch .lg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.qrc{border:1px solid var(--line);border-left:4px solid #1E9E5A;border-radius:10px;padding:10px 12px;margin:10px 0}
.qrc.watch{border-left-color:#F08010}.qrc.problem{border-left-color:#d92d20}
.qrc .hd{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.qrc .hd .ic{font-size:15px}.qrc .hd .tg{margin-left:auto;font-size:10.5px;letter-spacing:.04em;padding:2px 7px;border-radius:99px;background:color-mix(in srgb,#1E9E5A 16%,transparent);color:#1E9E5A}
.qrc.watch .hd .tg{background:color-mix(in srgb,#F08010 16%,transparent);color:#c76500}.qrc.problem .hd .tg{background:color-mix(in srgb,#d92d20 14%,transparent);color:#d92d20}
.qrc .sm{font-weight:700;font-size:14.5px;margin:6px 0 2px;line-height:1.35}.qrc ul{margin:4px 0 0;padding-left:18px;font-size:13.5px;line-height:1.4;color:var(--ink)}
.qrev{display:flex;gap:8px;margin:8px 0}.qrev div{flex:1;border-radius:10px;padding:8px 10px;font-size:12px;color:var(--muted);border:1px solid var(--line)}.qrev b{display:block;font-size:20px;color:var(--ink)}
.qra{border-radius:10px;padding:10px 12px;margin:12px 0;background:color-mix(in srgb,#1048D0 9%,transparent);border:1px solid color-mix(in srgb,#1048D0 35%,transparent)}
.qra .hd{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#1048D0;margin-bottom:4px}.qra ol{margin:0;padding-left:20px;font-size:14px;line-height:1.45}
.qrp .foot{margin-top:16px;font-size:12px;color:var(--muted)}
@media(max-width:600px){.qrp{top:auto;left:0;width:100vw;height:88vh;border-left:0;border-top:1px solid var(--line);border-radius:16px 16px 0 0}}
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
.chartbox{position:relative;margin-top:12px;touch-action:pan-y;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.zbar{display:flex;align-items:center;gap:6px;margin-top:8px;min-height:30px}.zbar .zt{flex:1;text-align:center;font-size:13px;font-weight:700}.zbar .chip{min-height:32px;padding:5px 11px}
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
.unit .ui{flex:none;display:flex;color:var(--brand)}.unit.out .ui{color:var(--ink)}.unit .ut{min-width:0;flex:1}.unit b{display:block;font-weight:600;overflow-wrap:anywhere}.unit .ut span{font-size:12.5px;color:var(--muted);display:block;overflow-wrap:anywhere}
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
.spd{display:grid;grid-template-columns:minmax(0,1fr) 78px 60px auto;gap:6px;align-items:center;margin-top:6px}.spd input{padding:8px;font-size:15px}.spd span{font-size:13px;text-align:right;color:var(--muted)}.spd .mini{margin:0;padding:6px 9px;min-height:38px}.spd.heat{margin-top:2px}.spd.heat .hl{text-align:left;font-size:12.5px;color:var(--muted)}
.bn{display:grid;grid-template-columns:62px minmax(0,1fr) 52px 44px;gap:6px;align-items:center;font-size:12.5px;padding:3px 0;border-bottom:1px solid var(--line,rgba(127,127,127,.15))}.bn.h{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;border:0}.bn.t{font-weight:700;border:0}.bn span:nth-child(n+3){text-align:right}.bn .bar{position:relative;height:16px;border-radius:4px;background:rgba(127,127,127,.12);overflow:hidden}.bn .bar i{position:absolute;left:0;top:0;bottom:0;background:var(--brand);opacity:.35}.bn .bar b{position:relative;padding-left:5px;font-weight:600;font-size:11.5px;line-height:16px}.bn.aux .bar i{background:var(--hot)}
.spdh{display:grid;grid-template-columns:minmax(0,1fr) 78px 60px auto;gap:6px;font-size:11.5px;color:var(--muted);margin-top:8px;text-transform:uppercase;letter-spacing:.04em}
.capbox{border:1px solid var(--brand);border-radius:10px;padding:12px;margin-top:10px;background:color-mix(in srgb,var(--brand) 10%,transparent)}.capbox b.w{display:block;font-family:var(--display);font-size:30px}
.livedot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--ok,#30a46c);margin-right:6px;vertical-align:middle;animation:lp 1.2s ease-in-out infinite}@keyframes lp{50%{opacity:.25}}
.chip.live.on{background:var(--ok,#30a46c);border-color:var(--ok,#30a46c);color:#fff}
.big{font-family:var(--display);font-size:34px;font-weight:700;margin:4px 0 10px}.big small{font-size:18px;color:var(--muted)}
`;
const RANGES = [{ k: '24h', label: '24 h', ms: 864e5, bucket: 300 }, { k: '7d', label: '7 days', ms: 7 * 864e5, bucket: 1800 }, { k: '30d', label: '30 days', ms: 30 * 864e5, bucket: 7200 }, { k: '1y', label: '1 year', ms: 365 * 864e5, bucket: 86400 }];
// short tag beside each live number on the graph (Calvin 2026-11-22): S/A, R/A, ODT, PWR; rooms from their name (LR, BSMT, ...)
const TAGK = { supply: 'S/A', return: 'R/A', outdoor: 'ODT', power: 'PWR', fan_power: 'FAN', aux_power: 'AUX' };
const ROOMW = { basement: 'BSMT', living: 'LR', bedroom: 'BR', bed: 'BR', master: 'MBR', kitchen: 'KIT', dining: 'DR', family: 'FR', office: 'OFC', garage: 'GAR', bathroom: 'BATH', upstairs: 'UP', downstairs: 'DN', main: 'MF', attic: 'ATC', den: 'DEN', hall: 'HALL', laundry: 'LDRY', shop: 'SHOP' };
const tagOf = (s) => { if (TAGK[s.kind]) return TAGK[s.kind];
  const w = String(s.label || '').toLowerCase().replace(/\(.*?\)/g, ' ').split(/[^a-z0-9]+/).filter(x => x && !['temp', 'temperature', 'sensor', 'room', 'rh', 'the', 'floor'].includes(x));
  if (!w.length) return 'RM'; if (ROOMW[w[0]]) return ROOMW[w[0]] + (/\d/.test(w[1] || '') ? w[1] : '');
  return w.length > 1 ? w.map(x => x[0]).join('').toUpperCase().slice(0, 3) : w[0].slice(0, 4).toUpperCase(); };
const KIND = { supply: 'Supply air', return: 'Return air', outdoor: 'Outdoor', room: 'Room', power: 'Power (W)', fan_power: 'Fan power (W)', aux_power: 'Aux heat power (W)', humidity: 'Humidity (%)', other: 'Other' };
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isTemp = (s) => s.unit === 'C';
const GRP = { equipment: 'Equipment', ambient: 'Ambient' };
const grpOf = (s) => s.grp || (['room', 'outdoor', 'humidity'].includes(s.kind) ? 'ambient' : 'equipment');
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

const SYSTYPE = { central_ducted: 'Central ducted', single_zone: 'Single-zone ductless', multi_zone: 'Multi-zone ductless', ducted_mini: 'Ducted mini-split', air_to_water: 'Air-to-water', other: 'Other' };
// equipment icons (Calvin 2026-11-22): simple line drawings that look like the real equipment
const EQI = {
  outdoor: '<rect x="3" y="6" width="26" height="19" rx="2"/><circle cx="13" cy="15.5" r="6"/><path d="M13 9.5v12M7 15.5h12M8.8 11.3l8.4 8.4M17.2 11.3l-8.4 8.4" stroke-width="1"/><path d="M23 10h3M23 13h3M23 16h3M23 19h3"/><path d="M6 25v2.5M26 25v2.5"/>',
  wall: '<rect x="2.5" y="10" width="27" height="10" rx="3.5"/><path d="M5 17.5h22"/><path d="M9 23.5l-1.5 3M16 23.5v3M23 23.5l1.5 3" stroke-width="1.2"/><circle cx="25" cy="13.3" r=".9" fill="currentColor" stroke="none"/>',
  ahu: '<rect x="8" y="5" width="16" height="23" rx="1.5"/><path d="M11 2v3M21 2v3M11 2h10"/><path d="M8 13h16M8 19h16"/><path d="M11 22h10M11 24.5h10" stroke-width="1"/><path d="M12 9h8" stroke-width="1"/>',
  ducted: '<rect x="6" y="11" width="20" height="10" rx="1.5"/><path d="M2 13h4v6H2M26 13h4v6h-4"/><path d="M9 16h14" stroke-width="1"/>',
  cassette: '<rect x="4" y="4" width="24" height="24" rx="2"/><rect x="11" y="11" width="10" height="10" rx="1" stroke-width="1"/><path d="M8 7.5h16M8 24.5h16M7.5 8v16M24.5 8v16" stroke-width="1"/>',
  console: '<rect x="5" y="8" width="22" height="18" rx="2"/><path d="M8 12h16M8 22.5h16" stroke-width="1"/><path d="M9 15h14M9 18h14" stroke-width="1"/><path d="M8 26v2M24 26v2"/>',
  hydro: '<rect x="4" y="9" width="17" height="14" rx="1.5"/><path d="M7.5 9v14M11 9v14M14.5 9v14M18 9v14" stroke-width="1"/><path d="M21 12h6v-5M21 20h6v5"/><path d="M27.5 4.5c-1.2 1.4-1.8 2.3-1.8 3a1.8 1.8 0 0 0 3.6 0c0-.7-.6-1.6-1.8-3z" stroke-width="1"/>'
};
const eqIcon = (u, sy) => { const k = u.role === 'outdoor' ? 'outdoor'
    : ({ wall: 'wall', cassette: 'cassette', console: 'console', ducted: 'ducted', ceiling: 'ducted', air_handler: 'ahu', furnace_coil: 'ahu', hydronic: 'hydro' })[u.style]
    || ({ single_zone: 'wall', multi_zone: 'wall', central_ducted: 'ahu', ducted_mini: 'ducted', air_to_water: 'hydro' })[sy && sy.type] || 'wall';
  return `<svg class="eqi" viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${EQI[k]}</svg>`; };
const STYLE = { wall: 'Wall head', ducted: 'Ducted (concealed)', cassette: 'Cassette', console: 'Floor console', ceiling: 'Ceiling suspended', air_handler: 'Air handler', furnace_coil: 'Furnace + coil', hydronic: 'Hydronic module', outdoor: 'Outdoor unit', other: 'Other' };
const INDOOR_DEFAULT = { central_ducted: 'air_handler', single_zone: 'wall', multi_zone: 'wall', ducted_mini: 'ducted', air_to_water: 'hydronic', other: 'other' };
const EVK = { service: ['🛠️', 'Service visit'], filter: ['🧽', 'Filter change'], setting: ['🎛️', 'Setting change'], repair: ['🔧', 'Repair'], install: ['📦', 'Install'], note: ['📝', 'Note'] };
const EVC = { service: '#3e63dd', filter: '#30a46c', setting: '#f5a524', repair: '#e5484d', install: '#8e4ec6', note: '#8b8d98' };
const UNIT_OF = (kind) => ['power', 'fan_power', 'aux_power'].includes(kind) ? 'W' : kind === 'humidity' ? '%' : 'C';
const PALETTE = ['#e5484d', '#3e63dd', '#30a46c', '#f5a524', '#8e4ec6', '#12a594', '#d6409f', '#0090ff', '#ff8b3e', '#a18072'];
const localInput = (t) => { const d = new Date(t); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
const fmtDT = (t) => new Date(t).toLocaleString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const AUX_KW = Array.from({ length: 39 }, (_, i) => 1 + i * 0.5);
const MOTOR = { '': 'Not set', psc: 'PSC (fixed speed taps)', ecm_torque: 'ECM - constant torque (X13)', ecm_airflow: 'ECM - constant airflow (variable speed)' };
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
  root.innerHTML = `<style>${CSS}</style><a class="back" href="#/tools">← Tools</a><div id="body"></div><div id="modal"></div><div id="qr"></div>`;
  const body = root.getElementById('body'), modal = root.getElementById('modal');
  // v35 (Calvin 2026-11-27): QUICK READ - Edge Function hvac-read computes the last 7 days (runtime, defrost, load vs outdoor, comfort + evenness,
  // drift, sensor health) and Claude writes a short read; shown in a side panel (bottom sheet on phones). Last read kept per house for this visit.
  const QR = {}; const qrEl = root.getElementById('qr');
  const qrHtml = (t) => { const L = String(t || '').split(/\n+/).map(x => x.trim()).filter(Boolean); let h = '', inList = false; const close = () => { if (inList) { h += '</ul>'; inList = false; } };
    for (const l of L) { const m = l.match(/^STATUS:\s*(Good|Watch|Problem)\s*[–-]?\s*(.*)$/i); if (m) { close(); h += `<span class="qrst ${m[1].toLowerCase()}">${esc(m[1])} – ${esc(m[2])}</span>`; continue; }
      if (/^[-•]\s+/.test(l)) { if (!inList) { h += '<ul>'; inList = true; } h += `<li>${esc(l.replace(/^[-•]\s+/, ''))}</li>`; continue; }
      if (/:$/.test(l) && l.length < 60) { close(); h += `<h4>${esc(l.replace(/:$/, ''))}</h4>`; continue; } close(); h += `<p>${esc(l)}</p>`; }
    close(); return h; };
  const qrNum = (v, d = 1) => v == null || !Number.isFinite(+v) ? '–' : (+v).toFixed(d);
  const qrTiles = (st) => { const D = (st && st.daily) || [], full = D.filter(x => x.coverage_h > 20), use = full.length ? full : D; if (!use.length) return '';
    const av = (f) => { const v = use.map(f).filter(x => x != null && Number.isFinite(+x)); return v.length ? v.reduce((a, b) => a + +b, 0) / v.length : null; };
    const kwh = av(x => x.odu_kWh), t = [[qrNum(av(x => x.runningPct), 0) + '%', 'running'], [kwh == null ? '–' : Math.round(kwh * 1000 / 24) + ' W', 'avg outdoor unit'], [qrNum(kwh) + ' kWh', 'per day'],
      [qrNum(av(x => x.avgSupplyReturnDeltaC_whenRunning)) + ' °C', 'supply over return'], [qrNum(av(x => x.outdoorAvgC)) + ' °C', 'outdoor avg']];
    for (const c of (st.comfort || [])) t.push([qrNum(c.avgC) + ' °C', esc(c.room) + ' avg · ±' + qrNum(c.sdC)]);
    if (st.roomSpread) t.push([qrNum(st.roomSpread.avgRoomToRoomC) + ' °C', 'room to room']);
    const rh = av(x => x.rhAvg); if (rh != null) t.push([Math.round(rh) + '%', 'indoor RH']);
    return `<div class="qrt">${t.map(([b, l]) => `<div><b>${b}</b><span>${l}</span></div>`).join('')}</div>`; };
  const qrChart = (st) => { const D = ((st && st.daily) || []).filter(x => x.odu_kWh != null); if (D.length < 2) return '';
    const W = 440, H = 150, L = 30, R = 30, T = 10, B = 24, n = D.length, bw = (W - L - R) / n, kmax = Math.max(...D.map(x => x.odu_kWh), 1) * 1.15;
    const os = D.map(x => x.outdoorAvgC).filter(x => x != null), omin = Math.floor(Math.min(...os, 0) - 1), omax = Math.ceil(Math.max(...os, 5) + 1);
    const yk = (v) => T + (H - T - B) * (1 - v / kmax), yo = (v) => T + (H - T - B) * (1 - (v - omin) / (omax - omin)), cx = (i) => L + bw * i + bw / 2;
    const bars = D.map((x, i) => `<rect x="${(L + bw * i + bw * .18).toFixed(1)}" y="${yk(x.odu_kWh).toFixed(1)}" width="${(bw * .64).toFixed(1)}" height="${(H - B - yk(x.odu_kWh)).toFixed(1)}" rx="3" fill="#1048D0" opacity="${x.coverage_h > 20 ? .85 : .4}"><title>${esc(x.day)}: ${x.odu_kWh} kWh</title></rect>
      <text x="${cx(i).toFixed(1)}" y="${(yk(x.odu_kWh) - 3).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="currentColor" opacity=".75">${Math.round(x.odu_kWh)}</text>
      <text x="${cx(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="currentColor" opacity=".6">${esc(new Date(x.day + 'T12:00').toLocaleDateString('en-CA', { weekday: 'short' }))}</text>`).join('');
    const pts = D.map((x, i) => x.outdoorAvgC == null ? null : [cx(i), yo(x.outdoorAvgC)]).filter(Boolean);
    const line = `<polyline points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#F08010" stroke-width="2.2"/>` + pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#F08010"/>`).join('');
    const ax = `<text x="${L - 4}" y="${T + 8}" text-anchor="end" font-size="9" fill="#1048D0">${Math.round(kmax)}</text><text x="${L - 4}" y="${H - B}" text-anchor="end" font-size="9" fill="#1048D0">0</text>
      <text x="${W - R + 4}" y="${T + 8}" font-size="9" fill="#F08010">${omax}°</text><text x="${W - R + 4}" y="${H - B}" font-size="9" fill="#F08010">${omin}°</text>`;
    return `<div class="qrch"><div class="lg"><span><i style="background:#1048D0"></i>Outdoor unit kWh / day</span><span><i style="background:#F08010"></i>Outdoor avg °C</span></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily kWh and outdoor temperature">${bars}${line}${ax}</svg></div>`; };
  const qrEvents = (st) => { const e = st && st.last48h; if (!e || e.offCycles == null) return '';
    return `<div class="qrev"><div><b>${e.offCycles}</b>off cycles · 48 h<br>compressor stopped</div><div><b>${e.defrosts}</b>defrosts · 48 h<br>power on, air went cold</div></div>`; };
  const QIC = { running: '⏱', outdoor: '🌡', comfort: '🏠', drift: '📈', sensors: '📡' }, QTG = { ok: 'Good', watch: 'Watch', problem: 'Problem' };
  const qrRead = (r) => { const R = r.read, st = r.stats || {}; const stt = ['good', 'watch', 'problem'].includes(R.status) ? R.status : 'watch';
    let h = `<span class="qrst ${stt}">${esc(stt[0].toUpperCase() + stt.slice(1))} – ${esc(R.headline || '')}</span>` + qrTiles(st) + qrChart(st);
    for (const c of (R.sections || [])) { const tn = ['ok', 'watch', 'problem'].includes(c.tone) ? c.tone : 'ok';
      h += `<div class="qrc ${tn}"><div class="hd"><span class="ic">${QIC[c.key] || '•'}</span>${esc(c.title || c.key || '')}<span class="tg">${QTG[tn]}</span></div>${c.key === 'running' ? qrEvents(st) : ''}<div class="sm">${esc(c.summary || '')}</div>${(c.points || []).length ? `<ul>${c.points.slice(0, 3).map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}</div>`; }
    if ((R.actions || []).length) h += `<div class="qra"><div class="hd">✔ Do next</div><ol>${R.actions.slice(0, 3).map(a => `<li>${esc(a)}</li>`).join('')}</ol></div>`;
    return h; };
  const qrDraw = () => { const s = S.site; if (!s) { qrEl.innerHTML = ''; return; } const r = QR[s.id];
    qrEl.innerHTML = `<div class="qrs" data-qrclose></div><aside class="qrp" role="dialog" aria-label="Quick read"><button class="x" data-qrclose aria-label="Close">✕</button><h3>Quick read</h3><div class="muted small">${esc(nameOf(s))} · last 7 days</div>
      ${!r || r.busy ? '<div class="muted" style="margin-top:16px">Reading the last 7 days of sensor data… (about 15–30 s)</div>' : r.error ? `<div class="err" style="margin-top:12px">${esc(r.error)}</div>` : r.read ? qrRead(r) : qrHtml(r.text)}
      ${r && !r.busy ? `<div class="foot">Read ${esc(new Date(r.at || Date.now()).toLocaleString('en-CA', { timeZone: 'America/Vancouver', weekday: 'short', hour: 'numeric', minute: '2-digit' }))} · computed from the readings, written by Claude${r.model ? ' (' + esc(r.model) + ')' : ''} · <a href="#" data-qread="again">Run again</a></div>` : ''}</aside>`; };
  const qrRun = async () => { const s = S.site; if (!s) return; QR[s.id] = { busy: true }; qrDraw();
    try { const { data, error } = await sb.functions.invoke('hvac-read', { body: { site: s.id } }); let msg = error && error.message; if (error && error.context && error.context.json) { try { const j = await error.context.json(); msg = j.error || msg; } catch (e) {} }
      QR[s.id] = error || !data || (!data.text && !data.read) ? { error: "Couldn't run the read: " + (msg || (data && data.error) || 'no answer') } : data; } catch (e) { QR[s.id] = { error: "Couldn't run the read: " + e.message }; }
    if (S.site === s && qrEl.innerHTML) qrDraw(); };
  root.addEventListener('click', (e) => { const q = e.target.closest('[data-qread]'); if (q) { e.preventDefault(); const s = S.site; if (q.dataset.qread === 'again' || !s || !QR[s.id] || QR[s.id].error) qrRun(); else qrDraw(); return; }
    if (e.target.closest('[data-qrclose]')) qrEl.innerHTML = ''; });
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && qrEl.innerHTML) qrEl.innerHTML = ''; });
  const S = { sites: [], site: null, sensors: [], all: [], systems: [], units: [], events: [], cust: null, custs: null, range: lsGet('hm_range', '24h'), unit: lsGet('hm_unit', 'F'), hidden: new Set(JSON.parse(lsGet('hm_hidden', '[]'))), shut: new Set(JSON.parse(lsGet('hm_shut', '[]'))), perfRange: lsGet('hm_prange', '30d'), binRange: lsGet('hm_brange', '30d'), rh: {}, series: null, sample: false };
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
    S.site = null; clearInterval(timer); setLive(false);
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
      <div class="two"><label class="f">Design temp (°F)<input data-f="design_temp_f" type="number" inputmode="decimal" value="${esc(v.design_temp_f ?? '')}" placeholder="F280 outdoor"></label><label class="f">F280 heat loss (BTU/h)<input data-f="f280_loss" type="number" inputmode="numeric" value="${esc(v.f280_loss ?? '')}" placeholder="optional"></label></div>
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
      const row = vals(); row.customer_id = link; for (const k of ['design_temp_f', 'f280_loss']) row[k] = row[k] === '' ? null : +row[k];
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
    S.site = S.sites.find(x => x.id === id); if (!S.site) return list(); S.filt = {}; S.zoom = null; S.yz = null;
    body.innerHTML = '<div class="muted">Loading…</div>'; S.cust = null;
    const ok = await reloadMeta(); if (!ok) return;
    await load(); dash(); if (!S.sample) setLive(true);
    filterHealth().then(() => { if (!dead && S.site && S.site.id === id) drawTiles(); });
    clearInterval(timer); let n = 0; timer = setInterval(async () => { if (!S.site || dead || document.hidden) return; n++; if (n % 4 === 0 && !S.gesture) { if (await load()) { drawChart(); zoomBar(); } } if (n % 40 === 0) { await filterHealth(); drawTiles(); } await refreshLatest(); }, 15000);
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
  let loadSeq = 0;
  async function load() {   // returns false when a newer load or a finger gesture overtook this one (its result is dropped)
    const q = ++loadSeq; const R = RANGES.find(r => r.k === S.range) || RANGES[0]; let to = Date.now(), from = to - R.ms, bucket = R.bucket;
    if (S.zoom) { if (S.zoom.now) { const sp = S.zoom.to - S.zoom.from; S.zoom.to = to; S.zoom.from = to - sp; } from = S.zoom.from; to = S.zoom.to; bucket = bucketFor(to - from); }
    const pad = S.zoom ? (to - from) / 2 : 0;
    const { data, error } = await seriesAll(from - pad, Math.min(Date.now(), to + pad), bucket);
    if (q !== loadSeq || S.gesture || dead) return false;
    const ser = {}; (data || []).forEach(r => (ser[r.sensor_id] = ser[r.sensor_id] || []).push([Date.parse(r.t), Number(r.v)]));
    if (!S.zoom) S.sample = !error && !(data || []).length; S.err = error ? error.message : '';   // an empty zoomed window is empty, not sample data
    S.series = S.sample ? sampleSeries(from, to, bucket) : ser; S.from = from; S.to = to; S.bucket = bucket;
    S.derived = derive(S.series); return true;
  }
  // ---- zoom: a window inside the chosen range, data at up to 1-minute detail
  const bucketFor = (ms) => [60, 120, 300, 600, 1800, 3600, 7200, 21600, 86400].find(b => ms / 1000 / b <= 450) || 86400;
  let zoomSeq = 0;
  async function setZoom(from, to) {
    const now = Date.now(), R = RANGES.find(r => r.k === S.range) || RANGES[0];
    let sp = Math.max(10 * 6e4, Math.min(to - from, R.ms)); const c = (from + to) / 2; from = c - sp / 2; to = c + sp / 2;
    if (to > now) { from -= to - now; to = now; } const min = now - 400 * 864e5; if (from < min) { to += min - from; from = min; }
    S.zoom = sp >= R.ms && to >= now - 6e4 ? null : { from, to, now: to >= now - 2 * 6e4 };
    S.from = from; S.to = to; drawChart(); zoomBar();
    const q = ++zoomSeq; const ok = await load(); if (!ok || q !== zoomSeq || dead) return; drawChart(); drawTiles(); zoomBar();
  }
  function zoomBar() {
    const zb = root.getElementById('zb'); if (!zb) return;
    if (!S.zoom && !S.yz) { zb.innerHTML = '<span class="muted small" style="flex:1;text-align:center">Pinch = zoom time · 2 fingers slide · hold 1 finger = readings</span>'; return; }
    if (!S.zoom) { zb.innerHTML = `<span class="zt">${esc(tU())} zoomed ${esc((Math.round(S.yz.lo * 10) / 10) + '° – ' + (Math.round(S.yz.hi * 10) / 10) + '°')}</span><button class="chip" data-zreset>Reset</button>`; return; }
    const f = (t) => new Date(t).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const same = new Date(S.zoom.from).toDateString() === new Date(S.zoom.to).toDateString();
    zb.innerHTML = `<button class="chip" data-zpan="-1" aria-label="Earlier">◀</button><span class="zt">${esc(f(S.zoom.from))} – ${esc(same ? new Date(S.zoom.to).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }) : f(S.zoom.to))}</span><button class="chip" data-zpan="1" aria-label="Later" ${S.zoom.now ? 'disabled style="opacity:.4"' : ''}>▶</button><button class="chip" data-zreset>Reset</button>`;
  }
  function wireZoom(box) {
    // touch: 2 fingers pinch = zoom, 2 fingers slide = move along the timeline; 1 finger press/hold = white scrub line with every reading, slide to move it
    // mouse: hover = scrub line, drag = move along the timeline, double-click / ctrl+wheel (trackpad pinch) = zoom
    const pts = new Map(); let pinch = null, drag = null, raf = 0;
    const geo = () => { const svg = box.querySelector('svg'), g = box._g; if (!svg || !g) return null; const r = svg.getBoundingClientRect(), k = r.width / g.W; return { x0: r.left + g.L * k, x1: r.left + (g.W - g.Rr) * k, w: (g.W - g.L - g.Rr) * k }; };
    const frac = (cx) => { const g = geo(); return g ? Math.min(1, Math.max(0, (cx - g.x0) / g.w)) : 0.5; };
    const tAt = (cx) => S.from + frac(cx) * (S.to - S.from);
    const zoomAt = (t, k) => { const a = t - (t - S.from) / k, b = t + (S.to - t) / k; setZoom(a, b); };
    const redraw = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; drawChart(); }); };
    const scrub = (cx) => { box._scrub = cx == null ? null : tAt(cx); if (box._ov) box._ov(box._scrub); };
    const busy = (on) => { S.gesture = on; if (on) box.dataset.pinch = '1'; else delete box.dataset.pinch; };
    const reset = () => { pts.clear(); drag = null; scrub(null); if (pinch) { pinch = null; busy(false); setZoom(S.from, S.to); } };
    box.addEventListener('pointerdown', (e) => {
      if (e.isPrimary || pts.size >= 2) { pts.clear(); pinch = null; drag = null; }   // a finger whose 'up' got lost never sticks around
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { box.setPointerCapture(e.pointerId); } catch (x) {}
      if (pts.size === 2) { scrub(null); drag = null; const [a, b] = [...pts.values()]; const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y), g = box._g;
        if (false) {   // vertical (°F) pinch removed per Calvin 2026-11-22 - it moved the numbers while sliding
 const r = box.querySelector('svg').getBoundingClientRect(), k = r.height / g.H, fy = ((a.y + b.y) / 2 - r.top - g.T * k) / ((g.H - g.T - g.B) * k);   // fingers one above the other = zoom the °F scale
          pinch = { v: true, d: dy || 1, span: g.th - g.tl, val: g.th - Math.min(1, Math.max(0, fy)) * (g.th - g.tl), r, k, full: g.aH - g.aL }; }
        else pinch = { d: dx || 1, span: S.to - S.from, t: tAt((a.x + b.x) / 2) };
        busy(true); return; }
      if (e.pointerType === 'mouse') drag = { x: e.clientX, from: S.from, to: S.to, moved: false };
      else scrub(e.clientX);
    });
    box.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) { if (e.pointerType === 'mouse' && !pts.size) { const g = geo(); scrub(g && e.clientX >= g.x0 && e.clientX <= g.x1 ? e.clientX : null); } return; }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pinch.v && pts.size >= 2) { const [a, b] = [...pts.values()], g = box._g; const kz = Math.max(0.2, Math.min(40, (Math.abs(a.y - b.y) || 1) / pinch.d)); const sp = pinch.span / kz;
        const fy = Math.min(1, Math.max(0, ((a.y + b.y) / 2 - pinch.r.top - g.T * pinch.k) / ((g.H - g.T - g.B) * pinch.k))); const hi = pinch.val + fy * sp;
        S.yz = sp >= pinch.full * 0.98 ? null : { lo: hi - sp, hi }; return redraw(); }
      if (pinch && pts.size >= 2) { const [x1, x2] = [...pts.values()].map(p => p.x); const k = Math.max(0.05, Math.min(50, (Math.abs(x1 - x2) || 1) / pinch.d)); const sp = pinch.span / k, f = frac((x1 + x2) / 2); S.from = pinch.t - f * sp; S.to = S.from + sp; const now = Date.now(); if (S.to > now) { S.from -= S.to - now; S.to = now; } return redraw(); }
      if (drag) { const dx = e.clientX - drag.x; if (!drag.moved && Math.abs(dx) < 6) return; if (!drag.moved) { drag.moved = true; busy(true); scrub(null); }
        const g = geo(); if (!g) return; let dt = -dx / g.w * (drag.to - drag.from); const now = Date.now(); if (drag.to + dt > now) dt = now - drag.to; S.from = drag.from + dt; S.to = drag.to + dt; return redraw(); }
      if (e.pointerType !== 'mouse') scrub(e.clientX);
    });
    const up = (e) => {
      pts.delete(e.pointerId);
      if (pinch && pts.size < 2) { const v = pinch.v; pinch = null; busy(false); pts.clear(); if (v) { zoomBar(); return; } setZoom(S.from, S.to); return; }
      if (drag && !pts.size) { const moved = drag.moved; drag = null; busy(false); if (moved) setZoom(S.from, S.to); return; }
      if (!pts.size && e.pointerType !== 'mouse') scrub(null);
    };
    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up); box.addEventListener('lostpointercapture', (e) => { if (pts.has(e.pointerId)) up(e); });
    box.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !pts.size) scrub(null); });
    box.addEventListener('contextmenu', (e) => e.preventDefault());   // long-press must not open a menu
    // iPhone: stop Safari zooming/scrolling the page while fingers work the graph
    box.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || S.gesture) e.preventDefault(); }, { passive: false });
    ['gesturestart', 'gesturechange'].forEach(t => box.addEventListener(t, (e) => e.preventDefault()));
    window.addEventListener('blur', reset); document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
    box.addEventListener('dblclick', (e) => zoomAt(tAt(e.clientX), 3));
    box.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoomAt(tAt(e.clientX), e.deltaY < 0 ? 1.5 : 1 / 1.5); }, { passive: false });
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
  // one clamp on the main feed: blower + heat kit. Above the top fan speed by a margin = heat kit on; blower = fan-only watts of the speed whose heat-on total is closest.
  function splitShared(u, ser) {
    const sp = (u.fan_speeds || []).filter(p => +p.watts > 0), raw = ser[u.fan_sensor] || [];
    if (!sp.length) return { fan: raw, aux: raw.map(p => [p[0], 0]) };
    const maxF = Math.max(...sp.map(p => +p.watts)), thr = maxF + Math.max(1000, 300 * (+u.aux_kw || 0)), hs = sp.filter(p => +p.heat_w > 0);
    const fan = [], aux = [];
    for (const [t, w] of raw) {
      if (w == null || w <= thr) { fan.push([t, w]); aux.push([t, 0]); continue; }
      let b = sp.reduce((m, p) => +p.watts > +m.watts ? p : m, sp[0]);
      if (hs.length) b = hs.reduce((m, p) => Math.abs(+p.heat_w - w) < Math.abs(+m.heat_w - w) ? p : m, hs[0]);
      fan.push([t, +b.watts]); aux.push([t, Math.max(0, w - +b.watts)]);
    }
    return { fan, aux };
  }
  const fanSer = (u, ser) => u.aux_enabled && u.aux_shared ? splitShared(u, ser).fan : (ser[u.fan_sensor] || []);
  function auxUnits() { return S.units.filter(u => u.role === 'indoor' && u.aux_enabled && (u.aux_shared ? u.fan_sensor : u.aux_sensor)); }
  function capUnits() { return S.units.filter(u => u.role === 'indoor' && u.cap_enabled && u.fan_sensor && capPts(u).length && S.sensors.some(s => s.kind === 'supply' && s.unit_id === u.id) && S.sensors.some(s => s.kind === 'return' && s.unit_id === u.id)); }
  function derive(ser) {
    const out = {};
    for (const u of capUnits()) {
      const sup = S.sensors.find(s => s.kind === 'supply' && s.unit_id === u.id), ret = S.sensors.find(s => s.kind === 'return' && s.unit_id === u.id), pts = capPts(u);
      const cfm = [], btu = [];
      for (const [t, w] of fanSer(u, ser)) { const c = cfmAt(pts, w); cfm.push([t, c]); const a = holdAt(ser[sup.id], t), b = holdAt(ser[ret.id], t); if (c != null && a != null && b != null) btu.push([t, 1.08 * c * (a - b) * 1.8]); }
      out[u.id] = { cfm, btu };
    }
    for (const u of auxUnits()) {
      const aux = u.aux_shared ? splitShared(u, ser).aux : (ser[u.aux_sensor] || []).map(p => [p[0], p[1]]); const o = out[u.id] || (out[u.id] = {}); o.aux = aux;
      if (o.btu) { const am = new Map(aux); o.hp = o.btu.map(([t, v]) => [t, v - (am.get(t) || 0) * 3.412]); }
    }
    return out;
  }
  // ---- filter health (#1): blower watts at each speed vs a clean-filter baseline; steady fan-only runs, heat off, 5-min buckets.
  // PSC and constant-torque ECM draw LESS as the filter loads, constant-airflow ECM draws MORE. Limits [watch, change] % are starting values to tune on real data.
  const FDIR = { psc: -1, ecm_torque: -1, ecm_airflow: 1 }, FLIM = { psc: [8, 15], ecm_torque: [5, 10], ecm_airflow: [15, 25] };
  const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  function filtUnits() { return S.units.filter(u => u.role === 'indoor' && u.fan_sensor && (u.fan_speeds || []).some(p => +p.watts > 0)); }
  function steadyFan(u, ser, from, to) {   // [t, w, speed index] for steady, fan-only buckets
    const sp = (u.fan_speeds || []).map((p, i) => ({ i, w: +p.watts })).filter(p => p.w > 0); const raw = (ser[u.fan_sensor] || []).filter(p => p[0] >= from && p[0] <= to);
    const thr = u.aux_enabled && u.aux_shared ? Math.max(...sp.map(p => p.w)) + Math.max(1000, 300 * (+u.aux_kw || 0)) : Infinity;
    const dir = FDIR[u.motor_type] || 0, auxS = u.aux_enabled && !u.aux_shared && u.aux_sensor ? ser[u.aux_sensor] : null, gap = 6e5 + 1000, out = [];
    for (let k = 1; k < raw.length - 1; k++) {
      const [t, w] = raw[k], [ta, a] = raw[k - 1], [tb, b] = raw[k + 1];
      if (!(w > 5) || w > thr || a == null || b == null || t - ta > gap || tb - t > gap) continue;
      if (Math.abs(a - w) > 0.05 * w || Math.abs(b - w) > 0.05 * w) continue;   // ramping: speed change, staging, defrost
      if (auxS) { const x = holdAt(auxS, t, 15 * 6e4); if (x != null && x > 300) continue; }
      // match to a speed in the direction a loading filter moves the watts (PSC/torque: at or below clean, airflow ECM: at or above), closest ratio to 1 wins
      const band = dir < 0 ? [0.6, 1.05] : dir > 0 ? [0.95, 1.6] : [0.6, 1.6];
      const c = sp.map(p => ({ i: p.i, r: w / p.w })).filter(x => x.r >= band[0] && x.r <= band[1]).sort((x, y) => Math.abs(1 - x.r) - Math.abs(1 - y.r))[0];
      if (c) out.push([t, w, c.i]);
    }
    return out;
  }
  function filtJudge(u, base, recent, info) {
    const sp = u.fan_speeds || [], rows = sp.map((p, i) => { const b = base[i], n = recent.filter(x => x[2] === i).map(x => x[1]), now = median(n); return { name: p.name || 'Speed ' + (i + 1), base: b, now, n: n.length, pct: b && now != null && n.length >= 12 ? 100 * (now - b) / b : null }; }).filter(r => r.base);
    const dom = rows.filter(r => r.pct != null).sort((a, b) => b.n - a.n)[0] || null, dir = FDIR[u.motor_type], lim = FLIM[u.motor_type];
    let st = 'nodata';
    if (dom && !dir) st = 'nomotor'; else if (dom) { const s = dom.pct * dir; st = s >= lim[1] ? 'change' : s >= lim[0] ? 'watch' : -s >= lim[1] ? 'odd' : 'ok'; }
    return { u, rows, dom, st, ...info };
  }
  async function filterHealth() {
    const F = {}, sid = S.site && S.site.id, us = filtUnits(); if (!us.length || S.sample || !S.site) { S.filt = F; return; }
    const now = Date.now(), win = 3 * 864e5, fev = S.events.filter(e => e.kind === 'filter');
    const r = await seriesAll(now - win, now, 300); if (r.error || dead) return;
    const ser = {}; (r.data || []).forEach(x => (ser[x.sensor_id] = ser[x.sensor_id] || []).push([Date.parse(x.t), Number(x.v)]));
    for (const u of us) {
      const ev = fev.find(e => !e.unit_id || e.unit_id === u.id), evT = ev ? Date.parse(ev.ts) : null;
      let base = (u.fan_speeds || []).map(p => +p.watts || null), basis = 'Captured fan speeds';
      if (evT && now - evT < win) { F[u.id] = { u, rows: [], dom: null, st: 'fresh', basis: 'Filter changed ' + fmtDT(ev.ts), from: evT }; continue; }
      if (evT) {   // clean-filter baseline: the 3 days after the last filter change
        const b = await seriesAll(evT + 36e5, evT + win, 300); if (dead) return;
        if (!b.error) { const bs = {}; (b.data || []).forEach(x => (bs[x.sensor_id] = bs[x.sensor_id] || []).push([Date.parse(x.t), Number(x.v)]));
          const pts = steadyFan(u, bs, evT + 36e5, evT + win); const nb = base.map((w, i) => { const a = pts.filter(x => x[2] === i).map(x => x[1]); return a.length >= 12 ? median(a) : w; });
          if (nb.some((w, i) => w !== base[i])) { base = nb; basis = '3 days after filter change ' + fmtDT(ev.ts); } }
      }
      F[u.id] = filtJudge(u, base, steadyFan(u, ser, now - win, now), { basis });
    }
    if (S.site && S.site.id === sid) S.filt = F;
  }
  const FST = { ok: ['OK', 'var(--brand)'], watch: ['Watch', '#f5a524'], change: ['Change filter', 'var(--hot)'], odd: ['Check setup', '#f5a524'], nomotor: ['Set motor type', '#8b8d98'], nodata: ['Not enough data', '#8b8d98'], fresh: ['New baseline', 'var(--brand)'] };
  function filtInfo(id) {
    const f = S.filt && S.filt[id]; if (!f) return; const u = f.u, lim = FLIM[u.motor_type], pc = (v) => v == null ? '–' : (v > 0 ? '+' : '') + v.toFixed(1) + '%';
    sheet('Filter · ' + esc(unitName(u)), `<div class="big" style="color:${FST[f.st][1]}">${FST[f.st][0]}</div>
      ${f.rows.length ? `<div class="spdh"><span>Speed</span><span>Clean</span><span>Now</span><span>Change</span></div>${f.rows.map(r => `<div class="spd"><span>${esc(r.name)}</span><span>${Math.round(r.base)} W</span><span>${r.now == null ? '–' : Math.round(r.now) + ' W'}</span><span>${r.n >= 12 ? pc(r.pct) : '–'}</span></div>`).join('')}` : ''}
      <div class="kv"><span>Baseline</span><b>${esc(f.basis)}</b></div>
      <div class="kv"><span>Motor</span><b>${esc(MOTOR[u.motor_type || ''])}</b></div>
      ${lim ? `<div class="kv"><span>Limits</span><b>${FDIR[u.motor_type] < 0 ? 'Drop' : 'Rise'} ${lim[0]}% watch · ${lim[1]}% change</b></div>` : ''}
      <div class="hint">Last 3 days, steady fan-only runs (heat off), 1 hour of data needed per speed. Log a Filter change event to reset the baseline.</div>
      <div class="acts"><button class="btn" data-x>Close</button></div>`);
    modal.onclick = (e) => { if (isBackdrop(e) || e.target.closest('[data-x]')) closeModal(); };
  }
  function dash() {
    const s = S.site;
    const contact = [s.phone ? `<a href="tel:${esc(s.phone.replace(/[^\d+]/g, ''))}">${esc(s.phone)}</a>` : '', s.email ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : ''].filter(Boolean).join(' · ');
    body.innerHTML = `<div class="head"><div><h2>${esc(nameOf(s))}</h2><div class="muted small">${esc(s.address)}</div>${contact ? `<div class="small" style="margin-top:2px">${contact}</div>` : ''}</div>
        <div class="chips"><button class="chip on" data-qread title="A written overview of how this system is running">⚡ Quick read</button><button class="chip" data-editsite>Edit client</button><button class="chip" data-list>All houses</button></div></div>
      ${S.err ? `<div class="err">${esc(S.err)}</div>` : ''}
      ${S.sample ? '<div class="sample"><b>Sample data</b> - sensors not connected yet.</div>' : '<div class="muted small" id="stamp" style="margin-top:6px"></div>'}
      <div class="bar"><div class="chips">${RANGES.map(r => `<button class="chip${r.k === S.range ? ' on' : ''}" data-range="${r.k}">${r.label}</button>`).join('')}</div>
        <div class="chips"><button class="chip${S.unit === 'F' ? ' on' : ''}" data-unit="F">°F</button><button class="chip${S.unit === 'C' ? ' on' : ''}" data-unit="C">°C</button><button class="chip" data-export>⬇ Export</button></div></div>
      <div class="card"><div class="zbar" id="zb"></div><div class="chartbox" id="cb"></div><div class="legend" id="lg"></div></div>
      <div id="tiles"></div>
      <div class="card${S.shut.has('perf') ? ' shut' : ''}" id="perf" data-card="perf"></div>
      <div class="card${S.shut.has('bins') ? ' shut' : ''}" id="bins" data-card="bins"></div>
      <div class="card${S.shut.has('eq') ? ' shut' : ''}" id="eq" data-card="eq"></div>
      <div class="card${S.shut.has('evs') ? ' shut' : ''}" id="evs" data-card="evs"></div>`;
    wireZoom(root.getElementById('cb')); drawChart(); zoomBar(); drawLegend(); drawTiles(); drawEquipment(); drawEvents(); drawPerf(); drawBins(); stamp();
  }
  const last = (id) => { const a = (S.series && S.series[id]) || []; return a.length ? a[a.length - 1] : null; };
  // tiles show the newest single reading the server saved (last_value), not the chart's averaged bucket
  const latest = (id) => { const s = S.all.find(x => x.id === id); if (!S.sample && s && s.last_ts && s.last_value != null) { const t = Date.parse(s.last_ts); const b = last(id); return b && b[0] > t ? b : [t, Number(s.last_value)]; } return last(id); };
  async function refreshLatest() {
    if (!S.site || S.sample || S.live) return;
    const { data } = await sb.from('monitor_sensors').select('id,last_ts,last_value').eq('site_id', S.site.id).eq('active', true);
    if (dead || !data) return; data.forEach(r => { const s = S.all.find(x => x.id === r.id); if (s) { s.last_ts = r.last_ts; s.last_value = r.last_value; } });
    drawTiles(); stamp();
  }
  // ---- Live mode: watch the numbers move (Shelly every 5 s, YoLink as soon as a sensor reports, checked every 15 s)
  let liveTimer = null, liveTick = 0, liveStart = 0;
  function setLive(on) {
    S.live = !!on; clearInterval(liveTimer); liveTimer = null;
    const b = root.querySelector('[data-live]'); if (b) b.classList.toggle('on', S.live);
    if (!S.live) { stamp(); return; }
    liveTick = 0; liveStart = Date.now();
    const tick = async () => {
      if (!S.live || dead || !S.site || document.hidden) return;
      const yl = liveTick % 3 === 0; liveTick++;
      const { data, error } = await sb.functions.invoke('hvac-poll', { body: { livesite: S.site.id, yl } });
      if (!S.live) return; const el = root.getElementById('stamp');
      if (error || !data || data.error) { if (el) el.textContent = 'Live: ' + await fnErr(error, data); return; }
      for (const [id, o] of Object.entries(data.values || {})) { const x = S.all.find(z => z.id === id); if (x) { x.last_value = o.v; x.last_ts = o.ts; } }
      drawTiles();
      if (el) el.innerHTML = '<span class="livedot"></span>Live · ' + esc(new Date().toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', second: '2-digit' })) + (data.errors && data.errors.length ? ' · ' + esc(data.errors[0]) : '');
    };
    tick(); liveTimer = setInterval(tick, 5000);
  }
  function stamp() { if (S.live) return; const el = root.getElementById('stamp'); if (!el) return; const ts = S.all.map(s => s.last_ts ? Date.parse(s.last_ts) : 0); const m = Math.max(0, ...ts); el.textContent = m ? 'Latest reading ' + new Date(m).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }) : ''; }
  const colh = (key, label, tag = 'div', cls = 'tgh') => `<${tag} class="${cls} colh${S.shut.has(key) ? ' shut' : ''}" data-col="${key}">${label}</${tag}>`;
  const fmtVal = (s, v) => v == null ? '–' : isTemp(s) ? cv(v).toFixed(1) + tU() : Math.round(v) + ' ' + esc(s.unit);
  // ---- tiles: one layout for everyone (monitor_sites.tile_layout = {equipment:[keys], ambient:[keys]}); keys = sensor id or dt:<unit id>
  function tileItems() {
    const items = S.sensors.map(s => ({ key: s.id, s, grp: grpOf(s) }));
    const seen = new Set();
    S.sensors.filter(s => s.kind === 'supply').forEach(sup => { const ret = S.sensors.find(r => r.kind === 'return' && (r.unit_id || null) === (sup.unit_id || null)); const k = 'dt:' + (sup.unit_id || 'house'); if (ret && !seen.has(k)) { seen.add(k); items.push({ key: k, dt: [sup, ret], der: 1, grp: 'equipment' }); } });
    capUnits().forEach(u => { items.push({ key: 'cfm:' + u.id, cap: 'cfm', u, der: 1, grp: 'equipment' }); items.push({ key: 'btu:' + u.id, cap: 'btu', u, der: 1, grp: 'equipment' }); });
    Object.values(S.filt || {}).forEach(f => items.push({ key: 'flt:' + f.u.id, flt: f, der: 1, grp: 'equipment' }));
    auxUnits().forEach(u => { items.push({ key: 'aux:' + u.id, cap: 'aux', u, der: 1, grp: 'equipment' }); if (capUnits().includes(u)) items.push({ key: 'hp:' + u.id, cap: 'hp', u, der: 1, grp: 'equipment' }); });
    const lay = S.site.tile_layout || {};
    items.forEach(it => { if (it.der) for (const g of Object.keys(GRP)) if ((lay[g] || []).includes(it.key)) it.grp = g; });
    const out = {}; for (const g of Object.keys(GRP)) { const order = lay[g] || []; const mine = items.filter(it => it.grp === g); const rank = (it) => { const i = order.indexOf(it.key); return i < 0 ? 1e6 + (it.der ? -1 : items.indexOf(it)) : i; }; out[g] = mine.sort((a, b) => rank(a) - rank(b)); }
    return out;
  }
  function drawTiles() {
    const el = root.getElementById('tiles'); if (!el || !S.site) return;
    const tile = (it) => {
      if (it.cap) { const a = ((S.derived[it.u.id] || {})[it.cap] || []); const v = a.length ? a[a.length - 1][1] : null; const nm = esc(unitName(it.u));
        if (it.cap === 'aux') { const kw = v == null ? null : v / 1000, rated = +it.u.aux_kw || 0, pct = kw > 0.3 && rated ? Math.round(100 * kw / rated) : null;
          return `<div class="tile" data-tile="${it.key}" style="--c:var(--hot)"><b>${kw == null ? '–' : kw < 0.05 ? 'Off' : kw.toFixed(1) + ' kW'}</b>${pct != null ? `<em${pct < 80 ? ' style="color:var(--hot)"' : ''}>${pct}% of ${rated} kW</em>` : ''}<span>Aux heat · ${nm}</span></div>`; }
        if (it.cap === 'hp') return `<div class="tile" data-tile="${it.key}" style="--c:var(--brand)"><b>${v == null ? '–' : Math.round(Math.abs(v)).toLocaleString('en-CA') + ' BTU/h'}</b><span>Heat pump only · ${nm}</span></div>`;
        return it.cap === 'cfm' ? `<div class="tile" data-tile="${it.key}" style="--c:var(--brand)"><b>${v == null ? '–' : Math.round(v) + ' CFM'}</b><span>Airflow · ${nm}</span></div>` : `<div class="tile" data-tile="${it.key}" style="--c:var(--brand)"><b>${v == null ? '–' : Math.round(Math.abs(v)).toLocaleString('en-CA') + ' BTU/h'}</b><span>${v == null || Math.abs(v) < 1 ? 'Sensible' : v > 0 ? 'Sensible heating' : 'Sensible cooling'} · ${nm}</span></div>`; }
      if (it.flt) { const f = it.flt, d = f.dom; return `<div class="tile" data-tile="${it.key}" style="--c:${FST[f.st][1]}"><b>${d && f.st !== 'fresh' ? (d.pct > 0 ? '+' : '') + d.pct.toFixed(0) + '%' : '–'}</b><em style="color:${FST[f.st][1]}">${FST[f.st][0]}</em><span>Filter · ${esc(unitName(f.u))}</span></div>`; }
      if (it.dt) { const [sup, ret] = it.dt; const a = latest(sup.id), b = latest(ret.id); const d = a && b ? a[1] - b[1] : null; const u = unitById(sup.unit_id); return `<div class="tile" data-tile="${it.key}" style="--c:var(--brand)"><b>${d == null ? '–' : (S.unit === 'F' ? d * 9 / 5 : d).toFixed(1) + tU()}</b><span>ΔT${u ? ' · ' + esc(unitName(u)) : ''}</span></div>`; }
      const s = it.s, l = latest(s.id), h = S.rh[s.id] && latest(S.rh[s.id].id);
      return `<div class="tile" data-tile="${it.key}" style="--c:${esc(s.color)}"><b>${fmtVal(s, l && l[1])}</b>${S.rh[s.id] ? `<em>${h ? Math.round(h[1]) + '% RH' : '– RH'}</em>` : ''}<span>${esc(s.label)}</span></div>`;
    };
    const by = tileItems();
    el.innerHTML = Object.keys(GRP).map(g => `${colh('t-' + g, GRP[g])}<div class="tiles" data-grp="${g}">${by[g].map(tile).join('')}</div>`).join('');
    bindDrag(el, '.tile', '.tiles', saveTiles);
    const cbx = root.getElementById('cb'); if (cbx && cbx._ov && cbx._scrub == null) cbx._ov(null);
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
    const unitBtn = (u) => { const sub = [STYLE[u.style] && u.role !== 'outdoor' ? STYLE[u.style] : '', u.capacity, { psc: 'PSC', ecm_torque: 'ECM torque', ecm_airflow: 'ECM airflow' }[u.motor_type] || '', u.aux_enabled ? 'Aux ' + (+u.aux_kw || '?') + ' kW' + (u.aux_shared ? ' (1 clamp)' : '') : ''].filter(Boolean).join(' · ');
      return `<button class="unit ${u.role === 'outdoor' ? 'out' : 'in'}" data-eunit="${u.id}"><span class="ui">${eqIcon(u, sysOf(u.system_id))}</span><span class="ut"><b>${esc(u.role === 'outdoor' ? 'Outdoor unit' : (u.location || 'Indoor unit'))}</b>${sub || u.model ? `<span>${esc([u.model, sub].filter(Boolean).join(' · '))}</span>` : ''}</span><span class="chev muted">›</span></button>`; };
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
  // ---------- performance analysis (#1 capacity & COP vs outdoor temp, #2 building heat loss + balance point) ----------
  const PERF_R = [{ k: '7d', l: '7 days', ms: 7 * 864e5, b: 900 }, { k: '30d', l: '30 days', ms: 30 * 864e5, b: 900 }, { k: '1y', l: '1 year', ms: 365 * 864e5, b: 3600 }];
  const toF = (c) => c * 9 / 5 + 32;
  const showT = (f) => S.unit === 'F' ? f : (f - 32) * 5 / 9;   // analysis runs in °F, shown in the chosen unit
  const ratedPts = (od) => ((od && od.rated_points) || []).filter(p => p.t !== '' && p.t != null && +p.max > 0).map(p => ({ t: +p.t, max: +p.max, rated: +p.rated || null, cop: +p.cop || null })).sort((a, b) => a.t - b.t);
  const capAtT = (pts, t) => { if (pts.length < 2 || t < pts[0].t || t > pts[pts.length - 1].t) return pts.length === 1 && Math.abs(pts[0].t - t) < 0.01 ? pts[0].max : null; for (let i = 1; i < pts.length; i++) if (t <= pts[i].t) { const a = pts[i - 1], b = pts[i]; return a.max + (b.max - a.max) * (t - a.t) / (b.t - a.t); } return null; };
  async function drawPerf() {
    const el = root.getElementById('perf'); if (!el || !S.site) return;
    const pr = S.perfRange || '30d';
    const head = `<div class="head">${colh('perf', 'Performance', 'h3', 'ch')}<div class="chips">${PERF_R.map(r => `<button class="chip${r.k === pr ? ' on' : ''}" data-prange="${r.k}">${r.l}</button>`).join('')}</div></div>`;
    if (S.shut.has('perf')) { el.innerHTML = head + '<div class="cb"></div>'; return; }
    el.innerHTML = head + '<div class="cb"><div class="muted small">Analyzing…</div></div>';
    const R = PERF_R.find(r => r.k === pr) || PERF_R[1]; const to = Date.now(), from = to - R.ms; const site = S.site;
    const { data, error } = await seriesAll(from, to, R.b);
    if (S.site !== site) return; const cb = el.querySelector('.cb');
    if (error) { cb.innerHTML = `<div class="err">${esc(error.message)}</div>`; return; }
    const ser = {}; (data || []).forEach(r => (ser[r.sensor_id] = ser[r.sensor_id] || []).push([Date.parse(r.t), Number(r.v)]));
    cb.innerHTML = renderPerf(analyze(ser, R.b));
  }
  // ---------- bin hours: time in each 1 °C outdoor band from 18 °C down to the coldest reading; energy, COP and aux heat per band ----------
  async function drawBins() {
    const el = root.getElementById('bins'); if (!el || !S.site) return;
    const br = S.binRange || '30d';
    const head = `<div class="head">${colh('bins', 'Bin hours', 'h3', 'ch')}<div class="chips">${PERF_R.map(r => `<button class="chip${r.k === br ? ' on' : ''}" data-brange="${r.k}">${r.l}</button>`).join('')}</div></div>`;
    if (S.shut.has('bins')) { el.innerHTML = head + '<div class="cb"></div>'; return; }
    const out = S.sensors.find(s => s.kind === 'outdoor');
    if (!out) { el.innerHTML = head + '<div class="cb"><div class="muted small">Needs an outdoor air temperature sensor.</div></div>'; return; }
    el.innerHTML = head + '<div class="cb"><div class="muted small">Counting…</div></div>';
    const R = PERF_R.find(r => r.k === br) || PERF_R[1]; const to = Date.now(), from = to - R.ms, site = S.site;
    let ser = {};
    if (S.sample) ser = sampleSeries(from, to, R.b);
    else { const { data, error } = await seriesAll(from, to, R.b); if (S.site !== site) return; if (error) { el.querySelector('.cb').innerHTML = `<div class="err">${esc(error.message)}</div>`; return; } (data || []).forEach(r => (ser[r.sensor_id] = ser[r.sensor_id] || []).push([Date.parse(r.t), Number(r.v)])); }
    if (S.site !== site) return;
    el.querySelector('.cb').innerHTML = renderBins(binData(ser, R.b, out));
  }
  function binData(ser, b, out) {
    const hb = b / 3600, wm = S.all.filter(s => s.unit === 'W').map(s => new Map(ser[s.id] || []));
    const der = derive(ser), cu = capUnits(), au = auxUnits();
    const qm = cu.map(u => new Map((der[u.id] && der[u.id].btu) || [])), am = au.map(u => new Map((der[u.id] && der[u.id].aux) || []));
    const bins = new Map(); let warm = 0, min = null;
    for (const [t, c] of ser[out.id] || []) {
      if (c == null || isNaN(c)) continue;
      if (c >= 18) { warm += hb; continue; }
      const k = Math.floor(c); min = min == null ? k : Math.min(min, k);
      const g = bins.get(k) || { k, h: 0, wh: 0, wn: 0, q: 0, qw: 0, aux: 0 };
      g.h += hb;
      let w = null; for (const m of wm) { const v = m.get(t); if (v != null && !isNaN(v)) w = (w || 0) + v; }
      if (w != null) { g.wh += w * hb; g.wn += hb; }
      if (qm.length && w != null && w > 50) { let q = 0, any = false; for (const m of qm) { const v = m.get(t); if (v != null) { q += v; any = true; } } if (any && q > 0) { g.q += q * hb; g.qw += w * hb; } }
      if (am.some(m => (m.get(t) || 0) > 300)) g.aux += hb;
      bins.set(k, g);
    }
    const rows = []; if (min != null) for (let k = 17; k >= min; k--) rows.push(bins.get(k) || { k, h: 0, wh: 0, wn: 0, q: 0, qw: 0, aux: 0 });
    const sys = S.systems.map(sy => ({ n: S.units.filter(u => u.system_id === sy.id && u.role === 'indoor').length, m: cu.filter(u => u.system_id === sy.id).length }));
    return { rows, warm, hasW: wm.length > 0, hasQ: cu.length > 0, hasAux: au.length > 0, partial: sys.some(x => x.m && x.m < x.n) };
  }
  function renderBins(d) {
    if (!d.rows.length) return `<div class="muted small">${d.warm ? `All ${d.warm.toFixed(1)} h in this range were at or above 18 °C - no heating bins yet.` : 'No outdoor readings in this range yet.'}</div>`;
    const hr = (h) => h >= 100 ? Math.round(h) + ' h' : h.toFixed(1) + ' h';
    const tot = d.rows.reduce((a, g) => ({ h: a.h + g.h, wh: a.wh + g.wh, q: a.q + g.q, qw: a.qw + g.qw, aux: a.aux + g.aux }), { h: 0, wh: 0, q: 0, qw: 0, aux: 0 });
    const max = Math.max(...d.rows.map(g => g.h)) || 1;
    const lab = (k) => `${k}° to ${k + 1}°` + (S.unit === 'F' ? `<div class="muted" style="font-size:10.5px">${Math.round(k * 1.8 + 32)}-${Math.round((k + 1) * 1.8 + 32)}°F</div>` : '');
    const cop = (g) => g.qw > 0 ? (g.q / (g.qw * 3.412)).toFixed(1) : '–';
    const c4 = d.hasQ ? 'COP' : d.hasAux ? 'Aux h' : 'kW';
    const v4 = (g) => d.hasQ ? cop(g) : d.hasAux ? (g.aux ? g.aux.toFixed(1) : '–') : (g.wn ? (g.wh / g.wn / 1000).toFixed(2) : '–');
    const row = (g) => `<div class="bn${g.aux > g.h / 2 ? ' aux' : ''}"><span>${lab(g.k)}</span><span class="bar"><i style="width:${(100 * g.h / max).toFixed(1)}%"></i><b>${g.h ? hr(g.h) : '0'}</b></span><span>${g.wh ? (g.wh / 1000).toFixed(g.wh >= 10000 ? 0 : 1) : '–'}</span><span>${v4(g)}</span></div>`;
    const auxNote = d.hasQ && d.hasAux && tot.aux ? `<div class="small" style="margin-top:6px">Aux heat ran ${hr(tot.aux)} in total (red bars = aux on most of that band).</div>` : '';
    return `<div class="muted small">Outdoor temperature in 1 °C bands, 18 °C down to the coldest reading. ${hr(d.warm)} at or above 18 °C not counted.</div>
      <div class="bn h"><span>Outdoor</span><span>Hours</span><span>kWh</span><span>${c4}</span></div>
      ${d.rows.map(row).join('')}
      <div class="bn t"><span>Total</span><span>${hr(tot.h)}</span><span>${tot.wh ? (tot.wh / 1000).toFixed(tot.wh >= 10000 ? 0 : 1) : '–'}</span><span>${d.hasQ ? cop(tot) : d.hasAux ? (tot.aux ? tot.aux.toFixed(1) : '–') : (tot.h && tot.wh ? (tot.wh / tot.h / 1000).toFixed(2) : '–')}</span></div>
      ${auxNote}
      ${!d.hasW ? '<div class="hint">No power sensors yet, so kWh is blank.</div>' : ''}
      ${d.hasQ ? `<div class="hint">kWh = all measured power (outdoor unit, blower${d.hasAux ? ', aux heat' : ''}). COP = heat delivered ÷ power, only where airflow and supply/return are measured${d.partial ? ' - not every indoor unit is measured, so COP reads low' : ''}.</div>` : '<div class="hint">COP shows once capacity monitoring is set up on an indoor unit.</div>'}`;
  }
  function analyze(ser, b) {
    const need = [];
    const mon = capUnits(); if (!mon.length) need.push('Capacity monitoring on at least one indoor unit (Edit unit → fan channel, rated CFM and a Capture for each speed).');
    const out = S.sensors.find(s => s.kind === 'outdoor'); if (!out) need.push('An outdoor air temperature sensor.');
    const rooms = S.sensors.filter(s => s.kind === 'room'); if (!rooms.length) need.push('At least one room temperature sensor.');
    const sys = S.systems.map(sy => ({ sy, heads: S.units.filter(u => u.system_id === sy.id && u.role === 'indoor'), od: S.units.find(u => u.system_id === sy.id && u.role === 'outdoor'), mon: mon.filter(u => u.system_id === sy.id) }));
    const coverage = sys.filter(x => x.heads.length).map(x => `${esc(x.sy.name || SYSTYPE[x.sy.type])}: ${x.mon.length} of ${x.heads.length} indoor units measured`);
    const od = (sys.find(x => x.mon.length) || sys[0] || {}).od; const rated = ratedPts(od);
    if (need.length) return { need, coverage, rated, od };
    const der = derive(ser);
    const odPower = S.sensors.filter(s => s.kind === 'power');
    const times = [...new Set(mon.flatMap(u => (der[u.id].btu || []).map(p => p[0])))].sort((x, y) => x - y);
    const maps = mon.map(u => ({ btu: new Map(der[u.id].btu), fan: new Map(fanSer(u, ser)), aux: u.aux_enabled && (u.aux_shared || u.aux_sensor) && der[u.id].aux ? new Map(der[u.id].aux) : null }));
    const pw = odPower.map(s => new Map(ser[s.id] || []));
    const pts = [];
    for (const t of times) {
      const to = holdAt(ser[out.id], t); const ins = rooms.map(r => holdAt(ser[r.id], t)).filter(v => v != null); if (to == null || !ins.length) continue;
      let q = 0, w = 0, aux = 0; for (const m of maps) { q += m.btu.get(t) || 0; w += m.fan.get(t) || 0; if (m.aux) { const a = m.aux.get(t) || 0; aux += a; w += a; } }
      for (const p of pw) w += p.get(t) || 0;
      pts.push({ t, to: toF(to), ti: toF(ins.reduce((x, y) => x + y, 0) / ins.length), q, w, aux });
    }
    const byHour = new Map(); for (const p of pts) { const k = Math.floor(p.t / 36e5); const g = byHour.get(k) || []; g.push(p); byHour.set(k, g); }
    const mean = (g, f) => g.reduce((x, p) => x + f(p), 0) / g.length;
    const hours = [...byHour.values()].map(g => ({ to: mean(g, p => p.to), ti: mean(g, p => p.ti), q: mean(g, p => p.q), w: mean(g, p => p.w), aux: mean(g, p => p.aux) }));
    const heatH = hours.filter(h => h.q > 500), copH = heatH.filter(h => h.w > 50).map(h => ({ to: h.to, cop: h.q / (h.w * 3.412), aux: h.aux > 300 }));
    // daily energy balance: average heat delivered vs (indoor - outdoor); a straight line through the days gives the home's heat loss rate
    const perDay = 86400 / b; const byDay = new Map(); for (const p of pts) { const d = new Date(p.t); const k = d.getFullYear() * 1000 + Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 864e5); const g = byDay.get(k) || []; g.push(p); byDay.set(k, g); }
    const days = [...byDay.values()].filter(g => g.length >= 0.8 * perDay && !g.some(p => p.q < -500)).map(g => ({ dT: mean(g, p => p.ti) - mean(g, p => p.to), q: mean(g, p => Math.max(0, p.q)), ti: mean(g, p => p.ti), to: mean(g, p => p.to) })).filter(d => d.dT > 2);
    let ua = null, b0 = null, tiRef = null, r2 = null;
    if (days.length >= 3 && Math.max(...days.map(d => d.dT)) - Math.min(...days.map(d => d.dT)) >= 3) {
      const n = days.length, sx = days.reduce((x, d) => x + d.dT, 0), sy = days.reduce((x, d) => x + d.q, 0), sxx = days.reduce((x, d) => x + d.dT * d.dT, 0), sxy = days.reduce((x, d) => x + d.dT * d.q, 0);
      ua = (n * sxy - sx * sy) / (n * sxx - sx * sx); b0 = (sy - ua * sx) / n; tiRef = days.reduce((x, d) => x + d.ti, 0) / n;
      const my = sy / n, ssT = days.reduce((x, d) => x + (d.q - my) ** 2, 0), ssR = days.reduce((x, d) => x + (d.q - (ua * d.dT + b0)) ** 2, 0); r2 = ssT ? 1 - ssR / ssT : null;
      if (!(ua > 0)) ua = null;
    }
    const lossAt = (t) => ua == null ? null : Math.max(0, ua * (tiRef - t) + b0);
    let bp = null; if (ua != null && rated.length >= 2) for (let t = 65; t >= -25; t -= 0.5) { const c = capAtT(rated, t); if (c != null && lossAt(t) >= c) { bp = t; break; } }
    return { need, coverage, rated, od, hours, heatH, copH, days, ua, b0, tiRef, r2, lossAt, bp, partial: sys.some(x => x.mon.length && x.mon.length < x.heads.length) };
  }
  function scatter({ dots, lines, ylab, xlab, ymin0 = true }) {
    const W = 420, H = 250, L = 44, R = 10, T = 16, B = 32;
    const xs = dots.map(d => d.x).concat(lines.flatMap(l => l.pts.map(p => p[0]))), ys = dots.map(d => d.y).concat(lines.flatMap(l => l.pts.map(p => p[1])));
    if (!xs.length) return '';
    let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x1 - x0 < 10) { x0 -= 5; x1 += 5; } let y0 = ymin0 ? 0 : Math.min(...ys), y1 = Math.max(...ys) * 1.08 || 1;
    const sx = niceStep(x1 - x0, 6), sy = niceStep(y1 - y0, 5); x0 = Math.floor(x0 / sx) * sx; x1 = Math.ceil(x1 / sx) * sx; y0 = Math.floor(y0 / sy) * sy; y1 = Math.ceil(y1 / sy) * sy;
    const X = (v) => L + (v - x0) / (x1 - x0) * (W - L - R), Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
    let g = '', ax = ''; for (let v = y0; v <= y1 + 1e-9; v += sy) { g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/>`; ax += `<text class="ax" x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : +v.toFixed(2)}</text>`; }
    for (let v = x0; v <= x1 + 1e-9; v += sx) ax += `<text class="ax" x="${X(v)}" y="${H - 14}" text-anchor="middle">${Math.round(v)}°</text>`;
    const dd = dots.map(d => `<circle cx="${X(d.x).toFixed(1)}" cy="${Y(d.y).toFixed(1)}" r="2.6" fill="${d.c}" fill-opacity=".7"/>`).join('');
    const ll = lines.map(l => `<path d="${l.pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('')}" fill="none" stroke="${l.c}" stroke-width="2.2" ${l.dash ? 'stroke-dasharray="6 4"' : ''}/>` + (l.mark ? `<circle cx="${X(l.mark[0])}" cy="${Y(l.mark[1])}" r="5" fill="none" stroke="${l.c}" stroke-width="2"/>` : '')).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ylab)}"><text class="ax" x="4" y="10" font-weight="700">${esc(ylab)}</text><g class="grid">${g}</g>${ax}${ll}${dd}<text class="ax" x="${W - R}" y="${H - 1}" text-anchor="end" font-weight="700">${esc(xlab)}</text></svg>`;
  }
  function renderPerf(a) {
    const kv = (k, v) => v ? `<div class="kv"><span>${k}</span><b>${v}</b></div>` : '';
    const cov = a.coverage.length ? `<div class="muted small">${a.coverage.join(' · ')}${a.partial ? ' - results cover the measured units only' : ''}</div>` : '';
    if (a.need.length) return `${cov}<div class="sample" style="margin-top:8px"><b>Needs before it can analyze:</b><ul style="margin:6px 0 0 18px;padding:0">${a.need.map(n => `<li>${n}</li>`).join('')}</ul></div>${a.rated.length ? '' : '<div class="hint">Also add the outdoor unit\'s rated heating capacity (Equipment → Outdoor unit) so it can find the balance point.</div>'}`;
    if (!a.heatH.length) return `${cov}<div class="muted small" style="margin-top:8px">No heating hours in this range yet. It needs a few days of data with the heat on.</div>`;
    const tu = '°' + S.unit; const xl = 'Outdoor ' + tu;
    const lines = []; const rp = a.rated; if (rp.length) lines.push({ pts: rp.map(p => [showT(p.t), p.max]), c: '#30a46c', mark: rp.length === 1 ? [showT(rp[0].t), rp[0].max] : null });
    if (a.ua != null) { const tx = a.hours.map(h => h.to); const lo = Math.min(...tx, rp.length ? rp[0].t : 99, +S.site.design_temp_f || 99) - 2, hi = Math.max(...tx) + 2; lines.push({ pts: [[showT(lo), a.lossAt(lo)], [showT(hi), a.lossAt(hi)]], c: '#e5484d', mark: a.bp != null ? [showT(a.bp), a.lossAt(a.bp)] : null }); }
    const capSvg = scatter({ dots: a.heatH.map(h => ({ x: showT(h.to), y: h.q, c: h.aux > 300 ? '#f5a524' : '#3e63dd' })), lines, ylab: 'Heat delivered (BTU/h)', xlab: xl });
    const copSvg = a.copH.length ? scatter({ dots: a.copH.map(h => ({ x: showT(h.to), y: h.cop, c: h.aux ? '#f5a524' : '#12a594' })), lines: [], ylab: 'COP', xlab: xl }) : '';
    const band = (lo, hi) => { const g = a.copH.filter(h => h.to >= lo && h.to < hi); return g.length ? (g.reduce((x, h) => x + h.cop, 0) / g.length).toFixed(2) + ` <span class="muted">(${g.length} h)</span>` : '–'; };
    const dTemp = +S.site.design_temp_f, f280 = +S.site.f280_loss; const atD = a.ua != null && S.site.design_temp_f !== null && S.site.design_temp_f !== '' && !isNaN(dTemp) ? a.lossAt(dTemp) : null;
    const capD = atD != null ? capAtT(rp, dTemp) : null;
    const near47 = a.heatH.filter(h => Math.abs(h.to - 47) <= 4); const max47 = near47.length ? Math.max(...near47.map(h => h.q)) : null; const r47 = rp.find(p => p.t === 47);
    let verdict = '';
    if (atD != null && capD != null) verdict = capD < atD ? `Short at design: heat pump ≈ ${Math.round(capD).toLocaleString('en-CA')} vs load ${Math.round(atD).toLocaleString('en-CA')} BTU/h - aux or backup needed below the balance point` : capD > 1.3 * atD ? `Large for the load at design (${Math.round(100 * capD / atD)}%) - watch for short cycling in mild weather` : `Well matched at design (${Math.round(100 * capD / atD)}% of load)`;
    const fmt = (v) => Math.round(v).toLocaleString('en-CA');
    return `${cov}
      <div class="tgh">Heat delivered vs outdoor temperature</div>${capSvg}
      <div class="hint" style="margin-top:2px"><span style="color:#3e63dd">●</span> heat pump hours <span style="color:#f5a524">●</span> aux on ${rp.length ? '<span style="color:#30a46c">━</span> rated max capacity ' : ''}${a.ua != null ? '<span style="color:#e5484d">━</span> house heat loss' : ''}${a.bp != null ? ' ○ balance point' : ''}</div>
      ${copSvg ? `<div class="tgh">Efficiency (COP) vs outdoor temperature</div>${copSvg}` : ''}
      <div style="margin-top:8px">
      ${kv('Heat loss rate', a.ua != null ? `${fmt(S.unit === 'F' ? a.ua : a.ua * 1.8)} BTU/h per ${tu}${a.r2 != null ? ` <span class="muted">(${a.days.length} days, fit ${Math.round(a.r2 * 100)}%)</span>` : ''}` : `Needs 3+ full heating days with different weather (${a.days.length} so far)`)}
      ${kv('Balance point', a.bp != null ? `${showT(a.bp).toFixed(0)}${tu} - below this the heat pump can't keep up` : a.ua != null ? (rp.length < 2 ? 'Add rated capacity at 2+ outdoor temps (outdoor unit)' : 'Heat pump covers the load across the rated range') : '')}
      ${kv('Load at design temp', atD != null ? `${fmt(atD)} BTU/h at ${showT(dTemp).toFixed(0)}${tu}${f280 ? ` · F280 ${fmt(f280)} (${atD > f280 ? '+' : ''}${Math.round(100 * (atD - f280) / f280)}%)` : ''}` : (a.ua != null ? 'Add the design temp (Edit client)' : ''))}
      ${kv('Sizing', verdict)}
      ${kv('Peak hour near 47°F', max47 != null ? `${fmt(max47)} BTU/h${r47 ? ` <span class="muted">(rated max ${fmt(r47.max)})</span>` : ''}` : '')}
      ${a.copH.length ? kv('Average COP', `≥40°F ${band(40, 200)} · 25–40°F ${band(25, 40)} · <25°F ${band(-100, 25)}`) : ''}
      </div>${a.partial ? '<div class="hint">Not every indoor unit is measured, so heat delivered and heat loss are low and COP is understated (the outdoor unit powers all heads).</div>' : ''}`;
  }
  async function fnErr(error, data) { if (data && data.error) return data.error; try { const j = await error.context.json(); if (j && j.error) return j.error; } catch (x) {} return (error && error.message) || 'no reading'; }
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
    const l = latest(s.id), h = S.rh[s.id] && latest(S.rh[s.id].id), u = unitById(s.unit_id);
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
    // left: °F column then Watts column side by side; right: each line's current value in its own colour (or the values under the scrub line)
    const W = width || Math.max(320, box.clientWidth || 600), H = W < 500 ? 310 : 390, T = 26, B = 30;
    const vis = S.sensors.filter(s => !S.hidden.has(s.id) && (S.series[s.id] || []).length);
    const temps = vis.filter(isTemp), pw = vis.filter(s => !isTemp(s));
    const LT = 30, L = pw.length ? 66 : 36, Rr = width ? 12 : 66;
    // vertical scale fits only what is on screen, so zooming in on time also spreads the degrees out
    const rng = (arr, f) => { const pass = (inWin) => { let lo = Infinity, hi = -Infinity; arr.forEach(s => S.series[s.id].forEach(p => { if (inWin && (p[0] < S.from || p[0] > S.to)) return; const v = f(p[1]); if (v < lo) lo = v; if (v > hi) hi = v; })); return [lo, hi]; };
      let [lo, hi] = pass(false); return lo === Infinity ? [0, 1] : hi - lo < 1 ? [lo - 0.5, hi + 0.5] : [lo, hi]; };
    // auto scale: °F lines ~5° apart on a full day (1-2° when zoomed in on time); watts uses the same lines
    // vertical scale stays put while zoomed or sliding: it comes from the full-range view (only grows if a reading goes outside it)
    const fixed = S.zoom && S.ybase && S.ybase.u === S.unit && !width;
    let [aL, aH] = rng(temps, cv); if (fixed) { aL = S.ybase.tl; aH = S.ybase.th; } const aS = niceStep(aH - aL, H < 350 ? 12 : 14); aL = Math.floor(aL / aS) * aS; aH = Math.ceil(aH / aS) * aS;
    let [pl, ph] = rng(pw, v => v); pl = Math.min(0, pl); if (fixed) { ph = S.ybase.ph; pl = S.ybase.pl; }
    if (!S.zoom && !width) S.ybase = { tl: aL, th: aH, pl, ph, u: S.unit };
    const nT = Math.max(1, Math.round((aH - aL) / aS)); let ps = (ph - pl) / nT || 1; { const p = Math.pow(10, Math.floor(Math.log10(ps))); ps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(m => m * p).find(v => v >= ps - 1e-9) || 10 * p; }
    if (pl < 0) pl = -Math.ceil(-pl / ps) * ps;
    if (!temps.length) { aL = 0; aH = nT; }
    const wpd = ps / (temps.length ? aS : 1);   // watts per degree on screen (fixed so watts zoom with the °F scale)
    // vertical zoom (2-finger pinch up/down) overrides the auto °F range
    const yz = S.yz && !width ? S.yz : null; const tl = yz ? yz.lo : aL, th = yz ? yz.hi : aH; const ts = yz ? niceStep(th - tl, H < 350 ? 12 : 14) : (temps.length ? aS : 1);
    const wAt = (v) => pl + (v - aL) * wpd, vAt = (w) => aL + (w - pl) / wpd;
    const x = (t) => L + (t - S.from) / (S.to - S.from) * (W - L - Rr), yT = (v) => T + (1 - (v - tl) / (th - tl || 1)) * (H - T - B), yP = (w) => yT(vAt(w));
    const span = S.to - S.from; const fmtX = (t) => { const d = new Date(t); return span <= 6 * 36e5 ? d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }) : span <= 2 * 864e5 ? d.toLocaleTimeString('en-CA', { hour: 'numeric' }) : span > 120 * 864e5 ? d.toLocaleDateString('en-CA', { month: 'short' }) : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }); };
    const nx = W < 500 ? 4 : 7; let grid = '', axes = '';
    for (let v = Math.ceil(tl / ts - 1e-9) * ts; v <= th + 1e-9; v += ts) { grid += `<line x1="${L}" x2="${W - Rr}" y1="${yT(v)}" y2="${yT(v)}"/>`; if (temps.length) axes += `<text class="ax" x="${LT}" y="${yT(v) + 4}" text-anchor="end">${Math.round(v * 10) / 10}°</text>`; }
    if (pw.length) for (let v = Math.ceil(tl / ts - 1e-9) * ts; v <= th + 1e-9; v += ts) { const w = wAt(v); if (w < -1e-6) continue; axes += `<text class="ax" x="${L - 5}" y="${yT(v) + 4}" text-anchor="end">${w >= 1000 ? +(w / 1000).toFixed(2) + 'k' : Math.round(w)}</text>`; }
    if (span <= 2 * 864e5) { // round clock times (e.g. 8:15, 8:30) so labels never overlap when zoomed
      const st = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720].map(m => m * 6e4).find(v => span / v <= nx) || 864e5;
      const off = new Date(S.from).getTimezoneOffset() * 6e4; let t = Math.ceil((S.from - off) / st) * st + off;
      const lab = (u) => new Date(u).toLocaleTimeString('en-CA', st < 36e5 ? { hour: 'numeric', minute: '2-digit' } : { hour: 'numeric' });
      for (; t <= S.to; t += st) { const px = x(t); if (px < L + 22 || px > W - Rr - 22) continue; axes += `<text class="ax" x="${px}" y="${H - 8}" text-anchor="middle">${lab(t)}</text>`; }
    } else for (let i = 0; i <= nx; i++) { const t = S.from + i * (S.to - S.from) / nx; axes += `<text class="ax" x="${x(t)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === nx ? 'end' : 'middle'}">${fmtX(t)}</text>`; }
    const lines = vis.map(s => { const f = isTemp(s) ? (v) => yT(cv(v)) : yP; const d = S.series[s.id].map((p, i) => (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + f(p[1]).toFixed(1)).join(''); return `<path d="${d}" fill="none" stroke="${esc(s.color)}" stroke-width="${isTemp(s) ? 2 : 1.6}" stroke-linejoin="round" ${isTemp(s) ? '' : 'stroke-dasharray="5 3" opacity=".85"'}/>`; }).join('');
    const evs = eventsInRange().filter(ev => Date.parse(ev.ts) <= S.to);
    const marks = evs.map(ev => { const px = Math.min(W - Rr, x(Date.parse(ev.ts))).toFixed(1); const c = EVC[ev.kind] || EVC.note; return `<line x1="${px}" x2="${px}" y1="${T}" y2="${H - B}" stroke="${c}" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M${px - 6} ${T - 9}h12l-6 8z" fill="${c}"/>`; }).join('');
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Sensor graph"><text class="ax" x="${LT}" y="11" text-anchor="end" font-weight="700">${tU()}</text>${pw.length ? `<text class="ax" x="${L - 5}" y="11" text-anchor="end" font-weight="700">W</text>` : ''}<clipPath id="hmclip"><rect x="${L}" y="${T - 12}" width="${W - L - Rr}" height="${H - T - B + 12}"/></clipPath><g class="grid">${grid}</g>${axes}<g clip-path="url(#hmclip)">${lines}${marks}</g><g class="ov"></g></svg>`;
    box._g = { W, L, Rr, H, T, B, tl, th, aL, aH };
    if (width) return;   // printed report: no live labels
    const ov = box.querySelector('.ov');
    const near = (arr, t) => { let lo = 0, hi = arr.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m][0] < t) lo = m; else hi = m; } return Math.abs(arr[lo][0] - t) < Math.abs(arr[hi][0] - t) ? arr[lo] : arr[hi]; };
    // t = null -> live values at the right edge; t = time -> white scrub line + the reading of every line at that minute
    const tol = Math.max(3 * 6e4, 2.5 * (S.bucket || 60) * 1000);   // scrub shows a reading only if one exists near that minute
    const at = (id, t) => { const a = S.series[id]; if (!a || !a.length) return null; const p = near(a, t); return Math.abs(p[0] - t) <= tol ? p : null; };
    box._ov = (t) => {
      const items = vis.map(s => { const p = t == null ? latest(s.id) : at(s.id, t); if (!p || p[1] == null || isNaN(p[1])) return null; const v = isTemp(s) ? cv(p[1]) : p[1]; return { s, y: Math.max(T, Math.min(H - B, isTemp(s) ? yT(v) : yP(v))), txt: tagOf(s) + ' ' + (isTemp(s) ? v.toFixed(1) + '°' : Math.round(v) + ' W') }; }).filter(Boolean).sort((a, b) => a.y - b.y);
      const gap = 12; for (let k = 1; k < items.length; k++) if (items[k].y - items[k - 1].y < gap) items[k].y = items[k - 1].y + gap;   // no overlapping labels
      const over = items.length ? items[items.length - 1].y - (H - B + 4) : 0; if (over > 0) items.forEach(it => { it.y -= over; });
      let out = '';
      if (t != null) {
        const px = x(t), win = 10 / (W - L - Rr) * span; const ev = evs.find(e2 => Math.abs(Date.parse(e2.ts) - t) <= win);
        const lab = new Date(t).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + (ev ? ' · ' + (ev.title || (EVK[ev.kind] || EVK.note)[1]) : '');
        const lx = Math.max(L + 70, Math.min(W - Rr - 70, px));
        out += `<line x1="${px}" x2="${px}" y1="${T - 4}" y2="${H - B}" style="stroke:var(--ink)" stroke-width="1.5"/><text x="${lx}" y="11" text-anchor="middle" style="font-size:11.5px;font-weight:700;fill:var(--ink)">${esc(lab)}</text>`;
        out += vis.map(s => { const p = at(s.id, t); if (!p) return ''; const y = isTemp(s) ? yT(cv(p[1])) : yP(p[1]); return `<circle cx="${x(p[0])}" cy="${y}" r="3.2" fill="${esc(s.color)}" stroke="#fff" stroke-width="1"/>`; }).join('');
      }
      out += items.map(it => `<text x="${W - Rr + 4}" y="${it.y + 4}" style="font-size:10.5px;font-weight:700;fill:${esc(it.s.color)}">${esc(it.txt)}</text>`).join('');
      ov.innerHTML = out;
    };
    box._ov(box._scrub == null ? null : box._scrub);
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
        if (error || (data && data.error)) { box.innerHTML = `<div class="err">${esc(await fnErr(error, data))}</div>`; return; }
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
      ${u ? (() => { const wl = S.all.filter(x => x.unit === 'W'); const opt = (sel) => `<option value="">Not monitored</option>` + wl.map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.label)}${x.provider === 'shelly' ? ' · ' + (x.channel === 'em1:1' ? 'ch 2' : 'ch 1') : ''}${x.external_id ? '' : ' (not connected)'}</option>`).join('');
        const odSel = (S.all.find(x => x.kind === 'power' && x.unit_id === u.id) || {}).id;
        return `<div class="tgh">Power monitoring</div>${u.role === 'outdoor' ? `<label class="f">Outdoor unit power<select data-pw="power">${opt(odSel)}</select></label>
          <div class="tgh">Rated heating capacity</div><div class="muted small">From the engineering data: max (and rated) heating BTU/h at each outdoor temp. Two or more temps let it find the balance point.</div><div data-rated></div><button class="mini" data-addrated>+ Temperature</button>` : `
          <label class="f">Fan / blower power<select data-fan>${opt(u.fan_sensor)}</select></label>
          <label class="f">Blower motor<select data-motor>${Object.entries(MOTOR).map(([k, t]) => `<option value="${k}" ${k === (u.motor_type || '') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          <label class="tog"><input type="checkbox" data-aux ${u.aux_enabled ? 'checked' : ''}>Auxiliary heat (electric strips)</label>
          <div data-auxbody ${u.aux_enabled ? '' : 'hidden'}><div class="two"><label class="f">Rated size<select data-auxkw><option value="">kW…</option>${AUX_KW.map(k => `<option value="${k}" ${+u.aux_kw === k ? 'selected' : ''}>${k} kW</option>`).join('')}</select></label>
          <label class="f" data-auxsw ${u.aux_shared ? 'hidden' : ''}>Aux heat power<select data-auxs>${opt(u.aux_sensor)}</select></label></div>
          <label class="tog"><input type="checkbox" data-auxsh ${u.aux_shared ? 'checked' : ''}>One clamp on the main feed (blower + heat kit)</label>
          <div class="muted small" data-auxshn ${u.aux_shared ? '' : 'hidden'}>Uses the fan / blower channel above. Capture each fan speed with the heat off, then again with the heat on (Heat on column) so the app can split blower and heat kit.</div></div>`}
          ${wl.length ? '' : '<div class="muted small">Add the Shelly channels as sensors first (Power, Fan power or Aux heat power).</div>'}`; })() : ''}
      ${u && u.role === 'indoor' ? `<div class="tgh">Capacity monitoring</div>
        <label class="tog"><input type="checkbox" data-cap ${u.cap_enabled ? 'checked' : ''}>Airflow &amp; capacity</label>
        <div data-capbody ${u.cap_enabled ? '' : 'hidden'}>
          <div class="muted small">Uses the fan / blower power channel above.</div>
          <label class="f">Fan speeds<select data-nsp>${[1, 2, 3, 4, 5, 6, 7].map(n => `<option ${n === ((u.fan_speeds || []).length || 4) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <div data-speeds></div><div data-capbox></div>
        </div>` : ''}
      ${u ? `<div class="tgh">Nameplate photos</div><div class="ph" data-ph></div><label class="mini" style="display:inline-block">📷 Add photo<input type="file" accept="image/*" data-photo hidden></label>` : '<div class="muted small" style="margin-top:8px">Save first, then add nameplate photos.</div>'}
      <div class="acts"><button class="btn" data-x>Cancel</button><button class="btn pri" data-save>Save</button>${u ? '<button class="btn del" data-rm>Delete unit</button>' : ''}</div>`);
    const photos = u ? [...(u.photos || [])] : [];
    let ratedRows = u && u.role === 'outdoor' ? JSON.parse(JSON.stringify(u.rated_points || [])) : [];
    const drawRated = () => { const el = modal.querySelector('[data-rated]'); if (!el) return; el.innerHTML = `<div class="spdh" style="grid-template-columns:60px 1fr 1fr 52px 28px"><span>°F out</span><span>Max BTU/h</span><span>Rated BTU/h</span><span>COP</span><span></span></div>` + ratedRows.map((p, i) => `<div class="spd" style="grid-template-columns:60px 1fr 1fr 52px 28px"><input data-rt="${i}:t" type="number" inputmode="decimal" value="${esc(p.t ?? '')}"><input data-rt="${i}:max" type="number" inputmode="numeric" value="${esc(p.max ?? '')}"><input data-rt="${i}:rated" type="number" inputmode="numeric" value="${esc(p.rated ?? '')}"><input data-rt="${i}:cop" type="number" inputmode="decimal" step="0.01" value="${esc(p.cop ?? '')}"><button class="ed" data-delrt="${i}" aria-label="Remove">×</button></div>`).join(''); };
    const names = (n) => SPEED_NAMES[n] || Array.from({ length: n }, (_, i) => 'Speed ' + (i + 1));
    let speeds = u && u.fan_speeds && u.fan_speeds.length ? JSON.parse(JSON.stringify(u.fan_speeds)) : names(4).map(n => ({ name: n, rated_cfm: '', watts: null }));
    const drawSpeeds = () => { const el = modal.querySelector('[data-speeds]'); if (!el) return;
      const sh = !!(modal.querySelector('[data-aux]') || {}).checked && !!(modal.querySelector('[data-auxsh]') || {}).checked;
      el.innerHTML = `<div class="spdh"><span>Speed</span><span>Rated CFM</span><span>Watts</span><span></span></div>` + speeds.map((p, i) => `<div class="spd"><input data-sn="${i}" value="${esc(p.name)}"><input data-sc="${i}" type="number" inputmode="numeric" value="${esc(p.rated_cfm)}" placeholder="CFM"><span>${p.watts ? (+p.watts).toFixed(1) : '–'}</span><button class="mini" data-capt="${i}">${p.watts ? 'Redo' : 'Capture'}</button></div>` + (sh ? `<div class="spd heat"><span class="hl">${esc(p.name)} + heat on</span><span></span><span>${p.heat_w ? (+p.heat_w).toFixed(0) : '–'}</span><button class="mini" data-capth="${i}">${p.heat_w ? 'Redo' : 'Capture'}</button></div>` : '')).join(''); };
    drawSpeeds(); drawRated();
    modal.oninput = (e) => { const rt = e.target.closest('[data-rt]'); if (rt) { const [i, k] = rt.dataset.rt.split(':'); ratedRows[+i][k] = rt.value === '' ? '' : +rt.value; return; } const a = e.target.closest('[data-sn]'); if (a) speeds[+a.dataset.sn].name = a.value; const b = e.target.closest('[data-sc]'); if (b) speeds[+b.dataset.sc].rated_cfm = b.value === '' ? '' : +b.value; };
    async function capture(i, heat) {
      const fan = modal.querySelector('[data-fan]').value; const box = modal.querySelector('[data-capbox]');
      if (!fan) return errOut('Pick the fan power sensor first.'); errOut('');
      const sp = speeds[i]; const samples = []; const t0 = Date.now(); const DUR = 120000;
      const paint = (w, msg) => { const n = samples.length, avg = n ? samples.reduce((x, y) => x + y, 0) / n : null; const left = Math.max(0, Math.ceil((DUR - (Date.now() - t0)) / 1000));
        box.innerHTML = `<div class="capbox"><div class="muted small">${esc(sp.name)} fan${heat ? ' + heat on' : ''} · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} left</div><b class="w">${w == null ? '–' : w.toFixed(1) + ' W'}</b><div class="small">${n ? 'Average ' + avg.toFixed(1) + ' W · ' + n + ' readings' : 'Starting…'}${msg ? ' · ' + esc(msg) : ''}</div><div class="acts"><button class="btn" data-capstop>Cancel</button></div></div>`; };
      paint(null);
      const tick = async () => {
        if (Date.now() - t0 >= DUR) { clearInterval(capTimer); capTimer = null;
          if (samples.length < 6) { box.innerHTML = '<div class="err">Not enough readings - check the Shelly is online and try again.</div>'; return; }
          const use = samples.slice(2); const avg = use.reduce((x, y) => x + y, 0) / use.length; const sd = Math.sqrt(use.reduce((x, y) => x + (y - avg) ** 2, 0) / use.length);
          if (heat) Object.assign(sp, { heat_w: Math.round(avg), heat_captured_at: new Date().toISOString() }); else Object.assign(sp, { watts: Math.round(avg * 10) / 10, sd: Math.round(sd * 10) / 10, samples: use.length, captured_at: new Date().toISOString() });
          box.innerHTML = `<div class="linked">${esc(sp.name)}${heat ? ' + heat on' : ''}: ${heat ? sp.heat_w : sp.watts} W (±${sp.sd}) from ${use.length} readings. Save to keep it.</div>`; drawSpeeds(); return; }
        const { data, error } = await sb.functions.invoke('hvac-poll', { body: { live: fan } });
        if (!capTimer) return;
        if (error || !data || data.error) { paint(null, await fnErr(error, data)); return; }
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
      const ax = e.target.closest('[data-aux]'); if (ax) { modal.querySelector('[data-auxbody]').hidden = !ax.checked; drawSpeeds(); return; }
      const axs = e.target.closest('[data-auxsh]'); if (axs) { modal.querySelector('[data-auxsw]').hidden = axs.checked; modal.querySelector('[data-auxshn]').hidden = !axs.checked; drawSpeeds(); return; }
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
      const cth = e.target.closest('[data-capth]'); if (cth) return capture(+cth.dataset.capth, true);
      if (e.target.closest('[data-addrated]')) { ratedRows.push({ t: '', max: '', rated: '', cop: '' }); return drawRated(); }
      const dr = e.target.closest('[data-delrt]'); if (dr) { ratedRows.splice(+dr.dataset.delrt, 1); return drawRated(); }
      if (e.target.closest('[data-capstop]')) { clearInterval(capTimer); capTimer = null; modal.querySelector('[data-capbox]').innerHTML = ''; return; }
      const d = e.target.closest('[data-delph]'); if (d) { if (!confirm('Remove this photo?')) return; photos.splice(+d.dataset.delph, 1); const r = await sb.from('monitor_units').update({ photos }).eq('id', u.id); if (r.error) return errOut(r.error.message); u.photos = [...photos]; return drawPh(); }
      if (e.target.closest('[data-rm]')) { if (!confirm('Delete this unit? Sensors on it stay, unattached.')) return; const { error } = await sb.from('monitor_units').delete().eq('id', u.id); if (error) return errOut(error.message); closeModal(); await reloadMeta(); drawEquipment(); return drawLegend(); }
      if (!e.target.closest('[data-save]')) return;
      const row = vals();
      const capEl = modal.querySelector('[data-cap]'), fanEl = modal.querySelector('[data-fan]'), auxEl = modal.querySelector('[data-aux]'), pwEl = modal.querySelector('[data-pw]');
      const mapSensor = async (id, kind) => { const f = id && S.all.find(x => x.id === id); if (f && (f.unit_id !== u.id || f.kind !== kind)) { const r = await sb.from('monitor_sensors').update({ unit_id: u.id, kind, unit: 'W', grp: 'equipment' }).eq('id', f.id); if (r.error) throw r.error; } };
      try {
        if (u && fanEl) { row.fan_sensor = fanEl.value || null; await mapSensor(row.fan_sensor, 'fan_power'); }
        const moEl = modal.querySelector('[data-motor]'); if (u && moEl) row.motor_type = moEl.value || null;
        if (u && capEl) { row.cap_enabled = capEl.checked; row.fan_speeds = speeds.map(p => ({ ...p, name: (p.name || '').trim() || 'Speed', rated_cfm: p.rated_cfm === '' ? null : +p.rated_cfm })); }
        if (u && auxEl) { row.aux_enabled = auxEl.checked; row.aux_kw = modal.querySelector('[data-auxkw]').value ? +modal.querySelector('[data-auxkw]').value : null; row.aux_shared = !!(modal.querySelector('[data-auxsh]') || {}).checked; row.aux_sensor = row.aux_shared ? null : (modal.querySelector('[data-auxs]').value || null);
          if (row.aux_enabled && !row.aux_kw) return errOut('Pick the aux heat size (kW).');
          if (row.aux_enabled && row.aux_shared && !row.fan_sensor) return errOut('Pick the power channel on the main feed (Fan / blower power).');
          if (row.aux_enabled && !row.aux_shared && row.aux_sensor && row.aux_sensor === row.fan_sensor) return errOut('Fan and aux heat need different power channels - or tick One clamp on the main feed.');
          if (row.aux_enabled && !row.aux_shared) await mapSensor(row.aux_sensor, 'aux_power');
          if (row.aux_shared) row.fan_speeds = speeds.map(p => ({ ...p, name: (p.name || '').trim() || 'Speed', rated_cfm: p.rated_cfm === '' ? null : +p.rated_cfm })); }
        if (u && pwEl && pwEl.value) await mapSensor(pwEl.value, 'power');
        if (u && u.role === 'outdoor' && modal.querySelector('[data-rated]')) row.rated_points = ratedRows.filter(p => p.t !== '' && p.max !== '').map(p => ({ t: +p.t, max: +p.max, rated: p.rated === '' ? null : +p.rated, cop: p.cop === '' ? null : +p.cop, src: p.src || '' }));
      } catch (x) { return errOut(x.message || String(x)); }
      if (u) { const { error } = await sb.from('monitor_units').update(row).eq('id', u.id); if (error) return errOut(error.message); }
      else { row.system_id = sy.id; row.sort = S.units.filter(x => x.system_id === sy.id).length + 1; const { error } = await sb.from('monitor_units').insert(row); if (error) return errOut(error.message); }
      closeModal(); await reloadMeta(); S.derived = derive(S.series); drawEquipment(); drawLegend(); drawTiles(); drawEvents(); drawPerf();
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
      cols.push({ h: 'Airflow ' + nm + ' (CFM)', f: t => dec(m1.get(t), 0) }); cols.push({ h: 'Sensible ' + nm + ' (BTU/h, + heating / - cooling)', f: t => dec(m2.get(t), 0) });
      if (der[u.id].hp) { const m3 = new Map(der[u.id].hp); cols.push({ h: 'Heat pump only ' + nm + ' (BTU/h)', f: t => dec(m3.get(t), 0) }); } }
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
      ${auxUnits().length ? `<h2>Auxiliary heat</h2><table><tr><th>Indoor unit</th><th>Rated</th><th>Energy</th><th>Running</th><th>Avg when on</th></tr>${auxUnits().map(u => { const a = (der[u.id] && der[u.id].aux || []).map(p => p[1]); const on = a.filter(v => v > 300); const kwh = a.reduce((x, v) => x + v, 0) * step / 3600 / 1000; const avgOn = on.length ? on.reduce((x, v) => x + v, 0) / on.length / 1000 : null;
        return `<tr><td>${esc(unitName(u))}</td><td>${f1(+u.aux_kw, 1)} kW</td><td>≈ ${f1(kwh, 1)} kWh</td><td>${a.length ? f1(100 * on.length / a.length, 0) : '–'}% of the time</td><td>${avgOn == null ? '–' : f1(avgOn, 1) + ' kW' + (u.aux_kw && avgOn < 0.8 * u.aux_kw ? ' (below rating - check elements)' : '')}</td></tr>`; }).join('')}</table>` : ''}
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
    const r = e.target.closest('[data-range]'); if (r) { S.zoom = null; S.yz = null; S.range = r.dataset.range; lsSet('hm_range', S.range); body.querySelectorAll('[data-range]').forEach(b => b.classList.toggle('on', b === r)); await load(); drawChart(); zoomBar(); drawTiles(); drawEvents(); return; }
    const zp = e.target.closest('[data-zpan]'); if (zp && S.zoom) { const sp = S.zoom.to - S.zoom.from, d = +zp.dataset.zpan * sp / 2; return setZoom(S.zoom.from + d, S.zoom.to + d); }
    if (e.target.closest('[data-zreset]')) { S.zoom = null; S.yz = null; zoomBar(); await load(); drawChart(); drawTiles(); return; }
    const u = e.target.closest('[data-unit]'); if (u) { S.yz = null; S.unit = u.dataset.unit; lsSet('hm_unit', S.unit); body.querySelectorAll('[data-unit]').forEach(b => b.classList.toggle('on', b === u)); drawChart(); drawTiles(); return; }
    const col = e.target.closest('[data-col]'); if (col) { const k = col.dataset.col; if (S.shut.has(k)) S.shut.delete(k); else S.shut.add(k); lsSet('hm_shut', JSON.stringify([...S.shut])); col.classList.toggle('shut', S.shut.has(k)); const card = col.closest('[data-card]'); if (card) card.classList.toggle('shut', S.shut.has(k)); if (k === 'perf' && !S.shut.has(k)) drawPerf(); if (k === 'bins' && !S.shut.has(k)) drawBins(); return; }
    const brg = e.target.closest('[data-brange]'); if (brg) { S.binRange = brg.dataset.brange; lsSet('hm_brange', S.binRange); return drawBins(); }
    const prg = e.target.closest('[data-prange]'); if (prg) { S.perfRange = prg.dataset.prange; lsSet('hm_prange', S.perfRange); return drawPerf(); }
    if (recentDrag(e)) return;
    const lr = e.target.closest('.lg'); if (lr && !e.target.closest('input,button')) return sensorInfo(lr.dataset.row);
    const tl = e.target.closest('[data-tile]'); if (tl && tl.dataset.tile.startsWith('flt:')) return filtInfo(tl.dataset.tile.slice(4));
    if (tl && !tl.dataset.tile.includes(':')) return sensorInfo(tl.dataset.tile);
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
  // phones pause timers in the background: catch up the moment HQ is back on screen
  const onVis = async () => { if (!document.hidden && S.site && !dead) { await refreshLatest(); await load(); drawChart(); drawTiles(); } };
  document.addEventListener('visibilitychange', onVis); window.addEventListener('focus', onVis);
  list();
  return () => { dead = true; clearInterval(timer); clearInterval(liveTimer); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis); root.innerHTML = ''; };
}
