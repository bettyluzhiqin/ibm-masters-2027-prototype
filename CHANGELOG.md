# Changelog

## v2 · 21 Oct 2026

The prototype moves to v2. The site now runs v1's UI and sound on top of the realistic Augusta course. The last wireframe build is tagged `v1` in git.

### Course
- **Realistic Augusta.** The course is now the WebGPU Augusta scene in `augusta/`, with trees, water, bunkers and sky. It replaces the wireframe terrain. It runs in a same-origin iframe.
- **Data layer.** `sim.js` bridges the data into that scene. It draws shot arcs and balls, game-focus flights, hole tags, the day's pins and landing zones in world coordinates (`toW`).
- **Zones.** Zones are a new quick-bar toggle. They show where the selection finished on one hole, by sector, with labels ringed around the green.
- **Day's pin.** When a story is one day (one year, one round), each hole's flag sits at that day's pin.
- **Chapter display.** A data chapter can now turn display layers on itself (`display: {zones: true, pins: true}`).

### Tours and stories
- **Tours are data.** Tours are defined in `TOUR_DEFS`. A chapter is one of these types:
  - `media`: a video;
  - `filterset`: a data story or a comparison;
  - `round`: game focus, with a hole and stroke range plus optional "Shot 0", the lie before the first shot;
  - `freeplay`.

  Each game-focus step sets its own insight (hole, "from this spot" odds, or custom text) and video.
- **Every story type has a chapter.** Each type from the story audit (Figma, Betty's page) now appears in a tour:

| Tour | Chapters (audit type) |
| --- | --- |
| Amen Corner | Video (D1) · Approach shots into 13 (A2) · McIlroy through Amen Corner (C2) · Freeplay (D2) |
| Precision vs. Power | Langer vs DeChambeau, all holes and hole 7 (B1) · Langer's then DeChambeau's 2nd shot on 7 with Shot 0 (C3, one after the other) |
| Rory's Approach | McIlroy's approach on 15, 2025, with Shot 0 (C1) |
| The Back Nine | How the field plays 12 (A1) · Into Rae's Creek on 12 (A4) · Every eagle on 13 and 15 (A3) · Where Sunday tee shots finished on 16, zones and day's pin on (A6) · Freeplay |
| Champions' Moments | Video · Champions vs the field into 13 (B3) · Scottie Scheffler on 13, Sunday 2024 (A7) · McIlroy on 15 (C1) · McIlroy on 13 (C2, one hole) · Freeplay |
| Ten Years at Augusta | Drives over 320 yards (A5) · 16, then and now: 2016–19 vs 2023–26 (B2) · Thursday vs Sunday on 12 (B4) · Freeplay |
| Rory's Grand Slam | Video (2 films) · McIlroy's approach shots, 2025 · Amen Corner · 15 · Freeplay |

  Rory's Grand Slam is the tour on the iPad that the screen hasn't synced yet. Press Sync in the tour list to get it.
- **Not built yet:** nationality comparison (B5, the data has no nationality), Tech Diagram (D3), Apps & Solutions (D4) and two players side by side (C3 split view).

### Overview card (data stories, comparisons, Freeplay)
- **Leads with the story.** The card uses the V1 "Statement card" hierarchy:
  1. the story in words, set in the serif ("How the field plays 12");
  2. one context line (hole · players · years · rounds);
  3. key numbers;
  4. the outcome bar.

  The shot count is no longer the headline.
- **Freeplay writes its own title** from the filters, for example "Drives over 320 yards" or "Scottie Scheffler on 13, Sunday 2024". Comparisons get named groups ("Thursday vs Sunday", "2016–2019 vs 2023–2026").
- **Key numbers:**
  - Shots;
  - Avg shot, or Scoring avg for a whole hole;
  - In water;
  - Birdie or better (Result for a single hole played).
- **Outcome bar is the key.** To-par numbers sit under each segment, and only the scores present are shown (E for even par, Ace for a hole in one). The separate colour key with score names is gone.
- **Comparisons:** a plain bar per group plus one compact key that shows numbers only.
- **No category captions.** "Data story", "Freeplay" and "Game focus" eyebrows are removed. Only a break-out keeps one ("From chapter N · title").

### Video chapter
- The video chapter now follows the Figma D1 design: dark screen, dashed film frame, play mark, the film's title in the serif, and one line under it ("Video chapter · 60 s · film 1 of 2").

### Game focus
- **Game focus:**
  - one hole: no scorecard (the hole line says it);
  - several holes: one cell per hole;
  - no eyebrow.
- **Shot 0** stands at the ball before the shot, with the field's birdie and par odds from that spot.

### Freeplay filters
- **Strokes:** a new filter, stroke number on the hole from 1 to 8+, for "shots 1–3" stories.
- **Year:** the range now covers 2016–2026.

### Chapter bar
- Chapter-bar variants per story type are designed in Figma (Design System › Chapter bar, Up next, Chapter list) and shown in Betty's sketches. **They are not in the prototype yet.**

### Data
- **Export:** `data/export_masters.py` now exports 2016–2026: 228,923 shots and 311 players. It adds:
  - game-focus `sequences` with per-shot "from this spot" odds;
  - round `stories`;
  - per-hole, per-day `pins`.
- **Scoring average** counts every stroke, drops included. That is why 12 shows 3.21.
