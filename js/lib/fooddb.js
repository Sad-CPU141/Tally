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

// ---------- everyday foods (clean names with variants) and restaurant menus ----------
let generic = null, rest = null, micros = null, byId = null;
const url = p => new URL('../../data/' + p, import.meta.url);
const getJSON = p => fetch(url(p)).then(r => { if (!r.ok) throw new Error(p); return r.json(); });

// Everything search needs: the USDA list, the clean everyday list and restaurant menus.
export async function loadAll() {
  await loadFoodDB();
  if (!generic) generic = await getJSON('generic.json');
  if (!rest) {
    const j = await getJSON('restaurants.json');
    j.brands.forEach(b => {
      b.key = norm(b.name);
      b.keys = [b.key, ...b.aliases.map(norm)];
      b.items.forEach((it, i) => { it.i = i; it.ws = words(it.n).map(stem); });
    });
    rest = j;
  }
  if (!byId) { byId = new Map(); db.foods.forEach(f => byId.set(f[0], f)); }
  return true;
}
export const allReady = () => !!(db && generic && rest);
export function loadMicros() { return micros ? Promise.resolve(micros) : getJSON('food-micros.json').then(j => (micros = j)); }
export const microsFor = id => micros && micros.m[String(id)] ? Object.fromEntries(micros.keys.map((k, i) => [k, micros.m[String(id)][i]]).filter(([, v]) => v != null)) : null;
export const MICRO_INFO = { // name, unit, daily value (FDA, adults)
  a: ['Vitamin A', 'µg', 900], c: ['Vitamin C', 'mg', 90], d: ['Vitamin D', 'µg', 20], e: ['Vitamin E', 'mg', 15], k: ['Vitamin K', 'µg', 120],
  b1: ['Thiamin (B1)', 'mg', 1.2], b2: ['Riboflavin (B2)', 'mg', 1.3], b3: ['Niacin (B3)', 'mg', 16], b6: ['Vitamin B6', 'mg', 1.7], b9: ['Folate', 'µg', 400], b12: ['Vitamin B12', 'µg', 2.4],
  ca: ['Calcium', 'mg', 1300], fe: ['Iron', 'mg', 18], mg: ['Magnesium', 'mg', 420], 'k+': ['Potassium', 'mg', 4700], zn: ['Zinc', 'mg', 11],
};

const norm = s => String(s || '').toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const genericWords = g => g._ws || (g._ws = [...words(g.n), ...g.a.flatMap(a => words(a))].map(stem));

export const usdaRow = id => byId && byId.get(+id);
export const genericByName = n => generic && generic.find(g => g.n === n);
export const genericFor = id => generic && generic.find(g => g.v.some(v => v[1] === +id));
export const brandById = id => rest && rest.brands.find(b => b.id === id);
export const brands = () => (rest ? rest.brands : []);

// A USDA row as a loggable food, named the friendly way when it's one of the everyday foods.
export function usdaFood(id, label) {
  const f = usdaRow(id);
  if (!f) return null;
  const base = toFood(f);
  const g = genericFor(id);
  if (g) {
    const v = g.v.find(x => x[1] === +id);
    base.name = v && v[0] ? `${g.n}, ${v[0].charAt(0).toLowerCase() + v[0].slice(1)}` : g.n;
    base.usdaName = f[1];
  }
  if (label) base.name = label;
  return base;
}

// A restaurant item (one size) as a loggable food. Nutrition is per serving.
export function restFood(brandId, itemIndex, sizeIndex = 0) {
  const b = brandById(brandId); if (!b) return null;
  const it = b.items[itemIndex]; if (!it) return null;
  const s = it.s[sizeIndex] || it.s[0];
  const [label, kcal, fat, sat, sodium, carbs, fiber, sugar, p] = s;
  const sized = it.s.length > 1 ? `${it.n} (${label})` : it.n;
  return {
    id: `r-${b.id}-${norm(sized).replace(/ /g, '-')}`, name: sized, brand: b.name, source: 'restaurant', brandId: b.id, item: itemIndex, size: sizeIndex,
    serving: { label: it.s.length > 1 ? label : (label === '1 item' ? '1 serving' : label), g: null },
    perServing: { kcal, p, c: carbs, f: fat, fiber, sugar, sodium, satfat: sat }, per100: null,
  };
}

// One search across everything. Returns { foods, brands, items, usda }.
export function searchAll(q) {
  const out = { foods: [], brands: [], items: [], usda: [] };
  if (!allReady()) return out;
  const nq = norm(q);
  const qs = words(q).filter(w => !SKIP.has(w)).map(w => stem(SYN[w] || w));
  if (!qs.length) return out;
  // Everyday foods: every word must start a word of the name or an alias.
  out.foods = generic.map(g => {
    const ws = genericWords(g);
    if (!qs.every(t => ws.some(w => w.startsWith(t)))) return null;
    const nm = words(g.n).map(stem);
    let s = 0;
    if (nm[0] && nm[0].startsWith(qs[0])) s += 10;
    if (qs.every(t => nm.includes(t))) s += 6;
    if (norm(g.n) === nq) s += 20;
    s -= nm.length;
    return [s, g];
  }).filter(Boolean).sort((a, b) => b[0] - a[0]).map(x => x[1]).slice(0, 8);
  // Restaurants: a brand matches its name or nickname; the rest of the query searches its menu.
  for (const b of rest.brands) {
    const hit = b.keys.find(k => k.startsWith(nq) || nq.startsWith(k) || (nq.length >= 3 && k.split(' ').some(w => w.startsWith(nq))));
    if (hit) out.brands.push(b);
    const rem = hit && nq.startsWith(hit) ? words(nq.slice(hit.length)).map(stem) : qs;
    if (!rem.length) continue;
    for (const it of b.items) {
      if (rem.every(t => it.ws.some(w => w.startsWith(t)))) out.items.push({ b, it, s: (it.ws[0].startsWith(rem[0]) ? 5 : 0) - it.ws.length * 0.3 + (hit ? 5 : 0) });
    }
  }
  out.items.sort((a, b) => b.s - a.s);
  out.items = out.items.slice(0, 12);
  out.usda = searchFoodDB(q, 40);
  return out;
}

// Short summary for a list row: "Grilled, Roasted, Raw +2 · 106–187 kcal / 100 g".
export function genericSummary(g) {
  const k = g.v.map(v => (usdaRow(v[1]) || [])[3]).filter(x => x != null);
  const lo = Math.round(Math.min(...k)), hi = Math.round(Math.max(...k));
  const names = g.v.map(v => v[0]).filter(Boolean);
  const ways = names.length > 1 ? `${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''} · ` : '';
  return `${ways}${lo === hi ? lo : `${lo}–${hi}`} kcal / 100 g`;
}
