// node checks/css.check.mjs — the stylesheet's braces balance (an unclosed rule silently swallows every style after it)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css = readFileSync(new URL("../css/app.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
let depth = 0, line = 1, opened = [];
for (const ch of css) { if (ch === "\n") line++; if (ch === "{") { depth++; opened.push(line); } if (ch === "}") { depth--; opened.pop(); assert.ok(depth >= 0, `extra } at line ${line}`); } }
assert.equal(depth, 0, `unclosed { opened at line ${opened.at(-1)}`);
console.log("css: ok");
