// "The Tower Saved by a War": timeline, tower state and cameras, all timed to the narration
// (stories/tower-saved-by-a-war/voice/words.json). Same camera grammar as the bridge short: cuts on big jumps,
// smootherstep glides of 18-40 f, every hold creeps in, impact kicks that flip sign every frame for 7 f.
export const FPS = 30;
export const TOTAL = 2118;
export const D0 = 0; // ground level (build.ts houses stand on D0)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- word cues (seconds, from words.json) ----------------
export const W = {
  pisa: 2.9, proud: 4.7, beautiful: 6.0, three: 7.7, tip: 9.0, ground: 9.6, deep: 13.4,
  war: 14.3, dropped: 15.5, left: 16.6, hundred: 17.7, which: 18.6, sponge: 21.9, fast: 22.9, squishes: 23.7,
  slowly: 24.8, seeps: 25.5, firm: 26.4, century: 27.2, squeezed: 27.9, y1272: 29.6, back: 31.1, taller: 32.2,
  straight: 33.9, curves: 35.9, banana: 36.8, y1838: 37.6, walkway: 39.3, luckily: 42.0, unluckily: 43.3, water: 44.2,
  y1934: 44.9, embarrassing: 47.5, drilled: 48.5, cement: 50.3, leanedMore: 51.0, y1990: 51.9, shut: 54.0,
  opposite: 55.6, pushing: 57.8, soil: 58.9, bucket: 60.6, sinkBack: 61.9, eleven: 62.9, straightened: 63.8,
  stopped: 65.9, purpose: 66.5, because: 66.8, justATower: 68.9,
};

// ---------------- tower state ----------------
/** tower: base level (h 7) + six open galleries (h 5) + belfry (h 5), radius 4.3; it leans toward +x */
export const R_TOWER = 4.3;
export const LEVEL_H = [7, 5, 5, 5, 5, 5, 5, 5];
export const levelBase = (i: number) => LEVEL_H.slice(0, i).reduce((a, b) => a + b, 0);
/** number of levels standing at story time t (fractional = the next level rising) */
export const floorsAt = (t: number) => lin([[0, 2], [W.three - 0.3, 2], [W.three + 0.4, 3], [W.back, 3], [W.taller + 1.3, 7], [W.straight + 0.1, 8]], t);
/** lean in degrees (toward +x) */
export const leanAt = (t: number) => {
  const step = (t0: number, d: number) => d * smooth((t - t0) / 0.45);
  let a = step(W.tip, 1.6);
  a += 1.0 * smooth((t - W.back) / 3.2);                // the new floors' weight
  a += step(W.water, 1.2);                               // 1838: the walkway floods
  a += step(W.leanedMore - 0.2, 1.2);                    // 1934: the cement
  a -= 1.0 * smooth((t - (W.sinkBack - 2.4)) / 2.8);     // 1990s: soil out from the high side
  return a;
};
/** extra tilt of each upper level back toward vertical (the 1272 builders made the low side taller): the banana */
export const curveAt = (t: number) => 0.55 * smooth((t - W.back) / 2.5); // + = back toward vertical (counter to the lean)

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Set = "piazza" | "cut";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set; tau: (t: number) => number; straight?: boolean };
const F = (s: number) => Math.round(s * FPS);
const story = (t: number) => t;
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: F(2.75), light: "golden", set: "piazza", tau: () => 64 },           // hook: today, leaning
  { id: 2, a: F(2.75), b: F(7.6), light: "day", set: "piazza", tau: story },            // Pisa 1173
  { id: 3, a: F(7.6), b: F(9.45), light: "day", set: "piazza", tau: story },            // three floors up: tip
  { id: 4, a: F(9.45), b: F(14.0), light: "day", set: "cut", tau: story },              // soft wet clay, 3 m
  { id: 5, a: F(14.0), b: F(18.5), light: "day", set: "piazza", tau: story },           // war: everyone leaves
  { id: 6, a: F(18.5), b: F(20.7), light: "day", set: "piazza", tau: story },           // the abandoned stump
  { id: 7, a: F(20.7), b: F(26.9), light: "day", set: "piazza", tau: story },           // the sponge
  { id: 8, a: F(26.9), b: F(29.0), light: "day", set: "cut", tau: story },              // the clay firms up
  { id: 9, a: F(29.0), b: F(34.5), light: "day", set: "piazza", tau: story },           // 1272: new floors
  { id: 10, a: F(34.5), b: F(37.4), light: "day", set: "piazza", tau: story },          // the banana
  { id: 11, a: F(37.4), b: F(44.7), light: "day", set: "piazza", tau: story },          // 1838 walkway
  { id: 12, a: F(44.7), b: F(51.7), light: "day", set: "piazza", tau: story },          // 1934 cement
  { id: 13, a: F(51.7), b: F(54.6), light: "day", set: "piazza", tau: story },          // 1990 shut
  { id: 14, a: F(54.6), b: F(62.7), light: "day", set: "piazza", tau: story },          // soil out, sink back
  { id: 15, a: F(62.7), b: F(66.8), light: "golden", set: "piazza", tau: story },       // today: tourists
  { id: 16, a: F(66.8), b: TOTAL, light: "day", set: "piazza", tau: story, straight: true }, // the straight tower
];
export const XFADE: Record<number, number> = { 6: 8, 9: 8, 15: 10 };
export const FLASH_AT = F(2.75);

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

/** tower pose for shot id at time t */
export type TowerState = { lean: number; curve: number; floors: number; scaffold: boolean };
export const towerState = (id: number, t: number): TowerState => {
  const s = SHOTS[id - 1], tau = s.tau(t);
  if (s.straight) return { lean: 0, curve: 0, floors: 8, scaffold: false };
  return { lean: leanAt(tau), curve: curveAt(tau), floors: floorsAt(tau), scaffold: tau < W.straight + 0.5 && !(tau > W.left + 0.8 && tau < W.back) };
};

/** a point given in the tower's own frame (x along the lean, y up the axis, below level k's base) in world space */
// Matches world.ts: level j is a child of level j-1, sitting on its top; levels 3+ add `curve` degrees about their
// own base centre (z axis); the whole stack leans by -lean degrees about the base centre.
const rotZ = (p: [number, number], deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
};
export const towerPoint = (st: TowerState, x: number, y: number, z: number, origin: V3 = [0, 0, 0]): V3 => {
  let k = 0;
  while (k < LEVEL_H.length - 1 && y >= levelBase(k + 1)) k++;
  let p: [number, number] = [x, y - levelBase(k)];
  for (let j = k; j >= 1; j--) {
    if (j >= 3) p = rotZ(p, st.curve);
    p = [p[0], p[1] + LEVEL_H[j - 1]];
  }
  p = rotZ(p, -st.lean);
  return [origin[0] + p[0], origin[1] + p[1], origin[2] + z];
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
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });

/** the ground cross-section set lives far away from the piazza (x = CUT_X) */
export const CUT_X = 600;
/** places */
export const MAYOR: V3 = [3.2, 0, 23];
export const FOUNTAIN: V3 = [24, 0, 20];
export const KID_AT: V3 = [24.6, 0, 22.6];
export const ARCHITECT: V3 = [7.2, 0, 15.5];
export const DICTATOR: V3 = [-5.5, 0, 17];
export const OFFICIAL: V3 = [1.6, 0, 12.6];
export const FENCE_R = 11.5;
export const TRENCH = [5.2, 7.6]; // inner, outer radius of the 1838 walkway

const fr = F;
// ---- framings ----
const S1a = (f: number) => dolly([-9, 1.4, 52], [3, 13, 0], pushK(f, 0, 0.0028, 0.006, 30), { fov: 44, roll: 0.03 });
const S2a = (f: number) => zoom([34, 15, 66], [1, 5, 4], 42, pushK(f, fr(2.75), 0.002));
const S2b = (f: number) => dolly([MAYOR[0] + 1.1, 1.75, MAYOR[2] + 5.0], [MAYOR[0], 1.55, MAYOR[2]], pushK(f, fr(4.4), 0.0025, 0.006, 30), { fov: 38, roll: -0.03 });
const S2c = (f: number) => dolly([11, 1.3, 23], [0, 7.5, 0], pushK(f, fr(5.8), 0.002), { fov: 44, roll: 0.035 });
const S3a = (f: number) => dolly([7.5, 17.6, 16], [0.6, 16.6, 1.5], pushK(f, fr(7.6), 0.0025), { fov: 40 });
const S4a = (f: number) => dolly([CUT_X + 3, 2, 44], [CUT_X, -3, 0], pushK(f, fr(9.45), 0.002), { fov: 42 });
const S4b = (f: number) => dolly([CUT_X - 2.5, -1.5, 14], [CUT_X - 1.5, -2.2, 0], pushK(f, fr(12.6), 0.0025, 0.006, 30), { fov: 40, roll: 0.03 });
const S5a = (f: number) => dolly([-18, 2.4, 30], [0, 4, 4], pushK(f, fr(14.0), 0.002), { fov: 42 });
const S5b = (f: number) => zoom([-30, 9, 44], [0, 7, 0], 42, pushK(f, fr(16.6), 0.0018));
const S6a = (f: number) => dolly([6.5, 18.5, 10], [0.5, 16.8, 0.5], pushK(f, fr(18.5), 0.0022), { fov: 40, roll: -0.03 });
const S7a = (f: number) => dolly([KID_AT[0] + 0.4, 1.05, KID_AT[2] + 4.2], [KID_AT[0], 0.85, KID_AT[2]], pushK(f, fr(20.7), 0.002), { fov: 38 });
const S7b = (f: number) => dolly([KID_AT[0] - 0.3, 0.95, KID_AT[2] + 3.0], [KID_AT[0] + 0.1, 0.8, KID_AT[2]], pushK(f, fr(24.5), 0.0025, 0.005, 30), { fov: 36, roll: 0.03 });
const S8a = (f: number) => dolly([CUT_X + 1, -2, 20], [CUT_X - 1, -4.5, 0], pushK(f, fr(26.9), 0.003), { fov: 42, roll: -0.03 });
const S9a = (f: number) => zoom([-30, 10, 52], [0, 17, 0], 44, pushK(f, fr(29.0), 0.0018));
const S9b = (f: number) => zoom([-30, 10, 52], [0, 24, 0], 44, pushK(f, fr(31.0), 0.0018));
const S10a = (f: number) => dolly([0, 22, 92], [0, 21, 0], pushK(f, fr(34.5), 0.0015, 0.004, 30), { fov: 40 });
const S11a = (f: number) => dolly([ARCHITECT[0] + 1.6, 1.85, ARCHITECT[2] + 5.4], [ARCHITECT[0], 1.6, ARCHITECT[2]], pushK(f, fr(37.4), 0.002), { fov: 38 });
const S11b = (f: number) => dolly([ARCHITECT[0] + 0.9, 1.8, ARCHITECT[2] + 3.6], [ARCHITECT[0], 1.65, ARCHITECT[2]], pushK(f, fr(41.8), 0.0025, 0.006, 30), { fov: 36, roll: 0.035 });
const S11c = (f: number) => dolly([16, 7, 36], [0, 8, 0], pushK(f, fr(43.2), 0.0025), { fov: 42, roll: -0.03 });
const S12a = (f: number) => dolly([DICTATOR[0] - 1.2, 1.8, DICTATOR[2] + 5.0], [DICTATOR[0], 1.6, DICTATOR[2]], pushK(f, fr(44.7), 0.002, 0.006, 35), { fov: 38 });
const S12b = (f: number) => dolly([7.5, 3.2, 17], [0.5, 0.6, 6], pushK(f, fr(48.3), 0.0025), { fov: 40, roll: 0.03 });
const S12c = (f: number) => dolly([18, 8, 42], [0, 14, 0], pushK(f, fr(50.7), 0.002), { fov: 42 });
const S13a = (f: number) => dolly([0.5, 2.0, 24], [0, 4.5, 8], pushK(f, fr(51.7), 0.0025, 0.005, 30), { fov: 42 });
const S14a = (f: number) => dolly([-15, 1.9, 13], [-8.6, 1.4, 2.5], pushK(f, fr(54.6), 0.002), { fov: 40 });
const S14b = (f: number) => dolly([-11, 1.4, 7.2], [-8.2, 0.9, 1.6], pushK(f, fr(59.7), 0.0025, 0.005, 30), { fov: 38, roll: -0.03 });
const S14c = (f: number) => dolly([0, 21, 88], [0, 20, 0], pushK(f, fr(61.3), 0.0015), { fov: 40 });
const S15a = (f: number) => dolly([-5, 1.6, 34], [2, 6, 0], pushK(f, fr(62.7), 0.0022), { fov: 44, roll: 0.02 });
const S15b = (f: number) => dolly([-2.5, 1.7, 26], [-1.5, 1.5, 20], pushK(f, fr(65.6), 0.0025), { fov: 40 });
const S16a = (f: number) => dolly([0, 2.0, 44], [0, 10.5, 0], pushK(f, fr(66.8), 0.0018, 0.004, 40), { fov: 44 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }],
  2: [{ f: fr(2.75), s: S2a }, { f: fr(4.4), cut: true, s: S2b }, { f: fr(5.8), cut: true, s: S2c }],
  3: [{ f: fr(7.6), s: S3a }],
  4: [{ f: fr(9.45), s: S4a }, { f: fr(12.6), dur: 26, s: S4b }],
  5: [{ f: fr(14.0), s: S5a }, { f: fr(16.6), cut: true, s: S5b }],
  6: [{ f: fr(18.5), s: S6a }],
  7: [{ f: fr(20.7), s: S7a }, { f: fr(24.5), dur: 24, s: S7b }],
  8: [{ f: fr(26.9), s: S8a }],
  9: [{ f: fr(29.0), s: S9a }, { f: fr(31.0), dur: 40, s: S9b }],
  10: [{ f: fr(34.5), s: S10a }, { f: fr(36.6), dur: 20, s: rolled(S10a, 0.04) }],
  11: [{ f: fr(37.4), s: S11a }, { f: fr(41.8), dur: 22, s: S11b }, { f: fr(43.2), cut: true, s: S11c }],
  12: [{ f: fr(44.7), s: S12a }, { f: fr(48.3), cut: true, s: S12b }, { f: fr(50.7), cut: true, s: S12c }],
  13: [{ f: fr(51.7), s: S13a }],
  14: [{ f: fr(54.6), s: S14a }, { f: fr(59.7), cut: true, s: S14b }, { f: fr(61.3), cut: true, s: S14c }],
  15: [{ f: fr(62.7), s: S15a }, { f: fr(65.6), cut: true, s: S15b }],
  16: [{ f: fr(66.8), s: S16a }],
};

/** impact kicks: the tower tips, sinks, sinks again */
const KICKS: [number, number][] = [[W.tip, 1.2], [W.water, 1.0], [W.leanedMore - 0.2, 1.3], [W.shut, 0.5]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
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
  { f: fr(4.4), cInf: 12, focus: () => [MAYOR[0], 1.6, MAYOR[2]] },
  { f: fr(5.8), cInf: 0 },
  { f: fr(7.6), cInf: 10 },
  { f: fr(9.45), cInf: 0 },
  { f: fr(18.5), cInf: 8 },
  { f: fr(20.7), cInf: 13, focus: () => [KID_AT[0], 0.95, KID_AT[2]] },
  { f: fr(26.9), cInf: 0 },
  { f: fr(37.4), cInf: 12, focus: () => [ARCHITECT[0], 1.6, ARCHITECT[2]] },
  { f: fr(43.2), cInf: 0 },
  { f: fr(44.7), cInf: 12, focus: () => [DICTATOR[0], 1.6, DICTATOR[2]] },
  { f: fr(48.3), cInf: 6 },
  { f: fr(50.7), cInf: 0 },
  { f: fr(54.6), cInf: 10, focus: () => [-8.6, 1.4, 2.5] },
  { f: fr(61.3), cInf: 0 },
  { f: fr(65.6), cInf: 11, focus: () => [-1.5, 1.5, 20] },
  { f: fr(66.8), cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
