// Stats tab (every analytic), card detail pages and the dashboard editor.

import { html } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import * as A from '../lib/analytics.js';
import { CARDS, CATEGORIES, COMING } from '../lib/cards.js';
import { Icon, nav, TopBar, toast } from '../lib/ui.js';
import { Card } from './today.js';
import { pickExercise } from './picker.js';

const pinned = (state, type) => state.dashboard.find(d => d.type === type && type !== 'lift');

// Wide cards first, then half cards in pairs; an odd one out spans the row.
function layout(cat) {
  const cs = Object.values(CARDS).filter(c => c.cat === cat);
  const wide = cs.filter(c => c.wide), half = cs.filter(c => !c.wide);
  return [...wide.map(c => ({ c, wide: false })), ...half.map((c, i) => ({ c, wide: half.length % 2 === 1 && i === half.length - 1 }))];
}

export function Stats({ state }) {
  return html`
    <${TopBar} title="Stats" right=${html`<button class="btn sm" onClick=${() => nav.go('library')}>By exercise</button>`} />
    <div class="page">
      <p class="small muted" style="margin:0">Every analytic in Tally. Tap one for the full breakdown, and pin the ones you want on Today.</p>
      ${CATEGORIES.map(cat => html`
        <div class="section-head"><span class="h-md">${cat}</span></div>
        <div class="dash">${layout(cat).map(({ c, wide }) => html`<${Card} key=${c.type} wide=${wide} inst=${{ id: 'lib-' + c.type, type: c.type, opts: {} }} state=${state} onOpen=${() => nav.go('card', { type: c.type })} />`)}</div>`)}
      ${COMING.map(g => html`
        <div class="section-head"><span class="h-md">${g.cat}</span><span class="pill">Coming soon</span></div>
        <div class="list">${g.items.map(i => html`<div class="row"><span class="grow text-2">${i}</span></div>`)}</div>`)}
    </div>`;
}

export function CardDetail({ state, params }) {
  const inst = params.id ? state.dashboard.find(d => d.id === params.id) : null;
  const type = inst ? inst.type : params.type;
  const def = CARDS[type];
  if (!def) return html`<${TopBar} title="Stats" back=${true} /><div class="page"><div class="card empty">Card not found.</div></div>`;
  const opts = inst ? inst.opts || {} : {};
  const D = def.detail;
  const isPinned = inst || pinned(state, type);
  const title = type === 'lift' && opts.exId ? (A.exMap(state).get(opts.exId) || {}).name || def.title : def.title;
  const toggle = () => {
    if (isPinned) {
      const target = inst || pinned(state, type);
      store.update(st => { st.dashboard = st.dashboard.filter(d => d.id !== target.id); });
      toast('Removed from Today');
      if (inst) nav.back();
    } else {
      store.update(st => { st.dashboard.push({ id: store.uid(), type, opts: {} }); });
      toast('Pinned to Today');
    }
  };
  return html`
    <${TopBar} title=${title} back=${true} right=${html`<button class=${'btn sm' + (isPinned ? '' : ' primary')} onClick=${toggle}>${isPinned ? 'Unpin' : 'Pin to Today'}</button>`} />
    <div class="page">
      <p class="small muted" style="margin:0">${def.blurb}</p>
      <${D} state=${state} opts=${opts} />
    </div>`;
}

export function EditDash({ state }) {
  const move = (i, d) => store.update(st => { const j = i + d; if (j < 0 || j >= st.dashboard.length) return; const [x] = st.dashboard.splice(i, 1); st.dashboard.splice(j, 0, x); });
  const remove = id => store.update(st => { st.dashboard = st.dashboard.filter(d => d.id !== id); });
  const add = (type, opts = {}) => { store.update(st => { st.dashboard.push({ id: store.uid(), type, opts }); }); toast('Added to Today'); };
  const exm = A.exMap(state);
  const label = inst => inst.type === 'lift' && inst.opts && inst.opts.exId ? `${(exm.get(inst.opts.exId) || {}).name} (lift)` : (CARDS[inst.type] || {}).title;
  return html`
    <${TopBar} title="Customize Today" back=${true} right=${html`<button class="btn sm primary" onClick=${() => nav.back()}>Done</button>`} />
    <div class="page">
      <div class="section-head"><span class="h-md">On your dashboard</span><span class="small muted">${state.dashboard.length} cards</span></div>
      <div class="list">
        ${state.dashboard.map((inst, i) => html`<div class="row">
          <div class="grow"><div class="title">${label(inst)}</div><div class="sub">${(CARDS[inst.type] || {}).wide ? 'Full width' : 'Half width'}</div></div>
          <button class="icon-btn" aria-label="Move up" disabled=${i === 0} onClick=${() => move(i, -1)}><${Icon} name="up" size=${20} /></button>
          <button class="icon-btn" aria-label="Move down" disabled=${i === state.dashboard.length - 1} onClick=${() => move(i, 1)}><${Icon} name="down" size=${20} /></button>
          <button class="icon-btn" aria-label=${'Remove ' + label(inst)} style="color:var(--bad)" onClick=${() => remove(inst.id)}><${Icon} name="minus" size=${20} /></button>
        </div>`)}
        ${!state.dashboard.length ? html`<div class="empty small">Nothing pinned. Add cards below.</div>` : null}
      </div>
      ${CATEGORIES.map(cat => html`
        <div class="section-head"><span class="h-md">${cat}</span></div>
        <div class="list">${Object.values(CARDS).filter(c => c.cat === cat).map(c => {
          const on = c.type !== 'lift' && state.dashboard.some(d => d.type === c.type);
          return html`<div class="row">
            <div class="grow"><div class="title">${c.title}</div><div class="sub" style="white-space:normal">${c.blurb}</div></div>
            ${c.type === 'lift'
              ? html`<button class="btn sm" onClick=${() => pickExercise(exId => add('lift', { exId }), { title: 'Pick a lift' })}>Add</button>`
              : on ? html`<span class="pill good">Added</span>` : html`<button class="btn sm" onClick=${() => add(c.type)}>Add</button>`}
          </div>`;
        })}</div>`)}
      <button class="btn ghost block" onClick=${() => { store.update(st => { st.dashboard = []; }); }}>Clear dashboard</button>
    </div>`;
}
