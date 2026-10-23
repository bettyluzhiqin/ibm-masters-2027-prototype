// node checks/tokens.check.mjs — every colour is a token: no hex or rgb() literals outside the :root blocks of css/app.css;
// every font size is a type token (calc(var(--t-…) / var(--z))); spacing (gap, padding, margin) is a multiple of 4 px (negative nudges excepted)
// (js/app.js is skipped: its Carbon SVG icons carry no colours, and its strings are long)
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
const at = p => new URL("../" + p, import.meta.url);
const literal = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/g;
const bad = [];
const css = readFileSync(at("css/app.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, " "));
// blank out every :root{...} block (tokens live there), keeping line numbers
const noRoot = css.replace(/:root\s*\{[^}]*\}/g, b => b.replace(/[^\n]/g, " "));
noRoot.split("\n").forEach((l, i) => { for (const m of l.matchAll(literal)) bad.push(`css/app.css:${i + 1} ${m[0]}`); });
const js = ["sim.js", "audio.js", ...readdirSync(at("js")).filter(f => f.endsWith(".js") && f !== "app.js").map(f => "js/" + f),
  ...readdirSync(at("sim")).filter(f => f.endsWith(".js")).map(f => "sim/" + f)];
for (const f of js) readFileSync(at(f), "utf8").split("\n").forEach((l, i) => {
  if (/^\s*\/\//.test(l)) return;
  for (const m of l.matchAll(literal)) bad.push(`${f}:${i + 1} ${m[0]}`);
});
noRoot.split("\n").forEach((l, i) => {
  for (const m of l.matchAll(/font-size:\s*(\d[^;}]*)/g)) bad.push(`css/app.css:${i + 1} font-size:${m[1]} (use a --t- token)`);
  for (const m of l.matchAll(/(?:gap|padding|margin)[a-z-]*:([^;}]*)/g))
    for (const n of m[1].matchAll(/(?<![-\d.])(\d+)px/g)) if (+n[1] >= 4 && +n[1] % 4) bad.push(`css/app.css:${i + 1} ${n[0]} (spacing is a multiple of 4)`);
});
assert.deepEqual(bad, [], "colour literals outside :root — off-system values — use a token (css/app.css :root + Figma variable):\n" + bad.join("\n"));
console.log("tokens: ok (colour, type, spacing)");
