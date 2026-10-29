// Plate calculator: which plates go on each side of the bar.

import { html, useState } from '../vendor/preact-htm.js';
import * as store from './store.js';
import { openSheet, SheetHead } from './ui.js';
import { toUnit, fromUnit, fmtNum, round } from './util.js';

export const DEFAULT_PLATES = { lb: [45, 35, 25, 10, 5, 2.5], kg: [25, 20, 15, 10, 5, 2.5, 1.25] };
export const BARS = { lb: [45, 35, 15], kg: [20, 15, 10] };
// Standard plate colours (calibrated plates), used for the drawing.
const COLOR = { lb: { 45: '#d64545', 35: '#e0b43a', 25: '#3f9b57', 10: '#e8e8e8', 5: '#3a6fd6', 2.5: '#888' }, kg: { 25: '#d64545', 20: '#3a6fd6', 15: '#e0b43a', 10: '#3f9b57', 5: '#e8e8e8', 2.5: '#d64545', 1.25: '#888' } };

// Greedy works for standard plate sets. Returns plates per side and any amount that can't be loaded.
export function platesFor(total, bar, plates) {
  let side = round((total - bar) / 2, 4);
  if (side < 0) return { side: [], left: 0, under: true };
  const out = [];
  for (const p of plates.slice().sort((a, b) => b - a)) {
    while (side + 1e-9 >= p) { out.push(p); side = round(side - p, 4); }
  }
  return { side: out, left: side };
}

export function plateCalc(prefillKg) {
  const s0 = store.get().settings;
  const unit = s0.unit;
  function Body() {
    const s = store.get().settings;
    const plates = s.plates && s.plates.length ? s.plates : DEFAULT_PLATES[unit];
    const barU = s.barKg != null ? round(toUnit(s.barKg, unit), 2) : BARS[unit][0];
    const [val, setVal] = useState(prefillKg ? fmtNum(toUnit(prefillKg, unit), 1) : '');
    const [edit, setEdit] = useState(false);
    const total = parseFloat(val);
    const r = total ? platesFor(total, barU, plates) : null;
    const counts = r ? r.side.reduce((m, p) => (m[p] = (m[p] || 0) + 1, m), {}) : {};
    const maxP = Math.max(...DEFAULT_PLATES[unit]);
    const setBar = b => store.update(st => { st.settings.barKg = fromUnit(b, unit); });
    const togglePlate = p => store.update(st => {
      const cur = st.settings.plates && st.settings.plates.length ? st.settings.plates : DEFAULT_PLATES[unit].slice();
      st.settings.plates = cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p].sort((a, b) => b - a);
    });
    return html`
      <${SheetHead} title="Plate calculator" />
      <div class="field"><label for="pc-w">Total weight (${unit})</label>
        <input id="pc-w" class="input num" style="height:60px;font-size:26px;text-align:center" inputmode="decimal" placeholder=${unit === 'lb' ? '225' : '100'} value=${val} onInput=${e => setVal(e.target.value)} /></div>
      <div class="field"><label>Bar</label>
        <div class="chips">${BARS[unit].map(b => html`<button class="chip" aria-pressed=${barU === b} onClick=${() => setBar(b)}>${b} ${unit}</button>`)}</div></div>
      ${r ? r.under ? html`<div class="card small text-2">That's lighter than the bar (${barU} ${unit}).</div>` : html`
        <div class="card stack" style="align-items:center">
          <span class="eyebrow">Each side</span>
          <svg viewBox="0 -18 320 142" width="100%" style="max-width:360px;overflow:visible" role="img" aria-label=${'Plates per side: ' + (r.side.join(', ') || 'none')}>
            <rect x="0" y="54" width="320" height="12" rx="4" fill="var(--surface-3)" />
            <rect x="150" y="44" width="10" height="32" rx="2" fill="var(--muted)" />
            ${(() => { let x = 162; return r.side.map(p => {
              const h = 30 + 80 * (p / maxP), wd = p >= 10 ? 16 : 11;
              const el = html`<g><rect x=${x} y=${60 - h / 2} width=${wd} height=${h} rx="3" fill=${COLOR[unit][p] || 'var(--accent)'} stroke="rgba(0,0,0,.25)" /><text x=${x + wd / 2} y=${60 - h / 2 - 4} text-anchor="middle" font-size="10" fill="var(--muted)" font-family="var(--font-num)">${p}</text></g>`;
              x += wd + 2; return el; }); })()}
          </svg>
          <div class="mid">${r.side.length ? Object.entries(counts).sort((a, b) => b[0] - a[0]).map(([p, n]) => `${n > 1 ? n + ' × ' : ''}${p}`).join('  +  ') : 'Just the bar'}</div>
          ${r.left > 0.001 ? html`<div class="small warn">Can't make the last ${fmtNum(r.left * 2, 2)} ${unit} with your plates. Closest: ${fmtNum(total - r.left * 2, 2)} ${unit}</div>` : html`<div class="small muted">Bar ${barU} + ${fmtNum((total - barU) / 2, 2)} ${unit} per side</div>`}
        </div>` : null}
      <button class="link-btn" onClick=${() => setEdit(!edit)}>${edit ? 'Done' : 'Plates at my gym'}</button>
      ${edit ? html`<div class="chips">${DEFAULT_PLATES[unit].concat(unit === 'lb' ? [55, 1.25] : [50, 0.5]).sort((a, b) => b - a).map(p => html`<button class="chip" aria-pressed=${plates.includes(p)} onClick=${() => togglePlate(p)}>${p}</button>`)}</div>` : null}`;
  }
  openSheet(() => html`<${Body} />`);
}
