// Exercise picker and custom exercise form (both open as sheets).

import { html, useState } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import { allExercises } from '../lib/analytics.js';
import { MUSCLES, EQUIPMENT } from '../lib/exercises.js';
import { Icon, openSheet, closeSheet, SheetHead, toast } from '../lib/ui.js';
import { ExThumb } from '../lib/photo.js';

export const TYPE_LABEL = { weight: 'Weight × reps', bw: 'Bodyweight reps', time: 'Timed hold', cardio: 'Distance + time', sprint: 'Sprints (each set one sprint)' };

export function pickExercise(onPick, { title = 'Add exercise' } = {}) {
  function Body() {
    const [q, setQ] = useState('');
    const [m, setM] = useState('All');
    const [eq, setEq] = useState('All');
    const [limit, setLimit] = useState(60);
    const ex = allExercises(store.get());
    const ql = q.trim().toLowerCase();
    const words = ql.split(/\s+/).filter(Boolean);
    const list = ex.filter(e => (m === 'All' || e.muscle === m) && (eq === 'All' || e.equip === eq) && words.every(w => (e.name + ' ' + e.equip + ' ' + e.muscle).toLowerCase().includes(w)));
    return html`
      <${SheetHead} title=${title} />
      <div class="hstack" style="position:relative">
        <span style="position:absolute;left:12px;color:var(--muted)"><${Icon} name="search" size=${18} /></span>
        <input id="ex-search" class="input" style="padding-left:38px" placeholder="Search exercises" value=${q} onInput=${e => setQ(e.target.value)} />
      </div>
      <div class="chips">${['All', ...MUSCLES].map(x => html`<button class="chip" aria-pressed=${m === x} onClick=${() => { setM(x); setLimit(60); }}>${x}</button>`)}</div>
      <div class="chips">${['All', ...EQUIPMENT].map(x => html`<button class="chip" aria-pressed=${eq === x} onClick=${() => { setEq(x); setLimit(60); }}>${x === 'All' ? 'Any equipment' : x}</button>`)}</div>
      <div class="small muted">${list.length} exercises</div>
      <div class="list">
        ${list.slice(0, limit).map(e => html`<button class="row" onClick=${() => { closeSheet(); onPick(e.id); }}>
          <${ExThumb} ex=${e} size=${36} />
          <div class="grow"><div class="title">${e.name}</div><div class="sub">${e.muscle} · ${e.equip}${e.custom ? ' · custom' : ''}</div></div>
          <span class="chev"><${Icon} name="plus" size=${18} /></span>
        </button>`)}
        ${!list.length ? html`<div class="empty small">No match for "${q}".</div>` : null}
      </div>
      ${list.length > limit ? html`<button class="btn ghost block" onClick=${() => setLimit(l => l + 100)}>Show more (${list.length - limit} left)</button>` : null}
      <button class="btn block" onClick=${() => editExercise(null, id => onPick(id), q)}><${Icon} name="plus" size=${18} /> Create "${q || 'new exercise'}"</button>`;
  }
  openSheet(() => html`<${Body} />`);
}

export function editExercise(existing, onSaved, prefillName = '') {
  function Body() {
    const [name, setName] = useState(existing ? existing.name : prefillName);
    const [muscle, setMuscle] = useState(existing ? existing.muscle : 'Chest');
    const [equip, setEquip] = useState(existing ? existing.equip : 'Barbell');
    const [type, setType] = useState(existing ? existing.type : 'weight');
    const [rest, setRest] = useState(existing && existing.rest != null ? String(existing.rest) : '');
    const [howto, setHowto] = useState(existing && existing.howto ? existing.howto : '');
    const builtIn = existing && !existing.custom && !existing.rd;
    const fromCatalog = existing && existing.rd;
    const save = () => {
      const n = name.trim();
      if (!n) { toast('Give the exercise a name'); return; }
      let id = existing ? existing.id : 'c-' + store.uid();
      store.update(st => {
        const r = rest === '' ? undefined : Math.max(0, parseInt(rest) || 0);
        if (existing) {
          let mine = st.exercises.find(e => e.id === id);
          if (!mine) { mine = { ...existing }; st.exercises.push(mine); } // a catalog exercise: save your own copy
          Object.assign(mine, { name: n, muscle, equip, type, rest: r, ...(builtIn ? {} : { howto }) });
        }
        else st.exercises.push({ id, name: n, muscle, equip, type, secondary: [], custom: true, howto, ...(r != null ? { rest: r } : {}) });
      });
      closeSheet();
      toast(existing ? 'Exercise updated' : 'Exercise created');
      onSaved && onSaved(id);
    };
    return html`
      <${SheetHead} title=${existing ? 'Edit exercise' : 'New exercise'} />
      <div class="field"><label for="ce-name">Name</label><input id="ce-name" class="input" value=${name} onInput=${e => setName(e.target.value)} placeholder="e.g. Landmine Press" /></div>
      <div class="grid2">
        <div class="field"><label for="ce-muscle">Main muscle</label><select id="ce-muscle" class="input" value=${muscle} onChange=${e => setMuscle(e.target.value)}>${MUSCLES.map(x => html`<option value=${x}>${x}</option>`)}</select></div>
        <div class="field"><label for="ce-equip">Equipment</label><select id="ce-equip" class="input" value=${equip} onChange=${e => setEquip(e.target.value)}>${EQUIPMENT.map(x => html`<option value=${x}>${x}</option>`)}</select></div>
      </div>
      <div class="field"><label for="ce-type">What you track</label><select id="ce-type" class="input" value=${type} onChange=${e => setType(e.target.value)}>${Object.entries(TYPE_LABEL).map(([k, v]) => html`<option value=${k}>${v}</option>`)}</select></div>
      <div class="field"><label for="ce-rest">Rest timer (seconds)</label><input id="ce-rest" class="input num" inputmode="numeric" placeholder="Use default" value=${rest} onInput=${e => setRest(e.target.value)} /></div>
      ${builtIn ? null : html`<div class="field"><label for="ce-howto">How to (one step per line)</label><textarea id="ce-howto" class="input" placeholder=${'Set the bench to 30°\nPress the handle up\nLower slowly'} value=${howto} onInput=${e => setHowto(e.target.value)}></textarea></div>`}
      <button class="btn primary block" onClick=${save}>${existing ? 'Save changes' : 'Create exercise'}</button>`;
  }
  openSheet(() => html`<${Body} />`);
}
