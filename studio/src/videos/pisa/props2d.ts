// Flat ink-outlined props for the Pisa short, drawn with the same Pen as the characters (plum ink, flat fills,
// soft shade on the side away from the light). Each function draws into its own canvas size, noted per prop.
import { Pen, INK } from "./toon";

type P2 = [number, number];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** sponge in two hands' grip, 400 x 300. squeeze 0 (full) .. 1 (squashed); wet 0..1 darkens it */
export const sponge = (p: Pen, squeeze: number, wet: number) => {
  const w = lerp(300, 330, squeeze), h = lerp(170, 70, squeeze), cx = 200, cy = 170;
  const col = wet > 0.5 ? "#d9b23a" : "#f2cf4a";
  const pts: P2[] = [[cx - w / 2, cy - h / 2 + 8], [cx - w / 4, cy - h / 2 - 4 * (1 - squeeze)], [cx + w / 4, cy - h / 2 + 2], [cx + w / 2, cy - h / 2 + 10],
    [cx + w / 2 - 6, cy + h / 2], [cx, cy + h / 2 + 6 * squeeze], [cx - w / 2 + 4, cy + h / 2]];
  p.poly(pts, col, 9);
  p.clip(pts, () => {
    const holes = [[-90, -30, 14], [-30, 20, 10], [40, -20, 16], [95, 15, 11], [-60, 30, 9], [10, -45, 8], [70, 40, 9], [-110, 10, 7]];
    for (const [x, y, r] of holes) p.ell(cx + x * (w / 300), cy + y * (h / 170), r, r * lerp(1, 0.5, squeeze), "#c99a1f", 0);
  });
  // thumbs pressing from the top
  for (const s of [-1, 1]) p.ell(cx + s * 70, cy - h / 2 - 4, 30, 22, "#ffe2c2", 8);
};

/** water drop, 120 x 160 */
export const drop = (p: Pen) => {
  p.poly([[60, 12], [92, 80], [96, 104], [86, 130], [60, 146], [34, 130], [24, 104], [28, 80]], "#7fb7e8", 8);
  p.ell(46, 100, 10, 18, "#d8ecfb", 0);
};

/** pigeon, 300 x 260; flap 0..1 (wings up .. folded) */
export const pigeon = (p: Pen, flap: number) => {
  const body = "#9aa1b4", wing = "#7e8599";
  p.poly([[60, 170], [120, 120], [200, 118], [236, 150], [210, 196], [120, 206], [70, 196]], body, 9);
  p.line([[150, 206], [146, 236]], "#e8875c", 6); p.line([[176, 204], [180, 236]], "#e8875c", 6);
  if (flap < 0.5) p.poly([[120, 130], [90, lerp(20, 90, flap * 2)], [190, lerp(40, 110, flap * 2)], [200, 128]], wing, 9);
  else p.poly([[110, 150], [170, 128], [214, 160], [160, 186]], wing, 8);
  p.ell(232, 108, 34, 32, "#8a91a6", 9);
  p.poly([[262, 104], [292, 112], [262, 120]], "#e8a24a", 6);
  p.dot(240, 100, 6);
  p.ell(222, 132, 16, 9, "#6fae8f", 0);
};

/** mason's tools dropped on the grass, 400 x 200: a mallet and a chisel */
export const tools = (p: Pen) => {
  p.band([[40, 150], [220, 110]], "#a8724a", 16, 6, "round");
  p.poly([[200, 70], [270, 56], [286, 130], [216, 144]], "#8a6a4a", 8);
  p.band([[250, 170], [360, 160]], "#9aa0a8", 12, 5, "round");
  p.poly([[356, 150], [384, 158], [356, 170]], "#c9ccd2", 5);
};

/** a bunch of bananas, 500 x 400: three fat crescents and a stem */
export const bananas = (p: Pen) => {
  for (let i = 0; i < 3; i++) {
    const cx = 250, cy = 60 + i * 40, pts: P2[] = [];
    for (let k = 0; k <= 20; k++) { const a = (Math.PI * (25 + 130 * k / 20)) / 180; pts.push([cx + 205 * Math.cos(a), cy + 250 * Math.sin(a)]); }
    for (let k = 20; k >= 0; k--) { const a = (Math.PI * (32 + 116 * k / 20)) / 180; pts.push([cx + 180 * Math.cos(a), cy - 10 + 190 * Math.sin(a)]); }
    p.poly(pts, ["#f2cf4a", "#ffd95a", "#f6d24e"][i], 10);
    p.dot(cx + 205 * Math.cos(Math.PI * 155 / 180) + 6, cy + 250 * Math.sin(Math.PI * 155 / 180), 9);
  }
  p.poly([[410, 150], [450, 120], [470, 140], [430, 175]], "#6d8a3a", 8);
};

/** oil lantern on a short pole, 160 x 300 */
export const lantern = (p: Pen) => {
  p.ell(80, 64, 26, 18, "#3a3d47", 7, 180, 360);
  p.poly([[50, 70], [110, 70], [104, 180], [56, 180]], "#ffe7a3", 8);
  p.ell(80, 130, 16, 26, "#ffb84a", 0);
  p.poly([[44, 180], [116, 180], [110, 200], [50, 200]], "#3a3d47", 7);
  p.arc(80, 50, 22, 26, 180, 360, 8);
};

/** hand drill rig: a driller's T-handle auger going into the ground, 260 x 520; spin 0..1 */
export const drill = (p: Pen, spin: number) => {
  p.band([[130, 70], [130, 500]], "#8c9098", 18, 6);
  for (let y = 300; y < 500; y += 34) p.stroke([[112, y + 10 * spin], [148, y + 24 + 10 * spin]], 6);
  const s = Math.cos(spin * Math.PI * 2);
  p.band([[130 - 100 * s, 70], [130 + 100 * s, 70]], "#a8724a", 20, 6, "round");
};

/** grey cement splat / blob, 400 x 260; grow 0..1 */
export const cement = (p: Pen, grow: number) => {
  const r = lerp(40, 1, 1 - grow) * 4;
  const pts: P2[] = [];
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, k = 1 + 0.18 * Math.sin(i * 2.7); pts.push([200 + Math.cos(a) * r * 1.6 * k, 150 + Math.sin(a) * r * 0.7 * k]); }
  p.poly(pts, "#a7a6a2", 8);
  p.ell(170, 135, r * 0.5, r * 0.18, "#c4c3bf", 0);
};

/** bucket of soil, 240 x 240 */
export const bucket = (p: Pen) => {
  p.arc(120, 70, 84, 70, 180, 360, 8);
  p.poly([[40, 80], [200, 80], [182, 220], [58, 220]], "#8f97a8", 9);
  p.ell(120, 80, 80, 18, "#6e4b33", 8);
  for (const [x, y, r] of [[96, 70, 16], [130, 66, 20], [156, 74, 12]]) p.ell(x, y, r, r * 0.7, "#7a553b", 6);
};

/** a dark drilled hole seen from above (flat on the ground), 128 x 128 */
export const hole = (p: Pen) => { p.ell(64, 64, 52, 52, "#3a2a24", 0); p.ell(64, 58, 40, 34, "#1e1614", 0); };

/** a tuft of long grass / weeds, 300 x 260; grow 0..1 */
export const weeds = (p: Pen, grow: number) => {
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 28, hgt = (120 + 90 * Math.sin(i * 1.7) ** 2) * grow, lean = (i - 4) * 9;
    p.poly([[x - 9, 250], [x + lean, 250 - hgt], [x + 9, 250]], i % 2 ? "#5aa83c" : "#4c9a37", 6);
  }
};

/** a pointing-up arrow-free "squish" burst of droplets around the sponge, 500 x 400; u 0..1 */
export const squirt = (p: Pen, u: number) => {
  for (let i = 0; i < 10; i++) {
    const a = Math.PI * (0.05 + 0.9 * (i / 9)), d = 60 + 170 * u, x = 250 + Math.cos(a) * d * 1.2, y = 260 - Math.sin(a) * d * 0.9 + 140 * u * u;
    const r = 16 * (1 - u * 0.6);
    p.poly([[x, y - r * 1.4], [x + r, y + r * 0.3], [x, y + r], [x - r, y + r * 0.3]], "#7fb7e8", 5);
  }
};

export { INK };
