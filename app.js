// Homestar System Hub - v0.24.1 (Sign out only signs out this device, not every device - a global sign-out on one browser was logging Calvin out everywhere); v0.24 (always opens on your board: every sign-in and every fresh open lands on #/board, except links to one exact page, card or customer; Viewing box readable in dark mode); v0.23.1 (Systems shows every department, empty ones as shells: HR, Estimating & Sales); v0.23 (people can be in more than one department, db/019: Department chips on People, manager rights in every department they're in; Systems/Policies/Training tree: bold department headers, every department and folder collapsed by default, tap to expand, the open page's path opens itself); v0.22 (Customize my board: lane order, hide Today/Talk, opening lane, theme + accent, saved per person); v0.21 (Board moved into the Hub: #/board, board.js built by build_boardmod.py; board.html forwards old links; board-old.html = full old board kept as a fallback); v0.20 (KPIs moved into the Hub: #/kpi, kpi.js built by build_kpi.py); v0.19 (Maintenance moved into the Hub: #/maint, maint.js + boarddb.js, same data rows); v0.18.3 (links inside page text open in a new tab; board header matches Systems: tabs left, 44 px logo, search box; #/search?q= opens with the words filled in); v0.18.2 (clock bar removed, silent correction kept); v0.18.1 (clock guard: a wrong computer clock no longer signs people out on every page; Show/Hide on password fields; sign-in reads autofilled and pasted passwords); v0.18 (ONE SEARCH: board cards + customers + page titles + text inside pages in one box, #/search page, board search link); v0.16.6 (audit fixes: invite text, change log wraps + 100+, one library switcher on phones, bigger crumb/prev-next taps, inputs styled, empty search offers Ask); v0.16.1 (Me button shows icon + first name instead of initials; phone answers wider); v0.16 (one app: board header/colours/fonts/dark mode on every page; Board | KPIs | Maintenance | Systems | Ask everywhere; '/' opens the board, Hub home moved to #/home; Systems sub-nav; Me button); v0.15.1 (People shows the Owner line; KPIs readable by Office & Admin, db/016); v0.15 (Board tab: board.html = the Homestar Board ported into the Hub on board_docs (db/014), preview/read-only until the switch-over); v0.14.1 (after a code/link sign-in, wait for the person's record before choosing the page: a pending invite always gets Create your password + registration, never the plain reset form); v0.14 (8-digit code sign-up: emails carry a code + a link to #/code; Jacob's mail scanner pressed Continue too, so links never carry a token now); v0.13 (email links carry ?th=<token hash>&ty=invite|recovery and are only used when the person taps Continue - Microsoft 365 Safe Links pre-opens links and burned the one-time token, so Jacob's invite said expired; verifyOtp on tap); v0.12.1 (Sign in link under Create your password - signs the invite session out); v0.12 (invites stay inactive + 'Pending registration' until a password is created (db/013 complete_registration); pending people are always sent to Create your password; Resend invite + Delete on People); v0.11 (Invite team member on People: email invite via Edge Function 'invite' + Create-your-password page for invite and password-reset links; expired-link notice); v0.10.1 (undo label fix; v0.10 Change log page + kill switch, db/012); v0.9.2 (are-you-sure dialogs on People, publish/retire/unpublish, template remove, draft-fix save/discard, agree, mark-as-read; own role + Active locked; Mark reviewed button, prev/next in natural order, gap footer text; natural A-Z sort with folders and pages mixed, sort picker, no Agree on systems; v0.8: QA round: 30 fixes; tab highlight + People card; browse in URL, pinned matrix column; search-pick fix, no broken words; mobile layout: bottom tabs, Browse, sticky actions, typography; Ask v2: conversation memory, feedback + gaps, actions, voice, excerpts, report, draft-a-fix, dashboard stats; 4b: Ask Homestar via Edge Function 'ask' + search_items; 4a: quick-check quizzes in runner + item page, My record, dashboard; 3c: image upload from the editor - paste/drop/picker; 3b: in-app editor, version history + restore, comment resolve, review reminders, My record print; training tracks, runner, my record, dashboard). No build step: ES modules from esm.sh, hash routing.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { createClient } from '@supabase/supabase-js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { boardDb } from './boarddb.js?v=2';

const html = htm.bind(React.createElement);
const SUPABASE_URL = 'https://ovkdrtxgemvnpflebrxh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92a2RydHhnZW12bnBmbGVicnhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODQwMDEsImV4cCI6MjEwODQ2MDAwMX0.MCy_aqM6O6bUnOcyZ6vbVMrAJE69qZndZ8FBSsMWnf4';
// invite / password-reset links arrive as #access_token=...&type=invite|recovery (or #error=...): read it before supabase-js consumes the hash
const LINK = (() => { const h = location.hash || ''; const t = h.match(/[#&]type=(invite|recovery)/); const e = h.match(/[#&]error_description=([^&]+)/); return { type: t ? t[1] : null, err: e ? decodeURIComponent(e[1].replace(/\+/g, ' ')) : null }; })();
// v0.24 (Calvin 2026-11-11: "anytime I log in, no matter what, it always starts at my board"): a fresh open goes to the board
// unless the link points at one exact thing (a system/policy/training page, a board card, a customer, a search, a training run, a code)
const START_HASH = location.hash || '';
const isDeepLink = (h) => /^#\/(system|policy|training)\/(?!b(\/|$))[^/?]+/.test(h) || /^#\/board\?.*card=/.test(h) || /^#\/maint\?.*c=/.test(h) || /^#\/(search\?q=|run\/|code)/.test(h) || /[#&](access_token|type|error)=/.test(h);
const GATE = (() => { const q = new URLSearchParams(location.search); const th = q.get('th'), ty = q.get('ty'); return th && ['invite', 'recovery'].includes(ty) ? { th, ty } : null; })();
// v0.18.1 clock guard (Jacob 2026-11-10): a computer clock that is off makes every sign-in look expired, so supabase-js refreshes in a loop and signs out ('log in again' on every page). Read the real time from our own server and correct for it silently (v0.18.2: no bar, Calvin 2026-11-10).
const CLOCK_OFF = await (async () => { try { const t0 = Date.now(); const r = await fetch('favicon-64.png?clk=' + t0, { method: 'HEAD', cache: 'no-store' }); const t1 = Date.now(); const d = Date.parse(r.headers.get('date') || ''); if (!d) return 0; const off = d + (+r.headers.get('age') || 0) * 1000 + 500 - (t0 + t1) / 2; return Math.abs(off) > 90000 ? Math.round(off) : 0; } catch (e) { return 0; } })();
if (CLOCK_OFF) { const _now = Date.now.bind(Date); Date.now = () => _now() + CLOCK_OFF; window.__clockOff = CLOCK_OFF; }
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
  // v0.18.3 (Calvin 2026-11-10, every page): links inside page text open in a new tab, so the page you were on stays open
  useEffect(() => { if (!ref.current) return; ref.current.querySelectorAll('a[href]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; }); }, [md]);
  useEffect(() => { if (!ref.current) return; ref.current.querySelectorAll('img[data-hubimg]').forEach(img => { const n = decodeURIComponent(img.getAttribute('data-hubimg')); img.alt = img.alt || 'image'; img.loading = 'lazy'; signedImg(n).then(u => { if (u) img.src = u; else img.replaceWith(Object.assign(document.createElement('span'), { className: 'muted', textContent: '[image unavailable: ' + n.split('__').slice(1).join('__') + ']' })); }); }); }, [md]);
  return html`<div class="md" ref=${ref} dangerouslySetInnerHTML=${render(md)}></div>`;
}
const fmtDate = (d) => { if (!d) return ''; const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})$/); const dt = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d); return dt.toLocaleDateString('en-CA'); };
const dt = (t) => String(t || '').replace(/^!+\s*/, '');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const LIB_ONE = { system: 'system', policy: 'policy', training: 'training' };
const isChecklist = (md) => /^\s*(\d+\.|[-*]\s*\[ \])\s+/m.test(md || '');

// ---------- auth ----------
// v0.18.1 (Jacob 2026-11-10): Show/Hide button; onChange + onInput so autofill and paste always land
function PwField({ label, hint, value, set, name, ac }) {
  const [show, setShow] = useState(false);
  return html`<label>${label}${hint ? html` <span class="muted" style=${{ fontWeight: 400 }}>${hint}</span>` : ''}<span style=${{ display: 'flex', gap: 6, alignItems: 'center' }}><input type=${show ? 'text' : 'password'} name=${name} id=${name} placeholder="••••••••" value=${value} onInput=${e => set(e.target.value)} onChange=${e => set(e.target.value)} required minLength="8" autocomplete=${ac} autoCapitalize="off" autoCorrect="off" spellCheck=${false} style=${{ flex: 1, minWidth: 0 }}/><button type="button" class="btn ghost" style=${{ padding: '10px 12px', margin: '6px 0 12px', whiteSpace: 'nowrap' }} aria-label=${show ? 'Hide password' : 'Show password'} aria-pressed=${show} onClick=${() => setShow(!show)}>${show ? 'Hide' : 'Show'}</button></span></label>`;
}
function Login({ notice }) {
  const [mode, setMode] = useState(notice ? 'reset' : 'in'); const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [name, setName] = useState(''); const [err, setErr] = useState(''); const [msg, setMsg] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    const f = e.target.elements; const em = ((f.email && f.email.value) || email).trim(); const p = (f.password && f.password.value) || pw;
    if (mode === 'in') { let { error } = await sb.auth.signInWithPassword({ email: em, password: p }); if (error && p !== p.trim()) ({ error } = await sb.auth.signInWithPassword({ email: em, password: p.trim() })); if (error) setErr(error.message === 'Invalid login credentials' ? 'Email or password is wrong. Tap Show to check what you typed, or use Forgot password.' : error.message); }
    else if (mode === 'up') { const { error } = await sb.auth.signUp({ email, password: pw, options: { data: { name } } }); if (error) setErr(error.message); else setMsg('Account created. Sign in now; Calvin will activate your access.'); }
    else { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); if (error) setErr(error.message); else { setMsg('Email sent. Enter the 8-digit code from it here.'); setTimeout(() => { location.hash = '/code?ty=recovery'; }, 1500); } }
  };
  return html`<form class="login" onSubmit=${submit}>
    <img src="logo.png" alt="Homestar HVAC Solutions"/>
    <h2 style=${{ margin: '0 0 14px', textAlign: 'center' }}>Homestar System Hub</h2>
    ${notice && !msg && html`<div class="err">That link has expired or was already used (${notice}). Enter your email below to get a new one, or ask Calvin to re-send your invite.</div>`}
    ${err && html`<div class="err">${err}</div>`}${msg && html`<div class="muted" style=${{ marginBottom: 8 }}>${msg}</div>`}
    ${mode === 'up' && html`<label>Name<input value=${name} onInput=${e => setName(e.target.value)} required/></label>`}
    <label>Email<input type="email" name="email" id="email" placeholder="you@homestarhvac.ca" value=${email} onInput=${e => setEmail(e.target.value)} onChange=${e => setEmail(e.target.value)} required autocomplete="username"/></label>
    ${mode !== 'reset' && html`<${PwField} label="Password" hint="(8+ characters)" value=${pw} set=${setPw} name="password" ac=${mode === 'up' ? 'new-password' : 'current-password'}/>`}
    <button class="btn" style=${{ width: '100%' }}>${mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset email'}</button>
    <div class="row muted" style=${{ marginTop: 12, justifyContent: 'space-between', fontSize: 13 }}>
      <a href="#" onClick=${e => { e.preventDefault(); setMode(mode === 'in' ? 'up' : 'in'); }}>${mode === 'in' ? 'New here? Create account' : 'Have an account? Sign in'}</a>
      ${mode !== 'reset' && html`<a href="#" onClick=${e => { e.preventDefault(); setMode('reset'); }}>Forgot password</a>`}
    </div>
    <div class="muted" style=${{ marginTop: 10, textAlign: 'center', fontSize: 13 }}>Got a code in an email? <a href="#/code">Enter your code</a></div></form>`;
}
// #/code: type the 8-digit code from the invite or password email (no token in any link, so mail scanners can't use it up)
function CodeEntry() {
  const q = new URLSearchParams((location.hash.split('?')[1] || ''));
  const [email, setEmail] = useState(''); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    const token = code.replace(/\D/g, ''); const em = email.trim().toLowerCase();
    if (token.length < 6) { setErr('Enter the code from the email.'); return; }
    setBusy(true);
    const first = q.get('ty') === 'recovery' ? 'recovery' : 'invite';
    let { error } = await sb.auth.verifyOtp({ email: em, token, type: first });
    if (error) ({ error } = await sb.auth.verifyOtp({ email: em, token, type: first === 'invite' ? 'recovery' : 'invite' }));
    setBusy(false);
    if (error) { setErr("That code didn't work. Check the email address and the newest email's code, or ask Calvin to re-send it. Codes work for 24 hours and only once."); return; }
    location.hash = '/';
  };
  return html`<form class="login" onSubmit=${submit}>
    <img src="logo.png" alt="Homestar HVAC Solutions"/>
    <h2 style=${{ margin: '0 0 6px', textAlign: 'center' }}>Enter your code</h2>
    <p class="muted" style=${{ textAlign: 'center', marginTop: 0 }}>Type your email and the 8-digit code from your System Hub email. Then you'll create your password.</p>
    ${err && html`<div class="err">${err}</div>`}
    <label>Email<input type="email" value=${email} onInput=${e => setEmail(e.target.value)} required autocomplete="username" placeholder="you@homestarhvac.ca"/></label>
    <label>Code<input inputMode="numeric" autocomplete="one-time-code" value=${code} onInput=${e => setCode(e.target.value)} required placeholder="12345678" style=${{ letterSpacing: 4, fontSize: 20 }}/></label>
    <button class="btn" style=${{ width: '100%' }} disabled=${busy}>${busy ? 'Checking…' : 'Continue'}</button>
    <div class="muted" style=${{ marginTop: 14, textAlign: 'center', fontSize: 13 }}>Already have an account? <a href="#/">Sign in</a></div>
  </form>`;
}
// (v0.13) email links open this first; the one-time code is only used when a person taps Continue
function LinkGate({ gate, done }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const go2 = async () => {
    setBusy(true); setErr('');
    const { error } = await sb.auth.verifyOtp({ token_hash: gate.th, type: gate.ty });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    history.replaceState(null, '', location.pathname + '#/'); done(gate.ty);
  };
  const toSignIn = () => { history.replaceState(null, '', location.pathname + '#/'); location.reload(); };
  return html`<div class="login">
    <img src="logo.png" alt="Homestar HVAC Solutions"/>
    <h2 style=${{ margin: '0 0 6px', textAlign: 'center' }}>${gate.ty === 'invite' ? 'Welcome to the System Hub' : 'Set your password'}</h2>
    <p class="muted" style=${{ textAlign: 'center', marginTop: 0 }}>${gate.ty === 'invite' ? 'Tap Continue to set up your account.' : 'Tap Continue to choose your password.'}</p>
    ${err && html`<div class="err">That link didn't work (${err}). It may have expired or already been used. Ask Calvin to re-send your invite, or use Forgot password on the sign-in page.</div>`}
    <button class="btn" style=${{ width: '100%' }} disabled=${busy} onClick=${go2}>${busy ? 'Checking…' : 'Continue'}</button>
    <div class="muted" style=${{ marginTop: 14, textAlign: 'center', fontSize: 13 }}>Already have an account? <a href="#" onClick=${e => { e.preventDefault(); toSignIn(); }}>Sign in</a></div>
  </div>`;
}
// shown after an invite link (first password) or a password-reset link; the link already signed them in
function SetPassword({ kind, user, done }) {
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const first = (user.user_metadata && user.user_metadata.name || '').split(' ')[0];
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    const f = e.target.elements; const a = (f.password && f.password.value) || pw, b = (f.password2 && f.password2.value) || pw2;
    if (a !== b) { setErr("The two passwords don't match. Tap Show to check them."); return; }
    setBusy(true); const { error } = await sb.auth.updateUser({ password: a });
    if (error) { setBusy(false); setErr(error.message); return; }
    if (kind === 'invite') { const { error: e2 } = await sb.rpc('complete_registration'); if (e2) { setBusy(false); setErr(e2.message); return; } }
    setBusy(false); done();
  };
  return html`<form class="login" onSubmit=${submit}>
    <img src="logo.png" alt="Homestar HVAC Solutions"/>
    <h2 style=${{ margin: '0 0 6px', textAlign: 'center' }}>${kind === 'invite' ? 'Welcome to the System Hub' : 'Choose a new password'}</h2>
    <p class="muted" style=${{ textAlign: 'center', marginTop: 0 }}>${kind === 'invite' ? `${first ? 'Hi ' + first + ', c' : 'C'}reate a password to finish setting up your account.` : 'Enter a new password for your account.'}</p>
    ${err && html`<div class="err">${err}</div>`}
    <label>Email<input name="email" value=${user.email || ''} readOnly autocomplete="username"/></label>
    <${PwField} label="New password" hint="(8+ characters)" value=${pw} set=${setPw} name="password" ac="new-password"/>
    <${PwField} label="Type it again" value=${pw2} set=${setPw2} name="password2" ac="new-password"/>
    <button class="btn" style=${{ width: '100%' }} disabled=${busy}>${busy ? 'Saving…' : kind === 'invite' ? 'Create my account' : 'Save new password'}</button>
    <div class="muted" style=${{ marginTop: 14, textAlign: 'center', fontSize: 13 }}>${kind === 'invite' ? 'Already have an account? ' : 'Not you? '}<a href="#" onClick=${e => { e.preventDefault(); sb.auth.signOut({ scope: 'local' }).then(() => { location.hash = '/'; location.reload(); }); }}>Sign in</a></div>
  </form>`;
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

// ---------- sorting: natural order ("01." before "02." before "10."), "!" overview pages first; user-selectable mode kept in localStorage
const SORTS = { name: 'A to Z', updated: 'Recently updated', state: 'Status' };
const STATE_ORDER = { live: 0, review: 1, draft: 2, retired: 3 };
const natCmp = (a, b) => { const A = String(a || ''), B = String(b || ''); const ea = /^!/.test(A), eb = /^!/.test(B); if (ea !== eb) return ea ? -1 : 1; return dt(A).localeCompare(dt(B), 'en', { numeric: true, sensitivity: 'base' }); };
const sortRows = (rows, mode, name, upd, st) => [...rows].sort((a, b) => (mode === 'updated' ? String(upd(b) || '').localeCompare(String(upd(a) || '')) : mode === 'state' ? ((STATE_ORDER[st(a)] ?? 9) - (STATE_ORDER[st(b)] ?? 9)) : 0) || natCmp(name(a), name(b)));
const sortItems = (rows, mode = 'name') => sortRows(rows, mode, r => r.title, r => r.updated_at, r => r.state);
const deptsOf = (p) => [...new Set([p && p.department_id, ...((p && p.extra_department_ids) || [])].filter(Boolean))];
const inDept = (p, d) => !!d && deptsOf(p).includes(d);
const getSort = () => { try { return SORTS[localStorage.getItem('hub.sort')] ? localStorage.getItem('hub.sort') : 'name'; } catch (e) { return 'name'; } };
function useSort() { const [mode, setMode] = useState(getSort()); return [mode, (m) => { setMode(m); try { localStorage.setItem('hub.sort', m); } catch (e) { } }]; }
const SortPick = ({ mode, onChange }) => html`<label class="sortpick muted">Sort <select value=${mode} onChange=${e => onChange(e.target.value)}>${Object.entries(SORTS).map(([k, v]) => html`<option key=${k} value=${k}>${v}</option>`)}</select></label>`;

// ---------- components ----------
// Calvin 2026-11-11: every department and folder starts collapsed; tap to open; the open page's path opens itself.
// Open/closed state lives for this visit only (module memory), so the Hub always starts collapsed.
const TREE_OPEN = {};
function Tree({ lib, data, current, onPick }) {
  const st = TREE_OPEN[lib] || (TREE_OPEN[lib] = {});
  const [, bump] = useState(0);
  const folders = data.folders.filter(f => f.library === lib);
  const items = data.items.filter(i => i.type === lib);
  const byDept = (dId) => folders.filter(f => (f.department_id || null) === (dId || null) && !f.parent_id);
  const kids = (fid) => folders.filter(f => f.parent_id === fid);
  const inFolder = (fid) => items.filter(i => i.folder_id === fid);
  const deep = (fid) => inFolder(fid).length + kids(fid).reduce((n, k) => n + deep(k.id), 0);
  useEffect(() => {   // open the branch that holds the page being viewed
    const it = items.find(i => i.slug === current); if (!it) return;
    st['d:' + (it.department_id || 'co')] = true;
    let f = folders.find(x => x.id === it.folder_id), guard = 0;
    while (f && guard++ < 20) { st['f:' + f.id] = true; f = folders.find(x => x.id === f.parent_id); }
    bump(n => n + 1);
  }, [current, lib]);
  const toggle = (k) => { st[k] = !st[k]; bump(n => n + 1); };
  const collapseAll = () => { Object.keys(st).forEach(k => delete st[k]); bump(n => n + 1); };
  // folders and pages share one natural-ordered list ("! How X works", 01., 02., 03. ... whether folder or page)
  const mixed = (fs, is) => [...fs.map(f => ({ k: 'f', n: f.name, f })), ...is.map(i => ({ k: 'i', n: i.title, i }))].sort((a, b) => natCmp(a.n, b.n));
  const Row = ({ i }) => html`<div class=${'item' + (current === i.slug ? ' on' : '')} onClick=${() => onPick(i)}><span class=${'dot ' + i.state}></span><span class="tt">${dt(i.title)}</span></div>`;
  const list = (fs, is) => mixed(fs, is).map(r => r.k === 'f' ? html`<${Folder} key=${r.f.id} f=${r.f}/>` : html`<${Row} key=${r.i.id} i=${r.i}/>`);
  const Folder = ({ f }) => {
    const o = !!st['f:' + f.id];
    return html`<div class="tfold">
      <button type="button" class=${'folder' + (o ? ' open' : '')} aria-expanded=${o} onClick=${() => toggle('f:' + f.id)}><span class="chev">${o ? '▾' : '▸'}</span><span class="tt">${dt(f.name)}</span><span class="cnt">${deep(f.id)}</span></button>
      ${o && html`<div class="tkids">${list(kids(f.id), inFolder(f.id))}</div>`}
    </div>`;
  };
  const used = (dId) => byDept(dId).length || items.some(i => (i.department_id || null) === (dId || null) && !i.folder_id);
  // Systems lists every department (Calvin 2026-11-11: HR, Estimating & Sales as empty shells for now); Policies/Training show the ones in use
  const depts = [...data.departments.filter(d => used(d.id) || (lib === 'system' && d.name !== 'Company')), ...(used(null) ? [{ id: null, name: 'Company' }] : [])];
  const anyOpen = Object.values(st).some(Boolean);
  return html`<div class="tree">
    ${anyOpen && html`<button type="button" class="tcollapse" onClick=${collapseAll}>Collapse all</button>`}
    ${depts.map(d => { const k = 'd:' + (d.id || 'co'); const o = !!st[k]; const loose = items.filter(i => (i.department_id || null) === (d.id || null) && !i.folder_id); const n = loose.length + byDept(d.id).reduce((t, f) => t + deep(f.id), 0);
      return html`<div key=${k} class=${'tdeptwrap' + (o ? ' open' : '')}>
        <button type="button" class="dept" aria-expanded=${o} onClick=${() => toggle(k)}><span class="chev">${o ? '▾' : '▸'}</span><span class="tt">${d.name}</span><span class="cnt">${n}</span></button>
        ${o && html`<div class="tdeptbody">${n ? list(byDept(d.id), loose) : html`<div class="tempty">No ${lib === 'system' ? 'systems' : 'pages'} yet</div>`}</div>`}
      </div>`; })}
  </div>`;
}

function ItemTable({ rows, data, title, empty, onPick, sortable }) {
  const fname = (id) => (data.folders.find(f => f.id === id) || {}).name || '';
  const dname = (id) => (data.departments.find(d => d.id === id) || {}).name || 'Company';
  const [mode, setMode] = useSort();
  // library lists: group by department, then folder path, then natural title order (or the chosen sort mode)
  const fpath = (id) => { const p = []; let f = data.folders.find(x => x.id === id); while (f) { p.unshift(f.name); f = data.folders.find(x => x.id === f.parent_id); } return p.join(' › '); };
  const shown = sortable ? (mode === 'name' ? [...rows].sort((a, b) => natCmp(dname(a.department_id), dname(b.department_id)) || natCmp(fpath(a.folder_id), fpath(b.folder_id)) || natCmp(a.title, b.title)) : sortItems(rows, mode)) : rows;
  return html`<div class="card list"><div class="row" style=${{ justifyContent: 'space-between', alignItems: 'baseline' }}><h3>${title}</h3>${sortable && html`<${SortPick} mode=${mode} onChange=${setMode}/>`}</div>
    ${shown.map(i => html`<a key=${i.id} class="lrow" href=${'#/' + i.type + '/' + i.slug} onClick=${() => onPick && onPick(i)}><span class=${'dot ' + i.state}></span><span class="t"><b>${dt(i.title)}</b><small>${dname(i.department_id)}${fname(i.folder_id) ? ' › ' + fname(i.folder_id) : ''}${i.updated_at ? ' · ' + fmtDate(i.updated_at) : ''}</small></span><span class="muted">›</span></a>`)}
    ${!rows.length && html`<div class="muted">${empty || 'Nothing here yet.'}</div>`}</div>`;
}

// ---------- Browse (phone): library -> department -> folder -> pages
function Browse({ lib, data, bpath }) {
  const path = (bpath || []).map(seg => { const [kind, id] = seg.split(':'); const src = kind === 'dept' ? data.departments : data.folders; const o = src.find(x => x.id === id); return o ? { kind, id, name: o.name } : null; }).filter(Boolean);
  const setPath = (np) => go('/' + lib + (np.length ? '/b/' + np.map(x => x.kind + ':' + x.id).join('/') : ''));
  const [q, setQ] = useState('');
  const items = data.items.filter(i => i.type === lib); const folders = data.folders.filter(f => f.library === lib);
  const depts = data.departments.filter(d => items.some(i => i.department_id === d.id) || folders.some(f => f.department_id === d.id) || (lib === 'system' && d.name !== 'Company'));
  const cur = path[path.length - 1];
  const isTrack = (r) => r.kind === 'item' && data.tracks.some(t => t.training_id === r.i.id && (t.steps || []).length > 1) ? 1 : 0;
  const title = !cur ? LIBS[lib] : cur.kind === 'dept' ? cur.name : cur.name;
  const results = q.trim() ? items.filter(i => i.title.toLowerCase().includes(q.toLowerCase())) : null;
  const sub = (fid) => folders.filter(f => f.parent_id === fid);
  const deep = (fid) => items.filter(i => i.folder_id === fid).length + sub(fid).reduce((a, f) => a + deep(f.id), 0);
  const rows = (() => {
    if (results) return results.map(i => ({ kind: 'item', i }));
    if (!cur) return depts.length > 1 ? depts.map(d => ({ kind: 'dept', id: d.id, name: d.name, count: items.filter(i => i.department_id === d.id).length })) : [...folders.filter(f => !f.parent_id).map(f => ({ kind: 'folder', id: f.id, name: f.name, count: deep(f.id) })), ...items.filter(i => !i.folder_id).map(i => ({ kind: 'item', i }))];
    if (cur.kind === 'dept') return [...folders.filter(f => f.department_id === cur.id && !f.parent_id).map(f => ({ kind: 'folder', id: f.id, name: f.name, count: deep(f.id) })), ...items.filter(i => i.department_id === cur.id && !i.folder_id).map(i => ({ kind: 'item', i }))];
    return [...sub(cur.id).map(f => ({ kind: 'folder', id: f.id, name: f.name, count: deep(f.id) })), ...items.filter(i => i.folder_id === cur.id).map(i => ({ kind: 'item', i }))];
  })();
  const [mode, setMode] = useSort();
  // departments keep their own order; folders and pages sort together (natural order, "!" first); tracks stay first in Training
  const rname = (r) => r.kind === 'item' ? r.i.title : r.name;
  const rupd = (r) => r.kind === 'item' ? r.i.updated_at : (() => { const all = (fid) => [...items.filter(i => i.folder_id === fid).map(i => i.updated_at || ''), ...sub(fid).map(all).flat()]; return all(r.id).sort().pop() || ''; })();
  const rstate = (r) => r.kind === 'item' ? r.i.state : 'live';
  const sorted = rows.length && rows[0].kind === 'dept' ? rows : sortRows(rows, mode, rname, rupd, rstate).sort((a, b) => (lib === 'training' ? (isTrack(b) - isTrack(a)) : 0));
  return html`<div class="browse">
    <div class="bhead">${path.length > 0 && html`<button class="btn ghost sm" onClick=${() => history.back()}>‹ Back</button>`}<h1>${title}</h1>${sorted.length > 1 && sorted[0].kind !== 'dept' && html`<${SortPick} mode=${mode} onChange=${setMode}/>`}</div>
    <input class="searchbox" placeholder=${'Search ' + LIBS[lib].toLowerCase() + '…'} value=${q} onInput=${e => setQ(e.target.value)}/>
    ${sorted.map(r => r.kind === 'item' ? html`<a key=${r.i.id} class="brow" href=${'#/' + r.i.type + '/' + r.i.slug}><span class=${'dot ' + r.i.state}></span><span class="t"><b>${dt(r.i.title)}${isTrack(r) ? html` <span class="badge review" style=${{ marginLeft: 6 }}>Track</span>` : ''}</b>${results && html`<small>${(data.folders.find(f => f.id === r.i.folder_id) || {}).name || (data.departments.find(d => d.id === r.i.department_id) || {}).name || ''}</small>`}</span><span class="chev">›</span></a>`
      : html`<div key=${r.kind + r.id} class=${'brow ' + r.kind} onClick=${() => { setQ(''); setPath([...path, r]); }}><span class="ic">${r.kind === 'dept' ? r.name[0] : '▣'}</span><span class="t"><b>${dt(r.name)}</b><small>${plural(r.count, 'item')}</small></span><span class="chev">›</span></div>`)}
    ${!rows.length && html`<div class="card muted">${cur && cur.kind === 'dept' && lib === 'system' ? 'No systems in this department yet.' : 'Nothing here.'}</div>`}
  </div>`;
}

async function markProgress(me, data, itemId) {
  const rows = data.tracks.filter(t => (t.steps || []).some(st => st.item_id === itemId)).map(t => ({ person_id: me.id, track_id: t.id, item_id: itemId, status: 'complete', completed_at: new Date().toISOString() }));
  if (rows.length) await sb.from('progress').upsert(rows, { onConflict: 'person_id,track_id,item_id' });
}
function TrackPanel({ track, data, me, onRun }) {
  const steps = track.steps || []; const done = new Set(data.progress.filter(p => p.person_id === me.id && p.track_id === track.id && p.status === 'complete').map(p => p.item_id));
  const pct = steps.length ? Math.round(100 * steps.filter(s => done.has(s.item_id)).length / steps.length) : 0; const mins = steps.reduce((a, s) => a + (s.minutes || 0), 0);
  if (steps.length < 2) return null;
  return html`<div class="card"><div class="row" style=${{ justifyContent: 'space-between' }}><h3 style=${{ margin: 0 }}>Learning Track <span class="muted" style=${{ fontWeight: 400, fontSize: 13 }}>· ${plural(steps.length, 'item')} · about ${mins} min</span></h3><button class="btn orange" onClick=${onRun}>${pct === 100 ? 'Review' : pct > 0 ? 'Continue' : 'Run'}</button></div>
    <div class="progress" style=${{ margin: '10px 0' }}><i style=${{ width: pct + '%' }}></i></div><div class="muted" style=${{ fontSize: 13, marginBottom: 8 }}>${pct}% complete</div>
    ${steps.map((st, n) => { const it = data.items.find(i => i.id === st.item_id); return html`<div key=${n} class="row" style=${{ justifyContent: 'space-between', padding: '7px 0', borderTop: '1px solid var(--line)' }}><a href=${it ? '#/' + it.type + '/' + it.slug : '#'}>${n + 1}. ${it ? dt(it.title) : 'missing item'}</a><span class="muted" style=${{ fontSize: 13 }}>${st.minutes} min · ${done.has(st.item_id) ? html`<strong style=${{ color: 'var(--live)' }}>Complete</strong>` : 'Incomplete'}</span></div>`; })}</div>`;
}
function ItemView({ slug, data, me, people, reload }) {
  const [item, setItem] = useState(undefined); const [check, setCheck] = useState(false); const [done, setDone] = useState({}); const [agreed, setAgreed] = useState(null); const [comments, setComments] = useState([]); const [c, setC] = useState('');
  const [edit, setEdit] = useState(false); const [showHist, setShowHist] = useState(false); const [quizOpen, setQuizOpen] = useState(false); const [showComments, setShowComments] = useState(false);
  const refresh = async () => { const { data: it } = await sb.from('items').select('*').eq('slug', slug).single(); setItem(it || null); if (reload) reload(); };
  useEffect(() => { (async () => {
    const { data: it } = await sb.from('items').select('*').eq('slug', slug).single(); setItem(it || null);
    if (it) {
      const { data: s } = await sb.from('signoffs').select('agreed_at').eq('item_id', it.id).eq('person_id', me.id).order('agreed_at', { ascending: false }).limit(1); setAgreed(s && s[0] ? s[0].agreed_at : null);
      const { data: cm } = await sb.from('comments').select('*').eq('item_id', it.id).order('created_at'); setComments(cm || []);
      sb.from('activity_log').insert({ person_id: me.id, action: 'view', item_id: it.id }).then(() => {});
    }
  })(); }, [slug]);
  if (item === undefined) return html`<div class="muted">Loading…</div>`;
  if (!item) return html`<div class="card"><h3>Page not found</h3><div class="muted">It may have been renamed, retired, or isn't visible to you.</div><div class="row" style=${{ marginTop: 10 }}><a class="btn sm" href="#/home">Home</a><a class="btn sm ghost" href="#/system">Browse systems</a></div></div>`;
  const sibs = sortItems(data.items.filter(i => i.type === item.type && i.folder_id === item.folder_id && (i.department_id || null) === (item.department_id || null) && i.state !== 'retired')); const ix = sibs.findIndex(s => s.id === item.id);
  const folder = data.folders.find(f => f.id === item.folder_id); const dept = data.departments.find(d => d.id === item.department_id);
  const owner = people.find(p => p.id === item.owner_id);
  const vids = (item.videos || []).map(videoEmbed).filter(Boolean);
  const agree = async () => { if (!confirm(`Agree to "${dt(item.title)}"? This records that you have read it and will follow it.`)) return; const { error } = await sb.from('signoffs').insert({ person_id: me.id, item_id: item.id }); if (!error) { setAgreed(new Date().toISOString()); await markProgress(me, data, item.id); if (reload) reload(); } };
  const track = item.type === 'training' ? data.tracks.find(t => t.training_id === item.id) : null;
  const post = async () => { if (!c.trim()) return; const { data: row } = await sb.from('comments').insert({ item_id: item.id, author_id: me.id, body: c.trim() }).select().single(); if (row) { setComments([...comments, row]); setC(''); } };
  const steps = check ? (item.body_md.match(/^\s*(?:\d+\.|[-*]\s*\[ \])\s+(.+)$/gm) || []).map(s => s.replace(/^\s*(?:\d+\.|[-*]\s*\[ \])\s+/, '')) : [];
  const canEdit = me.role === 'admin' || item.owner_id === me.id || (me.role === 'manager' && inDept(me, item.department_id));
  return html`<div>
    <div class="page-head">
      <div class="crumb"><a href=${'#/' + item.type}>${LIBS[item.type]}</a> › ${dept ? html`<a href=${'#/' + item.type + '/b/dept:' + dept.id}>${dept.name}</a>` : 'Company'}${folder ? html` › <a href=${'#/' + item.type + '/b/dept:' + (dept ? dept.id : '') + (folder.parent_id ? '/folder:' + folder.parent_id : '') + '/folder:' + folder.id}>${dt(folder.name)}</a>` : ''}</div>
      <h1 class="title">${dt(item.title)}</h1>
      <div class="meta"><span class=${'badge ' + item.state}>${STATES[item.state]}</span>${owner && html`<span class="chip">Owner · ${owner.name}</span>`}${item.last_reviewed && html`<span class="chip">Reviewed ${fmtDate(item.last_reviewed)}</span>`}${item.next_review && html`<span class="chip">Next review ${fmtDate(item.next_review)}</span>`}${!item.last_reviewed && !item.next_review && html`<span class="chip" style=${{ color: '#B45309' }}>Not yet reviewed</span>`}</div>
      <div class="actions">
        ${isChecklist(item.body_md) && html`<button class=${'btn sm ' + (check ? '' : 'ghost')} onClick=${() => setCheck(!check)}>${check ? '📖 Reading mode' : '☑ Checklist mode'}</button>`}
        <a class="btn sm ghost" href=${'#/ask/' + item.slug}>💬 Ask about this</a>
        ${canEdit && !edit && html`<button class="btn sm" onClick=${() => setEdit(true)}>✎ Edit</button>`}${canEdit && !edit && html`<a class="btn sm ghost" href=${'#/fix/' + item.slug}>Draft a fix</a>`}${canEdit && html`<button class="btn sm ghost" onClick=${() => setShowHist(!showHist)}>${showHist ? 'Hide history' : 'History'}</button>`}${canEdit && !edit && item.state === 'live' && html`<button class="btn sm ghost" title="Confirm this page is still correct today: sets Reviewed = today and Next review = 12 months from now" onClick=${async () => { if (!confirm('Confirm this page is still correct as written? This sets Reviewed to today and Next review to 12 months from now.')) return; const d = new Date(); const today = d.toLocaleDateString('en-CA'); d.setFullYear(d.getFullYear() + 1); const next = d.toLocaleDateString('en-CA'); const { error } = await sb.from('items').update({ last_reviewed: today, next_review: next }).eq('id', item.id); if (error) { alert('Could not save: ' + error.message); return; } setItem({ ...item, last_reviewed: today, next_review: next }); if (reload) reload(); }}>✓ Mark reviewed</button>`}
      </div>
      ${ix >= 0 && (ix > 0 || ix < sibs.length - 1) && html`<div class="row muted pn" style=${{ fontSize: 13, justifyContent: 'space-between', marginTop: 2 }}><span>${ix > 0 ? html`<a href=${'#/' + item.type + '/' + sibs[ix - 1].slug}>‹ ${dt(sibs[ix - 1].title)}</a>` : ''}</span><span>${ix < sibs.length - 1 ? html`<a href=${'#/' + item.type + '/' + sibs[ix + 1].slug}>${dt(sibs[ix + 1].title)} ›</a>` : ''}</span></div>`}</div>
    ${edit && html`<${Editor} item=${item} data=${data} me=${me} people=${people} onDone=${async (saved) => { setEdit(false); if (saved) await refresh(); }}/>`}
    ${showHist && html`<${History} item=${item} people=${people} canEdit=${canEdit} onRestored=${async () => { await refresh(); }}/>`}
    ${!edit && item.overview && html`<div class="card"><h3 style=${{ margin: '0 0 6px' }}>Overview</h3><${Md} md=${item.overview}/></div>`}
    ${track && html`<${TrackPanel} track=${track} data=${data} me=${me} onRun=${() => go('/run/' + track.id + '/0')}/>`}
    ${vids.map(v => html`<iframe key=${v} class="video" src=${v} allow="autoplay; fullscreen" allowfullscreen></iframe>`)}
    ${!edit && html`<div class="card">${check ? html`<div><div class="progress" style=${{ marginBottom: 10 }}><i style=${{ width: (100 * Object.values(done).filter(Boolean).length / Math.max(1, steps.length)) + '%' }}></i></div>
        ${steps.map((s, n) => html`<label key=${n} class=${'check' + (done[n] ? ' done' : '')}><input type="checkbox" checked=${!!done[n]} onChange=${e => setDone({ ...done, [n]: e.target.checked })}/><span>${s}</span></label>`)}</div>`
      : html`<${Md} md=${item.body_md}/>`}</div>`}
    ${(item.templates || []).length > 0 && html`<div class="card"><h3 style=${{ margin: '0 0 6px' }}>Templates</h3>${item.templates.map((t, n) => html`<div key=${n} class="tpl"><div class="row" style=${{ justifyContent: 'space-between' }}><strong>${t.name}</strong><button class="btn sm ghost" onClick=${e => { navigator.clipboard.writeText(t.body || '').then(() => { const b = e.target; b.textContent = 'Copied ✓'; setTimeout(() => { b.textContent = 'Copy'; }, 1500); }).catch(() => alert('Copy blocked by the browser - select the text and copy it.')); }}>Copy</button></div><pre>${t.body}</pre></div>`)}</div>`}
    ${(item.attachments || []).length > 0 && html`<div class="card"><h3 style=${{ margin: '0 0 6px' }}>Attachments</h3>${item.attachments.map((a, n) => html`<div key=${n}><a href=${a.url} target="_blank" rel="noopener">${a.name || a.url}</a></div>`)}</div>`}
    <div class="card"><h3 style=${{ margin: '0 0 6px', cursor: 'pointer' }} onClick=${() => setShowComments(!showComments)}>Comments <span class="muted">· ${comments.filter(cm => !cm.resolved).length} open ${showComments ? '▾' : '▸'}</span></h3>
      ${showComments && html`<div>${comments.filter(cm => !cm.resolved).map(cm => html`<div key=${cm.id} style=${{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}><div class="row" style=${{ justifyContent: 'space-between' }}><span class="muted" style=${{ fontSize: 12 }}>${(people.find(p => p.id === cm.author_id) || {}).name || 'Someone'} · ${fmtDate(cm.created_at)}</span>${(canEdit || cm.author_id === me.id) && html`<button class="btn ghost sm" onClick=${async () => { const { error } = await sb.from('comments').update({ resolved: true }).eq('id', cm.id); if (!error) setComments(comments.map(x => x.id === cm.id ? { ...x, resolved: true } : x)); }}>Resolve</button>`}</div><div>${cm.body}</div></div>`)}
      <div class="row" style=${{ marginTop: 10 }}><input style=${{ flex: 1, padding: 9, border: '1px solid var(--line)', borderRadius: 8 }} placeholder="Add a comment" value=${c} onInput=${e => setC(e.target.value)}/><button class="btn sm" disabled=${!c.trim()} onClick=${post}>Comment</button></div>
      ${comments.some(cm => cm.resolved) && html`<details style=${{ marginTop: 8 }}><summary class="muted" style=${{ fontSize: 12, cursor: 'pointer' }}>Show resolved</summary>${comments.filter(cm => cm.resolved).map(cm => html`<div key=${cm.id} class="muted" style=${{ padding: '6px 0', borderTop: '1px solid var(--line)', fontSize: 13 }}>${(people.find(p => p.id === cm.author_id) || {}).name || 'Someone'} · ${fmtDate(cm.created_at)} - ${cm.body} ${(canEdit || cm.author_id === me.id) && html`<a href="#" onClick=${async ev => { ev.preventDefault(); const { error } = await sb.from('comments').update({ resolved: false }).eq('id', cm.id); if (!error) setComments(comments.map(x => x.id === cm.id ? { ...x, resolved: false } : x)); }}>reopen</a>`}</div>`)}</details>`}</div>`}</div>
    ${(() => { const quiz = quizFor(data, item.id); if (!quiz) return null; const best = bestQuiz(data, me.id, item.id); return quizOpen ? html`<${Quiz} quiz=${quiz} item=${item} me=${me} onPassed=${async () => { if (reload) await reload(); }} onClose=${() => setQuizOpen(false)}/>` : html`<div class="card row" style=${{ justifyContent: 'space-between' }}><span>Quick check: ${best ? (best.passed ? html`<strong style=${{ color: 'var(--live)' }}>passed ${best.score}%</strong>` : `best ${best.score}%, not passed`) : 'not taken'}</span><button class=${'btn sm ' + (best && best.passed ? 'ghost' : 'orange')} onClick=${() => setQuizOpen(true)}>${best && best.passed ? 'Retake' : 'Take the quick check'}</button></div>`; })()}
    ${item.type !== 'system' && html`<div class=${'card row' + (agreed ? '' : ' stickybar')} style=${{ justifyContent: 'space-between' }}>
      <div class="muted" style=${{ fontSize: 14 }}>${agreed ? `You agreed on ${fmtDate(agreed)}.` : 'Read it? Confirm you understand and will follow it.'}</div>
      ${!agreed && html`<button class="btn orange" onClick=${agree}>Agree</button>`}</div>`}
    ${me.role === 'admin' && html`<div class="muted" style=${{ fontSize: 12 }}>Admin note: edits made here sync to the Cowork brain nightly, and brain edits sync here.</div>`}
  </div>`;
}

function Runner({ trackId, n, data, me, people, reload }) {
  const track = data.tracks.find(t => t.id === trackId); if (!track) return html`<div class="main"><div class="card"><h3>Track not found</h3><div class="muted">This learning track doesn't exist or isn't visible to you.</div><a class="btn sm" style=${{ marginTop: 10 }} href="#/training">Training</a></div></div>`;
  const steps = track.steps || []; if (!steps.length) return html`<div class="card">This track has no steps yet.</div>`;
  const idx = Math.min(Math.max(0, parseInt(n) || 0), steps.length - 1); const step = steps[idx]; const it = data.items.find(i => i.id === step.item_id);
  useEffect(() => { if (String(idx) !== String(n)) history.replaceState(null, '', `#/run/${track.id}/${idx}`); }, [n]);
  const training = data.items.find(i => i.id === track.training_id);
  const done = new Set(data.progress.filter(p => p.person_id === me.id && p.track_id === track.id && p.status === 'complete').map(p => p.item_id));
  const [full, setFull] = useState(null); const [busy, setBusy] = useState(false); const [quizOpen, setQuizOpen] = useState(false); const [stepsOpen, setStepsOpen] = useState(false);
  useEffect(() => { setFull(null); setQuizOpen(false); setStepsOpen(false); window.scrollTo(0, 0); if (it) sb.from('items').select('*').eq('id', it.id).single().then(({ data }) => setFull(data || null)); }, [step.item_id]);
  const quiz = it ? quizFor(data, it.id) : null; const best = it ? bestQuiz(data, me.id, it.id) : null; const quizDone = !quiz || (best && best.passed);
  const vids = ((full && full.videos) || []).map(videoEmbed).filter(Boolean);
  const agree = async () => { setBusy(true); await sb.from('signoffs').insert({ person_id: me.id, item_id: step.item_id }); await markProgress(me, data, step.item_id); await reload(); setBusy(false); if (quiz && !(best && best.passed)) setQuizOpen(true); else if (idx < steps.length - 1) go(`/run/${track.id}/${idx + 1}`); };
  const next = () => { if (idx < steps.length - 1) go(`/run/${track.id}/${idx + 1}`); };
  const pct = steps.length ? Math.round(100 * steps.filter(s => done.has(s.item_id)).length / steps.length) : 0;
  return html`<div class="runner">
    <aside class=${'side' + (stepsOpen ? ' open' : '')}><div class="row" style=${{ justifyContent: 'space-between' }}><div style=${{ fontWeight: 700, marginBottom: 6 }}>${training ? training.title : 'Learning track'}</div><button class="btn ghost sm only-phone" onClick=${() => setStepsOpen(false)}>Close</button></div><div class="progress"><i style=${{ width: pct + '%' }}></i></div><div class="muted" style=${{ fontSize: 12, margin: '4px 0 10px' }}>${pct}% complete</div>
      ${steps.map((st, i) => { const x = data.items.find(q => q.id === st.item_id); return html`<div key=${i} class=${'item' + (i === idx ? ' on' : '')} style=${{ margin: 0, padding: '8px 8px' }} onClick=${() => { setStepsOpen(false); go(`/run/${track.id}/${i}`); }}><span class="dot" style=${{ background: done.has(st.item_id) ? 'var(--live)' : 'var(--draft)' }}></span><span class="muted" style=${{ minWidth: 22 }}>${i + 1}.</span>${x ? dt(x.title) : '?'}</div>`; })}</aside>
    <main class="main">
      <div class="row" style=${{ justifyContent: 'space-between', marginBottom: 4 }}><button class="btn ghost sm steps-toggle" onClick=${() => setStepsOpen(true)}>☰ Step ${idx + 1} of ${steps.length} · ${pct}%</button><span class="crumb only-desktop" style=${{ margin: 0 }}>Step ${idx + 1} of ${steps.length} · ${step.minutes} min</span></div>
      <div class="progress only-phone" style=${{ marginBottom: 10 }}><i style=${{ width: pct + '%' }}></i></div>
      <div class="crumb"><a href=${'#/training/' + (training ? training.slug : '')}>‹ ${training ? dt(training.title) : 'Training'}</a></div>
      <h1 class="title">${it ? dt(it.title) : 'Missing item'}</h1>
      ${steps.every(s => done.has(s.item_id)) && html`<div class="card" style=${{ borderLeft: '4px solid var(--live)' }}><strong>Track complete.</strong> <span class="muted">Every step is signed off. It stays on your record.</span></div>`}
      ${!it ? html`<div class="card muted">This item isn't published yet or isn't visible to you. Skip to the next step.</div>` : !full ? html`<div class="muted">Loading…</div>` : html`<div>
        ${full.overview && html`<div class="card"><${Md} md=${full.overview}/></div>`}
        ${vids.map(v => html`<iframe key=${v} class="video" src=${v} allow="autoplay; fullscreen" allowfullscreen></iframe>`)}
        <div class="card"><${Md} md=${full.body_md}/></div></div>`}
      ${quizOpen && quiz && it && html`<${Quiz} quiz=${quiz} item=${it} me=${me} onPassed=${async () => { await reload(); }} onClose=${() => { setQuizOpen(false); if (bestQuiz(data, me.id, it.id)?.passed || quizDone) next(); }}/>`}
      ${!quizOpen && quiz && done.has(step.item_id) && !quizDone && html`<div class="card row" style=${{ justifyContent: 'space-between', borderLeft: '4px solid var(--orange)' }}><span>Quick check not passed yet${best ? ` (best ${best.score}%)` : ''}.</span><button class="btn orange sm" onClick=${() => setQuizOpen(true)}>Take the quick check</button></div>`}
      ${!quizOpen && quiz && best && best.passed && html`<div class="card row" style=${{ justifyContent: 'space-between' }}><span>Quick check: <strong style=${{ color: 'var(--live)' }}>passed ${best.score}%</strong></span><button class="btn ghost sm" onClick=${() => setQuizOpen(true)}>Retake</button></div>`}
      <div class="stickybar">
        <div class="muted only-desktop" style=${{ fontSize: 14 }}>${done.has(step.item_id) ? `Completed. ${idx < steps.length - 1 ? '' : 'This was the last item.'}` : 'Read or watch it, then confirm you understand and will follow it.'}</div>
        <div class="row" style=${{ flex: 1, justifyContent: 'flex-end' }}>${idx > 0 && html`<button class="btn ghost" style=${{ flex: '0 0 auto' }} onClick=${() => go(`/run/${track.id}/${idx - 1}`)}>‹</button>`}
          ${!done.has(step.item_id) && it ? html`<button class="btn orange" disabled=${busy} onClick=${agree}>Agree and continue</button>` : quizOpen ? html`<span class="muted" style=${{ fontSize: 13 }}>Finish the quick check</span>` : idx < steps.length - 1 ? html`<button class="btn" onClick=${() => go(`/run/${track.id}/${idx + 1}`)}>${quiz && !quizDone ? 'Skip for now ›' : 'Next ›'}</button>` : html`<a class="btn" href=${'#/training/' + (training ? training.slug : '')}>Back to training</a>`}</div></div>
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
  const shuffle = () => quiz.questions.map(q => { const idx = q.choices.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } return idx; });
  const [order, setOrder] = useState(shuffle); const [picks, setPicks] = useState({}); const [result, setResult] = useState(null); const [busy, setBusy] = useState(false);
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
        return html`<label key=${k} class=${'choice' + cls}><input type="radio" name=${'q' + n} disabled=${!!result} checked=${chosen} onChange=${() => setPicks({ ...picks, [n]: k })}/><span>${q.choices[ci]}</span>${result && isRight ? html`<span style=${{ marginLeft: 'auto', color: '#1A7F37', fontWeight: 700 }}>✓</span>` : result && chosen ? html`<span style=${{ marginLeft: 'auto', color: '#B42318', fontWeight: 700 }}>✗</span>` : ''}</label>`; })}
      ${result && html`<div class="muted" style=${{ fontSize: 13, marginTop: 4 }}>${q.why}</div>`}</div>`)}
    ${!result ? html`<div class="row" style=${{ justifyContent: 'space-between' }}><span class="muted" style=${{ fontSize: 12 }}>${allPicked ? `Pass mark ${quiz.pass_mark || 80}% - answer all ${qs.length} correctly.` : `Answer all ${qs.length} questions to check.`}</span><div class="row">${onClose && html`<button class="btn ghost sm" onClick=${onClose}>Skip for now</button>`}<button class="btn orange" disabled=${!allPicked || busy} onClick=${submit}>Check answers</button></div></div>`
      : html`<div class="row" style=${{ justifyContent: 'space-between' }}><strong style=${{ color: result.passed ? 'var(--live)' : '#B42318' }}>${result.passed ? 'Passed' : 'Not yet'} · ${result.correct}/${qs.length} correct (${result.score}%)</strong>
        <div class="row">${!result.passed && html`<button class="btn orange sm" onClick=${() => { setPicks({}); setResult(null); setOrder(shuffle()); }}>Try again</button>`}${onClose && html`<button class=${'btn sm' + (result.passed ? '' : ' ghost')} onClick=${onClose}>${result.passed ? 'Continue ›' : 'Skip for now'}</button>`}</div></div>`}
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
  const inflight = useRef(false);
  const send = async (text) => { const question = (text || q).trim(); if (question.length < 3 || busy || inflight.current) return; inflight.current = true; setBusy(true); setQ('');
    const history = log.slice(0, 3).reverse().flatMap(e => [{ role: 'user', content: e.q }, { role: 'assistant', content: e.a }]);
    const { data: res, error } = await sb.functions.invoke('ask', { body: { q: question, item_id: item ? item.id : null, conversation_id: conv, history, context: { open_tracks: openTracks, current_item_title: item ? item.title : null } } });
    if (res && res.conversation_id) setConv(res.conversation_id);
    setLog(l => [{ key: Date.now() + Math.random(), id: res && res.log_id, q: question, a: error ? 'Something went wrong: ' + (error.message || error) : (res && res.error ? res.error : res.answer), covered: res ? res.covered !== false : true, sources: (res && res.sources) || [], rating: null, fb: '', fbOpen: false, show: false }, ...l]); setBusy(false); inflight.current = false; };
  useEffect(() => { if (pre) { history.replaceState(null, '', '#/ask' + (itemSlug ? '/' + itemSlug : '')); send(decodeURIComponent(pre)); } }, []);
  const rate = async (e, r) => { setLog(l => l.map(x => x === e ? { ...x, rating: r, fbOpen: r === -1 } : x)); if (e.id) await sb.from('ask_log').update({ rating: r }).eq('id', e.id); };
  const sendFb = async (e) => { if (e.id) await sb.from('ask_log').update({ feedback: e.fb, rating: e.rating === null ? -1 : e.rating }).eq('id', e.id); setLog(l => l.map(x => x === e ? { ...x, fbOpen: false, fbSent: true } : x)); };
  const report = async (e, src) => { const it = data.items.find(i => i.slug === src.slug); if (!it) return; const body = `Ask Homestar flagged by ${me.name}: the answer to "${e.q}" looked wrong. Please check this page.`; await sb.from('comments').insert({ item_id: it.id, author_id: me.id, body }); if (e.id) await sb.from('ask_log').update({ rating: -1, feedback: 'reported: ' + src.title }).eq('id', e.id); alert('Reported. A comment was added on "' + src.title + '" for its owner.'); };
  const mic = () => { if (!SR) { alert('Voice input is not available in this browser. Chrome or Edge on the phone works.'); return; } if (listening) { recRef.current && recRef.current.stop(); return; } const r = new SR(); r.lang = 'en-CA'; r.interimResults = true; r.onresult = ev => { const t = [...ev.results].map(x => x[0].transcript).join(' '); setQ(t); if (ev.results[ev.results.length - 1].isFinal) { setListening(false); send(t); } }; r.onend = () => setListening(false); r.onerror = () => setListening(false); recRef.current = r; setListening(true); r.start(); };
  const canEditItem = (slug) => { const it = data.items.find(i => i.slug === slug); return it && (me.role === 'admin' || it.owner_id === me.id || (me.role === 'manager' && inDept(me, it.department_id))); };
  const actionsFor = (e) => { const acts = []; for (const s of e.sources.slice(0, 2)) { const it = data.items.find(i => i.slug === s.slug); if (!it) continue;
      if (!data.signoffs.some(x => x.person_id === me.id && x.item_id === it.id)) acts.push({ label: `Mark "${dt(it.title)}" as read`, run: async () => { if (!confirm(`Record that you have read "${dt(it.title)}"? This shows on your record.`)) return; await sb.from('signoffs').insert({ person_id: me.id, item_id: it.id }); await markProgress(me, data, it.id); setLog(l => l.map(x => x === e ? { ...x, note: `Marked "${dt(it.title)}" as read ✓` } : x)); reload && reload(); } });
      const tr = data.tracks.find(t => (t.steps || []).some(st => st.item_id === it.id) && !data.progress.some(p => p.person_id === me.id && p.track_id === t.id && p.item_id === it.id && p.status === 'complete')); const trItem = tr && data.items.find(i => i.id === tr.training_id);
      if (trItem && trItem.state === 'live') acts.push({ label: `Continue track: ${dt(trItem.title)}`, run: () => go('/run/' + tr.id + '/' + Math.max(0, (tr.steps || []).findIndex(st => st.item_id === it.id))) });
      if (isChecklist(it.body_md || '') || /checklist|closeout/i.test(it.title)) acts.push({ label: `Open ${dt(it.title)}`, run: () => go('/' + it.type + '/' + it.slug) }); }
    return acts.slice(0, 3); };
  const examples = item ? (item.type === 'policy' ? [`What does ${dt(item.title)} require of me?`, 'What happens if I break this policy?'] : [`What are the steps in ${dt(item.title)}?`, 'Who do I contact about this?']) : ['How do I add a job tag in Housecall Pro?', 'What is the dress code?', 'How do I register a Midea parts warranty?', 'A customer is unhappy - what do I do?'];
  return html`<div><h1 class="title">Ask Homestar</h1>
    <div class="card"><div class="muted" style=${{ fontSize: 13, marginBottom: 8 }}>Answers come only from Homestar's live systems, policies and training${item ? html`, starting with <strong>${item.title}</strong>` : ''}. Follow-up questions keep the thread. Rate answers - every 👎 and every "not covered" goes on the fix list managers see.</div>
      <form class="askbox" onSubmit=${e => { e.preventDefault(); send(); }}><input ref=${boxRef} placeholder=${listening ? 'Listening…' : item ? 'Ask about ' + item.title : log.length ? 'Ask a follow-up…' : 'Ask a question…'} value=${q} onInput=${e => setQ(e.target.value)} autoFocus/>
        <button type="button" class=${'btn ghost' + (listening ? ' live-mic' : '')} title="Speak your question" onClick=${mic}>🎤</button><button class="btn orange" disabled=${busy || q.trim().length < 3}>${busy ? 'Thinking…' : 'Ask'}</button></form>
      ${!log.length && html`<div class="row" style=${{ gap: 6, flexWrap: 'wrap', marginTop: 10 }}>${examples.map(x => html`<button key=${x} class="btn ghost sm" onClick=${() => send(x)}>${x}</button>`)}</div>`}
      ${log.length > 0 && html`<div class="row" style=${{ marginTop: 8 }}><button class="btn ghost sm" onClick=${() => { setLog([]); setConv(null); }}>New conversation</button></div>`}</div>
    ${log.map((e) => html`<div key=${e.key} class=${'card' + (e.covered ? '' : ' gap')}><div style=${{ fontWeight: 600, marginBottom: 6 }}>${e.q}</div><${Md} md=${e.a}/>
      ${!e.covered && html`<div class="muted" style=${{ fontSize: 13, marginTop: 6 }}>Logged as a gap - this question goes on the list of pages to write.</div>`}
      ${e.note && html`<div style=${{ color: 'var(--live)', fontSize: 13, marginTop: 6 }}>${e.note}</div>`}
      ${e.sources.length > 0 && html`<div class="muted" style=${{ fontSize: 13, marginTop: 8 }}>Sources: ${e.sources.map((s, i) => html`<span key=${s.slug}>${i ? ' · ' : ''}[${s.n}] <a href=${'#/' + s.type + '/' + s.slug}>${dt(s.title)}</a>${s.last_reviewed ? html` <span title="last reviewed">(reviewed ${fmtDate(s.last_reviewed)})</span>` : html` <span style=${{ color: '#B45309' }} title="never reviewed in the hub">(not yet reviewed)</span>`}</span>`)}</div>`}
      ${(() => { const acts = actionsFor(e); return acts.length ? html`<div class="row" style=${{ gap: 6, flexWrap: 'wrap', marginTop: 8 }}>${acts.map(a => html`<button key=${a.label} class="btn sm ghost" onClick=${a.run}>${a.label}</button>`)}</div>` : null; })()}
      <div class="row" style=${{ gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
        ${e.covered && html`<button class=${'btn sm ' + (e.rating === 1 ? '' : 'ghost')} onClick=${() => rate(e, 1)}>👍</button><button class=${'btn sm ' + (e.rating === -1 ? '' : 'ghost')} onClick=${() => rate(e, -1)}>👎</button>`}
        <button class="btn sm ghost" onClick=${ev => { if (speechSynthesis.speaking) { speechSynthesis.cancel(); ev.target.textContent = '🔊 Read it'; } else { speak(e.a); ev.target.textContent = '⏹ Stop'; const t = setInterval(() => { if (!speechSynthesis.speaking) { ev.target.textContent = '🔊 Read it'; clearInterval(t); } }, 500); } }}>🔊 Read it</button>
        ${e.sources.length > 0 && html`<button class="btn sm ghost" onClick=${() => setLog(l => l.map(x => x === e ? { ...x, show: !x.show } : x))}>${e.show ? 'Hide' : 'Show'} what it used</button>`}
        ${e.sources[0] && html`<button class="btn sm ghost" onClick=${() => report(e, e.sources[0])}>Report wrong answer</button>`}
        ${e.sources[0] && canEditItem(e.sources[0].slug) && html`<a class="btn sm" href=${'#/fix/' + e.sources[0].slug + '?' + encodeURIComponent('Staff asked: "' + e.q + '". The page did not answer it well enough. Update the page so this question is answered clearly.')}>Draft a fix to "${dt(e.sources[0].title)}"</a>`}
        ${!e.covered && me.role !== 'member' && html`<span class="muted" style=${{ fontSize: 12 }}>No page covers this - it is on the Gaps list on the Dashboard; new pages are written in the Cowork brain (ask Claude) and appear here after the nightly sync.</span>`}</div>
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
  const canEdit = me.role === 'admin' || item.owner_id === me.id || (me.role === 'manager' && inDept(me, item.department_id));
  if (!canEdit) return html`<div class="card">Only the owner, the department manager or an admin can draft changes to this page.</div>`;
  const run = async () => { setBusy(true); setErr(''); const { data: res, error } = await sb.functions.invoke('ask', { body: { mode: 'draft_fix', item_id: item.id, instruction: instr } }); setBusy(false); if (error || (res && res.error)) setErr((error && error.message) || res.error); else setDraft(res.draft); };
  const apply = async (asDraftState) => { if (!confirm(asDraftState ? 'Save this change and set the page to In review?' : 'Publish this change Live for everyone now?')) return; setBusy(true); const row = { body_md: draft, ...(asDraftState ? { state: 'review' } : {}) }; const { error } = await sb.from('items').update(row).eq('id', item.id); setBusy(false); if (error) setErr(error.message); else { reload && reload(); go('/' + item.type + '/' + item.slug); } };
  return html`<div><h1 class="title">Draft a fix: ${dt(item.title)}</h1>
    <div class="card"><label class="muted" style=${{ fontSize: 13 }}>What should change? (a staff question the page failed to answer, a correction, a new step)</label>
      <textarea rows="4" style=${{ width: '100%', boxSizing: 'border-box', padding: 10, border: '1px solid var(--line)', borderRadius: 8, font: 'inherit', marginTop: 6 }} value=${instr} onInput=${e => setInstr(e.target.value)}></textarea>
      <div class="row" style=${{ justifyContent: 'space-between', marginTop: 8 }}><span class="muted" style=${{ fontSize: 12 }}>Claude rewrites the page from its current text; facts it doesn't have are marked [CONFIRM: …]. Nothing is saved until you choose.</span><button class="btn orange" disabled=${busy || instr.trim().length < 5} onClick=${run}>${busy ? 'Drafting…' : draft ? 'Draft again' : 'Draft the change'}</button></div>
      ${err && html`<div class="err" style=${{ marginTop: 8 }}>${err}</div>`}</div>
    ${draft && (() => { const a = (full ? full.body_md : '').split('\n'), b = draft.split('\n'); const A = new Set(a), B = new Set(b); const added = b.filter(l => l.trim() && !A.has(l)), removed = a.filter(l => l.trim() && !B.has(l)); return html`<div class="card"><h3>What changes <span class="muted">· ${plural(added.length, 'line')} added, ${plural(removed.length, 'line')} removed</span></h3>${added.slice(0, 12).map((l, i) => html`<div key=${'a' + i} style=${{ background: '#E8F5EC', padding: '2px 8px', borderRadius: 4, margin: '2px 0', fontSize: 13 }}>+ ${l}</div>`)}${removed.slice(0, 12).map((l, i) => html`<div key=${'r' + i} style=${{ background: '#FDECEC', padding: '2px 8px', borderRadius: 4, margin: '2px 0', fontSize: 13, textDecoration: 'line-through' }}>- ${l}</div>`)}${added.length + removed.length === 0 && html`<div class="muted">No text changes.</div>`}</div>`; })()}
    ${draft && html`<div class="grid2">
      <div class="card"><h3 style=${{ margin: '0 0 6px' }}>Current</h3><div style=${{ maxHeight: 520, overflow: 'auto' }}><${Md} md=${full ? full.body_md : ''}/></div></div>
      <div class="card" style=${{ borderLeft: '4px solid var(--orange)' }}><h3 style=${{ margin: '0 0 6px' }}>Proposed ${/\[CONFIRM:/.test(draft) ? html`<span class="badge review">has [CONFIRM] items</span>` : ''}</h3><div style=${{ maxHeight: 520, overflow: 'auto' }}><${Md} md=${draft}/></div>
        <textarea rows="8" class="mono" style=${{ width: '100%', boxSizing: 'border-box', marginTop: 8, fontFamily: 'ui-monospace,Consolas,monospace', fontSize: 12, padding: 8, border: '1px solid var(--line)', borderRadius: 8 }} value=${draft} onInput=${e => setDraft(e.target.value)}></textarea>
        <div class="row" style=${{ justifyContent: 'flex-end', gap: 6, marginTop: 8 }}><a class="btn ghost sm" href=${'#/' + item.type + '/' + item.slug} onClick=${ev => { if (!confirm('Discard this proposed change?')) ev.preventDefault(); }}>Discard</a><button class="btn sm" disabled=${busy} onClick=${() => apply(true)}>Save as In review</button><button class="btn orange sm" disabled=${busy || /\[CONFIRM:/.test(draft)} title=${/\[CONFIRM:/.test(draft) ? 'Resolve the [CONFIRM] items first' : ''} onClick=${() => apply(false)}>Save live</button></div></div></div>`}
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
    ${gaps.length > 0 && html`<h4 style=${{ margin: '8px 0 4px' }}>Gaps to fix (${gaps.length})</h4><div class="scrollx"><table class="table"><thead><tr><th>Question</th><th>Who</th><th>Why</th><th>Feedback</th><th>When</th></tr></thead><tbody>${gaps.slice(0, 15).map(r => html`<tr key=${r.id}><td>${r.question}</td><td>${(people.find(p => p.id === r.person_id) || {}).name || ''}</td><td><span class=${'badge ' + (!r.covered ? 'draft' : 'review')}>${!r.covered ? 'not covered' : 'thumbs down'}</span></td><td class="muted">${r.feedback || ''}</td><td class="muted">${fmtDate(r.created_at)}</td></tr>`)}</tbody></table></div>`}
    ${top.length > 0 && html`<div class="muted" style=${{ fontSize: 13, marginTop: 8 }}>Most cited: ${top.map(([t, c]) => `${t} (${c})`).join(' · ')}</div>`}</div>`;
}
const VIDEO_RX = /https?:\/\/(?:www\.)?(?:loom\.com\/(?:share|embed)\/[a-f0-9]+|youtube\.com\/(?:watch\?v=|embed\/)[\w-]{11}|youtu\.be\/[\w-]{11}|fast\.wistia\.(?:net|com)\/embed\/iframe\/\w+|\w+\.wistia\.com\/medias\/\w+)[^\s)>\]"]*/g;
function Editor({ item, data, me, people, onDone }) {
  const [f, setF] = useState({ title: item.title, overview: item.overview || '', body_md: item.body_md || '', state: item.state, owner_id: item.owner_id || '', next_review: item.next_review || '', templates: item.templates || [], folder_id: item.folder_id || '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(0); const taRef = useRef(null); const fileRef = useRef(null);
  const addImages = async (files) => {
    const list = [...files].filter(f => /^image\//.test(f.type)); if (!list.length) { if (files.length) setErr('Only images can be dropped here (PNG, JPG, WebP). For PDFs or other files, add a link instead.'); return; } setUploading(list.length); setErr('');
    for (const file of list) { try { const key = await uploadImage(item.id, file); insertAtCursor(`\n![${file.name.replace(/\.\w+$/, '')}](hubimg://${key})\n`); } catch (e) { setErr('Image upload failed: ' + (e.message || e)); } setUploading(n => n - 1); }
  };
  const insertAtCursor = (txt) => { const ta = taRef.current; setF(prev => { const v = prev.body_md; if (!ta) return { ...prev, body_md: v + txt }; const focused = document.activeElement === ta || ta.dataset.touched === '1'; const a = focused ? (ta.selectionStart ?? v.length) : v.length, b = focused ? (ta.selectionEnd ?? v.length) : v.length; const nv = v.slice(0, a) + txt + v.slice(b); setTimeout(() => { try { ta.focus(); ta.selectionStart = ta.selectionEnd = a + txt.length; } catch (_) {} }, 0); return { ...prev, body_md: nv }; }); };
  const onPaste = (e) => { const files = [...(e.clipboardData?.items || [])].filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean); if (files.length) { e.preventDefault(); addImages(files); } };
  const onDrop = (e) => { e.preventDefault(); if (e.dataTransfer?.files?.length) addImages(e.dataTransfer.files); };
  const up = (k, v) => setF({ ...f, [k]: v });
  const dirty = () => JSON.stringify(f) !== JSON.stringify({ title: item.title, overview: item.overview || '', body_md: item.body_md || '', state: item.state, owner_id: item.owner_id || '', next_review: item.next_review || '', templates: item.templates || [], folder_id: item.folder_id || '' });
  const cancel = () => { if (!dirty() || confirm('Discard your unsaved changes?')) onDone(false); };
  const setT = (n, k, v) => up('templates', f.templates.map((t, i) => i === n ? { ...t, [k]: v } : t));
  const save = async () => {
    if (f.state !== item.state) {
      const msg = f.state === 'retired' ? 'Retire this page? Staff will no longer see it in lists or search.' : item.state === 'live' ? `Take this page off Live (to ${STATES[f.state]})? Staff will stop seeing it until it is Live again.` : f.state === 'live' ? 'Publish this page Live for everyone?' : null;
      if (msg && !confirm(msg)) return;
    }
    setBusy(true); setErr('');
    const row = { title: f.title.trim(), overview: f.overview, body_md: f.body_md, state: f.state, owner_id: f.owner_id || null, next_review: f.next_review || null, templates: f.templates.filter(t => (t.name || t.body || '').trim()), folder_id: f.folder_id || null, videos: Array.from(new Set((f.body_md.match(VIDEO_RX) || []))), ...(f.state === 'live' && item.state !== 'live' ? { last_reviewed: new Date().toISOString().slice(0, 10) } : {}) };
    const { error } = await sb.from('items').update(row).eq('id', item.id); setBusy(false);
    if (error) setErr(error.message); else onDone(true);
  };
  const folders = data.folders.filter(x => x.library === item.type);
  const ins = (txt) => insertAtCursor(txt);
  return html`<div class="card editor">
    <div class="row" style=${{ justifyContent: 'space-between', marginBottom: 10 }}><h3 style=${{ margin: 0 }}>Edit ${LIB_ONE[item.type]}</h3><div class="row"><button class="btn ghost sm" onClick=${() => setPreview(!preview)}>${preview ? 'Back to editing' : 'Preview'}</button><button class="btn ghost sm" onClick=${cancel}>Cancel</button><button class="btn orange sm" disabled=${busy || !f.title.trim()} onClick=${save}>Save</button></div></div>
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
    ${preview ? html`<div class="card" style=${{ background: 'var(--bg)' }}><${Md} md=${f.body_md}/></div>` : html`<textarea ref=${taRef} class="mono" rows="22" value=${f.body_md} onInput=${e => up('body_md', e.target.value)} onPaste=${onPaste} onDrop=${onDrop} onDragOver=${e => e.preventDefault()} onFocus=${e => { e.target.dataset.touched = '1'; }} placeholder="Write the system in Markdown. Paste a Loom link on its own line and it embeds. Paste or drop screenshots straight in here, or use Add image."></textarea>`}
    <div class="muted" style=${{ fontSize: 12 }}>Markdown: **bold**, lists with "1." or "-", headings with "##", links [text](url). Numbered steps or "- [ ]" lines turn on Checklist mode for readers. Screenshots: paste (Ctrl+V), drag in, or Add image - they upload to the hub and land where your cursor is.</div>
    <h4 style=${{ margin: '14px 0 6px' }}>Templates (copy-paste snippets)</h4>
    ${f.templates.map((t, n) => html`<div key=${n} class="tpl"><div class="row"><input style=${{ flex: 1 }} placeholder="Template name" value=${t.name || ''} onInput=${e => setT(n, 'name', e.target.value)}/><button class="btn ghost sm" onClick=${() => { if (confirm(`Remove the template "${t.name || 'untitled'}"? It is only gone once you save.`)) up('templates', f.templates.filter((_, i) => i !== n)); }}>Remove</button></div><textarea rows="4" value=${t.body || ''} onInput=${e => setT(n, 'body', e.target.value)}></textarea></div>`)}
    <button class="btn ghost sm" onClick=${() => up('templates', [...f.templates, { name: '', body: '' }])}>+ Template</button>
    <div class="row" style=${{ justifyContent: 'flex-end', marginTop: 12 }}><button class="btn ghost sm" onClick=${cancel}>Cancel</button><button class="btn orange" disabled=${busy || !f.title.trim()} onClick=${save}>Save</button></div>
  </div>`;
}
function History({ item, people, canEdit, onRestored }) {
  const [vs, setVs] = useState(null); const [open, setOpen] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { sb.from('item_versions').select('id,title,body_md,author_id,source,saved_at').eq('item_id', item.id).order('saved_at', { ascending: false }).limit(50).then(({ data }) => setVs(data || [])); }, [item.id, item.updated_at]);
  const who = (v) => v.source === 'brain' ? 'Claude (brain sync)' : v.source === 'import' ? 'Import' : (people.find(p => p.id === v.author_id) || {}).name || 'Someone';
  const restore = async (v) => { if (!confirm('Restore this version? The current text is kept in history.')) return; setBusy(true); const { error } = await sb.from('items').update({ title: v.title, body_md: v.body_md }).eq('id', item.id); setBusy(false); if (!error) onRestored(); else alert(error.message); };
  if (!vs) return null;
  return html`<div class="card"><h3 style=${{ margin: '0 0 6px' }}>Version history <span class="muted" style=${{ fontWeight: 400, fontSize: 13 }}>· ${plural(vs.length, 'version')} · Restore brings back the text of a version (title and body); state, owner and dates stay as they are.</span></h3>
    ${vs.map((v, n) => html`<div key=${v.id} style=${{ borderTop: '1px solid var(--line)', padding: '6px 0' }}><div class="row" style=${{ justifyContent: 'space-between' }}><span><strong>${n === 0 ? 'Current' : 'v' + (vs.length - n)}</strong> <span class="muted" style=${{ fontSize: 13 }}>· ${fmtDate(v.saved_at)} ${new Date(v.saved_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })} · ${who(v)} · ${(v.body_md || '').length} chars</span></span><div class="row"><button class="btn ghost sm" onClick=${() => setOpen(open === v.id ? null : v.id)}>${open === v.id ? 'Hide' : 'View'}</button>${n > 0 && canEdit && html`<button class="btn ghost sm" disabled=${busy} onClick=${() => restore(v)}>Restore text</button>`}</div></div>
      ${open === v.id && html`<div style=${{ background: 'var(--bg)', borderRadius: 8, padding: 10, marginTop: 6, maxHeight: 360, overflow: 'auto' }}><div class="muted" style=${{ fontSize: 12 }}>${v.title}</div><${Md} md=${v.body_md}/></div>`}</div>`)}</div>`;
}
function MyRecord({ data, me, people }) {
  const my = data.signoffs.filter(s => s.person_id === me.id).sort((a, b) => b.agreed_at.localeCompare(a.agreed_at));
  const myTracks = data.tracks.map(t => { const steps = t.steps || []; const d = steps.filter(s => data.progress.some(p => p.person_id === me.id && p.track_id === t.id && p.item_id === s.item_id && p.status === 'complete')).length; return { t, steps: steps.length, done: d, training: data.items.find(i => i.id === t.training_id) }; }).filter(x => x.done > 0 || (x.training && x.training.state === 'live'));
  return html`<div class="print-record"><div class="card row" style=${{ justifyContent: 'space-between' }}><div><div style=${{ fontWeight: 700 }}>${me.name}</div><div class="muted" style=${{ fontSize: 13 }}>${me.email || ''} · ${deptsOf(me).map(id => (data.departments.find(d => d.id === id) || {}).name).filter(Boolean).join(', ') || 'no department yet'} · ${me.role}</div></div><button class="btn ghost sm" onClick=${() => sb.auth.signOut({ scope: 'local' })}>Sign out</button></div>${['admin', 'manager'].includes(me.role) && html`<div class="actions" style=${{ marginBottom: 10 }}><a class="btn sm ghost" href="#/dashboard">📊 Dashboard</a>${me.role === 'admin' && html`<a class="btn sm ghost" href="#/people">👥 People</a><a class="btn sm ghost" href="#/changes">↶ Changes</a>`}</div>`}<h1 class="title">My record <span class="muted print-only" style=${{ fontSize: 14, fontWeight: 400 }}>· ${me.name} · ${me.email || ''} · printed ${fmtDate(new Date().toISOString())}</span></h1>
    <div class="card list"><h3>Learning tracks</h3>${myTracks.filter(x => x.steps > 1).map(x => html`<a key=${x.t.id} class="lrow" href=${'#/training/' + (x.training ? x.training.slug : '')}><span class="t"><b>${x.training ? dt(x.training.title) : '?'}</b><small>${x.done} of ${x.steps} steps</small></span><span class=${'badge ' + (x.done === x.steps ? 'live' : x.done ? 'review' : 'draft')}>${x.steps ? Math.round(100 * x.done / x.steps) : 0}%</span></a>`)}${!myTracks.some(x => x.steps > 1) && html`<div class="muted">No tracks assigned yet.</div>`}</div>
    <div class="card list"><h3>Short lessons <span class="muted">· ${myTracks.filter(x => x.steps === 1 && x.done).length} of ${myTracks.filter(x => x.steps === 1).length} done</span></h3>${myTracks.filter(x => x.steps === 1).map(x => html`<a key=${x.t.id} class="lrow" href=${'#/training/' + (x.training ? x.training.slug : '')}><span class="t"><b>${x.training ? dt(x.training.title) : '?'}</b><small>${(data.folders.find(f => f.id === (x.training || {}).folder_id) || {}).name || ''}</small></span><span class=${'badge ' + (x.done ? 'live' : 'draft')}>${x.done ? 'Done' : 'Not yet'}</span></a>`)}</div>
    ${(() => { const mine = (data.quizResults || []).filter(r => r.person_id === me.id); const byItem = {}; mine.forEach(r => { const b = byItem[r.item_id]; if (!b || r.score > b.score) byItem[r.item_id] = r; }); const rows = Object.values(byItem).sort((a, b) => b.attempted_at.localeCompare(a.attempted_at)); return rows.length ? html`<div class="card"><h3 style=${{ margin: '0 0 8px' }}>Quick checks (${rows.filter(r => r.passed).length} passed of ${rows.length})</h3><table class="table"><thead><tr><th>Item</th><th>Best score</th><th>Result</th><th>Date</th></tr></thead><tbody>${rows.map(r => { const it = data.items.find(i => i.id === r.item_id); return html`<tr key=${r.item_id} onClick=${() => it && go('/' + it.type + '/' + it.slug)}><td>${it ? html`<a href=${'#/' + it.type + '/' + it.slug}>${dt(it.title)}</a>` : '(removed)'}</td><td>${r.score}%</td><td><span class=${'badge ' + (r.passed ? 'live' : 'draft')}>${r.passed ? 'Passed' : 'Not passed'}</span></td><td class="muted">${fmtDate(r.attempted_at)}</td></tr>`; })}</tbody></table></div>` : null; })()}
    <div class="card"><h3 style=${{ margin: '0 0 8px' }}>Sign-offs (${my.length})</h3><table class="table"><thead><tr><th>Item</th><th>Type</th><th>Agreed</th></tr></thead><tbody>${my.map((s, n) => { const it = data.items.find(i => i.id === s.item_id); return html`<tr key=${n} onClick=${() => it && go('/' + it.type + '/' + it.slug)}><td>${it ? html`<a href=${'#/' + it.type + '/' + it.slug}>${dt(it.title)}</a>` : '(removed item)'}</td><td>${it ? LIBS[it.type] : ''}</td><td class="muted">${fmtDate(s.agreed_at)}</td></tr>`; })}</tbody></table>
    <div class="row" style=${{ marginTop: 8 }}><button class="btn sm" onClick=${() => window.print()}>Print / save as PDF</button><span class="muted" style=${{ fontSize: 13 }}>Choose "Save as PDF" in the print dialog for the HR file.</span></div></div></div>`;
}
function Dashboard({ data, me, people }) {
  if (!['admin', 'manager'].includes(me.role)) return html`<div class="card">Managers and admins only.</div>`;
  const scope = me.role === 'admin' ? people : people.filter(p => deptsOf(p).some(d => inDept(me, d)));
  const liveTracks = data.tracks.filter(t => { const tr = data.items.find(i => i.id === t.training_id); return tr && tr.state === 'live'; });
  const today = new Date().toISOString().slice(0, 10); const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const stale = data.items.filter(i => i.state === 'live' && ((i.next_review && i.next_review < today) || (!i.next_review && (i.last_reviewed || i.updated_at || '').slice(0, 10) < yearAgo)));
  const drafts = data.items.filter(i => i.state === 'draft' || i.state === 'review');
  return html`<div><h1 class="title">Dashboard</h1>
    <div class="stats">${[['People', scope.filter(p => p.active).length], ['Live items', data.items.filter(i => i.state === 'live').length], ['Drafts / in review', drafts.length], ['Needs review', stale.length], ['Sign-offs', data.signoffs.length], ['Quick checks passed', (() => { const k = new Set(); (data.quizResults || []).filter(r => r.passed).forEach(r => k.add(r.person_id + r.item_id)); return k.size; })()]].map(([k, v]) => html`<div key=${k} class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`)}</div>
    <div class="card"><h3>Training completion</h3><div class="scrollx"><table class="table"><thead><tr><th>Person</th><th>Quick checks</th>${liveTracks.map(t => { const tr = data.items.find(i => i.id === t.training_id); return html`<th key=${t.id} title=${tr.title}>${tr.title.length > 22 ? tr.title.slice(0, 20) + '…' : tr.title}</th>`; })}</tr></thead>
      <tbody>${scope.filter(p => p.active).map(p => html`<tr key=${p.id}><td>${p.name}</td><td>${(() => { const k = new Set(); (data.quizResults || []).filter(r => r.person_id === p.id && r.passed).forEach(r => k.add(r.item_id)); const att = new Set((data.quizResults || []).filter(r => r.person_id === p.id).map(r => r.item_id)); return html`<span class=${'badge ' + (att.size && k.size === att.size ? 'live' : att.size ? 'review' : 'draft')}>${k.size}/${(data.quizzes || []).length}</span>`; })()}</td>${liveTracks.map(t => { const steps = (t.steps || []).length; const d = (t.steps || []).filter(s => data.progress.some(pr => pr.person_id === p.id && pr.track_id === t.id && pr.item_id === s.item_id && pr.status === 'complete')).length; const pct = steps ? Math.round(100 * d / steps) : 0; return html`<td key=${t.id}><span class=${'badge ' + (pct === 100 ? 'live' : pct > 0 ? 'review' : 'draft')}>${pct}%</span></td>`; })}</tr>`)}</tbody></table></div></div>
    <${AskStats} data=${data} me=${me} people=${people}/>
    <${ItemTable} rows=${stale} data=${data} title="Live items overdue for review (no review in 12 months)"/>
    <${ItemTable} rows=${drafts} data=${data} title="Drafts and items in review"/>
  </div>`;
}
function Home({ data, me, people }) {
  const recent = [...data.items].filter(i => i.state === 'live').sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')).slice(0, 6);
  const companyId = (data.departments.find(d => d.name === 'Company') || {}).id;
  const open = data.tracks.map(t => { const steps = t.steps || []; const d = steps.filter(s => data.progress.some(p => p.person_id === me.id && p.track_id === t.id && p.item_id === s.item_id && p.status === 'complete')).length; return { t, steps: steps.length, done: d, training: data.items.find(i => i.id === t.training_id) }; })
    .filter(x => x.training && x.training.state === 'live' && x.steps && x.done < x.steps && (inDept(me, x.training.department_id) || !x.training.department_id || x.training.department_id === companyId))
    .sort((a, b) => (b.done > 0) - (a.done > 0) || (b.steps > 1) - (a.steps > 1));
  const openTracks = open.filter(x => x.steps > 1); const openSingles = open.filter(x => x.steps === 1);
  const primary = open[0]; const nextIdx = primary ? Math.max(0, (primary.t.steps || []).findIndex(s => !data.progress.some(p => p.person_id === me.id && p.track_id === primary.t.id && p.item_id === s.item_id && p.status === 'complete'))) : 0;
  const hour = new Date().getHours(); const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toISOString().slice(0, 10); const soon = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const due = data.items.filter(i => i.state === 'live' && i.next_review && i.next_review <= soon && (me.role === 'admin' || i.owner_id === me.id || (me.role === 'manager' && inDept(me, i.department_id))));
  return html`<div>
    <h1 class="title">${greet}, ${me.name.split(' ')[0]}</h1>
    <form class="card askbox" onSubmit=${e => { e.preventDefault(); const v = e.target.elements.q.value.trim(); if (v) go('/ask?' + encodeURIComponent(v)); }}><input name="q" placeholder="Ask Homestar: how do I…"/><button class="btn orange">Ask</button></form>
    ${primary && html`<div class="card hero"><h3 style=${{ margin: '0 0 4px' }}>${primary.done ? 'Continue your training' : 'Start your training'}</h3><div style=${{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>${dt(primary.training.title)}</div>
      <div class="progress" style=${{ marginBottom: 6 }}><i style=${{ width: (100 * primary.done / primary.steps) + '%' }}></i></div>
      <div class="row" style=${{ justifyContent: 'space-between' }}><span class="muted" style=${{ fontSize: 13 }}>${primary.done} of ${primary.steps} done${openTracks.length > 1 ? ` · ${plural(openTracks.length - 1, 'more track')} waiting` : ''}${openSingles.length ? ` · ${plural(openSingles.length, 'short lesson')} to watch` : ''}</span><a class="btn" style=${{ background: '#fff', color: 'var(--blue)' }} href=${'#/run/' + primary.t.id + '/' + nextIdx}>${primary.done ? 'Continue ›' : 'Start ›'}</a></div></div>`}
    <div class="tiles">
      <a class="tile" href="#/system"><b>Systems</b><small>${plural(data.items.filter(i => i.type === 'system').length, 'how-to')}</small></a>
      <a class="tile" href="#/policy"><b>Policies</b><small>${plural(data.items.filter(i => i.type === 'policy').length, 'company rule')}</small></a>
      <a class="tile" href="#/training"><b>Training</b><small>${openTracks.length ? plural(openTracks.length, 'track') + ' open' : openSingles.length ? plural(openSingles.length, 'lesson') + ' left' : 'all done'}</small></a>
      <a class="tile" href="#/me"><b>My record</b><small>${plural(data.signoffs.filter(s => s.person_id === me.id).length, 'sign-off')}</small></a>
    </div>
    ${due.length > 0 && html`<div class="card" style=${{ borderLeft: '4px solid var(--orange)' }}><h3>Reviews due <span class="muted">· ${due.filter(i => i.next_review < today).length} overdue, ${due.length} within 14 days</span></h3>${due.slice(0, 8).map(i => html`<div key=${i.id} class="row" style=${{ justifyContent: 'space-between', padding: '4px 0' }}><a href=${'#/' + i.type + '/' + i.slug}>${i.title}</a><span class=${'badge ' + (i.next_review < today ? 'draft' : 'review')}>${i.next_review < today ? 'overdue ' : ''}${fmtDate(i.next_review)}</span></div>`)}</div>`}
    <${ItemTable} rows=${recent} data=${data} title="Recently updated"/>
  </div>`;
}
function InviteCard({ data, reload }) {
  const blank = { name: '', email: '', department_id: '', role: 'member' };
  const [f, setF] = useState(blank); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const dn = (id) => (data.departments.find(d => d.id === id) || {}).name || 'no department';
  const send = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    if (!confirm(`Send an invite to ${f.email}?\n\n${f.name} joins as ${f.role} in ${dn(f.department_id)}. Their account turns on when they create their password.`)) return;
    setBusy(true);
    const { data: r, error } = await sb.functions.invoke('invite', { body: { ...f, department_id: f.department_id || null, redirect: location.origin + location.pathname } });
    setBusy(false);
    let m = r && r.error; if (error && !m) { try { m = (await error.context.json()).error; } catch (_) { m = error.message; } }
    if (m) { setErr(m); return; }
    setMsg(`${r.resend ? 'Invite re-sent' : 'Invite sent'} to ${f.email}. They show as Pending registration until they create their password; the link works for 24 hours.`); setF(blank); reload();
  };
  return html`<form class="card" onSubmit=${send}>
    <h3 style=${{ margin: '0 0 4px' }}>Invite a team member</h3>
    <p class="muted" style=${{ margin: '0 0 10px', fontSize: 13 }}>They get an email with an 8-digit code. They tap Enter your code, type their email and the code, then create a password - their account turns on by itself, with the department and role you pick here.</p>
    <div class="row" style=${{ flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
      <label style=${{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, flex: '1 1 160px' }}>Name<input value=${f.name} onInput=${up('name')} required minLength="2" placeholder="First Last"/></label>
      <label style=${{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, flex: '1 1 220px' }}>Email<input type="email" value=${f.email} onInput=${up('email')} required placeholder="name@homestarhvac.ca"/></label>
      <label style=${{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, flex: '1 1 160px' }}>Department<select value=${f.department_id} onChange=${up('department_id')}><option value="">—</option>${data.departments.map(d => html`<option key=${d.id} value=${d.id}>${d.name}</option>`)}</select></label>
      <label style=${{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, flex: '0 1 130px' }}>Role<select value=${f.role} onChange=${up('role')}><option>member</option><option>manager</option><option>admin</option></select></label>
      <button class="btn" disabled=${busy} style=${{ flex: '0 0 auto' }}>${busy ? 'Sending…' : 'Send invite'}</button>
    </div>
    ${msg && html`<div style=${{ marginTop: 10, color: '#067647' }}>${msg}</div>`}${err && html`<div style=${{ marginTop: 10, color: '#B42318' }}>${err}</div>`}
  </form>`;
}
function People({ data, people, me, reload }) {
  if (me.role !== 'admin') return html`<div class="card">Admins only.</div>`;
  const [err, setErr] = useState('');
  // every change asks first; your own role and Active box are locked so an admin can never lock themselves out (DB enforces the same, db/011)
  const set = async (p, patch, ask, el) => {
    if (ask && !confirm(ask)) { if (el) { if (el.type === 'checkbox') el.checked = !el.checked; else el.value = 'role' in patch ? p.role : (p.department_id || ''); } return; }
    setErr(''); const { error } = await sb.from('people').update(patch).eq('id', p.id); if (error) setErr(error.message); reload();
  };
  const dname = (id) => (data.departments.find(d => d.id === id) || {}).name || 'no department';
  // more than one department (db/019): department_id = main (first picked), extra_department_ids = the rest
  const toggleDept = (p, id) => {
    const cur = deptsOf(p); const on = cur.includes(id); const next = on ? cur.filter(x => x !== id) : [...cur, id];
    const order = data.departments.map(d => d.id).filter(x => next.includes(x));
    const main = next.includes(p.department_id) ? p.department_id : (order[0] || null);
    set(p, { department_id: main, extra_department_ids: order.filter(x => x !== main) }, `${on ? 'Take ' + p.name + ' out of' : 'Add ' + p.name + ' to'} ${dname(id)}? ${p.name.split(' ')[0]} will be in: ${order.map(dname).join(', ') || 'no department'}. This changes which pages they can edit.`);
  };
  const callFn = async (body) => { const { data: r, error } = await sb.functions.invoke('invite', { body }); let m = r && r.error; if (error && !m) { try { m = (await error.context.json()).error; } catch (_) { m = error.message; } } return { r, m }; };
  const resend = async (p) => {
    if (!confirm(`Send ${p.name}'s invite again to ${p.email}? The new link works for 24 hours.`)) return;
    setErr(''); const { m } = await callFn({ name: p.name, email: p.email, role: p.role, department_id: p.department_id || null, redirect: location.origin + location.pathname });
    if (m) setErr(m); else { alert(`Invite re-sent to ${p.email}.`); reload(); }
  };
  const remove = async (p) => {
    if (!confirm(`Delete ${p.name} (${p.email}) from the hub?\n\nThis removes their account and sign-in for good and can't be undone. Their training sign-offs, progress and quiz results are deleted too. Pages, edits and comments they made stay (without their name).\n\nTo keep their records, untick Active instead.`)) return;
    setErr(''); const { m } = await callFn({ mode: 'delete', id: p.id });
    if (m) setErr(m); else reload();
  };
  const pending = (p) => p.invited_at && !p.registered_at;
  return html`<div><h1 class="title">People</h1><${InviteCard} data=${data} reload=${reload}/><div class="card" style=${{ padding: 0, overflow: 'hidden' }}><div class="scrollx" style=${{ border: 0, borderRadius: 0 }}><table class="table"><thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Role</th><th>Active</th><th></th></tr></thead><tbody>
    ${people.map(p => html`<tr key=${p.id}><td>${p.name}${p.sees_all_boards && html`<div style=${{ fontSize: 12, color: '#174fd0', fontWeight: 600, marginTop: 2 }}>Owner · full access to every board, KPIs and settings</div>`}${pending(p) && html`<div style=${{ fontSize: 12, color: '#B54708', marginTop: 2 }}>Pending registration · invited ${fmtDate(p.invited_at)} · <a href="#" onClick=${e => { e.preventDefault(); resend(p); }}>Resend invite</a></div>`}</td><td>${p.email}</td>
      <td><div class="deptchips">${data.departments.map(d => { const on = deptsOf(p).includes(d.id); return html`<button key=${d.id} type="button" class=${'dchip' + (on ? ' on' : '') + (p.department_id === d.id ? ' main' : '')} title=${p.department_id === d.id ? 'Main department' : ''} onClick=${() => toggleDept(p, d.id)}>${on ? '✓ ' : ''}${d.name}</button>`; })}</div></td>
      <td><select value=${p.role} disabled=${p.id === me.id} title=${p.id === me.id ? "You can't change your own role" : ''} onChange=${e => set(p, { role: e.target.value }, `Change ${p.name}'s role from ${p.role} to ${e.target.value}?`, e.target)}><option>member</option><option>manager</option><option>admin</option></select></td>
      <td><label class="row" style=${{ gap: 6 }}><input type="checkbox" checked=${p.active} disabled=${p.id === me.id || pending(p)} title=${p.id === me.id ? "You can't deactivate your own account" : pending(p) ? 'Turns on by itself when they create their password' : ''} onChange=${e => set(p, { active: e.target.checked }, e.target.checked ? `Activate ${p.name}? They will be able to sign in and see all live pages.` : `Deactivate ${p.name}? They will be signed out and can't get back in until an admin re-activates them.`, e.target)}/>${p.id === me.id ? html`<span class="muted" style=${{ fontSize: 12 }}>you</span>` : ''}</label></td>
      <td>${p.id !== me.id && html`<button class="btn ghost sm" style=${{ color: '#B42318' }} title="Delete this person" onClick=${() => remove(p)}>Delete</button>`}</td></tr>`)}</tbody></table></div></div>
    ${err && html`<div class="card" style=${{ color: '#B42318' }}>${err}</div>`}
    <p class="muted" style=${{ fontSize: 13 }}>Invite new staff with the form above; they show as Pending registration until they create their password, then turn Active by themselves. Delete removes someone for good (untick Active to keep their training records). Tap department names to put someone in one or more departments (the first one is their main department, underlined); a manager can edit pages in every department they're in. Anyone who signs up on their own from the sign-in page waits here until an admin sets their department and role and ticks Active. Every change asks you to confirm first. Your own role and Active box are locked so you can't lock yourself out.</p></div>`;
}

// ---------- Change log + kill switch (admin; db/012) ----------
const SYSTEMS = { hub: 'Hub', board: 'Board', hcp: 'HCP', onedrive: 'OneDrive', outlook: 'Outlook', qbo: 'QuickBooks', supplier: 'Supplier', other: 'Other' };
const clip = (v, n = 160) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s == null ? '—' : (s.length > n ? s.slice(0, n) + '…' : s); };
const NOISE = new Set(['updated_at', 'search_tsv']);
function diffRows(c) {
  const b = c.before || {}, a = c.after || {};
  if (c.action === 'insert' || !c.before) return Object.keys(a).filter(k => !NOISE.has(k) && a[k] != null).slice(0, 8).map(k => [k, null, a[k]]);
  if (c.action === 'delete' || !c.after) return Object.keys(b).filter(k => !NOISE.has(k) && b[k] != null).slice(0, 8).map(k => [k, b[k], null]);
  return [...new Set([...Object.keys(b), ...Object.keys(a)])].filter(k => !NOISE.has(k) && JSON.stringify(b[k]) !== JSON.stringify(a[k])).map(k => [k, b[k], a[k]]);
}
function ChangeLog({ data, people, me }) {
  if (me.role !== 'admin') return html`<div class="card">Admins only.</div>`;
  const [rows, setRows] = useState(null); const [paused, setPaused] = useState(null); const [queue, setQueue] = useState(0);
  const [sys, setSys] = useState(''); const [who, setWho] = useState(''); const [k, setK] = useState(''); const [showUndone, setShowUndone] = useState(true);
  const [limit, setLimit] = useState(100); const [open, setOpen] = useState(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const load = async () => {
    let qy = sb.from('change_log').select('*').order('id', { ascending: false }).limit(limit);
    if (sys) qy = qy.eq('system', sys);
    const [{ data: r, error }, { data: oc }, { count }] = await Promise.all([qy, sb.from('ops_control').select('value').eq('key', 'automations_paused').maybeSingle(), sb.from('undo_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending')]);
    if (error) setMsg(error.message); setRows(r || []); setPaused(oc ? oc.value === true : null); setQueue(count || 0);
  };
  useEffect(() => { load(); }, [sys, limit]);
  const pname = (id) => (people.find(p => p.id === id) || {}).name;
  const actorName = (c) => c.actor_kind === 'person' ? (pname(c.actor) || 'Someone') : c.actor === 'service' ? 'System (admin key)' : c.actor;
  const targetName = (c) => {
    const [t, id] = [c.target.split('/')[0], c.target.slice(c.target.indexOf('/') + 1)];
    if (c.system === 'hub' && t === 'items') { const it = data.items.find(i => i.id === id); return 'Page: ' + (it ? dt(it.title) : (c.after || c.before || {}).title || id); }
    if (c.system === 'hub' && t === 'people') return 'Person: ' + (pname(id) || (c.after || c.before || {}).name || id);
    if (c.system === 'hub' && t === 'ops_control') return 'Setting: ' + id.replace(/_/g, ' ');
    return c.target;
  };
  const toggle = async () => {
    const next = !paused;
    if (!confirm(next ? 'PAUSE ALL AUTOMATIONS?\n\nEvery scheduled task will stop at its next check and do nothing until you resume. Your own chats with Claude are not affected.' : 'Resume automations?\n\nScheduled tasks run again from their next scheduled time.')) return;
    setBusy(true); const { error } = await sb.from('ops_control').update({ value: next, updated_at: new Date().toISOString() }).eq('key', 'automations_paused'); setBusy(false);
    setMsg(error ? error.message : (next ? 'All automations paused.' : 'Automations resumed.')); load();
  };
  const undo = async (c) => {
    if (!confirm(`Undo this change?\n\n${actorName(c)} · ${c.action} · ${targetName(c)}\n\n${c.system === 'hub' ? 'It is reversed right away.' : 'It goes on the undo list; the task that owns ' + (SYSTEMS[c.system] || c.system) + ' reverses it on its next run.'}`)) return;
    setBusy(true); const { data: r, error } = await sb.rpc('undo_change', { p_id: c.id }); setBusy(false);
    setMsg(error ? 'Not undone: ' + error.message : (r === 'undone' ? 'Undone.' : r === 'queued for agent' ? 'Queued: the owning task reverses it on its next run.' : r)); load();
  };
  const undoBatch = async (c) => {
    const n = (rows || []).filter(x => x.batch_id === c.batch_id && !x.undone_at && !x.undo_of).length;
    if (!confirm(`Undo the whole run (${n} change${n === 1 ? '' : 's'})? Newest first.`)) return;
    setBusy(true); const { data: r, error } = await sb.rpc('undo_batch', { p_batch: c.batch_id }); setBusy(false);
    setMsg(error ? 'Stopped: ' + error.message : `${r} change${r === 1 ? '' : 's'} undone or queued.`); load();
  };
  const kk = k.trim().toLowerCase(), ww = who.trim().toLowerCase();
  const shown = (rows || []).filter(c => (showUndone || !c.undone_at) && (!ww || actorName(c).toLowerCase().includes(ww)) && (!kk || (targetName(c) + ' ' + (c.reason || '') + ' ' + (c.source || '') + ' ' + c.action).toLowerCase().includes(kk)));
  const canUndo = (c) => c.reversible && !c.undone_at && !c.undo_of && c.action !== 'undo';
  const today = (rows || []).filter(c => new Date(c.at) > new Date(Date.now() - 864e5)).length;
  return html`<div>
    <h1 class="title">Change log</h1>
    <div class="card" style=${{ borderColor: paused ? '#B42318' : undefined, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style=${{ flex: 1, minWidth: 200 }}><div style=${{ fontWeight: 800, fontSize: 17, color: paused ? '#B42318' : '#067647' }}>${paused == null ? 'Automations: unknown' : paused ? '⏸ All automations PAUSED' : '● Automations running'}</div>
        <div class="muted" style=${{ fontSize: 13 }}>${paused ? 'Scheduled tasks stop at their next check and change nothing.' : 'Every scheduled task checks this switch before it does anything.'}</div></div>
      <button class="btn" disabled=${busy || paused == null} onClick=${toggle} style=${paused ? {} : { background: '#B42318', borderColor: '#B42318', color: '#fff' }}>${paused ? '▶ Resume automations' : '⏸ Pause all automations'}</button>
    </div>
    <div class="stats"><div class="stat"><div class="k">Last 24 h</div><div class="v">${rows ? (today >= limit ? limit + '+' : today) : '…'}</div></div><div class="stat"><div class="k">Shown</div><div class="v">${rows ? shown.length : '…'}</div></div><div class="stat"><div class="k">Undo queue</div><div class="v">${queue}</div></div></div>
    ${msg && html`<div class="card" style=${{ fontSize: 14 }}>${msg}</div>`}
    <div class="actions" style=${{ marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
      <select value=${sys} onChange=${e => setSys(e.target.value)}><option value="">All systems</option>${Object.entries(SYSTEMS).map(([v, l]) => html`<option key=${v} value=${v}>${l}</option>`)}</select>
      <input placeholder="Who" value=${who} onInput=${e => setWho(e.target.value)} style=${{ width: 120, maxWidth: '100%' }}/>
      <input placeholder="Search record, reason…" value=${k} onInput=${e => setK(e.target.value)} style=${{ flex: 1, minWidth: 0 }}/>
      <label class="row muted" style=${{ gap: 4, fontSize: 13 }}><input type="checkbox" checked=${showUndone} onChange=${e => setShowUndone(e.target.checked)}/>show undone</label>
    </div>
    ${rows == null ? html`<div class="card muted">Loading…</div>` : !shown.length ? html`<div class="card muted">No changes logged${sys || ww || kk ? ' for this filter' : ' yet'}.</div>` : html`<div class="card" style=${{ padding: 0 }}>${shown.map(c => html`<div key=${c.id} style=${{ borderBottom: '1px solid var(--line)', padding: '10px 14px', opacity: c.undone_at ? .55 : 1 }}>
      <div class="row" style=${{ gap: 8, flexWrap: 'wrap', cursor: 'pointer' }} onClick=${() => setOpen(open === c.id ? null : c.id)}>
        <span class="chip">${SYSTEMS[c.system] || c.system}</span><b style=${{ fontSize: 14 }}>${c.action}</b><span style=${{ flex: '1 1 160px', minWidth: 0, maxWidth: '100%', fontSize: 14, overflowWrap: 'anywhere' }}>${targetName(c)}</span>
        <span class="muted" style=${{ fontSize: 12 }}>${actorName(c)} · ${new Date(c.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · #${c.id}</span>
      </div>
      ${(c.reason || c.source || c.undone_at || c.undo_of || c.approved_by) && html`<div class="muted" style=${{ fontSize: 12, marginTop: 3 }}>${[c.undo_of && /^undo of #/.test(c.reason || '') ? null : c.reason, c.source && 'source: ' + c.source, c.approved_by && 'OK: ' + c.approved_by, c.undo_of && 'undo of #' + c.undo_of, c.undone_at && 'undone ' + new Date(c.undone_at).toLocaleDateString() + (c.undone_by ? ' by ' + (pname(c.undone_by) || c.undone_by) : '')].filter(Boolean).join(' · ')}</div>`}
      ${open === c.id && html`<div style=${{ marginTop: 8, fontSize: 13 }}>${diffRows(c).length ? html`<div class="scrollx"><table class="table"><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>${diffRows(c).map(([f, b, a]) => html`<tr key=${f}><td>${f}</td><td>${clip(b)}</td><td>${clip(a)}</td></tr>`)}</tbody></table></div>` : html`<div class="muted">No field changes recorded.</div>`}</div>`}
      ${(canUndo(c) || (c.batch_id && canUndo(c))) && html`<div class="actions" style=${{ marginTop: 6, gap: 6 }}>${canUndo(c) && html`<button class="btn sm ghost" disabled=${busy} onClick=${() => undo(c)}>↶ Undo</button>`}${c.batch_id && html`<button class="btn sm ghost" disabled=${busy} onClick=${() => undoBatch(c)}>↶ Undo whole run</button>`}</div>`}
    </div>`)}</div>
    ${rows.length >= limit && html`<button class="btn ghost" style=${{ width: '100%' }} onClick=${() => setLimit(limit + 100)}>Load older changes</button>`}`}
    <p class="muted" style=${{ fontSize: 13 }}>Every change to the hub is recorded here automatically, and Claude's scheduled tasks record their changes to the board, Housecall Pro and OneDrive. Tap a row to see before and after. Hub changes undo right away; changes in other systems are queued for the task that made them. Undo is refused if the record changed again later; undo the newer change first. Nobody can edit or delete this log.</p>
  </div>`;
}

// v0.18 ONE SEARCH (Calvin 2026-11-09): one box finds board cards, maintenance customers, page titles and text inside pages.
const SRC = { cards: null, cust: null, at: 0 };
async function searchSources() {
  if (SRC.cards && Date.now() - SRC.at < 120000) return SRC;
  const [{ data: cards }, { data: cust }] = await Promise.all([
    sb.from('board_docs').select('doc_id,owner_id,data').eq('collection', 'cards'),
    sb.from('board_docs').select('doc_id,data').eq('collection', 'customers').is('owner_id', null)]);
  SRC.cards = cards || []; SRC.cust = cust || []; SRC.at = Date.now(); return SRC;
}
const LANE_NAMES = { emails: 'Emails', todo: 'To Do', waiting: 'Waiting On', doing: 'Doing', done: 'Done' };
function GlobalSearch({ q, data, me, people, done }) {
  const [src, setSrc] = useState(SRC.cards ? SRC : null); const [chunks, setChunks] = useState(null);
  useEffect(() => { let on = true; searchSources().then(s => on && setSrc({ ...s })).catch(() => on && setSrc({ cards: [], cust: [] })); return () => { on = false; }; }, []);
  useEffect(() => { let on = true; setChunks(null); const t = setTimeout(async () => { const { data: r } = await sb.rpc('search_chunks', { q: q.trim(), n: 8 }); if (on) setChunks(r || []); }, 350); return () => { on = false; clearTimeout(t); }; }, [q]);
  const k = q.trim().toLowerCase(); const words = k.split(/[\s,&]+/).filter(Boolean); const digits = k.replace(/\D/g, '');
  const hit = (hay) => { hay = String(hay || '').toLowerCase(); return hay.includes(k) || (words.length > 1 && words.every(w => hay.includes(w))); };
  const pages = data.items.filter(i => i.state !== 'retired' && hit(i.title + ' ' + (i.overview || ''))).slice(0, 8);
  const pageIds = new Set(pages.map(p => p.id));
  const textHits = (chunks || []).filter(c => !pageIds.has(c.item_id)).filter((c, ix, a) => a.findIndex(x => x.item_id === c.item_id) === ix).slice(0, 6);
  const name = (id) => (people.find(p => p.id === id) || {}).name || '';
  const cards = src ? src.cards.filter(c => c.data.column !== 'archive' && hit([c.data.title, c.data.summary, c.data.detail, c.data.job, c.data.nextStep].join(' '))).sort((a, b) => (a.data.column === 'done') - (b.data.column === 'done') || String(b.data.updated || '').localeCompare(String(a.data.updated || ''))).slice(0, 10) : [];
  const cust = src ? src.cust.filter(c => !c.data.removed).filter(c => { const r = c.data; const eq = (r.equipment || []).map(e => [e.make, e.model, e.serial, e.type, e.desc, e.filter].join(' ')).join(' ');
      const jobs = [].concat(r.visits || [], r.installs || [], r.serviceCalls || []).map(v => '#' + v.job + ' ' + v.job).join(' ');
      if (hit([r.name, r.company, r.email, r.address, r.town, eq, (r.filters || []).join(' '), jobs].join(' '))) return true;
      return digits.length >= 4 && [r.phone, r.phone2].join(' ').replace(/\D/g, '').includes(digits); }).slice(0, 10) : [];
  const snip = (t) => { const s = String(t || '').replace(/[#*_>`|]+/g, ' ').replace(/\s+/g, ' '); const ix = s.toLowerCase().indexOf(words[0] || k); return (ix > 60 ? '…' + s.slice(ix - 40, ix + 120) : s.slice(0, 160)) + '…'; };
  const sec = (title, n, body) => html`<div class="card"><h3 style=${{ margin: '0 0 6px' }}>${title} <span class="muted" style=${{ fontWeight: 400 }}>· ${n}</span></h3>${body}</div>`;
  const row = (href, a, b, chip) => html`<a key=${href} class="srow" href=${href} onClick=${done}><div style=${{ minWidth: 0, flex: 1 }}><b>${a}</b><div class="muted" style=${{ fontSize: 13, overflowWrap: 'anywhere' }}>${b}</div></div>${chip ? html`<span class="badge">${chip}</span>` : ''}</a>`;
  const loading = !src || chunks === null;
  const none = !loading && !pages.length && !textHits.length && !cards.length && !cust.length;
  return html`<div>
    <h1 class="title">Search: ${q}</h1>
    ${cards.length > 0 && sec('Board cards', cards.length, cards.map(c => row('#/board?' + (c.owner_id !== me.id ? 'as=' + c.owner_id + '&' : '') + 'card=' + encodeURIComponent(c.doc_id), c.data.title || c.doc_id, [c.data.job, c.data.summary || c.data.detail].filter(Boolean).join(' · ').slice(0, 140) + (c.owner_id !== me.id ? ' · ' + name(c.owner_id) + "'s board" : ''), LANE_NAMES[c.data.column] || c.data.column)))}
    ${cust.length > 0 && sec('Customers', cust.length, cust.map(c => row('#/maint?c=' + c.doc_id, c.data.name, [c.data.town || c.data.address, (c.data.equipment || []).map(e => e.make).filter(Boolean).slice(0, 2).join(', ')].filter(Boolean).join(' · '), null)))}
    ${pages.length > 0 && sec('Pages', pages.length, pages.map(i => row('#/' + i.type + '/' + i.slug, i.title, (i.overview || '').slice(0, 140), LIBS[i.type] || i.type)))}
    ${textHits.length > 0 && sec('Inside pages', textHits.length, textHits.map(c => row('#/' + c.type + '/' + c.slug, c.title, (c.heading && c.heading !== '(whole page)' ? c.heading + ': ' : '') + snip(c.content), LIBS[c.type] || c.type)))}
    ${loading && html`<div class="muted" style=${{ padding: 8 }}>Searching cards, customers and pages…</div>`}
    ${none && html`<div class="card muted">Nothing found for "${q}".</div>`}
    <div class="card row" style=${{ justifyContent: 'space-between' }}><span class="muted">Want an answer instead of a list?</span><a class="btn sm orange" href=${'#/ask?' + encodeURIComponent(q)} onClick=${done}>Ask Homestar</a></div>
  </div>`;
}
function SearchPage({ q, setQ, data, me, people }) {
  return html`<div><input autoFocus placeholder="Search cards, customers, pages…" value=${q} onInput=${e => setQ(e.target.value)} style=${{ width: '100%', marginBottom: 12, fontSize: 16 }}/>${q.trim() ? html`<${GlobalSearch} q=${q} data=${data} me=${me} people=${people} done=${() => {}}/>` : html`<div class="muted">Type a customer, phone number, job #, serial, filter size, card or page.</div>`}</div>`;
}

// v0.19 (Calvin 2026-11-10): Maintenance lives in the Hub now (maint.js, shadow root, same look as the board's tab); reads/writes the same board_docs rows
// v0.20: KPIs too (kpi.js, generated by build_kpi.py from the board's KPIs tab)
// v0.22: personal theme + accent (saved per person in board/view by the board's Customize panel; cached for a fast first paint)
const applyLook = (v) => { const r = document.documentElement; v = v || {}; if (v.theme === 'light' || v.theme === 'dark') r.dataset.theme = v.theme; else delete r.dataset.theme; if (v.accent && v.accent !== 'blue') r.dataset.accent = v.accent; else delete r.dataset.accent; try { localStorage.setItem('hb-look', JSON.stringify({ theme: v.theme || 'auto', accent: v.accent || 'blue' })); } catch (e) {} };
try { applyLook(JSON.parse(localStorage.getItem('hb-look') || 'null')); } catch (e) {}
const MODS = { maint: ['./maint.js?v=1', 'mountMaint', 'Maintenance'], kpi: ['./kpi.js?v=1', 'mountKpi', 'KPIs'], board: ['./board.js?v=3', 'mountBoard', 'the Board'] };   // v0.21: Board too (board.js, build_boardmod.py)
function ModPage({ me, mod, owner, extra }) {
  const ref = useRef(null);
  useEffect(() => { const [src, fn, label] = MODS[mod]; let off = null, dead = false; import(src).then(m => { if (!dead && ref.current) off = m[fn](ref.current, boardDb(sb, owner || me.id), extra); }).catch(e => { if (ref.current) ref.current.textContent = "Couldn't load " + label + ' (' + e.message + '). Reload the page.'; }); return () => { dead = true; if (off) off(); }; }, []);
  return html`<div id=${mod + 'Host'} class="boardvars" ref=${ref}></div>`;
}

function App() {
  const hadSession = useRef(null); const toBoard = useRef(!isDeepLink(START_HASH) && !START_HASH.startsWith('#/board'));
  const route = useHash(); const [session, setSession] = useState(undefined); const [pwFlow, setPwFlow] = useState(LINK.type); const [gate, setGate] = useState(GATE); const [me, setMe] = useState(null); const [data, setData] = useState(null); const [people, setPeople] = useState([]); const [q, setQ] = useState(() => { const m = location.hash.match(/^#\/search\?q=([^&]*)/); return m ? decodeURIComponent(m[1]) : ''; }); const [searchOpen, setSearchOpen] = useState(false); const [boardN, setBoardN] = useState(0);
  useEffect(() => { sb.auth.getSession().then(({ data }) => setSession(data.session)); const { data: sub } = sb.auth.onAuthStateChange((ev, s) => { if (ev === 'PASSWORD_RECOVERY') setPwFlow('recovery'); if (ev === 'INITIAL_SESSION') hadSession.current = !!s; else if (ev === 'SIGNED_IN') { if (hadSession.current === false) toBoard.current = true; hadSession.current = true; } else if (ev === 'SIGNED_OUT') hadSession.current = false; setSession(s); }); return () => sub.subscription.unsubscribe(); }, []);
  // a real sign-in (was signed out) always lands on the board; token refreshes and tab re-focus never move you
  useEffect(() => { if (data && me && toBoard.current) { toBoard.current = false; if (!location.hash.startsWith('#/board')) location.replace('#/board'); } }, [data, me]);
  const reload = async () => { const { data: p } = await sb.from('people').select('*').order('name'); setPeople(p || []); setMe((p || []).find(x => x.id === session.user.id) || { id: session.user.id, name: session.user.email, role: 'member' }); setData(await loadAll()); };
  useEffect(() => { if (session) reload(); }, [session]);
  useEffect(() => { if (!session) return; boardDb(sb, session.user.id).doc('board/view').get().then(s => { if (s.exists) applyLook(s.data()); }).catch(() => {}); }, [session]);
  useEffect(() => { if (!route.startsWith('/search')) setQ(''); setSearchOpen(false); window.scrollTo(0, 0); }, [route]);
  if (gate) return html`<${LinkGate} gate=${gate} done=${(ty) => { setGate(null); if (ty === 'recovery') setPwFlow('recovery'); }}/>`;
  if (session === undefined) return html`<div class="boot">Loading…</div>`;
  if (!session) return route.startsWith('/code') ? html`<${CodeEntry}/>` : html`<${Login} notice=${LINK.err}/>`;
  if (!data || !me) return html`<div class="boot">Loading your hub…</div>`;
  // invited but no password yet: nothing else until they create one (the invite link signs them in, so this also catches a closed tab)
  if (me.invited_at && !me.registered_at) return html`<${SetPassword} kind="invite" user=${session.user} done=${() => { setPwFlow(null); go('/'); reload(); }}/>`;
  if (pwFlow === 'recovery') return html`<${SetPassword} kind="recovery" user=${session.user} done=${() => { setPwFlow(null); go('/'); }}/>`;
  if (me.active === false) return html`<div class="login"><img src="logo.png" alt=""/><h2 style=${{ textAlign: 'center' }}>Almost there</h2><p class="muted">Your account (${me.email}) is created but not activated yet. Calvin activates new accounts and sets your department. Check back shortly.</p><button class="btn ghost" style=${{ width: '100%' }} onClick=${() => sb.auth.signOut({ scope: 'local' })}>Sign out</button></div>`;
  if (route === '/' || route === '') { location.replace('#/board'); return html`<div class="boot">Opening your board…</div>`; }
  const parts = route.split('?')[0].split('/').filter(Boolean); const lib = ['system', 'policy', 'training'].includes(parts[0]) ? parts[0] : null; const browsing = lib && parts[1] === 'b'; const slug = lib && !browsing ? parts[1] : null; const bpath = browsing ? parts.slice(2).map(decodeURIComponent) : [];
  const results = q.trim() ? (() => { const k = q.trim().toLowerCase(); const r = data.items.filter(i => i.state !== 'retired' && (i.title + ' ' + (i.overview || '')).toLowerCase().includes(k)); return r.sort((a, b) => (b.title.toLowerCase().startsWith(k) - a.title.toLowerCase().startsWith(k)) || a.title.localeCompare(b.title)); })() : null;
  const on = (p) => (!q.trim() && (route === p || (p !== '/' && route.startsWith(p)))) ? 'on' : '';
  const navA = (p, label) => html`<a href=${'#' + p} class=${on(p)}>${label}</a>`;
  const isPhone = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
  // v0.16 one app: the same five places everywhere (Board, KPIs, Maintenance live on board.html; Systems + Ask here); Me under the round button
  const dnameMe = (data.departments.find(d => d.id === me.department_id) || {}).name;
  const kpiOK = !!me.sees_all_boards || deptsOf(me).some(id => (data.departments.find(d => d.id === id) || {}).name === 'Office & Admin');   // same rule as db/016 + db/019
  const sysOn = !q.trim() && (route.startsWith('/home') || !!lib || ['run', 'fix'].includes(parts[0]));
  const meOn = ['me', 'people', 'dashboard', 'changes'].includes(parts[0]);
  const PLACES = [['#/board', '▦', 'Board', !q.trim() && parts[0] === 'board', boardN ? html`Board<span class="n">${boardN}</span>` : 'Board'], ...(kpiOK ? [['#/kpi', '◔', 'KPIs', !q.trim() && parts[0] === 'kpi']] : []), ['#/maint', '🔧', 'Maint.', !q.trim() && parts[0] === 'maint', 'Maintenance'], ['#/home', '▤', 'Systems', sysOn], ['#/ask', '💬', 'Ask', !q.trim() && parts[0] === 'ask']];
  const initials = (me.name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const tabs = html`<nav class="tabs">${PLACES.map(([h, ic, l, o]) => html`<a key=${l} href=${h} onClick=${() => { setQ(''); setSearchOpen(false); }} class=${o ? 'on' : ''}><span class="i">${ic}</span>${l}</a>`)}</nav>`;
  const header = html`<header class="top"><a class="hb-brand" href="#/board" title="Board"><img class="word" src="wordmark.png" alt="Homestar"/><img class="word-dark" src="wordmark-dark.png" alt="Homestar"/></a>
      <nav class="hb-views">${PLACES.map(([h, ic, l, o, full]) => html`<a key=${l} href=${h} class=${o ? 'on' : ''}>${full || l}</a>`)}</nav>
      <span class="grow"></span><input class=${searchOpen ? 'open' : ''} placeholder="Search cards, customers, pages…" value=${q} onInput=${e => setQ(e.target.value)} onBlur=${() => { if (!q) setSearchOpen(false); }} onKeyDown=${e => { if (e.key === 'Enter' && results && results[0]) { go('/' + results[0].type + '/' + results[0].slug); } if (e.key === 'Escape') { setQ(''); setSearchOpen(false); } }}/>
      <button class="btn ghost sm search-btn" onClick=${() => go('/search')}>🔍</button>
      <a class=${'hb-me' + (meOn ? ' on' : '')} href="#/me" title="My record, people and settings"><span class="i">👤</span>${(me.name || 'Me').split(/\s+/)[0]}</a><div class="hb-stripe"></div></header>`;
  const sub = sysOn ? html`<nav class="hb-sub">${[['/home', 'Overview'], ['/system', 'Systems'], ['/policy', 'Policies'], ['/training', 'Training']].map(([p, l]) => html`<a key=${p} href=${'#' + p} class=${(p === '/home' ? route.startsWith('/home') : route.startsWith(p)) ? 'on' : ''}>${l}</a>`)}</nav>` : null;
  if (parts[0] === 'board') {
    const qp = new URLSearchParams(route.split('?')[1] || ''); const as = me.sees_all_boards && /^[0-9a-f-]{36}$/.test(qp.get('as') || '') ? qp.get('as') : me.id;
    const team = me.sees_all_boards ? people.filter(p => p.id !== me.id && p.active !== false && !(p.invited_at && !p.registered_at)) : [];
    const giveTo = me.sees_all_boards && as === me.id && team[0] ? team[0] : null;   // Office & Admin (Jacob) - first active teammate, same rule as the old board
    return html`<div>${header}<div class="maint-page"><${ModPage} key=${route} me=${me} mod="board" owner=${as} extra=${{ sb, me, owner: as, team, giveTo, focus: qp.get('card') || '', onCount: setBoardN, onTheme: applyLook }}/></div>${tabs}</div>`;
  }
  if (parts[0] === 'maint') return html`<div>${header}<div class="maint-page"><${ModPage} key=${route} me=${me} mod="maint"/></div>${tabs}</div>`;
  if (parts[0] === 'kpi') return html`<div>${header}<div class="maint-page">${kpiOK ? html`<${ModPage} key=${route} me=${me} mod="kpi"/>` : html`<div class="card"><h3>KPIs</h3><p class="muted">KPIs are open to the owner and Office &amp; Admin.</p></div>`}</div>${tabs}</div>`;
  if (parts[0] === 'run') return html`<div>${header}<${Runner} key=${parts[1] + '/' + parts[2]} trackId=${parts[1]} n=${parts[2]} data=${data} me=${me} people=${people} reload=${reload}/>${tabs}</div>`;
  const libHome = lib && !slug;
  return html`<div>
    ${header}
    <div class="layout">
      <aside class="side">${lib ? html`<${Tree} lib=${lib} data=${data} current=${slug} onPick=${i => go(`/${i.type}/${i.slug}`)}/>` : html`<div class="muted" style=${{ fontSize: 13 }}>Pick Systems, Policies or Training to browse the tree.</div>`}</aside>
      <main class="main">${sub}
        ${results && parts[0] !== 'search' ? html`<${GlobalSearch} q=${q} data=${data} me=${me} people=${people} done=${() => { setQ(''); setSearchOpen(false); }}/>`
        : slug ? html`<${ItemView} key=${slug} slug=${slug} data=${data} me=${me} people=${people} reload=${reload}/>`
        : libHome && isPhone ? html`<div><${Browse} key=${lib} lib=${lib} data=${data} bpath=${bpath}/></div>`
        : libHome ? html`<${ItemTable} rows=${data.items.filter(i => i.type === lib)} data=${data} title=${LIBS[lib]} sortable=${true}/>`
        : parts[0] === 'search' ? html`<${SearchPage} q=${q} setQ=${setQ} data=${data} me=${me} people=${people}/>`
        : parts[0] === 'ask' ? html`<${Ask} key=${parts[1] || 'ask'} data=${data} me=${me} people=${people} itemSlug=${parts[1] || null} reload=${reload}/>`
        : parts[0] === 'fix' ? html`<${DraftFix} key=${parts[1]} data=${data} me=${me} people=${people} slug=${parts[1]} reload=${reload}/>`
        : parts[0] === 'changes' ? html`<${ChangeLog} data=${data} people=${people} me=${me}/>`
        : parts[0] === 'people' ? html`<${People} data=${data} people=${people} me=${me} reload=${reload}/>`
        : parts[0] === 'me' ? html`<${MyRecord} data=${data} me=${me} people=${people}/>`
        : parts[0] === 'dashboard' ? html`<${Dashboard} data=${data} me=${me} people=${people}/>`
        : html`<${Home} data=${data} me=${me} people=${people}/>`}
      </main>
      <aside class="rail"><h4>Access</h4><div>${me.name}</div><div class="muted" style=${{ fontSize: 13 }}>${me.email || session.user.email}</div>
        <h4>States</h4>${Object.keys(STATES).map(s => html`<div key=${s} class="row" style=${{ fontSize: 13, padding: '2px 0' }}><span class=${'dot ' + s}></span>${STATES[s]}</div>`)}
        <h4>Counts</h4><div class="muted" style=${{ fontSize: 13 }}>${data.items.filter(i => i.type === 'system').length} systems · ${data.items.filter(i => i.type === 'policy').length} policies · ${data.items.filter(i => i.type === 'training').length} trainings</div></aside>
    </div>${tabs}</div>`;
}
createRoot(document.getElementById('root')).render(html`<${App}/>`);
