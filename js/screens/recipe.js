// Recipe editor: ingredients, portions and optional cooked weight → nutrition per portion.

import { html, useState } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import * as F from '../lib/food.js';
import { Icon, nav, TopBar, openSheet, closeSheet, SheetHead, confirmSheet, toast } from '../lib/ui.js';
import { editRecipe, recipeTotals } from '../lib/recipes.js';
import { fmtNum, round, todayKey } from '../lib/util.js';

const kc = n => Math.round(n || 0).toLocaleString();
const g = n => fmtNum(n || 0, 0);

function ingredientSheet(rid, ing) {
  function Body() {
    const [qty, setQty] = useState(String(ing.qty));
    const n = F.nutritionFor(ing.food, parseFloat(qty) || 0, ing.unit);
    const label = ing.unit === 'g' ? 'grams' : (ing.food.serving && ing.food.serving.label) || 'servings';
    return html`
      <${SheetHead} title=${ing.food.name} />
      <div class="field"><label for="ing-q">Amount (${label})</label><input id="ing-q" class="input num" style="font-size:20px;text-align:center" inputmode="decimal" value=${qty} onInput=${e => setQty(e.target.value)} /></div>
      <div class="small muted">${kc(n.kcal)} kcal · ${g(n.p)} g protein · ${g(n.c)} g carbs · ${g(n.f)} g fat</div>
      <div class="grid2">
        <button class="btn danger" onClick=${() => { editRecipe(rid, r => { r.recipe.items = r.recipe.items.filter(x => x.id !== ing.id); }); closeSheet(); }}>Remove</button>
        <button class="btn primary" onClick=${() => { const q = parseFloat(qty); if (!q || q <= 0) { toast('Enter an amount'); return; } editRecipe(rid, r => { const x = r.recipe.items.find(y => y.id === ing.id); if (x) x.qty = q; }); closeSheet(); }}>Save</button>
      </div>`;
  }
  openSheet(() => html`<${Body} />`);
}

export function Recipe({ state, params }) {
  const r = state.foods.find(f => f.id === params.id);
  if (!r || !r.recipe) return html`<${TopBar} title="Recipe" back=${true} /><div class="page"><div class="card empty">This recipe was deleted.</div></div>`;
  const rc = r.recipe;
  const t = recipeTotals(r);
  const per = r.perServing;
  const ed = fn => editRecipe(r.id, fn);
  const qtyText = ing => ing.unit === 'g' ? `${fmtNum(ing.qty, 0)} g` : ing.qty === 1 ? ((ing.food.serving && ing.food.serving.label) || '1 serving') : `${fmtNum(ing.qty, 2)} × ${(ing.food.serving && ing.food.serving.label) || 'serving'}`;
  return html`
    <${TopBar} title=${r.name || 'Recipe'} back=${true} right=${html`<button class="btn sm primary" onClick=${() => nav.back()}>Done</button>`} />
    <div class="page">
      <div class="field"><label for="rc-name">Recipe name</label>
        <input id="rc-name" class="input" value=${r.name} placeholder="Chicken and rice" onInput=${e => ed(x => { x.name = e.target.value; })} /></div>

      <div class="card stack" style="gap:12px">
        <div class="hstack" style="justify-content:space-between;align-items:flex-end">
          <div><span class="eyebrow">Per portion</span><div class="big">${kc(per.kcal)}<small>kcal</small></div></div>
          <div class="small muted" style="text-align:right">Whole recipe<br /><span class="num text-2">${kc(t.kcal)} kcal</span></div>
        </div>
        <div class="summary-grid" style="grid-template-columns:repeat(3,1fr)">
          <div class="stat"><span class="eyebrow">Protein</span><span class="mid">${g(per.p)} g</span></div>
          <div class="stat"><span class="eyebrow">Carbs</span><span class="mid">${g(per.c)} g</span></div>
          <div class="stat"><span class="eyebrow">Fat</span><span class="mid">${g(per.f)} g</span></div>
        </div>
      </div>

      <div class="grid2">
        <div class="field"><label>Portions</label>
          <div class="hstack" style="gap:4px;background:var(--surface-2);border-radius:12px;padding:3px">
            <button class="icon-btn" aria-label="Fewer portions" onClick=${() => ed(x => { x.recipe.portions = Math.max(1, (x.recipe.portions || 1) - 1); })}><${Icon} name="minus" size=${18} /></button>
            <span class="num grow" style="text-align:center;font-weight:650;font-size:18px">${rc.portions}</span>
            <button class="icon-btn" aria-label="More portions" onClick=${() => ed(x => { x.recipe.portions = Math.min(50, (x.recipe.portions || 1) + 1); })}><${Icon} name="plus" size=${18} /></button>
          </div></div>
        <div class="field"><label for="rc-cooked">Cooked weight (g)</label>
          <input id="rc-cooked" class="input num" inputmode="decimal" placeholder="Optional" value=${rc.cookedG || ''} onInput=${e => ed(x => { const v = parseFloat(e.target.value); x.recipe.cookedG = v > 0 ? v : null; })} /></div>
      </div>
      <p class="tiny muted" style="margin:-4px 0 0">Weigh the whole dish once it's cooked and you can log it by grams, not just portions${rc.cookedG ? ` (${fmtNum(rc.cookedG / rc.portions, 0)} g a portion)` : ''}.</p>

      <div class="section-head"><span class="h-md">Ingredients</span><span class="small muted">${rc.items.length}</span></div>
      ${rc.items.length ? html`<div class="list">${rc.items.map(ing => {
        const n = F.nutritionFor(ing.food, ing.qty, ing.unit);
        return html`<button class="row" onClick=${() => ingredientSheet(r.id, ing)}>
          <div class="grow"><div class="title">${ing.food.name}</div><div class="sub">${qtyText(ing)}${ing.food.brand && ing.food.brand !== 'Recipe' ? ' · ' + ing.food.brand : ''}</div></div>
          <span class="num small muted">${kc(n.kcal)} kcal</span>
        </button>`;
      })}</div>` : html`<div class="card empty small">Add everything that goes in, using raw weights where you can.</div>`}
      <button class="btn block" onClick=${() => nav.go('addFood', { recipe: r.id, date: todayKey(), meal: 'Recipe' })}><${Icon} name="plus" size=${18} /> Add ingredient</button>
      <button class="btn ghost danger block" onClick=${() => confirmSheet({ title: `Delete ${r.name}?`, body: 'Portions you already logged stay in your diary.', confirm: 'Delete', onConfirm: () => { store.update(st => { st.foods = st.foods.filter(f => f.id !== r.id); }); nav.back(); toast('Recipe deleted'); } })}>Delete recipe</button>
    </div>`;
}
