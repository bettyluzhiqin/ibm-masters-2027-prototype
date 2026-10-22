// Hole tags as flat UI, not objects in the 3D scene: one button per hole ("12 · Golden Bell · Par 3 · 155 yd") styled like the
// rest of the interface, pinned over its tee and moved every frame to follow the camera. Tapping one focuses that hole.
import { camera, HOLES } from "./course.js";
const STAGE_W = 5280, STAGE_H = 2970, LIFT = 3; // stage px; metres above the tee the tag points at
const box = document.createElement("div"); box.className = "holetags"; box.hidden = true;
document.getElementById("stage").prepend(box); // under every card and control
const tags = HOLES.map(h => {
  const b = document.createElement("button"); b.className = "htag"; b.setAttribute("aria-label", `Hole ${h.n}, ${h.name}`);
  b.innerHTML = `<b>${h.n}</b><span><em>${h.name}</em><i>Par ${h.par} · ${h.yd} yd</i></span>`;
  b.onclick = e => { e.stopPropagation(); dispatchEvent(new CustomEvent("hole-tap", { detail: h.n })); };
  box.append(b);
  return { n: String(h.n), b, at: h.tee.clone().setY(h.tee.y + LIFT) };
});
// visible: the Hole names toggle; tagged: the hole numbers (strings) in the selection, or null: those light up, the rest shrink to their number
export function setTags(visible, tagged) {
  box.hidden = !visible;
  for (const t of tags) { const on = !!tagged?.includes(t.n); t.b.classList.toggle("on", on); t.b.classList.toggle("mini", !!tagged && !on); }
}
const p = camera.position.clone();
export function placeTags() { // per frame
  if (box.hidden) return;
  for (const t of tags) {
    p.copy(t.at).project(camera);
    const off = p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05;
    t.b.style.visibility = off ? "hidden" : "";
    if (!off) t.b.style.transform = `translate(${((p.x + 1) / 2 * STAGE_W).toFixed(1)}px,${((1 - p.y) / 2 * STAGE_H).toFixed(1)}px) scale(var(--ui-aud)) translate(-26px,calc(-100% - 22px))`;
  }
}
