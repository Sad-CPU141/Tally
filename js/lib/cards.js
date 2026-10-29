// The analytics card library. Each card has a compact tile for Today
// and a detail view with the full chart and breakdown.

import { html, useState } from '../vendor/preact-htm.js';
import * as store from './store.js';
import * as A from './analytics.js';
import { Sparkline, LineChart, BarChart } from './charts.js';
import { Icon, Tally, nav, Seg } from './ui.js';
import { logBodyweight } from './actions.js';
import * as F from './food.js';
import { MEASURES, series, showVal, logMeasurements, lenUnit } from '../screens/body.js';
import { fmtWeekday, bwUnit, w, toUnit, fmtNum, fmtBig, signed, fmtDate, fmtRel, fmtMins, fmtDur, toDist, startOfWeek, addDays, dayKey, DAY } from './util.js';

const unitOf = s => s.settings.unit;
const exName = (s, id) => (A.exMap(s).get(id) || { name: 'Exercise' }).name;

function Head({ title, right }) {
  return html`<div class="tile-head"><span class="eyebrow">${title}</span>${right || null}</div>`;
}

function RangePick({ value, onChange, options = [['4w', '4W'], ['12w', '3M'], ['26w', '6M'], ['all', 'All']] }) {
  return html`<${Seg} label="Date range" value=${value} onChange=${onChange} options=${options} />`;
}
const rangeDays = r => r === 'all' ? Infinity : parseInt(r) * 7;

// ---------------------------------------------------------------- week
const week = {
  type: 'week', title: 'This week', cat: 'Training', wide: true,
  blurb: 'Workouts this week compared to your goal, plus sets, weight lifted and time spent.',
  compact({ state }) {
    const b = A.weeks(state, 2);
    const cur = b[1], prev = b[0];
    const goal = state.settings.weeklyGoal, unit = unitOf(state);
    const left = Math.max(0, goal - cur.sessions);
    return html`
      <${Head} title="This week" right=${html`<span class=${'pill ' + (cur.sessions >= goal ? 'good' : 'accent')}>${cur.sessions >= goal ? 'Goal hit' : `${left} to go`}</span>`} />
      <div class="hstack" style="justify-content:space-between;align-items:flex-end">
        <div class="big">${cur.sessions}<small>/ ${goal} workouts</small></div>
        <${Tally} count=${cur.sessions} goal=${goal} />
      </div>
      <div class="grid3 small">
        <div><div class="mid">${cur.sets}</div><div class="muted tiny">sets <span class=${'delta ' + (cur.sets >= prev.td.sets ? 'good' : 'muted')} title="vs this point last week">${signed(cur.sets - prev.td.sets, 0)}</span></div></div>
        <div><div class="mid">${fmtBig(toUnit(cur.volume, unit))}</div><div class="muted tiny">${unit} lifted</div></div>
        <div><div class="mid">${fmtMins(cur.duration)}</div><div class="muted tiny">training</div></div>
      </div>`;
  },
  detail({ state }) {
    const b = A.weeks(state, 12), unit = unitOf(state);
    const goal = state.settings.weeklyGoal;
    return html`
      <div class="card stack">
        <span class="eyebrow">Workouts per week</span>
        <${BarChart} goal=${goal} unit="sessions" bars=${b.map((x, i) => ({ x: x.start, week: true, value: x.sessions, dim: x.sessions < goal, tip: 'Week of ' + fmtDate(x.start) + (i === b.length - 1 ? ' (this week)' : '') }))} />
        <span class="tiny muted">The dashed line is your goal of ${goal} a week. The last bar is this week so far. Weeks start on ${['Sunday', 'Monday'][state.settings.weekStart]}.</span>
      </div>
      <div class="list">
        ${b.slice().reverse().map(x => html`<div class="row">
          <div class="grow"><div class="title">Week of ${fmtDate(x.start)}</div><div class="sub">${x.sets} sets · ${fmtBig(toUnit(x.volume, unit))} ${unit} · ${fmtMins(x.duration)}</div></div>
          <span class=${'pill ' + (x.sessions >= goal ? 'good' : '')}>${x.sessions} / ${goal}</span>
        </div>`)}
      </div>`;
  },
};

// ---------------------------------------------------------------- bodyweight
// Bodyweight shows scale weigh-ins by default; the toggle on its chart switches everything to the smoothed trend.
export const trendView = state => state.settings.bwView === 'trend';
const bodyweight = {
  type: 'bodyweight', title: 'Bodyweight', cat: 'Body',
  blurb: 'Your weigh-ins, 7-day average and weekly rate of change.',
  compact({ state }) {
    const unit = bwUnit(state);
    const tr = A.weightTrend(state);
    if (!tr.length) return html`
      <${Head} title="Bodyweight" />
      <div class="text-2 small">Log your weight to start a trend line.</div>
      <div class="tile-foot"><button class="btn sm primary" onClick=${e => { e.stopPropagation(); logBodyweight(); }}>Log weight</button></div>`;
    const wi = A.weighIns(state);
    const last = wi[wi.length - 1];
    const rate = A.weightRate(state);
    const lossy = rate != null && rate < 0;
    return html`
      <${Head} title="Bodyweight" right=${html`<button class="icon-btn" style="width:30px;height:30px;margin:-6px -6px -6px 0" aria-label="Log weight" onClick=${e => { e.stopPropagation(); logBodyweight(); }}><${Icon} name="plus" size=${18} /></button>`} />
      <div class="big">${w(trendView(state) ? last.trend : last.raw, unit)}<small>${unit}</small></div>
      <div class="tiny muted">${trendView(state) ? 'trend' : `7-day avg ${w(last.avg7, unit)}`} · <span class=${lossy ? 'good' : 'text-2'}>${rate == null ? 'need 3+ weigh-ins' : signed(toUnit(rate, unit), 1) + ' ' + unit + '/wk'}</span></div>
      <div class="tile-foot" style="display:block"><${Sparkline} values=${wi.slice(-30).map(p => trendView(state) ? p.trend : p.raw)} /></div>`;
  },
  detail({ state }) {
    const unit = bwUnit(state);
    const [range, setRange] = useState('12w');
    const [all, setAll] = useState(false);
    const tr = A.weighIns(state);
    const cut = Date.now() - rangeDays(range) * DAY;
    const pts = tr.filter(p => p.date >= cut);
    const rate = A.weightRate(state);
    const last = tr[tr.length - 1];
    const first = pts[0];
    const avgAt = new Map(tr.map(p => [p.date, p.avg7]));
    return html`
      <button class="btn primary block" onClick=${() => logBodyweight()}><${Icon} name="plus" size=${18} /> Log weight</button>
      <div class="card stack">
        <div class="hstack" style="justify-content:space-between">
          <div style="width:140px"><${Seg} label="Chart" value=${trendView(state) ? 'trend' : 'scale'} onChange=${v => store.update(st => { st.settings.bwView = v; })} options=${[['scale', 'Scale'], ['trend', 'Trend']]} /></div>
          <${RangePick} value=${range} onChange=${setRange} />
        </div>
        ${trendView(state) ? html`<${LineChart} fmtY=${v => fmtNum(v, 0)} fmtV=${v => fmtNum(v, 1)} unit=${unit} label="Trend" rawLabel="Scale"
          points=${pts.map(p => ({ x: p.date, y: toUnit(p.trend, unit) }))}
          raw=${pts.map(p => ({ x: p.date, y: toUnit(p.raw, unit) }))} />
        <span class="tiny muted">The line is your trend: a smoothed weight that ignores daily water swings. Dots are your weigh-ins.</span>`
        : html`<${LineChart} fmtY=${v => fmtNum(v, 0)} fmtV=${v => fmtNum(v, 1)} unit=${unit} dots=${true}
          points=${pts.map(p => ({ x: p.date, y: toUnit(p.raw, unit) }))}
          extra=${a => [`7-day avg ${fmtNum(toUnit(avgAt.get(a.x), unit), 1)} ${unit}`]} />
        <span class="tiny muted">Tap the chart to see each weigh-in and your 7-day average. Day-to-day jumps of 1–3 ${unit} are mostly water.</span>`}
      </div>
      ${last ? html`<div class="summary-grid">
        <div class="stat"><span class="eyebrow">${trendView(state) ? 'Trend' : '7-day avg'}</span><span class="mid">${w(trendView(state) ? last.trend : last.avg7, unit)}</span></div>
        <div class="stat"><span class="eyebrow">Per week</span><span class="mid">${rate == null ? '–' : signed(toUnit(rate, unit), 1)}</span></div>
        <div class="stat"><span class="eyebrow">Change</span><span class="mid">${first ? signed(toUnit(trendView(state) ? last.trend - first.trend : last.avg7 - first.avg7, unit), 1) : '–'}</span></div>
      </div>` : null}
      ${rate != null && last ? html`<div class="card small text-2">
        ${rate < 0
          ? html`Losing about <b class="num">${fmtNum(toUnit(-rate, unit), 1)} ${unit}</b> a week, ${fmtNum(-rate / last.trend * 100, 2)}% of bodyweight. To hold on to muscle, a common target when cutting is 0.5–1% per week.`
          : html`Gaining about <b class="num">${fmtNum(toUnit(rate, unit), 1)} ${unit}</b> a week over the last 3 weeks.`}
      </div>` : null}
      <div class="section-head"><span class="h-md">Weigh-ins</span></div>
      <div class="list">
        ${tr.slice().reverse().slice(0, all ? 400 : 14).map(p => html`<button class="row" onClick=${() => logBodyweight(p.key)}>
          <div class="grow"><div class="title">${fmtRel(p.date)}</div><div class="sub">${trendView(state) ? `trend ${w(p.trend, unit)}` : `7-day avg ${w(p.avg7, unit)}`}</div></div>
          <span class="num">${w(p.raw, unit)} ${unit}</span>
        </button>`)}
        ${!tr.length ? html`<div class="empty">No weigh-ins yet.</div>` : null}
      </div>
      ${tr.length > 14 && !all ? html`<button class="btn ghost block" onClick=${() => setAll(true)}>Show all ${tr.length} weigh-ins</button>` : null}`;
  },
};

// ---------------------------------------------------------------- streak
const streak = {
  type: 'streak', title: 'Streak', cat: 'Training',
  blurb: 'How many weeks in a row you have hit your workout goal.',
  compact({ state }) {
    const n = A.streak(state);
    const goal = state.settings.weeklyGoal;
    const cur = A.weeks(state, 1)[0].sessions;
    return html`
      <${Head} title="Streak" right=${html`<span class=${n ? 'warn' : 'muted'}><${Icon} name="flame" size=${18} /></span>`} />
      <div class="big">${n}<small>${n === 1 ? 'week' : 'weeks'}</small></div>
      <div class="tiny muted tile-foot" style="display:block">${cur >= goal ? 'This week counted.' : `${goal - cur} more this week to keep it going.`}</div>`;
  },
  detail({ state }) {
    const b = A.weeks(state, 26), goal = state.settings.weeklyGoal;
    return html`<div class="card stack">
      <span class="eyebrow">Workouts per week, last 6 months</span>
      <${BarChart} goal=${goal} unit="sessions" bars=${b.map(x => ({ x: x.start, week: true, value: x.sessions, dim: x.sessions < goal }))} />
      <span class="tiny muted">Bright bars are weeks you hit your goal of ${goal} workouts. You can change the goal in Me → Training.</span>
    </div>`;
  },
};

// ---------------------------------------------------------------- strength (key lifts)
function liftList(state, opts) { return (opts.lifts && opts.lifts.length ? opts.lifts : A.topLifts(state, 4)).filter(id => A.exMap(state).has(id)); }

const strength = {
  type: 'strength', title: 'Strength', cat: 'Strength', wide: true,
  blurb: 'Roughly the most you could lift once on your main lifts, and how that changed in the last 4 weeks.',
  compact({ state, opts }) {
    const unit = unitOf(state);
    const lifts = liftList(state, opts);
    return html`
      <${Head} title="Strength · last 4 weeks" />
      ${!lifts.length ? html`<div class="text-2 small">Finish a workout with weighted lifts to see strength trends.</div>` : html`
      <div class="kv">
        ${lifts.map(id => {
          const c = A.strengthChange(state, id, 28);
          if (!c) return null;
          const up = c.change > 0.05, down = c.change < -0.05;
          return html`<span class="small text-2">${exName(state, id)}</span>
            <span><span class="num" style="font-weight:600">${w(c.current, unit, 0)}</span> <span class=${'delta ' + (up ? 'good' : down ? 'bad' : 'muted')} style="display:inline-block;min-width:48px;text-align:right">${signed(toUnit(c.change, unit), 0)}</span></span>`;
        })}
      </div>`}`;
  },
  detail({ state, opts }) {
    const lifts = liftList(state, opts);
    const all = A.topLifts(state, 30);
    const [sel, setSel] = useState(lifts[0] || all[0]);
    return html`
      ${all.length ? html`<div class="chips">${all.map(id => html`<button class="chip" aria-pressed=${sel === id} onClick=${() => setSel(id)}>${exName(state, id)}</button>`)}</div>` : null}
      ${sel ? html`<${LiftDetail} state=${state} exId=${sel} />` : html`<div class="card empty">No weighted lifts logged yet.</div>`}`;
  },
};

export function LiftDetail({ state, exId, chartOnly }) {
  const unit = unitOf(state);
  const [range, setRange] = useState('12w');
  const h = A.exerciseHistory(state, exId);
  const cut = Date.now() - rangeDays(range) * DAY;
  const pts = h.filter(p => p.date >= cut);
  const best = h.reduce((m, p) => p.e1rm > m.e1rm ? p : m, { e1rm: 0 });
  const heaviest = h.reduce((m, p) => p.top > m.top ? p : m, { top: 0 });
  const prs = A.prEvents(state).filter(e => e.exId === exId).slice(-6).reverse();
  return html`
    <div class="card stack">
      <div class="hstack" style="justify-content:space-between"><span class="eyebrow">Estimated max (1 rep)</span><${RangePick} value=${range} onChange=${setRange} /></div>
      <${LineChart} fmtY=${v => fmtNum(v, 0)} fmtV=${v => fmtNum(v, 1)} unit=${unit + ' est. max'} points=${pts.filter(p => p.e1rm).map(p => ({ x: p.date, y: toUnit(p.e1rm, unit) }))} />
      <span class="tiny muted">Worked out from your best set each workout: roughly the most you could lift for a single rep. Sets over 12 reps aren't used because the estimate gets unreliable.</span>
    </div>
    ${chartOnly ? null : html`
    <div class="summary-grid">
      <div class="stat"><span class="eyebrow">Best max</span><span class="mid">${w(best.e1rm, unit, 0)}</span><span class="tiny muted">${best.date ? fmtDate(best.date) : ''}</span></div>
      <div class="stat"><span class="eyebrow">Heaviest</span><span class="mid">${w(heaviest.top, unit)}</span><span class="tiny muted">${heaviest.date ? `× ${heaviest.topReps}` : ''}</span></div>
      <div class="stat"><span class="eyebrow">Workouts</span><span class="mid">${h.length}</span><span class="tiny muted">all time</span></div>
    </div>
    ${prs.length ? html`<div class="section-head"><span class="h-md">Recent PRs</span></div>
    <div class="list">${prs.map(p => html`<div class="row"><span class="pill accent">${A.PR_LABEL[p.kind]}</span><div class="grow small text-2">${fmtDate(p.date)}</div><span class="num">${prValue(p, state)}</span></div>`)}</div>` : null}
    <div class="section-head"><span class="h-md">Sessions</span></div>
    <div class="list">${h.slice().reverse().slice(0, 30).map(p => html`<button class="row" onClick=${() => nav.go('workoutView', { id: p.workoutId })}>
      <div class="grow"><div class="title">${fmtRel(p.date)}</div><div class="sub">${p.sets} sets · top ${w(p.top, unit)} × ${p.topReps}</div></div>
      <span class="num small">${w(p.e1rm, unit, 0)}</span><span class="chev"><${Icon} name="chev" size=${18} /></span>
    </button>`)}</div>`}`;
}

export function prValue(p, state) {
  const unit = unitOf(state), du = state.settings.distUnit;
  switch (p.kind) {
    case 'kg': return `${w(p.value, unit)} ${unit} × ${p.reps}`;
    case 'e1rm': return `${w(p.value, unit, 0)} ${unit}`;
    case 'vol': return `${fmtBig(toUnit(p.value, unit))} ${unit}`;
    case 'reps': return `${p.value} reps`;
    case 'sprint': return `${fmtNum(p.value, 2)} s`;
    case 'km': return `${fmtNum(toDist(p.value, du), 2)} ${du}`;
    case 'hold': return fmtDur(p.value);
  }
  return '';
}

// ---------------------------------------------------------------- single lift
const lift = {
  type: 'lift', title: 'One lift', cat: 'Strength', configurable: true,
  blurb: 'Pick any exercise and follow its strength over time. Add as many as you like.',
  compact({ state, opts }) {
    const unit = unitOf(state);
    const id = opts.exId || A.topLifts(state, 1)[0];
    if (!id) return html`<${Head} title="Lift" /><div class="small text-2">No lifts logged yet.</div>`;
    const h = A.exerciseHistory(state, id);
    const c = A.strengthChange(state, id, 28);
    return html`
      <${Head} title=${exName(state, id)} />
      <div class="big">${c ? w(c.current, unit, 0) : '–'}<small>${unit}</small></div>
      <div class="tiny muted">est. max · <span class=${c && c.change > 0 ? 'good' : 'text-2'}>${c ? signed(toUnit(c.change, unit), 0) + ' in 4 weeks' : 'no data'}</span></div>
      <div class="tile-foot" style="display:block"><${Sparkline} values=${h.slice(-12).map(p => p.e1rm)} /></div>`;
  },
  detail({ state, opts }) {
    const id = opts.exId || A.topLifts(state, 1)[0];
    return id ? html`<${LiftDetail} state=${state} exId=${id} />` : html`<div class="card empty">No lifts logged yet.</div>`;
  },
};

// ---------------------------------------------------------------- muscles
const muscles = {
  type: 'muscles', title: 'Sets per muscle', cat: 'Training', wide: true,
  blurb: 'How many hard sets each muscle got this week. 10 to 20 a week is a good range for growth.',
  compact({ state }) { return html`<${Head} title="Sets per muscle · this week" /><${MuscleBars} state=${state} idx=${0} limit=${6} />`; },
  detail({ state }) {
    const [wk, setWk] = useState(0);
    const b = A.weeks(state, 8);
    return html`
      <div class="chips">${[0, 1, 2, 3].map(i => html`<button class="chip" aria-pressed=${wk === i} onClick=${() => setWk(i)}>${i === 0 ? 'This week' : i === 1 ? 'Last week' : `${i} weeks ago`}</button>`)}</div>
      <div class="card stack"><${MuscleBars} state=${state} idx=${wk} /></div>
      <div class="card small text-2 stack">
        <span>The green band marks ${A.MUSCLE_TARGET.low}–${A.MUSCLE_TARGET.high} hard sets per week, a range widely used for building muscle. Secondary muscles count as half a set (bench press counts half a set for triceps).</span>
        <span>Average over the last 4 weeks: <b class="num">${Math.round(b.slice(-4).reduce((a, x) => a + x.sets, 0) / 4)}</b> sets a week.</span>
      </div>`;
  },
};

function MuscleBars({ state, idx, limit }) {
  const b = A.weeks(state, 8);
  const wk = b[b.length - 1 - idx];
  const order = ['Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings', 'Glutes', 'Biceps', 'Triceps', 'Forearms', 'Calves', 'Core'];
  let rows = order.map(m => [m, wk.muscles[m] || 0]);
  if (limit) rows = rows.slice().sort((a, b) => b[1] - a[1]).slice(0, limit);
  const max = Math.max(24, ...rows.map(r => r[1]));
  const { low, high } = A.MUSCLE_TARGET;
  return html`<div class="mbars">${rows.map(([m, v]) => {
    const cls = v >= low && v <= high ? 'good' : v > high ? 'warn' : '';
    return html`<div class="mbar">
      <span class="text-2">${m}</span>
      <div class="track"><div class="band" style=${`left:${low / max * 100}%;width:${(high - low) / max * 100}%`}></div><div class=${'fill ' + cls} style=${`width:${Math.min(100, v / max * 100)}%`}></div></div>
      <span class="num small" style="text-align:right">${fmtNum(v, 1)}</span>
    </div>`;
  })}</div>`;
}

// ---------------------------------------------------------------- PRs
const prs = {
  type: 'prs', title: 'Personal records', cat: 'Strength',
  blurb: 'New personal bests from the last 30 days.',
  compact({ state }) {
    const ev = A.prEvents(state);
    const month = ev.filter(e => e.date >= Date.now() - 30 * DAY && e.kind !== 'vol');
    const latest = ev.filter(e => e.kind !== 'vol').slice(-1)[0];
    return html`
      <${Head} title="Records · 30 days" right=${html`<span class="muted"><${Icon} name="trophy" size=${18} /></span>`} />
      <div class="big">${month.length}</div>
      <div class="tiny muted tile-foot" style="display:block">${latest ? html`Latest: <span class="text-2">${exName(state, latest.exId)}</span> · ${prValue(latest, state)}` : 'No records yet. They show up after you do a lift a second time.'}</div>`;
  },
  detail({ state }) {
    const [kind, setKind] = useState('all');
    let ev = A.prEvents(state).slice().reverse();
    if (kind !== 'all') ev = ev.filter(e => e.kind === kind);
    return html`
      <div class="chips">${[['all', 'All'], ['kg', 'Heaviest'], ['e1rm', 'Est. max'], ['vol', 'Best set'], ['reps', 'Reps'], ['sprint', 'Sprints'], ['km', 'Distance']].map(([k, l]) => html`<button class="chip" aria-pressed=${kind === k} onClick=${() => setKind(k)}>${l}</button>`)}</div>
      <div class="list">
        ${ev.slice(0, 80).map(p => html`<button class="row" onClick=${() => nav.go('workoutView', { id: p.workoutId })}>
          <div class="grow"><div class="title">${exName(state, p.exId)}</div><div class="sub">${A.PR_LABEL[p.kind]} · ${fmtDate(p.date)}</div></div>
          <span class="num small">${prValue(p, state)}</span>
        </button>`)}
        ${!ev.length ? html`<div class="empty">No records yet.</div>` : null}
      </div>`;
  },
};

// ---------------------------------------------------------------- plateau watch
const plateau = {
  type: 'plateau', title: 'Stalled lifts', cat: 'Strength',
  blurb: "Lifts that haven't beaten their best in the last 4 workouts.",
  compact({ state }) {
    const p = A.plateaus(state, 4);
    return html`
      <${Head} title="Stalled lifts" />
      ${p.length ? html`<div class="big warn">${p.length}</div><div class="tiny muted tile-foot" style="display:block">${p.slice(0, 2).map(x => exName(state, x.exId)).join(', ')} stalled</div>`
        : html`<div class="big good" style="font-size:22px">All improving</div><div class="tiny muted tile-foot" style="display:block">Every main lift beat its best in the last 4 workouts.</div>`}`;
  },
  detail({ state }) {
    const p = A.plateaus(state, 4), unit = unitOf(state);
    return html`
      <div class="card small text-2">A lift shows up here when its last 4 workouts didn't beat its earlier best. Common fixes: change the rep range, add a set, take a deload week, or check that you're eating enough.</div>
      <div class="list">${p.map(x => html`<button class="row" onClick=${() => nav.go('exercise', { id: x.exId })}>
        <div class="grow"><div class="title">${exName(state, x.exId)}</div><div class="sub">best est. max ${w(x.best, unit, 0)} ${unit}</div></div><span class="pill warn">Stalled</span>
      </button>`)}${!p.length ? html`<div class="empty">Nothing stalled.</div>` : null}</div>`;
  },
};

// ---------------------------------------------------------------- volume
const volume = {
  type: 'volume', title: 'Weight lifted', cat: 'Training',
  blurb: 'Everything you lifted each week added up (weight × reps of every working set).',
  compact({ state }) {
    const unit = unitOf(state);
    const b = A.weeks(state, 8);
    const cur = b[b.length - 1], prev = b[b.length - 2];
    const pct = prev.td.volume ? (cur.volume - prev.td.volume) / prev.td.volume * 100 : null;
    return html`
      <${Head} title="Weight lifted" />
      <div class="big">${fmtBig(toUnit(cur.volume, unit))}<small>${unit}</small></div>
      <div class="tiny muted">this week${pct != null ? html` · <span class=${pct >= 0 ? 'good' : 'text-2'}>${signed(pct, 0)}%</span> vs last` : null}</div>
      <div class="tile-foot" style="display:block"><${Sparkline} values=${b.map(x => x.volume)} /></div>`;
  },
  detail({ state }) {
    const unit = unitOf(state);
    const b = A.weeks(state, 12);
    return html`<div class="card stack">
      <span class="eyebrow">Weight lifted per week (${unit})</span>
      <${BarChart} fmtY=${v => fmtBig(v)} fmtV=${v => Math.round(v).toLocaleString()} unit=${unit} bars=${b.map(x => ({ x: x.start, week: true, value: toUnit(x.volume, unit) }))} />
      <span class="tiny muted">Warm-ups aren't counted. For bodyweight moves like pull-ups, only extra weight counts.</span>
    </div>`;
  },
};

// ---------------------------------------------------------------- calendar
const calendar = {
  type: 'calendar', title: 'Workout calendar', cat: 'Training', wide: true,
  blurb: 'Every day you trained, at a glance.',
  compact({ state }) { return html`<${Head} title="Workout calendar" /><${Heat} state=${state} weeksBack=${18} />`; },
  detail({ state }) {
    const m = A.dayMap(state);
    const days = [...m.keys()].filter(k => k >= dayKey(Date.now() - 365 * DAY)).length;
    return html`<div class="card stack"><span class="eyebrow">Last 12 months</span><div style="overflow-x:auto"><div style="min-width:640px"><${Heat} state=${state} weeksBack=${52} /></div></div><span class="tiny muted">${days} training days in the last year. Darker means more sets.</span></div>`;
  },
};

function Heat({ state, weeksBack }) {
  const m = A.dayMap(state);
  const start = addDays(startOfWeek(new Date(), state.settings.weekStart), -7 * (weeksBack - 1));
  const today = dayKey(new Date());
  const cells = [];
  for (let i = 0; i < weeksBack * 7; i++) {
    const d = addDays(start, i);
    const k = dayKey(d);
    const v = m.get(k) || 0;
    const l = v === 0 ? 0 : v < 12 ? 1 : v < 22 ? 2 : 3;
    cells.push(html`<i data-l=${l} class=${k === today ? 'today' : ''} title=${`${fmtDate(d)}: ${v ? v + ' sets' : 'rest'}`}></i>`);
    if (k === today) break;
  }
  return html`<div class="heat" style=${`grid-template-columns:repeat(${weeksBack},1fr)`}>${cells}</div>`;
}

// ---------------------------------------------------------------- cardio
const cardio = {
  type: 'cardio', title: 'Cardio', cat: 'Cardio',
  blurb: 'Distance and time from runs, rides and sprints each week.',
  compact({ state }) {
    const du = state.settings.distUnit;
    const b = A.weeks(state, 8), cur = b[b.length - 1];
    return html`
      <${Head} title="Cardio · this week" />
      <div class="big">${fmtNum(toDist(cur.km, du), 1)}<small>${du}</small></div>
      <div class="tiny muted">${fmtMins(cur.cardioSec)}</div>
      <div class="tile-foot" style="display:block"><${Sparkline} values=${b.map(x => x.km)} /></div>`;
  },
  detail({ state }) {
    const du = state.settings.distUnit;
    const b = A.weeks(state, 12);
    const sprintIds = A.allExercises(state).filter(e => e.type === 'sprint').map(e => e.id);
    const sprintHist = sprintIds.flatMap(id => A.exerciseHistory(state, id)).filter(p => p.sprint).sort((a, b) => a.date - b.date);
    return html`
      <div class="card stack"><span class="eyebrow">Distance per week (${du})</span>
        <${BarChart} fmtY=${v => fmtNum(v, 0)} fmtV=${v => fmtNum(v, 2)} unit=${du} bars=${b.map(x => ({ x: x.start, week: true, value: toDist(x.km, du) }))} /></div>
      <div class="card stack"><span class="eyebrow">Minutes per week</span>
        <${BarChart} unit="min" bars=${b.map(x => ({ x: x.start, week: true, value: Math.round(x.cardioSec / 60) }))} /></div>
      ${sprintHist.length > 1 ? html`<div class="card stack"><span class="eyebrow">Fastest sprint each workout (seconds)</span>
        <${LineChart} area=${false} fmtY=${v => fmtNum(v, 1)} fmtV=${v => fmtNum(v, 2)} unit="s" points=${sprintHist.map(p => ({ x: p.date, y: p.sprint }))} />
        <span class="tiny muted">Lower is faster. Only compare sprints of the same distance.</span></div>` : null}`;
  },
};

// ---------------------------------------------------------------- session length
const sessionLength = {
  type: 'sessionLength', title: 'Workout length', cat: 'Training',
  blurb: 'How long your workouts take on average.',
  compact({ state }) {
    const list = A.finished(state).filter(x => x.start >= Date.now() - 28 * DAY);
    const avg = list.length ? list.reduce((a, x) => a + (x.end - x.start) / 1000, 0) / list.length : 0;
    return html`<${Head} title="Workout length" right=${html`<span class="muted"><${Icon} name="timer" size=${18} /></span>`} />
      <div class="big">${Math.round(avg / 60)}<small>min</small></div>
      <div class="tiny muted tile-foot" style="display:block">average of ${list.length} workouts, last 4 weeks</div>`;
  },
  detail({ state }) {
    const b = A.weeks(state, 12);
    return html`<div class="card stack"><span class="eyebrow">Average workout length per week (minutes)</span>
      <${BarChart} unit="min" bars=${b.map(x => ({ x: x.start, week: true, value: x.sessions ? Math.round(x.duration / x.sessions / 60) : 0 }))} /></div>`;
  },
};

// ================================================================ FOOD

const kc = n => Math.round(n || 0).toLocaleString();
const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const shortDay = d => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(d).getDay()];

function DayDots({ days, test }) {
  return html`<div class="hstack" style="gap:4px;flex-wrap:wrap">${days.map(d => html`<span title=${fmtDate(d.date)} style=${`width:14px;height:14px;border-radius:4px;background:${!d.logged ? 'var(--surface-3)' : test(d) ? 'var(--good)' : 'color-mix(in srgb,var(--warn) 55%,var(--surface-3))'}`}></span>`)}</div>`;
}

const calories = {
  type: 'calories', title: 'Calories', cat: 'Food',
  blurb: "What you've eaten today compared to your target, and your recent days.",
  compact({ state }) {
    const ds = F.days(state, 8);
    const t = ds[ds.length - 1];
    const left = t.target.kcal - t.totals.kcal;
    const past = ds.slice(0, -1).filter(d => d.logged);
    return html`
      <${Head} title="Calories · today" right=${html`<span class="muted"><${Icon} name="food" size=${18} /></span>`} />
      <div class=${'big' + (left < 0 ? ' warn' : '')}>${kc(Math.abs(left))}<small>${left >= 0 ? 'left' : 'over'}</small></div>
      <div class="tiny muted">${kc(t.totals.kcal)} of ${kc(t.target.kcal)}${past.length ? ` · 7-day avg ${kc(avg(past.map(d => d.totals.kcal)))}` : ''}</div>
      <div class="tile-foot" style="display:block"><${Sparkline} values=${ds.map(d => d.logged ? d.totals.kcal : null)} /></div>`;
  },
  detail({ state }) {
    const ds = F.days(state, 14);
    const logged = ds.filter(d => d.logged);
    const within = logged.filter(d => Math.abs(d.totals.kcal - d.target.kcal) <= d.target.kcal * 0.1).length;
    return html`
      <div class="card stack"><span class="eyebrow">Calories, last 14 days</span>
        <${BarChart} goal=${Math.round(avg(ds.map(d => d.target.kcal)))} fmtY=${v => fmtBig(v)} fmtV=${v => v.toLocaleString()} unit="kcal" bars=${ds.map(d => ({ x: d.date, label: shortDay(d.date), value: Math.round(d.totals.kcal), dim: !d.logged, tip: fmtWeekday(d.date) + ', ' + fmtDate(d.date) + (d.logged ? '' : ' · not logged') }))} />
        <span class="tiny muted">The dashed line is your target. ${within} of ${logged.length} logged days were within 10% of it.</span></div>
      <div class="list">${ds.slice().reverse().filter(d => d.logged).map(d => html`<div class="row">
        <div class="grow"><div class="title">${fmtRel(d.date)}</div><div class="sub">${d.train ? 'Training day' : 'Rest day'} · target ${kc(d.target.kcal)}</div></div>
        <span class="num">${kc(d.totals.kcal)}</span>
        <span class=${'pill ' + (Math.abs(d.totals.kcal - d.target.kcal) <= d.target.kcal * 0.1 ? 'good' : d.totals.kcal > d.target.kcal ? 'warn' : '')}>${signed(d.totals.kcal - d.target.kcal, 0)}</span>
      </div>`)}${!logged.length ? html`<div class="empty small">No food logged in the last 2 weeks.</div>` : null}</div>`;
  },
};

const protein = {
  type: 'protein', title: 'Protein', cat: 'Food',
  blurb: 'How often you hit your protein target. It matters most for keeping muscle while dieting.',
  compact({ state }) {
    const r = F.proteinHits(state, 14);
    const ds = F.days(state, 15).slice(0, -1);
    return html`
      <${Head} title="Protein · 14 days" />
      <div class="big">${r.hit}<small>/ ${r.of || 0} days</small></div>
      <div class="tiny muted">${r.of ? `hit target on ${Math.round(r.hit / r.of * 100)}% of logged days` : 'log food to start tracking'}</div>
      <div class="tile-foot" style="display:block"><${DayDots} days=${ds} test=${d => d.totals.p >= d.target.p * 0.95} /></div>`;
  },
  detail({ state }) {
    const ds = F.days(state, 28);
    const logged = ds.filter(d => d.logged);
    const unitKg = A.weightTrend(state).slice(-1)[0];
    const avgP = avg(logged.map(d => d.totals.p));
    return html`
      <div class="card stack"><span class="eyebrow">Protein per day (g), last 4 weeks</span>
        <${BarChart} goal=${Math.round(avg(ds.map(d => d.target.p)))} unit="g protein" bars=${ds.map(d => ({ x: d.date, value: Math.round(d.totals.p), dim: !d.logged || d.totals.p < d.target.p * 0.95, tip: fmtWeekday(d.date) + ', ' + fmtDate(d.date) }))} />
        <span class="tiny muted">Bright bars are days you hit your target. The dashed line is the target.</span></div>
      <div class="summary-grid">
        <div class="stat"><span class="eyebrow">Average</span><span class="mid">${Math.round(avgP)} g</span></div>
        <div class="stat"><span class="eyebrow">g per ${bwUnit(state)} body</span><span class="mid">${unitKg ? fmtNum(avgP / toUnit(unitKg.trend, bwUnit(state)), 2) : '–'}</span></div>
        <div class="stat"><span class="eyebrow">Days hit</span><span class="mid">${logged.filter(d => d.totals.p >= d.target.p * 0.95).length}/${logged.length}</span></div>
      </div>
      <div class="card small text-2">A common evidence-based range when cutting is 1.6–2.2 g of protein per kg of bodyweight (about 0.7–1 g per lb).</div>`;
  },
};

const macroSplit = {
  type: 'macroSplit', title: 'Macros', cat: 'Food', wide: true,
  blurb: 'Where your calories come from: protein, carbs and fat.',
  compact({ state }) { return html`<${Head} title="Macros · last 7 days" /><${SplitBar} state=${state} n=${7} />`; },
  detail({ state }) {
    const [n, setN] = useState(7);
    return html`
      <${Seg} label="Window" value=${n} onChange=${setN} options=${[[7, '7 days'], [14, '14 days'], [28, '28 days']]} />
      <div class="card stack"><${SplitBar} state=${state} n=${n} detail=${true} /></div>`;
  },
};

function SplitBar({ state, n, detail }) {
  const ds = F.completeDays(state, n);
  if (!ds.length) return html`<div class="small text-2">Log a full day of food to see your split.</div>`;
  const a = { p: avg(ds.map(d => d.totals.p)), c: avg(ds.map(d => d.totals.c)), f: avg(ds.map(d => d.totals.f)) };
  const kcal = { p: a.p * 4, c: a.c * 4, f: a.f * 9 };
  const total = kcal.p + kcal.c + kcal.f || 1;
  const col = { p: 'var(--accent)', c: 'var(--good)', f: 'var(--warn)' };
  const tg = F.targetFor(state, dayKey(new Date()));
  return html`
    <div style="display:flex;height:12px;border-radius:999px;overflow:hidden;gap:2px">
      ${['p', 'c', 'f'].map(m => html`<div style=${`width:${kcal[m] / total * 100}%;background:${col[m]}`}></div>`)}
    </div>
    <div class="grid3">${['p', 'c', 'f'].map(m => html`<div>
      <div class="hstack" style="gap:6px"><span style=${`width:8px;height:8px;border-radius:2px;background:${col[m]}`}></span><span class="tiny muted">${F.MACRO[m]}</span></div>
      <div class="mid">${Math.round(kcal[m] / total * 100)}%</div>
      <div class="tiny muted num">${Math.round(a[m])} g avg${detail ? ` · target ${tg[m]} g` : ''}</div>
    </div>`)}</div>
    ${detail ? html`<span class="tiny muted">Average of ${ds.length} logged days, not counting today.</span>` : null}`;
}

const trainRest = {
  type: 'trainRest', title: 'Workout vs rest days', cat: 'Food',
  blurb: "How much you eat on days you train compared to days you don't (last 4 weeks).",
  compact({ state }) {
    const ds = F.completeDays(state, 28);
    const tr = ds.filter(d => d.train), rs = ds.filter(d => !d.train);
    return html`<${Head} title="Workout vs rest" />
      <div class="kv small" style="margin-top:4px">
        <span class="text-2">Workout days</span><span class="num" style="font-weight:600">${tr.length ? kc(avg(tr.map(d => d.totals.kcal))) : '–'}</span>
        <span class="text-2">Rest days</span><span class="num" style="font-weight:600">${rs.length ? kc(avg(rs.map(d => d.totals.kcal))) : '–'}</span>
      </div>
      <div class="tiny muted tile-foot" style="display:block">average kcal · ${tr.length} workout, ${rs.length} rest days</div>`;
  },
  detail({ state }) {
    const ds = F.completeDays(state, 28);
    const grp = [['Training days', ds.filter(d => d.train)], ['Rest days', ds.filter(d => !d.train)]];
    return html`<div class="list">${grp.map(([l, g]) => html`<div class="row" style="align-items:flex-start">
      <div class="grow"><div class="title">${l}</div><div class="sub">${g.length} logged days</div></div>
      <div style="text-align:right" class="small num">
        <div><b>${g.length ? kc(avg(g.map(d => d.totals.kcal))) : '–'}</b> kcal <span class="muted">/ ${g.length ? kc(avg(g.map(d => d.target.kcal))) : '–'}</span></div>
        <div class="muted">${g.length ? `${Math.round(avg(g.map(d => d.totals.p)))}p ${Math.round(avg(g.map(d => d.totals.c)))}c ${Math.round(avg(g.map(d => d.totals.f)))}f` : ''}</div>
      </div></div>`)}</div>
      <div class="card small text-2">Eating more carbs on workout days gives you energy to train, and eating a bit less on rest days keeps your weekly calories on track.</div>`;
  },
};

// ================================================================ COMBINED

function weeklyStrength(state, weeksBack) {
  // Average % change in best e1RM per week across the main lifts.
  const lifts = A.topLifts(state, 5);
  const start = addDays(startOfWeek(new Date(), state.settings.weekStart), -7 * (weeksBack - 1));
  const out = [];
  for (let i = 0; i < weeksBack; i++) {
    const s = +addDays(start, 7 * i), e = s + 7 * DAY;
    const changes = [];
    for (const id of lifts) {
      const h = A.exerciseHistory(state, id);
      const before = h.filter(p => p.date < s).slice(-3);
      const inW = h.filter(p => p.date >= s && p.date < e);
      if (!before.length || !inW.length) continue;
      const ref = Math.max(...before.map(p => p.e1rm));
      const now = Math.max(...inW.map(p => p.e1rm));
      if (ref) changes.push((now - ref) / ref);
    }
    out.push({ start: s, change: changes.length ? avg(changes) : null });
  }
  return out;
}

const tdee = {
  type: 'tdee', title: 'Calorie burn', cat: 'Combined',
  blurb: 'How many calories you really burn a day, worked out from what you ate and how your weight changed.',
  compact({ state }) {
    const r = F.adaptiveTDEE(state);
    if (!r.ready) return html`<${Head} title="Calorie burn" />
      <div class="small text-2">Needs about 2 weeks of food and weight logs.</div>
      <div class="tiny muted tile-foot" style="display:block">${r.logged} of ${r.need} food days so far</div>`;
    const deficit = r.tdee - r.avgIntake;
    return html`<${Head} title="Calorie burn" />
      <div class="big">${kc(r.tdee)}<small>kcal</small></div>
      <div class="tiny muted tile-foot" style="display:block">eating ${kc(Math.abs(deficit))} ${deficit >= 0 ? 'under' : 'over'} it on average</div>`;
  },
  detail({ state }) {
    const r = F.adaptiveTDEE(state);
    const unit = bwUnit(state);
    const tg = state.food;
    if (!r.ready) return html`<div class="card small text-2">Log your food and weigh in most days. After about two weeks (${r.logged} of ${r.need} food days so far) Tally can estimate your real daily burn, which is usually more accurate than any formula.</div>`;
    const avgTarget = tg.split ? (tg.train.kcal * tg.trainDays.length + tg.rest.kcal * (7 - tg.trainDays.length)) / 7 : tg.train.kcal;
    const predicted = (avgTarget - r.tdee) * 7 / 7700;
    return html`
      <div class="summary-grid">
        <div class="stat"><span class="eyebrow">Burn</span><span class="mid">${kc(r.tdee)}</span><span class="tiny muted">kcal/day</span></div>
        <div class="stat"><span class="eyebrow">Eating</span><span class="mid">${kc(r.avgIntake)}</span><span class="tiny muted">avg/day</span></div>
        <div class="stat"><span class="eyebrow">Weight</span><span class="mid">${signed(toUnit(r.dKgPerWeek, unit), 1)}</span><span class="tiny muted">${unit}/wk</span></div>
      </div>
      <div class="card small text-2 stack">
        <span>Based on ${r.logged} logged days over the last ${r.window} days. Your weight moved ${signed(toUnit(r.dKgPerWeek, unit), 2)} ${unit} a week. Each kg of body weight is about 7,700 kcal, so Tally works out your burn from how much you ate and how much you lost or gained.</span>
        <span>If you eat your current targets (about <b class="num">${kc(avgTarget)}</b> a day on average), expect roughly <b class="num">${signed(toUnit(predicted, unit), 1)} ${unit}</b> a week.</span>
        <span class="tiny muted">Days you forget to log make this look higher than it is, so log complete days.</span>
      </div>
      <button class="btn block" onClick=${() => nav.go('targets')}>Adjust targets</button>`;
  },
};

const deficit = {
  type: 'deficit', title: 'Strength while dieting', cat: 'Combined', wide: true,
  blurb: 'Are you keeping your strength while eating less? If it keeps dropping, you may be losing muscle.',
  compact({ state }) {
    const r = F.adaptiveTDEE(state);
    const ws = weeklyStrength(state, 4).filter(x => x.change != null);
    const sc = ws.length ? avg(ws.map(x => x.change)) : null;
    const status = sc == null ? null : sc >= -0.005 ? ['good', 'Strength holding'] : sc > -0.02 ? ['warn', 'Slight dip'] : ['bad', 'Strength dropping'];
    return html`<${Head} title="Strength while dieting" right=${status ? html`<span class=${'pill ' + status[0]}>${status[1]}</span>` : null} />
      <div class="grid2">
        <div><div class="mid">${r.ready ? kc(r.tdee - r.avgIntake) : '–'}</div><div class="tiny muted">kcal a day below your burn</div></div>
        <div><div class=${'mid ' + (sc == null ? '' : sc >= -0.005 ? 'good' : 'warn')}>${sc == null ? '–' : signed(sc * 100, 1) + '%'}</div><div class="tiny muted">strength change a week, main lifts, last 4 weeks</div></div>
      </div>`;
  },
  detail({ state }) {
    const ws = weeklyStrength(state, 8);
    const fd = F.days(state, 56);
    const weeksIntake = ws.map(w => { const d = fd.filter(x => x.date >= w.start && x.date < w.start + 7 * DAY && x.logged && x.key !== dayKey(new Date())); return { ...w, kcal: d.length ? avg(d.map(x => x.totals.kcal)) : 0, n: d.length }; });
    const r = F.adaptiveTDEE(state);
    return html`
      <div class="card stack"><span class="eyebrow">Average calories a day, by week</span>
        <${BarChart} goal=${r.ready ? Math.round(r.tdee) : undefined} fmtY=${v => fmtBig(v)} fmtV=${v => v.toLocaleString()} unit="kcal/day" bars=${weeksIntake.map(w => ({ x: w.start, week: true, value: Math.round(w.kcal), dim: !w.n }))} />
        <span class="tiny muted">${r.ready ? 'The dashed line is your calorie burn. Bars below it are weeks you ate less than you burned.' : 'Your burn line shows up once Calorie burn has about two weeks of data.'}</span></div>
      <div class="list">${weeksIntake.slice().reverse().map(w => html`<div class="row">
        <div class="grow"><div class="title">Week of ${fmtDate(w.start)}</div><div class="sub">${w.n ? `${kc(w.kcal)} kcal avg over ${w.n} days` : 'no food logged'}</div></div>
        <span class=${'pill ' + (w.change == null ? '' : w.change >= 0 ? 'good' : w.change > -0.02 ? 'warn' : 'bad')}>${w.change == null ? 'no lifts' : signed(w.change * 100, 1) + '%'}</span>
      </div>`)}</div>
      <div class="card small text-2">The percentage is how your main lifts changed that week compared with your recent best. Small dips are normal. If it drops several weeks in a row while you're eating a lot less, eat a bit more, especially protein.</div>`;
  },
};

function weekScore(state, offset = 0) {
  const ws = state.settings.weekStart;
  const s = addDays(startOfWeek(new Date(), ws), -7 * offset);
  const isCur = offset === 0;
  const elapsed = isCur ? Math.max(1, Math.ceil((Date.now() - s) / DAY)) : 7;
  const b = A.weeks(state, offset + 1)[0];
  const goal = state.settings.weeklyGoal;
  const fd = F.days(state, 7 * (offset + 1) + 7).filter(d => d.date >= +s && d.date < +s + 7 * DAY && (!isCur || d.key !== dayKey(new Date())));
  const logged = fd.filter(d => d.logged);
  const denom = isCur ? Math.max(1, elapsed - 1) : 7;
  const train = Math.min(1, b.sessions / (isCur ? Math.max(1, goal * elapsed / 7) : goal));
  const prot = logged.filter(d => d.totals.p >= d.target.p * 0.95).length / denom;
  const cal = logged.filter(d => Math.abs(d.totals.kcal - d.target.kcal) <= d.target.kcal * 0.1).length / denom;
  const wkeys = new Set(state.bodyweight.map(x => x.date));
  const weighs = fd.filter(d => wkeys.has(d.key)).length;
  const weigh = Math.min(1, weighs / Math.max(1, Math.min(4, isCur ? elapsed : 4)));
  const parts = [['Training', train, 40], ['Protein', Math.min(1, prot), 25], ['Calories', Math.min(1, cal), 20], ['Weigh-ins', weigh, 15]];
  return { start: s, total: Math.round(parts.reduce((a, [, v, m]) => a + v * m, 0)), parts };
}

const score = {
  type: 'score', title: 'Weekly score', cat: 'Combined',
  blurb: 'One score out of 100 for your week: workouts, protein, calories and weigh-ins.',
  compact({ state }) {
    const r = weekScore(state, 0);
    const col = r.total >= 80 ? 'good' : r.total >= 55 ? '' : 'warn';
    return html`<${Head} title="Weekly score" />
      <div class=${'big ' + col}>${r.total}<small>/ 100</small></div>
      <div class="tile-foot" style="display:flex;flex-direction:column;gap:4px;align-items:stretch">${r.parts.map(([l, v]) => html`<div class="meter thin" title=${l}><i class=${v >= 0.95 ? 'good' : ''} style=${`width:${v * 100}%`}></i></div>`)}</div>`;
  },
  detail({ state }) {
    const r = weekScore(state, 0);
    const hist = Array.from({ length: 8 }, (_, i) => weekScore(state, 7 - i));
    return html`
      <div class="card stack">
        ${r.parts.map(([l, v, m]) => html`<div class="stack" style="gap:6px">
          <div class="hstack" style="justify-content:space-between"><span class="small">${l}</span><span class="num small">${Math.round(v * m)} / ${m}</span></div>
          <div class="meter thin"><i class=${v >= 0.95 ? 'good' : ''} style=${`width:${v * 100}%`}></i></div></div>`)}
        <span class="tiny muted">Workouts: how close you are to your weekly goal for this point in the week. Protein and calories: days you hit your target (calories within 10%). Weigh-ins: up to 4 a week. Today's food counts once the day is over.</span>
      </div>
      <div class="card stack"><span class="eyebrow">Score, last 8 weeks</span>
        <${BarChart} goal=${80} unit="/ 100" bars=${hist.map(h => ({ x: h.start, week: true, value: h.total, dim: h.total < 80 }))} /></div>`;
  },
};

const proteinProgress = {
  type: 'proteinProgress', title: 'Protein and strength', cat: 'Combined',
  blurb: 'Do you get stronger in weeks you hit your protein? This compares those weeks with the ones you missed.',
  compact({ state }) {
    const rows = ppRows(state);
    const good = rows.filter(r => r.hitRate >= 0.8 && r.change != null), bad = rows.filter(r => r.hitRate < 0.8 && r.change != null);
    return html`<${Head} title="Protein and strength" />
      <div class="kv small" style="margin-top:4px">
        <span class="text-2">Hit protein</span><span class="num good" style="font-weight:600">${good.length ? signed(avg(good.map(r => r.change)) * 100, 1) + '%' : '–'}</span>
        <span class="text-2">Missed it</span><span class="num" style="font-weight:600">${bad.length ? signed(avg(bad.map(r => r.change)) * 100, 1) + '%' : '–'}</span>
      </div>
      <div class="tiny muted tile-foot" style="display:block">strength change a week, by week type (last 8 weeks)</div>`;
  },
  detail({ state }) {
    const rows = ppRows(state);
    return html`<div class="list">${rows.slice().reverse().map(r => html`<div class="row">
        <div class="grow"><div class="title">Week of ${fmtDate(r.start)}</div><div class="sub">protein hit ${r.hit} of ${r.n} logged days</div></div>
        <span class=${'pill ' + (r.change == null ? '' : r.change >= 0 ? 'good' : 'warn')}>${r.change == null ? '–' : signed(r.change * 100, 1) + '%'}</span>
      </div>`)}</div>
      <div class="card small text-2">A week counts as hitting protein when you reached your target on at least 80% of the days you logged. The more weeks you log, the more this means.</div>`;
  },
};

function ppRows(state) {
  const ws = weeklyStrength(state, 8);
  const fd = F.days(state, 57);
  return ws.map(w => {
    const d = fd.filter(x => x.date >= w.start && x.date < w.start + 7 * DAY && x.logged && x.key !== dayKey(new Date()));
    const hit = d.filter(x => x.totals.p >= x.target.p * 0.95).length;
    return { ...w, n: d.length, hit, hitRate: d.length ? hit / d.length : 0 };
  }).filter(r => r.n);
}


// ================================================================ BODY: measurements
const measure = {
  type: 'measure', title: 'Measurements', cat: 'Body',
  blurb: 'Your latest body measurements and how they changed. Waist comes first because it tracks fat loss best.',
  compact({ state }) {
    const keys = MEASURES.map(m => m[0]).filter(k => series(state, k).length);
    if (!keys.length) return html`<${Head} title="Measurements" />
      <div class="small text-2">Track waist, arms and more to see changes the scale misses.</div>
      <div class="tile-foot"><button class="btn sm primary" onClick=${e => { e.stopPropagation(); logMeasurements(); }}>Log</button></div>`;
    const k = keys.includes('waist') ? 'waist' : keys[0];
    const s = series(state, k);
    const d = s.length > 1 ? s[s.length - 1].value - s[0].value : null;
    const conv = v => k === 'bodyfat' ? v : lenUnit(state) === 'in' ? v / 2.54 : v;
    return html`<${Head} title=${MEASURES.find(m => m[0] === k)[1]} />
      <div class="big" style="font-size:26px">${showVal(state, k, s[s.length - 1].value)}</div>
      <div class="tiny muted">${d == null ? 'one entry so far' : html`<span class=${d < 0 ? 'good' : 'text-2'}>${signed(conv(d), 1)}</span> since first entry`}</div>
      <div class="tile-foot" style="display:block"><${Sparkline} values=${s.slice(-12).map(p => p.value)} /></div>`;
  },
  detail({ state }) {
    return html`<div class="list">${MEASURES.map(([k, label]) => {
      const s = series(state, k);
      return html`<button class="row" onClick=${() => s.length ? nav.go('measure', { key: k }) : logMeasurements()}>
        <div class="grow"><div class="title">${label}</div><div class="sub">${s.length ? `${s.length} entries` : 'Not logged yet'}</div></div>
        <span class="num">${s.length ? showVal(state, k, s[s.length - 1].value) : ''}</span><span class="chev"><${Icon} name="chev" size=${18} /></span>
      </button>`;
    })}</div>
    <button class="btn primary block" onClick=${() => logMeasurements()}>Log measurements</button>`;
  },
};

// Order here is the order cards appear in each section of Stats and Insights.
export const CARDS = { week, streak, calendar, muscles, volume, sessionLength, strength, prs, lift, plateau, cardio, bodyweight, measure, calories, protein, macroSplit, trainRest, tdee, score, deficit, proteinProgress };
export const CAT_LABEL = { Combined: 'Food and training' };
export const CATEGORIES = ['Combined', 'Training', 'Strength', 'Food', 'Body', 'Cardio'];
export const COMING = [];
