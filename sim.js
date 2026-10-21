// v2 Digital Twin: the Augusta WebGPU course (augusta/, the realistic reconstruction) runs in a same-origin iframe behind
// the UI, and this file draws the IBM data layer into its scene: shot arcs, game focus, zones, hole tags, the day's pins,
// camera presets. Same contract as v1: window.sim.update(S, view), counts, zoneHole, "sim-ready", "hole-tap".
const SIM_VIEWS = ["idle", "round", "filterset", "freeplay"];
const frame = document.getElementById("frame");

/* ---------- the course: augusta/ in an iframe, its own UI and shot layer hidden ---------- */
const ifr = document.createElement("iframe");
ifr.id = "simCanvas"; ifr.src = "augusta/index.html"; ifr.title = "Augusta National course"; ifr.style.border = "0";
frame.prepend(ifr);
const AW = await new Promise(res => { const t = setInterval(() => { const w = ifr.contentWindow; if (w?.app?.shots && w.director && w.world) { clearInterval(t); res(w); } }, 200); });
const THREE = AW.THREE, TSL = THREE.TSL, { Fn, If, Discard, attribute, uniform, vec4 } = TSL;
const { scene, camera } = AW.app, director = AW.director, controls = director.controls, world = AW.world;
AW.document.body.classList.add("quiet"); // hides its brand, bar, compass, markers and shot panel
AW.app.shots.setVisible(false); // our arcs replace its 2026 shot paths
// touches and keys on the course stay in the iframe: pass them up (audio unlock, Idle shortcuts, tour arrows)
AW.addEventListener("pointerdown", () => dispatchEvent(new PointerEvent("pointerdown")), { capture: true });
AW.addEventListener("keydown", e => document.dispatchEvent(new KeyboardEvent("keydown", { key: e.key })));

/* ---------- our data (v1 export) -> its world ----------
   least-squares fit of all 2026 shot endpoints in both exports (41k pairs, residual ~0.2 m, i.e. our quantisation).
   1 data unit = 9.148 m; the fit mirrors an axis, so "left/right of the hole" swaps but nothing else changes. */
const AX = [0.10079272, -9.14788794, -114.14933244], AZ = [-9.14777703, -0.10101099, 136.37627306], K = 9.148;
const toW = (x, z) => [AX[0] * x + AX[1] * z + AX[2], AZ[0] * x + AZ[1] * z + AZ[2]];
const dirW = (dx, dz) => { const x = AX[0] * dx + AX[1] * dz, z = AZ[0] * dx + AZ[1] * dz, l = Math.hypot(x, z) || 1; return [x / l, z / l]; };
const heightAt = (x, z) => world.heightAt(x, z);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const V3 = ([x, z], lift = 0) => { const [X, Z] = toW(x, z); return V(X, heightAt(X, Z) + lift, Z); };
// its scene pass feeds normals to ambient occlusion: lines have none and come out black, so give them an up normal
const withUp = g => { const a = new AW.Float32Array(g.attributes.position.count * 3); for (let i = 1; i < a.length; i += 3) a[i] = 1; g.setAttribute("normal", new THREE.BufferAttribute(a, 3)); return g; };
const FOVK = Math.tan(THREE.MathUtils.degToRad(16)) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); // v1 framing was tuned at fov 32

const D = window.MASTERS_DATA, M = window.MASTERS;
const RAWI = new Int16Array(await (await fetch("data/shots.bin?v=5")).arrayBuffer());
const W = D.fields.length, F = Object.fromEntries(D.fields.map((f, i) => [f, i])), NSHOT = D.count, QN = D.quant;
const at = (i, f) => RAWI[i * W + F[f]];
const posOf = (i, a, b) => toW(at(i, a) / QN, at(i, b) / QN);

/* ---------- holes: real tee, pin and fairway line, in world metres ---------- */
const HOLES = D.holes.map(d => {
  const line = d.line.map(p => V3(p)), tee = line[0], green = line[line.length - 1];
  const len = Math.hypot(green.x - tee.x, green.z - tee.z), dir = V(green.x - tee.x, 0, green.z - tee.z).normalize();
  return { n: d.n, name: d.name, par: d.par, yd: d.yd, line, tee, green, len, dir, perp: V(-dir.z, 0, dir.x) };
});
const seg2 = (x, z, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t); };
function nearestHole(x, z) {
  let best = null, bd = Infinity;
  HOLES.forEach(h => h.line.forEach((q, k) => { if (!k) return; const d = seg2(x, z, h.line[k - 1], q); if (d < bd) { bd = d; best = h; } }));
  return { h: best, d: bd };
}

/* ---------- pins: the day's hole location when one year and one round is shown ---------- */
const pins = new THREE.Group(), labels = new THREE.Group();
scene.add(pins, labels);
HOLES.forEach(h => {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4), new THREE.MeshBasicNodeMaterial({ color: "#fff" }));
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.5), new THREE.MeshBasicNodeMaterial({ color: "#f1c21b", side: THREE.DoubleSide }));
  pins.add(pole, flag);
});
let pinDay;
function placePins(day) {
  if (day === pinDay) return; pinDay = day;
  HOLES.forEach((h, i) => { const p = day && D.holes[i].pins[day], [x, z] = p ? toW(...p) : [h.green.x, h.green.z], y = heightAt(x, z);
    pins.children[2 * i].position.set(x, y + 1.2, z); pins.children[2 * i + 1].position.set(x + 0.38, y + 2.15, z); });
}
placePins(null);
const dayOf = f => f && f.Year && f.Year[0] === f.Year[1] && f.Round?.length === 1 ? `${f.Year[0]}-${f.Round[0].slice(1)}` : null;

/* ---------- hole markers: Carbon tag look, on a stem down to the tee (as v1) ---------- */
await document.fonts.load("600 64px 'IBM Plex Sans'"); await document.fonts.load("400 64px 'IBM Plex Sans'");
const LABEL_LIFT = 4 * K, TAG_K = 1 / FOVK; // sizeAttenuation off: on-screen size scales with the fov
function tag(h, selected, compact = false) {
  const c = document.createElement("canvas"); c.width = 1280; c.height = 256; const g = c.getContext("2d");
  const sub = `Par ${h.par} · ${h.yd} yd`;
  g.font = "400 76px 'IBM Plex Sans'"; const w = Math.min(1280, 256 + 56 + Math.max(g.measureText(h.name).width, g.measureText(sub).width * 0.75) + 56);
  const R = 40;
  if (!compact) {
    g.fillStyle = "rgba(12,33,22,.94)"; g.beginPath(); g.roundRect(0, 0, w, 256, R); g.fill();
    g.strokeStyle = "#1f4230"; g.lineWidth = 6; g.beginPath(); g.roundRect(3, 3, w - 6, 250, R - 3); g.stroke();
  }
  g.fillStyle = selected ? "#f7f5ec" : "#1a3b29"; g.beginPath(); g.roundRect(0, 0, 256, 256, R); g.fill();
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
  const tx = { off: tag(h, false), on: tag(h, true), mini: tag(h, false, true) };
  const sp = new THREE.Sprite(new THREE.SpriteNodeMaterial({ map: tx.off, depthTest: false, sizeAttenuation: false, transparent: true }));
  sp.position.set(h.tee.x, h.tee.y + LABEL_LIFT, h.tee.z); sp.center.set(0.1, 0);
  sp.userData = { n: String(h.n), hole: h.n, tex: tx, cur: tx.off }; sp.renderOrder = 10; labels.add(sp); TAGS.push(sp);
  stems.push(h.tee.x, h.tee.y, h.tee.z, h.tee.x, h.tee.y + LABEL_LIFT, h.tee.z);
});
{
  const g = withUp(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(stems, 3)));
  labels.add(new THREE.LineSegments(g, new THREE.LineBasicNodeMaterial({ color: "#f7f5ec", transparent: true, opacity: 0.6 })));
}

/* ---------- shot filters, matched straight against the Int16 rows (as v1) ---------- */
const ENUM = { Shot: ["type", ["Tee", "Approach", "Chip", "Putt"]], Score: ["score", D.scores], Region: ["region", D.regions], Sector: ["sector", D.sectors] };
const PIDX = new Map(D.players.map((n, i) => [n, i]));
const CHAMP = D.players.map(n => M.winners.includes(n));
function compile(f) {
  return Object.entries(f).map(([k, v]) => {
    if (k === "Hole") { const s = new Set(v.map(Number)); return i => s.has(at(i, "hole")); }
    if (k === "Round") { const s = new Set(v.map(r => +r.slice(1))); return i => s.has(at(i, "round")); }
    if (k === "Player") { const s = new Set(v.map(n => PIDX.get(n))); return i => s.has(at(i, "player")); }
    if (k === "Trophy") { const s = new Set(v.map(x => x === "Masters champion")); return i => s.has(CHAMP[at(i, "player")]); }
    if (k === "Year") return i => { const y = at(i, "year") + 2000; return y >= v[0] && y <= v[1]; };
    if (k === "Distance") return i => { const d = at(i, "yd"); return d >= v[0] && d <= v[1]; };
    if (k === "Stroke") return i => { const n = at(i, "stroke"); return n >= v[0] && (v[1] >= 8 || n <= v[1]); };
    if (ENUM[k]) { const [field, names] = ENUM[k], s = new Set(v.map(x => names.indexOf(x))); return i => s.has(at(i, field)); }
    return () => true;
  });
}
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

/* ---------- zones: where the selection finished on one hole, by sector ---------- */
const ZONE_AT = (() => {
  const acc = Array.from({ length: 19 }, () => D.sectors.map(() => [0, 0, 0]));
  for (let i = 0; i < NSHOT; i++) { const sc = at(i, "sector"); if (sc < 0) continue; const a = acc[at(i, "hole")][sc]; a[0] += at(i, "tx") / QN; a[1] += at(i, "tz") / QN; a[2]++; }
  return acc.map(h => h.map(([x, z, n]) => n ? toW(x / n, z / n) : null));
})();
const zoneGroup = new THREE.Group(); scene.add(zoneGroup);
const zoneLabel = txt => { const c = document.createElement("canvas"); c.width = 256; c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "rgba(12,33,22,.92)"; g.beginPath(); g.roundRect(8, 16, 240, 96, 30); g.fill();
  g.fillStyle = "#f7f5ec"; g.font = "600 64px 'IBM Plex Sans'"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 128, 66); return tex(c); };
let zoneKey = "";
function drawZones(holeN, rows) {
  const key = holeN + ":" + rows.length + ":" + rows[0];
  if (key === zoneKey) return; zoneKey = key;
  zoneGroup.children.forEach(o => { o.geometry?.dispose(); o.material.map?.dispose(); o.material.dispose(); }); zoneGroup.clear();
  if (!holeN) return;
  const n = D.sectors.map(() => 0); let tot = 0;
  for (const i of rows) if (at(i, "hole") === holeN) { const sc = at(i, "sector"); if (sc >= 0) { n[sc]++; tot++; } }
  if (!tot) return;
  D.sectors.forEach((name, sc) => {
    const c = ZONE_AT[holeN][sc]; if (!c) return;
    const share = n[sc] / tot, fair = name.startsWith("Fairway"), r = (fair ? 2.4 : 0.6) * K, y = heightAt(c[0], c[1]) + 0.3;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: "#fce300", transparent: true, opacity: 0.12 + 0.6 * share, depthWrite: false }));
    disc.position.set(c[0], y, c[1]); disc.renderOrder = 5; zoneGroup.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.4, r, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: "#fce300", transparent: true, opacity: 0.8, depthWrite: false }));
    ring.position.set(c[0], y + 0.05, c[1]); zoneGroup.add(ring);
    if (share < 0.005) return;
    const sp = new THREE.Sprite(new THREE.SpriteNodeMaterial({ map: zoneLabel(Math.round(share * 100) + "%"), depthTest: false, sizeAttenuation: false, transparent: true }));
    const g = HOLES[holeN - 1].green, lx = fair ? c[0] : g.x + (c[0] - g.x) * 2.4, lz = fair ? c[1] : g.z + (c[1] - g.z) * 2.4, ly = heightAt(lx, lz) + 1.2 * K;
    sp.position.set(lx, ly, lz);
    if (!fair) { const lg = withUp(new THREE.BufferGeometry().setFromPoints([V(c[0], y + 0.4, c[1]), V(lx, ly - 2, lz)]));
      zoneGroup.add(new THREE.Line(lg, new THREE.LineBasicNodeMaterial({ color: "#fce300", transparent: true, opacity: 0.7 }))); }
    sp.scale.set(0.04 * TAG_K * (window.TAG_SCALE || 1), 0.02 * TAG_K * (window.TAG_SCALE || 1), 1); sp.renderOrder = 11; zoneGroup.add(sp);
  });
}

/* ---------- arcs: one draw call, drawn in by the shader (TSL) ---------- */
const SCORE_COL = ["#d4bbff", "#ee5396", "#ffafd2", "#f1c21b", "#f6f2ff", "#82cfff", "#78a9ff", "#4589ff"];
const uProg = uniform(0), uAlpha = uniform(0.55);
const arcMat = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false });
arcMat.colorNode = Fn(() => {
  If(attribute("aT", "float").greaterThan(uProg.sub(attribute("aDelay", "float")).mul(1.6)), () => { Discard(); });
  return vec4(attribute("color", "vec3"), uAlpha);
})();
const arcs = new THREE.LineSegments(new THREE.BufferGeometry(), arcMat);
arcs.frustumCulled = false;
const MAX_ARCS = 30000;
const balls = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.18 * K * 0.5, 1), new THREE.MeshBasicNodeMaterial(), MAX_ARCS);
balls.setColorAt(0, new THREE.Color()); balls.count = 0; balls.frustumCulled = false;
scene.add(arcs, balls);
const hash = i => (Math.imul(i + 1, 2654435761) >>> 0) / 4294967296;
function arcPoint(fx, fz, tx, tz, type, bow, t, out, yf, yt) { // as v1, in metres
  const dx = tx - fx, dz = tz - fz, d = Math.hypot(dx, dz), h = type === 3 ? 0.25 : d * (type === 2 ? 0.16 : 0.22);
  const u = Math.pow(t, 0.8), lift = 4 * h * u * (1 - u), b = bow * d * 4 * t * (1 - t), inv = d ? 1 / d : 0;
  out[0] = fx + dx * t - dz * inv * b; out[1] = yf + (yt - yf) * t + 0.4 + lift; out[2] = fz + dz * t + dx * inv * b;
}
function buildArcs(groups) {
  const N = 16, cap = Math.floor(MAX_ARCS / groups.length), c = new THREE.Color(), p = [0, 0, 0], m = new THREE.Matrix4();
  const lists = groups.map(([rows, gc]) => { const k = Math.max(1, Math.ceil(rows.length / cap)); return [rows.filter((_, j) => j % k === 0), gc]; });
  const total = lists.reduce((n, [r]) => n + r.length, 0);
  const F32 = AW.Float32Array; // its realm: three checks instanceof to pick the vertex format
  const pos = new F32(total * N * 6), col = new F32(total * N * 6), aT = new F32(total * N * 2), dl = new F32(total * N * 2);
  const items = [], longest = Math.max(...lists.map(([r]) => r.length));
  for (let j = 0; j < longest; j++) lists.forEach(([rows, gc]) => { if (j < rows.length) items.push([rows[j], gc]); });
  let v = 0, n = 0;
  items.forEach(([i, gc]) => {
    const [fx, fz] = posOf(i, "fx", "fz"), [tx, tz] = posOf(i, "tx", "tz"), type = at(i, "type");
    const yf = heightAt(fx, fz), yt = heightAt(tx, tz), bow = (hash(i + 7919) - 0.5) * 0.12;
    c.set(gc || SCORE_COL[at(i, "score")] || "#8d8d8d");
    const delay = (n / Math.max(total, 1)) * 0.4;
    for (let k = 0; k < N; k++) for (const t of [k / N, (k + 1) / N]) {
      arcPoint(fx, fz, tx, tz, type, bow, t, p, yf, yt);
      pos.set(p, v * 3); col.set([c.r, c.g, c.b], v * 3); aT[v] = t; dl[v] = delay; v++;
    }
    balls.setMatrixAt(n, m.makeTranslation(tx, yt + 0.5, tz)); balls.setColorAt(n, c); n++;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aT", new THREE.BufferAttribute(aT, 1)); g.setAttribute("aDelay", new THREE.BufferAttribute(dl, 1)); withUp(g);
  arcs.geometry.dispose(); arcs.geometry = g;
  balls.count = n; balls.instanceMatrix.needsUpdate = true; balls.instanceColor.needsUpdate = true;
  uProg.value = 0;
  uAlpha.value = THREE.MathUtils.clamp(0.95 - 0.13 * Math.log10(total + 1), 0.32, 0.85);
}

/* ---------- Game focus: the chapter's sequence, shot by shot (as v1) ---------- */
const focusGroup = new THREE.Group(); scene.add(focusGroup);
let focusFor = null, FOCUS = [];
function buildFocus(ch) {
  if (ch === focusFor) return; focusFor = ch;
  focusGroup.children.forEach(g => g.children.forEach(m => { m.geometry?.dispose(); m.material?.dispose(); }));
  focusGroup.clear();
  FOCUS = [...new Map(ch.steps.map(st => [st.hi, st])).values()].map(st => ({ hole: HOLES[st.hole - 1], shots: st.shots }));
  FOCUS.forEach(fh => {
    const g = new THREE.Group();
    fh.shots.forEach(sh => {
      if (!sh.from) { g.add(new THREE.Group()); return; }
      const type = sh.kind === "Putt" ? 3 : sh.kind === "Chip" ? 2 : sh.kind === "Drop" ? 3 : 0, f = V3(sh.from), t = V3(sh.to);
      const pts = Array.from({ length: 30 }, (_, i) => { const o = [0, 0, 0]; arcPoint(f.x, f.z, t.x, t.z, type, 0, i / 29, o, f.y, t.y); return V(...o); });
      const r = (sh.kind === "Drop" ? 0.03 : type === 3 ? 0.04 : 0.1) * K * 0.5;
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, r, 8), new THREE.MeshBasicNodeMaterial({ color: sh.kind === "Drop" ? "#8d8d8d" : "#fff", transparent: true })));
    });
    focusGroup.add(g);
  });
}
function showFocusStep(ch, step) {
  const st = ch.steps[Math.min(step, ch.steps.length - 1)];
  focusGroup.children.forEach((g, h) => {
    g.visible = h === st.hi;
    g.children.forEach((m, s) => { m.visible = s < st.si || (s === st.si && !st.pre); if (m.material) m.material.opacity = s === st.si ? 1 : 0.4; });
  });
  return { h: st.hi, s: st.si, sh: st.shot, pre: !!st.pre };
}
function shotCam(sh) { // behind the ball, looking down the shot; high enough to clear the pines
  const from = V3(sh.from), to = V3(sh.to), d = Math.max(K, Math.hypot(to.x - from.x, to.z - from.z)), dir = to.clone().sub(from).setY(0).normalize();
  return { pos: from.clone().addScaledVector(dir, -Math.max(6 * K, d * 0.3) * FOVK).add(V(0, Math.max(4.5 * K, d * 0.5) * FOVK, 0)), target: from.clone().lerp(to, 0.7) };
}

/* ---------- framing ---------- */
function boxOf(lists) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, n = 0;
  lists.forEach(rows => { const k = Math.max(1, Math.ceil(rows.length / 4000)); for (let j = 0; j < rows.length; j += k) {
    for (const [a, b] of [["fx", "fz"], ["tx", "tz"]]) { const [x, z] = posOf(rows[j], a, b);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); n++; } } });
  return n ? { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, r: Math.max(x1 - x0, (z1 - z0) * 16 / 9) / 2 + 4 * K } : COURSE_BOX;
}
const COURSE_BOX = (() => { const p = D.island.map(q => toW(...q)), xs = p.map(q => q[0]), zs = p.map(q => q[1]);
  return { cx: (Math.max(...xs) + Math.min(...xs)) / 2, cz: (Math.max(...zs) + Math.min(...zs)) / 2, r: Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...zs) - Math.min(...zs)) * 16 / 9) / 2 }; })();
let frameBox = COURSE_BOX;
const [OX, OZ] = dirW(0, 1); // v1's "from the south" orbit side, in world axes
function preset(name, h, box = COURSE_BOX) {
  if (!h) {
    const c = V(box.cx, heightAt(box.cx, box.cz), box.cz);
    return name === "Top" ? { pos: c.clone().add(V(0, (box.r * 3.2 + 12 * K) * FOVK, 1)), target: c }
      : { pos: c.clone().add(V(OX * 1.1, 0.9, OZ * 1.1).setLength((box.r * 2.2 + 14 * K) * FOVK)), target: c };
  }
  const mid = h.tee.clone().lerp(h.green, 0.5);
  switch (name) {
    case "Top": return { pos: mid.clone().add(V(0, (h.len * 2.4 + 25 * K) * FOVK, 1)), target: mid };
    case "Tee": return { pos: h.tee.clone().addScaledVector(h.dir, -10 * K * FOVK).add(V(0, 6 * K * FOVK, 0)), target: h.green.clone() };
    case "Green": return { pos: h.green.clone().addScaledVector(h.dir, -8 * K * FOVK).addScaledVector(h.perp, 2 * K).add(V(0, 11 * K * FOVK, 0)), target: h.green.clone() };
    default: return { pos: mid.clone().addScaledVector(h.perp, (h.len * 1.5 + 12 * K) * FOVK).add(V(0, (h.len * 1.4 + 12 * K) * FOVK, 0)), target: mid };
  }
}
const go = (w, instant) => director.moveTo(w.pos, w.target, instant ? 0 : 2.2); // its eased tween (arcs up over long moves)

/* ---------- touch (as v1): the whole course is the touch surface, every gesture anchored where the finger touches ----------
   - drag: the spot you grabbed glides to the centre of the screen and becomes the pivot you orbit around
   - pinch: zoom about the point between the fingers; two fingers also pan (its OrbitControls)
   - press and hold still: that spot glides to the centre and the camera keeps zooming in on it until the finger lifts
   - tap: a flag zooms to its green; a hole (tag, or near its line of play) focuses that hole */
let userCam = false, interactive = false, hold = null, recentre = null; // hold: { p: ground point, t: s held }; recentre: point easing to the screen centre
const MAX_POLAR = 1.42, MIN_DIST = 3; // v1 limits: never level with the horizon; hold-zoom stops a few metres short
Object.assign(controls, { autoRotateSpeed: 0.6, enableRotate: false, zoomToCursor: true }); // one-finger rotate is ours (below)
const takeOver = () => { director.tween = director.fly = null; userCam = true; controls.autoRotate = false; };
controls.addEventListener("start", () => { userCam = true; controls.autoRotate = false; recentre = hold = null; });
{
  const el = AW.app.renderer.domElement, ray = new THREE.Raycaster(), fingers = new Set(), UP = V(0, 1, 0), q = new THREE.Quaternion();
  let down = null, drag = null, timer = 0;
  const aim = (x, y) => { const r = el.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), camera); };
  const ground = () => { // march the ray down to the terrain; null if it never lands
    const p = V(0, 0, 0);
    for (let s = 0; s < 6000; s += 1) { p.copy(ray.ray.origin).addScaledVector(ray.ray.direction, s); if (p.y <= heightAt(p.x, p.z)) return p; }
    return null;
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
    aim(e.clientX, e.clientY); down.p = ground() || controls.target.clone(); // grabbed the sky: keep the current centre
    timer = setTimeout(() => { hold = { p: down.p, t: 0 }; recentre = down.p; takeOver(); }, 380); // held still: zoom in
  });
  el.addEventListener("pointermove", e => {
    if (!down || hold || fingers.size > 1) return;
    if (!drag) { if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10) return; // still a tap or a hold
      clearTimeout(timer); drag = { x: e.clientX, y: e.clientY }; recentre = down.p; takeOver(); return; }
    const k = (2 * Math.PI) / el.clientHeight * 0.6, dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    turn(UP, -dx * k, down.p); // spin around the grabbed spot
    const right = V(1, 0, 0).applyQuaternion(camera.quaternion), before = camera.position.clone(), tBefore = controls.target.clone();
    turn(right, -dy * k, down.p); // tilt around it, within the usual limits and never under the ground
    const look = controls.target.clone().sub(camera.position).normalize(), polar = Math.acos(THREE.MathUtils.clamp(-look.y, -1, 1));
    if (polar < 0.05 || polar > MAX_POLAR || camera.position.y < heightAt(camera.position.x, camera.position.z) + 2) {
      camera.position.copy(before); controls.target.copy(tBefore);
    }
    camera.lookAt(controls.target);
  });
  const up = e => {
    fingers.delete(e.pointerId); const wasHold = !!hold, wasDrag = !!drag; stop(); drag = null;
    if (wasHold || wasDrag || e.type !== "pointerup" || !down || performance.now() - down.t > 450) { down = null; return; }
    down = null;
    const r = el.getBoundingClientRect();
    if (pins.visible) { // a flag: zoom to its green (generous target: within ~40 px on screen)
      const near = HOLES.map(h => { const p = h.green.clone().add(V(0, 2, 0)).project(camera);
        return { h, d: Math.hypot(r.left + (p.x + 1) / 2 * r.width - e.clientX, r.top + (1 - p.y) / 2 * r.height - e.clientY), front: p.z < 1 }; })
        .filter(x => x.front).sort((a, b) => a.d - b.d)[0];
      if (near && near.d < 40) { recentre = null; go(preset("Green", near.h)); userCam = true; controls.autoRotate = false; return; }
    }
    aim(e.clientX, e.clientY);
    const tagHit = labels.visible && ray.intersectObjects(TAGS, false)[0];
    let hole = tagHit ? tagHit.object.userData.hole : null;
    if (!hole) { const p = ground(); if (p) { const nh = nearestHole(p.x, p.z); if (nh.d < 4.5 * K || p.distanceTo(nh.h.green) < 4 * K) hole = nh.h.n; } }
    if (hole) dispatchEvent(new CustomEvent("hole-tap", { detail: hole }));
  };
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
}
function steer(dt) { // per frame, from the tick below: hold-zoom, then pan the anchor into the middle of the screen
  if (hold) { // eases in over half a second, then ~55% closer per second
    hold.t += dt;
    const k = (1 - Math.exp(-dt * 0.8)) * Math.min(1, hold.t / 0.5);
    if (camera.position.distanceTo(hold.p) > MIN_DIST + 1) camera.position.lerp(hold.p, k);
  }
  if (recentre && view !== "idle") {
    const d = recentre.clone().sub(controls.target);
    if (d.length() < 0.05) recentre = null;
    else { d.multiplyScalar(1 - Math.exp(-dt * 6)); camera.position.add(d); controls.target.add(d); }
  }
}

/* ---------- Idle: its flyover, hole after hole, on a loop ---------- */
const FLY_HOLES = [10, 11, 12, 13, 15, 16, 18, 1, 2, 7];
let flyI = 0;
director.onChange(mode => { if (view === "idle" && mode === "orbit") director.flyover(FLY_HOLES[flyI = (flyI + 1) % FLY_HOLES.length]); });

/* ---------- state from index.html ---------- */
let last = {}, view = null, focusShot = null, counts = {}, lastRows = [], zoneHole = null;
const GROUP_COL = { A: "#3ddbd9", B: "#ff832b" };
const callout = document.getElementById("callout");
const STAGE_W = 5280, STAGE_H = 2970;

function update(S, v) {
  view = SIM_VIEWS.includes(v) ? v : null;
  ifr.style.visibility = view ? "visible" : "hidden";
  if (!view) { last = {}; return; }
  const fp = view === "freeplay";
  const ch = S.chapter;
  const filters = fp ? S.filters : view === "filterset" ? ch.filters : view === "idle" ? {} : null;
  const filtersB = fp && S.compare ? S.filtersB : view === "filterset" ? ch.filtersB || null : null;
  const course = view !== "idle";
  const disp = !course ? { shots: true, names: false, pins: false, data: "Arcs" } : view === "filterset" && ch.display ? { ...S.display, ...ch.display } : S.display; // a chapter can turn on zones / pins
  controls.enabled = interactive = course;
  controls.autoRotate = course && S.cam === "Orbit" && !userCam;
  labels.visible = disp.names; pins.visible = disp.pins;
  const dayA = view === "round" ? `${ch.steps[0].seq.year}-${ch.steps[0].seq.round}` : dayOf(filters), dayB = filtersB ? dayOf(filtersB) : dayA;
  placePins(dayA === dayB ? dayA : null);
  const picked = filtersB ? (filters?.Hole && filtersB.Hole ? [...filters.Hole, ...filtersB.Hole] : null) : filters?.Hole;
  const tagged = fp && S.flyHole ? [String(S.flyHole)] : picked;
  const ts = TAG_K * (window.TAG_SCALE || 1);
  TAGS.forEach(l => { l.scale.set(0.12 * ts, 0.024 * ts, 1); const on = !!tagged?.includes(l.userData.n), t = on ? l.userData.tex.on : tagged ? l.userData.tex.mini : l.userData.tex.off;
    if (t !== l.userData.cur) { l.material.map = l.userData.cur = t; l.material.needsUpdate = true; } l.material.opacity = tagged && !on ? 0.6 : 1; });
  focusGroup.visible = view === "round";
  if (view === "round") { buildFocus(ch); focusShot = showFocusStep(ch, S.step); }

  const dataKey = JSON.stringify([filters, filtersB]);
  if (dataKey !== last.data) {
    const a = pickShots(filters), b = pickShots(filtersB);
    buildArcs(filtersB ? [[a, GROUP_COL.A], [b, GROUP_COL.B]] : [[a, null]]);
    lastRows = a;
    counts = { a: a.length, b: filtersB ? b.length : null, sa: stats(a), sb: filtersB ? stats(b) : null };
    frameBox = boxOf(filtersB ? [a, b] : [a]);
  }
  arcs.visible = !!filters && disp.shots && disp.data === "Arcs";
  balls.visible = !!filters && disp.shots && disp.data === "Balls";

  const one = picked && new Set(picked).size === 1 ? picked[0] : null;
  const hole = fp && S.flyHole ? HOLES[S.flyHole - 1] : one ? HOLES[+one - 1] : null;
  zoneHole = disp.zones && filters && view !== "round" && hole ? hole.n : null;
  drawZones(zoneHole, zoneHole ? lastRows : []); zoneGroup.visible = !!zoneHole;
  const camKey = view === "idle" ? "idle" : view === "round" ? ["round", ch.title, S.step, S.cam, S.frameTick, S.resetTick].join() : [view, S.cam, hole?.n, dataKey, S.frameTick, S.resetTick].join();
  const wholeCourse = fp && (last.view !== view || S.resetTick !== last.reset);
  if (camKey !== last.cam && view === "idle") { hold = recentre = null; director.flyover(FLY_HOLES[flyI]); }
  else if (camKey !== last.cam) {
    userCam = false; hold = recentre = null;
    go(view === "round" ? (S.cam === "Tee" ? shotCam(focusShot.sh) : preset(S.cam, FOCUS[focusShot.h].hole))
      : (wholeCourse ? preset(S.cam === "Tee" ? "Orbit" : S.cam, null, COURSE_BOX) : preset(S.cam === "Tee" ? "Orbit" : S.cam, hole, frameBox)), !last.cam);
  }
  last = { data: dataKey, cam: camKey, view, reset: S.resetTick };
}

/* ---------- game focus: the insight card is pinned to the shot (as v1) ---------- */
const gfStack = document.getElementById("gfStack");
function anchorInsight(px, py) {
  if (!gfStack || gfStack.hidden) return;
  const fr = frame.getBoundingClientRect(), k = STAGE_W / fr.width, R = el => { const r = el.getBoundingClientRect(); return { l: (r.left - fr.left) * k, t: (r.top - fr.top) * k, r: (r.right - fr.left) * k, b: (r.bottom - fr.top) * k }; };
  const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ui-read")) || 1, me = R(gfStack), w = me.r - me.l, h = me.b - me.t;
  const ov = R(document.getElementById("overview")), sc = R(document.querySelector(".sidecol")), right = document.getElementById("stage").dataset.side === "right";
  const lo = right ? ov.r + 60 : sc.r + 60, hi = (right ? sc.l : ov.l) - 60 - w;
  let x = px + 150; if (x > hi) x = px - 150 - w;
  callout.classList.toggle("lbl-left", x > px);
  x = Math.min(Math.max(x, lo), Math.max(lo, hi));
  const y = Math.min(Math.max(py - 90, 80), STAGE_H - h - 320);
  gfStack.style.left = x / z + "px"; gfStack.style.top = y / z + "px"; gfStack.style.right = gfStack.style.bottom = "auto";
}

/* ---------- per frame: arcs draw in, the callout follows the shot (its loop renders) ---------- */
let tPrev = performance.now();
function advance(dt) { // one frame of the data layer; the rAF loop below calls it, and sim.advance() drives it headless
  uProg.value = Math.min(uProg.value + dt * 0.7, 1);
  steer(dt);
  if (view === "round" && callout && focusShot) {
    const p = V3(focusShot.pre ? focusShot.sh.from : focusShot.sh.to, 0.5).project(camera);
    const px = ((p.x + 1) / 2) * STAGE_W, py = ((1 - p.y) / 2) * STAGE_H;
    callout.style.left = px - 60 + "px"; callout.style.top = py - 60 + "px";
    anchorInsight(px, py);
  }
}
(function tick(now) {
  const dt = Math.min(0.1, (now - tPrev) / 1000); tPrev = now;
  advance(dt);
  requestAnimationFrame(tick);
})(tPrev);

window.sim = { update, advance, get counts() { return counts; }, get zoneHole() { return zoneHole; }, get backend() { return "WebGPU (Augusta course)"; } };
dispatchEvent(new Event("sim-ready"));
