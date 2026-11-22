// "The Skyscraper That Melted a Car": timeline, tower shape, set positions and cameras, all timed to the narration
// (stories/walkie-scorchie/voice/words.json). Same camera grammar as the bridge / Pisa shorts: cuts on big jumps,
// smootherstep glides of 18-40 f, every hold creeps in, impact kicks that flip sign every frame for 7 f.
export const FPS = 30;
export const TOTAL = 2115;
export const D0 = 0; // ground level (build.ts houses stand on D0)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- word cues (seconds, from words.json) ----------------
export const W = {
  y2013: 0.18, melted0: 2.16, without: 3.19, london: 4.14, shiny: 5.24, thirtySeven: 6.76, floors: 7.2, nicknamed: 8.07,
  walkie: 8.72, sunny: 10.2, parked: 11.48, jaguar: 12.0, below: 12.94, hour: 13.76, mirror: 14.68, melted: 15.06,
  badge: 16.5, doormat: 17.66, scorched: 18.18, paving: 19.01, cracked: 19.72, reporter: 20.9, pan: 21.92, fried: 22.44,
  egg: 22.8, ate: 24.18, lunch: 24.86, hitting: 26.0, ninety: 26.56, degrees: 26.9, celsius: 27.74, newspapers: 28.52,
  scorchie: 29.8, luckily: 30.98, shines: 32.54, londonB: 33.52, unluckily: 34.24, sunniest: 35.5, years: 36.34,
  flat: 37.18, bounces: 37.7, back: 38.84, curves: 40.16, spoon: 41.98, sends: 43.64, spot: 45.56, six: 46.46,
  brighter: 47.0, sun: 47.66, paid: 48.62, pounds: 50.12, fix: 50.74, car: 51.1, bolted: 51.86, sunshades: 52.9,
  front: 54.04, original: 54.84, design: 55.14, hadShades: 55.74, cut: 56.86, money: 57.6, architect: 58.12,
  knew: 58.9, reflect: 59.26, hot: 61.48, odd: 62.37, earlier: 63.26, vegas: 64.46, scorching: 65.52, sunbathers: 65.92,
  pool: 66.84, mistake: 67.92, sequel: 68.78,
};

// ---------------- the tower ----------------
// 37 floors, ~155 m. Plan: x from -halfW(v) to +halfW(v); the south face (toward the street, +z) leans out as it rises
// and is concave both ways (z(v) grows with v^2, and the middle of each floor sits CK back from its corners).
export const TH = 155, FLOORS = 37;
export const halfW = (v: number) => 21 + 3 * v;
export const frontZ = (u: number, v: number) => -16 + 13 * v * v - 3.2 * (1 - u * u);
export const backZ = (v: number) => -42 - 6 * v * v;
/** a point on the south face: u -1..1 across, v 0..1 up */
export const facePt = (u: number, v: number): V3 => [u * halfW(v), v * TH, frontZ(u, v)];
/** the focus on the street where the reflected light lands */
export const SPOT: V3 = [5, 0, 5.2];
export const SPOT_V: V3 = [-600 + 1, 0, -3]; // Las Vegas pool deck hot spot

// ---------------- places ----------------
export const PARK_X = 600, VEGAS_X = -600;
export const CAR: V3 = [3.2, 0, 3.4];             // parked along the south kerb, nose to +x
export const MIRROR: V3 = [CAR[0] + 0.95, 1.02, CAR[2] + 1.02]; // near-side wing mirror
export const BADGE: V3 = [CAR[0] + 2.47, 0.74, CAR[2]];         // badge on the nose
export const SHOP: V3 = [12, 0, 9.05];           // shop door in the south row (facade at z = 9.05)
export const MAT: V3 = [12, 0.04, 8.45];        // doormat
export const CRACK: V3 = [6.4, 0.04, 6.9];
export const REPORTER: V3 = [7.2, 0, 6.5];
export const LAMP: V3 = [9.6, 0, 5.55];
export const PAPER: V3 = [2.0, 0.04, 6.8];
export const ARCHI: V3 = [-6, 0, -8.6];
export const TABLE: V3 = [20, 0, -9.4];
export const KIDP: V3 = [PARK_X, 0, 0];
export const S_PAVE = [5, 9.05] as const, N_PAVE = [-9.05, -5] as const; // pavement strips (z)

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Set = "street" | "park" | "vegas";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set };
const F = (s: number) => Math.round(s * FPS);
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: F(4.05), light: "day", set: "street" },        // hook: a skyscraper melted a car
  { id: 2, a: F(4.05), b: F(9.75), light: "day", set: "street" },   // London, the shiny new skyscraper
  { id: 3, a: F(9.75), b: F(17.15), light: "day", set: "street" },  // the Jaguar, the mirror, the badge
  { id: 4, a: F(17.15), b: F(20.5), light: "day", set: "street" },  // doormat, paving
  { id: 5, a: F(20.5), b: F(25.4), light: "day", set: "street" },   // the reporter's egg
  { id: 6, a: F(25.4), b: F(28.3), light: "day", set: "street" },   // ninety degrees
  { id: 7, a: F(28.3), b: F(30.9), light: "day", set: "street" },   // the newspapers: Walkie-Scorchie
  { id: 8, a: F(30.9), b: F(36.9), light: "day", set: "street" },   // luckily London / unluckily sunniest
  { id: 9, a: F(36.9), b: F(39.3), light: "day", set: "street" },   // a flat window
  { id: 10, a: F(39.3), b: F(40.9), light: "day", set: "street" },  // this front curves inward
  { id: 11, a: F(40.9), b: F(43.55), light: "day", set: "park" },   // like the inside of a spoon
  { id: 12, a: F(43.55), b: F(48.2), light: "day", set: "street" }, // all to one spot, six times brighter
  { id: 13, a: F(48.2), b: F(51.3), light: "day", set: "street" },  // 946 pounds
  { id: 14, a: F(51.3), b: F(54.65), light: "day", set: "street" }, // sunshades bolted on
  { id: 15, a: F(54.65), b: F(57.9), light: "day", set: "street" }, // the original design had them
  { id: 16, a: F(57.9), b: F(62.3), light: "day", set: "street" },  // the architect
  { id: 17, a: F(62.3), b: F(67.15), light: "day", set: "vegas" },  // Las Vegas, three years earlier
  { id: 18, a: F(67.15), b: TOTAL, light: "golden", set: "street" }, // a sequel
];
export const XFADE: Record<number, number> = { 11: 8, 12: 8, 17: 10, 18: 10 };
export const FLASH_AT = F(4.05);

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state ----------------
/** overcast amount (shot 8: the clouds roll in on "this is London", part on "unluckily") */
export const gloomAt = (id: number, t: number) => (id === 8 ? smooth((t - 31.7) / 1.4) * (1 - smooth((t - (W.unluckily - 0.1)) / 0.9)) : 0);
/** brightness of the hot spot on the street, 0..~6 (multiplies its HDR colour) */
export const spotAt = (id: number, t: number) => {
  switch (id) {
    case 1: return 1.0;
    case 3: return t > W.hour - 0.4 ? 1.0 : 0;
    case 4: case 5: case 6: case 7: return 0.9;
    case 8: return 0 + (t > W.sunniest - 0.1 ? 0.6 * (1 - smooth((t - W.sunniest) / 0.6)) : 0);
    case 12: return 0.7 + 0.6 * smooth((t - (W.spot - 0.6)) / 0.6) + 0.9 * smooth((t - W.six) / 1.2);
    case 13: return 0.6;
    case 17: return t > W.scorching - 0.6 ? 2.2 : 1.2;
    default: return 0;
  }
};
/** how much of the sunshade (fins, floor 3 to 34) is on: 0..1, bottom to top */
export const finsAt = (id: number, t: number) => (id === 14 ? smooth((t - (W.bolted + 0.1)) / 2.3) : id >= 16 && id !== 17 ? 1 : 0);
/** shots that show the reflected light rays: fan = converging on the spot, flat = the flat window */
export const raysAt = (id: number, t: number): { fan: number; flat: number } => ({
  fan: id === 1 ? (t < 2.0 ? 0.2 : t > 3.05 ? 0.14 : 0) : id === 7 ? 0.22 : id === 10 ? 0.5 * smooth((t - (W.curves - 0.2)) / 0.5) : id === 12 ? (0.55 + 0.45 * smooth((t - (W.spot - 0.8)) / 0.8)) * (1 - smooth((t - 46.1) / 0.8)) : 0,
  flat: id === 9 ? 0.55 * smooth((t - (W.flat - 0.1)) / 0.4) : 0,
});

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });

const fr = F;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
// ---- framings ----
const S1a = (f: number) => zoom([-9, 1.4, 8.2], [0, 40, -10], 60, pushK(f, 0, 0.003), { roll: 0.035 });
const S1b = (f: number) => dolly([6.7, 1.45, 6.5], [4.3, 0.95, 4.1], pushK(f, fr(2.05), 0.004, 0.008, 25), { fov: 38, roll: -0.03 });
const S1c = (f: number) => zoom([17, 2.2, 8.3], [-2, 22, -8], 54, pushK(f, fr(3.1), 0.0025));
const S2a = (f: number) => zoom([-62, 1.8, 8.2], [0, 22, -8], 56, pushK(f, fr(4.05), 0.002));
const S2b0 = (f: number) => zoom([12, 1.8, 7.2], [1, 18, -14], 52, pushK(f, fr(6.6), 0.002));
const S2b1 = (f: number) => zoom([12, 1.8, 7.2], [0, 118, -6], 56, pushK(f, fr(6.6), 0.002));
const S2c = (f: number) => dolly([-1.8, 1.0, -3.6], [-2.1, 3.0, -12.5], pushK(f, fr(7.95), 0.0025, 0.005, 30), { fov: 62, roll: 0.03 });
const S3a = (f: number) => dolly([10.2, 1.75, 8.4], [4.6, 1.0, 4.4], pushK(f, fr(9.75), 0.0018), { fov: 42 });
const S3b = (f: number) => dolly([10.6, 2.1, 8.6], [4.2, 1.2, 4.2], pushK(f, fr(13.45), 0.003), { fov: 44, roll: 0.03 });
const S3c = (f: number) => dolly([6.4, 1.4, 6.2], [MIRROR[0] + 0.2, MIRROR[1] - 0.1, MIRROR[2] - 0.2], pushK(f, fr(14.35), 0.0025, 0.006, 30), { fov: 28 });
const S3d = (f: number) => dolly([8.0, 0.95, 4.1], [BADGE[0], BADGE[1] - 0.04, BADGE[2]], pushK(f, fr(15.65), 0.0025, 0.006, 30), { fov: 30, roll: -0.035 });
const S4a = (f: number) => dolly([11.5, 1.95, 5.0], [12.4, 0.5, 8.4], pushK(f, fr(17.15), 0.0025, 0.005, 30), { fov: 42 });
const S4b = (f: number) => dolly([6.7, 1.35, 8.6], [CRACK[0], 0.05, CRACK[2]], pushK(f, fr(18.95), 0.0025, 0.006, 25), { fov: 40, roll: 0.03 });
const S5a = (f: number) => dolly([8.0, 1.3, 8.75], [7.15, 0.55, 6.4], pushK(f, fr(20.5), 0.002), { fov: 42 });
const S5b = (f: number) => dolly([7.55, 0.98, 8.1], [7.2, 0.8, 6.5], pushK(f, fr(23.85), 0.0028, 0.006, 25), { fov: 34, roll: -0.03 });
const S6a = (f: number) => dolly([10.0, 1.75, 8.3], [LAMP[0], 1.75, LAMP[2] + 0.1], pushK(f, fr(25.4), 0.0022, 0.007, 30), { fov: 40 });
const S7a = (f: number) => dolly([2.5, 1.7, 8.6], [PAPER[0], 0.05, PAPER[2]], pushK(f, fr(28.3), 0.0025), { fov: 40, roll: 0.02 });
const S7b = (f: number) => zoom([-14, 1.6, 7.6], [0, 58, -12], 58, pushK(f, fr(29.65), 0.003, 0.006, 25), { roll: -0.035 });
const S8a = (f: number) => zoom([-58, 1.6, 7.0], [-40, 4.6, 4.4], 46, pushK(f, fr(30.9), 0.0016));
const S8b = (f: number) => zoom([-58, 1.6, 7.0], [-40, 4.4, 4.4], 44, pushK(f, fr(34.15), 0.0022, 0.006, 30), { roll: 0.03 });
const S9a = (f: number) => dolly([60, 2.0, 6.5], [40, 9, -7.5], pushK(f, fr(36.9), 0.002), { fov: 46 });
const S10a = (f: number) => zoom([78, 42, 10], [0, 72, -12], 46, pushK(f, fr(39.3), 0.002));
const S11a = (f: number) => dolly([KIDP[0] + 0.35, 1.0, 3.1], [KIDP[0], 0.9, 0], pushK(f, fr(40.9), 0.0025, 0.005, 30), { fov: 36 });
const S12a = (f: number) => zoom([74, 48, 64], [0, 26, -6], 48, pushK(f, fr(43.55), 0.0016));
const S12b = (f: number) => dolly([19, 10, 23], [SPOT[0], 0.3, SPOT[2]], pushK(f, fr(46.1), 0.0025, 0.006, 40), { fov: 44, roll: 0.03 });
const S13a = (f: number) => dolly([1.0, 1.55, 7.3], [6.4, 1.15, 6.5], pushK(f, fr(48.2), 0.002), { fov: 40 });
const S14a = (f: number) => zoom([-38, 6, 8], [0, 66, -14], 54, pushK(f, fr(51.3), 0.0018));
const S15a = (f: number) => dolly([TABLE[0] + 0.2, 2.7, TABLE[2] + 1.3], [TABLE[0], 0.93, TABLE[2]], pushK(f, fr(54.65), 0.0025, 0.005, 30), { fov: 46 });
const S16a = (f: number) => dolly([ARCHI[0] + 0.6, 0.9, ARCHI[2] + 4.6], [ARCHI[0], 5.2, ARCHI[2] - 6], pushK(f, fr(57.9), 0.0015), { fov: 64 });
const S16b = (f: number) => dolly([ARCHI[0] + 0.35, 1.55, ARCHI[2] + 2.6], [ARCHI[0], 1.55, ARCHI[2]], pushK(f, fr(60.9), 0.003, 0.006, 30), { fov: 38, roll: 0.035 });
const S17a = (f: number) => zoom([VEGAS_X + 24, 3.5, 140], [VEGAS_X, 30, -40], 54, pushK(f, fr(62.3), 0.002));
const S17b = (f: number) => dolly([VEGAS_X + 0.3, 2.0, 8.5], [VEGAS_X, 0.9, -3], pushK(f, fr(65.35), 0.0025, 0.006, 30), { fov: 50, roll: -0.03 });
const S17c = (f: number) => zoom([VEGAS_X - 30, 3.5, 120], [VEGAS_X, 30, -40], 52, pushK(f, fr(66.6), 0.002));
const S18a = (f: number) => zoom([-62, 1.8, 8.2], [0, 26, -8], 54, pushK(f, fr(67.15), 0.0022, 0.005, 40));

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: fr(2.05), cut: true, s: S1b }, { f: fr(3.1), cut: true, s: S1c }],
  2: [{ f: fr(4.05), s: S2a }, { f: fr(6.6), cut: true, s: S2b0 }, { f: fr(6.72), dur: 36, s: S2b1 }, { f: fr(7.95), cut: true, s: S2c }],
  3: [{ f: fr(9.75), s: S3a }, { f: fr(13.45), cut: true, s: S3b }, { f: fr(14.35), cut: true, s: S3c }, { f: fr(15.65), cut: true, s: S3d }],
  4: [{ f: fr(17.15), s: S4a }, { f: fr(18.95), cut: true, s: S4b }],
  5: [{ f: fr(20.5), s: S5a }, { f: fr(23.85), cut: true, s: S5b }],
  6: [{ f: fr(25.4), s: S6a }],
  7: [{ f: fr(28.3), s: S7a }, { f: fr(29.65), cut: true, s: S7b }],
  8: [{ f: fr(30.9), s: S8a }, { f: fr(34.15), dur: 22, s: S8b }],
  9: [{ f: fr(36.9), s: S9a }],
  10: [{ f: fr(39.3), s: S10a }],
  11: [{ f: fr(40.9), s: S11a }],
  12: [{ f: fr(43.55), s: S12a }, { f: fr(46.1), dur: 36, s: S12b }],
  13: [{ f: fr(48.2), s: S13a }],
  14: [{ f: fr(51.3), s: S14a }],
  15: [{ f: fr(54.65), s: S15a }],
  16: [{ f: fr(57.9), s: S16a }, { f: fr(60.9), dur: 22, s: S16b }],
  17: [{ f: fr(62.3), s: S17a }, { f: fr(65.35), cut: true, s: S17b }, { f: fr(66.6), cut: true, s: S17c }],
  18: [{ f: fr(67.15), s: S18a }],
};
void add;

/** impact kicks */
const KICKS: [number, number][] = [[W.melted0, 0.6], [W.melted, 1.0], [W.cracked, 0.5], [W.sunniest, 1.0], [W.sun, 0.8], [W.cut, 0.5], [W.scorching, 1.0], [W.sequel, 0.6]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0 + 2 / FPS) * FPS + 1e-6); // lands 2 f before the word
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
const T = (f: number) => f / FPS;
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: fr(2.05), cInf: 13, focus: () => MIRROR },
  { f: fr(3.1), cInf: 0 },
  { f: fr(7.95), cInf: 9, focus: () => [-2.4, 1.6, -8.8] },
  { f: fr(9.75), cInf: 7, focus: () => [4.4, 1.0, 4.4] },
  { f: fr(14.35), cInf: 14, focus: () => MIRROR },
  { f: fr(15.65), cInf: 14, focus: () => BADGE },
  { f: fr(17.15), cInf: 11, focus: () => [12.4, 0.9, 8.5] },
  { f: fr(18.95), cInf: 12, focus: () => CRACK },
  { f: fr(20.5), cInf: 11, focus: () => [7.2, 0.6, 6.5] },
  { f: fr(23.85), cInf: 13, focus: () => [7.2, 0.8, 6.5] },
  { f: fr(25.4), cInf: 12, focus: () => [LAMP[0], 1.8, LAMP[2] + 0.1] },
  { f: fr(28.3), cInf: 10, focus: () => PAPER },
  { f: fr(29.65), cInf: 0 },
  { f: fr(30.9), cInf: 6, focus: () => [-42, 1.6, 6.6] },
  { f: fr(36.9), cInf: 0 },
  { f: fr(40.9), cInf: 13, focus: () => [KIDP[0], 0.95, KIDP[2]] },
  { f: fr(43.55), cInf: 0 },
  { f: fr(48.2), cInf: 11, focus: () => [5.9, 1.4, 6.6] },
  { f: fr(51.3), cInf: 0 },
  { f: fr(54.65), cInf: 10, focus: () => [TABLE[0], 0.95, TABLE[2]] },
  { f: fr(57.9), cInf: 10, focus: () => [ARCHI[0], 1.6, ARCHI[2]] },
  { f: fr(60.9), cInf: 13, focus: () => [ARCHI[0], 1.6, ARCHI[2]] },
  { f: fr(62.3), cInf: 0 },
  { f: fr(65.35), cInf: 8, focus: () => [VEGAS_X, 0.9, -2.2] },
  { f: fr(66.6), cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
