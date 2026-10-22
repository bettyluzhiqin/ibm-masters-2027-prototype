# Changelog

## v2.2 · 22 Oct 2026

### Transitions: the rules
- **Cut** (a 1.6 s dip through the night green) whenever the subject or the place changes:
  - data story ↔ game focus ↔ Freeplay;
  - another player (Langer's shot, then DeChambeau's);
  - another hole (the next hole in game focus, the next data story elsewhere).
- **Camera move** only within a hole (shot to shot, settling into a view), or when a story narrows into one of its own holes or back out (whole round → hole 7).
- **Already there:** when the course comes on screen (from Idle, after a video, on the first frame), the camera is at the view. There is no flight in.
- **Flights between holes** now only happen in Freeplay (tapping a hole). They rise over the canopy and turn the short way at an even pace.

### Camera
- **What the camera does:**
  - **Data stories:** ease to a view framed on the selection, then a slow orbit (about 4 min a turn). The orbit carries on the way the last move was turning and eases up from a standstill.
  - **Game focus:** follows the ball from wherever the camera is, starting from rest. Putts keep the side the camera already looks from.
  - **Shot 0:** a still view from where the follow will start.
  - **Idle:** a drone along signature holes, cutting between them.
- **Moves on a hole** take 3.6 s.
- **Trees:** every pose is checked against the course's tree survey and lifted until no crown blocks the view or sits beside the lens.
- **Touch** hands the camera to the visitor. In a tour it drifts back after 20 s, or straight away with Reset view.
- **Removed:**
  - the Camera button and its Bird's eye / Orbit / Tee modes;
  - establish, sweep and push;
  - the zone tour and the lean to each group;
  - the Shot 0 creep and the move into each shot;
  - the breath on Next;
  - depth of field;
  - the time-of-day sun.

### Tour bar (replaces the chapter progress bar)
- **One bar, three levels:**
  - **Resting, always there in a tour:** chapter number, title, where we are ("Hole 7 · Pampas", the player), and progress along its bottom edge.
  - **Step:** the tab turns yellow to announce a shot, where it finished, or a new hole.
  - **Chapter:** the bar grows into a title card, then settles back keeping the title.
- **The tab names what changed most:**
  - a chapter: the new player or pair ("Bryson DeChambeau"), else the new hole, else "Chapter 3";
  - a step: "Shot 2" or "Hole 13". The player isn't repeated, and players are named only when two compare.
- **Motion:** the tab only animates when its label changes. A Freeplay break-out dims the bar.

### Cards and labels
- **Order on a new chapter:** the tour bar first, then the overview card (fades out, then in as a whole), then the insight / video last.
- **The card stays calm;** the bar carries the motion. A hole change marks the card's hole section with a yellow edge.
- **Shot label and insight:**
  - **Exit:** together with the card (0.25 s fade-down, same frame).
  - **Hidden** while the ball flies and while the camera moves or cuts.
  - **Enter:** they rise back in.
  - **One owner:** the insight has a single owner, so it no longer flashes, swaps text in view, or exits at the wrong size.
- **Small selections are visible:** up to 600 shots are drawn as solid tubes as wide as the framing needs (Langer vs DeChambeau's round: about 1.3 m), with bigger balls. Large selections keep fine lines.

### Freeplay, Idle, loading
- **Freeplay filters, all categories stacked:**
  - **Tiles:** End | Reset view, then every category plus Compare as tiles. A set filter is light with its value.
  - **One control at a time:** tapping a tile opens just that filter's control beside the dock.
- **Freeplay never moves the camera on a filter change.** Frame selection is in the Filters header.
- **Idle:** the course flyover first, then the shade, title and calls to action. No arcs. A Freeplay button sits in the dock's place, styled like the one in tours.
- **Loading:** just the ball's flight to the flag and "Augusta National".
- **Removed:** pins and zones.
- **Hole tags** are flat UI pinned over each tee, not sprites in the 3D scene.

### Course rendering
- **The course's own UI** is removed from the page.
- **Ambient occlusion is off.** It laid a flat dark band with straight screen edges over the view.
- **One fixed afternoon sun** (42°, not the course's 10°).

### Code and fixes
- **Split by job:**
  - styles in `css/`;
  - page scripts in `js/`;
  - the course and data layer in `sim/` (ES modules).
- **Checks:**
  - `checks/flight.check.mjs` (shot model);
  - `checks/tours.check.mjs` (every tour builds; no repeated data story);
  - `checks/css.check.mjs` (stylesheet braces).
- **No freezes on chapter changes:** arcs build a slice per frame instead of all at once (180–390 ms blocked before).
- **Fixed:**
  - a global name clash broke Freeplay's tap-to-select filters;
  - Amen Corner showed "Approach shots into 13" twice;
  - an unclosed style rule broke Idle.
- **Camera debug readout:** on locally, off on the deployed site (`?debug=1` shows it).

## v2.1 · 21 Oct 2026

### Course
- **Arc shape from the Augusta WebGPU build.** Arcs and game-focus shots now use its shot model:
  - a club estimated from the distance, which sets the launch and descent angles;
  - carry, then roll along the ground (none into water, bunkers or pine straw; less into the second cut);
  - tee shots bend toward the hole's line of play;
  - putts follow the green.

  The colours stay ours: score, or group A/B. Clubs, bend and roll are estimates, as in the Augusta viewer.
- **Arc styling.**
  - Data arcs start faint off the club and are fullest where the shots land, so the tee no longer turns into a white knot. While they draw in, each arc has a bright head.
  - Game-focus shots ease in off the club and get a ring where the ball finished.
- **Game focus moves with the ball.**
  - Each shot draws in from the club with a ball at its head.
  - The camera rides behind and slightly to the side, so the arc reads as a curve, then settles on where the ball finished.
  - The callout and insight fade in once the ball lands.

### Camera system (from the camera-system page)
- **Moves, not cuts.** A small move engine plays camera moves one after another. A long move rises over the pines and glides to the next hole.
- **Game focus.**
  - **Shot 0, at the ball:** a low camera behind the ball creeps toward the green. The lie is marked with a ball, a pulsing ring and a dashed line to the pin.
  - **Follow the ball, slow at landing:** the camera follows the ball, which slows to a third of its speed through the landing.
  - **Track the putt:** on putts, a low camera trails the ball.
  - **Two players:** at the end of each hole, the camera leans toward whoever won it.
- **Data stories on one hole.** One continuous move runs in this order:
  1. a wide view of the hole;
  2. a sweep from tee to landing as the arcs draw in (now slower, about 3.5 s);
  3. a push in on where the shots finished.

  Then:
  - **Zone tour:** with zones on, the camera stops at up to four zones, biggest share first, and brings each one's label forward.
  - **Slow orbit:** one turn takes about 5 minutes.
  - **Lean to the group:** comparisons lean toward group A, then group B, every 6 s.
- **Zones, redesigned.**
  - Soft glows, brighter for a bigger share.
  - Only the four biggest zones get a label: share in large type, the place in small type.
- **Idle.** A low drone flies along the signature holes (13, 12, 16, 18, 10, 15, 11, 7, 2) while the sun moves from morning to late afternoon every 6 minutes.
- **Touch.**
  - Any touch hands the camera to the visitor at once.
  - In a tour, 20 s without a touch eases the camera back to the story.
- **Landing marks.** The ring on the ground marks where a shot finished. The on-screen callout is now just its label.

### Screen
- **Loading screen before Idle.**
  - While the course loads (about 100 MB on a first visit), one ball flight draws across the screen as the progress bar and lands by the flag at 100%.
  - Four steps show what is arriving, in the order it really loads: terrain and greens, pines and azaleas, water, light and sky, then shot data.
  - Progress counts the real files as they arrive. Once the course has drawn its first frame, the screen dissolves into Idle.
  - Without WebGPU, the screen says which browsers it needs.
- **Presenter dock.**
  - The column now runs the height of the screen: view buttons at the top, Next/Previous and Freeplay/Filters in the middle, Sound and More at the bottom.
  - Buttons are larger: 200 × 200 stage px (quick-view buttons 200 × 156), with bigger icons.
  - Filters only appears in Freeplay.
- **Overview card.** One size smaller, with the same distance from the top and the side of the screen and one padding all round.
  - Sound and More open beside their buttons at the bottom.

### Stories
- **Langer vs DeChambeau, hole by hole (C3).** This is the new last chapter of Precision vs. Power. Both players play holes 7, 13 and 14 of the 2020 final round on one course view. There is no split screen.
  - **Colours:** Langer in teal, DeChambeau in orange, each with their own callout.
  - **Steps:** shot for shot. A player who has holed out stays finished.
  - **Card:**
    - a scorecard row per player;
    - this hole's shots in two columns.
  - **Insights:** each hole opens on the drives ("Off the tee on 13: DeChambeau 321 yd, Langer 269 yd") and ends on the result with the shot video.
- **Data:** the export adds two sequences, `langer-2020-duel` and `dechambeau-2020-duel`.


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
| Precision vs. Power | Langer vs DeChambeau, all holes and hole 7 (B1) · Langer's then DeChambeau's 2nd shot on 7 with Shot 0 · Langer vs DeChambeau hole by hole on one course (C3, added in v2.1) |
| Rory's Approach | McIlroy's approach on 15, 2025, with Shot 0 (C1) |
| The Back Nine | How the field plays 12 (A1) · Into Rae's Creek on 12 (A4) · Every eagle on 13 and 15 (A3) · Where Sunday tee shots finished on 16, zones and day's pin on (A6) · Freeplay |
| Champions' Moments | Video · Champions vs the field into 13 (B3) · Scottie Scheffler on 13, Sunday 2024 (A7) · McIlroy on 15 (C1) · McIlroy on 13 (C2, one hole) · Freeplay |
| Ten Years at Augusta | Drives over 320 yards (A5) · 16, then and now: 2016–19 vs 2023–26 (B2) · Thursday vs Sunday on 12 (B4) · Freeplay |
| Rory's Grand Slam | Video (2 films) · McIlroy's approach shots, 2025 · Amen Corner · 15 · Freeplay |

  Rory's Grand Slam is the tour on the iPad that the screen hasn't synced yet. Press Sync in the tour list to get it.
- **Not built yet:** nationality comparison (B5, the data has no nationality), Tech Diagram (D3), Apps & Solutions (D4).

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
