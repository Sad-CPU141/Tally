// Progress photos: add, browse by date, and compare two days side by side with a slider.

import { html, useState } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import * as A from '../lib/analytics.js';
import { Icon, nav, TopBar, openSheet, closeSheet, SheetHead, toast, confirmSheet, Seg } from '../lib/ui.js';
import { POSES, addPhoto, deletePhoto, PhotoImg, byDate } from '../lib/photos.js';
import { series, showVal } from './body.js';
import { bwUnit, w, todayKey, fromKey, fmtDateY, fmtRel, daysBetween } from '../lib/util.js';

const POSE = Object.fromEntries(POSES);

export function addPhotoSheet() {
  function Body() {
    const [pose, setPose] = useState('front');
    const [date, setDate] = useState(todayKey());
    const [busy, setBusy] = useState(false);
    const done = (store.get().photos || []).filter(p => p.date === date).map(p => p.pose);
    const pick = async e => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      setBusy(true);
      try {
        await addPhoto(f, date, pose);
        toast(`${POSE[pose]} photo saved`);
        // Move on to the next pose not taken yet today.
        const left = POSES.map(p => p[0]).filter(p => p !== pose && !done.includes(p));
        if (left.length) setPose(left[0]); else closeSheet();
      } catch (err) { toast('Couldn\'t read that photo'); }
      setBusy(false);
    };
    return html`
      <${SheetHead} title="Progress photo" />
      <${Seg} label="Pose" value=${pose} onChange=${setPose} options=${POSES.map(([k, l]) => [k, done.includes(k) ? l + ' ✓' : l])} />
      <div class="field"><label for="ph-date">Date</label><input id="ph-date" class="input" type="date" value=${date} max=${todayKey()} onInput=${e => setDate(e.target.value)} /></div>
      <label class=${'btn primary block' + (busy ? ' disabled' : '')} style="position:relative">
        <${Icon} name="plus" size=${18} /> ${busy ? 'Saving…' : `Take or choose ${POSE[pose].toLowerCase()} photo`}
        <input type="file" accept="image/*" aria-label="Choose photo" style="position:absolute;inset:0;opacity:0" disabled=${busy} onChange=${pick} />
      </label>
      <p class="tiny muted" style="margin:0">Same spot, same light, same time of day (morning works best) makes changes easy to see. Photos stay on this phone only and aren't in backups.</p>`;
  }
  openSheet(() => html`<${Body} />`);
}

function viewPhoto(p) {
  openSheet(() => html`
    <${SheetHead} title=${`${POSE[p.pose]} · ${fmtDateY(fromKey(p.date))}`} />
    <div class="ph-full"><${PhotoImg} id=${p.id} kind="full" alt=${`${POSE[p.pose]} photo, ${p.date}`} /></div>
    <button class="btn block danger" onClick=${() => confirmSheet({ title: 'Delete this photo?', body: 'It will be gone from this phone for good.', confirm: 'Delete', onConfirm: () => { deletePhoto(p.id); toast('Photo deleted'); } })}><${Icon} name="trash" size=${18} /> Delete photo</button>`);
}

// Strip for the Body tab: the latest few days.
export function PhotoStrip({ state }) {
  const days = byDate(state).slice(0, 8);
  return html`
    <div class="section-head"><span class="h-md">Progress photos</span>${days.length ? html`<button class="link-btn" onClick=${() => nav.go('photos')}>See all</button>` : null}</div>
    ${days.length ? html`<div class="ph-strip">
      <button class="ph-add" aria-label="Add progress photo" onClick=${addPhotoSheet}><${Icon} name="plus" /></button>
      ${days.map(d => html`<button class="ph-day" onClick=${() => nav.go('photos')} aria-label=${`Photos from ${d.date}`}>
        <${PhotoImg} id=${d.items[0].id} cls="ph-img" />
        <span class="tiny">${fmtRel(fromKey(d.date))}</span>
      </button>`)}
    </div>` : html`<button class="card tap hstack" onClick=${addPhotoSheet}>
      <span style="color:var(--accent)"><${Icon} name="plus" /></span>
      <div class="grow"><div class="title" style="font-weight:600">Add your first photos</div><div class="small muted">Front, side and back. Compare them as you go. They never leave this phone.</div></div>
    </button>`}`;
}

// Weight trend and waist on (or just before) a day.
function statsOn(state, key) {
  const t = A.weighIns(state).filter(p => p.key <= key).pop();
  const wst = series(state, 'waist').filter(p => p.date <= key).pop();
  const u = bwUnit(state);
  return [t ? `${w(t.raw, u)} ${u}` : null, wst ? `waist ${showVal(state, 'waist', wst.value)}` : null].filter(Boolean).join(' · ') || ' ';
}

function Compare({ state, pose }) {
  const days = byDate(state, pose);
  const [a, setA] = useState(days.length ? days[days.length - 1].date : null);
  const [b, setB] = useState(days.length ? days[0].date : null);
  const [pos, setPos] = useState(50);
  const [side, setSide] = useState(false);
  if (days.length < 2) return html`<div class="card empty small">Take ${POSE[pose].toLowerCase()} photos on two different days to compare them.</div>`;
  const pa = (days.find(d => d.date === a) || days[days.length - 1]).items[0];
  const pb = (days.find(d => d.date === b) || days[0]).items[0];
  const gap = Math.abs(daysBetween(fromKey(pa.date), fromKey(pb.date)));
  const opts = days.map(d => html`<option value=${d.date}>${fmtDateY(fromKey(d.date))}</option>`);
  return html`
    <div class="grid2">
      <div class="field"><label for="cmp-a">Before</label><select id="cmp-a" class="input" value=${pa.date} onChange=${e => setA(e.target.value)}>${opts}</select></div>
      <div class="field"><label for="cmp-b">After</label><select id="cmp-b" class="input" value=${pb.date} onChange=${e => setB(e.target.value)}>${opts}</select></div>
    </div>
    <div class="hstack" style="justify-content:space-between"><span class="small muted">${gap} days apart</span>
      <div style="width:170px"><${Seg} label="View" value=${side ? 'side' : 'slide'} onChange=${v => setSide(v === 'side')} options=${[['slide', 'Slider'], ['side', 'Split']]} /></div></div>
    ${side ? html`<div class="grid2">
        <div class="ph-cmp-one"><${PhotoImg} id=${pa.id} kind="full" alt="Before" /></div>
        <div class="ph-cmp-one"><${PhotoImg} id=${pb.id} kind="full" alt="After" /></div>
      </div>` : html`<div class="ph-cmp">
        <${PhotoImg} id=${pa.id} kind="full" alt="Before" cls="ph-under" />
        <div class="ph-over" style=${`clip-path: inset(0 0 0 ${pos}%)`}><${PhotoImg} id=${pb.id} kind="full" alt="After" /></div>
        <div class="ph-line" style=${`left:${pos}%`}></div>
        <span class="ph-tag l">Before</span><span class="ph-tag r">After</span>
        <input class="ph-range" type="range" min="0" max="100" value=${pos} aria-label="Slide between before and after" onInput=${e => setPos(+e.target.value)} />
      </div>`}
    <div class="grid2 small">
      <div><div class="title" style="font-weight:600">${fmtDateY(fromKey(pa.date))}</div><div class="muted">${statsOn(state, pa.date)}</div></div>
      <div style="text-align:right"><div class="title" style="font-weight:600">${fmtDateY(fromKey(pb.date))}</div><div class="muted">${statsOn(state, pb.date)}</div></div>
    </div>`;
}

export function Photos({ state }) {
  const [view, setView] = useState('all');
  const [pose, setPose] = useState('front');
  const days = byDate(state);
  return html`
    <${TopBar} title="Progress photos" back=${true} right=${html`<button class="btn sm primary" onClick=${addPhotoSheet}>Add</button>`} />
    <div class="page">
      <${Seg} label="View" value=${view} onChange=${setView} options=${[['all', 'All photos'], ['compare', 'Compare']]} />
      ${view === 'compare' ? html`
        <${Seg} label="Pose" value=${pose} onChange=${setPose} options=${POSES} />
        <${Compare} key=${pose} state=${state} pose=${pose} />`
      : days.length ? days.map(d => html`
        <div class="section-head"><span class="h-md">${fmtDateY(fromKey(d.date))}</span><span class="small muted">${statsOn(state, d.date)}</span></div>
        <div class="ph-grid">${d.items.map(p => html`<button class="ph-cell" onClick=${() => viewPhoto(p)} aria-label=${`${POSE[p.pose]} photo`}>
          <${PhotoImg} id=${p.id} cls="ph-img" /><span class="ph-pose tiny">${POSE[p.pose]}</span></button>`)}</div>`)
      : html`<div class="card empty"><span class="h-md">No photos yet</span><button class="btn primary" onClick=${addPhotoSheet}>Add photos</button></div>`}
      <p class="tiny muted" style="margin:0">Photos are stored only on this phone. They aren't included in backups or uploaded anywhere.</p>
    </div>`;
}
