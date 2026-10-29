// Train tab: routines, history, exercise pages.

import { html, useState } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import * as A from '../lib/analytics.js';
import { MUSCLES, EQUIPMENT } from '../lib/exercises.js';
import { howtoFor } from '../lib/howto.js';
import { ExPhoto, mediaFor, PHOTO_CREDIT } from '../lib/photo.js';
import { Icon, nav, TopBar, openSheet, closeSheet, SheetHead, confirmSheet, toast } from '../lib/ui.js';
import { fmtRel, fmtDate, fmtDateY, fmtMins, fmtBig, toUnit, fmtTime, fmtDur, fmtNum, w, toDist } from '../lib/util.js';
import { ExThumb } from '../lib/photo.js';
import { startWorkout, WorkoutSets, prevText, tidyGroups, supersetWithNext, leaveSuperset, groupPos } from './workout.js';
import { pickExercise, editExercise, TYPE_LABEL } from './picker.js';
import { Seg } from '../lib/ui.js';
import { LiftDetail } from '../lib/cards.js';

export function Train({ state }) {
  const exm = A.exMap(state);
  const hist = A.finished(state).slice().reverse();
  const next = A.nextRoutine(state);
  const sched = A.hasSchedule(state);
  // On a scheduled rest day the main button offers the next scheduled routine instead.
  const up = next || (sched ? (A.nextScheduled(state) || {}).routine : null);
  const unit = state.settings.unit;
  return html`
    <${TopBar} mode=${state.settings.mode} title="Train" right=${html`<button class="btn sm" onClick=${() => nav.go('library')}>Exercises</button>`} />
    <div class="page">
      ${state.active ? html`<button class="card tap hstack" onClick=${() => nav.go('workout')} style="border-color:var(--accent)">
        <span style="color:var(--accent)"><${Icon} name="play" /></span>
        <div class="grow"><div class="h-md">Resume ${state.active.name}</div><div class="small muted">Started ${fmtTime(state.active.start)}</div></div>
        <span class="chev"><${Icon} name="chev" /></span></button>` : null}
      <div class="grid2">
        <button class="btn primary" onClick=${() => startWorkout(up)} disabled=${!up}><${Icon} name="play" size=${18} /> ${up ? up.name : 'No routine'}</button>
        <button class="btn" onClick=${() => startWorkout(null)}>Empty workout</button>
      </div>

      ${state.routines.length ? html`<${WeekPlan} state=${state} />` : null}

      <div class="section-head"><span class="h-md">Routines</span><button class="link-btn" onClick=${() => newRoutine()}>New routine</button></div>
      ${state.routines.length ? html`<div class="list">${state.routines.map((r, i) => html`<div class="row">
          <button class="grow" style="background:none;border:0;text-align:left;padding:0;min-width:0" onClick=${() => nav.go('routine', { id: r.id })}>
            <div class="title">${r.name}${next && next.id === r.id ? html` <span class="pill accent">${sched ? 'Today' : 'Up next'}</span>` : null}</div>
            <div class="sub">${r.items.map(it => (exm.get(it.exId) || {}).name).filter(Boolean).join(', ') || 'No exercises yet'}</div>
          </button>
          <button class="icon-btn" aria-label=${'Start ' + r.name} disabled=${!r.items.length} onClick=${() => startWorkout(r)} style="color:var(--accent)"><${Icon} name="play" /></button>
        </div>`)}</div>`
        : html`<div class="card empty"><span class="h-md">No routines yet</span><span class="small">A routine is one workout day, like "Push" or "Legs". Make one for each day of your split.</span><button class="btn primary" onClick=${() => newRoutine()}><${Icon} name="plus" size=${18} /> Create your first routine</button></div>`}
      ${state.routines.length ? html`<p class="tiny muted" style="margin:0">${sched ? 'Tap a routine to edit it, or ▶ to start. Tap a day above to change your week.' : 'Tap a routine to edit it, or ▶ to start. "Up next" goes through your routines in order until you set a weekly schedule.'}</p>` : null}

      <div class="section-head"><span class="h-md">History</span><span class="small muted">${hist.length} workouts</span></div>
      ${hist.length ? html`<div class="list">${hist.slice(0, 40).map(wo => {
        const st = A.workoutStats(wo, exm);
        return html`<button class="row" onClick=${() => nav.go('workoutView', { id: wo.id })}>
          <div class="grow"><div class="title">${wo.name}</div><div class="sub">${fmtRel(wo.start)} · ${fmtMins(st.duration)} · ${st.sets} sets${st.volume ? ` · ${fmtBig(toUnit(st.volume, unit))} ${unit}` : ''}</div></div>
          <span class="chev"><${Icon} name="chev" size=${18} /></span></button>`;
      })}</div>` : html`<div class="card empty small">Finished workouts show up here.</div>`}
    </div>`;
}

// ---------- weekly schedule ----------
export const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const weekOrder = state => state.settings.weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];

// Assign a routine (or null for rest) to a weekday. Food mode's training days follow the schedule.
export function setDay(d, routineId) {
  store.update(st => {
    st.schedule = st.schedule || {};
    if (routineId) st.schedule[d] = routineId; else delete st.schedule[d];
    const days = Object.keys(st.schedule).map(Number).filter(k => st.routines.some(r => r.id === st.schedule[k]));
    if (days.length) st.food.trainDays = days.sort();
  });
}

function dayMenu(d) {
  function Body() {
    const st = store.get();
    const cur = A.scheduled(st, d);
    const pick = id => { setDay(d, id); closeSheet(); };
    return html`
      <${SheetHead} title=${WD_LONG[d]} />
      <div class="list">
        ${st.routines.map(r => html`<button class="row" onClick=${() => pick(r.id)}>
          <div class="grow"><div class="title">${r.name}</div><div class="sub">${r.items.length} exercises</div></div>
          ${cur && cur.id === r.id ? html`<span style="color:var(--accent)"><${Icon} name="check" /></span>` : null}</button>`)}
        <button class="row" onClick=${() => pick(null)}>
          <div class="grow"><div class="title">Rest day</div></div>
          ${!cur ? html`<span style="color:var(--accent)"><${Icon} name="check" /></span>` : null}</button>
      </div>
      <p class="tiny muted" style="margin:0">Food mode uses these days for your training-day targets.</p>`;
  }
  openSheet(() => html`<${Body} />`);
}

function WeekPlan({ state }) {
  const today = new Date().getDay();
  const sched = A.hasSchedule(state);
  return html`
    <div class="section-head"><span class="h-md">This week</span>${sched ? html`<button class="link-btn" onClick=${() => store.update(st => { st.schedule = {}; })}>Clear</button>` : null}</div>
    <div class="sched" role="group" aria-label="Weekly schedule">
      ${weekOrder(state).map(d => {
        const r = A.scheduled(state, d);
        return html`<button class=${'sched-day' + (d === today ? ' today' : '') + (r ? ' on' : '')} aria-label=${`${WD_LONG[d]}: ${r ? r.name : 'rest'}`} onClick=${() => dayMenu(d)}>
          <span class="sched-wd">${WD[d].slice(0, 1)}</span><span class="sched-r">${r ? r.name : sched ? 'Rest' : '+'}</span></button>`;
      })}
    </div>
    ${!sched ? html`<p class="tiny muted" style="margin:0">Tap a day to plan your split. Without a schedule, Tally just rotates through your routines.</p>` : null}`;
}

export function newRoutine() {
  const id = store.uid();
  store.update(st => { st.routines.push({ id, name: 'New routine', items: [] }); });
  nav.go('routine', { id, isNew: true });
}

export function RoutineEdit({ state, params }) {
  const r = state.routines.find(x => x.id === params.id);
  if (!r) return html`<${TopBar} title="Routine" back=${true} /><div class="page"><div class="card empty">This routine was deleted.</div></div>`;
  const exm = A.exMap(state);
  const edit = fn => store.update(st => { const x = st.routines.find(y => y.id === r.id); if (x) { fn(x, st); tidyGroups(x.items); } });
  const rest = state.settings.restDefault;
  return html`
    <${TopBar} title=${r.name || 'Routine'} back=${true} right=${html`<button class="btn sm primary" disabled=${!r.items.length} onClick=${() => startWorkout(r)}>Start</button>`} />
    <div class="page">
      <div class="field"><label for="rt-name">Routine name</label>
        <input id="rt-name" class="input" value=${r.name} onInput=${e => edit(x => { x.name = e.target.value; })} /></div>
      <div class="field"><label>Days</label>
        <div class="wk">${weekOrder(state).map(d => { const on = (state.schedule || {})[d] === r.id; return html`<button aria-pressed=${on} aria-label=${WD_LONG[d]} onClick=${() => setDay(d, on ? null : r.id)}>${WD[d]}</button>`; })}</div></div>
      <div class="stack" style="gap:10px">
        ${r.items.map((it, i) => {
          const ex = exm.get(it.exId) || { name: 'Unknown', type: 'weight' };
          const repsLabel = ex.type === 'time' ? 'Seconds' : ex.type === 'cardio' || ex.type === 'sprint' ? '' : 'Reps';
          const step = ex.type === 'time' ? 15 : 1;
          const gp = groupPos(r.items, i);
          const per = Array.isArray(it.setReps);
          const setSets = v => edit(x => { const t = x.items[i]; t.sets = Math.max(1, Math.min(20, v)); if (Array.isArray(t.setReps)) { const last = t.setReps[t.setReps.length - 1] ?? t.reps; t.setReps = Array.from({ length: t.sets }, (_, k) => t.setReps[k] ?? last); } });
          return html`<div class=${'card rt-item' + (gp ? ' ss' + (gp.first ? ' ss-first' : '') + (gp.last ? ' ss-last' : '') : '')}>
            ${gp && gp.first ? html`<div class="ss-label" style="padding:0 0 8px"><${Icon} name="swap" size=${14} /> Superset · rest after the last</div>` : null}
            <div class="rt-top">
              <button class="ex-link" onClick=${() => nav.go('exercise', { id: it.exId })}><${ExThumb} ex=${ex} size=${40} />
                <span class="rt-name"><span class="title">${ex.name}</span><span class="sub">${ex.muscle} · rest ${fmtDur(it.rest ?? ex.rest ?? rest)}</span></span></button>
              <button class="icon-btn" aria-label=${'Options for ' + ex.name} onClick=${() => itemMenu(r, i, edit)}><${Icon} name="more" /></button>
            </div>
            <div class="rt-steps">
              <${Mini} label="Sets" value=${it.sets} onChange=${setSets} />
              ${repsLabel && !per ? html`<${Mini} label=${repsLabel} value=${it.reps} step=${step} onChange=${v => edit(x => { x.items[i].reps = Math.max(1, v); })} />` : null}
            </div>
            ${repsLabel && per ? html`<div class="rt-per">${it.setReps.map((v, k) => html`<label class="rt-set"><span class="tiny muted">Set ${k + 1}</span>
              <input class="cell" inputmode="numeric" aria-label=${`Set ${k + 1} ${repsLabel.toLowerCase()}`} value=${v ?? ''} onChange=${e => { const n = parseInt(e.target.value); edit(x => { x.items[i].setReps[k] = n > 0 ? n : x.items[i].reps; }); }} /></label>`)}</div>` : null}
            ${repsLabel ? html`<button class="link-btn tiny rt-toggle" onClick=${() => edit(x => { const t = x.items[i]; if (Array.isArray(t.setReps)) { t.reps = t.setReps[0] ?? t.reps; delete t.setReps; } else t.setReps = Array.from({ length: t.sets }, () => t.reps); })}>${per ? `Same ${repsLabel.toLowerCase()} every set` : `Different ${repsLabel.toLowerCase()} per set`}</button>` : null}
          </div>`;
        })}
        ${!r.items.length ? html`<div class="card empty small">Add the exercises for this day.</div>` : null}
      </div>
      <button class="btn block" onClick=${() => pickExercise(exId => { const ex = exm.get(exId); edit(x => { x.items.push({ exId, sets: ex && (ex.type === 'cardio') ? 1 : 3, reps: ex && ex.type === 'time' ? 45 : 10 }); }); })}><${Icon} name="plus" size=${18} /> Add exercise</button>
      <button class="btn ghost danger block" onClick=${() => confirmSheet({ title: 'Delete routine?', body: 'Your past workouts stay in your history.', onConfirm: () => { store.update(st => { st.routines = st.routines.filter(y => y.id !== r.id); }); nav.back(); toast('Routine deleted'); } })}>Delete routine</button>
    </div>`;
}

function Mini({ label, value, onChange, step = 1 }) {
  return html`<div class="mini">
    <span class="tiny muted">${label}</span>
    <div class="mini-in">
      <button class="icon-btn" aria-label=${'Fewer ' + label.toLowerCase()} onClick=${() => onChange(value - step)}><${Icon} name="minus" size=${18} /></button>
      <span class="num">${value}</span>
      <button class="icon-btn" aria-label=${'More ' + label.toLowerCase()} onClick=${() => onChange(value + step)}><${Icon} name="plus" size=${18} /></button>
    </div>
  </div>`;
}

function itemMenu(r, i, edit) {
  const it = r.items[i];
  const gp = groupPos(r.items, i);
  openSheet(() => html`
    <${SheetHead} title="Exercise" />
    <div class="grid2">
      <button class="btn" disabled=${i === 0} onClick=${() => { edit(x => { const [e] = x.items.splice(i, 1); x.items.splice(i - 1, 0, e); }); closeSheet(); }}><${Icon} name="up" size=${18} /> Move up</button>
      <button class="btn" disabled=${i === r.items.length - 1} onClick=${() => { edit(x => { const [e] = x.items.splice(i, 1); x.items.splice(i + 1, 0, e); }); closeSheet(); }}><${Icon} name="down" size=${18} /> Move down</button>
    </div>
    <div class="field"><label>Rest timer for this routine</label>
      <div class="chips">${[0, 60, 90, 120, 150, 180, 240].map(s => html`<button class="chip" aria-pressed=${it.rest === s} onClick=${() => { edit(x => { x.items[i].rest = s; }); closeSheet(); }}>${s ? fmtDur(s) : 'Off'}</button>`)}</div></div>
    ${i < r.items.length - 1 && !(gp && !gp.last) ? html`<button class="btn block" onClick=${() => { edit(x => supersetWithNext(x.items, i)); closeSheet(); }}><${Icon} name="swap" size=${18} /> Superset with next exercise</button>` : null}
    ${gp ? html`<button class="btn block" onClick=${() => { edit(x => leaveSuperset(x.items, i)); closeSheet(); }}>Remove from superset</button>` : null}
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
  const [tab, setTab] = useState('overview');
  if (!ex) return html`<${TopBar} title="Exercise" back=${true} /><div class="page"><div class="card empty">Exercise not found.</div></div>`;
  const h = A.exerciseHistory(state, ex.id);
  return html`
    <${TopBar} title=${ex.name} back=${true} right=${html`<button class="btn sm" onClick=${() => editExercise(ex)}>Edit</button>`} />
    <div class="page">
      <${ExPhoto} ex=${ex} />
      <div class="hstack wrap" style="gap:6px"><span class="pill accent">${ex.muscle}</span>${(ex.secondary || []).map(m => html`<span class="pill">${m}</span>`)}<span class="pill">${ex.equip}</span>${mediaFor(ex) && mediaFor(ex).level ? html`<span class="pill">${mediaFor(ex).level[0].toUpperCase() + mediaFor(ex).level.slice(1)}</span>` : null}${ex.custom ? html`<span class="pill">Custom</span>` : null}</div>
      <${Seg} label="Exercise sections" value=${tab} onChange=${setTab} options=${[['overview', 'Overview'], ['howto', 'How to'], ['history', `History (${h.length})`]]} />
      ${tab === 'overview' ? html`<${ExOverview} state=${state} ex=${ex} params=${params} />`
        : tab === 'howto' ? html`<${ExHowTo} state=${state} ex=${ex} />`
        : html`<${ExHistory} state=${state} ex=${ex} />`}
    </div>`;
}

function ExOverview({ state, ex, params }) {
  const unit = state.settings.unit, du = state.settings.distUnit;
  const a = state.active;
  const live = a && (a.entries.find(e => e.id === params.entry) || a.entries.find(e => e.exId === ex.id));
  const r = A.exerciseRecords(state, ex.id);
  const h = A.exerciseHistory(state, ex.id);
  const last = h[h.length - 1];
  const Rec = ({ label, value, sub, at }) => html`<button class="stat" style="border:0;text-align:left;color:inherit" disabled=${!at} onClick=${() => at && nav.go('workoutView', { id: at.workoutId })}>
    <span class="eyebrow">${label}</span><span class="mid">${value}</span><span class="tiny muted">${sub || (at ? fmtDate(at.date) : '')}</span></button>`;
  const isW = ex.type === 'weight' || ex.type === 'bw';
  return html`
    ${live ? html`<div class="card stack" style="border-color:color-mix(in srgb,var(--accent) 40%,var(--line))">
      <div class="hstack" style="justify-content:space-between"><span class="eyebrow">This workout · ${a.name}</span><span class="pill accent">Live</span></div>
      ${live.sets.filter(s => s.done).length ? html`<div class="kv small">${(() => { let n = 0; return live.sets.map(s => { if (s.t === 'n') n++; return s.done ? html`<span class="text-2">${s.t === 'n' ? 'Set ' + n : { w: 'Warm-up', d: 'Drop set', f: 'To failure' }[s.t]}</span><span class="num">${prevText(s, ex, state.settings)}</span>` : null; }); })()}</div>`
        : html`<span class="small text-2">No sets ticked yet.${last ? ` Last time: ${(A.lastSets(state, ex.id) || []).filter(s => s.t !== 'w').map(s => prevText(s, ex, state.settings)).join(', ')}` : ''}</span>`}
      <button class="btn sm" onClick=${() => nav.back()}>Back to workout</button>
    </div>` : null}

    ${!h.length ? html`<div class="card empty"><span class="h-md">No history yet</span><span class="small">Records and charts appear after your first session with this exercise. Check How to for form tips.</span></div>` : html`
      <div class="section-head" style="margin-top:0"><span class="h-md">Personal records</span><${Icon} name="trophy" size=${18} /></div>
      ${isW ? html`<div class="rec">
          ${ex.type === 'weight' ? html`<${Rec} label="Best est. 1RM" value=${r.e1rm ? `${w(r.e1rm.value, unit, 0)} ${unit}` : '–'} sub=${r.e1rm ? `${w(r.e1rm.kg, unit)} × ${r.e1rm.reps} · ${fmtDate(r.e1rm.date)}` : ''} at=${r.e1rm} />` : null}
          <${Rec} label=${ex.type === 'bw' ? 'Most added weight' : 'Heaviest'} value=${r.heaviest ? `${w(r.heaviest.value, unit)} ${unit}` : '–'} sub=${r.heaviest ? `× ${r.heaviest.reps} · ${fmtDate(r.heaviest.date)}` : ''} at=${r.heaviest} />
          <${Rec} label="Most reps" value=${r.mostReps ? `${r.mostReps.value}` : '–'} sub=${r.mostReps ? `${r.mostReps.kg ? '@ ' + w(r.mostReps.kg, unit) + ' ' + unit + ' · ' : ''}${fmtDate(r.mostReps.date)}` : ''} at=${r.mostReps} />
          ${ex.type === 'weight' ? html`<${Rec} label="Best set" value=${r.bestSet ? `${fmtBig(toUnit(r.bestSet.value, unit))} ${unit}` : '–'} sub=${r.bestSet ? `${w(r.bestSet.kg, unit)} × ${r.bestSet.reps}` : ''} at=${r.bestSet} />` : null}
          ${ex.type === 'weight' ? html`<${Rec} label="Best session" value=${r.bestSession ? `${fmtBig(toUnit(r.bestSession.value, unit))} ${unit}` : '–'} sub="total volume" at=${r.bestSession} />` : null}
        </div>
        ${ex.type === 'weight' && Object.keys(r.repMax).length ? html`<div class="card stack"><span class="eyebrow">Best weight for at least N reps (${unit})</span>
          <div class="reps-table">${A.REP_MAX.map(n => html`<div><span class="tiny muted">${n} RM</span><span class="num" style="font-weight:600">${r.repMax[n] ? w(r.repMax[n].value, unit) : '–'}</span></div>`)}</div></div>` : null}`
      : ex.type === 'time' ? html`<div class="rec"><${Rec} label="Longest hold" value=${r.hold ? fmtDur(r.hold.value) : '–'} at=${r.hold} /><${Rec} label="Sessions" value=${h.length} sub="all time" /></div>`
      : ex.type === 'cardio' ? html`<div class="rec">
          <${Rec} label="Longest" value=${r.longest ? `${fmtNum(toDist(r.longest.value, du), 2)} ${du}` : '–'} at=${r.longest} />
          <${Rec} label="Best pace" value=${r.pace ? `${fmtDur(r.pace.value * (du === 'mi' ? 1.609344 : 1))}/${du}` : '–'} at=${r.pace} />
          <${Rec} label="Longest time" value=${r.longestTime ? fmtDur(r.longestTime.value) : '–'} at=${r.longestTime} />
          <${Rec} label="Sessions" value=${h.length} sub="all time" />
        </div>`
      : html`<div class="rec">${Object.entries(r.sprints).sort((x, y) => +x[0] - +y[0]).map(([m, v]) => html`<${Rec} label=${`Fastest ${m} m`} value=${`${fmtNum(v.value, 2)} s`} at=${v} />`)}<${Rec} label="Sessions" value=${h.length} sub="all time" /></div>`}

      ${ex.type === 'weight' ? html`<${LiftDetail} state=${state} exId=${ex.id} chartOnly=${true} />` : null}
    `}
    <${MyNotes} ex=${ex} />`;
}

function MyNotes({ ex }) {
  const [v, setV] = useState(ex.notes || '');
  return html`<div class="field"><label for="ex-notes">My notes</label>
    <textarea id="ex-notes" class="input" placeholder="Seat height, grip, cues that work for you…" value=${v} onInput=${e => setV(e.target.value)}
      onBlur=${() => store.update(st => { let x = st.exercises.find(y => y.id === ex.id); if (!x) { x = { ...ex }; st.exercises.push(x); } x.notes = v; })}></textarea>
    <span class="tiny muted">Saved on this phone, shown whenever you open this exercise.</span></div>`;
}

function ExHowTo({ state, ex }) {
  const m = ex.rd ? ex : mediaFor(ex);
  const mine = ex.rd ? null : howtoFor(ex);
  const steps = ex.rd && ex.steps && ex.steps.length ? ex.steps : m && m.steps && m.steps.length ? m.steps : mine ? mine.steps : null;
  const tips = ex.rd ? (ex.tips || []) : mine && !mine.custom ? mine.tips : [];
  return html`
    <div class="card stack">
      <span class="eyebrow">Muscles worked</span>
      <div class="kv small">
        <span class="text-2">Main</span><span>${ex.muscle === 'Cardio' ? 'Heart and lungs, legs' : ex.muscle}</span>
        ${(ex.secondary || []).length ? html`<span class="text-2">Also works</span><span>${ex.secondary.join(', ')}</span>` : null}
        ${m && m.mechanic ? html`<span class="text-2">Type</span><span>${m.mechanic === 'compound' ? 'Compound (several joints)' : 'Isolation (one joint)'}</span>` : null}
        ${m && m.force ? html`<span class="text-2">Movement</span><span>${m.force[0].toUpperCase() + m.force.slice(1)}</span>` : null}
      </div>
    </div>
    ${ex.rd && ex.desc ? html`<div class="card small text-2">${ex.desc}</div>` : null}
    ${steps ? html`<div class="card stack"><span class="eyebrow">Steps</span><ol class="steps">${steps.map(t => html`<li>${t}</li>`)}</ol></div>` : null}
    ${tips.length ? html`<div class="card stack"><span class="eyebrow">Quick tips</span>${tips.map(t => html`<div class="hstack small" style="align-items:flex-start;gap:10px"><span style="color:var(--accent);margin-top:1px"><${Icon} name="bolt" size=${16} /></span><span class="text-2">${t}</span></div>`)}</div>` : null}
    ${!steps ? html`<div class="card empty small"><span class="h-md">No guide for this exercise yet</span>Add your own steps with Edit, one step per line.<button class="btn sm" onClick=${() => editExercise(ex)}>Write a guide</button></div>` : null}
    <p class="tiny muted credit" style="margin:0">Images: <a href="https://repdb.co" target="_blank" rel="noopener">Exercise data by RepDB (repdb.co)</a>.${ex.rd ? '' : ' Steps from Free Exercise DB.'} General guidance; if something hurts, stop and get it checked.</p>`;
}

function ExHistory({ state, ex }) {
  const exm = A.exMap(state);
  const rows = A.finished(state).filter(w => w.entries.some(e => e.exId === ex.id)).slice().reverse();
  const prs = A.prEvents(state).filter(p => p.exId === ex.id && p.kind !== 'vol');
  if (!rows.length) return html`<div class="card empty small">Not logged yet.</div>`;
  return html`<div class="list">${rows.slice(0, 60).map(wo => {
    const sets = wo.entries.filter(e => e.exId === ex.id).flatMap(e => e.sets);
    const notes = wo.entries.filter(e => e.exId === ex.id && e.note).map(e => e.note);
    const hasPr = prs.some(p => p.workoutId === wo.id);
    let n = 0;
    return html`<button class="row" style="align-items:flex-start" onClick=${() => nav.go('workoutView', { id: wo.id })}>
      <div class="grow">
        <div class="title">${fmtRel(wo.start)} · ${wo.name}${hasPr ? html`<span class="pill accent pr-flag">PR</span>` : null}</div>
        <div class="kv small" style="margin-top:6px">${sets.map(s => { if (s.t === 'n') n++; return html`<span class="muted">${s.t === 'n' ? 'Set ' + n : { w: 'Warm-up', d: 'Drop', f: 'Failure' }[s.t]}</span><span class="num">${prevText(s, ex, state.settings)}</span>`; })}</div>
        ${notes.length ? html`<div class="tiny muted" style="margin-top:6px">${notes.join(' · ')}</div>` : null}
      </div>
    </button>`;
  })}</div>`;
}

export function Library({ state }) {
  const [q, setQ] = useState('');
  const [m, setM] = useState('All');
  const ql = q.trim().toLowerCase();
  const counts = new Map();
  for (const w of A.finished(state)) for (const e of w.entries) counts.set(e.exId, (counts.get(e.exId) || 0) + 1);
  const [eq, setEq] = useState('All');
  const [limit, setLimit] = useState(80);
  const all = A.allExercises(state);
  const words = ql.split(/\s+/).filter(Boolean);
  const list = all.filter(e => (m === 'All' || e.muscle === m) && (eq === 'All' || e.equip === eq) && words.every(w => (e.name + ' ' + e.equip + ' ' + e.muscle).toLowerCase().includes(w)));
  return html`
    <${TopBar} title="Exercises" back=${true} right=${html`<button class="btn sm primary" onClick=${() => editExercise(null)}>New</button>`} />
    <div class="page">
      <input id="lib-search" class="input" placeholder="Search ${all.length} exercises" value=${q} onInput=${e => setQ(e.target.value)} />
      <div class="chips">${['All', ...MUSCLES].map(x => html`<button class="chip" aria-pressed=${m === x} onClick=${() => { setM(x); setLimit(80); }}>${x}</button>`)}</div>
      <div class="chips">${['All', ...EQUIPMENT].map(x => html`<button class="chip" aria-pressed=${eq === x} onClick=${() => { setEq(x); setLimit(80); }}>${x === 'All' ? 'Any equipment' : x}</button>`)}</div>
      <div class="small muted">${list.length} exercises${counts.size ? ` · ${counts.size} you've done` : ''}</div>
      <div class="list">${list.slice(0, limit).map(e => html`<button class="row" onClick=${() => nav.go('exercise', { id: e.id })}>
        <${ExThumb} ex=${e} size=${36} />
        <div class="grow"><div class="title">${e.name}</div><div class="sub">${e.muscle} · ${e.equip}${e.custom ? ' · custom' : ''}</div></div>
        ${counts.get(e.id) ? html`<span class="small muted num">${counts.get(e.id)}×</span>` : null}
        <span class="chev"><${Icon} name="chev" size=${18} /></span></button>`)}</div>
      ${list.length > limit ? html`<button class="btn ghost block" onClick=${() => setLimit(l => l + 120)}>Show more (${list.length - limit} left)</button>` : null}
      <p class="tiny muted credit" style="margin:0;text-align:center"><a href="https://repdb.co" target="_blank" rel="noopener">Exercise data by RepDB (repdb.co)</a></p>
    </div>`;
}
