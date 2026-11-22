// The Walkie-Scorchie world as one three.js scene: sky, a City of London street (asphalt, paving, kerbs, stone office
// blocks with painted facades, a shopfront, lamp posts, plane trees, a flat-glass office, a distant skyline), the
// curved glass tower with its concave south face, the 2014 sunshade fins and a tower crane, a parked car, the hot
// spot and the reflected light rays, plus two far-away sets: a park (x = PARK_X) and a Las Vegas pool deck with a
// curved hotel (x = VEGAS_X). update(id, f, camera) poses everything for shot `id` at frame f.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, Ray, prop, setSight, quad } from "./build";
import { rep, ctex, cloudHD, rng, stoneHD, jit } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, ShotDef, TH, FLOORS, halfW, frontZ, backZ, facePt, SPOT, SPOT_V, CAR, PARK_X, VEGAS_X, TABLE, LAMP,
  gloomAt, spotAt, finsAt, raysAt, smooth, clamp01, V3,
} from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // all props are procedural; no GLB files

// ---------------- painted textures ----------------
const asphaltTex = () => ctex("asphalt", 1024, 1024, (g, r) => {
  g.fillStyle = "#5b5d66"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)"; g.fillRect(r() * 1024, r() * 1024, 2 + r() * 4, 2 + r() * 4); }
  for (let i = 0; i < 9; i++) { g.strokeStyle = "rgba(30,30,40,0.25)"; g.lineWidth = 3; g.beginPath(); let x = r() * 1024, y = r() * 1024; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 90; y += (r() - 0.5) * 90; g.lineTo(x, y); } g.stroke(); }
});
/** York-stone paving slabs, 0.9 x 0.6 m, one tile = 3.6 x 3.6 m */
const pavingTex = () => ctex("paving", 1024, 1024, (g, r) => {
  g.fillStyle = "#8c867c"; g.fillRect(0, 0, 1024, 1024);
  const sw = 1024 / 4, sh = 1024 / 6;
  for (let row = 0; row < 6; row++) for (let c = -1; c < 5; c++) {
    const x = c * sw + (row % 2) * sw * 0.5;
    g.fillStyle = jit(r, ["#c9c1b2", "#bfb6a6", "#d2cabb", "#b9b0a1"][Math.floor(r() * 4)], 0.06, 4, 0.2);
    g.fillRect(x + 4, row * sh + 4, sw - 8, sh - 8);
    for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(90,80,70,0.08)"; g.beginPath(); g.ellipse(x + r() * sw, row * sh + r() * sh, 10 + r() * 30, 6 + r() * 16, 0, 0, 7); g.fill(); }
  }
});
/** curtain wall: 4 panes (6 m) x 1 floor (TH / FLOORS m) per tile, slab band at the top of each floor */
const FLOOR_H = TH / FLOORS, PANE_W = 6;
const glassTex = (key: string, hi: string, lo: string, mull = "#3a4152", slab = "#d9dee6") => ctex(key, 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, hi); gr.addColorStop(1, lo);
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.08})`; g.fillRect(i * 128 + 10, 60, 40 + r() * 40, 400); } // soft reflections
  g.fillStyle = slab; g.fillRect(0, 0, 512, 70);
  g.fillStyle = "rgba(40,40,55,0.35)"; g.fillRect(0, 66, 512, 6);
  g.fillStyle = mull; for (let i = 0; i < 4; i++) g.fillRect(i * 128, 0, 9, 512);
});
const flatGlassTex = () => ctex("flatGlass", 512, 512, (g) => {
  g.fillStyle = "#7f9fc6"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(40, 0, 120, 512);
  g.fillStyle = "#2f3646"; for (let i = 0; i < 4; i++) g.fillRect(i * 128, 0, 10, 512);
  g.fillStyle = "#d7d2c8"; g.fillRect(0, 0, 512, 60);
});
const shopTex = () => ctex("shopFront", 1024, 512, (g) => {
  g.fillStyle = "#2f5f6a"; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "#1f3f48"; g.fillRect(0, 0, 1024, 90);                   // fascia (no lettering)
  g.fillStyle = "#e8c45a"; g.fillRect(20, 30, 984, 8); g.fillRect(20, 62, 984, 8);
  g.fillStyle = "#a9c6dc"; g.fillRect(60, 130, 560, 330);               // display window
  g.fillStyle = "rgba(255,255,255,0.22)"; g.fillRect(90, 140, 90, 310);
  g.strokeStyle = "#1f3f48"; g.lineWidth = 14; g.strokeRect(60, 130, 560, 330);
  g.fillStyle = "#e9e2d2"; for (let i = 0; i < 5; i++) g.fillRect(110 + i * 100, 360, 60, 90); // goods on shelves
  g.fillStyle = "#c25a7a"; for (let i = 0; i < 5; i++) g.fillRect(110 + i * 100, 260, 60, 70);
  g.fillStyle = "#4a3426"; g.fillRect(700, 120, 220, 392);              // door
  g.fillStyle = "#a9c6dc"; g.fillRect(730, 150, 160, 180);
  g.fillStyle = "#e8c45a"; g.beginPath(); g.arc(880, 360, 10, 0, 7); g.fill();
});
const latticeTex = () => ctex("lattice", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  g.strokeStyle = "#e9b52c"; g.lineWidth = 22; g.strokeRect(11, 0, 234, 256);
  g.lineWidth = 14; g.beginPath(); g.moveTo(11, 0); g.lineTo(245, 256); g.moveTo(245, 0); g.lineTo(11, 256); g.stroke();
});
const glowTex = () => ctex("spotGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.7)"); gr.addColorStop(0.7, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const rayTex = () => ctex("rayStreak", 64, 16, (g) => {
  const gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 16);
});
const waterTex = () => ctex("poolWater", 512, 512, (g, r) => {
  g.fillStyle = "#3cb6df"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 5;
  for (let i = 0; i < 26; i++) { const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 20, y - 12, x + 40, y + 12, x + 60, y); g.stroke(); }
});
const sandTex = () => ctex("sand", 512, 512, (g, r) => {
  g.fillStyle = "#e3c592"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.08)" : "rgba(120,80,40,0.08)"; g.fillRect(r() * 512, r() * 512, 3, 3); }
});
const deckTex = () => ctex("poolDeck", 512, 512, (g, r) => {
  g.fillStyle = "#b9ada0"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = jit(r, "#efe6d6", 0.04, 3, 0.2); g.fillRect(x * 128 + 3, y * 128 + 3, 122, 122); }
});
const grassTex = () => ctex("parkGrass", 512, 512, (g, r) => {
  g.fillStyle = "#6aab4f"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) { g.strokeStyle = r() < 0.5 ? "rgba(150,210,110,0.35)" : "rgba(40,100,40,0.3)"; g.lineWidth = 2; const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y - 8); g.stroke(); }
});

// ---------------- sky helpers ----------------
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
/** per-shot sun override, camera-relative degrees (lights.ts) */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 17: { az: 160, el: 50 }, 1: { az: 150, el: 40 }, 7: { az: 150, el: 40 }, 18: { az: 25, el: 9 }, 12: { az: 120, el: 45 } };
/** where the sun glints on the curved glass, per shot (HDR sprite), and its strength */
const GLINT: Record<number, [number, number]> = { 1: [0.62, 3], 7: [0.6, 4], 10: [0.65, 2], 12: [0.6, 2.5], 18: [0.7, 5] };

// ---------------- sight lines (blocks/trees in front of a street lens are left out) ----------------
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) {
    if (s.set !== "street") continue;
    for (let f = s.a - 8; f < s.b + 8; f += 3) {
      const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
      const fw = look.clone().sub(o), len = Math.min(fw.length() + 6, 70);
      fw.normalize();
      const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
      const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
      for (const [sx, sy] of [[0, 0], [-0.7, 0], [0.7, 0], [0, 0.7], [0, -0.5], [-0.7, -0.5], [0.7, -0.5]])
        out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
    }
  }
  return out;
};
let RAYS: Ray[] = [];
const blocked = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
  for (const { o, d, len } of RAYS) {
    let t0 = 0.5, t1 = len;
    for (const [oo, dd, a, b] of [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]]) {
      if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) t0 = Infinity; continue; }
      const ta = (a - oo) / dd, tb = (b - oo) / dd;
      t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
    }
    if (t0 <= t1) return true;
  }
  return false;
};

const flatQuad = (x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = 0) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);

// ---------------- City blocks ----------------
const BLOCK_STYLES = [
  { wall: "#e8dcc2", shutter: "#2f3a5a" }, { wall: "#d9c49a", shutter: "#3d414c" }, { wall: "#cfa982", shutter: "#2f5f6a" },
  { wall: "#efe3c8", shutter: "#5a3b2a" }, { wall: "#c47a5c", shutter: "#2f3a5a", brick: true }, { wall: "#dccdb0", shutter: "#2f6a43" },
];
/** one window bay of a stone office facade (BAY_W x BAY_H m), repeated across the block */
const BAY_W = 3, BAY_H = 3.6;
const bayTex = (k: number) => ctex("bay" + k, 256, 308, (g, r) => {
  const st = BLOCK_STYLES[k];
  g.fillStyle = st.brick ? "#b9634a" : st.wall; g.fillRect(0, 0, 256, 308);
  if (st.brick) { g.fillStyle = "rgba(240,220,190,0.35)"; for (let y = 0; y < 308; y += 11) g.fillRect(0, y, 256, 2); }
  else { g.fillStyle = "rgba(90,70,50,0.13)"; for (let y = 0; y < 308; y += 44) g.fillRect(0, y, 256, 3); }
  for (let i = 0; i < 5; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(90,60,40,0.05)"; g.beginPath(); g.ellipse(r() * 256, r() * 308, 30, 20, 0, 0, 7); g.fill(); }
  g.fillStyle = "#efe3c8"; g.fillRect(52, 40, 152, 16); g.fillRect(46, 236, 164, 16);         // lintel, sill
  g.fillStyle = "#f4efe4"; g.fillRect(60, 56, 136, 180);                                       // frame
  g.fillStyle = "#4f6886"; g.fillRect(70, 66, 54, 160); g.fillRect(132, 66, 54, 160);          // panes
  g.fillStyle = "rgba(255,255,255,0.22)"; g.fillRect(74, 70, 14, 150); g.fillRect(136, 70, 14, 150);
  g.fillStyle = "rgba(40,30,40,0.5)"; g.fillRect(60, 56, 136, 4);
  g.fillStyle = st.shutter; g.fillRect(60, 140, 136, 6);
});
/** a stone office block: facade (painted) facing +z (dir 1) or -z (dir -1) at zf, depth d, flat roof with parapet */
const block = (b: Batch, x0: number, x1: number, zf: number, d: number, h: number, si: number, dir: 1 | -1, check = true) => {
  const zb = zf - dir * d, za = Math.min(zf, zb), zc = Math.max(zf, zb);
  if (check && blocked(x0 - 0.5, x1 + 0.5, 0, h + 2, za - 0.5, zc + 0.5)) return;
  const k = si % BLOCK_STYLES.length, st = BLOCK_STYLES[k], w = x1 - x0;
  const front = lam(`bay${k}_${w}_${h}`, () => ({ map: rep(bayTex(k), w / BAY_W, h / BAY_H) }));
  const side = lam(`bs${si % 6}`, () => ({ color: st.brick ? "#b9634a" : st.wall }));
  if (dir > 0) b.add(quad(V(x0, 0, zf), V(x1, 0, zf), V(x1, h, zf), V(x0, h, zf)), front);
  else b.add(quad(V(x1, 0, zf), V(x0, 0, zf), V(x0, h, zf), V(x1, h, zf)), front);
  b.add(quad(V(x0, 0, za), V(x0, 0, zc), V(x0, h, zc), V(x0, h, za)), side);
  b.add(quad(V(x1, 0, zc), V(x1, 0, za), V(x1, h, za), V(x1, h, zc)), side);
  if (dir > 0) b.add(quad(V(x1, 0, zb), V(x0, 0, zb), V(x0, h, zb), V(x1, h, zb)), side);
  else b.add(quad(V(x0, 0, zb), V(x1, 0, zb), V(x1, h, zb), V(x0, h, zb)), side);
  const roofM = lam("flatRoof", () => ({ color: "#8f8a86" })), trim = lam("trimStone", () => ({ color: "#efe3c8" }));
  b.add(flatQuad(x0, x1, za, zc, 1, 1, h), roofM);
  b.add(boxGeo(V(x0 - 0.15, h - 0.6, zf - (dir > 0 ? 0 : 0.35)), V(x1 + 0.15, h - 0.3, zf + (dir > 0 ? 0.35 : 0))), trim);      // cornice
  b.add(boxGeo(V(x0, h, za), V(x1, h + 0.9, za + 0.3)), trim); b.add(boxGeo(V(x0, h, zc - 0.3), V(x1, h + 0.9, zc)), trim);   // parapets
  b.add(boxGeo(V(x0 - 0.05, -0.02, zf - (dir > 0 ? 0 : 0.2)), V(x1 + 0.05, 0.5, zf + (dir > 0 ? 0.2 : 0))), lam("plinthHD", () => ({ map: stoneHD("copeHD") })));
};
/** a distant modern tower: glass box */
const glassBox = (b: Batch, x: number, z: number, w: number, d: number, h: number, k: number) => {
  const m = lam("skyGlass" + k, () => ({ map: rep(glassTex("skyG" + k, ["#aac3df", "#9fb6cf", "#c2d0dc"][k], ["#6d8db6", "#7d93ad", "#8c9db0"][k]), w / PANE_W, h / FLOOR_H) }));
  b.add(boxGeo(V(x - w / 2, 0, z - d / 2), V(x + w / 2, h, z + d / 2)), m);
};

// ---------------- the tower: parametric glass surfaces ----------------
/** surface grid geometry from a point function p(i/nu, j/nv) with uvs in metres / tile, vertex colours = sky reflection */
const surface = (nu: number, nv: number, P: (a: number, c: number) => V3, uvOf: (a: number, c: number, p: V3) => [number, number], col: (a: number, c: number) => THREE.Color) => {
  const pos: number[] = [], uv: number[] = [], cols: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const a = i / nu, c = j / nv, p = P(a, c), [u, v] = uvOf(a, c, p), k = col(a, c);
    pos.push(...p); uv.push(u, v); cols.push(k.r, k.g, k.b);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b2 = a + 1, c = a + nu + 1, d = c + 1;
    idx.push(a, b2, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
const lin = (hex: string) => new THREE.Color(hex);
const skyRefl = (v: number, u: number, lo = "#8aa6cc", hi = "#d6e4f2") => lin(lo).lerp(lin(hi), Math.min(1, v * 1.1)).multiplyScalar(0.9 + 0.1 * Math.cos(u * Math.PI * 0.5));

const towerMesh = (root: THREE.Object3D) => {
  const grp = new THREE.Group();
  const glass = lam("towerGlass", () => ({ map: glassTex("towerG", "#b4cbe4", "#7c9cc6"), vertexColors: true }));
  const sideG = lam("towerSide", () => ({ map: glassTex("towerS", "#9fb6d2", "#6f8db6"), vertexColors: true }));
  const NV = 48, NU = 28;
  // south face (toward the street), u from -1 (west) to +1 (east): wound so the normal points to +z
  grp.add(new THREE.Mesh(surface(NU, NV, (a, c) => facePt(2 * a - 1, c), (a, c, p) => [p[0] / PANE_W, p[1] / FLOOR_H], (a, c) => skyRefl(c, 2 * a - 1)), glass));
  // north face
  grp.add(new THREE.Mesh(surface(NU, NV, (a, c) => { const u = 1 - 2 * a; return [u * halfW(c), c * TH, backZ(c)]; }, (a, c, p) => [-p[0] / PANE_W, p[1] / FLOOR_H], (a, c) => skyRefl(c, 0, "#7d97bb", "#c9d6e6")), sideG));
  // east and west sides
  for (const s of [-1, 1]) grp.add(new THREE.Mesh(surface(12, NV, (a, c) => {
    const k = s > 0 ? 1 - a : a, z = frontZ(s, c) + (backZ(c) - frontZ(s, c)) * k;
    return [s * halfW(c), c * TH, z];
  }, (a, c, p) => [p[2] / PANE_W, p[1] / FLOOR_H], (a, c) => skyRefl(c, 0, "#86a1c4", "#d3deec")), sideG));
  // roof: the sky garden's sloping glass top, rising from the south edge to the north
  const roofG = lam("towerRoof", () => ({ color: "#b6c8dc" }));
  grp.add(new THREE.Mesh(surface(NU, 6, (a, c) => {
    const u = 2 * a - 1, zf = frontZ(u, 1), zb = backZ(1);
    return [u * halfW(1), TH + 6 * c, zf + (zb - zf) * c];
  }, (a, c, p) => [p[0] / PANE_W, p[2] / FLOOR_H], () => lin("#d9e4ef")), roofG));
  // podium: a dark lobby band and a pale stone canopy at the foot of the south face
  const b = new Batch();
  b.add(boxGeo(V(-22, 0, -16.6), V(22, 5.2, -15.8)), lam("lobby", () => ({ color: "#3a4152" })));
  b.add(boxGeo(V(-23, 5.2, -17), V(23, 5.8, -12.5)), lam("canopy", () => ({ color: "#e4ddcf" })));
  b.build(grp);
  grp.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  root.add(grp);
};

/** one sunshade fin: an aluminium blade 0.9 m deep following the curved south face at height v */
const finGeo = (v: number) => {
  const n = 32, pts: number[] = [], idx: number[] = [], depth = 1.1, th = 0.22;
  for (let i = 0; i <= n; i++) {
    const u = -1 + (2 * i) / n, [x, y, z] = facePt(u, v);
    for (const [dz, dy] of [[0.15, 0], [0.15 + depth, 0], [0.15 + depth, -th], [0.15, -th]]) pts.push(x, y + dy, z + dz);
  }
  for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) {
    const a = i * 4 + k, b = i * 4 + ((k + 1) % 4), c = a + 4, d = b + 4;
    idx.push(a, c, d, a, d, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pts.length / 3) * 2), 2));
  return g;
};

/** car: a sleek dark-green saloon, nose to +x, origin on the ground at its centre */
const carMesh = () => {
  const grp = new THREE.Group(), b = new Batch();
  const paint = lam("carPaint", () => ({ color: "#3f7a52" })), glassM = lam("carGlass", () => ({ color: "#2a3340" }));
  const chrome = lam("carChrome", () => ({ color: "#c9ccd2" })), tyre = lam("carTyre", () => ({ color: "#26252b" }));
  b.add(boxGeo(V(-2.45, 0.32, -0.92), V(2.45, 0.86, 0.92)), paint);
  b.add(boxGeo(V(2.0, 0.55, -0.88), V(2.5, 0.8, 0.88)), paint);                 // nose
  // cabin: tapered (a box whose top is narrower), built from the box and scaled top verts
  const cab = new THREE.BoxGeometry(2.3, 0.52, 1.6); cab.translate(-0.15, 1.12, 0);
  const p = cab.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 1.2) { p.setX(i, p.getX(i) * 0.78 - 0.1); p.setZ(i, p.getZ(i) * 0.86); }
  cab.computeVertexNormals();
  b.add(cab, glassM);
  b.add(boxGeo(V(-1.05, 1.36, -0.66), V(0.55, 1.42, 0.66)), paint);             // roof skin
  for (const [x, z] of [[1.55, 0.86], [1.55, -0.86], [-1.55, 0.86], [-1.55, -0.86]]) {
    const w = new THREE.CylinderGeometry(0.35, 0.35, 0.26, 24); w.rotateX(Math.PI / 2); w.translate(x, 0.35, z); b.add(w, tyre);
    const hub = new THREE.CylinderGeometry(0.18, 0.18, 0.28, 16); hub.rotateX(Math.PI / 2); hub.translate(x, 0.35, z); b.add(hub, chrome);
  }
  for (const z of [-0.6, 0.6]) {
    b.add(boxGeo(V(2.46, 0.62, z - 0.18), V(2.52, 0.74, z + 0.18)), lam("headlamp", () => ({ color: "#fff6dc" })));
    b.add(boxGeo(V(-2.52, 0.64, z - 0.2), V(-2.46, 0.76, z + 0.2)), lam("taillamp", () => ({ color: "#c0353a" })));
  }
  b.add(boxGeo(V(2.5, 0.38, -0.85), V(2.58, 0.5, 0.85)), chrome);              // bumper
  b.add(boxGeo(V(-2.58, 0.38, -0.85), V(-2.5, 0.5, 0.85)), chrome);
  b.build(grp);
  // wing mirrors and badge as their own meshes (hidden while their melting drawing is shown)
  const mirrors: THREE.Mesh[] = [];
  for (const s of [1, -1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.26), paint);
    m.position.set(0.95, 1.02, s * 1.02); grp.add(m); mirrors.push(m);
  }
  const bd = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 20).rotateZ(Math.PI / 2), chrome);
  bd.position.set(2.53, 0.74, 0); grp.add(bd);
  grp.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { grp, mirrors, badge: bd };
};

/** additive light material (HDR colour, no ink) */
const lightMat = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1, 1, 1), fog: false, side: THREE.DoubleSide });
/** a ray from a to b as two crossed soft strips */
const rayGeo = (a: THREE.Vector3, b: THREE.Vector3, w: number) => {
  const d = b.clone().sub(a).normalize(), s1 = d.clone().cross(V(0, 1, 0)).normalize(), s2 = d.clone().cross(s1).normalize();
  const geos: THREE.BufferGeometry[] = [];
  for (const s of [s1, s2]) geos.push(quad(a.clone().addScaledVector(s, -w), a.clone().addScaledVector(s, w), b.clone().addScaledVector(s, w * 0.7), b.clone().addScaledVector(s, -w * 0.7)));
  return geos;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite; private glint: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private fins: THREE.Mesh[] = [];
  private crane = new THREE.Group();
  private car: { grp: THREE.Group; mirrors: THREE.Mesh[]; badge: THREE.Mesh };
  private spot: THREE.Mesh; private spotV: THREE.Mesh;
  private fan = new THREE.Group(); private flat = new THREE.Group();
  private fanMat: THREE.MeshBasicMaterial; private flatMat: THREE.MeshBasicMaterial;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private c1 = new THREE.Color(); private c2 = new THREE.Color();

  constructor(kit: Kit) {
    const R = this.root;
    // ---- sky + light (as in the bridge / Pisa shorts) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(3, 2.8, 2.2), fog: false, depthWrite: false, depthTest: false,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5; this.glint.renderOrder = 6;
    for (const m of [this.sunDisc, this.sunHalo, this.glint]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    // ---- the street ----
    RAYS = sightLines();
    setSight(RAYS.filter((r) => r.core));
    const b = new Batch();
    const asphalt = lam("asphalt", () => ({ map: asphaltTex() })), paving = lam("paving", () => ({ map: pavingTex() }));
    b.add(flatQuad(-400, 400, -5, 5, 200, 2.5), asphalt);
    b.add(flatQuad(-400, 400, 5, 9.1, 800 / 3.6, 4.1 / 3.6, 0.02), paving);
    b.add(flatQuad(-400, 400, -9.1, -5, 800 / 3.6, 4.1 / 3.6, 0.02), paving);
    b.add(flatQuad(-26, 26, -16, -9.1, 52 / 3.6, 6.9 / 3.6, 0.021), paving); // the tower's forecourt
    b.add(flatQuad(-400, 400, -400, -16, 160, 80, -0.01), asphalt);        // ground under the far blocks
    b.add(flatQuad(-400, 400, 9.1, 400, 160, 80, -0.01), asphalt);
    const kerb = lam("kerb", () => ({ color: "#d3cdc2" })), paintW = lam("roadWhite", () => ({ color: "#f1eee6" }));
    for (const z of [-5, 5]) b.add(boxGeo(V(-400, 0, z - 0.15), V(400, 0.12, z + 0.15)), kerb);
    for (let x = -400; x < 400; x += 9) b.add(flatQuad(x, x + 4.5, -0.08, 0.08, 1, 1, 0.012), paintW);
    for (const z of [-4.2, 4.2]) for (let x = -400; x < 400; x += 1.2) b.add(flatQuad(x, x + 0.6, z - 0.05, z + 0.05, 1, 1, 0.012), lam("roadYellow", () => ({ color: "#e8c45a" })));
    b.build(R);

    // City blocks: north row (facing the street, +z), with the tower's forecourt left open; south row (facing -z)
    const cb = new Batch(), r = rng(11);
    const row = (from: number, to: number, zf: number, dir: 1 | -1, skip?: (x0: number, x1: number) => boolean) => {
      let x = from;
      while (x < to) {
        const w = [9, 11, 13, 10][Math.floor(r() * 4)], h = 14 + Math.floor(r() * 6) * 2.5;
        if (!skip?.(x, x + w)) block(cb, x, x + w, zf, 16, h, Math.floor(r() * 6), dir);
        x += w;
      }
    };
    row(-200, -26, -9.05, 1);
    row(54, 200, -9.05, 1);
    // the flat-glass office (shot 9) and its stone neighbour, north side east of the tower
    const fg = lam("flatGlassM", () => ({ map: rep(flatGlassTex(), 22 / PANE_W, 30 / FLOOR_H) }));
    cb.add(boxGeo(V(30, 0, -26), V(52, 30, -9.05)), fg);
    block(cb, 26, 30, -9.05, 16, 18, 3, 1);
    // south row: the shop block (x 8..18) has a shopfront on the ground floor
    row(-200, 8, 9.05, -1);
    block(cb, 8, 18, 9.05, 16, 19, 1, -1);
    cb.add(quad(V(17.9, 0.02, 9.0), V(8.1, 0.02, 9.0), V(8.1, 3.6, 9.0), V(17.9, 3.6, 9.0)), lam("shopFrontM", () => ({ map: shopTex() })));
    cb.add(boxGeo(V(8.4, 3.55, 7.9), V(17.6, 3.75, 9.0)), lam("awning", () => ({ color: "#2f5f6a" })));
    row(18, 200, 9.05, -1);
    // a second, taller row behind both, and the distant skyline (glass towers + stone)
    row(-200, 200, -40, 1, (x0, x1) => x1 > -30 && x0 < 30);
    row(-200, 200, 40, -1);
    for (let i = 0; i < 40; i++) {
      const x = -260 + r() * 520, z = -90 - r() * 200, h = 45 + r() * 110, w = 18 + r() * 22;
      if (Math.abs(x) < 40 && z > -130) continue;
      glassBox(cb, x, z, w, 16 + r() * 16, h, i % 3);
    }
    for (let i = 0; i < 26; i++) { const x = -260 + r() * 520, z = 60 + r() * 160; glassBox(cb, x, z, 20 + r() * 20, 20, 30 + r() * 60, i % 3); }
    cb.build(R);
    // lamp posts and plane trees along both pavements
    const sb = new Batch(), post = lam("lampPost", () => ({ color: "#2a2d33" })), lampGlass = lam("lampGlass", () => ({ color: "#f6efd6" }));
    const lampPost = (x: number, z: number) => {
      if (blocked(x - 0.3, x + 0.3, 0, 5, z - 0.3, z + 0.3)) return;
      sb.add(new THREE.CylinderGeometry(0.08, 0.13, 4.6, 12).translate(x, 2.3, z), post);
      sb.add(boxGeo(V(x - 0.22, 4.6, z - 0.22), V(x + 0.22, 5.1, z + 0.22)), lampGlass);
      sb.add(new THREE.ConeGeometry(0.34, 0.3, 4).rotateY(Math.PI / 4).translate(x, 5.25, z), post);
    };
    for (let x = -120; x <= 120; x += 18) { lampPost(x, 5.55); lampPost(x + 9, -5.55); }
    lampPost(LAMP[0], LAMP[2]);
    sb.build(R);
    const tb = new Batch();
    for (let x = -150; x <= 150; x += 22) {
      const tree = (tx: number, tz: number, h: number, seed: number) => { if (!blocked(tx - 3.5, tx + 3.5, 0, h, tz - 3.5, tz + 3.5)) prop(tb, kit, "tree_oak", tx, 0, tz, h, seed); };
      if (Math.abs(x) > 30) tree(x + 4, -6.8, 9, x);
      if (Math.abs(x - 10) > 12) tree(x - 7, 7.0, 8.5, x + 3);
    }
    tb.build(R);
    setSight([]);

    // ---- the tower, fins, crane ----
    towerMesh(R);
    const finM = lam("finAlu", () => ({ color: "#d9dde3" }));
    for (let k = 3; k <= 34; k++) {
      const m = new THREE.Mesh(finGeo((k * FLOOR_H + 1.4) / TH), finM);
      m.castShadow = true; m.receiveShadow = true; m.visible = false;
      this.fins.push(m); R.add(m);
    }
    const crb = new Batch(), lat = lam("lattice", () => ({ map: latticeTex(), alphaTest: 0.5, side: THREE.DoubleSide })), yel = lam("craneYellow", () => ({ color: "#e9b52c" }));
    const mast = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
      crb.add(boxGeo(V(x0, y0, z0), V(x1, y1, z1), 0), lat);
    };
    const CX = 31, CZ = -22;
    for (let y = 0; y < 180; y += 2) mast(CX - 1, CX + 1, y, y + 2, CZ - 1, CZ + 1);
    for (let x = -40; x < 14; x += 2) crb.add(boxGeo(V(CX + x, 180, CZ - 0.8), V(CX + x + 2, 182, CZ + 0.8), 0), lat);
    crb.add(boxGeo(V(CX - 2, 176, CZ - 1.5), V(CX + 2, 180, CZ + 1.5)), yel);           // cab
    crb.add(boxGeo(V(CX + 8, 176, CZ - 1.4), V(CX + 14, 180, CZ + 1.4)), lam("craneWeight", () => ({ color: "#8f97a8" }))); // counterweight
    crb.add(boxGeo(V(CX - 0.6, 182, CZ - 0.6), V(CX + 0.6, 190, CZ + 0.6)), yel);
    crb.add(boxGeo(V(CX - 30.05, 120, CZ - 0.05), V(CX - 29.95, 180, CZ + 0.05)), post); // hook cable
    crb.add(boxGeo(V(CX - 31, 117, CZ - 1), V(CX - 29, 120, CZ + 1)), yel);
    crb.add(boxGeo(V(CX - 36, 114.5, CZ - 0.5), V(CX - 24, 117, CZ + 0.5)), finM);        // a fin on the hook
    crb.build(this.crane);
    R.add(this.crane);

    // ---- car, drafting table ----
    this.car = carMesh();
    this.car.grp.position.set(...CAR);
    R.add(this.car.grp);
    const tbl = new Batch(), wood = lam("tableWood", () => ({ color: "#a8724a" }));
    tbl.add(boxGeo(V(TABLE[0] - 0.8, 0.86, TABLE[2] - 0.55), V(TABLE[0] + 0.8, 0.92, TABLE[2] + 0.55)), wood);
    for (const [dx, dz] of [[-0.7, -0.45], [0.7, -0.45], [-0.7, 0.45], [0.7, 0.45]]) tbl.add(boxGeo(V(TABLE[0] + dx - 0.04, 0, TABLE[2] + dz - 0.04), V(TABLE[0] + dx + 0.04, 0.86, TABLE[2] + dz + 0.04)), wood);
    tbl.build(R);

    // ---- light: the hot spot and the rays ----
    this.spot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), lightMat(glowTex()));
    this.spot.position.set(SPOT[0], 0.04, SPOT[2]); this.spot.scale.set(7.5, 1, 5.5); this.spot.layers.set(NOINK); this.spot.renderOrder = 2;
    R.add(this.spot);
    this.fanMat = lightMat(rayTex());
    const fanB = new Batch();
    const rr = rng(5);
    for (let i = 0; i < 46; i++) {
      const u = -0.85 + rr() * 1.7, v = 0.25 + rr() * 0.7, a = V(...facePt(u, v)).add(V(0, 0, 0.3));
      const t = V(SPOT[0] + (rr() - 0.5) * 2.5, 0.1, SPOT[2] + (rr() - 0.5) * 2.0);
      for (const g of rayGeo(a, t, 0.5 + v * 0.6)) fanB.add(g, this.fanMat);
    }
    fanB.build(this.fan, false);
    this.fan.traverse((o) => { o.layers.set(NOINK); (o as THREE.Mesh).renderOrder = 3; });
    R.add(this.fan);
    this.flatMat = lightMat(rayTex());
    const flB = new Batch(), din = V(0.22, -0.78, -0.58).normalize(), dout = V(0.22, -0.78, 0.58).normalize();
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const p = V(35 + i * 6, 12 + j * 9, -9.0);
      for (const g of rayGeo(p.clone().addScaledVector(din, -38), p, 0.28)) flB.add(g, this.flatMat);
      const hit = p.clone().addScaledVector(dout, (p.y - 0.1) / -dout.y);
      for (const g of rayGeo(p, hit, 0.28)) flB.add(g, this.flatMat);
    }
    flB.build(this.flat, false);
    this.flat.traverse((o) => { o.layers.set(NOINK); (o as THREE.Mesh).renderOrder = 3; });
    R.add(this.flat);

    // ---- the park (shot 11) ----
    const pb = new Batch();
    pb.add(flatQuad(PARK_X - 300, PARK_X + 300, -300, 300, 120, 120), lam("parkGrass", () => ({ map: grassTex() })));
    pb.add(flatQuad(PARK_X - 300, PARK_X + 300, -1.4, 1.4, 300 / 3.6, 2.8 / 3.6, 0.015).translate(0, 0, -3), lam("gravel", () => ({ color: "#d9c9a0" })));
    pb.add(boxGeo(V(PARK_X - 3.6, 0.42, -7.2), V(PARK_X - 0.4, 0.5, -6.7)), wood);
    pb.add(boxGeo(V(PARK_X - 3.6, 0.5, -7.25), V(PARK_X - 0.4, 1.0, -7.18)), wood);
    for (const dx of [-3.4, -0.6]) pb.add(boxGeo(V(PARK_X + dx - 0.05, 0, -7.2), V(PARK_X + dx + 0.05, 0.42, -6.7)), post);
    pb.build(R);
    const ptb = new Batch(), pr = rng(21);
    for (let i = 0; i < 40; i++) { const a = pr() * Math.PI * 2, d = 9 + pr() * 40; prop(ptb, kit, ["tree_oak", "tree_default", "tree_fat"][i % 3], PARK_X + Math.cos(a) * d, 0, Math.sin(a) * d - (Math.sin(a) > 0 ? -8 : 0), 7 + pr() * 5, i); }
    for (let i = 0; i < 8; i++) prop(ptb, kit, "hedge", PARK_X - 14 + i * 3.4, 0, -11, 1.2, i);
    ptb.build(R);

    // ---- Las Vegas (shot 17): sand, pool deck, pool, loungers, a curved gold-glass hotel ----
    const vb = new Batch(), VX = VEGAS_X;
    vb.add(flatQuad(VX - 600, VX + 600, -600, 600, 200, 200), lam("sand", () => ({ map: sandTex() })));
    vb.add(flatQuad(VX - 40, VX + 40, -30, 24, 80 / 2, 54 / 2, 0.02), lam("poolDeck", () => ({ map: deckTex() })));
    vb.add(flatQuad(VX - 14, VX + 14, 2, 16, 3, 1.5, 0.05), lam("poolWater", () => ({ map: waterTex() })));
    for (const [x0, x1, z0, z1] of [[-14.4, 14.4, 1.6, 2], [-14.4, 14.4, 16, 16.4], [-14.4, -14, 1.6, 16.4], [14, 14.4, 1.6, 16.4]])
      vb.add(boxGeo(V(VX + x0, 0, z0), V(VX + x1, 0.12, z1)), lam("poolRim", () => ({ color: "#f4f1ea" })));
    const white = lam("loungerWhite", () => ({ color: "#f4f1ea" })), cushion = lam("cushion", () => ({ color: "#3f9fd5" }));
    for (let i = 0; i < 9; i++) {
      const x = VX - 12 + i * 3, z = -3;
      vb.add(boxGeo(V(x - 0.35, 0.28, z - 1), V(x + 0.35, 0.36, z + 1)), white);
      vb.add(boxGeo(V(x - 0.33, 0.36, z - 0.95), V(x + 0.33, 0.42, z + 0.6)), cushion);
      const back = new THREE.BoxGeometry(0.66, 0.06, 0.7); back.rotateX(-0.9); back.translate(x, 0.6, z - 1.15); vb.add(back, cushion);
      for (const dz of [-0.9, 0.9]) vb.add(boxGeo(V(x - 0.32, 0, z + dz - 0.04), V(x + 0.32, 0.28, z + dz + 0.04)), white);
    }
    for (let i = 0; i < 4; i++) { // parasols
      const x = VX - 10.5 + i * 7, z = -5.2;
      vb.add(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8).translate(x, 1.2, z), white);
      vb.add(new THREE.ConeGeometry(1.5, 0.5, 12, 1, true).translate(x, 2.55, z), lam("parasol", () => ({ color: "#f2cf4a", side: THREE.DoubleSide })));
    }
    // the hotel: concave crescent facade toward the pool
    const hotelG = lam("hotelGlass", () => ({ map: glassTex("hotelG", "#f4dca8", "#d6ae72", "#6a5440", "#f6ecd6") }));
    const hz = (u: number) => -46 - 16 * (1 - u * u), HH = 118;
    vb.add(surface(28, 40, (a, c) => { const u = 2 * a - 1; return [VX + u * 52, c * HH, hz(u)]; }, (a, c, p) => [(p[0] - VX) / PANE_W, p[1] / FLOOR_H], (a, c) => lin("#c9b38a").lerp(lin("#fff1d6"), c)), hotelG);
    vb.add(surface(28, 4, (a, c) => { const u = 1 - 2 * a; return [VX + u * 52, c * HH, hz(u) - 22]; }, (a, c, p) => [(p[0] - VX) / PANE_W, p[1] / FLOOR_H], () => lin("#c9b38a")), hotelG);
    for (const s of [-1, 1]) vb.add(boxGeo(V(VX + s * 52 - 0.5, 0, -68), V(VX + s * 52 + 0.5, HH, -45)), lam("hotelFin", () => ({ color: "#e9dfcc" })));
    vb.add(flatQuad(VX - 52, VX + 52, -84, -46, 1, 1, HH), lam("flatRoof", () => ({ color: "#8f8a86" })));
    for (let i = 0; i < 14; i++) { // far desert mountains
      const x = VX - 700 + i * 110, h = 60 + ((i * 37) % 50), m = new THREE.ConeGeometry(90 + ((i * 53) % 60), h, 5); m.translate(x, h / 2 - 5, -560 - ((i * 71) % 80));
      vb.add(m, lam("mountain", () => ({ color: "#c79b85" })));
    }
    vb.build(R);
    this.spotV = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), lightMat(glowTex()));
    this.spotV.position.set(SPOT_V[0], 0.5, SPOT_V[2]); this.spotV.scale.set(12, 1, 5); this.spotV.layers.set(NOINK); this.spotV.renderOrder = 2;
    R.add(this.spotV);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(SUN_SHOT[id]?.az ?? L.az), el = THREE.MathUtils.degToRad(SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const gloom = gloomAt(id, t);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden" || dist > 40) Rr = Math.max(Rr, 70);
    this.sun.position.copy(focus).addScaledVector(sunDir, 260); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 560; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    // overcast (shot 8): the sun's lit colour sinks to an even grey, shade lifts, contrast goes
    const lerp3 = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k) as [number, number, number];
    TONE.uLitCol.value.set(...lerp3(L.lit, [0.86, 0.88, 0.94], gloom)); TONE.uShadeCol.value.set(...lerp3(L.shade, [0.6, 0.62, 0.7], gloom)); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...LOOK[s.light].bounce); TONE.uSat.value = LOOK[s.light].sat * (1 - 0.25 * gloom);
    CHAR.uCharTint.value.set(...lerp3(L.charTint, [0.8, 0.82, 0.88], gloom)); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad * (1 - gloom);
    CHAR.uBodyGrad.value = L.bodyGrad * (1 - gloom); CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => { untone(h, this.c1); untone(["#c9ced4", "#b9bfc7", "#a6adb7", "#9aa1ac", "#8d95a1"][i], this.c2); su["c" + i].value.copy(this.c1.lerp(this.c2, gloom)); });
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.color.lerp(untone("#bfc4ca", this.c2), gloom);
    this.fog.near = s.set === "street" ? 60 : L.fogNear; this.fog.far = s.set === "street" ? 520 : L.fogFar * 1.6;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    // clouds ring the camera; under gloom they grow, darken and drift over the top of the frame
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      const a = (i / this.clouds.length) * Math.PI * 2 + 0.3 + t * 0.002, d = 620 + (i % 3) * 60;
      const lift = 120 + (i % 4) * 38 + gloom * 120;
      m.position.set(cam.position.x + Math.cos(a) * d, lift, cam.position.z + Math.sin(a) * d);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      const w = (130 + (i % 4) * 30) * (1 + 1.6 * gloom);
      m.scale.set(w, w / 2, 1);
      mat.map = this.cloudMaps[s.light][i % 4];
      mat.color.setRGB(1.1 - 0.45 * gloom, 1.1 - 0.42 * gloom, 1.1 - 0.36 * gloom);
    }
    // ---- set pieces ----
    const fins = finsAt(id, t);
    this.fins.forEach((m, i) => { m.visible = s.set === "street" && fins > i / this.fins.length; });
    this.crane.visible = id === 14;
    const spot = spotAt(id, t);
    this.spot.visible = s.set === "street" && spot > 0;
    (this.spot.material as THREE.MeshBasicMaterial).color.setRGB(1.0 * spot, 0.92 * spot, 0.7 * spot);
    this.spotV.visible = s.set === "vegas" && spot > 0;
    (this.spotV.material as THREE.MeshBasicMaterial).color.setRGB(1.0 * spot, 0.88 * spot, 0.62 * spot);
    const rays = raysAt(id, t);
    this.fan.visible = rays.fan > 0; this.fanMat.color.setRGB(0.55 * rays.fan, 0.5 * rays.fan, 0.36 * rays.fan);
    this.flat.visible = rays.flat > 0; this.flatMat.color.setRGB(0.6 * rays.flat, 0.55 * rays.flat, 0.4 * rays.flat);
    const gl = GLINT[id];
    this.glint.visible = !!gl && s.set === "street";
    if (gl) {
      const p = V(...facePt(-0.1, gl[0])).add(V(0, 0, 0.6));
      this.glint.position.copy(p);
      const dd = cam.position.distanceTo(p), pulse = 1 + 0.25 * Math.sin(t * 9) + (id === 18 ? 0.8 * smooth((t - 68.6) / 0.3) : 0);
      this.glint.scale.setScalar(dd * 0.12 * pulse);
      (this.glint.material as THREE.SpriteMaterial).color.setRGB(gl[1], gl[1] * 0.93, gl[1] * 0.75);
    }
    // the car: mirror / badge meshes hide while their melting drawings are on (cast.ts)
    const melting = id === 1 || (id === 3 && t > 14.3);
    this.car.mirrors[0].visible = !melting;
    this.car.badge.visible = !(id === 3 && t > 15.6);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const stg = stage(id, t, { pos: cam.position, right, sun: sunDir }, gloom);
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const tint = s.light === "golden" ? "#ffcf9e" : "#ffffff";
    let ai = 0;
    const used: Actor[] = [];
    for (const p of stg.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, kk] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, kk, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      if (a.mat.emissiveMap) a.mat.emissive.set(tint);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of stg.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const fxm = this.fx(fi++);
      fxm.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      fxm.use(!!p.soft);
      fxm.mesh.visible = true;
      fxm.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) fxm.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else if (p.yaw !== undefined) fxm.mesh.rotation.set(0, p.yaw, p.rot ?? 0);
      else { fxm.mesh.quaternion.copy(cam.quaternion); fxm.mesh.rotateZ(p.rot ?? 0); }
      fxm.mesh.scale.set(p.w, p.h, 1);
      fused.push(fxm);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    void clamp01;
    return focus;
  }
}
