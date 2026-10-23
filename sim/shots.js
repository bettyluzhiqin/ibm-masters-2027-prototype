// Shot data: the 2016–2026 export (data/shots.bin, one Int16 row per shot) and the Freeplay filters matched straight against it.
import { D, M, toW } from "./course.js";

const RAWI = new Int16Array(await (await fetch("data/shots.bin?v=5")).arrayBuffer());
const W = D.fields.length, F = Object.fromEntries(D.fields.map((f, i) => [f, i]));
export const NSHOT = D.count, QN = D.quant;
export const at = (i, f) => RAWI[i * W + F[f]];
export const posOf = (i, a, b) => toW(at(i, a) / QN, at(i, b) / QN); // a shot's start ("fx","fz") or end ("tx","tz") in world metres

const ENUM = { Shot: ["type", ["Tee", "Approach", "Chip", "Putt"]], Score: ["score", D.scores], Region: ["region", D.regions], Sector: ["sector", D.sectors] };
const PIDX = new Map(D.players.map((n, i) => [n, i]));
const CHAMP = D.players.map(n => M.winners.includes(n));
// each player's last stroke on each hole they played (Shot › Last stroke): the highest stroke number in that player-hole
const holeKey = i => ((at(i, "year") * 5 + at(i, "round")) * 400 + at(i, "player")) * 19 + at(i, "hole");
const LAST = new Map(); for (let i = 0; i < NSHOT; i++) { const k = holeKey(i), n = at(i, "stroke"); if (n > (LAST.get(k) || 0)) LAST.set(k, n); }
function compile(f) {
  return Object.entries(f).map(([k, v]) => {
    if (k === "Hole") { const s = new Set(v.map(Number)); return i => s.has(at(i, "hole")); }
    if (k === "Round") { const s = new Set(v.map(r => +r.slice(1))); return i => s.has(at(i, "round")); }
    if (k === "Player") { const s = new Set(v.map(n => PIDX.get(n))); return i => s.has(at(i, "player")); }
    if (k === "Trophy") { const s = new Set(v.map(x => x === "Masters champion")); return i => s.has(CHAMP[at(i, "player")]); }
    if (k === "ShotPos") return v[0] === "First stroke" ? i => at(i, "stroke") === 1 : i => at(i, "stroke") === LAST.get(holeKey(i));
    if (k === "Year") return i => { const y = at(i, "year") + 2000; return y >= v[0] && y <= v[1]; };
    if (k === "Distance") return i => { const d = at(i, "yd"); return d >= v[0] && d <= v[1]; };
    if (k === "Stroke") return i => { const n = at(i, "stroke"); return n >= v[0] && (v[1] >= 8 || n <= v[1]); };
    if (ENUM[k]) { const [field, names] = ENUM[k], s = new Set(v.map(x => names.indexOf(x))); return i => s.has(at(i, field)); }
    return () => true;
  });
}
// the rows matching a filter set; recent answers are kept, so the same selection (a chapter revisited, A/B groups) is never scanned twice
const recent = new Map();
export function pickShots(f) {
  if (!f) return [];
  const key = JSON.stringify(f); let rows = recent.get(key);
  if (!rows) {
    const t = compile(f); rows = [];
    for (let i = 0; i < NSHOT; i++) if (t.every(fn => fn(i))) rows.push(i);
    if (recent.size >= 24) recent.delete(recent.keys().next().value);
    recent.set(key, rows);
  }
  return rows;
}

const WATER = D.regions.indexOf("Water");
export function stats(rows) { // the overview card's numbers
  if (!rows.length) return null;
  let yd = 0, water = 0; const holes = new Map();
  for (const i of rows) {
    yd += at(i, "yd"); if (at(i, "region") === WATER) water++;
    holes.set(holeKey(i), [at(i, "score"), at(i, "count")]);
  }
  const dist = Array(D.scores.length).fill(0); let n = 0, strokes = 0, m = 0;
  for (const [sc, c] of holes.values()) { if (sc >= 0) { dist[sc]++; n++; } if (c > 0) { strokes += c; m++; } }
  return { avgYd: Math.round(yd / rows.length), water: water / rows.length, holes: n, dist: dist.map(d => n ? d / n : 0), under: n ? dist.slice(0, 4).reduce((a, b) => a + b, 0) / n : 0, avgStrokes: m ? strokes / m : 0 };
}


// the box around the selection's starts and ends (sampled), for framing; null when there is nothing to frame
export function boxOf(lists, pad) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, n = 0;
  lists.forEach(rows => { const k = Math.max(1, Math.ceil(rows.length / 4000)); for (let j = 0; j < rows.length; j += k) {
    for (const [a, b] of [["fx", "fz"], ["tx", "tz"]]) { const [x, z] = posOf(rows[j], a, b);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); n++; } } });
  return n ? { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, r: Math.max(x1 - x0, (z1 - z0) * 16 / 9) / 2 + pad } : null;
}
