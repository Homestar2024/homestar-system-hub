// Homestar System Hub - v0.6 (Ask v2: conversation memory, feedback + gaps, actions, voice, excerpts, report, draft-a-fix, dashboard stats; 4b: Ask Homestar via Edge Function 'ask' + search_items; 4a: quick-check quizzes in runner + item page, My record, dashboard; 3c: image upload from the editor - paste/drop/picker; 3b: in-app editor, version history + restore, comment resolve, review reminders, My record print; training tracks, runner, my record, dashboard). No build step: ES modules from esm.sh, hash routing.
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
  const [t, p, so, qz, qr] = await Promise.all([sb.from('tracks').select('*'), sb.from('progress').select('*'), sb.from('signoffs').select('person_id,item_id,agreed_at'), sb.from('quizzes').select('item_id,pass_mark,questions'), sb.from('quiz_results').select('person_id,item_id,score,passed,attempted_at')]);
  return { departments: d.data || [], folders: f.data || [], items: i.data || [], tracks: t.data || [], progress: p.data || [], signoffs: so.data || [], quizzes: qz.data || [], quizResults: qr.data || [], error: d.error || f.error || i.error };
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
  const [edit, setEdit] = useState(false); const [showHist, setShowHist] = useState(false); const [quizOpen, setQuizOpen] = useState(false);
  const refresh = async () => { const { data: it } = await sb.from('items').select('*').eq('slug', slug).single(); setItem(it || null); if (reload) reload(); };
  useEffect(() => { (async () => {
    const { data: it } = await sb.from('items').select('*').eq('slug', slug).single(); setItem(it || null);
    if (it) {
      const { data: s } = await sb.from('signoffs').select('agreed_at').eq('item_id', it.id).eq('person_id', me.id).order('agreed_at', { ascending: false }).limit(1); setAgreed(s && s[0] ? s[0].agreed_at : null);
      const { data: cm } = await sb.from('comments').select('*').eq('item_id', it.id).order('created_at'); setComments(cm || []);
      sb.from('activity_log').insert({ person_id: me.id, action: 'view', item_id: it.id }).then(() => {});
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
      ${isChecklist(item.body_md) && html`<button class=${'btn sm ' + (check ? '' : 'ghost')} onClick=${() => setCheck(!check)}>${check ? 'Reading mode' : 'Checklist mode'}</button>`}
      <a class="btn sm ghost" href=${'#/ask/' + item.slug}>Ask about this</a>
      ${canEdit && !edit && html`<button class="btn sm" onClick=${() => setEdit(true)}>Edit</button>`}${canEdit && !edit && html`<a class="btn sm ghost" href=${'#/fix/' + item.slug}>Draft a fix</a>`}${canEdit && html`<button class="btn sm ghost" onClick=${() => setShowHist(!showHist)}>${showHist ? 'Hide history' : 'History'}</button>`}</div>
    ${edit && html`<${Editor} item=${item} data=${data} me=${me} people=${people} onDone=${async (saved) => { setEdit(false); if (saved) await refresh(); }}/>`}
    ${showHist && html`<${History} item=${item} people=${people} canEdit=${canEdit} onRestored=${async () => { await refresh(); }}/>`}
    ${!edit && item.overview && html`<div class="card"><h3 style=${{ margin: '0 0 6px' }}>Overview</h3><${Md} md=${item.overview}/></div>`}
    ${track && html`<${TrackPanel} track=${track} data=${data} me=${me} onRun=${() => go('/run/' + track.id + '/0')}/>`}
    ${vids.map(v => html`<iframe key=${v} class="video" src=${v} allow="autoplay; fullscreen" allowfullscreen></iframe>`)}
    ${!edit && html`<div class="card">${check ? html`<div><div class="progress" style=${{ marginBottom: 10 }}><i style=${{ width: (100 * Object.values(done).filter(Boolean).length / Math.max(1, steps.length)) + '%' }}></i></div>
        ${steps.map((s, n) => html`<label key=${n} class=${'check' + (done[n] ? ' done' : '')}><input type="checkbox" checked=${!!done[n]} onChange=${e => setDone({ ...done, [n]: e.target.checked })}/><span>${s}</span></label>`)}</div>`
      : html`<${Md} md=${item.body_md}/>`}</div>`}
    ${(item.templates || []).length > 0 && html`<div class="card"><h3 style=${{ margin: '0 0 6px' }}>Templates</h3>${item.templates.map((t, n) => html`<div key=${n} class="tpl"><div class="row" style=${{ justifyContent: 'space-between' }}><strong>${t.name}</strong><button class="btn sm ghost" onClick=${() => navigator.clipboard.writeText(t.body || '')}>Copy</button></div><pre>${t.body}</pre></div>`)}</div>`}
    ${(item.attachments || []).length > 0 && html`<div class="card"><h3 style=${{ margin: '0 0 6px' }}>Attachments</h3>${item.attachments.map((a, n) => html`<div key=${n}><a href=${a.url} target="_blank" rel="noopener">${a.name || a.url}</a></div>`)}</div>`}
    <div class="card"><h3 style=${{ margin: '0 0 6px' }}>Comments</h3>
      ${comments.filter(cm => !cm.resolved).map(cm => html`<div key=${cm.id} style=${{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}><div class="row" style=${{ justifyContent: 'space-between' }}><span class="muted" style=${{ fontSize: 12 }}>${(people.find(p => p.id === cm.author_id) || {}).name || 'Someone'} · ${fmtDate(cm.created_at)}</span>${(canEdit || cm.author_id === me.id) && html`<button class="btn ghost sm" onClick=${async () => { const { error } = await sb.from('comments').update({ resolved: true }).eq('id', cm.id); if (!error) setComments(comments.map(x => x.id === cm.id ? { ...x, resolved: true } : x)); }}>Resolve</button>`}</div><div>${cm.body}</div></div>`)}
      ${comments.some(cm => cm.resolved) && html`<div class="muted" style=${{ fontSize: 12, marginTop: 4 }}>${comments.filter(cm => cm.resolved).length} resolved</div>`}
      <div class="row" style=${{ marginTop: 10 }}><input style=${{ flex: 1, padding: 9, border: '1px solid var(--line)', borderRadius: 8 }} placeholder="Add a comment" value=${c} onInput=${e => setC(e.target.value)}/><button class="btn sm" onClick=${post}>Comment</button></div></div>
    ${(() => { const quiz = quizFor(data, item.id); if (!quiz) return null; const best = bestQuiz(data, me.id, item.id); return quizOpen ? html`<${Quiz} quiz=${quiz} item=${item} me=${me} onPassed=${async () => { if (reload) await reload(); }} onClose=${() => setQuizOpen(false)}/>` : html`<div class="card row" style=${{ justifyContent: 'space-between' }}><span>Quick check: ${best ? (best.passed ? html`<strong style=${{ color: 'var(--live)' }}>passed ${best.score}%</strong>` : `best ${best.score}%, not passed`) : 'not taken'}</span><button class=${'btn sm ' + (best && best.passed ? 'ghost' : 'orange')} onClick=${() => setQuizOpen(true)}>${best && best.passed ? 'Retake' : 'Take the quick check'}</button></div>`; })()}
    <div class="card row" style=${{ justifyContent: 'space-between' }}>
      <div>${agreed ? html`<span class="muted">You agreed on ${fmtDate(agreed)}.</span>` : html`<span class="muted">Read it? Confirm you understand and will follow it.</span>`}</div>
      ${!agreed && html`<button class="btn orange" onClick=${agree}>Agree</button>`}</div>
    ${canEdit && html`<div class="muted" style=${{ fontSize: 12 }}>Edits made here sync to the Cowork brain nightly; edits made in the brain sync here.</div>`}
  </div>`;
}

function Runner({ trackId, n, data, me, people, reload }) {
  const track = data.tracks.find(t => t.id === trackId); if (!track) return html`<div class="card">Track not found.</div>`;
  const steps = track.steps || []; if (!steps.length) return html`<div class="card">This track has no steps yet.</div>`;
  const idx = Math.min(Math.max(0, parseInt(n) || 0), steps.length - 1); const step = steps[idx]; const it = data.items.find(i => i.id === step.item_id);
  const training = data.items.find(i => i.id === track.training_id);
  const done = new Set(data.progress.filter(p => p.person_id === me.id && p.track_id === track.id && p.status === 'complete').map(p => p.item_id));
  const [full, setFull] = useState(null); const [busy, setBusy] = useState(false); const [quizOpen, setQuizOpen] = useState(false);
  useEffect(() => { setFull(null); setQuizOpen(false); if (it) sb.from('items').select('*').eq('id', it.id).single().then(({ data }) => setFull(data || null)); }, [step.item_id]);
  const quiz = it ? quizFor(data, it.id) : null; const best = it ? bestQuiz(data, me.id, it.id) : null; const quizDone = !quiz || (best && best.passed);
  const vids = ((full && full.videos) || []).map(videoEmbed).filter(Boolean);
  const agree = async () => { setBusy(true); await sb.from('signoffs').insert({ person_id: me.id, item_id: step.item_id }); await markProgress(me, data, step.item_id); await reload(); setBusy(false); if (quiz && !(best && best.passed)) setQuizOpen(true); else if (idx < steps.length - 1) go(`/run/${track.id}/${idx + 1}`); };
  const next = () => { if (idx < steps.length - 1) go(`/run/${track.id}/${idx + 1}`); };
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
      ${quizOpen && quiz && it && html`<${Quiz} quiz=${quiz} item=${it} me=${me} onPassed=${async () => { await reload(); }} onClose=${() => { setQuizOpen(false); if (bestQuiz(data, me.id, it.id)?.passed || quizDone) next(); }}/>`}
      ${!quizOpen && quiz && done.has(step.item_id) && !quizDone && html`<div class="card row" style=${{ justifyContent: 'space-between', borderLeft: '4px solid var(--orange)' }}><span>Quick check not passed yet${best ? ` (best ${best.score}%)` : ''}.</span><button class="btn orange sm" onClick=${() => setQuizOpen(true)}>Take the quick check</button></div>`}
      <div class="card row" style=${{ justifyContent: 'space-between' }}>
        <div>${done.has(step.item_id) ? html`<span class="muted">Completed. ${idx < steps.length - 1 ? '' : 'This was the last item.'}</span>` : html`<span class="muted">Read or watch it, then confirm you understand and will follow it.</span>`}</div>
        <div class="row">${idx > 0 && html`<button class="btn ghost" onClick=${() => go(`/run/${track.id}/${idx - 1}`)}>‹ Back</button>`}
          ${!done.has(step.item_id) && it ? html`<button class="btn orange" disabled=${busy} onClick=${agree}>Agree and continue</button>` : idx < steps.length - 1 ? html`<button class="btn" onClick=${() => go(`/run/${track.id}/${idx + 1}`)}>Next ›</button>` : html`<a class="btn" href=${'#/training/' + (training ? training.slug : '')}>Back to training</a>`}</div></div>
    </main></div>`;
}


// ---- image upload (Phase 3c): downscale to <=1600px, store as <item uuid>__<safe name> in the private bucket, insert ![](hubimg://key)
async function shrinkImage(file) {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type) || file.size < 400 * 1024) return file;
  const bmp = await createImageBitmap(file); const max = 1600; const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (k === 1 && file.size < 1.5e6) return file;
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise(r => c.toBlob(r, type, 0.88)); return new File([blob], file.name.replace(/\.\w+$/, type === 'image/png' ? '.png' : '.jpg'), { type });
}
async function uploadImage(itemId, file) {
  if (!/^image\//.test(file.type)) throw new Error('Not an image: ' + file.name);
  const f = await shrinkImage(file); if (f.size > 8e6) throw new Error('Image too large (max 8 MB after resizing)');
  const safe = (f.name || 'image.png').replace(/[^\w.\-]+/g, '_').replace(/^_+/, '').slice(-80) || 'image.png';
  const key = `${itemId}__${Date.now().toString(36)}-${safe}`;
  const { error } = await sb.storage.from('images').upload(key, f, { contentType: f.type, upsert: false }); if (error) throw error;
  return key;
}

// ---------- quizzes (Phase 4a) ----------
const quizFor = (data, itemId) => (data.quizzes || []).find(q => q.item_id === itemId && (q.questions || []).length);
const bestQuiz = (data, personId, itemId) => (data.quizResults || []).filter(r => r.person_id === personId && r.item_id === itemId).sort((a, b) => b.score - a.score)[0];
function Quiz({ quiz, item, me, onPassed, onClose }) {
  const [order] = useState(() => quiz.questions.map(q => { const idx = q.choices.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } return idx; }));
  const [picks, setPicks] = useState({}); const [result, setResult] = useState(null); const [busy, setBusy] = useState(false);
  const qs = quiz.questions; const allPicked = qs.every((_, n) => picks[n] !== undefined);
  const submit = async () => {
    const correct = qs.filter((q, n) => order[n][picks[n]] === q.answer).length; const score = Math.round(100 * correct / qs.length); const passed = score >= (quiz.pass_mark || 80);
    setBusy(true); await sb.from('quiz_results').insert({ person_id: me.id, item_id: item.id, score, passed }); setBusy(false); setResult({ score, passed, correct });
    if (passed && onPassed) onPassed(score);
  };
  return html`<div class="card quiz" style=${{ borderLeft: '4px solid var(--orange)' }}>
    <div class="row" style=${{ justifyContent: 'space-between' }}><h3 style=${{ margin: 0 }}>Quick check: ${item.title}</h3><span class="muted" style=${{ fontSize: 13 }}>${qs.length} questions · pass mark ${quiz.pass_mark || 80}%</span></div>
    ${qs.map((q, n) => html`<div key=${n} style=${{ margin: '12px 0' }}><div style=${{ fontWeight: 600, marginBottom: 6 }}>${n + 1}. ${q.q}</div>
      ${order[n].map((ci, k) => { const chosen = picks[n] === k; const isRight = ci === q.answer; const cls = result ? (isRight ? ' right' : chosen ? ' wrong' : '') : (chosen ? ' chosen' : '');
        return html`<label key=${k} class=${'choice' + cls}><input type="radio" name=${'q' + n} disabled=${!!result} checked=${chosen} onChange=${() => setPicks({ ...picks, [n]: k })}/><span>${q.choices[ci]}</span></label>`; })}
      ${result && html`<div class="muted" style=${{ fontSize: 13, marginTop: 4 }}>${q.why}</div>`}</div>`)}
    ${!result ? html`<div class="row" style=${{ justifyContent: 'flex-end' }}>${onClose && html`<button class="btn ghost sm" onClick=${onClose}>Later</button>`}<button class="btn orange" disabled=${!allPicked || busy} onClick=${submit}>Check answers</button></div>`
      : html`<div class="row" style=${{ justifyContent: 'space-between' }}><strong style=${{ color: result.passed ? 'var(--live)' : '#B42318' }}>${result.passed ? 'Passed' : 'Not yet'} · ${result.correct}/${qs.length} correct (${result.score}%)</strong>
        <div class="row">${!result.passed && html`<button class="btn orange sm" onClick=${() => { setPicks({}); setResult(null); }}>Try again</button>`}${onClose && html`<button class="btn sm" onClick=${onClose}>${result.passed ? 'Continue' : 'Close'}</button>`}</div></div>`}
  </div>`;
}

// ---------- Ask Homestar v2 ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function speak(text) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(text).replace(/\[\d+\]/g, '').replace(/[*#_`>]/g, '')); u.rate = 1.05; speechSynthesis.speak(u); } catch (_) {} }
function Ask({ data, me, people, itemSlug, reload }) {
  const item = itemSlug ? data.items.find(i => i.slug === itemSlug) : null;
  const pre = (location.hash.split('?')[1] || '');
  const [q, setQ] = useState(() => decodeURIComponent(pre)); const [busy, setBusy] = useState(false); const [log, setLog] = useState([]); const [conv, setConv] = useState(null); const [listening, setListening] = useState(false);
  const recRef = useRef(null); const boxRef = useRef(null);
  const openTracks = useMemo(() => data.tracks.map(t => { const steps = t.steps || []; const d = steps.filter(s => data.progress.some(p => p.person_id === me.id && p.track_id === t.id && p.item_id === s.item_id && p.status === 'complete')).length; const tr = data.items.find(i => i.id === t.training_id); return tr && tr.state === 'live' && d < steps.length ? tr.title : null; }).filter(Boolean), [data]);
  const send = async (text) => { const question = (text || q).trim(); if (question.length < 3 || busy) return; setBusy(true); setQ('');
    const history = log.slice(0, 3).reverse().flatMap(e => [{ role: 'user', content: e.q }, { role: 'assistant', content: e.a }]);
    const { data: res, error } = await sb.functions.invoke('ask', { body: { q: question, item_id: item ? item.id : null, conversation_id: conv, history, context: { open_tracks: openTracks, current_item_title: item ? item.title : null } } });
    if (res && res.conversation_id) setConv(res.conversation_id);
    setLog(l => [{ id: res && res.log_id, q: question, a: error ? 'Something went wrong: ' + (error.message || error) : (res && res.error ? res.error : res.answer), covered: res ? res.covered !== false : true, sources: (res && res.sources) || [], rating: null, fb: '', fbOpen: false, show: false }, ...l]); setBusy(false); };
  useEffect(() => { if (pre) { history.replaceState(null, '', '#/ask' + (itemSlug ? '/' + itemSlug : '')); send(decodeURIComponent(pre)); } }, []);
  const rate = async (e, r) => { setLog(l => l.map(x => x === e ? { ...x, rating: r, fbOpen: r === -1 } : x)); if (e.id) await sb.from('ask_log').update({ rating: r }).eq('id', e.id); };
  const sendFb = async (e) => { if (e.id) await sb.from('ask_log').update({ feedback: e.fb, rating: e.rating === null ? -1 : e.rating }).eq('id', e.id); setLog(l => l.map(x => x === e ? { ...x, fbOpen: false, fbSent: true } : x)); };
  const report = async (e, src) => { const it = data.items.find(i => i.slug === src.slug); if (!it) return; const body = `Ask Homestar flagged by ${me.name}: the answer to "${e.q}" looked wrong. Please check this page.`; await sb.from('comments').insert({ item_id: it.id, author_id: me.id, body }); if (e.id) await sb.from('ask_log').update({ rating: -1, feedback: 'reported: ' + src.title }).eq('id', e.id); alert('Reported. A comment was added on "' + src.title + '" for its owner.'); };
  const mic = () => { if (!SR) { alert('Voice input is not available in this browser. Chrome or Edge on the phone works.'); return; } if (listening) { recRef.current && recRef.current.stop(); return; } const r = new SR(); r.lang = 'en-CA'; r.interimResults = true; r.onresult = ev => { const t = [...ev.results].map(x => x[0].transcript).join(' '); setQ(t); if (ev.results[ev.results.length - 1].isFinal) { setListening(false); send(t); } }; r.onend = () => setListening(false); r.onerror = () => setListening(false); recRef.current = r; setListening(true); r.start(); };
  const canEditItem = (slug) => { const it = data.items.find(i => i.slug === slug); return it && (me.role === 'admin' || it.owner_id === me.id || (me.role === 'manager' && me.department_id === it.department_id)); };
  const actionsFor = (e) => { const acts = []; for (const s of e.sources.slice(0, 2)) { const it = data.items.find(i => i.slug === s.slug); if (!it) continue;
      if (!data.signoffs.some(x => x.person_id === me.id && x.item_id === it.id)) acts.push({ label: `Mark "${it.title}" as read`, run: async () => { await sb.from('signoffs').insert({ person_id: me.id, item_id: it.id }); await markProgress(me, data, it.id); reload && reload(); } });
      const tr = data.tracks.find(t => (t.steps || []).some(st => st.item_id === it.id) && !data.progress.some(p => p.person_id === me.id && p.track_id === t.id && p.item_id === it.id && p.status === 'complete')); const trItem = tr && data.items.find(i => i.id === tr.training_id);
      if (trItem && trItem.state === 'live') acts.push({ label: `Continue track: ${trItem.title}`, run: () => go('/run/' + tr.id + '/' + Math.max(0, (tr.steps || []).findIndex(st => st.item_id === it.id))) });
      if (isChecklist(it.body_md || '') || /checklist|closeout/i.test(it.title)) acts.push({ label: `Open ${it.title}`, run: () => go('/' + it.type + '/' + it.slug) }); }
    return acts.slice(0, 3); };
  const examples = item ? [`What are the steps in ${item.title}?`, `Who do I contact about this?`] : ['How do I add a job tag in Housecall Pro?', 'What is the dress code?', 'How do I register a Midea parts warranty?', 'A customer is unhappy - what do I do?'];
  return html`<div><h1 class="title">Ask Homestar</h1>
    <div class="card"><div class="muted" style=${{ fontSize: 13, marginBottom: 8 }}>Answers come only from Homestar's live systems, policies and training${item ? html`, starting with <strong>${item.title}</strong>` : ''}. Follow-up questions keep the thread. Rate answers - every 👎 and every "not covered" goes on Calvin's list to fix.</div>
      <form class="row" onSubmit=${e => { e.preventDefault(); send(); }}><input ref=${boxRef} style=${{ flex: 1, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 15 }} placeholder=${listening ? 'Listening…' : item ? 'Ask about ' + item.title : log.length ? 'Ask a follow-up…' : 'Ask a question…'} value=${q} onInput=${e => setQ(e.target.value)} autoFocus/>
        <button type="button" class=${'btn ghost' + (listening ? ' live-mic' : '')} title="Speak your question" onClick=${mic}>🎤</button><button class="btn orange" disabled=${busy || q.trim().length < 3}>${busy ? 'Thinking…' : 'Ask'}</button></form>
      ${!log.length && html`<div class="row" style=${{ gap: 6, flexWrap: 'wrap', marginTop: 10 }}>${examples.map(x => html`<button key=${x} class="btn ghost sm" onClick=${() => send(x)}>${x}</button>`)}</div>`}
      ${log.length > 0 && html`<div class="row" style=${{ marginTop: 8 }}><button class="btn ghost sm" onClick=${() => { setLog([]); setConv(null); }}>New conversation</button></div>`}</div>
    ${log.map((e, n) => html`<div key=${n} class=${'card' + (e.covered ? '' : ' gap')}><div style=${{ fontWeight: 600, marginBottom: 6 }}>${e.q}</div><${Md} md=${e.a}/>
      ${!e.covered && html`<div class="muted" style=${{ fontSize: 13, marginTop: 6 }}>Logged as a gap - this question goes on the list of pages to write.</div>`}
      ${e.sources.length > 0 && html`<div class="muted" style=${{ fontSize: 13, marginTop: 8 }}>Sources: ${e.sources.map((s, i) => html`<span key=${s.slug}>${i ? ' · ' : ''}[${s.n}] <a href=${'#/' + s.type + '/' + s.slug}>${s.title}</a>${s.last_reviewed ? html` <span title="last reviewed">(reviewed ${fmtDate(s.last_reviewed)})</span>` : html` <span style=${{ color: '#B45309' }} title="never reviewed in the hub">(not yet reviewed)</span>`}</span>`)}</div>`}
      ${(() => { const acts = actionsFor(e); return acts.length ? html`<div class="row" style=${{ gap: 6, flexWrap: 'wrap', marginTop: 8 }}>${acts.map(a => html`<button key=${a.label} class="btn sm ghost" onClick=${a.run}>${a.label}</button>`)}</div>` : null; })()}
      <div class="row" style=${{ gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
        <button class=${'btn sm ' + (e.rating === 1 ? '' : 'ghost')} onClick=${() => rate(e, 1)}>👍</button><button class=${'btn sm ' + (e.rating === -1 ? '' : 'ghost')} onClick=${() => rate(e, -1)}>👎</button>
        <button class="btn sm ghost" onClick=${() => speak(e.a)}>🔊 Read it</button>
        ${e.sources.length > 0 && html`<button class="btn sm ghost" onClick=${() => setLog(l => l.map(x => x === e ? { ...x, show: !x.show } : x))}>${e.show ? 'Hide' : 'Show'} what it used</button>`}
        ${e.sources[0] && html`<button class="btn sm ghost" onClick=${() => report(e, e.sources[0])}>Report wrong answer</button>`}
        ${e.sources[0] && canEditItem(e.sources[0].slug) && html`<a class="btn sm" href=${'#/fix/' + e.sources[0].slug + '?' + encodeURIComponent('Staff asked: "' + e.q + '". The page did not answer it well enough. Update the page so this question is answered clearly.')}>Draft a fix to "${e.sources[0].title}"</a>`}
        ${!e.covered && me.role !== 'member' && html`<span class="muted" style=${{ fontSize: 12 }}>No page covers this - create one from the Systems tree, or ask Claude to write it.</span>`}</div>
      ${e.fbOpen && html`<div class="row" style=${{ marginTop: 8 }}><input style=${{ flex: 1, padding: 8, border: '1px solid var(--line)', borderRadius: 8 }} placeholder="What were you looking for?" value=${e.fb} onInput=${ev => setLog(l => l.map(x => x === e ? { ...x, fb: ev.target.value } : x))}/><button class="btn sm" onClick=${() => sendFb(e)}>Send</button></div>`}
      ${e.fbSent && html`<div class="muted" style=${{ fontSize: 12, marginTop: 4 }}>Thanks - sent to Calvin's gap list.</div>`}
      ${e.show && html`<div style=${{ marginTop: 8 }}>${e.sources.map(s => html`<div key=${s.slug} style=${{ background: 'var(--bg)', borderRadius: 8, padding: 10, marginBottom: 6 }}><div style=${{ fontWeight: 600, fontSize: 13 }}>[${s.n}] ${s.title}</div>${(s.excerpts || []).map((x, k) => html`<div key=${k} class="muted" style=${{ fontSize: 13, marginTop: 4 }}><em>${x.heading}</em> - ${x.text}</div>`)}</div>`)}</div>`}
    </div>`)}
  </div>`;
}
function DraftFix({ data, me, people, slug, reload }) {
  const item = data.items.find(i => i.slug === slug); const pre = decodeURIComponent(location.hash.split('?')[1] || '');
  const [instr, setInstr] = useState(pre); const [busy, setBusy] = useState(false); const [draft, setDraft] = useState(null); const [full, setFull] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { if (item) sb.from('items').select('*').eq('id', item.id).single().then(({ data }) => setFull(data)); }, [slug]);
  if (!item) return html`<div class="card">Page not found.</div>`;
  const canEdit = me.role === 'admin' || item.owner_id === me.id || (me.role === 'manager' && me.department_id === item.department_id);
  if (!canEdit) return html`<div class="card">Only the owner, the department manager or an admin can draft changes to this page.</div>`;
  const run = async () => { setBusy(true); setErr(''); const { data: res, error } = await sb.functions.invoke('ask', { body: { mode: 'draft_fix', item_id: item.id, instruction: instr } }); setBusy(false); if (error || (res && res.error)) setErr((error && error.message) || res.error); else setDraft(res.draft); };
  const apply = async (asDraftState) => { setBusy(true); const row = { body_md: draft, ...(asDraftState ? { state: 'review' } : {}) }; const { error } = await sb.from('items').update(row).eq('id', item.id); setBusy(false); if (error) setErr(error.message); else { reload && reload(); go('/' + item.type + '/' + item.slug); } };
  return html`<div><h1 class="title">Draft a fix: ${item.title}</h1>
    <div class="card"><label class="muted" style=${{ fontSize: 13 }}>What should change? (a staff question the page failed to answer, a correction, a new step)</label>
      <textarea rows="4" style=${{ width: '100%', boxSizing: 'border-box', padding: 10, border: '1px solid var(--line)', borderRadius: 8, font: 'inherit', marginTop: 6 }} value=${instr} onInput=${e => setInstr(e.target.value)}></textarea>
      <div class="row" style=${{ justifyContent: 'space-between', marginTop: 8 }}><span class="muted" style=${{ fontSize: 12 }}>Claude rewrites the page from its current text; facts it doesn't have are marked [CONFIRM: …]. Nothing is saved until you choose.</span><button class="btn orange" disabled=${busy || instr.trim().length < 5} onClick=${run}>${busy ? 'Drafting…' : draft ? 'Draft again' : 'Draft the change'}</button></div>
      ${err && html`<div class="err" style=${{ marginTop: 8 }}>${err}</div>`}</div>
    ${draft && html`<div class="grid2">
      <div class="card"><h3 style=${{ margin: '0 0 6px' }}>Current</h3><div style=${{ maxHeight: 520, overflow: 'auto' }}><${Md} md=${full ? full.body_md : ''}/></div></div>
      <div class="card" style=${{ borderLeft: '4px solid var(--orange)' }}><h3 style=${{ margin: '0 0 6px' }}>Proposed ${/\[CONFIRM:/.test(draft) ? html`<span class="badge review">has [CONFIRM] items</span>` : ''}</h3><div style=${{ maxHeight: 520, overflow: 'auto' }}><${Md} md=${draft}/></div>
        <textarea rows="8" class="mono" style=${{ width: '100%', boxSizing: 'border-box', marginTop: 8, fontFamily: 'ui-monospace,Consolas,monospace', fontSize: 12, padding: 8, border: '1px solid var(--line)', borderRadius: 8 }} value=${draft} onInput=${e => setDraft(e.target.value)}></textarea>
        <div class="row" style=${{ justifyContent: 'flex-end', gap: 6, marginTop: 8 }}><a class="btn ghost sm" href=${'#/' + item.type + '/' + item.slug}>Discard</a><button class="btn sm" disabled=${busy} onClick=${() => apply(true)}>Save as In review</button><button class="btn orange sm" disabled=${busy || /\[CONFIRM:/.test(draft)} title=${/\[CONFIRM:/.test(draft) ? 'Resolve the [CONFIRM] items first' : ''} onClick=${() => apply(false)}>Save live</button></div></div></div>`}
  </div>`;
}
function AskStats({ data, me, people }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { sb.from('ask_log').select('id,person_id,question,covered,rating,feedback,sources,created_at').gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString()).order('created_at', { ascending: false }).limit(500).then(({ data }) => setRows(data || [])); }, []);
  if (!rows) return null;
  const week = rows.filter(r => r.created_at >= new Date(Date.now() - 7 * 864e5).toISOString());
  const gaps = rows.filter(r => !r.covered || r.rating === -1);
  const cites = {}; rows.forEach(r => (r.sources || []).forEach(s => { cites[s.title] = (cites[s.title] || 0) + 1; })); const top = Object.entries(cites).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const live = data.items.filter(i => i.state === 'live'); const citedTitles = new Set(Object.keys(cites)); const never = live.filter(i => !citedTitles.has(i.title)).length;
  return html`<div class="card"><h3 style=${{ margin: '0 0 8px' }}>Ask Homestar <span class="muted" style=${{ fontWeight: 400, fontSize: 13 }}>· last 30 days</span></h3>
    <div class="row" style=${{ gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>${[['Questions (7 d)', week.length], ['Questions (30 d)', rows.length], ['Not covered', rows.filter(r => !r.covered).length], ['👎', rows.filter(r => r.rating === -1).length], ['👍', rows.filter(r => r.rating === 1).length], ['Live pages never cited', never + '/' + live.length]].map(([k, v]) => html`<div key=${k}><div class="muted" style=${{ fontSize: 11, textTransform: 'uppercase' }}>${k}</div><div style=${{ fontSize: 20, fontWeight: 700 }}>${v}</div></div>`)}</div>
    ${gaps.length > 0 && html`<h4 style=${{ margin: '8px 0 4px' }}>Gaps to fix (${gaps.length})</h4><table class="table"><thead><tr><th>Question</th><th>Who</th><th>Why</th><th>Feedback</th><th>When</th></tr></thead><tbody>${gaps.slice(0, 15).map(r => html`<tr key=${r.id}><td>${r.question}</td><td>${(people.find(p => p.id === r.person_id) || {}).name || ''}</td><td><span class=${'badge ' + (!r.covered ? 'draft' : 'review')}>${!r.covered ? 'not covered' : 'thumbs down'}</span></td><td class="muted">${r.feedback || ''}</td><td class="muted">${fmtDate(r.created_at)}</td></tr>`)}</tbody></table>`}
    ${top.length > 0 && html`<div class="muted" style=${{ fontSize: 13, marginTop: 8 }}>Most cited: ${top.map(([t, c]) => `${t} (${c})`).join(' · ')}</div>`}</div>`;
}
const VIDEO_RX = /https?:\/\/(?:www\.)?(?:loom\.com\/(?:share|embed)\/[a-f0-9]+|youtube\.com\/(?:watch\?v=|embed\/)[\w-]{11}|youtu\.be\/[\w-]{11}|fast\.wistia\.(?:net|com)\/embed\/iframe\/\w+|\w+\.wistia\.com\/medias\/\w+)[^\s)>\]"]*/g;
function Editor({ item, data, me, people, onDone }) {
  const [f, setF] = useState({ title: item.title, overview: item.overview || '', body_md: item.body_md || '', state: item.state, owner_id: item.owner_id || '', next_review: item.next_review || '', templates: item.templates || [], folder_id: item.folder_id || '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(0); const taRef = useRef(null); const fileRef = useRef(null);
  const addImages = async (files) => {
    const list = [...files].filter(f => /^image\//.test(f.type)); if (!list.length) return; setUploading(list.length); setErr('');
    for (const file of list) { try { const key = await uploadImage(item.id, file); insertAtCursor(`\n![${file.name.replace(/\.\w+$/, '')}](hubimg://${key})\n`); } catch (e) { setErr('Image upload failed: ' + (e.message || e)); } setUploading(n => n - 1); }
  };
  const insertAtCursor = (txt) => { const ta = taRef.current; setF(prev => { const v = prev.body_md; if (!ta) return { ...prev, body_md: v + txt }; const a = ta.selectionStart ?? v.length, b = ta.selectionEnd ?? v.length; const nv = v.slice(0, a) + txt + v.slice(b); setTimeout(() => { try { ta.focus(); ta.selectionStart = ta.selectionEnd = a + txt.length; } catch (_) {} }, 0); return { ...prev, body_md: nv }; }); };
  const onPaste = (e) => { const files = [...(e.clipboardData?.items || [])].filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean); if (files.length) { e.preventDefault(); addImages(files); } };
  const onDrop = (e) => { e.preventDefault(); if (e.dataTransfer?.files?.length) addImages(e.dataTransfer.files); };
  const up = (k, v) => setF({ ...f, [k]: v });
  const setT = (n, k, v) => up('templates', f.templates.map((t, i) => i === n ? { ...t, [k]: v } : t));
  const save = async () => {
    setBusy(true); setErr('');
    const row = { title: f.title.trim(), overview: f.overview, body_md: f.body_md, state: f.state, owner_id: f.owner_id || null, next_review: f.next_review || null, templates: f.templates.filter(t => (t.name || t.body || '').trim()), folder_id: f.folder_id || null, videos: Array.from(new Set((f.body_md.match(VIDEO_RX) || []))), ...(f.state === 'live' && item.state !== 'live' ? { last_reviewed: new Date().toISOString().slice(0, 10) } : {}) };
    const { error } = await sb.from('items').update(row).eq('id', item.id); setBusy(false);
    if (error) setErr(error.message); else onDone(true);
  };
  const folders = data.folders.filter(x => x.library === item.type);
  const ins = (txt) => insertAtCursor(txt);
  return html`<div class="card editor">
    <div class="row" style=${{ justifyContent: 'space-between', marginBottom: 10 }}><h3 style=${{ margin: 0 }}>Edit ${LIBS[item.type].replace(/s$/, '').toLowerCase()}</h3><div class="row"><button class="btn ghost sm" onClick=${() => setPreview(!preview)}>${preview ? 'Edit' : 'Preview'}</button><button class="btn ghost sm" onClick=${() => onDone(false)}>Cancel</button><button class="btn orange sm" disabled=${busy || !f.title.trim()} onClick=${save}>Save</button></div></div>
    ${err && html`<div class="err">${err}</div>`}
    <label>Title<input value=${f.title} onInput=${e => up('title', e.target.value)}/></label>
    <div class="grid3">
      <label>State<select value=${f.state} onChange=${e => up('state', e.target.value)}>${Object.keys(STATES).map(k => html`<option key=${k} value=${k}>${STATES[k]}</option>`)}</select></label>
      <label>Owner<select value=${f.owner_id} onChange=${e => up('owner_id', e.target.value)}><option value="">—</option>${people.filter(p => p.active).map(p => html`<option key=${p.id} value=${p.id}>${p.name}</option>`)}</select></label>
      <label>Next review<input type="date" value=${f.next_review} onInput=${e => up('next_review', e.target.value)}/></label>
    </div>
    <label>Folder<select value=${f.folder_id} onChange=${e => up('folder_id', e.target.value)}><option value="">(none)</option>${folders.map(x => html`<option key=${x.id} value=${x.id}>${(data.departments.find(d => d.id === x.department_id) || {}).name || 'Company'} › ${x.name}</option>`)}</select></label>
    <label>Overview (one or two lines shown at the top)<textarea rows="2" value=${f.overview} onInput=${e => up('overview', e.target.value)}></textarea></label>
    <div class="row" style=${{ gap: 6, flexWrap: 'wrap', margin: '6px 0' }}><span class="muted" style=${{ fontSize: 12 }}>Insert:</span>${[['Heading', '\n## Step name\n'], ['Numbered steps', '\n1. First step\n2. Second step\n'], ['Checklist', '\n- [ ] Do this\n- [ ] Then this\n'], ['Table', '\n| Column | Column |\n|---|---|\n| a | b |\n'], ['Note', '\n> Note: \n'], ['Loom link', '\nhttps://www.loom.com/share/VIDEO_ID\n']].map(([n, t]) => html`<button key=${n} class="btn ghost sm" onClick=${() => ins(t)}>${n}</button>`)}<button class="btn sm" disabled=${uploading > 0} onClick=${() => fileRef.current && fileRef.current.click()}>${uploading ? `Uploading ${uploading}…` : '📷 Add image'}</button><input ref=${fileRef} type="file" accept="image/*" multiple style=${{ display: 'none' }} onChange=${e => { addImages(e.target.files); e.target.value = ''; }}/></div>
    ${preview ? html`<div class="card" style=${{ background: 'var(--bg)' }}><${Md} md=${f.body_md}/></div>` : html`<textarea ref=${taRef} class="mono" rows="22" value=${f.body_md} onInput=${e => up('body_md', e.target.value)} onPaste=${onPaste} onDrop=${onDrop} onDragOver=${e => e.preventDefault()} placeholder="Write the system in Markdown. Paste a Loom link on its own line and it embeds. Paste or drop screenshots straight in here, or use Add image."></textarea>`}
    <div class="muted" style=${{ fontSize: 12 }}>Markdown: **bold**, lists with "1." or "-", headings with "##", links [text](url). Numbered steps or "- [ ]" lines turn on Checklist mode for readers. Screenshots: paste (Ctrl+V), drag in, or Add image - they upload to the hub and land where your cursor is.</div>
    <h4 style=${{ margin: '14px 0 6px' }}>Templates (copy-paste snippets)</h4>
    ${f.templates.map((t, n) => html`<div key=${n} class="tpl"><div class="row"><input style=${{ flex: 1 }} placeholder="Template name" value=${t.name || ''} onInput=${e => setT(n, 'name', e.target.value)}/><button class="btn ghost sm" onClick=${() => up('templates', f.templates.filter((_, i) => i !== n))}>Remove</button></div><textarea rows="4" value=${t.body || ''} onInput=${e => setT(n, 'body', e.target.value)}></textarea></div>`)}
    <button class="btn ghost sm" onClick=${() => up('templates', [...f.templates, { name: '', body: '' }])}>+ Template</button>
    <div class="row" style=${{ justifyContent: 'flex-end', marginTop: 12 }}><button class="btn ghost sm" onClick=${() => onDone(false)}>Cancel</button><button class="btn orange" disabled=${busy || !f.title.trim()} onClick=${save}>Save</button></div>
  </div>`;
}
function History({ item, people, canEdit, onRestored }) {
  const [vs, setVs] = useState(null); const [open, setOpen] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { sb.from('item_versions').select('id,title,body_md,author_id,source,saved_at').eq('item_id', item.id).order('saved_at', { ascending: false }).limit(50).then(({ data }) => setVs(data || [])); }, [item.id, item.updated_at]);
  const who = (v) => v.source === 'brain' ? 'Claude (brain sync)' : v.source === 'import' ? 'Import' : (people.find(p => p.id === v.author_id) || {}).name || 'Someone';
  const restore = async (v) => { if (!confirm('Restore this version? The current text is kept in history.')) return; setBusy(true); const { error } = await sb.from('items').update({ title: v.title, body_md: v.body_md }).eq('id', item.id); setBusy(false); if (!error) onRestored(); else alert(error.message); };
  if (!vs) return null;
  return html`<div class="card"><h3 style=${{ margin: '0 0 6px' }}>Version history <span class="muted" style=${{ fontWeight: 400, fontSize: 13 }}>· ${vs.length}</span></h3>
    ${vs.map((v, n) => html`<div key=${v.id} style=${{ borderTop: '1px solid var(--line)', padding: '6px 0' }}><div class="row" style=${{ justifyContent: 'space-between' }}><span><strong>${n === 0 ? 'Current' : 'v' + (vs.length - n)}</strong> <span class="muted" style=${{ fontSize: 13 }}>· ${fmtDate(v.saved_at)} ${new Date(v.saved_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })} · ${who(v)} · ${(v.body_md || '').length} chars</span></span><div class="row"><button class="btn ghost sm" onClick=${() => setOpen(open === v.id ? null : v.id)}>${open === v.id ? 'Hide' : 'View'}</button>${n > 0 && canEdit && html`<button class="btn ghost sm" disabled=${busy} onClick=${() => restore(v)}>Restore</button>`}</div></div>
      ${open === v.id && html`<div style=${{ background: 'var(--bg)', borderRadius: 8, padding: 10, marginTop: 6, maxHeight: 360, overflow: 'auto' }}><div class="muted" style=${{ fontSize: 12 }}>${v.title}</div><${Md} md=${v.body_md}/></div>`}</div>`)}</div>`;
}
function MyRecord({ data, me, people }) {
  const my = data.signoffs.filter(s => s.person_id === me.id).sort((a, b) => b.agreed_at.localeCompare(a.agreed_at));
  const myTracks = data.tracks.map(t => { const steps = t.steps || []; const d = steps.filter(s => data.progress.some(p => p.person_id === me.id && p.track_id === t.id && p.item_id === s.item_id && p.status === 'complete')).length; return { t, steps: steps.length, done: d, training: data.items.find(i => i.id === t.training_id) }; }).filter(x => x.done > 0 || (x.training && x.training.state === 'live'));
  return html`<div class="print-record"><h1 class="title">My record <span class="muted print-only" style=${{ fontSize: 14, fontWeight: 400 }}>· ${me.name} · ${me.email || ''} · printed ${fmtDate(new Date().toISOString())}</span></h1>
    <div class="card"><h3 style=${{ margin: '0 0 8px' }}>Training</h3>${myTracks.map(x => html`<div key=${x.t.id} class="row" style=${{ justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--line)' }}><a href=${'#/training/' + (x.training ? x.training.slug : '')}>${x.training ? x.training.title : '?'}</a><span class="muted" style=${{ fontSize: 13 }}>${x.done}/${x.steps} · ${x.steps ? Math.round(100 * x.done / x.steps) : 0}%</span></div>`)}</div>
    ${(() => { const mine = (data.quizResults || []).filter(r => r.person_id === me.id); const byItem = {}; mine.forEach(r => { const b = byItem[r.item_id]; if (!b || r.score > b.score) byItem[r.item_id] = r; }); const rows = Object.values(byItem).sort((a, b) => b.attempted_at.localeCompare(a.attempted_at)); return rows.length ? html`<div class="card"><h3 style=${{ margin: '0 0 8px' }}>Quick checks (${rows.filter(r => r.passed).length} passed of ${rows.length})</h3><table class="table"><thead><tr><th>Item</th><th>Best score</th><th>Result</th><th>Date</th></tr></thead><tbody>${rows.map(r => { const it = data.items.find(i => i.id === r.item_id); return html`<tr key=${r.item_id} onClick=${() => it && go('/' + it.type + '/' + it.slug)}><td>${it ? it.title : '(removed)'}</td><td>${r.score}%</td><td><span class=${'badge ' + (r.passed ? 'live' : 'draft')}>${r.passed ? 'Passed' : 'Not passed'}</span></td><td class="muted">${fmtDate(r.attempted_at)}</td></tr>`; })}</tbody></table></div>` : null; })()}
    <div class="card"><h3 style=${{ margin: '0 0 8px' }}>Sign-offs (${my.length})</h3><table class="table"><thead><tr><th>Item</th><th>Type</th><th>Agreed</th></tr></thead><tbody>${my.map((s, n) => { const it = data.items.find(i => i.id === s.item_id); return html`<tr key=${n} onClick=${() => it && go('/' + it.type + '/' + it.slug)}><td>${it ? it.title : '(removed item)'}</td><td>${it ? LIBS[it.type] : ''}</td><td class="muted">${fmtDate(s.agreed_at)}</td></tr>`; })}</tbody></table>
    <div class="row" style=${{ marginTop: 8 }}><button class="btn sm" onClick=${() => window.print()}>Print / save as PDF</button><span class="muted" style=${{ fontSize: 13 }}>Choose "Save as PDF" in the print dialog for the HR file.</span></div></div></div>`;
}
function Dashboard({ data, me, people }) {
  if (!['admin', 'manager'].includes(me.role)) return html`<div class="card">Managers and admins only.</div>`;
  const scope = me.role === 'admin' ? people : people.filter(p => p.department_id === me.department_id);
  const liveTracks = data.tracks.filter(t => { const tr = data.items.find(i => i.id === t.training_id); return tr && tr.state === 'live'; });
  const today = new Date().toISOString().slice(0, 10); const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const stale = data.items.filter(i => i.state === 'live' && ((i.next_review && i.next_review < today) || (!i.next_review && (i.last_reviewed || i.updated_at || '').slice(0, 10) < yearAgo)));
  const drafts = data.items.filter(i => i.state === 'draft' || i.state === 'review');
  return html`<div><h1 class="title">Dashboard</h1>
    <div class="row" style=${{ marginBottom: 14 }}>${[['People', scope.filter(p => p.active).length], ['Live items', data.items.filter(i => i.state === 'live').length], ['Drafts / in review', drafts.length], ['Needs review', stale.length], ['Sign-offs', data.signoffs.length], ['Quick checks passed', (() => { const k = new Set(); (data.quizResults || []).filter(r => r.passed).forEach(r => k.add(r.person_id + r.item_id)); return k.size; })()]].map(([k, v]) => html`<div key=${k} class="card" style=${{ flex: 1, minWidth: 120, marginBottom: 0 }}><div class="muted" style=${{ fontSize: 12, textTransform: 'uppercase' }}>${k}</div><div style=${{ fontSize: 26, fontWeight: 700 }}>${v}</div></div>`)}</div>
    <div class="card"><h3 style=${{ margin: '0 0 8px' }}>Training completion</h3><div style=${{ overflow: 'auto' }}><table class="table"><thead><tr><th>Person</th><th>Quick checks</th>${liveTracks.map(t => { const tr = data.items.find(i => i.id === t.training_id); return html`<th key=${t.id} title=${tr.title}>${tr.title.length > 22 ? tr.title.slice(0, 20) + '…' : tr.title}</th>`; })}</tr></thead>
      <tbody>${scope.filter(p => p.active).map(p => html`<tr key=${p.id}><td>${p.name}</td><td>${(() => { const k = new Set(); (data.quizResults || []).filter(r => r.person_id === p.id && r.passed).forEach(r => k.add(r.item_id)); const att = new Set((data.quizResults || []).filter(r => r.person_id === p.id).map(r => r.item_id)); return html`<span class=${'badge ' + (att.size && k.size === att.size ? 'live' : att.size ? 'review' : 'draft')}>${k.size}/${(data.quizzes || []).length}</span>`; })()}</td>${liveTracks.map(t => { const steps = (t.steps || []).length; const d = (t.steps || []).filter(s => data.progress.some(pr => pr.person_id === p.id && pr.track_id === t.id && pr.item_id === s.item_id && pr.status === 'complete')).length; const pct = steps ? Math.round(100 * d / steps) : 0; return html`<td key=${t.id}><span class=${'badge ' + (pct === 100 ? 'live' : pct > 0 ? 'review' : 'draft')}>${pct}%</span></td>`; })}</tr>`)}</tbody></table></div></div>
    <${AskStats} data=${data} me=${me} people=${people}/>
    <${ItemTable} rows=${stale} data=${data} title="Live items overdue for review (no review in 12 months)"/>
    <${ItemTable} rows=${drafts} data=${data} title="Drafts and items in review"/>
  </div>`;
}
function Home({ data, me, people }) {
  const recent = [...data.items].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')).slice(0, 8);
  const mine = data.items.filter(i => i.department_id === me.department_id && i.state === 'live');
  return html`<div>
    <h1 class="title">Welcome, ${me.name.split(' ')[0]}</h1>
    <form class="card row" onSubmit=${e => { e.preventDefault(); const v = e.target.elements.q.value.trim(); if (v) go('/ask?' + encodeURIComponent(v)); }}><input name="q" style=${{ flex: 1, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 15 }} placeholder="Ask Homestar: how do I…"/><button class="btn orange">Ask</button></form>
    ${(() => { const today = new Date().toISOString().slice(0, 10); const soon = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
      const due = data.items.filter(i => i.state === 'live' && i.next_review && i.next_review <= soon && (me.role === 'admin' || i.owner_id === me.id || (me.role === 'manager' && i.department_id === me.department_id)));
      const open = data.openComments || 0;
      return due.length ? html`<div class="card" style=${{ borderLeft: '4px solid var(--orange)' }}><strong>Reviews due</strong> <span class="muted" style=${{ fontSize: 13 }}>· ${due.filter(i => i.next_review < today).length} overdue, ${due.length} within 14 days</span>${due.slice(0, 8).map(i => html`<div key=${i.id} class="row" style=${{ justifyContent: 'space-between', padding: '4px 0' }}><a href=${'#/' + i.type + '/' + i.slug}>${i.title}</a><span class=${'badge ' + (i.next_review < today ? 'draft' : 'review')}>${i.next_review < today ? 'overdue ' : ''}${fmtDate(i.next_review)}</span></div>`)}</div>` : null; })()}
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
  const parts = route.split('?')[0].split('/').filter(Boolean); const lib = ['system', 'policy', 'training'].includes(parts[0]) ? parts[0] : null; const slug = lib ? parts[1] : null;
  const results = q.trim() ? data.items.filter(i => (i.title + ' ' + (i.overview || '')).toLowerCase().includes(q.toLowerCase())) : null;
  const navA = (p, label) => html`<a href=${'#' + p} class=${(route === p || (p !== '/' && route.startsWith(p))) ? 'on' : ''}>${label}</a>`;
  if (parts[0] === 'run') return html`<div><header class="top"><img src="logo.png" alt=""/><span class="brand">System Hub</span><nav>${navA('/training', '‹ Training')}</nav><span class="grow"></span><button class="btn ghost sm" onClick=${() => sb.auth.signOut()}>Sign out</button></header><${Runner} key=${parts[1] + '/' + parts[2]} trackId=${parts[1]} n=${parts[2]} data=${data} me=${me} people=${people} reload=${reload}/></div>`;
  return html`<div>
    <header class="top"><button class="btn ghost sm menu-btn" onClick=${() => setSide(!side)}>☰</button><img src="logo.png" alt=""/><span class="brand">System Hub</span>
      <nav>${navA('/', 'Home')}${navA('/system', 'Systems')}${navA('/policy', 'Policies')}${navA('/training', 'Training')}${navA('/ask', 'Ask')}${navA('/me', 'My record')}${['admin', 'manager'].includes(me.role) && navA('/dashboard', 'Dashboard')}${me.role === 'admin' && navA('/people', 'People')}</nav>
      <span class="grow"></span><input placeholder="Search…" value=${q} onInput=${e => setQ(e.target.value)}/>
      <button class="btn ghost sm" onClick=${() => sb.auth.signOut()}>Sign out</button></header>
    <div class="layout">
      <aside class=${'side' + (side ? ' open' : '')}>${lib ? html`<${Tree} lib=${lib} data=${data} current=${slug} onPick=${i => { go(`/${i.type}/${i.slug}`); setSide(false); }}/>` : html`<div class="muted" style=${{ fontSize: 13 }}>Pick Systems, Policies or Training to browse the tree.</div>`}</aside>
      <main class="main">
        ${results ? html`<${ItemTable} rows=${results} data=${data} title=${`Search: ${q}`}/>`
        : slug ? html`<${ItemView} key=${slug} slug=${slug} data=${data} me=${me} people=${people} reload=${reload}/>`
        : lib ? html`<${ItemTable} rows=${data.items.filter(i => i.type === lib)} data=${data} title=${LIBS[lib]}/>`
        : parts[0] === 'ask' ? html`<${Ask} key=${parts[1] || 'ask'} data=${data} me=${me} people=${people} itemSlug=${parts[1] || null} reload=${reload}/>`
        : parts[0] === 'fix' ? html`<${DraftFix} key=${parts[1]} data=${data} me=${me} people=${people} slug=${parts[1]} reload=${reload}/>`
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
