// First-run walkthrough: five short cards, shown once. "Skip" or "Let's go" marks it seen.
// Re-open any time from Me → "Show the walkthrough".

import { html, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import { Icon } from '../lib/ui.js';

const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function ArtSwitch() {
  const [food, setFood] = useState(false);
  useEffect(() => { const t = setInterval(() => setFood(f => !f), 1600); return () => clearInterval(t); }, []);
  return html`<div class="art art-switch" aria-hidden="true">
    <div class="art-bar"><span class="art-logo">Tally</span><span class=${'art-pill ' + (food ? 'food' : 'gym')}><${Icon} name="swap" size=${13} /> ${food ? 'Food' : 'Gym'}</span></div>
    <div class="art-tabs">${(food ? ['Diary', 'Targets', 'Body', 'Insights', 'Me'] : ['Today', 'Train', 'Body', 'Stats', 'Me']).map((t, i) => html`<span class=${i === 0 ? 'on' : ''}>${t}</span>`)}</div>
  </div>`;
}
function ArtSets() {
  return html`<div class="art art-sets" aria-hidden="true">
    <div class="art-ex">Bench Press</div>
    ${[['1', '135 × 10', true], ['2', '155 × 8', true], ['3', '165 × 6', false]].map(([n, v, d]) => html`<div class=${'art-set' + (d ? ' done' : '')}><span>${n}</span><b>${v}</b><i><${Icon} name="check" size=${14} /></i></div>`)}
    <div class="art-pr"><${Icon} name="trophy" size=${13} /> New record</div>
  </div>`;
}
function ArtFood() {
  const C = 2 * Math.PI * 26;
  return html`<div class="art art-food" aria-hidden="true">
    <svg viewBox="0 0 64 64" width="84" height="84"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--surface-3)" stroke-width="8"/>
      <g transform="rotate(-90 32 32)" fill="none" stroke-width="8">
        <circle cx="32" cy="32" r="26" stroke="var(--m-p)" stroke-dasharray=${`${C * .28} ${C}`}/>
        <circle cx="32" cy="32" r="26" stroke="var(--m-c)" stroke-dasharray=${`${C * .22} ${C}`} stroke-dashoffset=${-C * .29}/>
        <circle cx="32" cy="32" r="26" stroke="var(--m-f)" stroke-dasharray=${`${C * .12} ${C}`} stroke-dashoffset=${-C * .52}/></g></svg>
    <div class="art-macros">${[['p', 'Protein', 72], ['c', 'Carbs', 55], ['f', 'Fat', 40]].map(([m, n, v]) => html`<div><span>${n}</span><i class=${m}><b style=${`width:${v}%`}></b></i></div>`)}</div>
  </div>`;
}
function ArtChart() {
  return html`<div class="art art-chart" aria-hidden="true">
    <svg viewBox="0 0 220 90" width="100%" height="90" preserveAspectRatio="none">
      <polyline points="0,72 30,66 60,68 90,52 120,48 150,40 180,30 220,18" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="150" cy="40" r="5" fill="var(--accent)"/></svg>
    <span class="art-tip num">Oct 28 · 225 lb</span>
  </div>`;
}
function ArtBoard() {
  return html`<div class="art art-board" aria-hidden="true">
    ${[['1', (store.get().settings.name || 'You').slice(0, 1).toUpperCase(), 'You', '5 workouts', 100, 'first'], ['2', 'A', 'Adam', '4 workouts', 80, ''], ['3', 'Z', 'Zaid', '3 workouts', 60, '']].map(([r, a, n, v, w, c]) => html`<div class=${'art-row ' + c}><span class="r">${r}</span><span class="a">${a}</span><span class="n">${n}<i><b style=${`width:${w}%`}></b></i></span><span class="v">${v}</span></div>`)}
  </div>`;
}

const STEPS = [
  { art: ArtSwitch, title: 'Two trackers in one', body: 'Tap Tally at the top left to switch between Gym and Food. Each has its own tabs, in the same order.' },
  { art: ArtSets, title: 'Log every set', body: 'Build a routine for each day of your split on Train, then tap Start. Tick sets as you go and Tally flags new records.' },
  { art: ArtFood, title: 'Track your food', body: 'Search everyday foods, Tim Hortons and Raising Cane\'s menus, or scan a barcode. Foods you log often become one-tap Quick log buttons.' },
  { art: ArtChart, title: 'Watch it add up', body: 'Stats and Insights show your trends. Touch any chart to see exact numbers, and tap Customize to choose your cards.' },
  { art: ArtBoard, title: 'Back up and compete', body: 'Sign in on Me to back up automatically and get a friend code. Then race your friends on the weekly leaderboard.', install: true },
];

export function Tour({ onDone }) {
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const touch = useRef(null);
  useEffect(() => { ref.current && ref.current.focus(); }, [i]);
  const s = STEPS[i];
  const last = i === STEPS.length - 1;
  const done = () => { store.update(st => { st.settings.tour = true; }); onDone && onDone(); };
  const next = () => last ? done() : setI(i + 1);
  const prev = () => i > 0 && setI(i - 1);
  const Art = s.art;
  return html`<div class="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title"
      onKeyDown=${e => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); if (e.key === 'Escape') done(); }}
      onTouchStart=${e => { touch.current = e.touches[0].clientX; }}
      onTouchEnd=${e => { const dx = e.changedTouches[0].clientX - (touch.current || 0); if (dx < -50) next(); else if (dx > 50) prev(); }}>
    <div class="tour-top"><span class="small muted num">${i + 1} of ${STEPS.length}</span>${!last ? html`<button class="link-btn" onClick=${done}>Skip</button>` : null}</div>
    <div class="tour-body" key=${i}>
      <div class="tour-art"><${Art} /></div>
      <h2 id="tour-title" class="h-xl" tabindex="-1" ref=${ref}>${s.title}</h2>
      <p class="text-2">${s.body}</p>
      ${s.install && !standalone() ? html`<div class="tour-install"><${Icon} name="download" size=${18} /><span>${isIOS() ? html`Put Tally on your home screen: tap <b>Share</b>, then <b>Add to Home Screen</b>.` : html`Put Tally on your home screen: open the browser menu, then <b>Install app</b> or <b>Add to Home screen</b>.`}</span></div>` : null}
    </div>
    <div class="tour-foot">
      <div class="tour-dots" aria-hidden="true">${STEPS.map((_, j) => html`<i class=${j === i ? 'on' : ''}></i>`)}</div>
      <div class="hstack" style="gap:8px">
        ${i > 0 ? html`<button class="btn" onClick=${prev}>Back</button>` : null}
        <button class="btn primary" style="min-width:120px" onClick=${next}>${last ? "Let's go" : 'Next'}</button>
      </div>
    </div>
  </div>`;
}
