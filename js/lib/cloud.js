// Accounts, backup and friends (Firebase, free Spark plan).
//
// - Nothing here loads until someone signs in, so Tally stays fast and fully offline without an account.
// - Backup: the whole app state (minus progress photos, which never leave the phone) is gzipped and saved
//   to backups/{uid} in parts under 1 MB each. It runs ~15 s after a change and when the app is closed.
// - A backup is never written until this phone has been matched with what's already in the cloud,
//   and sample or empty data never overwrites a real backup.
// - Friends: each person has a 6-letter friend code. Adding a code puts that person in your friends list.
//   The leaderboard shows you, the people you added, and anyone who added you.
// - Public profile (users/{uid}) holds only your name, code, friend list and weekly totals.

import * as store from './store.js';
import * as F from './food.js';
import { firebaseConfig } from './firebase-config.js';
import { finished, workoutStats, exMap, prEvents, streak } from './analytics.js';
import { dayKey, addDays, startOfWeek, startOfDay } from './util.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
const FLAG = 'tally.cloud';         // set while signed in, so the SDK loads on the next open
const DEVICE = 'tally.device';
const PART = 700000;                 // characters per backup part (Firestore's limit is 1 MiB per document)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MOCK = /[?&]mockcloud/.test(location.search); // automated tests only

const ls = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} },
};
function deviceId() {
  let d = ls.get(DEVICE);
  if (!d) { d = Math.random().toString(36).slice(2, 10); ls.set(DEVICE, d); }
  return d;
}

// ---------- status that the UI listens to ----------
const status = {
  phase: 'off',        // off | loading | in | error
  user: null,          // { uid, email, name }
  ready: false,        // matched with the cloud, so backups may run
  syncing: false,
  lastBackup: Number(ls.get('tally.lastBackup')) || 0,
  error: '',
  profile: null,       // users/{uid} doc
  paused: false,       // waiting for the person to pick which data to keep
};
const listeners = new Set();
export const cloudStatus = () => status;
export function onCloud(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function set(patch) { Object.assign(status, patch); listeners.forEach(f => f({ ...status })); }

// ---------- backend: real Firebase, or an in-browser fake for tests (?mockcloud) ----------
let B = null;
let bootPromise = null;

async function realBackend() {
  const [{ initializeApp }, A, S] = await Promise.all([
    import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js'),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.initializeAuth(app, { persistence: [A.indexedDBLocalPersistence, A.browserLocalPersistence], popupRedirectResolver: A.browserPopupRedirectResolver });
  const db = S.getFirestore(app);
  const ref = p => S.doc(db, p);
  const toUser = u => u && { uid: u.uid, email: u.email || '', name: u.displayName || '' };
  return {
    onAuth: fn => { A.getRedirectResult(auth).catch(() => {}); return A.onAuthStateChanged(auth, u => fn(toUser(u))); },
    async google() {
      const p = new A.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      try { await A.signInWithPopup(auth, p); }
      catch (e) {
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return A.signInWithRedirect(auth, p);
        throw e;
      }
    },
    emailIn: (e, p) => A.signInWithEmailAndPassword(auth, e, p),
    emailUp: async (e, p, name) => { const c = await A.createUserWithEmailAndPassword(auth, e, p); if (name) await A.updateProfile(c.user, { displayName: name }).catch(() => {}); },
    reset: e => A.sendPasswordResetEmail(auth, e),
    signOut: () => A.signOut(auth),
    deleteUser: () => auth.currentUser.delete(),
    get: async p => { const s = await S.getDoc(ref(p)); return s.exists() ? s.data() : null; },
    setDoc: (p, d, merge = true) => S.setDoc(ref(p), d, { merge }),
    createDoc: async (p, d) => S.setDoc(ref(p), d), // fails (rules) if it already exists for someone else
    del: p => S.deleteDoc(ref(p)),
    batch: async ops => {
      const b = S.writeBatch(db);
      for (const o of ops) o.del ? b.delete(ref(o.path)) : b.set(ref(o.path), o.data);
      await b.commit();
    },
    addFriend: (me, uid) => S.setDoc(ref('users/' + me), { friends: S.arrayUnion(uid) }, { merge: true }),
    removeFriend: (me, uid) => S.setDoc(ref('users/' + me), { friends: S.arrayRemove(uid) }, { merge: true }),
    whoAddedMe: async me => (await S.getDocs(S.query(S.collection(db, 'users'), S.where('friends', 'array-contains', me)))).docs.map(d => ({ uid: d.id, ...d.data() })),
  };
}

// A small stand-in that behaves like the real thing, kept in localStorage. Used only by automated tests.
function mockBackend() {
  const key = 'tally.mockdb';
  const load = () => { try { return JSON.parse(ls.get(key) || '{}'); } catch (e) { return {}; } };
  const save = db => ls.set(key, JSON.stringify(db));
  let cb = null;
  const userKey = 'tally.mockuser';
  const cur = () => { try { return JSON.parse(ls.get(userKey)); } catch (e) { return null; } };
  const login = u => { ls.set(userKey, JSON.stringify(u)); cb && cb(u); };
  const wait = () => new Promise(r => setTimeout(r, 30));
  return {
    onAuth: fn => { cb = fn; setTimeout(() => fn(cur()), 0); return () => {}; },
    google: async () => { await wait(); login({ uid: 'u_' + (window.MOCK_UID || 'me'), email: 'me@example.com', name: window.MOCK_NAME || 'Test User' }); },
    emailIn: async e => { await wait(); login({ uid: 'u_' + e.split('@')[0], email: e, name: '' }); },
    emailUp: async (e, p, name) => { await wait(); login({ uid: 'u_' + e.split('@')[0], email: e, name }); },
    reset: async () => {},
    signOut: async () => { ls.set(userKey, null); cb && cb(null); },
    deleteUser: async () => { ls.set(userKey, null); cb && cb(null); },
    get: async p => { await wait(); const v = load()[p]; return v ? JSON.parse(JSON.stringify(v)) : null; },
    setDoc: async (p, d, merge = true) => { const db = load(); db[p] = merge ? { ...(db[p] || {}), ...d } : d; save(db); },
    createDoc: async (p, d) => { const db = load(); if (db[p]) throw new Error('exists'); db[p] = d; save(db); },
    del: async p => { const db = load(); delete db[p]; save(db); },
    batch: async ops => { const db = load(); for (const o of ops) o.del ? delete db[o.path] : (db[o.path] = o.data); save(db); },
    addFriend: async (me, uid) => { const db = load(); const u = db['users/' + me] || {}; u.friends = [...new Set([...(u.friends || []), uid])]; db['users/' + me] = u; save(db); },
    removeFriend: async (me, uid) => { const db = load(); const u = db['users/' + me] || {}; u.friends = (u.friends || []).filter(x => x !== uid); db['users/' + me] = u; save(db); },
    whoAddedMe: async me => Object.entries(load()).filter(([k, v]) => k.startsWith('users/') && (v.friends || []).includes(me)).map(([k, v]) => ({ uid: k.slice(6), ...v })),
  };
}

function boot() {
  if (bootPromise) return bootPromise;
  set({ phase: 'loading', error: '' });
  bootPromise = (MOCK ? Promise.resolve(mockBackend()) : realBackend()).then(b => {
    B = b;
    B.onAuth(u => {
      if (u) { ls.set(FLAG, '1'); set({ phase: 'in', user: u }); afterSignIn(u); }
      else { set({ phase: 'off', user: null, ready: false, paused: false, profile: null }); }
    });
    return B;
  }).catch(e => {
    bootPromise = null;
    set({ phase: 'error', error: navigator.onLine ? "Couldn't reach the sign-in service. Try again in a moment." : "You're offline. Sign-in needs a connection." });
    throw e;
  });
  return bootPromise;
}

// Called once at startup: if you were signed in last time, reconnect quietly in the background.
export function startCloud() {
  if (ls.get(FLAG) || MOCK && ls.get('tally.mockuser')) boot().catch(() => {});
  const q = new URLSearchParams(location.search);
  const fc = q.get('friend');
  if (fc) {
    ls.set('tally.pendingFriend', fc.toUpperCase());
    q.delete('friend');
    try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) {}
    if (status.phase === 'in') afterSignInFriend();
    else toastFn && setTimeout(() => toastFn('Sign in on the Me tab to add your friend'), 600);
  }
}

// ---------- sign in / out ----------
const MSG = {
  'auth/invalid-credential': 'That email and password don\'t match.',
  'auth/wrong-password': 'That email and password don\'t match.',
  'auth/user-not-found': 'No account with that email. Tap Create account instead.',
  'auth/email-already-in-use': 'There\'s already an account with that email. Tap Sign in instead.',
  'auth/weak-password': 'Use at least 6 characters for the password.',
  'auth/invalid-email': 'That email doesn\'t look right.',
  'auth/popup-closed-by-user': 'Sign-in was closed before it finished.',
  'auth/cancelled-popup-request': 'Sign-in was closed before it finished.',
  'auth/network-request-failed': 'No connection. Check your signal and try again.',
  'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
  'auth/requires-recent-login': 'For safety, sign out and back in, then try again.',
};
export const authMessage = e => MSG[e && e.code] || (e && e.message ? e.message.replace(/^Firebase: /, '').replace(/ \(auth\/.*\)\.?$/, '') : 'Something went wrong. Try again.');

export async function signInGoogle() { const b = await boot(); return b.google(); }
export async function signInEmail(email, pw) { const b = await boot(); return b.emailIn(email.trim(), pw); }
export async function signUpEmail(email, pw, name) { const b = await boot(); return b.emailUp(email.trim(), pw, name); }
export async function resetPassword(email) { const b = await boot(); return b.reset(email.trim()); }

export async function signOutCloud() {
  if (!B) return;
  if (status.ready && dirty) await backupNow().catch(() => {});
  await B.signOut();
  ls.set(FLAG, null);
  set({ phase: 'off', user: null, ready: false, profile: null });
}

// Deletes your backup, profile, friend code and the account itself. Data on this phone stays.
export async function deleteAccount() {
  const u = status.user; if (!u || !B) return;
  const meta = await B.get('backups/' + u.uid);
  const ops = [{ path: 'backups/' + u.uid, del: true }];
  for (let i = 0; i < ((meta && meta.parts) || 0); i++) ops.push({ path: `backups/${u.uid}/parts/${i}`, del: true });
  if (status.profile && status.profile.code) ops.push({ path: 'codes/' + status.profile.code, del: true });
  ops.push({ path: 'users/' + u.uid, del: true });
  await B.batch(ops);
  await B.deleteUser();
  ls.set(FLAG, null);
  set({ phase: 'off', user: null, ready: false, profile: null });
}

// ---------- matching this phone with the cloud ----------
let resolveChoice = null;
// The UI registers how to ask "which data do you want to keep?"
let chooser = null;
export function setChooser(fn) { chooser = fn; }

export const hasRealData = st => !st.settings.sample && (st.workouts.length > 0 || st.foodLog.length > 0 || st.bodyweight.length > 0 || st.routines.length > 0 || st.measurements.length > 0);
const summary = st => ({ workouts: st.workouts.filter(w => w.end).length, foodDays: new Set(st.foodLog.map(e => e.date)).size, weighIns: st.bodyweight.length });

async function afterSignIn(u) {
  try {
    await ensureProfile(u);
    const meta = await B.get('backups/' + u.uid);
    const local = store.get();
    const mine = deviceId();
    // "In step" = the cloud copy was written by this phone, or is the one this phone last restored.
    const inStep = meta && (meta.device === mine || String(meta.savedAt) === ls.get('tally.syncedAt'));
    if (!meta) {
      set({ ready: true });
      if (hasRealData(local)) await backupNow();
    } else if (inStep && meta.updatedAt <= local.updatedAt) {
      set({ ready: true });
      if (meta.updatedAt < local.updatedAt) await backupNow();
    } else if (!hasRealData(local)) {
      // New or empty phone: offer the backup.
      const pick = chooser ? await chooser({ kind: 'restore', cloud: meta }) : 'cloud';
      if (pick === 'skip') return paused();
      if (pick === 'cloud') await restore(u.uid, meta);
      set({ ready: true });
      if (pick !== 'cloud' && hasRealData(store.get())) await backupNow();
    } else if (inStep) {
      // Same phone, cloud is somehow newer (e.g. restored elsewhere and back): keep the newer one.
      await restore(u.uid, meta);
      set({ ready: true });
    } else {
      // Both have data: ask.
      const pick = chooser ? await chooser({ kind: 'conflict', cloud: meta, local: summary(local) }) : 'local';
      if (pick === 'skip') return paused();
      if (pick === 'cloud') await restore(u.uid, meta);
      set({ ready: true });
      if (pick === 'local') await backupNow();
    }
    afterSignInFriend();
  } catch (e) {
    console.warn('cloud', e);
    set({ error: navigator.onLine ? "Couldn't reach your backup. It'll try again next time." : "You're offline. Backup will resume when you're back online." });
  }
}

function afterSignInFriend() {
  const pf = ls.get('tally.pendingFriend');
  if (!pf || !status.profile) return;
  ls.set('tally.pendingFriend', null);
  addFriendByCode(pf).then(n => n && toastFn && toastFn(`Added ${n} as a friend`)).catch(e => toastFn && toastFn(e.message, 3500));
}

function paused() { set({ ready: false, paused: true, error: 'Backup is paused until you choose which data to keep.' }); }
// Ask again (from the account card) after "Decide later".
export function resync() { if (status.user) { set({ paused: false, error: '' }); return afterSignIn(status.user); } }

let toastFn = null;
export function setToast(fn) { toastFn = fn; }

function newCode() { let c = ''; const a = new Uint32Array(6); crypto.getRandomValues(a); for (const n of a) c += CODE_CHARS[n % CODE_CHARS.length]; return c; }

async function ensureProfile(u) {
  let p = await B.get('users/' + u.uid);
  if (!p || !p.code) {
    let code = null;
    for (let i = 0; i < 5 && !code; i++) {
      const c = newCode();
      try { await B.createDoc('codes/' + c, { uid: u.uid }); code = c; } catch (e) { /* taken, try another */ }
    }
    p = { ...(p || {}), code, friends: (p && p.friends) || [], name: displayName(u), updatedAt: Date.now() };
    await B.setDoc('users/' + u.uid, p);
  }
  set({ profile: p });
  return p;
}

const displayName = u => (store.get().settings.name || (u && u.name) || (u && u.email ? u.email.split('@')[0] : '') || 'Tally user').trim().slice(0, 40);

// ---------- backup ----------
const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => { const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };

async function pack(obj) {
  const json = JSON.stringify(obj);
  if (typeof CompressionStream === 'undefined') return { enc: 'json', s: json };
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
  return { enc: 'gz64', s: b64(new Uint8Array(await new Response(stream).arrayBuffer())) };
}
async function unpack(enc, s) {
  if (enc === 'json') return JSON.parse(s);
  const stream = new Blob([unb64(s)]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}

let dirty = false, timer = null, running = null;

export async function backupNow() {
  const u = status.user;
  if (!B || !u || !status.ready) return;
  const st = store.get();
  if (!hasRealData(st)) { dirty = false; await publishStats(); return; }
  if (running) { dirty = true; return running; }
  dirty = false;
  set({ syncing: true });
  running = (async () => {
    const { enc, s } = await pack({ ...st, active: st.active });
    const parts = Math.ceil(s.length / PART) || 1;
    const old = await B.get('backups/' + u.uid);
    const ops = [];
    for (let i = 0; i < parts; i++) ops.push({ path: `backups/${u.uid}/parts/${i}`, data: { d: s.slice(i * PART, (i + 1) * PART) } });
    for (let i = parts; i < ((old && old.parts) || 0); i++) ops.push({ path: `backups/${u.uid}/parts/${i}`, del: true });
    const now = Date.now();
    ops.push({ path: 'backups/' + u.uid, data: { v: 1, enc, parts, chars: s.length, updatedAt: st.updatedAt, savedAt: now, device: deviceId(), counts: summary(st) } });
    await B.batch(ops);
    ls.set('tally.syncedAt', String(now));
    ls.set('tally.lastBackup', String(now));
    set({ lastBackup: now, error: '' });
    await publishStats();
  })().catch(e => {
    console.warn('backup', e);
    dirty = true;
    set({ error: navigator.onLine ? "Last backup didn't go through. It'll try again." : "You're offline. Backup will resume when you're back online." });
  }).finally(() => { running = null; set({ syncing: false }); });
  return running;
}

async function restore(uid, meta) {
  const chunks = [];
  for (let i = 0; i < meta.parts; i++) { const p = await B.get(`backups/${uid}/parts/${i}`); if (!p) throw new Error('Backup is incomplete'); chunks.push(p.d); }
  const data = await unpack(meta.enc, chunks.join(''));
  data.settings = { ...data.settings, onboarded: true };
  await store.replaceAll(data);
  ls.set('tally.syncedAt', String(meta.savedAt));
  toastFn && toastFn('Backup restored');
}

store.subscribe(() => {
  if (!status.ready) return;
  dirty = true;
  clearTimeout(timer);
  timer = setTimeout(() => backupNow(), 15000);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && dirty && status.ready) { clearTimeout(timer); backupNow(); }
});
window.addEventListener('online', () => { if (dirty && status.ready) backupNow(); });

// ---------- leaderboard stats ----------
// Weeks run Monday to Sunday for everyone so the boards are fair.
export const weekKey = (d = new Date()) => dayKey(startOfWeek(d, 1));
export const monthKey = (d = new Date()) => dayKey(d).slice(0, 7);

function weekTotals(st, start) {
  const end = addDays(start, 7);
  const exm = exMap(st);
  let n = 0, sets = 0, vol = 0, sec = 0;
  for (const w of finished(st)) {
    if (w.start < +start || w.start >= +end) continue;
    const s = workoutStats(w, exm);
    n++; sets += s.sets; vol += s.volume; sec += s.duration;
  }
  let pd = 0, fd = 0;
  const today = startOfDay(new Date());
  for (let d = new Date(start); d < end && d <= today; d = addDays(d, 1)) {
    const k = dayKey(d);
    const ent = F.dayEntries(st, k);
    if (!ent.length) continue;
    fd++;
    if (F.sum(ent).p >= F.targetFor(st, k).p * 0.95) pd++;
  }
  return { n, sets, vol: Math.round(vol), min: Math.round(sec / 60), pd, fd };
}

export function myStats(st = store.get()) {
  const start = startOfWeek(new Date(), 1);
  const m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
  const prs = new Set(prEvents(st).filter(e => e.date >= +m0).map(e => e.workoutId + e.exId)).size;
  return {
    wk: weekKey(), mo: monthKey(),
    w: weekTotals(st, start), pw: weekTotals(st, addDays(start, -7)),
    streak: streak(st), goal: st.settings.weeklyGoal, prm: prs,
    total: finished(st).length,
  };
}

let lastPublished = '';
export async function publishStats(force = false) {
  const u = status.user; if (!B || !u) return;
  const st = store.get();
  const stats = st.settings.sample ? null : myStats(st);
  const doc = { name: displayName(u), stats };
  const sig = JSON.stringify(doc);
  if (!force && sig === lastPublished) return;
  await B.setDoc('users/' + u.uid, { ...doc, updatedAt: Date.now() });
  lastPublished = sig;
  set({ profile: { ...(status.profile || {}), ...doc } });
}

// ---------- friends ----------
export async function addFriendByCode(raw) {
  const u = status.user; if (!B || !u) throw new Error('Sign in first');
  const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 6) throw new Error('Friend codes are 6 letters and numbers');
  if (status.profile && code === status.profile.code) throw new Error("That's your own code");
  const c = await B.get('codes/' + code);
  if (!c) throw new Error('No one has that code. Check it and try again');
  await B.addFriend(u.uid, c.uid);
  const p = await B.get('users/' + c.uid);
  set({ profile: { ...status.profile, friends: [...new Set([...((status.profile || {}).friends || []), c.uid])] } });
  return (p && p.name) || 'your friend';
}

export async function removeFriend(uid) {
  const u = status.user; if (!B || !u) return;
  await B.removeFriend(u.uid, uid);
  set({ profile: { ...status.profile, friends: ((status.profile || {}).friends || []).filter(x => x !== uid) } });
}

// Everyone on your board: you, people you added, and people who added you.
export async function loadBoard() {
  const u = status.user; if (!B || !u) return [];
  await publishStats(true).catch(() => {});
  const me = await B.get('users/' + u.uid);
  if (me) set({ profile: me });
  const added = (me && me.friends) || [];
  const [mine, theirs] = await Promise.all([
    Promise.all(added.map(id => B.get('users/' + id).then(p => p && { uid: id, ...p, iAdded: true }).catch(() => null))),
    B.whoAddedMe(u.uid).catch(() => []),
  ]);
  const map = new Map();
  map.set(u.uid, { uid: u.uid, ...(me || {}), name: displayName(u), stats: myStats(), me: true });
  for (const p of mine) if (p) map.set(p.uid, p);
  for (const p of theirs) if (!map.has(p.uid)) map.set(p.uid, { ...p, addedMe: true });
  return [...map.values()];
}
