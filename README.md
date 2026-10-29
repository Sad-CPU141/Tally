# Tally — Gym Macro Tracker

A combined gym and food tracker for Xrazt and 8 friends. Installs to the home screen on iPhone and Android, works offline in the gym, and is built to be more analytical than the paid apps while staying calm and organized.

## Decisions so far

| Area | Decision |
|---|---|
| Platform | Home-screen web app (PWA), hosted on GitHub Pages |
| Users | Xrazt + 8 friends |
| Look | Dark by default, light and "match phone" options, 5 accent colours |
| Storage | Local-first: everything saves to the phone (IndexedDB) instantly, works offline |
| Accounts | Google sign-in via Firebase (free Spark plan, no billing) for automatic backup and restore on a new phone |
| Photos | Stay on the phone only, compressed; included in the manual export file |
| Social | Friends via invite code, opt-in leaderboards; bodyweight, food and photos private by default. Friends only ever read a summary doc, enforced by Firestore rules |
| Analytics | A library of cards. Each has a compact tile for Today and a detail page. Pin, remove and reorder freely |
| Laptop | Not a goal, but works in any browser |

## Phases

1. **Core gym** ✓
   - Your own routines (no templates), 58 built-in exercises plus custom ones
   - Starting a workout while one is open asks to save it, discard it, or go back
   - 700 exercises: the 58 built-ins plus 642 from RepDB's free tier (`data/catalog.json`, images in `media/rd/`), searchable by name, muscle and equipment
   - Start/end images flipping to show the movement; built-in images work offline from install, catalog images once viewed; tap the name for its page: overview (this workout, records, rep maxes, e1RM chart), how-to steps, and full history
   - Workout logging: previous numbers per set (matched by set type), tick an empty set to accept the suggested numbers, warm-ups carried over
   - Set types (warm-up, working, drop, failure), per-exercise notes and rest times
   - Rest timer that starts on its own, with ±15s and a sound/vibration at the end
   - Weight × reps, bodyweight, timed holds, distance + time cardio, sprints
   - PR detection (heaviest, est. 1RM, best set, reps, fastest sprint, longest run)
   - Bodyweight log with smoothed trend and weekly rate
2. **Food** ✓
   - Daily log with calories left, macros, fiber/sugar/sodium, water
   - Customizable meals (rename, reorder, add up to 8)
   - Add food from recent, my foods, saved meals, Open Food Facts search, barcode scan (camera, or type the number), quick add, or create your own
   - Copy yesterday, save a meal, log a meal again
   - Targets: calculator (Mifflin–St Jeor + goal) and manual, with separate training and rest day targets
3. **Combined insights** ✓
   - Adaptive burn (TDEE from intake + trend weight), strength vs deficit, protein vs progress, weekly score
   - 21 analytics cards in total, customizable dashboards
4. **Modes + training extras** ✓
   - Tap **Tally** (top left) to flip between Gym mode (Today, Train, Body, Stats, Me) and Food mode (Diary, Insights, Body, Targets, Me); each has its own dashboard
   - Body tab: bodyweight trend plus waist, chest, hips, arms, thighs, calves, shoulders, neck and body fat, with charts
   - Plate calculator (per-side plates, your bar and your gym's plates), from any barbell exercise or Me
   - Supersets in routines and workouts; the rest timer waits until the last exercise of the superset
   - Weekly schedule: pick a routine (or rest) per weekday; Today follows it and Food mode's training days match it
5. **Polish** — progress photos, auto-progression hints, challenges
6. **Accounts + friends (last)** — Firebase Google sign-in, automatic backup, friend codes, leaderboards

## Credits

- Exercise images: [Exercise data by RepDB (repdb.co)](https://repdb.co), free tier, resized in `media/rd/` (map in `js/lib/rdmedia.js`). In-app use only; not to be redistributed as a dataset.
- Exercise steps and details: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (public domain), in `js/lib/exmedia.js`.
- Food data: [Open Food Facts](https://world.openfoodfacts.org).

## How it's built

No build step. Plain ES modules, so it deploys to GitHub Pages as-is.

```
index.html              app shell, theme applied before first paint
manifest.webmanifest    home-screen install
sw.js                   offline cache (bump VERSION on every deploy)
css/app.css             design tokens + all styles
fonts/                  Archivo (display), Geist (body), Geist Mono (numbers), self-hosted for offline
js/vendor/              Preact + htm, ZXing (barcode fallback, loaded only when scanning)
js/app.js               routing between screens, tab bar
js/lib/store.js         local-first state, IndexedDB persistence
js/lib/analytics.js     training calculations (e1RM, PRs, weekly buckets, weight trend, streaks)
js/lib/food.js          nutrition math, targets, calculator, Open Food Facts, food analytics
js/lib/cards.js         analytics card library (compact + detail views)
js/lib/charts.js        SVG line, bar and sparkline charts
js/lib/exercises.js     built-in exercises and templates
js/screens/*.js         Today, Train, Workout, Food, Stats, Me
```

### Analytics notes
- **Est. 1RM**: Epley, `weight × (1 + reps/30)`, capped at 12 reps
- **Bodyweight trend**: exponential moving average (10% per day, adjusted for gaps); rate is a least-squares slope over 21 days
- **Sets per muscle**: working sets only; secondary muscles count half
- **Week comparisons**: this week vs the same point last week, so a Wednesday isn't compared to a full week
- **Streak**: consecutive weeks meeting the weekly session goal
- **Adaptive burn**: average intake over logged days minus trend-weight change × 7,700 kcal/kg, over 28 days (needs 10+ logged days)
- **Weekly score**: training 40, protein days 25, calorie days within 10% 20, weigh-ins 15

## Run locally

```
python3 -m http.server 8000
```
Then open http://localhost:8000. The service worker only registers on https (GitHub Pages).

## Deploy

Settings → Pages → Deploy from branch → `main` / root. On each release, bump `VERSION` in `sw.js` so phones fetch the new files.

## Install on a phone
- **iPhone (Safari)**: Share → Add to Home Screen
- **Android (Chrome)**: ⋮ menu → Install app / Add to Home screen
