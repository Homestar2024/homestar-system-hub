// Homestar HQ - Pipeline page (v2 2026-11-26: tap a card -> side panel like the board: HCP + GHL links, contact, work summary, rebate flag, automations with sent / next / stopped steps, messages, form answers, notes; next automation step on each card. v1 2026-11-26, Calvin): full view of the Go High Level Leads / Estimates / Jobs pipelines.
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
.op{cursor:pointer;transition:.12s}.op:hover{border-color:var(--accent);transform:translateY(-1px)}
.op .nx{margin-top:5px;font-size:12px;color:var(--accent);font-weight:600}.op .nx.stop{color:var(--muted);font-weight:500}.op .nx.due{color:var(--warn)}
.rb{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.04em;background:color-mix(in srgb,#3f9e62 18%,transparent);color:#3f9e62;border-radius:6px;padding:1px 6px;margin-left:4px;vertical-align:1px}
.scrim{position:fixed;inset:0;background:rgba(10,14,25,.45);z-index:60}
.side{position:fixed;top:0;right:0;bottom:0;width:min(460px,100vw);background:var(--surface);border-left:1px solid var(--line);z-index:61;overflow-y:auto;padding:18px 18px 40px;box-shadow:-10px 0 30px rgba(0,0,0,.25)}
.side .x{position:absolute;top:12px;right:14px;font:inherit;font-size:20px;background:none;border:0;color:var(--muted);cursor:pointer}
.side h3{font-family:var(--display);font-size:21px;margin:0 30px 4px 0}
.side .meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px;color:var(--muted);margin-bottom:10px}
.chip{font-size:12px;font-weight:700;border-radius:999px;padding:2px 9px;background:var(--sunk);color:var(--ink)}
.links{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 14px}
.links a{font:inherit;font-size:13.5px;font-weight:700;text-decoration:none;border-radius:9px;padding:8px 12px;border:1px solid var(--line);color:var(--ink);background:var(--bg)}
.links a.hcp{background:#1777d3;border-color:#1777d3;color:#fff}.links a.ghl{background:#3f9e62;border-color:#3f9e62;color:#fff}
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
@media(max-width:600px){.side{top:auto;left:0;width:100vw;height:88vh;border-left:0;border-top:1px solid var(--line);border-radius:16px 16px 0 0}}
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
          const nx = nextOf(it), stp = (it.auto || []).find(a => a.status === 'stopped');
          return `<div class="op" data-op="${esc(it.id)}"><div class="t">${esc(nm)}${m ? `<span class="num">#${esc(m[2])}</span>` : ''}${it.rebate ? '<span class="rb">REBATE</span>' : ''}</div><div class="m"><span>${esc(money(it.value) || (it.contact && it.contact !== nm ? it.contact : ''))}</span>${d != null ? `<span class="age ${d > 30 ? 'h' : d > 14 ? 'w' : ''}">${d ? d + ' d in stage' : 'today'}</span>` : ''}</div>${nx ? `<div class="nx ${nx.n.state === 'due' ? 'due' : ''}">${nx.n.state === 'due' ? 'Due' : 'Next'}: ${esc(nx.n.label.replace(/\s*-.*$/, ''))} · ${esc(fmt(nx.n.when))}</div>` : stp ? `<div class="nx stop">Follow-up stopped - ${esc(stp.why.replace(/\s\d{4}-.*$/, ''))}</div>` : ''}</div>`; }).join('') : `<div class="none">${f ? 'No match' : 'None'}</div>`}</div></div>`; }).join('')}</div>`;
  }
  let openId = null;
  function side() {
    root.querySelectorAll('.scrim,.side').forEach(x => x.remove()); if (!openId || !D) return;
    let it = null; D.pipelines.forEach(p => p.stages.forEach(s => s.items.forEach(x => { if (x.id === openId) it = x; })));
    if (!it) { openId = null; return; }
    const m = String(it.name || '').match(/^(.*?)\s*-\s*(?:Estimate|Job|Lead)?\s*#?(\d[\w-]*)$/i); const nm = m ? m[1] : (it.name || it.contact); const d = days(it.since);
    const icon = { sent: '✓', next: '●', later: '○', due: '!', stopped: '✕', done: '✓' };
    const wf = (it.auto || []).map(a => `<div class="wf"><div class="wn">${esc(a.name)}</div><div class="ws"><span class="chip">${a.status === 'active' ? 'Active' : a.status === 'stopped' ? 'Stopped' : 'Done'}</span>${a.why ? ' ' + esc(a.why.replace(/(\d{4}-\d\d-\d\dT[\d:.]+Z)/, (z) => fmt(z))) : ''}${a.start ? ' · started ' + esc(fmt(a.start)) : ''}</div>${(a.steps || []).map(x => `<div class="st ${x.state}"><i>${icon[x.state] || '·'}</i><span>${esc(x.label)}${x.state === 'due' ? ' - time passed, not seen sent yet' : ''}</span><em>${esc(fmt(x.when))}</em></div>`).join('')}${a.basis ? `<small>${esc(a.basis)}</small>` : ''}</div>`).join('');
    const sum = String(it.summary || '').split(/\s*\|\s*/).filter(Boolean);
    const el = document.createElement('div'); el.innerHTML = `<div class="scrim" data-close></div><aside class="side" role="dialog" aria-label="${esc(nm)}"><button class="x" data-close aria-label="Close">✕</button>
      <h3>${esc(nm)}</h3><div class="meta">${it.number ? `<span class="chip">${esc(it.number)}</span>` : ''}<span class="chip">${esc(it.stage)}</span>${d != null ? `<span>${d ? d + ' d in stage' : 'moved today'}</span>` : ''}${it.value ? `<span>· ${money(it.value)}</span>` : ''}${it.rebate ? '<span class="rb">REBATE</span>' : ''}</div>
      <div class="links">${it.hcp ? `<a class="hcp" href="${esc(it.hcp)}" target="_blank" rel="noopener">Open in Housecall Pro</a>` : ''}${it.ghl ? `<a class="ghl" href="${esc(it.ghl)}" target="_blank" rel="noopener">Open in Go High Level</a>` : ''}${it.board ? `<a href="${esc(it.board)}" target="_blank" rel="noopener">GHL pipeline board</a>` : ''}</div>
      <div class="sec"><b>What we're doing</b>${sum.length ? `<ul class="sum">${sum.map(z => `<li>${esc(z)}</li>`).join('')}</ul>` : '<div class="none">No summary on the card yet.</div>'}<div class="kv" style="margin-top:8px">${it.scheduled ? `<span>Scheduled</span><b>${esc(it.scheduled)}</b>` : ''}${it.address ? `<span>Address</span><b>${esc(it.address)}</b>` : ''}${it.phone ? `<span>Phone</span><a href="tel:${esc(it.phone)}">${esc(it.phone)}</a>` : ''}${it.email ? `<span>Email</span><a href="mailto:${esc(it.email)}">${esc(it.email)}</a>` : ''}${it.source ? `<span>Source</span><b>${esc(it.source)}</b>` : ''}</div></div>
      <div class="sec"><b>Automations</b>${wf || '<div class="none">Not in any follow-up automation right now.</div>'}</div>
      ${(it.forms || []).length ? `<div class="sec"><b>Website form</b>${it.forms.map(f => `<div class="note">${esc(fmt(f.at))}\n${esc(f.answers.join('\n'))}</div>`).join('')}</div>` : ''}
      <div class="sec"><b>Messages</b>${(it.msgs || []).length ? it.msgs.slice().reverse().map(x => `<div class="msg">${x.dir === 'inbound' ? '← ' : '→ '}${esc(x.text)}${x.src === 'workflow' ? '<span class="au">AUTO</span>' : ''}<em>${esc(x.type)} · ${esc(fmt(x.at))}</em></div>`).join('') : '<div class="none">No texts or emails in Go High Level.</div>'}</div>
      <div class="sec"><b>Notes</b>${(it.notes || []).length ? it.notes.map(n => `<div class="note">${esc(fmt(n.at))}\n${esc(n.body)}</div>`).join('') : '<div class="none">No notes.</div>'}</div>
      <div class="sub" style="margin-top:12px">Tags: ${esc((it.tags || []).join(', ') || 'none')}</div></aside>`;
    while (el.firstChild) root.appendChild(el.firstChild);
  }
  root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) { openId = null; side(); return; } const o = e.target.closest('[data-op]'); if (o) { openId = o.dataset.op; side(); } });
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openId) { openId = null; side(); } });
  app.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) { sel = b.dataset.p; q = ''; try { localStorage.setItem('hb-pipe', sel); } catch (x) {} draw(); } });
  app.addEventListener('input', (e) => { if (e.target.id === 'q') { q = e.target.value; const pos = e.target.selectionStart; draw(); const qi = root.getElementById('q'); if (qi) { qi.focus(); qi.setSelectionRange(pos, pos); } } });
  app.addEventListener('change', (e) => { if (e.target.id === 'he') { hideEmpty = e.target.checked; try { localStorage.setItem('hb-pipe-hide', hideEmpty ? '1' : '0'); } catch (x) {} draw(); } });
  const off = db.doc('board/pipelines').onSnapshot((s) => { loaded = true; D = s.exists ? s.data() : null; draw(); if (openId) side(); }, () => { loaded = true; draw(); });
  return () => { try { off && off(); } catch (e) {} root.innerHTML = ''; };
}
