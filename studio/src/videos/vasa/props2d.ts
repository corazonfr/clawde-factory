// Flat ink-outlined props for "The Warship That Sank Before It Left the Harbour", drawn with the same Pen as the
// characters (plum ink, flat fills). Each function draws into its own canvas size, noted per prop. No readable text.
import { Pen, INK } from "./toon";

type P2 = [number, number];
const cl = (x: number) => Math.max(0, Math.min(1, x));

/** a gust of wind, 800 x 400: three curly white streaks drawn in by k (0..1) */
export const gust = (p: Pen, k: number) => {
  for (let i = 0; i < 3; i++) {
    const y0 = 90 + i * 110, u = cl(k * 1.3 - i * 0.12);
    if (u <= 0) continue;
    const pts: P2[] = [];
    const n = Math.max(2, Math.round(40 * u));
    for (let j = 0; j <= n; j++) {
      const x = 20 + (j / 40) * 700, y = y0 + 22 * Math.sin(j * 0.32 + i);
      pts.push([x, y]);
    }
    if (u > 0.95) { // the curl at the end
      const [ex, ey] = pts[pts.length - 1];
      for (let a = 0; a <= 300; a += 20) pts.push([ex + 40 * Math.sin((a * Math.PI) / 180), ey - 40 + 40 * Math.cos((a * Math.PI) / 180)]);
    }
    p.line(pts, "#f4f8fb", 16);
  }
};

/** water gushing out and down, 300 x 500 (k 0..1 how far it reaches; ph flicker) */
export const gush = (p: Pen, k: number, ph: number) => {
  const len = 60 + 420 * cl(k), w = 70 + 10 * Math.sin(ph * 6.28);
  p.poly([[150 - w, 0], [150 + w, 0], [150 + w * 0.8 + 20, len * 0.6], [150 + w * 0.5, len], [150 - w * 0.5, len], [150 - w * 0.9, len * 0.5]], "#7fc4dd", 10);
  p.poly([[150 - w * 0.45, 10], [150 + w * 0.2, 10], [150 + w * 0.15, len * 0.7], [150 - w * 0.3, len * 0.6]], "#d8f1f8", 0);
  for (let i = 0; i < 3; i++) p.ell(150 + (i - 1) * 60 + 20 * Math.sin(ph * 6.28 + i), len - 10 + 10 * i, 26, 18, "#e9f7fb", 7);
};

/** a shipworm (a long pale worm with a little shell-tipped head), 600 x 240; the head is on the right */
export const worm = (p: Pen, ph: number, scared: boolean) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 24; i++) { const x = 40 + i * 19; pts.push([x, 130 + 26 * Math.sin(i * 0.5 + ph * 6.28)]); }
  p.line(pts, "#f1dcc8", 46);
  const [hx, hy] = pts[pts.length - 1];
  p.ell(hx + 14, hy, 40, 34, "#e9e2d2", 9);
  p.stroke([[hx + 2, hy - 30], [hx + 2, hy + 30]], 6);
  p.ell(hx + 26, hy - 8, scared ? 9 : 6, scared ? 11 : 7, INK, 0);
  if (scared) p.ell(hx + 30, hy + 14, 7, 9, INK, 0);
  else p.arc(hx + 28, hy + 6, 9, 6, 20, 160, 5);
};

/** a rising bubble, 120 x 120 */
export const bubble = (p: Pen) => {
  p.ell(60, 60, 44, 44, "rgba(210,240,250,0.55)", 7);
  p.arc(48, 48, 22, 18, 200, 280, 6, "#ffffff");
};

/** a splash ring on the water, 600 x 300, k 0..1 */
export const splash = (p: Pen, k: number) => {
  const n = 9, r = 60 + 200 * cl(k);
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.08 + (0.84 * i) / (n - 1)), h = (1 - cl(k)) * (120 + 60 * Math.sin(i * 2.1));
    const x = 300 - Math.cos(a) * r, y = 290 - Math.sin(a) * h;
    p.ell(x, y, 26 * (1 - 0.5 * cl(k)), 34 * (1 - 0.5 * cl(k)), "#e9f7fb", 7);
  }
};

/** a tiny sparkle, 200 x 200 */
export const twinkle = (p: Pen) => {
  p.poly([[100, 0], [118, 82], [200, 100], [118, 118], [100, 200], [82, 118], [0, 100], [82, 82]], "#fff6c8", 8);
};

export { INK };
