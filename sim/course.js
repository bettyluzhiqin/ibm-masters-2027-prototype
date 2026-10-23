// The course: the Augusta WebGPU reconstruction (augusta/) in a same-origin iframe behind the UI, and the geometry every layer
// shares: our data's coordinates → its world (metres), terrain height, the 18 holes. This module resolves once the course is up.
export const frame = document.getElementById("frame");
export const ifr = document.createElement("iframe");
ifr.id = "simCanvas"; ifr.src = "augusta/index.html?v=3"; // bump when augusta/ changes: the frame keeps its own cache
ifr.title = "Augusta National course"; ifr.style.border = "0";
frame.prepend(ifr);
// a veil over the course in the screen's night green: Idle fades through it from one hole to the next instead of flying
export const veil = document.createElement("div");
Object.assign(veil.style, { position: "absolute", inset: "0", background: "var(--background)", opacity: "0", transition: "opacity .7s cubic-bezier(.2,0,.38,.9)", pointerEvents: "none" });
ifr.after(veil);
export const AW = await new Promise(res => { const t = setInterval(() => { const w = ifr.contentWindow; if (w?.app?.shots && w.director && w.world) { clearInterval(t); res(w); } }, 200); });
export const THREE = AW.THREE, TSL = THREE.TSL;
export const tok = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(); // colour tokens from css/app.css
export const { scene, camera } = AW.app;
export const director = AW.director, controls = director.controls, world = AW.world;

// its own explorer UI (title, panels, hole bar, compass, markers, shot panel, dialogs) is not part of v2: take it out of the page.
// Its compiled code built it into #ui and #bar at start; removing the nodes leaves that code working on detached elements.
for (const sel of ["#ui", "#bar", "#status", "dialog", ".walk-hint", ".touch-walk", ".course-markers"]) AW.document.querySelectorAll(sel).forEach(n => n.remove());
AW.app.shots.setVisible(false); // our arcs replace its 2026 shot paths
// touches and keys on the course stay in the iframe: pass them up (audio unlock, Idle shortcuts, tour arrows)
AW.addEventListener("pointerdown", () => dispatchEvent(new PointerEvent("pointerdown")), { capture: true });
AW.addEventListener("keydown", e => document.dispatchEvent(new KeyboardEvent("keydown", { key: e.key })));

export const D = window.MASTERS_DATA, M = window.MASTERS;
export const live = { view: null }; // what index.html last asked for: "idle", "round", "filterset", "freeplay", or null (not on screen)

/* our data (v1 export) → its world: a least-squares fit of all 2026 shot endpoints in both exports (41k pairs, residual ~0.2 m,
   i.e. our quantisation). 1 data unit = 9.148 m; the fit mirrors an axis, so "left/right of the hole" swaps but nothing else changes. */
const AX = [0.10079272, -9.14788794, -114.14933244], AZ = [-9.14777703, -0.10101099, 136.37627306];
export const K = 9.148;
export const toW = (x, z) => [AX[0] * x + AX[1] * z + AX[2], AZ[0] * x + AZ[1] * z + AZ[2]];
export const dirW = (dx, dz) => { const x = AX[0] * dx + AX[1] * dz, z = AZ[0] * dx + AZ[1] * dz, l = Math.hypot(x, z) || 1; return [x / l, z / l]; };
export const heightAt = (x, z) => world.heightAt(x, z);
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const V3 = ([x, z], lift = 0) => { const [X, Z] = toW(x, z); return V(X, heightAt(X, Z) + lift, Z); };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const FOVK = Math.tan(THREE.MathUtils.degToRad(16)) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); // v1 framing was tuned at fov 32
// its scene pass feeds normals to ambient occlusion: lines have none and come out black, so give them an up normal
export const withUp = g => { const a = new AW.Float32Array(g.attributes.position.count * 3); for (let i = 1; i < a.length; i += 3) a[i] = 1; g.setAttribute("normal", new THREE.BufferAttribute(a, 3)); return g; };
export function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

/* holes: real tee, pin and fairway line, in world metres */
export const HOLES = D.holes.map(d => {
  const line = d.line.map(p => V3(p)), tee = line[0], green = line[line.length - 1];
  const len = Math.hypot(green.x - tee.x, green.z - tee.z), dir = V(green.x - tee.x, 0, green.z - tee.z).normalize();
  return { n: d.n, name: d.name, par: d.par, yd: d.yd, line, tee, green, len, dir, perp: V(-dir.z, 0, dir.x) };
});
const seg2 = (x, z, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / L2, 0, 1);
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t); };
export function nearestHole(x, z) {
  let best = null, bd = Infinity;
  HOLES.forEach(h => h.line.forEach((q, k) => { if (!k) return; const d = seg2(x, z, h.line[k - 1], q); if (d < bd) { bd = d; best = h; } }));
  return { h: best, d: bd };
}
