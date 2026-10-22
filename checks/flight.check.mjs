// node checks/flight.check.mjs — the shot model's promises, on a flat course (no browser needed)
import assert from "node:assert/strict";
import { flightModel, flightPoint } from "../sim/flight.js";
const flat = () => 0, line = [{ x: 0, z: 0 }, { x: 0, z: 200 }, { x: 0, z: 400 }];
const at = (m, t) => flightPoint(m, t, [0, 0, 0], flat);
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

// a 250 m drive into the fairway: starts and ends where the data says, flies, then rolls out on the ground
const drive = flightModel({ tee: true, putt: false, toLie: "Fairway" }, [0, 0, 0], [0, 0, 250], line, flat);
for (const [t, p] of [[0, [0, 0, 0]], [1, [0, .09, 250]]]) at(drive, t).forEach((v, i) => near(v, p[i], 1e-3));
const apex = Math.max(...Array.from({ length: 50 }, (_, k) => at(drive, k / 49)[1]));
assert.ok(apex > 20 && apex < 60, `drive apex ${apex} m`);
assert.ok(drive.flight < 1 && at(drive, .95)[1] < .1, "rolls along the ground after landing");

// into water: no roll; a putt: on the ground the whole way; no movement: stays put
const wet = flightModel({ tee: false, toLie: "Water" }, [0, 0, 0], [0, 0, 150], line, flat);
assert.equal(wet.flight, 1);
const putt = flightModel({ putt: true }, [0, 0, 0], [3, 0, 4], line, flat);
for (let k = 0; k <= 10; k++) near(at(putt, k / 10)[1], .09);
const still = flightModel({}, [5, 1, 5], [5, 1, 5], line, flat);
assert.deepEqual(at(still, .5), [5, 1, 5]);
console.log("flight model: ok");
