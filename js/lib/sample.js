// Sample data: 8 weeks of a 6-day split with sprints, runs and a slow cut.
// Clearly flagged with settings.sample so the app can label it.

import { freshState, uid } from './store.js';
import { TEMPLATES } from './exercises.js';
import { addDays, startOfDay, dayKey, fromUnit, toUnit, stepFor } from './util.js';

function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

// Starting estimated 1RM (kg) for the sample lifter.
const BASE = {
  bench: 92, ohp: 58, 'incline-db': 34, 'lateral-raise': 13, pushdown: 40,
  deadlift: 160, pullup: 12, 'cable-row': 80, 'face-pull': 32, 'bb-curl': 42,
  squat: 130, rdl: 120, 'leg-press': 240, 'leg-curl': 60, 'calf-raise': 110,
  'incline-bench': 80, 'cable-fly': 30, 'cable-lateral': 12, 'oh-ext': 34,
  row: 90, 'lat-pulldown': 78, 'chest-row': 75, 'rear-delt': 40, 'hammer-curl': 22,
  'front-squat': 100, 'hip-thrust': 150, bulgarian: 40, 'seated-curl': 58, 'seated-calf': 80,
};

export function makeSample(settings) {
  const st = freshState();
  st.settings = { ...st.settings, ...settings, sample: true, onboarded: true };
  const unit = st.settings.unit;
  const r = rng(42);
  const ppl = TEMPLATES.find(t => t.id === 'ppl');
  const cond = TEMPLATES.find(t => t.id === 'cond');
  st.routines = [...ppl.days, cond.days[0]].map(d => ({ id: uid(), name: d.name, items: d.items.map(i => ({ ...i })) }));
  const weekly = st.routines.slice(0, 6);
  const sprintR = st.routines[6];

  const roundW = kg => { const step = stepFor(unit); return fromUnit(Math.max(step, Math.round(toUnit(kg, unit) / step) * step), unit); };
  const today = startOfDay(new Date());
  const start = addDays(today, -56);
  const sessions = {};
  let pi = 0;

  for (let d = 0; d < 56; d++) {
    const day = addDays(start, d);
    const dow = day.getDay();
    if (dow === 0) continue;                 // Sundays off
    if (r() < 0.08) continue;                // the odd missed day
    const routine = weekly[pi % 6]; pi++;
    const t0 = new Date(day); t0.setHours(17 + Math.floor(r() * 3), Math.floor(r() * 60));
    let clock = +t0 + 6 * 60000;
    const entries = routine.items.map(it => {
      const n = (sessions[it.exId] = (sessions[it.exId] || 0) + 1);
      const base = BASE[it.exId] || 50;
      const est = base * (1 + 0.006 * n) * (0.98 + r() * 0.04);
      const sets = [];
      const ex = st.exercises.find(e => e.id === it.exId);
      if (ex.type === 'weight' && ['bench', 'squat', 'deadlift', 'ohp', 'row', 'incline-bench', 'front-squat'].includes(it.exId)) {
        sets.push({ t: 'w', kg: roundW(est * 0.5), reps: 8, done: true });
      }
      for (let i = 0; i < it.sets; i++) {
        if (ex.type === 'bw') { sets.push({ t: 'n', kg: 0, reps: Math.max(4, Math.round(it.reps + (n / 8) - i - r() * 2)), done: true }); continue; }
        const reps = Math.max(3, it.reps + (r() < 0.25 ? 1 : 0) - (i === it.sets - 1 && r() < 0.4 ? 1 : 0));
        sets.push({ t: 'n', kg: roundW(est / (1 + reps / 30)), reps, done: true });
      }
      clock += sets.length * 150000;
      return { exId: it.exId, note: '', sets };
    });
    st.workouts.push({ id: uid(), routineId: routine.id, name: routine.name, start: +t0, end: clock + 5 * 60000, notes: '', entries });

    // Sprints on Tuesdays and Fridays after lifting, a run on Saturdays.
    if (dow === 2 || dow === 5) {
      const ts = clock + 15 * 60000;
      const k = Math.floor(d / 7);
      const sets = Array.from({ length: 8 }, (_, i) => ({ t: 'n', km: 0.1, sec: Math.round((14.2 - k * 0.09 + i * 0.07 + r() * 0.3) * 100) / 100, done: true }));
      st.workouts.push({ id: uid(), routineId: sprintR.id, name: 'Sprint Intervals', start: ts, end: ts + 24 * 60000, notes: '', entries: [{ exId: 'sprint', note: '100m flat', sets }] });
    }
    if (dow === 6) {
      const ts = +t0 - 3 * 3600000;
      const km = 5 + (r() < 0.5 ? 1 : 0);
      const pace = 330 - d * 0.35 + r() * 12;
      st.workouts.push({ id: uid(), routineId: null, name: 'Easy Run', start: ts, end: ts + km * pace * 1000 + 300000, notes: '', entries: [{ exId: 'run', note: '', sets: [{ t: 'n', km, sec: Math.round(km * pace), done: true }] }] });
    }
  }

  // Bodyweight: a steady cut of ~0.35 kg/week with daily noise.
  for (let d = 0; d <= 56; d++) {
    if (r() < 0.18 && d !== 56) continue;
    const kg = 86.5 - d * 0.05 + (r() - 0.5) * 1.1 + Math.sin(d / 3) * 0.25;
    st.bodyweight.push({ date: dayKey(addDays(start, d)), kg: Math.round(kg * 100) / 100 });
  }

  st.workouts.sort((a, b) => a.start - b.start);
  return st;
}
