// Train tab: routines, templates, history, exercise pages.

import { html, useState } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import * as A from '../lib/analytics.js';
import { TEMPLATES, MUSCLES } from '../lib/exercises.js';
import { Icon, nav, TopBar, openSheet, closeSheet, SheetHead, confirmSheet, toast } from '../lib/ui.js';
import { fmtRel, fmtDate, fmtDateY, fmtMins, fmtBig, toUnit, fmtTime, fmtDur } from '../lib/util.js';
import { startWorkout, WorkoutSets } from './workout.js';
import { pickExercise, editExercise, TYPE_LABEL } from './picker.js';
import { LiftDetail } from '../lib/cards.js';

export function addTemplate(t) {
  store.update(st => {
    for (const d of t.days) st.routines.push({ id: store.uid(), name: d.name, items: d.items.map(i => ({ ...i })) });
  });
}

export function Train({ state }) {
  const exm = A.exMap(state);
  const hist = A.finished(state).slice().reverse();
  const next = A.nextRoutine(state);
  const unit = state.settings.unit;
  return html`
    <${TopBar} title="Train" right=${html`<button class="btn sm" onClick=${() => nav.go('library')}>Exercises</button>`} />
    <div class="page">
      ${state.active ? html`<button class="card tap hstack" onClick=${() => nav.go('workout')} style="border-color:var(--accent)">
        <span style="color:var(--accent)"><${Icon} name="play" /></span>
        <div class="grow"><div class="h-md">Resume ${state.active.name}</div><div class="small muted">Started ${fmtTime(state.active.start)}</div></div>
        <span class="chev"><${Icon} name="chev" /></span></button>` : null}
      <div class="grid2">
        <button class="btn primary" onClick=${() => startWorkout(next)} disabled=${!next || !!state.active}><${Icon} name="play" size=${18} /> ${next ? next.name : 'No routine'}</button>
        <button class="btn" onClick=${() => startWorkout(null)} disabled=${!!state.active}>Empty workout</button>
      </div>

      <div class="section-head"><span class="h-md">Routines</span><button class="link-btn" onClick=${() => newRoutine()}>New routine</button></div>
      ${state.routines.length ? html`<div class="list">${state.routines.map((r, i) => html`<div class="row">
          <button class="grow" style="background:none;border:0;text-align:left;padding:0;min-width:0" onClick=${() => nav.go('routine', { id: r.id })}>
            <div class="title">${r.name}${next && next.id === r.id ? html` <span class="pill accent">Up next</span>` : null}</div>
            <div class="sub">${r.items.map(it => (exm.get(it.exId) || {}).name).filter(Boolean).join(', ') || 'No exercises yet'}</div>
          </button>
          <button class="icon-btn" aria-label=${'Start ' + r.name} disabled=${!!state.active} onClick=${() => startWorkout(r)} style="color:var(--accent)"><${Icon} name="play" /></button>
        </div>`)}</div>`
        : html`<div class="card empty"><span class="h-md">No routines yet</span><span class="small">Start from a template below, or build your own.</span></div>`}

      <div class="section-head"><span class="h-md">Templates</span></div>
      <div class="list">${TEMPLATES.map(t => html`<button class="row" onClick=${() => confirmSheet({ title: `Add ${t.name}?`, body: `Adds ${t.days.length} routines: ${t.days.map(d => d.name).join(', ')}. You can edit or delete any of them.`, confirm: 'Add routines', danger: false, onConfirm: () => { addTemplate(t); toast(`Added ${t.days.length} routines`); } })}>
        <div class="grow"><div class="title">${t.name}</div><div class="sub">${t.blurb}</div></div><span class="chev"><${Icon} name="plus" size=${18} /></span>
      </button>`)}</div>

      <div class="section-head"><span class="h-md">History</span><span class="small muted">${hist.length} workouts</span></div>
      ${hist.length ? html`<div class="list">${hist.slice(0, 40).map(wo => {
        const st = A.workoutStats(wo, exm);
        return html`<button class="row" onClick=${() => nav.go('workoutView', { id: wo.id })}>
          <div class="grow"><div class="title">${wo.name}</div><div class="sub">${fmtRel(wo.start)} · ${fmtMins(st.duration)} · ${st.sets} sets${st.volume ? ` · ${fmtBig(toUnit(st.volume, unit))} ${unit}` : ''}</div></div>
          <span class="chev"><${Icon} name="chev" size=${18} /></span></button>`;
      })}</div>` : html`<div class="card empty small">Finished workouts show up here.</div>`}
    </div>`;
}

function newRoutine() {
  const id = store.uid();
  store.update(st => { st.routines.push({ id, name: 'New routine', items: [] }); });
  nav.go('routine', { id, isNew: true });
}

export function RoutineEdit({ state, params }) {
  const r = state.routines.find(x => x.id === params.id);
  if (!r) return html`<${TopBar} title="Routine" back=${true} /><div class="page"><div class="card empty">This routine was deleted.</div></div>`;
  const exm = A.exMap(state);
  const edit = fn => store.update(st => { const x = st.routines.find(y => y.id === r.id); x && fn(x, st); });
  const rest = state.settings.restDefault;
  return html`
    <${TopBar} title=${r.name || 'Routine'} back=${true} right=${html`<button class="btn sm primary" disabled=${!r.items.length || !!state.active} onClick=${() => startWorkout(r)}>Start</button>`} />
    <div class="page">
      <div class="field"><label for="rt-name">Routine name</label>
        <input id="rt-name" class="input" value=${r.name} onInput=${e => edit(x => { x.name = e.target.value; })} /></div>
      <div class="list">
        ${r.items.map((it, i) => {
          const ex = exm.get(it.exId) || { name: 'Unknown', type: 'weight' };
          const repsLabel = ex.type === 'time' ? 'sec' : ex.type === 'cardio' ? '' : ex.type === 'sprint' ? '' : 'reps';
          return html`<div class="row" style="flex-wrap:wrap;row-gap:8px">
            <div class="grow" style="min-width:140px"><div class="title">${ex.name}</div><div class="sub">${ex.muscle} · rest ${fmtDur(it.rest ?? ex.rest ?? rest)}</div></div>
            <div class="hstack" style="gap:6px">
              <${Mini} label="sets" value=${it.sets} onChange=${v => edit(x => { x.items[i].sets = Math.max(1, Math.min(20, v)); })} />
              ${repsLabel ? html`<${Mini} label=${repsLabel} value=${it.reps} step=${ex.type === 'time' ? 15 : 1} onChange=${v => edit(x => { x.items[i].reps = Math.max(1, v); })} />` : null}
              <button class="icon-btn" aria-label="More" onClick=${() => itemMenu(r, i, edit)}><${Icon} name="more" /></button>
            </div>
          </div>`;
        })}
        ${!r.items.length ? html`<div class="empty small">Add the exercises for this day.</div>` : null}
      </div>
      <button class="btn block" onClick=${() => pickExercise(exId => { const ex = exm.get(exId); edit(x => { x.items.push({ exId, sets: ex && (ex.type === 'cardio') ? 1 : 3, reps: ex && ex.type === 'time' ? 45 : 10 }); }); })}><${Icon} name="plus" size=${18} /> Add exercise</button>
      <button class="btn ghost danger block" onClick=${() => confirmSheet({ title: 'Delete routine?', body: 'Your past workouts stay in your history.', onConfirm: () => { store.update(st => { st.routines = st.routines.filter(y => y.id !== r.id); }); nav.back(); toast('Routine deleted'); } })}>Delete routine</button>
    </div>`;
}

function Mini({ label, value, onChange, step = 1 }) {
  return html`<div class="hstack" style="gap:2px;background:var(--surface-2);border-radius:10px;padding:2px">
    <button class="icon-btn" style="width:28px;height:30px" aria-label=${'Fewer ' + label} onClick=${() => onChange(value - step)}><${Icon} name="minus" size=${16} /></button>
    <div style="text-align:center;min-width:38px;line-height:1.05"><div class="num" style="font-weight:600">${value}</div><div class="tiny muted" style="font-size:10px">${label}</div></div>
    <button class="icon-btn" style="width:28px;height:30px" aria-label=${'More ' + label} onClick=${() => onChange(value + step)}><${Icon} name="plus" size=${16} /></button>
  </div>`;
}

function itemMenu(r, i, edit) {
  const it = r.items[i];
  openSheet(() => html`
    <${SheetHead} title="Exercise" />
    <div class="grid2">
      <button class="btn" disabled=${i === 0} onClick=${() => { edit(x => { const [e] = x.items.splice(i, 1); x.items.splice(i - 1, 0, e); }); closeSheet(); }}><${Icon} name="up" size=${18} /> Move up</button>
      <button class="btn" disabled=${i === r.items.length - 1} onClick=${() => { edit(x => { const [e] = x.items.splice(i, 1); x.items.splice(i + 1, 0, e); }); closeSheet(); }}><${Icon} name="down" size=${18} /> Move down</button>
    </div>
    <div class="field"><label>Rest timer for this routine</label>
      <div class="chips">${[0, 60, 90, 120, 150, 180, 240].map(s => html`<button class="chip" aria-pressed=${it.rest === s} onClick=${() => { edit(x => { x.items[i].rest = s; }); closeSheet(); }}>${s ? fmtDur(s) : 'Off'}</button>`)}</div></div>
    <button class="btn block" onClick=${() => { closeSheet(); pickExercise(exId => edit(x => { x.items[i].exId = exId; }), { title: 'Replace with' }); }}><${Icon} name="swap" size=${18} /> Replace</button>
    <button class="btn block danger" onClick=${() => { edit(x => { x.items.splice(i, 1); }); closeSheet(); }}><${Icon} name="trash" size=${18} /> Remove</button>`);
}

export function WorkoutView({ state, params }) {
  const wo = state.workouts.find(x => x.id === params.id);
  if (!wo) return html`<${TopBar} title="Workout" back=${true} /><div class="page"><div class="card empty">Workout not found.</div></div>`;
  const st = A.workoutStats(wo, A.exMap(state));
  const unit = state.settings.unit;
  return html`
    <${TopBar} title=${wo.name} back=${true} />
    <div class="page">
      <div class="small muted">${fmtDateY(wo.start)} · ${fmtTime(wo.start)}</div>
      <div class="summary-grid">
        <div class="stat"><span class="eyebrow">Time</span><span class="mid">${fmtMins(st.duration)}</span></div>
        <div class="stat"><span class="eyebrow">Sets</span><span class="mid">${st.sets}</span></div>
        <div class="stat"><span class="eyebrow">Volume</span><span class="mid">${fmtBig(toUnit(st.volume, unit))}</span></div>
      </div>
      ${wo.notes ? html`<div class="card small text-2">${wo.notes}</div>` : null}
      <${WorkoutSets} wo=${wo} state=${state} />
      <button class="btn ghost danger block" onClick=${() => confirmSheet({ title: 'Delete this workout?', body: 'It will be removed from your history and stats.', onConfirm: () => { store.update(s => { s.workouts = s.workouts.filter(x => x.id !== wo.id); }); nav.back(); toast('Workout deleted'); } })}>Delete workout</button>
    </div>`;
}

export function ExerciseScreen({ state, params }) {
  const ex = A.exMap(state).get(params.id);
  if (!ex) return html`<${TopBar} title="Exercise" back=${true} /><div class="page"><div class="card empty">Exercise not found.</div></div>`;
  const h = A.exerciseHistory(state, ex.id);
  return html`
    <${TopBar} title=${ex.name} back=${true} right=${html`<button class="btn sm" onClick=${() => editExercise(ex)}>Edit</button>`} />
    <div class="page">
      <div class="hstack wrap" style="gap:6px"><span class="pill">${ex.muscle}</span><span class="pill">${ex.equip}</span><span class="pill">${TYPE_LABEL[ex.type]}</span>${ex.custom ? html`<span class="pill accent">Custom</span>` : null}</div>
      ${ex.type === 'weight' ? html`<${LiftDetail} state=${state} exId=${ex.id} />` : html`
        <div class="list">${h.slice().reverse().map(p => html`<button class="row" onClick=${() => nav.go('workoutView', { id: p.workoutId })}>
          <div class="grow"><div class="title">${fmtRel(p.date)}</div><div class="sub">${p.sets} sets${p.maxReps ? ` · best ${p.maxReps} reps` : ''}${p.sprint ? ` · fastest ${p.sprint}s` : ''}${p.km ? ` · ${p.km.toFixed(2)} km` : ''}</div></div>
          <span class="chev"><${Icon} name="chev" size=${18} /></span></button>`)}
          ${!h.length ? html`<div class="empty small">Not logged yet.</div>` : null}</div>`}
    </div>`;
}

export function Library({ state }) {
  const [q, setQ] = useState('');
  const [m, setM] = useState('All');
  const ql = q.trim().toLowerCase();
  const counts = new Map();
  for (const w of A.finished(state)) for (const e of w.entries) counts.set(e.exId, (counts.get(e.exId) || 0) + 1);
  const list = state.exercises.filter(e => (m === 'All' || e.muscle === m) && (!ql || e.name.toLowerCase().includes(ql))).sort((a, b) => a.name.localeCompare(b.name));
  return html`
    <${TopBar} title="Exercises" back=${true} right=${html`<button class="btn sm primary" onClick=${() => editExercise(null)}>New</button>`} />
    <div class="page">
      <input id="lib-search" class="input" placeholder="Search ${state.exercises.length} exercises" value=${q} onInput=${e => setQ(e.target.value)} />
      <div class="chips">${['All', ...MUSCLES].map(x => html`<button class="chip" aria-pressed=${m === x} onClick=${() => setM(x)}>${x}</button>`)}</div>
      <div class="list">${list.map(e => html`<button class="row" onClick=${() => nav.go('exercise', { id: e.id })}>
        <div class="grow"><div class="title">${e.name}</div><div class="sub">${e.muscle} · ${e.equip}${e.custom ? ' · custom' : ''}</div></div>
        ${counts.get(e.id) ? html`<span class="small muted num">${counts.get(e.id)}×</span>` : null}
        <span class="chev"><${Icon} name="chev" size=${18} /></span></button>`)}</div>
    </div>`;
}
