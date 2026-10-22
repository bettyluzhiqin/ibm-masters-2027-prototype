// node checks/tours.check.mjs — every tour builds, and game-focus steps keep their promises (real data from data/meta.js)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const ctx = { window: {}, location: { search: "" }, localStorage: { getItem: () => null, setItem() {} }, console, URLSearchParams };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ["data/meta.js", "js/tours.js"]) vm.runInContext(readFileSync(new URL("../" + f, import.meta.url), "utf8"), ctx, { filename: f });
const { TOUR_DEFS, tourFor } = vm.runInContext("({ TOUR_DEFS, tourFor })", ctx);

for (const id of Object.keys(TOUR_DEFS)) {
  const t = tourFor({ id, title: "" });
  assert.ok(t.chapters.length > 0, id);
  for (const c of t.chapters.filter(c => c.type === "filterset")) assert.ok(!(c.n > 1), `${id}: "${c.title}" would show the same data story ${c.n} times`);
  for (const c of t.chapters.filter(c => c.type === "round")) {
    assert.ok(c.steps.length > 0, `${id}: ${c.title} has steps`);
    for (const st of c.steps) assert.ok(st.shot?.from && st.shot?.to, `${id}: every step has a shot with a start and an end`);
    if (c.preShot) assert.ok(c.steps[0].pre && !c.steps[1].pre, `${id}: Shot 0 comes first, once`);
    if (c.seqB) { // two players: shot for shot on the same hole, the hole ends on a result + video, a finished player stays finished
      for (const st of c.steps) assert.equal(st.hole, st.b.hole);
      const ends = c.steps.filter(s => s.lastOfHole);
      assert.equal(ends.length, new Set(c.steps.map(s => s.hole)).size, "one last step per hole");
      for (const e of ends) assert.ok(e.video && e.text.length, "the hole ends on a result and a video");
    }
  }
}
console.log("tours: ok —", Object.keys(TOUR_DEFS).join(", "));
