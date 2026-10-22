// Line of sight past the pines. The course's tree survey (augusta/data/trees.bin: 8 floats per tree — x, z, base height,
// tree height, then species and shape) goes into a 2D grid, so any camera pose can be checked and, if a crown stands between
// the camera and what it looks at, lifted until the view is clear.
import { V, heightAt } from "./course.js";

const T = new Float32Array(await (await fetch("augusta/data/trees.bin")).arrayBuffer()), STRIDE = 8, N = Math.floor(T.length / STRIDE), CELL = 24;
const grid = new Map(), key = (i, j) => i * 100003 + j;
const BASE0 = T[2] - heightAt(T[0], T[1]); // the survey's base heights sit on a fixed offset from the course's terrain (40 m): measured, not assumed
for (let t = 0; t < N; t++) {
  const k = key(Math.floor(T[t * STRIDE] / CELL), Math.floor(T[t * STRIDE + 1] / CELL));
  let c = grid.get(k); if (!c) grid.set(k, c = []); c.push(t);
}
const crownR = h => Math.min(9, Math.max(3, h * .2)); // the survey has no crown width: a pine's crown spans about a fifth of its height

function inCrown(x, y, z, pad = 0) { // pad: how far outside a crown still counts (keeps the camera itself clear of foliage)
  const ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
    const c = grid.get(key(i, j)); if (!c) continue;
    for (const t of c) {
      const o = t * STRIDE, base = T[o + 2] - BASE0, h = T[o + 3];
      if (y < base + h * .3 - pad || y > base + h + pad) continue; // below the crown (bare trunk) or above the tree
      const r = crownR(h) + pad; if ((x - T[o]) ** 2 + (z - T[o + 1]) ** 2 < r * r) return true;
    }
  }
  return false;
}
// does a crown stand between a camera at `from` and the point it looks at? (the last 12% near the target is not checked)
export function blocked(from, to) {
  const d = from.distanceTo(to), n = Math.min(160, Math.ceil(d / 3));
  for (let s = 1; s < n * .88; s++) { const f = s / n; if (inCrown(from.x + (to.x - from.x) * f, from.y + (to.y - from.y) * f, from.z + (to.z - from.z) * f)) return true; }
  return false;
}
// the camera position, lifted in steps until nothing blocks its view of the target (at most `lift` metres higher)
export function clearView(pos, target, lift = 90) {
  const p = V(pos.x, pos.y, pos.z);
  for (let k = 0; k < 9 && (inCrown(p.x, p.y, p.z, 7) || blocked(p, target)); k++) p.y += lift / 9; // no foliage beside the lens, none in the way
  return p;
}
// the lowest height a camera passing over (x, z) should fly to stay above the canopy
export function canopyTop(x, z, terrain) {
  let top = terrain; const ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (const t of grid.get(key(i, j)) || []) { const o = t * STRIDE; top = Math.max(top, T[o + 2] - BASE0 + T[o + 3]); }
  return top;
}
export const treeCount = N;
