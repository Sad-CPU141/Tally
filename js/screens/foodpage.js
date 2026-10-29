// One food, Fitia-style: pick the version (raw / grilled / size), the amount (grams, ounces or a
// portion), see calories, the macro split and full nutrition facts, then add it.

import { html, useState, useEffect } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import * as F from '../lib/food.js';
import * as DB from '../lib/fooddb.js';
import { Icon, nav, TopBar, toast } from '../lib/ui.js';
import { fmtNum, round } from '../lib/util.js';
import { addIngredient } from '../lib/recipes.js';

const kc = n => Math.round(n || 0).toLocaleString();
const g1 = n => fmtNum(n || 0, n >= 10 ? 0 : 1);

// Daily values used for % DV (FDA, 2,000 kcal).
const DV = { f: 78, satfat: 20, c: 275, fiber: 28, sugar: 50, p: 50, sodium: 2300 };

export function FoodPage({ state, params }) {
  const [ready, setReady] = useState(DB.allReady());
  useEffect(() => { if (!ready) DB.loadAll().then(() => setReady(true)).catch(() => toast('Couldn\'t load the food list')); }, []);
  if (!ready) return html`<${TopBar} title="" back=${true} /><div class="page"><div class="card empty small">Loading…</div></div>`;
  return html`<${Inner} state=${state} params=${params} />`;
}

function Inner({ state, params }) {
  const { date, meal, recipe } = params;
  const gen = params.g ? DB.genericByName(params.g) : params.usda ? DB.genericFor(params.usda) : null;
  const isRest = !!params.brand;
  const brand = isRest ? DB.brandById(params.brand) : null;
  const item = isRest && brand ? brand.items[params.item] : null;

  // Which version: a variant of an everyday food, or a size of a restaurant item.
  const initV = gen ? Math.max(0, params.usda ? gen.v.findIndex(v => v[1] === +params.usda) : (gen.last ?? 0)) : (params.size || 0);
  const [vi, setVi] = useState(initV);
  const food = isRest ? DB.restFood(params.brand, params.item, vi) : DB.usdaFood(gen ? gen.v[vi][1] : params.usda);
  const saved = food && state.foods.find(f => f.id === food.id);

  // Amount: grams, ounces, a USDA portion ("p0", "p1"…) or restaurant servings.
  const portions = (food && food.portions) || [];
  const defUnit = isRest ? 'serving' : saved && saved.lastUnit ? (saved.lastUnit === 'serving' && saved.lastPortion != null ? 'p' + saved.lastPortion : saved.lastUnit) : 'g';
  const [unit, setUnit] = useState(defUnit);
  const [qty, setQty] = useState(saved && saved.lastQty ? String(saved.lastQty) : isRest ? '1' : '100');
  const [micros, setMicros] = useState(null);
  useEffect(() => { if (!isRest && food) DB.loadMicros().then(() => setMicros(DB.microsFor(food.id.slice(5)))).catch(() => {}); }, [food && food.id]);

  if (!food) return html`<${TopBar} title="Food" back=${true} /><div class="page"><div class="card empty">Food not found.</div></div>`;

  const q = parseFloat(qty) || 0;
  const pIdx = unit[0] === 'p' ? +unit.slice(1) : -1;
  const logFood = pIdx >= 0 && portions[pIdx] ? { ...food, serving: { label: portions[pIdx][0], g: portions[pIdx][1] } } : food;
  const logUnit = pIdx >= 0 ? 'serving' : unit;
  const n = F.nutritionFor(logFood, q, logUnit);
  const grams = isRest ? null : logUnit === 'g' ? q : logUnit === 'oz' ? q * F.OZ : pIdx >= 0 ? q * portions[pIdx][1] : null;
  const satfat = isRest ? (food.perServing.satfat || 0) * q : micros && micros.satfat != null && grams != null ? micros.satfat * grams / 100 : null;
  const macroK = n.p * 4 + n.c * 4 + n.f * 9 || 1;
  const pct = k => Math.round(n[k] * F.KCAL_PER[k] / macroK * 100);

  const pickUnit = u => {
    if (u === unit) return;
    // Keep roughly the same amount when switching between grams and ounces.
    if (u === 'oz' && unit === 'g') setQty(String(round(q / F.OZ, 1)));
    else if (u === 'g' && unit === 'oz') setQty(String(Math.round(q * F.OZ)));
    else setQty(u === 'g' ? '100' : u === 'oz' ? '4' : '1');
    setUnit(u);
  };

  const add = () => {
    if (!q || q <= 0) { toast('Enter an amount'); return; }
    let keep = null;
    store.update(st => {
      let s = st.foods.find(f => f.id === food.id);
      if (!s) { s = { ...food }; st.foods.push(s); }
      if (pIdx >= 0) s.serving = logFood.serving;
      s.lastQty = q; s.lastUnit = logUnit; s.lastPortion = pIdx >= 0 ? pIdx : null;
      if (!recipe) { s.used = Date.now(); s.uses = (s.uses || 0) + 1; st.foodLog.push(F.entryFrom(s, q, logUnit, meal, date)); }
      keep = { ...s };
    });
    if (recipe) { addIngredient(recipe, keep, q, logUnit); toast('Added to recipe'); }
    else toast(`Added to ${String(meal).toLowerCase()}`);
    nav.back();
  };

  const versions = isRest ? item.s.map(s => s[0]) : gen ? gen.v.map(v => v[0] || 'Standard') : [];
  const title = isRest ? item.n : gen ? gen.n : food.name;
  const sub = isRest ? `${brand.name} · ${item.c}` : gen ? (gen.v[vi][0] ? '' : '') : (food.cat || '');

  return html`
    <${TopBar} title="" back=${true} />
    <div class="page fp">
      <div>
        <h1 class="h-xl" style="margin:0">${title}</h1>
        <div class="small muted" style="margin-top:4px">${isRest ? sub : `USDA FoodData Central${food.cat ? ' · ' + food.cat : ''}`}</div>
      </div>

      ${versions.length > 1 ? html`<div class="chips wrap" role="group" aria-label=${isRest ? 'Size' : 'Type'}>
        ${versions.map((v, i) => html`<button class="chip" aria-pressed=${vi === i} onClick=${() => { setVi(i); if (!isRest && unit[0] === 'p') { setUnit('g'); setQty('100'); } }}>${v}</button>`)}
      </div>` : null}

      <div class="fp-amount">
        <input class="input num" aria-label="Amount" inputmode="decimal" value=${qty} onInput=${e => setQty(e.target.value)} />
        <div class="chips wrap" role="group" aria-label="Unit">
          ${isRest ? html`<span class="small muted" style="align-self:center">${q === 1 ? 'serving' : 'servings'}${item.s.length > 1 ? ' · ' + food.serving.label : food.serving.label !== '1 serving' ? ' · ' + food.serving.label : ''}</span>` : html`
            <button class="chip" aria-pressed=${unit === 'g'} onClick=${() => pickUnit('g')}>grams</button>
            <button class="chip" aria-pressed=${unit === 'oz'} onClick=${() => pickUnit('oz')}>oz</button>
            ${portions.map((p, i) => html`<button class="chip" aria-pressed=${unit === 'p' + i} onClick=${() => pickUnit('p' + i)}>${p[0]} · ${Math.round(p[1])} g</button>`)}`}
        </div>
      </div>

      <div class="card fp-sum">
        <div class="hstack" style="justify-content:space-between;align-items:flex-end">
          <div><div class="big">${kc(n.kcal)}<small>kcal</small></div>${grams != null && logUnit !== 'g' ? html`<div class="tiny muted">${Math.round(grams)} g</div>` : null}</div>
          <div class="tiny muted" style="text-align:right">of calories from<br />protein · carbs · fat</div>
        </div>
        <div class="fp-bar" aria-hidden="true">
          <span class="p" style=${`flex:${n.p * 4}`}></span><span class="c" style=${`flex:${n.c * 4}`}></span><span class="f" style=${`flex:${n.f * 9}`}></span>
        </div>
        <div class="fp-macros">
          <div><i class="p"></i><b class="num">${g1(n.p)} g</b><span>Protein · ${pct('p')}%</span></div>
          <div><i class="c"></i><b class="num">${g1(n.c)} g</b><span>Carbs · ${pct('c')}%</span></div>
          <div><i class="f"></i><b class="num">${g1(n.f)} g</b><span>Fat · ${pct('f')}%</span></div>
        </div>
      </div>

      <div class="card fp-facts">
        <div class="h-md">Nutrition facts</div>
        <div class="tiny muted">${isRest ? `${q} × ${food.serving.label}` : grams != null ? `for ${Math.round(grams)} g` : ''} · % Daily Value</div>
        ${[['Calories', kc(n.kcal), null, true], ['Fat', g1(n.f) + ' g', n.f / DV.f, true], ['Saturated fat', satfat == null ? '–' : g1(satfat) + ' g', satfat == null ? null : satfat / DV.satfat], ['Carbohydrates', g1(n.c) + ' g', n.c / DV.c, true], ['Fibre', g1(n.fiber) + ' g', n.fiber / DV.fiber], ['Sugars', g1(n.sugar) + ' g', null], ['Protein', g1(n.p) + ' g', null, true], ['Sodium', Math.round(n.sodium) + ' mg', n.sodium / DV.sodium, true]]
          .map(([l, v, d, b]) => html`<div class=${'fp-row' + (b ? ' b' : '')}><span>${l}</span><span class="num">${v}</span><span class="num muted">${d == null ? '' : Math.round(d * 100) + '%'}</span></div>`)}
      </div>

      ${!isRest && micros && grams != null ? html`<div class="card fp-facts">
        <div class="h-md">Vitamins and minerals</div>
        ${Object.entries(DB.MICRO_INFO).filter(([k]) => micros[k] != null).map(([k, [name, u, dv]]) => {
          const v = micros[k] * grams / 100;
          const p = Math.round(v / dv * 100);
          return html`<div class="fp-row"><span>${name}</span><span class="num">${fmtNum(v, v >= 10 ? 0 : 1)} ${u}</span><span class="num muted">${p}%</span></div>`;
        })}
        <div class="tiny muted">USDA values. Daily Values from the FDA for adults.</div>
      </div>` : null}

      ${isRest ? html`<p class="tiny muted" style="margin:0">From ${brand.name}'s published nutrition information (${brand.asOf}). Values can vary by location.</p>` : null}
      <div style="height:64px"></div>
    </div>
    <div class="fp-add"><button class="btn primary block" onClick=${add}>${recipe ? 'Add to recipe' : `Add to ${meal}`} · ${kc(n.kcal)} kcal</button></div>`;
}

// A restaurant's menu, searchable.
export function BrandPage({ state, params }) {
  const [ready, setReady] = useState(DB.allReady());
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  useEffect(() => { if (!ready) DB.loadAll().then(() => setReady(true)); }, []);
  if (!ready) return html`<${TopBar} title="" back=${true} /><div class="page"><div class="card empty small">Loading…</div></div>`;
  const b = DB.brandById(params.brand);
  if (!b) return html`<${TopBar} title="Restaurant" back=${true} />`;
  const cats = ['All', ...new Set(b.items.map(i => i.c))];
  const ws = q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(DB.stem);
  const list = b.items.filter(it => (cat === 'All' || it.c === cat) && ws.every(t => it.ws.some(w => w.startsWith(t))));
  const groups = [];
  for (const it of list) { const g = groups[groups.length - 1]; if (g && g.c === it.c) g.items.push(it); else groups.push({ c: it.c, items: [it] }); }
  return html`
    <${TopBar} title=${b.name} back=${true} />
    <div class="page">
      <div class="hstack" style="position:relative">
        <span style="position:absolute;left:12px;color:var(--muted)"><${Icon} name="search" size=${18} /></span>
        <input class="input" style="padding-left:38px" placeholder=${`Search the ${b.name} menu`} value=${q} onInput=${e => setQ(e.target.value)} />
      </div>
      <div class="chips" role="group" aria-label="Menu section">${cats.map(c => html`<button class="chip" aria-pressed=${cat === c} onClick=${() => setCat(c)}>${c}</button>`)}</div>
      ${groups.map(g => html`
        <div class="section-head"><span class="h-md">${g.c}</span></div>
        <div class="list">${g.items.map(it => html`<button class="row" onClick=${() => nav.go('foodItem', { ...params, brand: b.id, item: it.i, size: 0 })}>
          <div class="grow" style="min-width:0"><div class="title">${it.n}</div><div class="sub">${it.s.length > 1 ? it.s.map(s => s[0].split(' (')[0]).join(' · ') : it.s[0][0]} · ${it.s[0][8]} g protein</div></div>
          <span class="num small muted">${it.s.length > 1 ? `${it.s[0][1]}–${it.s[it.s.length - 1][1]}` : it.s[0][1]} kcal</span>
        </button>`)}</div>`)}
      ${!list.length ? html`<div class="card empty small">Nothing on the menu matches "${q}".</div>` : null}
      <p class="tiny muted" style="margin:0">From ${b.name}'s published nutrition information, ${b.asOf}.</p>
    </div>`;
}
