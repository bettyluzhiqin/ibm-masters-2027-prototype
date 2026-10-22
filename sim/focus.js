// Game focus: a chapter's shots as tubes, shot by shot. Each step's shot draws in from the club with a ball at its head while the
// camera rides beside it (slow at landing; low behind putts; leaning toward the winner when two players finish a hole).
import { THREE, scene, camera, controls, director, K, FOVK, HOLES, V, V3, heightAt, clamp } from "./course.js";
import { flightModel, flightPoint, easeIO, io3 } from "./flight.js";
import { cam, moving, pose } from "./camera.js";
import { clearView } from "./clearance.js";

export const focusGroup = new THREE.Group(); scene.add(focusGroup);
const COL = { one: "#fff", A: "#3ddbd9", B: "#ff832b", drop: "#8d8d8d" };
let builtFor = null;
const TUBE_R = 0.22, JOINT = new THREE.SphereGeometry(TUBE_R, 12, 8); // every shot the same width (putts were a third as wide)
export let FOCUS = []; // per hole of the chapter: { hole, shots, shotsB }

export function buildFocus(ch) {
  if (ch === builtFor) return; builtFor = ch;
  focusGroup.children.forEach(g => g.traverse(m => { m.geometry?.dispose(); m.material?.dispose(); }));
  focusGroup.clear();
  FOCUS = [...new Map(ch.steps.map(st => [st.hi, st])).values()].map(st => ({ hole: HOLES[st.hole - 1], shots: st.shots, shotsB: st.b?.shots || [] }));
  FOCUS.forEach(fh => {
    const g = new THREE.Group(); g.userData.nA = fh.shots.length; // two players: A's tubes, then B's
    const duo = fh.shotsB.length > 0;
    [...fh.shots.map(sh => [sh, duo ? COL.A : COL.one]), ...fh.shotsB.map(sh => [sh, COL.B])].forEach(([sh, colr]) => {
      if (!sh.from) { g.add(new THREE.Group()); return; } // a penalty stroke: keeps the shot indices aligned
      const f = V3(sh.from), t = V3(sh.to), type = sh.kind === "Putt" || sh.kind === "Drop" ? 3 : sh.kind === "Chip" ? 2 : 0;
      const fm = flightModel({ tee: sh.no === 1, putt: type === 3, toLie: sh.lie }, [f.x, f.y + .09, f.z], [t.x, t.y + .09, t.z], fh.hole.line, heightAt);
      const pts = Array.from({ length: 48 }, (_, i) => V(...flightPoint(fm, i / 47, [0, 0, 0], heightAt)));
      const mat = new THREE.MeshBasicNodeMaterial({ color: sh.kind === "Drop" ? COL.drop : colr }); // solid: see-through tubes render as dithered noise here
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, TUBE_R, 8), mat);
      // round joints at both ends: one shot flows into the next without a notch where the tubes meet at an angle
      for (const q of [pts[0], pts.at(-1)]) { const j = new THREE.Mesh(JOINT, mat); j.position.copy(q); tube.add(j); }
      tube.userData = { fm, col: mat.color.clone() }; g.add(tube);
    });
    focusGroup.add(g);
  });
}
// shows one step: earlier shots dimmed, later ones hidden; returns what the camera and callouts need about it
export function showFocusStep(ch, step) {
  const st = ch.steps[Math.min(step, ch.steps.length - 1)], curs = [], upcoming = []; // upcoming: on Shot 0, the shot about to be played
  focusGroup.children.forEach((g, h) => {
    g.visible = h === st.hi;
    const nA = g.userData.nA;
    g.children.forEach((m, s) => {
      m.geometry?.setDrawRange(0, Infinity); m.children.forEach(j => j.visible = true);
      const [i, me] = s < nA ? [s, st] : [s - nA, st.b], cur = me && !me.done && i === me.si;
      m.visible = !st.pre && !!me && (i < me.si || i === me.si); // Shot 0: no arcs at all, only the ball at its lie
      if (m.userData.col) m.material.color.copy(m.userData.col).multiplyScalar(cur ? 1 : 0.45);
      if (cur && m.visible && h === st.hi && m.userData.fm) curs.push(m);
      if (st.pre && me && i === me.si && h === st.hi && m.userData.fm) upcoming.push(m);
    });
  });
  const win = st.b && st.lastOfHole && st.strokes !== st.b.strokes ? V3((st.strokes < st.b.strokes ? st : st.b).shot.to) : null; // who won the hole
  return { h: st.hi, sh: st.shot, pre: !!st.pre, shB: st.b?.shot, curs, upcoming, win };
}

/* Shot 0: the ball at its lie */
const lieBall = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), new THREE.MeshBasicNodeMaterial({ color: "#fff" }));
lieBall.visible = false; scene.add(lieBall);
export function showLie(fs) { lieBall.visible = !!fs?.pre; if (fs?.pre) lieBall.position.copy(V3(fs.sh.from, .2)); }

/* the flight: the current shot(s) draw in, a ball at the head, the camera riding behind and a little to the side */
let flight = null;
export const flightNow = () => flight;
const heads = [0, 1].map(() => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshBasicNodeMaterial({ color: "#fff" })); b.visible = false; scene.add(b); return b; });
export function startFlight(fs, follow) { // fs: showFocusStep's result; follow: the camera rides with the ball (Tee view)
  if (!fs.curs.length) return false;
  const fms = fs.curs.map(m => m.userData.fm), d = Math.max(...fms.map(f => Math.hypot(f.e[0] - f.s[0], f.e[2] - f.s[2]))), putt = fms.every(f => f.putt);
  fs.curs.forEach(m => { m.geometry.setDrawRange(0, 0); m.children.forEach(j => j.visible = false); });
  flight = { ms: fs.curs, fms, t: 0, dur: putt ? 1.8 : clamp(1.3 + d / 110, 1.5, 3.6), follow, putt, win: fs.win, rest: fs.win ? 2.6 : 1.2 };
  if (follow) { director.tween = director.fly = null; controls.autoRotate = false; }
  return true;
}
export function stopFlight() { flight = null; heads.forEach(b => b.visible = false); }
export const flying = () => !!flight && flight.t < flight.dur; // the shot's labels and cards wait for the ball to land

const mid = a => a.reduce((s, v) => s.add(v), V(0, 0, 0)).multiplyScalar(1 / a.length);
// where the follow camera wants to be at shot progress te (e: real progress, 1 = landed): behind the shot and a little to the side,
// sliding down it with the ball; putts from behind and above. Returns [position, look-at, where the shot finished]
function followPose(f, te, e, ballsAt) {
  const s0 = mid(f.fms.map(fm => V(...fm.s))), s1 = mid(f.fms.map(fm => V(...fm.e))), ball = mid(ballsAt);
  const dir = s1.clone().sub(s0).setY(0), d = Math.max(K, dir.length()); dir.normalize();
  const back = Math.max(6 * K, d * .3) * FOVK, side = V(-dir.z, 0, dir.x); // a little off the line, so the arc reads as a curve, not a pole
  let pos = s0.clone().lerp(s1, te * .75).addScaledVector(dir, -back).addScaledVector(side, back * .55).add(V(0, Math.max(4.5 * K, d * .45) * FOVK, 0));
  let look = e < 1 ? ball : s1;
  return [pos, look, s1];
}
// the pose the follow camera starts from for this step: the move into a shot ends exactly here, so there is no lurch at the handover
export function followStart(fs) {
  const fms = fs.curs.map(m => m.userData.fm); if (!fms.length) return null;
  const [pos, look] = followPose({ fms, putt: fms.every(f => f.putt) }, 0, 0, fms.map(fm => V(...fm.s)));
  return pose(clearView(pos, look, 60), look);
}
export function flyShot(dt) { // per frame
  if (!flight || moving()) return; // a camera move first (flying in from another hole), then the shot
  const f = flight, e0 = f.t / f.dur; f.t += dt * (!f.putt && e0 > .72 && e0 < .97 ? .35 : 1); // slow at landing: the last stretch at a third of the speed
  const e = Math.min(1, f.t / f.dur), te = easeIO(e) * .92 + e * .08; // the ball eases off the club and into the landing
  f.ms.forEach(m => { m.geometry.setDrawRange(0, Math.ceil(m.geometry.index.count * te / 48) * 48); // whole rings: 8 sides × 6 indices
    m.children[0].visible = true; m.children[1].visible = e >= 1; });
  const ballsAt = f.fms.map(fm => V(...flightPoint(fm, te, [0, 0, 0], heightAt)));
  heads.forEach((b, i) => { b.visible = i < ballsAt.length && e < 1; if (b.visible) b.position.copy(ballsAt[i]); });
  if (f.follow && !cam.user) {
    let [pos, look, s1] = followPose(f, te, e, ballsAt);
    if (e >= 1 && f.win) { const k = 1 - f.rest / 2.6, d2 = f.win.clone().sub(s1).multiplyScalar(.6 * io3(clamp(k * 1.6, 0, 1))); pos.add(d2); look = s1.clone().add(d2); } // lean to the hole winner
    if (f.putt) { // putts: no swing round behind the line. Keep the side the camera already looks from, frame the whole putt, watch it roll
      const a = mid(f.fms.map(fm => V(...fm.s))), m = a.clone().lerp(s1, .5), len = a.distanceTo(s1), off = camera.position.clone().sub(controls.target).setY(0);
      if (off.length() < 1) off.set(0, 0, 1); off.normalize();
      const r = Math.max(22, len * 2.2 + 14); pos = m.clone().addScaledVector(off, r); pos.y = heightAt(pos.x, pos.z) + r * .7; look = m.clone().lerp(ballsAt[0], .25);
    }
    pos = clearView(pos, look, 60); // never behind a crown
    // eases in over the first 40% of the shot, so arriving (a hole flight, Shot 0) flows into following without a jolt
    const r = Math.min(1, e / .8), k = (1 - Math.exp(-dt * (f.putt ? 1.4 : 1.8))) * r * r * (3 - 2 * r); // from rest, ramping up smoothly
    camera.position.lerp(pos, k); controls.target.lerp(look, k);
  }
  if (e >= 1 && (f.rest -= dt) <= 0) { flight = null; cam.rest = pose(camera.position.clone(), controls.target.clone()); }
}
export const flightStatus = () => flight ? `${flight.putt ? "track the putt" : "follow the ball"} ${Math.round(Math.min(1, flight.t / flight.dur) * 100)}%${flight.t / flight.dur > .72 && flight.t < flight.dur ? " · slow at landing" : ""}${flight.t >= flight.dur && flight.win ? " · lean to winner" : ""}` : "";
