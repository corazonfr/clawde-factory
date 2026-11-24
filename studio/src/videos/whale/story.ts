// "The Town That Blew Up a Whale" (Florence, Oregon, 1970): timeline, set positions and cameras, all timed to the
// narration (stories/exploding-whale/voice/words.json). Same camera grammar as the bridge / Pisa / Walkie shorts: cuts on
// big jumps, smootherstep glides of 18-40 f, every hold creeps in, impact kicks that flip sign every frame for 7 f.
export const FPS = 30;
export const TOTAL = 2115;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- word cues (seconds, from words.json) ----------------
export const W = {
  y1970: 0.18, rid: 2.06, whale0: 2.58, half: 3.4, dynamite: 4.02, florence: 4.88, fortyFive: 6.46, sperm: 7.16, beach: 8.58,
  tons: 9.07, smellier: 10.12, highway: 11.82, problem: 12.7, treated: 13.58, boulder: 14.32, road: 14.86, plan: 15.5,
  blow: 15.9, tiny: 16.52, seagulls: 17.84, leftovers: 18.66, veteran: 19.54, said: 21.0, twenty: 21.52, sticks: 21.88,
  used: 23.04, cases: 23.62, crowds: 24.72, tv: 25.64, rolled: 26.44, everyone: 27.25, back: 27.88, quarter: 28.34,
  mile: 28.78, then: 29.4, pushed: 29.8, button: 30.2, luckily: 30.68, hurt: 31.46, unluckily: 31.96, enough: 33.96,
  chunks: 34.47, rained: 35.16, crowd: 36.08, one: 36.72, crushed: 37.08, roof: 37.54, car: 38.46, gullsB: 39.46,
  blast: 40.52, scared: 40.8, away: 41.54, problemB: 42.48, blubber: 43.08, rubbery: 43.92, fat: 44.28, dynamiteB: 45.1,
  dust: 46.34, throws: 47.22, stomp: 48.06, ketchup: 48.62, mist: 50.26, big: 51.22, splats: 51.66, everywhere: 52.42,
  crews: 53.76, bulldozed: 54.12, buried: 54.86, today: 56.02, buries: 57.16, land: 58.56, oh: 59.11, crushedB: 59.68,
  owner: 61.04, sale: 62.12, whaleDeal: 62.96, deal: 63.38, fifty: 63.94, florenceB: 65.15, voted: 65.42, park: 66.4,
  winner: 67.0, exploding: 67.3, memorial: 68.22, parkB: 68.56,
};
/** the moment of the blast (just after "button") */
export const BOOM = 30.3;

// ---------------- places (metres; the beach: shore along x, sea toward -z, dunes toward +z) ----------------
export const WHALE: V3 = [0, 0, 0];          // 14 m sperm whale lying along x, head at +x, belly toward +z
export const WHALE_L = 14;
export const CRATES: V3 = [1.5, 0, 4.4];     // the stack of dynamite cases beside the whale
export const POST: V3 = [-8.6, 0, 5.2];      // the gulls' post
export const TRUCK: V3 = [16.5, 0, 7.5];     // the highway department truck, nose to -x
export const ENG: V3 = [8.2, 0, 7.4];        // the engineer
export const VET: V3 = [5.4, 0, 8.4];        // the veteran
export const NEAR_Z = 26;                    // where the crowd first stands
export const FAR_Z = 74;                     // a "quarter of a mile" back (cartoon distance)
export const TVCAM: V3 = [-4.5, 0, NEAR_Z + 1.5];
export const PLUNGER: V3 = [7.0, 0, FAR_Z - 2.2];
export const CAR: V3 = [17, 0, FAR_Z + 3.5];  // the brand-new car, nose to +x
export const CHUNK: V3 = [-3.2, 0, 13.5];     // the explanation's blubber chunk on the sand
export const PARK_X = 600, LOT_X = -600;
export const PICNIC: V3 = [PARK_X, 0, 0];
export const SIGN: V3 = [PARK_X + 30, 0, -40];
export const SHOWROOM: V3 = [LOT_X, 0, -14];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Set = "beach" | "park" | "lot";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set };
const F = (s: number) => Math.round(s * FPS);
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: F(4.85), light: "day", set: "beach" },          // hook: half a ton of dynamite
  { id: 2, a: F(4.85), b: F(11.35), light: "day", set: "beach" },   // Florence, the whale, the smell
  { id: 3, a: F(11.35), b: F(15.3), light: "day", set: "beach" },   // the highway department: a boulder
  { id: 4, a: F(15.3), b: F(19.3), light: "day", set: "beach" },    // the plan; the seagulls
  { id: 5, a: F(19.3), b: F(24.55), light: "day", set: "beach" },   // twenty sticks / twenty cases
  { id: 6, a: F(24.55), b: F(29.35), light: "day", set: "beach" },  // crowds, TV, a quarter of a mile back
  { id: 7, a: F(29.35), b: F(31.9), light: "day", set: "beach" },   // the button: BOOM; luckily nobody was hurt
  { id: 8, a: F(31.9), b: F(34.4), light: "day", set: "beach" },    // unluckily: not far enough
  { id: 9, a: F(34.4), b: F(36.65), light: "day", set: "beach" },   // chunks rain on the crowd
  { id: 10, a: F(36.65), b: F(39.15), light: "day", set: "beach" }, // the brand-new car
  { id: 11, a: F(39.15), b: F(42.0), light: "day", set: "beach" },  // the seagulls leave
  { id: 12, a: F(42.0), b: F(47.9), light: "day", set: "beach" },   // blubber: thick, rubbery, thrown
  { id: 13, a: F(47.9), b: F(53.35), light: "day", set: "park" },   // the ketchup packet
  { id: 14, a: F(53.35), b: F(55.85), light: "day", set: "beach" }, // bulldozed and buried
  { id: 15, a: F(55.85), b: F(59.0), light: "day", set: "beach" },  // today: buried where they land
  { id: 16, a: F(59.0), b: F(63.65), light: "day", set: "lot" },    // the car, a whale of a deal
  { id: 17, a: F(63.65), b: TOTAL, light: "golden", set: "park" },  // the park vote
];
export const XFADE: Record<number, number> = { 13: 8, 14: 8, 15: 10, 17: 10 };
export const FLASH_AT = F(4.85);

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state ----------------
/** a soft Oregon-November overcast on the beach (0..1) */
export const gloomAt = (id: number, _t: number) => (SHOTS[id - 1].set === "beach" ? 0.18 : 0);
/** is the whale still whole? (the beach shows the crater after the blast) */
export const whaleWhole = (id: number, t: number) => id < 7 || (id === 7 && t < BOOM);
/** number of dynamite cases stacked by the whale (they pile up on "cases") */
export const casesAt = (id: number, t: number) => (id < 5 ? 3 : id === 5 ? (t < W.used ? 3 : Math.min(20, 3 + Math.floor((t - W.used + 0.05) * 30))) : id <= 7 ? 20 : 0);
/** the blast: 0 before, 0..1 over the first 3 s after */
export const blastAt = (t: number) => clamp01((t - BOOM) / 3);
/** the car roof is crushed */
export const carCrushed = (id: number, t: number) => (id === 10 && t > W.crushed - 0.05) || (id === 16 && t < W.owner - 0.2);
/** how far the bulldozed sand mound has grown 0..1 */
export const moundAt = (id: number, t: number) => (id === 14 ? smooth((t - 53.6) / 2.2) * 0.8 : id === 15 ? 1 : 0);

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
const S1a = (f: number) => dolly([-12, 1.0, 13], [1, 1.6, 0], pushK(f, 0, 0.0028), { fov: 46, roll: 0.03 });
const S1b = (f: number) => dolly([4.2, 1.15, 8.2], [CRATES[0], 0.75, CRATES[2]], pushK(f, fr(3.25), 0.003, 0.008, 25), { fov: 40, roll: -0.035 });
const S2a = (f: number) => zoom([-70, 26, 44], [0, 0, 0], 40, pushK(f, fr(4.85), 0.0018));
const S2b = (f: number) => dolly([1.5, 1.6, 22], [0.6, 1.7, 0], pushK(f, fr(6.35), 0.0018, 0.004, 30), { fov: 50 });
const S2c = (f: number) => dolly([-6.6, 1.55, 14.6], [-5.6, 1.5, 9.0], pushK(f, fr(9.95), 0.0025, 0.006, 25), { fov: 42, roll: 0.03 });
const S3a = (f: number) => zoom([4, 2.0, 24], [10, 1.2, 7], 46, pushK(f, fr(11.35), 0.0018));
const S3b = (f: number) => dolly([9.6, 1.55, 11.4], [ENG[0], 1.75, ENG[2]], pushK(f, fr(13.4), 0.0025, 0.006, 30), { fov: 44, roll: -0.03 });
const S4a = (f: number) => dolly([11.0, 1.5, 13.0], [7.1, 1.4, 7.6], pushK(f, fr(15.3), 0.002), { fov: 46 });
const S4b = (f: number) => dolly([POST[0] + 0.4, 1.7, POST[2] + 3.2], [POST[0], 1.85, POST[2]], pushK(f, fr(17.7), 0.0028, 0.006, 25), { fov: 36, roll: 0.03 });
const S5a = (f: number) => dolly([VET[0] + 0.3, 1.6, VET[2] + 3.6], [VET[0], 1.55, VET[2]], pushK(f, fr(19.3), 0.0022, 0.006, 30), { fov: 40 });
const S5b = (f: number) => dolly([9, 2.6, 15.5], [1.5, 1.2, 3.0], pushK(f, fr(22.95), 0.002, 0.007, 25), { fov: 48, roll: -0.03 });
const S6a = (f: number) => dolly([0, 1.8, NEAR_Z - 7.5], [-1, 1.5, NEAR_Z], pushK(f, fr(24.55), 0.002), { fov: 50 });
const S6b = (f: number) => dolly([TVCAM[0] + 2.2, 1.6, TVCAM[2] + 2.6], [TVCAM[0], 1.5, TVCAM[2]], pushK(f, fr(25.55), 0.0025, 0.005, 25), { fov: 40, roll: 0.03 });
const S6c = (f: number) => dolly([-3, 9, -14], [0, 1.0, NEAR_Z], pushK(f, fr(27.15), 0.0018), { fov: 46 });
const S6d = (f: number) => zoom([-5, 7, -16], [2, 1.0, FAR_Z], 38, pushK(f, fr(28.3), 0.0015, 0.004, 25), { roll: -0.03 });
const S7a = (f: number) => dolly([PLUNGER[0] + 1.5, 1.3, PLUNGER[2] + 2.8], [PLUNGER[0] - 0.25, 0.95, PLUNGER[2]], pushK(f, fr(29.35), 0.003, 0.009, 20), { fov: 44 });
const S7b = (f: number) => zoom([-12, 1.7, FAR_Z - 2], [0, 7, 0], 50, pushK(f, fr(BOOM - 0.05), 0.0012));
const S8b = (f: number) => dolly([1.2, 1.1, FAR_Z + 8.5], [0.8, 4.2, FAR_Z - 4], pushK(f, fr(31.9), 0.0022, 0.006, 30), { fov: 56, roll: 0.035 });
const S9a = (f: number) => zoom([24, 4, FAR_Z + 16], [0, 4, FAR_Z - 2], 46, pushK(f, fr(34.4), 0.002));
const S10a = (f: number) => dolly([CAR[0] + 5.4, 1.7, CAR[2] + 5.2], [CAR[0], 1.0, CAR[2]], pushK(f, fr(36.65), 0.0022, 0.007, 30), { fov: 42, roll: -0.03 });
const S11a = (f: number) => dolly([POST[0] - 1.0, 1.4, POST[2] + 3.6], [POST[0], 2.0, POST[2]], pushK(f, fr(39.15), 0.0022, 0.006, 25), { fov: 40 });
const S12a = (f: number) => dolly([CHUNK[0] + 0.25, 0.75, CHUNK[2] + 2.6], [CHUNK[0], 0.35, CHUNK[2]], pushK(f, fr(42.0), 0.002, 0.005, 30), { fov: 38, roll: 0.03 });
const S12b = (f: number) => dolly([CHUNK[0] + 0.2, 0.62, CHUNK[2] + 2.2], [CHUNK[0], 0.5, CHUNK[2]], pushK(f, fr(46.9), 0.003, 0.008, 25), { fov: 40, roll: -0.03 });
const S13a = (f: number) => dolly([PICNIC[0] + 0.6, 1.25, PICNIC[2] + 3.7], [PICNIC[0], 0.6, PICNIC[2]], pushK(f, fr(47.9), 0.0022, 0.007, 25), { fov: 44 });
const S13b = (f: number) => dolly([PICNIC[0] + 0.1, 1.2, PICNIC[2] + 3.1], [PICNIC[0] - 0.5, 0.85, PICNIC[2] - 0.6], pushK(f, fr(51.1), 0.0025, 0.008, 25), { fov: 46, roll: 0.035 });
const S14a = (f: number) => zoom([-14, 4.5, 13], [2, 0.8, 1], 44, pushK(f, fr(53.35), 0.0018));
const S15a = (f: number) => dolly([0.5, 2.2, 15], [2.2, 0.9, 4.5], pushK(f, fr(55.85), 0.0018, 0.004, 30), { fov: 46 });
const S16a = (f: number) => dolly([CAR[0] + 4.6, 1.5, CAR[2] + 4.0], [CAR[0], 1.1, CAR[2]], pushK(f, fr(59.0), 0.0022, 0.006, 25), { fov: 42 });
const S16b = (f: number) => dolly([LOT_X + 3.5, 1.7, 8.5], [LOT_X, 2.6, -4], pushK(f, fr(60.8), 0.0018), { fov: 52 });
const S16c = (f: number) => dolly([LOT_X + 0.6, 1.6, 4.0], [LOT_X - 0.2, 1.55, 0.6], pushK(f, fr(62.8), 0.0028, 0.007, 25), { fov: 40, roll: -0.03 });
const S17a = (f: number) => zoom([SIGN[0] + 1, 2.4, SIGN[2] + 24], [SIGN[0], 1.4, SIGN[2]], 46, pushK(f, fr(63.65), 0.0018));
const S17b = (f: number) => dolly([SIGN[0] + 0.4, 1.6, SIGN[2] + 9], [SIGN[0], 1.75, SIGN[2]], pushK(f, fr(66.85), 0.0015, 0.004, 20), { fov: 56 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: fr(3.25), cut: true, s: S1b }],
  2: [{ f: fr(4.85), s: S2a }, { f: fr(6.35), cut: true, s: S2b }, { f: fr(9.95), cut: true, s: S2c }],
  3: [{ f: fr(11.35), s: S3a }, { f: fr(13.4), cut: true, s: S3b }],
  4: [{ f: fr(15.3), s: S4a }, { f: fr(17.7), cut: true, s: S4b }],
  5: [{ f: fr(19.3), s: S5a }, { f: fr(22.95), cut: true, s: S5b }],
  6: [{ f: fr(24.55), s: S6a }, { f: fr(25.55), cut: true, s: S6b }, { f: fr(27.15), cut: true, s: S6c }, { f: fr(28.3), cut: true, s: S6d }],
  7: [{ f: fr(29.35), s: S7a }, { f: fr(BOOM - 0.05), cut: true, s: S7b }],
  8: [{ f: fr(31.9), s: S8b }],
  9: [{ f: fr(34.4), s: S9a }],
  10: [{ f: fr(36.65), s: S10a }],
  11: [{ f: fr(39.15), s: S11a }],
  12: [{ f: fr(42.0), s: S12a }, { f: fr(46.9), cut: true, s: S12b }],
  13: [{ f: fr(47.9), s: S13a }, { f: fr(51.1), cut: true, s: S13b }],
  14: [{ f: fr(53.35), s: S14a }],
  15: [{ f: fr(55.85), s: S15a }],
  16: [{ f: fr(59.0), s: S16a }, { f: fr(60.8), cut: true, s: S16b }, { f: fr(62.8), cut: true, s: S16c }],
  17: [{ f: fr(63.65), s: S17a }, { f: fr(66.85), cut: true, s: S17b }],
};

/** impact kicks */
const KICKS: [number, number][] = [[W.cases, 0.6], [BOOM, 1.6], [W.chunks, 0.8], [W.crushed, 1.1], [W.blast, 0.5], [W.throws, 0.7], [W.stomp, 0.8], [W.splats, 0.6], [W.exploding, 0.8]];
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
  { f: fr(3.25), cInf: 12, focus: () => [CRATES[0], 0.75, CRATES[2]] },
  { f: fr(4.85), cInf: 0 },
  { f: fr(9.95), cInf: 12, focus: () => [-5.6, 1.6, 9.0] },
  { f: fr(11.35), cInf: 0 },
  { f: fr(13.4), cInf: 11, focus: () => [ENG[0], 1.75, ENG[2]] },
  { f: fr(15.3), cInf: 8, focus: () => [7.1, 1.5, 7.6] },
  { f: fr(17.7), cInf: 13, focus: () => [POST[0], 1.9, POST[2]] },
  { f: fr(19.3), cInf: 12, focus: () => [VET[0], 1.7, VET[2]] },
  { f: fr(22.95), cInf: 0 },
  { f: fr(25.55), cInf: 11, focus: () => [TVCAM[0], 1.6, TVCAM[2]] },
  { f: fr(27.15), cInf: 0 },
  { f: fr(29.35), cInf: 13, focus: () => [PLUNGER[0], 0.5, PLUNGER[2]] },
  { f: fr(BOOM - 0.05), cInf: 0 },
  { f: fr(31.9), cInf: 10, focus: () => [0.5, 1.7, FAR_Z] },
  { f: fr(34.4), cInf: 0 },
  { f: fr(36.65), cInf: 9, focus: () => [CAR[0], 1.1, CAR[2]] },
  { f: fr(39.15), cInf: 12, focus: () => [POST[0], 1.9, POST[2]] },
  { f: fr(42.0), cInf: 14, focus: () => [CHUNK[0], 0.35, CHUNK[2]] },
  { f: fr(47.9), cInf: 12, focus: () => [PICNIC[0], 0.7, PICNIC[2]] },
  { f: fr(53.35), cInf: 0 },
  { f: fr(59.0), cInf: 10, focus: () => [CAR[0], 1.1, CAR[2]] },
  { f: fr(60.8), cInf: 7, focus: () => [LOT_X, 1.6, 0.6] },
  { f: fr(62.8), cInf: 12, focus: () => [LOT_X, 1.6, 0.6] },
  { f: fr(63.65), cInf: 0 },
  { f: fr(66.85), cInf: 9, focus: () => [SIGN[0], 1.9, SIGN[2]] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
