# Changelog

## v2.5 · 23 Oct 2026 (in progress)

### Tokens
- **Every colour is a token.** No hex values left in the CSS or JS outside the `:root` block; the code's new token names follow the Figma variables.
- **Text on green buttons is warm white** (`--text`), not pure white. Figma's `action/on-primary` now points at `cream/50` to match.
- The tour-list icon is Masters yellow, not Carbon yellow.
- The leave-tour reds, the insight card's second line, the video progress track, the sector map and the loader glow use tokens (`--action-leave`, `--inverse-text-2`, `--map-*`).
- **Data colours have one source:** `--score-hole-in-one` … `--score-triple-bogey`, `--group-a`, `--group-b`, `--data-none`, `--surface-*` in `css/app.css`. The cards, the colour key and the arcs on the course all read them (before, they were copied in three files).
- The volume number uses Plex Light (300); weight 200 was never loaded.
- Removed the unused Three.js import map left over from v1.
- New check `checks/tokens.check.mjs`: fails on any colour literal outside `:root`.
- `HANDOVER.md`: what the handover pack contains, with a status per item.

### Type scale and spacing (Option A: the wall's sizes win)
- **16 text sizes instead of about 50.** Serif: Idle title 160, Media title 108, Headline 94, Tour bar 84, Panel title 48, Small 40. Sans: Value 54, Figure 48, Lead 40, Body L 32, Body 29, Meta 26, Small 24, Eyebrow 21, Label 18, Annotation 16 (stage px at the Augusta preset; Innovation Studio ×1.1). Every font size in the CSS is a token (`--t-*`) divided by its block's zoom (`--z`), so text still follows the screen and UI-size settings.
- Most text moved 0–5%. Bigger moves: tour bar step title −9% (52.8 → 48), menu items +7%, the tour list's "pinned · synced" line and the player cards +18% (20 → 24), the insight's second line +10% → Body L, the loading title −10% (120 → 108).
- Serif is always weight 400: the confirm-dialog title (was 300) and the comparison group names (were 600).
- The Mute row in Volume had no size of its own (it inherited the stage size through the zoom); now Body L.
- **Spacing is a multiple of 4 px**: 90 values snapped (6, 10 → 8; 14, 18 → 16; 22, 26 → 24; 30, 34 → 32; 46 → 48). In-between values went to the nearest multiple of 8, so the presenter column keeps its height: the tallest column (a Freeplay chapter, comparing) still fits at UI size 100 (bottom at 2946 of 2970).
- `checks/tokens.check.mjs` now also fails on a raw font size or off-grid spacing.

### Freeplay filters: Filter v3 (the colleague's UI pass, Figma › Betty › Color / Filter v3)
- **Every filter panel is rebuilt to the v3 design**: icon + Tiempos title; the control; the selection in short ("2, 3, 7", "Fairway, Green", "M. Brennan, C. Conners, +7") and CLEAR ALL at the foot; × top-right. Panels are 864 wide on the wall, 48 padding, radius 16; tiles radius 8 with 16 gaps.
- **Hole**: All + 1–18 as square tiles, seven across. **Round**: four large tiles. **Sector**: labelled groups, Around the green (back, middle, front × left, centre, right) and Fairway (left, right).
- **Region** and **Score**: colour tiles, the data colour along the top, filled when chosen (Region option 3). Score shows −3 … +3 with the name under it.
- **Year, Strokes, Distance**: a range bar: the chosen span is cream with a grip at each end, a step mark per value along the bottom.
- **Shot is now All strokes / First stroke / Last stroke** (choose one). First = the tee shot; last = the player's final stroke on the hole. Shot types (tee, approach, chip, putt) stay as tour story filters only.
- **Champions** (was Trophy / Players): All players · Masters champion. "Never won" stays for the tour comparison that uses it.
- **Player**: four name cards across, first name quiet, surname lead, the A–Z index on the right.
- **The column**: square filter tiles (140 on the wall), the design's own icons above the label (assets/icons/filters, tinted in code). In a Freeplay chapter Previous | Next take the same columns.
- Not in the data, so not shown yet: the v3 regions Cart Path and Margin, and Sector 201–225 yds.

### Colour and type
- **10 type sizes, down from 16.** Merged: video title 108 and tour-bar chapter title 84 → Headline 94; group names 40 → Panel title 48; volume number 54 → Figure 48; Body L 32 → Body 29; Eyebrow 21 → Label 18. Same in Figma (text styles and Screen › type/* variables).
- **Average score reads as the two scores it falls between**, nearest first ("Par–Birdie") instead of a number.
- **Filter tiles no longer show their value**; a set tile is light, and the panel footer and the card say what is chosen. The column is one even panel: 24 all round, 16 between rows, every row the tile height; 16 under each tile label.
- **The v3 surfaces apply everywhere**: panels #193526 (the masters.com footer green), tiles #1C4932, quiet borders #2B5540; course surfaces to the v3 region colours; new `--score-other`, `--accent-active` (reserved). Compare groups stay teal / orange (no clash with the bogey blues); v3's comparison/a–d are kept for a future 3–4 group compare.
- **Score colours are unchanged**: the v3 guide confirms them.
- **The serif is Tiempos Headline**, the Masters' own (masters.com). It loads from the machine for now (Klim's trial is installed here); EB Garamond shows elsewhere until licensed web files are supplied. The sans stays IBM Plex.

### Icons, corners and type: one rule each
- **Icons are IBM Carbon 32, everywhere.** The filter tiles now use Carbon icons: flag, calendar, time, user, hashtag, layers, center--circle, ruler, subtract--alt and trophy. So do Compare (compare), Clear all (filter--remove), End compare (close), Reset view (center-to-fit) and the Tour tile (list--bulleted). Icons Carbon doesn't have are drawn in its style (32 grid, 2 px line): Shot (a ball on a tee), Arcs, Balls and Colour key.
- **Three icon sizes**, as wall-px tokens: `--icon-lg` 64 in every button and tile, `--icon-md` 40 in panel headers and menu rows, and `--icon-sm` 32 for close, back, sync, the insight mark and the gesture hints. Before this there were 12 sizes, from 25 to 78.
- **Corners follow v3 everywhere.**
  - Panels (`.wire`, the filter panel) use `--rad-panel` 16.
  - Buttons, tiles, chips, cards, the tour bar and the toast use `--rad-control` 8.
  - Round marks are 50%, segments inside a control are 0, and small marks are 4.
  - The old `--r` (22 px, scaled differently in every zoomed block) is gone.
- **Only the 10 text styles.** Every weight now follows its style: serif 400, labels 500, figures 300, everything else 400. `<b>` no longer turns text bold. Eyebrows that were at meta size are now at label size (the insight's "Hole insight" and the video chapter's meta line). A row of four figures uses Text/Lead so they never touch. The shot label on the course is Text/Body, no longer caps with wide tracking.

### Selection
- **Selected is cream everywhere.** The open filter tile is now cream (it was a yellow outline). Chosen colour tiles in Score and Region are cream with their colour strip along the top (they used to fill with the colour). The current tour in the tour list is a cream row.
- **A set filter gets a small yellow dot** in the top-right corner of its column tile (16 px, `--info`; with a dark edge when the tile is also open), instead of the whole tile turning cream.

### Idle
- **The Idle title sits low** (kicker, tour name, call to action; bottom 200 px above the screen edge) instead of in the middle, so the centre stays free for whatever plays behind it: the flyover film carries its own IBM × Masters lockup there.
- **Sound joins the Idle group**: Tour, Freeplay, a divider, then Sound, in one group mid-column. Volume opens beside the group, where the tour list opens (the list steps aside). During a tour Sound is back in its place at the bottom of the column.

### Idle film test
- `?idlevideo` plays the 6K flyover film (`Asset/…Flyover_6KUpscale…mp4`, linked locally as `assets/idle-flyover.mp4`, gitignored) on Idle over the live course, filling the stage. It decodes at 60 fps with no dropped frames locally. The film is 5280 × 1890 (2.79:1), so filling the 16:9 stage crops its sides.
- The IBM × Masters lockup is burned into the film's centre; the low Idle title (above) keeps clear of it.
- Local only: 1.1 GB can't go to Vercel as is, and the dev server can't seek it.

### Figma updated
- **Design Handover 📦** section with one page per handover section; Design System and UX Flow Screen moved in as `↳ 2 · Components & tokens` and `↳ 3 · Screens`.
- `Screen` variables: `type/*` renamed and resized to the 16-step scale, with CSS names as code syntax; `control/*` and `audience/*` set to the wall's sizes (button 169, panel 642, card 716, radius 19 / 25). Text styles regrouped as Display/* and Text/*, each bound to its `type/*` variable. The filter tiles (incl. Compare and Clear all) are all the button size now.
- **↳ 0 · Contents & version**, **↳ 1 · System** (overview, colour swatches bound to the variables, type specimen on the text styles, spacing / corners / sizes), **↳ 4 · Rules** (scale, transitions, camera, touch, motion timings, tour bar and cards, presenter column), **↳ 6 · Content & data** (tour model, story types, words, glossary, data fields and figures, open questions, sound), **↳ 7 · Prototype & production notes** (where it lives, final vs stand-in, licences, performance, open questions). Dashed "Visual example to add" slots mark where a picture should go (14).
- **↳ 5 · UX flow & edge states** (new): overview flow (Loading, Idle, tour chapters, Freeplay solo / break-out, panels over any state); detailed flows for Idle, More / Volume / confirm, the tour's step loop and chapter types, and Freeplay (Compare, the 11 filters, the course); 22 edge states marked in prototype / to design / open question; a button inventory of all 39 controls with where, when, what and sound.
- Idle: the title block on S01 / S02 moved to the low position. The Idle column on *Presenter menu · as a whole* is now live layers (Tour tile, Freeplay, divider, Sound instances) instead of a screenshot. The Tour tile is the button size (169), like every other presenter button.
- `action/on-primary` → `cream/50`. New: `action/leave-pressed`, `inverse/text-secondary`, `data/none`, `course/*` (bunker, fairway, green, pine straw, second cut, water), `region-map/*`. Score and group colours have their CSS names as code syntax.

- **Handover pass, 23 Oct (late):** **↳ 3 · Screens** rebuilt as 32 screens captured from the prototype (Loading, Idle, Tour, Freeplay, edge states, adaptation), each with a spec card (what it is, components, rules, how to reach it). **↳ 2 · Components & tokens** gets an *All components & tokens* board beside the Filter v3 frames: every colour bound to its variable (Color, Data, Filter v3, Primitives), the 12 text styles, Carbon spacing / sizes / radii, the Screen sizes per preset, every component as instances (Filter v3, column and panels, course and audience, pre-v3 filters), and 9 "Code only" parts as captures. **↳ 1 · System**: every gap and padding bound to the v3 (Carbon) spacing variables, type specimen rebuilt for the 10 sizes, a new Spacing, sizes and corners section, the Filter v3 guides set beside it. The 14 "Visual example" slots on ↳ 4, ↳ 6 and ↳ 7 now hold captures, frame strips and (for sound) a drawn timeline.

- Selection rule on ↳ 4 › presenter column; ↳ 2 Column gets a *Freeplay, filters set* variant, Tour list and the Score / Region panels re-exported; the affected screens on ↳ 3 re-captured.
- **↳ 2 is now "Components", from the live prototype.** The old instances (round score cells, the earlier overview card, chip-style filters…) are gone from the handover. 39 components were rebuilt as editable layers straight from prototype v2.5 at wall size and grouped into sets: Idle (group, title block), Tour list (default, set up, change tour), Column (tour, Freeplay), Quick bar, Tour bar (video, chapter, rest, step), Overview card (data story, game focus, comparison, side by side, Freeplay, compare), Insight, Colour key, Shot video card, Video chapter, More, Volume, Confirm dialog, Filter panel (all 11 filters), Shot label, Gesture hints, Toast. Colours are bound to Color / Data, text to the text styles or Screen › type sizes; each card lists the tokens it uses. Tokens are shown only on ↳ 1 · System. Stale copy on ↳ 0, 5, 6, 7 updated (10 sizes, v3 filter tiles, Tour bar, average score as words, Tiempos).

### Figma to update
- The Display text styles still use EB Garamond: Tiempos Headline can't be loaded from here (only Sam's trial install). Switch them once the licensed font is in the Figma team.
- Filter v3's own collection duplicates names in Color (surface/panel …): merge it into Color / Data so there is one set.
- Sector panel in v3 has off-scale spacing (45 / 20 / 15) and a darker background; built on the 48 / 24 / 16 system like the others.
- **The component and screen boards were replaced during the UI pass** (moved to Design Updates › ↳ Components & tokens from an older copy; ↳ 3 · Screens emptied). These 23 Oct edits are not in the current boards and need redoing there: Idle column as live layers (Tour, Freeplay, divider, Sound); Tour tile, Compare and Clear all bound to the button size and the filter-tile grid re-spaced; the green Freeplay fill on Idle; the Idle title moved low on S01 / S02; the v2.3 rules frame marked superseded. Variables and text styles are unaffected.
- Apply the text styles to the components and screens: many text layers (e.g. the Tour bar) set their size directly, so they don't follow the new scale yet.
- ↳ 3 · Screens are captures of the prototype, not live layers: rebuild them from components once the boards are current.
- ↳ 2 components are flat layers (absolute positions) taken from the prototype: add auto layout and properties (selected, disabled…) as each is refined in Figma. The hole tags on the course aren't included (drawn by the sim).
- The serif text on ↳ 2 is EB Garamond: the Display styles are on Test Tiempos, which this Figma account can't load.
- Dock button has no green Freeplay variant (the Idle Freeplay has been green since v2.3); the Idle column uses a fill override until there is one.

## v2.4 · 22 Oct 2026

### View controls
- **Colour key** (off by default): a quick-bar toggle for a small card under the overview that names the arc colours (score on the hole), with arc-shaped swatches, best to worst. It appears at once when turned on, and comes in after the card on a new chapter. Data stories and Freeplay only.
- The overview card's coloured bar now has a title: "Score on the hole · to par".
- Compare is the same height as every other tile.
- **Player filter** follows the Figma "Player Selection" design: every player in letter sections by surname, name cards four wide (selected = light), an A–Z index on the right that jumps the list (a dot marks letters with a selection), the list fading out at the bottom. No portraits yet.
- **Serif panel titles** everywhere a panel is named: Volume, More (new title), the tour list, confirm dialogs; and the comparison group names on the overview card.
- **Filter panel title**: the category icon and the name in the serif ("Hole · Group B" when comparing). Each filter has **Clear all** (that filter only) in its header beside ×, dimmed until something is set; the Clear all tile in the column clears every filter. No inner box and no "tap or drag" instructions: options sit straight on the panel.
- **Filter panel is tall and narrow** (760 wide, was 1150): grids three or four across instead of long rows. Hole three across, Score and Round four, Player three, Region two.
- **Hole filter**: numbers only, in round cells.
- **Round filter**: 1–4 in the same round cells. **Score filter**: best to worst in two rows of four (Ace … −1, E … +3) in the same round cells (selected = white), each name with a short bar in its arc colour.
- **Gesture limits**: while a visitor steers, the camera stays at least 3 m above the ground, no further out than a little past the whole-course view, and the point it turns around stays over the course (no panning into the void). Directed moves are untouched.
- **Frame selection** is removed from the filter panel; Clear all takes its place. Choosing holes still frames them; Reset view goes back to the whole course.
- **Overview**: the bar's title shows the average score to par ("Average score −0.50"); "Birdie or better" is now "Under par".
- UI size can no longer push the presenter column off the screen: its scale stops at 0.865 (the tallest column, a comparing Freeplay chapter, just fits). The Control height setting is removed.
- **Clear all** tile in the Freeplay grid's last slot (beside Players): clears every filter on the group being edited; dimmed when nothing is set.
- A Freeplay chapter (e.g. the end of Ten Years at Augusta) keeps Previous | Next, in one row above the Freeplay group. Only solo Freeplay and break-outs drop them.
- **Reset view** lives only in the view bar, with its own icon (frame corners around a centre point, so it never reads as undo or Previous). Always there in Freeplay; in a tour it appears once the camera has been moved. End / Back to tour now take the whole first row of the Freeplay group.

### Idle
- Sound stays on Idle, at the bottom of the column. The "Set up this screen" tour list sits beside the column so it never covers Sound, and steps aside while Volume is open. Sound comes in with the Freeplay button, after the title and call to action.
- The tour chip is now a square **Tour** tile, grouped with Freeplay in the presenter column's place (light while its list is open); the tour list opens beside the group.

## v2.3 · 22 Oct 2026

### Freeplay
- **Compare is no longer a filter tile.** It is a row above the tiles: one Compare button, then Group A | Group B as two tiles with a badge in the group's colour; End compare sits at the right of the Filters header. The tiles and the open control edit the selected group; set tiles carry the group's colour, and the panel title names it ("Hole · Group B").
- **Choosing holes in the Hole filter frames them.** No other filter moves the camera.
- **Back to tour from Freeplay is a cut**, like going in.
- The filter panel is centred on the presenter column. The hole list is two wide, with full hole names.
- Next / Previous leave the column in Freeplay (it has no steps), making room for the tiles.
- The Freeplay group sits midway in the column: even space to the views above and to Sound / More below.

### Presenter column
- Larger: the controls are at what UI size 100 used to give (scale 0.845). Audience sizes are unchanged.
- Every button is a 200 px square (views, Next / Previous, Freeplay, filter tiles, End | Reset view).
- The Idle Freeplay button is green, like the other primary actions.

### Course
- The land beyond the course is a muted woodland green with faint contours instead of near-black, so the course no longer reads as an island.

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
