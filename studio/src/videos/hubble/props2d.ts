// Flat ink-outlined props for "The Space Telescope That Needed Glasses", drawn with the same Pen as the characters
// (plum ink, flat fills). Each function draws into its own canvas size, noted per prop. No readable text anywhere.
import { Pen, INK } from "./toon";

type P2 = [number, number];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cl = (x: number) => Math.max(0, Math.min(1, x));

/** a pair of round glasses, 600 x 240 (front view) */
export const glasses = (p: Pen) => {
  p.ell(150, 130, 112, 92, "rgba(190,225,255,0.35)", 16);
  p.ell(450, 130, 112, 92, "rgba(190,225,255,0.35)", 16);
  p.stroke([[262, 118], [300, 100], [338, 118]], 16);
  p.stroke([[38, 112], [6, 96]], 14); p.stroke([[562, 112], [594, 96]], 14);
  p.arc(120, 100, 50, 38, 200, 260, 8, "#ffffff"); p.arc(420, 100, 50, 38, 200, 260, 8, "#ffffff");
};

/** one human hair, 600 x 120: a long wavy dark strand */
export const hair = (p: Pen) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 40; i++) { const x = 10 + i * 14.5; pts.push([x, 60 + 18 * Math.sin(i * 0.5) + 8 * Math.sin(i * 1.3)]); }
  p.line(pts, "#2a201a", 5);
};

/** the focus diagram, 800 x 600: a lens on the left, rays from its edge and its middle. k 0..1 draws the rays in;
 *  fixed = 0 the edge rays meet nearer than the middle rays (two focus points, a smudge); 1 = they all meet at one point */
export const rays = (p: Pen, k: number, fixed: number) => {
  p.poly([[0, 0], [800, 0], [800, 600], [0, 600]], "#f7f4ec", 14);
  // the lens (a mirror-ish curve)
  p.ell(130, 300, 34, 230, "#bfe3f5", 10);
  const fMid = 640, fEdge = lerp(470, 640, cl(fixed));
  const n = 5;
  for (let i = 0; i < n; i++) {
    const y0 = lerp(110, 490, i / (n - 1)), edge = i === 0 || i === n - 1;
    const fx = edge ? fEdge : fMid, col = edge ? "#e2453c" : "#e8a92a";
    const u = cl(k * 1.4 - i * 0.08);
    if (u <= 0) continue;
    // in from the left, then bent toward the focus and past it
    const a: P2 = [20, y0], b: P2 = [140, y0];
    const past = 780, yEnd = 300 + (300 - y0) * ((past - fx) / (fx - 140));
    const c: P2 = [past, yEnd];
    const seg1 = cl(u * 2), seg2 = cl(u * 2 - 1);
    p.line([a, [lerp(a[0], b[0], seg1), y0]], col, 9);
    if (seg2 > 0) p.line([b, [lerp(b[0], c[0], seg2), lerp(y0, c[1], seg2)]], col, 9);
  }
  if (k > 0.9) {
    if (fixed > 0.5) p.dot(fMid, 300, 16, "#e2453c");
    else { p.dot(fEdge, 300, 13, "#e2453c"); p.dot(fMid, 300, 13, "#e8a92a"); }
  }
};

/** a round control knob seen face-on, 240 x 240 (rot is applied by the card) */
export const knob = (p: Pen) => {
  p.ell(120, 120, 100, 100, "#3d414c", 10);
  p.ell(120, 120, 66, 66, "#c9ccd2", 8);
  p.stroke([[120, 120], [120, 40]], 14, "#e2453c");
};

/** a polishing pad on a handle, 300 x 300 */
export const polisher = (p: Pen) => {
  p.stroke([[150, 30], [150, 170]], 16, "#8a6a3a");
  p.ell(150, 200, 110, 52, "#e9e2d2", 10);
  p.ell(150, 192, 80, 30, "#f4f1ea", 0);
};

/** rocket flame, 300 x 600 (flicker 0..1) */
export const flame = (p: Pen, flicker: number) => {
  const w = 1 + 0.12 * Math.sin(flicker * 6.28);
  p.poly([[150 - 110 * w, 0], [150 + 110 * w, 0], [150 + 60 * w, 300], [150, 590], [150 - 60 * w, 300]], "#ffb43a", 10);
  p.poly([[150 - 60 * w, 0], [150 + 60 * w, 0], [150 + 30, 220], [150, 380], [150 - 30, 220]], "#fff3b0", 0);
};

/** a tiny "sparkle" on the sharp galaxy / new glasses, 200 x 200 */
export const twinkle = (p: Pen) => {
  p.poly([[100, 0], [118, 82], [200, 100], [118, 118], [100, 200], [82, 118], [0, 100], [82, 82]], "#fff6c8", 8);
};

export { INK };
