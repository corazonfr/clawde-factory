// Flat ink-outlined props for the Gimli Glider short, drawn with the same Pen as the characters (plum ink, flat fills).
// Each function draws into its own canvas size, noted per prop. No readable text anywhere (numbers are scribbles).
import { Pen, INK } from "./toon";

type P2 = [number, number];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cl = (x: number) => Math.max(0, Math.min(1, x));
const R = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const blobPts = (cx: number, cy: number, rx: number, ry: number, seed: number, wob = 0.18, n = 22): P2[] => {
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, k = 1 + wob * (R(i, seed) - 0.5) * 2;
    pts.push([cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)]);
  }
  return pts;
};
/** a scribbled "number" (no legible digits): a few loops */
const scribble = (p: Pen, x: number, y: number, w: number, seed: number, col = "#3b5b9a") => {
  const pts: P2[] = [];
  for (let i = 0; i <= 18; i++) { const u = i / 18; pts.push([x + u * w, y + 12 * Math.sin(u * 22 + seed) + 6 * (R(i, seed) - 0.5)]); }
  p.stroke(pts, 5, col);
};

/** clipboard with a sheet of scribbled sums, 260 x 320; k 0..1 = how many lines are written */
export const clipboard = (p: Pen, k = 1) => {
  p.poly([[20, 30], [240, 30], [240, 310], [20, 310]], "#b98a55", 9);
  p.poly([[38, 52], [222, 52], [222, 292], [38, 292]], "#f8f6ef", 6);
  p.poly([[90, 14], [170, 14], [170, 50], [90, 50]], "#9aa1ac", 7);
  const n = Math.round(cl(k) * 6);
  for (let i = 0; i < n; i++) scribble(p, 56, 86 + i * 32, i === 5 ? 90 : 140, i * 3 + 1);
  if (n >= 6) p.stroke([[56, 262], [200, 262]], 6, "#c0353a");
};

/** a round fuel gauge on a little panel, 300 x 300; broken: cracked glass, needle hanging limp */
export const gauge = (p: Pen, broken: number) => {
  p.poly([[20, 20], [280, 20], [280, 280], [20, 280]], "#d8d4ca", 9);
  p.ell(150, 150, 108, 108, "#2a2d33", 8);
  p.ell(150, 150, 92, 92, "#f4f1ea", 5);
  for (let i = 0; i <= 8; i++) { const a = Math.PI * (0.8 + i * 0.175); p.stroke([[150 + 80 * Math.cos(a), 150 + 80 * Math.sin(a)], [150 + 66 * Math.cos(a), 150 + 66 * Math.sin(a)]], 5); }
  p.poly([[150 + 80 * Math.cos(Math.PI * 2.0), 150 + 80 * Math.sin(Math.PI * 2.0)], [222, 140], [226, 160]], "#c0353a", 0);
  const a = broken > 0.5 ? Math.PI * 0.5 + 0.12 : Math.PI * (1.25 + 0.25 * Math.sin(broken * 30));
  p.line([[150, 150], [150 + 70 * Math.cos(a), 150 + 70 * Math.sin(a)]], "#c0353a", 7);
  p.dot(150, 150, 10);
  if (broken > 0.5) {
    p.stroke([[96, 82], [140, 132], [128, 168], [176, 214]], 4);
    p.stroke([[140, 132], [196, 120], [228, 96]], 4);
    p.stroke([[128, 168], [86, 196]], 4);
  }
};

/** a tall fuel tank seen from the side, 300 x 600: a fill window; fill 0..1; mark = dashed "needed" line (or -1) */
export const tank = (p: Pen, fill: number, body: string, mark = -1) => {
  p.poly([[50, 70], [250, 70], [250, 560], [50, 560]], body, 10);
  p.ell(150, 70, 100, 26, body, 9);
  p.poly([[60, 556], [100, 590], [200, 590], [240, 556]], "#5b5d66", 8);
  const top = 120, bot = 520, y = lerp(bot, top, cl(fill));
  p.poly([[110, top], [190, top], [190, bot], [110, bot]], "#e9eef2", 7);
  if (fill > 0.005) p.poly([[114, y], [186, y], [186, bot - 4], [114, bot - 4]], "#f2b53a", 0);
  if (fill > 0.005) p.stroke([[114, y], [186, y]], 4, "#b5762a");
  p.poly([[110, top], [190, top], [190, bot], [110, bot]], null, 7);
  for (let i = 1; i < 10; i++) p.stroke([[110, lerp(bot, top, i / 10)], [126, lerp(bot, top, i / 10)]], 4);
  if (mark >= 0) {
    const ym = lerp(bot, top, mark);
    for (let x = 70; x < 230; x += 36) p.stroke([[x, ym], [x + 20, ym]], 8, "#c0353a");
  }
};

/** a red warning lamp, 220 x 220; on 0..1 */
export const lamp = (p: Pen, on: number) => {
  if (on > 0.5) for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    p.line([[110 + 62 * Math.cos(a), 110 + 62 * Math.sin(a)], [110 + 100 * Math.cos(a), 110 + 100 * Math.sin(a)]], "#ff5a4a", 9);
  }
  p.ell(110, 110, 52, 52, on > 0.5 ? "#ff3b30" : "#7a2a2a", 9);
  p.ell(96, 94, 16, 12, on > 0.5 ? "#ffb0a8" : "#a24a4a", 0);
};

/** a thought cloud with a little sailplane soaring in it, 520 x 440 */
export const thoughtGlider = (p: Pen) => {
  p.ell(70, 410, 16, 14, "#ffffff", 6); p.ell(110, 372, 24, 20, "#ffffff", 7);
  p.poly(blobPts(290, 190, 210, 150, 3, 0.12, 26), "#ffffff", 9);
  p.ell(240, 250, 70, 18, "#cfe3f7", 0); p.ell(360, 140, 60, 16, "#cfe3f7", 0);
  // the glider: slim fuselage, very long thin wings, T-tail
  p.poly([[150, 214], [380, 182], [420, 184], [404, 196], [170, 226]], "#f4f1ea", 7);
  p.poly([[206, 198], [234, 196], [258, 166], [246, 164]], "#9fc7e8", 5);
  p.poly([[250, 196], [470, 120], [478, 128], [274, 206]], "#f4f1ea", 7);
  p.poly([[270, 210], [110, 262], [104, 254], [256, 200]], "#e3dfd5", 7);
  p.poly([[150, 214], [126, 160], [146, 160], [176, 210]], "#c0353a", 7);
  p.poly([[118, 162], [176, 156], [176, 166], [120, 170]], "#c0353a", 5);
};

/** a balance scale: a big block (a kilo) and a small block (a pound), 600 x 440; tilt 0 level .. 1 heavy side down */
export const balance = (p: Pen, tilt: number) => {
  const a = 0.22 * cl(tilt), cx = 300, cy = 120, L = 220;
  p.poly([[260, 420], [340, 420], [320, 400], [280, 400]], "#8a5a3c", 8);
  p.line([[300, 400], [300, 130]], "#c9a24a", 12);
  const lx = cx - L * Math.cos(a), ly = cy + L * Math.sin(a), rx = cx + L * Math.cos(a), ry = cy - L * Math.sin(a);
  p.line([[lx, ly], [rx, ry]], "#c9a24a", 12);
  p.dot(cx, cy, 14, "#8a5a3c");
  const pan = (x: number, y: number) => {
    p.stroke([[x, y], [x - 60, y + 110]], 4); p.stroke([[x, y], [x + 60, y + 110]], 4);
    p.ell(x, y + 116, 80, 16, "#c9a24a", 7);
  };
  pan(lx, ly); pan(rx, ry);
  p.poly([[lx - 50, ly + 108], [lx + 50, ly + 108], [lx + 40, ly + 20], [lx - 40, ly + 20]], "#5b6270", 8);  // the kilo
  p.poly([[lx - 26, ly + 38], [lx + 26, ly + 38], [lx + 20, ly + 22], [lx - 20, ly + 22]], "#7a8190", 5);
  p.poly([[rx - 26, ry + 108], [rx + 26, ry + 108], [rx + 20, ry + 64], [rx - 20, ry + 64]], "#c47a3a", 7);  // the pound
};

/** a sack of flour, 260 x 320 */
export const flourBag = (p: Pen) => {
  p.poly([[40, 90], [220, 90], [236, 300], [24, 300]], "#f1ead8", 9);
  p.poly([[60, 40], [200, 40], [220, 92], [40, 92]], "#e5dcc6", 8);
  p.stroke([[70, 70], [190, 70]], 5, "rgba(36,23,38,0.4)");
  p.ell(130, 190, 50, 44, "#e8c45a", 6);
  for (const [x, y] of [[112, 180], [146, 176], [128, 206]] as const) p.ell(x, y, 10, 16, "#c9853a", 3);
  p.ell(130, 30, 60, 14, "#ffffff", 0);
};

/** a kitchen scale with a bowl of flour and a dial, 300 x 300; needle 0..1 */
export const kscale = (p: Pen, needle: number) => {
  p.poly([[40, 170], [260, 170], [270, 280], [30, 280]], "#e2453c", 9);
  p.ell(150, 225, 44, 44, "#f4f1ea", 6);
  const a = Math.PI * (1.2 + 0.6 * cl(needle));
  p.line([[150, 225], [150 + 34 * Math.cos(a), 225 + 34 * Math.sin(a)]], INK, 6);
  p.ell(150, 160, 120, 18, "#c9ccd2", 7);
  p.poly([[50, 120], [250, 120], [220, 165], [80, 165]], "#9fc7e8", 8);
  const h = lerp(4, 46, cl(needle));
  p.ell(150, 120 - h * 0.2, 96, 10 + h * 0.4, "#fbf8f1", 5);
};

/** a cake on a plate, 420 x 380; h 1 = a proper tall cake, 0.35 = a flat sad one */
export const cake = (p: Pen, h: number) => {
  p.ell(210, 340, 190, 26, "#f4f1ea", 8);
  const top = lerp(330, 80, cl(h));
  p.poly([[60, 330], [360, 330], [360, top], [60, top]], "#e9b26a", 9);
  p.ell(210, top, 150, 26, "#fbe6ee", 8);
  if (h > 0.6) {
    p.poly([[60, top + 70], [360, top + 70], [360, top + 90], [60, top + 90]], "#f6c6d6", 0);
    p.ell(210, top - 30, 14, 14, "#c0353a", 5);
    p.line([[210, top - 44], [218, top - 70]], "#5d7a3a", 5);
  } else {
    for (const x of [100, 180, 280]) p.poly([[x, top + 10], [x + 16, top + 10], [x + 8, top + 40]], "#fbe6ee", 4);
  }
};

/** a kid's bicycle, side view, 420 x 260 */
export const bike = (p: Pen, col = "#3f9fd5") => {
  p.ell(100, 180, 70, 70, null, 9); p.ell(320, 180, 70, 70, null, 9);
  p.ell(100, 180, 8, 8, INK, 0); p.ell(320, 180, 8, 8, INK, 0);
  p.line([[100, 180], [190, 100], [300, 100], [320, 180]], col, 12);
  p.line([[190, 100], [210, 180], [300, 100]], col, 12);
  p.line([[180, 80], [210, 80]], "#2a2d33", 12);
  p.line([[300, 100], [296, 60], [320, 54]], "#2a2d33", 9);
};

/** a chequered flag on a stick, 300 x 300; wave 0..1 */
export const checkFlag = (p: Pen, wave: number) => {
  p.line([[60, 290], [60, 20]], "#8a5a3c", 10);
  const yOf = (u: number, v: number) => 30 + v * 150 + 18 * Math.sin(u * 5 + wave * Math.PI * 2) * u;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    const u0 = i / 6, u1 = (i + 1) / 6, v0 = j / 4, v1 = (j + 1) / 4;
    const x0 = 64 + u0 * 220, x1 = 64 + u1 * 220;
    p.poly([[x0, yOf(u0, v0)], [x1, yOf(u1, v0)], [x1, yOf(u1, v1)], [x0, yOf(u0, v1)]], (i + j) % 2 ? "#1d1a22" : "#ffffff", 0);
  }
  p.poly([[64, yOf(0, 0)], [284, yOf(1, 0)], [284, yOf(1, 1)], [64, yOf(0, 1)]], null, 7);
};

/** a big sticking plaster, 420 x 200 */
export const plaster = (p: Pen) => {
  p.poly([[30, 60], [390, 40], [400, 150], [40, 170]], "#f0c79a", 9);
  p.poly([[150, 52], [270, 46], [278, 154], [158, 160]], "#e2a978", 6);
  for (const [x, y] of [[60, 90], [80, 130], [330, 80], [352, 120], [110, 110], [306, 104]] as const) p.dot(x, y, 4, "rgba(36,23,38,0.4)");
};

/** a wrench, 300 x 120 */
export const wrench = (p: Pen) => {
  p.poly([[60, 50], [250, 50], [250, 74], [60, 74]], "#9aa1ac", 7);
  p.poly([[230, 30], [290, 30], [290, 50], [262, 50], [262, 74], [290, 74], [290, 94], [230, 94]], "#9aa1ac", 7);
  p.ell(50, 62, 34, 34, "#9aa1ac", 7); p.ell(50, 62, 14, 14, "#dfe2e6", 4);
};

/** escape slide sparkle / dust puff stand-in: a soft dust cloud, 300 x 220 */
export const dust = (p: Pen, k: number) => {
  const g = p.g, a = 0.75 * (1 - cl(k));
  for (let i = 0; i < 7; i++) {
    g.fillStyle = `rgba(220,214,200,${a.toFixed(3)})`;
    g.beginPath(); g.ellipse(60 + i * 30, 150 - 40 * R(i, 2) - k * 30, 40 + k * 30, 30 + k * 20, 0, 0, 7); g.fill();
  }
};
export { INK };
