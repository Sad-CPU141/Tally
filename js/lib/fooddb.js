// Built-in food database: 8,133 everyday foods from USDA FoodData Central
// (SR Legacy + Foundation Foods, public domain), per 100 g with common portions.
// Ships with the app (data/foods.json, ~250 KB zipped), so search is instant, offline and unlimited.
// Packaged/branded products and barcodes still come from Open Food Facts.

let db = null, loading = null;

const SKIP = new Set(['and', 'or', 'with', 'without', 'the', 'of', 'a', 'in']);
// Light stemming so "eggs" finds "Egg", "potatoes" finds "Potato", "berries" finds "Berry".
export function stem(w) {
  w = w.toLowerCase();
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 4 && /(oes|ches|shes|xes)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
  return w;
}
const words = s => s.toLowerCase().replace(/%/g, ' pct ').split(/[^a-z0-9]+/).filter(Boolean);

// Everyday words people type → the words USDA uses.
const SYN = { yoghurt: 'yogurt', yogourt: 'yogurt', hamburger: 'ground', mince: 'ground', minced: 'ground', prawn: 'shrimp', courgette: 'zucchini', aubergine: 'eggplant', capsicum: 'pepper', coriander: 'cilantro', chickpea: 'chickpea', garbanzo: 'chickpea', oatmeal: 'oat', porridge: 'oat', steak: 'beef', grilled: 'grilled', boiled: 'boiled', fries: 'french', chips: 'chip', soda: 'carbonated', pop: 'carbonated', whey: 'whey', pb: 'peanut', avo: 'avocado' };

// Nudge plain, everyday versions above processed ones ("Chicken, breast, roasted" before "Chicken breast tenders, breaded").
const PLAIN = { raw: 2, cooked: 3, roasted: 3, boiled: 2, grilled: 2, whole: 3, plain: 3, skinless: 3, boneless: 2, only: 1, lean: 1, regular: 1, white: 1, large: 1 };
const PROCESSED = { breaded: 6, batter: 6, deli: 6, roll: 6, prepackaged: 6, tender: 5, nugget: 6, shake: 6, bar: 5, mix: 4, imitation: 6, dried: 4, dehydrated: 6, powder: 4, frozen: 2, canned: 1, fried: 2, sliced: 2, flavor: 4, babyfood: 8, unenriched: 1, unprepared: 2, dry: 5, human: 10, buffalo: 6, buttermilk: 3, chocolate: 2, sheep: 4, goat: 3, condensed: 4, evaporated: 3, filled: 4 };
const GROUP = new Set(['fish', 'nut', 'cheese', 'cereal', 'beverage', 'spice', 'seed', 'snack', 'candy', 'sauce', 'soup', 'game']);
const PENALTY = { 'Fast Foods': 18, 'Restaurant Foods': 18, 'Baby Foods': 30, 'American Indian/Alaska Native Foods': 30, 'Meals, Entrees, and Side Dishes': 6 };

export function loadFoodDB() {
  if (db) return Promise.resolve(db);
  if (!loading) loading = fetch(new URL('../../data/foods.json', import.meta.url)).then(r => { if (!r.ok) throw new Error('db'); return r.json(); }).then(j => {
    j.index = j.foods.map(f => {
      const ws = words(f[1]).map(stem);
      const seg = words(f[1].split(',')[0]).length;
      // USDA files some foods under a group word ("Fish, salmon", "Nuts, almonds", "Cheese, cheddar").
      const first = GROUP.has(ws[0]) && ws[1] ? ws[1] : ws[0];
      return { ws, first, first0: ws[0], seg, len: ws.length, lower: f[1].toLowerCase(), brand: /[A-Z]{3,}/.test(f[1]) };
    });
    db = j; return j;
  }).catch(e => { loading = null; throw e; });
  return loading;
}
export const foodDBReady = () => !!db;

export function toFood(f) {
  const [id, name, cat, kcal, p, c, fat, fiber, sugar, sodium, portions] = f;
  return {
    id: 'usda-' + id, name, brand: '', source: 'usda', cat: db ? db.cats[cat] : '',
    per100: { kcal: kcal || 0, p: p || 0, c: c || 0, f: fat || 0, fiber: fiber || 0, sugar: sugar || 0, sodium: sodium || 0 },
    portions: portions || [], serving: null,
  };
}

// Every typed word must start a word in the food's name (any order). Simple, common foods rank first.
export function searchFoodDB(q, limit = 40) {
  if (!db) return [];
  const qs = words(q).filter(w => !SKIP.has(w)).map(w => stem(SYN[w] || w));
  if (!qs.length) return [];
  const phrase = q.toLowerCase().trim();
  const out = [];
  db.index.forEach((ix, i) => {
    let ok = true;
    for (const t of qs) { if (!ix.ws.some(w => w.startsWith(t))) { ok = false; break; } }
    if (!ok) return;
    const f = db.foods[i];
    let s = -0.5 * ix.len;
    if (ix.first.startsWith(qs[0]) || ix.first0.startsWith(qs[0])) s += 20;
    if (ix.seg > qs.length && !GROUP.has(ix.first0)) s -= 2 * (ix.seg - qs.length); // "Rice noodles" below "Rice, white" for "rice"
    if (qs.every(t => ix.ws.includes(t))) s += 6; // whole words, not just prefixes
    for (const w of ix.ws) s += (PLAIN[w] || 0) - (PROCESSED[w] || 0);
    if (f[0] > 1000000) s += 2; // Foundation Foods: newer, plainer names
    if (ix.brand) s -= 12;
    s -= PENALTY[db.cats[f[2]]] || 0;
    out.push([s, i]);
  });
  out.sort((a, b) => b[0] - a[0]);
  const seen = new Set(), res = [];
  for (const [, i] of out) {
    const k = db.foods[i][1].toLowerCase();
    if (seen.has(k)) continue; // Foundation Foods lists some foods several times (different samples)
    seen.add(k); res.push(toFood(db.foods[i]));
    if (res.length >= limit) break;
  }
  return res;
}
