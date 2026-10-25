// Homestar System Hub - v0.1 (Phase 1: read + login). No build step: ES modules from esm.sh, hash routing.
import React, { useState, useEffect, useMemo } from 'react';
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
const render = (md) => ({ __html: DOMPurify.sanitize(marked.parse(md || ''), { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'src'] }) });
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
  return { departments: d.data || [], folders: f.data || [], items: i.data || [], error: d.error || f.error || i.error };
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
  const depts = lib === 'policy' ? [{ id: null, name: 'Company Policies' }] : data.departments.filter(d => byDept(d.id).length || items.some(i => i.department_id === d.id && !i.folder_id));
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

function ItemView({ slug, data, me, people }) {
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
  const agree = async () => { const { error } = await sb.from('signoffs').insert({ person_id: me.id, item_id: item.id }); if (!error) setAgreed(new Date().toISOString()); };
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
    ${item.overview && html`<div class="card"><h3 style=${{ margin: '0 0 6px' }}>Overview</h3><div class="md" dangerouslySetInnerHTML=${render(item.overview)}></div></div>`}
    ${vids.map(v => html`<iframe key=${v} class="video" src=${v} allow="autoplay; fullscreen" allowfullscreen></iframe>`)}
    <div class="card">${check ? html`<div><div class="progress" style=${{ marginBottom: 10 }}><i style=${{ width: (100 * Object.values(done).filter(Boolean).length / Math.max(1, steps.length)) + '%' }}></i></div>
        ${steps.map((s, n) => html`<label key=${n} class=${'check' + (done[n] ? ' done' : '')}><input type="checkbox" checked=${!!done[n]} onChange=${e => setDone({ ...done, [n]: e.target.checked })}/><span>${s}</span></label>`)}</div>`
      : html`<div class="md" dangerouslySetInnerHTML=${render(item.body_md)}></div>`}</div>
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

function Home({ data, me, people }) {
  const recent = [...data.items].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')).slice(0, 8);
  const mine = data.items.filter(i => i.department_id === me.department_id && i.state === 'live');
  return html`<div>
    <h1 class="title">Welcome, ${me.name.split(' ')[0]}</h1>
    <div class="card"><strong>Your department:</strong> ${(data.departments.find(d => d.id === me.department_id) || {}).name || 'not set yet (ask Calvin)'} · <strong>Role:</strong> ${me.role}</div>
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
  return html`<div>
    <header class="top"><button class="btn ghost sm menu-btn" onClick=${() => setSide(!side)}>☰</button><img src="logo.png" alt=""/><span class="brand">System Hub</span>
      <nav>${navA('/', 'Home')}${navA('/system', 'Systems')}${navA('/policy', 'Policies')}${navA('/training', 'Training')}${me.role === 'admin' && navA('/people', 'People')}</nav>
      <span class="grow"></span><input placeholder="Search…" value=${q} onInput=${e => setQ(e.target.value)}/>
      <button class="btn ghost sm" onClick=${() => sb.auth.signOut()}>Sign out</button></header>
    <div class="layout">
      <aside class=${'side' + (side ? ' open' : '')}>${lib ? html`<${Tree} lib=${lib} data=${data} current=${slug} onPick=${i => { go(`/${i.type}/${i.slug}`); setSide(false); }}/>` : html`<div class="muted" style=${{ fontSize: 13 }}>Pick Systems, Policies or Training to browse the tree.</div>`}</aside>
      <main class="main">
        ${results ? html`<${ItemTable} rows=${results} data=${data} title=${`Search: ${q}`}/>`
        : slug ? html`<${ItemView} key=${slug} slug=${slug} data=${data} me=${me} people=${people}/>`
        : lib ? html`<${ItemTable} rows=${data.items.filter(i => i.type === lib)} data=${data} title=${LIBS[lib]}/>`
        : parts[0] === 'people' ? html`<${People} data=${data} people=${people} me=${me} reload=${reload}/>`
        : html`<${Home} data=${data} me=${me} people=${people}/>`}
      </main>
      <aside class="rail"><h4>Access</h4><div>${me.name}</div><div class="muted" style=${{ fontSize: 13 }}>${me.email || session.user.email}</div>
        <h4>States</h4>${Object.keys(STATES).map(s => html`<div key=${s} class="row" style=${{ fontSize: 13, padding: '2px 0' }}><span class=${'dot ' + s}></span>${STATES[s]}</div>`)}
        <h4>Counts</h4><div class="muted" style=${{ fontSize: 13 }}>${data.items.filter(i => i.type === 'system').length} systems · ${data.items.filter(i => i.type === 'policy').length} policies · ${data.items.filter(i => i.type === 'training').length} trainings</div></aside>
    </div></div>`;
}
createRoot(document.getElementById('root')).render(html`<${App}/>`);
