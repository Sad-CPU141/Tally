import { html, render, useState, useEffect } from './vendor/preact-htm.js';
import * as store from './lib/store.js';
import { loadCatalog } from './lib/catalog.js';
import { Icon, nav, useRoute, SheetHost, ToastHost, MODES, onModeSwitch, toast } from './lib/ui.js';
import { Today } from './screens/today.js';
import { Train, RoutineEdit, WorkoutView, ExerciseScreen, Library } from './screens/train.js';
import { Workout, RestBar, Summary } from './screens/workout.js';
import { Stats, Insights, CardDetail, EditDash } from './screens/stats.js';
import { Body, MeasureDetail } from './screens/body.js';
import { Me, Onboarding } from './screens/me.js';
import { Food, AddFood, Targets } from './screens/food.js';

const SCREENS = {
  today: Today, train: Train, food: Food, stats: Stats, me: Me,
  addFood: AddFood, targets: Targets, insights: Insights, body: Body, measure: MeasureDetail,
  routine: RoutineEdit, workoutView: WorkoutView, exercise: ExerciseScreen, library: Library,
  workout: Workout, summary: Summary, card: CardDetail, editDash: EditDash,
};
const NO_TABS = new Set(['workout', 'summary']);

function App() {
  const [state, setState] = useState(store.get());
  const route = useRoute();
  useEffect(() => store.subscribe(setState), []);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const fn = () => store.applyLook();
    mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn);
  }, []);

  if (!state.settings.onboarded) return html`<${Onboarding} /><${ToastHost} />`;

  const mode = state.settings.mode === 'food' ? 'food' : 'gym';
  const TAB_META = MODES[mode];

  const Screen = SCREENS[route.name] || Today;
  const rootTab = nav.depth() === 1 ? route.name : null;
  const hideTabs = NO_TABS.has(route.name);
  const hasRest = !!(state.active && state.active.rest);
  return html`
    <div class=${'shell mode-' + mode + (hideTabs ? ' no-tabs' : '') + (hasRest ? ' has-rest' : '')}>
      <${Screen} key=${route.name + JSON.stringify(route.params)} state=${state} params=${route.params} />
      ${state.active ? html`<${RestBar} state=${state} />` : null}
      ${!hideTabs ? html`<nav class="tabbar" aria-label="Main"><div class="tabbar-in">
        ${TAB_META.map(([id, label, icon]) => html`<button class="tab" aria-current=${rootTab === id ? 'page' : null} onClick=${() => nav.tab(id)}>
          <${Icon} name=${icon} size=${24} /><span>${label}</span></button>`)}
      </div></nav>` : null}
    </div>
    <${SheetHost} />
    <${ToastHost} />`;
}

// Tap Tally (top left) to flip between Gym and Food. Each mode opens on its first tab.
onModeSwitch(() => {
  const next = store.get().settings.mode === 'food' ? 'gym' : 'food';
  store.update(st => { st.settings.mode = next; });
  nav.tab(MODES[next][0][0]);
  try { navigator.vibrate && navigator.vibrate(10); } catch (e) {}
  toast(next === 'food' ? 'Food mode' : 'Gym mode', 1200);
});

Promise.all([store.load(), loadCatalog()]).then(() => {
  // Open in the mode you were last in.
  const m = store.get().settings.mode === 'food' ? 'food' : 'gym';
  if (store.get().settings.onboarded) nav.tab(MODES[m][0][0]);
  const app = document.getElementById('app');
  app.innerHTML = '';
  render(html`<${App} />`, app);
});
