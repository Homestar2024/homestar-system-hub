// Homestar HQ - timesheet Excel builder (browser + node). Port of Tools/ts_xlsx.py without LibreOffice:
// fills the company template (J25 start + rows D..I, unhides rows), writes every formula's cached value from our own
// maths (C dates, J regular, K overtime, N row total, K19/L19 period, C90:F90 dept totals, C94 over 80, C96 total)
// and the linked text boxes, and sets fullCalcOnLoad so Excel recalculates on open. Returns a Uint8Array.
// rows = [{date:'YYYY-MM-DD', job, dept:'I - Install', start:'HH:MM', end:'HH:MM'}] (max 4 per day)
// v3 2026-11-24 (Calvin): a row with sick:true is a paid sick day - Job 'Sick', no dept or clock times, its hours go in the
// Sick column (L) and the row total (N), NOT the Regular/Overtime totals (C96 = worked hours). Any row's note goes in Notes (O).
// Returns total (worked, = C96) and sick. rows may carry {sick, hours, note}.
// employee (2026-11-21): the person's full name, written into the unlinked EMPLOYEE text box (the template says Calvin Windsor).
export async function buildTimesheetXlsx(JSZip, templateBytes, rows, startIso, endIso, employee) {
  const z = await JSZip.loadAsync(templateBytes);
  let x = await z.file('xl/worksheets/sheet1.xml').async('string');
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const day0 = Date.UTC(1899, 11, 30), D = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  const serial = Math.round((D(startIso) - day0) / 864e5), endSerial = Math.round((D(endIso) - day0) / 864e5);
  const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const r1 = (n) => Math.round(n * 10 + 1e-9) / 10;
  // place rows
  const byDay = {};
  rows.slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).forEach(r => {
    const n = Math.round((D(r.date) - D(startIso)) / 864e5); if (n < 0 || n > 13) throw new Error('row outside the pay period: ' + r.date);
    (byDay[n] = byDay[n] || []).push(r);
  });
  const placed = [];
  for (const [n, rs] of Object.entries(byDay)) { if (rs.length > 4) throw new Error('more than 4 rows on ' + rs[0].date + ' - send it to Claude to file'); rs.forEach((r, i) => placed.push({ ...r, row: 30 + 4 * n + i })); }
  const cellRe = (ref) => new RegExp('<c r="' + ref + '"([^>]*?)(/>|>([\\s\\S]*?)</c>)');
  const setc = (ref, val) => {
    const m = x.match(cellRe(ref)); if (!m) throw new Error('template cell missing ' + ref);
    if (m[3] && m[3].includes('<f')) throw new Error('formula cell ' + ref);
    const attrs = m[1].replace(/\s*t="[^"]*"/, '').replace(/\/$/, '');
    const nw = typeof val === 'number' ? `<c r="${ref}"${attrs}><v>${val}</v></c>` : `<c r="${ref}"${attrs} t="inlineStr"><is><t>${esc(val)}</t></is></c>`;
    x = x.replace(m[0], nw);
  };
  const t12 = (hm) => { const [h, mi] = hm.split(':').map(Number); return [(((h % 12) || 12) * 60 + mi) / 1440, h < 12 ? 'AM' : 'PM']; };
  setc('J25', serial);
  const val = {}; // cached formula values
  for (let R = 30; R <= 85; R++) { val['C' + R] = serial + Math.floor((R - 30) / 4); val['J' + R] = 0; val['K' + R] = 0; val['N' + R] = 0; }
  const dept = { 'S - Service': 0, 'M - Maintenance': 0, 'I - Install': 0, 'O - Office': 0 }; let tot = 0, sick = 0;
  for (const r of placed) {
    const R = r.row;
    x = x.replace(new RegExp('(<row r="' + R + '"[^>]*?) hidden="1"'), '$1');
    if (r.note) setc('O' + R, String(r.note).slice(0, 250));
    if (r.sick) {   // paid sick day: hours in the Sick column only
      const sh = r1(Number(r.hours) || (((mins(r.end) - mins(r.start)) % 1440) + 1440) % 1440 / 60);
      setc('D' + R, String(r.job || 'Sick')); setc('L' + R, sh); val['N' + R] = sh; sick = r1(sick + sh); continue;
    }
    setc('D' + R, /^\d+$/.test(String(r.job)) ? Number(r.job) : String(r.job)); setc('E' + R, r.dept);
    const [f, g] = t12(r.start), [h, i] = t12(r.end);
    setc('F' + R, f); setc('G' + R, g); setc('H' + R, h); setc('I' + R, i);
    const hrs = (((mins(r.end) - mins(r.start)) % 1440) + 1440) % 1440 / 60;
    const reg = r1(Math.min(hrs, 8)), ot = r1(Math.max(hrs - 8, 0));
    val['J' + R] = reg; val['K' + R] = ot; val['N' + R] = r1(reg + ot);
    if (r.dept in dept) dept[r.dept] = r1(dept[r.dept] + reg + ot); tot = r1(tot + reg + ot);
  }
  Object.assign(val, { K19: serial, L19: endSerial, C90: dept['S - Service'], D90: dept['M - Maintenance'], E90: dept['I - Install'], F90: dept['O - Office'], C96: tot, C94: r1(Math.max(tot - 80, 0)) });
  // write caches into formula cells (never self-closing <c/>)
  x = x.replace(/<c r="([A-Z]+\d+)"([^>]*?)(?<!\/)>([\s\S]*?)<\/c>/g, (all, ref, attrs, inner) => {
    if (!inner.includes('<f') || !(ref in val)) return all;
    attrs = attrs.replace(/\s*t="[^"]*"/, ''); inner = inner.replace(/<v>[\s\S]*?<\/v>|<v\/>/g, '');
    return `<c r="${ref}"${attrs}>${inner}<v>${val[ref]}</v></c>`;
  });
  if (employee) setc('C15', employee);   // hidden leftover name cell under the EMPLOYEE box
  z.file('xl/worksheets/sheet1.xml', x);
  let wb = await z.file('xl/workbook.xml').async('string');
  if (!wb.includes('fullCalcOnLoad')) wb = wb.replace(/<calcPr([^>]*?)\/>/, '<calcPr$1 fullCalcOnLoad="1"/>');
  z.file('xl/workbook.xml', wb);
  // linked text boxes
  const s = new Date(D(startIso)), e = new Date(D(endIso));
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ML = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const boxes = { '$J$25': `${DOW[s.getUTCDay()]}, ${String(s.getUTCDate()).padStart(2, '0')}-${MS[s.getUTCMonth()]}-${String(s.getUTCFullYear()).slice(2)}`, '$L$19': `${ML[e.getUTCMonth()]} ${e.getUTCDate()}, ${e.getUTCFullYear()}` };
  for (const c of ['C90', 'D90', 'E90', 'F90', 'C94', 'C96']) boxes['$' + c[0] + '$' + c.slice(1)] = val[c].toFixed(1);
  let d = await z.file('xl/drawings/drawing1.xml').async('string');
  for (const [ref, txt] of Object.entries(boxes)) {
    const k = d.indexOf(`textlink="${ref}"`); if (k < 0) throw new Error('text box missing ' + ref);
    const endK = d.indexOf('</xdr:sp>', k); const seg = d.slice(k, endK).replace(/<a:t>[^<]*<\/a:t>/, `<a:t>${esc(txt)}</a:t>`);
    d = d.slice(0, k) + seg + d.slice(endK);
  }
  if (employee) {   // EMPLOYEE box: keep the 'EMPLOYEE' label run, put the name in the next run, blank any others
    const k = d.indexOf('>EMPLOYEE</a:t>'); if (k < 0) throw new Error('EMPLOYEE text box missing');
    const s0 = d.lastIndexOf('<xdr:sp', k), e0 = d.indexOf('</xdr:sp>', k); let n = 0;
    const seg = d.slice(s0, e0).replace(/<a:t>([^<]*)<\/a:t>/g, (m, v) => { n++; return n === 1 ? m : n === 2 ? `<a:t>${esc(employee)}</a:t>` : '<a:t></a:t>'; });
    if (n < 2) throw new Error('EMPLOYEE text box has no name line');
    d = d.slice(0, s0) + seg + d.slice(e0);
  }
  z.file('xl/drawings/drawing1.xml', d);
  return { bytes: await z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }), total: tot, sick, dept };
}
