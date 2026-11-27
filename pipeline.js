// Homestar HQ - Pipeline page (v9 2026-11-27: MOVE TO any stage from the panel (pipeactions {action:'move', stage} -> ghl-action / hourly sync), panel redesigned - quick-link tiles, Up next, Actions card, Customer card, collapsible sections (Messages closed by default); v8 2026-11-26: NOTES + REMINDERS - 'Add a note' in the panel (optional 'Remind me' date): saved as pipeactions {action:'note'} (also posted to the GHL contact by ghl-action / hourly sync) and, with a date, one board card per estimate 'pipe-<opp>' in Waiting with remindOn (Board Check moves it to To Do that day). hqHcpIngest also writes board/schedule (HCP calendar: jobs, estimates, events) and moves customers/* booked visits to HCP's current date + time. v7 2026-11-26: one-tap actions run INSTANTLY through Supabase Edge Function ghl-action when its GHL_TOKEN secret is set (ping on load); otherwise they stay queued for the hourly GHL Sync. v6 2026-11-26: Housecall Pro inbox texts shown with the GHL messages (board/hcp_msgs, blue 'Housecall Pro ›' links to the HCP chat). Hourly feed without passing data through anyone: in one Chrome tab the run calls window.hqHcpPlan() here (plan -> window.name), opens the HCP inbox and runs Tools/hcp_inbox_msgs.js (texts + room ids -> window.name), comes back to #/pipeline and calls window.hqHcpIngest() (writes board/hcp_msgs + board/hcp_rooms with Calvin's own session, clears window.name). Owner page only; nothing ingests automatically. v5 2026-11-26: each message links to where it came from - Go High Level messages open that customer's GHL conversation, Housecall Pro messages (sys:'hcp') open their HCP inbox chat; HCP links are /app/inbox/* universal links, so on the phone they open the Housecall Pro app. v3 2026-11-26, Calvin picks 1/2/4/6: 'Needs a nudge' lane first in Estimates (call list from the snapshot's nudge flag), follow-up stages Sent > Follow-up 1 Sent > Follow-up 2 Sent > Call to Make (moved hourly by the snapshot), STALE flags with a next step (+ 'Stale only' filter), one-tap Mark won / Mark lost + reason / Pause follow-ups with an OK step (queued in board collection pipeactions, run by the hourly GHL Sync), 'Follow-up stopped' in red, tap a message -> that customer's Housecall Pro inbox chat (board/hcp_rooms), GHL conversation link. v2 2026-11-26: tap a card -> side panel like the board: HCP + GHL links, contact, work summary, rebate flag, automations with sent / next / stopped steps, messages, form answers, notes; next automation step on each card. v1 2026-11-26, Calvin): full view of the Go High Level Leads / Estimates / Jobs pipelines.
// Data: Calvin's board doc board/pipelines (written hourly by Tools/ghl_pipelines_snap.py in the GHL Sync task; open opportunities only).
// mountPipeline(host, db) renders into a shadow root on host and returns a cleanup function.
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (v) => v ? '$' + Math.round(v).toLocaleString('en-CA') : '';
const days = (t) => t ? Math.max(0, Math.floor((Date.now() - Date.parse(t)) / 864e5)) : null;
const fmt = (t, o) => { const d = t ? new Date(t) : null; return d && !isNaN(d) ? d.toLocaleString('en-CA', Object.assign({ timeZone: 'America/Vancouver', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }, o || {})) : ''; };
const nextOf = (it) => { for (const a of it.auto || []) { if (a.status === 'stopped') continue; const n = (a.steps || []).find(x => x.state === 'next' || x.state === 'due'); if (n) return { a, n }; } return null; };
const COL = { leads: '#3e63dd', estimates: '#D9772E', jobs: '#3f9e62' };
const CSS = `
:host{display:block;color:var(--ink);font-family:var(--body);font-size:15px;line-height:1.4}
*{box-sizing:border-box}
.head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:8px;margin:4px 0 14px}
h2{font-family:var(--display);font-size:26px;margin:0}
.sub{color:var(--muted);font-size:13px}
.pick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}
.pk{font:inherit;text-align:left;cursor:pointer;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:2px;border-top:4px solid var(--pc)}
.pk.on{background:color-mix(in srgb,var(--pc) 12%,var(--surface));border-color:var(--pc)}
.pk .l{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.pk b{font-size:26px;line-height:1.1}.pk .v{font-size:13px;color:var(--muted)}
.tools{display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap}
.tools input#q{font:inherit;font-size:15px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px;flex:1;min-width:180px}
.tools label{font-size:13px;color:var(--muted);display:flex;gap:6px;align-items:center}
.cols{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(250px,1fr);gap:10px;overflow-x:auto;padding-bottom:10px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.col{scroll-snap-align:start;background:var(--sunk);border-radius:12px;padding:10px;min-width:0;display:flex;flex-direction:column;gap:8px;max-height:72vh}
.ch{display:flex;justify-content:space-between;align-items:baseline;gap:6px;padding:2px 2px 6px;border-bottom:2px solid var(--pc)}
.ch b{font-size:14px}.ch .n{font-weight:800;font-size:13px;background:var(--surface);border-radius:999px;padding:1px 9px}
.ch small{display:block;color:var(--muted);font-size:12px;font-weight:600}
.list{overflow-y:auto;display:flex;flex-direction:column;gap:8px}
.op{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:9px 10px}
.op .t{font-weight:700;font-size:14px;overflow-wrap:anywhere}
.op .m{display:flex;justify-content:space-between;gap:6px;margin-top:4px;font-size:12.5px;color:var(--muted)}
.op .num{font-size:11.5px;font-weight:700;background:var(--sunk);border-radius:6px;padding:1px 6px;margin-left:4px;color:var(--muted)}
.age.w{color:var(--warn);font-weight:700}.age.h{color:var(--hot);font-weight:700}
.none{color:var(--muted);font-size:13px;padding:6px 2px}
.op{cursor:pointer;transition:.12s}.op:hover{border-color:var(--accent);transform:translateY(-1px)}
.op .nx{margin-top:5px;font-size:12px;color:var(--accent);font-weight:600}.op .nx.stop{color:#d92d20;font-weight:600}.op .nx.due{color:var(--warn)}
.red{color:#d92d20!important}
.op .ng{margin-top:5px;font-size:12px;font-weight:700;color:#b54708}.op .sl{margin-top:5px;font-size:12px;font-weight:600;color:#d92d20}
.op .qd{margin-top:5px;font-size:11.5px;font-weight:700;color:var(--accent)}
.sb{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.04em;background:color-mix(in srgb,#d92d20 15%,transparent);color:#d92d20;border-radius:6px;padding:1px 6px;margin-left:4px;vertical-align:1px}
.col.nudge{background:color-mix(in srgb,#f79009 13%,var(--sunk))}.col.nudge .ch{border-bottom-color:#f79009}
.tools .fb{font:inherit;font-size:13px;font-weight:700;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:6px 12px;cursor:pointer}.tools .fb.on{background:#d92d20;border-color:#d92d20;color:#fff}
.flag{border-radius:10px;padding:9px 11px;margin:0 0 10px;font-size:13.5px}.flag.n{background:color-mix(in srgb,#f79009 14%,transparent);border:1px solid color-mix(in srgb,#f79009 45%,transparent)}.flag.s{background:color-mix(in srgb,#d92d20 10%,transparent);border:1px solid color-mix(in srgb,#d92d20 40%,transparent)}.flag b{display:block}
.acts{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}.acts button{font:inherit;font-size:13.5px;font-weight:700;border-radius:9px;padding:8px 12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);cursor:pointer}.acts .won{border-color:#3f9e62;color:#3f9e62}.acts .lost{border-color:#d92d20;color:#d92d20}
.ok{border:1px solid var(--line);border-radius:10px;padding:10px;margin:0 0 12px;background:var(--bg);font-size:14px}.ok select,.ok input{font:inherit;font-size:14px;width:100%;margin:6px 0;padding:7px 9px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink)}.ok .row{display:flex;gap:8px;margin-top:6px}.ok .go{background:var(--accent);border:0;color:#fff;font:inherit;font-weight:700;border-radius:8px;padding:8px 14px;cursor:pointer}.ok .no{background:none;border:1px solid var(--line);color:var(--ink);font:inherit;border-radius:8px;padding:8px 14px;cursor:pointer}
.qline{font-size:13px;border-radius:8px;padding:7px 10px;margin:0 0 10px;background:color-mix(in srgb,var(--accent) 10%,transparent)}.qline a{color:var(--accent);margin-left:6px}
a.msg{display:block;color:inherit;text-decoration:none;cursor:pointer}a.msg:hover{background:var(--sunk)}a.msg .go{float:right;font-size:11px;font-weight:700}a.msg .go.g{color:#3f9e62}a.msg .go.h{color:#1777d3}
.nf textarea{font:inherit;font-size:14px;width:100%;min-height:64px;padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);box-sizing:border-box}.nf .rr{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px;font-size:13px}.nf .rr input{font:inherit;font-size:13px;padding:5px 7px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink)}.nf .q{font:inherit;font-size:12px;font-weight:700;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:4px 10px;cursor:pointer}.nf .sv{margin-left:auto;background:var(--accent);color:#fff;border:0;font:inherit;font-weight:700;border-radius:8px;padding:7px 14px;cursor:pointer}.myn{border-left:3px solid var(--accent);padding:5px 9px;margin:6px 0;font-size:13.5px;background:var(--bg);border-radius:0 8px 8px 0;white-space:pre-wrap}.myn em{display:block;font-style:normal;font-size:11.5px;color:var(--muted)}
.sec .sm{float:right;font-size:12px;font-weight:700;text-transform:none;letter-spacing:0;color:var(--accent);text-decoration:none}
.rb{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.04em;background:color-mix(in srgb,#3f9e62 18%,transparent);color:#3f9e62;border-radius:6px;padding:1px 6px;margin-left:4px;vertical-align:1px}
.scrim{position:fixed;inset:0;background:rgba(10,14,25,.45);z-index:60}
.side{position:fixed;top:0;right:0;bottom:0;width:min(460px,100vw);background:var(--surface);border-left:1px solid var(--line);z-index:61;overflow-y:auto;padding:18px 18px 40px;box-shadow:-10px 0 30px rgba(0,0,0,.25)}
.side .x{position:absolute;top:12px;right:14px;font:inherit;font-size:20px;background:none;border:0;color:var(--muted);cursor:pointer}
.side h3{font-family:var(--display);font-size:21px;margin:0 30px 4px 0}
.side .meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px;color:var(--muted);margin-bottom:10px}
.chip{font-size:12px;font-weight:700;border-radius:999px;padding:2px 9px;background:var(--sunk);color:var(--ink)}
.links{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 14px}
.links a{font:inherit;font-size:13.5px;font-weight:700;text-decoration:none;border-radius:9px;padding:8px 12px;border:1px solid var(--line);color:var(--ink);background:var(--bg)}
.links a.hcp{background:#1777d3;border-color:#1777d3;color:#fff}.links a.inb{border-color:#1777d3;color:#1777d3}.links a.ghl{background:#3f9e62;border-color:#3f9e62;color:#fff}
.sec{border-top:1px solid var(--line);padding-top:10px;margin-top:12px}
.sec>b{display:block;font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.kv{display:grid;grid-template-columns:86px 1fr;gap:4px 10px;font-size:14px}.kv span{color:var(--muted)}.kv a{color:var(--accent)}
ul.sum{margin:0;padding-left:18px;font-size:14px}
.wf{border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:8px;background:var(--bg)}
.wf .wn{font-weight:700;font-size:13.5px}.wf .ws{font-size:12px;margin:3px 0 6px;color:var(--muted)}
.st{display:grid;grid-template-columns:20px 1fr auto;gap:6px;font-size:13px;padding:3px 0;align-items:baseline}
.st i{font-style:normal;text-align:center}.st.sent i{color:var(--ok)}.st.next{font-weight:700}.st.next i{color:var(--accent)}.st.due i,.st.due{color:var(--warn)}.st.stopped,.st.later{color:var(--muted)}.st.stopped span{text-decoration:line-through}
.st em{font-style:normal;color:var(--muted);font-size:12px;white-space:nowrap}
.wf small{display:block;color:var(--muted);font-size:11px;margin-top:4px}
.msg{font-size:13px;padding:5px 0;border-bottom:1px dashed var(--line)}.msg em{font-style:normal;color:var(--muted);font-size:11.5px;display:block}.msg .au{font-size:10.5px;font-weight:800;color:var(--accent);margin-left:4px}
.note{white-space:pre-wrap;font-size:13px;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px;margin-bottom:6px;max-height:220px;overflow:auto}

.side{padding:16px 16px 40px;background:var(--bg)}
.hd2{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 14px 12px;margin:0 0 12px}.hd2 h3{margin:0 34px 8px 0}
.hd2 .meta{margin:0}.chip.stg{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent)}.chip.val{background:color-mix(in srgb,#3f9e62 16%,transparent);color:#3f9e62}.age2{font-size:12.5px;color:var(--muted)}
.bn{border-radius:12px;padding:10px 12px;margin:0 0 10px;font-size:13.5px;line-height:1.35}.bn b{display:block;margin-bottom:2px}.bn a{color:inherit;font-weight:700}
.bn.n{background:color-mix(in srgb,#f79009 15%,var(--surface));border:1px solid color-mix(in srgb,#f79009 45%,transparent)}.bn.s{background:color-mix(in srgb,#d92d20 11%,var(--surface));border:1px solid color-mix(in srgb,#d92d20 40%,transparent)}
.bn.q{background:color-mix(in srgb,var(--accent) 12%,var(--surface));border:1px solid color-mix(in srgb,var(--accent) 40%,transparent)}.bn.ok2{background:color-mix(in srgb,#3f9e62 13%,var(--surface));border:1px solid color-mix(in srgb,#3f9e62 40%,transparent)}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:8px;margin:0 0 12px}
.tl{display:flex;flex-direction:column;align-items:center;gap:4px;text-decoration:none;font-size:12.5px;font-weight:700;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 6px;text-align:center}
.tl i{font-style:normal;font-size:20px}.tl.hcp{border-color:#1777d3;color:#1777d3}.tl.inb{border-color:#1777d3;color:#1777d3}.tl.ghl{border-color:#3f9e62;color:#3f9e62}
.up{display:grid;grid-template-columns:1fr auto;gap:2px 10px;border-radius:12px;padding:10px 12px;margin:0 0 12px;background:color-mix(in srgb,var(--accent) 10%,var(--surface));border-left:4px solid var(--accent)}
.up span{grid-column:1/-1;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--accent)}.up b{font-size:14px}.up em{font-style:normal;font-size:12.5px;color:var(--muted);align-self:end}
.up.due{border-left-color:var(--warn);background:color-mix(in srgb,#f79009 12%,var(--surface))}.up.due span{color:var(--warn)}.up.stop{border-left-color:#d92d20;background:color-mix(in srgb,#d92d20 9%,var(--surface))}.up.stop span{color:#d92d20}
.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:0 0 12px}
.ct{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.card .acts{margin:0 0 10px}.card .acts button{flex:1;min-width:80px;padding:10px 12px}
.mv>span{display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px}.mvs{display:flex;flex-wrap:wrap;gap:6px}
.mvs button{font:inherit;font-size:12.5px;font-weight:700;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:999px;padding:6px 11px;cursor:pointer}.mvs button:hover{border-color:var(--accent);color:var(--accent)}
.mvs button.here{background:var(--accent);border-color:var(--accent);color:#fff;cursor:default;opacity:1}
.kr{display:flex;gap:10px;align-items:baseline;font-size:14px;padding:5px 0;border-bottom:1px solid var(--line)}.kr:last-of-type{border-bottom:0}.kr i{font-style:normal;width:20px;text-align:center}.kr a{color:var(--accent);text-decoration:none;overflow-wrap:anywhere}
.card ul.sum{margin:10px 0 0;padding:10px 0 0 18px;border-top:1px dashed var(--line);font-size:13.5px}
details.sx{background:var(--surface);border:1px solid var(--line);border-radius:14px;margin:0 0 10px;overflow:hidden}
details.sx>summary{list-style:none;display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer}details.sx>summary::-webkit-details-marker{display:none}
details.sx>summary i{font-style:normal;font-size:16px;width:20px;text-align:center}.sx .tt{font-weight:800;font-size:14px}.sx .sb2{margin-left:auto;font-size:12px;color:var(--muted);text-align:right}
.sx .cv{font-size:18px;color:var(--muted);transition:transform .15s}details.sx[open] .cv{transform:rotate(90deg)}details.sx[open]>summary{border-bottom:1px solid var(--line)}
.sxb{padding:10px 14px 12px}
.sm2{display:inline-block;font-size:12.5px;font-weight:700;color:var(--accent);text-decoration:none;margin-bottom:8px}
a.msg{border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin:0 0 8px;border-bottom:1px solid var(--line)}a.msg.in{border-left:3px solid #1777d3}a.msg.out{border-left:3px solid var(--line)}
a.msg .mh{display:flex;justify-content:space-between;font-size:11.5px;font-weight:700;color:var(--muted);margin-bottom:3px}a.msg .mt{font-size:13.5px;line-height:1.4}a.msg .go{float:none}
.nf{margin-top:6px}.nf .rr .sv{margin-left:auto}
.tgs{display:flex;flex-wrap:wrap;gap:6px}
@media(max-width:600px){.side{top:auto;left:0;width:100vw;height:88vh;border-left:0;border-top:1px solid var(--line);border-radius:16px 16px 0 0}}
.empty{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:18px;color:var(--muted)}
@media(max-width:600px){.pick{gap:6px}.pk{padding:10px}.pk b{font-size:22px}.cols{grid-auto-columns:86%}}
`;
const HCPINBOX = 'https://pro.housecallpro.com/app/inbox/categories/customers';
const ACT = { won: 'Mark won', lost: 'Mark lost', pause: 'Pause follow-ups', note: 'Note', move: 'Move' };
const ptDate = (t) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
const ptTime = (t) => new Date(t).toLocaleTimeString('en-US', { timeZone: 'America/Vancouver', hour: 'numeric', minute: '2-digit' });
const addDays = (n) => ptDate(Date.now() + n * 864e5);
const REASONS = ['Price', 'Went with another company', 'Timing - not now', 'No response', 'Decided not to do it', 'Other'];
export function mountPipeline(host, db, extra) {
  const SB = extra && extra.sb; let INSTANT = false;
  if (SB) SB.functions.invoke('ghl-action', { body: { ping: true } }).then(({ data }) => { INSTANT = !!(data && data.configured); if (openId && !ask) side(); }).catch(() => {});
  const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
  let ROOMS = null, HCPM = null, ACTS = [], ask = null, staleOnly = false, draftNote = { text: '', remind: '' };
  const roomUrl = (it) => { const u = ROOMS && ROOMS.rooms && it.hcpCus && ROOMS.rooms[it.hcpCus]; return u ? `${HCPINBOX}/groups/customers/chat_rooms/customers_channel_${u}_${ROOMS.org}` : ''; };
  const actOf = (id) => ACTS.filter(a => a.opp === id && a.status !== 'cancelled' && a.action !== 'note').sort((a, b) => String(b.at).localeCompare(String(a.at)))[0];
  const actTxt = (a) => a.action === 'move' ? 'Move to ' + a.stage : `${ACT[a.action] || a.action}${a.reason ? ' (' + a.reason + ')' : ''}`;
  let D = null, sel = (() => { try { return localStorage.getItem('hb-pipe') || 'estimates'; } catch (e) { return 'estimates'; } })(), q = '', hideEmpty = (() => { try { return localStorage.getItem('hb-pipe-hide') === '1'; } catch (e) { return false; } })(), loaded = false;
  root.innerHTML = `<style>${CSS}</style><div id="app"><div class="empty">Loading pipelines…</div></div>`;
  const app = root.getElementById('app');
  const key = (p) => String(p.name || '').trim().toLowerCase();
  const tot = (p) => ({ n: p.stages.reduce((a, s) => a + s.n, 0), v: p.stages.reduce((a, s) => a + s.value, 0) });
  // v9: a Move shows on the board right away (until the next hourly snapshot catches up)
  function applyMoves() { if (!D || !D.pipelines) return; const snapAt = Date.parse(D.at || 0) || 0;
    ACTS.filter(a => a.action === 'move' && (a.status === 'pending' || a.status === 'done') && Date.parse(a.at || 0) > snapAt).sort((a, b) => String(a.at).localeCompare(String(b.at))).forEach(a => {
      D.pipelines.forEach(p => { let it = null, from = null; p.stages.forEach(s => { const x = s.items.find(y => y.id === a.opp); if (x) { it = x; from = s; } }); const to = p.stages.find(s => s.name === a.stage);
        if (!it || !to || from === to) return; from.items = from.items.filter(y => y !== it); from.n = from.items.length; from.value = from.items.reduce((v, y) => v + (y.value || 0), 0);
        it.stage = to.name; it.since = a.at; to.items.unshift(it); to.n = to.items.length; to.value = to.items.reduce((v, y) => v + (y.value || 0), 0); }); }); }
  function draw() {
    if (!D || !D.pipelines || !D.pipelines.length) { app.innerHTML = `<div class="empty">${loaded ? 'No pipeline data yet - it fills in on the next hourly Go High Level sync.' : 'Loading pipelines…'}</div>`; return; }
    applyMoves();
    const P = D.pipelines; if (!P.some(p => key(p) === sel)) sel = key(P[0]);
    const p = P.find(x => key(x) === sel), pc = COL[sel] || 'var(--accent)';
    const at = D.at ? new Date(D.at).toLocaleString('en-CA', { timeZone: 'America/Vancouver', weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '';
    const f = q.trim().toLowerCase();
    const all = p.stages.flatMap(s => s.items); const nStale = all.filter(it => it.stale).length;
    const nudge = sel === 'estimates' ? { name: 'Needs a nudge', items: all.filter(it => it.nudge), nudge: 1 } : null; if (nudge) { nudge.n = nudge.items.length; nudge.value = nudge.items.reduce((a, x) => a + (x.value || 0), 0); }
    const stages = [...(nudge ? [nudge] : []), ...p.stages].filter(s => (!hideEmpty || s.n) && (!staleOnly || s.items.some(it => it.stale)));
    app.innerHTML = `<div class="head"><div><h2>Pipeline</h2><div class="sub">Go High Level · open opportunities · updated ${esc(at)}</div></div></div>
      <div class="pick">${P.map(x => { const t = tot(x); return `<button class="pk ${key(x) === sel ? 'on' : ''}" data-p="${esc(key(x))}" style="--pc:${COL[key(x)] || 'var(--accent)'}"><span class="l">${esc(x.name)}</span><b>${t.n}</b><span class="v">${t.v ? money(t.v) : 'open'}</span></button>`; }).join('')}</div>
      <div class="tools"><input id="q" placeholder="Find a name in ${esc(p.name)}…" value="${esc(q)}"><button class="fb ${staleOnly ? 'on' : ''}" id="so">Stale only (${nStale})</button><label><input type="checkbox" id="he" ${hideEmpty ? 'checked' : ''}> Hide empty stages</label></div>
      <div class="cols" style="--pc:${pc}">${stages.map(s => { const items = s.items.filter(it => (!f || (it.name + ' ' + it.contact).toLowerCase().includes(f)) && (!staleOnly || it.stale));
        return `<div class="col ${s.nudge ? 'nudge' : ''}"><div class="ch"><div><b>${s.nudge ? '☎ ' : ''}${esc(s.name)}</b>${s.value ? `<small>${money(s.value)}</small>` : ''}</div><span class="n">${f ? items.length + '/' : ''}${s.n}</span></div><div class="list">${items.length ? items.map(it => { const m = String(it.name || '').match(/^(.*?)\s*-\s*(?:Estimate|Job|Lead)?\s*#?(\d[\w-]*)$/i); const nm = m ? m[1] : (it.name || it.contact); const d = days(it.since);
          const nx = nextOf(it), stp = (it.auto || []).find(a => a.status === 'stopped');
          return `<div class="op" data-op="${esc(it.id)}"><div class="t">${esc(nm)}${m ? `<span class="num">#${esc(m[2])}</span>` : ''}${it.rebate ? '<span class="rb">REBATE</span>' : ''}${it.stale ? '<span class="sb">STALE</span>' : ''}</div><div class="m"><span>${esc(money(it.value) || (it.contact && it.contact !== nm ? it.contact : ''))}</span>${d != null ? `<span class="age ${d > 30 ? 'h' : d > 14 ? 'w' : ''}">${d ? d + ' d in stage' : 'today'}</span>` : ''}</div>${nx ? `<div class="nx ${nx.n.state === 'due' ? 'due' : ''}">${nx.n.state === 'due' ? 'Due' : 'Next'}: ${esc(nx.n.label.replace(/\s*-.*$/, ''))} · ${esc(fmt(nx.n.when))}</div>` : stp ? `<div class="nx stop">Follow-up stopped - ${esc(stp.why.replace(/\s\d{4}-.*$/, ''))}</div>` : ''}${s.nudge ? `<div class="ng">${esc(it.nudge)} · ${esc(it.stage)}</div>` : it.stale ? `<div class="sl">${esc(it.stale.why)}</div>` : ''}${(() => { const a = actOf(it.id); return a && a.status === 'pending' ? `<div class="qd">Queued: ${esc(actTxt(a))}</div>` : a && a.status === 'done' && Date.now() - Date.parse(a.doneAt || 0) < 6 * 36e5 ? `<div class="qd">✓ Done: ${esc(actTxt(a))}</div>` : ''; })()}</div>`; }).join('') : `<div class="none">${f ? 'No match' : 'None'}</div>`}</div></div>`; }).join('')}</div>`;
  }
  let openId = null;
  // v9 (Calvin 2026-11-27): panel redesign - header + status, quick-link tiles, 'Up next', action row incl. MOVE TO (any stage of the
  // same pipeline, runs in GHL via ghl-action), customer card, then collapsible sections (Messages closed by default) so it's never a wall of text.
  let openSec = new Set(['notes']);
  const STAGE_WARN = (kind, st) => kind === 'leads' && st === 'New Customer' ? 'This stage also creates the customer in Housecall Pro (Zapier).' : kind === 'estimates' && (st === 'Approved' || st === 'Rejected') ? 'Tip: Mark won / Mark lost also sets the status and stops the follow-ups - moving only changes the stage.' : kind === 'jobs' ? 'Job stages follow Housecall Pro - the next HCP change moves it again.' : kind === 'estimates' && /^(Sent|Follow-up)/.test(st) ? 'Follow-up stages also move forward on their own as the texts go out.' : '';
  function side() {
    root.querySelectorAll('.scrim,.side').forEach(x => x.remove()); if (!openId || !D) return;
    let it = null, kind = '', pipe = null; D.pipelines.forEach(p => p.stages.forEach(s => s.items.forEach(x => { if (x.id === openId) { it = x; kind = key(p); pipe = p; } })));
    if (!it) { openId = null; return; }
    const m = String(it.name || '').match(/^(.*?)\s*-\s*(?:Estimate|Job|Lead)?\s*#?(\d[\w-]*)$/i); const nm = m ? m[1] : (it.name || it.contact); const d = days(it.since);
    const icon = { sent: '✓', next: '●', later: '○', due: '!', stopped: '✕', done: '✓' };
    const autos = it.auto || [], nActive = autos.filter(a => a.status === 'active').length, stp = autos.find(a => a.status === 'stopped'), nx = nextOf(it);
    const wf = autos.map(a => `<div class="wf"><div class="wn">${esc(a.name)}</div><div class="ws ${a.status === 'stopped' ? 'red' : ''}"><span class="chip ${a.status === 'stopped' ? 'red' : ''}">${a.status === 'active' ? 'Active' : a.status === 'stopped' ? 'Stopped' : 'Done'}</span>${a.why ? ' ' + esc(a.why.replace(/(\d{4}-\d\d-\d\dT[\d:.]+Z)/, (z) => fmt(z))) : ''}${a.start ? ' · started ' + esc(fmt(a.start)) : ''}</div>${(a.steps || []).map(x => `<div class="st ${x.state}"><i>${icon[x.state] || '·'}</i><span>${esc(x.label)}${x.state === 'due' ? ' - time passed, not seen sent yet' : ''}</span><em>${esc(fmt(x.when))}</em></div>`).join('')}${a.basis ? `<small>${esc(a.basis)}</small>` : ''}</div>`).join('');
    const sum = String(it.summary || '').split(/\s*\|\s*/).filter(Boolean);
    const room = roomUrl(it), inbox = room || HCPINBOX;
    const hm = (HCPM && HCPM.msgs && Array.isArray(HCPM.msgs[it.hcpCus]) ? HCPM.msgs[it.hcpCus] : []).map(x => ({ ...x, sys: 'hcp', type: x.type === 'File' ? 'HCP file' : 'HCP text', src: '' }));
    const allMsgs = [...(it.msgs || []), ...hm].sort((a, b) => String(a.at).localeCompare(String(b.at))).slice(-20).reverse();
    const a0 = actOf(it.id), canAct = kind === 'estimates' || kind === 'leads', busy = a0 && a0.status === 'pending';
    const banners = [it.nudge ? `<div class="bn n"><b>☎ Needs a nudge</b>${esc(it.nudge)}</div>` : '', it.stale ? `<div class="bn s"><b>Stale: ${esc(it.stale.why)}</b>Next step: ${esc(it.stale.next)}</div>` : '',
      a0 ? (a0.status === 'pending' ? `<div class="bn q"><b>${INSTANT && !a0.slow ? 'Sending' : 'Queued'}: ${esc(actTxt(a0))}</b>${INSTANT && !a0.slow ? 'Updating Go High Level now…' : 'Runs on the next hourly Go High Level sync.'} <a href="#" data-cancel="${esc(a0._id)}">Cancel</a></div>` : a0.status === 'done' && Date.now() - Date.parse(a0.doneAt || 0) < 864e5 ? `<div class="bn ok2"><b>✓ Done: ${esc(actTxt(a0))}</b>${esc(fmt(a0.doneAt))}</div>` : a0.status === 'failed' ? `<div class="bn s"><b>Didn't go through: ${esc(actTxt(a0))}</b>${esc(a0.result || '')} - try again or do it in Go High Level.</div>` : '') : ''].join('');
    const okBox = ask && ask.id === it.id ? `<div class="ok"><b>${ask.action === 'move' ? 'Move ' + esc(nm) + ' to ' + esc(ask.stage) : esc(ACT[ask.action]) + ': ' + esc(nm)}?</b><div class="sub">${ask.action === 'won' ? 'Moves the card to Approved, marks it won and stops the follow-ups in Go High Level. Approve the option in Housecall Pro to book the job.' : ask.action === 'lost' ? 'Moves the card to Rejected, marks it lost and stops the follow-ups in Go High Level.' : ask.action === 'move' ? 'Moves the card from ' + esc(it.stage) + ' to ' + esc(ask.stage) + ' in Go High Level. ' + esc(STAGE_WARN(kind, ask.stage)) : 'Stops the follow-up texts and emails for this customer. The card stays where it is.'}</div>${ask.action === 'lost' ? `<select id="rs">${REASONS.map(r => `<option${ask.reason === r ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select>` : ''}<input id="nt" placeholder="Note (optional)" value="${esc(ask.note || '')}"><div class="row"><button class="go" data-go>OK, do it</button><button class="no" data-no>Cancel</button></div></div>` : '';
    const tiles = [it.hcp ? `<a class="tl hcp" href="${esc(it.hcp)}" target="_blank" rel="noopener"><i>🏠</i>Housecall Pro</a>` : '', `<a class="tl inb" href="${esc(inbox)}" target="_blank" rel="noopener"><i>💬</i>${room ? 'HCP chat' : 'HCP inbox'}</a>`, it.ghl ? `<a class="tl ghl" href="${esc(it.ghl)}" target="_blank" rel="noopener"><i>⚡</i>Go High Level</a>` : '', it.phone ? `<a class="tl" href="tel:${esc(it.phone)}"><i>📞</i>Call</a>` : ''].filter(Boolean).join('');
    const upNext = nx ? `<div class="up ${nx.n.state === 'due' ? 'due' : ''}"><span>${nx.n.state === 'due' ? 'Overdue' : 'Up next'}</span><b>${esc(nx.n.label)}</b><em>${esc(fmt(nx.n.when))}</em></div>` : stp ? `<div class="up stop"><span>Follow-up stopped</span><b>${esc(String(stp.why || '').replace(/\s\d{4}-.*$/, '') || 'stopped')}</b></div>` : '';
    const stagesHere = (pipe ? pipe.stages : []).map(s => s.name);
    const actRow = !busy && !okBox ? `<div class="card ac"><div class="ct">Actions</div>${canAct ? `<div class="acts"><button class="won" data-act="won">✓ Won</button><button class="lost" data-act="lost">✕ Lost</button>${autos.some(a => a.status === 'active' && /^estimates/i.test(a.name)) ? '<button data-act="pause">⏸ Pause</button>' : ''}</div>` : ''}<div class="mv"><span>Move to</span><div class="mvs">${stagesHere.map(s => `<button class="${s === it.stage ? 'here' : ''}" ${s === it.stage ? 'disabled' : `data-move="${esc(s)}"`}>${esc(s)}</button>`).join('')}</div></div></div>` : '';
    const cust = [it.phone ? `<div class="kr"><i>📞</i><a href="tel:${esc(it.phone)}">${esc(it.phone)}</a></div>` : '', it.email ? `<div class="kr"><i>✉️</i><a href="mailto:${esc(it.email)}">${esc(it.email)}</a></div>` : '', it.address ? `<div class="kr"><i>📍</i><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.address)}" target="_blank" rel="noopener">${esc(it.address)}</a></div>` : '', it.scheduled ? `<div class="kr"><i>📅</i><b>${esc(it.scheduled)}</b></div>` : '', it.source ? `<div class="kr"><i>🔎</i><span>Source: ${esc(it.source)}</span></div>` : ''].join('');
    const myNotes = ACTS.filter(a => a.opp === it.id && a.action === 'note').sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const sec = (id, ic, title, sub, body) => `<details class="sx" data-sec="${id}"${openSec.has(id) ? ' open' : ''}><summary><i>${ic}</i><span class="tt">${title}</span><span class="sb2">${sub}</span><span class="cv">›</span></summary><div class="sxb">${body}</div></details>`;
    const last = allMsgs[0];
    const msgBody = (it.conv ? `<a class="sm2" href="${esc(it.conv)}" target="_blank" rel="noopener">Full Go High Level conversation ›</a>` : '') + (allMsgs.length ? allMsgs.map(x => { const hcpMsg = x.sys === 'hcp'; const href = hcpMsg ? inbox : (it.conv || it.ghl || ''); return `<a class="msg ${x.dir === 'inbound' ? 'in' : 'out'}" href="${esc(href)}" target="_blank" rel="noopener"><div class="mh"><span>${x.dir === 'inbound' ? '← From them' : '→ ' + (x.sys === 'hcp' && x.who ? esc(x.who.split(' ')[0]) : 'Sent')}${x.src === 'workflow' ? '<span class="au">AUTO</span>' : ''}</span><span class="go ${hcpMsg ? 'h' : 'g'}">${hcpMsg ? 'HCP' : 'GHL'} ›</span></div><div class="mt">${esc(x.text)}</div><em>${esc(x.type)} · ${esc(fmt(x.at))}</em></a>`; }).join('') : `<div class="none">No texts or emails in Go High Level or the Housecall Pro inbox. <a href="${esc(inbox)}" target="_blank" rel="noopener">Open the HCP inbox ›</a></div>`);
    const noteBody = myNotes.map(a => `<div class="myn">${esc(a.note)}<em>${esc(fmt(a.at))}${a.remindOn ? ' · reminder ' + esc(a.remindOn) : ''}${a.status === 'done' ? ' · in Go High Level' : ''}</em></div>`).join('') + `<div class="nf"><textarea id="nte" placeholder="e.g. She messaged - getting back to me after the holidays">${esc(draftNote.text)}</textarea>
        <div class="rr"><span>Remind me</span><button class="q" data-rq="1">Tomorrow</button><button class="q" data-rq="3">3 days</button><button class="q" data-rq="7">1 week</button><button class="q" data-rq="14">2 weeks</button><input type="date" id="nrd" value="${esc(draftNote.remind)}"></div><div class="rr"><span class="sub" id="nmsg"></span><button class="sv" data-savenote>Save note</button></div></div>`;
    const el = document.createElement('div'); el.innerHTML = `<div class="scrim" data-close></div><aside class="side" role="dialog" aria-label="${esc(nm)}"><button class="x" data-close aria-label="Close">✕</button>
      <div class="hd2"><h3>${esc(nm)}</h3><div class="meta">${it.number ? `<span class="chip">${esc(it.number)}</span>` : ''}<span class="chip stg">${esc(it.stage)}</span>${it.value ? `<span class="chip val">${money(it.value)}</span>` : ''}${it.rebate ? '<span class="rb">REBATE</span>' : ''}${it.stale ? '<span class="sb">STALE</span>' : ''}${d != null ? `<span class="age2">${d ? d + ' days in stage' : 'moved today'}</span>` : ''}</div></div>
      ${banners}${okBox}
      <div class="tiles">${tiles}</div>
      ${upNext}
      ${actRow}
      ${cust || sum.length ? `<div class="card"><div class="ct">Customer</div>${cust}${sum.length ? `<ul class="sum">${sum.map(z => `<li>${esc(z)}</li>`).join('')}</ul>` : ''}</div>` : ''}
      ${sec('msgs', '💬', 'Messages', allMsgs.length ? `${allMsgs.length} · last ${esc(fmt(last.at, { weekday: undefined }))} ${last.dir === 'inbound' ? 'from them' : 'sent'}` : 'none', msgBody)}
      ${sec('notes', '📝', 'My notes', myNotes.length ? myNotes.length + ' · add a note or reminder' : 'add a note or reminder', noteBody)}
      ${sec('auto', '⚙️', 'Automations', autos.length ? (nActive ? nActive + ' active' : stp ? 'stopped' : 'done') + (nx ? ' · next ' + esc(fmt(nx.n.when, { weekday: undefined, hour: undefined, minute: undefined })) : '') : 'none', wf || '<div class="none">Not in any follow-up automation right now.</div>')}
      ${(it.forms || []).length ? sec('form', '🌐', 'Website form', it.forms.length + '', it.forms.map(f => `<div class="note">${esc(fmt(f.at))}\n${esc(f.answers.join('\n'))}</div>`).join('')) : ''}
      ${sec('ghln', '🗒️', 'Go High Level notes', (it.notes || []).length + '', (it.notes || []).length ? it.notes.map(n => `<div class="note">${esc(fmt(n.at))}\n${esc(n.body)}</div>`).join('') : '<div class="none">No notes.</div>')}
      ${sec('tags', '🏷️', 'Tags', (it.tags || []).length + '', `<div class="tgs">${(it.tags || []).map(t => `<span class="chip">${esc(t)}</span>`).join('') || '<span class="none">none</span>'}</div>`)}
      </aside>`;
    const sc = root.querySelector('.side'); const top = sc ? sc.scrollTop : 0;
    while (el.firstChild) root.appendChild(el.firstChild);
    const ns = root.querySelector('.side'); if (ns && top) ns.scrollTop = top;
  }
  const findIt = (id) => { let it = null; (D ? D.pipelines : []).forEach(p => p.stages.forEach(s => s.items.forEach(x => { if (x.id === id) it = x; }))); return it; };
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { openId = null; ask = null; side(); return; }
    const rq = e.target.closest('[data-rq]'); if (rq) { const t = root.getElementById('nte'); draftNote = { text: t ? t.value : '', remind: addDays(+rq.dataset.rq) }; const d = root.getElementById('nrd'); if (d) d.value = draftNote.remind; return; }
    const sn = e.target.closest('[data-savenote]'); if (sn) { const it = findIt(openId); const t = root.getElementById('nte'), d = root.getElementById('nrd'), msg = root.getElementById('nmsg'); const text = t ? t.value.trim() : '', remindOn = d ? d.value : '';
      if (!text) { if (msg) msg.textContent = 'Type a note first.'; return; } sn.disabled = true; const at = new Date().toISOString(); const nm = String(it.name || '').replace(/\s*-\s*(Estimate|Job|Lead)?\s*#?\d[\w-]*$/i, '') || it.contact;
      const rec = { opp: it.id, contact: it.contactId || '', name: it.name, action: 'note', note: text, remindOn, at, by: 'Calvin', status: 'pending' };
      (async () => { try { const { id } = await db.collection('pipeactions').add(rec);
        if (remindOn) { const cid = 'pipe-' + it.id, cur = await db.doc('cards/' + cid).get(); const m = { at, from: 'calvin', text: text + ' (reminder ' + remindOn + ')' };
          if (cur.exists) { const c = cur.data(); await db.doc('cards/' + cid).update({ remindOn, column: 'waiting', nextStep: 'Reconnect with ' + nm.split(' ')[0], summary: text, updated: at, msgs: [...(c.msgs || []), m].slice(-30) }); }
          else await db.doc('cards/' + cid).set({ title: 'Follow up: ' + nm, job: it.name, customer: nm, summary: text, detail: 'From your note on the Pipeline (' + it.stage + ').', nextStep: 'Reconnect with ' + nm.split(' ')[0], remindOn, column: 'waiting', source: 'pipeline', link: '#/pipeline', priority: 'normal', needsClaude: false, created: at, updated: at, msgs: [m] }); }
        if (SB) SB.functions.invoke('ghl-action', { body: { id } }).catch(() => {});
        draftNote = { text: '', remind: '' }; side(); const m2 = root.getElementById('nmsg'); if (m2) m2.textContent = remindOn ? 'Saved. Reminder on your board for ' + remindOn + '.' : 'Saved.';
      } catch (err) { sn.disabled = false; if (msg) msg.textContent = "Couldn't save: " + err.message; } })(); return; }
    const mv = e.target.closest('[data-move]'); if (mv) { ask = { id: openId, action: 'move', stage: mv.dataset.move }; side(); const s2 = root.querySelector('.side'); if (s2) s2.scrollTop = 0; return; }
    const ac = e.target.closest('[data-act]'); if (ac) { ask = { id: openId, action: ac.dataset.act, reason: REASONS[0] }; side(); return; }
    if (e.target.closest('[data-no]')) { ask = null; side(); return; }
    if (e.target.closest('[data-go]') && ask) { const it = findIt(ask.id); const rs = root.getElementById('rs'), nt = root.getElementById('nt');
      const rec = { opp: it.id, contact: it.contactId || '', name: it.name, action: ask.action, reason: ask.action === 'lost' ? (rs ? rs.value : '') : '', note: nt ? nt.value.trim() : '', at: new Date().toISOString(), by: 'Calvin', status: 'pending', ...(ask.action === 'move' ? { stage: ask.stage, from: it.stage } : {}) };
      ask = null; ACTS.push({ ...rec, _id: 'tmp' }); side(); draw();
      db.collection('pipeactions').add(rec).then(({ id }) => { if (!SB) return; return SB.functions.invoke('ghl-action', { body: { id } }).then(({ error }) => { if (error) { const a = ACTS.find(x => x._id === id); if (a) a.slow = true; side(); } }); }).catch((err) => { ACTS = ACTS.filter(a => a._id !== 'tmp'); alert("Couldn't queue it: " + err.message); side(); draw(); }); return; }
    const cx = e.target.closest('[data-cancel]'); if (cx) { e.preventDefault(); if (cx.dataset.cancel !== 'tmp') db.doc('pipeactions/' + cx.dataset.cancel).update({ status: 'cancelled' }).catch(() => {}); return; }
    const o = e.target.closest('[data-op]'); if (o) { openId = o.dataset.op; ask = null; draftNote = { text: '', remind: '' }; side(); } });
  root.addEventListener('toggle', (e) => { const dd = e.target; if (dd && dd.dataset && dd.dataset.sec) { if (dd.open) openSec.add(dd.dataset.sec); else openSec.delete(dd.dataset.sec); } }, true);
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openId) { openId = null; ask = null; side(); } });
  app.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) { sel = b.dataset.p; q = ''; try { localStorage.setItem('hb-pipe', sel); } catch (x) {} draw(); } });
  app.addEventListener('input', (e) => { if (e.target.id === 'q') { q = e.target.value; const pos = e.target.selectionStart; draw(); const qi = root.getElementById('q'); if (qi) { qi.focus(); qi.setSelectionRange(pos, pos); } } });
  root.addEventListener('input', (e) => { if (e.target.id === 'nte') draftNote.text = e.target.value; if (e.target.id === 'nrd') draftNote.remind = e.target.value; });
  app.addEventListener('click', (e) => { if (e.target.id === 'so') { staleOnly = !staleOnly; draw(); } });
  app.addEventListener('change', (e) => { if (e.target.id === 'he') { hideEmpty = e.target.checked; try { localStorage.setItem('hb-pipe-hide', hideEmpty ? '1' : '0'); } catch (x) {} draw(); } });
  const off = db.doc('board/pipelines').onSnapshot((s) => { loaded = true; D = s.exists ? s.data() : null; draw(); if (openId) side(); }, () => { loaded = true; draw(); });
  const off4 = db.doc('board/hcp_msgs').onSnapshot((s) => { HCPM = s.exists ? s.data() : null; if (openId && !ask) side(); }, () => {});
  window.hqHcpPlan = () => { const ids = new Set(); (D ? D.pipelines : []).forEach(p => p.stages.forEach(s => s.items.forEach(x => { if (x.hcpCus) ids.add(x.hcpCus); })));
    const need = {}; ids.forEach(c => { const m = HCPM && HCPM.msgs && HCPM.msgs[c]; need[c.replace('cus_', '')] = Array.isArray(m) ? (m.length ? m.map(x => x.at).sort().pop() : (HCPM.at || '')) : ''; });
    window.name = 'HQPLAN:' + JSON.stringify({ need }); return Object.keys(need).length + ' customers planned'; };
  window.hqHcpIngest = async () => { if (!String(window.name).startsWith('HQHCP:')) return 'nothing to ingest'; let x; try { x = JSON.parse(window.name.slice(6)); } catch (e) { window.name = ''; return 'bad data'; }
    window.name = ''; const cur = (await db.doc('board/hcp_msgs').get()).data() || { msgs: {} }; let n = 0;
    for (const [c, m] of Object.entries(x.msgs || {})) if (/^cus_[0-9a-f]{32}$/.test(c) && Array.isArray(m)) { cur.msgs[c] = m.slice(-12).map(v => ({ at: String(v.at || ''), dir: v.dir === 'inbound' ? 'inbound' : 'outbound', who: String(v.who || '').slice(0, 40), type: v.type === 'File' ? 'File' : 'Text', text: String(v.text || '').slice(0, 200) })); n++; }
    cur.at = x.at || new Date().toISOString(); await db.doc('board/hcp_msgs').set(cur);
    let r = 0; if (x.rooms && Object.keys(x.rooms).length) { const cr = (await db.doc('board/hcp_rooms').get()).data() || { org: x.org, rooms: {} }; for (const [c, u] of Object.entries(x.rooms)) if (/^cus_[0-9a-f]{32}$/.test(c) && /^usr_[0-9a-f]{32}$/.test(u) && cr.rooms[c] !== u) { cr.rooms[c] = u; r++; } if (x.org && /^[0-9a-f-]{36}$/.test(x.org)) cr.org = x.org; if (r) await db.doc('board/hcp_rooms').set(cr); }
    let sc = 'none', vs = 0;
    if (x.sched && Array.isArray(x.sched.items)) { await db.doc('board/schedule').set({ at: x.at || new Date().toISOString(), from: x.sched.from, to: x.sched.to, pros: x.sched.pros || {}, items: x.sched.items.slice(0, 500) }); sc = x.sched.items.length;
      const byRef = {}; x.sched.items.forEach(i => { if (/^(job|est)/.test(i.ref)) (byRef[i.ref] = byRef[i.ref] || []).push(i); });
      for (const c of [...new Set(x.sched.items.map(i => i.cus).filter(v => /^cus_[0-9a-f]{32}$/.test(v)))]) { const sn = await db.doc('customers/' + c).get(); if (!sn.exists) continue; const d = sn.data(); let ch = false;
        const visits = (d.visits || []).map(v => { if (!v || !v.uuid || !['scheduled', 'future'].includes(v.status) || !byRef[v.uuid]) return v; const it = byRef[v.uuid].slice().sort((a, b) => String(a.start).localeCompare(String(b.start)))[0]; if (!it.start) return v;
          const nd = ptDate(it.start), nt = it.anytime ? 'Anytime' : ptTime(it.start) + '-' + ptTime(it.end || it.start); if (v.date === nd && v.time === nt) return v; ch = true; return { ...v, date: nd, time: nt, hcpSync: new Date().toISOString(), prevWhen: (v.date || '') + ' ' + (v.time || '') }; });
        if (ch) { await db.doc('customers/' + c).update({ visits }); vs++; } } }
    return `ingested texts for ${n} customers, ${r} new room links, schedule ${sc} items, ${vs} customer visit times updated`; };
  const off2 = db.doc('board/hcp_rooms').onSnapshot((s) => { ROOMS = s.exists ? s.data() : null; if (openId) side(); }, () => {});
  const off3 = db.collection('pipeactions').onSnapshot((snap) => { ACTS = snap.docs.map(d => ({ ...d.data(), _id: d.id })); draw(); if (openId && !ask) side(); }, () => {});
  return () => { [off, off2, off3, off4].forEach(f => { try { f && f(); } catch (e) {} }); delete window.hqHcpPlan; delete window.hqHcpIngest; root.innerHTML = ''; };
}
