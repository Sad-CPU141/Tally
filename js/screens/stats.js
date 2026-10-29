// Stats (Gym mode), Insights (Food mode), card detail pages and the dashboard editor.

import { html } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import * as A from '../lib/analytics.js';
import { CARDS } from '../lib/cards.js';
import { FOOD_CATS } from '../lib/dash-defaults.js';
import { Icon, nav, TopBar, toast } from '../lib/ui.js';
import { Card, pack } from './today.js';
import { pickExercise } from './picker.js';

export const GYM_CATS = ['Training', 'Strength', 'Cardio', 'Body'];
export const FOOD_CAT_LIST = ['Food', 'Combined', 'Body'];

const KEY = { gym: 'dashboard', food: 'foodDashboard' };
const NAME = { gym: 'Today', food: 'Insights' };

// Which dashboard a card belongs to: food and combined cards go to Food, Body follows the current mode.
function dashFor(state, type, hint) {
  if (hint) return hint;
  const cat = (CARDS[type] || {}).cat;
  if (FOOD_CATS.has(cat)) return 'food';
  if (cat === 'Body') return state.settings.mode;
  return 'gym';
}

// Wide cards first, then half cards in pairs; an odd one out spans the row.
function layout(cat) {
  const cs = Object.values(CARDS).filter(c => c.cat === cat);
  const wide = cs.filter(c => c.wide), half = cs.filter(c => !c.wide);
  return [...wide.map(c => ({ c, wide: false })), ...half.map((c, i) => ({ c, wide: half.length % 2 === 1 && i === half.length - 1 }))];
}

function Library({ state, cats, dash }) {
  return cats.map(cat => html`
    <div class="section-head"><span class="h-md">${cat}</span></div>
    <div class="dash">${layout(cat).map(({ c, wide }) => html`<${Card} key=${c.type} wide=${wide} inst=${{ id: 'lib-' + c.type, type: c.type, opts: {} }} state=${state} onOpen=${() => nav.go('card', { type: c.type, dash })} />`)}</div>`);
}

export function Stats({ state }) {
  const list = state.dashboard || [];
  return html`
    <${TopBar} mode=${state.settings.mode} title="Stats" right=${html`<button class="btn sm" onClick=${() => nav.go('editDash', { dash: 'gym' })}>Customize</button>`} />
    <div class="page">
      <div class="section-head"><span class="h-md">Pinned</span><span class="small muted">also on Today</span></div>
      ${list.length ? html`<div class="dash">
        ${pack(list).map(({ inst, wide }) => html`<${Card} key=${inst.id} inst=${inst} wide=${wide} state=${state} onOpen=${() => nav.go('card', { id: inst.id, type: inst.type, dash: 'gym' })} />`)}
      </div>` : html`<div class="card empty"><span class="h-md">No stats pinned</span><button class="btn" onClick=${() => nav.go('editDash', { dash: 'gym' })}>Add stats</button></div>`}
      <div class="section-head"><span class="h-md">All stats</span><button class="link-btn" onClick=${() => nav.go('library')}>By exercise</button></div>
      <p class="small muted" style="margin:0">Tap any card for the full breakdown and to pin or unpin it. Food insights live in Food mode.</p>
      <${Library} state=${state} cats=${GYM_CATS} dash="gym" />
    </div>`;
}

export function Insights({ state }) {
  const list = state.foodDashboard || [];
  return html`
    <${TopBar} mode=${state.settings.mode} title="Insights" right=${html`<button class="btn sm" onClick=${() => nav.go('editDash', { dash: 'food' })}>Customize</button>`} />
    <div class="page">
      ${list.length ? html`<div class="dash">
        ${pack(list).map(({ inst, wide }) => html`<${Card} key=${inst.id} inst=${inst} wide=${wide} state=${state} onOpen=${() => nav.go('card', { id: inst.id, type: inst.type, dash: 'food' })} />`)}
      </div>` : html`<div class="card empty"><span class="h-md">No insights pinned</span><button class="btn" onClick=${() => nav.go('editDash', { dash: 'food' })}>Add insights</button></div>`}
      <div class="section-head"><span class="h-md">All insights</span></div>
      <${Library} state=${state} cats=${FOOD_CAT_LIST} dash="food" />
    </div>`;
}

export function CardDetail({ state, params }) {
  const dash = dashFor(state, params.type, params.dash);
  const key = KEY[dash];
  const board = state[key] || [];
  const inst = params.id ? board.find(d => d.id === params.id) : null;
  const type = inst ? inst.type : params.type;
  const def = CARDS[type];
  if (!def) return html`<${TopBar} title="Stats" back=${true} /><div class="page"><div class="card empty">Card not found.</div></div>`;
  const opts = inst ? inst.opts || {} : {};
  const D = def.detail;
  const pinned = inst || (type !== 'lift' && board.find(d => d.type === type));
  const title = type === 'lift' && opts.exId ? (A.exMap(state).get(opts.exId) || {}).name || def.title : def.title;
  const toggle = () => {
    if (pinned) {
      store.update(st => { st[key] = (st[key] || []).filter(d => d.id !== pinned.id); });
      toast(`Removed from ${NAME[dash]}`);
      if (inst) nav.back();
    } else {
      store.update(st => { (st[key] = st[key] || []).push({ id: store.uid(), type, opts: {} }); });
      toast(`Pinned to ${NAME[dash]}`);
    }
  };
  return html`
    <${TopBar} title=${title} back=${true} right=${html`<button class=${'btn sm' + (pinned ? '' : ' primary')} onClick=${toggle}>${pinned ? 'Unpin' : `Pin to ${NAME[dash]}`}</button>`} />
    <div class="page">
      <p class="small muted" style="margin:0">${def.blurb}</p>
      <${D} state=${state} opts=${opts} />
    </div>`;
}

export function EditDash({ state, params }) {
  const dash = params.dash || 'gym';
  const key = KEY[dash];
  const board = state[key] || [];
  const cats = dash === 'food' ? FOOD_CAT_LIST : GYM_CATS;
  const edit = fn => store.update(st => { st[key] = st[key] || []; fn(st[key], st); });
  const move = (i, d) => edit(b => { const j = i + d; if (j < 0 || j >= b.length) return; const [x] = b.splice(i, 1); b.splice(j, 0, x); });
  const remove = id => store.update(st => { st[key] = (st[key] || []).filter(d => d.id !== id); });
  const add = (type, opts = {}) => { edit(b => b.push({ id: store.uid(), type, opts })); toast(`Added to ${NAME[dash]}`); };
  const exm = A.exMap(state);
  const label = inst => inst.type === 'lift' && inst.opts && inst.opts.exId ? `${(exm.get(inst.opts.exId) || {}).name} (lift)` : (CARDS[inst.type] || {}).title;
  return html`
    <${TopBar} title=${`Customize ${NAME[dash]}`} back=${true} right=${html`<button class="btn sm primary" onClick=${() => nav.back()}>Done</button>`} />
    <div class="page">
      <div class="section-head"><span class="h-md">On ${NAME[dash]}</span><span class="small muted">${board.length} cards</span></div>
      <div class="list">
        ${board.map((inst, i) => html`<div class="row">
          <div class="grow"><div class="title">${label(inst)}</div><div class="sub">${(CARDS[inst.type] || {}).wide ? 'Full width' : 'Half width'}</div></div>
          <button class="icon-btn" aria-label="Move up" disabled=${i === 0} onClick=${() => move(i, -1)}><${Icon} name="up" size=${20} /></button>
          <button class="icon-btn" aria-label="Move down" disabled=${i === board.length - 1} onClick=${() => move(i, 1)}><${Icon} name="down" size=${20} /></button>
          <button class="icon-btn" aria-label=${'Remove ' + label(inst)} style="color:var(--bad)" onClick=${() => remove(inst.id)}><${Icon} name="minus" size=${20} /></button>
        </div>`)}
        ${!board.length ? html`<div class="empty small">Nothing pinned. Add cards below.</div>` : null}
      </div>
      ${cats.map(cat => html`
        <div class="section-head"><span class="h-md">${cat}</span></div>
        <div class="list">${Object.values(CARDS).filter(c => c.cat === cat).map(c => {
          const on = c.type !== 'lift' && board.some(d => d.type === c.type);
          return html`<div class="row">
            <div class="grow"><div class="title">${c.title}</div><div class="sub" style="white-space:normal">${c.blurb}</div></div>
            ${c.type === 'lift'
              ? html`<button class="btn sm" onClick=${() => pickExercise(exId => add('lift', { exId }), { title: 'Pick a lift' })}>Add</button>`
              : on ? html`<span class="pill good">Added</span>` : html`<button class="btn sm" onClick=${() => add(c.type)}>Add</button>`}
          </div>`;
        })}</div>`)}
      <button class="btn ghost block" onClick=${() => store.update(st => { st[key] = []; })}>Clear ${NAME[dash]}</button>
    </div>`;
}
