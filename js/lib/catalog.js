// The extended exercise library (642 exercises from RepDB's free tier, https://repdb.co).
// Kept out of the user's saved data: it's loaded from data/catalog.json at startup and
// merged with the built-in and custom exercises. Editing a catalog exercise saves a copy
// to the user's own exercises, which then takes priority.

let CATALOG = [];
let byId = new Map();

export async function loadCatalog() {
  try {
    const r = await fetch(new URL('../../data/catalog.json', import.meta.url));
    if (r.ok) {
      CATALOG = await r.json();
      byId = new Map(CATALOG.map(e => [e.id, e]));
    }
  } catch (e) { /* offline on first ever launch: the 58 built-ins still work */ }
  return CATALOG;
}

export const catalog = () => CATALOG;
export const catalogGet = id => byId.get(id);
export const catalogSize = () => CATALOG.length;
