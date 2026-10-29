// Import and export in one place.
// Import: Excel (.xlsx/.xls/.ods), CSV/TSV, or a Tally backup (.json). Every sheet is checked and
// recognised by its columns: workouts (Strong, Hevy, FitNotes, or any sheet with Date + Exercise +
// Weight/Reps), weigh-ins and body measurements (Date + Weight / Waist / Body fat…), and food logs
// (Date + Calories, e.g. MyFitnessPal or Cronometer). Nothing is replaced and duplicates are skipped.
// Export: an Excel workbook with everything, a full Tally backup, or a workouts CSV for other gym apps.

import { html, useState } from '../vendor/preact-htm.js';
import * as store from './store.js';
import * as A from './analytics.js';
import { openSheet, closeSheet, SheetHead, toast, Seg, confirmSheet, Icon } from './ui.js';
import { fromUnit, toUnit, round, todayKey, dayKey, download, bwUnit, KM_PER_MI } from './util.js';
import { parseCSV, buildImport, detectApp, exportCSV } from './importer.js';
import { MEASURES } from '../screens/body.js';

// ---------- reading files ----------
let xlsxLoad = null;
function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (!xlsxLoad) xlsxLoad = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL('../vendor/xlsx.full.min.js', import.meta.url).href;
    s.onload = () => resolve(window.XLSX);
    s.onerror = () => { xlsxLoad = null; reject(new Error('xlsx')); };
    document.head.appendChild(s);
  });
  return xlsxLoad;
}
const pad = n => String(n).padStart(2, '0');
const stamp = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

// -> { kind: 'json', data } | { kind: 'table', sheets: [{ name, rows }] }
export async function readFile(file) {
  const name = file.name.toLowerCase();
  if (/\.json$/.test(name)) return { kind: 'json', data: JSON.parse(await file.text()) };
  if (/\.(xlsx|xlsm|xls|ods|numbers)$/.test(name)) {
    const X = await loadXLSX();
    const wb = X.read(await file.arrayBuffer(), { cellDates: true });
    const sheets = wb.SheetNames.map(n => {
      const raw = X.utils.sheet_to_json(wb.Sheets[n], { defval: '', raw: true });
      const rows = raw.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [String(k).trim(), v instanceof Date ? stamp(v) : String(v).trim()])));
      return { name: n, rows };
    }).filter(s => s.rows.length);
    return { kind: 'table', sheets };
  }
  // CSV, TSV or plain text
  return { kind: 'table', sheets: [{ name: file.name, rows: parseCSV(await file.text()) }] };
}

// ---------- recognising columns ----------
const key = h => String(h).toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9%#]+/g, ' ').trim();
const unitIn = h => { const m = String(h).toLowerCase(); return /\b(lbs?|pounds?)\b/.test(m) ? 'lb' : /\b(kgs?|kilo)/.test(m) ? 'kg' : /\b(cm)\b/.test(m) ? 'cm' : /\b(in|inch|inches)\b/.test(m) ? 'in' : /\bmi(les?)?\b/.test(m) ? 'mi' : /\bkm\b/.test(m) ? 'km' : null; };
const SYN = {
  date: ['date', 'day', 'workout date', 'start time', 'start', 'datetime', 'date time', 'timestamp', 'logged at', 'time stamp'],
  exercise: ['exercise', 'exercise name', 'exercise title', 'movement', 'lift'],
  workout: ['workout', 'workout name', 'session', 'routine', 'title', 'program day'],
  weight: ['weight', 'load', 'kg', 'kgs', 'lb', 'lbs', 'weight lifted', 'weight used'],
  reps: ['reps', 'rep', 'repetitions', 'reps done'],
  sets: ['sets', 'set count', 'number of sets', '# sets', 'no of sets'],
  unit: ['unit', 'units', 'weight unit'],
  notes: ['notes', 'note', 'comment', 'comments'],
  distance: ['distance', 'km', 'miles', 'mi'],
  time: ['time', 'duration', 'seconds', 'secs', 'duration seconds'],
  rpe: ['rpe'], rir: ['rir', 'reps in reserve'],
  setType: ['set type', 'type'],
  body: ['weight', 'body weight', 'bodyweight', 'scale weight', 'mass', 'weight kg', 'weight lbs'],
  bodyfat: ['body fat', 'bodyfat', 'body fat %', 'fat %', 'bf', 'bf %', 'body fat percentage', 'fat percentage'],
  kcal: ['calories', 'energy', 'kcal', 'cals', 'calorie'],
  p: ['protein'], c: ['carbs', 'carbohydrates', 'carbohydrate', 'carb', 'total carbs'], f: ['fat', 'total fat', 'fats'],
  fiber: ['fiber', 'fibre', 'dietary fiber', 'dietary fibre'], sugar: ['sugar', 'sugars', 'total sugars'], sodium: ['sodium', 'salt mg'],
  meal: ['meal', 'group', 'meal name', 'meal type'], food: ['food', 'food name', 'name', 'item', 'description', 'food item'],
  amount: ['amount', 'quantity', 'serving', 'servings', 'serving size'],
};
const MEAS_SYN = { waist: ['waist'], chest: ['chest'], hips: ['hips', 'hip'], arms: ['arms', 'arm', 'biceps', 'bicep'], thighs: ['thighs', 'thigh'], calves: ['calves', 'calf'], shoulders: ['shoulders', 'shoulder'], neck: ['neck'] };

function columns(rows) {
  const heads = Object.keys(rows[0] || {});
  const find = names => heads.find(h => names.includes(key(h)));
  const col = {};
  for (const [k, names] of Object.entries(SYN)) col[k] = find(names) || null;
  col.meas = Object.fromEntries(Object.entries(MEAS_SYN).map(([k, n]) => [k, find(n)]).filter(([, h]) => h));
  return { heads, col };
}

// What a sheet holds: 'app' (Strong/Hevy/FitNotes), 'workouts', 'food', 'body' or null.
export function detectSheet(rows) {
  if (!rows.length) return { type: null };
  const app = detectApp(rows);
  if (app) return { type: 'app', app };
  const { heads, col } = columns(rows);
  if (!col.date) return { type: null, heads, why: 'no Date column' };
  if (col.exercise && (col.reps || col.weight || col.distance || col.time)) return { type: 'workouts', col, heads };
  if (col.kcal) return { type: 'food', col, heads };
  if (col.body || col.bodyfat || Object.keys(col.meas).length) return { type: 'body', col, heads };
  return { type: null, heads, why: 'no workout, weight or calorie columns' };
}

const num = v => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(/[^0-9.,-]/g, '').replace(',', '.')); return isNaN(n) ? null : n; };
const dayOf = s => { const m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`; const t = parseLoose(s); return t ? dayKey(new Date(t)) : null; };
function parseLoose(s) {
  if (!s) return null;
  let m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0)).getTime();
  m = String(s).match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return new Date(y, m[1] - 1, +m[2], 12).getTime(); }
  const t = Date.parse(s); return isNaN(t) ? null : t;
}

// Generic workout sheet -> rows in Strong's shape, so the same importer handles them.
function genericToStrong(rows, col, fileUnit) {
  const out = [];
  let lastKey = '', n = 0;
  for (const r of rows) {
    const t = parseLoose(r[col.date]);
    if (!t || !r[col.exercise]) continue;
    const u = col.unit && /lb/i.test(r[col.unit]) ? 'lb' : col.unit && /kg/i.test(r[col.unit]) ? 'kg' : unitIn(col.weight || '') || fileUnit;
    const w = num(r[col.weight]);
    const reps = num(r[col.reps]);
    const sets = Math.max(1, Math.min(20, num(r[col.sets]) || 1));
    const typ = (r[col.setType] || '').toLowerCase();
    const k = t + '|' + r[col.exercise];
    if (k !== lastKey) { n = 0; lastKey = k; }
    const dU = unitIn(col.distance || '') === 'mi' ? 'mi' : 'km';
    for (let i = 0; i < sets; i++) out.push({
      Date: stamp(new Date(t)), 'Workout Name': (col.workout && r[col.workout]) || 'Workout', 'Exercise Name': r[col.exercise],
      'Set Order': /warm/.test(typ) ? 'W' : /drop/.test(typ) ? 'D' : /fail/.test(typ) ? 'F' : String(++n),
      Weight: w == null ? '' : String(round(toUnit(fromUnit(w, u), fileUnit), 3)), Reps: reps == null ? '' : String(reps),
      Distance: col.distance ? String(dU === 'mi' ? num(r[col.distance]) * KM_PER_MI || '' : num(r[col.distance]) || '') : '', 'Distance Unit': 'km',
      Seconds: col.time ? String(num(r[col.time]) || '') : '', Notes: col.notes ? r[col.notes] : '', RPE: col.rpe ? r[col.rpe] : col.rir && num(r[col.rir]) != null ? String(10 - num(r[col.rir])) : '',
    });
  }
  return out;
}

function planBody(st, rows, col, bwU, lenU) {
  const have = new Set(st.bodyweight.map(b => b.date));
  const haveM = new Set(st.measurements.map(m => m.key + '|' + m.date));
  const weigh = new Map(), meas = [];
  const wu = unitIn(col.body || '') || bwU;
  for (const r of rows) {
    const d = dayOf(r[col.date]); if (!d) continue;
    const w = col.body ? num(r[col.body]) : null;
    if (w && !have.has(d)) weigh.set(d, round(fromUnit(w, wu), 3));
    if (col.bodyfat) { const v = num(r[col.bodyfat]); if (v && !haveM.has('bodyfat|' + d)) meas.push({ date: d, key: 'bodyfat', value: v }); }
    for (const [k, h] of Object.entries(col.meas)) {
      const v = num(r[h]); if (!v || haveM.has(k + '|' + d)) continue;
      const u = unitIn(h) || lenU;
      meas.push({ date: d, key: k, value: round(u === 'in' ? v * 2.54 : v, 2) });
    }
  }
  return { weighIns: [...weigh.entries()].map(([date, kg]) => ({ date, kg })), meas };
}

function planFood(st, rows, col) {
  const meals = st.food.mealNames;
  const mealOf = m => meals.find(x => x.toLowerCase() === String(m || '').toLowerCase()) || meals.find(x => String(m || '').toLowerCase().startsWith(x.toLowerCase().slice(0, 4))) || meals[meals.length - 1];
  const have = new Set(st.foodLog.map(e => `${e.date}|${e.name}|${Math.round(e.kcal)}`));
  const out = [];
  for (const r of rows) {
    const d = dayOf(r[col.date]); const kcal = num(r[col.kcal]);
    if (!d || kcal == null) continue;
    const meal = mealOf(col.meal && r[col.meal]);
    const name = (col.food && r[col.food]) || (col.meal && r[col.meal] ? `${r[col.meal]} (imported)` : 'Imported');
    const e = { id: store.uid(), date: d, meal, foodId: null, name: String(name).slice(0, 80), brand: '', qty: 1, unit: 'serving', kcal, p: num(r[col.p]) || 0, c: num(r[col.c]) || 0, f: num(r[col.f]) || 0, fiber: num(r[col.fiber]) || 0, sugar: num(r[col.sugar]) || 0, sodium: num(r[col.sodium]) || 0 };
    if (col.amount && r[col.amount]) e.sl = String(r[col.amount]).slice(0, 30);
    const k = `${d}|${e.name}|${Math.round(kcal)}`;
    if (have.has(k)) continue;
    have.add(k); out.push(e);
  }
  return out;
}

// ---------- the import screen ----------
export async function importFile(file, input) {
  if (input) input.value = '';
  if (!file) return;
  let parsed;
  try { parsed = await readFile(file); } catch (e) { toast(/xlsx/.test(e.message) ? 'Couldn\'t load the Excel reader. Check your connection and try again.' : 'Couldn\'t read that file'); return; }
  if (parsed.kind === 'json') {
    const j = parsed.data, data = j && j.app === 'tally' ? j.data : j;
    if (!data || !Array.isArray(data.workouts)) { toast("That file isn't a Tally backup"); return; }
    confirmSheet({ title: 'Restore this backup?', body: `It has ${data.workouts.length} workouts, ${(data.bodyweight || []).length} weigh-ins and ${(data.foodLog || []).length} food entries. Everything currently on this phone will be replaced.`, confirm: 'Restore', onConfirm: () => { store.replaceAll(data); toast('Backup restored'); } });
    return;
  }
  const sheets = parsed.sheets.map(s => ({ ...s, d: detectSheet(s.rows) }));
  function Body() {
    const st = store.get();
    const [liftU, setLiftU] = useState(st.settings.unit);
    const [bwU, setBwU] = useState(bwUnit(st));
    const [lenU, setLenU] = useState(bwUnit(st) === 'lb' ? 'in' : 'cm');
    // Build everything with the chosen units.
    let workouts = [], newEx = [], skippedW = 0, sets = 0, weighIns = [], meas = [], food = [];
    let needLift = false, needBw = false, needLen = false;
    const lines = [];
    for (const s of sheets) {
      const d = s.d;
      if (d.type === 'app' || d.type === 'workouts') {
        if (d.type === 'workouts' && !d.col.unit && !unitIn(d.col.weight || '')) needLift = true;
        if (d.type === 'app' && d.app !== 'Hevy' && !(d.app === 'FitNotes' && s.rows[0] && (s.rows[0]['Weight Unit'] != null || s.rows[0]['Weight (kgs)'] != null || s.rows[0]['Weight (lbs)'] != null))) needLift = true;
        const rows = d.type === 'app' ? s.rows : genericToStrong(s.rows, d.col, liftU);
        const r = buildImport({ ...st, exercises: [...st.exercises, ...newEx], workouts: [...st.workouts, ...workouts] }, rows, d.type === 'app' ? d.app : 'Strong', liftU);
        workouts.push(...r.workouts); newEx.push(...r.newExercises); skippedW += r.skipped; sets += r.sets;
        lines.push([s.name, r.workouts.length ? `${d.type === 'app' ? d.app + ' workouts' : 'Workouts'}: ${r.workouts.length} (${r.sets} sets)${r.skipped ? `, ${r.skipped} already here` : ''}` : `Workouts: nothing new${r.skipped ? ` (${r.skipped} already here)` : ''}`]);
      } else if (d.type === 'body') {
        if (d.col.body && !unitIn(d.col.body)) needBw = true;
        if (Object.values(d.col.meas).some(h => !unitIn(h))) needLen = true;
        const r = planBody(st, s.rows, d.col, bwU, lenU);
        weighIns.push(...r.weighIns); meas.push(...r.meas);
        lines.push([s.name, [r.weighIns.length ? `${r.weighIns.length} weigh-ins` : '', r.meas.length ? `${r.meas.length} measurements` : ''].filter(Boolean).join(' · ') || 'Weigh-ins and measurements: nothing new']);
      } else if (d.type === 'food') {
        const r = planFood(st, s.rows, d.col);
        food.push(...r);
        lines.push([s.name, r.length ? `Food log: ${r.length} entries over ${new Set(r.map(e => e.date)).size} ${new Set(r.map(e => e.date)).size === 1 ? 'day' : 'days'}` : 'Food log: nothing new']);
      } else {
        lines.push([s.name, `Skipped: ${d.why || 'empty'}`, true]);
      }
    }
    const total = workouts.length + weighIns.length + meas.length + food.length;
    const go = () => {
      store.update(x => {
        x.exercises.push(...newEx);
        x.workouts.push(...workouts); x.workouts.sort((a, b) => a.start - b.start);
        x.bodyweight.push(...weighIns);
        x.measurements.push(...meas);
        x.foodLog.push(...food);
      });
      closeSheet();
      toast(`Imported ${[workouts.length && `${workouts.length} ${workouts.length === 1 ? 'workout' : 'workouts'}`, weighIns.length && `${weighIns.length} weigh-ins`, meas.length && `${meas.length} measurements`, food.length && `${food.length} food entries`].filter(Boolean).join(', ')}`);
    };
    return html`
      <${SheetHead} title="Import" />
      <div class="small muted" style="margin-top:-8px">${file.name}</div>
      <div class="list">${lines.map(([n, t, skip]) => html`<div class="row"><div class="grow"><div class="title">${t}</div>${sheets.length > 1 || skip ? html`<div class="sub">${skip ? 'Sheet' : 'From'} "${n}"</div>` : null}</div>
        ${skip ? html`<span class="pill">skipped</span>` : html`<span style="color:var(--good)"><${Icon} name="check" size=${18} /></span>`}</div>`)}</div>
      ${newEx.length ? html`<p class="tiny muted" style="margin:0">${newEx.length} ${newEx.length === 1 ? "exercise isn't" : "exercises aren't"} in Tally yet and will be added as your own: ${newEx.slice(0, 5).map(e => e.name).join(', ')}${newEx.length > 5 ? '…' : ''}</p>` : null}
      ${needLift ? html`<div class="field"><label>Lifting weights in this file are in</label><${Seg} label="Lifting unit" value=${liftU} onChange=${setLiftU} options=${[['lb', 'lb'], ['kg', 'kg']]} /></div>` : null}
      ${needBw ? html`<div class="field"><label>Body weight in this file is in</label><${Seg} label="Body weight unit" value=${bwU} onChange=${setBwU} options=${[['lb', 'lb'], ['kg', 'kg']]} /></div>` : null}
      ${needLen ? html`<div class="field"><label>Measurements in this file are in</label><${Seg} label="Measurement unit" value=${lenU} onChange=${setLenU} options=${[['in', 'inches'], ['cm', 'cm']]} /></div>` : null}
      <p class="tiny muted" style="margin:0">Adds to what's already in Tally. Nothing is replaced, and anything already here is skipped.</p>
      <button class="btn primary block" disabled=${!total} onClick=${go}>${total ? 'Import' : 'Nothing new to import'}</button>`;
  }
  openSheet(() => html`<${Body} />`);
}

export function importHelp() {
  openSheet(() => html`
    <${SheetHead} title="What can I import?" />
    <div class="list">
      <div class="row"><div class="grow"><div class="title">Workouts</div><div class="sub" style="white-space:normal">Exports from Strong, Hevy or FitNotes, or any spreadsheet with Date, Exercise, Weight and Reps columns (Sets, Workout, Notes, Unit are optional).</div></div></div>
      <div class="row"><div class="grow"><div class="title">Weigh-ins and measurements</div><div class="sub" style="white-space:normal">Any sheet with Date and Weight, and optionally Body fat, Waist, Chest, Hips, Arms, Thighs, Calves, Shoulders or Neck.</div></div></div>
      <div class="row"><div class="grow"><div class="title">Food log</div><div class="sub" style="white-space:normal">MyFitnessPal or Cronometer exports, or any sheet with Date and Calories (Protein, Carbs, Fat, Meal and Food name are optional).</div></div></div>
      <div class="row"><div class="grow"><div class="title">Tally backup</div><div class="sub" style="white-space:normal">A .json backup from Export. This one replaces everything, for moving to a new phone.</div></div></div>
    </div>
    <p class="tiny muted" style="margin:0">Files can be Excel (.xlsx, .xls), CSV or TSV. A workbook with several sheets is fine: each sheet is read on its own. Column names don't have to match exactly ("Weight (lbs)", "Reps", "Exercise name" all work).</p>`);
}

// ---------- export ----------
function backupJSON() {
  download(`tally-backup-${todayKey()}.json`, JSON.stringify({ app: 'tally', exported: Date.now(), data: store.get() }));
  toast('Backup saved');
}

async function exportXLSX() {
  let X;
  try { X = await loadXLSX(); } catch (e) { toast('Couldn\'t load the Excel writer. Check your connection.'); return; }
  const st = store.get();
  const u = st.settings.unit, bu = bwUnit(st), lu = bu === 'lb' ? 'in' : 'cm';
  const exm = A.exMap(st);
  const T = { w: 'Warm-up', d: 'Drop set', f: 'To failure', n: 'Working' };
  const workouts = [];
  for (const w of A.finished(st)) for (const e of w.entries) {
    let n = 0;
    for (const s of e.sets) workouts.push({ Date: stamp(new Date(w.start)), Workout: w.name, Exercise: (exm.get(e.exId) || {}).name || 'Exercise', Set: s.t === 'n' ? ++n : '', 'Set type': T[s.t] || 'Working', [`Weight (${u})`]: s.kg != null ? round(toUnit(s.kg, u), 2) : '', Reps: s.reps ?? '', 'Distance (km)': s.km ? round(s.km, 3) : '', 'Time (s)': s.sec ?? '', RIR: typeof s.rir === 'number' ? s.rir : '', Notes: e.note || '', 'Minutes': Math.round(((w.end || w.start) - w.start) / 60000) });
  }
  const body = st.bodyweight.slice().sort((a, b) => a.date < b.date ? -1 : 1).map(b => ({ Date: b.date, [`Weight (${bu})`]: round(toUnit(b.kg, bu), 1) }));
  const mDates = [...new Set(st.measurements.map(m => m.date))].sort();
  const meas = mDates.map(d => Object.fromEntries([['Date', d], ...MEASURES.map(([k, l, kind]) => { const m = st.measurements.find(x => x.date === d && x.key === k); return [kind === 'pct' ? `${l} (%)` : `${l} (${lu})`, m ? round(kind === 'pct' ? m.value : lu === 'in' ? m.value / 2.54 : m.value, 1) : '']; })]));
  const food = st.foodLog.slice().sort((a, b) => a.date < b.date ? -1 : 1).map(e => ({ Date: e.date, Meal: e.meal, Food: e.name, Brand: e.brand || '', Amount: e.unit === 'g' ? `${e.qty} g` : e.unit === 'oz' ? `${e.qty} oz` : `${e.qty} × ${e.sl || 'serving'}`, Calories: Math.round(e.kcal), 'Protein (g)': round(e.p, 1), 'Carbs (g)': round(e.c, 1), 'Fat (g)': round(e.f, 1), 'Fiber (g)': round(e.fiber || 0, 1), 'Sugar (g)': round(e.sugar || 0, 1), 'Sodium (mg)': Math.round(e.sodium || 0) }));
  const wb = X.utils.book_new();
  const add = (name, rows, empty) => X.utils.book_append_sheet(wb, X.utils.json_to_sheet(rows.length ? rows : [empty]), name);
  add('Workouts', workouts, { Date: '', Workout: '', Exercise: '', Set: '', [`Weight (${u})`]: '', Reps: '' });
  add('Bodyweight', body, { Date: '', [`Weight (${bu})`]: '' });
  add('Measurements', meas, { Date: '' });
  add('Food log', food, { Date: '', Meal: '', Food: '', Calories: '' });
  const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tally-${todayKey()}.xlsx`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Spreadsheet saved');
}

export function exportMenu() {
  const Opt = ({ icon, title, sub, onClick }) => html`<button class="row" onClick=${() => { closeSheet(); onClick(); }}>
    <span style="color:var(--accent)"><${Icon} name=${icon} size=${20} /></span>
    <div class="grow" style="min-width:0"><div class="title">${title}</div><div class="sub" style="white-space:normal">${sub}</div></div></button>`;
  openSheet(() => html`
    <${SheetHead} title="Export" />
    <div class="list">
      <${Opt} icon="download" title="Excel spreadsheet (.xlsx)" sub="Workouts, weigh-ins, measurements and food log, one sheet each. Opens in Excel, Numbers or Google Sheets." onClick=${exportXLSX} />
      <${Opt} icon="cloud" title="Tally backup (.json)" sub="Everything except photos. Use Import on any phone to restore it." onClick=${backupJSON} />
      <${Opt} icon="train" title="Workouts for another gym app (.csv)" sub="Strong's format, which Hevy, Strong and many others can import." onClick=${exportCSV} />
    </div>`);
}
