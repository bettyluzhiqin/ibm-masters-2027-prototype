# IBM × Masters 2027 · On-course screen prototype (v2)

Interactive prototype for the 110" (16:9) touch wall. The flow is Idle → guided tour → Freeplay with filters. A tour can include video, data stories, comparisons and game focus, shot by shot. It runs on the realistic Augusta course.

Code, by job:

| Where | What it does |
| --- | --- |
| `index.html` | The screen's markup: stage, overview card, presenter dock, panels, loading screen |
| `css/app.css` | All styles |
| `js/screen.js` | Physical screen size and UI scale, kiosk touch behaviour |
| `js/tours.js` | Pinned tours, every tour's chapters as data (`TOUR_DEFS`), game-focus step builders |
| `js/masters.js` | Masters reference data and the Freeplay filter definitions |
| `js/app.js` | State (`S`), actions (`act`), input, presenter settings |
| `js/freeplay.js` | The Freeplay filter panel |
| `js/render.js` | Rendering every view and the cards |
| `js/describe.js` | Titles and context lines written from the filters |
| `js/idle.js` | Idle and the tour list |
| `js/loading.js` | Stage fit, the loading screen, start-up |
| `sim.js` | Connects the page to the course: `window.sim.update(S, view)` on every render |
| `sim/course.js` | Loads the Augusta course (`augusta/`), coordinates, terrain, holes |
| `sim/shots.js` | The shot data and filter matching |
| `sim/flight.js` | The shot shape (pure: checked in Node) |
| `sim/layers.js` | Pins, hole tags, landing zones, arcs (built a slice per frame) |
| `sim/focus.js` | Game focus: shots, Shot 0, the ball flight and its camera |
| `sim/camera.js` | Camera moves, the story camera, touch, Idle drone and sun |
| `sim/clearance.js` | Keeps the camera's view clear of the pines (the course's tree survey) |
| `audio.js` | Synthesised UI sounds and ambient bed |
| `data/` | Export from the IBM Masters Data API database (2016–2026), made by `data/export_masters.py` |
| `checks/` | `node checks/flight.check.mjs`, `node checks/tours.check.mjs`, `node checks/css.check.mjs` |

Camera debug: a readout in the black band beside the stage shows what the camera is doing. It is on locally and off on the deployed site; `?debug=1` / `?debug=0` override it, and the ` key toggles it.

What changed: [CHANGELOG.md](CHANGELOG.md). The previous wireframe build is tagged `v1`.

Run locally (needs a WebGPU browser):

```bash
python3 -m http.server 8428
```

Then open http://localhost:8428.
- Tap Idle to start a tour, or press F on Idle for Freeplay.
- The tour list (More › Tours) has every story tour.
- Settings (presenter side, control height, screen preset, UI size) are under More.
