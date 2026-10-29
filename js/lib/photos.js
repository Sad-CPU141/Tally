// Progress photos. The images live only on this phone, in their own IndexedDB database;
// state.photos keeps just { id, date, pose } so lists render instantly.
// They are not part of the JSON backup, and won't be uploaded when accounts arrive.

import { html, useState, useEffect } from '../vendor/preact-htm.js';
import * as store from './store.js';

const DB = 'tally-photos', STORE = 'photos';
export const POSES = [['front', 'Front'], ['side', 'Side'], ['back', 'Back']];

let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r && r.result);
    t.onerror = () => reject(t.error);
  });
}

// Shrink to a sensible size so hundreds of photos stay small (about 200–400 KB each).
async function resize(file, max, quality) {
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (e) {
    src = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = URL.createObjectURL(file); });
  }
  const w0 = src.width, h0 = src.height;
  const k = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas');
  c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return new Promise(resolve => c.toBlob(resolve, 'image/jpeg', quality));
}

export async function addPhoto(file, date, pose) {
  const [full, thumb] = await Promise.all([resize(file, 1600, 0.85), resize(file, 400, 0.8)]);
  const id = store.uid();
  await tx('readwrite', s => s.put({ full, thumb }, id));
  store.update(st => { (st.photos = st.photos || []).push({ id, date, pose }); });
  return id;
}

export async function deletePhoto(id) {
  try { await tx('readwrite', s => s.delete(id)); } catch (e) {}
  for (const k of ['full', 'thumb']) { const u = cache.get(id + k); if (u) URL.revokeObjectURL(u); cache.delete(id + k); }
  store.update(st => { st.photos = (st.photos || []).filter(p => p.id !== id); });
}

export async function clearPhotos() {
  try { await tx('readwrite', s => s.clear()); } catch (e) {}
  for (const u of cache.values()) URL.revokeObjectURL(u);
  cache.clear();
}

const cache = new Map();
async function urlFor(id, kind) {
  const k = id + kind;
  if (cache.has(k)) return cache.get(k);
  const rec = await tx('readonly', s => s.get(id));
  if (!rec || !rec[kind]) return null;
  const u = URL.createObjectURL(rec[kind]);
  cache.set(k, u);
  return u;
}

// <img> for a stored photo; shows a placeholder if it isn't on this phone (e.g. after restoring a backup).
export function PhotoImg({ id, kind = 'thumb', alt = '', cls = '' }) {
  const [url, setUrl] = useState(cache.get(id + kind) || null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let live = true;
    urlFor(id, kind).then(u => { if (!live) return; if (u) setUrl(u); else setMissing(true); }).catch(() => live && setMissing(true));
    return () => { live = false; };
  }, [id, kind]);
  if (missing) return html`<span class=${'ph-missing ' + cls}>Not on this phone</span>`;
  return url ? html`<img class=${cls} src=${url} alt=${alt} decoding="async" />` : html`<span class=${'ph-loading ' + cls}></span>`;
}

// Photos grouped by day, newest first: [{ date, items: [...] }]
export function byDate(state, pose) {
  const list = (state.photos || []).filter(p => !pose || p.pose === pose);
  const m = new Map();
  for (const p of list) { if (!m.has(p.date)) m.set(p.date, []); m.get(p.date).push(p); }
  const order = Object.fromEntries(POSES.map(([k], i) => [k, i]));
  return [...m.entries()].sort((a, b) => a[0] < b[0] ? 1 : -1).map(([date, items]) => ({ date, items: items.sort((a, b) => order[a.pose] - order[b.pose]) }));
}
