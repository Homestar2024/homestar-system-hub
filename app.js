// Homestar System Hub - v0.2.1 (Phase 2 stress-test fixes: policy tree, bucket images, runner guards: training tracks, runner, my record, dashboard). No build step: ES modules from esm.sh, hash routing.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { createClient } from '@supabase/supabase-js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const html = htm.bind(React.createElement);
const SUPABASE_URL = 'https://ovkdrtxgemvnpflebrxh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92a2RydHhnZW12bnBmbGVicnhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODQwMDEsImV4cCI6MjEwODQ2MDAwMX0.MCy_aqM6O6bUnOcyZ6vbVMrAJE69qZndZ8FBSsMWnf4';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
const LIBS = { system: 'Systems', policy: 'Policies', training: 'Training' };
const STATES = { draft: 'Draft', review: 'In review', live: 'Live', retired: 'Retired' };

// ---------- helpers ----------
const useHash = () => {
  const [h, setH] = useState(location.hash.slice(1) || '/');
  useEffect(() => { const f = () => setH(location.hash.slice(1) || '/'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return h;
};
const go = (p) => { location.hash = p; };
const videoEmbed = (url) => {
  if (!url) return null;
  let m = url.match(/loom\.com\/(?:share|embed)\/([a-f0-9]+)/i); if (m) return `https://www.loom.com/embed/${m[1]}`;
  m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/); if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = url.match(/wistia\.com\/(?:medias|embed\/iframe)\/([\w]+)/); if (m) return `https://fast.wistia.net/embed/iframe/${m[1]}`;
  return null;
};
marked.setOptions({ gfm: true, breaks: false });
const render = (md) => ({ __html: DOMPurify.sanitize(marked.parse(md || '').replace(/src="hubimg:\/\/([^"]+)"/g, 'data-hubimg="$1"'), { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'src'] }) });
// images live in the private Storage bucket 'images' (key = <item uuid>__<file>); resolve to short-lived signed URLs after render
const imgCache = new Map();
async function signedImg(name) {
  if (!imgCache.has(name)) imgCache.set(name, sb.storage.from('images').createSignedUrl(name, 3600).then(r => (r.data && r.data.signedUrl) || ''));
  return imgCache.get(name);
}
function Md({ md }) {
  const ref = useRef(null);
  useEffect(() => { if (!ref.current) return; ref.current.querySelectorAll('img[data-hubimg]').forEach(img => { const n = decodeURIComponent(img.getAttribute('data-hubimg')); img.alt = img.alt || 'image'; img.loading = 'lazy'; signedImg(n).then(u => { if (u) img.src = u; else img.replaceWith(Object.assign(document.createElement('span'), { className: 'muted', textContent: '[image unavailable: ' + n.split('__').slice(1).join('__') + ']' })); }); }); }, [md]);
  return html`<div class="md" ref=${ref} dangerouslySetInnerHTML=${render(md)}></div>`;
}
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-CA') : '';
const isChecklist = (md) => /^\s*(\d+\.|[-*]\s*\[ \])\s+/m.test(md || '');

// ---------- auth ----------
function Login() {
  const [mode, setMode] = useState('in'); const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [name, setName] = useState(''); const [err, setErr] = useState(''); const [msg, setMsg] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    if (mode === 'in') { const { error } = await sb.auth.signInWithPassword({ email, password: pw }); if (error) setErr(error.message); }
    else if (mode === 'up') { const { error } = await sb.auth.signUp({ email, password: pw, options: { data: { name } } }); if (error) setErr(error.message); else setMsg('Account created. Sign in now; Calvin will activate your access.'); }
    else { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); if (error) setErr(error.message); else setMsg('Reset email sent.'); }
  };
  return html`<form class="login" onSubmit=${submit}>
    <img src="logo.png" alt="Homestar HVAC Solutions"/>
    <h2 style=${{ margin: '0 0 14px', textAlign: 'center' }}>Homestar System Hub</h2>
    ${err && html`<div class="err">${err}</div>`}${msg && html`<div class="muted" style=${{ marginBottom: 8 }}>${msg}</div>`}
    ${mode === 'up' && html`<label>Name<input value=${name} onInput=${e => setName(e.target.value)} required/></label>`}
    <label>Email<input type="email" value=${email} onInput=${e => setEmail(e.target.value)} required autocomplete="username"/></label>
    ${mode !== 'reset' && html`<label>Password<input type="password" value=${pw} onInput=${e => setPw(e.target.value)} required minLength="8" autocomplete=${mode === 'up' ? 'new-password' : 'current-password'}/></label>`}
    <button class="btn" style=${{ width: '100%' }}>${mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset email'}</button>
    <div class="row muted" style=${{ marginTop: 12, justifyContent: 'space-between', fontSize: 13 }}>
      <a href="#" onClick=${e => { e.preventDefault(); setMode(mode === 'in' ? 'up' : 'in'); }}>${mode === 'in' ? 'New here? Create account' : 'Have an account? Sign in'}</a>
      <a href="#" onClick=${e => { e.preventDefault(); setMode('reset'); }}>Forgot password</a>
    </div></form>`;
}

// ---------- data ----------
async function loadAll() {
  const [d, f, i] = await Promise.all([
    sb.from('departments').select('*').order('sort_order'),
    sb.from('folders').select('*').order('sort_order'),
    sb.from('items').select('id,type,folder_id,department_id,title,slug,overview,state,owner_id,next_review,last_reviewed,videos,sort_order,updated_at').order('sort_order').order('title'),
  ]);
  const [t, p, so] = await Promise.all([sb.from('tracks').select('*'), sb.from('progress').select('*'), sb.from('signoffs').select('person_id,item_id,agreed_at')]);
  return { departments: d.data || [], folders: f.data || [], items: i.data || [], tracks: t.data || [], progress: p.data || [], signoffs: so.data || [], error: d.error || f.error || i.error };
}

// ---------- components ----------
function Tree({ lib, data, current, onPick }) {
  const [open, setOpen] = useState({});
  const folders = data.folders.filter(f => f.library === lib);
  const items = data.items.filter(i => i.type === lib);
  const byDept = (dId) => folders.filter(f => (f.department_id || null) === (dId || null) && !f.parent_id);
  const kids = (fid) => folders.filter(f => f.parent_id === fid);
  const inFolder = (fid) => items.filter(i => i.folder_id === fid);
  const Folder = ({ f, depth }) => {
    const o = open[f.id] !== false;
    return html`<div style=${{ marginLeft: depth * 10 }}>
      <div class="folder" onClick=${() => setOpen({ ...open, [f.id]: !o })}>${o ? '▾' : '▸'} ${f.name}</div>
      ${o && kids(f.id).map(k => html`<${Folder} key=${k.id} f=${k} depth=${depth + 1}/>`)}
      ${o && inFolder(f.id).map(i => html`<div key=${i.id} class=${'item' + (current === i.slug ? ' on' : '')} onClick=${() => onPick(i)}><span class=${'dot ' + i.state}></span>${i.title}</div>`)}
    </div>`;
  };
  const used = (dId) => byDept(dId).length || items.some(i => (i.department_id || null) === (dId || null) && !i.folder_id);
  const depts = [...data.departments.filter(d => used(d.id)), ...(used(null) ? [{ id: null, name: 'Company' }] : [])];
  return html`<div class="tree">${depts.map(d => html`<div key=${d.id || 'co'}>
    <div class="dept">${d.name}</div>
    ${byDept(d.id).map(f => html`<${Folder} key=${f.id} f=${f} depth=${0}/>`)}
    ${items.filter(i => (i.department_id || null) === (d.id || null) && !i.folder_id).map(i => html`<div key=${i.id} class=${'item' + (current === i.slug ? ' on' : '')} onClick=${() => onPick(i)}><span class=${'dot ' + i.state}></span>${i.title}</div>`)}
  </div>`)}</div>`;
}

function ItemTable({ rows, data, title }) {
  const fname = (id) => (data.folders.find(f => f.id === id) || {}).name || '';
  const dname = (id) => (data.departments.find(d => d.id === id) || {}).name || 'Company';
  return html`<div class="card"><h3 style=${{ margin: '0 0 10px' }}>${title}</h3>
    <table class="table"><thead><tr><th>State</th><th>Title</th><th>Department</th><th>Folder</th><th>Updated</th></tr></thead>
    <tbody>${rows.map(i => html`<tr key=${i.id} onClick=${() => go(`/${i.type}/${i.slug}`)}><td><span class=${'badge ' + i.state}>${STATES[i.state]}</span></td><td>${i.title}</td><td>${dname(i.department_id)}</td><td>${fname(i.folder_id)}</td><td class="muted">${fmtDate(i.updated_at)}</td></tr>`)}
    ${!rows.length && html`<tr><td colSpan="5" class="muted">Nothing here yet.</td></tr>`}</tbody></table></div>`;
}

async function markProgress(me, data, itemId) {
  const rows = data.tracks.filter(t => (t.steps || []).some(st => st.item_id === itemId)).map(t => ({ person_id: me.id, track_id: t.id, item_id: itemId, status: 'complete', completed_at: new Date().toISOString() }));
  if (rows.length) await sb.from('progress').upsert(rows, { onConflict: 'person_id,track_id,item_id' });
}
function TrackPanel({ track, data, me, onRun }) {
  const steps = track.steps || []; const done = new Set(data.progress.filter(p => p.person_id === me.id && p.track_id === track.id && p.status === 'complete').map(p => p.item_id));
  const pct = steps.length ? Math.round(100 * steps.filter(s => done.has(s.item_id)).length / steps.length) : 0; const mins = steps.reduce((a, s) => a + (s.minutes || 0), 0);
  return html`<div class="card"><div class="row" style=${{ justifyContent: 'space-between' }}><h3 style=${{ margin: 0 }}>Learning Track <span class="muted" style=${{ fontWeight: 400, fontSize: 13 }}>· ${steps.length} items · about ${mins} min</span></h3><button class="btn orange" onClick=${onRun}>${pct === 100 ? 'Review' : pct > 0 ? 'Continue' : 'Run'}</button></div>
    <div class="progress" style=${{ margin: '10px 0' }}><i style=${{ width: pct + '%' }}></i></div><div class="muted" style=${{ fontSize: 13, marginBottom: 8 }}>${pct}% complete</div>
    ${steps.map((st, n) => { const it = data.items.find(i => i.id === st.item_id); return html`<div key=${n} class="row" style=${{ justifyContent: 'space-between', padding: '7px 0', borderTop: '1px solid var(--line)' }}><a href=${it ? '#/' + it.type + '/' + it.slug : '#'}>${n + 1}. ${it ? it.title : 'missing item'}</a><span class="muted" style=${{ fontSize: 13 }}>${st.minutes} min · ${done.has(st.item_id) ? html`<strong style=${{ color: 'var(--live)' }}>Complete</strong>` : 'Incomplete'}</span></div>`; })}</div>`;
}
function ItemView({ slug, data, me, people, reload }) {
  const [item, setItem] = useState(null); const [check, setCheck] = useState(false); const [done, setDone] = useState({}); const [agreed, setAgreed] = useState(null); const [comments, setComments] = useState([]); const [c, setC] = useState('');
  useEffect(() => { (async () => {
    const { data: it } = await sb.from('items').select('*').eq('slug', slug).single(); setItem(it || null);
    if (it) {
      const { data: s } = await sb.from('signoffs').select('agreed_at').eq('item_id', it.id).eq('person_id', me.id).order('agreed_at', { ascending: false }).limit(1); setAgreed(s && s[0] ? s[0].agreed_at : null);
      const { data: cm } = await sb.from('comments').select('*').eq('item_id', it.id).order('created_at'); setComments(cm || []);
      sb.from('activity_log').insert({ person_id: me.id, action: 'view', item_id: it.id });
    }
  })(); }, [slug]);
  if (item === null) return html`<div class="muted">Loading…</div>`;
  if (!item) return html`<div class="card">Not found or not visible to you.</div>`;
  const sibs = data.items.filter(i => i.type === item.type && i.folder_id === item.folder_id); const ix = sibs.findIndex(s => s.id === item.id);
  const folder = data.folders.find(f => f.id === item.folder_id); const dept = data.departments.find(d => d.id === item.department_id);
  const owner = people.find(p => p.id === item.owner_id);
  const vids = (item.videos || []).map(videoEmbed).filter(Boolean);
  const agree = async () => { const { error } = await sb.from('signoffs').insert({ person_id: me.id, item_id: item.id }); if (!error) { setAgreed(new Date().toISOString()); await markProgress(me, data, item.id); if (reload) reload(); } };
  const track = item.type === 'training' ? data.tracks.find(t => t.training_id === item.id) : null;
  const post = async () => { if (!c.trim()) return; const { data: row } = await sb.from('comments').insert({ item_id: item.id, author_id: me.id, body: c.trim() }).select().single(); if (row) { setComments([...comments, row]); setC(''); } };
  const steps = check ? (item.body_md.match(/^\s*(?:\d+\.|[-*]\s*\[ \])\s+(.+)$/gm) || []).map(s => s.replace(/^\s*(?:\d+\.|[-*]\s*\[ \])\s+/, '')) : [];
  const canEdit = me.role === 'admin' || item.owner_id === me.id || (me.role === 'manager' && me.department_id === item.department_id);
  return html`<div>
    <div class="crumb">${dept ? dept.name : 'Company'}${folder ? ' › ' + folder.name : ''}
      ${ix > 0 && html` <a href=${'#/' + item.type + '/' + sibs[ix - 1].slug}>‹ prev</a>`}${ix < sibs.length - 1 && html` <a href=${'#/' + item.type + '/' + sibs[ix + 1].slug}>next ›</a>`}</div>
    <h1 class="title"><span class=${'dot ' + item.state} style=${{ width: 12, height: 12 }}></span>${item.title}</h1>
    <div class="row muted" style=${{ fontSize: 13, marginBottom: 12 }}><span class=${'badge ' + item.state}>${STATES[item.state]}</span>
      ${owner && html`<span>Owner: ${owner.name}</span>`}${item.last_reviewed && html`<span>Last reviewed ${fmtDate(item.last_reviewed)}</span>`}${item.next_review && html`<span>Next review ${fmtDate(item.next_review)}</span>`}
      ${isChecklist(item.body_md) && html`<button class=${'btn sm ' + (check ? '' : 'ghost')} onClick=${() => setCheck(!check)}>${check ? 'Reading mode' : 'Checklist mode'}</button>`}</div>
    ${item.overview && html`<div class="card"><h3 style=${{ margin: '0 0 6px' }}>Overview</h3><${Md} md=${item.overview}/></div>`}
    ${track && html`<${TrackPanel} track=${track} data=${data} me=${me} onRun=${() => go('/run/' + track.id + '/0')}/>`}
    ${vids.map(v => html`<iframe key=${v} class="video" src=${v} allow="autoplay; fullscreen" allowfullscreen></iframe>`)}
    <div class="card">${check ? html`<div><div class="progress" style=${{ marginBottom: 10 }}><i style=${{ width: (100 * Object.values(done).filter(Boolean).length / Math.max(1, steps.length)) + '%' }}></i></div>
        ${steps.map((s, n) => html`<label key=${n} class=${'check' + (done[n] ? ' done' : '')}><input type="checkbox" checked=${!!done[n]} onChange=${e => setDone({ ...done, [n]: e.target.checked })}/><span>${s}</span></label>`)}</div>`
      : html`<${Md} md=${item.body_md}/>`}</div>
    ${(item.templates || []).length > 0 && html`<div class="card"><h3 style=${{ margin: '0 0 6px' }}>Templates</h3>${item.templates.map((t, n) => html`<div key=${n} class="tpl"><div class="row" style=${{ justifyContent: 'space-between' }}><strong>${t.name}</strong><button class="btn sm ghost" onClick=${() => navigator.clipboard.writeText(t.body || '')}>Copy</button></div><pre>${t.body}</pre></div>`)}</div>`}
    ${(item.attachments || []).length > 0 && html`<div class="card"><h3 style=${{ margin: '0 0 6px' }}>Attachments</h3>${item.attachments.map((a, n) => html`<div key=${n}><a href=${a.url} target="_blank" rel="noopener">${a.name || a.url}</a></div>`)}</div>`}
    <div class="card"><h3 style=${{ margin: '0 0 6px' }}>Comments</h3>
      ${comments.map(cm => html`<div key=${cm.id} style=${{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}><span class="muted" style=${{ fontSize: 12 }}>${(people.find(p => p.id === cm.author_id) || {}).name || 'Someone'} · ${fmtDate(cm.created_at)}</span><div>${cm.body}</div></div>`)}
      <div class="row" style=${{ marginTop: 10 }}><input style=${{ flex: 1, padding: 9, border: '1px solid var(--line)', borderRadius: 8 }} placeholder="Add a comment" value=${c} onInput=${e => setC(e.target.value)}/><button class="btn sm" onClick=${post}>Comment</button></div></div>
    <div class="card row" style=${{ justifyContent: 'space-between' }}>
      <div>${agreed ? html`<span class="muted">You agreed on ${fmtDate(agreed)}.</span>` : html`<span class="muted">Read it? Confirm you understand and will follow it.</span>`}</div>
      ${!agreed && html`<button class="btn orange" onClick=${agree}>Agree</button>`}</div>
    ${canEdit && html`<div class="muted" style=${{ fontSize: 13 }}>Editing arrives in Phase 3. Until then, ask Claude to update this system in the Cowork folder.</div>`}
  </div>`;
}

function Runner({ trackId, n, data, me, people, reload }) {
  const track = data.tracks.find(t => t.id === trackId); if (!track) return html`<div class="card">Track not found.</div>`;
  const steps = track.steps || []; if (!steps.length) return html`<div class="card">This track has no steps yet.</div>`;
  const idx = Math.min(Math.max(0, parseInt(n) || 0), steps.length - 1); const step = steps[idx]; const it = data.items.find(i => i.id === step.item_id);
  const training = data.items.find(i => i.id === track.training_id);
  const done = new Set(data.progress.filter(p => p.person_id === me.id && p.track_id === track.id && p.status === 'complete').map(p => p.item_id));
  const [full, setFull] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { setFull(null); if (it) sb.from('items').select('*').eq('id', it.id).single().then(({ data }) => setFull(data || null)); }, [step.item_id]);
  const vids = ((full && full.videos) || []).map(videoEmbed).filter(Boolean);
  const agree = async () => { setBusy(true); await sb.from('signoffs').insert({ person_id: me.id, item_id: step.item_id }); await markProgress(me, data, step.item_id); await reload(); setBusy(false); if (idx < steps.length - 1) go(`/run/${track.id}/${idx + 1}`); };
  const pct = steps.length ? Math.round(100 * steps.filter(s => done.has(s.item_id)).length / steps.length) : 0;
  return html`<div class="runner">
    <aside class="side" style=${{ display: 'block', position: 'static', borderRight: '1px solid var(--line)' }}><div style=${{ fontWeight: 700, marginBottom: 6 }}>${training ? training.title : 'Learning track'}</div><div class="progress"><i style=${{ width: pct + '%' }}></i></div><div class="muted" style=${{ fontSize: 12, margin: '4px 0 10px' }}>${pct}% complete</div>
      ${steps.map((st, i) => { const x = data.items.find(q => q.id === st.item_id); return html`<div key=${i} class=${'item' + (i === idx ? ' on' : '')} onClick=${() => go(`/run/${track.id}/${i}`)}><span class="dot" style=${{ background: done.has(st.item_id) ? 'var(--live)' : 'var(--draft)' }}></span>${x ? x.title : '?'}</div>`; })}</aside>
    <main class="main">
      <div class="crumb">Step ${idx + 1} of ${steps.length} · ${step.minutes} min</div>
      <h1 class="title">${it ? it.title : 'Missing item'}</h1>
      ${!it ? html`<div class="card muted">This item isn't published yet or isn't visible to you. Skip to the next step.</div>` : !full ? html`<div class="muted">Loading…</div>` : html`<div>
        ${full.overview && html`<div class="card"><${Md} md=${full.overview}/></div>`}
        ${vids.map(v => html`<iframe key=${v} class="video" src=${v} allow="autoplay; fullscreen" allowfullscreen></iframe>`)}
        <div class="card"><${Md} md=${full.body_md}/></div></div>`}
      <div class="card row" style=${{ justifyContent: 'space-between' }}>
        <div>${done.has(step.item_id) ? html`<span class="muted">Completed. ${idx < steps.length - 1 ? '' : 'This was the last item.'}</span>` : html`<span class="muted">Read or watch it, then confirm you understand and will follow it.</span>`}</div>
        <div class="row">${idx > 0 && html`<button class="btn ghost" onClick=${() => go(`/run/${track.id}/${idx - 1}`)}>‹ Back</button>`}
          ${!done.has(step.item_id) && it ? html`<button class="btn orange" disabled=${busy} onClick=${agree}>Agree and continue</button>` : idx < steps.length - 1 ? html`<button class="btn" onClick=${() => go(`/run/${track.id}/${idx + 1}`)}>Next ›</button>` : html`<a class="btn" href=${'#/training/' + (training ? training.slug : '')}>Back to training</a>`}</div></div>
    </main></div>`;
}
function MyRecord({ data, me, people }) {
  const my = data.signoffs.filter(s => s.person_id === me.id).sort((a, b) => b.agreed_at.localeCompare(a.agreed_at));
  const myTracks = data.tracks.map(t => { const steps = t.steps || []; const d = steps.filter(s => data.progress.some(p => p.person_id === me.id && p.track_id === t.id && p.item_id === s.item_id && p.status === 'complete')).length; return { t, steps: steps.length, done: d, training: data.items.find(i => i.id === t.training_id) }; }).filter(x => x.done > 0 || (x.training && x.training.state === 'live'));
  return html`<div><h1 class="title">My record</h1>
    <div class="card"><h3 style=${{ margin: '0 0 8px' }}>Training</h3>${myTracks.map(x => html`<div key=${x.t.id} class="row" style=${{ justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--line)' }}><a href=${'#/training/' + (x.training ? x.training.slug : '')}>${x.training ? x.training.title : '?'}</a><span class="muted" style=${{ fontSize: 13 }}>${x.done}/${x.steps} · ${x.steps ? Math.round(100 * x.done / x.steps) : 0}%</span></div>`)}</div>
    <div class="card"><h3 style=${{ margin: '0 0 8px' }}>Sign-offs (${my.length})</h3><table class="table"><thead><tr><th>Item</th><th>Type</th><th>Agreed</th></tr></thead><tbody>${my.map((s, n) => { const it = data.items.find(i => i.id === s.item_id); return html`<tr key=${n} onClick=${() => it && go('/' + it.type + '/' + it.slug)}><td>${it ? it.title : '(removed item)'}</td><td>${it ? LIBS[it.type] : ''}</td><td class="muted">${fmtDate(s.agreed_at)}</td></tr>`; })}</tbody></table>
    <p class="muted" style=${{ fontSize: 13 }}>Print this page (Ctrl+P) for the HR file; a PDF export arrives with Phase 3.</p></div></div>`;
}
function Dashboard({ data, me, people }) {
  if (!['admin', 'manager'].includes(me.role)) return html`<div class="card">Managers and admins only.</div>`;
  const scope = me.role === 'admin' ? people : people.filter(p => p.department_id === me.department_id);
  const liveTracks = data.tracks.filter(t => { const tr = data.items.find(i => i.id === t.training_id); return tr && tr.state === 'live'; });
  const today = new Date().toISOString().slice(0, 10); const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const stale = data.items.filter(i => i.state === 'live' && ((i.next_review && i.next_review < today) || (!i.next_review && (i.last_reviewed || i.updated_at || '').slice(0, 10) < yearAgo)));
  const drafts = data.items.filter(i => i.state === 'draft' || i.state === 'review');
  return html`<div><h1 class="title">Dashboard</h1>
    <div class="row" style=${{ marginBottom: 14 }}>${[['People', scope.filter(p => p.active).length], ['Live items', data.items.filter(i => i.state === 'live').length], ['Drafts / in review', drafts.length], ['Needs review', stale.length], ['Sign-offs', data.signoffs.length]].map(([k, v]) => html`<div key=${k} class="card" style=${{ flex: 1, minWidth: 120, marginBottom: 0 }}><div class="muted" style=${{ fontSize: 12, textTransform: 'uppercase' }}>${k}</div><div style=${{ fontSize: 26, fontWeight: 700 }}>${v}</div></div>`)}</div>
    <div class="card"><h3 style=${{ margin: '0 0 8px' }}>Training completion</h3><div style=${{ overflow: 'auto' }}><table class="table"><thead><tr><th>Person</th>${liveTracks.map(t => { const tr = data.items.find(i => i.id === t.training_id); return html`<th key=${t.id} title=${tr.title}>${tr.title.length > 22 ? tr.title.slice(0, 20) + '…' : tr.title}</th>`; })}</tr></thead>
      <tbody>${scope.filter(p => p.active).map(p => html`<tr key=${p.id}><td>${p.name}</td>${liveTracks.map(t => { const steps = (t.steps || []).length; const d = (t.steps || []).filter(s => data.progress.some(pr => pr.person_id === p.id && pr.track_id === t.id && pr.item_id === s.item_id && pr.status === 'complete')).length; const pct = steps ? Math.round(100 * d / steps) : 0; return html`<td key=${t.id}><span class=${'badge ' + (pct === 100 ? 'live' : pct > 0 ? 'review' : 'draft')}>${pct}%</span></td>`; })}</tr>`)}</tbody></table></div></div>
    <${ItemTable} rows=${stale} data=${data} title="Live items overdue for review (no review in 12 months)"/>
    <${ItemTable} rows=${drafts} data=${data} title="Drafts and items in review"/>
  </div>`;
}
function Home({ data, me, people }) {
  const recent = [...data.items].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')).slice(0, 8);
  const mine = data.items.filter(i => i.department_id === me.department_id && i.state === 'live');
  return html`<div>
    <h1 class="title">Welcome, ${me.name.split(' ')[0]}</h1>
    <div class="card"><strong>Your department:</strong> ${(data.departments.find(d => d.id === me.department_id) || {}).name || 'not set yet (ask Calvin)'} · <strong>Role:</strong> ${me.role}</div>
    ${(() => { const open = data.tracks.map(t => { const steps = t.steps || []; const d = steps.filter(s => data.progress.some(p => p.person_id === me.id && p.track_id === t.id && p.item_id === s.item_id && p.status === 'complete')).length; return { t, steps: steps.length, done: d, training: data.items.find(i => i.id === t.training_id) }; }).filter(x => x.training && x.training.state === 'live' && x.done < x.steps && (x.training.department_id === me.department_id || !x.training.department_id || x.training.department_id === (data.departments.find(d => d.name === 'Company') || {}).id)).slice(0, 6);
      return open.length ? html`<div class="card"><h3 style=${{ margin: '0 0 8px' }}>Your training</h3>${open.map(x => html`<div key=${x.t.id} class="row" style=${{ justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--line)' }}><a href=${'#/training/' + x.training.slug}>${x.training.title}</a><div class="row"><div class="progress" style=${{ width: 120 }}><i style=${{ width: (x.steps ? 100 * x.done / x.steps : 0) + '%' }}></i></div><span class="muted" style=${{ fontSize: 13 }}>${x.done}/${x.steps}</span><a class="btn sm orange" href=${'#/run/' + x.t.id + '/' + Math.max(0, (x.t.steps || []).findIndex(s => !data.progress.some(p => p.person_id === me.id && p.track_id === x.t.id && p.item_id === s.item_id && p.status === 'complete')))}>${x.done ? 'Continue' : 'Start'}</a></div></div>`)}</div>` : null; })()}
    <${ItemTable} rows=${mine.slice(0, 12)} data=${data} title="Live systems in your department"/>
    <${ItemTable} rows=${recent} data=${data} title="Recently updated"/>
  </div>`;
}

function People({ data, people, me, reload }) {
  if (me.role !== 'admin') return html`<div class="card">Admins only.</div>`;
  const set = async (p, patch) => { await sb.from('people').update(patch).eq('id', p.id); reload(); };
  return html`<div><h1 class="title">People</h1><table class="table"><thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Role</th><th>Active</th></tr></thead><tbody>
    ${people.map(p => html`<tr key=${p.id}><td>${p.name}</td><td>${p.email}</td>
      <td><select value=${p.department_id || ''} onChange=${e => set(p, { department_id: e.target.value || null })}><option value="">—</option>${data.departments.map(d => html`<option key=${d.id} value=${d.id}>${d.name}</option>`)}</select></td>
      <td><select value=${p.role} onChange=${e => set(p, { role: e.target.value })}><option>member</option><option>manager</option><option>admin</option></select></td>
      <td><input type="checkbox" checked=${p.active} onChange=${e => set(p, { active: e.target.checked })}/></td></tr>`)}</tbody></table>
    <p class="muted" style=${{ fontSize: 13 }}>New staff create their own account from the sign-in page; set their department and role here. The first account created is made admin by Claude.</p></div>`;
}

function App() {
  const route = useHash(); const [session, setSession] = useState(undefined); const [me, setMe] = useState(null); const [data, setData] = useState(null); const [people, setPeople] = useState([]); const [q, setQ] = useState(''); const [side, setSide] = useState(false);
  useEffect(() => { sb.auth.getSession().then(({ data }) => setSession(data.session)); const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s)); return () => sub.subscription.unsubscribe(); }, []);
  const reload = async () => { const { data: p } = await sb.from('people').select('*').order('name'); setPeople(p || []); setMe((p || []).find(x => x.id === session.user.id) || { id: session.user.id, name: session.user.email, role: 'member' }); setData(await loadAll()); };
  useEffect(() => { if (session) reload(); }, [session]);
  if (session === undefined) return html`<div class="boot">Loading…</div>`;
  if (!session) return html`<${Login}/>`;
  if (!data || !me) return html`<div class="boot">Loading your hub…</div>`;
  if (me.active === false) return html`<div class="login"><img src="logo.png" alt=""/><h2 style=${{ textAlign: 'center' }}>Almost there</h2><p class="muted">Your account (${me.email}) is created but not activated yet. Calvin activates new accounts and sets your department. Check back shortly.</p><button class="btn ghost" style=${{ width: '100%' }} onClick=${() => sb.auth.signOut()}>Sign out</button></div>`;
  const parts = route.split('/').filter(Boolean); const lib = ['system', 'policy', 'training'].includes(parts[0]) ? parts[0] : null; const slug = lib ? parts[1] : null;
  const results = q.trim() ? data.items.filter(i => (i.title + ' ' + (i.overview || '')).toLowerCase().includes(q.toLowerCase())) : null;
  const navA = (p, label) => html`<a href=${'#' + p} class=${(route === p || (p !== '/' && route.startsWith(p))) ? 'on' : ''}>${label}</a>`;
  if (parts[0] === 'run') return html`<div><header class="top"><img src="logo.png" alt=""/><span class="brand">System Hub</span><nav>${navA('/training', '‹ Training')}</nav><span class="grow"></span><button class="btn ghost sm" onClick=${() => sb.auth.signOut()}>Sign out</button></header><${Runner} key=${parts[1] + '/' + parts[2]} trackId=${parts[1]} n=${parts[2]} data=${data} me=${me} people=${people} reload=${reload}/></div>`;
  return html`<div>
    <header class="top"><button class="btn ghost sm menu-btn" onClick=${() => setSide(!side)}>☰</button><img src="logo.png" alt=""/><span class="brand">System Hub</span>
      <nav>${navA('/', 'Home')}${navA('/system', 'Systems')}${navA('/policy', 'Policies')}${navA('/training', 'Training')}${navA('/me', 'My record')}${['admin', 'manager'].includes(me.role) && navA('/dashboard', 'Dashboard')}${me.role === 'admin' && navA('/people', 'People')}</nav>
      <span class="grow"></span><input placeholder="Search…" value=${q} onInput=${e => setQ(e.target.value)}/>
      <button class="btn ghost sm" onClick=${() => sb.auth.signOut()}>Sign out</button></header>
    <div class="layout">
      <aside class=${'side' + (side ? ' open' : '')}>${lib ? html`<${Tree} lib=${lib} data=${data} current=${slug} onPick=${i => { go(`/${i.type}/${i.slug}`); setSide(false); }}/>` : html`<div class="muted" style=${{ fontSize: 13 }}>Pick Systems, Policies or Training to browse the tree.</div>`}</aside>
      <main class="main">
        ${results ? html`<${ItemTable} rows=${results} data=${data} title=${`Search: ${q}`}/>`
        : slug ? html`<${ItemView} key=${slug} slug=${slug} data=${data} me=${me} people=${people} reload=${reload}/>`
        : lib ? html`<${ItemTable} rows=${data.items.filter(i => i.type === lib)} data=${data} title=${LIBS[lib]}/>`
        : parts[0] === 'people' ? html`<${People} data=${data} people=${people} me=${me} reload=${reload}/>`
        : parts[0] === 'me' ? html`<${MyRecord} data=${data} me=${me} people=${people}/>`
        : parts[0] === 'dashboard' ? html`<${Dashboard} data=${data} me=${me} people=${people}/>`
        : html`<${Home} data=${data} me=${me} people=${people}/>`}
      </main>
      <aside class="rail"><h4>Access</h4><div>${me.name}</div><div class="muted" style=${{ fontSize: 13 }}>${me.email || session.user.email}</div>
        <h4>States</h4>${Object.keys(STATES).map(s => html`<div key=${s} class="row" style=${{ fontSize: 13, padding: '2px 0' }}><span class=${'dot ' + s}></span>${STATES[s]}</div>`)}
        <h4>Counts</h4><div class="muted" style=${{ fontSize: 13 }}>${data.items.filter(i => i.type === 'system').length} systems · ${data.items.filter(i => i.type === 'policy').length} policies · ${data.items.filter(i => i.type === 'training').length} trainings</div></aside>
    </div></div>`;
}
createRoot(document.getElementById('root')).render(html`<${App}/>`);
