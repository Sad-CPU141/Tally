// Account (sign in, backup) and the friends leaderboard.

import { html, useState, useEffect } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import { Icon, TopBar, Seg, openSheet, closeSheet, SheetHead, confirmSheet, toast, nav } from '../lib/ui.js';
import { fmtNum, fmtDateY, toUnit } from '../lib/util.js';
import * as C from '../lib/cloud.js';

export function useCloud() {
  const [s, setS] = useState(C.cloudStatus());
  useEffect(() => C.onCloud(setS), []);
  return s;
}

const ago = t => {
  if (!t) return 'not yet';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return fmtDateY(t);
};
const hasData = () => C.hasRealData(store.get());
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const countsLine = c => c ? [plural(c.workouts || 0, 'workout'), plural(c.foodDays || 0, 'food day'), plural(c.weighIns || 0, 'weigh-in')].join(', ') : '';

// ---------- sign-in sheets ----------
export function signInSheet() {
  openSheet(() => html`<${SignIn} />`);
}

function SignIn() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const google = async () => {
    setBusy(true); setErr('');
    try { await C.signInGoogle(); closeSheet(); toast('Signed in'); }
    catch (e) { setErr(C.authMessage(e)); }
    setBusy(false);
  };
  return html`
    <${SheetHead} title="Sign in to Tally" />
    <p class="text-2" style="margin:0">Your data gets backed up automatically, so a new phone picks up right where you left off. You also get a friend code for the leaderboard.</p>
    <button class="btn block google-btn" disabled=${busy} onClick=${google}><${GoogleG} /> Continue with Google</button>
    <button class="btn block" disabled=${busy} onClick=${() => openSheet(() => html`<${EmailSignIn} />`)}><${Icon} name="mail" size=${18} /> Use email and password</button>
    ${err ? html`<p class="small" style="margin:0;color:var(--bad)">${err}${/closed|blocked|support/i.test(err) ? ' If Google sign-in keeps closing, use email instead.' : ''}</p>` : null}
    <p class="tiny muted" style="margin:0">Only your name, friend code and weekly totals are visible to friends. Your logs, weight and photos are never shared. Photos stay on this phone.</p>`;
}

function EmailSignIn() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [mode, setMode] = useState('in');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async e => {
    e && e.preventDefault();
    setBusy(true); setErr('');
    try {
      if (mode === 'in') await C.signInEmail(email, pw);
      else await C.signUpEmail(email, pw, store.get().settings.name);
      closeSheet(); toast(mode === 'in' ? 'Signed in' : 'Account created');
    } catch (x) { setErr(C.authMessage(x)); }
    setBusy(false);
  };
  const reset = async () => {
    if (!email.trim()) { setErr('Type your email first, then tap Forgot password.'); return; }
    try { await C.resetPassword(email); setErr(''); toast('Check your email for a reset link', 3500); } catch (x) { setErr(C.authMessage(x)); }
  };
  return html`
    <${SheetHead} title=${mode === 'in' ? 'Sign in with email' : 'Create an account'} />
    <${Seg} label="Sign in or create account" value=${mode} onChange=${m => { setMode(m); setErr(''); }} options=${[['in', 'Sign in'], ['up', 'Create account']]} />
    <form class="stack" style="gap:12px" onSubmit=${go}>
      <div class="field"><label for="em">Email</label><input id="em" class="input" type="email" autocomplete="email" inputmode="email" value=${email} onInput=${e => setEmail(e.target.value)} /></div>
      <div class="field"><label for="pw">Password</label><input id="pw" class="input" type="password" autocomplete=${mode === 'in' ? 'current-password' : 'new-password'} value=${pw} onInput=${e => setPw(e.target.value)} placeholder=${mode === 'up' ? 'At least 6 characters' : ''} /></div>
      ${err ? html`<p class="small" style="margin:0;color:var(--bad)">${err}</p>` : null}
      <button class="btn primary block" type="submit" disabled=${busy || !email || !pw}>${busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
    </form>
    ${mode === 'in' ? html`<button class="link-btn small" style="align-self:center" onClick=${reset}>Forgot password?</button>` : null}`;
}

function GoogleG() {
  return html`<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;
}

// ---------- "which data do you want to keep?" ----------
C.setChooser(({ kind, cloud, local }) => new Promise(resolve => {
  let done = false;
  const pick = v => { if (done) return; done = true; closeSheet(); resolve(v); };
  function Ask() {
    useEffect(() => () => { if (!done) { done = true; resolve('skip'); } }, []);
    if (kind === 'restore') return html`
      <${SheetHead} title="Restore your backup?" onClose=${() => pick('skip')} />
      <p class="text-2" style="margin:0">Your account has a backup from ${fmtDateY(cloud.savedAt)}: ${countsLine(cloud.counts)}.</p>
      <div class="grid2"><button class="btn" onClick=${() => pick('local')}>Start fresh</button><button class="btn primary" onClick=${() => pick('cloud')}>Restore</button></div>
      <p class="tiny muted" style="margin:0">If you start fresh, what you log on this phone will replace that backup.</p>`;
    return html`
      <${SheetHead} title="Which data should Tally keep?" onClose=${() => pick('skip')} />
      <p class="text-2" style="margin:0">This phone and your account both have data. Pick one. The other will be replaced.</p>
      <button class="opt" onClick=${() => pick('local')}><div class="grow"><div class="h-md">This phone</div><div class="small muted">${countsLine(local)}</div></div></button>
      <button class="opt" onClick=${() => pick('cloud')}><div class="grow"><div class="h-md">Backup from ${fmtDateY(cloud.savedAt)}</div><div class="small muted">${countsLine(cloud.counts)}</div></div></button>
      <button class="link-btn small" style="align-self:center" onClick=${() => pick('skip')}>Decide later</button>`;
  }
  openSheet(() => html`<${Ask} />`);
}));
C.setToast(toast);

// ---------- account card on Me ----------
export function AccountCard() {
  const s = useCloud();
  if (s.phase !== 'in') return html`
    <div class="card account-card">
      <div class="hstack" style="gap:12px;align-items:flex-start">
        <span class="acc-icon"><${Icon} name="cloud" size=${20} /></span>
        <div class="grow"><div class="h-md">Back up and add friends</div>
          <div class="small muted" style="margin-top:2px">Sign in so your data is safe if you lose or change phones, and to join your friends' leaderboard.</div></div>
      </div>
      ${s.phase === 'error' ? html`<p class="small" style="margin:0;color:var(--warn)">${s.error}</p>` : null}
      <button class="btn primary block" disabled=${s.phase === 'loading' && !!localStorage.getItem('tally.cloud')} onClick=${signInSheet}>${s.phase === 'loading' && localStorage.getItem('tally.cloud') ? 'Connecting…' : 'Sign in'}</button>
    </div>`;
  const p = s.profile || {};
  const backupLine = s.syncing ? 'Backing up…' : s.error ? s.error : !s.ready ? 'Checking your backup…' : s.lastBackup ? `Backed up ${ago(s.lastBackup)}` : hasData() ? 'Not backed up yet' : 'Backup starts once you log something';
  return html`
    <div class="card account-card">
      <div class="hstack" style="gap:12px">
        <${Avatar} name=${store.get().settings.name || s.user.name || s.user.email} />
        <div class="grow" style="min-width:0"><div class="h-md ellip">${store.get().settings.name || s.user.name || 'Signed in'}</div>
          <div class="small muted ellip">${s.user.email}</div></div>
      </div>
      <div class="acc-line"><span class=${'dot' + (s.error ? ' warn' : s.syncing ? ' busy' : '')}></span><span class="grow small">${backupLine}</span>
        ${s.paused ? html`<button class="btn sm primary" onClick=${() => C.resync()}>Choose</button>`
          : html`<button class="btn sm" disabled=${s.syncing || !s.ready} onClick=${() => C.backupNow().then(() => !C.cloudStatus().error && toast('Backed up'))}>Back up now</button>`}</div>
      <div class="grid2">
        <button class="btn" onClick=${() => nav.go('friends')}><${Icon} name="trophy" size=${18} /> Leaderboard</button>
        <button class="btn" onClick=${() => shareCode(p.code)} disabled=${!p.code}><${Icon} name="users" size=${18} /> Code ${p.code || '…'}</button>
      </div>
      <div class="hstack" style="justify-content:space-between">
        <button class="link-btn small" onClick=${() => C.signOutCloud().then(() => toast('Signed out. Your data stays on this phone.'))}>Sign out</button>
        <button class="link-btn small" style="color:var(--bad)" onClick=${deleteAcc}>Delete account</button>
      </div>
    </div>`;
}

function deleteAcc() {
  confirmSheet({ title: 'Delete your account?', body: 'This deletes your backup, your friend code and your spot on friends\' leaderboards. Everything on this phone stays.', confirm: 'Delete account', onConfirm: () => C.deleteAccount().then(() => toast('Account deleted')).catch(e => toast(C.authMessage(e), 4000)) });
}

export function shareCode(code) {
  if (!code) return;
  const url = `${location.origin}${location.pathname}?friend=${code}`;
  const text = `Add me on Tally: my friend code is ${code}`;
  if (navigator.share) navigator.share({ title: 'Tally', text, url }).catch(() => {});
  else { try { navigator.clipboard.writeText(`${text}\n${url}`); toast('Code and link copied'); } catch (e) { toast(`Your code is ${code}`); } }
}

const HUES = [210, 155, 35, 280, 340, 190, 15, 255];
function Avatar({ name = '?', size = 40, me }) {
  const n = String(name || '?').trim();
  const h = HUES[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
  return html`<span class=${'avatar' + (me ? ' me' : '')} style=${`width:${size}px;height:${size}px;--h:${h}`} aria-hidden="true">${n.slice(0, 1).toUpperCase()}</span>`;
}

// ---------- leaderboard ----------
const lastWeekKey = () => C.weekKey(new Date(Date.now() - 7 * 864e5));
function weekOf(p, period) {
  const s = p.stats; if (!s) return null;
  if (period === 'this') return s.wk === C.weekKey() ? s.w : null;
  if (s.wk === C.weekKey()) return s.pw;
  if (s.wk === lastWeekKey()) return s.w;
  return null;
}
const BOARDS = [
  { id: 'n', label: 'Workouts', weekly: true, get: w => w.n, fmt: v => plural(v, 'workout'), sub: w => `${plural(w.sets, 'set')} · ${fmtNum(w.min / 60, 1)} h` },
  { id: 'vol', label: 'Volume', weekly: true, get: w => w.vol, fmt: (v, u) => `${Math.round(toUnit(v, u)).toLocaleString()} ${u}`, sub: w => plural(w.n, 'workout') },
  { id: 'sets', label: 'Sets', weekly: true, get: w => w.sets, fmt: v => plural(v, 'set'), sub: w => plural(w.n, 'workout') },
  { id: 'pd', label: 'Protein', weekly: true, get: w => w.pd, fmt: v => `${v} ${v === 1 ? 'day' : 'days'}`, sub: w => `Hit protein target · logged food ${plural(w.fd, 'day')}` },
  { id: 'streak', label: 'Streak', get: (p) => { const s = p.stats; return s && (s.wk === C.weekKey() || s.wk === lastWeekKey()) ? s.streak : 0; }, fmt: v => plural(v, 'week'), sub: p => p.stats ? `Weeks in a row hitting ${p.stats.goal} workouts` : '' },
  { id: 'prm', label: 'PRs', get: p => p.stats && p.stats.mo === C.monthKey() ? p.stats.prm : 0, fmt: v => plural(v, 'PR'), sub: () => 'New records this month' },
];

let boardCache = null;
let boardPrefs = { board: 'n', period: 'this' };

export function Leaderboard({ state }) {
  const s = useCloud();
  const [rows, setRows] = useState(boardCache);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [board, setBoard] = useState(boardPrefs.board);
  const [period, setPeriod] = useState(boardPrefs.period);
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);
  useEffect(() => { boardPrefs = { board, period }; }, [board, period]);
  const refresh = async () => {
    setBusy(true); setErr('');
    try { const r = await C.loadBoard(); boardCache = r; setRows(r); }
    catch (e) { setErr(navigator.onLine ? "Couldn't load the leaderboard. Try again." : "You're offline. Connect to see your friends."); }
    setBusy(false);
  };
  useEffect(() => { if (s.phase === 'in' && s.profile) refresh(); }, [s.phase, !!s.profile]);
  const unit = state.settings.unit;
  const b = BOARDS.find(x => x.id === board);

  if (s.phase !== 'in') return html`
    <${TopBar} title="Leaderboard" back=${true} />
    <div class="page">
      <div class="card lb-empty">
        <span class="lb-trophy"><${Icon} name="trophy" size=${30} /></span>
        <div class="h-lg">Compete with your friends</div>
        <p class="text-2" style="margin:0">Weekly boards for workouts, volume, sets and protein, plus streaks and monthly PRs. Sign in to get your friend code.</p>
        <button class="btn primary block" onClick=${signInSheet}>Sign in</button>
      </div>
    </div>`;

  const scored = (rows || []).map(p => {
    let v = 0, sub = '';
    if (b.weekly) { const w = weekOf(p, period); v = w ? b.get(w) : 0; sub = w ? b.sub(w) : 'No activity yet'; }
    else { v = b.get(p); sub = b.sub(p); }
    return { p, v, sub };
  }).sort((a, z) => z.v - a.v || (a.p.me ? -1 : 1));
  const top = Math.max(1, ...scored.map(x => x.v));
  let rank = 0, prev = null;
  const ranked = scored.map((x, i) => { if (x.v !== prev) { rank = i + 1; prev = x.v; } return { ...x, rank }; });
  const friends = (rows || []).filter(p => !p.me);
  const add = async e => {
    e && e.preventDefault();
    setAdding(true);
    try { const n = await C.addFriendByCode(code); setCode(''); toast(`Added ${n}`); refresh(); }
    catch (x) { toast(x.message, 3500); }
    setAdding(false);
  };
  const myCode = (s.profile || {}).code;

  return html`
    <${TopBar} title="Leaderboard" back=${true} right=${html`<button class="icon-btn" aria-label="Refresh" disabled=${busy} onClick=${refresh}><${Icon} name="refresh" size=${20} /></button>`} />
    <div class="page lb">
      <div class="chips scroll-x" role="tablist" aria-label="Board">
        ${BOARDS.map(x => html`<button class="chip" role="tab" aria-selected=${x.id === board} aria-pressed=${x.id === board} onClick=${() => setBoard(x.id)}>${x.label}</button>`)}
      </div>
      ${b.weekly ? html`<${Seg} label="Week" value=${period} onChange=${setPeriod} options=${[['this', 'This week'], ['last', 'Last week']]} />` : null}
      ${err ? html`<div class="banner"><span class="grow">${err}</span></div>` : null}
      ${!rows ? html`<div class="card muted small" style="text-align:center">Loading…</div>` : html`
        <ol class="lb-list" aria-label=${b.label + ' leaderboard'}>
          ${ranked.map(({ p, v, sub, rank }) => html`<li class=${'lb-row' + (p.me ? ' me' : '') + (rank === 1 && v > 0 ? ' first' : '')}>
            <span class="lb-rank num">${rank}</span>
            <${Avatar} name=${p.name} size=${36} me=${p.me} />
            <div class="grow" style="min-width:0">
              <div class="lb-name ellip">${p.name || 'Friend'}${p.me ? html` <span class="muted">(you)</span>` : null}</div>
              <div class="lb-sub ellip">${sub}</div>
              <div class="lb-bar"><i style=${`width:${v / top * 100}%`}></i></div>
            </div>
            <span class="lb-val num">${b.fmt(v, unit)}</span>
          </li>`)}
        </ol>
        ${!friends.length ? html`<p class="small muted" style="margin:0;text-align:center">It's just you so far. Share your code below to add friends.</p>` : null}`}

      <div class="section-head"><span class="h-md">Friends</span></div>
      <div class="card stack" style="gap:12px">
        <div class="hstack" style="gap:12px">
          <div class="grow"><div class="small muted">Your friend code</div><div class="lb-code num">${myCode || '……'}</div></div>
          <button class="btn sm" disabled=${!myCode} onClick=${() => shareCode(myCode)}><${Icon} name="share" size=${16} /> Share</button>
        </div>
        <form class="hstack" style="gap:8px" onSubmit=${add}>
          <input class="input grow" aria-label="Friend's code" placeholder="Friend's code" maxlength="8" autocapitalize="characters" autocomplete="off" value=${code} onInput=${e => setCode(e.target.value.toUpperCase())} style="text-transform:uppercase;letter-spacing:.08em" />
          <button class="btn primary" type="submit" disabled=${adding || code.replace(/[^A-Z0-9]/gi, '').length !== 6}>Add</button>
        </form>
      </div>
      ${friends.length ? html`<div class="list">
        ${friends.map(p => html`<div class="row">
          <${Avatar} name=${p.name} size=${32} />
          <div class="grow" style="min-width:0"><div class="title ellip">${p.name || 'Friend'}</div><div class="sub">${p.iAdded ? (p.addedMe ? 'Friends' : 'You added them') : 'Added you'}</div></div>
          ${p.iAdded ? html`<button class="btn sm" onClick=${() => confirmSheet({ title: `Remove ${p.name || 'this friend'}?`, body: 'They leave your leaderboard. If they added you, you\'ll still show on theirs.', confirm: 'Remove', onConfirm: () => C.removeFriend(p.uid).then(refresh) })}>Remove</button>`
            : html`<button class="btn sm" onClick=${() => C.addFriendByCode(p.code).then(n => { toast(`Added ${n}`); refresh(); }).catch(x => toast(x.message))}>Add back</button>`}
        </div>`)}
      </div>` : null}
      <p class="tiny muted" style="margin:0;text-align:center">Weeks run Monday to Sunday for everyone. Friends see only your name and these totals.</p>
    </div>`;
}
