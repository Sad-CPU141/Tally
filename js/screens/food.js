// Food tab: daily log, adding food (search, scan, quick add, custom), saved meals, water, targets.

import { html, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import * as F from '../lib/food.js';
import { Icon, nav, TopBar, openSheet, closeSheet, SheetHead, confirmSheet, toast, Seg, Switch } from '../lib/ui.js';
import { todayKey, dayKey, fromKey, addDays, fmtRel, fmtDate, fmtNum, round, toUnit, fromUnit, w } from '../lib/util.js';
import { weightTrend } from '../lib/analytics.js';

const kc = n => Math.round(n || 0).toLocaleString();
const g = n => fmtNum(n || 0, 0);

// ---------- day view ----------
let lastDay = null; // remember the day the user was looking at while the app is open

export function Food({ state }) {
  const [key, setKey] = useState(lastDay || todayKey());
  useEffect(() => { lastDay = key; }, [key]);
  const isToday = key === todayKey();
  const shift = n => setKey(dayKey(addDays(fromKey(key), n)));
  const tgt = F.targetFor(state, key);
  const ent = F.dayEntries(state, key);
  const tot = F.sum(ent);
  const left = tgt.kcal - tot.kcal;
  const fs = state.food;
  const yKey = dayKey(addDays(fromKey(key), -1));
  const yEnt = F.dayEntries(state, yKey);

  return html`
    <${TopBar} title="Food" right=${html`<div class="daynav">
      <button class="icon-btn" aria-label="Previous day" onClick=${() => shift(-1)}><${Icon} name="left" /></button>
      <button class="lbl" onClick=${() => setKey(todayKey())}>${fmtRel(fromKey(key))}</button>
      <button class="icon-btn" aria-label="Next day" disabled=${isToday} onClick=${() => shift(1)}><${Icon} name="right" /></button>
    </div>`} />
    <div class="page">
      ${!fs.setup ? html`<div class="banner"><span class="grow">These are starter targets. Set your own in about a minute.</span><button class="btn sm" onClick=${() => nav.go('targets')}>Set targets</button></div>` : null}

      <div class="card fuel">
        <div class="fuel-top">
          <div>
            <div class="eyebrow">${left >= 0 ? 'Calories left' : 'Over target'}</div>
            <div class="big" style=${left < 0 ? 'color:var(--warn)' : ''}>${kc(Math.abs(left))}</div>
          </div>
          <div style="text-align:right">
            ${fs.split ? html`<span class=${'pill ' + (tgt.type === 'train' ? 'accent' : '')}>${tgt.type === 'train' ? 'Training day' : 'Rest day'}</span>` : null}
            <div class="small muted num" style="margin-top:6px">${kc(tot.kcal)} / ${kc(tgt.kcal)} kcal</div>
          </div>
        </div>
        <div class="meter"><i class=${tot.kcal > tgt.kcal * 1.03 ? 'over' : ''} style=${`width:${Math.min(100, tot.kcal / Math.max(1, tgt.kcal) * 100)}%`}></i></div>
        <div class="macros">
          ${['p', 'c', 'f'].map(m => {
            const pct = tot[m] / Math.max(1, tgt[m]);
            const cls = m === 'p' ? (pct >= 0.95 ? 'good' : '') : pct > 1.1 ? 'over' : '';
            return html`<div class="macro">
              <span class="eyebrow">${F.MACRO[m]}</span>
              <span class="v">${g(tot[m])}<small> / ${g(tgt[m])} g</small></span>
              <div class="meter thin"><i class=${cls} style=${`width:${Math.min(100, pct * 100)}%`}></i></div>
            </div>`;
          })}
        </div>
        ${fs.fiber ? html`<div class="hstack small"><span class="muted">Fiber</span><span class="num">${g(tot.fiber)} / ${fs.fiber} g</span><span class="spacer"></span><span class="muted">Sugar</span><span class="num">${g(tot.sugar)} g</span><span class="muted">Sodium</span><span class="num">${kc(tot.sodium)} mg</span></div>` : null}
      </div>

      ${!ent.length && yEnt.length ? html`<button class="btn block" onClick=${() => copyDay(yKey, key)}><${Icon} name="copy" size=${18} /> Copy ${fmtRel(fromKey(yKey)).toLowerCase()}'s food (${kc(F.sum(yEnt).kcal)} kcal)</button>` : null}

      ${fs.mealNames.map((meal, mi) => {
        const items = ent.filter(e => e.meal === meal || (mi === fs.mealNames.length - 1 && !fs.mealNames.includes(e.meal)));
        const mt = F.sum(items);
        return html`<div class="list">
          <div class="meal-head">
            <span class="h-md">${meal}</span>
            ${items.length ? html`<span class="small muted num">${kc(mt.kcal)} kcal · ${g(mt.p)}p</span>` : null}
            ${items.length ? html`<button class="icon-btn" aria-label=${meal + ' options'} onClick=${() => mealMenu(meal, items, key)}><${Icon} name="more" /></button>` : null}
            <button class="icon-btn" aria-label=${'Add to ' + meal} style="color:var(--accent)" onClick=${() => nav.go('addFood', { date: key, meal })}><${Icon} name="plus" /></button>
          </div>
          ${items.map(e => html`<button class="row food-row" onClick=${() => editEntry(e)}>
            <div class="grow"><div class="title">${e.name}</div><div class="sub">${F.qtyLabel(e, state.foods.find(f => f.id === e.foodId))}${e.brand ? ' · ' + e.brand : ''}</div></div>
            <div><div class="kc">${kc(e.kcal)}</div><div class="macs">${g(e.p)}p ${g(e.c)}c ${g(e.f)}f</div></div>
          </button>`)}
        </div>`;
      })}

      ${fs.water ? html`<${Water} state=${state} dkey=${key} />` : null}
    </div>`;
}

function Water({ state, dkey }) {
  const ml = state.water[dkey] || 0, target = state.food.water;
  const glasses = Math.ceil(target / 250);
  const add = d => store.update(st => { st.water[dkey] = Math.max(0, (st.water[dkey] || 0) + d); });
  return html`<div class="card water">
    <span style="color:var(--accent)"><${Icon} name="drop" /></span>
    <div class="grow" style="min-width:0">
      <div class="hstack" style="justify-content:space-between"><span class="h-md">Water</span><span class="small num muted">${fmtNum(ml / 1000, 2)} / ${fmtNum(target / 1000, 1)} L</span></div>
      <div class="glasses" style="margin-top:8px">${Array.from({ length: glasses }, (_, i) => html`<i class=${i < Math.round(ml / 250) ? 'on' : ''}></i>`)}</div>
    </div>
    <button class="icon-btn" aria-label="Remove 250 ml" onClick=${() => add(-250)}><${Icon} name="minus" /></button>
    <button class="btn sm primary" aria-label="Add 250 ml" onClick=${() => add(250)}>+250</button>
  </div>`;
}

function copyDay(from, to) {
  store.update(st => {
    const src = st.foodLog.filter(e => e.date === from);
    for (const e of src) st.foodLog.push({ ...e, id: store.uid(), date: to });
  });
  toast('Copied');
}

function mealMenu(meal, items, key) {
  function Body() {
    const [name, setName] = useState(`${meal} ${fmtDate(fromKey(key))}`);
    return html`
      <${SheetHead} title=${meal} />
      <div class="field"><label for="sm-name">Save these ${items.length} foods as a meal</label>
        <input id="sm-name" class="input" value=${name} onInput=${e => setName(e.target.value)} /></div>
      <button class="btn primary block" onClick=${() => { store.update(st => { st.meals.push({ id: store.uid(), name: name.trim() || meal, items: items.map(({ id, date, meal, ...rest }) => rest) }); }); closeSheet(); toast('Meal saved'); }}><${Icon} name="bookmark" size=${18} /> Save meal</button>
      <button class="btn block" onClick=${() => { const t = dayKey(new Date()); store.update(st => { for (const e of items) st.foodLog.push({ ...e, id: store.uid(), date: t }); }); closeSheet(); toast('Added to today'); }} disabled=${key === todayKey()}>Log again today</button>
      <button class="btn block danger" onClick=${() => { store.update(st => { const ids = new Set(items.map(i => i.id)); st.foodLog = st.foodLog.filter(e => !ids.has(e.id)); }); closeSheet(); toast(`${meal} cleared`); }}>Clear ${meal.toLowerCase()}</button>`;
  }
  openSheet(() => html`<${Body} />`);
}

// ---------- portion picker (shared by add and edit) ----------
function Portion({ food, qty, unit, setQty, setUnit }) {
  const canG = !!food.per100;
  const canS = !!(food.perServing || (food.per100 && food.serving && food.serving.g));
  const n = F.nutritionFor(food, parseFloat(qty) || 0, unit);
  return html`
    <div class="grid2">
      <div class="field"><label for="pq">Amount</label><input id="pq" class="input num" style="font-size:20px;text-align:center" inputmode="decimal" value=${qty} onInput=${e => setQty(e.target.value)} /></div>
      <div class="field"><label>Unit</label>${canG && canS
        ? html`<${Seg} label="Unit" value=${unit} onChange=${u => { setUnit(u); if (u === 'g' && food.serving && food.serving.g) setQty(String(round(food.serving.g * (parseFloat(qty) || 1), 1))); if (u === 'serving' && food.serving && food.serving.g) setQty(String(round((parseFloat(qty) || 0) / food.serving.g, 2) || 1)); }} options=${[['serving', 'Servings'], ['g', 'Grams']]} />`
        : html`<div class="input" style="display:flex;align-items:center;color:var(--text-2)">${unit === 'g' ? 'Grams' : 'Servings'}</div>`}</div>
    </div>
    ${unit === 'serving' && food.serving ? html`<div class="tiny muted" style="margin-top:-6px">1 serving = ${food.serving.label}${food.serving.g && food.serving.label.indexOf('g') === -1 ? ` (${food.serving.g} g)` : ''}</div>` : null}
    <div class="summary-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat"><span class="eyebrow">kcal</span><span class="mid">${kc(n.kcal)}</span></div>
      <div class="stat"><span class="eyebrow">Protein</span><span class="mid">${g(n.p)}</span></div>
      <div class="stat"><span class="eyebrow">Carbs</span><span class="mid">${g(n.c)}</span></div>
      <div class="stat"><span class="eyebrow">Fat</span><span class="mid">${g(n.f)}</span></div>
    </div>`;
}

function defaultPortion(food) {
  if (food.perServing || (food.serving && food.serving.g)) return ['1', 'serving'];
  return ['100', 'g'];
}

export function foodSheet(food, date, meal, onDone) {
  function Body() {
    const [d0, u0] = defaultPortion(food);
    const [qty, setQty] = useState(food.lastQty ? String(food.lastQty) : d0);
    const [unit, setUnit] = useState(food.lastUnit || u0);
    const add = () => {
      const q = parseFloat(qty);
      if (!q || q <= 0) { toast('Enter an amount'); return; }
      store.update(st => {
        let saved = st.foods.find(f => f.id === food.id);
        if (!saved) { saved = { ...food, id: food.id || 'f-' + store.uid() }; st.foods.push(saved); }
        saved.used = Date.now(); saved.uses = (saved.uses || 0) + 1; saved.lastQty = q; saved.lastUnit = unit;
        st.foodLog.push(F.entryFrom(saved, q, unit, meal, date));
      });
      closeSheet();
      toast(`Added to ${meal.toLowerCase()}`);
      onDone && onDone();
    };
    return html`
      <${SheetHead} title=${food.name} />
      ${food.brand ? html`<div class="small muted" style="margin-top:-8px">${food.brand}</div>` : null}
      <${Portion} food=${food} qty=${qty} unit=${unit} setQty=${setQty} setUnit=${setUnit} />
      <button class="btn primary block" onClick=${add}>Add to ${meal}</button>`;
  }
  openSheet(() => html`<${Body} />`);
}

function editEntry(e) {
  const st0 = store.get();
  const food = st0.foods.find(f => f.id === e.foodId);
  function Body() {
    const [qty, setQty] = useState(String(e.qty));
    const [unit, setUnit] = useState(e.unit);
    const [meal, setMeal] = useState(e.meal);
    const meals = store.get().food.mealNames;
    const save = () => {
      const q = parseFloat(qty);
      if (!q || q <= 0) { toast('Enter an amount'); return; }
      store.update(st => {
        const x = st.foodLog.find(y => y.id === e.id);
        if (!x) return;
        if (food) Object.assign(x, F.entryFrom(food, q, unit, meal, x.date), { id: x.id });
        else { const r = q / x.qty; for (const k of F.NUTRIENTS) x[k] = round((x[k] || 0) * r, 2); x.qty = q; x.meal = meal; }
      });
      closeSheet(); toast('Updated');
    };
    return html`
      <${SheetHead} title=${e.name} />
      ${food ? html`<${Portion} food=${food} qty=${qty} unit=${unit} setQty=${setQty} setUnit=${setUnit} />`
        : html`<div class="field"><label for="eq">Servings</label><input id="eq" class="input num" inputmode="decimal" value=${qty} onInput=${ev => setQty(ev.target.value)} /></div>`}
      <div class="field"><label>Meal</label><div class="chips">${meals.map(m => html`<button class="chip" aria-pressed=${meal === m} onClick=${() => setMeal(m)}>${m}</button>`)}</div></div>
      <div class="grid2">
        <button class="btn danger" onClick=${() => { store.update(st => { st.foodLog = st.foodLog.filter(y => y.id !== e.id); }); closeSheet(); toast('Removed'); }}>Remove</button>
        <button class="btn primary" onClick=${save}>Save</button>
      </div>`;
  }
  openSheet(() => html`<${Body} />`);
}

// ---------- add food ----------
export function AddFood({ state, params }) {
  const { date, meal } = params;
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('recent');
  const [online, setOnline] = useState({ status: 'idle', items: [], q: '' });
  const [retry, setRetry] = useState(0);
  const timer = useRef(null);
  const ql = q.trim().toLowerCase();

  useEffect(() => {
    clearTimeout(timer.current);
    if (ql.length < 3) { setOnline({ status: 'idle', items: [], q: '' }); return; }
    timer.current = setTimeout(async () => {
      setOnline({ status: 'loading', items: [], q: ql });
      try { const items = await F.searchFoods(ql); setOnline({ status: 'done', items, q: ql }); }
      catch (e) { setOnline({ status: 'error', items: [], q: ql }); }
    }, 900);
    return () => clearTimeout(timer.current);
  }, [ql, retry]);

  const foods = state.foods;
  const recent = foods.filter(f => f.used).sort((a, b) => b.used - a.used).slice(0, 30);
  const mine = foods.slice().sort((a, b) => (b.uses || 0) - (a.uses || 0));
  const local = ql ? foods.filter(f => (f.name + ' ' + (f.brand || '')).toLowerCase().includes(ql)) : null;
  const meals = ql ? state.meals.filter(m => m.name.toLowerCase().includes(ql)) : state.meals;

  const FoodRow = ({ f }) => html`<button class="row" onClick=${() => foodSheet(f, date, meal)}>
    <div class="grow"><div class="title">${f.name}</div><div class="sub">${[f.brand, f.serving ? f.serving.label : f.per100 ? 'per 100 g' : ''].filter(Boolean).join(' · ')}</div></div>
    <span class="num small muted">${f.serving && f.per100 && f.serving.g ? kc(f.per100.kcal * f.serving.g / 100) : f.perServing ? kc(f.perServing.kcal) : f.per100 ? kc(f.per100.kcal) : ''} kcal</span>
  </button>`;

  const logMeal = m => {
    store.update(st => { for (const it of m.items) st.foodLog.push({ ...it, id: store.uid(), date, meal }); });
    toast(`Added ${m.name}`);
    nav.back();
  };

  return html`
    <${TopBar} title=${'Add to ' + meal} back=${true} />
    <div class="page">
      <div class="hstack" style="position:relative">
        <span style="position:absolute;left:12px;color:var(--muted)"><${Icon} name="search" size=${18} /></span>
        <input id="food-search" class="input" style="padding-left:38px" placeholder="Search foods or brands" value=${q} onInput=${e => setQ(e.target.value)} />
      </div>
      <div class="grid3">
        <button class="btn" onClick=${() => scanBarcode(date, meal)}><${Icon} name="barcode" size=${18} /> Scan</button>
        <button class="btn" onClick=${() => quickAdd(date, meal)}><${Icon} name="bolt" size=${18} /> Quick</button>
        <button class="btn" onClick=${() => createFood(date, meal, q)}><${Icon} name="plus" size=${18} /> Create</button>
      </div>

      ${ql ? html`
        ${local.length || meals.length ? html`<div class="section-head"><span class="h-md">Your foods</span></div>
          <div class="list">
            ${meals.map(m => html`<button class="row" onClick=${() => logMeal(m)}><span style="color:var(--accent)"><${Icon} name="bookmark" size=${18} /></span><div class="grow"><div class="title">${m.name}</div><div class="sub">Saved meal · ${m.items.length} foods</div></div><span class="num small muted">${kc(F.sum(m.items).kcal)} kcal</span></button>`)}
            ${local.slice(0, 12).map(f => html`<${FoodRow} f=${f} />`)}
          </div>` : null}
        <div class="section-head"><span class="h-md">Online</span><span class="tiny muted">Open Food Facts</span></div>
        ${ql.length < 3 ? html`<div class="small muted">Type at least 3 letters to search online.</div>`
          : online.status === 'loading' || (online.q !== ql) ? html`<div class="card empty small">Searching…</div>`
          : online.status === 'error' ? html`<div class="card empty small">The food database didn't answer. It allows about 10 searches a minute, so wait a few seconds, or check your connection.
              <button class="btn sm" onClick=${() => setRetry(r => r + 1)}>Try again</button></div>`
          : online.items.length ? html`<div class="list">${online.items.map(f => html`<${FoodRow} f=${f} />`)}</div>`
          : html`<div class="card empty small">No matches. Try a shorter search, scan the barcode, or create the food.</div>`}
      ` : html`
        <${Seg} label="Food lists" value=${tab} onChange=${setTab} options=${[['recent', 'Recent'], ['mine', 'My foods'], ['meals', 'Meals']]} />
        ${tab === 'meals' ? (meals.length ? html`<div class="list">${meals.map(m => html`<div class="row">
              <button class="grow" style="background:none;border:0;text-align:left;padding:0;min-width:0" onClick=${() => logMeal(m)}><div class="title">${m.name}</div><div class="sub">${m.items.map(i => i.name).join(', ')}</div></button>
              <span class="num small muted">${kc(F.sum(m.items).kcal)}</span>
              <button class="icon-btn" aria-label=${'Delete ' + m.name} onClick=${() => confirmSheet({ title: `Delete ${m.name}?`, body: 'Foods you already logged stay in your log.', onConfirm: () => store.update(st => { st.meals = st.meals.filter(x => x.id !== m.id); }) })}><${Icon} name="trash" size=${18} /></button>
            </div>`)}</div>`
            : html`<div class="card empty small"><span class="h-md">No saved meals yet</span>Log a meal, then tap ⋯ next to it on the Food page to save it.</div>`)
          : (tab === 'recent' ? recent : mine).length ? html`<div class="list">${(tab === 'recent' ? recent : mine).map(f => html`<${FoodRow} f=${f} />`)}</div>`
          : html`<div class="card empty small"><span class="h-md">Nothing here yet</span>Search, scan a barcode or create a food. Everything you log is saved here for next time.</div>`}
      `}
    </div>`;
}

function quickAdd(date, meal) {
  function Body() {
    const [v, setV] = useState({ name: '', kcal: '', p: '', c: '', f: '' });
    const set = k => e => setV({ ...v, [k]: e.target.value });
    const num = k => parseFloat(v[k]) || 0;
    const macroKcal = num('p') * 4 + num('c') * 4 + num('f') * 9;
    const add = () => {
      const kcal = v.kcal === '' ? macroKcal : num('kcal');
      if (!kcal && !macroKcal) { toast('Enter calories or macros'); return; }
      store.update(st => { st.foodLog.push({ id: store.uid(), date, meal, foodId: null, name: v.name.trim() || 'Quick add', brand: '', qty: 1, unit: 'serving', kcal, p: num('p'), c: num('c'), f: num('f'), fiber: 0, sugar: 0, sodium: 0 }); });
      closeSheet(); toast('Added'); nav.back();
    };
    return html`
      <${SheetHead} title="Quick add" />
      <div class="field"><label for="qa-name">Name (optional)</label><input id="qa-name" class="input" placeholder="e.g. Shawarma plate" value=${v.name} onInput=${set('name')} /></div>
      <div class="tgt">
        <div class="field"><label for="qa-k">kcal</label><input id="qa-k" class="input" inputmode="numeric" placeholder=${macroKcal ? String(Math.round(macroKcal)) : ''} value=${v.kcal} onInput=${set('kcal')} /></div>
        <div class="field"><label for="qa-p">Protein</label><input id="qa-p" class="input" inputmode="decimal" value=${v.p} onInput=${set('p')} /></div>
        <div class="field"><label for="qa-c">Carbs</label><input id="qa-c" class="input" inputmode="decimal" value=${v.c} onInput=${set('c')} /></div>
        <div class="field"><label for="qa-f">Fat</label><input id="qa-f" class="input" inputmode="decimal" value=${v.f} onInput=${set('f')} /></div>
      </div>
      <div class="tiny muted">Leave kcal empty and it's worked out from the macros.</div>
      <button class="btn primary block" onClick=${add}>Add to ${meal}</button>`;
  }
  openSheet(() => html`<${Body} />`);
}

export function createFood(date, meal, prefill = '', barcode = null) {
  function Body() {
    const [v, setV] = useState({ name: prefill, brand: '', label: '1 serving', grams: '', kcal: '', p: '', c: '', f: '', fiber: '', sugar: '', sodium: '' });
    const set = k => e => setV({ ...v, [k]: e.target.value });
    const num = k => parseFloat(v[k]) || 0;
    const save = () => {
      if (!v.name.trim()) { toast('Give the food a name'); return; }
      const per = { kcal: v.kcal === '' ? num('p') * 4 + num('c') * 4 + num('f') * 9 : num('kcal'), p: num('p'), c: num('c'), f: num('f'), fiber: num('fiber'), sugar: num('sugar'), sodium: num('sodium') };
      const gr = num('grams');
      const food = { id: 'f-' + store.uid(), name: v.name.trim(), brand: v.brand.trim(), source: 'custom', barcode: barcode || undefined,
        serving: { label: v.label.trim() || '1 serving', g: gr || null }, perServing: per,
        per100: gr ? Object.fromEntries(Object.entries(per).map(([k, x]) => [k, round(x * 100 / gr, 3)])) : null };
      store.update(st => { st.foods.push(food); });
      closeSheet();
      if (date) foodSheet(food, date, meal, () => nav.back()); else toast('Food saved');
    };
    return html`
      <${SheetHead} title="Create food" />
      <div class="grid2">
        <div class="field"><label for="cf-name">Name</label><input id="cf-name" class="input" value=${v.name} onInput=${set('name')} /></div>
        <div class="field"><label for="cf-brand">Brand</label><input id="cf-brand" class="input" placeholder="Optional" value=${v.brand} onInput=${set('brand')} /></div>
      </div>
      <div class="grid2">
        <div class="field"><label for="cf-label">Serving</label><input id="cf-label" class="input" value=${v.label} onInput=${set('label')} placeholder="1 scoop" /></div>
        <div class="field"><label for="cf-g">Serving grams</label><input id="cf-g" class="input num" inputmode="decimal" placeholder="Optional" value=${v.grams} onInput=${set('grams')} /></div>
      </div>
      <span class="eyebrow">Nutrition per serving</span>
      <div class="tgt">
        <div class="field"><label for="cf-k">kcal</label><input id="cf-k" class="input" inputmode="numeric" value=${v.kcal} onInput=${set('kcal')} /></div>
        <div class="field"><label for="cf-p">Protein</label><input id="cf-p" class="input" inputmode="decimal" value=${v.p} onInput=${set('p')} /></div>
        <div class="field"><label for="cf-c">Carbs</label><input id="cf-c" class="input" inputmode="decimal" value=${v.c} onInput=${set('c')} /></div>
        <div class="field"><label for="cf-f">Fat</label><input id="cf-f" class="input" inputmode="decimal" value=${v.f} onInput=${set('f')} /></div>
      </div>
      <div class="grid3">
        <div class="field"><label for="cf-fi">Fiber g</label><input id="cf-fi" class="input num" inputmode="decimal" value=${v.fiber} onInput=${set('fiber')} /></div>
        <div class="field"><label for="cf-su">Sugar g</label><input id="cf-su" class="input num" inputmode="decimal" value=${v.sugar} onInput=${set('sugar')} /></div>
        <div class="field"><label for="cf-so">Sodium mg</label><input id="cf-so" class="input num" inputmode="numeric" value=${v.sodium} onInput=${set('sodium')} /></div>
      </div>
      <div class="tiny muted">Adding the serving grams lets you log this food by weight too.</div>
      <button class="btn primary block" onClick=${save}>Save food</button>`;
  }
  openSheet(() => html`<${Body} />`);
}

// ---------- barcode scanning ----------
let zxingLoad = null;
function loadZXing() {
  if (window.ZXing) return Promise.resolve(window.ZXing);
  if (!zxingLoad) zxingLoad = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = new URL('../vendor/zxing.min.js', import.meta.url).href;
    s.onload = () => res(window.ZXing); s.onerror = () => { zxingLoad = null; rej(new Error('load')); };
    document.head.appendChild(s);
  });
  return zxingLoad;
}

function scanBarcode(date, meal) {
  function Body() {
    const video = useRef(null);
    const [status, setStatus] = useState('starting');
    const [manual, setManual] = useState('');
    const stopRef = useRef(() => {});
    const found = useRef(false);

    const handle = async code => {
      if (found.current) return;
      found.current = true;
      stopRef.current();
      try { navigator.vibrate && navigator.vibrate(30); } catch (e) {}
      setStatus('looking');
      const saved = store.get().foods.find(f => f.barcode === code);
      if (saved) { closeSheet(); foodSheet(saved, date, meal, () => nav.back()); return; }
      try {
        const food = await F.lookupBarcode(code);
        closeSheet();
        if (food) foodSheet(food, date, meal, () => nav.back());
        else { toast('Not in the database yet, add it once and it\'s saved'); createFood(date, meal, '', code); }
      } catch (e) { setStatus('neterror'); found.current = false; }
    };

    useEffect(() => {
      let stream = null, raf = null, reader = null, alive = true;
      stopRef.current = () => { alive = false; cancelAnimationFrame(raf); try { reader && reader.reset(); } catch (e) {} if (stream) stream.getTracks().forEach(t => t.stop()); };
      (async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setStatus('nocamera'); return; }
        const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
        let native = null;
        try { if ('BarcodeDetector' in window) { const sup = await window.BarcodeDetector.getSupportedFormats(); if (formats.some(f => sup.includes(f))) native = new window.BarcodeDetector({ formats: formats.filter(f => sup.includes(f)) }); } } catch (e) {}
        try {
          if (native) {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
            if (!alive) return stopRef.current();
            video.current.srcObject = stream; await video.current.play(); setStatus('scanning');
            let last = 0;
            const tick = async t => {
              if (!alive) return;
              if (t - last > 200 && video.current.readyState >= 2) {
                last = t;
                try { const r = await native.detect(video.current); if (r && r[0]) return handle(r[0].rawValue); } catch (e) {}
              }
              raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
          } else {
            const Z = await loadZXing();
            if (!alive) return;
            const hints = new Map();
            hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
            reader = new Z.BrowserMultiFormatReader(hints);
            setStatus('scanning');
            await reader.decodeFromConstraints({ video: { facingMode: 'environment' }, audio: false }, video.current, res => { if (res && alive) handle(res.getText()); });
          }
        } catch (e) { setStatus(e && e.name === 'NotAllowedError' ? 'denied' : 'nocamera'); }
      })();
      return () => stopRef.current();
    }, []);

    const msg = {
      starting: 'Starting the camera…', scanning: 'Point the camera at the barcode.', looking: 'Looking it up…',
      denied: 'Camera access was blocked. Allow the camera for this site in your phone settings, or type the number below.',
      nocamera: "This browser can't open the camera here. Type the barcode number below.",
      neterror: "Couldn't reach the food database. Check your connection and try again.",
    }[status];
    return html`
      <${SheetHead} title="Scan barcode" onClose=${() => { stopRef.current(); closeSheet(); }} />
      <div class="scan-box"><video ref=${video} playsinline muted autoplay></video><div class="aim"></div></div>
      <div class="small text-2">${msg}</div>
      <div class="hstack">
        <input id="bc-manual" class="input num" inputmode="numeric" placeholder="Barcode number" value=${manual} onInput=${e => setManual(e.target.value.replace(/\D/g, ''))} />
        <button class="btn" disabled=${manual.length < 8} onClick=${() => handle(manual)}>Look up</button>
      </div>`;
  }
  openSheet(() => html`<${Body} />`);
}

// ---------- targets ----------
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Targets({ state }) {
  const fs = state.food;
  const unit = state.settings.unit;
  const tr = weightTrend(state);
  const latestKg = tr.length ? tr[tr.length - 1].trend : null;
  const pr = fs.profile;
  const [kgIn, setKgIn] = useState(latestKg ? fmtNum(toUnit(latestKg, unit), 1) : '');
  const imperial = unit === 'lb';
  const [ft, setFt] = useState(pr.heightCm ? String(Math.floor(pr.heightCm / 2.54 / 12)) : '');
  const [inch, setInch] = useState(pr.heightCm ? String(Math.round(pr.heightCm / 2.54 % 12)) : '');
  const editF = fn => store.update(st => fn(st.food));
  const setP = (k, v) => editF(f => { f.profile[k] = v; });
  const setHeightImperial = (f2, i2) => { setFt(f2); setInch(i2); const cm = ((parseFloat(f2) || 0) * 12 + (parseFloat(i2) || 0)) * 2.54; setP('heightCm', cm || null); };
  const kg = kgIn ? fromUnit(parseFloat(kgIn), unit) : null;
  const calc = F.calculate({ ...pr, kg, trainDays: fs.trainDays });

  const TRow = ({ which, label }) => {
    const t = fs[which];
    const mk = t.p * 4 + t.c * 4 + t.f * 9;
    const setT = k => e => { const v = parseFloat(e.target.value); editF(f => { f[which][k] = isNaN(v) ? 0 : v; f.setup = true; }); };
    return html`<div class="card stack">
      <div class="hstack" style="justify-content:space-between"><span class="h-md">${label}</span><span class=${'tiny ' + (Math.abs(mk - t.kcal) > t.kcal * 0.05 ? 'warn' : 'muted')}>Macros add up to ${kc(mk)} kcal</span></div>
      <div class="tgt">
        <div class="field"><label for=${which + '-k'}>kcal</label><input id=${which + '-k'} class="input" inputmode="numeric" value=${t.kcal} onChange=${setT('kcal')} /></div>
        <div class="field"><label for=${which + '-p'}>Protein</label><input id=${which + '-p'} class="input" inputmode="numeric" value=${t.p} onChange=${setT('p')} /></div>
        <div class="field"><label for=${which + '-c'}>Carbs</label><input id=${which + '-c'} class="input" inputmode="numeric" value=${t.c} onChange=${setT('c')} /></div>
        <div class="field"><label for=${which + '-f'}>Fat</label><input id=${which + '-f'} class="input" inputmode="numeric" value=${t.f} onChange=${setT('f')} /></div>
      </div>
    </div>`;
  };

  return html`
    <${TopBar} title="Food targets" back=${true} />
    <div class="page">
      <div class="section-head" style="margin-top:0"><span class="h-md">Calculate my targets</span></div>
      <div class="card stack">
        <div class="field"><label>Sex (for the calorie formula)</label><${Seg} label="Sex" value=${pr.sex} onChange=${v => setP('sex', v)} options=${[['male', 'Male'], ['female', 'Female']]} /></div>
        <div class="grid2">
          <div class="field"><label for="t-age">Age</label><input id="t-age" class="input num" inputmode="numeric" value=${pr.age || ''} onInput=${e => setP('age', parseInt(e.target.value) || null)} /></div>
          <div class="field"><label for="t-kg">Weight (${unit})</label><input id="t-kg" class="input num" inputmode="decimal" value=${kgIn} onInput=${e => setKgIn(e.target.value)} placeholder=${latestKg ? '' : 'Log weight first or type it'} /></div>
        </div>
        ${imperial ? html`<div class="grid2">
            <div class="field"><label for="t-ft">Height (ft)</label><input id="t-ft" class="input num" inputmode="numeric" value=${ft} onInput=${e => setHeightImperial(e.target.value, inch)} /></div>
            <div class="field"><label for="t-in">(in)</label><input id="t-in" class="input num" inputmode="numeric" value=${inch} onInput=${e => setHeightImperial(ft, e.target.value)} /></div>
          </div>`
          : html`<div class="field"><label for="t-cm">Height (cm)</label><input id="t-cm" class="input num" inputmode="numeric" value=${pr.heightCm ? Math.round(pr.heightCm) : ''} onInput=${e => setP('heightCm', parseFloat(e.target.value) || null)} /></div>`}
        <div class="field"><label for="t-act">Activity</label><select id="t-act" class="input" value=${pr.activity} onChange=${e => setP('activity', e.target.value)}>${F.ACTIVITY.map(([k, l]) => html`<option value=${k}>${l}</option>`)}</select></div>
        <div class="field"><label for="t-goal">Goal</label><select id="t-goal" class="input" value=${pr.goal} onChange=${e => setP('goal', e.target.value)}>${F.GOALS.map(([k, l]) => html`<option value=${k}>${l}</option>`)}</select>
          <span class="tiny muted">${(F.GOALS.find(x => x[0] === pr.goal) || F.GOALS[0])[3]}</span></div>
        <div class="field"><label>Training days</label><div class="wk">${[1, 2, 3, 4, 5, 6, 0].map(d => html`<button aria-pressed=${fs.trainDays.includes(d)} onClick=${() => editF(f => { f.trainDays = f.trainDays.includes(d) ? f.trainDays.filter(x => x !== d) : [...f.trainDays, d]; })}>${WD[d]}</button>`)}</div>
          <span class="tiny muted">Days you've logged a workout always count as training days.</span></div>
        ${calc ? html`<div class="stack" style="gap:8px;padding:12px;border-radius:14px;background:var(--surface-2)">
            <div class="small text-2">Estimated burn <b class="num">${kc(calc.tdee)}</b> kcal a day. Weekly average target <b class="num">${kc(calc.avg)}</b>.</div>
            <div class="kv small">
              <span>Training day</span><span class="num">${kc(calc.train.kcal)} kcal · ${calc.train.p}p ${calc.train.c}c ${calc.train.f}f</span>
              <span>Rest day</span><span class="num">${kc(calc.rest.kcal)} kcal · ${calc.rest.p}p ${calc.rest.c}c ${calc.rest.f}f</span>
            </div>
            <button class="btn primary block" onClick=${() => { editF(f => { f.train = calc.train; f.rest = calc.rest; f.split = true; f.setup = true; }); toast('Targets updated'); }}>Use these targets</button>
            <span class="tiny muted">Formulas are a starting point. Once you've logged food and weight for a couple of weeks, the Adaptive burn card on Stats shows what your body is really using.</span>
          </div>` : html`<div class="small muted">Fill in sex, age, height and weight to get an estimate.</div>`}
      </div>

      <div class="section-head"><span class="h-md">Daily targets</span></div>
      <div class="list"><div class="row"><div class="grow"><div class="title">Different targets on rest days</div><div class="sub" style="white-space:normal">More carbs when you train, less when you don't</div></div><${Switch} id="t-split" label="Split targets" checked=${fs.split} onChange=${v => editF(f => { f.split = v; })} /></div></div>
      <${TRow} which="train" label=${fs.split ? 'Training days' : 'Every day'} />
      ${fs.split ? html`<${TRow} which="rest" label="Rest days" />` : null}
      <div class="grid2">
        <div class="field"><label for="t-fiber">Fiber (g)</label><input id="t-fiber" class="input num" inputmode="numeric" value=${fs.fiber} onChange=${e => editF(f => { f.fiber = parseInt(e.target.value) || 0; })} /></div>
        <div class="field"><label for="t-water">Water (ml)</label><input id="t-water" class="input num" inputmode="numeric" value=${fs.water} onChange=${e => editF(f => { f.water = parseInt(e.target.value) || 0; })} /></div>
      </div>

      <p class="tiny muted" style="margin:-4px 0 0">Set either to 0 to hide it on the Food page.</p>

      <div class="section-head"><span class="h-md">Meals</span><button class="link-btn" disabled=${fs.mealNames.length >= 8} onClick=${() => editF(f => { f.mealNames.push(`Meal ${f.mealNames.length + 1}`); })}>Add meal</button></div>
      <div class="list">${fs.mealNames.map((m, i) => html`<div class="row">
        <input class="input" aria-label=${'Meal ' + (i + 1) + ' name'} id=${'meal-' + i} value=${m} onChange=${e => { const nv = e.target.value.trim() || m; store.update(st => { st.foodLog.forEach(x => { if (x.meal === m) x.meal = nv; }); st.food.mealNames[i] = nv; }); }} />
        <button class="icon-btn" aria-label="Move up" disabled=${i === 0} onClick=${() => editF(f => { const [x] = f.mealNames.splice(i, 1); f.mealNames.splice(i - 1, 0, x); })}><${Icon} name="up" size=${20} /></button>
        <button class="icon-btn" aria-label=${'Remove ' + m} disabled=${fs.mealNames.length <= 1} onClick=${() => editF(f => { f.mealNames.splice(i, 1); })}><${Icon} name="minus" size=${20} /></button>
      </div>`)}</div>
      <p class="tiny muted" style="margin:0">Food logged under a removed meal shows up in your last meal.</p>
    </div>`;
}
