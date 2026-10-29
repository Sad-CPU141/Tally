// Recipes: a food built from ingredients. It's saved in state.foods like any other food,
// so it shows up in search, Recent and My foods, logged by portion (or by grams if you
// weigh the finished dish).

import * as store from './store.js';
import { NUTRIENTS, nutritionFor } from './food.js';
import { round } from './util.js';

export const isRecipe = f => f && f.source === 'recipe';

export function recipeTotals(r) {
  const t = Object.fromEntries(NUTRIENTS.map(k => [k, 0]));
  for (const ing of (r.recipe && r.recipe.items) || []) {
    const n = nutritionFor(ing.food, ing.qty, ing.unit);
    for (const k of NUTRIENTS) t[k] += n[k];
  }
  return t;
}

// Refresh the per-portion (and per-100 g) nutrition after any change.
export function recompute(r) {
  const t = recipeTotals(r);
  const portions = Math.max(1, r.recipe.portions || 1);
  const cooked = r.recipe.cookedG || null;
  r.perServing = Object.fromEntries(NUTRIENTS.map(k => [k, round(t[k] / portions, 3)]));
  r.serving = { label: '1 portion', g: cooked ? round(cooked / portions, 1) : null };
  r.per100 = cooked ? Object.fromEntries(NUTRIENTS.map(k => [k, round(t[k] * 100 / cooked, 3)])) : null;
  return r;
}

const snapshot = f => ({ name: f.name, brand: f.brand || '', per100: f.per100 || null, perServing: f.perServing || null, serving: f.serving || null });

export function newRecipe(name = 'New recipe') {
  const id = 'r-' + store.uid();
  store.update(st => { st.foods.push(recompute({ id, name, brand: 'Recipe', source: 'recipe', recipe: { portions: 4, cookedG: null, items: [] } })); });
  return id;
}

export function editRecipe(id, fn) {
  store.update(st => { const r = st.foods.find(f => f.id === id); if (r) { fn(r, st); recompute(r); } });
}

export function addIngredient(id, food, qty, unit) {
  editRecipe(id, r => { r.recipe.items.push({ id: store.uid(), foodId: food.id || null, food: snapshot(food), qty, unit }); });
}

// A logged entry (e.g. from a saved meal) as an ingredient: its nutrition is already absolute.
export function addEntryAsIngredient(id, e) {
  const per = Object.fromEntries(NUTRIENTS.map(k => [k, e[k] || 0]));
  editRecipe(id, r => { r.recipe.items.push({ id: store.uid(), foodId: null, food: { name: e.name, brand: e.brand || '', perServing: per, per100: null, serving: { label: 'as logged' } }, qty: 1, unit: 'serving' }); });
}
