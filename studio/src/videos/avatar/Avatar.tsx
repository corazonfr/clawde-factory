// Channel avatar (1080 x 1080, one frame) in the shorts' own style: our bean-head mascot (toon.ts Pen + bodyFront,
// plum ink, flat fills) holding a magnifying glass that focuses a sunbeam to a hot dot, over a saturated sunburst sky
// with ink-outlined landmarks from the stories (a leaning tower, an iron bridge, a curved glass tower). No text.
// Everything that matters sits inside the centred circle (profile pictures are cropped round).
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { Pen, bodyFront, INK, Outfit } from "../walkie/toon";

const S = 1080;
type P2 = [number, number];

const MASCOT: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#3a2a20", hat: "hair", hair: "#5a3b2a", buttons: "#ffe08a" };

const sky = (g: CanvasRenderingContext2D) => {
  const gr = g.createRadialGradient(S / 2, S * 0.42, 40, S / 2, S * 0.5, S * 0.75);
  gr.addColorStop(0, "#9cc8f2"); gr.addColorStop(0.55, "#4f8cdb"); gr.addColorStop(1, "#2f63b8");
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  // sunburst: soft alternating rays from behind the mascot's head
  g.save(); g.translate(S / 2, S * 0.4);
  for (let i = 0; i < 18; i++) {
    g.rotate((Math.PI * 2) / 18);
    g.fillStyle = i % 2 ? "rgba(255,255,255,0.10)" : "rgba(255,240,200,0.06)";
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-90, -900); g.lineTo(90, -900); g.closePath(); g.fill();
  }
  g.restore();
};

const landmarks = (p: Pen) => {
  const base = 905, ground = "#6aab4f";
  // a curved glass tower (right), with fins
  const L = (y: number) => 760 - 70 * ((base - y) / 420) ** 2, R = (y: number) => 900 + 20 * ((base - y) / 420);
  const tw: P2[] = [];
  for (let y = base; y >= 485; y -= 15) tw.push([L(y), y]);
  for (let y = 485; y <= base; y += 15) tw.push([R(y), y]);
  p.poly(tw, "#8fb3dd", 9);
  for (let y = 520; y < base; y += 26) p.stroke([[L(y) + 8, y], [R(y) - 8, y]], 3, "rgba(36,23,38,0.35)");
  p.ell(L(560) + 50, 560, 22, 22, "#fffbe6", 0);
  // a leaning stone tower (left)
  p.rot = [(-5 * Math.PI) / 180, 250, base];
  p.poly([[180, base], [180, 560], [320, 560], [320, base]], "#efe7d6", 9);
  for (let y = 600; y < base; y += 55) { p.stroke([[180, y], [320, y]], 5, INK); for (let x = 200; x < 320; x += 28) p.ell(x + 6, y + 26, 7, 14, "#4a3c44", 0); }
  p.poly([[195, 560], [305, 560], [290, 520], [210, 520]], "#efe7d6", 8);
  p.rot = null;
  // grass hill
  p.poly([[0, 905], [200, 880], [540, 870], [880, 880], [1080, 900], [1080, 1080], [0, 1080]], ground, 10);
};

/** magnifying glass held up by the mascot's raised hand; the lens focuses a beam to a smoking hot dot */
const magnifier = (p: Pen, hand: P2, dot: P2) => {
  const lens: P2 = [hand[0] + 60, hand[1] - 100], r = 68;
  // the focused beam: a soft cone from the lens down to a hot dot on the grass
  const g = p.g;
  g.save();
  const gr = g.createLinearGradient(lens[0], lens[1], dot[0], dot[1]);
  gr.addColorStop(0, "rgba(255,246,190,0.35)"); gr.addColorStop(1, "rgba(255,226,120,0.85)");
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(lens[0] - r * 0.85, lens[1] + 20); g.lineTo(lens[0] + r * 0.85, lens[1] + 20); g.lineTo(dot[0] + 6, dot[1]); g.lineTo(dot[0] - 6, dot[1]); g.closePath(); g.fill();
  g.restore();
  for (const [dx, dy, rr] of [[14, -30, 12], [30, -52, 15], [22, -78, 18]]) p.ell(dot[0] + dx, dot[1] + dy, rr, rr * 0.8, "rgba(240,232,220,0.85)", 0);
  p.ell(dot[0], dot[1], 26, 9, "#fff3b0", 5);
  p.ell(dot[0], dot[1], 12, 4, "#ffffff", 0);
  // handle and lens
  p.band([[hand[0] - 4, hand[1] + 22], [lens[0] - r * 0.62, lens[1] + r * 0.62]], "#7a4b2a", 18, 6, "round");
  p.ell(lens[0], lens[1], r, r, "#cfe6fa", 12);
  p.ell(lens[0] - 20, lens[1] - 22, 22, 12, "#ffffff", 0, 0, 360, -35);
  p.dot(hand[0], hand[1], 13);
};

export const Avatar: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    sky(g);
    const p = new Pen(g);
    landmarks(p);
    // the mascot: design space 600 x 1000 (soles at 975), scaled so the head and chest fill the circle
    const k = 1.62, tx = S / 2 - 300 * k - 40, ty = 470 - 309 * k;
    g.setTransform(k, 0, 0, k, tx, ty);
    bodyFront(p, MASCOT, { mode: "stand", expr: "grin", wave: 1, seed: 3, light: (-120 * Math.PI) / 180 });
    // raised right hand (bodyFront's wave arm end), in design space
    magnifier(p, [471, 314], [(900 - tx) / k, (850 - ty) / k]);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }, []); // drawn synchronously before the frame is captured
  return (
    <AbsoluteFill style={{ background: "#2f63b8" }}>
      <canvas ref={ref} width={S} height={S} style={{ width: S, height: S }} />
    </AbsoluteFill>
  );
};
