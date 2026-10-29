// Progression coach: "add weight" suggestions and warm-up sets.
//
// Suggestions use double progression: keep the weight until you hit your target reps on
// every working set, then add the smallest sensible jump. Reps-left (RIR) answers make it
// bolder when sets felt easy and warn when everything went to failure. If the best set
// hasn't improved in 3 sessions, it suggests a lighter day.

import * as A from './analytics.js';
import { toUnit, fromUnit, fmtNum, round } from './util.js';
import { BARS } from './plates.js';

const isBarbell = ex => /barbell|smith|trap/i.test((ex && ex.equip) || '');
const isDumbbell = ex => /dumbbell|kettlebell/i.test((ex && ex.equip) || '');

// Smallest sensible jump, in the user's unit.
export function stepFor(ex, unit) {
  if (unit === 'lb') return 5;
  return isDumbbell(ex) ? 2 : 2.5;
}
const roundTo = (v, step) => Math.round(v / step) * step;
const same = (a, b) => Math.abs((a || 0) - (b || 0)) < 0.01;

// The working sets of an exercise's last session.
function lastWorking(state, exId, beforeTs) {
  const last = A.lastSets(state, exId, beforeTs) || [];
  return last.filter(s => s.t !== 'w');
}

// suggestion(state, ex, target, beforeTs) -> null or
// { kind: 'up' | 'same' | 'deload' | 'reps', kg, reps, text, why, note }
export function suggestion(state, ex, target, beforeTs = Infinity) {
  if (!ex || (ex.type !== 'weight' && ex.type !== 'bw')) return null;
  const unit = state.settings.unit;
  const work = lastWorking(state, ex.id, beforeTs).filter(s => s.reps != null);
  if (!work.length) return null;

  // Bodyweight: chase reps, then suggest adding weight.
  if (ex.type === 'bw') {
    const top = Math.max(...work.map(s => s.kg || 0));
    const at = work.filter(s => same(s.kg, top));
    const minR = Math.min(...at.map(s => s.reps));
    const goal = target || minR + 1;
    if (!top && minR >= 15) return { kind: 'up', kg: fromUnit(stepFor(ex, unit), unit), reps: 8, text: `Add ${stepFor(ex, unit)} ${unit}, about 8 reps`, why: `You did ${minR}+ reps on every set last time.` };
    if (at.every(s => s.reps >= goal) && target) return { kind: 'reps', kg: top || null, reps: goal + 1, text: `Go for ${goal + 1} reps a set`, why: `You hit ${goal} on every set last time.` };
    return { kind: 'reps', kg: top || null, reps: goal, text: `Aim for ${goal} reps on every set`, why: `Last time: ${at.map(s => s.reps).join(', ')}.` };
  }

  const kgSets = work.filter(s => s.kg != null);
  if (!kgSets.length) return null;
  const topKg = Math.max(...kgSets.map(s => s.kg));
  const at = kgSets.filter(s => same(s.kg, topKg));
  const W = round(toUnit(topKg, unit), 2);
  const step = stepFor(ex, unit);
  const rirs = at.map(s => s.rir).filter(r => typeof r === 'number');
  const note = rirs.length >= 2 && rirs.every(r => r === 0)
    ? 'Every set went to failure last time. Leaving 1–2 reps in the tank recovers faster and still builds strength.' : null;

  // Stalled: no better best set in the last 3 sessions than before them.
  const h = A.exerciseHistory(state, ex.id).filter(p => p.date < beforeTs);
  if (h.length >= 5) {
    const before = Math.max(...h.slice(0, -3).map(p => p.e1rm));
    const recent = Math.max(...h.slice(-3).map(p => p.e1rm));
    if (recent > 0 && recent <= before) {
      const light = roundTo(W * 0.9, step);
      const reps = target || Math.min(...at.map(s => s.reps));
      return { kind: 'deload', kg: fromUnit(light, unit), reps, text: `Lighter day: ${fmtNum(light, 1)} × ${reps}`, why: 'Your best set hasn\'t improved in 3 sessions. A lighter day (about 10% off) usually breaks a stall.', note };
    }
  }

  const minReps = Math.min(...at.map(s => s.reps));
  // Without a rep target, build up to 12 reps before adding weight.
  const goal = target || null;
  const hit = goal ? at.every(s => s.reps >= goal) : minReps >= 12;
  if (hit) {
    const easy = rirs.length >= 2 && rirs.every(r => r >= 3);
    const inc = easy ? step * 2 : step;
    const next = round(W + inc, 2);
    const reps = goal || 8;
    return {
      kind: 'up', kg: fromUnit(next, unit), reps,
      text: `Add ${fmtNum(inc, 1)} ${unit}: ${fmtNum(next, 1)} × ${reps}`,
      why: easy ? `You hit ${goal || minReps} reps on every set with 3+ in the tank.` : `You hit ${goal || minReps} reps on every set at ${fmtNum(W, 1)} last time.`,
      note,
    };
  }
  const reps = goal || minReps + 1;
  return {
    kind: 'same', kg: topKg, reps,
    text: `Stay at ${fmtNum(W, 1)}: aim for ${reps} on every set`,
    why: `Last time: ${at.map(s => s.reps).join(', ')}${goal ? `. Add weight once every set hits ${goal}.` : '. Add weight once every set hits 12.'}`,
    note,
  };
}

// Warm-up sets for a top working weight (kg). Returns [{ kg, reps }], lightest first.
export function warmups(state, ex, topKg) {
  const unit = state.settings.unit;
  const top = toUnit(topKg, unit);
  const step = stepFor(ex, unit);
  if (!top || top <= 0) return [];
  const out = [];
  if (isBarbell(ex)) {
    const bar = state.settings.barKg != null ? round(toUnit(state.settings.barKg, unit), 2) : BARS[unit][0];
    if (top <= bar * 1.25) return [];
    out.push([bar, 10]);
    for (const [pct, reps] of [[0.4, 5], [0.6, 3], [0.8, 2]]) {
      const v = roundTo(top * pct, step);
      if (v > out[out.length - 1][0] + step / 2 && v < top - step / 2) out.push([v, reps]);
    }
  } else {
    for (const [pct, reps] of [[0.5, 8], [0.75, 4]]) {
      const v = roundTo(top * pct, step);
      if (v >= step && v < top - step / 2 && (!out.length || v > out[out.length - 1][0])) out.push([v, reps]);
    }
  }
  return out.map(([v, reps]) => ({ kg: fromUnit(v, unit), reps, shown: v }));
}
export { isBarbell };
