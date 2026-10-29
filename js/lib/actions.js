// User actions that several screens share.

import { html, useState } from '../vendor/preact-htm.js';
import * as store from './store.js';
import { openSheet, closeSheet, SheetHead, toast } from './ui.js';
import { bwUnit, todayKey, toUnit, fromUnit, round, fmtNum } from './util.js';

export function logBodyweight(prefillKey) {
  const s = store.get();
  const unit = bwUnit(s);
  const sorted = s.bodyweight.slice().sort((a, b) => a.date < b.date ? -1 : 1);
  const last = sorted[sorted.length - 1];
  function Body() {
    const [date, setDate] = useState(prefillKey || todayKey());
    const existing = store.get().bodyweight.find(b => b.date === date);
    const [val, setVal] = useState(existing ? fmtNum(toUnit(existing.kg, unit), 1) : '');
    const save = () => {
      const v = parseFloat(val);
      if (!v || v <= 0) { toast('Enter your weight first'); return; }
      store.update(st => {
        st.bodyweight = st.bodyweight.filter(b => b.date !== date);
        st.bodyweight.push({ date, kg: round(fromUnit(v, unit), 3) });
      });
      closeSheet();
      toast('Weight logged');
    };
    return html`
      <${SheetHead} title="Log bodyweight" />
      <div class="field">
        <label for="bw-val">Weight (${unit})</label>
        <input id="bw-val" class="input num" style="height:64px;font-size:28px;text-align:center" inputmode="decimal" autofocus
          placeholder=${last ? fmtNum(toUnit(last.kg, unit), 1) : unit === 'lb' ? '180.0' : '82.0'}
          value=${val} onInput=${e => setVal(e.target.value)} onKeyDown=${e => e.key === 'Enter' && save()} />
      </div>
      <div class="field">
        <label for="bw-date">Date</label>
        <input id="bw-date" class="input" type="date" value=${date} max=${todayKey()} onInput=${e => setDate(e.target.value)} />
      </div>
      <p class="tiny muted" style="margin:0">Weigh in at the same time each day, ideally in the morning. The trend line smooths out daily water swings.</p>
      <div class="grid2">
        ${existing ? html`<button class="btn danger" onClick=${() => { store.update(st => { st.bodyweight = st.bodyweight.filter(b => b.date !== date); }); closeSheet(); toast('Entry removed'); }}>Remove</button>` : html`<button class="btn" onClick=${closeSheet}>Cancel</button>`}
        <button class="btn primary" onClick=${save}>Save</button>
      </div>`;
  }
  openSheet(() => html`<${Body} />`);
}
