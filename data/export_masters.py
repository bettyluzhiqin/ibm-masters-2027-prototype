"""Export a cut-down Masters dataset for the wireframe prototype.

Reads the Data API's DuckDB file and writes:
  <out>/meta.js    window.MASTERS_DATA: holes (real tee/pin/fairway line), island outline, players, focus sequence
  <out>/shots.bin  Int16 flights, 16 fields each (see FIELDS)

World units: 1 unit = 10 yd (9.144 m). Course north runs along world +X, east along world -Z (no mirroring).
"""
import json, math, sys
import duckdb

DB, OUT = sys.argv[1], sys.argv[2]
YEARS = (2016, 2026)
U = 9.144                      # metres per world unit (10 yd)
Q = 20                         # int16 quantisation: 1/20 unit (~0.46 m)
FIELDS = ["hole", "year", "round", "player", "stroke", "count", "type", "score", "region", "sector",
          "fx", "fz", "tx", "tz", "yd", "pad"]

c = duckdb.connect(DB, read_only=True)
q = lambda sql, *a: c.execute(sql, list(a)).fetchall()

# centre of play
cx, cy = q("select (min(x)+max(x))/2, (min(y)+max(y))/2 from shots where year between ? and ?", *YEARS)[0]
def world(x, y):
    return round((y - cy) / U, 3), round(-(x - cx) / U, 3)

# --- holes: real names/par/yards; tee and pin = median over the years; fairway line through median landing spots ---
holes = []
for n, name, par, diff, yards, avg in q("select number,name,par,difficulty,yards,avg_historical_stroke from holes order by 1"):
    tx, ty, px, py = q("""select median(tee_x),median(tee_y),median(pin_x),median(pin_y)
                          from hole_geometries where hole=? and year between ? and ?""", n, *YEARS)[0]
    line = [world(tx, ty)]
    # where the ball usually is after stroke 1 (and 2 on par 5s): bends the fairway around doglegs
    for k in ([1] if par == 4 else [1, 2] if par == 5 else []):
        mx, my = q("""select median(x),median(y) from shots where hole=? and stroke=? and not on_green
                      and year between ? and ?""", n, k, *YEARS)[0]
        line.append(world(mx, my))
    line.append(world(px, py))
    # historical insights for this hole (all rounds' lists, "Historically" statements only, deduplicated, shortest first)
    hist = sorted({t for (js,) in q("select insights from hole_insights where hole=?", n) for t in json.loads(js) if t.startswith("Historically")}, key=len)
    # the pin for each year and round (the sim shows the day's pin when a story is about one round)
    pins = {f"{y}-{r}": world(x, y_) for y, r, x, y_ in q("select year, round, pin_x, pin_y from hole_geometries where hole=? and year between ? and ?", n, *YEARS)}
    holes.append({"n": n, "name": name, "par": par, "difficulty": diff, "yd": yards, "avg": round(avg, 2), "line": line, "insights": hist[:2], "pins": pins})

# --- island outline: robust radius of all play around the centre, per angle, smoothed ---
pts = q("select x,y from shots where year between ? and ? using sample 60000 rows", *YEARS)
BINS = 96
rad = [[] for _ in range(BINS)]
for x, y in pts:
    wx, wz = world(x, y)
    a = math.atan2(wz, wx)
    rad[int((a + math.pi) / (2 * math.pi) * BINS) % BINS].append(math.hypot(wx, wz))
r = [sorted(b)[int(len(b) * 0.985)] if b else 0 for b in rad]
r = [max(r[i], 0.7 * max(r)) for i in range(BINS)]           # no deep notches
r = [sum(r[(i + k) % BINS] for k in range(-3, 4)) / 7 + 9 for i in range(BINS)]  # smooth + tree margin
island = []
for i in range(BINS):
    a = (i + 0.5) / BINS * 2 * math.pi - math.pi
    island.append([round(r[i] * math.cos(a), 2), round(r[i] * math.sin(a), 2)])

# --- players who played in the window ---
players = q("""select p.id, p.first_name, p.last_name from players p
               where p.id in (select distinct player from shots where year between ? and ?)
               order by p.last_name, p.first_name""", *YEARS)
pidx = {pid: i for i, (pid, *_) in enumerate(players)}
names = [f"{f} {l}".strip() for _, f, l in players]

# --- lookups to the prototype's filter values ---
REGION = {1: "Bunker", 3: "Fairway", 4: "Green", 5: "Greenside bunker", 8: "Pine straw", 9: "Second cut", 11: "Water"}
REGIONS = ["Bunker", "Fairway", "Green", "Greenside bunker", "Pine straw", "Second cut", "Water", "Other"]
sector_name = dict(q("select id,name from sectors"))
# sector = the area of the current hole the ball landed in (glossary: overlapping sections of the playable area)
#  - greenside: the data's 25 greenside names fold into a 3x3 grid. Side = first LEFT/RIGHT token (else centre),
#    depth = first FRONT/BACK token (else middle). e.g. LEFT_BACK_BACK -> back left, FRONT_CENTER -> front centre.
#  - fairway left / right: the data never fills these in 2016-2026, so they are derived: which side of the hole's
#    fairway line (tee -> usual landing spots -> pin) an off-green landing finished, walking tee -> green.
DEPTHS, SIDES = ["back", "middle", "front"], ["left", "centre", "right"]
SECTORS = ["Fairway left", "Fairway right"] + [f"Greenside {d} {sd}" for d in DEPTHS for sd in SIDES]
def greenside(sid):
    s = sector_name.get(sid, "NOT_SET")
    if not s.startswith("GREENSIDE"): return None
    toks = s.split("_")[1:]
    side = next((t for t in toks if t in ("LEFT", "RIGHT")), "CENTRE").lower()
    depth = next((t for t in toks if t in ("FRONT", "BACK")), "MIDDLE").lower()
    return SECTORS.index(f"Greenside {depth} {side}")
def fairway_side(hole_n, bx, bz):
    line = holes[hole_n - 1]["line"]; best = None
    for (x1, z1), (x2, z2) in zip(line, line[1:]):
        dx, dz = x2 - x1, z2 - z1; L2 = dx * dx + dz * dz or 1
        t = max(0.0, min(1.0, ((bx - x1) * dx + (bz - z1) * dz) / L2))
        d = math.hypot(bx - (x1 + dx * t), bz - (z1 + dz * t))
        if best is None or d < best[0]:
            best = (d, (-dz) * (bx - x1) - dx * (-(bz - z1)))  # world x = north, z = -east: >0 = golfer's left
    return 0 if best[1] > 0 else 1
# score ids from the scores table -> index in SCORES (the colour key order); anything else -> -1
SCORES = ["Hole in One", "Albatross", "Eagle", "Birdie", "Par", "Bogey", "Double Bogey", "Triple Bogey"]
SCORE = {100: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7}

# --- flights: from the previous row's spot to this row's spot ---
rows = q("""select hole, year, round, player, stroke, count, score, region, sector,
                   lag(x) over w, lag(y) over w, lag(on_green) over w, x, y
            from shots where year between ? and ?
            window w as (partition by gid order by stroke)
            order by year, hole, gid, stroke""", *YEARS)
import array
buf = array.array("h")
n_out = 0
for hole, year, rnd, player, stroke, count, score, region, sec, fx, fy, fg, x, y in rows:
    if stroke < 1 or fx is None or player not in pidx: continue
    a, b = world(fx, fy), world(x, y)
    yd = math.hypot(x - fx, y - fy) * 1.0936
    if yd < 0.3: continue                                       # duplicate rows (drops, penalties logged in place)
    kind = 0 if stroke == 1 else 3 if fg else 2 if yd < 40 else 1   # Tee, Approach, Chip, Putt
    rec = [hole, year - 2000, rnd, pidx[player], stroke, count, kind, SCORE.get(score, -1),
           REGIONS.index(REGION.get(region, "Other")),
           gs if (gs := greenside(sec)) is not None else (-1 if REGION.get(region) == "Green" or fg else fairway_side(hole, *b)),
           round(a[0] * Q), round(a[1] * Q), round(b[0] * Q), round(b[1] * Q), round(yd), 0]
    assert len(rec) == len(FIELDS)
    buf.extend(rec)
    n_out += 1

# --- Game focus sequences: any player / year / round / holes, shot by shot (real positions) ---
# score = strokes played minus par. The data logs a penalty as its own row (no movement) and then the drop as a movement;
# the penalty counts as one stroke, the drop counts as none. The data's own count/score columns count the drop, so they are not used.
# Tours pick a sequence and, optionally, a range of strokes from it (index.html). Every played shot carries "from this spot" odds:
# pre = the field's chance of birdie / par from where the shot was played, post = from where it finished.
FRIENDLY = {"FAIRWAY": "Fairway", "GREEN": "Green", "SECOND_CUT": "Second cut", "BUNKER": "Bunker", "GREENSIDE_BUNKER": "Greenside bunker",
            "PINESTRAW": "Pine straw", "WATER": "Water"}
SCORE_NAME = {-3: "Albatross", -2: "Eagle", -1: "Birdie", 0: "Par", 1: "Bogey", 2: "Double Bogey", 3: "Triple Bogey"}
SEQUENCES = {  # id: player last name, year, round, holes, stroke shown in the shot video per hole
    "mcilroy-2025-amen": ("McIlroy", 2025, 4, (11, 12, 13), {11: 2, 12: 1, 13: 3}),
    "langer-2020-7": ("Langer", 2020, 4, (7,), {7: 2}),
    "dechambeau-2020-7": ("DeChambeau", 2020, 4, (7,), {7: 2}),
    "mcilroy-2025-15": ("McIlroy", 2025, 4, (15,), {15: 2}),
}
_field = {}
def field(hole):  # every lie on this hole 2016-2026, with that player's final strokes on the hole
    if hole not in _field:
        r = np.array(q("""select x, y, on_green::int, max(count) over (partition by gid) from shots
                          where hole=? and year between ? and ? and not in_hole""", hole, *YEARS), dtype=float)
        _field[hole] = r
    return _field[hole]
def spot_odds(hole, par, x, y):
    f = field(hole); d = np.hypot(f[:, 0] - x, f[:, 1] - y)
    for rad in (8, 12, 18, 27, 40, 60):  # metres: widen until there is a fair sample
        m = d < rad
        if m.sum() >= 40: break
    st = f[m, 3]
    return round(100 * float((st <= par - 1).mean()), 2), round(100 * float((st == par).mean()), 2), int(m.sum())
def pct(v): return f"{v:.2f}".rstrip("0").rstrip(".")
def sequence(last, year, rnd, holes_, key_shot):
    player = q("select first_name || ' ' || last_name from players where last_name=? and id in (select player from shots where year=?)", last, year)[0][0]
    out = []
    for hole in holes_:
        rows = q("""select s.stroke, s.x, s.y, s.penalty, r.name, s.in_hole from shots s join players p on p.id=s.player join regions r on r.id=s.region
                    where p.last_name=? and s.year=? and s.round=? and s.hole=? order by s.stroke""", last, year, rnd, hole)
        par = next(h["par"] for h in holes if h["n"] == hole)
        shots, prev, no = [], rows[0], 0
        for st, x, y, pen, reg, inh in rows[1:]:
            yd = math.hypot(x - prev[1], y - prev[2]) * 1.0936
            if pen and yd < 0.3:
                no += 1; shots.append({"kind": "Penalty", "yd": 0, "no": no}); continue
            if shots and shots[-1]["kind"] == "Penalty":  # the data logs the drop as a movement: it is not a stroke
                shots.append({"kind": "Drop", "yd": round(yd), "from": world(prev[1], prev[2]), "to": world(x, y), "lie": FRIENDLY.get(reg, "Other")})
                prev = (st, x, y, pen, reg, inh); continue
            no += 1
            kind = "Tee shot" if no == 1 else "Putt" if FRIENDLY.get(prev[4]) == "Green" else "Chip" if yd < 40 else "Approach"
            b0, p0, n0 = spot_odds(hole, par, prev[1], prev[2])
            sh = {"kind": kind, "no": no, "yd": round(yd), "from": world(prev[1], prev[2]), "to": world(x, y), "lie": FRIENDLY.get(reg, "Other"),
                  "fromLie": "Tee" if no == 1 else FRIENDLY.get(prev[4], "Other"),
                  "pre": f"Historically, from this spot, players across the field have a {pct(b0)}% chance of birdie and a {pct(p0)}% chance of par.", "preN": n0}
            if not inh:
                b1, p1, n1 = spot_odds(hole, par, x, y)
                sh["post"] = f"From where it finished, the field went on to make birdie {pct(b1)}% of the time and par {pct(p1)}%."
            else:
                sh["post"] = "Holed."
            shots.append(sh); prev = (st, x, y, pen, reg, inh)
        strokes = sum(1 for sh in shots if sh["kind"] != "Drop")  # each played shot plus one per penalty; drops are free
        hi = q("select insights from hole_insights where hole=? and round=?", hole, rnd)
        ins = json.loads(hi[0][0]) if hi else []
        ins.sort(key=lambda t: (not t.startswith(f"In {year}"), not t.startswith("Currently"), len(t)))
        if not any(t.startswith(f"In {year}") for t in ins):  # the round-4 list speaks about 2025; for other years use the historical lines
            ins = next(h["insights"] for h in holes if h["n"] == hole)
        out.append({"hole": hole, "par": par, "strokes": strokes, "score": SCORE_NAME.get(strokes - par, f"+{strokes - par}"), "shots": shots,
                    "insights": ins[:2], "videoShot": key_shot.get(hole, 1)})
    return {"player": player, "year": year, "round": rnd, "holes": out}
import numpy as np
sequences = {k: sequence(*v) for k, v in SEQUENCES.items()}
# --- round stats for comparison stories (strokes in the round, average drive on par 4s and 5s) ---
def round_stats(last, year, rnd):
    r = q("""with g as (select s.hole, max(s.count) n from shots s join players p on p.id=s.player where p.last_name=? and s.year=? and s.round=? group by 1),
                  t as (select s.hole, s.stroke, s.x, s.y from shots s join players p on p.id=s.player where p.last_name=? and s.year=? and s.round=? and s.stroke in (0,1))
             select (select sum(n) from g), (select count(*) from g),
                    (select avg(sqrt(power(a.x-b.x,2)+power(a.y-b.y,2))*1.0936) from t a join t b on a.hole=b.hole and a.stroke=0 and b.stroke=1 join holes h on h.number=a.hole where h.par>3)""",
          last, year, rnd, last, year, rnd)[0]
    par = sum(h["par"] for h in holes)
    return {"strokes": int(r[0]), "holes": int(r[1]), "toPar": int(r[0]) - par if r[1] == 18 else None, "drive": round(float(r[2]))}
stories = {f"{l}-{y}-{r}": round_stats(l, y, r) for l, y, r in [("Langer", 2020, 4), ("DeChambeau", 2020, 4)]}

# --- terrain: a grid over the course. Surface = weighted majority of landings per cell (smoothed);
#     elevation = mean landing height per cell, gaps filled smoothly. Cells nobody plays near become woods. ---
SURF = ["Woods", "Fairway", "Second cut", "Green", "Bunker", "Water", "Pine straw", "Tee"]
REG_SURF = {3: 1, 9: 2, 6: 2, 4: 3, 1: 4, 5: 4, 11: 5, 8: 6}           # data region id -> surface
WEIGHT = np.array([1, 1, 1, 1.5, 4, 3, 1, 3])                              # small features (bunkers, water, tees) win ties
CELL = 0.35                                                                 # world units (~3.2 m)
ix = [p[0] for p in island]; iz = [p[1] for p in island]
X0, Z0 = min(ix) - 12, min(iz) - 12
NX, NZ = int((max(ix) + 12 - X0) / CELL) + 1, int((max(iz) + 12 - Z0) / CELL) + 1
pts = np.array(q("select x, y, z, region, stroke from shots where z between -15 and 45"), dtype=float)
wx = (pts[:, 1] - cy) / U; wz = -(pts[:, 0] - cx) / U
gi = np.clip(((wx - X0) / CELL).astype(int), 0, NX - 1); gj = np.clip(((wz - Z0) / CELL).astype(int), 0, NZ - 1)
counts = np.zeros((len(SURF), NZ, NX))
reg = pts[:, 3].astype(int); surf = np.array([REG_SURF.get(r, -1) for r in reg])
tee = pts[:, 4] == 0
surf[tee] = 7
ok = surf >= 0
np.add.at(counts, (surf[ok], gj[ok], gi[ok]), 1)
def blur(a, n=1):
    for _ in range(n):
        a = (a + np.roll(a, 1, -1) + np.roll(a, -1, -1) + np.roll(a, 1, -2) + np.roll(a, -1, -2)) / 5
    return a
sm = blur(counts, 2) * WEIGHT[:, None, None]
total = sm.sum(0)
cls = np.where(total > 0.02, sm.argmax(0), 0).astype(np.uint8)
# rough between holes: a band around everything that is played, the rest stays woods
played = blur((total > 0.02).astype(float), 4) > 0.05
cls[(cls == 0) & played] = 2
# elevation
hs = np.zeros((NZ, NX)); hc = np.zeros((NZ, NX))
np.add.at(hs, (gj, gi), pts[:, 2]); np.add.at(hc, (gj, gi), 1)
known = hc > 0
h = np.where(known, hs / np.maximum(hc, 1), np.nanmean(pts[:, 2]))
for it in range(600):                                                       # fill gaps (Jacobi), keep measured cells
    nb = (np.roll(h, 1, 0) + np.roll(h, -1, 0) + np.roll(h, 1, 1) + np.roll(h, -1, 1)) / 4
    h = np.where(known, hs / np.maximum(hc, 1), nb) if it < 560 else nb * 0.5 + h * 0.5
h = blur(h, 3)
with open(f"{OUT}/terrain.bin", "wb") as f:
    f.write(cls.tobytes()); f.write(np.round(h * 100).astype(np.int16).tobytes())
terrain = {"x0": X0, "z0": Z0, "cell": CELL, "nx": NX, "nz": NZ, "surfaces": SURF, "metresPerUnit": U}
print("terrain", NX, "x", NZ, "surfaces:", {SURF[k]: int((cls == k).sum()) for k in range(len(SURF))}, "height m:", round(float(h.min()), 1), round(float(h.max()), 1))

with open(f"{OUT}/shots.bin", "wb") as f:
    buf.tofile(f)
meta = {"fields": FIELDS, "quant": Q, "count": n_out, "years": list(range(YEARS[0], YEARS[1] + 1)),
        "holes": holes, "island": island, "scores": SCORES, "sectors": SECTORS, "terrain": terrain, "players": names, "lastNames": [l for _, _, l in players], "regions": REGIONS,
        "sequences": sequences, "stories": stories}
with open(f"{OUT}/meta.js", "w") as f:
    f.write("// Generated from the IBM Masters Data API database (masters.db, release v1.1.3). Do not edit by hand.\n")
    f.write("window.MASTERS_DATA=" + json.dumps(meta, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(f"{n_out} flights, {len(names)} players, {len(holes)} holes, shots.bin {len(buf) * 2 / 1e6:.1f} MB")
for k, sq in sequences.items(): print(k, sq["player"], [(h["hole"], h["score"], [(x["kind"], x.get("preN")) for x in h["shots"]]) for h in sq["holes"]])
print("stories:", stories)
