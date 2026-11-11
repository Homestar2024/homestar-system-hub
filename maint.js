// Homestar System Hub - Maintenance (v0.19, Calvin 2026-11-10: moved into the Hub app from board.html; same code and look as the board's Maintenance tab v56 + build patches 0.16.2-0.16.6)
// mountMaint(host, db) renders into a shadow root on host (styles stay separate) and returns a cleanup function.
// db = the Hub's board_docs adapter (boarddb.js): collection('customers').onSnapshot, doc('meta/info').onSnapshot, doc('customers/<id>').update(patch).
const TPL = "<style>\n:host{display:block;--panel:var(--surface);--brand-ink:var(--accent-ink);--star:var(--brand2);--star-soft:color-mix(in srgb,var(--brand2) 14%,var(--surface));--over:var(--hot);--over-soft:color-mix(in srgb,var(--hot) 12%,var(--surface));--soon:var(--warn);--soon-soft:color-mix(in srgb,var(--warn) 14%,var(--surface));--ok-soft:color-mix(in srgb,var(--ok) 14%,var(--surface));--info-soft:color-mix(in srgb,var(--brand) 12%,var(--surface));--r:10px;color:var(--ink);font-family:var(--body);font-size:15px;line-height:1.45}\n[hidden]{display:none!important}\n.wrap{padding-left:12px;padding-right:12px}\n\n/* Layout: sticky brand bar + search; dashboard tiles over a date-grouped due list; desktop splits list | profile, phone stacks */\n*{box-sizing:border-box}\n.wrap{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}\nheader{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);margin-top:4px}\n.bar{display:flex;align-items:center;gap:12px;padding-block:10px;flex-wrap:wrap}\n.search{flex:1 1 260px;min-width:0;display:flex}\n.search input{width:100%;font:inherit;padding:9px 12px;border:1px solid var(--line);border-radius:999px;background:var(--bg);color:var(--ink)}\n.search input:focus{outline:2px solid var(--brand);outline-offset:1px}\nnav.tabs{display:flex;gap:4px;padding-bottom:8px;overflow-x:auto}\nnav.tabs button{font:inherit;font-weight:500;border:0;background:none;color:var(--muted);padding:7px 12px;border-radius:999px;cursor:pointer;white-space:nowrap}\nnav.tabs button[aria-selected=\"true\"]{background:var(--info-soft);color:var(--brand)}\nnav.tabs button:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid var(--brand);outline-offset:2px}\nmain{padding-block:16px 40px}\n.split{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}\n@media (min-width:980px){.split.has-detail{grid-template-columns:minmax(0,1fr) minmax(0,1.15fr)}}\n.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px}\n.tile{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px;cursor:pointer;text-align:left;font:inherit;color:inherit}\n.tile .n{font-family:var(--display);font-size:30px;line-height:1;font-variant-numeric:tabular-nums}\n.tile .l{color:var(--muted);font-size:13px;margin-top:4px}\n.tile.over .n{color:var(--over)} .tile.soon .n{color:var(--soon)} .tile.sch .n{color:var(--ok)} .tile.later .n{color:var(--brand)}\n.group{margin-bottom:18px}\n.group h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 6px;display:flex;justify-content:space-between;align-items:center}\n.list{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}\n.row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px;border-top:1px solid var(--line);cursor:pointer;background:none;border-left:0;border-right:0;border-bottom:0;width:100%;text-align:left;font:inherit;color:inherit}\n.row:first-child{border-top:0}\n.row:hover{background:var(--info-soft)}\n.row[aria-current=\"true\"]{background:var(--info-soft)}\n.date{font-variant-numeric:tabular-nums;font-weight:600;min-width:84px;font-size:14px}\n.date small{display:block;font-weight:400;color:var(--muted);font-size:12px}\n.who{min-width:0}\n.who b{display:block;white-space:normal;overflow-wrap:anywhere}\n.st{display:flex;flex-direction:column;align-items:flex-end;gap:4px}.chip2{display:inline-flex!important;flex-direction:column;align-items:center;line-height:1.15;padding:3px 9px!important;border-radius:10px!important;text-align:center}.chip2 b{font-weight:700}.chip2 small{font-size:10.5px;opacity:.9}\n.who span{color:var(--muted);font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.chip{display:inline-block;font-size:12px;font-weight:500;padding:2px 8px;border-radius:999px;white-space:nowrap}\n.c-over{background:var(--over-soft);color:var(--over)} .c-soon{background:var(--soon-soft);color:var(--soon)} .c-ok{background:var(--ok-soft);color:var(--ok)} .c-info{background:var(--info-soft);color:var(--brand)} .c-star{background:var(--star-soft);color:var(--star)} .c-mute{background:var(--bg);color:var(--muted);border:1px solid var(--line)}\n.more{font:inherit;border:0;background:none;color:var(--brand);cursor:pointer;padding:8px 12px}\n.empty{background:var(--panel);border:1px dashed var(--line);border-radius:var(--r);padding:24px;color:var(--muted)}\n/* profile */\n.detail{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:16px;min-width:0;align-self:start}\n@media (min-width:980px){.detail{position:sticky;top:calc(env(safe-area-inset-top,0px) + 120px);max-height:calc(100vh - 140px);overflow:auto}}\n.back{font:inherit;border:0;background:none;color:var(--brand);cursor:pointer;padding:0 0 8px}\n@media (min-width:980px){.back{display:none}}\n.detail h1{font-family:var(--display);font-size:24px;margin:0 0 4px;text-wrap:balance}\n.meta{color:var(--muted);font-size:14px}\n.chips{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 4px}\n.sec{border-top:1px solid var(--line);margin-top:14px;padding-top:12px}\n.sec h3{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 8px;display:flex;justify-content:space-between;align-items:center;gap:8px}\n.kv{display:grid;grid-template-columns:110px minmax(0,1fr);gap:6px 12px;font-size:14px}\n.kv dt{color:var(--muted)} .kv dd{margin:0;min-width:0;overflow-wrap:anywhere}\n.contact a{color:var(--brand);text-decoration:none}\n.copy{font:inherit;font-size:12px;border:1px solid var(--line);background:var(--bg);color:var(--muted);border-radius:6px;padding:1px 7px;margin-left:6px;cursor:pointer}\n.eq{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}\n.card{border:1px solid var(--line);border-radius:8px;padding:10px;font-size:14px;min-width:0}\n.card b{display:block}\n.mono{font-family:var(--mono);font-size:13px;overflow-wrap:anywhere}\n.tl{list-style:none;margin:0;padding:0}\n.tl li{display:grid;grid-template-columns:96px minmax(0,1fr);gap:10px;padding:8px 0;border-top:1px dashed var(--line);font-size:14px}\n.tl li:first-child{border-top:0}\n.tl a{color:var(--brand)}\n.flag{border-left:3px solid var(--star);background:var(--star-soft);border-radius:0 8px 8px 0;padding:8px 10px;margin:6px 0;font-size:14px}\n.flag.check{border-left-color:var(--brand);background:var(--info-soft)}\n.flag.done{border-left-color:var(--line);background:transparent;color:var(--muted)}\n.flag .fm{font-size:12px;color:var(--muted);margin-top:2px}\n.flag .fm a{color:var(--brand)}\n.flag .fa{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}\n.wt{width:100%;border-collapse:collapse;font-size:14px}\n.wt td{padding:6px 6px 6px 0;border-top:1px dashed var(--line);vertical-align:top}\n.wt tr:first-child td{border-top:0}\n.wt td:first-child{color:var(--muted);width:96px}\n.certs a{display:inline-block;margin:2px 8px 2px 0;color:var(--brand);font-size:13px}\ndetails.donef summary{cursor:pointer;color:var(--muted);font-size:13px;margin-top:6px}\ntextarea,input.f,select.f{width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)}\ntextarea{min-height:90px;resize:vertical}\n.btn{font:inherit;font-weight:500;border:1px solid var(--brand);background:var(--brand);color:var(--brand-ink);border-radius:8px;padding:7px 12px;cursor:pointer}\n.btn.ghost{background:none;color:var(--brand)}\n.btn:disabled{opacity:.5;cursor:default}\n.formgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:8px}\n.formgrid label{font-size:12px;color:var(--muted);display:grid;gap:3px}\n.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));background:var(--ink);color:var(--bg);padding:8px 14px;border-radius:999px;font-size:14px;z-index:20}\ntable.t{width:100%;border-collapse:collapse;font-size:14px}\ntable.t th,table.t td{text-align:left;padding:8px 10px;border-top:1px solid var(--line);vertical-align:top}\ntable.t th{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;border-top:0}\n.tablewrap{overflow-x:auto;background:var(--panel);border:1px solid var(--line);border-radius:var(--r)}\n.foot{color:var(--muted);font-size:12px;margin-top:20px}\n.filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}\n.filters button{font:inherit;font-size:13px;border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:999px;padding:4px 10px;cursor:pointer}\n.filters button[aria-pressed=\"true\"]{border-color:var(--brand);color:var(--brand);background:var(--info-soft)}\n@media (prefers-reduced-motion:no-preference){.row,.tile{transition:background .12s}}\n\n/* v27 (Calvin 2026-10-21): make every section distinct - each profile section is its own tinted panel with a colour bar and a bold coloured heading */\n.detail{border-top:4px solid var(--brand);padding:18px}\n.detail h1{font-size:28px;color:var(--ink)}\n.detail>.meta{font-size:15px}\n.sec{--sc:var(--brand);border:1px solid color-mix(in srgb,var(--sc) 35%,var(--line));border-left:5px solid var(--sc);border-top:1px solid color-mix(in srgb,var(--sc) 35%,var(--line));background:color-mix(in srgb,var(--sc) 7%,var(--panel));border-radius:10px;margin-top:14px;padding:12px 14px}\n.sec h3{font-family:var(--display);font-size:17px;font-weight:700;letter-spacing:.03em;color:var(--sc);margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid color-mix(in srgb,var(--sc) 30%,transparent)}\n.s-contact{--sc:var(--l-todo)} .s-maint{--sc:var(--l-done)} .s-eq{--sc:var(--l-doing)} .s-hist{--sc:var(--l-emails)} .s-warr{--sc:var(--brand2)} .s-flag{--sc:var(--hot)} .s-book{--sc:var(--l-waiting)} .s-notes{--sc:var(--muted)}\n.kv{font-size:15px;gap:8px 14px}\n.kv dt{color:var(--muted);font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:.04em;padding-top:2px}\n.kv dd{font-weight:500}\n.card{background:var(--panel);border-color:color-mix(in srgb,var(--sc,var(--brand)) 30%,var(--line));border-left:3px solid var(--sc,var(--brand))}\n.card b{font-family:var(--display);font-size:16px;color:var(--ink);margin-bottom:2px}\n.tl li{border-top:1px solid color-mix(in srgb,var(--sc,var(--line)) 25%,var(--line))}\n.tl li b{color:var(--sc,var(--ink));font-family:var(--display);font-size:16px}\n.wt td{border-top:1px solid color-mix(in srgb,var(--sc,var(--line)) 25%,var(--line))}\n.wt td:first-child{font-weight:600;text-transform:uppercase;font-size:12px;letter-spacing:.04em;padding-top:8px}\n.flag{background:var(--panel)}\n/* lists and tabs */\n.group h2{font-family:var(--display);font-size:16px;letter-spacing:.03em;color:var(--ink);text-transform:none;border-left:4px solid var(--brand);padding:2px 0 2px 10px;margin-bottom:8px}\n.group h2 span:last-child{font-family:var(--mono);font-size:13px;background:var(--info-soft);color:var(--brand);border-radius:999px;padding:1px 9px}\n#g-over h2{border-left-color:var(--over)} #g-soon h2{border-left-color:var(--soon)} #g-sch h2{border-left-color:var(--ok)}\n.tile{border-top:4px solid var(--brand)} .tile.over{border-top-color:var(--over)} .tile.soon{border-top-color:var(--soon)} .tile.sch{border-top-color:var(--ok)}\n.tile .l{font-weight:600}\n.who b{font-weight:600;font-size:15px}\nnav.tabs button{font-family:var(--display);font-weight:600;font-size:15px}\nnav.tabs button[aria-selected=\"true\"]{background:var(--brand);color:var(--brand-ink)}\n\n.hn{white-space:pre-wrap;word-break:break-word}\n/* collapsible customer sections (Calvin 2026-11-03) */\n.sec>h3:first-child{cursor:pointer;user-select:none;-webkit-user-select:none;display:flex;align-items:center;justify-content:flex-start;gap:8px}\n.sec>h3:first-child>button{margin-left:auto}\n.sec>h3:first-child::before{content:\"\";flex:0 0 auto;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid currentColor;border-bottom:0}\n.sec.closed>h3:first-child::before{border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:8px solid currentColor;border-right:0}\n.sec.closed>:not(:first-child){display:none!important}\n.sec.closed>h3:first-child{margin-bottom:0;padding-bottom:0;border-bottom:0}\n.sec.closed{padding-top:10px;padding-bottom:10px}\n.secall{margin-top:10px}\n</style>\n<header>\n  <div class=\"wrap\">\n    <div class=\"bar\">\n      <div class=\"search\"><input id=\"q\" type=\"search\" placeholder=\"Search name, phone, address, serial\" autocomplete=\"off\" aria-label=\"Search customers\"></div>\n    </div>\n    <nav class=\"tabs\" role=\"tablist\">\n      <button role=\"tab\" id=\"t-due\" aria-selected=\"true\" data-tab=\"due\">Upcoming</button>\n      <button role=\"tab\" id=\"t-past\" aria-selected=\"false\" data-tab=\"past\">Past maintenances</button>\n      <button role=\"tab\" id=\"t-cust\" aria-selected=\"false\" data-tab=\"cust\">Customers</button>\n      <button role=\"tab\" id=\"t-book\" aria-selected=\"false\" data-tab=\"book\">Booking</button>\n      <button role=\"tab\" id=\"t-warr\" aria-selected=\"false\" data-tab=\"warr\">Warranty</button>\n      <button role=\"tab\" id=\"t-filt\" aria-selected=\"false\" data-tab=\"filt\">Filter prep</button>\n      <button role=\"tab\" id=\"t-gaps\" aria-selected=\"false\" data-tab=\"gaps\">Data gaps</button>\n    </nav>\n  </div>\n</header>\n\n<main>\n  <div class=\"split\" id=\"split\">\n    <section id=\"left\" aria-live=\"polite\">\n      <div class=\"empty\" id=\"loading\">Loading customers\u2026 Each customer with heating or cooling equipment will appear here with their next maintenance date.</div>\n    </section>\n    <aside class=\"detail\" id=\"detail\" hidden></aside>\n  </div>\n  <div class=\"foot\" id=\"foot\"></div>\n</main>\n<div class=\"toast\" id=\"toast\" hidden></div>\n\n";
export function mountMaint(host, db) {
const R = host.shadowRoot || host.attachShadow({ mode: 'open' });
R.innerHTML = TPL;
const offs = [];

const TODAY=new Date(); TODAY.setHours(0,0,0,0);
const HCP_JOB="https://pro.housecallpro.com/app/jobs/";
const S={rows:[],meta:null,tab:"due",q:"",sel:null,custFilter:"all",custSort:"name",db:null,canWrite:true,showLater:false};
const $=s=>R.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pd=s=>{if(!s)return null;const [y,m,d]=s.slice(0,10).split("-").map(Number);return new Date(y,m-1,d)};
const days=s=>{const d=pd(s);return d?Math.round((d-TODAY)/864e5):null};
const fmt=s=>{const d=pd(s);return d?d.toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"}):"—"};
const fmtShort=s=>{const d=pd(s);return d?d.toLocaleDateString("en-CA",{month:"short",day:"numeric"}):"—"};
const yr=s=>{const d=pd(s);return d?d.getFullYear():""};
function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>el.hidden=true,2200)}
const pacToday=()=>new Date().toLocaleDateString("en-CA",{timeZone:"America/Vancouver"});
const safeHref=u=>typeof u==="string"&&/^https:\/\//i.test(u)?u:"#";
function due(r){return r.nextDueOverride||r.nextDue||null}
function upcomingVisit(r){return (r.visits||[]).find(v=>["scheduled","future"].includes(v.status)&&days(v.date)>=0)}
function bucket(r){
  const sv=upcomingVisit(r); if(sv) return "sch";
  const d=days(due(r)); if(d==null) return "none";
  if(d<0) return "over"; if(d<=30) return "soon"; if(d<=90) return "next"; return "later";
}
function statusChip(r){
  const sv=upcomingVisit(r);
  if(sv) return `<span class="chip c-ok chip2"><b>Booked</b><small>${fmtShort(sv.date)}</small></span>`;
  if(r.outreach&&r.outreach.status){const st=String(r.outreach.status);if(/draft/i.test(st))return `<span class="chip c-info" title="${esc(st)}">Drafted</span>`;const sh=st.split(/\s[-(·]|\(/)[0].trim();return `<span class="chip c-info" title="${esc(st)}">${esc(sh.length>16?sh.slice(0,15)+"…":sh)}</span>`}
  const d=days(due(r)); if(d==null) return `<span class="chip c-mute">No date</span>`;
  if(d<0) return `<span class="chip c-over chip2"><b>${-d} days</b><small>overdue</small></span>`;
  if(d<=30) return `<span class="chip c-soon chip2"><b>${d} days</b><small>until due</small></span>`;
  return `<span class="chip c-mute chip2"><b>${d} days</b><small>until due</small></span>`;
}
/* Program rule (Calvin 2026-10-21): a customer is "on a program" only while a program is ACTIVE (programDetail expires today or later). Expired programs still show on the profile, marked expired; programs with no expiry on file show 'expiry not on file' and do not count. */
function progInfo(r){const pd=r.programDetail||[];return (r.programs||[]).map(n=>{const d=pd.find(p=>p.name===n)||null;const ex=d&&d.expires?d.expires:null;return {name:n,expires:ex,active:!!ex&&days(ex)>=0}}).concat(pd.filter(p=>!(r.programs||[]).includes(p.name)).map(p=>({name:p.name,expires:p.expires||null,active:!!p.expires&&days(p.expires)>=0})))}
function activeProgs(r){return progInfo(r).filter(p=>p.active).map(p=>p.name)}
function progChips(r){return progInfo(r).map(p=>p.active?`<span class="chip ${/worry/i.test(p.name)?"c-star":"c-info"}">${esc(p.name)}</span>`:`<span class="chip c-mute">${esc(p.name)} · ${p.expires?"expired "+esc(fmt(p.expires)):"expiry not on file"}</span>`).join("")}
const ONEDRIVE="https://homestarhvacsolutions-my.sharepoint.com";
function openFlags(r){return (r.flags||[]).filter(f=>f.status!=="done")}
function yl(s){const d=days(s);return d==null?null:d/365.25}
function leftChip(s){const y=yl(s);if(y==null)return "";if(y<0)return `<span class="chip c-mute">Expired</span>`;const t=y<1?`${Math.max(1,Math.round(y*12))} mo left`:`${y.toFixed(1)} yrs left`;return `<span class="chip ${y<1?"c-over":y<2?"c-soon":"c-ok"}">${t}</span>`}
function wList(r){const w=r.warranty||{},a=[];if(w.parts&&w.parts.expires)a.push({k:"Parts",...w.parts});if(w.labour&&w.labour.expires&&!/homestar standard/i.test(w.labour.kind||""))a.push({k:"Labour",...w.labour});(r.programDetail||[]).forEach(p=>{if(p.expires&&/worry/i.test(p.name))a.push({k:p.name,...p})});return a}
function wNext(r){const a=wList(r).filter(x=>days(x.expires)>=0);a.sort((x,y)=>x.expires.localeCompare(y.expires));return a[0]||null}
function flagChip(r){const n=openFlags(r).length;return n?`<span class="chip c-star">${n} to raise</span>`:""}
function matches(r,q){
  if(!q) return true; q=q.toLowerCase(); const digits=q.replace(/\D/g,"");
  const hay=[r.name,r.company,r.email,r.address,r.town,...(r.equipment||[]).map(e=>[e.serial,e.model,e.make,e.type,e.desc,e.filter,e.size].join(" ")),...(r.filters||[]),...[].concat(r.visits||[],r.installs||[],r.serviceCalls||[]).map(v=>"#"+v.job+" "+v.job)].join(" ").toLowerCase();
  if(hay.includes(q)) return true;
  const words=q.split(/[\s&,]+/).filter(Boolean); if(words.length>1&&words.every(w=>hay.includes(w))) return true;
  if(digits.length>=3){const ph=[r.phone,r.phone2].join(" ").replace(/\D/g,"");if(ph.includes(digits))return true}
  return false;
}
function rowHtml(r,dateStr,label){
  return `<button class="row" data-id="${esc(r.id)}" aria-current="${S.sel===r.id}">
    <div class="date">${esc(dateStr)}<small>${esc(label||"")}</small></div>
    <div class="who"><b>${esc(r.name)}</b><span>${esc(r.town||r.address||"No address")}${activeProgs(r).length?" · "+esc(activeProgs(r)[0]):""}</span></div>
    <div class="st">${statusChip(r)}${flagChip(r)}</div></button>`;
}
function viewDue(){
  const rows=S.rows.filter(r=>matches(r,S.q));
  const g={over:[],soon:[],next:[],sch:[],later:[],none:[]};
  rows.forEach(r=>g[bucket(r)].push(r));
  const by=(a,b)=>(due(a)||"9").localeCompare(due(b)||"9");
  Object.values(g).forEach(a=>a.sort(by)); g.sch.sort((a,b)=>upcomingVisit(a).date.localeCompare(upcomingVisit(b).date));
  const tile=(k,cls,n,l)=>`<button class="tile ${cls}" data-jump="${k}"><div class="n">${n}</div><div class="l">${l}</div></button>`;
  let h=`<div class="tiles">${tile("over","over",g.over.length,"Overdue")}${tile("soon","soon",g.soon.length,"Due in 30 days")}${tile("next","later",g.next.length,"Due in 31–90 days")}${tile("sch","sch",g.sch.length,"Booked")}</div>`;
  const sec=(k,title,arr,dateFn,lim)=>{
    if(!arr.length) return "";
    const show=lim&&!S.showLater?arr.slice(0,lim):arr;
    return `<div class="group" id="g-${k}"><h2><span>${title}</span><span>${arr.length}</span></h2><div class="list">${show.map(r=>rowHtml(r,...dateFn(r))).join("")}</div>${lim&&arr.length>lim&&!S.showLater?`<button class="more" data-more>Show all ${arr.length}</button>`:""}</div>`;
  };
  const dueFn=r=>[fmtShort(due(r)),String(yr(due(r)))];
  h+=sec("over","Overdue",g.over,dueFn);
  h+=sec("soon","Due in the next 30 days",g.soon,dueFn);
  h+=sec("next","Due in 31–90 days",g.next,dueFn);
  h+=sec("sch","Booked in HCP",g.sch,r=>{const v=upcomingVisit(r);return [fmtShort(v.date),"Job #"+v.job]});
  h+=sec("later","Later",g.later,dueFn,15);
  h+=sec("none","No due date on file",g.none,r=>["—","no date"]);
  if(!rows.length) h+=`<div class="empty">No customers match “${esc(S.q)}”.</div>`;
  return h;
}
function viewPast(){
  const items=[];S.rows.forEach(r=>(r.visits||[]).forEach(v=>{if(v.status==="done"&&/mainten|deep clean|complimentary|complementary/i.test((v.items||[]).join(" "))&&matches(r,S.q))items.push({r,v})}));  /* v0.16.3 Calvin: past list shows maintenance visits only */
  items.sort((a,b)=>(b.v.date||"").localeCompare(a.v.date||""));
  if(!items.length) return `<div class="empty">No completed maintenances match.</div>`;
  return `<div class="group"><h2><span>Completed maintenances, newest first</span><span>${items.length}</span></h2><div class="list">${items.map(({r,v})=>`<button class="row" data-id="${esc(r.id)}" aria-current="${S.sel===r.id}"><div class="date">${fmtShort(v.date)}<small>${yr(v.date)}</small></div><div class="who"><b>${esc(r.name)}</b><span>${esc((v.items||[]).slice(0,2).join(", "))}</span></div><div><span class="chip c-mute">#${esc(v.job)}</span></div></button>`).join("")}</div></div>`;
}
const EQMAIN=/heat ?pump|furnace|boiler|air handler|ductless|ducted|condenser|air.to.water|\bhead\b/i;
function eqAge(r){let best=null;(r.equipment||[]).forEach(e=>{if(/^\d{4}-\d{2}-\d{2}/.test(e.installed||"")&&EQMAIN.test(e.type||"")&&(!best||e.installed<best.date))best={date:e.installed,what:e.type+(e.make?" · "+e.make:"")}});
  if(!best&&/^\d{4}-\d{2}-\d{2}/.test(r.installDate||""))best={date:r.installDate,what:"Install on file"};
  if(!best)return null;const y=Math.floor((TODAY-pd(best.date))/(365.25*864e5));best.yrs=Math.max(0,y);return best}
function viewCust(){
  const f=S.custFilter;
  let rows=S.rows.filter(r=>matches(r,S.q));
  if(f==="prog") rows=rows.filter(r=>activeProgs(r).length);
  const eqText=r=>(r.equipment||[]).map(e=>[e.type,e.desc,e.model].join(" ")).join(" | ");
  if(f==="hp") rows=rows.filter(r=>/heat ?pump|ductless|ducted|mini.?split|air handler|\bodu\b|\bidu\b/i.test(eqText(r)));
  if(f==="furn") rows=rows.filter(r=>/furnace/i.test(eqText(r)));
  const so=S.custSort||"name";
  const fb=(k,l)=>`<button data-cf="${k}" aria-pressed="${f===k}">${l}</button>`;
  const sb=(k,l)=>`<button data-cs="${k}" aria-pressed="${so===k}">${l}</button>`;
  const filt=`<div class="filters">${fb("all","All")}${fb("prog","On a program")}${fb("hp","Heat pumps")}${fb("furn","Furnaces")}</div><div class="filters" aria-label="Sort"><span class="meta" style="align-self:center">Sort</span>${sb("name","Name A–Z")}${sb("old","Oldest equipment")}${sb("new","Newest equipment")}</div>`;
  const nameRow=r=>`<button class="row" data-id="${esc(r.id)}" aria-current="${S.sel===r.id}"><div class="date">${fmtShort(due(r))}<small>next due</small></div><div class="who"><b>${esc(r.name)}</b><span>${esc(r.phone||"No phone")} · ${esc(r.town||"")}</span></div><div>${activeProgs(r).length?`<span class="chip c-star">Program</span>`:""}</div></button>`;
  if(so==="name"){rows.sort((a,b)=>a.name.localeCompare(b.name));
    return `${filt}<div class="group"><h2><span>Customers</span><span>${rows.length}</span></h2><div class="list">${rows.map(nameRow).join("")||`<div class="empty">No customers match.</div>`}</div></div>`}
  const known=[],unk=[];rows.forEach(r=>{const a=eqAge(r);(a?known:unk).push({r,a})});
  known.sort((x,y)=>so==="old"?x.a.date.localeCompare(y.a.date):y.a.date.localeCompare(x.a.date));unk.sort((x,y)=>x.r.name.localeCompare(y.r.name));
  const ageBand=y=>y>=20?"20+ yrs":(Math.floor(y/5)*5)+"–"+(Math.floor(y/5)*5+4)+" yrs";
  const ageRow=({r,a})=>{const y=a.yrs;const cls=y>=15?"c-over":y>=10?"c-soon":"c-mute";const bl=ageBand(y);return `<button class="row" data-id="${esc(r.id)}" aria-current="${S.sel===r.id}"><div class="date">${y<1?"&lt;1 yr":y+" yr"+(y===1?"":"s")}<small>since ${esc(String(yr(a.date)))}</small></div><div class="who"><b>${esc(r.name)}</b><span>${esc(a.what)} · ${esc(r.town||"")}</span></div><div><span class="chip ${cls}">${bl}</span></div></button>`};
  return `${filt}<p class="meta">${so==="old"?"Oldest system first":"Newest system first"}, in 5-year groups. Age = oldest heating or cooling system on file (equipment install date, else the customer's install date).</p>${(()=>{const bands=[];known.forEach(x=>{const b=ageBand(x.a.yrs);let g=bands.find(z=>z.b===b);if(!g){g={b,items:[]};bands.push(g)}g.items.push(x)});return bands.map(g=>`<div class="group"><h2><span>${g.b}</span><span>${g.items.length}</span></h2><div class="list">${g.items.map(ageRow).join("")}</div></div>`).join("")||`<div class="empty">No customers match.</div>`})()}${unk.length?`<div class="group"><h2><span>Equipment age unknown</span><span>${unk.length}</span></h2><div class="list">${unk.map(({r})=>nameRow(r)).join("")}</div></div>`:""}`;
}
function viewFilt(){
  const list=[];S.rows.forEach(r=>{const sv=upcomingVisit(r);const d=sv?days(sv.date):days(due(r));if(d!=null&&d<=21&&matches(r,S.q))list.push({r,d,sv})});
  list.sort((a,b)=>a.d-b.d);
  const tally={};list.forEach(({r})=>(r.filters||[]).forEach(f=>tally[f]=(tally[f]||0)+1));
  const t=Object.entries(tally).map(([k,n])=>`<span class="chip c-info">${esc(k)} × ${n}</span>`).join(" ");
  return `<div class="group"><h2><span>Filters for maintenances in the next 3 weeks (and overdue)</span><span>${list.length}</span></h2>
  <p class="meta">${t||"No filter sizes recorded yet for these customers. Add them on each profile, under Equipment."}</p>
  <div class="tablewrap"><table class="t"><thead><tr><th>Due</th><th>Customer</th><th>Filters</th></tr></thead><tbody>${list.map(({r,sv})=>`<tr><td>${sv?"Booked "+fmtShort(sv.date):fmtShort(due(r))}</td><td><a href="#" data-id="${esc(r.id)}">${esc(r.name)}</a></td><td>${(r.filters||[]).length?esc(r.filters.join(", ")):'<span class="chip c-soon">Unknown</span>'}</td></tr>`).join("")}</tbody></table></div></div>`;
}
const LOCAL=/comox|courtenay|cumberland|royston|merville|black creek|union bay|fanny bay|bowser|qualicum|parksville|nanaimo|lantzville|campbell river|oyster river|denman|hornby|lazo|willow point|errington|coombs|nanoose|dove creek|headquarters|miracle beach|saratoga/i;
function remoteTown(r){const t=(r.town||"").trim(),a=r.address||"";if(t&&LOCAL.test(t))return null;if(!t&&LOCAL.test(a))return null;if(t)return t;const m=a.match(/,\s*([^,]+?),\s*(?:BC|British Columbia)/i);return m&&!LOCAL.test(m[1])?m[1].trim():null}
function viewBook(){
  const rows=S.rows.filter(r=>matches(r,S.q));
  const open=r=>r.outreach&&r.outreach.status;
  const wait=[],rep=[],need=[],booked=[],you=[],trips={};
  rows.forEach(r=>{const sv=upcomingVisit(r);
    if(sv){booked.push(r);return}
    if(open(r)){const st=r.outreach.status;(/draft ready|no email|called|accepted/i.test(st)?you:/replied/i.test(st)?rep:wait).push(r);return}
    const d=days(due(r));const rt=remoteTown(r);if(rt){if(d!=null&&d<=180)(trips[rt]=trips[rt]||[]).push(r);return}if(d!=null&&d<=45)need.push(r)});
  wait.sort((a,b)=>(a.outreach.since||"").localeCompare(b.outreach.since||""));rep.sort((a,b)=>(a.outreach.since||"").localeCompare(b.outreach.since||""));
  need.sort((a,b)=>(due(a)||"").localeCompare(due(b)||""));booked.sort((a,b)=>upcomingVisit(a).date.localeCompare(upcomingVisit(b).date));
  const tile=(k,cls,n,l)=>`<button class="tile ${cls}" data-jump="${k}"><div class="n">${n}</div><div class="l">${l}</div></button>`;
  let h=`<div class="tiles">${tile("bneed","over",need.length,"Need an email")}${tile("byou","soon",you.length,"Needs you")}${tile("bwait","soon",wait.length,"Waiting on reply")}${tile("brep","later",rep.length,"Replied, pick a date")}${tile("bbook","sch",booked.length,"Booked")}</div>`;
  const fu=r=>{const d=days(r.outreach.followUp);return d!=null&&d<=0?`<span class="chip c-over">Follow up</span>`:`<span class="chip c-mute">Follow up ${fmtShort(r.outreach.followUp)}</span>`};
  const sec=(k,t,arr,f)=>arr.length?`<div class="group" id="g-${k}"><h2><span>${t}</span><span>${arr.length}</span></h2><div class="list">${arr.map(f).join("")}</div></div>`:"";
  const row=(r,dl,sm,sub,chip)=>`<button class="row" data-id="${esc(r.id)}" aria-current="${S.sel===r.id}"><div class="date">${dl}<small>${sm}</small></div><div class="who"><b>${esc(r.name)}</b><span>${esc(sub)}</span></div><div>${chip}</div></button>`;
  h+=sec("byou","Needs you: drafts to review, calls to check, dates to book",you,r=>row(r,fmtShort(r.outreach.since),"since",r.outreach.status+(r.outreach.subject?" · "+r.outreach.subject:""),`<span class="chip c-star">Your move</span>`));
  h+=sec("bwait","Emailed, no reply yet",wait,r=>row(r,fmtShort(r.outreach.since),"emailed",r.outreach.subject||"",fu(r)));
  h+=sec("brep","Replied, no date set yet",rep,r=>row(r,fmtShort(r.outreach.since),"last reply",r.outreach.subject||"",fu(r)));
  h+=sec("bneed","Due within 45 days (or overdue), no booking and no email yet",need,r=>row(r,fmtShort(due(r)),String(yr(due(r))),(r.town||"")+(activeProgs(r).length?" · "+activeProgs(r)[0]:""),statusChip(r)));
  const tk=Object.keys(trips).sort((a,b)=>Math.min(...trips[a].map(r=>days(due(r))))-Math.min(...trips[b].map(r=>days(due(r)))));
  if(tk.length)h+=`<div class="group" id="g-btrip"><h2><span>Out-of-town trips: book these together, add travel cost</span><span>${tk.reduce((n,k)=>n+trips[k].length,0)}</span></h2>${tk.map(k=>`<div class="list" style="margin-bottom:8px"><div class="meta" style="padding:6px 12px"><b>${esc(k)}</b> · ${trips[k].length} due within 6 months</div>${trips[k].sort((a,b)=>(due(a)||"").localeCompare(due(b)||"")).map(r=>row(r,fmtShort(due(r)),String(yr(due(r))),activeProgs(r).length?activeProgs(r)[0]:"",statusChip(r))).join("")}</div>`).join("")}</div>`;
  h+=sec("bbook","Booked in HCP",booked,r=>{const v=upcomingVisit(r);return row(r,fmtShort(v.date),"Job #"+v.job,(v.items||[]).slice(0,1).join(""),`<span class="chip c-ok">Booked</span>`)});
  return h;
}
function viewWarr(){
  const rows=S.rows.filter(r=>matches(r,S.q));
  const onWF=r=>(r.programDetail||[]).some(p=>/worry/i.test(p.name)&&days(p.expires)>=0);
  const recentMaint=r=>{if(onWF(r))return true;const d=days(r.lastMaint);return d!=null&&d>=-365};
  const soon=[],later=[],missing=[];
  rows.forEach(r=>{const n=wNext(r);if(n){const y=yl(n.expires);if(y<=2.5)soon.push({r,n});else later.push({r,n})}
    const w=r.warranty||{};if((w.parts&&w.parts.status==="not registered")||(w.labour&&w.labour.status==="not registered"))missing.push(r)});
  soon.sort((a,b)=>a.n.expires.localeCompare(b.n.expires));later.sort((a,b)=>a.n.expires.localeCompare(b.n.expires));
  const row=({r,n})=>`<button class="row" data-id="${esc(r.id)}" aria-current="${S.sel===r.id}"><div class="date">${fmtShort(n.expires)}<small>${yr(n.expires)}</small></div><div class="who"><b>${esc(r.name)}</b><span>${esc(n.k)} warranty ends · ${onWF(r)?"on Worry-Free":recentMaint(r)?"maintained in last 12 months":"no maintenance in last 12 months"}</span></div><div>${leftChip(n.expires)}</div></button>`;
  const out=soon.filter(x=>!recentMaint(x.r)),onm=soon.filter(x=>recentMaint(x.r));
  let h=`<div class="tiles">${[["Reach out",out.length,"over"],["Ending, on maintenance",onm.length,"soon"],["Registration missing",missing.length,"later"],["Tracked warranties",soon.length+later.length,"sch"]].map(([l,n,c])=>`<div class="tile ${c}"><div class="n">${n}</div><div class="l">${l}</div></div>`).join("")}</div>`;
  const sec=(t,arr,f)=>arr.length?`<div class="group"><h2><span>${t}</span><span>${arr.length}</span></h2><div class="list">${arr.map(f).join("")}</div></div>`:"";
  h+=sec("Warranty ends within 2½ years, no recent maintenance: offer a full maintenance before it runs out",out,row);
  h+=sec("Warranty ends within 2½ years, already on maintenance",onm,row);
  h+=sec("Parts or labour registration not on file",missing,r=>`<button class="row" data-id="${esc(r.id)}"><div class="date">${fmtShort(r.installDate)}<small>installed</small></div><div class="who"><b>${esc(r.name)}</b><span>${esc([r.warranty.parts&&r.warranty.parts.status==="not registered"?"Parts not registered":"",r.warranty.labour&&r.warranty.labour.status==="not registered"?"Labour not registered":""].filter(Boolean).join(" · "))}</span></div><div></div></button>`);
  h+=sec("All other tracked warranties",later,row);
  if(!soon.length&&!later.length&&!missing.length)h+=`<div class="empty">No warranty dates recorded yet.</div>`;
  return h;
}
function viewGaps(){
  const g=[["No phone",r=>!r.phone],["No email",r=>!r.email],["No equipment record",r=>!(r.equipment||[]).length],["Equipment missing serial",r=>(r.equipment||[]).some(e=>!e.serial)],["No filter size",r=>!(r.filters||[]).length],["No maintenance or install date",r=>!due(r)]];
  return g.map(([l,fn])=>{const a=S.rows.filter(fn).filter(r=>matches(r,S.q)).sort((x,y)=>x.name.localeCompare(y.name));return `<div class="group"><h2><span>${l}</span><span>${a.length}</span></h2><div class="list">${a.slice(0,8).map(r=>`<button class="row" data-id="${esc(r.id)}"><div class="date">${fmtShort(due(r))}<small>next due</small></div><div class="who"><b>${esc(r.name)}</b><span>${esc(r.town||"")}</span></div><div></div></button>`).join("")}</div>${a.length>8?`<p class="meta">and ${a.length-8} more. Search a name to find them.</p>`:""}</div>`}).join("");
}
function eqCard(e,i){
  return `<div class="card"><b>${esc(e.type||"Equipment")}${e.size&&e.size!=="Unknown"?" · "+esc(e.size):""}</b>
  <div>${esc(e.make||"")} <span class="mono">${esc(e.model||"")}</span></div>
  <div class="meta">Serial <span class="mono">${esc(e.serial||"not recorded")}</span></div>
  ${e.installed?`<div class="meta">Installed ${fmt(e.installed)}</div>`:""}
  ${e.filter?`<div class="meta">Filter ${esc(e.filter)}</div>`:(/filter/i.test(e.type||"")&&e.desc?`<div class="meta">Filter ${esc(e.desc)}</div>`:"")}
  ${S.canWrite?`<button class="copy" data-eqedit="${i}">Edit</button>`:""}</div>`;
}
function eqForm(e,i){
  e=e||{};const fld=(k,l,ph)=>`<label>${l}<input class="f" id="eq-${k}" value="${esc(e[k]||"")}" placeholder="${ph||""}"></label>`;
  return `<div class="card" id="eqform"><b>${i==null?"Add equipment":"Edit equipment"}</b><div class="formgrid">
  <label>Type<select class="f" id="eq-type">${["Ducted heat pump","Ductless heat pump (outdoor)","Ductless head (indoor)","Air handler","Gas furnace","Oil furnace","Electric furnace","Air-to-water heat pump","Boiler","HRV / ERV","Thermostat","Air filter","Other"].map(t=>`<option ${t===e.type?"selected":""}>${t}</option>`).join("")}${e.type&&!["Ducted heat pump","Ductless heat pump (outdoor)","Ductless head (indoor)","Air handler","Gas furnace","Oil furnace","Electric furnace","Air-to-water heat pump","Boiler","HRV / ERV","Thermostat","Air filter","Other"].includes(e.type)?`<option selected>${esc(e.type)}</option>`:""}</select></label>
  ${fld("make","Make")}${fld("model","Model")}${fld("serial","Serial")}${fld("size","Size","e.g. 24000 BTU")}${fld("installed","Installed","YYYY-MM-DD")}${fld("filter","Filter","e.g. 16x25x1 MERV 8")}${fld("refrigerant","Refrigerant","e.g. R-410A")}</div>
  <div style="display:flex;gap:8px;margin-top:8px"><button class="btn" data-eqsave="${i==null?"new":i}">Save</button><button class="btn ghost" data-eqcancel>Cancel</button></div></div>`;
}
function bookHtml(r){
  const L=(r.outreachLog||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  if(!L.length&&!(r.outreach&&r.outreach.status))return "";
  const icon={out:"Sent",in:"Reply",result:"Result"};
  return `<div class="sec s-book"><h3>Booking emails</h3>${r.outreach&&r.outreach.status?`<div class="flag check"><div><b>${esc(r.outreach.status)}</b> since ${fmt(r.outreach.since)}</div><div class="fm">${esc(r.outreach.subject||"")} · follow up ${fmt(r.outreach.followUp)}</div></div>`:""}
  <ul class="tl">${L.map(x=>`<li><div><b>${fmtShort(x.date)}</b><br><span class="meta">${yr(x.date)}</span></div><div><span class="chip ${x.dir==="out"?"c-info":x.dir==="in"?"c-star":x.outcome==="booked"?"c-ok":"c-mute"}">${icon[x.dir]||""}${x.by&&x.dir==="out"?" · "+esc(x.by):""}</span> ${esc(x.subject||"")}<br><span class="meta">${esc(x.gist||"")}</span></div></li>`).join("")}</ul></div>`;
}
function flagsHtml(r){
  const fl=(r.flags||[]).map((f,i)=>({...f,i}));const open=fl.filter(f=>f.status!=="done"),done=fl.filter(f=>f.status==="done");
  const one=f=>`<div class="flag ${f.status||"open"}"><div>${esc(f.text)}</div><div class="fm">${esc(f.src||"")}${f.date?" · "+fmt(f.date):""}${f.uuid?` · <a href="${HCP_JOB+esc(f.uuid)}" target="_blank" rel="noopener">Job #${esc(f.job)}</a>`:f.job?" · Job #"+esc(f.job):""}${f.note?`<br>${esc(f.note)}`:""}${f.status==="done"&&f.doneDate?`<br>Closed ${fmt(f.doneDate)}`:""}</div>${S.canWrite?`<div class="fa">${f.status==="done"?`<button class="copy" data-flagopen="${f.i}">Reopen</button>`:`<button class="copy" data-flagdone="${f.i}">Dealt with</button>`}</div>`:""}</div>`;
  return `<div class="sec s-flag"><h3><span>Raise at next visit</span>${S.canWrite?`<button class="copy" data-flagadd>Add</button>`:""}</h3><div id="flagadd"></div>
  ${open.length?open.map(one).join(""):`<div class="meta">Nothing flagged from past checklists or job notes.</div>`}
  ${done.length?`<details class="donef"><summary>${done.length} dealt with</summary>${done.map(one).join("")}</details>`:""}</div>`;
}
function warrHtml(r){
  const w=r.warranty||{};const pd=r.programDetail||[];
  const line=(lab,x)=>{if(!x)return `<tr><td>${lab}</td><td><span class="meta">None recorded</span></td></tr>`;
    return `<tr><td>${lab}</td><td><b>${x.years?esc(x.years)+" yr":"—"}</b>${x.kind?" · "+esc(x.kind):""}${x.start?` · ${fmt(x.start)} → ${fmt(x.expires)}`:""} ${x.expires?leftChip(x.expires):""}
      ${x.status?`<br><span class="chip ${x.status==="registered"?"c-ok":x.status==="not registered"?"c-over":"c-mute"}">${esc(x.status==="registered"?"Registered":x.status==="not registered"?"Not registered":"Registration not confirmed")}</span>`:""}${x.agreement?` <span class="meta">Agreement ${esc(x.agreement)}</span>`:""}${x.src?`<br><span class="meta">${esc(x.src)}</span>`:""}</td></tr>`};
  const progs=pd.length?pd.map(p=>`<div><b>${esc(p.name)}</b>${p.start?` · ${fmt(p.start)} → ${fmt(p.expires)} ${leftChip(p.expires)}`:""}${p.job?` <span class="meta">Job #${esc(p.job)}</span>`:""}${p.note?`<br><span class="meta">${esc(p.note)}</span>`:""}</div>`).join(""):`<span class="meta">None</span>`;
  const certs=(w.certs||[]).map(c=>`<a href="${esc(safeHref(c.url))}" target="_blank" rel="noopener">${esc(c.label)}</a>`).join("");
  return `<div class="sec s-warr"><h3>Warranty and programs</h3><table class="wt"><tbody>${line("Parts",w.parts)}${line("Labour",w.labour)}<tr><td>Programs</td><td>${progs}</td></tr>${certs?`<tr><td>Certificates</td><td class="certs">${certs}</td></tr>`:""}${w.note?`<tr><td>Note</td><td>${esc(w.note)}</td></tr>`:""}</tbody></table></div>`;
}
function secKey(el){const m=(el.className.match(/\bs-([a-z]+)/)||[])[1];return m||""}
let SEC=null;function secState(){if(SEC)return SEC;SEC={};try{SEC=JSON.parse(localStorage.getItem("hb-sec")||"{}")||{}}catch(_){SEC={}}return SEC}
function secSave(){try{localStorage.setItem("hb-sec",JSON.stringify(SEC))}catch(_){}}
/* Calvin 2026-11-03: Contact first, every section collapsible. Open by default: Raise at next visit + Maintenance (next due, last done, filters),
   and Booking emails when a booking is in progress. Everything else starts collapsed. A section you open or close stays that way on the next customer. */
const SEC_DEFAULT_OPEN={flag:1,maint:1};
function secInit(det){
  const c=det.querySelector(".sec.s-contact"),first=det.querySelector(".sec");
  if(c&&first&&first!==c)first.parentNode.insertBefore(c,first);
  const st=secState();
  det.querySelectorAll(".sec").forEach(el=>{const k=secKey(el);
    const def=SEC_DEFAULT_OPEN[k]||(k==="book"&&el.querySelector(".flag.check"));
    const open=k in st?!!st[k]:!!def; el.classList.toggle("closed",!open)});
  const chips=det.querySelector(".chips");
  if(chips&&!det.querySelector("[data-secall]")){const b=document.createElement("button");b.className="copy secall";b.dataset.secall="1";chips.after(b)}
  secAllLabel(det);
}
function secAllLabel(det){const b=det.querySelector("[data-secall]");if(!b)return;const any=[...det.querySelectorAll(".sec")].some(x=>x.classList.contains("closed"));b.textContent=any?"Expand all":"Collapse all"}
function secClick(ev){
  const det=ev.currentTarget;
  const all=ev.target.closest("[data-secall]");
  if(all){const d=all.closest("#detail")||det;const close=all.textContent==="Collapse all";const st=secState();
    d.querySelectorAll(".sec").forEach(x=>{x.classList.toggle("closed",close);st[secKey(x)]=close?0:1});secSave();secAllLabel(d);return}
  const h=ev.target.closest(".sec>h3:first-child");if(!h)return;
  const sec=h.parentElement,k=secKey(sec),st=secState();
  if(ev.target.closest("button,a")){if(sec.classList.contains("closed")){sec.classList.remove("closed");st[k]=1;secSave();secAllLabel(sec.closest("#detail")||det)}return}
  const nowClosed=!sec.classList.contains("closed");sec.classList.toggle("closed",nowClosed);st[k]=nowClosed?0:1;secSave();secAllLabel(sec.closest("#detail")||det);
}
/* HCP notes with dates (Calvin 2026-11-03: every note synced from Housecall Pro shows its date). r.hcpNoteList = [{d:'YYYY-MM-DD', src:'Customer'|'Job'|'Estimate'|'Lead', ref:uuid, t:text}], newest first. */
function hcpNotesHtml(r){
  const L=(r.hcpNoteList||[]).slice().sort((a,b)=>(b.d||"").localeCompare(a.d||""));
  if(!L.length)return r.hcpNotes?`<p class="meta">From HCP${r.hcpNotesDate?" · "+fmt(r.hcpNotesDate):""}: ${esc(r.hcpNotes)}</p>`:"";
  const jobNo={};[...(r.visits||[]),...(r.installs||[])].forEach(v=>{if(v.uuid)jobNo[v.uuid]=v.job});
  const lab=n=>{const u=n.ref||"";const jl=n.lab||(jobNo[u]?"Job #"+jobNo[u]:"Job");if(n.src==="Job")return u?`<a href="${HCP_JOB+esc(u)}" target="_blank" rel="noopener">${esc(jl)}</a>`:esc(jl);
    if(n.src==="Estimate")return u?`<a href="https://pro.housecallpro.com/app/estimates/${esc(u)}" target="_blank" rel="noopener">${esc(n.lab||"Estimate")}</a>`:esc(n.lab||"Estimate");
    if(n.src==="Lead")return u?`<a href="https://pro.housecallpro.com/app/leads/${esc(u)}" target="_blank" rel="noopener">Lead</a>`:"Lead";
    return "Customer note"};
  const one=n=>`<li><div><b>${fmtShort(n.d)}</b><br><span class="meta">${yr(n.d)}</span></div><div><span class="meta">${lab(n)}</span><br><span class="hn">${esc(n.t||"")}</span></div></li>`;
  const top=L.slice(0,5),rest=L.slice(5);
  return `<div class="meta" style="margin-bottom:4px">From Housecall Pro (${L.length}), newest first</div><ul class="tl hnl">${top.map(one).join("")}</ul>${rest.length?`<details class="donef"><summary>${rest.length} older</summary><ul class="tl hnl">${rest.map(one).join("")}</ul></details>`:""}<div class="meta" style="margin:10px 0 4px">Your notes</div>`;
}
function detailHtml(r){
  const d=due(r),sv=upcomingVisit(r);
  const tel=(r.phone||"").replace(/\D/g,"");
  const map=r.address?"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(r.address):null;
  const visits=(r.visits||[]);
  return `<button class="back" data-back>← Back to list</button>
  <h1>${esc(r.name)}</h1>
  <div class="meta">${esc(r.address||"No address on file")}</div>
  <div class="chips">${statusChip(r)}${progChips(r)}</div>
  ${flagsHtml(r)}
  ${bookHtml(r)}
  <div class="sec s-contact"><h3>Contact</h3><dl class="kv contact">
    <dt>Phone</dt><dd>${r.phone?`<a href="tel:${tel}">${esc(r.phone)}</a><button class="copy" data-copy="${esc(r.phone)}">Copy</button>`:"—"}${r.phone2?`<br><span class="meta">${esc(r.phone2)}</span>`:""}</dd>
    <dt>Email</dt><dd>${r.email?`<a href="mailto:${esc(r.email)}">${esc(r.email)}</a><button class="copy" data-copy="${esc(r.email)}">Copy</button>`:"—"}</dd>
    <dt>Address</dt><dd>${r.address?`${esc(r.address)}${map?` · <a href="${map}" target="_blank" rel="noopener">Map</a>`:""}`:"—"}</dd>
  </dl></div>
  <div class="sec s-maint"><h3>Maintenance</h3><dl class="kv">
    <dt>Next due</dt><dd><b>${fmt(d)}</b> ${r.nextDueOverride?'<span class="chip c-info">set by hand</span>':r.nextDueBasis?`<span class="meta">(${/^booked/.test(r.nextDueBasis)?esc(r.nextDueBasis):"1 year after "+esc(r.nextDueBasis)})</span>`:""}${S.canWrite?` <button class="copy" data-editdue>Change</button>`:""}<div id="dueedit"></div></dd>
    <dt>Last done</dt><dd>${fmt(r.lastMaint)}</dd>
    ${sv?`<dt>Booked</dt><dd>${fmt(sv.date)} · <a href="${HCP_JOB+esc(sv.uuid)}" target="_blank" rel="noopener">Job #${esc(sv.job)}</a></dd>`:""}
    <dt>Installed</dt><dd>${fmt(r.installDate)}</dd>
    <dt>Filters</dt><dd>${(r.filters||[]).length?esc(r.filters.join(", ")):"Not recorded"}</dd>
  </dl></div>
  ${warrHtml(r)}
  <div class="sec s-eq"><h3><span>Equipment</span>${S.canWrite?`<button class="copy" data-eqadd>Add</button>`:""}</h3>
    <div id="eqarea" class="eq">${(r.equipment||[]).map(eqCard).join("")||`<div class="meta">No equipment recorded yet. Add the make, model, serial and filter size from the nameplate.</div>`}</div></div>
  <div class="sec s-hist"><h3>Maintenance history</h3>${visits.length?`<ul class="tl">${visits.map(v=>`<li><div><b>${fmtShort(v.date)}</b><br><span class="meta">${yr(v.date)}</span></div><div>${esc((v.items||[]).join(", ")||"Maintenance")}<br>
     <span class="chip ${v.status==="done"?"c-ok":v.status==="stale"||v.status==="cancelled"||v.status==="reminder"?"c-mute":"c-info"}">${{done:"Done",scheduled:"Booked",future:"Booked (future)",open:"Not completed",stale:"Old placeholder",cancelled:"Cancelled in HCP",reminder:"Reminder only, not booked"}[v.status]||esc(v.status)}</span>${v.included?' <span class="chip c-star">Included</span>':""}${v.qboImport?` <span class="chip c-mute" title="${esc(v.dateSrc||"")}">QuickBooks import</span>`:""}
     · <a href="${HCP_JOB+esc(v.uuid)}" target="_blank" rel="noopener">Job #${esc(v.job)}</a>${v.checklist?` · <a href="${esc(safeHref(v.checklist))}" target="_blank" rel="noopener">Checklist</a>`:v.status==="done"?' <span class="meta">· checklist not linked yet</span>':""}</div></li>`).join("")}</ul>`:`<div class="meta">No maintenance jobs in HCP yet.</div>`}
    ${(r.installs||[]).length?`<h3 style="margin-top:12px">Installs and other HVAC jobs</h3><ul class="tl">${r.installs.map(v=>`<li><div><b>${fmtShort(v.date)}</b><br><span class="meta">${yr(v.date)}</span></div><div>${esc((v.items||[]).slice(0,3).join(", "))} · <a href="${HCP_JOB+esc(v.uuid)}" target="_blank" rel="noopener">Job #${esc(v.job)}</a>${v.done===false?' <span class="chip c-mute">Not completed</span>':""}${v.qboImport?`<br><span class="meta">QuickBooks import: ${esc(v.dateSrc||"")}</span>`:""}</div></li>`).join("")}</ul>`:""}
    ${(r.serviceCalls||[]).length?`<h3 style="margin-top:12px">Service calls</h3><ul class="tl">${r.serviceCalls.map(v=>`<li><div><b>${fmtShort(v.date)}</b><br><span class="meta">${yr(v.date)}</span></div><div>${esc((v.items||[]).slice(0,3).join(", "))} · <a href="${HCP_JOB+esc(v.uuid)}" target="_blank" rel="noopener">Job #${esc(v.job)}</a>${v.note?`<br><span class="meta">${esc(v.note)}</span>`:""}</div></li>`).join("")}</ul>`:""}</div>
  <div class="sec s-notes"><h3>Notes</h3>${hcpNotesHtml(r)}
    <textarea id="notes" ${S.canWrite?"":"readonly"} placeholder="Access, pets, disconnect location, customer preferences, anything to remember">${esc(r.notes||"")}</textarea>
    ${S.canWrite?`<div style="margin-top:6px"><button class="btn" id="savenotes">Save notes</button></div>`:""}</div>`;
}
function render(){
  const left=$("#left");
  if(!S.rows.length){left.innerHTML=`<div class="empty">${S.db===false?"Sign in to the System Hub to load customer data.":S.db?"No customers loaded yet. Claude imports every customer with heating or cooling work from Housecall Pro.":"Loading customers…"}</div>`;return}
  left.innerHTML={due:viewDue,past:viewPast,cust:viewCust,book:viewBook,warr:viewWarr,filt:viewFilt,gaps:viewGaps}[S.tab]();
  const r=S.rows.find(x=>x.id===S.sel);
  const det=$("#detail");
  const typing=det&&!det.hidden&&det.dataset.id===r?.id&&det.contains(R.activeElement)&&/^(INPUT|TEXTAREA|SELECT)$/.test(R.activeElement.tagName);
  if(r&&typing){/* live update while typing: leave the open profile as is */}
  else if(r){det.hidden=false;det.dataset.id=r.id;det.innerHTML=detailHtml(r);secInit(det);$("#split").classList.add("has-detail");if(matchMedia("(max-width:979px)").matches)left.hidden=true}
  else{det.hidden=true;$("#split").classList.remove("has-detail");left.hidden=false}
  try{if(/^#\/maint/.test(location.hash)){const want="#/maint"+(S.sel?"?c="+S.sel:"");if(location.hash!==want)history.replaceState(null,"",location.pathname+location.search+want)}}catch(e){}
  const m=S.meta;$("#foot").textContent=`${S.rows.length} customers with heating or cooling equipment${m&&m.syncedAt?` · last import ${fmt(m.syncedAt)} from Housecall Pro`:""} · next due = 1 year after the last maintenance (or install)`;
}
async function save(id,patch,msg){
  const r=S.rows.find(x=>x.id===id); if(!r) return;
  if(!S.db){toast("Not saved: no connection to the data store");return}
  const before={};Object.keys(patch).forEach(k=>before[k]=r[k]);
  Object.assign(r,patch); render();
  try{await S.db.doc("customers/"+id).update(patch);toast(msg||"Saved")}
  catch(e){Object.assign(r,before);render();toast(e&&e.code==="invalid_argument"?"You have view-only access":"Not saved, try again");if(e&&e.code==="invalid_argument"){S.canWrite=false;render()}}
}
R.addEventListener("click",secClick,true);
R.addEventListener("click",async ev=>{
  const t=ev.target.closest("button,a"); if(!t) return;
  if(t.dataset.tab){S.tab=t.dataset.tab;R.querySelectorAll("nav.tabs button").forEach(b=>b.setAttribute("aria-selected",b===t));S.sel=null;render();return}
  if(t.dataset.id){ev.preventDefault();S.sel=t.dataset.id;render();if(matchMedia("(max-width:979px)").matches)scrollTo(0,0);return}
  if(t.hasAttribute("data-back")){S.sel=null;render();return}
  if(t.dataset.jump){const g=R.getElementById("g-"+t.dataset.jump);if(g)g.scrollIntoView({behavior:"smooth",block:"start"});return}
  if(t.hasAttribute("data-more")){S.showLater=true;render();return}
  if(t.dataset.cf){S.custFilter=t.dataset.cf;render();return}
  if(t.dataset.cs){S.custSort=t.dataset.cs;render();return}
  if(t.dataset.copy!=null){try{await navigator.clipboard.writeText(t.dataset.copy);toast("Copied")}catch(e){toast(t.dataset.copy)}return}
  const r=S.rows.find(x=>x.id===S.sel);
  if(t.dataset.flagdone!=null&&r){const fl=(r.flags||[]).map(x=>({...x}));const f=fl[+t.dataset.flagdone];f.status="done";f.doneDate=pacToday();await save(r.id,{flags:fl},"Marked as dealt with");return}
  if(t.dataset.flagopen!=null&&r){const fl=(r.flags||[]).map(x=>({...x}));const f=fl[+t.dataset.flagopen];f.status="open";delete f.doneDate;await save(r.id,{flags:fl},"Reopened");return}
  if(t.hasAttribute("data-flagadd")&&r){$("#flagadd").innerHTML=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px"><input class="f" id="flagin" placeholder="e.g. Line-set insulation cracked, quote replacement" style="flex:1 1 220px"><button class="btn" data-flagsave>Save</button></div>`;$("#flagin").focus();return}
  if(t.hasAttribute("data-flagsave")&&r){const v=$("#flagin").value.trim();if(!v)return;const fl=[...(r.flags||[]).map(x=>({...x})),{text:v,src:"Added in app",date:pacToday(),status:"open"}];await save(r.id,{flags:fl},"Flag added");return}
  if(t.id==="savenotes"&&r){await save(r.id,{notes:$("#notes").value},"Notes saved");return}
  if(t.hasAttribute("data-editdue")&&r){$("#dueedit").innerHTML=`<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><input class="f" id="duein" type="date" value="${esc(due(r)||"")}" style="max-width:180px"><button class="btn" data-duesave>Save</button>${r.nextDueOverride?'<button class="btn ghost" data-dueclear>Use automatic date</button>':""}</div>`;return}
  if(t.hasAttribute("data-duesave")&&r){const v=$("#duein").value;if(v)await save(r.id,{nextDueOverride:v},"Next due date saved");return}
  if(t.hasAttribute("data-dueclear")&&r){await save(r.id,{nextDueOverride:null},"Back to the automatic date");return}
  if(t.hasAttribute("data-eqadd")&&r){$("#eqarea").insertAdjacentHTML("afterbegin",eqForm(null,null));t.disabled=true;return}
  if(t.dataset.eqedit!=null&&r){const i=+t.dataset.eqedit;t.closest(".card").outerHTML=eqForm(r.equipment[i],i);return}
  if(t.hasAttribute("data-eqcancel")){render();return}
  if(t.dataset.eqsave!=null&&r){
    const g=k=>{const el=R.getElementById("eq-"+k);return el?el.value.trim():""};
    const e={type:g("type"),make:g("make"),model:g("model"),serial:g("serial")||null,size:g("size"),installed:g("installed")||null,filter:g("filter"),refrigerant:g("refrigerant"),src:"app"};
    const list=(r.equipment||[]).map(x=>({...x}));
    if(t.dataset.eqsave==="new")list.push(e);else list[+t.dataset.eqsave]={...list[+t.dataset.eqsave],...e};
    const filters=[...new Set([...(r.filters||[]),...list.map(x=>x.filter).filter(Boolean)])];
    await save(r.id,{equipment:list,filters},"Equipment saved");return}
});
let qt;$("#q").addEventListener("input",e=>{clearTimeout(qt);qt=setTimeout(()=>{S.q=$("#q").value.trim();if(S.q&&S.tab==="filt"){S.tab="cust";R.querySelectorAll("nav.tabs button").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab==="cust"))}render()},150)});
const onResize=()=>{if(!S.sel)return;const left=$("#left");left.hidden=matchMedia("(max-width:979px)").matches};addEventListener("resize",onResize);offs.push(()=>removeEventListener("resize",onResize));
(async function boot(){
  render();
  if(!db){S.db=false;render();return}
  S.db=db;
  offs.push(db.collection("customers").onSnapshot(snap=>{S.rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(r=>!r.removed);if(!S.deep){S.deep=1;let c=null;try{const src=(location.hash||"")+"&"+(location.search||"");const m=src.match(/(?:[#&?]|^)c(?:ust)?=(cus_[0-9a-f]+)/);c=m&&m[1]}catch(e){}if(c&&S.rows.some(r=>r.id===c)){S.sel=c;S.tab="cust";R.querySelectorAll("nav.tabs button").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab==="cust"))}}render()},err=>{toast("Couldn't load customers ("+((err&&(err.code||err.message))||"error")+")")}));
  offs.push(db.doc("meta/info").onSnapshot(s=>{S.meta=s.exists?s.data():null;render()},()=>{}));
})();

return () => { offs.forEach(f => { try { f(); } catch (e) {} }); R.innerHTML = ''; };
}
