// What the data layer draws on the course besides game focus: the shot arcs (and balls).
import { AW, THREE, TSL, scene, D, HOLES, heightAt, withUp, tok } from "./course.js";
import { at, posOf } from "./shots.js";
import { flightModel, flightPoint } from "./flight.js";
const { Fn, If, Discard, attribute, uniform, vec4, vec3, mix, smoothstep } = TSL;

export const SCORE_COL = ["hole-in-one", "albatross", "eagle", "birdie", "par", "bogey", "double-bogey", "triple-bogey"].map(n => tok("--score-" + n)); // colours are tokens in css/app.css, in score order
export const GROUP_COL = { A: tok("--group-a"), B: tok("--group-b") };
const NONE = tok("--data-none");
/* ---------- arcs: one draw call, drawn in by the shader (TSL) ---------- */
const ARC_RATE = 0.32;                 // the draw-in takes ~3.5 s
const uProg = uniform(0), uAlpha = uniform(0.55);
const arcMat = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false });
arcMat.colorNode = Fn(() => { // faint off the club, full where the shots land; a bright head while they draw in
  const t = attribute("aT", "float"), front = uProg.sub(attribute("aDelay", "float")).mul(1.6);
  If(t.greaterThan(front), () => { Discard(); });
  const head = smoothstep(0.07, 0, front.sub(t)).mul(smoothstep(1.1, 0.95, front)); // 1 right at the drawing front, 0 once drawn
  const c = mix(attribute("color", "vec3"), vec3(1, 1, 1), head.mul(0.7));
  return vec4(c, mix(uAlpha.mul(mix(0.16, 1, smoothstep(0, 0.45, t))), 1, head));
})();
// arc geometry with every attribute the shader reads: the renderer compiles the shader against the first geometry it sees,
// and an empty one leaves it without position, colour, aT and aDelay for good (no arcs at all)
function arcGeometry(pos, col, aT, dl) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aT", new THREE.BufferAttribute(aT, 1)); g.setAttribute("aDelay", new THREE.BufferAttribute(dl, 1));
  return withUp(g);
}
const lines = new THREE.LineSegments(arcGeometry(new AW.Float32Array(6), new AW.Float32Array(6), new AW.Float32Array(2), new AW.Float32Array(2)), arcMat);
lines.frustumCulled = false;
// a small selection (Langer vs DeChambeau's round: ~140 shots) as hairlines is a few faint pixels from afar, so up to THICK_MAX
// shots each arc is a tube instead, as wide as the view needs (set from the framing), opaque, drawn in the same way
const THICK_MAX = 600, RING = 6, TSEG = 40;
const tubeMat = new THREE.MeshBasicNodeMaterial();
tubeMat.colorNode = Fn(() => {
  const t = attribute("aT", "float"), front = uProg.sub(attribute("aDelay", "float")).mul(1.6);
  If(t.greaterThan(front), () => { Discard(); });
  const head = smoothstep(0.07, 0, front.sub(t)).mul(smoothstep(1.1, 0.95, front));
  const c = mix(attribute("color", "vec3").mul(mix(0.55, 1, smoothstep(0, 0.45, t))), vec3(1, 1, 1), head.mul(0.7)); // darker off the club, as the lines fade
  return vec4(c, 1);
})();
const tubes = new THREE.Mesh(arcGeometry(new AW.Float32Array(9), new AW.Float32Array(9), new AW.Float32Array(3), new AW.Float32Array(3)), tubeMat);
tubes.frustumCulled = false; tubes.visible = false;
export const arcs = new THREE.Group(); arcs.add(lines, tubes); // sim.js shows or hides the arcs as one
const MAX_ARCS = 30000, SEGS = 32;
export const balls = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.45, 1), new THREE.MeshBasicNodeMaterial(), MAX_ARCS);
balls.setColorAt(0, new THREE.Color()); balls.count = 0; balls.frustumCulled = false;
scene.add(arcs, balls);

let job = null; // an arc build in progress (see stepArcs)
const ARCS_PER_FRAME = 600, TUBES_PER_FRAME = 60; // a 30,000-arc build spreads over ~50 frames instead of blocking one for ~400 ms (the freeze)

// groups: [[rows, colour or null (score colours)], …]; width: tube radius in metres for a small selection (from the framing);
// the build runs in slices from advance(), the old arcs hide meanwhile
export function buildArcs(groups, width = 1) {
  const cap = Math.floor(MAX_ARCS / groups.length);
  const lists = groups.map(([rows, gc]) => { const k = Math.max(1, Math.ceil(rows.length / cap)); return [rows.filter((_, j) => j % k === 0), gc]; });
  const total = lists.reduce((n, [r]) => n + r.length, 0), items = [], longest = Math.max(0, ...lists.map(([r]) => r.length));
  for (let j = 0; j < longest; j++) lists.forEach(([rows, gc]) => { if (j < rows.length) items.push([rows[j], gc]); }); // groups interleaved: both draw in together
  const F32 = AW.Float32Array; // its realm: three checks instanceof to pick the vertex format
  const thick = total <= THICK_MAX, nv = thick ? total * (TSEG + 1) * RING : total * SEGS * 2;
  job = { items, total, thick, width, i: 0, v: 0, pos: new F32(nv * 3), col: new F32(nv * 3), aT: new F32(nv), dl: new F32(nv), idx: thick ? new AW.Uint32Array(total * TSEG * RING * 6) : null, ix: 0 };
  lines.geometry.setDrawRange(0, 0); tubes.geometry.setDrawRange(0, 0); balls.count = 0; uProg.value = 0;
}
function stepArcs() {
  if (!job) return;
  const { items, total, pos, col, aT, dl, thick } = job, c = new THREE.Color(), p = [0, 0, 0], m = new THREE.Matrix4(), end = Math.min(items.length, job.i + (thick ? TUBES_PER_FRAME : ARCS_PER_FRAME));
  const ballK = thick ? Math.max(1, job.width * 2.2 / 0.45) : 1, S3 = new THREE.Vector3(ballK, ballK, ballK), Q = new THREE.Quaternion(), P3 = new THREE.Vector3();
  for (; job.i < end; job.i++) {
    const [i, gc] = items[job.i], [fx, fz] = posOf(i, "fx", "fz"), [tx, tz] = posOf(i, "tx", "tz"), type = at(i, "type"), yt = heightAt(tx, tz);
    const fm = flightModel({ tee: type === 0, putt: type === 3, toLie: D.regions[at(i, "region")] }, [fx, heightAt(fx, fz) + .09, fz], [tx, yt + .09, tz], HOLES[at(i, "hole") - 1].line, heightAt);
    c.set(gc || SCORE_COL[at(i, "score")] || NONE);
    const delay = (job.i / Math.max(total, 1)) * 0.4;
    if (thick) tube(fm, c, delay); else for (let k = 0; k < SEGS; k++) for (const t of [k / SEGS, (k + 1) / SEGS]) {
      flightPoint(fm, t, p, heightAt); pos.set(p, job.v * 3); col.set([c.r, c.g, c.b], job.v * 3); aT[job.v] = t; dl[job.v] = delay; job.v++;
    }
    balls.setMatrixAt(job.i, m.compose(P3.set(tx, yt + 0.5 * ballK, tz), Q, S3)); balls.setColorAt(job.i, c);
  }
  if (job.i < items.length) return;
  const target = thick ? tubes : lines, other = thick ? lines : tubes, g = arcGeometry(pos, col, aT, dl);
  if (thick) g.setIndex(new THREE.BufferAttribute(job.idx, 1));
  target.geometry.dispose(); target.geometry = g; target.visible = true; other.visible = false;
  balls.count = items.length; balls.instanceMatrix.needsUpdate = true; if (balls.instanceColor) balls.instanceColor.needsUpdate = true;
  uProg.value = 0; uAlpha.value = THREE.MathUtils.clamp(0.95 - 0.13 * Math.log10(total + 1), 0.32, 0.85);
  job = null;
}
// one arc as a tube: TSEG+1 rings of RING vertices around the flight path, each ring at right angles to the path
function tube(fm, c, delay) {
  const { pos, col, aT, dl, idx, width } = job, pts = [], base = job.v;
  for (let k = 0; k <= TSEG; k++) pts.push(flightPoint(fm, k / TSEG, [0, 0, 0], heightAt));
  const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k <= TSEG; k++) {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(TSEG, k + 1)];
    T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize(); N.crossVectors(T, UP); if (N.lengthSq() < 1e-6) N.set(1, 0, 0); N.normalize(); B.crossVectors(N, T);
    for (let r = 0; r < RING; r++) {
      const ang = r / RING * Math.PI * 2, cs = Math.cos(ang) * width, sn = Math.sin(ang) * width;
      pos.set([pts[k][0] + N.x * cs + B.x * sn, pts[k][1] + N.y * cs + B.y * sn, pts[k][2] + N.z * cs + B.z * sn], job.v * 3);
      col.set([c.r, c.g, c.b], job.v * 3); aT[job.v] = k / TSEG; dl[job.v] = delay; job.v++;
    }
  }
  for (let k = 0; k < TSEG; k++) for (let r = 0; r < RING; r++) {
    const a = base + k * RING + r, b = base + k * RING + (r + 1) % RING, c2 = a + RING, d = b + RING;
    idx.set([a, c2, b, b, c2, d], job.ix); job.ix += 6;
  }
}
export const arcsReady = () => !job;
export function advanceArcs(dt) { // per frame: build the next slice, then draw in once built
  stepArcs();
  if (!job) uProg.value = Math.min(uProg.value + dt * ARC_RATE, 1.1);
}
