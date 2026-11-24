// "The Jet That Ran Out of Fuel" (Air Canada 143, the Gimli Glider, 23 July 1983): timeline, set positions, the jet's
// flight path and cameras, all timed to the narration (stories/gimli-glider/voice/words.json). Same camera grammar as the
// bridge / Pisa / Walkie / whale shorts: cuts on big jumps, smootherstep glides, every hold creeps in, impact kicks that
// flip sign every frame for 7 f.
export const FPS = 30;
export const TOTAL = 2115;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- word cues (seconds, from words.json) ----------------
export const W = {
  fuel: 2.76, feet: 4.12, because: 4.59, maths: 5.0, metric: 7.34, boeing: 8.46, measured: 9.64, kilograms: 10.64,
  gauge: 11.68, broken: 12.1, hand: 13.48, but: 13.86, pounds: 14.74, needed: 15.53, kilos: 17.16, loaded: 17.99,
  poundsB: 19.46, less: 20.12, half: 20.56, over: 21.12, warning: 22.16, beeped: 22.42, left: 23.16, stopped: 23.6,
  right: 24.54, one: 24.7, most: 25.22, screens: 25.94, dark: 26.64, sixtyNine: 27.23, glider: 29.32, luckily: 30.08,
  captain: 30.66, gliders: 31.2, fun: 31.76, unluckily: 32.06, winnipeg: 33.32, closest: 34.04, runway: 34.32,
  airForce: 35.3, gimli: 36.38, manitoba: 36.72, part: 37.7, race: 38.52, track: 38.7, that: 39.52, raceB: 40.42,
  on: 40.58, mix: 41.64, pound: 42.46, half2: 43.22, kilo: 43.56, recipe: 44.6, kilos2: 45.54, flour: 46.08,
  weigh: 46.88, pounds2: 47.38, same: 48.03, less2: 48.89, cake: 49.58, jet: 50.4, high: 51.24, sideways: 52.84,
  skier: 53.8, braking: 54.18, dropped: 54.88, nose: 55.64, folded: 56.08, slid: 57.18, stop: 57.74, noseB: 58.3,
  nobody: 58.97, hurt: 59.76, why: 60.36, officer: 61.68, served: 62.18, base: 62.72, before: 63.22, jetB: 64.04,
  patched: 64.88, flew: 65.62, years: 66.7, nickname: 67.76, gimliC: 68.44, gliderB: 68.76,
};

// ---------------- places (metres; each set far from the others) ----------------
/** the jet in cruise (group origin = ground point under the main gear; fuselage centre 2.7 m above it) */
export const AJ: V3 = [0, 300, 0];
/** cockpit interior (floor), nose toward +x; captain in the left seat (-z) */
export const CK: V3 = [1500, 300, 0];
export const CAPT: V3 = [CK[0] - 1.5, CK[1] + 0.42, CK[2] - 0.4];
export const FO: V3 = [CK[0] - 1.5, CK[1] + 0.42, CK[2] + 0.4];
/** the gate at Montreal: the jet parked nose +x, terminal toward -z, the fuel truck at the right wing (+z) */
export const G: V3 = [600, 0, 0];
export const TRUCK: V3 = [G[0] + 2, 0, 13];
export const PANEL: V3 = [G[0] + 8, 0, 11];
export const WK1: V3 = [G[0] + 9.3, 0, 12.4];
export const WK2: V3 = [G[0] + 7.4, 0, 13.6];
export const TANKA: V3 = [G[0] + 14, 0, 22];
export const TANKB: V3 = [G[0] + 17.6, 0, 22];
/** Gimli: the old air base. Runway along x through (GM), the drag-racing strip on its east part, crowd at +z */
export const GM: V3 = [-700, 0, 0];
export const STOP_X = GM[0] - 140;   // where the jet comes to rest (group origin)
export const CROWD_Z = 30;
export const HANGAR: V3 = [GM[0] - 170, 0, -62];
/** the kitchen for the analogy */
export const K: V3 = [-1500, 0, 0];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Set = "air" | "cockpit" | "gate" | "gimli" | "kitchen";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set };
const F = (s: number) => Math.round(s * FPS);
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: F(4.55), light: "day", set: "air" },             // hook: out of fuel at 41,000 ft
  { id: 2, a: F(4.55), b: F(9.5), light: "day", set: "gate" },       // a maths mistake; the new metric 767
  { id: 3, a: F(9.5), b: F(15.4), light: "day", set: "gate" },       // kilograms; broken gauge; by hand; pounds
  { id: 4, a: F(15.4), b: F(21.0), light: "day", set: "gate" },      // needed vs loaded: less than half
  { id: 5, a: F(21.0), b: F(22.9), light: "day", set: "cockpit" },   // a warning beeped
  { id: 6, a: F(22.9), b: F(24.95), light: "day", set: "air" },      // left engine stopped, then the right
  { id: 7, a: F(24.95), b: F(27.1), light: "day", set: "cockpit" },  // the screens go dark
  { id: 8, a: F(27.1), b: F(29.95), light: "day", set: "air" },      // 69 people in a very heavy glider
  { id: 9, a: F(29.95), b: F(33.75), light: "day", set: "cockpit" }, // luckily a glider pilot / unluckily no Winnipeg
  { id: 10, a: F(33.75), b: F(41.2), light: "day", set: "gimli" },   // Gimli: a race track, a race on
  { id: 11, a: F(41.2), b: F(50.0), light: "day", set: "kitchen" },  // the analogy: kilos and pounds of flour
  { id: 12, a: F(50.0), b: F(60.25), light: "day", set: "gimli" },   // too high, sideways, dropped, nose down, safe
  { id: 13, a: F(60.25), b: F(63.85), light: "golden", set: "gimli" }, // flashback: the first officer at the base
  { id: 14, a: F(63.85), b: F(65.55), light: "day", set: "gimli" },  // patched up
  { id: 15, a: F(65.55), b: TOTAL, light: "golden", set: "air" },    // flew 25 more years: the Gimli Glider
];
export const XFADE: Record<number, number> = { 10: 8, 11: 8, 12: 8, 13: 10, 14: 8, 15: 10 };
export const FLASH_AT = F(4.55);

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state ----------------
export const gloomAt = (_id: number, _t: number) => 0;
/** engines running 1 .. stopped 0 (left = -z, right = +z) */
export const engL = (t: number) => (t < W.stopped - 0.05 ? 1 : 0);
export const engR = (t: number) => (t < W.one - 0.05 ? 1 : 0);
/** cockpit screens lit 1 .. dark 0 */
export const screensAt = (t: number) => (t < W.dark - 0.05 ? 1 : 0);
/** tank fills (0..1): A = what was needed, B = what was loaded */
export const tankA = (t: number) => smooth((t - 15.6) / 1.6);
export const tankB = (t: number) => 0.45 * smooth((t - 18.05) / 1.5);

export type JetPose = { pos: V3; yaw: number; pitch: number; roll: number; gear: number; nose: number; visible: boolean };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** the jet per shot: in the air (cruise / glide), at the gate, landing at Gimli, at rest nose-down */
export const jetAt = (id: number, t: number): JetPose => {
  const s = SHOTS[id - 1];
  if (s.set === "air") {
    const bob = 0.25 * Math.sin(t * 1.3);
    const glide = id === 8 ? -0.06 : id === 6 ? -0.02 : 0;
    return { pos: [AJ[0], AJ[1] + bob, AJ[2]], yaw: 0, pitch: glide, roll: 0.02 * Math.sin(t * 0.7), gear: 0, nose: 1, visible: true };
  }
  if (s.set === "gate") return { pos: [G[0], 0, G[2]], yaw: 0, pitch: 0, roll: 0, gear: 1, nose: 1, visible: true };
  if (s.set === "gimli") {
    if (id === 13 || id === 10) return { pos: [0, -50, 0], yaw: 0, pitch: 0, roll: 0, gear: 1, nose: 1, visible: false };
    if (id === 14) return { pos: [STOP_X, 0, 0], yaw: 0.03, pitch: 0, roll: 0, gear: 1, nose: 0, visible: true };
    // landing: approach along +x at ~45 m/s, too high; forward slip (banked, yawed) 51.6-54.6, drop, touchdown 55.5,
    // nose gear folds at "folded", slides to a stop by "nose"
    const x0 = GM[0] - 450, vx = 45.1, td = 55.5, stopT = 58.3;
    let x: number, y: number;
    if (t < td) {
      x = x0 + vx * (t - 50);
      y = t < 54.6 ? lerp(34, 20, (t - 50) / 4.6) : 20 * (1 - smooth((t - 54.6) / 0.9) ** 0.8);
    } else {
      const u = Math.min(t, stopT) - td, T = stopT - td;
      x = x0 + vx * (td - 50) + vx * (u - (u * u) / (2 * T));
      y = 0;
    }
    const slip = smooth((t - 51.7) / 0.8) * (1 - smooth((t - 54.4) / 0.7));
    const flare = t < td ? 0.05 * smooth((t - 54.8) / 0.6) : 0;
    const nose = t < W.folded - 0.08 ? 1 : 1 - smooth((t - (W.folded - 0.08)) / 0.25);
    return { pos: [x, y, 0], yaw: -0.3 * slip, pitch: flare - 0.03, roll: 0.42 * slip, gear: 1, nose, visible: true };
  }
  return { pos: [0, -50, 0], yaw: 0, pitch: 0, roll: 0, gear: 1, nose: 1, visible: false };
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
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
const o = (b: V3, x: number, y: number, z: number): V3 => [b[0] + x, b[1] + y, b[2] + z];
const T_ = (f: number) => f / FPS;
const jp = (id: number, f: number) => jetAt(id, T_(f)).pos;

// ---- framings ----
const S1a = (f: number) => dolly(o(AJ, 62, 12, 64), o(AJ, -1, 3, 0), pushK(f, 0, 0.0025), { fov: 40, roll: 0.03 });
const S1b = (f: number) => dolly(o(AJ, 15, 2.2, 13.5), o(AJ, 4, 1.4, 6.2), pushK(f, fr(2.7), 0.003, 0.008, 25), { fov: 38, roll: -0.035 });
const S2a = (f: number) => dolly(o(WK1, -1.2, 1.6, 3.6), o(WK1, -0.3, 1.5, 0), pushK(f, fr(4.55), 0.003, 0.007, 25), { fov: 40, roll: 0.03 });
const S2b = (f: number) => zoom(o(G, 46, 3, 48), o(G, -1, 4.5, 0), 42, pushK(f, fr(5.8), 0.0018, 0.004, 30));
const S3a = (f: number) => dolly(o(G, -4.5, 1.6, 15.5), o(G, -2.0, 1.4, 10.5), pushK(f, fr(9.5), 0.0025, 0.006, 25), { fov: 44 });
const S3b = (f: number) => dolly(o(PANEL, 0.25, 1.45, 1.9), o(PANEL, 0, 1.3, 0), pushK(f, fr(11.1), 0.003, 0.008, 25), { fov: 38, roll: -0.03 });
const S3c = (f: number) => dolly(o(WK1, 0.6, 1.6, 3.4), o(WK1, -0.2, 1.45, 0), pushK(f, fr(12.95), 0.0028, 0.006, 25), { fov: 40 });
const S3d = (f: number) => dolly(o(WK1, -0.6, 1.7, 6.2), o(WK1, -1.0, 1.4, 0.4), pushK(f, fr(13.8), 0.0025, 0.006, 25), { fov: 42, roll: 0.03 });
const S4a = (f: number) => dolly(o(TANKA, 1.8, 2.3, 15), o(TANKA, 1.8, 2.1, 0), pushK(f, fr(15.4), 0.0018, 0.005, 30), { fov: 44 });
const S5a = (f: number) => dolly(o(CK, 0.4, 1.45, 0), o(CK, -1.5, 1.15, 0), pushK(f, fr(21.0), 0.0025, 0.006, 25), { fov: 62, roll: 0.02 });
const S6a = (f: number) => dolly(o(AJ, -24, -5, 24), o(AJ, 2, 1.4, 0), pushK(f, fr(22.9), 0.002, 0.006, 25), { fov: 40, roll: -0.03 });
const S7a = (f: number) => dolly(o(CK, -0.75, 1.35, -0.1), o(CK, 0.5, 1.05, 0), pushK(f, fr(24.95), 0.0025, 0.006, 25), { fov: 52, roll: 0.025 });
const S8a = (f: number) => zoom(o(AJ, 12, 9, 80), o(AJ, -1, 2.5, 0), 40, pushK(f, fr(27.1), 0.002, 0.004, 30));
const S9a = (f: number) => dolly(o(CAPT, 1.25, 0.95, 0.05), o(CAPT, 0, 0.82, 0), pushK(f, fr(29.95), 0.0025, 0.006, 25), { fov: 50, roll: 0.03 });
const S9b = (f: number) => dolly(o(FO, 1.25, 0.95, -0.05), o(FO, 0, 0.82, 0), pushK(f, fr(32.0), 0.003, 0.007, 25), { fov: 50, roll: -0.03 });
const S10a = (f: number) => zoom(o(GM, -250, 55, 120), o(GM, -90, 0, 0), 42, pushK(f, fr(33.75), 0.0018, 0.004, 30), { roll: 0.02 });
const S10b = (f: number) => dolly(o(GM, -12, 1.4, -7), o(GM, 8, 1.1, 3), pushK(f, fr(37.6), 0.0022, 0.005, 25), { fov: 46 });
const S10c = (f: number) => dolly(o(GM, 44, 0.9, 7.5), o(GM, 0, 1.0, 0), pushK(f, fr(39.3), 0.0025, 0.007, 25), { fov: 44, roll: -0.035 });
const S11a = (f: number) => dolly(o(K, 0, 1.3, 2.3), o(K, 0, 1.15, 0), pushK(f, fr(41.2), 0.0022, 0.006, 25), { fov: 40 });
const S11b = (f: number) => dolly(o(K, 0.15, 1.5, 2.9), o(K, -0.05, 1.25, -0.3), pushK(f, fr(44.0), 0.002, 0.006, 25), { fov: 44, roll: 0.03 });
const S11c = (f: number) => dolly(o(K, 0.15, 1.2, 1.6), o(K, 0.15, 1.0, 0.1), pushK(f, fr(47.9), 0.0028, 0.008, 25), { fov: 40, roll: -0.03 });
const S12a = (f: number): Shot => { const p = jp(12, f); return { pos: o(GM, -150, 1.7, CROWD_Z + 4), look: [p[0] + 6, p[1] + 3, 0], fov: 40, roll: 0.03 }; };
const S12b = (f: number): Shot => { const p = jp(12, f); return { pos: o(GM, -250, 3, 85), look: [p[0] + 4, p[1] + 3, 0], fov: 40, roll: -0.03 }; };
const S12c = (f: number) => dolly(o(GM, -175, 1.6, 40), o(GM, -212, 6, 0), pushK(f, fr(54.6), 0.003, 0.008, 20), { fov: 42 });
const S12d = (f: number): Shot => { const p = jp(12, f); return { pos: o(GM, -112, 1.6, 42), look: [p[0] + 14, 2.2, 0], fov: 40, roll: 0.02 }; };
const S12e = (f: number) => dolly(o([STOP_X, 0, 0], 26, 2.1, 26), o([STOP_X, 0, 0], 12, 2.4, 3), pushK(f, fr(58.9), 0.0022, 0.005, 25), { fov: 44 });
const S13a = (f: number) => dolly(o(HANGAR, 2.0, 1.5, 14.5), o(HANGAR, -1.0, 1.3, 8.5), pushK(f, fr(60.25), 0.0022, 0.005, 25), { fov: 44, roll: 0.02 });
const S14a = (f: number) => dolly(o([STOP_X, 0, 0], 27, 2.0, 16), o([STOP_X, 0, 0], 17, 1.6, 1), pushK(f, fr(63.85), 0.0025, 0.006, 25), { fov: 44, roll: -0.03 });
const S15a = (f: number) => zoom(o(AJ, 56, 6, 50), o(AJ, -1, 3, 0), 42, pushK(f, fr(65.55), 0.0022, 0.005, 30), { roll: 0.025 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: fr(2.7), cut: true, s: S1b }],
  2: [{ f: fr(4.55), s: S2a }, { f: fr(5.8), cut: true, s: S2b }],
  3: [{ f: fr(9.5), s: S3a }, { f: fr(11.1), cut: true, s: S3b }, { f: fr(12.95), cut: true, s: S3c }, { f: fr(13.8), cut: true, s: S3d }],
  4: [{ f: fr(15.4), s: S4a }],
  5: [{ f: fr(21.0), s: S5a }],
  6: [{ f: fr(22.9), s: S6a }],
  7: [{ f: fr(24.95), s: S7a }],
  8: [{ f: fr(27.1), s: S8a }],
  9: [{ f: fr(29.95), s: S9a }, { f: fr(32.0), cut: true, s: S9b }],
  10: [{ f: fr(33.75), s: S10a }, { f: fr(37.6), cut: true, s: S10b }, { f: fr(39.3), cut: true, s: S10c }],
  11: [{ f: fr(41.2), s: S11a }, { f: fr(44.0), cut: true, s: S11b }, { f: fr(47.9), cut: true, s: S11c }],
  12: [{ f: fr(50.0), s: S12a }, { f: fr(51.6), cut: true, s: S12b }, { f: fr(54.6), cut: true, s: S12c }, { f: fr(55.5), cut: true, s: S12d }, { f: fr(58.9), cut: true, s: S12e }],
  13: [{ f: fr(60.25), s: S13a }],
  14: [{ f: fr(63.85), s: S14a }],
  15: [{ f: fr(65.55), s: S15a }],
};

/** impact kicks */
const KICKS: [number, number][] = [[W.half, 0.6], [W.beeped, 0.3], [W.stopped, 0.9], [W.one, 1.0], [W.dark, 0.5], [W.cake, 0.6],
  [55.5, 0.9], [W.folded, 1.5], [W.stop, 0.6], [W.gimliC, 0.4]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0 + 2 / FPS) * FPS + 1e-6); // lands 2 f before the word
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T_(f));
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
  { f: fr(2.7), cInf: 10, focus: () => o(AJ, 4, 1.4, 6.2) },
  { f: fr(4.55), cInf: 12, focus: () => o(WK1, -0.3, 1.6, 0) },
  { f: fr(5.8), cInf: 0 },
  { f: fr(9.5), cInf: 9, focus: () => o(G, -1.4, 1.5, 10.8) },
  { f: fr(11.1), cInf: 13, focus: () => o(PANEL, 0, 1.3, 0) },
  { f: fr(12.95), cInf: 12, focus: () => o(WK1, 0, 1.7, 0) },
  { f: fr(13.8), cInf: 10, focus: () => o(WK1, -0.5, 1.7, 0.2) },
  { f: fr(15.4), cInf: 6, focus: () => o(TANKA, 1.8, 2.1, 0) },
  { f: fr(21.0), cInf: 11, focus: () => o(CK, -1.5, 1.3, 0) },
  { f: fr(22.9), cInf: 0 },
  { f: fr(24.95), cInf: 9, focus: () => o(CK, 0.5, 1.05, 0) },
  { f: fr(27.1), cInf: 0 },
  { f: fr(29.95), cInf: 12, focus: () => o(CAPT, 0, 0.95, 0) },
  { f: fr(32.0), cInf: 12, focus: () => o(FO, 0, 0.95, 0) },
  { f: fr(33.75), cInf: 0 },
  { f: fr(37.6), cInf: 7, focus: () => o(GM, 6, 1.0, 3) },
  { f: fr(39.3), cInf: 0 },
  { f: fr(41.2), cInf: 13, focus: () => o(K, 0, 1.15, 0) },
  { f: fr(44.0), cInf: 11, focus: () => o(K, -0.05, 1.3, -0.3) },
  { f: fr(47.9), cInf: 13, focus: () => o(K, 0.15, 1.0, 0.1) },
  { f: fr(50.0), cInf: 0 },
  { f: fr(58.9), cInf: 8, focus: () => o([STOP_X, 0, 0], 12, 2.0, 3) },
  { f: fr(60.25), cInf: 11, focus: () => o(HANGAR, 0, 1.8, 9.5) },
  { f: fr(63.85), cInf: 9, focus: () => o([STOP_X, 0, 0], 17, 1.6, 1) },
  { f: fr(65.55), cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
