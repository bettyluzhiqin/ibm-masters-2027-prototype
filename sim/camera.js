// The camera: presets, touch (as v1), and the story camera from the camera-system page — moves played one after another.
// A move starts from wherever the camera is; a long one rises over the pines and glides to the next hole. Any touch hands the
// camera to the visitor at once; in a tour, 20 s without a touch eases it back to the story's resting view.
import { AW, THREE, camera, director, controls, D, K, FOVK, HOLES, V, heightAt, clamp, toW, dirW, live, nearestHole, veil } from "./course.js";
import { io3 } from "./flight.js";
import { clearView, canopyTop } from "./clearance.js";

/* shared camera state. user: the visitor has the camera; interactive: touch is allowed (not on Idle); rest: the story's resting view,
   for the drift back; orbit: the slow orbit may run between moves */
export const cam = { user: false, interactive: false, rest: null, lastTouch: 0, orbit: false };
const ORBIT_SPEED = 0.25, HAND_BACK_MS = 20000; // slow orbit: one turn ≈ 4 min

/* ---------- framing presets ---------- */
export const COURSE_BOX = (() => { const p = D.island.map(q => toW(...q)), xs = p.map(q => q[0]), zs = p.map(q => q[1]);
  return { cx: (Math.max(...xs) + Math.min(...xs)) / 2, cz: (Math.max(...zs) + Math.min(...zs)) / 2, r: Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...zs) - Math.min(...zs)) * 16 / 9) / 2 }; })();
const [OX, OZ] = dirW(0, 1); // v1's "from the south" orbit side, in world axes
export const pose = (pos, target) => ({ pos, target });
export function preset(name, h, box = COURSE_BOX) {
  if (!h) {
    const c = V(box.cx, heightAt(box.cx, box.cz), box.cz);
    return name === "Top" ? pose(c.clone().add(V(0, (box.r * 3.2 + 12 * K) * FOVK, 1)), c)
      : pose(c.clone().add(V(OX * 1.1, 0.9, OZ * 1.1).setLength((box.r * 2.2 + 14 * K) * FOVK)), c);
  }
  const mid = h.tee.clone().lerp(h.green, 0.5);
  switch (name) {
    case "Top": return pose(mid.clone().add(V(0, (h.len * 2.4 + 25 * K) * FOVK, 1)), mid);
    case "Tee": return pose(h.tee.clone().addScaledVector(h.dir, -10 * K * FOVK).add(V(0, 6 * K * FOVK, 0)), h.green.clone());
    case "Green": return pose(h.green.clone().addScaledVector(h.dir, -8 * K * FOVK).addScaledVector(h.perp, 2 * K).add(V(0, 11 * K * FOVK, 0)), h.green.clone());
    default: return pose(mid.clone().addScaledVector(h.perp, (h.len * 1.5 + 12 * K) * FOVK).add(V(0, (h.len * 1.4 + 12 * K) * FOVK, 0)), mid);
  }
}
export const go = (w, instant) => { stopMoves(); director.moveTo(w.pos, w.target, instant ? 0 : 3.6); }; // the course's own eased tween, unhurried

/* ---------- the move engine ----------
   A move is a factory (p0, q0) → { name, dur, at(e) → [position, target], linear?, start?, end? }, called with the camera's pose
   when the move begins. at(e) gets e eased in-out unless linear. */
let moves = [], mvT = 0, mv = null;
export function play(list, rest = null) { director.tween = director.fly = null; moves = list.filter(Boolean); mvT = 0; mv = null; cam.rest = rest; }
export function stopMoves() { moves = []; mv = null; }
export const moving = () => moves.length > 0;
export function runMoves(dt) { // per frame; true while a move is playing
  if (!moves.length) return false;
  if (cam.user) { stopMoves(); return false; }
  if (!mv) { mv = moves[0](camera.position.clone(), controls.target.clone()); mv.start?.(); }
  mvT += dt; const e = Math.min(1, mvT / mv.dur), [p, q] = mv.at(mv.linear ? e : io3(e));
  camera.position.copy(p); controls.target.copy(q); camera.lookAt(q);
  if (e >= 1) { const m = mv; moves.shift(); mvT = 0; mv = null; if (Math.abs(m.turn || 0) > .02) spin = Math.sign(m.turn); m.end?.(); }
  return true;
}
export const moveStatus = () => mv ? `${mv.name} ${Math.round(Math.min(1, mvT / mv.dur) * 100)}%${moves.length > 1 ? ` (+${moves.length - 1})` : ""}` : "";

// a view as heading, pitch and distance from the camera: moves turn the heading the short way round, at an even pace,
// instead of dragging the aim point across the course (which whips the camera round mid-flight)
const aim = (p, q) => { const d = q.clone().sub(p), dist = Math.max(1, d.length()); return { yaw: Math.atan2(d.x, d.z), pitch: Math.asin(clamp(d.y / dist, -1, 1)), dist }; };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const aimAt = (p, yaw, pitch, dist) => V(p.x + Math.sin(yaw) * Math.cos(pitch) * dist, p.y + Math.sin(pitch) * dist, p.z + Math.cos(yaw) * Math.cos(pitch) * dist);
export function travelTo(to, o = {}) { // ease there, ending with a clear view past the pines; a long way rises over them and glides down
  return (p0, q0) => { const dest = clearView(to.pos, to.target), d = q0.distanceTo(to.target), far = d > 250, lift = far ? clamp(d * .22, 40, 220) : 0; // a long way: up high, where speed reads calm
    const a0 = aim(p0, q0), a1 = aim(dest, to.target), turn = wrap(a1.yaw - a0.yaw);
    return { turn, name: o.name || (far ? "fly between holes" : "travel"), dur: o.dur || (far ? clamp(5 + d / 180, 6, 11) : 3.6), start: o.start, end: o.end,
      at: e => { const p = p0.clone().lerp(dest, e); p.y += lift * Math.sin(Math.PI * e);
        if (far) { const line = p0.y + (dest.y - p0.y) * e, over = canopyTop(p.x, p.z, heightAt(p.x, p.z)) + 25; // over the canopy, not through it:
          p.y = Math.max(p.y, line + Math.max(0, over - line) * Math.min(1, Math.sin(Math.PI * e) * 3)); }     // full clearance once 10% into the flight
        return [p, e >= 1 ? to.target.clone() : aimAt(p, a0.yaw + turn * e, a0.pitch + (a1.pitch - a0.pitch) * e, a0.dist + (a1.dist - a0.dist) * e)]; } }; };
}

const along = (h, d) => { let acc = 0; for (let k = 1; k < h.line.length; k++) { const a = h.line[k - 1], b = h.line[k], L = Math.hypot(b.x - a.x, b.z - a.z);
  if (acc + L >= d || k === h.line.length - 1) { const f = clamp((d - acc) / L, 0, 1), x = a.x + (b.x - a.x) * f, z = a.z + (b.z - a.z) * f; return V(x, heightAt(x, z), z); } acc += L; } };
const lineLen = h => h.line.reduce((n, q, k) => k ? n + Math.hypot(q.x - h.line[k - 1].x, q.z - h.line[k - 1].z) : 0, 0);

export function backToStory() { // Reset view in a tour: straight back to the story's view (instead of waiting 20 s)
  if (cam.user && cam.rest) { cam.user = false; play([travelTo(cam.rest, { name: "back to the story", dur: 2.4 })], cam.rest); }
}
export function handBack(tour) { // touch takes over; in a tour, quiet for 20 s: drift back to the story's resting view
  if (cam.user && tour && cam.rest && performance.now() - cam.lastTouch > HAND_BACK_MS) { cam.user = false; play([travelTo(cam.rest, { name: "drift back", dur: 3 })], cam.rest); }
}
// the slow orbit carries on the way the last move was turning (never against it) and eases up from a standstill over ~3 s.
// OrbitControls: a positive autoRotateSpeed turns the view's heading down, so a move that turned it up orbits with a negative one
let spin = -1, orbitT = 0;
export function orbitStep(dt) {
  const on = cam.orbit && !moving() && !cam.user; orbitT = on ? orbitT + dt : 0;
  const r = Math.min(1, orbitT / 3); controls.autoRotate = on; controls.autoRotateSpeed = -spin * ORBIT_SPEED * r * r * (3 - 2 * r);
}

/* ---------- Idle: a low drone along the signature holes, fading from one to the next ---------- */
const IDLE_HOLES = [13, 12, 16, 18, 10, 15, 11, 7, 2], SUN = [215, 42]; // one afternoon sun, short shadows (the course's default is 10°)
let idleI = 0;
AW.app.setSun?.(...SUN);
function droneAt(h, d) { const p = along(h, d), ahead = along(h, d + 170); return pose(V(p.x, p.y + 38, p.z), V(ahead.x, ahead.y + 4, ahead.z)); }
export function idleStop() { veil.style.opacity = "0"; } // leaving Idle mid-fade
// already there: the first frame of a tour (from Idle) is its first view, no move and no fade
export const jumpTo = to => () => ({ name: "start", dur: .001, at: () => [to.pos, to.target] });
// Idle's next hole: fade to the night green, the drone is there, fade back
export const cutTo = (to, name = "fade in") => (p0, q0) => ({ name, dur: 1.6, linear: true, start: () => veil.style.opacity = "1", end: () => veil.style.opacity = "0",
  at: e => e < .5 ? [p0, q0] : [to.pos, to.target] });
export function idleNext() {
  const h = HOLES[IDLE_HOLES[idleI++ % IDLE_HOLES.length] - 1], L = lineLen(h) * .85, dur = clamp(L / 7, 20, 45);
  // how much higher the drone must fly to see past the pines, sampled along the hole, each sample also covering its neighbours
  // so the drone rises before a tree rather than at it
  const n = 24, need = Array.from({ length: n + 1 }, (_, k) => { const w = droneAt(h, k / n * L); return clearView(w.pos, w.target, 60).y - w.pos.y; });
  const lift = need.map((_, k) => Math.max(...need.slice(Math.max(0, k - 1), k + 2)));
  const at = e => { const w = droneAt(h, e * L), f = e * n, k = Math.min(n - 1, Math.floor(f)); w.pos.y += lift[k] + (lift[k + 1] - lift[k]) * (f - k); return w; };
  // no flight between holes on Idle: fade to the night green, the drone starts on the next hole, fade back
  play([cutTo(at(0), `fade to ${h.n}`), () => ({ name: `drone along ${h.n}`, dur, linear: true, at: e => { const w = at(e); return [w.pos, w.target]; },
    end: () => live.view === "idle" && idleNext() })]);
}

/* ---------- touch (as v1): the whole course is the touch surface, every gesture anchored where the finger touches ----------
   - drag: the spot you grabbed glides to the centre of the screen and becomes the pivot you orbit around
   - pinch: zoom about the point between the fingers; two fingers also pan (its OrbitControls)
   - press and hold still: that spot glides to the centre and the camera keeps zooming in on it until the finger lifts
   - tap: near a hole's line of play focuses that hole (a hole tag does it too) ("hole-tap") */
let hold = null, recentre = null; // hold: { p: ground point, t: s held }; recentre: point easing to the screen centre
const MAX_POLAR = 1.42, MIN_DIST = 3; // v1 limits: never level with the horizon; hold-zoom stops a few metres short
Object.assign(controls, { autoRotateSpeed: ORBIT_SPEED, enableRotate: false, zoomToCursor: true }); // one-finger rotate is ours (below)
export function takeOver() { director.tween = director.fly = null; cam.user = true; controls.autoRotate = false; }
export function resetTouch() { hold = recentre = null; cam.user = false; }
controls.addEventListener("start", () => { cam.user = true; controls.autoRotate = false; recentre = hold = null; });
{
  const el = AW.app.renderer.domElement, ray = new THREE.Raycaster(), fingers = new Set(), UP = V(0, 1, 0), q = new THREE.Quaternion();
  for (const t of ["pointerdown", "wheel"]) el.addEventListener(t, () => { cam.lastTouch = performance.now(); }, { capture: true });
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
    if (fingers.size > 1 || !cam.interactive) { down = null; return; } // two fingers: pinch / pan
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
    const look = controls.target.clone().sub(camera.position).normalize(), polar = Math.acos(clamp(-look.y, -1, 1));
    if (polar < 0.05 || polar > MAX_POLAR || camera.position.y < heightAt(camera.position.x, camera.position.z) + 2) {
      camera.position.copy(before); controls.target.copy(tBefore);
    }
    camera.lookAt(controls.target);
  });
  const up = e => {
    fingers.delete(e.pointerId); const wasHold = !!hold, wasDrag = !!drag; stop(); drag = null;
    if (wasHold || wasDrag || e.type !== "pointerup" || !down || performance.now() - down.t > 450) { down = null; return; }
    down = null;
    aim(e.clientX, e.clientY);
    let hole = null; // (hole tags are buttons: they send "hole-tap" themselves)
    const p = ground(); if (p) { const nh = nearestHole(p.x, p.z); if (nh.d < 4.5 * K || p.distanceTo(nh.h.green) < 4 * K) hole = nh.h.n; }
    if (hole) dispatchEvent(new CustomEvent("hole-tap", { detail: hole }));
  };
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
}
export function steer(dt) { // per frame: hold-zoom, then pan the grabbed spot into the middle of the screen
  if (hold) { // eases in over half a second, then ~55% closer per second
    hold.t += dt;
    const k = (1 - Math.exp(-dt * 0.8)) * Math.min(1, hold.t / 0.5);
    if (camera.position.distanceTo(hold.p) > MIN_DIST + 1) camera.position.lerp(hold.p, k);
  }
  if (recentre && live.view !== "idle") {
    const d = recentre.clone().sub(controls.target);
    if (d.length() < 0.05) recentre = null;
    else { d.multiplyScalar(1 - Math.exp(-dt * 6)); camera.position.add(d); controls.target.add(d); }
  }
}
// where gestures may take the camera (only while the visitor steers; directed moves are never clamped): at least 3 m above
// the terrain, no further out than a little past the whole-course view, and the point it turns around kept over the course
let farDist = 0;
export function clampView() {
  if (!cam.user) return;
  const t = controls.target, b = COURSE_BOX, lim = b.r * 1.1, dx = t.x - b.cx, dz = t.z - b.cz, d = Math.hypot(dx, dz);
  if (d > lim) { const sx = b.cx + dx * lim / d - t.x, sz = b.cz + dz * lim / d - t.z; t.x += sx; t.z += sz; camera.position.x += sx; camera.position.z += sz; }
  if (!farDist) { const w = preset("Orbit", null, COURSE_BOX); farDist = w.pos.distanceTo(w.target) * 1.15; }
  const off = camera.position.clone().sub(t), dist = off.length();
  if (dist > farDist) camera.position.copy(t).addScaledVector(off, farDist / dist);
  const g = heightAt(camera.position.x, camera.position.z) + 3; if (camera.position.y < g) camera.position.y = g;
}
export const touchStatus = () => hold ? "hold-zoom" : recentre ? "recentring" : "";
