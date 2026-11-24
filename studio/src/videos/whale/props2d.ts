// Flat ink-outlined props for "The Town That Blew Up a Whale", drawn with the same Pen as the characters (plum ink,
// flat fills). Each function draws into its own canvas size, noted per prop. No readable text anywhere.
import { Pen, INK } from "./toon";

type P2 = [number, number];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cl = (x: number) => Math.max(0, Math.min(1, x));
const R = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

/** a wobbly round blob outline around (cx, cy) */
const blobPts = (cx: number, cy: number, rx: number, ry: number, seed: number, wob = 0.18, n = 22): P2[] => {
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, k = 1 + wob * (R(i, seed) - 0.5) * 2;
    pts.push([cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)]);
  }
  return pts;
};

/** seagull, 300 x 260, side view facing right; flap 0..1 (wings up .. folded); mood 0 calm, 1 eager (open beak) */
export const gull = (p: Pen, flap: number, mood = 0) => {
  const body = "#f4f2ec", wing = "#a9b0bd";
  p.poly([[40, 150], [96, 128], [130, 112], [196, 114], [236, 140], [214, 178], [130, 192], [70, 176]], body, 9);
  p.line([[138, 190], [134, 238]], "#e8a24a", 6); p.line([[168, 188], [172, 238]], "#e8a24a", 6);
  if (flap < 0.5) p.poly([[110, 126], [70, lerp(10, 80, flap * 2)], [190, lerp(30, 100, flap * 2)], [196, 124]], wing, 9);
  else { p.poly([[90, 140], [170, 120], [222, 148], [150, 172]], wing, 8); p.poly([[40, 150], [82, 140], [74, 162]], "#3d414c", 6); }
  p.ell(228, 102, 32, 30, body, 9);
  if (mood > 0.5) { p.poly([[254, 96], [296, 92], [262, 104]], "#f2cf4a", 5); p.poly([[256, 108], [292, 120], [258, 114]], "#f2cf4a", 5); }
  else p.poly([[256, 98], [296, 106], [258, 114]], "#f2cf4a", 6);
  p.dot(236, 94, 6);
  if (mood > 0.5) p.stroke([[222, 80], [244, 84]], 5);
};

/** the detonator box with a T-handle plunger, 300 x 360; down 0 (up) .. 1 (pushed) */
export const plunger = (p: Pen, down: number) => {
  const y = lerp(40, 130, cl(down));
  p.stroke([[150, y + 30], [150, 190]], 14, "#8d949c");
  p.poly([[70, y], [230, y], [230, y + 30], [70, y + 30]], "#2a2d33", 8);
  p.poly([[40, 180], [260, 180], [260, 340], [40, 340]], "#b5653f", 10);
  p.poly([[40, 180], [260, 180], [244, 160], [56, 160]], "#c97a52", 8);
  p.stroke([[60, 300], [240, 300]], 5, "rgba(36,23,38,0.35)");
  p.line([[260, 320], [296, 330], [300, 356]], "#c0353a", 6);
};

/** a few red dynamite sticks held up in a bundle, 200 x 260 */
export const sticks = (p: Pen) => {
  for (let i = 0; i < 4; i++) {
    const x = 40 + i * 36;
    p.poly([[x, 60], [x + 30, 60], [x + 30, 240], [x, 240]], "#d4473c", 8);
    p.line([[x + 15, 60], [x + 15 + 8 * (i % 2 ? 1 : -1), 20]], INK, 4);
  }
  p.poly([[30, 150], [180, 150], [180, 172], [30, 172]], "#2a2d33", 6);
};

/** wavy green stink lines rising, 300 x 420; phase 0..1 */
export const stink = (p: Pen, phase: number) => {
  for (let k = 0; k < 3; k++) {
    const x0 = 70 + k * 80, pts: P2[] = [];
    for (let i = 0; i <= 14; i++) { const y = 400 - i * 26; pts.push([x0 + 18 * Math.sin(i * 0.8 + phase * Math.PI * 2 + k * 1.7), y]); }
    p.stroke(pts, 12, "#7fa14a");
    p.stroke(pts, 5, "#b9d77a");
  }
};

/** a thought cloud with a boulder in a road (the "treat it like a boulder" idea), 520 x 440 */
export const thought = (p: Pen) => {
  p.ell(70, 410, 16, 14, "#ffffff", 6); p.ell(110, 372, 24, 20, "#ffffff", 7);
  p.poly(blobPts(290, 190, 210, 150, 3, 0.12, 26), "#ffffff", 9);
  p.poly([[130, 250], [450, 250], [430, 300], [150, 300]], "#5b5d66", 6);   // a strip of road
  for (let x = 170; x < 420; x += 60) p.poly([[x, 272], [x + 28, 272], [x + 28, 280], [x, 280]], "#f1eee6", 0);
  p.poly(blobPts(290, 200, 90, 66, 9, 0.22, 16), "#9a9a92", 9);              // the boulder
  p.ell(262, 176, 24, 12, "#bdbdb4", 0);
  p.line([[340, 150], [372, 108], [392, 96]], INK, 5);                     // a fuse
  p.ell(398, 92, 12, 12, "#ffd84a", 4);
};

/** a dynamite case (side), 260 x 200 */
export const crateCard = (p: Pen) => {
  p.poly([[20, 30], [240, 30], [240, 180], [20, 180]], "#b98a55", 9);
  for (const y of [70, 110, 150]) p.stroke([[24, y], [236, y]], 4, "rgba(80,50,30,0.5)");
  p.poly([[20, 86], [240, 86], [240, 116], [20, 116]], "#c0353a", 0);
};

/** TV news camera on a tripod, 260 x 460 */
export const tvcam = (p: Pen) => {
  p.stroke([[130, 200], [50, 450]], 10, "#3d414c"); p.stroke([[130, 200], [210, 450]], 10, "#3d414c"); p.stroke([[130, 200], [134, 452]], 10, "#3d414c");
  p.poly([[40, 100], [200, 100], [210, 200], [40, 200]], "#4a4d55", 9);
  p.poly([[200, 120], [252, 108], [252, 196], [200, 184]], "#2a2d33", 8);
  p.ell(240, 152, 14, 40, "#6fa8d0", 5);
  p.ell(90, 82, 34, 30, "#3d414c", 7); p.ell(150, 82, 34, 30, "#3d414c", 7);   // film reels
  p.dot(90, 82, 7, "#c9ccd2"); p.dot(150, 82, 7, "#c9ccd2");
  p.ell(60, 120, 9, 9, "#e2453c", 0);
};

/** the explosion: an ink-outlined fireball and sand cloud, 800 x 900, base at the bottom centre; t 0..1 */
export const boom = (p: Pen, t: number) => {
  const e = 1 - (1 - cl(t)) ** 3, fade = cl((t - 0.45) / 0.55);
  const H = lerp(220, 820, e), W = lerp(260, 640, e);
  const sand = "#e6cf9e", dk = "#c9a978";
  // dusty column
  p.poly([[400 - W * 0.22, 900], [400 - W * 0.16, 900 - H * 0.6], [400 + W * 0.16, 900 - H * 0.6], [400 + W * 0.22, 900]], dk, 9);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, r = W * (0.18 + 0.08 * R(i, 4));
    p.ell(400 + Math.cos(a) * W * 0.28, 900 - H + 120 + Math.sin(a) * 70, r, r * 0.8, i % 2 ? sand : "#f0dcb0", 8);
  }
  p.ell(400, 900 - H + 120, W * 0.3, W * 0.24, "#f3e2bd", 8);
  if (fade < 0.95) { // fire core
    const k = 1 - fade;
    p.poly(blobPts(400, 900 - H * 0.55, W * 0.24 * k, H * 0.18 * k, 5, 0.35, 18), "#ffb347", 8 * k + 2);
    p.poly(blobPts(400, 900 - H * 0.55, W * 0.14 * k, H * 0.1 * k, 7, 0.3, 14), "#fff3b0", 0);
  }
  // base ring of sand
  p.ell(400, 880, W * 0.48, 40, sand, 8);
};

/** a chunk of blubber (grey skin on one side, creamy-pink fat), 260 x 220; seed varies the shape, sq squashes it */
export const chunk = (p: Pen, seed: number, sq = 0) => {
  const ry = 70 * (1 - 0.35 * sq), rx = 100 * (1 + 0.25 * sq);
  const pts = blobPts(130, 120 + 70 * 0.35 * sq, rx, ry, seed, 0.2, 18);
  p.poly(pts, "#f0c6b8", 9);
  const skin = pts.filter(([, y]) => y < 120 + 70 * 0.35 * sq);
  p.poly([...skin, [130 + rx * 0.7, 110], [130 - rx * 0.7, 110]], "#5d6168", 0);
  p.line(skin, INK, 9);
  p.ell(110, 140, 22, 10, "#f8dccf", 0);
};

/** a flying blubber chunk with a motion streak, 300 x 220 */
export const flyChunk = (p: Pen, seed: number) => {
  p.stroke([[20, 150], [110, 120]], 10, "rgba(240,232,220,0.8)");
  p.stroke([[30, 190], [120, 150]], 7, "rgba(240,232,220,0.6)");
  const g = p.g; g.save(); g.translate(60, 0); chunk(p, seed); g.restore();
};

/** a ketchup packet seen at a low angle on a blanket, 360 x 220; squash 0..1 */
export const ketchup = (p: Pen, squash: number) => {
  const s = cl(squash);
  p.poly([[40, 140 - 50 * (1 - s)], [320, 140 - 50 * (1 - s)], [320, 180], [40, 180]], "#d4473c", 8);
  p.stroke([[40, 160 - 25 * (1 - s)], [320, 160 - 25 * (1 - s)]], 4, "rgba(255,255,255,0.4)");
  p.poly([[40, 140 - 50 * (1 - s)], [60, 140 - 50 * (1 - s)], [60, 180], [40, 180]], "#e8e2d6", 5);
};

/** a red ketchup splat (front-facing), 260 x 260; size 0..1 */
export const splat = (p: Pen, seed: number, size = 1) => {
  const s = cl(size);
  if (s <= 0) return;
  const pts: P2[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, r = (i % 2 ? 60 : 100) * (0.7 + 0.5 * R(i, seed)) * s;
    pts.push([130 + r * Math.cos(a), 130 + r * Math.sin(a)]);
  }
  p.poly(pts, "#d4302c", 7);
  for (let k = 0; k < 4; k++) { const a = R(k, seed + 3) * Math.PI * 2, d = 110 * s; p.ell(130 + d * Math.cos(a), 130 + d * Math.sin(a), 12 * s, 12 * s, "#d4302c", 5); }
  p.ell(110, 112, 18 * s, 10 * s, "#f07a6a", 0);
};

/** a pale mist cloud (the dust that does NOT happen), 400 x 300 */
export const mist = (p: Pen) => {
  for (let i = 0; i < 7; i++) p.ell(200 + 120 * Math.cos(i), 150 + 60 * Math.sin(i * 1.3), 70, 50, "rgba(230,230,230,0.7)", 0);
};

/** a dealership banner with a smiling whale, stars and pennants (no text), 900 x 300 */
export const dealBanner = (p: Pen) => {
  p.poly([[20, 30], [880, 30], [880, 270], [20, 270]], "#f2cf4a", 10);
  p.poly([[40, 50], [860, 50], [860, 250], [40, 250]], "#fbe7a0", 0);
  // whale
  p.poly([[300, 200], [300, 120], [360, 92], [560, 100], [620, 150], [600, 210], [360, 220]], "#4f86c6", 9);
  p.poly([[600, 150], [680, 100], [670, 160], [700, 210], [610, 190]], "#4f86c6", 8);
  p.dot(345, 140, 9); p.arc(350, 175, 22, 12, 20, 160, 6);
  p.stroke([[330, 92], [320, 50]], 6, "#6fc3f0"); p.stroke([[330, 92], [350, 52]], 6, "#6fc3f0");
  for (const [x, y] of [[120, 150], [780, 150], [200, 90], [720, 220]] as const) {
    const pts: P2[] = [];
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 18 : 42, a = (k * 36 - 90) * (Math.PI / 180); pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]); }
    p.poly(pts, "#e2453c", 6);
  }
};

/** a string of triangular pennants, 900 x 160 */
export const pennants = (p: Pen) => {
  p.line([[0, 30], [450, 70], [900, 30]], INK, 5);
  const cols = ["#e2453c", "#3f9fd5", "#f2cf4a", "#5d9a5a"];
  for (let i = 0; i < 12; i++) {
    const x = 20 + i * 74, y = 30 + 40 * Math.sin((x / 900) * Math.PI);
    p.poly([[x, y], [x + 50, y + 2], [x + 25, y + 70]], cols[i % 4], 5);
  }
};

/** the park sign (no text): a wooden board with a cartoon whale under a little blast, 700 x 520 */
export const parkSign = (p: Pen) => {
  p.poly([[20, 20], [680, 20], [680, 500], [20, 500]], "#8a5a3a", 12);
  p.poly([[50, 50], [650, 50], [650, 470], [50, 470]], "#f6ecd2", 6);
  // blast burst behind
  const pts: P2[] = [];
  for (let k = 0; k < 18; k++) { const r = k % 2 ? 120 : 200, a = (k * 20) * (Math.PI / 180); pts.push([350 + r * Math.cos(a), 250 + r * 0.75 * Math.sin(a)]); }
  p.poly(pts, "#ffb347", 8);
  // a sperm whale: big boxy head on the left, tapering to the flukes; a little spout
  p.poly([[170, 330], [170, 214], [196, 196], [330, 196], [380, 214], [470, 246], [530, 268], [520, 300], [430, 322], [300, 338]], "#5d6f88", 9);
  p.poly([[520, 280], [590, 226], [578, 280], [600, 340], [516, 302]], "#5d6f88", 8);
  p.stroke([[178, 300], [300, 306]], 6, "rgba(36,23,38,0.5)");
  p.ell(226, 246, 13, 13, "#f4f1ea", 5); p.dot(229, 247, 6);
  p.stroke([[210, 196], [196, 150]], 7, "#6fc3f0"); p.stroke([[210, 196], [228, 150]], 7, "#6fc3f0");
  // little flying chunks
  for (const [x, y] of [[150, 160], [560, 140], [610, 400], [120, 400]] as const) p.poly(blobPts(x, y, 20, 14, x, 0.3, 10), "#f0c6b8", 5);
};

/** a "highway department" orange traffic cone, 200 x 300 */
export const cone = (p: Pen) => {
  p.poly([[100, 20], [150, 260], [50, 260]], "#f08a2c", 8);
  p.poly([[70, 150], [130, 150], [140, 196], [60, 196]], "#f4f1ea", 0);
  p.poly([[20, 260], [180, 260], [180, 290], [20, 290]], "#f08a2c", 7);
};

export { INK };
