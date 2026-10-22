// Shot shape: the Augusta WebGPU build's shot model (its bundle's Kq, Jq, Yq, Xq, Qq), so our arcs fly like its paths.
// The club, estimated from the distance, sets launch and descent angles; carry, then roll on the ground; tee shots bend toward
// the hole's line of play; putts follow the green. Clubs, bend and roll are estimates (the data has no clubs or ball flight).
// Pure: no three.js and no course; the caller passes the terrain height function, so this runs (and is checked) in Node too.
const DEG = Math.PI / 180, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const easeIO = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
export const io3 = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

const CLUBS = [[258, 10.4, 38, .075], [228, 9.3, 42, .055], [216, 10, 44, .045], [199, 10.3, 45, .04], [191, 11, 47, .035], [182, 12.1, 48, .03],
  [172, 14, 49, .025], [161, 16.1, 50, .02], [150, 18.3, 51, .015], [139, 20.4, 52, .012], [128, 23.7, 53, .01], [108, 28, 55, .009], [82, 32, 57, .008], [54, 36, 59, .007]]
  .map(([carry, launch, descent, roll]) => ({ carry, launch, descent, roll })); // driver … lob wedge
function club(sh, d) {
  if (d < 32) return { launch: 32, descent: 50, roll: .16 };
  if (sh.tee && d > 224) return CLUBS[0];
  return CLUBS.reduce((a, b) => Math.abs(b.carry * (1 + b.roll) - d) < Math.abs(a.carry * (1 + a.roll) - d) ? b : a);
}
function aimAlongLine(s, d, line) { // a point down the line of play, 70–200 m past where the tee sits on it
  let best = Infinity, along = 0, acc = 0; const segs = [];
  for (let k = 1; k < line.length; k++) { const a = line[k - 1], b = line[k], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz); if (L < .001) continue;
    const f = clamp(((s[0] - a.x) * dx + (s[2] - a.z) * dz) / (L * L), 0, 1), q = (s[0] - a.x - dx * f) ** 2 + (s[2] - a.z - dz * f) ** 2;
    if (q < best) { best = q; along = acc + L * f; } segs.push({ a, dx, dz, L, acc }); acc += L; }
  if (line.length < 3 || !segs.length) return null;
  const want = Math.min(acc, along + clamp(d * .7, 70, 200)), g = segs.find(g => g.acc + g.L >= want) || segs.at(-1), f = clamp((want - g.acc) / g.L, 0, 1);
  return [g.a.x + g.dx * f, g.a.z + g.dz * f];
}

// sh: { tee, putt, toLie }; s, e: [x, y, z] in world metres; line: the hole's line of play ({ x, z } points); heightAt(x, z)
export function flightModel(sh, s, e, line, heightAt) {
  const dx = e[0] - s[0], dz = e[2] - s[2], d = Math.hypot(dx, dz), putt = !!sh.putt, still = d < .005;
  const cl = putt ? { launch: 0, descent: 0, roll: 1 } : club(sh, d), ux = d > .001 ? dx / d : 0, uz = d > .001 ? dz / d : -1;
  let roll = still ? 0 : putt ? d : d * cl.roll;
  if (!putt && !still) {
    if (/water|bunker|sand|straw|other/i.test(sh.toLie || "")) roll = 0; else if (sh.toLie === "Green") roll *= .55; else if (/cut/i.test(sh.toLie || "")) roll *= .45;
    roll = clamp(roll * Math.exp(clamp(-(e[1] - s[1]) / Math.max(d, 1) * 4, -.7, .7)), 0, Math.min(32, d * .25));
  }
  const lx = e[0] - ux * roll, lz = e[2] - uz * roll, land = putt || still ? s : [lx, heightAt(lx, lz) + .09, lz];
  const green = line.at(-1), aim = (sh.tee && !putt && !still && d > 90 ? aimAlongLine(s, d, line) : null) || [green.x, green.z];
  let ax = aim[0] - s[0], az = aim[1] - s[2]; const al = Math.hypot(ax, az); if (al > .01) { ax /= al; az /= al; } else { ax = ux; az = uz; }
  const b = clamp(Math.atan2(ux * az - uz * ax, ux * ax + uz * az), -35 * DEG, 35 * DEG); // bend: start toward the aim, finish where it landed
  ax = ux * Math.cos(b) - uz * Math.sin(b); az = ux * Math.sin(b) + uz * Math.cos(b);
  const carry = putt || still ? 0 : Math.max(0, d - roll), S = putt ? e : land, C = putt ? d : carry, w = C / 3 * (putt ? 1 : 1.35);
  return { s, e, land, putt, still, c1: [s[0] + ax * w, s[2] + az * w], c2: [S[0] - ux * C * .28, S[2] - uz * C * .28],
    m0: Math.tan(cl.launch * DEG) * carry * 1.35, m1: -Math.tan(cl.descent * DEG) * carry * .84, flight: roll > .01 && !putt ? .84 : 1 };
}

const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
// t 0–1 along the shot: flight (Hermite height over a Bézier ground track), then roll along the terrain; writes into out
export function flightPoint(m, t, out, heightAt) {
  if (m.still) { out[0] = m.e[0]; out[1] = m.e[1]; out[2] = m.e[2]; return out; }
  const ground = (x, z) => { out[0] = x; out[1] = heightAt(x, z) + .09; out[2] = z; return out; };
  if (m.putt) return ground(bez(m.s[0], m.c1[0], m.c2[0], m.e[0], t), bez(m.s[2], m.c1[1], m.c2[1], m.e[2], t));
  if (t > m.flight) { const r = (t - m.flight) / (1 - m.flight); return ground(m.land[0] + (m.e[0] - m.land[0]) * r, m.land[2] + (m.e[2] - m.land[2]) * r); }
  const r = t / m.flight;
  out[0] = bez(m.s[0], m.c1[0], m.c2[0], m.land[0], r); out[2] = bez(m.s[2], m.c1[1], m.c2[1], m.land[2], r);
  out[1] = (2 * r ** 3 - 3 * r ** 2 + 1) * m.s[1] + (r ** 3 - 2 * r ** 2 + r) * m.m0 + (-2 * r ** 3 + 3 * r ** 2) * m.land[1] + (r ** 3 - r ** 2) * m.m1;
  return out;
}
