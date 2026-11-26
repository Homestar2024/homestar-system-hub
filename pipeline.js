// Homestar HQ - Pipeline page (v1 2026-11-26, Calvin): full view of the Go High Level Leads / Estimates / Jobs pipelines.
// Data: Calvin's board doc board/pipelines (written hourly by Tools/ghl_pipelines_snap.py in the GHL Sync task; open opportunities only).
// mountPipeline(host, db) renders into a shadow root on host and returns a cleanup function.
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (v) => v ? '$' + Math.round(v).toLocaleString('en-CA') : '';
const days = (t) => t ? Math.max(0, Math.floor((Date.now() - Date.parse(t)) / 864e5)) : null;
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
.tools input{font:inherit;font-size:15px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px;flex:1;min-width:180px}
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
.empty{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:18px;color:var(--muted)}
@media(max-width:600px){.pick{gap:6px}.pk{padding:10px}.pk b{font-size:22px}.cols{grid-auto-columns:86%}}
`;
export function mountPipeline(host, db) {
  const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
  let D = null, sel = (() => { try { return localStorage.getItem('hb-pipe') || 'estimates'; } catch (e) { return 'estimates'; } })(), q = '', hideEmpty = (() => { try { return localStorage.getItem('hb-pipe-hide') === '1'; } catch (e) { return false; } })(), loaded = false;
  root.innerHTML = `<style>${CSS}</style><div id="app"><div class="empty">Loading pipelines…</div></div>`;
  const app = root.getElementById('app');
  const key = (p) => String(p.name || '').trim().toLowerCase();
  const tot = (p) => ({ n: p.stages.reduce((a, s) => a + s.n, 0), v: p.stages.reduce((a, s) => a + s.value, 0) });
  function draw() {
    if (!D || !D.pipelines || !D.pipelines.length) { app.innerHTML = `<div class="empty">${loaded ? 'No pipeline data yet - it fills in on the next hourly Go High Level sync.' : 'Loading pipelines…'}</div>`; return; }
    const P = D.pipelines; if (!P.some(p => key(p) === sel)) sel = key(P[0]);
    const p = P.find(x => key(x) === sel), pc = COL[sel] || 'var(--accent)';
    const at = D.at ? new Date(D.at).toLocaleString('en-CA', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '';
    const f = q.trim().toLowerCase();
    const stages = p.stages.filter(s => !hideEmpty || s.n);
    app.innerHTML = `<div class="head"><div><h2>Pipeline</h2><div class="sub">Go High Level · open opportunities · updated ${esc(at)}</div></div></div>
      <div class="pick">${P.map(x => { const t = tot(x); return `<button class="pk ${key(x) === sel ? 'on' : ''}" data-p="${esc(key(x))}" style="--pc:${COL[key(x)] || 'var(--accent)'}"><span class="l">${esc(x.name)}</span><b>${t.n}</b><span class="v">${t.v ? money(t.v) : 'open'}</span></button>`; }).join('')}</div>
      <div class="tools"><input id="q" placeholder="Find a name in ${esc(p.name)}…" value="${esc(q)}"><label><input type="checkbox" id="he" ${hideEmpty ? 'checked' : ''}> Hide empty stages</label></div>
      <div class="cols" style="--pc:${pc}">${stages.map(s => { const items = s.items.filter(it => !f || (it.name + ' ' + it.contact).toLowerCase().includes(f));
        return `<div class="col"><div class="ch"><div><b>${esc(s.name)}</b>${s.value ? `<small>${money(s.value)}</small>` : ''}</div><span class="n">${f ? items.length + '/' : ''}${s.n}</span></div><div class="list">${items.length ? items.map(it => { const m = String(it.name || '').match(/^(.*?)\s*-\s*(?:Estimate|Job|Lead)?\s*#?(\d[\w-]*)$/i); const nm = m ? m[1] : (it.name || it.contact); const d = days(it.since);
          return `<div class="op"><div class="t">${esc(nm)}${m ? `<span class="num">#${esc(m[2])}</span>` : ''}</div><div class="m"><span>${esc(money(it.value) || (it.contact && it.contact !== nm ? it.contact : ''))}</span>${d != null ? `<span class="age ${d > 30 ? 'h' : d > 14 ? 'w' : ''}">${d ? d + ' d in stage' : 'today'}</span>` : ''}</div></div>`; }).join('') : `<div class="none">${f ? 'No match' : 'None'}</div>`}</div></div>`; }).join('')}</div>`;
  }
  app.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) { sel = b.dataset.p; q = ''; try { localStorage.setItem('hb-pipe', sel); } catch (x) {} draw(); } });
  app.addEventListener('input', (e) => { if (e.target.id === 'q') { q = e.target.value; const pos = e.target.selectionStart; draw(); const qi = root.getElementById('q'); if (qi) { qi.focus(); qi.setSelectionRange(pos, pos); } } });
  app.addEventListener('change', (e) => { if (e.target.id === 'he') { hideEmpty = e.target.checked; try { localStorage.setItem('hb-pipe-hide', hideEmpty ? '1' : '0'); } catch (x) {} draw(); } });
  const off = db.doc('board/pipelines').onSnapshot((s) => { loaded = true; D = s.exists ? s.data() : null; draw(); }, () => { loaded = true; draw(); });
  return () => { try { off && off(); } catch (e) {} root.innerHTML = ''; };
}
