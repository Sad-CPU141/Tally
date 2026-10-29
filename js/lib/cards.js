// The analytics card library. Each card has a compact tile for Today
// and a detail view with the full chart and breakdown.

import { html, useState } from '../vendor/preact-htm.js';
import * as A from './analytics.js';
import { Sparkline, LineChart, BarChart } from './charts.js';
import { Icon, Tally, nav, Seg } from './ui.js';
import { logBodyweight } from './actions.js';
import * as F from './food.js';
import { w, toUnit, fmtNum, fmtBig, signed, fmtDate, fmtRel, fmtMins, fmtDur, toDist, startOfWeek, addDays, dayKey, DAY } from './util.js';

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
  blurb: 'Sessions against your weekly goal, with sets, volume and time.',
  compact({ state }) {
    const b = A.weeks(state, 2);
    const cur = b[1], prev = b[0];
    const goal = state.settings.weeklyGoal, unit = unitOf(state);
    const left = Math.max(0, goal - cur.sessions);
    return html`
      <${Head} title="This week" right=${html`<span class=${'pill ' + (cur.sessions >= goal ? 'good' : 'accent')}>${cur.sessions >= goal ? 'Goal hit' : `${left} to go`}</span>`} />
      <div class="hstack" style="justify-content:space-between;align-items:flex-end">
        <div class="big">${cur.sessions}<small>/ ${goal} sessions</small></div>
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
        <span class="eyebrow">Sessions per week</span>
        <${BarChart} goal=${goal} bars=${b.map((x, i) => ({ label: fmtDate(x.start).split(' ')[1] + (i === b.length - 1 ? '*' : ''), value: x.sessions, dim: x.sessions < goal }))} />
        <span class="tiny muted">Dashed line is your goal of ${goal}. Weeks start ${['Sunday', 'Monday'][state.settings.weekStart]}. * this week.</span>
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
const bodyweight = {
  type: 'bodyweight', title: 'Bodyweight', cat: 'Body',
  blurb: 'Smoothed trend weight and your weekly rate of change.',
  compact({ state }) {
    const unit = unitOf(state);
    const tr = A.weightTrend(state);
    if (!tr.length) return html`
      <${Head} title="Bodyweight" />
      <div class="text-2 small">Log your weight to start a trend line.</div>
      <div class="tile-foot"><button class="btn sm primary" onClick=${e => { e.stopPropagation(); logBodyweight(); }}>Log weight</button></div>`;
    const last = tr[tr.length - 1];
    const rate = A.weightRate(state);
    const lossy = rate != null && rate < 0;
    return html`
      <${Head} title="Bodyweight" right=${html`<button class="icon-btn" style="width:30px;height:30px;margin:-6px -6px -6px 0" aria-label="Log weight" onClick=${e => { e.stopPropagation(); logBodyweight(); }}><${Icon} name="plus" size=${18} /></button>`} />
      <div class="big">${w(last.trend, unit)}<small>${unit}</small></div>
      <div class="tiny muted">trend · <span class=${lossy ? 'good' : 'text-2'}>${rate == null ? 'need 3+ weigh-ins' : signed(toUnit(rate, unit), 1) + ' ' + unit + '/wk'}</span></div>
      <div class="tile-foot" style="display:block"><${Sparkline} values=${tr.slice(-30).map(p => p.trend)} /></div>`;
  },
  detail({ state }) {
    const unit = unitOf(state);
    const [range, setRange] = useState('12w');
    const [all, setAll] = useState(false);
    const tr = A.weightTrend(state);
    const cut = Date.now() - rangeDays(range) * DAY;
    const pts = tr.filter(p => p.date >= cut);
    const rate = A.weightRate(state);
    const last = tr[tr.length - 1];
    const first = pts[0];
    return html`
      <button class="btn primary block" onClick=${() => logBodyweight()}><${Icon} name="plus" size=${18} /> Log weight</button>
      <div class="card stack">
        <div class="hstack" style="justify-content:space-between">
          <span class="eyebrow">Trend</span>
          <${RangePick} value=${range} onChange=${setRange} />
        </div>
        <${LineChart} fmtY=${v => fmtNum(toUnit(v, unit), 0)}
          points=${pts.map(p => ({ x: p.date, y: p.trend }))}
          raw=${pts.map(p => ({ x: p.date, y: p.raw }))} />
        <span class="tiny muted">Dots are your weigh-ins. The line is the smoothed trend, which is what to judge progress by.</span>
      </div>
      ${last ? html`<div class="summary-grid">
        <div class="stat"><span class="eyebrow">Trend</span><span class="mid">${w(last.trend, unit)}</span></div>
        <div class="stat"><span class="eyebrow">Per week</span><span class="mid">${rate == null ? '–' : signed(toUnit(rate, unit), 1)}</span></div>
        <div class="stat"><span class="eyebrow">In range</span><span class="mid">${first ? signed(toUnit(last.trend - first.trend, unit), 1) : '–'}</span></div>
      </div>` : null}
      ${rate != null && last ? html`<div class="card small text-2">
        ${rate < 0
          ? html`Losing about <b class="num">${fmtNum(toUnit(-rate, unit), 1)} ${unit}</b> a week, ${fmtNum(-rate / last.trend * 100, 2)}% of bodyweight. To hold on to muscle, a common target when cutting is 0.5–1% per week.`
          : html`Gaining about <b class="num">${fmtNum(toUnit(rate, unit), 1)} ${unit}</b> a week over the last 3 weeks.`}
      </div>` : null}
      <div class="section-head"><span class="h-md">Weigh-ins</span></div>
      <div class="list">
        ${tr.slice().reverse().slice(0, all ? 400 : 14).map(p => html`<button class="row" onClick=${() => logBodyweight(p.key)}>
          <div class="grow"><div class="title">${fmtRel(p.date)}</div><div class="sub">trend ${w(p.trend, unit)}</div></div>
          <span class="num">${w(p.raw, unit)} ${unit}</span>
        </button>`)}
        ${!tr.length ? html`<div class="empty">No weigh-ins yet.</div>` : null}
      </div>
      ${tr.length > 14 && !all ? html`<button class="btn ghost block" onClick=${() => setAll(true)}>Show all ${tr.length} weigh-ins</button>` : null}`;
  },
};

// ---------------------------------------------------------------- streak
const streak = {
  type: 'streak', title: 'Weekly streak', cat: 'Training',
  blurb: 'Weeks in a row you hit your session goal.',
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
      <span class="eyebrow">Last 26 weeks</span>
      <${BarChart} goal=${goal} bars=${b.map(x => ({ label: fmtDate(x.start).split(' ')[0], value: x.sessions, dim: x.sessions < goal }))} />
      <span class="tiny muted">Highlighted weeks hit your goal of ${goal} sessions. Change the goal in Me → Training.</span>
    </div>`;
  },
};

// ---------------------------------------------------------------- strength (key lifts)
function liftList(state, opts) { return (opts.lifts && opts.lifts.length ? opts.lifts : A.topLifts(state, 4)).filter(id => A.exMap(state).has(id)); }

const strength = {
  type: 'strength', title: 'Strength', cat: 'Strength', wide: true,
  blurb: 'Estimated one-rep max for your main lifts and the change over 4 weeks.',
  compact({ state, opts }) {
    const unit = unitOf(state);
    const lifts = liftList(state, opts);
    return html`
      <${Head} title="Est. 1RM · 4 weeks" />
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
      <div class="hstack" style="justify-content:space-between"><span class="eyebrow">Estimated 1RM</span><${RangePick} value=${range} onChange=${setRange} /></div>
      <${LineChart} fmtY=${v => fmtNum(toUnit(v, unit), 0)} points=${pts.filter(p => p.e1rm).map(p => ({ x: p.date, y: p.e1rm }))} />
      <span class="tiny muted">Estimated from your best set each session (Epley formula). Sets over 12 reps are capped since estimates get unreliable.</span>
    </div>
    ${chartOnly ? null : html`
    <div class="summary-grid">
      <div class="stat"><span class="eyebrow">Best e1RM</span><span class="mid">${w(best.e1rm, unit, 0)}</span><span class="tiny muted">${best.date ? fmtDate(best.date) : ''}</span></div>
      <div class="stat"><span class="eyebrow">Heaviest</span><span class="mid">${w(heaviest.top, unit)}</span><span class="tiny muted">${heaviest.date ? `× ${heaviest.topReps}` : ''}</span></div>
      <div class="stat"><span class="eyebrow">Sessions</span><span class="mid">${h.length}</span><span class="tiny muted">all time</span></div>
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
  type: 'lift', title: 'Single lift', cat: 'Strength', configurable: true,
  blurb: 'One lift of your choice with its e1RM trend. Add as many as you like.',
  compact({ state, opts }) {
    const unit = unitOf(state);
    const id = opts.exId || A.topLifts(state, 1)[0];
    if (!id) return html`<${Head} title="Lift" /><div class="small text-2">No lifts logged yet.</div>`;
    const h = A.exerciseHistory(state, id);
    const c = A.strengthChange(state, id, 28);
    return html`
      <${Head} title=${exName(state, id)} />
      <div class="big">${c ? w(c.current, unit, 0) : '–'}<small>${unit}</small></div>
      <div class="tiny muted">e1RM · <span class=${c && c.change > 0 ? 'good' : 'text-2'}>${c ? signed(toUnit(c.change, unit), 0) + ' in 4 wk' : 'no data'}</span></div>
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
  blurb: 'Hard sets per muscle this week against a 10–20 set range.',
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
  blurb: 'PRs set in the last 30 days and the latest one.',
  compact({ state }) {
    const ev = A.prEvents(state);
    const month = ev.filter(e => e.date >= Date.now() - 30 * DAY && e.kind !== 'vol');
    const latest = ev.filter(e => e.kind !== 'vol').slice(-1)[0];
    return html`
      <${Head} title="PRs · 30 days" right=${html`<span class="muted"><${Icon} name="trophy" size=${18} /></span>`} />
      <div class="big">${month.length}</div>
      <div class="tiny muted tile-foot" style="display:block">${latest ? html`Latest: <span class="text-2">${exName(state, latest.exId)}</span> · ${prValue(latest, state)}` : 'No PRs yet. They appear after your second session of a lift.'}</div>`;
  },
  detail({ state }) {
    const [kind, setKind] = useState('all');
    let ev = A.prEvents(state).slice().reverse();
    if (kind !== 'all') ev = ev.filter(e => e.kind === kind);
    return html`
      <div class="chips">${[['all', 'All'], ['kg', 'Heaviest'], ['e1rm', 'Est. 1RM'], ['vol', 'Best set'], ['reps', 'Reps'], ['sprint', 'Sprints'], ['km', 'Distance']].map(([k, l]) => html`<button class="chip" aria-pressed=${kind === k} onClick=${() => setKind(k)}>${l}</button>`)}</div>
      <div class="list">
        ${ev.slice(0, 80).map(p => html`<button class="row" onClick=${() => nav.go('workoutView', { id: p.workoutId })}>
          <div class="grow"><div class="title">${exName(state, p.exId)}</div><div class="sub">${A.PR_LABEL[p.kind]} · ${fmtDate(p.date)}</div></div>
          <span class="num small">${prValue(p, state)}</span>
        </button>`)}
        ${!ev.length ? html`<div class="empty">No PRs yet.</div>` : null}
      </div>`;
  },
};

// ---------------------------------------------------------------- plateau watch
const plateau = {
  type: 'plateau', title: 'Plateau watch', cat: 'Strength',
  blurb: 'Lifts with no new best estimated 1RM in their last 4 sessions.',
  compact({ state }) {
    const p = A.plateaus(state, 4);
    return html`
      <${Head} title="Plateau watch" />
      ${p.length ? html`<div class="big warn">${p.length}</div><div class="tiny muted tile-foot" style="display:block">${p.slice(0, 2).map(x => exName(state, x.exId)).join(', ')} stalled</div>`
        : html`<div class="big good" style="font-size:22px">All moving</div><div class="tiny muted tile-foot" style="display:block">Every main lift set a best in its last 4 sessions.</div>`}`;
  },
  detail({ state }) {
    const p = A.plateaus(state, 4), unit = unitOf(state);
    return html`
      <div class="card small text-2">A lift shows up here when its last 4 sessions didn't beat its earlier best e1RM. Common fixes: change the rep range, add a set, take a deload week, or check that you're eating enough.</div>
      <div class="list">${p.map(x => html`<button class="row" onClick=${() => nav.go('exercise', { id: x.exId })}>
        <div class="grow"><div class="title">${exName(state, x.exId)}</div><div class="sub">best ${w(x.best, unit, 0)} ${unit} e1RM</div></div><span class="pill warn">Stalled</span>
      </button>`)}${!p.length ? html`<div class="empty">Nothing stalled.</div>` : null}</div>`;
  },
};

// ---------------------------------------------------------------- volume
const volume = {
  type: 'volume', title: 'Weekly volume', cat: 'Training',
  blurb: 'Total weight lifted (weight × reps) per week.',
  compact({ state }) {
    const unit = unitOf(state);
    const b = A.weeks(state, 8);
    const cur = b[b.length - 1], prev = b[b.length - 2];
    const pct = prev.td.volume ? (cur.volume - prev.td.volume) / prev.td.volume * 100 : null;
    return html`
      <${Head} title="Volume" />
      <div class="big">${fmtBig(toUnit(cur.volume, unit))}<small>${unit}</small></div>
      <div class="tiny muted">this week${pct != null ? html` · <span class=${pct >= 0 ? 'good' : 'text-2'}>${signed(pct, 0)}%</span> vs last` : null}</div>
      <div class="tile-foot" style="display:block"><${Sparkline} values=${b.map(x => x.volume)} /></div>`;
  },
  detail({ state }) {
    const unit = unitOf(state);
    const b = A.weeks(state, 12);
    return html`<div class="card stack">
      <span class="eyebrow">Weight lifted per week (${unit})</span>
      <${BarChart} fmtY=${v => fmtBig(toUnit(v, unit))} bars=${b.map(x => ({ label: fmtDate(x.start).split(' ')[1], value: x.volume }))} />
      <span class="tiny muted">Counts working sets only, not warm-ups. Bodyweight exercises count only added weight.</span>
    </div>`;
  },
};

// ---------------------------------------------------------------- calendar
const calendar = {
  type: 'calendar', title: 'Training calendar', cat: 'Training', wide: true,
  blurb: 'Every day you trained over the last few months.',
  compact({ state }) { return html`<${Head} title="Training calendar" /><${Heat} state=${state} weeksBack=${18} />`; },
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
        <${BarChart} fmtY=${v => fmtNum(toDist(v, du), 0)} bars=${b.map(x => ({ label: fmtDate(x.start).split(' ')[1], value: x.km }))} /></div>
      <div class="card stack"><span class="eyebrow">Minutes per week</span>
        <${BarChart} bars=${b.map(x => ({ label: fmtDate(x.start).split(' ')[1], value: Math.round(x.cardioSec / 60) }))} /></div>
      ${sprintHist.length > 1 ? html`<div class="card stack"><span class="eyebrow">Fastest sprint per session (s)</span>
        <${LineChart} area=${false} fmtY=${v => fmtNum(v, 1)} points=${sprintHist.map(p => ({ x: p.date, y: p.sprint }))} />
        <span class="tiny muted">Lower is faster. Compare sprints over the same distance.</span></div>` : null}`;
  },
};

// ---------------------------------------------------------------- session length
const sessionLength = {
  type: 'sessionLength', title: 'Session length', cat: 'Training',
  blurb: 'Average workout duration over the last 4 weeks.',
  compact({ state }) {
    const list = A.finished(state).filter(x => x.start >= Date.now() - 28 * DAY);
    const avg = list.length ? list.reduce((a, x) => a + (x.end - x.start) / 1000, 0) / list.length : 0;
    return html`<${Head} title="Avg session" right=${html`<span class="muted"><${Icon} name="timer" size=${18} /></span>`} />
      <div class="big">${Math.round(avg / 60)}<small>min</small></div>
      <div class="tiny muted tile-foot" style="display:block">${list.length} sessions in 4 weeks</div>`;
  },
  detail({ state }) {
    const b = A.weeks(state, 12);
    return html`<div class="card stack"><span class="eyebrow">Average minutes per session</span>
      <${BarChart} bars=${b.map(x => ({ label: fmtDate(x.start).split(' ')[1], value: x.sessions ? Math.round(x.duration / x.sessions / 60) : 0 }))} /></div>`;
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
  blurb: "Today's intake against your target, and your recent average.",
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
      <div class="card stack"><span class="eyebrow">Last 14 days (kcal)</span>
        <${BarChart} goal=${Math.round(avg(ds.map(d => d.target.kcal)))} fmtY=${v => fmtBig(v)} bars=${ds.map(d => ({ label: shortDay(d.date), value: Math.round(d.totals.kcal), dim: !d.logged }))} />
        <span class="tiny muted">Dashed line is your average target. ${within} of ${logged.length} logged days landed within 10% of target.</span></div>
      <div class="list">${ds.slice().reverse().filter(d => d.logged).map(d => html`<div class="row">
        <div class="grow"><div class="title">${fmtRel(d.date)}</div><div class="sub">${d.train ? 'Training day' : 'Rest day'} · target ${kc(d.target.kcal)}</div></div>
        <span class="num">${kc(d.totals.kcal)}</span>
        <span class=${'pill ' + (Math.abs(d.totals.kcal - d.target.kcal) <= d.target.kcal * 0.1 ? 'good' : d.totals.kcal > d.target.kcal ? 'warn' : '')}>${signed(d.totals.kcal - d.target.kcal, 0)}</span>
      </div>`)}${!logged.length ? html`<div class="empty small">No food logged in the last 2 weeks.</div>` : null}</div>`;
  },
};

const protein = {
  type: 'protein', title: 'Protein consistency', cat: 'Food',
  blurb: 'How many days you hit your protein target. The most important number for keeping muscle on a cut.',
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
      <div class="card stack"><span class="eyebrow">Protein per day (g), last 28 days</span>
        <${BarChart} goal=${Math.round(avg(ds.map(d => d.target.p)))} bars=${ds.map(d => ({ label: fmtDate(d.date).split(' ')[1], value: Math.round(d.totals.p), dim: !d.logged || d.totals.p < d.target.p * 0.95 }))} />
        <span class="tiny muted">Highlighted bars hit the target (within 5%).</span></div>
      <div class="summary-grid">
        <div class="stat"><span class="eyebrow">Average</span><span class="mid">${Math.round(avgP)} g</span></div>
        <div class="stat"><span class="eyebrow">Per ${state.settings.unit}</span><span class="mid">${unitKg ? fmtNum(avgP / toUnit(unitKg.trend, state.settings.unit), 2) : '–'}</span></div>
        <div class="stat"><span class="eyebrow">Days hit</span><span class="mid">${logged.filter(d => d.totals.p >= d.target.p * 0.95).length}/${logged.length}</span></div>
      </div>
      <div class="card small text-2">A common evidence-based range when cutting is 1.6–2.2 g of protein per kg of bodyweight (about 0.7–1 g per lb).</div>`;
  },
};

const macroSplit = {
  type: 'macroSplit', title: 'Macro split', cat: 'Food', wide: true,
  blurb: 'Where your calories come from on average.',
  compact({ state }) { return html`<${Head} title="Macro split · 7 days" /><${SplitBar} state=${state} n=${7} />`; },
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
  type: 'trainRest', title: 'Training vs rest days', cat: 'Food',
  blurb: 'Average intake on days you trained compared to rest days, last 4 weeks.',
  compact({ state }) {
    const ds = F.completeDays(state, 28);
    const tr = ds.filter(d => d.train), rs = ds.filter(d => !d.train);
    return html`<${Head} title="Train vs rest" />
      <div class="kv small" style="margin-top:4px">
        <span class="text-2">Training</span><span class="num" style="font-weight:600">${tr.length ? kc(avg(tr.map(d => d.totals.kcal))) : '–'}</span>
        <span class="text-2">Rest</span><span class="num" style="font-weight:600">${rs.length ? kc(avg(rs.map(d => d.totals.kcal))) : '–'}</span>
      </div>
      <div class="tiny muted tile-foot" style="display:block">kcal avg · ${tr.length} training, ${rs.length} rest days</div>`;
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
      <div class="card small text-2">Eating more carbs around training days fuels sessions and sprints, while lower rest days keep the weekly deficit on track.</div>`;
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
  type: 'tdee', title: 'Adaptive burn', cat: 'Combined',
  blurb: 'What your body actually burns, worked out from what you ate and how your trend weight moved.',
  compact({ state }) {
    const r = F.adaptiveTDEE(state);
    if (!r.ready) return html`<${Head} title="Adaptive burn" />
      <div class="small text-2">Needs about 2 weeks of food and weight logs.</div>
      <div class="tiny muted tile-foot" style="display:block">${r.logged} of ${r.need} food days so far</div>`;
    const deficit = r.tdee - r.avgIntake;
    return html`<${Head} title="Adaptive burn" />
      <div class="big">${kc(r.tdee)}<small>kcal</small></div>
      <div class="tiny muted tile-foot" style="display:block">eating ${kc(Math.abs(deficit))} ${deficit >= 0 ? 'under' : 'over'} it on average</div>`;
  },
  detail({ state }) {
    const r = F.adaptiveTDEE(state);
    const unit = state.settings.unit;
    const tg = state.food;
    if (!r.ready) return html`<div class="card small text-2">Log your food and weigh in most days. After about two weeks (${r.logged} of ${r.need} food days so far) Tally can estimate your real daily burn, which is usually more accurate than any formula.</div>`;
    const avgTarget = tg.split ? (tg.train.kcal * tg.trainDays.length + tg.rest.kcal * (7 - tg.trainDays.length)) / 7 : tg.train.kcal;
    const predicted = (avgTarget - r.tdee) * 7 / 7700;
    return html`
      <div class="summary-grid">
        <div class="stat"><span class="eyebrow">Burn</span><span class="mid">${kc(r.tdee)}</span><span class="tiny muted">kcal/day</span></div>
        <div class="stat"><span class="eyebrow">Eating</span><span class="mid">${kc(r.avgIntake)}</span><span class="tiny muted">avg/day</span></div>
        <div class="stat"><span class="eyebrow">Trend</span><span class="mid">${signed(toUnit(r.dKgPerWeek, unit), 1)}</span><span class="tiny muted">${unit}/wk</span></div>
      </div>
      <div class="card small text-2 stack">
        <span>Based on ${r.logged} logged days over the last ${r.window} days. Your trend weight moved ${signed(toUnit(r.dKgPerWeek, unit), 2)} ${unit} a week, and each kg of change is about 7,700 kcal.</span>
        <span>If you eat your current targets (about <b class="num">${kc(avgTarget)}</b> a day on average), expect roughly <b class="num">${signed(toUnit(predicted, unit), 1)} ${unit}</b> a week.</span>
        <span class="tiny muted">Days you forget to log make this look higher than it is, so log complete days.</span>
      </div>
      <button class="btn block" onClick=${() => nav.go('targets')}>Adjust targets</button>`;
  },
};

const deficit = {
  type: 'deficit', title: 'Strength vs deficit', cat: 'Combined', wide: true,
  blurb: 'Are you keeping your strength while eating in a deficit? The early warning sign for muscle loss.',
  compact({ state }) {
    const r = F.adaptiveTDEE(state);
    const ws = weeklyStrength(state, 4).filter(x => x.change != null);
    const sc = ws.length ? avg(ws.map(x => x.change)) : null;
    const status = sc == null ? null : sc >= -0.005 ? ['good', 'Strength holding'] : sc > -0.02 ? ['warn', 'Slight dip'] : ['bad', 'Strength dropping'];
    return html`<${Head} title="Strength vs deficit · 4 weeks" right=${status ? html`<span class=${'pill ' + status[0]}>${status[1]}</span>` : null} />
      <div class="grid2">
        <div><div class="mid">${r.ready ? kc(r.tdee - r.avgIntake) : '–'}</div><div class="tiny muted">avg daily deficit (kcal)</div></div>
        <div><div class=${'mid ' + (sc == null ? '' : sc >= -0.005 ? 'good' : 'warn')}>${sc == null ? '–' : signed(sc * 100, 1) + '%'}</div><div class="tiny muted">main lifts, est. 1RM per week</div></div>
      </div>`;
  },
  detail({ state }) {
    const ws = weeklyStrength(state, 8);
    const fd = F.days(state, 56);
    const weeksIntake = ws.map(w => { const d = fd.filter(x => x.date >= w.start && x.date < w.start + 7 * DAY && x.logged && x.key !== dayKey(new Date())); return { ...w, kcal: d.length ? avg(d.map(x => x.totals.kcal)) : 0, n: d.length }; });
    const r = F.adaptiveTDEE(state);
    return html`
      <div class="card stack"><span class="eyebrow">Average intake per week (kcal)</span>
        <${BarChart} goal=${r.ready ? Math.round(r.tdee) : undefined} fmtY=${v => fmtBig(v)} bars=${weeksIntake.map(w => ({ label: fmtDate(w.start).split(' ')[1], value: Math.round(w.kcal), dim: !w.n }))} />
        <span class="tiny muted">${r.ready ? 'Dashed line is your adaptive burn. Bars under it are deficit weeks.' : 'Your burn line appears once Adaptive burn has enough data.'}</span></div>
      <div class="list">${weeksIntake.slice().reverse().map(w => html`<div class="row">
        <div class="grow"><div class="title">Week of ${fmtDate(w.start)}</div><div class="sub">${w.n ? `${kc(w.kcal)} kcal avg over ${w.n} days` : 'no food logged'}</div></div>
        <span class=${'pill ' + (w.change == null ? '' : w.change >= 0 ? 'good' : w.change > -0.02 ? 'warn' : 'bad')}>${w.change == null ? 'no lifts' : signed(w.change * 100, 1) + '%'}</span>
      </div>`)}</div>
      <div class="card small text-2">Strength change compares your best estimated 1RM each week with your recent best on your main lifts. Small dips happen. Several weeks in a row going down while in a big deficit is the cue to eat a bit more, especially protein.</div>`;
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
  blurb: 'One number for how the week is going: training, protein, calories and weigh-ins.',
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
        <span class="tiny muted">Training: sessions vs your weekly goal, scaled to how far into the week you are. Protein and calories: days on target (calories within 10%). Weigh-ins: up to 4 a week. Today isn't counted for food until it's over.</span>
      </div>
      <div class="card stack"><span class="eyebrow">Last 8 weeks</span>
        <${BarChart} goal=${80} bars=${hist.map(h => ({ label: fmtDate(h.start).split(' ')[1], value: h.total, dim: h.total < 80 }))} /></div>`;
  },
};

const proteinProgress = {
  type: 'proteinProgress', title: 'Protein vs progress', cat: 'Combined',
  blurb: 'How your strength moved in weeks you hit protein compared to weeks you missed.',
  compact({ state }) {
    const rows = ppRows(state);
    const good = rows.filter(r => r.hitRate >= 0.8 && r.change != null), bad = rows.filter(r => r.hitRate < 0.8 && r.change != null);
    return html`<${Head} title="Protein vs progress" />
      <div class="kv small" style="margin-top:4px">
        <span class="text-2">Weeks on target</span><span class="num good" style="font-weight:600">${good.length ? signed(avg(good.map(r => r.change)) * 100, 1) + '%' : '–'}</span>
        <span class="text-2">Weeks missed</span><span class="num" style="font-weight:600">${bad.length ? signed(avg(bad.map(r => r.change)) * 100, 1) + '%' : '–'}</span>
      </div>
      <div class="tiny muted tile-foot" style="display:block">strength change per week, last 8 weeks</div>`;
  },
  detail({ state }) {
    const rows = ppRows(state);
    return html`<div class="list">${rows.slice().reverse().map(r => html`<div class="row">
        <div class="grow"><div class="title">Week of ${fmtDate(r.start)}</div><div class="sub">protein hit ${r.hit} of ${r.n} logged days</div></div>
        <span class=${'pill ' + (r.change == null ? '' : r.change >= 0 ? 'good' : 'warn')}>${r.change == null ? '–' : signed(r.change * 100, 1) + '%'}</span>
      </div>`)}</div>
      <div class="card small text-2">"On target" means protein hit on at least 80% of logged days that week. With more weeks of data the comparison gets more meaningful.</div>`;
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

export const CARDS = { week, bodyweight, streak, strength, lift, muscles, prs, plateau, volume, calendar, cardio, sessionLength, calories, protein, macroSplit, trainRest, score, tdee, deficit, proteinProgress };
export const CATEGORIES = ['Combined', 'Training', 'Strength', 'Food', 'Body', 'Cardio'];
export const COMING = [];
