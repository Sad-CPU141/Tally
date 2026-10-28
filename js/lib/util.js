// Units, dates and formatting.

export const KG_PER_LB = 0.45359237;
export const KM_PER_MI = 1.609344;

export const toUnit = (kg, unit) => unit === 'lb' ? kg / KG_PER_LB : kg;
export const fromUnit = (v, unit) => unit === 'lb' ? v * KG_PER_LB : v;
export const stepFor = unit => unit === 'lb' ? 5 : 2.5;

export function round(n, dp = 1) { const f = 10 ** dp; return Math.round(n * f) / f; }

export function fmtNum(n, dp = 1) {
  if (n == null || isNaN(n)) return '–';
  const r = round(n, dp);
  return Number.isInteger(r) ? String(r) : r.toFixed(dp);
}

// Weight in the user's unit, no unit label.
export const w = (kg, unit, dp = 1) => kg == null ? '–' : fmtNum(toUnit(kg, unit), dp);

export function fmtBig(n) {
  if (n == null || isNaN(n)) return '–';
  if (Math.abs(n) >= 1e6) return fmtNum(n / 1e6, 2) + 'M';
  if (Math.abs(n) >= 1e4) return fmtNum(n / 1e3, 1) + 'k';
  return Math.round(n).toLocaleString();
}

export const toDist = (km, u) => u === 'mi' ? km / KM_PER_MI : km;
export const fromDist = (v, u) => u === 'mi' ? v * KM_PER_MI : v;

export function fmtDur(sec) {
  if (sec == null || isNaN(sec)) return '–';
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
export function fmtMins(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

// Parse "1:30", "90", "1:02:03" into seconds.
export function parseDur(str) {
  if (str == null || str === '') return null;
  const parts = String(str).split(':').map(p => parseFloat(p));
  if (parts.some(isNaN)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

export function dayKey(d) {
  d = d instanceof Date ? d : new Date(d);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function fromKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
export const todayKey = () => dayKey(new Date());

export function startOfDay(d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d; }
export function startOfWeek(d, weekStart = 1) {
  d = startOfDay(d);
  const diff = (d.getDay() - weekStart + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}
export function addDays(d, n) { d = new Date(d); d.setDate(d.getDate() + n); return d; }
export const DAY = 86400000;
export function daysBetween(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / DAY); }

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const fmtDate = d => { d = new Date(d); return `${MON[d.getMonth()]} ${d.getDate()}`; };
export const fmtDateY = d => { d = new Date(d); return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
export const fmtWeekday = d => WD[new Date(d).getDay()];
export const fmtWeekdayLong = d => WD_LONG[new Date(d).getDay()];
export const fmtMonth = d => MON[new Date(d).getMonth()];
export function fmtRel(d) {
  const n = daysBetween(d, new Date());
  if (n === 0) return 'Today';
  if (n === 1) return 'Yesterday';
  if (n < 7) return fmtWeekdayLong(d);
  return fmtDate(d);
}
export function fmtTime(d) {
  d = new Date(d);
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
  return `${h}:${m}${ap}`;
}

export function signed(n, dp = 1) {
  if (n == null || isNaN(n)) return '–';
  const r = round(n, dp);
  if (r === 0) return '±0';
  return (r > 0 ? '+' : '−') + fmtNum(Math.abs(r), dp);
}

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export function download(name, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
