// "The Warship That Sank Before It Left the Harbour" (Vasa, Stockholm 1628): timeline, set positions and cameras, all
// timed to the narration (stories/vasa-warship/voice/words.json). Same camera grammar as the earlier shorts: cuts on
// big jumps, smootherstep glides, every hold creeps in, impact kicks that flip sign every frame for 7 f.
export const FPS = 30;
export const TOTAL = 2115;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- word cues (seconds, from words.json) ----------------
export const W = {
  in1628: 0.04, sweden: 1.56, mightiest: 2.64, world: 3.84, it: 4.47, sank: 4.6, harbour: 5.74, stockholm: 6.4, august: 7.68,
  crowds: 8.28, shore: 9.16, carried: 9.96, decks: 10.82, cannon: 11.52, fired: 12.36, salute: 12.9, sails: 13.78, filled: 14.08,
  small: 15.02, gust: 15.32, tipped: 15.66, over: 16.18, came: 16.92, up: 17.3, bigger: 18.0, gust2: 18.18, tipped2: 18.52,
  further: 19.04, water: 19.92, poured: 20.18, gunports: 21.42, less: 22.4, half: 22.88, voyage: 24.14, kilometre: 25.52,
  dock: 26.28, sank2: 27.02, luckily: 27.6, tested: 28.46, stability: 28.98, sailed: 30.06, unluckily: 30.76, thirty: 32.0,
  running: 32.64, deck: 34.42, rocked: 35.12, hard: 35.66, stopped: 36.16, test: 36.64, then: 37.28, anyway: 37.86,
  bookcase: 39.16, heavy: 40.24, books: 40.42, top: 41.06, shelf: 41.22, stands: 42.26, still: 43.16, somebody: 44.08,
  leans: 44.46, vasa: 45.62, above: 46.84, water2: 47.28, below: 48.72, inquiry: 49.94, nobody: 50.97, punished: 51.52,
  baltic: 52.66, fresh: 53.44, worms: 54.06, eat: 54.56, ships: 55.06, lay: 56.02, mud: 56.48, years: 57.98, lifted: 59.02,
  y1961: 59.8, now: 61.42, visited: 61.96, museum: 62.42, scandinavia: 63.1, ship2: 64.2, stay: 64.9, half2: 65.48,
  standing: 66.6, y65: 67.34, years2: 67.84,
};

// ---------------- places (metres) ----------------
/** the harbour: water at y 0, the ship's middle at the origin (bow +x), the quay edge at z = QZ, quay top at y = QY */
export const SHIP: V3 = [0, 2.0, 0];
export const QZ = 12, QY = 1.6;
/** deck height above the ship's origin (ship-local) */
export const DECK = 6;
export const BOOK: V3 = [1500, 0, 0];   // the bookcase room
export const INQ: V3 = [-1500, 0, 0];   // the inquiry room
export const FLOOR: V3 = [0, 0, 1500];  // the sea floor
export const MUS: V3 = [0, 0, -1500];   // the museum hall
export const MUSHIP: V3 = [0, 9.5, -1500]; // the museum ship's origin (stands on its cradle)

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Set = "harbour" | "book" | "inquiry" | "floor" | "museum";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set };
const F = (s: number) => Math.round(s * FPS);
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: F(6.3), light: "day", set: "harbour" },          // hook: the mightiest warship; it sank in the harbour
  { id: 2, a: F(6.3), b: F(9.75), light: "day", set: "harbour" },    // Stockholm, crowds on the shore
  { id: 3, a: F(9.75), b: F(11.9), light: "day", set: "harbour" },   // two decks of heavy cannon
  { id: 4, a: F(11.9), b: F(19.7), light: "day", set: "harbour" },   // salute, sails, small gust, back up, bigger gust
  { id: 5, a: F(19.7), b: F(27.6), light: "day", set: "harbour" },   // water through the gunports; she sank
  { id: 6, a: F(27.6), b: F(38.55), light: "day", set: "harbour" },  // the stability test at the quay
  { id: 7, a: F(38.55), b: F(45.55), light: "day", set: "book" },    // the bookcase
  { id: 8, a: F(45.55), b: F(49.55), light: "day", set: "harbour" }, // too much ship above the water
  { id: 9, a: F(49.55), b: F(51.85), light: "day", set: "inquiry" }, // the inquiry; nobody punished
  { id: 10, a: F(51.85), b: F(58.7), light: "day", set: "floor" },   // the Baltic: no worms; 333 years in the mud
  { id: 11, a: F(58.7), b: F(61.1), light: "day", set: "harbour" },  // lifted out in 1961
  { id: 12, a: F(61.1), b: TOTAL, light: "day", set: "museum" },     // the museum: standing up for 65 years
];
export const XFADE: Record<number, number> = { 6: 8, 7: 8, 10: 10, 12: 10 };
export const FLASH_AT = F(6.3);

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
/** the sailors' run across the deck in the stability test: -1 .. +1 across the beam, period 2.6 s */
export const runAt = (t: number) => Math.sin(((t - 31.2) / 2.6) * Math.PI * 2);
/** the ship in the harbour: heel (rad, + = toward the quay), sink (m down), sails 0 furled .. 1 full, wreck */
export const shipAt = (id: number, t: number): { heel: number; sink: number; sails: number; wreck: boolean } => {
  if (id === 1 && t >= 4.45) return { heel: 8 * deg, sink: 36, sails: 0, wreck: false };
  if (id === 1 || id === 2 || id === 3) return { heel: 0.4 * deg * Math.sin(t * 1.3), sink: 0, sails: 0, wreck: false };
  if (id === 6) { // moored at the quay; the sailors' run rocks her harder and harder until the test stops
    const grow = smooth((t - 32.4) / 3.2) * (1 - smooth((t - W.stopped) / 1.2));
    return { heel: (0.5 + 8.5 * grow) * deg * runAt(t - 0.35), sink: 0, sails: 0, wreck: false };
  }
  if (id === 8) return { heel: 0.6 * deg * Math.sin(t * 1.1), sink: 0, sails: 1, wreck: false };
  if (id === 11) return { heel: 3 * deg, sink: 10 * (1 - smooth((t - 58.9) / 2.0)) + 0.6, sails: 0, wreck: true };
  // shots 4 and 5: the voyage
  const sails = smooth((t - (W.sails - 0.1)) / 0.6);
  let heel = 0.5 * deg * Math.sin(t * 1.4);
  heel += 9 * deg * smooth((t - (W.gust - 0.05)) / 0.6) * (1 - smooth((t - 16.4) / 1.0));
  heel += 19 * deg * smooth((t - (W.gust2 - 0.05)) / 0.9);
  heel += 9 * deg * smooth((t - 19.3) / 2.2);
  heel += 4 * deg * smooth((t - 22.4) / 2.5) - 22 * deg * smooth((t - 24.6) / 2.4);
  const sink = 36 * smooth((t - 21.6) / 5.6) ** 1.6;
  return { heel, sink, sails, wreck: false };
};
/** the bookcase: tip angle (rad) away from the kid (+x) */
export const tipAt = (t: number) => (t < W.leans + 0.12 ? 0 : Math.min(Math.PI / 2 - 0.05, 3.2 * (t - W.leans - 0.12) ** 2));

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
const T = (f: number) => f / FPS;
// ---- framings ----
const S1a = (f: number) => dolly([34, 7, 52], [0, 17, 0], pushK(f, 0, 0.0022), { fov: 50, roll: 0.03 });
const S1b = (f: number) => dolly([28, 3.2, 44], [0, 10, 0], pushK(f, fr(4.45), 0.003, 0.008, 25), { fov: 44, roll: -0.035 });
const S2a = (f: number) => dolly([70, 6.5, -8], [20, 4.5, 18], pushK(f, fr(6.3), 0.0022, 0.005, 30), { fov: 50, roll: -0.03 });
const S3a = (f: number) => dolly([-3, 6.2, 19], [-3.5, 5.2, 5.4], pushK(f, fr(9.75), 0.003, 0.008, 25), { fov: 46, roll: 0.035 });
const S4a = (f: number) => dolly([26, 9, 44], [0, 12, 0], pushK(f, fr(11.9), 0.002, 0.005, 25), { fov: 48 });
const S4b = (f: number) => dolly([10, 3.5, 22], [0, 30, 0], pushK(f, fr(13.6), 0.003, 0.007, 25), { fov: 50, roll: -0.04 });
const S4c = (f: number) => dolly([-6, 10, 66], [0, 15, 0], pushK(f, fr(14.85), 0.0018, 0.005, 30), { fov: 46, roll: 0.03 });
const S5a = (f: number) => dolly([6, 2.6, 13.5], [2, 1.4, 5.6], pushK(f, fr(19.7), 0.003, 0.008, 25), { fov: 46, roll: -0.04 });
const S5b = (f: number): Shot => ({ ...dolly([-8, 11, 62], [0, 12 - 10 * smooth((T(f) - 22.4) / 4), 0], pushK(f, fr(22.35), 0.0018)), fov: 48, roll: 0.03 });
const S5c = (f: number) => dolly([16, 3.6, 30], [2, 5, 4], pushK(f, fr(24.85), 0.0025, 0.007, 25), { fov: 48, roll: -0.03 });
const S6a = (f: number) => dolly([30, 13, 42], [0, 9, 4], pushK(f, fr(27.6), 0.0022, 0.005, 30), { fov: 46, roll: 0.03 });
const S6b = (f: number) => dolly([6, 15.5, 21], [0, 8.4, 0], pushK(f, fr(30.7), 0.0018, 0.006, 25), { fov: 50, roll: -0.03 });
const S6c = (f: number) => dolly([-6.5, 3.4, 22.5], [-4, 3.2, 15.2], pushK(f, fr(37.2), 0.003, 0.008, 25), { fov: 44, roll: 0.035 });
const S7a = (f: number) => dolly(add(BOOK, [0.8, 1.9, 4.6]), add(BOOK, [0, 1.9, 0]), pushK(f, fr(38.55), 0.0022, 0.006, 30), { fov: 46 });
const S7b = (f: number) => dolly(add(BOOK, [0.6, 1.5, 6.6]), add(BOOK, [0.3, 1.2, 0]), pushK(f, fr(41.9), 0.0018, 0.006, 25), { fov: 48, roll: -0.03 });
const S8a = (f: number): Shot => ({ ...dolly([10, 1.2, 46], [0, 22 - 20 * smooth((T(f) - 46.3) / 2.6), 0], pushK(f, fr(45.55), 0.0018)), fov: 50, roll: 0.03 });
const S9a = (f: number) => dolly(add(INQ, [0.3, 1.9, 8.6]), add(INQ, [0, 1.4, 0]), pushK(f, fr(49.55), 0.0025, 0.007, 25), { fov: 46 });
const S10a = (f: number) => dolly(add(FLOOR, [26, 5, 30]), add(FLOOR, [0, 2, 0]), pushK(f, fr(51.85), 0.002, 0.005, 30), { fov: 50, roll: 0.03 });
const S10b = (f: number) => dolly(add(FLOOR, [-30, 6, 34]), add(FLOOR, [-4, 2, 0]), pushK(f, fr(55.6), 0.0028), { fov: 46, roll: -0.03 });
const S11a = (f: number) => dolly([34, 12, 40], [0, 2, 0], pushK(f, fr(58.7), 0.0022, 0.006, 25), { fov: 48, roll: 0.03 });
const S12a = (f: number) => dolly(add(MUS, [26, 6, 40]), add(MUS, [0, 17, 0]), pushK(f, fr(61.1), 0.0018), { fov: 50, roll: -0.03 });
const S12b = (f: number) => dolly(add(MUS, [12, 2.2, 26]), add(MUS, [14, 7, 0]), pushK(f, fr(64.05), 0.0025, 0.006, 25), { fov: 48, roll: 0.035 });
const S12c = (f: number) => dolly(add(MUS, [-14, 8, 64]), add(MUS, [0, 14, 0]), pushK(f, fr(66.5), 0.0025, 0.006, 25), { fov: 50 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: fr(4.45), cut: true, s: S1b }],
  2: [{ f: fr(6.3), s: S2a }],
  3: [{ f: fr(9.75), s: S3a }],
  4: [{ f: fr(11.9), s: S4a }, { f: fr(13.6), cut: true, s: S4b }, { f: fr(14.85), cut: true, s: S4c }],
  5: [{ f: fr(19.7), s: S5a }, { f: fr(22.35), cut: true, s: S5b }, { f: fr(24.85), cut: true, s: S5c }],
  6: [{ f: fr(27.6), s: S6a }, { f: fr(30.7), cut: true, s: S6b }, { f: fr(37.2), cut: true, s: S6c }],
  7: [{ f: fr(38.55), s: S7a }, { f: fr(41.9), cut: true, s: S7b }],
  8: [{ f: fr(45.55), s: S8a }],
  9: [{ f: fr(49.55), s: S9a }],
  10: [{ f: fr(51.85), s: S10a }, { f: fr(55.6), cut: true, s: S10b }],
  11: [{ f: fr(58.7), s: S11a }],
  12: [{ f: fr(61.1), s: S12a }, { f: fr(64.05), cut: true, s: S12b }, { f: fr(66.5), cut: true, s: S12c }],
};

/** impact kicks */
const KICKS: [number, number][] = [[W.sank, 0.7], [W.fired, 0.6], [W.gust, 0.4], [W.gust2, 0.6], [W.water, 0.5], [W.sank2, 0.7],
  [W.stopped, 0.5], [W.leans + 0.5, 0.9], [W.nobody, 0.4], [W.lifted, 0.5], [W.standing, 0.4]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0 + 2 / FPS) * FPS + 1e-6); // lands 2 f before the word
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
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
  { f: fr(4.45), cInf: 0 },
  { f: fr(6.3), cInf: 6, focus: () => [18, 3, 16] },
  { f: fr(9.75), cInf: 12, focus: () => [-3.5, 5.2, 5.6] },
  { f: fr(11.9), cInf: 0 },
  { f: fr(19.7), cInf: 12, focus: () => [2, 1.4, 5.6] },
  { f: fr(22.35), cInf: 0 },
  { f: fr(24.85), cInf: 9, focus: () => [8, 3.4, 16] },
  { f: fr(27.6), cInf: 0 },
  { f: fr(30.7), cInf: 7, focus: () => [0, 8.4, 0] },
  { f: fr(37.2), cInf: 12, focus: () => [-4, 3.2, 15.2] },
  { f: fr(38.55), cInf: 11, focus: () => add(BOOK, [0, 2.0, 0.2]) },
  { f: fr(41.9), cInf: 9, focus: () => add(BOOK, [-0.4, 1.2, 0.4]) },
  { f: fr(45.55), cInf: 0 },
  { f: fr(49.55), cInf: 10, focus: () => add(INQ, [0, 1.5, 0]) },
  { f: fr(51.85), cInf: 0 },
  { f: fr(55.6), cInf: 7, focus: () => add(FLOOR, [-4, 2, 0]) },
  { f: fr(58.7), cInf: 0 },
  { f: fr(64.05), cInf: 9, focus: () => add(MUS, [13, 1.2, 11]) },
  { f: fr(66.5), cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
