// Exercise photos from Free Exercise DB: a small thumbnail for lists,
// and a start/end photo pair that flips to show the movement.

import { html, useState, useEffect } from '../vendor/preact-htm.js';
import { MEDIA } from './exmedia.js';

const base = new URL('../../media/ex/', import.meta.url).href;
export const photoUrl = (id, i = 0) => `${base}${id}-${i}.jpg`;
export const hasPhoto = ex => !!(ex && MEDIA[ex.id] && MEDIA[ex.id].photos);
export const mediaFor = ex => (ex && MEDIA[ex.id]) || null;

function initials(name = '') {
  return name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export function ExThumb({ ex, size = 40 }) {
  const [broken, setBroken] = useState(false);
  if (!hasPhoto(ex) || broken) {
    return html`<span class="fig fig-none" style=${`width:${size}px;height:${size}px;font-size:${Math.round(size * 0.34)}px`} aria-hidden="true">${initials(ex && ex.name)}</span>`;
  }
  return html`<span class="fig" style=${`width:${size}px;height:${size}px`} aria-hidden="true">
    <img src=${photoUrl(ex.id, 0)} alt="" loading="lazy" decoding="async" width=${size} height=${size} onError=${() => setBroken(true)} />
  </span>`;
}

const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

// Start and end photos. Flips between them every 1.2 s; tap to pause. Reduced motion shows buttons instead.
export function ExPhoto({ ex }) {
  const m = mediaFor(ex);
  const two = m && m.photos > 1;
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(two && !reduced());
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setFrame(f => 1 - f), 1200);
    return () => clearInterval(t);
  }, [playing]);
  if (!m || !m.photos) return null;
  return html`<div class="exphoto">
    <button class="exphoto-frame" aria-label=${playing ? 'Pause' : 'Play'} onClick=${() => two && setPlaying(p => !p)}>
      <img src=${photoUrl(ex.id, 0)} alt=${`${ex.name}, start position`} decoding="async" />
      ${two ? html`<img class=${'exphoto-b' + (frame ? ' on' : '')} src=${photoUrl(ex.id, 1)} alt=${`${ex.name}, end position`} decoding="async" />` : null}
      ${two ? html`<span class="exphoto-tag">${frame ? 'End' : 'Start'}${playing ? '' : ' · paused'}</span>` : null}
    </button>
    ${two ? html`<div class="seg" role="group" aria-label="Photo" style="margin-top:8px">
      <button type="button" aria-pressed=${!playing && frame === 0} onClick=${() => { setPlaying(false); setFrame(0); }}>Start</button>
      <button type="button" aria-pressed=${playing} onClick=${() => setPlaying(true)}>Play</button>
      <button type="button" aria-pressed=${!playing && frame === 1} onClick=${() => { setPlaying(false); setFrame(1); }}>End</button>
    </div>` : null}
  </div>`;
}

export const PHOTO_CREDIT = 'Photos and steps from Free Exercise DB (public domain).';
