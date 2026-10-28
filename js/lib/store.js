// Local-first store. Everything lives on the device in IndexedDB.
// Cloud backup (Firebase) plugs in later through onChange().

import { EXERCISES } from './exercises.js';
import { defaultDashboard } from './dash-defaults.js';

const DB_NAME = 'tally';
const STORE = 'kv';
const KEY = 'state';
export const SCHEMA = 1;

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

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
    },
    dashboard: defaultDashboard(),
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
  // Add any built-in exercises introduced in newer versions.
  const have = new Set(out.exercises.map(e => e.id));
  for (const e of EXERCISES) if (!have.has(e.id)) out.exercises.push({ ...e });
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
