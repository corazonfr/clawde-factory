// "The Space Telescope That Needed Glasses" (Hubble, 1990-1993): timeline, set positions and cameras, all timed to the
// narration (stories/hubble-glasses/voice/words.json). Same camera grammar as the earlier shorts: cuts on big jumps,
// smootherstep glides, every hold creeps in, impact kicks that flip sign every frame for 7 f.
export const FPS = 30;
export const TOTAL = 2115;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- word cues (seconds, from words.json) ----------------
export const W = {
  nasa: 0.02, telescope: 2.7, then: 3.73, glasses: 4.74, april: 5.84, y1990: 6.42, shuttle: 7.7, discovery: 7.94, carries: 8.48,
  hubble: 8.9, above: 9.18, atmosphere: 9.8, stars: 10.98, sharp: 12.08, first: 12.84, pictures: 13.08, blurry: 14.48,
  engineers: 15.4, adjust: 15.76, focus: 16.42, still: 17.23, adjust2: 18.12, again: 18.58, two: 19.24, nasa2: 20.42, why: 21.16,
  main: 22.0, mirror: 22.24, wide: 23.7, wrong: 24.76, edge: 25.62, flat: 26.34, less: 27.06, hair: 29.14, luckily: 29.85,
  polished: 30.74, carefully: 31.34, unluckily: 32.01, wrong2: 34.06, tool: 35.08, checked: 35.48, lens: 36.38, out: 38.42,
  place: 38.88, same: 40.04, eyesight: 41.08, light: 41.66, edge2: 42.24, middle: 43.38, land: 43.6, nothing: 45.12, focus2: 46.16,
  fix: 47.14, too: 47.88, in1993: 48.47, endeavour: 50.56, caught: 50.96, hubble2: 51.2, spacewalks: 52.52, box: 53.72,
  booth: 54.82, corrective: 56.08, mirrors: 56.48, glasses2: 57.76, telescope2: 58.48, pictures2: 59.16, sharp2: 59.96,
  backup: 60.88, mirror2: 61.16, company: 62.3, equipment: 64.06, right: 65.44, along: 66.14, never: 66.9, flew: 67.1,
  museum: 68.02, washington: 68.58,
};
/** liftoff */
export const LIFT = 7.55;

// ---------------- places (metres) ----------------
export const SP: V3 = [0, 3000, 0];               // the orbit set: Hubble here in shots 1 and 8c
export const EARTH: V3 = [0, 3000 - 520, -320];    // Earth's centre: its limb sits under the space shots
export const EARTH_R = 500;
export const SHU: V3 = [90, 3000, 0];              // the shuttle in orbit, nose +x, payload bay up
export const PAD: V3 = [0, 0, 0];                  // launch pad: the stack stands here
export const CTRL: V3 = [400, 0, 0];               // the control room: screen on the back wall (z = -6)
export const LAB: V3 = [-400, 0, 0];               // the mirror lab
export const MIR: V3 = [-400, 1.75, -2];           // the mirror's centre (tilted toward +z)
export const TOOL: V3 = [-397.6, 1.75, 0.2];       // the test tool's front end, pointing at the mirror
export const EYE: V3 = [0, 0, 400];                // the eye-test room
export const MUS: V3 = [0, 0, -400];               // the museum hall
export const MUSM: V3 = [0, 1.8, -403];            // the backup mirror on display

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Set = "space" | "pad" | "control" | "lab" | "eye" | "museum";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set };
const F = (s: number) => Math.round(s * FPS);
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: F(5.7), light: "day", set: "space" },           // hook: $1.5 billion; it needed glasses
  { id: 2, a: F(5.7), b: F(9.1), light: "day", set: "pad" },        // April 1990, liftoff
  { id: 3, a: F(9.1), b: F(12.65), light: "day", set: "space" },    // Hubble released above the atmosphere
  { id: 4, a: F(12.65), b: F(21.8), light: "day", set: "control" }, // blurry; adjust; still blurry; two months
  { id: 5, a: F(21.8), b: F(29.7), light: "day", set: "lab" },      // the mirror, the wrong shape, the hair
  { id: 6, a: F(29.7), b: F(39.5), light: "day", set: "lab" },      // polished carefully; the tool; the lens
  { id: 7, a: F(39.5), b: F(48.3), light: "day", set: "eye" },      // bad eyesight; light lands in two places; glasses
  { id: 8, a: F(48.3), b: F(59.0), light: "day", set: "space" },    // Endeavour catches Hubble, spacewalks, glasses
  { id: 9, a: F(59.0), b: F(60.65), light: "day", set: "control" }, // sharp pictures
  { id: 10, a: F(60.65), b: TOTAL, light: "day", set: "museum" },// the backup mirror in a museum
];
export const XFADE: Record<number, number> = { 7: 8, 10: 10 };
export const FLASH_AT = F(5.7);

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
/** how high the launch stack has risen (m) */
export const liftAt = (t: number) => (t < LIFT ? 0 : 3.2 * (t - LIFT) ** 2);
/** is the main screen in the control room sharp? */
export const sharpScreen = (id: number) => id === 9;
/** the test tool's middle lens offset 0 (right) .. 1 (out of place) */
export const lensOff = (id: number, t: number) => (id === 6 ? smooth((t - (W.out - 0.1)) / 0.35) : 0);
/** where Hubble is per shot */
export const hubbleAt = (id: number, t: number): V3 => {
  if (id === 3) { const u = smooth((t - 9.4) / 3); return [SHU[0] - 1, SHU[1] + 9 + 5 * u, SHU[2] + 2 * u]; }
  if (id === 8 && t < 52.4) { const u = smooth((t - 49.6) / 1.5); return [SHU[0] - 1 + 6 * (1 - u), SHU[1] + 9 + 7 * (1 - u), SHU[2] - 5 * (1 - u)]; }
  if (id === 8 && t < 57.2) return [SHU[0] - 1, SHU[1] + 9, SHU[2]];
  return SP;
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
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

const fr = F;
// ---- framings ----
const S1a = (f: number) => dolly(add(SP, [-15, 7, 50]), add(SP, [0, -2.5, 0]), pushK(f, 0, 0.003), { fov: 46, roll: 0.03 });
const S1b = (f: number) => dolly(add(SP, [17, 1.6, 9.5]), add(SP, [6.4, 0.2, 0.5]), pushK(f, fr(3.6), 0.003, 0.009, 25), { fov: 40, roll: -0.035 });
const S2a = (f: number) => zoom(add(PAD, [34, 4, 78]), add(PAD, [0, 27 + 0.8 * Math.max(0, f / FPS - LIFT) ** 2, 0]), 42, pushK(f, fr(5.7), 0.0018));
const S3a = (f: number) => dolly(add(SHU, [-30, 20, 56]), add(SHU, [-1, 9, 0]), pushK(f, fr(9.1), 0.002), { fov: 46, roll: 0.03 });
const S4a = (f: number) => dolly(add(CTRL, [0.6, 2.3, 9.5]), add(CTRL, [0, 2.9, -6]), pushK(f, fr(12.65), 0.0018, 0.004, 30), { fov: 50 });
const S4b = (f: number) => dolly(add(CTRL, [2.6, 1.5, 3.0]), add(CTRL, [1.4, 1.35, -0.6]), pushK(f, fr(15.3), 0.0025, 0.007, 25), { fov: 44, roll: -0.03 });
const S4c = (f: number) => dolly(add(CTRL, [-3.2, 2.0, 6.5]), add(CTRL, [-0.6, 1.9, -3]), pushK(f, fr(19.1), 0.002, 0.006, 30), { fov: 48, roll: 0.03 });
const S5a = (f: number) => dolly(add(MIR, [1.2, 0.5, 8.5]), add(MIR, [0, -0.3, 0]), pushK(f, fr(21.8), 0.0022, 0.006, 30), { fov: 46 });
const S5b = (f: number) => dolly(add(MIR, [-0.2, 0.4, 3.2]), add(MIR, [-0.95, 0.2, 0.3]), pushK(f, fr(25.4), 0.0028, 0.008, 25), { fov: 40, roll: -0.03 });
const S6a = (f: number) => dolly(add(MIR, [-3.2, 0.1, 5.2]), add(MIR, [-1.4, -0.2, 0.6]), pushK(f, fr(29.7), 0.0022, 0.007, 25), { fov: 44 });
const S6b = (f: number) => dolly(add(MIR, [-1.7, 0.0, 3.6]), add(MIR, [-1.9, -0.1, 1.0]), pushK(f, fr(31.9), 0.003, 0.008, 25), { fov: 40, roll: 0.035 });
const S6c = (f: number) => dolly(add(TOOL, [1.4, 0.7, 3.6]), add(TOOL, [-0.6, 0, -0.6]), pushK(f, fr(34.9), 0.0022, 0.008, 25), { fov: 42, roll: -0.03 });
const S7a = (f: number) => dolly(add(EYE, [0.9, 1.0, 6.6]), add(EYE, [0.15, 1.1, 0]), pushK(f, fr(39.5), 0.0022, 0.006, 30), { fov: 44 });
const S7b = (f: number) => dolly(add(EYE, [-2.2, 1.6, 4.6]), add(EYE, [-2.6, 1.6, 1.2]), pushK(f, fr(41.5), 0.0018, 0.004, 25), { fov: 44, roll: 0.03 });
const S7c = (f: number) => dolly(add(EYE, [0.75, 0.78, 5.3]), add(EYE, [0.55, 0.64, 3.3]), pushK(f, fr(46.9), 0.003, 0.009, 25), { fov: 40, roll: -0.03 });
const S8a = (f: number) => dolly(add(SHU, [24, 13, 30]), add(SHU, [0, 8, 0]), pushK(f, fr(48.3), 0.0018, 0.005, 30), { fov: 48, roll: -0.03 });
const S8b = (f: number) => dolly(add(SHU, [-4.5, 9.6, 9.5]), add(SHU, [-6.2, 8.8, 1.2]), pushK(f, fr(52.4), 0.0022, 0.006, 25), { fov: 46, roll: 0.03 });
const S8c = (f: number) => dolly(add(SP, [17, 1.6, 9.5]), add(SP, [6.4, 0.2, 0.5]), pushK(f, fr(57.2), 0.0028, 0.009, 25), { fov: 40, roll: 0.03 });
const S9a = (f: number) => dolly(add(CTRL, [0.6, 2.3, 9.0]), add(CTRL, [0, 2.9, -6]), pushK(f, fr(59.0), 0.003, 0.008, 25), { fov: 50, roll: -0.03 });
const S10a = (f: number) => zoom(add(MUSM, [3.5, 0.4, 13]), add(MUSM, [0, -0.2, 0]), 48, pushK(f, fr(60.65), 0.0018));
const S10b = (f: number) => dolly(add(MUSM, [2.6, -0.4, 5.6]), add(MUSM, [1.6, -0.5, 2.6]), pushK(f, fr(64.95), 0.0025, 0.006, 25), { fov: 44, roll: 0.03 });
const S10c = (f: number) => dolly(add(MUSM, [0.4, 0.1, 6.5]), add(MUSM, [0, 0, 0]), pushK(f, fr(67.6), 0.0035, 0.006, 25), { fov: 44 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: fr(3.6), cut: true, s: S1b }],
  2: [{ f: fr(5.7), s: S2a }],
  3: [{ f: fr(9.1), s: S3a }],
  4: [{ f: fr(12.65), s: S4a }, { f: fr(15.3), cut: true, s: S4b }, { f: fr(19.1), cut: true, s: S4c }],
  5: [{ f: fr(21.8), s: S5a }, { f: fr(25.4), cut: true, s: S5b }],
  6: [{ f: fr(29.7), s: S6a }, { f: fr(31.9), cut: true, s: S6b }, { f: fr(34.9), cut: true, s: S6c }],
  7: [{ f: fr(39.5), s: S7a }, { f: fr(41.5), cut: true, s: S7b }, { f: fr(46.9), cut: true, s: S7c }],
  8: [{ f: fr(48.3), s: S8a }, { f: fr(52.4), cut: true, s: S8b }, { f: fr(57.2), cut: true, s: S8c }],
  9: [{ f: fr(59.0), s: S9a }],
  10: [{ f: fr(60.65), s: S10a }, { f: fr(64.95), cut: true, s: S10b }, { f: fr(67.6), cut: true, s: S10c }],
};

/** impact kicks */
const KICKS: [number, number][] = [[W.glasses, 0.6], [LIFT + 0.1, 1.4], [W.blurry, 0.5], [W.wrong, 0.6], [W.out, 0.7], [W.fix, 0.5], [W.caught, 0.6], [W.glasses2, 0.6], [W.sharp2, 0.5], [W.never, 0.5]];
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
  { f: fr(5.7), cInf: 0 },
  { f: fr(12.65), cInf: 7, focus: () => add(CTRL, [0, 1.8, 1.0]) },
  { f: fr(15.3), cInf: 12, focus: () => add(CTRL, [1.4, 1.5, -0.4]) },
  { f: fr(19.1), cInf: 8, focus: () => add(CTRL, [-0.8, 1.6, -0.3]) },
  { f: fr(21.8), cInf: 8, focus: () => MIR },
  { f: fr(25.4), cInf: 13, focus: () => add(MIR, [-0.95, 0.2, 0.3]) },
  { f: fr(29.7), cInf: 11, focus: () => add(MIR, [-1.6, 0, 0.8]) },
  { f: fr(34.9), cInf: 12, focus: () => add(TOOL, [-0.5, 0, -0.5]) },
  { f: fr(39.5), cInf: 10, focus: () => add(EYE, [0.5, 1.6, 3.4]) },
  { f: fr(41.5), cInf: 9, focus: () => add(EYE, [-2.6, 1.6, 1.2]) },
  { f: fr(46.9), cInf: 13, focus: () => add(EYE, [0.55, 0.62, 3.4]) },
  { f: fr(48.3), cInf: 0 },
  { f: fr(52.4), cInf: 9, focus: () => add(SHU, [-6.2, 8.8, 1.6]) },
  { f: fr(57.2), cInf: 0 },
  { f: fr(59.0), cInf: 6, focus: () => add(CTRL, [0, 1.8, 1.0]) },
  { f: fr(60.65), cInf: 0 },
  { f: fr(64.95), cInf: 11, focus: () => add(MUSM, [1.6, -0.4, 2.6]) },
  { f: fr(67.6), cInf: 8, focus: () => MUSM },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
