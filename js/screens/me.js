// Me: profile, settings, data. Also first-run onboarding.

import { html, useState } from '../vendor/preact-htm.js';
import * as store from '../lib/store.js';
import { Icon, TopBar, Seg, Switch, confirmSheet, toast, nav } from '../lib/ui.js';
import { fmtDur, download, todayKey } from '../lib/util.js';
import { logBodyweight } from '../lib/actions.js';
import { makeSample } from '../lib/sample.js';
import { plateCalc } from '../lib/plates.js';
import { clearPhotos } from '../lib/photos.js';
import { importFile, importHelp, exportMenu } from '../lib/datafiles.js';

const ACCENTS = [['ice', 'Ice', '#6cb8ff'], ['iris', 'Iris', '#a597ff'], ['ember', 'Ember', '#ffad5c'], ['mint', 'Mint', '#5fd4a8'], ['rose', 'Rose', '#ff86ad']];

const setS = (k, v) => { store.update(st => { st.settings[k] = v; }); if (k === 'theme' || k === 'accent') store.applyLook(); };

function Row({ title, sub, children }) {
  return html`<div class="row"><div class="grow"><div class="title">${title}</div>${sub ? html`<div class="sub" style="white-space:normal">${sub}</div>` : null}</div>${children}</div>`;
}

export function Me({ state }) {
  const s = state.settings;
  const counts = `${state.workouts.length} workouts · ${new Set(state.foodLog.map(e => e.date)).size} food days · ${state.bodyweight.length} weigh-ins`;
  return html`
    <${TopBar} mode=${state.settings.mode} title="Me" />
    <div class="page">
      <div class="field"><label for="me-name">Your name</label>
        <input id="me-name" class="input" placeholder="What should Tally call you?" value=${s.name} onInput=${e => setS('name', e.target.value)} /></div>

      <div class="list">
        <div class="row" style="opacity:.75">
          <span style="color:var(--accent)"><${Icon} name="cloud" /></span>
          <div class="grow"><div class="title">Account and backup</div><div class="sub" style="white-space:normal">Google sign-in with automatic backup is next. Until then, everything is saved on this phone, so export a backup now and then.</div></div>
          <span class="pill">Soon</span>
        </div>
        <div class="row" style="opacity:.75">
          <span style="color:var(--accent)"><${Icon} name="users" /></span>
          <div class="grow"><div class="title">Friends and leaderboards</div><div class="sub" style="white-space:normal">Arrives with accounts.</div></div>
          <span class="pill">Soon</span>
        </div>
      </div>

      <div class="grid2">
        <button class="btn" onClick=${() => logBodyweight()}><${Icon} name="scale" size=${18} /> Log weight</button>
        <button class="btn" onClick=${() => nav.go('targets')}><${Icon} name="food" size=${18} /> Food targets</button>
      </div>

      <div class="section-head"><span class="h-md">Units</span></div>
      <div class="list">
        <${Row} title="Lifting weights" sub="Barbells, dumbbells, machines"><div style="width:130px"><${Seg} label="Lifting unit" value=${s.unit} onChange=${v => setS('unit', v)} options=${[['lb', 'lb'], ['kg', 'kg']]} /></div><//>
        <${Row} title="Bodyweight" sub=${'Weigh-ins, food targets' + ((s.bwUnit || s.unit) === 'lb' ? ', inches' : ', centimetres')}><div style="width:130px"><${Seg} label="Bodyweight unit" value=${s.bwUnit || s.unit} onChange=${v => setS('bwUnit', v)} options=${[['lb', 'lb'], ['kg', 'kg']]} /></div><//>
        <${Row} title="Distance"><div style="width:130px"><${Seg} label="Distance unit" value=${s.distUnit} onChange=${v => setS('distUnit', v)} options=${[['km', 'km'], ['mi', 'mi']]} /></div><//>
      </div>

      <div class="section-head"><span class="h-md">Look</span></div>
      <div class="card stack">
        <${Seg} label="Theme" value=${s.theme} onChange=${v => setS('theme', v)} options=${[['dark', 'Dark'], ['light', 'Light'], ['system', 'Match phone']]} />
        <div class="swatches" role="group" aria-label="Accent colour">
          ${ACCENTS.map(([k, l, c]) => html`<button class="swatch" aria-label=${l} aria-pressed=${s.accent === k} onClick=${() => setS('accent', k)}><i style=${`background:${c}`}></i></button>`)}
        </div>
      </div>

      <div class="section-head"><span class="h-md">Training</span></div>
      <div class="list">
        <${Row} title="Weekly goal" sub="Sessions per week, used for your streak">
          <div class="hstack" style="gap:2px">
            <button class="icon-btn" aria-label="Lower goal" onClick=${() => setS('weeklyGoal', Math.max(1, s.weeklyGoal - 1))}><${Icon} name="minus" size=${18} /></button>
            <span class="num" style="min-width:22px;text-align:center;font-weight:600">${s.weeklyGoal}</span>
            <button class="icon-btn" aria-label="Raise goal" onClick=${() => setS('weeklyGoal', Math.min(14, s.weeklyGoal + 1))}><${Icon} name="plus" size=${18} /></button>
          </div><//>
        <${Row} title="Default rest" sub="Used when an exercise has no rest time of its own">
          <div class="hstack" style="gap:2px">
            <button class="icon-btn" aria-label="Less rest" onClick=${() => setS('restDefault', Math.max(15, s.restDefault - 15))}><${Icon} name="minus" size=${18} /></button>
            <span class="num" style="min-width:42px;text-align:center;font-weight:600">${fmtDur(s.restDefault)}</span>
            <button class="icon-btn" aria-label="More rest" onClick=${() => setS('restDefault', Math.min(600, s.restDefault + 15))}><${Icon} name="plus" size=${18} /></button>
          </div><//>
        <${Row} title="Start rest timer after each set"><${Switch} id="set-autorest" label="Auto rest timer" checked=${s.autoRest} onChange=${v => setS('autoRest', v)} /><//>
        <${Row} title="Weight suggestions" sub="Off: the faded numbers are last time's. On: they're what to aim for today"><${Switch} id="set-suggest" label="Weight suggestions" checked=${!!s.coach} onChange=${v => setS('coach', v)} /><//>
        <${Row} title="Ask reps left after each set" sub="Tap 0–4 after a set. Makes suggestions smarter"><${Switch} id="set-rir" label="Ask reps left" checked=${!!s.rir} onChange=${v => setS('rir', v)} /><//>
        <${Row} title="Keep screen on during workouts"><${Switch} id="set-awake" label="Keep screen on" checked=${s.keepAwake} onChange=${v => setS('keepAwake', v)} /><//>
        <${Row} title="Plate calculator" sub="Your bar and the plates at your gym"><button class="btn sm" onClick=${() => plateCalc(null)}>Open</button><//>
        <${Row} title="Week starts on"><div style="width:150px"><${Seg} label="Week start" value=${s.weekStart} onChange=${v => setS('weekStart', v)} options=${[[1, 'Mon'], [0, 'Sun']]} /></div><//>
      </div>

      <div class="section-head"><span class="h-md">Your data</span></div>
      <div class="list">
        <${Row} title="Import" sub=${html`Excel, CSV, Strong, Hevy, FitNotes, MyFitnessPal, Cronometer or a Tally backup. <button class="link-btn tiny" style="padding:0" onClick=${importHelp}>What can I import?</button>`}>
          <label class="btn sm" style="position:relative"><${Icon} name="upload" size=${16} /> Import
            <input type="file" accept=".xlsx,.xls,.xlsm,.ods,.csv,.tsv,.txt,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" aria-label="Choose a file to import" style="position:absolute;inset:0;opacity:0" onChange=${e => importFile(e.target.files[0], e.target)} /></label><//>
        <${Row} title="Export" sub=${counts}><button class="btn sm" onClick=${exportMenu}><${Icon} name="download" size=${16} /> Export</button><//>
        ${s.sample
          ? html`<${Row} title="Sample data is loaded" sub="Clear it to start logging your own training"><button class="btn sm danger" onClick=${clearSample}>Clear</button><//>`
          : html`<${Row} title="Explore with sample data" sub="8 weeks of example training, replaces current data"><button class="btn sm" onClick=${loadSample}>Load</button><//>`}
        <${Row} title="Erase everything" sub="Deletes all workouts, routines and settings on this phone"><button class="btn sm danger" onClick=${eraseAll}>Erase</button><//>
      </div>
      ${store.isMemoryOnly() ? html`<div class="banner"><span class="grow">This browser isn't allowing storage, so nothing will be kept after you close it. Open Tally from your home screen or a normal browser window.</span></div>` : null}
      <p class="tiny muted credit" style="text-align:center;margin:8px 0 0">Tally · Gym Macro Tracker<br />Food data from Open Food Facts · Exercise steps from Free Exercise DB<br /><a href="https://repdb.co" target="_blank" rel="noopener">Exercise data by RepDB (repdb.co)</a></p>
    </div>`;
}


function loadSample() {
  confirmSheet({ title: 'Load sample data?', body: 'This replaces everything on this phone with 8 weeks of example training. Export a backup first if you have real data.', confirm: 'Load sample', danger: false, onConfirm: () => {
    const cur = store.get();
    store.replaceAll(makeSample(cur.settings));
    toast('Sample data loaded');
    nav.tab('today');
  } });
}

function clearSample() {
  confirmSheet({ title: 'Clear sample data?', body: 'Removes the example workouts and weigh-ins. Your settings and routines stay.', confirm: 'Clear', onConfirm: () => {
    store.update(st => { st.workouts = []; st.bodyweight = []; st.measurements = []; st.foodLog = []; st.water = {}; st.foods = []; st.meals = []; st.active = null; st.settings.sample = false; });
    toast('Sample data cleared');
  } });
}

function eraseAll() {
  confirmSheet({ title: 'Erase everything?', body: 'All workouts, weigh-ins, routines, photos and settings on this phone will be deleted. This cannot be undone.', confirm: 'Erase', onConfirm: () => { store.replaceAll(store.freshState()); clearPhotos(); nav.tab('today'); } });
}

// ---------- onboarding ----------
export function Onboarding() {
  const cur = store.get().settings;
  const [name, setName] = useState(cur.name);
  const [unit, setUnit] = useState(cur.unit);
  const [mode, setMode] = useState('fresh');
  const go = () => {
    if (mode === 'sample') {
      const st = makeSample({ ...cur, name: name.trim(), unit, onboarded: true });
      store.replaceAll(st);
    } else {
      store.update(st => {
        st.settings.name = name.trim(); st.settings.unit = unit; st.settings.onboarded = true;
      });
    }
    nav.tab(mode === 'sample' ? 'today' : 'train');
  };
  return html`<div class="onb">
    <div class="logo"><${Mark} /><span class="logo-word">Tally</span></div>
    <p class="text-2" style="margin:0;font-size:17px">Log every set, see every trend. Built for you and your crew.</p>
    <div class="field"><label for="onb-name">Your name</label><input id="onb-name" class="input" value=${name} onInput=${e => setName(e.target.value)} placeholder="First name" /></div>
    <div class="field"><label>Weight unit</label><${Seg} label="Weight unit" value=${unit} onChange=${setUnit} options=${[['lb', 'Pounds (lb)'], ['kg', 'Kilograms (kg)']]} /></div>
    <div class="field"><label>How do you want to start?</label>
      <div class="stack" style="gap:8px">
        <button class="opt" aria-pressed=${mode === 'fresh'} onClick=${() => setMode('fresh')}><div class="grow"><div class="h-md">Start fresh</div><div class="small muted">Build your own routines, one for each day of your split.</div></div></button>
        <button class="opt" aria-pressed=${mode === 'sample'} onClick=${() => setMode('sample')}><div class="grow"><div class="h-md">Explore with sample data</div><div class="small muted">8 weeks of example training so you can see every chart. Clear it later in Me.</div></div></button>
      </div></div>
    <button class="btn primary block" style="height:52px" onClick=${go}>Get started</button>
  </div>`;
}

export function Mark({ size = 44 }) {
  return html`<svg width=${size} height=${size} viewBox="0 0 48 48" aria-hidden="true">
    <rect width="48" height="48" rx="12" fill="var(--surface-2)" />
    ${[13, 20, 27, 34].map(x => html`<rect x=${x - 1.5} y="12" width="3" height="24" rx="1.5" fill="var(--accent)" />`)}
    <rect x="8" y="22.5" width="32" height="3" rx="1.5" fill="var(--text)" transform="rotate(-28 24 24)" />
  </svg>`;
}
