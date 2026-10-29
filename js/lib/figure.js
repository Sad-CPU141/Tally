// Small body outline with the muscles an exercise works highlighted.
// Front view for chest, shoulders, arms (front), core and quads; back view for the rest.

import { html } from '../vendor/preact-htm.js';

const FRONT = new Set(['Chest', 'Shoulders', 'Biceps', 'Core', 'Quads']);

// Shapes in a 60 × 100 box. Each region names the muscle it belongs to.
const SHAPES = {
  front: [
    ['head', 'c', 30, 9, 6],
    ['', 'r', 27, 14.5, 6, 5, 1.5],
    ['Shoulders', 'e', 17, 23.5, 5.2, 4.6], ['Shoulders', 'e', 43, 23.5, 5.2, 4.6],
    ['Chest', 'r', 20.5, 19.5, 9, 10.5, 3], ['Chest', 'r', 30.5, 19.5, 9, 10.5, 3],
    ['Core', 'r', 22, 31, 16, 17, 3.5],
    ['Biceps', 'r', 11.2, 27.5, 5.6, 12, 2.8], ['Biceps', 'r', 43.2, 27.5, 5.6, 12, 2.8],
    ['', 'r', 9.6, 40.5, 5, 12, 2.5], ['', 'r', 45.4, 40.5, 5, 12, 2.5],
    ['', 'r', 22, 48.5, 16, 6, 2.5],
    ['Quads', 'r', 21.5, 55, 7.8, 20, 3.8], ['Quads', 'r', 30.7, 55, 7.8, 20, 3.8],
    ['Calves', 'r', 22.3, 77, 6.2, 16, 3], ['Calves', 'r', 31.5, 77, 6.2, 16, 3],
  ],
  back: [
    ['head', 'c', 30, 9, 6],
    ['Back', 'r', 26, 14.5, 8, 5, 1.5],
    ['Shoulders', 'e', 17, 23.5, 5.2, 4.6], ['Shoulders', 'e', 43, 23.5, 5.2, 4.6],
    ['Back', 'r', 20.5, 19.5, 19, 19, 3.5],
    ['Back', 'r', 23, 39.5, 14, 8.5, 2.5],
    ['Triceps', 'r', 11.2, 27.5, 5.6, 12, 2.8], ['Triceps', 'r', 43.2, 27.5, 5.6, 12, 2.8],
    ['', 'r', 9.6, 40.5, 5, 12, 2.5], ['', 'r', 45.4, 40.5, 5, 12, 2.5],
    ['Glutes', 'r', 21.5, 48.5, 8.3, 9, 4], ['Glutes', 'r', 30.2, 48.5, 8.3, 9, 4],
    ['Hamstrings', 'r', 21.5, 58.5, 7.8, 16.5, 3.8], ['Hamstrings', 'r', 30.7, 58.5, 7.8, 16.5, 3.8],
    ['Calves', 'r', 22, 77, 6.8, 15, 3.4], ['Calves', 'r', 31.2, 77, 6.8, 15, 3.4],
  ],
};

function shape([m, kind, a, b, c, d, rx], fill) {
  if (kind === 'c') return html`<circle cx=${a} cy=${b} r=${c} fill=${fill} />`;
  if (kind === 'e') return html`<ellipse cx=${a} cy=${b} rx=${c} ry=${d} fill=${fill} />`;
  return html`<rect x=${a} y=${b} width=${c} height=${d} rx=${rx} fill=${fill} />`;
}

export function musclesFor(ex) {
  if (!ex) return { primary: [], secondary: [] };
  if (ex.muscle === 'Cardio') {
    const legs = ex.id === 'rower' ? ['Back', 'Quads', 'Hamstrings'] : ['Quads', 'Hamstrings', 'Glutes', 'Calves'];
    return { primary: legs.slice(0, 2), secondary: legs.slice(2) };
  }
  return { primary: [ex.muscle], secondary: ex.secondary || [] };
}

const UPPER = new Set(['Chest', 'Shoulders', 'Biceps', 'Triceps', 'Back', 'Core']);

// Zoomed to the half of the body that's working, so the highlight reads at small sizes.
export function MuscleFig({ ex, size = 40, view }) {
  const { primary, secondary } = musclesFor(ex);
  const v = view || (FRONT.has(primary[0]) ? 'front' : 'back');
  const P = new Set(primary), S = new Set(secondary);
  const crop = ex && ex.muscle === 'Cardio' ? [8, 0, 44, 100] : UPPER.has(primary[0]) ? [6, 1, 48, 54] : [12, 46, 36, 50];
  const scale = (size - 6) / Math.max(crop[2], crop[3]);
  return html`<span class="fig" style=${`width:${size}px;height:${size}px`} aria-hidden="true">
    <svg viewBox=${crop.join(' ')} width=${crop[2] * scale} height=${crop[3] * scale}>
      ${SHAPES[v].map(sh => shape(sh, sh[0] === 'head' || sh[0] === '' ? 'var(--fig-base)' : P.has(sh[0]) ? 'var(--accent)' : S.has(sh[0]) ? 'var(--fig-sec)' : 'var(--fig-base)'))}
    </svg>
  </span>`;
}

// Both views side by side, for the exercise page.
export function MuscleMap({ ex, height = 150 }) {
  const w = height * 0.6;
  const { primary, secondary } = musclesFor(ex);
  const P = new Set(primary), S = new Set(secondary);
  const fill = m => m === 'head' || m === '' ? 'var(--fig-base)' : P.has(m) ? 'var(--accent)' : S.has(m) ? 'var(--fig-sec)' : 'var(--fig-base)';
  return html`<div class="hstack" style="gap:18px;justify-content:center">
    ${['front', 'back'].map(v => html`<div class="stack" style="gap:6px;align-items:center">
      <svg viewBox="0 0 60 100" width=${w} height=${height} aria-hidden="true">${SHAPES[v].map(sh => shape(sh, fill(sh[0])))}</svg>
      <span class="tiny muted">${v === 'front' ? 'Front' : 'Back'}</span>
    </div>`)}
  </div>`;
}
