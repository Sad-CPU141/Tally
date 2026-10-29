// Shared UI pieces: icons, router, sheets, toasts.

import { html, useEffect, useState } from '../vendor/preact-htm.js';

// ---------- Icons (24px stroke) ----------
const P = {
  today: 'M4 5h16v15H4z M4 9h16 M9 3v4 M15 3v4',
  train: 'M6.5 6.5v11 M17.5 6.5v11 M3.5 9v6 M20.5 9v6 M6.5 12h11',
  stats: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  me: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  back: 'M15 5l-7 7 7 7',
  chev: 'M9 6l6 6-6 6',
  close: 'M6 6l12 12 M18 6L6 18',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  grip: 'M9 6h.01 M15 6h.01 M9 12h.01 M15 12h.01 M9 18h.01 M15 18h.01',
  up: 'M12 19V5 M6 11l6-6 6 6',
  down: 'M12 5v14 M18 13l-6 6-6-6',
  trash: 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M12 9v4l2.5 2 M10 2h4',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4z M8 6H5a3 3 0 0 0 3 4 M16 6h3a3 3 0 0 1-3 4 M12 13v4 M8 21h8 M9 17h6',
  scale: 'M5 4h14l1 16H4L5 4z M9 9a3 3 0 0 1 6 0 M12 9l1.5-2',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4',
  play: 'M8 5v14l11-7z',
  flame: 'M12 21c4 0 7-3 7-7 0-5-5-7-5-11-3 2-5 5-5 8-1-1-2-2-2-4-2 2-2 4-2 7 0 4 3 7 7 7z',
  layout: 'M4 4h7v7H4z M13 4h7v4h-7z M13 10h7v10h-7z M4 13h7v7H4z',
  download: 'M12 4v11 M7 10l5 5 5-5 M5 20h14',
  upload: 'M12 20V9 M7 14l5-5 5 5 M5 4h14',
  cloud: 'M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8H7z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20a6.5 6.5 0 0 1 13 0 M16 4.5a3.5 3.5 0 0 1 0 6.5 M18 14a6 6 0 0 1 3.5 6',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6l1-7z',
  note: 'M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5',
  swap: 'M7 7h12l-3-3 M17 17H5l3 3',
  food: 'M7 3v8 M5 3v5a2 2 0 0 0 4 0V3 M7 11v10 M17 3c-2 0-3 3-3 6s1 4 3 4v8',
  barcode: 'M4 6v12 M7 6v12 M10.5 6v12 M14 6v12 M16.5 6v12 M20 6v12 M2 4h4 M2 20h4 M18 4h4 M18 20h4',
  drop: 'M12 3c3.5 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 2.5-6.5 6-11z',
  copy: 'M9 9h11v11H9z M5 15H4V4h11v1',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
};

export function Icon({ name, size = 22, sw = 1.9 }) {
  const d = P[name] || '';
  return html`<svg viewBox="0 0 24 24" width=${size} height=${size} fill="none" stroke="currentColor" stroke-width=${sw} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    ${d.split(' M').map((seg, i) => html`<path d=${(i ? 'M' : '') + seg} />`)}
  </svg>`;
}

// ---------- Router ----------
// A stack of { name, params }. Top-level tabs reset the stack.
const listeners = new Set();
let stack = [{ name: 'today', params: {} }];
// Two modes, each with its own tab bar. Body and Me are shared.
export const MODES = {
  gym: [['today', 'Today', 'today'], ['train', 'Train', 'train'], ['body', 'Body', 'scale'], ['stats', 'Stats', 'stats'], ['me', 'Me', 'me']],
  food: [['food', 'Diary', 'food'], ['insights', 'Insights', 'stats'], ['body', 'Body', 'scale'], ['targets', 'Targets', 'bolt'], ['me', 'Me', 'me']],
};
export const TABS = [...new Set([...MODES.gym, ...MODES.food].map(t => t[0]))];
export const isRootTab = name => TABS.includes(name);

function emit() { listeners.forEach(l => l(stack[stack.length - 1], stack.length)); }

export const nav = {
  current: () => stack[stack.length - 1],
  depth: () => stack.length,
  tab(name) { stack = [{ name, params: {} }]; history.replaceState({ d: 0 }, ''); emit(); window.scrollTo(0, 0); },
  go(name, params = {}) {
    stack.push({ name, params });
    try { history.pushState({ d: stack.length - 1 }, ''); } catch (e) {}
    emit(); window.scrollTo(0, 0);
  },
  replace(name, params = {}) { stack[stack.length - 1] = { name, params }; emit(); window.scrollTo(0, 0); },
  back() {
    if (stack.length > 1) { try { history.back(); } catch (e) { stack.pop(); emit(); } }
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

window.addEventListener('popstate', () => {
  if (stack.length > 1) { stack.pop(); emit(); }
});

export function useRoute() {
  const [r, setR] = useState(nav.current());
  useEffect(() => nav.subscribe(c => setR({ ...c })), []);
  return r;
}

// ---------- Sheets ----------
let sheetSet = null;
export function SheetHost() {
  const [s, setS] = useState(null);
  useEffect(() => { sheetSet = setS; return () => { sheetSet = null; }; }, []);
  useEffect(() => {
    if (!s) return;
    const onKey = e => { if (e.key === 'Escape') closeSheet(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s]);
  if (!s) return null;
  return html`<div class="sheet-wrap" role="dialog" aria-modal="true">
    <div class="sheet-bg" onClick=${closeSheet}></div>
    <div class="sheet"><div class="grab"></div>${s()}</div>
  </div>`;
}
export function openSheet(render) { sheetSet && sheetSet(() => render); }
export function closeSheet() { sheetSet && sheetSet(null); }

export function SheetHead({ title, onClose = closeSheet, action }) {
  return html`<div class="sheet-head">
    <h2 class="h-lg">${title}</h2>
    ${action || html`<button class="icon-btn" aria-label="Close" onClick=${onClose}><${Icon} name="close" /></button>`}
  </div>`;
}

// Confirmation inside a sheet (the frame blocks confirm()).
export function confirmSheet({ title, body, confirm = 'Delete', danger = true, onConfirm }) {
  openSheet(() => html`
    <${SheetHead} title=${title} />
    ${body ? html`<p class="text-2" style="margin:0">${body}</p>` : null}
    <div class="grid2">
      <button class="btn" onClick=${closeSheet}>Cancel</button>
      <button class=${'btn ' + (danger ? 'danger' : 'primary')} onClick=${() => { closeSheet(); onConfirm(); }}>${confirm}</button>
    </div>`);
}

// ---------- Toast ----------
let toastSet = null, toastTimer = null;
export function ToastHost() {
  const [t, setT] = useState(null);
  useEffect(() => { toastSet = setT; }, []);
  return t ? html`<div class="toast" role="status">${t}</div>` : null;
}
export function toast(msg, ms = 2200) {
  if (!toastSet) return;
  toastSet(msg);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastSet(null), ms);
}

// ---------- Misc ----------
let modeHandler = null;
export function onModeSwitch(fn) { modeHandler = fn; }

// Root screens show the Tally switch on the left; tap it to flip between Gym and Food.
export function TopBar({ title, back, right, mode }) {
  return html`<header class="topbar"><div class="topbar-in">
    ${back ? html`<button class="icon-btn" aria-label="Back" onClick=${() => nav.back()} style="margin-left:-8px"><${Icon} name="back" /></button>`
      : mode ? html`<button class="mode-switch" aria-label=${`Tally, ${mode} mode. Switch to ${mode === 'gym' ? 'food' : 'gym'}`} onClick=${() => modeHandler && modeHandler()}>
          <span class="brand">Tally</span><span class=${'mode-pill ' + mode}><${Icon} name="swap" size=${13} sw=${2.4} />${mode === 'gym' ? 'Gym' : 'Food'}</span>
        </button>` : null}
    <h1 class=${mode && !back ? 'subtitle' : ''}>${title}</h1>
    ${right}
  </div></header>`;
}

export function Switch({ id, checked, onChange, label }) {
  return html`<label class="switch"><input id=${id} type="checkbox" role="switch" aria-label=${label} checked=${checked} onChange=${e => onChange(e.target.checked)} /><span></span></label>`;
}

export function Seg({ options, value, onChange, label }) {
  return html`<div class="seg" role="group" aria-label=${label}>
    ${options.map(([v, l]) => html`<button type="button" aria-pressed=${value === v} onClick=${() => onChange(v)}>${l}</button>`)}
  </div>`;
}

export function Tally({ count, goal }) {
  const total = Math.max(goal, count);
  const groups = [];
  for (let g = 0; g < Math.ceil(total / 5); g++) {
    const inGroup = Math.min(5, total - g * 5);
    const filled = Math.max(0, Math.min(5, count - g * 5));
    groups.push({ inGroup, filled });
  }
  return html`<div class="tally" aria-label=${`${count} of ${goal} sessions`}>
    ${groups.map(({ inGroup, filled }) => html`<div class="tally-group">
      ${Array.from({ length: Math.min(4, inGroup) }, (_, i) => html`<i class=${i < filled ? '' : 'off'}></i>`)}
      ${inGroup === 5 ? (filled === 5 ? html`<b></b>` : html`<b style="background:var(--surface-3)"></b>`) : null}
    </div>`)}
  </div>`;
}
