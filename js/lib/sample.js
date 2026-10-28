// Sample data: 8 weeks of a 6-day split with sprints, runs and a slow cut.
// Clearly flagged with settings.sample so the app can label it.

import { freshState, uid } from './store.js';
import { TEMPLATES } from './exercises.js';
import { addDays, startOfDay, dayKey, fromUnit, toUnit, stepFor } from './util.js';
import { entryFrom, calculate } from './food.js';

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

  // Food: targets from the calculator, then 8 weeks of mostly-complete logs.
  st.food.profile = { sex: 'male', age: 21, heightCm: 180, activity: 'active', goal: 'cut' };
  const calc = calculate({ ...st.food.profile, kg: 86.5, trainDays: st.food.trainDays });
  st.food.train = calc.train; st.food.rest = calc.rest; st.food.setup = true;
  const P = (id, name, brand, per100, serving) => ({ id, name, brand, per100, serving, source: 'custom' });
  const foods = {
    oats: P('s-oats', 'Rolled oats', 'Quaker', { kcal: 379, p: 13, c: 68, f: 6.5, fiber: 10, sugar: 1, sodium: 6 }, { label: '1/2 cup (40 g)', g: 40 }),
    whey: P('s-whey', 'Whey protein, chocolate', 'Optimum Nutrition', { kcal: 387, p: 77, c: 13, f: 4, fiber: 3, sugar: 5, sodium: 450 }, { label: '1 scoop (31 g)', g: 31 }),
    banana: P('s-banana', 'Banana', '', { kcal: 89, p: 1.1, c: 23, f: 0.3, fiber: 2.6, sugar: 12, sodium: 1 }, { label: '1 medium (118 g)', g: 118 }),
    eggs: P('s-eggs', 'Large eggs', '', { kcal: 143, p: 12.6, c: 0.7, f: 9.5, fiber: 0, sugar: 0.4, sodium: 142 }, { label: '1 egg (50 g)', g: 50 }),
    chicken: P('s-chicken', 'Chicken breast, cooked', '', { kcal: 165, p: 31, c: 0, f: 3.6, fiber: 0, sugar: 0, sodium: 74 }, null),
    rice: P('s-rice', 'White rice, cooked', '', { kcal: 130, p: 2.7, c: 28, f: 0.3, fiber: 0.4, sugar: 0, sodium: 1 }, { label: '1 cup (158 g)', g: 158 }),
    salmon: P('s-salmon', 'Atlantic salmon, cooked', '', { kcal: 206, p: 22, c: 0, f: 12, fiber: 0, sugar: 0, sodium: 61 }, null),
    potato: P('s-potato', 'Baked potato', '', { kcal: 93, p: 2.5, c: 21, f: 0.1, fiber: 2.2, sugar: 1.2, sodium: 10 }, { label: '1 medium (173 g)', g: 173 }),
    yogurt: P('s-yogurt', 'Greek yogurt 0%', 'Oikos', { kcal: 59, p: 10, c: 3.6, f: 0.4, fiber: 0, sugar: 3.2, sodium: 36 }, { label: '3/4 cup (175 g)', g: 175 }),
    bar: P('s-bar', 'Protein bar', 'Quest', { kcal: 333, p: 35, c: 38, f: 13, fiber: 23, sugar: 2, sodium: 450 }, { label: '1 bar (60 g)', g: 60 }),
    wrap: P('s-wrap', 'Chicken shawarma wrap', 'Local spot', { kcal: 215, p: 13, c: 21, f: 9, fiber: 1.5, sugar: 2, sodium: 520 }, { label: '1 wrap (350 g)', g: 350 }),
  };
  st.foods = Object.values(foods).map(f => ({ ...f, used: Date.now() - 86400000, uses: 20 }));
  const plan = [
    ['Breakfast', [['oats', 2, 'serving'], ['whey', 1, 'serving'], ['banana', 1, 'serving']]],
    ['Lunch', [['chicken', 200, 'g'], ['rice', 1.25, 'serving']]],
    ['Dinner', [['salmon', 170, 'g'], ['potato', 1.5, 'serving']]],
    ['Snacks', [['yogurt', 1, 'serving'], ['bar', 1, 'serving']]],
  ];
  for (let d = 0; d <= 56; d++) {
    const day = addDays(start, d), key = dayKey(day);
    if (d < 54 && r() < 0.12) continue;
    const isTrain = st.workouts.some(w => dayKey(w.start) === key);
    const tgt = isTrain ? st.food.train : st.food.rest;
    let ents = [];
    for (const [meal, items] of plan) {
      if (d === 56 && meal !== 'Breakfast' && meal !== 'Lunch') continue; // today is still in progress
      let use = items;
      if (meal === 'Lunch' && r() < 0.25) use = [['wrap', 1, 'serving']];
      if (meal === 'Dinner' && r() < 0.4) use = [['chicken', 220, 'g'], ['rice', 1.5, 'serving']];
      if (meal === 'Snacks' && r() < 0.3) use = [['yogurt', 1, 'serving'], ['eggs', 2, 'serving']];
      for (const [fid, q, u] of use) ents.push({ food: foods[fid], q, u, meal });
    }
    // Scale portions so the day lands near the target, with realistic noise.
    const raw = ents.reduce((a, e) => a + entryFrom(e.food, e.q, e.u, e.meal, key).kcal, 0);
    const aim = tgt.kcal * (d === 56 ? 0.45 : 0.9 + r() * 0.18);
    const k = raw ? aim / raw : 1;
    for (const e of ents) {
      const scale = e.food.id === 's-whey' || e.food.id === 's-bar' ? 1 : k;
      const q = e.u === 'g' ? Math.round(e.q * scale / 5) * 5 : Math.round(e.q * scale * 4) / 4;
      st.foodLog.push({ ...entryFrom(e.food, q, e.u, e.meal, key), id: uid() });
    }
    st.water[key] = d === 56 ? 1250 : 2000 + Math.round(r() * 6) * 250;
  }
  st.meals = [{ id: uid(), name: 'Usual breakfast', items: plan[0][1].map(([fid, q, u]) => { const { id, date, meal, ...rest } = entryFrom(foods[fid], q, u, 'Breakfast', ''); return rest; }) }];
  return st;
}
