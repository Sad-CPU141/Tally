import { html, render, useState, useEffect } from './vendor/preact-htm.js';
import * as store from './lib/store.js';
import { Icon, nav, useRoute, SheetHost, ToastHost, TABS } from './lib/ui.js';
import { Today } from './screens/today.js';
import { Train, RoutineEdit, WorkoutView, ExerciseScreen, Library } from './screens/train.js';
import { Workout, RestBar, Summary } from './screens/workout.js';
import { Stats, CardDetail, EditDash } from './screens/stats.js';
import { Me, Onboarding } from './screens/me.js';

const SCREENS = {
  today: Today, train: Train, stats: Stats, me: Me,
  routine: RoutineEdit, workoutView: WorkoutView, exercise: ExerciseScreen, library: Library,
  workout: Workout, summary: Summary, card: CardDetail, editDash: EditDash,
};
const TAB_META = [['today', 'Today', 'today'], ['train', 'Train', 'train'], ['stats', 'Stats', 'stats'], ['me', 'Me', 'me']];
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

  const Screen = SCREENS[route.name] || Today;
  const rootTab = nav.depth() === 1 ? route.name : null;
  const hideTabs = NO_TABS.has(route.name);
  const hasRest = !!(state.active && state.active.rest);
  return html`
    <div class=${'shell' + (hideTabs ? ' no-tabs' : '') + (hasRest ? ' has-rest' : '')}>
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

store.load().then(() => {
  const app = document.getElementById('app');
  app.innerHTML = '';
  render(html`<${App} />`, app);
});
