# IBM × Masters 2027 · On-course screen prototype

Interactive wireframe for the 110" (16:9) touch wall: Idle → guided tour (media, data chapter, game focus shot by shot) → Freeplay with filters.

- `index.html`: the UI and state (IBM Plex Sans + Masters serif, Masters colours)
- `sim.js`: WebGPU Digital Twin stand-in (three.js r171, WebGL2 fallback), real Augusta terrain rebuilt from shot data
- `audio.js`: synthesised UI sounds and ambient bed
- `data/`: export from the IBM Masters Data API database (v1.1.3, 2017–2026), made by `data/export_masters.py`

Run locally:

```bash
python3 -m http.server 8427
```

then open http://localhost:8427. Settings (presenter side, control height, screen preset, UI size) live under More.
