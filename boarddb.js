// Homestar System Hub - board_docs adapter (v0.19, 2026-11-10). Same interface the board page used (window.claude db), on the Hub's own Supabase client.
// Company collections (customers, kpi, meta) have owner_id null; everything else belongs to the signed-in person (or ?as= for the owner later).
const COMPANY = new Set(['kpi', 'customers', 'meta']);
let cached = null;
export function boardDb(sb, ownerId) {
  if (cached && cached.ownerId === ownerId) return cached.db;
  const own = (c) => (COMPANY.has(c) ? null : ownerId);
  const scope = (q, c) => { const o = own(c); return o ? q.eq('owner_id', o) : q.is('owner_id', null); };
  const split = (p) => { const i = p.lastIndexOf('/'); return [p.slice(0, i), p.slice(i + 1)]; };
  const snapDoc = (id, row) => ({ id, exists: !!row, data: () => (row ? JSON.parse(JSON.stringify(row.data)) : undefined) });
  const listeners = new Map();
  sb.channel('hub_board_docs').on('postgres_changes', { event: '*', schema: 'public', table: 'board_docs' }, (p) => {
    const row = p.new && p.new.collection ? p.new : p.old; if (!row || !row.collection) return;
    const o = own(row.collection); if ((row.owner_id || null) !== (o || null) && p.eventType !== 'DELETE') return;
    (listeners.get(row.collection) || new Set()).forEach((fn) => fn(p.eventType === 'DELETE' ? null : p.new, row, p.eventType));
  }).subscribe();
  const listen = (c, fn) => { if (!listeners.has(c)) listeners.set(c, new Set()); listeners.get(c).add(fn); return () => listeners.get(c).delete(fn); };
  async function fetchDoc(c, id) { const { data, error } = await scope(sb.from('board_docs').select('doc_id,data,version').eq('collection', c).eq('doc_id', id), c).maybeSingle(); if (error) throw error; return data; }
  async function fetchAll(c) { const out = []; for (let from = 0; ; from += 1000) { const { data, error } = await scope(sb.from('board_docs').select('doc_id,data,version').eq('collection', c), c).order('id').range(from, from + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out; } }
  const db = {
    doc(path) {
      const [c, id] = split(path);
      return {
        id,
        async get() { return snapDoc(id, await fetchDoc(c, id)); },
        set(obj) { return (async () => { const ex = await fetchDoc(c, id); const q = ex ? scope(sb.from('board_docs').update({ data: obj }).eq('collection', c).eq('doc_id', id), c) : sb.from('board_docs').insert({ owner_id: own(c), collection: c, doc_id: id, data: obj }); const { error } = await q; if (error) throw error; })(); },
        update(patch) { return sb.rpc('board_merge', { p_owner: own(c), p_collection: c, p_doc: id, p_patch: patch }).then(({ error }) => { if (error) throw error; }); },
        onSnapshot(cb, err) {
          let alive = true; fetchDoc(c, id).then((r) => alive && cb(snapDoc(id, r))).catch((e) => err && err(e));
          const off = listen(c, (row, key) => { if (key.doc_id === id && alive) cb(snapDoc(id, row)); });
          return () => { alive = false; off(); };
        },
      };
    },
    collection(c) {
      return {
        add(obj) { const id = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); return sb.from('board_docs').insert({ owner_id: own(c), collection: c, doc_id: id, data: obj }).then(({ error }) => { if (error) throw error; return { id }; }); },
        onSnapshot(cb, err) {
          const m = new Map(); let alive = true;
          const emit = () => alive && cb({ size: m.size, empty: !m.size, docs: [...m.entries()].map(([id, r]) => snapDoc(id, r)) });
          fetchAll(c).then((rows) => { rows.forEach((r) => m.set(r.doc_id, r)); emit(); }).catch((e) => err && err(e));
          const off = listen(c, (row, key) => { if (row) m.set(key.doc_id, row); else m.delete(key.doc_id); emit(); });
          return () => { alive = false; off(); };
        },
      };
    },
  };
  cached = { ownerId, db };
  return db;
}
