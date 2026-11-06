// "Your week" recap: shown Monday to Wednesday for the week that just ended (Monday to Sunday),
// on Today and on the Diary. Dismissing it on either hides it on both until next week.

import { html, useState, useEffect } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import * as F from '../lib/food.js';
import { Icon, nav } from '../lib/ui.js';
import { finished, workoutStats, exMap, prEvents, weightTrend } from '../lib/analytics.js';
import { addDays, startOfWeek, dayKey, fmtDate, fmtNum, toUnit, bwUnit } from '../lib/util.js';
import { weekTotals, weekKey, cloudStatus, loadBoard } from '../lib/cloud.js';

const lastWeekStart = () => addDays(startOfWeek(new Date(), 1), -7);

export function recapFor(state, start = lastWeekStart()) {
  const end = addDays(start, 7);
  const t = weekTotals(state, start);
  const before = weekTotals(state, addDays(start, -7));
  const exm = exMap(state);
  let best = null;
  for (const w of finished(state)) {
    if (w.start < +start || w.start >= +end) continue;
    const s = workoutStats(w, exm);
    if (!best || s.volume > best.vol) best = { name: w.name, vol: s.volume };
  }
  const prs = new Set(prEvents(state).filter(e => e.date >= +start && e.date < +end).map(e => e.workoutId + e.exId)).size;
  let kcal = 0, p = 0, tk = 0;
  for (let d = new Date(start); d < end; d = addDays(d, 1)) {
    const k = dayKey(d);
    const ent = F.dayEntries(state, k);
    if (!ent.length) continue;
    const s = F.sum(ent); kcal += s.kcal; p += s.p; tk += F.targetFor(state, k).kcal;
  }
  const tr = weightTrend(state).filter(x => x.date >= +start && x.date < +end);
  const weight = tr.length >= 2 ? tr[tr.length - 1].trend - tr[0].trend : null;
  return {
    start, end: addDays(end, -1), t, before, best, prs, weight,
    food: t.fd ? { kcal: kcal / t.fd, p: p / t.fd, target: tk / t.fd } : null,
    any: t.n > 0 || t.fd > 0 || tr.length > 0,
  };
}

const pct = (a, b) => b > 0 ? Math.round((a - b) / b * 100) : null;
function Delta({ now, then }) {
  const d = pct(now, then);
  if (d == null || d === 0) return null;
  return html`<span class=${'delta ' + (d > 0 ? 'up' : 'down')}>${d > 0 ? '↑' : '↓'} ${Math.abs(d)}%</span>`;
}

let rankCache = null; // { wk, text }

export function WeekRecap({ state }) {
  const s = state.settings;
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0 = Monday
  const wk = dayKey(lastWeekStart());
  const show = dow <= 2 && s.recapSeen !== wk && !s.sample;
  const r = show ? recapFor(state) : null;
  const [rank, setRank] = useState(rankCache && rankCache.wk === wk ? rankCache.text : '');
  useEffect(() => {
    if (!r || !r.t.n || rank || cloudStatus().phase !== 'in') return;
    loadBoard().then(rows => {
      if (rows.length < 2) return;
      const val = p => p.stats && (p.stats.wk === weekKey() ? p.stats.pw : p.stats.wk === wk ? p.stats.w : null);
      const sorted = rows.map(p => ({ me: p.me, n: (val(p) || {}).n || 0 })).sort((a, b) => b.n - a.n);
      const myN = sorted.find(x => x.me).n;
      const place = sorted.filter(x => x.n > myN).length + 1;
      const text = `${ordinal(place)} of ${rows.length} friends on workouts`;
      rankCache = { wk, text }; setRank(text);
    }).catch(() => {});
  }, [wk]);
  if (!r || !r.any) return null;
  const unit = s.unit, bu = bwUnit(state);
  const dismiss = () => store.update(st => { st.settings.recapSeen = wk; });
  const goal = s.weeklyGoal;
  return html`<section class="card recap" aria-label="Your week">
    <div class="recap-top">
      <div class="grow"><div class="h-md">Your week</div><div class="small muted">${fmtDate(r.start)} – ${fmtDate(r.end)}</div></div>
      <button class="icon-btn" aria-label="Hide until next week" onClick=${dismiss}><${Icon} name="close" size=${18} /></button>
    </div>
    <div class="recap-grid">
      <div><span class="rv num">${r.t.n}${goal ? html`<small> / ${goal}</small>` : null}</span><span class="rl">Workouts <${Delta} now=${r.t.n} then=${r.before.n} /></span></div>
      <div><span class="rv num">${fmtBig(toUnit(r.t.vol, unit))}<small> ${unit}</small></span><span class="rl">Volume <${Delta} now=${r.t.vol} then=${r.before.vol} /></span></div>
      ${r.food ? html`<div><span class="rv num">${Math.round(r.food.kcal).toLocaleString()}</span><span class="rl">Avg kcal · target ${Math.round(r.food.target).toLocaleString()}</span></div>
        <div><span class="rv num">${r.t.pd}<small> / ${r.t.fd}</small></span><span class="rl">Days on protein · avg ${Math.round(r.food.p)} g</span></div>`
      : html`<div><span class="rv num">${r.t.sets}</span><span class="rl">Sets <${Delta} now=${r.t.sets} then=${r.before.sets} /></span></div>
        <div><span class="rv num">${r.prs}</span><span class="rl">New records</span></div>`}
    </div>
    <ul class="recap-notes">
      ${r.best ? html`<li><${Icon} name="train" size=${16} /><span>Biggest session: <b>${r.best.name}</b>, ${fmtBig(toUnit(r.best.vol, unit))} ${unit}</span></li>` : null}
      ${r.food && r.prs ? html`<li><${Icon} name="trophy" size=${16} /><span>${r.prs} new ${r.prs === 1 ? 'record' : 'records'}</span></li>` : null}
      ${r.weight != null ? html`<li><${Icon} name="scale" size=${16} /><span>Weight trend ${r.weight > 0 ? 'up' : r.weight < 0 ? 'down' : 'flat'} ${fmtNum(Math.abs(toUnit(r.weight, bu)), 1)} ${bu}</span></li>` : null}
      ${rank ? html`<li><${Icon} name="users" size=${16} /><span>${rank}</span></li>` : null}
    </ul>
    ${rank || cloudStatus().phase === 'in' ? html`<button class="link-btn small" style="align-self:flex-start" onClick=${() => nav.go('friends')}>See leaderboard</button>` : null}
  </section>`;
}

const ordinal = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
const fmtBig = v => v >= 10000 ? `${fmtNum(v / 1000, 1)}k` : Math.round(v).toLocaleString();
