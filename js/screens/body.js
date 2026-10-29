// Body tab (shared by Gym and Food mode): bodyweight plus body measurements.

import { html, useState } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import * as A from '../lib/analytics.js';
import { Icon, nav, TopBar, openSheet, closeSheet, SheetHead, toast, confirmSheet, Seg } from '../lib/ui.js';
import { Sparkline, LineChart } from '../lib/charts.js';
import { logBodyweight } from '../lib/actions.js';
import { PhotoStrip } from './photos.js';
import { bwUnit, w, fmtNum, signed, toUnit, todayKey, fmtRel, fmtDate, fromKey, DAY, round } from '../lib/util.js';

// key, label, kind ('len' in cm, 'pct'), a hint shown when logging
export const MEASURES = [
  ['waist', 'Waist', 'len', 'At the belly button, relaxed'],
  ['chest', 'Chest', 'len', 'Around the nipples, arms down'],
  ['hips', 'Hips', 'len', 'Widest point of the glutes'],
  ['arms', 'Arms', 'len', 'Biggest part of the upper arm, flexed'],
  ['thighs', 'Thighs', 'len', 'Widest part, standing'],
  ['calves', 'Calves', 'len', 'Widest part, standing'],
  ['shoulders', 'Shoulders', 'len', 'Around both shoulders at the widest'],
  ['neck', 'Neck', 'len', 'Just below the Adam\'s apple'],
  ['bodyfat', 'Body fat', 'pct', 'From a scale, calipers or scan'],
];
const M = Object.fromEntries(MEASURES.map(m => [m[0], m]));

export const lenUnit = state => bwUnit(state) === 'lb' ? 'in' : 'cm';
const toLen = (cm, u) => u === 'in' ? cm / 2.54 : cm;
const fromLen = (v, u) => u === 'in' ? v * 2.54 : v;
export function showVal(state, key, v) {
  if (v == null) return '–';
  if (M[key][2] === 'pct') return fmtNum(v, 1) + '%';
  return fmtNum(toLen(v, lenUnit(state)), 1) + ' ' + lenUnit(state);
}

export function series(state, key) {
  return state.measurements.filter(m => m.key === key).slice().sort((a, b) => a.date < b.date ? -1 : 1);
}

function change(state, key, days = 30) {
  const s = series(state, key);
  if (s.length < 2) return null;
  const last = s[s.length - 1];
  const cutoff = Date.now() - days * DAY;
  const before = s.filter(p => +fromKey(p.date) <= cutoff);
  const ref = before.length ? before[before.length - 1] : s[0];
  if (ref === last) return null;
  return { delta: last.value - ref.value, since: ref.date };
}

export function logMeasurements(prefillDate) {
  const st0 = store.get();
  const u = lenUnit(st0);
  function Body() {
    const [date, setDate] = useState(prefillDate || todayKey());
    const [vals, setVals] = useState(() => {
      const o = {};
      for (const [k] of MEASURES) { const e = st0.measurements.find(m => m.key === k && m.date === (prefillDate || todayKey())); if (e) o[k] = fmtNum(M[k][2] === 'pct' ? e.value : toLen(e.value, u), 1); }
      return o;
    });
    const last = k => { const s = series(store.get(), k); return s.length ? s[s.length - 1].value : null; };
    const save = () => {
      const entries = Object.entries(vals).filter(([, v]) => v !== '' && !isNaN(parseFloat(v)));
      if (!entries.length) { toast('Enter at least one measurement'); return; }
      store.update(st => {
        for (const [k, v] of entries) {
          const val = M[k][2] === 'pct' ? parseFloat(v) : fromLen(parseFloat(v), u);
          st.measurements = st.measurements.filter(m => !(m.key === k && m.date === date));
          st.measurements.push({ date, key: k, value: round(val, 2) });
        }
      });
      closeSheet(); toast(`${entries.length} ${entries.length === 1 ? 'measurement' : 'measurements'} saved`);
    };
    return html`
      <${SheetHead} title="Log measurements" />
      <div class="field"><label for="ms-date">Date</label><input id="ms-date" class="input" type="date" value=${date} max=${todayKey()} onInput=${e => setDate(e.target.value)} /></div>
      <div class="stack" style="gap:10px">
        ${MEASURES.map(([k, label, kind, hint]) => {
          const l = last(k);
          return html`<div class="hstack" style="gap:12px">
            <div class="grow" style="min-width:0"><label class="title" for=${'ms-' + k} style="font-weight:600">${label}</label><div class="tiny muted">${hint}</div></div>
            <input id=${'ms-' + k} class="input num" style="width:96px;text-align:center" inputmode="decimal"
              placeholder=${l == null ? (kind === 'pct' ? '%' : u) : fmtNum(kind === 'pct' ? l : toLen(l, u), 1)}
              value=${vals[k] || ''} onInput=${e => setVals({ ...vals, [k]: e.target.value })} />
          </div>`;
        })}
      </div>
      <p class="tiny muted" style="margin:0">Fill in only the ones you measured. Lengths in ${u === 'in' ? 'inches' : 'centimetres'}. Measure first thing in the morning for consistency.</p>
      <button class="btn primary block" onClick=${save}>Save</button>`;
  }
  openSheet(() => html`<${Body} />`);
}

export function Body({ state }) {
  const unit = bwUnit(state);
  const tr = A.weightTrend(state);
  const last = tr[tr.length - 1];
  const rate = A.weightRate(state);
  const lastLog = state.measurements.reduce((m, x) => x.date > m ? x.date : m, '');
  return html`
    <${TopBar} mode=${state.settings.mode} title="Body" />
    <div class="page">
      <button class="card tap stack" style="gap:10px" onClick=${() => nav.go('card', { type: 'bodyweight' })}>
        <div class="tile-head"><span class="eyebrow">Bodyweight</span><span class="chev"><${Icon} name="chev" size=${18} /></span></div>
        ${last ? html`
          <div class="hstack" style="justify-content:space-between;align-items:flex-end">
            <div><div class="big">${w(last.trend, unit)}<small>${unit}</small></div>
              <div class="tiny muted">trend · <span class=${rate != null && rate < 0 ? 'good' : 'text-2'}>${rate == null ? 'need 3+ weigh-ins' : signed(toUnit(rate, unit), 1) + ' ' + unit + '/wk'}</span></div></div>
            <div style="width:45%"><${Sparkline} values=${tr.slice(-30).map(p => p.trend)} /></div>
          </div>` : html`<div class="small text-2">No weigh-ins yet.</div>`}
      </button>
      <div class="grid2">
        <button class="btn primary" onClick=${() => logBodyweight()}><${Icon} name="scale" size=${18} /> Log weight</button>
        <button class="btn" onClick=${() => logMeasurements()}><${Icon} name="plus" size=${18} /> Measurements</button>
      </div>

      <${PhotoStrip} state=${state} />

      <div class="section-head"><span class="h-md">Measurements</span>${lastLog ? html`<span class="small muted">last ${fmtRel(fromKey(lastLog)).toLowerCase()}</span>` : null}</div>
      <div class="list">
        ${MEASURES.map(([k, label]) => {
          const s = series(state, k);
          const l = s[s.length - 1];
          const c = change(state, k);
          const good = c && (k === 'waist' || k === 'hips' || k === 'bodyfat' || k === 'neck' ? c.delta < 0 : c.delta > 0);
          return html`<button class="row" onClick=${() => s.length ? nav.go('measure', { key: k }) : logMeasurements()}>
            <div class="grow"><div class="title">${label}</div><div class="sub">${l ? `${fmtRel(fromKey(l.date))}${c ? ` · ${signed(M[k][2] === 'pct' ? c.delta : toLen(c.delta, lenUnit(state)), 1)} since ${fmtDate(fromKey(c.since))}` : ''}` : 'Not logged yet'}</div></div>
            ${s.length > 1 ? html`<div style="width:70px"><${Sparkline} values=${s.slice(-12).map(p => p.value)} height=${26} /></div>` : null}
            <span class=${'num ' + (c ? (good ? 'good' : '') : '')} style="min-width:64px;text-align:right;font-weight:600">${l ? showVal(state, k, l.value) : ''}</span>
            <span class="chev"><${Icon} name="chev" size=${18} /></span>
          </button>`;
        })}
      </div>
      <p class="tiny muted" style="margin:0">When cutting, a shrinking waist with steady arm and chest measurements is the clearest sign you're losing fat, not muscle.</p>
    </div>`;
}

export function MeasureDetail({ state, params }) {
  const k = params.key;
  const def = M[k];
  const [range, setRange] = useState('12w');
  if (!def) return html`<${TopBar} title="Measurement" back=${true} />`;
  const s = series(state, k);
  const days = range === 'all' ? Infinity : parseInt(range) * 7;
  const pts = s.filter(p => +fromKey(p.date) >= Date.now() - days * DAY);
  const u = lenUnit(state);
  const conv = v => def[2] === 'pct' ? v : toLen(v, u);
  return html`
    <${TopBar} title=${def[1]} back=${true} right=${html`<button class="btn sm primary" onClick=${() => logMeasurements()}>Log</button>`} />
    <div class="page">
      <div class="card stack">
        <div class="hstack" style="justify-content:space-between"><span class="eyebrow">${def[1]} (${def[2] === 'pct' ? '%' : u})</span>
          <${Seg} label="Range" value=${range} onChange=${setRange} options=${[['4w', '4W'], ['12w', '3M'], ['26w', '6M'], ['all', 'All']]} /></div>
        <${LineChart} fmtY=${v => fmtNum(conv(v), 1)} points=${pts.map(p => ({ x: +fromKey(p.date), y: p.value }))} />
      </div>
      ${s.length > 1 ? html`<div class="summary-grid">
        <div class="stat"><span class="eyebrow">Latest</span><span class="mid">${fmtNum(conv(s[s.length - 1].value), 1)}</span></div>
        <div class="stat"><span class="eyebrow">Start</span><span class="mid">${fmtNum(conv(s[0].value), 1)}</span></div>
        <div class="stat"><span class="eyebrow">Change</span><span class="mid">${signed(conv(s[s.length - 1].value) - conv(s[0].value), 1)}</span></div>
      </div>` : null}
      <div class="section-head"><span class="h-md">Entries</span></div>
      <div class="list">${s.slice().reverse().map(p => html`<div class="row">
        <div class="grow"><div class="title">${fmtRel(fromKey(p.date))}</div><div class="sub">${fmtDate(fromKey(p.date))}</div></div>
        <span class="num" style="font-weight:600">${showVal(state, k, p.value)}</span>
        <button class="icon-btn" aria-label="Delete entry" onClick=${() => confirmSheet({ title: 'Delete this entry?', onConfirm: () => store.update(st => { st.measurements = st.measurements.filter(m => !(m.key === k && m.date === p.date)); }) })}><${Icon} name="trash" size=${18} /></button>
      </div>`)}</div>
    </div>`;
}
