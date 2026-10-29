// Import workout history from other gym apps (CSV), and export Tally workouts as CSV.
// Reads: Strong, Hevy, FitNotes, and Tally's own CSV (same columns as Strong, which most apps also import).

import { html, useState } from '../vendor/preact-htm.js';
import * as store from './store.js';
import * as A from './analytics.js';
import { openSheet, closeSheet, SheetHead, toast, Seg } from './ui.js';
import { fromUnit, toUnit, round, todayKey, download, KM_PER_MI } from './util.js';

// ---------- CSV ----------
export function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0];
  const cnt = c => (first.split(c).length - 1);
  const delim = cnt('\t') > cnt(',') && cnt('\t') > cnt(';') ? '\t' : cnt(';') > cnt(',') ? ';' : ',';
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const head = (rows.shift() || []).map(h => h.trim());
  return rows.filter(r => r.some(x => x.trim() !== '')).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}
const csvCell = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

// ---------- dates and numbers ----------
const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function parseDate(s) {
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0), +(m[6] || 0)).getTime();
  m = s.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}),? ?(\d{1,2})?:?(\d{2})?/); // Hevy: "26 Oct 2024, 10:15"
  if (m && MON[m[2].toLowerCase()] != null) return new Date(+m[3], MON[m[2].toLowerCase()], +m[1], +(m[4] || 12), +(m[5] || 0)).getTime();
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // US m/d/yyyy
  if (m) return new Date(+m[3], m[1] - 1, +m[2], 12).getTime();
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
}
const num = s => { if (s == null || s === '') return null; const v = parseFloat(String(s).replace(',', '.')); return isNaN(v) ? null : v; };
function durSec(s) { // "1h 5m", "45m", "3600", "01:05:00"
  if (!s) return null;
  if (/^\d+$/.test(s)) return +s;
  const c = s.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (c) return c[3] != null ? +c[1] * 3600 + +c[2] * 60 + +c[3] : +c[1] * 60 + +c[2];
  const h = s.match(/(\d+)\s*h/), mm = s.match(/(\d+)\s*m(?!s)/), ss = s.match(/(\d+)\s*s/);
  return h || mm || ss ? (+(h || [0, 0])[1]) * 3600 + (+(mm || [0, 0])[1]) * 60 + (+(ss || [0, 0])[1]) : null;
}

// ---------- detect the app and turn rows into sets ----------
// Each row -> { start, end?, name, ex, t, kgRaw (in file unit or kg), unit, reps, km, sec, note }
export function detectApp(rows) {
  const h = Object.keys(rows[0] || {});
  const has = k => h.includes(k);
  if (has('exercise_title') && has('start_time')) return 'Hevy';
  if (has('Exercise Name') && has('Set Order')) return 'Strong';
  if (has('Exercise') && has('Category') && (has('Weight Unit') || h.some(k => /^Weight \((kgs|lbs)\)$/.test(k)))) return 'FitNotes';
  return null;
}

function rowsToSets(rows, app, fileUnit) {
  const out = [];
  for (const r of rows) {
    if (app === 'Hevy') {
      const kgCol = r.weight_kg != null ? 'kg' : r.weight_lbs != null ? 'lb' : null;
      const w = kgCol === 'kg' ? num(r.weight_kg) : num(r.weight_lbs);
      const km = r.distance_km != null ? num(r.distance_km) : r.distance_miles != null ? (num(r.distance_miles) ?? 0) * KM_PER_MI || null : null;
      const st = (r.set_type || '').toLowerCase();
      out.push({ start: parseDate(r.start_time), end: parseDate(r.end_time), name: r.title || 'Workout', ex: r.exercise_title, t: st === 'warmup' ? 'w' : st === 'dropset' ? 'd' : st === 'failure' ? 'f' : 'n',
        kg: w == null ? null : fromUnit(w, kgCol || fileUnit), reps: num(r.reps), km, sec: num(r.duration_seconds), rpe: num(r.rpe), note: r.exercise_notes, wnote: r.description });
    } else if (app === 'Strong') {
      const so = (r['Set Order'] || '').toUpperCase();
      const w = num(r.Weight), dist = num(r.Distance), sec = num(r.Seconds);
      const start = parseDate(r.Date);
      const d = durSec(r.Duration);
      out.push({ start, end: start && d ? start + d * 1000 : null, name: r['Workout Name'] || 'Workout', ex: r['Exercise Name'], t: so === 'W' ? 'w' : so === 'D' ? 'd' : so === 'F' ? 'f' : 'n',
        kg: w == null ? null : fromUnit(w, fileUnit), reps: num(r.Reps), km: dist ? ((r['Distance Unit'] ? r['Distance Unit'] === 'mi' : fileUnit === 'lb') ? dist * KM_PER_MI : dist) : null, sec, rpe: num(r.RPE), note: r.Notes, wnote: r['Workout Notes'] });
    } else if (app === 'FitNotes') {
      let w = num(r.Weight), u = (r['Weight Unit'] || '').toLowerCase().startsWith('lb') ? 'lb' : (r['Weight Unit'] ? 'kg' : fileUnit);
      if (w == null && r['Weight (kgs)'] != null) { w = num(r['Weight (kgs)']); u = 'kg'; }
      if (w == null && r['Weight (lbs)'] != null) { w = num(r['Weight (lbs)']); u = 'lb'; }
      const dist = num(r.Distance), du = (r['Distance Unit'] || '').toLowerCase();
      out.push({ start: parseDate(r.Date), name: 'Workout', ex: r.Exercise, t: 'n',
        kg: w == null ? null : fromUnit(w, u), reps: num(r.Reps), km: dist ? (du.startsWith('mi') ? dist * KM_PER_MI : du.startsWith('m') && du !== 'mi' && !du.startsWith('mile') ? dist / 1000 : dist) : null, sec: durSec(r.Time), note: r.Comment });
    }
  }
  return out.filter(s => s.start && s.ex);
}

const norm = s => String(s || '').toLowerCase().replace(/\(([^)]*)\)/g, ' $1 ').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').sort().join(' ');

// Build the import: workouts grouped by start + name, exercises matched by name.
export function buildImport(state, rows, app, fileUnit) {
  const sets = rowsToSets(rows, app, fileUnit);
  const byNorm = new Map();
  for (const e of A.allExercises(state)) if (!byNorm.has(norm(e.name))) byNorm.set(norm(e.name), e.id);
  const newEx = new Map();
  // Other apps add the equipment in brackets ("Bench Press (Barbell)") or use other names for the same lift.
  const ALIAS = { 'squat': 'back squat', 'pull up': 'pull-up', 'chin up': 'chin-up', 'running': 'run', 'running outdoor': 'run', 'treadmill': 'run', 'cycling': 'bike', 'plank': 'plank', 'push up': 'push-up', 'dip': 'dips', 'lat pulldown cable': 'lat pulldown', 'seated cable row': 'seated cable row' };
  const find = name => {
    const tries = [name, name.replace(/\([^)]*\)/g, ''), name.replace(/\(([^)]*)\)/, '$1')];
    for (const t of tries) { const k = norm(t); if (byNorm.has(k)) return byNorm.get(k); }
    const bare = name.replace(/\([^)]*\)/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const al = ALIAS[bare] || ALIAS[name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()];
    return al && byNorm.has(norm(al)) ? byNorm.get(norm(al)) : null;
  };
  const exIdFor = (name, s) => {
    const k = norm(name);
    const hit = find(name);
    if (hit) return hit;
    if (!newEx.has(k)) newEx.set(k, { id: 'x-' + store.uid(), name: name.trim(), muscle: 'Other', equip: 'Other', type: s.km || (s.sec && !s.reps) ? (s.km ? 'cardio' : 'time') : s.kg ? 'weight' : 'bw', secondary: [], custom: true });
    return newEx.get(k).id;
  };
  const existing = new Set(state.workouts.map(w => Math.round(w.start / 60000)));
  const groups = new Map();
  for (const s of sets) {
    const key = s.start + '|' + s.name;
    if (!groups.has(key)) groups.set(key, { start: s.start, end: s.end, name: s.name, notes: s.wnote || '', entries: new Map() });
    const g = groups.get(key);
    if (s.end && (!g.end || s.end > g.end)) g.end = s.end;
    const id = exIdFor(s.ex, s);
    if (!g.entries.has(id)) g.entries.set(id, { exId: id, note: s.note || '', sets: [] });
    const set = { t: s.t, done: true };
    if (s.kg != null && s.kg !== 0) set.kg = round(s.kg, 4); else if (s.reps) set.kg = s.kg ?? 0;
    if (s.reps != null && !(s.reps === 0 && (s.km || s.sec))) set.reps = s.reps;
    if (s.km) set.km = round(s.km, 4);
    if (s.sec) set.sec = s.sec;
    if (s.rpe != null) set.rir = Math.max(0, Math.round(10 - s.rpe));
    if (set.reps == null && !set.km && !set.sec) continue;
    g.entries.get(id).sets.push(set);
  }
  const workouts = [], skipped = [];
  for (const g of groups.values()) {
    const entries = [...g.entries.values()].filter(e => e.sets.length);
    if (!entries.length) continue;
    if (existing.has(Math.round(g.start / 60000))) { skipped.push(g); continue; }
    const nsets = entries.reduce((n, e) => n + e.sets.length, 0);
    workouts.push({ id: store.uid(), routineId: null, name: g.name, start: g.start, end: g.end && g.end > g.start ? g.end : g.start + Math.max(20, nsets * 3) * 60000, notes: g.notes, entries, imported: true });
  }
  workouts.sort((a, b) => a.start - b.start);
  return { workouts, newExercises: [...newEx.values()].filter(e => workouts.some(w => w.entries.some(en => en.exId === e.id))), skipped: skipped.length, sets: workouts.reduce((n, w) => n + w.entries.reduce((m, e) => m + e.sets.length, 0), 0) };
}

// ---------- the import sheet ----------
export async function importCSV(file, input) {
  if (input) input.value = '';
  if (!file) return;
  let rows;
  try { rows = parseCSV(await file.text()); } catch (e) { toast('Couldn\'t read that file'); return; }
  const app = detectApp(rows);
  if (!app) { toast('Not a Strong, Hevy or FitNotes CSV export'); return; }
  function Body() {
    const st = store.get();
    const askUnit = app !== 'Hevy' && !(app === 'FitNotes' && rows[0] && (rows[0]['Weight Unit'] != null || rows[0]['Weight (kgs)'] != null || rows[0]['Weight (lbs)'] != null));
    const [unit, setUnit] = useState(st.settings.unit);
    const r = buildImport(st, rows, app, unit);
    const go = () => {
      store.update(s => { s.exercises.push(...r.newExercises); s.workouts.push(...r.workouts); s.workouts.sort((a, b) => a.start - b.start); });
      closeSheet(); toast(`Imported ${r.workouts.length} workouts`);
    };
    const first = r.workouts[0], last = r.workouts[r.workouts.length - 1];
    return html`
      <${SheetHead} title=${`Import from ${app}`} />
      ${askUnit ? html`<div class="field"><label>Weights in this file are in</label><${Seg} label="File unit" value=${unit} onChange=${setUnit} options=${[['lb', 'lb'], ['kg', 'kg']]} /></div>` : null}
      <div class="list">
        <div class="row"><div class="grow"><div class="title">${r.workouts.length} workouts · ${r.sets} sets</div>
          <div class="sub">${first ? `${new Date(first.start).toLocaleDateString()} to ${new Date(last.start).toLocaleDateString()}` : 'Nothing new to import'}</div></div></div>
        ${r.newExercises.length ? html`<div class="row"><div class="grow"><div class="title">${r.newExercises.length} exercises not in Tally</div><div class="sub" style="white-space:normal">Added as your own: ${r.newExercises.slice(0, 6).map(e => e.name).join(', ')}${r.newExercises.length > 6 ? '…' : ''}</div></div></div>` : null}
        ${r.skipped ? html`<div class="row"><div class="grow"><div class="title">${r.skipped} already in Tally</div><div class="sub">Skipped, so nothing is doubled</div></div></div>` : null}
      </div>
      <p class="tiny muted" style="margin:0">Imported workouts count toward your records, charts and suggestions. Your current data stays; nothing is replaced.</p>
      <button class="btn primary block" disabled=${!r.workouts.length} onClick=${go}>Import ${r.workouts.length} workouts</button>`;
  }
  openSheet(() => html`<${Body} />`);
}

// ---------- export as CSV (Strong's columns: Hevy, Strong and many others can read it) ----------
export function exportCSV() {
  const st = store.get();
  const exm = A.exMap(st);
  const unit = st.settings.unit;
  const head = ['Date', 'Workout Name', 'Duration', 'Exercise Name', 'Set Order', 'Weight', 'Reps', 'Distance', 'Seconds', 'Notes', 'Workout Notes', 'RPE'];
  const lines = [head.join(',')];
  const pad = n => String(n).padStart(2, '0');
  for (const w of A.finished(st)) {
    const d = new Date(w.start);
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const mins = Math.round(((w.end || w.start) - w.start) / 60000);
    const dur = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
    for (const e of w.entries) {
      let n = 0;
      for (const s of e.sets) {
        const order = s.t === 'w' ? 'W' : s.t === 'd' ? 'D' : s.t === 'f' ? 'F' : String(++n);
        lines.push([date, w.name, dur, (exm.get(e.exId) || {}).name || 'Exercise', order,
          s.kg != null ? round(toUnit(s.kg, unit), 2) : '', s.reps ?? '', s.km ? round(unit === 'lb' ? s.km / KM_PER_MI : s.km, 3) : '', s.sec ?? '',
          e.note || '', w.notes || '', typeof s.rir === 'number' ? 10 - s.rir : ''].map(csvCell).join(','));
      }
    }
  }
  download(`tally-workouts-${todayKey()}.csv`, lines.join('\n'), 'text/csv');
  toast('Workouts exported');
}
