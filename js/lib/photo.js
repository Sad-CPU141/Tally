// Exercise animations from ExerciseDB's free API (static.exercisedb.dev).
// Their terms don't allow storing copies, so the GIFs always load from their server:
// they show when there's signal and fall back to a name tile offline.
// Step-by-step text still comes from Free Exercise DB (js/lib/exmedia.js).

import { html, useState } from '../vendor/preact-htm.js';
import { MEDIA } from './exmedia.js';

export const ANIM = {
 "bench": "EIeI8Vf",
 "incline-bench": "3TZduzM",
 "db-bench": "SpYC0Kp",
 "incline-db": "ns0SIbU",
 "chest-press": "DOoWcnA",
 "cable-fly": "0CXGHya",
 "pec-deck": "v3xmPAR",
 "dips": "9WTm7dq",
 "pushup": "I4hDWkc",
 "deadlift": "ila4NZS",
 "row": "eZyBC3j",
 "db-row": "BJ0Hz5L",
 "pullup": "lBDjFxJ",
 "chinup": "Gk1r408",
 "lat-pulldown": "eYnzaCm",
 "cable-row": "fUBheHs",
 "tbar-row": "aaXr7ld",
 "chest-row": "7vG5o25",
 "straight-pulldown": "x69MAlq",
 "ohp": "Kyd9Rz5",
 "db-shoulder": "znQUdHY",
 "lateral-raise": "DsgkuIt",
 "cable-lateral": "goJ6ezq",
 "rear-delt": "myfUsKf",
 "face-pull": "G61cXLk",
 "bb-curl": "25GPyDY",
 "db-curl": "NbVPDMW",
 "hammer-curl": "2NpxjC1",
 "preacher-curl": "qOgPVf6",
 "cable-curl": "G08RZcQ",
 "pushdown": "3ZflifB",
 "oh-ext": "2IxROQ1",
 "skullcrusher": "h8LFzo9",
 "cgbp": "J6Dx1Mu",
 "squat": "iYzB0Cz",
 "front-squat": "zG0zs85",
 "leg-press": "10Z2DXU",
 "hack-squat": "Qa55kX1",
 "bulgarian": "9E25EOx",
 "lunge": "IZVHb27",
 "leg-ext": "my33uHU",
 "rdl": "wQ2c4XD",
 "leg-curl": "17lJ1kr",
 "seated-curl": "Zg3XY7P",
 "hip-thrust": "qKBpF7I",
 "calf-raise": "ykUOVze",
 "seated-calf": "bOOdeyc",
 "plank": "VBAWRPG",
 "hanging-raise": "I3tsCnC",
 "cable-crunch": "WW95auq",
 "ab-wheel": "NAgVB3t",
 "run": "CcWEoWV",
 "bike": "H1PESYI",
 "incline-walk": "rjiM4L3",
 "stairmaster": "j9Q5crt"
};

export const animUrl = id => ANIM[id] ? `https://static.exercisedb.dev/media/${ANIM[id]}.gif` : null;
export const hasPhoto = ex => !!(ex && ANIM[ex.id]);
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
  return html`<span class="fig fig-anim" style=${`width:${size}px;height:${size}px`} aria-hidden="true">
    <img src=${animUrl(ex.id)} alt="" loading="lazy" decoding="async" width=${size} height=${size} referrerpolicy="no-referrer" onError=${() => setBroken(true)} />
  </span>`;
}

export function ExPhoto({ ex }) {
  const [broken, setBroken] = useState(false);
  if (!hasPhoto(ex)) return null;
  if (broken) return html`<div class="card small text-2" style="text-align:center">The animation needs an internet connection. It'll show next time you're online.</div>`;
  return html`<div class="exanim"><img src=${animUrl(ex.id)} alt=${`${ex.name} demonstration`} decoding="async" referrerpolicy="no-referrer" onError=${() => setBroken(true)} /></div>`;
}

export const PHOTO_CREDIT = 'Animations from ExerciseDB. Steps from Free Exercise DB (public domain).';
