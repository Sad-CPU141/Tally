import { html, render, useState, useEffect } from './vendor/preact-htm.js';
import * as store from './lib/store.js';
import { loadCatalog } from './lib/catalog.js';
import { Icon, nav, useRoute, SheetHost, ToastHost, MODES, onModeSwitch, toast } from './lib/ui.js';
import { Today } from './screens/today.js';
import { Train, RoutineEdit, WorkoutView, ExerciseScreen, Library } from './screens/train.js';
import { Workout, RestBar, Summary } from './screens/workout.js';
import { Stats, Insights, CardDetail, EditDash } from './screens/stats.js';
import { Body, MeasureDetail } from './screens/body.js';
import { Photos } from './screens/photos.js';
import { Recipe } from './screens/recipe.js';
import { FoodPage, BrandPage } from './screens/foodpage.js';
import { Me, Onboarding } from './screens/me.js';
import { Food, AddFood, Targets } from './screens/food.js';
import { Leaderboard } from './screens/friends.js';
import { startCloud } from './lib/cloud.js';

const SCREENS = {
  today: Today, train: Train, food: Food, stats: Stats, me: Me,
  addFood: AddFood, targets: Targets, insights: Insights, body: Body, measure: MeasureDetail, photos: Photos, recipe: Recipe, foodItem: FoodPage, brand: BrandPage,
  routine: RoutineEdit, workoutView: WorkoutView, exercise: ExerciseScreen, library: Library,
  workout: Workout, summary: Summary, card: CardDetail, editDash: EditDash, friends: Leaderboard,
};
const NO_TABS = new Set(['workout', 'summary']);

// When a new version of Tally has been downloaded, offer a one-tap refresh.
let updateReady = false;
const updateListeners = new Set();
if ('serviceWorker' in navigator) {
  let had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) { updateReady = true; updateListeners.forEach(f => f(true)); } had = true; });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {});
  });
}

function App() {
  const [state, setState] = useState(store.get());
  const [upd, setUpd] = useState(updateReady);
  useEffect(() => { updateListeners.add(setUpd); return () => updateListeners.delete(setUpd); }, []);
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
      ${upd && !state.active ? html`<button class="update-bar" onClick=${() => location.reload()}><${Icon} name="bolt" size=${16} /> Tally was updated. Tap to load the new version.</button>` : null}
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

// Tap Tally (top left) to flip between Gym and Food, landing on the matching page:
// Today ↔ Diary, Train ↔ Targets, Stats ↔ Insights. Body and Me are shared, so you stay put.
const TWIN = { today: 'food', food: 'today', train: 'targets', targets: 'train', stats: 'insights', insights: 'stats' };
onModeSwitch(() => {
  const next = store.get().settings.mode === 'food' ? 'gym' : 'food';
  const root = nav.root().name;
  store.update(st => { st.settings.mode = next; });
  if (root !== 'body' && root !== 'me') nav.tab(TWIN[root] || MODES[next][0][0]);
  try { navigator.vibrate && navigator.vibrate(10); } catch (e) {}
  toast(next === 'food' ? 'Food mode' : 'Gym mode', 1200);
});

Promise.all([store.load(), loadCatalog()]).then(() => {
  // Open in the mode you were last in.
  const m = store.get().settings.mode === 'food' ? 'food' : 'gym';
  if (store.get().settings.onboarded) {
    if (store.get().active) {
      // A workout was in progress when the app closed: go straight back to it.
      store.update(st => { st.settings.mode = 'gym'; });
      nav.tab('today'); nav.go('workout');
    } else nav.tab(MODES[m][0][0]);
  }
  startCloud();
  const app = document.getElementById('app');
  app.innerHTML = '';
  render(html`<${App} />`, app);
});
