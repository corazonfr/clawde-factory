// Channel banner (2560 x 1440, one frame), same kit as the avatar and the shorts: plum ink, flat fills, bean-head cast.
// YouTube shows the whole image only on TVs; desktop shows a 2560 x 423 strip, phones the centre 1546 x 423. So the
// stories live inside the centre safe area (x 507..2053, y 508..931): the leaning tower, the suspension bridge with
// soldiers marching in step, our mascot with his magnifying glass, and the curved glass tower melting a car. The rest
// is sky, clouds and a hazy city skyline. No text.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { Pen, bodyFront, INK, Outfit, RIFLEMAN, OFFICER, FrontOpts } from "../walkie/toon";

const BW = 2560, BH = 1440;
const SAFE = { x0: 507, x1: 2053, y0: 508, y1: 931 };
type P2 = [number, number];
const MASCOT: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#3a2a20", hat: "hair", hair: "#5a3b2a", buttons: "#ffe08a" };
const GROUND = 892;

const skyAndBurst = (g: CanvasRenderingContext2D) => {
  const gr = g.createLinearGradient(0, 0, 0, BH);
  gr.addColorStop(0, "#2f63b8"); gr.addColorStop(0.45, "#4f8cdb"); gr.addColorStop(0.62, "#9cc8f2"); gr.addColorStop(1, "#b8d0ec");
  g.fillStyle = gr; g.fillRect(0, 0, BW, BH);
  g.save(); g.translate(1280, 700);
  for (let i = 0; i < 28; i++) {
    g.rotate((Math.PI * 2) / 28);
    g.fillStyle = i % 2 ? "rgba(255,255,255,0.09)" : "rgba(255,240,200,0.05)";
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-150, -2200); g.lineTo(150, -2200); g.closePath(); g.fill();
  }
  g.restore();
};

const cloud = (p: Pen, x: number, y: number, s: number) => {
  for (const [dx, dy, r] of [[-110, 10, 60], [-40, -30, 80], [50, -20, 72], [120, 12, 55], [0, 20, 70]]) p.ell(x + dx * s, y + dy * s, r * s, r * 0.8 * s, "#ffffff", 0);
  p.ell(x, y + 40 * s, 190 * s, 32 * s, "#ffffff", 0);
};

/** hazy far skyline along the horizon, full width */
const skyline = (p: Pen) => {
  let x = -20, k = 0;
  while (x < BW + 40) {
    const w = 60 + ((k * 37) % 70), h = 70 + ((k * 53) % 150);
    p.poly([[x, GROUND + 10], [x, GROUND - h], [x + w, GROUND - h], [x + w, GROUND + 10]], k % 3 ? "#a8bcd6" : "#9fb3cf", 0);
    x += w + 6; k++;
  }
};

const leaningTower = (p: Pen, cx: number, base: number, h: number, w: number) => {
  p.rot = [(-5 * Math.PI) / 180, cx, base];
  const x0 = cx - w / 2, x1 = cx + w / 2, top = base - h, lv = 6, lh = h / lv;
  p.poly([[x0, base], [x0, top], [x1, top], [x1, base]], "#efe7d6", 8);
  for (let i = 1; i < lv; i++) {
    const y = top + i * lh;
    p.stroke([[x0, y], [x1, y]], 4, INK);
    for (let x = x0 + 16; x < x1 - 8; x += 24) p.ell(x + 4, y - lh / 2, 6, lh * 0.28, "#4a3c44", 0);
  }
  p.poly([[x0 + 14, top], [x1 - 14, top], [x1 - 26, top - 34], [x0 + 26, top - 34]], "#efe7d6", 7);
  p.rot = null;
};

const glassTower = (p: Pen, x0: number, base: number, h: number, w: number) => {
  const L = (y: number) => x0 - 0.28 * w * ((base - y) / h) ** 2, R = (y: number) => x0 + w + 0.08 * w * ((base - y) / h);
  const pts: P2[] = [];
  for (let y = base; y >= base - h; y -= 10) pts.push([L(y), y]);
  for (let y = base - h; y <= base; y += 10) pts.push([R(y), y]);
  p.poly(pts, "#8fb3dd", 8);
  for (let y = base - h + 14; y < base; y += 16) p.stroke([[L(y) + 6, y], [R(y) - 6, y]], 2.5, "rgba(36,23,38,0.35)");
  for (let y = base - h + 40; y < base - 30; y += 32) p.band([[L(y) - 16, y], [L(y) + 4, y + 3]], "#e6eaf0", 5, 2, "round"); // the fins
  return { L, R };
};

const bridge = (p: Pen, x0: number, x1: number, deck: number) => {
  const pyl = (x: number) => { p.poly([[x - 22, GROUND], [x - 22, deck - 120], [x + 22, deck - 120], [x + 22, GROUND]], "#d9cbb3", 7); p.poly([[x - 30, deck - 120], [x + 30, deck - 120], [x + 22, deck - 140], [x - 22, deck - 140]], "#cbbba0", 6); };
  pyl(x0); pyl(x1);
  const chain: P2[] = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24, x = x0 + (x1 - x0) * u; chain.push([x, deck - 112 + 100 * 4 * u * (1 - u)]); }
  for (let i = 2; i < 23; i += 2) p.stroke([[chain[i][0], chain[i][1]], [chain[i][0], deck]], 3, "#3d414c");
  p.stroke(chain, 8, "#3d414c");
  p.poly([[x0 - 40, deck], [x1 + 40, deck], [x1 + 40, deck + 16], [x0 - 40, deck + 16]], "#a8724a", 6);
};

const car = (p: Pen, x: number, y: number, s: number, melt: number) => {
  p.poly([[x, y], [x, y - 34 * s], [x + 40 * s, y - 38 * s], [x + 70 * s, y - 66 * s], [x + 150 * s, y - 66 * s], [x + 180 * s, y - 38 * s], [x + 230 * s, y - 34 * s], [x + 230 * s, y]], "#3f7a52", 7);
  p.poly([[x + 78 * s, y - 60 * s], [x + 110 * s, y - 60 * s], [x + 110 * s, y - 40 * s], [x + 58 * s, y - 40 * s]], "#bcd8ee", 4);
  p.poly([[x + 118 * s, y - 60 * s], [x + 146 * s, y - 60 * s], [x + 168 * s, y - 40 * s], [x + 118 * s, y - 40 * s]], "#bcd8ee", 4);
  for (const wx of [x + 48 * s, x + 182 * s]) { p.ell(wx, y, 22 * s, 22 * s, "#26252b", 6); p.ell(wx, y, 9 * s, 9 * s, "#c9ccd2", 0); }
  // the drooping wing mirror
  p.poly([[x + 64 * s, y - 42 * s], [x + 50 * s, y - 46 * s], [x + 46 * s, y - 30 * s + 14 * melt * s], [x + 60 * s, y - 26 * s + 18 * melt * s]], "#3f7a52", 5);
};

/** a full-height character: sole at (x, sole), about hpx tall */
const person = (g: CanvasRenderingContext2D, p: Pen, o: Outfit, opts: FrontOpts, x: number, sole: number, hpx: number) => {
  const k = hpx / 777, tx = x - 300 * k, ty = sole - 975 * k;
  g.setTransform(k, 0, 0, k, tx, ty);
  bodyFront(p, o, opts);
  return { k, tx, ty };
};

const beam = (g: CanvasRenderingContext2D, from: P2[], to: P2, a = 0.55) => {
  const gr = g.createLinearGradient(from[0][0], from[0][1], to[0], to[1]);
  gr.addColorStop(0, `rgba(255,246,190,${a * 0.5})`); gr.addColorStop(1, `rgba(255,226,120,${a})`);
  g.fillStyle = gr; g.beginPath(); g.moveTo(...from[0]); g.lineTo(...from[1]); g.lineTo(to[0] + 5, to[1]); g.lineTo(to[0] - 5, to[1]); g.closePath(); g.fill();
};
const hotSpot = (p: Pen, x: number, y: number, s = 1) => {
  for (const [dx, dy, r] of [[10, -24, 10], [24, -44, 13], [16, -66, 16]]) p.ell(x + dx * s, y + dy * s, r * s, r * 0.8 * s, "rgba(240,232,220,0.85)", 0);
  p.ell(x, y, 30 * s, 9 * s, "#fff3b0", 5); p.ell(x, y, 13 * s, 4 * s, "#ffffff", 0);
};

export const Banner: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    const p = new Pen(g);
    skyAndBurst(g);
    for (const [x, y, s] of [[230, 260, 1.4], [820, 180, 1.0], [1720, 230, 1.2], [2330, 330, 1.5], [420, 1180, 1.1], [2180, 1220, 1.0], [1260, 330, 0.8], [2050, 560, 0.7], [560, 600, 0.75]] as const) cloud(p, x, y, s);
    skyline(p);
    // ---- the stories, inside the safe area ----
    leaningTower(p, 640, GROUND, 330, 130);
    bridge(p, 780, 1060, 820);
    for (let i = 0; i < 4; i++) // soldiers marching in step over the bridge
      person(g, p, i === 0 ? OFFICER : { ...RIFLEMAN }, { mode: "march", phase: 0.25, expr: "stern", seed: 2 + i }, 830 + i * 62, 820, 118);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const T = glassTower(p, 1810, GROUND, 360, 150);
    const carX = 1580;
    // the reflected beam from the curved face down onto the car
    beam(g, [[T.L(GROUND - 260) - 4, GROUND - 260], [T.L(GROUND - 150) - 4, GROUND - 150]], [carX + 70, GROUND - 52], 0.5);
    car(p, carX, GROUND - 6, 0.95, 1);
    hotSpot(p, carX + 70, GROUND - 52, 1.1);
    // hills
    p.poly([[-20, GROUND], [500, GROUND - 14], [1280, GROUND - 22], [2060, GROUND - 14], [BW + 20, GROUND], [BW + 20, BH + 20], [-20, BH + 20]], "#6aab4f", 10);
    p.poly([[-20, 1060], [700, 1020], [1500, 1050], [BW + 20, 1010], [BW + 20, BH + 20], [-20, BH + 20]], "#5aa83c", 0);
    // the mascot, centre, with his magnifying glass focusing the sun on the grass
    const m = person(g, p, MASCOT, { mode: "stand", expr: "grin", wave: 1, seed: 3 }, 1280, GROUND - 18, 340);
    const hand: P2 = [m.tx + 471 * m.k, m.ty + 314 * m.k], lens: P2 = [hand[0] + 30, hand[1] - 40], r = 33;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const dot: P2 = [lens[0] + 70, GROUND - 22];
    beam(g, [[lens[0] - r * 0.8, lens[1] + 12], [lens[0] + r * 0.8, lens[1] + 12]], dot, 0.75);
    hotSpot(p, dot[0], dot[1], 0.9);
    p.band([[hand[0] - 2, hand[1] + 12], [lens[0] - r * 0.62, lens[1] + r * 0.62]], "#7a4b2a", 10, 3.5, "round");
    p.ell(lens[0], lens[1], r, r, "#cfe6fa", 7);
    p.ell(lens[0] - 11, lens[1] - 12, 11, 6, "#ffffff", 0, 0, 360, -35);
    p.dot(hand[0], hand[1], 7);
    void SAFE;
  }, []);
  return (
    <AbsoluteFill style={{ background: "#2f63b8" }}>
      <canvas ref={ref} width={BW} height={BH} style={{ width: BW, height: BH }} />
    </AbsoluteFill>
  );
};
