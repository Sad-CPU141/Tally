// Active workout logging, rest timer, and the post-workout summary.

import { html, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import * as A from '../lib/analytics.js';
import { Icon, nav, openSheet, closeSheet, SheetHead, confirmSheet, toast, TopBar } from '../lib/ui.js';
import { w, toUnit, fromUnit, fmtNum, fmtDur, parseDur, toDist, fromDist, fmtBig, fmtMins, round } from '../lib/util.js';
import { ExThumb } from '../lib/photo.js';
import { pickExercise } from './picker.js';
import { prValue } from '../lib/cards.js';
import { plateCalc, platesFor, BARS, DEFAULT_PLATES } from '../lib/plates.js';
import { suggestion, warmups, isBarbell } from '../lib/progress.js';

const uid = store.uid;
const newSet = (target) => ({ t: 'n', kg: null, reps: null, sec: null, km: null, done: false, target: target || null });

// ---------- starting / finishing ----------
// Starting while another workout is open asks what to do with the open one.
export function startWorkout(routine) {
  const s = store.get();
  const a = s.active;
  if (a) {
    if (routine && a.routineId === routine.id) { nav.go('workout'); return; }
    const done = a.entries.reduce((n, e) => n + e.sets.filter(x => x.done).length, 0);
    const next = routine ? routine.name : 'an empty workout';
    openSheet(() => html`
      <${SheetHead} title=${`Start ${next}?`} />
      <p class="text-2" style="margin:0">${a.name} is still open${done ? ` with ${done} ${done === 1 ? 'set' : 'sets'} logged` : ', with nothing logged yet'}. What should happen to it?</p>
      ${done ? html`<button class="btn primary block" onClick=${() => { closeSheet(); saveActive(); begin(routine); toast(`${a.name} saved`); }}>Save ${a.name} and start</button>` : null}
      <button class=${'btn block' + (done ? ' danger' : ' primary')} onClick=${() => { closeSheet(); store.update(st => { st.active = null; }); begin(routine); if (done) toast(`${a.name} discarded`); }}>${done ? `Discard ${a.name} and start` : 'Start'}</button>
      <button class="btn block" onClick=${() => { closeSheet(); nav.go('workout'); }}>Go back to ${a.name}</button>`);
    return;
  }
  begin(routine);
}

function begin(routine) {
  const s = store.get();
  store.update(st => {
    st.active = {
      id: uid(),
      routineId: routine ? routine.id : null,
      name: routine ? routine.name : 'Workout',
      start: Date.now(),
      notes: '',
      entries: routine ? routine.items.map(it => {
        // Keep the warm-up sets you did last time.
        const last = A.lastSets(s, it.exId) || [];
        const warm = last.filter(x => x.t === 'w').map(() => ({ ...newSet(null), t: 'w' }));
        return { id: uid(), exId: it.exId, note: '', rest: it.rest ?? null, group: it.group || null, sets: [...warm, ...Array.from({ length: it.sets || 3 }, () => newSet(it.reps))] };
      }) : [],
      rest: null,
    };
  });
  if (nav.current().name === 'workout') nav.replace('workout'); else nav.go('workout');
}

// Save the open workout's ticked sets to history. Returns the saved workout, or null if nothing was ticked.
function saveActive() {
  const a = store.get().active;
  if (!a) return null;
  const entries = a.entries.map(e => ({ exId: e.exId, note: e.note, sets: e.sets.filter(x => x.done).map(clean) })).filter(e => e.sets.length);
  if (!entries.length) return null;
  const wo = { id: a.id, routineId: a.routineId, name: a.name, start: a.start, end: Date.now(), notes: a.notes, entries };
  store.update(st => { st.workouts.push(wo); st.active = null; });
  return wo;
}

function finishWorkout() {
  const a = store.get().active;
  const wo = saveActive();
  if (!wo) {
    confirmSheet({ title: 'Nothing logged yet', body: 'Tick off at least one set to save this workout, or discard it.', confirm: 'Discard workout', onConfirm: discard });
    return;
  }
  releaseWake();
  nav.replace('summary', { id: wo.id });
}

function clean(x) {
  const o = { t: x.t, done: true };
  if (x.kg != null) o.kg = round(x.kg, 4);
  if (x.reps != null) o.reps = x.reps;
  if (x.sec != null) o.sec = x.sec;
  if (x.km != null) o.km = x.km;
  if (typeof x.rir === 'number') o.rir = x.rir;
  return o;
}

function discard() {
  store.update(st => { st.active = null; });
  releaseWake();
  nav.tab('today');
  toast('Workout discarded');
}

// ---------- wake lock ----------
let wake = null;
async function holdWake() {
  try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) {}
}
function releaseWake() { try { wake && wake.release(); } catch (e) {} wake = null; }
document.addEventListener('visibilitychange', () => {
  const s = store.get();
  if (document.visibilityState === 'visible' && s && s.active && s.settings.keepAwake) holdWake();
});

// ---------- helpers ----------
function useTick(ms = 1000) {
  const [, setT] = useState(0);
  useEffect(() => { const i = setInterval(() => setT(t => t + 1), ms); return () => clearInterval(i); }, [ms]);
}

function editActive(fn) { store.update(st => { if (st.active) { fn(st.active, st); tidyGroups(st.active.entries); } }); }

// ---------- supersets ----------
// Exercises in a superset share a group id and sit next to each other. A group only counts
// for neighbours, so moving or removing an exercise can't leave a stray one behind.
export function tidyGroups(list) {
  list.forEach((e, i) => {
    if (!e.group) return;
    const prev = list[i - 1], next = list[i + 1];
    if (!(prev && prev.group === e.group) && !(next && next.group === e.group)) e.group = null;
  });
}
export function supersetWithNext(list, i) {
  const a = list[i], b = list[i + 1];
  if (!a || !b) return;
  const g = a.group || b.group || uid();
  const old = b.group;
  a.group = g; b.group = g;
  // Pull the rest of b's old superset along.
  if (old && old !== g) list.forEach(e => { if (e.group === old) e.group = g; });
}
export function leaveSuperset(list, i) {
  const e = list[i];
  if (!e || !e.group) return;
  const g = e.group;
  const prev = list[i - 1], next = list[i + 1];
  e.group = null;
  // If it sat in the middle, the two halves become separate supersets.
  if (prev && next && prev.group === g && next.group === g) {
    const ng = uid();
    for (let j = i + 1; j < list.length && list[j].group === g; j++) list[j].group = ng;
  }
  tidyGroups(list);
}
// Position within its superset: { n, k, last } or null.
export function groupPos(list, i) {
  const e = list[i];
  if (!e || !e.group) return null;
  let a = i, b = i;
  while (a > 0 && list[a - 1].group === e.group) a--;
  while (b < list.length - 1 && list[b + 1].group === e.group) b++;
  return { n: b - a + 1, k: i - a, first: i === a, last: i === b, start: a };
}
const LETTERS = 'ABCDEFGH';

function startRest(sec) {
  if (!sec) return;
  editActive(a => { a.rest = { until: Date.now() + sec * 1000, total: sec, alerted: false }; });
}

export function prevText(s, ex, settings) {
  if (!s) return '–';
  const unit = settings.unit, du = settings.distUnit;
  switch (ex.type) {
    case 'weight': return `${w(s.kg, unit)} × ${s.reps}`;
    case 'bw': return s.kg ? `+${w(s.kg, unit)} × ${s.reps}` : `${s.reps} reps`;
    case 'time': return fmtDur(s.sec);
    case 'cardio': return `${fmtNum(toDist(s.km || 0, du), 2)} · ${fmtDur(s.sec)}`;
    case 'sprint': return `${Math.round((s.km || 0) * 1000)}m · ${fmtNum(s.sec, 2)}s`;
  }
  return '–';
}

const TYPE_CYCLE = { n: 'w', w: 'd', d: 'f', f: 'n' };
const TYPE_NAME = { n: 'Working set', w: 'Warm-up', d: 'Drop set', f: 'To failure' };

// ---------- screen ----------
export function Workout({ state }) {
  const a = state.active;
  useTick(1000);
  useEffect(() => { if (state.settings.keepAwake) holdWake(); }, []);
  if (!a) return html`<${TopBar} title="Workout" back=${true} /><div class="page"><div class="card empty">No workout in progress.<button class="btn primary" onClick=${() => nav.tab('train')}>Choose a routine</button></div></div>`;
  const exm = A.exMap(state);
  const doneSets = a.entries.reduce((n, e) => n + e.sets.filter(x => x.done && x.t !== 'w').length, 0);
  const vol = a.entries.reduce((n, e) => { const ex = exm.get(e.exId); return n + e.sets.reduce((m, x) => m + A.setVolume(x, ex), 0); }, 0);

  return html`
    <${TopBar} title=${a.name} back=${true}
      right=${html`<button class="btn sm primary" onClick=${finishWorkout}>Finish</button>`} />
    <div class="page">
      <div class="wo-head">
        <div><div class="eyebrow">Elapsed</div><div class="wo-clock num">${fmtDur((Date.now() - a.start) / 1000)}</div></div>
        <div><div class="eyebrow">Sets</div><div class="num" style="font-weight:600">${doneSets}</div></div>
        <div><div class="eyebrow">Volume</div><div class="num" style="font-weight:600">${fmtBig(toUnit(vol, state.settings.unit))} ${state.settings.unit}</div></div>
        <div class="spacer"></div>
        <button class="icon-btn" aria-label="Workout options" onClick=${() => workoutMenu(state)}><${Icon} name="more" /></button>
      </div>
      ${a.entries.map((en, i) => html`<${Entry} key=${en.id} en=${en} idx=${i} state=${state} />`)}
      ${!a.entries.length ? html`<div class="card empty"><span class="h-md">Empty workout</span><span>Add exercises as you go.</span></div>` : null}
      <button class="btn block" onClick=${() => pickExercise(exId => editActive(a => { a.entries.push({ id: uid(), exId, note: '', sets: [newSet()] }); }))}><${Icon} name="plus" size=${18} /> Add exercise</button>
      <button class="btn ghost block danger" onClick=${() => confirmSheet({ title: 'Discard workout?', body: 'Everything logged in this session will be lost.', confirm: 'Discard', onConfirm: discard })}>Discard workout</button>
    </div>`;
}

function workoutMenu(state) {
  function Body() {
    const a = store.get().active;
    const [name, setName] = useState(a.name);
    const [notes, setNotes] = useState(a.notes || '');
    return html`
      <${SheetHead} title="Workout" />
      <div class="field"><label for="wo-name">Name</label><input id="wo-name" class="input" value=${name} onInput=${e => setName(e.target.value)} /></div>
      <div class="field"><label for="wo-notes">Notes</label><textarea id="wo-notes" class="input" placeholder="How did it feel? Sleep, energy, anything worth remembering" value=${notes} onInput=${e => setNotes(e.target.value)}></textarea></div>
      <button class="btn primary block" onClick=${() => { editActive(x => { x.name = name.trim() || 'Workout'; x.notes = notes; }); closeSheet(); }}>Save</button>`;
  }
  openSheet(() => html`<${Body} />`);
}

function Entry({ en, idx, state }) {
  const exm = A.exMap(state);
  const ex = exm.get(en.exId) || { name: 'Unknown exercise', type: 'weight' };
  const prev = A.lastSets(state, en.exId, state.active.start) || [];
  const settings = state.settings;
  const unit = settings.unit, du = settings.distUnit;
  const isCardio = ex.type === 'cardio' || ex.type === 'sprint';
  const restSec = en.rest ?? ex.rest ?? settings.restDefault;
  const cols = {
    weight: [unit, 'Reps'], bw: ['+' + unit, 'Reps'], time: ['Time', ''],
    cardio: [du, 'Time'], sprint: ['Metres', 'Sec'],
  }[ex.type] || [unit, 'Reps'];

  // Coach: what to aim for today. Working-set placeholders follow it, so ticking an empty set accepts it.
  const target = (en.sets.find(x => x.t === 'n') || {}).target || null;
  const sug = settings.suggest !== false && !en.hideSug ? suggestion(state, ex, target, state.active.start) : null;
  const [why, setWhy] = useState(false);

  let workingN = 0;
  const editSet = (i, fn) => editActive(a => { const e = a.entries.find(x => x.id === en.id); if (e) fn(e.sets[i], e); });

  // Match each set to the same kind of set last time (2nd working set ↔ 2nd working set).
  const prevFor = (i) => {
    const t = en.sets[i].t === 'w' ? 'w' : 'n';
    const k = en.sets.slice(0, i).filter(x => (x.t === 'w' ? 'w' : 'n') === t).length;
    const same = prev.filter(x => (x.t === 'w' ? 'w' : 'n') === t);
    return same[k] || null;
  };
  const ph = (i) => {
    const t = en.sets[i].t === 'w' ? 'w' : 'n';
    const same = prev.filter(x => (x.t === 'w' ? 'w' : 'n') === t);
    const p = prevFor(i) || same[same.length - 1];
    const s = en.sets[i];
    if (sug && s.t === 'n' && (ex.type === 'weight' || ex.type === 'bw')) {
      const a = sug.kg != null ? fmtNum(toUnit(sug.kg, unit), 1) : ex.type === 'bw' ? '0' : '';
      return [a, String(sug.reps)];
    }
    switch (ex.type) {
      case 'weight': return [p && p.kg != null ? fmtNum(toUnit(p.kg, unit), 1) : '', s.target ? String(s.target) : p ? String(p.reps) : ''];
      case 'bw': return [p && p.kg ? fmtNum(toUnit(p.kg, unit), 1) : '0', s.target ? String(s.target) : p ? String(p.reps) : ''];
      case 'time': return [p ? fmtDur(p.sec) : s.target ? fmtDur(s.target) : '0:45', ''];
      case 'cardio': return [p ? fmtNum(toDist(p.km, du), 2) : '', p ? fmtDur(p.sec) : ''];
      case 'sprint': return [p ? String(Math.round(p.km * 1000)) : '100', p ? fmtNum(p.sec, 2) : ''];
    }
    return ['', ''];
  };

  const setA = (i, text) => editSet(i, s => {
    s.av = text;
    const v = text === '' ? null : ex.type === 'time' ? parseDur(text) : parseFloat(text);
    if (ex.type === 'weight' || ex.type === 'bw') s.kg = v == null || isNaN(v) ? null : fromUnit(v, unit);
    else if (ex.type === 'time') s.sec = v;
    else if (ex.type === 'cardio') s.km = v == null || isNaN(v) ? null : fromDist(v, du);
    else if (ex.type === 'sprint') s.km = v == null || isNaN(v) ? null : v / 1000;
  });
  const setB = (i, text) => editSet(i, s => {
    s.bv = text;
    if (ex.type === 'weight' || ex.type === 'bw') { const v = parseInt(text); s.reps = isNaN(v) ? null : v; }
    else if (ex.type === 'cardio') s.sec = parseDur(text);
    else if (ex.type === 'sprint') { const v = parseFloat(text); s.sec = isNaN(v) ? null : v; }
  });

  const toggle = (i) => {
    const s = en.sets[i];
    if (s.done) { editSet(i, (x, e) => { x.done = false; delete x.rir; if (e.askRir === i) e.askRir = null; }); return; }
    const [pa, pb] = ph(i);
    if ((s.av == null || s.av === '') && pa !== '') setA(i, pa);
    if (ex.type !== 'time' && (s.bv == null || s.bv === '') && pb !== '') setB(i, pb);
    const cur = store.get().active.entries.find(x => x.id === en.id).sets[i];
    const ok = ex.type === 'weight' ? cur.reps != null && cur.kg != null
      : ex.type === 'bw' ? cur.reps != null
      : ex.type === 'time' ? cur.sec != null
      : ex.type === 'cardio' ? (cur.km != null || cur.sec != null)
      : cur.sec != null;
    if (!ok) { toast(ex.type === 'weight' ? 'Enter weight and reps' : 'Fill in the set first'); return; }
    editSet(i, (x, e) => { x.done = true; if (ex.type === 'bw' && x.kg == null) x.kg = 0; e.askRir = settings.rir && x.t !== 'w' && (ex.type === 'weight' || ex.type === 'bw') ? i : null; });
    const gp = groupPos(store.get().active.entries, idx);
    if (gp && !gp.last) {
      // Mid-superset: no rest, go straight to the next exercise.
      const nx = A.exMap(store.get()).get(store.get().active.entries[idx + 1].exId);
      toast(`Superset: ${nx ? nx.name : 'next exercise'}`, 1400);
    } else if (settings.autoRest && (!isCardio || ex.type === 'sprint')) startRest(restSec);
    if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) {}
  };

  const gp = groupPos(state.active.entries, idx);
  const isBar = ex.type === 'weight' && /barbell|smith|trap/i.test(ex.equip || '');
  // Heaviest planned working weight: typed in, else the suggestion, else last time's top set.
  const topKg = () => {
    const typed = en.sets.filter(x => x.t !== 'w' && x.kg != null).map(x => x.kg);
    if (typed.length) return Math.max(...typed);
    if (sug && sug.kg) return sug.kg;
    const p = prev.filter(x => x.t !== 'w' && x.kg != null);
    return p.length ? Math.max(...p.map(x => x.kg)) : null;
  };
  const plateKg = () => { const s = en.sets.find(x => !x.done && x.t !== 'w' && x.kg != null) || en.sets.find(x => x.kg != null); if (s) return s.kg; const p = prev.filter(x => x.t !== 'w'); return p.length ? p[p.length - 1].kg : null; };
  return html`<div class=${'card ex-card' + (gp ? ' ss' + (gp.first ? ' ss-first' : '') + (gp.last ? ' ss-last' : '') : '')}>
    ${gp && gp.first ? html`<div class="ss-label"><${Icon} name="swap" size=${14} /> Superset · ${gp.n} exercises · rest after the last</div>` : null}
    <div class="ex-top">
      ${gp ? html`<span class="ss-tag" aria-label=${'Superset exercise ' + LETTERS[gp.k]}>${LETTERS[gp.k] || ''}</span>` : null}
      <button class="ex-link" onClick=${() => nav.go('exercise', { id: en.exId, entry: en.id })}><${ExThumb} ex=${ex} size=${36} /><span class="ex-name">${ex.name}</span></button>
      <span class="pill">${gp && !gp.last ? 'no rest' : restSec ? fmtDur(restSec) + ' rest' : 'no timer'}</span>
      <button class="icon-btn" aria-label="Exercise options" onClick=${() => entryMenu(en, idx, ex, restSec)}><${Icon} name="more" /></button>
    </div>
    ${en.note ? html`<div class="ex-note small text-2">${en.note}</div>` : null}
    ${sug && en.sets.some(x => !x.done && x.t === 'n') ? html`<div class=${'sugg ' + sug.kind}>
      <button class="sugg-main" aria-expanded=${why} onClick=${() => setWhy(!why)}>
        <${Icon} name=${sug.kind === 'deload' ? 'down' : sug.kind === 'up' ? 'up' : 'bolt'} size=${16} />
        <span class="grow"><b>${sug.text}</b>${why ? html`<span class="sugg-why">${sug.why}${sug.note ? ' ' + sug.note : ''}</span>` : null}</span>
      </button>
      <button class="link-btn tiny" onClick=${() => editActive(a => { const e = a.entries.find(x => x.id === en.id); e.hideSug = true; })}>Hide</button>
    </div>` : null}
    ${!why && sug && sug.note && en.sets.some(x => !x.done && x.t === 'n') ? html`<div class="sugg-note tiny">${sug.note}</div>` : null}
    <div class="sets">
      <div class=${'set-row head' + (isCardio ? ' cardio' : '')}><span>Set</span><span>Previous</span><span>${cols[0]}</span><span>${cols[1]}</span><span></span></div>
      ${en.sets.map((s, i) => {
        if (s.t === 'n') workingN++;
        const label = s.t === 'n' ? workingN : s.t.toUpperCase();
        const [pa, pb] = ph(i);
        const p = prevFor(i);
        const aVal = s.av != null ? s.av : '';
        const bVal = s.bv != null ? s.bv : '';
        return html`<div class=${'set-row' + (s.done ? ' done' : '') + (isCardio ? ' cardio' : '')}>
          <button class=${'set-type ' + s.t} aria-label=${TYPE_NAME[s.t] + ', tap to change'} onClick=${() => editSet(i, x => { x.t = TYPE_CYCLE[x.t]; })}>${label}</button>
          <button class="prev" aria-label="Copy previous" onClick=${() => { if (!p) return; const [a2, b2] = ph(i); setA(i, a2); if (ex.type !== 'time') setB(i, b2); }}>${p ? prevText(p, ex, settings) : '–'}</button>
          <input class="cell" id=${`c-${en.id}-${i}-a`} aria-label=${cols[0]} inputmode=${ex.type === 'time' ? 'text' : 'decimal'} placeholder=${pa} value=${aVal} onInput=${e => setA(i, e.target.value)} />
          ${ex.type === 'time' ? html`<span></span>` : html`<input class="cell" id=${`c-${en.id}-${i}-b`} aria-label=${cols[1]} inputmode=${ex.type === 'cardio' ? 'text' : ex.type === 'sprint' ? 'decimal' : 'numeric'} placeholder=${pb} value=${bVal} onInput=${e => setB(i, e.target.value)} />`}
          <button class="check" aria-label=${s.done ? 'Mark not done' : 'Complete set'} aria-pressed=${s.done} onClick=${() => toggle(i)}><${Icon} name="check" sw=${2.6} /></button>
        </div>${s.done && en.askRir === i ? html`<div class="rir-row" role="group" aria-label="Reps left in the tank">
          <span class="tiny muted">Reps left?</span>
          ${[0, 1, 2, 3, 4].map(n => html`<button class="chip sm" onClick=${() => editSet(i, (x, e) => { x.rir = n; e.askRir = null; })}>${n === 4 ? '4+' : n}</button>`)}
          <button class="icon-btn sm" aria-label="Skip" onClick=${() => editSet(i, (x, e) => { e.askRir = null; })}><${Icon} name="close" size=${16} /></button>
        </div>` : s.done && typeof s.rir === 'number' ? html`<div class="rir-done tiny muted">${s.rir === 0 ? 'to failure' : s.rir >= 4 ? '4+ reps left' : s.rir + ' left'}</div>` : null}`;
      })}
    </div>
    <div class="ex-actions">
      <button class="btn sm ghost" aria-label="Add set" onClick=${() => editActive(a => { const e = a.entries.find(x => x.id === en.id); const last = e.sets[e.sets.length - 1]; e.sets.push(newSet(last ? last.target : null)); })}><${Icon} name="plus" size=${16} /> Set</button>
      ${en.sets.length > 1 ? html`<button class="btn sm ghost" aria-label="Remove set" onClick=${() => editActive(a => { const e = a.entries.find(x => x.id === en.id); e.sets.pop(); })}><${Icon} name="minus" size=${16} /> Set</button>` : null}
      ${ex.type === 'weight' ? html`<button class="btn sm ghost" onClick=${() => warmupSheet(en, ex, topKg())}>Warm-up</button>` : null}
      ${isBar ? html`<button class="btn sm ghost" onClick=${() => plateCalc(plateKg())}><${Icon} name="train" size=${16} /> Plates</button>` : null}
    </div>
  </div>`;
}

// Warm-up sets worked out from your top set, ready to drop into the workout.
function warmupSheet(en, ex, topKg0) {
  function Body() {
    const st = store.get();
    const unit = st.settings.unit;
    const [val, setVal] = useState(topKg0 ? fmtNum(toUnit(topKg0, unit), 1) : '');
    const top = parseFloat(val);
    const list = top ? warmups(st, ex, fromUnit(top, unit)) : [];
    const bar = isBarbell(ex) ? (st.settings.barKg != null ? round(toUnit(st.settings.barKg, unit), 2) : BARS[unit][0]) : null;
    const plates = st.settings.plates && st.settings.plates.length ? st.settings.plates : DEFAULT_PLATES[unit];
    const perSide = v => { if (bar == null) return ''; const r = platesFor(v, bar, plates); return r.under ? '' : r.side.length ? r.side.join(' + ') + ' a side' : 'empty bar'; };
    const add = () => {
      editActive(a => {
        const e = a.entries.find(x => x.id === en.id);
        if (!e) return;
        const kept = e.sets.filter(x => x.t !== 'w' || x.done);
        const done = kept.filter(x => x.t === 'w');
        const fresh = list.slice(done.length).map(w => ({ ...newSet(null), t: 'w', kg: w.kg, reps: w.reps, av: fmtNum(w.shown, 1), bv: String(w.reps) }));
        e.sets = [...done, ...fresh, ...kept.filter(x => x.t !== 'w')];
      });
      closeSheet(); toast(`${list.length} warm-up ${list.length === 1 ? 'set' : 'sets'} added`);
    };
    return html`
      <${SheetHead} title="Warm-up" />
      <div class="field"><label for="wu-top">Top working weight (${unit})</label>
        <input id="wu-top" class="input num" style="height:56px;font-size:24px;text-align:center" inputmode="decimal" value=${val} onInput=${e => setVal(e.target.value)} /></div>
      ${top ? list.length ? html`<div class="list">${list.map((w, i) => html`<div class="row">
          <span class="set-type w" style="width:30px">W${i + 1}</span>
          <div class="grow"><div class="title num">${fmtNum(w.shown, 1)} ${unit} × ${w.reps}</div>${bar != null ? html`<div class="sub">${perSide(w.shown)}</div>` : null}</div>
        </div>`)}</div>
        <p class="tiny muted" style="margin:0">Rest about a minute between warm-ups. They don't count toward your volume or records.</p>
        <button class="btn primary block" onClick=${add}>Add to workout</button>`
        : html`<div class="card small text-2">That's light enough to start with your working sets.</div>` : null}`;
  }
  openSheet(() => html`<${Body} />`);
}

function entryMenu(en, idx, ex, restSec) {
  function Body() {
    const [note, setNote] = useState(en.note || '');
    const [rest, setRest] = useState(restSec);
    const list = store.get().active.entries;
    const n = list.length;
    const gp = groupPos(list, idx);
    const nextIn = gp && !gp.last;
    const move = d => { editActive(a => { const j = idx + d; if (j < 0 || j >= a.entries.length) return; const [e] = a.entries.splice(idx, 1); a.entries.splice(j, 0, e); }); closeSheet(); };
    return html`
      <${SheetHead} title=${ex.name} />
      <div class="field"><label for="en-note">Note for this exercise</label>
        <input id="en-note" class="input" placeholder="Seat height, grip, cues…" value=${note} onInput=${e => setNote(e.target.value)} /></div>
      <div class="field"><label>Rest timer</label>
        <div class="hstack">
          <button class="icon-btn" style="background:var(--surface-2)" aria-label="Less rest" onClick=${() => setRest(Math.max(0, rest - 15))}><${Icon} name="minus" /></button>
          <div class="num grow" style="text-align:center;font-size:22px;font-weight:600">${rest ? fmtDur(rest) : 'Off'}</div>
          <button class="icon-btn" style="background:var(--surface-2)" aria-label="More rest" onClick=${() => setRest(rest + 15)}><${Icon} name="plus" /></button>
        </div></div>
      <button class="btn primary block" onClick=${() => { editActive(a => { const e = a.entries.find(x => x.id === en.id); e.note = note; e.rest = rest; }); closeSheet(); }}>Save</button>
      <div class="grid2">
        <button class="btn" disabled=${idx === 0} onClick=${() => move(-1)}><${Icon} name="up" size=${18} /> Move up</button>
        <button class="btn" disabled=${idx === n - 1} onClick=${() => move(1)}><${Icon} name="down" size=${18} /> Move down</button>
      </div>
      ${idx < n - 1 && !nextIn ? html`<button class="btn block" onClick=${() => { editActive(a => supersetWithNext(a.entries, idx)); closeSheet(); toast('Superset made'); }}><${Icon} name="swap" size=${18} /> Superset with next exercise</button>` : null}
      ${gp ? html`<button class="btn block" onClick=${() => { editActive(a => leaveSuperset(a.entries, idx)); closeSheet(); }}>Remove from superset</button>` : null}
      <button class="btn block" onClick=${() => { closeSheet(); pickExercise(exId => editActive(a => { const e = a.entries.find(x => x.id === en.id); e.exId = exId; e.sets.forEach(s => { if (!s.done) { s.av = s.bv = null; s.kg = s.reps = s.sec = s.km = null; } }); }), { title: 'Replace with' }); }}><${Icon} name="swap" size=${18} /> Replace exercise</button>
      <button class="btn block danger" onClick=${() => { editActive(a => { a.entries = a.entries.filter(x => x.id !== en.id); }); closeSheet(); }}><${Icon} name="trash" size=${18} /> Remove from workout</button>`;
  }
  openSheet(() => html`<${Body} />`);
}

// ---------- rest timer bar ----------
let audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
    o.start(); o.stop(audioCtx.currentTime + 0.4);
  } catch (e) {}
}

export function RestBar({ state }) {
  useTick(500);
  const r = state.active && state.active.rest;
  const left = r ? (r.until - Date.now()) / 1000 : 0;
  const due = !!r && left <= 0 && !r.alerted;
  const stale = !!r && left < -60;
  useEffect(() => {
    if (due) {
      beep();
      try { navigator.vibrate && navigator.vibrate([120, 80, 120]); } catch (e) {}
      editActive(a => { if (a.rest) a.rest.alerted = true; });
    }
    if (stale) editActive(a => { a.rest = null; });
  }, [due, stale]);
  if (!r || stale) return null;
  const pct = Math.max(0, Math.min(100, (left / r.total) * 100));
  const adj = d => editActive(a => { if (a.rest) { a.rest.until += d * 1000; a.rest.total = Math.max(a.rest.total + d, 1); a.rest.alerted = false; } });
  return html`<div class=${'restbar' + (left <= 0 ? ' over' : '')} role="timer" aria-live="off">
    <div class="restbar-in">
      <span class="muted"><${Icon} name="timer" size=${20} /></span>
      <span class="time num">${left > 0 ? fmtDur(Math.ceil(left)) : '+' + fmtDur(-left)}</span>
      <span class="small muted grow">${left > 0 ? 'Rest' : 'Rest done, next set'}</span>
      <button class="btn sm" onClick=${() => adj(-15)}>−15</button>
      <button class="btn sm" onClick=${() => adj(15)}>+15</button>
      <button class="btn sm" onClick=${() => editActive(a => { a.rest = null; })}>Skip</button>
      <div class="prog" style=${`width:${pct}%`}></div>
    </div>
  </div>`;
}

// ---------- summary ----------
export function Summary({ state, params }) {
  const wo = state.workouts.find(x => x.id === params.id);
  if (!wo) return html`<${TopBar} title="Workout" back=${true} /><div class="page"><div class="card empty">Workout not found.</div></div>`;
  const exm = A.exMap(state);
  const st = A.workoutStats(wo, exm);
  const prs = A.prEvents(state).filter(e => e.workoutId === wo.id && e.kind !== 'vol');
  const unit = state.settings.unit;
  const wk = A.weeks(state, 1)[0];
  return html`
    <div class="page" style="padding-top:calc(env(safe-area-inset-top,0px) + 28px)">
      <div class="stack" style="gap:6px">
        <span class="eyebrow">Workout complete</span>
        <h1 class="h-xl">${wo.name}</h1>
        <span class="muted">Session ${wk.sessions} of ${state.settings.weeklyGoal} this week</span>
      </div>
      <div class="summary-grid">
        <div class="stat"><span class="eyebrow">Time</span><span class="mid">${fmtMins(st.duration)}</span></div>
        <div class="stat"><span class="eyebrow">Sets</span><span class="mid">${st.sets}</span></div>
        <div class="stat"><span class="eyebrow">Volume</span><span class="mid">${fmtBig(toUnit(st.volume, unit))}</span></div>
      </div>
      ${prs.length ? html`
        <div class="card stack" style="border-color:color-mix(in srgb,var(--accent) 40%,var(--line))">
          <div class="hstack"><span style="color:var(--accent)"><${Icon} name="trophy" /></span><span class="h-md">${prs.length} new ${prs.length === 1 ? 'record' : 'records'}</span></div>
          <div class="kv">${prs.map(p => html`<span class="small text-2">${(exm.get(p.exId) || {}).name} · ${A.PR_LABEL[p.kind]}</span><span class="num small" style="font-weight:600">${prValue(p, state)}</span>`)}</div>
        </div>` : html`<div class="card small text-2">No new records this time. Consistency is what moves the trend lines.</div>`}
      <${WorkoutSets} wo=${wo} state=${state} />
      <button class="btn primary block" onClick=${() => nav.tab('today')}>Done</button>
    </div>`;
}

export function WorkoutSets({ wo, state }) {
  const exm = A.exMap(state);
  const prs = A.prEvents(state).filter(e => e.workoutId === wo.id && e.kind !== 'vol');
  return html`<div class="list">${wo.entries.map(en => {
    const ex = exm.get(en.exId) || { name: 'Exercise', type: 'weight' };
    const exPr = prs.filter(p => p.exId === en.exId);
    return html`<button class="row" style="align-items:flex-start" onClick=${() => nav.go('exercise', { id: en.exId })}>
      <${ExThumb} ex=${ex} size=${36} />
      <div class="grow">
        <div class="title">${ex.name}${exPr.length ? html`<span class="pill accent pr-flag">PR</span>` : null}</div>
        <div class="sub" style="white-space:normal">${en.sets.map(s => (s.t !== 'n' ? s.t.toUpperCase() + ' ' : '') + prevText(s, ex, state.settings) + (typeof s.rir === 'number' ? ` @${s.rir >= 4 ? '4+' : s.rir}` : '')).join('  ·  ')}</div>
        ${en.note ? html`<div class="tiny muted" style="margin-top:4px">${en.note}</div>` : null}
      </div>
    </button>`;
  })}</div>`;
}
