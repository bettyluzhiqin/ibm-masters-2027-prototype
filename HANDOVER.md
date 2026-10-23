# Handover pack · IBM × Masters 2027 on-course screen

What we hand over, so a team that has never met us can build the production screen (likely in Unreal) without asking how anything should look or behave. **Figma is the source of truth**; this repo is the working reference. The hub in Figma is the page *Design Changes Audit & Handover* (`484:5181`), with a contents index that mirrors this file.

**One version label everywhere:** "Handover v1.0" on the Figma pages, the git tag and the Vercel deploy, so everyone looks at the same thing.

Status: ✅ ready · 🟡 partly · ⬜ not started. `/handover-check` audits this list.

## 1. System — the basics

| Item | Where | Status |
| --- | --- | --- |
| System overview: what the screen is, where it lives (110" wall, Innovation Studio), who uses it (presenter, audience), the three modes (Idle, tour, Freeplay) | Figma *Project Overview*, *System Architecture* | ✅ Figma ↳ 1 (23 Oct) |
| Colour: primitives, semantic roles (Dark / Light), data colours. Figma variables = CSS tokens, same names | Figma `Primitives`, `Color`, `Data`; `css/app.css` `:root` | ✅ (23 Oct) |
| Type scale: 16 text styles at wall size; every code size maps to one | Figma text styles, `Screen` `type/*`; CSS `--t-*` | 🟡 code ✅; Figma components still to use the styles |
| Spacing and sizing scale: multiples of 4 px; control and audience sizes at wall size | Figma `Screen` `control/*`, `audience/*`; CSS | ✅ (23 Oct) |
| Corners: one radius `--r`; square segments; round cells | Figma `control/radius`, `audience/radius`; CLAUDE.md | 🟡 Figma has two radii, code one |
| Fonts and licences: IBM Plex Sans; Masters Serif (licensed, EB Garamond stands in) | Figma; `Reference/` notices | 🟡 Masters Serif to supply |
| Icons: the Carbon set used, sizes | Figma *Icons*; `js/app.js` | ✅ |

## 2. UI — components and tokens (cross-referenced)

> **23 Oct, afternoon:** the component boards were moved off `↳ 2` to *Design Updates › ↳ Components & tokens* (an older copy, from before the 23 Oct edits), and `↳ 3 · Screens` was emptied, as part of the UI pass. **Rebuilt late 23 Oct:** ↳ 3 holds 32 captured screens with spec cards and ↳ 2 (renamed *Components*) every current component rebuilt from the live prototype as editable layers; tokens only on ↳ 1; the 14 visual examples are filled. the 23 Oct Figma edits listed under v2.5 › *Figma to update* need redoing on the new boards.

| Item | Where | Status |
| --- | --- | --- |
| Every component with all states (default / selected / disabled / open / pressed), built with auto layout and bound to variables | Figma *Design System* page | 🟡 Chapter bar only in Figma (Tour bar replaces it) |
| Cross-reference both ways: each component lists the tokens it uses; each token lists where it's used | Component descriptions; token table | ⬜ |
| Component ↔ code map: which file / class draws each component | Component descriptions; README table | ⬜ |

## 3. UI — full-screen designs

| Item | Where | Status |
| --- | --- | --- |
| Every screen at stage size (5280 × 2970), by stage (Idle / tour / Freeplay), screen preset and story type, built from the Figma components with auto layout | Figma *UX Flow Screen* | 🟡 |
| Before and after for each changed screen (befores mostly on the audit page) | Figma *Design Changes Audit & Handover* | 🟡 |
| A spec card on each screen: what it is, stage, story type, components used, rules applied (by name, linking to section 4), and the matching prototype state | Figma annotations | ⬜ |
| Prototype link per screen: opens the live prototype in that state (needs URL deep links to a chapter / step) | Prototype + Figma | ⬜ |

## 4. Rules

| Item | Where | Status |
| --- | --- | --- |
| **Screen adaptation and scale:** 2435 mm design width; Augusta and Innovation Studio presets; UI size 0–100; separate scales for controls, audience and reading; caps (0.865 / 1.5 / 1.95); presenter side left / right | `js/screen.js` comments only | ✅ Figma ↳ 4 › 1 (visuals to add) |
| **Camera and transitions:** cut (1.6 s dip) vs move (3.6 s) vs already there; camera per view (story orbit, game-focus follow, Shot 0, Idle drone); never behind a tree; gesture limits; touch hand-back | Figma *Screen system rules* (`337:940`, says v2.3; mentions Frame selection, removed in v2.4); CHANGELOG v2.2–v2.4 | ✅ Figma ↳ 4 › 2–3 (v2.5; the v2.3 frame is superseded) |
| **Motion:** UI timings and easings as tokens — card exit 0.25 s, card 0.6 s, insight ≥ 1.6 s, tour bar levels, orbit ≈ 4 min a turn | Figma + CSS | ✅ Figma ↳ 4 › 5 timings table (not yet CSS/Figma motion tokens) |
| **Interaction:** gestures (grab-to-pivot, press-and-hold zoom, pinch, two-finger pan, tap a hole or flag); hit areas; presenter side vs audience side; one panel at a time; timeouts (20 s hand-back, back to Idle) | Spec page | ✅ Figma ↳ 4 › 4 and ↳ 5 button inventory |
| **Tour bar and cards:** levels (resting / step / chapter), what each announces, the order cards leave and arrive | Figma *Screen system rules* | ✅ Figma ↳ 4 › 6 |

## 5. UX — flow and states

| Item | Where | Status |
| --- | --- | --- |
| Full, detailed UX flow graph: Idle → tour → Freeplay → back; break-out; compare; every entry and exit, by trigger | Figma `↳ 5 · UX flow & edge states`: overview + detail (Idle, More / Volume / confirm, Tour, Freeplay) + button inventory (39 controls) | ✅ (23 Oct, v2.5) |
| Screen inventory: every view and state has a frame | Figma *UX Flow Screen*, *Presenter menu · as a whole* | 🟡 |
| Edge, empty and error states: no shots match the filters, loading, WebGPU missing, presenter leaves mid-tour, touch during a camera move, long player names | Figma `↳ 5` › Edge, empty and error states: 22 cases, 13 in prototype, 5 to design, 4 open questions | 🟡 listed; 5 to design, 4 to decide |
| Accessibility and ergonomics: reach height of the presenter column, text size vs viewing distance, contrast over the course, colour-blind check of the score colours, reduced motion | Figma *Install Specs* + spec | ⬜ |

## 6. Content and data

| Item | Where | Status |
| --- | --- | --- |
| Tour model: chapters, steps, story types (data story, comparison, game focus, video, Freeplay, break-out) | `js/tours.js` `TOUR_DEFS`; spec page | ✅ Figma ↳ 6 › 1–2 |
| How titles and context lines are written from the filters; copy rules (sentence case, Masters terms: "Under par", "Average score −0.50") | `js/describe.js`; CLAUDE.md › Copy | ✅ Figma ↳ 6 › 3 |
| Glossary: data story, game focus, Shot 0, break-out, chapter, step, group A / B | Spec page | ✅ Figma ↳ 6 › 4 |
| Data: source (IBM Masters Data API), fields, years, export script, how figures are worked out (average to par, counts), coordinate mapping to the course | `data/export_masters.py`, `data/meta.js`, root README | ✅ Figma ↳ 6 › 5 |
| Live 2027 data: what changes when the tournament is on | Spec page | ⬜ open question (listed on ↳ 6 › 6 and ↳ 7 › 5) |
| Sound: every cue, what triggers it, levels, the ambient bed | `audio.js` | ✅ Figma ↳ 6 › 7 (prototype cues; production sound design to come) |

## 7. Prototype and production notes

| Item | Where | Status |
| --- | --- | --- |
| Live link on Vercel matching the tagged release | Vercel `ibm-masters-2027-prototype`, git tag | 🟡 deploy lags code |
| How to run it, browser needs (WebGPU), `?debug` | `README.md` | ✅ |
| Spec vs placeholder: what is final design and what is prototype-only (stand-in serif, synthesised sound, camera readout, toy pieces) | README › Known gaps | ✅ Figma ↳ 7 › 2 |
| Architecture: UI layer, sim layer, the contract | CLAUDE.md, README | ✅ |
| Assets and licences: Masters Serif, Augusta WebGPU course (USGS, OSM), Carbon icons | `Reference/Augusta-WebGPU docs/` | ✅ Figma ↳ 7 › 3 |
| Performance: ~108 MB load, frame-rate target on the wall's hardware | README › Known gaps | 🟡 Figma ↳ 7 › 4: load known; frame-rate target not set |
| Walkthrough video of every flow | `Video clips/` | ⬜ |
| Decisions log | `CHANGELOG.md` | ✅ |
| Open questions for the production team | Figma handover page | 🟡 Figma ↳ 7 › 5 (listed; to be answered) |

## Definition of ready

Every row ✅; Figma and code agree (no open `### Figma to update`); "Handover v1.0" is tagged, deployed and labelled in Figma; `/handover-check` reports **Ready** in every section.
