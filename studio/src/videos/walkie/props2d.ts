// Flat ink-outlined props for the Walkie-Scorchie short, drawn with the same Pen as the characters (plum ink, flat
// fills). Each function draws into its own canvas size, noted per prop. No readable text anywhere.
import { Pen, INK } from "./toon";

type P2 = [number, number];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cl = (x: number) => Math.max(0, Math.min(1, x));

/** car wing mirror seen from the side/front, 300 x 300; melt 0 (solid) .. 1 (drooped like cheese, dripping) */
export const mirror = (p: Pen, melt: number) => {
  const m = cl(melt), sag = 90 * m;
  // stalk from the door (left) to the housing
  p.poly([[20, 170], [80, 150 + sag * 0.3], [86, 190 + sag * 0.4], [20, 205]], "#3f7a52", 9);
  const pts: P2[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2, x = 165 + 95 * Math.cos(a), y0 = 150 + 62 * Math.sin(a);
    const below = Math.max(0, Math.sin(a));
    pts.push([x - 10 * m * below, y0 + sag * (0.35 + 0.65 * below) * (0.6 + 0.4 * Math.cos(a * 3) ** 2)]);
  }
  p.poly(pts, "#3f7a52", 10);
  // the glass, sliding off
  p.ell(170 + 6 * m, 150 + sag * 0.55, 66 - 10 * m, 38 + 10 * m, "#bcd8ee", 7);
  p.ell(150 + 6 * m, 138 + sag * 0.5, 22, 10, "#eef7ff", 0);
  // drips: thin tapering strings with a round drop at the end
  if (m > 0.35) for (const [x, k] of [[140, 1], [196, 0.6]] as const) {
    const y0 = 196 + sag * 0.95, L = (m - 0.35) * 90 * k;
    p.poly([[x - 8, y0 - 6], [x + 8, y0 - 6], [x + 2, y0 + L], [x - 2, y0 + L]], "#3f7a52", 5);
    p.ell(x, y0 + L + 8, 9, 11, "#3f7a52", 5);
  }
};

/** round car badge (a generic leaping-curve emblem, not a real logo), 240 x 300; melt 0..1 */
export const badge = (p: Pen, melt: number) => {
  const m = cl(melt);
  const pts: P2[] = [];
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2, below = Math.max(0, Math.sin(a));
    pts.push([120 + 80 * Math.cos(a) * (1 - 0.15 * m * below), 100 + 80 * Math.sin(a) + 70 * m * below * (0.5 + 0.5 * Math.cos(a * 4) ** 2)]);
  }
  p.poly(pts, "#c9ccd2", 9);
  p.ell(120, 100 + 20 * m, 56, 56 + 18 * m, "#8d949c", 6);
  p.line([[86, 120 + 22 * m], [112, 84 + 14 * m], [150, 96 + 16 * m]], "#eef0f4", 8, false);
  if (m > 0.35) for (const [x, k] of [[96, 1], [132, 1.5]] as const) {
    const L = (m - 0.35) * 110 * k, y = 175 + 50 * m;
    p.poly([[x - 8, y], [x + 8, y], [x + 5, y + L], [x, y + 10 + L], [x - 5, y + L]], "#c9ccd2", 6);
  }
};

/** wavy heat-shimmer lines rising, 400 x 400; phase 0..1 */
export const shimmer = (p: Pen, phase: number) => {
  for (let k = 0; k < 4; k++) {
    const x0 = 70 + k * 85, pts: P2[] = [];
    for (let i = 0; i <= 16; i++) { const y = 380 - i * 22; pts.push([x0 + 14 * Math.sin(i * 0.9 + phase * Math.PI * 2 + k), y]); }
    p.stroke(pts, 5, "rgba(255,246,214,0.32)");
  }
};

/** shop doormat seen from above (flat on the ground), 400 x 260; scorch 0..1 grows a burnt hole */
export const doormat = (p: Pen, scorch: number) => {
  p.poly([[20, 30], [380, 30], [380, 230], [20, 230]], "#9a6b3c", 8);
  p.poly([[44, 52], [356, 52], [356, 208], [44, 208]], null, 5);
  for (let y = 70; y < 200; y += 18) p.stroke([[56, y], [344, y]], 3, "rgba(70,40,25,0.4)");
  const s = cl(scorch);
  if (s > 0) {
    const pts: P2[] = [];
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, r = 85 * s * (1 + 0.25 * Math.sin(i * 2.3)); pts.push([210 + r * 1.3 * Math.cos(a), 135 + r * 0.8 * Math.sin(a)]); }
    p.poly(pts, "#3a2418", 0);
    p.ell(210, 135, 40 * s, 22 * s, "#1e1410", 0);
  }
};

/** a zigzag crack across paving slabs (flat on the ground), 400 x 400; grow 0..1 */
export const crack = (p: Pen, grow: number) => {
  const path: P2[] = [[30, 210], [90, 180], [130, 230], [190, 190], [240, 240], [300, 200], [370, 220]];
  const n = (path.length - 1) * cl(grow);
  const pts: P2[] = [path[0]];
  for (let i = 1; i <= Math.floor(n); i++) pts.push(path[i]);
  const f = n - Math.floor(n), i0 = Math.floor(n);
  if (i0 < path.length - 1 && f > 0) pts.push([lerp(path[i0][0], path[i0 + 1][0], f), lerp(path[i0][1], path[i0 + 1][1], f)]);
  if (pts.length > 1) p.stroke(pts, 9, INK);
  if (grow > 0.6) { p.stroke([[190, 190], [205, 130], [230, 100]], 6, INK); p.stroke([[240, 240], [255, 300]], 6, INK); }
};

/** frying pan seen from above-ish, 500 x 320; egg 0 (none) .. 1 (fried); handle to the left */
export const pan = (p: Pen, egg: number) => {
  p.band([[30, 180], [170, 165]], "#3a2a20", 26, 8, "round");
  p.ell(300, 165, 170, 110, "#3d414c", 10);
  p.ell(300, 160, 140, 86, "#2a2d33", 6);
  const e = cl(egg);
  if (e > 0) {
    const pts: P2[] = [];
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2, r = (60 + 14 * Math.sin(i * 1.9)) * (0.5 + 0.5 * e); pts.push([300 + r * 1.25 * Math.cos(a), 160 + r * 0.72 * Math.sin(a)]); }
    p.poly(pts, e > 0.6 ? "#fbfaf2" : "#f3f1e6", 6);
    p.ell(312, 152, 30, 22, "#f4b52c", 6);
    p.ell(304, 145, 9, 6, "#ffe08a", 0);
  }
};

/** a fork with a bite of egg, 160 x 300 */
export const fork = (p: Pen, bite: boolean) => {
  p.band([[80, 290], [80, 130]], "#c9ccd2", 14, 5, "round");
  p.poly([[50, 140], [110, 140], [110, 70], [50, 70]], "#c9ccd2", 6);
  for (const x of [56, 72, 88, 104]) p.band([[x, 72], [x, 18]], "#c9ccd2", 8, 4, "round");
  if (bite) { p.ell(80, 50, 40, 22, "#fbfaf2", 6); p.ell(86, 46, 14, 10, "#f4b52c", 4); }
};

/** street thermometer (no numbers), 160 x 520; level 0..1; pop 0..1 bursts the top */
export const thermo = (p: Pen, level: number, pop: number) => {
  p.poly([[40, 30], [120, 30], [120, 440], [40, 440]], "#f4f1ea", 8);
  for (let y = 80; y < 420; y += 34) p.stroke([[100, y], [116, y]], 4, INK);
  p.poly([[68, 60], [92, 60], [92, 430], [68, 430]], "#e6e2da", 5);
  const top = lerp(400, 62, cl(level));
  p.poly([[68, top], [92, top], [92, 450], [68, 450]], "#e2453c", 0);
  p.ell(80, 465, 34, 34, "#e2453c", 8);
  if (pop > 0) for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.35, d = 30 + 60 * pop;
    p.poly([[80 + Math.cos(a) * d, 50 + Math.sin(a) * d], [80 + Math.cos(a + 0.08) * (d + 26), 50 + Math.sin(a + 0.08) * (d + 26)], [80 + Math.cos(a - 0.08) * (d + 26), 50 + Math.sin(a - 0.08) * (d + 26)]], "#fff3b0", 4);
  }
};

/** a folded newspaper lying flat (no readable text: a cartoon picture of a tower with flames, scribble columns), 600 x 400 */
export const newspaper = (p: Pen) => {
  p.poly([[20, 30], [580, 20], [585, 380], [15, 372]], "#f3efe2", 8);
  p.poly([[40, 50], [560, 42], [560, 96], [40, 102]], "#2a2d33", 0); // masthead block (solid, no letters)
  // the picture: a bulging tower with a flame on top
  p.poly([[70, 340], [70, 140], [110, 120], [210, 120], [250, 140], [250, 340]], "#c9d8ea", 6);
  for (let y = 150; y < 340; y += 22) p.stroke([[78, y], [242, y]], 2, "rgba(40,30,40,0.45)");
  p.poly([[120, 120], [140, 70], [160, 100], [180, 60], [200, 120]], "#f08a2c", 6);
  p.poly([[140, 120], [152, 92], [165, 110], [178, 88], [188, 120]], "#ffd95a", 0);
  // scribble columns
  for (let c = 0; c < 2; c++) for (let y = 130; y < 350; y += 18) p.stroke([[290 + c * 140, y], [400 + c * 140 - ((y * 7) % 30), y]], 4, "rgba(60,50,60,0.55)");
};

/** a chunky walkie-talkie handset (the building's nickname), 220 x 460 */
export const walkie = (p: Pen) => {
  p.band([[150, 120], [150, 20]], "#2a2d33", 16, 5, "round");
  p.poly([[40, 140], [180, 120], [190, 430], [50, 440]], "#3d414c", 9);
  p.poly([[64, 170], [162, 158], [164, 250], [66, 258]], "#9fc6a0", 6);
  for (let y = 290; y < 410; y += 26) p.stroke([[70, y], [160, y - 6]], 6, INK);
  p.ell(115, 140, 22, 10, "#e2453c", 5);
};

/** a cheque-like slip of paper (no text: lines and a squiggle signature), 420 x 200 */
export const cheque = (p: Pen) => {
  p.poly([[14, 20], [406, 14], [410, 186], [10, 182]], "#e9f0dc", 7);
  for (const [y, x1] of [[60, 300], [100, 380], [140, 250]] as const) p.stroke([[40, y], [x1, y]], 4, "rgba(60,80,60,0.55)");
  p.stroke([[270, 150], [300, 130], [320, 160], [350, 128], [380, 150]], 5, "#2f3a6a");
};

/** the architect's drawing of the tower with sunshade fins (flat on the table), 600 x 760; cut 0..1 snips the fins off */
export const drawing = (p: Pen, cut: number) => {
  p.poly([[20, 20], [580, 14], [586, 744], [14, 740]], "#f6f2e6", 8);
  for (let x = 60; x < 560; x += 40) p.stroke([[x, 30], [x, 730]], 1.5, "rgba(80,120,170,0.18)");
  for (let y = 60; y < 720; y += 40) p.stroke([[30, y], [570, y]], 1.5, "rgba(80,120,170,0.18)");
  // silhouette: the south side (left) flares out toward the top, the north side (right) leans a little
  const L = (y: number) => 250 - 150 * ((680 - y) / 560) ** 2, R = (y: number) => 380 + 40 * ((680 - y) / 560);
  const side: P2[] = [];
  for (let y = 680; y >= 110; y -= 15) side.push([L(y), y]);
  for (let y = 110; y <= 680; y += 15) side.push([R(y), y]);
  p.poly(side, "#dde8f4", 6);
  p.stroke([[60, 690], [540, 690]], 6, INK);
  for (let y = 140; y < 680; y += 24) p.stroke([[L(y) + 6, y], [R(y) - 6, y]], 1.5, "rgba(60,90,140,0.4)"); // floors
  // the fins: blue blades sticking out of the south side; snipped ones fall and fade
  const c = cl(cut);
  for (let y = 160; y < 660; y += 30) {
    const k = c > 0 ? c : 0, dy = 220 * k * k, dx = -60 * k;
    p.band([[L(y) - 38 + dx, y + dy], [L(y) + 2 + dx, y + 6 + dy]], k > 0.6 ? "#b9c6d6" : "#2f5f9a", 7, 2.5, "round");
  }
  if (c > 0.05) p.stroke([[L(150) - 50, 150], [L(150) - 20, 400], [L(660) - 10, 660]], 6, "#e2453c"); // the snip line
};

/** scissors seen from above, 360 x 220; open 0..1 */
export const scissors = (p: Pen, open: number) => {
  const a = 0.35 * cl(open);
  const blade = (s: number): P2[] => {
    const rot = (x: number, y: number): P2 => [180 + (x - 180) * Math.cos(s * a) - (y - 110) * Math.sin(s * a), 110 + (x - 180) * Math.sin(s * a) + (y - 110) * Math.cos(s * a)];
    return [rot(180, 104), rot(350, 110 - s * 4), rot(180, 118)];
  };
  p.poly(blade(1), "#c9ccd2", 6); p.poly(blade(-1), "#d9dde0", 6);
  for (const s of [-1, 1]) p.ell(110, 110 + s * (34 + 30 * a), 46, 30, "#e2453c", 8);
  p.dot(180, 110, 8);
};

/** a stack of gold coins, 240 x 200 */
export const coins = (p: Pen) => {
  for (let i = 0; i < 5; i++) p.ell(120 + (i % 2) * 6, 160 - i * 22, 80, 22, i % 2 ? "#e8c45a" : "#f2d36a", 7);
  p.ell(124, 70, 50, 12, "#fff0b0", 0);
};

/** a dessert spoon held at an angle, 200 x 420; glint 0..1 */
export const spoon = (p: Pen, glint: number) => {
  p.band([[100, 410], [100, 190]], "#c9ccd2", 18, 6, "round");
  p.ell(100, 120, 62, 92, "#d9dde0", 9);
  p.ell(100, 128, 44, 70, "#aab0ba", 0);
  p.ell(84, 100, 14, 26, "#f4f7fb", 0);
  if (glint > 0) { const r = 30 + 60 * glint; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.stroke([[100 + Math.cos(a) * 20, 120 + Math.sin(a) * 20], [100 + Math.cos(a) * r, 120 + Math.sin(a) * r]], 7, "#fff3b0"); } }
};

/** a melting scoop of ice cream on a cone (the kid holds the cone), 260 x 380; melt 0..1 */
export const icecream = (p: Pen, melt: number) => {
  const m = cl(melt);
  p.poly([[70, 170], [190, 170], [130, 370]], "#e0a35a", 8);
  for (let k = 0; k < 4; k++) p.stroke([[86 + k * 26, 176], [120 + k * 8, 300]], 3, "rgba(120,70,30,0.5)");
  const pts: P2[] = [];
  for (let i = 0; i <= 26; i++) {
    const a = Math.PI + (i / 26) * Math.PI, x = 130 + 76 * Math.cos(a), y = 172 + 80 * Math.sin(a) * (1 - 0.35 * m);
    pts.push([x, y]);
  }
  for (const [x, k] of [[190, 1.4], [160, 0.7], [118, 1.8], [80, 1.0]] as const) pts.push([x, 172 + 18 + 90 * m * k], [x - 18, 178]);
  p.poly(pts, "#f7c6d9", 8);
  p.ell(108, 130 + 20 * m, 18, 12, "#fde3ee", 0);
};

/** a hot white-yellow dot of focused light (soft card), 200 x 200 */
export const hotDot = (p: Pen) => {
  const g = p.g, gr = g.createRadialGradient(100, 100, 0, 100, 100, 100);
  gr.addColorStop(0, "rgba(255,255,240,1)"); gr.addColorStop(0.25, "rgba(255,240,170,0.9)"); gr.addColorStop(1, "rgba(255,200,80,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 200, 200);
};

/** a sweat drop, 120 x 160 */
export const sweat = (p: Pen) => {
  p.poly([[60, 10], [92, 80], [96, 104], [86, 130], [60, 146], [34, 130], [24, 104], [28, 80]], "#9fd0f2", 8);
  p.ell(46, 100, 10, 18, "#e2f2fc", 0);
};

/** a palm tree, 500 x 900 (trunk base at the bottom centre) */
export const palm = (p: Pen, sway: number) => {
  const top: P2 = [250 + 40 * sway, 170];
  const trunk: P2[] = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; trunk.push([lerp(250, top[0], t * t) - 16 + 4 * t, lerp(890, top[1], t)]); }
  for (let i = 12; i >= 0; i--) { const t = i / 12; trunk.push([lerp(250, top[0], t * t) + 16 - 4 * t, lerp(890, top[1], t)]); }
  p.poly(trunk, "#a8784a", 8);
  for (let i = 1; i < 12; i++) { const t = i / 12; const x = lerp(250, top[0], t * t), y = lerp(890, top[1], t); p.stroke([[x - 14, y], [x + 14, y - 6]], 4, "rgba(70,40,25,0.5)"); }
  for (let k = 0; k < 7; k++) {
    const a = Math.PI * (1.05 + (k / 6) * 0.9) + 0.1 * sway, L = 220 - Math.abs(k - 3) * 15;
    const tip: P2 = [top[0] + Math.cos(a) * L, top[1] + Math.sin(a) * L * 0.6 + (Math.abs(Math.cos(a)) * 90)];
    const mid: P2 = [(top[0] + tip[0]) / 2, (top[1] + tip[1]) / 2 - 40];
    p.poly([top, [mid[0], mid[1] - 22], tip, [mid[0], mid[1] + 18]], k % 2 ? "#4c9a37" : "#5aa83c", 7);
  }
  p.ell(top[0], top[1] + 6, 26, 20, "#7a553b", 6);
};

/** a stroke of sunlight / ray (soft, additive look on a plain card), 64 x 512 */
export const rayStreak = (p: Pen) => {
  const g = p.g, gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, "rgba(255,240,180,0)"); gr.addColorStop(0.5, "rgba(255,246,210,1)"); gr.addColorStop(1, "rgba(255,240,180,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 512);
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

export { INK };
