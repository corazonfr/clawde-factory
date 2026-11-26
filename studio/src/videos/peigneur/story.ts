// "The Lake That Went Down the Drain" (Lake Peigneur, Louisiana 1980): timeline, set positions and cameras, all timed
// to the narration (stories/lake-peigneur/voice/words.json). Same camera grammar as the earlier shorts: cuts on big
// jumps, smootherstep glides, every hold creeps in, impact kicks that flip sign every frame for 7 f.
export const FPS = 30;
export const TOTAL = 2115;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- word cues (seconds, from words.json) ----------------
export const W = {
  y1980: 0.2, rig: 1.54, drilled: 1.76, hole: 2.76, lake: 3.9, few: 4.56, later: 5.0, lake2: 5.68, gone: 6.08,
  peigneur: 7.18, louisiana: 7.94, ten: 9.05, deep: 9.46, fishing: 10.24, boats: 10.48, garden: 11.24, island: 11.5,
  far: 12.46, below: 12.7, mud: 13.12, salt: 13.9, mine: 14.12, miners: 14.8, november: 16.58, drill: 17.22, stuck: 17.66,
  rig2: 18.6, tilt: 19.28, water: 20.02, spin: 20.74, crew: 21.36, jumped: 21.58, ran: 22.32, rig3: 22.98, down: 23.42,
  barges: 24.5, trees: 25.5, most: 26.5, island2: 27.0, punched: 28.28, mine2: 29.28, whole: 30.12, followed: 30.52,
  down2: 31.04, luckily: 32.24, alive: 33.48, unluckily: 34.4, mine3: 35.08, lake3: 35.8, problem: 36.56, salt2: 37.04,
  imagine: 37.72, straw: 39.06, sugar: 39.72, sip: 40.98, wider: 42.32, next: 43.34, sip2: 43.52, bigger: 43.92,
  fresh: 44.68, ate: 45.3, salt3: 45.72, hole2: 46.44, grew: 46.68, rushed: 48.0, faster: 48.52, drained: 49.46,
  hard: 50.08, canal: 50.72, sea: 51.28, backwards: 51.78, days: 53.3, louisiana2: 53.88, tallest: 54.76,
  waterfall: 55.06, history: 56.08, days2: 56.52, nine: 57.71, barges2: 58.26, popped: 58.72, corks: 59.68,
  filled: 61.04, seawater: 61.62, salty: 62.86, two: 63.58, deep2: 64.32, drilled2: 65.5, oil: 66.06, found: 67.04,
  plug: 67.48, hole3: 67.66,
};

// ---------------- places (metres) ----------------
/** the lake: water surface y 0 when full, shore ring at r = LR (ground y = GY), the rig at the origin */
export const LR = 150, GY = 0.6, BED = 12;
export const PY = 2.2; // the rig platform's deck height
export const ISL: V3 = [-62, 0, -78];   // the garden island (Jefferson Island) at the lake edge
export const MINE: V3 = [1500, 0, 0];   // the salt mine (room and pillar, under the lake)
export const HEAD: V3 = [-1500, 0, 0];  // the mine shaft head on dry land
export const KIT: V3 = [0, 0, 1500];    // the kitchen (the sugar straw)
export const MCEIL = 7.5;               // mine ceiling height

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Set = "lake" | "mine" | "head" | "kitchen";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set };
const F = (s: number) => Math.round(s * FPS);
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: F(5.4), light: "day", set: "lake" },            // hook: an oil rig drilled a small hole in a lake
  { id: 2, a: F(5.4), b: F(6.85), light: "day", set: "lake" },      // the lake was gone
  { id: 3, a: F(6.85), b: F(12.3), light: "day", set: "lake" },     // Lake Peigneur: ten feet deep, boats, garden island
  { id: 4, a: F(12.3), b: F(15.7), light: "day", set: "mine" },     // far below the mud, a salt mine full of miners
  { id: 5, a: F(15.7), b: F(19.5), light: "day", set: "lake" },     // the drill got stuck; the rig began to tilt
  { id: 6, a: F(19.5), b: F(21.3), light: "day", set: "lake" },     // the water began to spin
  { id: 7, a: F(21.3), b: F(22.7), light: "day", set: "lake" },     // the crew jumped off and ran
  { id: 8, a: F(22.7), b: F(27.7), light: "day", set: "lake" },     // the rig, the barges, the trees, the island
  { id: 9, a: F(27.7), b: F(32.1), light: "day", set: "mine" },     // straight into the mine; the lake followed it down
  { id: 10, a: F(32.1), b: F(34.35), light: "day", set: "head" },   // luckily every miner got out alive
  { id: 11, a: F(34.35), b: F(36.4), light: "day", set: "mine" },   // unluckily the mine was now the lake
  { id: 12, a: F(36.4), b: F(44.4), light: "day", set: "kitchen" }, // the sugar straw
  { id: 13, a: F(44.4), b: F(49.2), light: "day", set: "lake" },    // the fresh water ate the salt, the hole grew
  { id: 14, a: F(49.2), b: F(53.7), light: "day", set: "lake" },    // the canal ran backwards
  { id: 15, a: F(53.7), b: F(56.5), light: "day", set: "lake" },    // the tallest waterfall in Louisiana's history
  { id: 16, a: F(56.5), b: F(60.4), light: "day", set: "lake" },    // nine barges popped back up like corks
  { id: 17, a: F(60.4), b: F(65.15), light: "golden", set: "lake" },// salty and two hundred feet deep
  { id: 18, a: F(65.15), b: TOTAL, light: "golden", set: "lake" },  // they drilled for oil; they found a plughole
];
export const XFADE: Record<number, number> = { 4: 8, 12: 8, 13: 8, 17: 12 };
export const FLASH_AT = F(6.85);

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state ----------------
const deg = Math.PI / 180;
/** the lake's water level (m, 0 = full) */
export const lvlAt = (id: number, t: number) => {
  if (id === 2) return -BED - 2;
  if (id === 8) return -0.3 - 5.5 * smooth((t - 22.7) / 5.0);
  if (id === 13) return -6 - 3 * smooth((t - 44.4) / 4.8);
  if (id === 14 || id === 15) return -BED - 2;
  return 0;
};
/** the whirlpool: radius at the surface (m) and spin (rad); 0 = none */
export const funnelAt = (id: number, t: number): { r: number; spin: number } => {
  if (id === 6) return { r: 2 + 14 * smooth((t - (W.water - 0.1)) / 1.4), spin: 1.2 * Math.max(0, t - W.water) ** 1.4 };
  if (id === 7) return { r: 17, spin: 2.0 * (t - 20) };
  if (id === 8) return { r: 18 + 22 * smooth((t - 22.7) / 5.0), spin: 2.2 * (t - 21) };
  if (id === 13) return { r: 24 + 4 * smooth((t - W.ate) / 0.8) + 6 * smooth((t - W.grew) / 0.8) + 8 * smooth((t - W.rushed) / 1.0), spin: 3.0 * (t - 43) };
  if (id === 18 && t > W.found - 0.6) return { r: 6 * smooth((t - (W.found - 0.6)) / 0.9), spin: 2.5 * (t - 66) };
  return { r: 0, spin: 0 };
};
/** the rig: tilt (rad, toward -x), sink (m), spin (rad), visible */
export const rigAt = (id: number, t: number): { tilt: number; sink: number; spin: number; on: boolean } => {
  if (id === 1 || id === 3) return { tilt: 0, sink: 0, spin: 0, on: true };
  if (id === 5) return { tilt: 9 * deg * smooth((t - (W.tilt - 0.1)) / 0.5), sink: 0, spin: 0, on: true };
  if (id === 6 || id === 7) return { tilt: 11 * deg + 2 * deg * Math.sin(t * 2), sink: 0.5 * Math.max(0, t - 20), spin: 0.2 * Math.max(0, t - 20.5), on: true };
  if (id === 8) {
    const u = clamp01((t - (W.down - 0.6)) / 1.3);
    return { tilt: 13 * deg + 40 * deg * u, sink: 2 + 44 * u ** 1.7, spin: 0.6 + 2.5 * u, on: t < 24.4 };
  }
  return { tilt: 0, sink: 0, spin: 0, on: false };
};
/** barges: start points on the lake; they spiral into the funnel in shot 8 and pop back up in shot 16 */
export const BARGES: V3[] = [[34, 0, -26], [48, 0, 4], [-38, 0, 18], [24, 0, 42], [-14, 0, -44]];
const BOB: V3[] = [[20, 0, 10], [-12, 0, 22], [4, 0, -14], [34, 0, 28], [-30, 0, -6]];
export const bargeAt = (id: number, t: number, i: number): { p: V3; yaw: number; tilt: number; on: boolean } => {
  const b = BARGES[i];
  if (id === 8) {
    const t0 = W.barges - 0.9 + i * 0.12, u = clamp01((t - t0) / 1.6);
    const a0 = Math.atan2(b[2], b[0]), r0 = Math.hypot(b[0], b[2]);
    const a = a0 + 2.4 * u, r = r0 * (1 - 0.92 * u);
    return { p: [r * Math.cos(a), lvlAt(8, t) - 26 * u ** 2.2, r * Math.sin(a)], yaw: -a + Math.PI / 2, tilt: 0.9 * u, on: t < 25.4 };
  }
  if (id === 16) {
    const t0 = W.popped - 0.4 + i * 0.18, k = t - t0;
    const y = k < 0 ? -6 : k < 0.35 ? -6 + 6.6 * (k / 0.35) : 0.6 * Math.exp(-3.2 * (k - 0.35)) * Math.cos(9 * (k - 0.35));
    return { p: [BOB[i][0], y, BOB[i][2]], yaw: 0.4 + i * 1.3, tilt: k > 0 ? 0.35 * Math.exp(-2.5 * k) * Math.sin(8 * k) : 0, on: true };
  }
  if (id === 17 || id === 18) return { p: [BOB[i][0], 0.03 * Math.sin(t + i), BOB[i][2]], yaw: 0.4 + i * 1.3, tilt: 0, on: true };
  if (id === 1 || id === 3 || id === 5 || id === 6 || id === 7) return { p: [b[0], 0, b[2]], yaw: 0.4 + i * 1.3, tilt: 0, on: true };
  return { p: b, yaw: 0, tilt: 0, on: false };
};
/** the mine's flood level (m above the mine floor; < 0 dry) */
export const mineWaterAt = (id: number, t: number) => (id === 9 ? 3.4 * smooth((t - 28.9) / 3.2) - 0.05 : id === 11 ? MCEIL + 2 : -1);
/** the canal: flow direction (+1 toward the sea = +x, -1 backwards into the lake) */
export const flowAt = (t: number) => 1 - 2 * smooth((t - (W.backwards - 0.8)) / 0.9);
/** the sugar straw: radius (m) and the glass's water level (0..1) */
export const strawAt = (t: number) => {
  const r = 0.009 + 0.006 * smooth((t - (W.sip + 0.1)) / 0.7) + 0.008 * smooth((t - (W.sip2 + 0.1)) / 0.6) + 0.004 * smooth((t - (W.wider - 0.2)) / 0.6);
  const lv = 0.85 - 0.12 * smooth((t - W.sip) / 0.8) - 0.3 * smooth((t - W.sip2) / 0.7);
  return { r, lv };
};

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
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

const fr = F;
// ---- framings ----
const S1a = (f: number) => dolly([30, 9, 46], [0, 11, 0], pushK(f, 0, 0.0022, 0.005, 30), { fov: 50, roll: 0.03 });
const S1b = (f: number) => dolly([8, 5.5, 15], [0, 3.6, 0], pushK(f, fr(2.6), 0.003, 0.008, 25), { fov: 46, roll: -0.035 });
const S2a = (f: number) => dolly([60, 40, 90], [0, -10, 0], pushK(f, fr(5.4), 0.003, 0.008, 25), { fov: 50, roll: 0.03 });
const S3a = (f: number) => dolly([120, 30, 150], [0, 2, -10], pushK(f, fr(6.85), 0.002, 0.004, 30), { fov: 50, roll: -0.03 });
const S3b = (f: number) => dolly([49, 3.6, 41], [39.2, 1.9, 28.9], pushK(f, fr(10.15), 0.003, 0.007, 25), { fov: 46, roll: 0.035 });
const S3c = (f: number) => dolly(add(ISL, [40, 9, 62]), add(ISL, [2, 6, 0]), pushK(f, fr(11.05), 0.0025, 0.006, 25), { fov: 48, roll: -0.03 });
const S4a = (f: number) => dolly(add(MINE, [2, 2.2, 13]), add(MINE, [0, 2.2, 0]), pushK(f, fr(12.3), 0.0025, 0.006, 30), { fov: 50, roll: 0.03 });
const S5a = (f: number) => dolly([6, PY + 2.4, 9.5], [0, PY + 1.8, 0], pushK(f, fr(15.7), 0.003, 0.009, 25), { fov: 46, roll: -0.035 });
const S5b = (f: number) => dolly([26, 6, 40], [0, 12, 0], pushK(f, fr(18.2), 0.0025, 0.007, 25), { fov: 48, roll: 0.04 });
const S6a = (f: number) => dolly([30, 40, 46], [0, 0, 0], pushK(f, fr(19.5), 0.003, 0.008, 25), { fov: 50, roll: -0.03 });
const S7a = (f: number) => dolly([7, GY + 2.2, LR + 15], [3, GY + 1.5, LR + 6], pushK(f, fr(21.3), 0.003, 0.008, 25), { fov: 48, roll: 0.035 });
const S8a = (f: number) => dolly([34, 12, 52], [0, 3, 0], pushK(f, fr(22.7), 0.0025, 0.007, 25), { fov: 50, roll: 0.03 });
const S8b = (f: number) => dolly([50, 70, 80], [10, -6, 6], pushK(f, fr(24.35), 0.003, 0.007, 25), { fov: 50, roll: -0.03 });
const S8c = (f: number) => dolly([-6, 10, 40], [-24, 0, -22], pushK(f, fr(25.3), 0.003, 0.008, 25), { fov: 48, roll: 0.035 });
const S8d = (f: number) => dolly([80, 60, 120], [-30, -4, -40], pushK(f, fr(26.3), 0.0025, 0.007, 25), { fov: 50, roll: -0.03 });
const S9a = (f: number) => dolly(add(MINE, [6, 2.4, 15]), add(MINE, [0, 4.0, -2]), pushK(f, fr(27.7), 0.0025, 0.007, 25), { fov: 52, roll: -0.03 });
const S10a = (f: number) => dolly(add(HEAD, [3, 2.4, 13]), add(HEAD, [0, 3.0, 0]), pushK(f, fr(32.1), 0.0025, 0.007, 25), { fov: 50, roll: 0.03 });
const S11a = (f: number) => dolly(add(MINE, [3, 3.2, 14]), add(MINE, [0, 3.4, 0]), pushK(f, fr(34.35), 0.003, 0.008, 25), { fov: 50, roll: -0.035 });
const S12a = (f: number) => dolly(add(KIT, [0.6, 1.25, 3.4]), add(KIT, [0, 1.1, 0]), pushK(f, fr(36.4), 0.0025, 0.006, 30), { fov: 46 });
const S12b = (f: number) => dolly(add(KIT, [0.5, 1.02, 1.35]), add(KIT, [0.08, 0.95, 0.0]), pushK(f, fr(39.0), 0.0022, 0.006, 25), { fov: 44, roll: 0.03 });
const S13a = (f: number) => dolly([22, 26, 40], [0, -8, 0], pushK(f, fr(44.4), 0.0028, 0.007, 25), { fov: 50, roll: 0.03 });
const S14a = (f: number) => dolly([LR + 34, GY + 6, 22], [LR + 4, GY, -2], pushK(f, fr(49.2), 0.0025, 0.007, 25), { fov: 48, roll: -0.03 });
const S15a = (f: number) => dolly([LR - 40, -6, 30], [LR - 4, -4, 0], pushK(f, fr(53.7), 0.0025, 0.007, 25), { fov: 50, roll: 0.035 });
const S16a = (f: number) => dolly([40, 8, 60], [6, 1, 10], pushK(f, fr(56.5), 0.0025, 0.007, 25), { fov: 50, roll: -0.03 });
const S17a = (f: number) => dolly([110, 26, 140], [0, 0, -10], pushK(f, fr(60.4), 0.002, 0.004, 30), { fov: 50, roll: 0.03 });
const S18a = (f: number) => dolly([6, GY + 1.9, LR + 9], [0, GY + 1.6, LR + 2], pushK(f, fr(65.15), 0.003, 0.008, 25), { fov: 46, roll: -0.035 });
const S18b = (f: number) => dolly([0.5, 90, 22], [0, 0, 0], pushK(f, fr(66.9), 0.004, 0.012, 25), { fov: 46, roll: 0.0 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: fr(2.6), cut: true, s: S1b }],
  2: [{ f: fr(5.4), s: S2a }],
  3: [{ f: fr(6.85), s: S3a }, { f: fr(10.15), cut: true, s: S3b }, { f: fr(11.05), cut: true, s: S3c }],
  4: [{ f: fr(12.3), s: S4a }],
  5: [{ f: fr(15.7), s: S5a }, { f: fr(18.2), cut: true, s: S5b }],
  6: [{ f: fr(19.5), s: S6a }],
  7: [{ f: fr(21.3), s: S7a }],
  8: [{ f: fr(22.7), s: S8a }, { f: fr(24.35), cut: true, s: S8b }, { f: fr(25.3), cut: true, s: S8c }, { f: fr(26.3), cut: true, s: S8d }],
  9: [{ f: fr(27.7), s: S9a }],
  10: [{ f: fr(32.1), s: S10a }],
  11: [{ f: fr(34.35), s: S11a }],
  12: [{ f: fr(36.4), s: S12a }, { f: fr(39.0), cut: true, s: S12b }],
  13: [{ f: fr(44.4), s: S13a }],
  14: [{ f: fr(49.2), s: S14a }],
  15: [{ f: fr(53.7), s: S15a }],
  16: [{ f: fr(56.5), s: S16a }],
  17: [{ f: fr(60.4), s: S17a }],
  18: [{ f: fr(65.15), s: S18a }, { f: fr(66.9), cut: true, s: S18b }],
};

/** impact kicks */
const KICKS: [number, number][] = [[W.later + 0.4, 0.6], [W.stuck, 0.7], [W.tilt, 0.5], [W.down, 0.6], [W.barges, 0.4], [W.island2, 0.5],
  [W.punched, 0.7], [W.alive, 0.4], [W.unluckily, 0.4], [W.backwards, 0.5], [W.waterfall, 0.5], [W.popped, 0.5], [W.plug, 0.4]];
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
  { f: fr(2.6), cInf: 10, focus: () => [0, 3.6, 0] },
  { f: fr(5.4), cInf: 0 },
  { f: fr(10.15), cInf: 11, focus: () => [39.5, 1.6, 28.7] },
  { f: fr(11.05), cInf: 0 },
  { f: fr(12.3), cInf: 9, focus: () => add(MINE, [0, 1.8, 2]) },
  { f: fr(15.7), cInf: 12, focus: () => [0, PY + 1.6, 1.5] },
  { f: fr(18.2), cInf: 0 },
  { f: fr(21.3), cInf: 9, focus: () => [3, GY + 1.4, LR + 6] },
  { f: fr(22.7), cInf: 0 },
  { f: fr(27.7), cInf: 7, focus: () => add(MINE, [0, 3, 0]) },
  { f: fr(32.1), cInf: 10, focus: () => add(HEAD, [0, 1.6, 2]) },
  { f: fr(34.35), cInf: 0 },
  { f: fr(36.4), cInf: 10, focus: () => add(KIT, [0, 1.1, 0.2]) },
  { f: fr(39.0), cInf: 12, focus: () => add(KIT, [0.08, 0.95, 0.0]) },
  { f: fr(44.4), cInf: 0 },
  { f: fr(65.15), cInf: 12, focus: () => [0, GY + 1.6, LR + 2] },
  { f: fr(66.9), cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
