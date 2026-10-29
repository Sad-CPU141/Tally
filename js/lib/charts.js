// Small SVG chart components, drawn to scale from real values.

import { html, useRef, useState, useLayoutEffect } from '../vendor/preact-htm.js';
import { fmtDate, fmtMonth } from './util.js';

function useWidth(fallback = 320) {
  const ref = useRef(null);
  const [wd, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect().width; if (r) setW(Math.round(r)); };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, []);
  return [ref, wd];
}

function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const raw = span / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

const path = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

export function Sparkline({ values, height = 38 }) {
  const [ref, wd] = useWidth(140);
  const vals = values.filter(v => v != null && !isNaN(v));
  if (vals.length < 2) return html`<div ref=${ref} class="spark" style="height:${height}px"></div>`;
  const min = Math.min(...vals), max = Math.max(...vals);
  const pad = 3, h = height;
  const x = i => pad + (i / (vals.length - 1)) * (wd - pad * 2);
  const y = v => max === min ? h / 2 : pad + (1 - (v - min) / (max - min)) * (h - pad * 2);
  const pts = vals.map((v, i) => [x(i), y(v)]);
  const area = path(pts) + ` L${x(vals.length - 1).toFixed(1)} ${h} L${pad} ${h} Z`;
  const last = pts[pts.length - 1];
  return html`<div ref=${ref}><svg class="spark" viewBox="0 0 ${wd} ${h}" width=${wd} height=${h} aria-hidden="true">
    <path class="area" d=${area} />
    <path class="line" d=${path(pts)} />
    <circle class="dot" cx=${last[0]} cy=${last[1]} r="3" />
  </svg></div>`;
}

const DAY = 86400000;
const yr2 = t => '’' + String(new Date(t).getFullYear()).slice(2);

// Calendar-aligned date ticks: days, weeks (Mondays), months or quarters, as many as fit.
function timeTicks(x0, x1, plotW) {
  const fit = Math.max(2, Math.floor(plotW / 58));
  const span = (x1 - x0) / DAY;
  const steps = [[1, 'd'], [2, 'd'], [7, 'w'], [14, 'w'], [1, 'm'], [2, 'm'], [3, 'm'], [6, 'm'], [12, 'm']];
  const [n, kind] = steps.find(([n, k]) => span / (k === 'm' ? n * 30.4 : n) <= fit) || [12, 'm'];
  const out = [];
  const d = new Date(x0); d.setHours(0, 0, 0, 0);
  if (kind === 'w') { while (d.getDay() !== 1) d.setDate(d.getDate() + 1); }
  if (kind === 'm') { d.setDate(1); if (+d < x0) d.setMonth(d.getMonth() + 1); while (d.getMonth() % n) d.setMonth(d.getMonth() + 1); }
  for (let guard = 0; +d <= x1 && guard < 60; guard++) {
    if (+d >= x0) out.push(+d);
    if (kind === 'm') d.setMonth(d.getMonth() + n); else d.setDate(d.getDate() + n);
  }
  const multiYear = new Date(x0).getFullYear() !== new Date(x1).getFullYear();
  const label = t => kind === 'm' ? (new Date(t).getMonth() === 0 || (multiYear && t === out[0]) ? fmtMonth(t) + ' ' + yr2(t) : fmtMonth(t)) : fmtDate(t);
  return out.map(t => [t, label(t)]);
}

// Shared tooltip: follows the finger or mouse, stays inside the chart.
function Tip({ x, wd, lines }) {
  if (x == null) return null;
  const w = Math.max(96, Math.max(...lines.map(l => String(l).length)) * 8.5 + 20);
  const left = Math.max(0, Math.min(wd - w, x - w / 2));
  return html`<div class="chart-tip" style=${`left:${left}px;width:${w}px`}>${lines.map((l, i) => html`<div class=${i ? 'v' : 'd'}>${l}</div>`)}</div>`;
}
function usePointer(onIndex) {
  const [active, setActive] = useState(null);
  const handle = e => {
    const r = e.currentTarget.getBoundingClientRect();
    setActive(onIndex(e.clientX - r.left));
  };
  return [active, {
    onPointerDown: handle, onPointerMove: handle,
    onPointerLeave: e => { if (e.pointerType === 'mouse') setActive(null); },
  }];
}

// points: [{ x: timestamp, y }], raw: optional faint points, goal: optional y value.
// fmtV formats a value in the tooltip (defaults to fmtY), unit is appended.
export function LineChart({ points, raw, goal, height = 180, fmtY = v => String(v), fmtV, unit = '', area = true, label = '', rawLabel = 'Scale', extra, dots = false }) {
  const [ref, wd] = useWidth(320);
  const left = 40, right = 12, top = 12, bottom = 24;
  const ok = points && points.length >= 2;
  const x0 = ok ? points[0].x : 0, x1 = ok ? points[points.length - 1].x : 1;
  const X = t => left + ((t - x0) / Math.max(1, x1 - x0)) * (wd - left - right);
  const [active, on] = usePointer(px => {
    if (!ok) return null;
    let best = 0, bd = Infinity;
    points.forEach((p, i) => { const d = Math.abs(X(p.x) - px); if (d < bd) { bd = d; best = i; } });
    return best;
  });
  if (!ok) {
    return html`<div ref=${ref} class="empty small" style="min-height:${height}px;justify-content:center">Log a few more sessions to see this chart.</div>`;
  }
  const allY = points.map(p => p.y).concat(raw ? raw.map(p => p.y) : []).concat(goal != null ? [goal] : []);
  const ticks = niceTicks(Math.min(...allY), Math.max(...allY), 4);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const Y = v => top + (1 - (v - y0) / Math.max(1e-9, y1 - y0)) * (height - top - bottom);
  const pts = points.map(p => [X(p.x), Y(p.y)]);
  const areaD = path(pts) + ` L${pts[pts.length - 1][0].toFixed(1)} ${Y(y0)} L${pts[0][0].toFixed(1)} ${Y(y0)} Z`;
  const xt = timeTicks(x0, x1, wd - left - right);
  const last = pts[pts.length - 1];
  const fv = fmtV || fmtY;
  const a = active != null ? points[active] : null;
  const rawSame = a && raw ? raw.find(r => Math.abs(r.x - a.x) < DAY / 2) : null;
  return html`<div ref=${ref} class="chart-wrap">
    <svg class="chart" viewBox="0 0 ${wd} ${height}" width=${wd} height=${height} role="img" ...${on}>
      ${ticks.map(t => html`<g><line class="grid" x1=${left} x2=${wd - right} y1=${Y(t)} y2=${Y(t)} /><text x=${left - 8} y=${Y(t) + 3.5} text-anchor="end">${fmtY(t)}</text></g>`)}
      ${xt.map(([t, l]) => html`<g><line class="tick" x1=${X(t)} x2=${X(t)} y1=${height - bottom} y2=${height - bottom + 4} /><text x=${Math.min(wd - right - 14, Math.max(left + 14, X(t)))} y=${height - 6} text-anchor="middle">${l}</text></g>`)}
      ${goal != null ? html`<line class="goal" x1=${left} x2=${wd - right} y1=${Y(goal)} y2=${Y(goal)} />` : null}
      ${raw ? raw.map(p => html`<circle class="rawdot" cx=${X(p.x)} cy=${Y(p.y)} r="2.2" />`) : null}
      ${area ? html`<path class="area" d=${areaD} />` : null}
      <path class="line" d=${path(pts)} />
      ${dots && pts.length <= 150 ? pts.map(p => html`<circle class="pdot" cx=${p[0]} cy=${p[1]} r="2.4" />`) : null}
      ${a ? html`<line class="cursor" x1=${pts[active][0]} x2=${pts[active][0]} y1=${top} y2=${height - bottom} /><circle class="dot" cx=${pts[active][0]} cy=${pts[active][1]} r="5" />`
        : html`<circle class="dot" cx=${last[0]} cy=${last[1]} r="4.5" />`}
      <rect x="0" y="0" width=${wd} height=${height} fill="transparent" style="touch-action:pan-y" />
    </svg>
    ${a ? html`<${Tip} x=${pts[active][0]} wd=${wd} lines=${[fmtDate(a.x) + ' ' + yr2(a.x), `${label ? label + ' ' : ''}${fv(a.y)}${unit ? ' ' + unit : ''}`, ...(rawSame && Math.abs(rawSame.y - a.y) > 1e-9 ? [`${rawLabel} ${fv(rawSame.y)}${unit ? ' ' + unit : ''}`] : []), ...(extra ? extra(a) : [])]} />` : null}
  </div>`;
}

// bars: [{ label, value, dim, x? (timestamp), tip? }]. Labels thin out to fit; tap or hover for the exact value.
export function BarChart({ bars, height = 160, fmtY = v => String(v), fmtV, unit = '', goal }) {
  const [ref, wd] = useWidth(320);
  const left = 40, right = 6, top = 12, bottom = 22;
  const slot = (wd - left - right) / Math.max(1, bars.length);
  const [active, on] = usePointer(px => {
    const i = Math.floor((px - left) / slot);
    return i >= 0 && i < bars.length ? i : null;
  });
  const max = Math.max(1, ...bars.map(b => b.value), goal || 0);
  const ticks = niceTicks(0, max, 4);
  const y1 = ticks[ticks.length - 1];
  const Y = v => top + (1 - v / y1) * (height - top - bottom);
  const bw = Math.max(4, Math.min(28, slot * 0.62));
  const lab = b => b.x != null ? fmtDate(b.x) : b.label;
  const labW = Math.max(...bars.map(b => String(lab(b) || '').length)) * 6 + 10;
  const every = Math.max(1, Math.ceil(labW / slot));
  const shown = i => (bars.length - 1 - i) % every === 0; // always label the latest bar, then every Nth back
  const fv = fmtV || fmtY;
  const a = active != null ? bars[active] : null;
  return html`<div ref=${ref} class="chart-wrap">
    <svg class="chart" viewBox="0 0 ${wd} ${height}" width=${wd} height=${height} role="img" ...${on}>
      ${ticks.map(t => html`<g><line class="grid" x1=${left} x2=${wd - right} y1=${Y(t)} y2=${Y(t)} /><text x=${left - 8} y=${Y(t) + 3.5} text-anchor="end">${fmtY(t)}</text></g>`)}
      ${goal ? html`<line class="goal" x1=${left} x2=${wd - right} y1=${Y(goal)} y2=${Y(goal)} />` : null}
      ${bars.map((b, i) => {
        const cx = left + slot * i + slot / 2;
        const hgt = Math.max(b.value > 0 ? 2 : 0, Y(0) - Y(b.value));
        return html`<g>
          ${active === i ? html`<rect class="bar-hl" x=${left + slot * i} y=${top} width=${slot} height=${height - top - bottom} rx="4" />` : null}
          <rect class=${'bar' + (b.dim ? ' dim' : '') + (active === i ? ' on' : '')} x=${cx - bw / 2} y=${Y(0) - hgt} width=${bw} height=${hgt} rx="3" />
          ${shown(i) ? html`<text x=${Math.min(wd - right - 12, cx)} y=${height - 6} text-anchor="middle">${lab(b)}</text>` : null}
        </g>`;
      })}
      <rect x="0" y="0" width=${wd} height=${height} fill="transparent" style="touch-action:pan-y" />
    </svg>
    ${a ? html`<${Tip} x=${left + slot * active + slot / 2} wd=${wd} lines=${[a.tip || (a.x != null ? (a.week ? 'Week of ' : '') + fmtDate(a.x) : a.label), `${fv(a.value)}${unit ? ' ' + unit : ''}`]} />` : null}
  </div>`;
}
