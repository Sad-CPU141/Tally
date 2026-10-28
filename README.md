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
   - Routines, templates (PPL, Upper/Lower, Full Body, Conditioning), custom exercises
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
   - 20 analytics cards in total, customizable Today dashboard
4. **Polish** — progress photos, challenges, more customization
5. **Accounts + friends (last)** — Firebase Google sign-in, automatic backup, friend codes, leaderboards

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
