// Exercise images from RepDB's free tier (https://repdb.co): a start and end position
// for most exercises, flipped to show the movement. Stored in the app, so they work offline.
// Step-by-step text still comes from Free Exercise DB (js/lib/exmedia.js).

import { html, useState, useEffect } from '../vendor/preact-htm.js';
import { MEDIA } from './exmedia.js';
import { RD } from './rdmedia.js';

const base = new URL('../../media/rd/', import.meta.url).href;
export const imgUrl = (id, i = 0) => `${base}${id}-${i}.webp`;
export const hasPhoto = ex => !!(ex && RD[ex.id]);
export const mediaFor = ex => (ex && MEDIA[ex.id]) || null;

function initials(name = '') {
  return name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function Tile({ ex, size }) {
  return html`<span class="fig fig-none" style=${`width:${size}px;height:${size}px;font-size:${Math.round(size * 0.34)}px`} aria-hidden="true">${initials(ex && ex.name)}</span>`;
}

export function ExThumb({ ex, size = 40 }) {
  const [broken, setBroken] = useState(false);
  if (!hasPhoto(ex) || broken) return html`<${Tile} ex=${ex} size=${size} />`;
  return html`<span class="fig fig-rd" style=${`width:${size}px;height:${size}px`} aria-hidden="true">
    <img src=${imgUrl(ex.id, 0)} alt="" loading="lazy" decoding="async" width=${size} height=${size} onError=${() => setBroken(true)} />
  </span>`;
}

const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

// Start and end positions. Flips every 1.1 s; tap to pause. Reduced motion shows buttons only.
export function ExPhoto({ ex }) {
  const r = ex && RD[ex.id];
  const two = r && r.frames > 1;
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(!!two && !reduced());
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setFrame(f => 1 - f), 1100);
    return () => clearInterval(t);
  }, [playing]);
  if (!r) return null;
  return html`<div class="rdphoto">
    <button class="rdphoto-frame" aria-label=${two ? (playing ? 'Pause' : 'Play') : ex.name} onClick=${() => two && setPlaying(p => !p)}>
      <img src=${imgUrl(ex.id, 0)} alt=${`${ex.name}${two ? ', start position' : ''}`} decoding="async" />
      ${two ? html`<img class=${'rdphoto-b' + (frame ? ' on' : '')} src=${imgUrl(ex.id, 1)} alt=${`${ex.name}, end position`} decoding="async" />` : null}
      ${two ? html`<span class="rdphoto-tag">${frame ? 'End' : 'Start'}${playing ? '' : ' · paused'}</span>` : null}
    </button>
    ${two ? html`<div class="seg" role="group" aria-label="Position" style="margin-top:8px">
      <button type="button" aria-pressed=${!playing && frame === 0} onClick=${() => { setPlaying(false); setFrame(0); }}>Start</button>
      <button type="button" aria-pressed=${playing} onClick=${() => setPlaying(true)}>Play</button>
      <button type="button" aria-pressed=${!playing && frame === 1} onClick=${() => { setPlaying(false); setFrame(1); }}>End</button>
    </div>` : null}
  </div>`;
}

export const PHOTO_CREDIT = 'Exercise images by RepDB (repdb.co). Steps from Free Exercise DB (public domain).';
export const RD_LINK = 'https://repdb.co';
