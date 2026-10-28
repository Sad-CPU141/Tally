// Food: nutrition math, daily totals, targets, the target calculator,
// Open Food Facts lookups, and food analytics used by the cards.

import { dayKey, fromKey, addDays, DAY, round } from './util.js';
import { weightTrend, finished } from './analytics.js';

export const NUTRIENTS = ['kcal', 'p', 'c', 'f', 'fiber', 'sugar', 'sodium'];
export const MACRO = { p: 'Protein', c: 'Carbs', f: 'Fat' };
export const KCAL_PER = { p: 4, c: 4, f: 9 };
const zero = () => ({ kcal: 0, p: 0, c: 0, f: 0, fiber: 0, sugar: 0, sodium: 0 });

// Nutrition for a quantity of a food. unit: 'g' | 'serving'
export function nutritionFor(food, qty, unit) {
  const out = zero();
  if (!food || !qty) return out;
  let base = null, mult = 0;
  if (unit === 'g' && food.per100) { base = food.per100; mult = qty / 100; }
  else if (unit === 'serving' && food.perServing) { base = food.perServing; mult = qty; }
  else if (unit === 'serving' && food.per100 && food.serving && food.serving.g) { base = food.per100; mult = (food.serving.g * qty) / 100; }
  else if (food.per100) { base = food.per100; mult = qty / 100; }
  if (!base) return out;
  for (const k of NUTRIENTS) out[k] = (base[k] || 0) * mult;
  return out;
}

export function entryFrom(food, qty, unit, meal, date) {
  const n = nutritionFor(food, qty, unit);
  const e = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), date, meal, foodId: food.id || null, name: food.name, brand: food.brand || '', qty, unit };
  for (const k of NUTRIENTS) e[k] = round(n[k], 2);
  return e;
}

export function sum(entries) {
  const t = zero();
  for (const e of entries) for (const k of NUTRIENTS) t[k] += e[k] || 0;
  return t;
}

export const dayEntries = (state, key) => state.foodLog.filter(e => e.date === key);
export const dayTotals = (state, key) => sum(dayEntries(state, key));

export function qtyLabel(e, food) {
  if (e.unit === 'g') return `${round(e.qty, 1)} g`;
  const label = food && food.serving && food.serving.label ? food.serving.label : 'serving';
  return e.qty === 1 ? label : `${round(e.qty, 2)} × ${label}`;
}

// ---------- day type and targets ----------
export function isTrainingDay(state, key) {
  const logged = finished(state).some(w => dayKey(w.start) === key);
  if (logged) return true;
  const today = dayKey(Date.now());
  if (key < today) return false;              // a past day with no workout was a rest day
  return state.food.trainDays.includes(fromKey(key).getDay());
}

export function targetFor(state, key) {
  const f = state.food;
  if (!f.split) return { ...f.train, type: 'day' };
  return isTrainingDay(state, key) ? { ...f.train, type: 'train' } : { ...f.rest, type: 'rest' };
}

// Mifflin–St Jeor estimate, then split into training and rest days.
export const ACTIVITY = [
  ['sedentary', 'Desk job, little exercise', 1.2],
  ['light', 'Training 1–3 days a week', 1.375],
  ['moderate', 'Training 3–5 days a week', 1.55],
  ['active', 'Hard training 6–7 days a week', 1.725],
  ['very', 'Hard training plus a physical job', 1.9],
];
export const GOALS = [
  ['cut', 'Lose fat', -0.2, 'About 0.5–1% of bodyweight a week'],
  ['slowcut', 'Lose fat slowly', -0.1, 'Easier to keep muscle and energy'],
  ['maintain', 'Maintain', 0, 'Hold your weight steady'],
  ['gain', 'Lean gain', 0.1, 'Slow, mostly muscle'],
];

export function calculate({ sex, age, heightCm, kg, activity, goal, trainDays }) {
  if (!sex || !age || !heightCm || !kg) return null;
  const bmr = 10 * kg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
  const mult = (ACTIVITY.find(a => a[0] === activity) || ACTIVITY[3])[2];
  const tdee = bmr * mult;
  const adj = (GOALS.find(g => g[0] === goal) || GOALS[0])[2];
  const avg = tdee * (1 + adj);
  const protein = kg * (goal === 'cut' || goal === 'slowcut' ? 2.2 : 1.8);
  const t = Math.max(1, Math.min(6, trainDays.length)), r = 7 - t;
  // Put a little more food on training days, keeping the weekly average the same.
  const d = Math.min(avg * 0.1, (avg * 0.15 * r) / t);
  const make = kcal => {
    const fat = (kcal * 0.25) / 9;
    const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
    return { kcal: Math.round(kcal / 10) * 10, p: Math.round(protein), c: Math.round(carbs), f: Math.round(fat) };
  };
  return { bmr, tdee, avg, train: make(avg + d), rest: make(avg - (d * t) / r) };
}

// ---------- Open Food Facts ----------
const OFF = 'https://world.openfoodfacts.org';
const FIELDS = 'code,product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,quantity';

function fromOFF(p) {
  if (!p) return null;
  const n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] != null ? n['energy_100g'] / 4.184 : null);
  if (kcal == null && n.proteins_100g == null) return null;
  const per100 = {
    kcal: +(kcal || 0), p: +(n.proteins_100g || 0), c: +(n.carbohydrates_100g || 0), f: +(n.fat_100g || 0),
    fiber: +(n.fiber_100g || 0), sugar: +(n.sugars_100g || 0), sodium: +((n.sodium_100g || 0) * 1000),
  };
  const sq = parseFloat(p.serving_quantity);
  return {
    id: 'off-' + p.code,
    barcode: p.code,
    name: (p.product_name_en || p.product_name || 'Unnamed product').trim(),
    brand: (p.brands || '').split(',')[0].trim(),
    per100,
    serving: sq > 0 ? { label: p.serving_size || `${sq} g`, g: sq } : null,
    source: 'off',
  };
}

async function getJSON(url, ms = 9000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

export async function lookupBarcode(code) {
  const j = await getJSON(`${OFF}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  return j && j.status === 1 ? fromOFF({ ...j.product, code: j.code || code }) : null;
}

// Canadian products first (what's on the shelves here), then worldwide to fill gaps.
export async function searchFoods(q) {
  const base = `${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(q).replace(/%20/g, '+')}&json=1&page_size=24&fields=${FIELDS}`;
  const ca = await getJSON(base + '&tagtype_0=countries&tag_contains_0=contains&tag_0=canada', 12000);
  let list = (ca.products || []).map(fromOFF).filter(Boolean);
  if (list.length < 8) {
    try {
      const world = await getJSON(base, 12000);
      const seen = new Set(list.map(f => f.id));
      list = list.concat((world.products || []).map(fromOFF).filter(f => f && !seen.has(f.id)));
    } catch (e) {}
  }
  return list.slice(0, 30);
}

// ---------- food analytics ----------
// Days (oldest first) going back n days, including today.
export function days(state, n) {
  const out = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const key = dayKey(addDays(today, -i));
    const ent = dayEntries(state, key);
    out.push({ key, date: +fromKey(key), logged: ent.length > 0, totals: sum(ent), target: targetFor(state, key), train: isTrainingDay(state, key) });
  }
  return out;
}

// Logged days in the window, excluding today (it's usually incomplete).
export const completeDays = (state, n) => days(state, n + 1).slice(0, -1).filter(d => d.logged);

export function proteinHits(state, n = 14) {
  const ds = completeDays(state, n);
  const hit = ds.filter(d => d.totals.p >= d.target.p * 0.95).length;
  return { hit, of: ds.length, days: ds };
}

// Adaptive energy expenditure: what you ate, corrected by how your trend weight moved.
// ~7700 kcal per kg of bodyweight change.
export function adaptiveTDEE(state, window = 28) {
  const ds = completeDays(state, window);
  if (ds.length < 10) return { ready: false, logged: ds.length, need: 10 };
  const tr = weightTrend(state);
  const start = Date.now() - window * DAY;
  const inWin = tr.filter(p => p.date >= start);
  if (inWin.length < 4) return { ready: false, logged: ds.length, need: 10, weighIns: inWin.length };
  const first = inWin[0], last = inWin[inWin.length - 1];
  const spanDays = Math.max(7, (last.date - first.date) / DAY);
  const avgIntake = ds.reduce((a, d) => a + d.totals.kcal, 0) / ds.length;
  const dKg = last.trend - first.trend;
  const tdee = avgIntake - (dKg * 7700) / spanDays;
  return { ready: true, tdee, avgIntake, dKgPerWeek: dKg / spanDays * 7, logged: ds.length, window };
}
