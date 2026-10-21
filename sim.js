// Stand-in for the Unreal Digital Twin: the real Augusta course rebuilt from the Masters shot data, drawn with WebGPU
// (three.js WebGPURenderer; falls back to WebGL2 where WebGPU is missing). Exposes window.sim.update(S, view).
import * as THREE from "three/webgpu";
import { Fn, If, Discard, attribute, uniform, vec3, vec4, float, positionWorld, mx_noise_float, fwidth, fract, smoothstep, mix, length, abs, min, time } from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const SIM_VIEWS = ["idle", "round", "filterset", "freeplay"];

/* ---------- seeded random so the course is stable ---------- */
let seed = 7;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];

/* ---------- renderer, sized to the 16:9 frame ---------- */
const frame = document.getElementById("frame");
const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.id = "simCanvas"; // not "sim": an element id would shadow window.sim while the data loads
frame.prepend(renderer.domElement);
await renderer.init();
const BG = "#0b110d"; // background ground: near-black green, same as the fog so the course floats out of it
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, 300, 680);
const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.5, 2000);
camera.position.set(0, 150, 150);
const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, screenSpacePanning: false, maxPolarAngle: 1.42, minDistance: 3, maxDistance: 340, autoRotateSpeed: 0.6,
  zoomSpeed: 4, // pinch / wheel zoom ~4x default: big screen, small finger movements
  zoomToCursor: true, // pinch zooms about the point between the fingers (wheel: under the cursor)
  enableRotate: false }); // one-finger rotate is ours (below): it pivots on the point you grab
new ResizeObserver(() => renderer.setSize(frame.clientWidth, frame.clientHeight, false)).observe(frame);

// spring afternoon: warm low sun with soft shadows, sky bounce from a gradient environment
{
  const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 256);
  [[0, "#4f86cf"], [0.42, "#a9c8e4"], [0.5, "#e6eef0"], [0.53, "#7d8f6a"], [1, "#26301f"]].forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  const env = new THREE.CanvasTexture(c); env.mapping = THREE.EquirectangularReflectionMapping; env.colorSpace = THREE.SRGBColorSpace;
  scene.environment = env; scene.environmentIntensity = 0.7;
}
scene.add(new THREE.HemisphereLight("#eef4ff", "#3a3322", 0.5));
const sun = new THREE.DirectionalLight("#fff0d4", 2.6); sun.position.set(-70, 95, 60); scene.add(sun);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 20, far: 320 });

/* ---------- background: a quiet topographic pattern ----------
   contour lines (every 5th one stronger) over a fine dot grid, fading out from the course. Drawn in the shader,
   so the lines stay one crisp hairline at any zoom. */
{
  const m = new THREE.MeshBasicNodeMaterial();
  m.colorNode = Fn(() => {
    const p = positionWorld.xz;
    const h = mx_noise_float(p.mul(0.0045)).mul(36).add(mx_noise_float(p.mul(0.017)).mul(7));
    const iso = (v, w) => float(1).sub(min(abs(fract(v.sub(0.5)).sub(0.5)).div(fwidth(v)).div(w), 1));
    const minor = iso(h.div(1.5), 1), major = iso(h.div(7.5), 1.7);
    const g = length(fract(p.div(8)).sub(0.5).mul(8)), dot = float(1).sub(smoothstep(0.1, float(0.1).add(fwidth(g).mul(1.5)), g));
    const fade = float(1).sub(smoothstep(90, 400, length(p)));
    const ink = minor.mul(0.09).add(major.mul(0.22)).add(dot.mul(0.14)).mul(fade);
    return vec4(mix(vec3(0.0034, 0.0056, 0.004), vec3(0.3, 0.4, 0.32), ink), 1); // linear: #0b110d to a pale sage line
  })();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), m);
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
}

/* ---------- real course and shot data ----------
   data/meta.js (window.MASTERS_DATA), data/shots.bin and data/terrain.bin are exported from the IBM Masters Data API
   database (masters.db, release v1.1.3) by export_masters.py: real tees, pins, ~230k shot flights 2016–2026, and a
   3 m terrain grid (surface + elevation) rebuilt from where every ball landed. */
const D = window.MASTERS_DATA, M = window.MASTERS;
const [RAW, TB] = await Promise.all(["data/shots.bin?v=5", "data/terrain.bin?v=2"].map(async u => (await fetch(u)).arrayBuffer()));
const RAWI = new Int16Array(RAW);
const W = D.fields.length, F = Object.fromEntries(D.fields.map((f, i) => [f, i])), NSHOT = D.count, QN = D.quant;

/* ---------- island: outline of all play (the course sits on it like a model on a table) ---------- */
const islandAt = a => { // radius of the outline at angle a (outline is sampled at equal angles from -PI)
  const n = D.island.length, f = ((a + Math.PI) / (2 * Math.PI)) * n - 0.5, i = Math.floor(f), t = f - i;
  const r = k => Math.hypot(...D.island[((k % n) + n) % n]);
  return r(i) * (1 - t) + r(i + 1) * t;
};
const inside = (x, z, margin = 0) => Math.hypot(x, z) < islandAt(Math.atan2(z, x)) - margin;

/* ---------- terrain grid ---------- */
const T = D.terrain, NX = T.nx, NZ = T.nz, NC = NX * NZ, CELL = T.cell, X0 = T.x0, Z0 = T.z0;
const SURF = { woods: 0, fairway: 1, rough: 2, green: 3, bunker: 4, water: 5, straw: 6, tee: 7 };
const CLS = new Uint8Array(TB, 0, NC), HCM = new Int16Array(TB.slice(NC)); // elevation in cm
const EXAG = 1.6; // elevation is exaggerated a little so the slopes read on the wall (1 unit = 9.144 m)
const Y = new Float32Array(NC), OUT = new Uint8Array(NC);
for (let c = 0; c < NC; c++) {
  const x = X0 + (c % NX) * CELL, z = Z0 + Math.floor(c / NX) * CELL;
  OUT[c] = inside(x, z) ? 0 : 1;
  Y[c] = OUT[c] ? -0.4 : 2 + ((HCM[c] / 100 + 12) / T.metresPerUnit) * EXAG; // island top sits ~2 units above the table
}
// water: a flat surface per pond / creek stretch at its lowest nearby level, the bed carved below it
const WL = new Float32Array(NC).fill(NaN);
for (let c = 0; c < NC; c++) if (CLS[c] === SURF.water && !OUT[c]) {
  const i = c % NX, j = Math.floor(c / NX); let lo = Infinity;
  for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { // lowest water or bank cell nearby
    const n = (j + dj) * NX + i + di; if (n >= 0 && n < NC && !OUT[n] && (CLS[n] === SURF.water || Math.abs(di) + Math.abs(dj) <= 3)) lo = Math.min(lo, Y[n]);
  }
  WL[c] = lo;
}
for (let c = 0; c < NC; c++) if (WL[c] === WL[c]) Y[c] = WL[c] - 0.35; // the bed, under the surface
const cellOf = (x, z) => {
  const i = Math.min(NX - 1, Math.max(0, Math.round((x - X0) / CELL))), j = Math.min(NZ - 1, Math.max(0, Math.round((z - Z0) / CELL)));
  return j * NX + i;
};
function heightAt(x, z) { // bilinear over the grid
  const fi = Math.min(NX - 1.001, Math.max(0, (x - X0) / CELL)), fj = Math.min(NZ - 1.001, Math.max(0, (z - Z0) / CELL));
  const i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j, c = j * NX + i;
  return (Y[c] * (1 - u) + Y[c + 1] * u) * (1 - v) + (Y[c + NX] * (1 - u) + Y[c + NX + 1] * u) * v;
}
const V3 = ([x, z], lift = 0) => new THREE.Vector3(x, heightAt(x, z) + lift, z);

/* ---------- holes: real tee, pin and fairway line (bends at the usual landing spots) ---------- */
const HOLES = D.holes.map(d => {
  const line = d.line.map(p => V3(p)), tee = line[0], green = line[line.length - 1];
  const len = Math.hypot(green.x - tee.x, green.z - tee.z), dir = new THREE.Vector3(green.x - tee.x, 0, green.z - tee.z).normalize();
  return { n: d.n, name: d.name, par: d.par, yd: d.yd, line, tee, green, len, dir, perp: new THREE.Vector3(-dir.z, 0, dir.x) };
});
const seg2 = (x, z, a, b) => { // 2D distance from (x, z) to segment ab, plus the segment's direction
  const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
};
function nearestHole(x, z) {
  let best = null, bd = Infinity;
  HOLES.forEach(h => h.line.forEach((q, k) => { if (!k) return; const d = seg2(x, z, h.line[k - 1], q); if (d < bd) { bd = d; best = { h, a: h.line[k - 1], b: q }; } }));
  return { ...best, d: bd };
}

/* ---------- surface texture: 3 texels per grid cell, edges smoothed, mowing stripes, grain ---------- */
const terrainMap = (() => {
  const UP = 3, TW = NX * UP, TH = NZ * UP, data = new Uint8Array(TW * TH * 4);
  const COL = ["#4b3220", "#5b9437", "#44762b", "#74b14b", "#efe9da", "#1f3a37", "#8a552b", "#5f9a3a"].map(h => new THREE.Color(h)); // by class, sRGB
  const SOIL = new THREE.Color("#2b2019");
  // soft class weights: one-hot, blurred 3x3, so boundaries are curves rather than steps
  const WGT = new Float32Array(8 * NC);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const n = Math.min(NZ - 1, Math.max(0, j + dj)) * NX + Math.min(NX - 1, Math.max(0, i + di));
    WGT[CLS[n] * NC + j * NX + i] += 1;
  }
  // large-scale mottling (value noise per cell, blurred)
  let NOI = new Float32Array(NC).map(() => rnd());
  for (let p = 0; p < 4; p++) { const o = new Float32Array(NC); for (let c = 0; c < NC; c++) o[c] = (NOI[c] + NOI[Math.max(0, c - 1)] + NOI[Math.min(NC - 1, c + 1)] + NOI[Math.max(0, c - NX)] + NOI[Math.min(NC - 1, c + NX)]) / 5; NOI = o; }
  // stripes follow the nearest hole: cut across the line of play, as the greenkeepers mow
  const STRIPE = new Map();
  for (let c = 0; c < NC; c++) if ([SURF.fairway, SURF.tee, SURF.green].includes(CLS[c]) && !OUT[c]) {
    const { a, b } = nearestHole(X0 + (c % NX) * CELL, Z0 + Math.floor(c / NX) * CELL), L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    STRIPE.set(c, [a.x, a.z, (b.x - a.x) / L, (b.z - a.z) / L]);
  }
  const col = new THREE.Color();
  for (let b = 0; b < TH; b++) {
    const fj = Math.min(NZ - 1.001, Math.max(0, (b + 0.5) / UP - 0.5)), j = Math.floor(fj), v = fj - j;
    for (let a = 0; a < TW; a++) {
      const fi = Math.min(NX - 1.001, Math.max(0, (a + 0.5) / UP - 0.5)), i = Math.floor(fi), u = fi - i, c = j * NX + i;
      const near = Math.round(fj) * NX + Math.round(fi);
      let k = CLS[c];
      if (CLS[c + 1] !== k || CLS[c + NX] !== k || CLS[c + NX + 1] !== k) { // boundary: argmax of the interpolated weights
        let bw = -1;
        for (let q = 0; q < 8; q++) {
          const o = q * NC + c, w = (WGT[o] * (1 - u) + WGT[o + 1] * u) * (1 - v) + (WGT[o + NX] * (1 - u) + WGT[o + NX + 1] * u) * v;
          if (w > bw) { bw = w; k = q; }
        }
      }
      const n = (NOI[c] * (1 - u) + NOI[c + 1] * u) * (1 - v) + (NOI[c + NX] * (1 - u) + NOI[c + NX + 1] * u) * v;
      let s = 1 + (n - 0.5) * (k === SURF.green ? 0.12 : k === SURF.bunker ? 0.08 : 0.4) + (rnd() - 0.5) * (k === SURF.woods || k === SURF.straw ? 0.22 : 0.05);
      const st = STRIPE.get(near);
      if (st && (k === SURF.fairway || k === SURF.tee || k === SURF.green)) {
        const x = X0 + fi * CELL, z = Z0 + fj * CELL, along = (x - st[0]) * st[2] + (z - st[1]) * st[3];
        s *= Math.floor(along / (k === SURF.green ? 0.45 : 1.15)) & 1 ? (k === SURF.green ? 1.03 : 1.08) : (k === SURF.green ? 0.97 : 0.94);
      }
      col.copy(OUT[near] ? SOIL : COL[k]).multiplyScalar(s);
      const o = (b * TW + a) * 4;
      data[o] = Math.min(255, col.r * 255); data[o + 1] = Math.min(255, col.g * 255); data[o + 2] = Math.min(255, col.b * 255); data[o + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, TW, TH);
  Object.assign(t, { colorSpace: THREE.SRGBColorSpace, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, anisotropy: 8, needsUpdate: true });
  return t;
})();

/* ---------- terrain mesh: the whole grid, displaced; outside the island it drops under the table (the sides) ---------- */
const terrain = (() => {
  const pos = new Float32Array(NC * 3), uv = new Float32Array(NC * 2), idx = new Uint32Array((NX - 1) * (NZ - 1) * 6);
  for (let c = 0; c < NC; c++) {
    const i = c % NX, j = Math.floor(c / NX);
    pos.set([X0 + i * CELL, Y[c], Z0 + j * CELL], c * 3); uv.set([(i + 0.5) / NX, (j + 0.5) / NZ], c * 2);
  }
  let o = 0;
  for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) {
    const c = j * NX + i; if (OUT[c] && OUT[c + 1] && OUT[c + NX] && OUT[c + NX + 1]) continue;
    idx.set([c, c + NX, c + 1, c + 1, c + NX, c + NX + 1], o); o += 6;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx.subarray(0, o), 1)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardNodeMaterial({ map: terrainMap, roughness: 0.92, metalness: 0 }));
  m.receiveShadow = true; scene.add(m); return m;
})();

/* ---------- water: Rae's Creek and the ponds on 11, 12, 13, 15 and 16 ---------- */
{
  const p = [];
  for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) {
    const cs = [j * NX + i, j * NX + i + 1, (j + 1) * NX + i, (j + 1) * NX + i + 1], wet = cs.filter(c => WL[c] === WL[c]);
    if (!wet.length) continue;
    const y = wet.reduce((s, c) => s + WL[c], 0) / wet.length - 0.1, x0 = X0 + (i - 0.5) * CELL, z0 = Z0 + (j - 0.5) * CELL, x1 = x0 + CELL * 2, z1 = z0 + CELL * 2;
    p.push(x0, y, z0, x0, y, z1, x1, y, z0, x1, y, z0, x0, y, z1, x1, y, z1); // a little past the cell, tucked under the banks
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.05, metalness: 0.15, transparent: true, opacity: 0.94 });
  m.colorNode = Fn(() => { // slow drifting tint, deep green-teal like Augusta's dyed ponds
    const n = mx_noise_float(vec3(positionWorld.x.mul(1.3), positionWorld.z.mul(1.3), time.mul(0.22)));
    return vec4(mix(vec3(0.02, 0.10, 0.10), vec3(0.06, 0.20, 0.19), n.mul(0.5).add(0.5)), 1);
  })();
  const water = new THREE.Mesh(g, m); water.receiveShadow = true; scene.add(water);
}

/* ---------- trees: tall loblolly pines in the woods, some hardwoods, flowering azaleas round the greens ---------- */
function painted(g, hex) { g = g.index ? g.toNonIndexed() : g; const c = new THREE.Color(hex), a = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < a.length; i += 3) a.set([c.r, c.g, c.b], i); g.setAttribute("color", new THREE.BufferAttribute(a, 3)); return g; }
const crown = (r, x, y, z, sy, hex) => { const g = new THREE.IcosahedronGeometry(r, 1); g.scale(1, sy, 1); g.translate(x, y, z); return painted(g, hex); };
const PINE = mergeGeometries([ // tall bare trunk, crown in clumps at the top
  painted(new THREE.CylinderGeometry(0.035, 0.075, 2.7, 5).translate(0, 1.35, 0), "#4a3526"),
  crown(0.42, 0, 2.55, 0, 0.55, "#1f3b1b"), crown(0.32, 0.24, 2.22, 0.1, 0.55, "#26461f"),
  crown(0.3, -0.22, 2.3, -0.12, 0.55, "#1c3518"), crown(0.27, 0.05, 2.9, -0.05, 0.6, "#2a4d22")]);
const HARDWOOD = mergeGeometries([ // oaks, dogwoods, magnolias: shorter, rounder, lighter
  painted(new THREE.CylinderGeometry(0.05, 0.09, 1.3, 5).translate(0, 0.65, 0), "#4d3a2a"),
  crown(0.7, 0, 1.75, 0, 0.7, "#355a26"), crown(0.5, 0.45, 1.5, 0.2, 0.7, "#3f672b"), crown(0.46, -0.4, 1.6, -0.25, 0.7, "#2f5122")]);
const BUSH = painted(new THREE.IcosahedronGeometry(0.34, 1).scale(1, 0.55, 1).translate(0, 0.12, 0), "#ffffff");
{
  const pine = [], hard = [], bush = [];
  for (let t = 0; t < 700000 && pine.length + hard.length < 17000; t++) {
    const x = X0 + rnd() * NX * CELL, z = Z0 + rnd() * NZ * CELL, k = CLS[cellOf(x, z)];
    if (!inside(x, z, 0.7)) continue;
    const p = k === SURF.woods ? 0.5 : k === SURF.straw ? 0.2 : k === SURF.rough ? 0.004 : 0;
    if (rnd() < p) (rnd() < 0.8 ? pine : hard).push([x, z]);
  }
  // azaleas: banks behind the greens and tees, thickest through Amen Corner (11–13)
  HOLES.forEach(h => [[h.green, 9, 3, 11], [h.tee, 4, 2, 6]].forEach(([c, n, r0, r1]) => {
    const tries = n * ([11, 12, 13].includes(h.n) ? 6 : 1) * 6;
    for (let t = 0; t < tries; t++) {
      const a = rnd() * Math.PI * 2, r = r0 + rnd() * (r1 - r0), x = c.x + r * Math.cos(a), z = c.z + r * Math.sin(a), k = CLS[cellOf(x, z)];
      if (inside(x, z, 0.7) && (k === SURF.woods || k === SURF.straw)) bush.push([x, z]);
    }
  }));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  const plant = (geo, list, opts) => {
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.95, envMapIntensity: 0.5 }), list.length);
    list.forEach(([x, z], i) => {
      const s = opts.size();
      m.compose(new THREE.Vector3(x, heightAt(x, z) - 0.05, z), q.setFromEuler(e.set(0, rnd() * 6.3, 0)), new THREE.Vector3(s, s * opts.tall(), s));
      mesh.setMatrixAt(i, m); mesh.setColorAt(i, opts.tint(col));
    });
    mesh.castShadow = opts.shadow; mesh.receiveShadow = true; scene.add(mesh);
  };
  const shade = c => { const v = 0.75 + rnd() * 0.4; return c.setRGB(v * (0.96 + rnd() * 0.08), v, v * (0.92 + rnd() * 0.1)); };
  plant(PINE, pine, { size: () => 0.8 + rnd() * 0.45, tall: () => 0.85 + rnd() * 0.35, tint: shade, shadow: true });
  plant(HARDWOOD, hard, { size: () => 0.7 + rnd() * 0.5, tall: () => 0.9 + rnd() * 0.2, tint: shade, shadow: true });
  const AZALEA = ["#e0569a", "#f27db4", "#c2187a", "#f6e9ef", "#ff7a6b", "#d94f8c"];
  plant(BUSH, bush, { size: () => 0.7 + rnd() * 0.8, tall: () => 0.8 + rnd() * 0.5, tint: c => c.set(pick(AZALEA)).convertSRGBToLinear().multiplyScalar(0.85 + rnd() * 0.25), shadow: false });
}

/* ---------- pins and hole numbers ---------- */
const pins = new THREE.Group(), labels = new THREE.Group();
scene.add(pins, labels);
HOLES.forEach(h => {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6), new THREE.MeshBasicNodeMaterial({ color: "#fff" }));
  pole.position.set(h.green.x, h.green.y + 1.3, h.green.z);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicNodeMaterial({ color: "#f1c21b", side: THREE.DoubleSide }));
  flag.position.set(h.green.x + 0.45, h.green.y + 2.3, h.green.z);
  pins.add(pole, flag);
});
// the day's pin: when what is shown is one year and one round, each flag moves to that day's hole location; otherwise the usual spot
let pinDay = null;
function placePins(day) {
  if (day === pinDay) return; pinDay = day;
  HOLES.forEach((h, i) => { const p = day && D.holes[i].pins[day], x = p ? p[0] : h.green.x, z = p ? p[1] : h.green.z, y = heightAt(x, z);
    pins.children[2 * i].position.set(x, y + 1.3, z); pins.children[2 * i + 1].position.set(x + 0.45, y + 2.3, z); });
}
const dayOf = f => f && f.Year && f.Year[0] === f.Year[1] && f.Round?.length === 1 ? `${f.Year[0]}-${f.Round[0].slice(1)}` : null;

/* hole markers: Carbon tag look (square number block + Gray 100 panel), on a stem down to the tee.
   Drawn at 2x so text stays sharp on the wall. Three textures per hole: normal, selected, and number-only for holes outside the filter. */
await document.fonts.load("600 64px 'IBM Plex Sans'"); await document.fonts.load("400 64px 'IBM Plex Sans'");
const LABEL_LIFT = 4;
function tag(h, selected, compact = false) {
  const c = document.createElement("canvas"); c.width = 1280; c.height = 256; const g = c.getContext("2d");
  const sub = `Par ${h.par} · ${h.yd} yd`;
  g.font = "400 76px 'IBM Plex Sans'"; const w = Math.min(1280, 256 + 56 + Math.max(g.measureText(h.name).width, g.measureText(sub).width * 0.75) + 56);
  const R = 40; // same small corner radius as the rest of the UI
  if (!compact) {
    g.fillStyle = "rgba(12,33,22,.94)"; g.beginPath(); g.roundRect(0, 0, w, 256, R); g.fill();       // --panel (Masters theme)
    g.strokeStyle = "#1f4230"; g.lineWidth = 6; g.beginPath(); g.roundRect(3, 3, w - 6, 250, R - 3); g.stroke(); // $border-subtle
  }
  g.fillStyle = selected ? "#f7f5ec" : "#1a3b29"; g.beginPath(); g.roundRect(0, 0, 256, 256, R); g.fill(); // selected = $layer-selected-inverse
  g.fillStyle = selected ? "#08170f" : "#f7f5ec"; g.font = "600 128px 'IBM Plex Sans'";
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(h.n, 128, 136);
  if (compact) return tex(c);
  g.textAlign = "left"; g.textBaseline = "alphabetic";
  g.fillStyle = "#f7f5ec"; g.font = "400 76px 'IBM Plex Sans'"; g.fillText(h.name, 312, 118);
  g.fillStyle = "#c8d2c6"; g.font = "400 56px 'IBM Plex Sans'"; g.fillText(sub, 312, 200);
  return tex(c);
}
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const stems = [], TAGS = [];
HOLES.forEach(h => {
  const tex = { off: tag(h, false), on: tag(h, true), mini: tag(h, false, true) };
  const sp = new THREE.Sprite(new THREE.SpriteNodeMaterial({ map: tex.off, depthTest: false, sizeAttenuation: false, transparent: true }));
  sp.position.set(h.tee.x, h.tee.y + LABEL_LIFT, h.tee.z); sp.scale.set(0.12 * (window.UI_SCALE || 1), 0.024 * (window.UI_SCALE || 1), 1); sp.center.set(0.1, 0); // constant on-screen size, sits on the stem
  sp.userData = { n: String(h.n), hole: h.n, tex, cur: tex.off }; sp.renderOrder = 10; labels.add(sp); TAGS.push(sp);
  stems.push(h.tee.x, h.tee.y, h.tee.z, h.tee.x, h.tee.y + LABEL_LIFT, h.tee.z);
});
{
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(stems, 3));
  labels.add(new THREE.LineSegments(g, new THREE.LineBasicNodeMaterial({ color: "#f7f5ec", transparent: true, opacity: 0.6 })));
}

/* ---------- shot filters, matched straight against the Int16 rows ---------- */
const ENUM = { Shot: ["type", ["Tee", "Approach", "Chip", "Putt"]], Score: ["score", D.scores],
  Region: ["region", D.regions], Sector: ["sector", D.sectors] };
const PIDX = new Map(D.players.map((n, i) => [n, i]));
const CHAMP = D.players.map(n => M.winners.includes(n));
const at = (i, f) => RAWI[i * W + F[f]];
function compile(f) { // filter group -> list of row tests; arrays are "any of", [lo, hi] are ranges
  return Object.entries(f).map(([k, v]) => {
    if (k === "Hole") { const s = new Set(v.map(Number)); return i => s.has(at(i, "hole")); }
    if (k === "Round") { const s = new Set(v.map(r => +r.slice(1))); return i => s.has(at(i, "round")); }
    if (k === "Player") { const s = new Set(v.map(n => PIDX.get(n))); return i => s.has(at(i, "player")); }
    if (k === "Trophy") { const s = new Set(v.map(x => x === "Masters champion")); return i => s.has(CHAMP[at(i, "player")]); }
    if (k === "Year") return i => { const y = at(i, "year") + 2000; return y >= v[0] && y <= v[1]; };
    if (k === "Distance") return i => { const d = at(i, "yd"); return d >= v[0] && d <= v[1]; };
    if (k === "Stroke") return i => { const n = at(i, "stroke"); return n >= v[0] && (v[1] >= 8 || n <= v[1]); }; // 8 = 8 or more
    if (ENUM[k]) { const [field, names] = ENUM[k], s = new Set(v.map(x => names.indexOf(x))); return i => s.has(at(i, field)); }
    return () => true;
  });
}
// key numbers for a selection: average flight, share of flights that finished in water, and how those player-holes ended
// (each player's hole counted once, by its result: the outcome bar and "birdie or better")
const WATER = D.regions.indexOf("Water");
function stats(rows) {
  if (!rows.length) return null;
  let yd = 0, water = 0; const holes = new Map();
  for (const i of rows) {
    yd += at(i, "yd"); if (at(i, "region") === WATER) water++;
    holes.set(((at(i, "year") * 5 + at(i, "round")) * 400 + at(i, "player")) * 19 + at(i, "hole"), [at(i, "score"), at(i, "count")]);
  }
  const dist = Array(D.scores.length).fill(0); let n = 0;
  let strokes = 0, m = 0;
  for (const [sc, c] of holes.values()) { if (sc >= 0) { dist[sc]++; n++; } if (c > 0) { strokes += c; m++; } }
  return { avgYd: Math.round(yd / rows.length), water: water / rows.length, holes: n, dist: dist.map(d => n ? d / n : 0), under: n ? dist.slice(0, 4).reduce((a, b) => a + b, 0) / n : 0, avgStrokes: m ? strokes / m : 0 };
}
const pickShots = f => { if (!f) return []; const t = compile(f), out = []; for (let i = 0; i < NSHOT; i++) if (t.every(fn => fn(i))) out.push(i); return out; };

/* ---------- zones: where the selection finished on one hole, by sector (greenside 3x3 + fairway left/right) ----------
   each zone sits at the average landing spot of that sector on that hole (all years), shaded by its share of the selection */
const ZONE_AT = (() => { // [hole][sector] -> [x, z] centroid
  const acc = Array.from({ length: 19 }, () => D.sectors.map(() => [0, 0, 0]));
  for (let i = 0; i < NSHOT; i++) { const sc = at(i, "sector"); if (sc < 0) continue; const a = acc[at(i, "hole")][sc]; a[0] += at(i, "tx") / QN; a[1] += at(i, "tz") / QN; a[2]++; }
  return acc.map(h => h.map(([x, z, n]) => n ? [x / n, z / n] : null));
})();
const zoneGroup = new THREE.Group(); scene.add(zoneGroup);
const zoneLabel = txt => { const c = document.createElement("canvas"); c.width = 256; c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "rgba(12,33,22,.92)"; g.beginPath(); g.roundRect(8, 16, 240, 96, 30); g.fill();
  g.fillStyle = "#f7f5ec"; g.font = "600 64px 'IBM Plex Sans'"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 128, 66); return tex(c); };
let zoneKey = "";
function drawZones(holeN, rows) { // rows: selected flights; only those on this hole count
  const key = holeN + ":" + rows.length + ":" + rows[0];
  if (key === zoneKey) return; zoneKey = key;
  zoneGroup.children.forEach(o => { o.geometry?.dispose(); o.material.map?.dispose(); o.material.dispose(); }); zoneGroup.clear();
  if (!holeN) return;
  const n = D.sectors.map(() => 0); let tot = 0;
  for (const i of rows) if (at(i, "hole") === holeN) { const sc = at(i, "sector"); if (sc >= 0) { n[sc]++; tot++; } }
  if (!tot) return;
  D.sectors.forEach((name, sc) => {
    const c = ZONE_AT[holeN][sc]; if (!c) return;
    const share = n[sc] / tot, fair = name.startsWith("Fairway"), r = fair ? 2.4 : 0.6, y = heightAt(c[0], c[1]) + 0.06;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: "#fce300", transparent: true, opacity: 0.12 + 0.6 * share, depthWrite: false }));
    disc.position.set(c[0], y, c[1]); disc.renderOrder = 5; zoneGroup.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.05, r, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: "#fce300", transparent: true, opacity: 0.8, depthWrite: false }));
    ring.position.set(c[0], y + 0.01, c[1]); zoneGroup.add(ring);
    if (share < 0.005) return; // nothing landed here: the faint disc says so, no label
    const sp = new THREE.Sprite(new THREE.SpriteNodeMaterial({ map: zoneLabel(Math.round(share * 100) + "%"), depthTest: false, sizeAttenuation: false, transparent: true }));
    // greenside labels are pushed out from the green so the 3x3 ring stays readable; a line ties each to its zone
    const g = HOLES[holeN - 1].green, lx = fair ? c[0] : g.x + (c[0] - g.x) * 2.4, lz = fair ? c[1] : g.z + (c[1] - g.z) * 2.4, ly = heightAt(lx, lz) + 1.2;
    sp.position.set(lx, ly, lz);
    if (!fair) { const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(c[0], y + 0.05, c[1]), new THREE.Vector3(lx, ly - 0.2, lz)]);
      zoneGroup.add(new THREE.Line(lg, new THREE.LineBasicNodeMaterial({ color: "#fce300", transparent: true, opacity: 0.7 }))); } sp.scale.set(0.04 * (window.TAG_SCALE || 1), 0.02 * (window.TAG_SCALE || 1), 1); sp.renderOrder = 11; zoneGroup.add(sp);
  });
}

/* ---------- arcs: one draw call, drawn in by the shader (TSL) ---------- */
// colour by score (design colour key), same order as D.scores; unknown scores are grey
const SCORE_COL = ["#d4bbff", "#ee5396", "#ffafd2", "#f1c21b", "#f6f2ff", "#82cfff", "#78a9ff", "#4589ff"]; // HIO, Albatross, Eagle, Birdie, Par, Bogey, Double, Triple
const uProg = uniform(0), uAlpha = uniform(0.55);
const arcMat = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false });
arcMat.colorNode = Fn(() => {
  If(attribute("aT", "float").greaterThan(uProg.sub(attribute("aDelay", "float")).mul(1.6)), () => { Discard(); });
  return vec4(attribute("color", "vec3"), uAlpha);
})();
const arcs = new THREE.LineSegments(new THREE.BufferGeometry(), arcMat);
const MAX_ARCS = 30000; // drawn; counts still report every matching shot
const balls = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.18, 1), new THREE.MeshBasicNodeMaterial(), MAX_ARCS);
balls.setColorAt(0, new THREE.Color()); balls.count = 0; balls.frustumCulled = false;
scene.add(arcs, balls);
const hash = i => (Math.imul(i + 1, 2654435761) >>> 0) / 4294967296; // stable per-shot randomness
// ball flight: apex past the middle, plus a sideways bow (draw / fade) so bundles read as feathers; ends sit on the ground
function arcPoint(fx, fz, tx, tz, type, bow, t, out, yf, yt) {
  const dx = tx - fx, dz = tz - fz, d = Math.hypot(dx, dz), h = type === 3 ? 0.03 : d * (type === 2 ? 0.16 : 0.22);
  const u = Math.pow(t, 0.8), lift = 4 * h * u * (1 - u), b = bow * d * 4 * t * (1 - t), inv = d ? 1 / d : 0;
  out[0] = fx + dx * t - dz * inv * b; out[1] = yf + (yt - yf) * t + 0.08 + lift; out[2] = fz + dz * t + dx * inv * b;
}
function buildArcs(groups) { // groups: [[rowIndices, group colour or null (= colour by score)], ...]
  const N = 16, cap = Math.floor(MAX_ARCS / groups.length), c = new THREE.Color(), p = [0, 0, 0], m = new THREE.Matrix4();
  const lists = groups.map(([rows, gc]) => { const k = Math.max(1, Math.ceil(rows.length / cap)); return [rows.filter((_, j) => j % k === 0), gc]; });
  const total = lists.reduce((n, [r]) => n + r.length, 0);
  const pos = new Float32Array(total * N * 6), col = new Float32Array(total * N * 6), aT = new Float32Array(total * N * 2), dl = new Float32Array(total * N * 2);
  // interleave the groups so neither is always drawn on top of the other when comparing
  const items = [], longest = Math.max(...lists.map(([r]) => r.length));
  for (let j = 0; j < longest; j++) lists.forEach(([rows, gc]) => { if (j < rows.length) items.push([rows[j], gc]); });
  let v = 0, n = 0;
  items.forEach(([i, gc]) => {
    const fx = at(i, "fx") / QN, fz = at(i, "fz") / QN, tx = at(i, "tx") / QN, tz = at(i, "tz") / QN, type = at(i, "type");
    const yf = heightAt(fx, fz), yt = heightAt(tx, tz), bow = (hash(i + 7919) - 0.5) * 0.12;
    c.set(gc || SCORE_COL[at(i, "score")] || "#8d8d8d");
    const delay = (n / Math.max(total, 1)) * 0.4;
    for (let k = 0; k < N; k++) for (const t of [k / N, (k + 1) / N]) {
      arcPoint(fx, fz, tx, tz, type, bow, t, p, yf, yt);
      pos.set(p, v * 3); col.set([c.r, c.g, c.b], v * 3); aT[v] = t; dl[v] = delay; v++;
    }
    balls.setMatrixAt(n, m.makeTranslation(tx, yt + 0.15, tz)); balls.setColorAt(n, c); n++;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aT", new THREE.BufferAttribute(aT, 1)); g.setAttribute("aDelay", new THREE.BufferAttribute(dl, 1));
  arcs.geometry.dispose(); arcs.geometry = g;
  balls.count = n; balls.instanceMatrix.needsUpdate = true; balls.instanceColor.needsUpdate = true;
  uProg.value = 0;
  uAlpha.value = THREE.MathUtils.clamp(0.95 - 0.13 * Math.log10(total + 1), 0.32, 0.85);
}

/* ---------- Game focus: the chapter's sequence, shot by shot (real shot positions) ----------
   index.html builds the steps (focusSteps): each names its hole (hi), shot (si) and whether it is "Shot 0", the lie before the
   shot is hit. Every shot of the chapter's holes is drawn: played ones faint, the current one bright, later ones hidden. */
const focusGroup = new THREE.Group(); scene.add(focusGroup);
let focusFor = null, FOCUS = [];
function buildFocus(ch) { // tubes for every shot of the chapter's holes; rebuilt when the chapter changes
  if (ch === focusFor) return; focusFor = ch;
  focusGroup.children.forEach(g => g.children.forEach(m => { m.geometry.dispose(); m.material.dispose(); }));
  focusGroup.clear();
  FOCUS = [...new Map(ch.steps.map(st => [st.hi, st])).values()].map(st => ({ hole: HOLES[st.hole - 1], shots: st.shots }));
  FOCUS.forEach(fh => {
    const g = new THREE.Group();
    fh.shots.forEach(sh => {
      if (!sh.from) { g.add(new THREE.Group()); return; } // a penalty: no flight, keeps the indices aligned with the shot list
      const type = sh.kind === "Putt" ? 3 : sh.kind === "Chip" ? 2 : sh.kind === "Drop" ? 3 : 0, yf = heightAt(...sh.from), yt = heightAt(...sh.to);
      const pts = Array.from({ length: 30 }, (_, i) => { const o = [0, 0, 0]; arcPoint(sh.from[0], sh.from[1], sh.to[0], sh.to[1], type, 0, i / 29, o, yf, yt); return new THREE.Vector3(...o); });
      const r = sh.kind === "Drop" ? 0.03 : type === 3 ? 0.04 : 0.1;
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, r, 8), new THREE.MeshBasicNodeMaterial({ color: sh.kind === "Drop" ? "#8d8d8d" : "#fff", transparent: true })));
    });
    focusGroup.add(g);
  });
}
function showFocusStep(ch, step) {
  const st = ch.steps[Math.min(step, ch.steps.length - 1)];
  focusGroup.children.forEach((g, h) => {
    g.visible = h === st.hi; // one hole at a time
    g.children.forEach((m, s) => { m.visible = s < st.si || (s === st.si && !st.pre); if (m.material) m.material.opacity = s === st.si ? 1 : 0.4; });
  });
  return { h: st.hi, s: st.si, sh: st.shot, pre: !!st.pre };
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function shotCam(sh) { // "Tee" in game focus: stand behind the ball, looking down the shot
  const from = V3(sh.from), to = V3(sh.to), d = Math.max(1, Math.hypot(to.x - from.x, to.z - from.z)), dir = to.clone().sub(from).setY(0).normalize();
  return { pos: from.clone().addScaledVector(dir, -Math.max(6, d * 0.3)).add(V(0, Math.max(4.5, d * 0.5), 0)), target: from.clone().lerp(to, 0.7) }; // high enough to clear the pines
}

/* ---------- framing: bounds of what is shown ---------- */
function boxOf(lists) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, n = 0;
  lists.forEach(rows => { const k = Math.max(1, Math.ceil(rows.length / 4000)); for (let j = 0; j < rows.length; j += k) {
    const i = rows[j]; for (const [fx, fz] of [["fx", "fz"], ["tx", "tz"]]) { const x = at(i, fx) / QN, z = at(i, fz) / QN;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); n++; } } });
  return n ? { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, r: Math.max(x1 - x0, (z1 - z0) * 16 / 9) / 2 + 4 } : COURSE_BOX;
}
const COURSE_BOX = (() => { const xs = D.island.map(p => p[0]), zs = D.island.map(p => p[1]);
  return { cx: 0, cz: 0, r: Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...zs) - Math.min(...zs)) * 16 / 9) / 2 }; })();
let frameBox = COURSE_BOX;

/* ---------- camera presets ---------- */
let want = null; // {pos, target}: eased toward each frame, cancelled when the presenter takes over
let userCam = false; // the camera was moved by hand: no auto-rotate until the next preset or framing
// the whole course is the touch surface, and every gesture is anchored where the finger touches:
//  - drag: the spot you grabbed glides to the centre of the screen and becomes the pivot you orbit around
//  - pinch: zoom about the point between the fingers; two fingers also pan (OrbitControls)
//  - press and hold still: that spot glides to the centre and the camera keeps zooming in on it until the finger lifts
//  - tap: a flag zooms to its green; a hole (tag, or near its line of play) focuses that hole
controls.addEventListener("start", () => { want = null; userCam = true; controls.autoRotate = false; });
let hold = null, interactive = false, recentre = null; // recentre: ground point easing to the screen centre (the anchor) // hold: { p: ground point, t: seconds held }; interactive: the view takes touch (not Idle)
{
  const ray = new THREE.Raycaster(), el = renderer.domElement, fingers = new Set(), UP = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
  let down = null, drag = null, timer = 0;
  const aim = (x, y) => { const r = el.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), camera); };
  const ground = () => { // march the ray down to the terrain
    const p = new THREE.Vector3();
    for (let s = 0; s < 1200; s += 0.25) { p.copy(ray.ray.origin).addScaledVector(ray.ray.direction, s); if (p.y <= heightAt(p.x, p.z)) break; }
    return p;
  };
  const turn = (axis, angle, pivot) => { // rotate the camera and its target together about a pivot
    q.setFromAxisAngle(axis, angle);
    camera.position.sub(pivot).applyQuaternion(q).add(pivot); controls.target.sub(pivot).applyQuaternion(q).add(pivot);
  };
  const stop = () => { clearTimeout(timer); hold = null; };
  el.addEventListener("pointerdown", e => {
    fingers.add(e.pointerId); stop(); drag = null;
    if (fingers.size > 1 || !interactive) { down = null; return; } // two fingers: pinch / pan
    try { el.setPointerCapture(e.pointerId); } catch {}
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    aim(e.clientX, e.clientY); down.p = ground(); // the anchor for whatever this gesture becomes
    if (!inside(down.p.x, down.p.z)) down.p = controls.target.clone(); // grabbed the background: keep the current centre
    timer = setTimeout(() => { hold = { p: down.p, t: 0 }; recentre = down.p; want = null; userCam = true; controls.autoRotate = false; }, 380); // held still: zoom in
  });
  el.addEventListener("pointermove", e => {
    if (!down || hold || fingers.size > 1) return;
    if (!drag) { if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10) return; // still a tap or a hold
      clearTimeout(timer); drag = { x: e.clientX, y: e.clientY }; recentre = down.p; want = null; userCam = true; controls.autoRotate = false; return; }
    const k = (2 * Math.PI) / el.clientHeight * 0.6, dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    turn(UP, -dx * k, down.p); // spin around the grabbed spot
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), before = camera.position.clone(), tBefore = controls.target.clone();
    turn(right, -dy * k, down.p); // tilt around it, within the usual limits and never under the ground
    const look = controls.target.clone().sub(camera.position).normalize(), polar = Math.acos(THREE.MathUtils.clamp(-look.y, -1, 1));
    if (polar < 0.05 || polar > controls.maxPolarAngle || camera.position.y < heightAt(camera.position.x, camera.position.z) + 1) {
      camera.position.copy(before); controls.target.copy(tBefore);
    }
    camera.lookAt(controls.target);
  });
  const up = e => {
    fingers.delete(e.pointerId); const wasHold = !!hold, wasDrag = !!drag; stop(); drag = null;
    if (wasHold || wasDrag || e.type !== "pointerup" || !down || performance.now() - down.t > 450) { down = null; return; }
    down = null;
    const r = el.getBoundingClientRect(), sx = r.width / el.clientWidth || 1;
    if (pins.visible) { // a flag: zoom to its green (generous target: within ~40 px on screen)
      const near = HOLES.map(h => { const p = h.green.clone().add(V(0, 2, 0)).project(camera);
        return { h, d: Math.hypot(r.left + (p.x + 1) / 2 * r.width - e.clientX, r.top + (1 - p.y) / 2 * r.height - e.clientY) / sx, front: p.z < 1 }; })
        .filter(x => x.front).sort((a, b) => a.d - b.d)[0];
      if (near && near.d < 40) { want = preset("Green", near.h); recentre = null; userCam = true; controls.autoRotate = false; return; }
    }
    aim(e.clientX, e.clientY);
    const tagHit = labels.visible && ray.intersectObjects(TAGS, false)[0];
    let hole = tagHit ? tagHit.object.userData.hole : null; // names hidden: tagHit is false, not undefined
    if (!hole) { const p = ground(), nh = nearestHole(p.x, p.z); if (nh.d < 4.5 || p.distanceTo(nh.h.green) < 4) hole = nh.h.n; } // closest hole within a few yards of play
    if (hole) dispatchEvent(new CustomEvent("hole-tap", { detail: hole }));
  };
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
}
function preset(name, h, box = COURSE_BOX) {
  if (!h) { // frame a box: the selection, or the whole course
    const c = V(box.cx, 4, box.cz);
    return name === "Top" ? { pos: c.clone().add(V(0, box.r * 3.2 + 12, 0.1)), target: c }
      : { pos: c.clone().add(V(0, 0.9, 1.1).setLength(box.r * 2.2 + 14)), target: c }; // Orbit (and Tee with no single hole)
  }
  const mid = h.tee.clone().lerp(h.green, 0.5);
  switch (name) {
    case "Top": return { pos: mid.clone().add(V(0, h.len * 2.4 + 25, 0.1)), target: mid };
    case "Tee": return { pos: h.tee.clone().addScaledVector(h.dir, -10).add(V(0, 6, 0)), target: h.green.clone() };
    case "Green": return { pos: h.green.clone().addScaledVector(h.dir, -8).addScaledVector(h.perp, 2).add(V(0, 11, 0)), target: h.green.clone() }; // from above the approach: clears the pines
    default: return { pos: mid.clone().addScaledVector(h.perp, h.len * 1.5 + 12).add(V(0, h.len * 1.4 + 12, 0)), target: mid }; // Orbit
  }
}

/* ---------- state from index.html ---------- */
let last = {}, view = null, focusShot = null, counts = {}, lastRows = [], zoneHole = null;
const GROUP_COL = { A: "#3ddbd9", B: "#ff832b" }; // IBM Teal 30 / Orange 40, same as index.html
const callout = document.getElementById("callout");
const STAGE_W = 5280, STAGE_H = 2970;

function update(S, v) {
  view = SIM_VIEWS.includes(v) ? v : null;
  renderer.domElement.style.visibility = view ? "visible" : "hidden";
  if (!view) { last = {}; return; }
  const fp = view === "freeplay";
  const ch = S.chapter; // the tour chapter on screen (index.html), null in Freeplay outside a tour chapter
  const filters = fp ? S.filters : view === "filterset" ? ch.filters : view === "idle" ? {} : null; // idle: every shot, as a backdrop
  const filtersB = fp && S.compare ? S.filtersB : view === "filterset" ? ch.filtersB || null : null; // compare: second group
  const course = view !== "idle"; // data chapter, game focus, Freeplay: the presenter can change the view
  const disp = course ? S.display : { shots: true, names: false, pins: false, data: "Arcs" };
  controls.enabled = interactive = course; // the whole course takes touch
  controls.autoRotate = course && S.cam === "Orbit" && !userCam;
  labels.visible = disp.names; pins.visible = disp.pins;
  const dayA = view === "round" ? `${ch.steps[0].seq.year}-${ch.steps[0].seq.round}` : dayOf(filters), dayB = filtersB ? dayOf(filtersB) : dayA;
  placePins(dayA === dayB ? dayA : null);
  // selected holes look like selected filter tiles; the rest shrink to their number
  const picked = filtersB ? (filters?.Hole && filtersB.Hole ? [...filters.Hole, ...filtersB.Hole] : null) : filters?.Hole;
  const tagged = fp && S.flyHole ? [String(S.flyHole)] : picked; // a focused hole reads as selected
  TAGS.forEach(l => l.scale.set(0.12 * (window.TAG_SCALE || 1), 0.024 * (window.TAG_SCALE || 1), 1)); // follows the screen-size setting
  TAGS.forEach(l => { const on = !!tagged?.includes(l.userData.n), t = on ? l.userData.tex.on : tagged ? l.userData.tex.mini : l.userData.tex.off;
    if (t !== l.userData.cur) { l.material.map = l.userData.cur = t; l.material.needsUpdate = true; } l.material.opacity = tagged && !on ? 0.6 : 1; });
  focusGroup.visible = view === "round";
  if (view === "round") { buildFocus(ch); focusShot = showFocusStep(ch, S.step); }

  const dataKey = JSON.stringify([filters, filtersB]);
  if (dataKey !== last.data) {
    const a = pickShots(filters), b = pickShots(filtersB);
    buildArcs(filtersB ? [[a, GROUP_COL.A], [b, GROUP_COL.B]] : [[a, null]]);
    lastRows = a; // group A's flights, for the zones
    counts = { a: a.length, b: filtersB ? b.length : null, sa: stats(a), sb: filtersB ? stats(b) : null };
    frameBox = boxOf(filtersB ? [a, b] : [a]); // auto-frame what is shown
  }
  arcs.visible = !!filters && disp.shots && disp.data === "Arcs";
  balls.visible = !!filters && disp.shots && disp.data === "Balls";

  // camera target: a hole tapped on the course, else the one filtered hole, else frame the whole selection
  const one = picked && new Set(picked).size === 1 ? picked[0] : null;
  const hole = fp && S.flyHole ? HOLES[S.flyHole - 1] : one ? HOLES[+one - 1] : null;
  zoneHole = disp.zones && filters && view !== "round" && hole ? hole.n : null; // zones need one hole: tapped, or the one filtered
  drawZones(zoneHole, zoneHole ? lastRows : []); zoneGroup.visible = !!zoneHole;
  const camKey = view === "idle" ? "idle" : view === "round" ? ["round", ch.title, S.step, S.cam, S.frameTick, S.resetTick].join() : [view, S.cam, hole?.n, dataKey, S.frameTick, S.resetTick].join();
  // Freeplay opens on the whole course, and Reset returns to it; Frame selection and filter changes frame the selection
  const wholeCourse = fp && (last.view !== view || S.resetTick !== last.reset);
  if (camKey !== last.cam && view === "idle") { want = null; flyT = 0; } // the fly-through drives the camera on Idle
  else if (camKey !== last.cam) {
    userCam = false; recentre = null;
    want = view === "round" ? (S.cam === "Tee" ? shotCam(focusShot.sh) : preset(S.cam, FOCUS[focusShot.h].hole)) // game focus: behind the ball, shot by shot
      : (wholeCourse ? preset(S.cam === "Tee" ? "Orbit" : S.cam, null, COURSE_BOX) : preset(S.cam === "Tee" ? "Orbit" : S.cam, hole, frameBox)); // Tee is a game-focus view only
    if (!last.cam) { camera.position.copy(want.pos); controls.target.copy(want.target); } // first frame: no fly-in
  }
  last = { data: dataKey, cam: camKey, view, reset: S.resetTick };
}

/* ---------- Idle: a slow fly-through of the real course ----------
   high, cinematic passes along a loop of holes (behind each tee, looking down the hole), ~160 s per loop */
const FLY_HOLES = [10, 11, 12, 13, 15, 16, 18, 1, 2, 7].map(n => HOLES[n - 1]);
const flyPos = new THREE.CatmullRomCurve3(FLY_HOLES.map(h => h.tee.clone().addScaledVector(h.dir, -14).addScaledVector(h.perp, 8).add(V(0, 24, 0))), true, "centripetal");
const flyTgt = new THREE.CatmullRomCurve3(FLY_HOLES.map(h => h.tee.clone().lerp(h.green, 0.6)), true, "centripetal");
const FLY_SECONDS = 160; // unhurried: about 16 s per hole
let flyT = 0;

/* ---------- game focus: the insight card (video below it) is pinned to the shot, beside the landing ring ----------
   it follows the shot as the camera moves, staying clear of the overview card and the presenter column */
const gfStack = document.getElementById("gfStack");
function anchorInsight(px, py) {
  if (!gfStack || gfStack.hidden) return;
  const fr = frame.getBoundingClientRect(), k = STAGE_W / fr.width, R = el => { const r = el.getBoundingClientRect(); return { l: (r.left - fr.left) * k, t: (r.top - fr.top) * k, r: (r.right - fr.left) * k, b: (r.bottom - fr.top) * k }; };
  const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ui-read")) || 1, me = R(gfStack), w = me.r - me.l, h = me.b - me.t;
  const ov = R(document.getElementById("overview")), sc = R(document.querySelector(".sidecol")), right = document.getElementById("stage").dataset.side === "right";
  const lo = right ? ov.r + 60 : sc.r + 60, hi = (right ? sc.l : ov.l) - 60 - w;
  let x = px + 150; if (x > hi) x = px - 150 - w; // right of the ring, or left of it when there's no room
  callout.classList.toggle("lbl-left", x > px); // the ring's shot label goes on the other side of the card
  x = Math.min(Math.max(x, lo), Math.max(lo, hi));
  const y = Math.min(Math.max(py - 90, 80), STAGE_H - h - 320); // card top level with the ring, clear of the progress bar
  gfStack.style.left = x / z + "px"; gfStack.style.top = y / z + "px"; gfStack.style.right = gfStack.style.bottom = "auto"; // zoomed element: stage px / zoom
}

/* ---------- loop ---------- */
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (!view) return;
  if (view === "idle") { // camera rides the loop; target leads slightly so it looks ahead
    flyT = (flyT + dt / FLY_SECONDS) % 1;
    camera.position.copy(flyPos.getPointAt(flyT)); controls.target.copy(flyTgt.getPointAt((flyT + 0.01) % 1));
  } else if (hold) { // eases in over half a second, then ~55% closer per second; stops short of the ground
    hold.t += dt;
    const k = (1 - Math.exp(-dt * 0.8)) * Math.min(1, hold.t / 0.5), d = camera.position.distanceTo(hold.p);
    if (d > controls.minDistance + 1) camera.position.lerp(hold.p, k); // dolly in; the recentring below keeps the spot centred
  } else if (want) {
    const k = 1 - Math.pow(0.02, dt);
    camera.position.lerp(want.pos, k); controls.target.lerp(want.target, k);
    if (camera.position.distanceTo(want.pos) < 0.05) want = null;
  }
  if (recentre && view !== "idle") { // pan (no turn) so the anchor eases into the middle of the screen
    const d = recentre.clone().sub(controls.target);
    if (d.length() < 0.02) recentre = null;
    else { d.multiplyScalar(1 - Math.exp(-dt * 6)); camera.position.add(d); controls.target.add(d); }
  }
  uProg.value = Math.min(uProg.value + dt * 0.7, 1);
  controls.update(dt);
  renderer.render(scene, camera);
  if (view === "round" && callout && focusShot) { // pin the DOM callout to where the current shot finished (or, on Shot 0, to the ball)
    const p = V3(focusShot.pre ? focusShot.sh.from : focusShot.sh.to, 0.2).project(camera); // Shot 0: the ball before it is hit
    const px = ((p.x + 1) / 2) * STAGE_W, py = ((1 - p.y) / 2) * STAGE_H;
    callout.style.left = px - 60 + "px"; callout.style.top = py - 60 + "px";
    anchorInsight(px, py);
  }
});

window.sim = { update, get counts() { return counts; }, get zoneHole() { return zoneHole; }, get backend() { return renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2"; } };
dispatchEvent(new Event("sim-ready"));
