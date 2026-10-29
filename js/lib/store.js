// Local-first store. Everything lives on the device in IndexedDB.
// Cloud backup (Firebase) plugs in later through onChange().

import { EXERCISES } from './exercises.js';
import { defaultDashboard, defaultFoodDashboard } from './dash-defaults.js';

const DB_NAME = 'tally';
const STORE = 'kv';
const KEY = 'state';
export const SCHEMA = 3;

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function defaultFoodSettings() {
  return {
    mealNames: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'],
    // Targets per day type. Training days use `train`, the rest use `rest`.
    train: { kcal: 2500, p: 180, c: 280, f: 70 },
    rest: { kcal: 2200, p: 180, c: 200, f: 70 },
    split: true,             // separate training and rest day targets
    trainDays: [1, 2, 3, 4, 5, 6], // planned training weekdays (0 = Sunday)
    fiber: 30,               // grams, 0 to hide
    water: 3000,             // ml, 0 to hide
    profile: { sex: '', age: null, heightCm: null, activity: 'active', goal: 'cut' },
    setup: false,            // has the user set targets yet
  };
}

export function freshState() {
  return {
    schema: SCHEMA,
    settings: {
      name: '',
      unit: 'lb',            // 'lb' | 'kg'
      distUnit: 'km',        // 'km' | 'mi'
      theme: 'dark',         // 'dark' | 'light' | 'system'
      accent: 'ice',
      restDefault: 120,      // seconds
      weeklyGoal: 5,         // sessions per week
      weekStart: 1,          // 0 = Sunday, 1 = Monday
      autoRest: true,
      keepAwake: true,
      onboarded: false,
      sample: false,
      mode: 'gym',           // 'gym' | 'food' — tap Tally in the top bar to switch
      barKg: null,           // plate calculator bar weight (null = 45 lb / 20 kg)
      plates: null,          // available plates in the user's unit (null = standard set)
      suggest: true,         // weight suggestions while logging
      rir: false,            // ask "reps left" after each working set
    },
    schedule: {},            // weekday (0 = Sunday) -> routine id
    measurements: [],        // { date, key, value } — lengths in cm, body fat in %
    photos: [],              // progress photos: { id, date, pose } — images stay in their own on-device database
    food: defaultFoodSettings(),
    foods: [],               // saved/custom foods (nutrition per 100 g and/or per serving)
    meals: [],               // saved meals: { id, name, items: [log-style items] }
    foodLog: [],             // { id, date, meal, foodId, name, brand, qty, unit, kcal, p, c, f, fiber, sugar, sodium }
    water: {},               // { 'YYYY-MM-DD': ml }
    dashboard: defaultDashboard(),
    foodDashboard: defaultFoodDashboard(),
    exercises: EXERCISES.map(e => ({ ...e })),
    routines: [],
    workouts: [],
    bodyweight: [],          // { date: 'YYYY-MM-DD', kg }
    active: null,            // workout in progress
    updatedAt: Date.now(),
  };
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function idbSet(key, val) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let state = null;
let memoryOnly = false;
const listeners = new Set();
let saveTimer = null;

export async function load() {
  try {
    const saved = await idbGet(KEY);
    state = saved ? migrate(saved) : freshState();
  } catch (e) {
    memoryOnly = true;
    state = freshState();
  }
  // Ask the browser not to clear our storage under pressure.
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
  applyLook();
  return state;
}

function migrate(s) {
  const base = freshState();
  const out = { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) } };
  out.food = { ...base.food, ...(s.food || {}), profile: { ...base.food.profile, ...((s.food || {}).profile || {}) } };
  // Add any built-in exercises introduced in newer versions.
  const have = new Set(out.exercises.map(e => e.id));
  for (const e of EXERCISES) if (!have.has(e.id)) out.exercises.push({ ...e });
  // v2: food arrived, so put the food and combined cards on existing dashboards.
  if ((s.schema || 1) < 2) {
    for (const type of ['score', 'calories', 'protein']) if (!out.dashboard.some(d => d.type === type)) out.dashboard.push({ id: uid(), type, opts: {} });
  }
  // v3: Gym and Food modes. Food and combined cards move to the Food dashboard.
  if ((s.schema || 1) < 3) {
    const food = new Set(['calories', 'protein', 'macroSplit', 'trainRest', 'score', 'tdee', 'deficit', 'proteinProgress']);
    if (!s.foodDashboard) out.foodDashboard = defaultFoodDashboard();
    out.dashboard = out.dashboard.filter(d => !food.has(d.type));
  }
  out.schema = SCHEMA;
  return out;
}

export const get = () => state;
export const isMemoryOnly = () => memoryOnly;

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// Mutate through update(): fn receives a draft (the state itself) and edits it.
export function update(fn) {
  fn(state);
  state.updatedAt = Date.now();
  state = { ...state };
  listeners.forEach(l => l(state));
  scheduleSave();
}

function scheduleSave() {
  if (memoryOnly) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { idbSet(KEY, state).catch(() => {}); }, 250);
}

export function flush() {
  clearTimeout(saveTimer);
  if (!memoryOnly) return idbSet(KEY, state).catch(() => {});
}

export function replaceAll(next) {
  state = migrate(next);
  state.updatedAt = Date.now();
  applyLook();
  listeners.forEach(l => l(state));
  return flush();
}

export function applyLook() {
  const { theme, accent } = state.settings;
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme);
  root.setAttribute('data-accent', accent);
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0d1014' : '#f2f4f7');
  try { localStorage.setItem('tally.look', JSON.stringify({ theme, accent })); } catch (e) {}
}

window.addEventListener('pagehide', () => { flush(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
