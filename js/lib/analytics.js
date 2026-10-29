// All the number crunching. Pure functions over state, memoized per state revision.

import { startOfWeek, addDays, dayKey, fromKey, DAY, startOfDay, daysBetween } from './util.js';

export const e1rm = (kg, reps) => {
  if (!kg || !reps) return 0;
  if (reps === 1) return kg;
  if (reps > 12) return kg * (1 + 12 / 30); // estimates get unreliable past 12 reps
  return kg * (1 + reps / 30);              // Epley
};

export const isWorking = s => s.done && s.t !== 'w';

const cache = new Map();
function memo(state, key, fn) {
  const k = state.updatedAt + ':' + key;
  if (cache.has(k)) return cache.get(k);
  if (cache.size > 200) cache.clear();
  const v = fn();
  cache.set(k, v);
  return v;
}

export const exMap = state => memo(state, 'exmap', () => new Map(state.exercises.map(e => [e.id, e])));

export const finished = state => memo(state, 'finished', () =>
  state.workouts.filter(w => w.end).slice().sort((a, b) => a.start - b.start));

export function setVolume(s, ex) {
  if (!isWorking(s)) return 0;
  if (ex && (ex.type === 'weight')) return (s.kg || 0) * (s.reps || 0);
  if (ex && ex.type === 'bw') return (s.kg || 0) * (s.reps || 0);
  return 0;
}

export function workoutStats(w, exm) {
  let volume = 0, sets = 0, reps = 0, km = 0, cardioSec = 0;
  for (const en of w.entries) {
    const ex = exm.get(en.exId);
    for (const s of en.sets) {
      if (!isWorking(s)) continue;
      sets++;
      reps += s.reps || 0;
      volume += setVolume(s, ex);
      if (ex && (ex.type === 'cardio' || ex.type === 'sprint')) { km += s.km || 0; cardioSec += s.sec || 0; }
    }
  }
  return { volume, sets, reps, km, cardioSec, duration: w.end ? (w.end - w.start) / 1000 : 0 };
}

// Per-exercise history: one point per workout that included it.
export function exerciseHistory(state, exId) {
  return memo(state, 'hist:' + exId, () => {
    const exm = exMap(state);
    const ex = exm.get(exId);
    const out = [];
    for (const w of finished(state)) {
      const en = w.entries.filter(e => e.exId === exId);
      if (!en.length) continue;
      let best = 0, top = 0, topReps = 0, vol = 0, sets = 0, maxReps = 0, km = 0, sec = 0, bestPace = null, bestSprint = null;
      for (const e of en) for (const s of e.sets) {
        if (!isWorking(s)) continue;
        sets++;
        const est = e1rm(s.kg, s.reps);
        if (est > best) best = est;
        if ((s.kg || 0) > top || ((s.kg || 0) === top && (s.reps || 0) > topReps)) { top = s.kg || 0; topReps = s.reps || 0; }
        if ((s.reps || 0) > maxReps) maxReps = s.reps || 0;
        vol += setVolume(s, ex);
        km += s.km || 0; sec += s.sec || 0;
        if (s.km && s.sec) {
          const pace = s.sec / s.km;
          if (bestPace == null || pace < bestPace) bestPace = pace;
          if (ex && ex.type === 'sprint' && (bestSprint == null || s.sec < bestSprint)) bestSprint = s.sec;
        }
      }
      out.push({ date: w.start, workoutId: w.id, e1rm: best, top, topReps, volume: vol, sets, maxReps, km, sec, pace: bestPace, sprint: bestSprint });
    }
    return out;
  });
}

// The last completed sets for an exercise (for "previous" column).
export function lastSets(state, exId, beforeTs = Infinity) {
  const list = finished(state);
  for (let i = list.length - 1; i >= 0; i--) {
    const w = list[i];
    if (w.start >= beforeTs) continue;
    const en = w.entries.find(e => e.exId === exId);
    if (en) {
      const done = en.sets.filter(s => s.done);
      if (done.length) return done;
    }
  }
  return null;
}

// PR detection across all history. Returns events in time order.
export function prEvents(state) {
  return memo(state, 'prs', () => {
    const exm = exMap(state);
    const best = new Map(); // exId -> { kg, e1rm, reps, vol, sprint, km }
    const events = [];
    for (const w of finished(state)) {
      for (const en of w.entries) {
        const ex = exm.get(en.exId);
        if (!ex) continue;
        const b = best.get(en.exId) || { kg: 0, e1rm: 0, reps: 0, vol: 0, sprint: Infinity, km: 0, seen: false };
        const found = {};
        en.sets.forEach((s, i) => {
          if (!isWorking(s)) return;
          if (ex.type === 'weight') {
            if ((s.kg || 0) > b.kg && b.seen) found.kg = { value: s.kg, reps: s.reps, i };
            if (e1rm(s.kg, s.reps) > b.e1rm + 0.01 && b.seen) found.e1rm = { value: e1rm(s.kg, s.reps), i };
            if ((s.kg || 0) * (s.reps || 0) > b.vol && b.seen) found.vol = { value: s.kg * s.reps, i };
          } else if (ex.type === 'bw') {
            if ((s.reps || 0) > b.reps && b.seen) found.reps = { value: s.reps, i };
          } else if (ex.type === 'sprint') {
            if (s.sec && s.sec < b.sprint && b.seen) found.sprint = { value: s.sec, i };
          } else if (ex.type === 'cardio') {
            if ((s.km || 0) > b.km && b.seen) found.km = { value: s.km, i };
          } else if (ex.type === 'time') {
            if ((s.sec || 0) > (b.hold || 0) && b.seen) found.hold = { value: s.sec, i };
          }
        });
        // update bests after scanning so a PR is relative to previous sessions
        en.sets.forEach(s => {
          if (!isWorking(s)) return;
          b.kg = Math.max(b.kg, s.kg || 0);
          b.e1rm = Math.max(b.e1rm, e1rm(s.kg, s.reps));
          b.vol = Math.max(b.vol, (s.kg || 0) * (s.reps || 0));
          b.reps = Math.max(b.reps, s.reps || 0);
          b.km = Math.max(b.km, s.km || 0);
          b.hold = Math.max(b.hold || 0, s.sec || 0);
          if (s.sec && ex.type === 'sprint') b.sprint = Math.min(b.sprint, s.sec);
          b.seen = true;
        });
        best.set(en.exId, b);
        for (const [kind, v] of Object.entries(found)) events.push({ workoutId: w.id, date: w.start, exId: en.exId, kind, ...v });
      }
    }
    return events;
  });
}

export const PR_LABEL = { kg: 'Heaviest', e1rm: 'Est. 1RM', vol: 'Best set', reps: 'Most reps', sprint: 'Fastest', km: 'Longest', hold: 'Longest hold' };

// Weekly buckets going back n weeks (oldest first). Includes current week.
export function weeks(state, n) {
  return memo(state, 'weeks:' + n, () => {
    const ws = state.settings.weekStart;
    const exm = exMap(state);
    const start0 = startOfWeek(new Date(), ws);
    const buckets = [];
    for (let i = n - 1; i >= 0; i--) {
      const s = addDays(start0, -7 * i);
      buckets.push({ start: s, end: addDays(s, 7), sessions: 0, volume: 0, sets: 0, km: 0, cardioSec: 0, duration: 0, muscles: {}, td: { sessions: 0, sets: 0, volume: 0 } });
    }
    for (const w of finished(state)) {
      const b = buckets.find(b => w.start >= +b.start && w.start < +b.end);
      if (!b) continue;
      const st = workoutStats(w, exm);
      // "to date": only what happened by this point in the week, for fair comparisons with the current week
      if (w.start - b.start <= Date.now() - start0) { b.td.sessions++; b.td.sets += st.sets; b.td.volume += st.volume; }
      b.sessions++; b.volume += st.volume; b.sets += st.sets; b.km += st.km; b.cardioSec += st.cardioSec; b.duration += st.duration;
      for (const en of w.entries) {
        const ex = exm.get(en.exId);
        if (!ex || ex.muscle === 'Cardio') continue;
        const n = en.sets.filter(isWorking).length;
        if (!n) continue;
        b.muscles[ex.muscle] = (b.muscles[ex.muscle] || 0) + n;
        for (const m of ex.secondary || []) b.muscles[m] = (b.muscles[m] || 0) + n * 0.5;
      }
    }
    return buckets;
  });
}

// Weeks in a row meeting the weekly goal. The current week counts once it's met.
export function streak(state) {
  const goal = state.settings.weeklyGoal;
  const b = weeks(state, 104);
  let i = b.length - 1;
  let count = 0;
  if (b[i].sessions >= goal) count++;
  i--;
  for (; i >= 0; i--) { if (b[i].sessions >= goal) count++; else break; }
  return count;
}

// Smoothed bodyweight trend (exponential moving average, adjusted for gaps).
export function weightTrend(state) {
  return memo(state, 'trend', () => {
    const pts = state.bodyweight.slice().sort((a, b) => a.date < b.date ? -1 : 1);
    const out = [];
    let t = null, prev = null;
    for (const p of pts) {
      const d = fromKey(p.date);
      if (t == null) t = p.kg;
      else {
        const gap = Math.max(1, daysBetween(prev, d));
        const a = 1 - Math.pow(0.9, gap);
        t = t + a * (p.kg - t);
      }
      prev = d;
      out.push({ date: +d, key: p.date, raw: p.kg, trend: t });
    }
    return out;
  });
}

// Weekly rate of change (kg/week) from a least-squares fit of the trend over the last `days`.
export function weightRate(state, days = 21) {
  const tr = weightTrend(state);
  if (tr.length < 3) return null;
  const cutoff = Date.now() - days * DAY;
  const pts = tr.filter(p => p.date >= cutoff);
  if (pts.length < 3) return null;
  const xs = pts.map(p => (p.date - pts[0].date) / DAY), ys = pts.map(p => p.trend);
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  if (!den) return null;
  return (num / den) * 7;
}

// Day-level training map for the heatmap: key -> sets.
export function dayMap(state) {
  return memo(state, 'daymap', () => {
    const m = new Map();
    const exm = exMap(state);
    for (const w of finished(state)) {
      const k = dayKey(w.start);
      m.set(k, (m.get(k) || 0) + Math.max(1, workoutStats(w, exm).sets));
    }
    return m;
  });
}

// Lifts the user does most — used to pick defaults for strength cards.
export function topLifts(state, n = 4) {
  return memo(state, 'top:' + n, () => {
    const exm = exMap(state);
    const count = new Map();
    for (const w of finished(state)) for (const en of w.entries) {
      const ex = exm.get(en.exId);
      if (!ex || ex.type !== 'weight') continue;
      count.set(en.exId, (count.get(en.exId) || 0) + 1);
    }
    const priority = ['squat', 'bench', 'deadlift', 'ohp', 'row'];
    return [...count.entries()].sort((a, b) => {
      const pa = priority.indexOf(a[0]), pb = priority.indexOf(b[0]);
      if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
      return b[1] - a[1];
    }).slice(0, n).map(([id]) => id);
  });
}

// Change in best e1RM: latest session vs the best in a window before `days` ago.
export function strengthChange(state, exId, days = 28) {
  const h = exerciseHistory(state, exId);
  if (!h.length) return null;
  const now = h[h.length - 1];
  const cutoff = Date.now() - days * DAY;
  const before = h.filter(p => p.date < cutoff);
  const ref = before.length ? before[before.length - 1] : h[0];
  return { current: now.e1rm, ref: ref.e1rm, change: now.e1rm - ref.e1rm, pct: ref.e1rm ? (now.e1rm - ref.e1rm) / ref.e1rm : 0 };
}

// Plateau: no new best e1RM in the last `n` sessions of a lift (needs history).
export function plateaus(state, n = 4) {
  const out = [];
  for (const id of topLifts(state, 8)) {
    const h = exerciseHistory(state, id);
    if (h.length < n + 2) continue;
    const priorBest = Math.max(...h.slice(0, -n).map(p => p.e1rm));
    const recentBest = Math.max(...h.slice(-n).map(p => p.e1rm));
    if (recentBest <= priorBest) out.push({ exId: id, sessions: n, best: priorBest });
  }
  return out;
}

// Sets per muscle targets (weekly hard sets). Ranges commonly used for hypertrophy.
export const MUSCLE_TARGET = { low: 10, high: 20 };

// Suggest the next routine to run, rotating through the user's routines.
export function nextRoutine(state) {
  if (!state.routines.length) return null;
  const done = finished(state).filter(w => w.routineId);
  if (!done.length) return state.routines[0];
  const last = done[done.length - 1];
  const idx = state.routines.findIndex(r => r.id === last.routineId);
  if (idx === -1) return state.routines[0];
  return state.routines[(idx + 1) % state.routines.length];
}

export function trainedToday(state) {
  const k = dayKey(Date.now());
  return finished(state).filter(w => dayKey(w.start) === k);
}

export { startOfDay };

// All-time records for one exercise, plus rep maxes (best weight for at least N reps).
export const REP_MAX = [1, 3, 5, 8, 10, 12];
export function exerciseRecords(state, exId) {
  return memo(state, 'rec:' + exId, () => {
    const ex = exMap(state).get(exId);
    const r = { heaviest: null, e1rm: null, bestSet: null, bestSession: null, mostReps: null, hold: null, longest: null, longestTime: null, pace: null, sprints: {}, repMax: {} };
    const better = (cur, val) => !cur || val > cur.value;
    for (const w of finished(state)) {
      let sessionVol = 0;
      for (const en of w.entries) {
        if (en.exId !== exId) continue;
        for (const s of en.sets) {
          if (!isWorking(s)) continue;
          const at = { date: w.start, workoutId: w.id };
          const kg = s.kg || 0, reps = s.reps || 0;
          sessionVol += setVolume(s, ex);
          if (ex && (ex.type === 'weight' || ex.type === 'bw')) {
            if (kg && (!r.heaviest || kg > r.heaviest.value || (kg === r.heaviest.value && reps > r.heaviest.reps))) r.heaviest = { value: kg, reps, ...at };
            const est = e1rm(kg, reps);
            if (est && better(r.e1rm, est)) r.e1rm = { value: est, kg, reps, ...at };
            if (kg * reps && better(r.bestSet, kg * reps)) r.bestSet = { value: kg * reps, kg, reps, ...at };
            if (reps && (!r.mostReps || reps > r.mostReps.value || (reps === r.mostReps.value && kg > r.mostReps.kg))) r.mostReps = { value: reps, kg, ...at };
            if (kg) for (const n of REP_MAX) if (reps >= n && (!r.repMax[n] || kg > r.repMax[n].value)) r.repMax[n] = { value: kg, reps, ...at };
          }
          if (ex && ex.type === 'time' && s.sec && better(r.hold, s.sec)) r.hold = { value: s.sec, ...at };
          if (ex && ex.type === 'cardio') {
            if (s.km && better(r.longest, s.km)) r.longest = { value: s.km, sec: s.sec, ...at };
            if (s.sec && better(r.longestTime, s.sec)) r.longestTime = { value: s.sec, km: s.km, ...at };
            if (s.km && s.sec) { const pace = s.sec / s.km; if (!r.pace || pace < r.pace.value) r.pace = { value: pace, ...at }; }
          }
          if (ex && ex.type === 'sprint' && s.sec) {
            const m = Math.round((s.km || 0) * 1000);
            if (!r.sprints[m] || s.sec < r.sprints[m].value) r.sprints[m] = { value: s.sec, ...at };
          }
        }
      }
      if (sessionVol && better(r.bestSession, sessionVol)) r.bestSession = { value: sessionVol, date: w.start, workoutId: w.id };
    }
    return r;
  });
}
