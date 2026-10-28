// Today: what to train next, and the user's chosen analytics cards.

import { html } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import * as A from '../lib/analytics.js';
import { CARDS } from '../lib/cards.js';
import { Icon, nav, TopBar } from '../lib/ui.js';
import { fmtWeekdayLong, fmtDate, fmtTime, fmtMins } from '../lib/util.js';
import { startWorkout } from './workout.js';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Late one' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
}

export function Card({ inst, state, onOpen, wide }) {
  const def = CARDS[inst.type];
  if (!def) return null;
  const C = def.compact;
  return html`<div class=${'card tap tile' + (def.wide || wide ? ' w2' : '')} role="button" tabindex="0"
    onClick=${onOpen} onKeyDown=${e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}>
    <${C} state=${state} opts=${inst.opts || {}} />
  </div>`;
}

export function Today({ state }) {
  const s = state.settings;
  const next = A.nextRoutine(state);
  const exm = A.exMap(state);
  const done = A.trainedToday(state);
  return html`
    <${TopBar} brand=${true} title="Tally" right=${html`<span class="small muted">${fmtWeekdayLong(new Date())}, ${fmtDate(new Date())}</span>`} />
    <div class="page">
      ${s.sample ? html`<div class="banner"><span class="grow">You're looking at sample data. Clear it in Me whenever you're ready to start.</span><button class="btn sm" onClick=${() => nav.tab('me')}>Me</button></div>` : null}

      ${state.active ? html`
        <div class="hero">
          <div class="hero-top"><div class="stack" style="gap:4px"><span class="eyebrow">In progress</span><h2 class="h-xl">${state.active.name}</h2></div></div>
          <span class="small text-2">Started at ${fmtTime(state.active.start)} · ${state.active.entries.reduce((n, e) => n + e.sets.filter(x => x.done).length, 0)} sets done</span>
          <button class="btn primary block" onClick=${() => nav.go('workout')}><${Icon} name="play" size=${18} /> Resume workout</button>
        </div>`
      : done.length ? html`
        <div class="hero">
          <div class="stack" style="gap:4px"><span class="eyebrow">${greeting()}${s.name ? ', ' + s.name : ''}</span><h2 class="h-xl">Done for today</h2></div>
          <span class="small text-2">${done.map(w => `${w.name} · ${fmtMins((w.end - w.start) / 1000)}`).join('  ·  ')}</span>
          <div class="grid2">
            <button class="btn" onClick=${() => nav.go('workoutView', { id: done[done.length - 1].id })}>View session</button>
            <button class="btn" onClick=${() => startWorkout(next)} disabled=${!next}>Train again</button>
          </div>
        </div>`
      : next ? html`
        <div class="hero">
          <div class="stack" style="gap:4px"><span class="eyebrow">${greeting()}${s.name ? ', ' + s.name : ''} · up next</span><h2 class="h-xl">${next.name}</h2></div>
          <div class="hero-ex">${next.items.slice(0, 6).map(it => html`<span class="pill">${(exm.get(it.exId) || {}).name}</span>`)}${next.items.length > 6 ? html`<span class="pill">+${next.items.length - 6}</span>` : null}</div>
          <div class="grid2">
            <button class="btn primary" onClick=${() => startWorkout(next)}><${Icon} name="play" size=${18} /> Start</button>
            <button class="btn" onClick=${() => nav.tab('train')}>Other routine</button>
          </div>
        </div>`
      : html`
        <div class="hero">
          <div class="stack" style="gap:4px"><span class="eyebrow">${greeting()}${s.name ? ', ' + s.name : ''}</span><h2 class="h-xl">Set up your split</h2></div>
          <span class="small text-2">Pick a template or build your own routines, then start logging.</span>
          <button class="btn primary block" onClick=${() => nav.tab('train')}>Choose routines</button>
        </div>`}

      <div class="section-head"><span class="h-md">Your stats</span><button class="link-btn" onClick=${() => nav.go('editDash')}>Customize</button></div>
      ${state.dashboard.length ? html`<div class="dash">
        ${state.dashboard.map(inst => html`<${Card} key=${inst.id} inst=${inst} state=${state} onOpen=${() => nav.go('card', { id: inst.id, type: inst.type })} />`)}
      </div>` : html`<div class="card empty"><span class="h-md">No cards on your dashboard</span><button class="btn" onClick=${() => nav.go('editDash')}>Add cards</button></div>`}
    </div>`;
}
