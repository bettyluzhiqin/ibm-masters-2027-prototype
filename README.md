# IBM × Masters 2027 · On-course screen prototype (v2)

Interactive prototype for the 110" (16:9) touch wall. The flow is Idle → guided tour → Freeplay with filters. A tour can include video, data stories, comparisons and game focus, shot by shot. It runs on the realistic Augusta course.

- `index.html`: the UI, state and tours (`TOUR_DEFS`)
- `sim.js`: the bridge that draws the IBM data layer (arcs, game focus, zones, pins) into the Augusta scene
- `augusta/`: the realistic WebGPU Augusta course, loaded in a same-origin iframe
- `audio.js`: synthesised UI sounds and ambient bed
- `data/`: export from the IBM Masters Data API database (2016–2026), made by `data/export_masters.py`

What changed: [CHANGELOG.md](CHANGELOG.md). The previous wireframe build is tagged `v1`.

Run locally (needs a WebGPU browser):

```bash
python3 -m http.server 8428
```

Then open http://localhost:8428.
- Tap Idle to start a tour, or press F on Idle for Freeplay.
- The tour list (More › Tours) has every story tour.
- Settings (presenter side, control height, screen preset, UI size) are under More.
