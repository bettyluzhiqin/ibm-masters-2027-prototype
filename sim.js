// v2 Digital Twin: the Augusta WebGPU course (augusta/) behind the UI, with the IBM data layer drawn into its scene.
// This file connects index.html to the layers; the work is in sim/: course (bootstrap, coordinates, holes), shots (data,
// filters), flight (shot shape), layers (arcs), tags (hole tags, flat UI), focus (game focus), camera (moves, story camera, touch, Idle).
// Contract with index.html (as v1): window.sim.update(S, view) on every render, window.sim.counts for the cards,
// "sim-ready" once the course is up, "hole-tap" when a hole is tapped.
import { ifr, frame, camera, controls, HOLES, V3, K, heightAt, clamp, live } from "./sim/course.js";
import { pickShots, stats, boxOf } from "./sim/shots.js";
import { setTags, placeTags } from "./sim/tags.js";
import { flightModel, flightPoint } from "./sim/flight.js";
import { arcs, balls, buildArcs, advanceArcs, arcsReady, GROUP_COL } from "./sim/layers.js";
import { focusGroup, buildFocus, showFocusStep, followStart, showLie, startFlight, stopFlight, flyShot, flying, flightNow, flightStatus } from "./sim/focus.js";
import { cam, COURSE_BOX, preset, go, play, stopMoves, runMoves, moving, moveStatus, travelTo, jumpTo, cutTo, handBack, backToStory, orbitStep, idleNext, idleStop, steer, resetTouch, touchStatus } from "./sim/camera.js";

const SIM_VIEWS = ["idle", "round", "filterset", "freeplay"];
let last = {}, focusShot = null, counts = {}, rowsA = [], rowsB = null, frameBox = COURSE_BOX;

/* ---------- state from index.html, on every render ---------- */
function update(S, v) {
  const view = live.view = SIM_VIEWS.includes(v) ? v : null;
  ifr.style.visibility = view ? "visible" : "hidden";
  if (!view) { last = {}; return; }
  const fp = view === "freeplay", ch = S.chapter;
  const filters = fp ? S.filters : view === "filterset" ? ch.filters : null; // Idle: just the course, no arcs
  const filtersB = fp && S.compare ? S.filtersB : view === "filterset" ? ch.filtersB || null : null;
  const course = view !== "idle";
  const disp = !course ? { shots: true, names: false, data: "Arcs" } : view === "filterset" && ch.display ? { ...S.display, ...ch.display } : S.display; // a chapter can turn display layers on (ch.display)
  cam.interactive = course;
  cam.orbit = view === "filterset"; // the slow orbit: every tour data story, never Freeplay
  const picked = filtersB ? (filters?.Hole && filtersB.Hole ? [...filters.Hole, ...filtersB.Hole] : null) : filters?.Hole;
  setTags(disp.names, fp && S.flyHole ? [String(S.flyHole)] : picked);
  focusGroup.visible = view === "round"; if (view !== "round") stopFlight();
  if (view === "round") { buildFocus(ch); focusShot = showFocusStep(ch, S.step); }

  const dataKey = JSON.stringify([filters, filtersB]);
  if (dataKey !== last.data) {
    rowsA = pickShots(filters); rowsB = filtersB ? pickShots(filtersB) : null;
    frameBox = boxOf(rowsB ? [rowsA, rowsB] : [rowsA], 4 * K) || COURSE_BOX;
    // builds over the next frames (no freeze); a small selection gets tubes as wide as its framing needs (~1.3 m over the whole course)
    buildArcs(rowsB ? [[rowsA, GROUP_COL.A], [rowsB, GROUP_COL.B]] : [[rowsA, null]], clamp(frameBox.r * .0018, .3, 2.5));
    counts = { a: rowsA.length, b: rowsB ? rowsB.length : null, sa: stats(rowsA), sb: rowsB ? stats(rowsB) : null };
  }
  arcs.visible = !!filters && disp.shots && disp.data === "Arcs";
  balls.visible = !!filters && disp.shots && disp.data === "Balls";

  const one = picked && new Set(picked).size === 1 ? picked[0] : null;
  const hole = fp && S.flyHole ? HOLES[S.flyHole - 1] : one ? HOLES[+one - 1] : null; // the hole the selection is on, if just one

  // the camera moves when the story moves on. Freeplay is the visitor's: only entering it, Reset view, Frame selection
  // and tapping a hole move the camera there, never a filter change
  const camKey = view === "idle" ? "idle"
    : view === "round" ? ["round", ch.title, S.step, S.frameTick, S.resetTick].join()
    : fp ? ["freeplay", S.flyHole, S.frameTick, S.resetTick].join()
    : ["filterset", hole?.n, dataKey, S.frameTick, S.resetTick].join();
  if (camKey !== last.cam) cameraFor(S, view, ch, hole, filtersB);
  if (camKey !== last.cam || view !== "round") showLie(view === "round" ? focusShot : null);
  last = { data: dataKey, cam: camKey, view, reset: S.resetTick, frame: S.frameTick, who: view === "round" ? playerOf(ch, S.step) : null, where: holeOf(view, ch, S.step, hole) };
  shotLabels(); // same task as the render: the new step's insight is hidden before the browser ever paints it
}

const playerOf = (ch, step) => { const st = ch.steps[Math.min(step, ch.steps.length - 1)]; return st.seq.player + (st.b ? " & " + st.b.seq.player : ""); };
// where the story is: the hole number, or "course" for a selection over several holes
const holeOf = (view, ch, step, hole) => view === "round" ? ch.steps[Math.min(step, ch.steps.length - 1)].hole : hole ? hole.n : "course";
function cameraFor(S, view, ch, hole, filtersB) {
  // the course wasn't on screen just before (Idle, a video chapter, the first frame): the camera is already at the view, no move.
  // The content changes kind (data story ↔ game focus): a cut, dipping through the night green, like a change of scene on TV.
  // Otherwise (the next data story, the next hole): a calm move.
  const fromIdle = !last.view || last.view === "idle";
  // a new subject or a new place also cuts: another player (Langer's shot, then DeChambeau's) or another hole (the next hole
  // in game focus, the next data story elsewhere). The camera only travels within a hole.
  const story = ["filterset", "round"], who = view === "round" ? playerOf(ch, S.step) : null, where = holeOf(view, ch, S.step, hole);
  const newKind = story.includes(last.view) && story.includes(view) &&
    (last.view !== view || (view === "round" && last.who && last.who !== who) || (last.where !== "course" && where !== "course" && last.where !== where));
  // (the whole round → one of its holes, or back out, is the same story narrowing in: a camera move, not a cut)
  const moveTo = (to, name) => fromIdle ? jumpTo(to) : newKind ? cutTo(to, "cut") : travelTo(to, { name });
  resetTouch(); stopFlight(); idleStop();
  if (view === "idle") return idleNext();
  if (view === "round") {
    if (focusShot.pre) { // Shot 0: a still view from where the follow camera will start, so Next flows straight into the shot
      const start = followStart({ curs: focusShot.upcoming });
      return start ? play([moveTo(start, "Shot 0")], start) : undefined;
    }
    // the follow camera takes over from wherever the camera is and eases in; only a new hole (far away) is flown to first
    const start = followStart(focusShot);
    if (start && (fromIdle || newKind || camera.position.distanceTo(start.pos) > 300)) play([moveTo(start)]); else stopMoves();
    return startFlight(focusShot, true);
  }
  if (view === "filterset") { // data story: ease to a view framed on the selection, then the slow orbit
    const to = preset("Orbit", hole, frameBox);
    return play([moveTo(to, "to the view")], to);
  }
  // Freeplay. Entering it is a change of mode: a cut to the whole course (from Idle: already there). Inside it, the visitor
  // steers: Reset view, Frame selection and tapping a hole move the camera there
  const name = "Orbit";
  if (last.view !== "freeplay") { const to = preset(name, null, COURSE_BOX); return play([fromIdle ? jumpTo(to) : cutTo(to, "cut to Freeplay")]); }
  const frameIt = S.frameTick !== last.frame;
  go(S.resetTick !== last.reset ? preset(name, null, COURSE_BOX) : frameIt ? preset(name, null, frameBox) : preset(name, HOLES[S.flyHole - 1] || null, frameBox));
}

/* ---------- game focus: the insight card is pinned to the shot (as v1) ---------- */
const callout = document.getElementById("callout"), calloutB = document.getElementById("calloutB"), gfStack = document.getElementById("gfStack");
const STAGE_W = 5280, STAGE_H = 2970;
function anchorInsight(px, py) {
  if (!gfStack || gfStack.hidden) return;
  const fr = frame.getBoundingClientRect(), k = STAGE_W / fr.width, R = el => { const r = el.getBoundingClientRect(); return { l: (r.left - fr.left) * k, t: (r.top - fr.top) * k, r: (r.right - fr.left) * k, b: (r.bottom - fr.top) * k }; };
  const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ui-read")) || 1, me = R(gfStack), w = me.r - me.l, h = me.b - me.t;
  const ov = R(document.getElementById("overview")), sc = R(document.querySelector(".sidecol")), right = document.getElementById("stage").dataset.side === "right";
  const lo = right ? ov.r + 60 : sc.r + 60, hi = (right ? sc.l : ov.l) - 60 - w;
  let x = px + 150; if (x > hi) x = px - 150 - w;
  callout.classList.toggle("lbl-left", x > px); calloutB?.classList.toggle("lbl-left", x > px); // labels on the side away from the card
  x = Math.min(Math.max(x, lo), Math.max(lo, hi));
  const y = Math.min(Math.max(py - 90, 80), STAGE_H - h - 320);
  gfStack.style.left = x / z + "px"; gfStack.style.top = y / z + "px"; gfStack.style.right = gfStack.style.bottom = "auto";
}
// the shot's labels and insight wait for the ball to land: hidden at once (no fade-out, so a new step's card never flashes up
// before its shot), shown with a fade once it lands. Called on every frame and right after each update.
// They are hidden while the ball flies and while the camera moves or cuts; they come back with an entrance (the label, then the
// insight a beat later). A data story's insight keeps its own place in the chapter intro (render.js introCard).
let wasFlying = false;
function shotLabels() {
  const fly = flying(), hide = fly || moving();
  if (wasFlying && !fly) dispatchEvent(new Event("shot-landed")); // for the broadcast bar
  wasFlying = fly;
  for (const el of [callout, calloutB, gfStack]) {
    // the insight also waits for the card to finish building (render.js introCard sets the moment)
    const h = hide || (el === gfStack && performance.now() < +(el?.dataset.notBefore || 0));
    if (!el || el.dataset.hid === String(h)) continue;
    el.dataset.hid = h; el.style.opacity = h ? 0 : 1; el.classList.remove("in");
    if (!h) { void el.offsetWidth; el.classList.add("in"); }
  }
}
// called by render() before it changes anything: if the step or chapter is about to change, whatever label and insight are on
// screen leave (a copy of each fades down and is removed), and the real ones are hidden until shotLabels lets them back in
let leaveKey = null;
function leaveLabels(key) {
  if (key === leaveKey) return; const first = leaveKey === null; leaveKey = key; if (!first) leaveNow();
}
function leaveNow() { // whatever is on screen exits now (also used by render() just before it would change the insight's text in view)
  for (const el of [callout, calloutB, gfStack]) {
    if (!el) continue;
    // not on screen (switched off, or a step without an insight): no exit, but reset it to hidden, so that when render() switches
    // it back on with new content it waits for its entrance instead of showing at once and vanishing a frame later
    if (el.hidden || el.dataset.hid === "true" || getComputedStyle(el).display === "none" || !el.offsetParent) { el.dataset.hid = "true"; el.style.opacity = 0; el.classList.remove("in"); continue; }
    const g = el.cloneNode(true); g.removeAttribute("id"); g.classList.remove("in", "intro"); g.classList.add("leaving");
    g.querySelectorAll("[id]").forEach(n => n.removeAttribute("id"));
    // removed when its own exit ends (animations inside it, like the video placeholder's, also send animationend: ignore those)
    el.after(g); g.addEventListener("animationend", e => { if (e.target === g) g.remove(); }); setTimeout(() => g.remove(), 800);
    el.dataset.hid = "true"; el.style.opacity = 0; el.classList.remove("in");
  }
}
const toStage = v => { const p = v.project(camera); return [((p.x + 1) / 2) * STAGE_W, ((1 - p.y) / 2) * STAGE_H]; };

/* ---------- per frame ---------- */
function advance(dt) { // one frame of the data layer; the loop below calls it, and sim.advance() drives it headless
  advanceArcs(dt); placeTags();
  document.body.classList.toggle("cammoved", cam.user && (live.view === "filterset" || live.view === "round")); // shows Reset view in a tour
  steer(dt);
  runMoves(dt); flyShot(dt);
  orbitStep(dt); handBack(live.view === "filterset" || live.view === "round");
  shotLabels();
  if (live.view === "round" && callout && focusShot) {
    const [px, py] = toStage(V3(focusShot.pre ? focusShot.sh.from : focusShot.sh.to, 0.5));
    callout.style.left = px - 60 + "px"; callout.style.top = py - 60 + "px";
    if (focusShot.shB) { const [qx, qy] = toStage(V3(focusShot.shB.to, 0.5)); calloutB.style.left = qx - 60 + "px"; calloutB.style.top = qy - 60 + "px"; }
    anchorInsight(px, py);
  }
  debugCam(dt);
}

/* ---------- camera debug: what the camera is doing, in the black band beside the stage. On locally, off when deployed; ?debug=1 / ?debug=0, or the ` key ---------- */
const dbg = document.createElement("pre");
Object.assign(dbg.style, { position: "fixed", left: "12px", bottom: "12px", margin: "0", padding: "10px 12px", zIndex: "100", pointerEvents: "none",
  font: "11px/1.5 'IBM Plex Mono', ui-monospace, Menlo, monospace", color: "#c8d2c6", background: "rgba(0,0,0,.6)", border: "1px solid #1f4230", whiteSpace: "pre" });
const dbgParam = new URLSearchParams(location.search).get("debug"); // on locally, off on the deployed site; ?debug=1 / ?debug=0 override
dbg.hidden = dbgParam ? dbgParam === "0" : !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
document.body.append(dbg);
addEventListener("keydown", e => { if (e.key === "`") dbg.hidden = !dbg.hidden; });
let fps = 60, dbgIn = 0;
function debugCam(dt) {
  if (dbg.hidden) return;
  fps += ((dt > 0 ? 1 / dt : 60) - fps) * .1;
  if ((dbgIn -= dt) > 0) return; dbgIn = .2;
  const p = camera.position, t = controls.target, f = n => n.toFixed(0).padStart(5);
  const doing = cam.user ? "visitor (touch)" : moveStatus() || flightStatus() || (controls.autoRotate ? "slow orbit" : "at rest");
  const back = cam.user && cam.rest && (live.view === "filterset" || live.view === "round") ? `drift back in ${Math.max(0, 20 - (performance.now() - cam.lastTouch) / 1000).toFixed(0)} s` : "";
  dbg.textContent = [`CAMERA  ${live.view ?? "off"}`, `doing   ${doing}`, touchStatus() && `touch   ${touchStatus()}`, back && `        ${back}`,
    `arcs    ${arcsReady() ? "drawn" : "building…"}`,
    `pos  ${f(p.x)} ${f(p.y)} ${f(p.z)}`, `look ${f(t.x)} ${f(t.y)} ${f(t.z)}`, `fps  ${fps.toFixed(0)}`].filter(Boolean).join("\n");
}

window.sim = { update, advance, leaveLabels, leaveNow, backToStory, get counts() { return counts; }, get backend() { return "WebGPU (Augusta course)"; } };
// for scripted renders (the camera-system loops): world geometry, the shot model and the current game-focus shot
window.sim.world = { HOLES, heightAt, V3, flightModel: (sh, s, e, line) => flightModel(sh, s, e, line, heightAt), flightPoint: (m, t, out) => flightPoint(m, t, out, heightAt),
  get focus() { return focusShot; }, get flight() { return flightNow(); } };
// start the frame loop last, once everything it touches exists
let tPrev = performance.now();
(function tick(now) { const dt = Math.min(0.1, (now - tPrev) / 1000); tPrev = now; advance(dt); requestAnimationFrame(tick); })(tPrev);
dispatchEvent(new Event("sim-ready"));
