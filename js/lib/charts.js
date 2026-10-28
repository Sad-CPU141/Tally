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

// points: [{ x: timestamp, y }], raw: optional faint points, goal: optional y value
export function LineChart({ points, raw, goal, height = 180, fmtY = v => String(v), area = true }) {
  const [ref, wd] = useWidth(320);
  if (!points || points.length < 2) {
    return html`<div ref=${ref} class="empty small" style="min-height:${height}px;justify-content:center">Log a few more sessions to see this chart.</div>`;
  }
  const left = 40, right = 10, top = 10, bottom = 24;
  const allY = points.map(p => p.y).concat(raw ? raw.map(p => p.y) : []).concat(goal != null ? [goal] : []);
  const ticks = niceTicks(Math.min(...allY), Math.max(...allY), 4);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const x0 = points[0].x, x1 = points[points.length - 1].x;
  const X = t => left + ((t - x0) / Math.max(1, x1 - x0)) * (wd - left - right);
  const Y = v => top + (1 - (v - y0) / Math.max(1e-9, y1 - y0)) * (height - top - bottom);
  const pts = points.map(p => [X(p.x), Y(p.y)]);
  const areaD = path(pts) + ` L${pts[pts.length - 1][0].toFixed(1)} ${Y(y0)} L${pts[0][0].toFixed(1)} ${Y(y0)} Z`;
  const spanDays = (x1 - x0) / 86400000;
  const xl = [x0, x0 + (x1 - x0) / 2, x1];
  const xfmt = t => spanDays > 200 ? fmtMonth(t) + ' ’' + String(new Date(t).getFullYear()).slice(2) : fmtDate(t);
  const last = pts[pts.length - 1];
  return html`<div ref=${ref}><svg class="chart" viewBox="0 0 ${wd} ${height}" width=${wd} height=${height} role="img">
    ${ticks.map(t => html`<g><line class="grid" x1=${left} x2=${wd - right} y1=${Y(t)} y2=${Y(t)} /><text x=${left - 8} y=${Y(t) + 3.5} text-anchor="end">${fmtY(t)}</text></g>`)}
    ${xl.map((t, i) => html`<text x=${X(t)} y=${height - 6} text-anchor=${i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}>${xfmt(t)}</text>`)}
    ${goal != null ? html`<line class="goal" x1=${left} x2=${wd - right} y1=${Y(goal)} y2=${Y(goal)} />` : null}
    ${raw ? raw.map(p => html`<circle class="rawdot" cx=${X(p.x)} cy=${Y(p.y)} r="2.2" />`) : null}
    ${area ? html`<path class="area" d=${areaD} />` : null}
    <path class="line" d=${path(pts)} />
    <circle class="dot" cx=${last[0]} cy=${last[1]} r="4.5" />
  </svg></div>`;
}

// bars: [{ label, value, dim }]
export function BarChart({ bars, height = 160, fmtY = v => String(v), goal }) {
  const [ref, wd] = useWidth(320);
  const left = 40, right = 6, top = 10, bottom = 22;
  const max = Math.max(1, ...bars.map(b => b.value), goal || 0);
  const ticks = niceTicks(0, max, 4);
  const y1 = ticks[ticks.length - 1];
  const Y = v => top + (1 - v / y1) * (height - top - bottom);
  const slot = (wd - left - right) / bars.length;
  const bw = Math.max(4, Math.min(28, slot * 0.62));
  const every = Math.ceil(bars.length / 7);
  return html`<div ref=${ref}><svg class="chart" viewBox="0 0 ${wd} ${height}" width=${wd} height=${height} role="img">
    ${ticks.map(t => html`<g><line class="grid" x1=${left} x2=${wd - right} y1=${Y(t)} y2=${Y(t)} /><text x=${left - 8} y=${Y(t) + 3.5} text-anchor="end">${fmtY(t)}</text></g>`)}
    ${goal ? html`<line class="goal" x1=${left} x2=${wd - right} y1=${Y(goal)} y2=${Y(goal)} />` : null}
    ${bars.map((b, i) => {
      const cx = left + slot * i + slot / 2;
      const hgt = Math.max(b.value > 0 ? 2 : 0, Y(0) - Y(b.value));
      return html`<g>
        <rect class=${'bar' + (b.dim ? ' dim' : '')} x=${cx - bw / 2} y=${Y(0) - hgt} width=${bw} height=${hgt} rx="3" />
        ${(i % every === 0 || i === bars.length - 1) ? html`<text x=${cx} y=${height - 6} text-anchor="middle">${b.label}</text>` : null}
      </g>`;
    })}
  </svg></div>`;
}
