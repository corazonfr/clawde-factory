// Vasa-warship cast (machinery from the bridge / Pisa / Walkie shorts). Our cast as lit flat sprites in the 3D world. Each
// frame every character asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing.
// Characters are yaw-only billboards shaded by cardShade(); standing ones get a soft multiply contact blob. Effects are
// unlit cards. Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, KID, SKINS, townsfolk, fxBurst, fxStars, fxPuff, fxShadow, fxContact,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import { FPS, D0, SHOTS, V3, W, smooth, clamp01, SHIP, QY, QZ, DECK, BOOK, INQ, FLOOR, MUS, add, shipAt, runAt } from "./story";
import { gust, gush, worm, bubble, splash } from "./props2d";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; yaw?: number };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const vOf = (i: number) => (i * 7 + (i >> 2)) % 4;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = {};
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ================= the Vasa cast =================
export type Stage = { places: Place[]; fx: FxPlace[] };

const who = (i: number, o: Outfit, okey: string): Who => ({ i, o, okey });
const front0 = { side: false, mirror: false };
/** a standing character facing the lens */
const stand = (cam: CamInfo, out: Stage, w: Who, x: number, y: number, z: number, t: number, fo: FrontOpts, sc = 1, shadow = true) => {
  out.places.push(person(cam, w, x, y, z, front0, { mode: "stand", blink: lidAt(t, w.i), ...fo }, {}, sc));
  if (shadow) blob(out, x, y, z, sc);
};
/** a character walking from a to b over [t0, t1] (side or front view picked from the lens) */
const walk = (cam: CamInfo, out: Stage, w: Who, a: V3, b: V3, t0: number, t1: number, t: number, expr: Expr, sp = 0.8, sc = 1) => {
  const u = clamp01((t - t0) / (t1 - t0)), x = a[0] + (b[0] - a[0]) * u, z = a[2] + (b[2] - a[2]) * u;
  const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1;
  const moving = t > t0 && t < t1, phase = q(((t - t0) * sp + hh(w.i, 5)) % 1, 120);
  const view = viewOf(cam, x, z, dx / L, dz / L);
  const fo: FrontOpts = { mode: moving ? "stroll" : "stand", phase, expr, blink: lidAt(t, w.i) };
  const so: SideOpts = { mode: moving ? "march" : "stand", phase, expr, blink: lidAt(t, w.i), stomp: 0.5, stride: 0.85 * view.fs };
  out.places.push(person(cam, w, x, a[1], z, view, fo, so, sc));
  blob(out, x, a[1], z, sc);
};
const fxCard = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, at: V3, w: number, h: number, rot = 0, flat = false, soft = false) =>
  out.fx.push({ key, cw, ch, draw, x: at[0], y: at[1], z: at[2], w, h, rot, flat, soft });
const L2 = LEAD;
const after = (t: number, w: number) => t > w - L2;
const puffs = (out: Stage, t: number, t0: number, at: V3, n = 4, s = 1) => {
  if (t < t0) return;
  for (let i = 0; i < n; i++) {
    const u = ((t - t0) * 0.7 + i / n) % 1, k = q(u, 20);
    fxCard(out, `puff${k}`, 300, 300, (p) => fxPuff(p, k), [at[0] + (hh(i, 3) - 0.5) * 0.4 * s + u * 0.8 * s, at[1] + u * 0.6 * s, at[2] + (hh(i, 4) - 0.5) * 0.3 * s + u * s], 0.5 * s * (0.6 + u), 0.5 * s * (0.6 + u), 0, false, true);
  }
};

// ---- the ship's geometry (mirrors world.ts) ----
const HL = 24, HB = 5.6;
const halfW = (x: number) => HB * Math.sqrt(Math.max(0, 1 - (x / HL) ** 2));
/** a ship-local point (bow +x, deck at y = DECK) in the world, for the harbour ship's heel and sink */
const onShip = (id: number, t: number, lx: number, ly: number, lz: number): V3 => {
  const s = shipAt(id, t), c = Math.cos(s.heel), sn = Math.sin(s.heel);
  return [SHIP[0] + lx, SHIP[1] - s.sink + ly * c - lz * sn, SHIP[2] + ly * sn + lz * c];
};

// ---- outfits ----
const FOLK = (v: number): Outfit => { const o = townsfolk(v); return o.hat === "tophat" ? { ...o, hat: "hair", hair: ["#3a2a20", "#8a5a3c", "#d9a441"][v % 3], moustache: v % 4 === 0 ? "#5a3b2a" : undefined } : o; };
const SAILOR = (v: number): Outfit => ({ jacket: ["#3b5b9a", "#b23a32", "#f4f1ea", "#5d7a3a"][v % 4], pants: ["#e9e2d2", "#3b3f52", "#6b4a2a"][v % 3], boots: "#3a2a20",
  hat: "cap", cap: ["#b23a32", "#3b5b9a", "#f4f1ea"][v % 3], skin: SKINS[(v * 3 + 1) % 4] });
const ADMIRAL: Outfit = { jacket: "#2a2d33", pants: "#2a2d33", boots: "#1d1a22", hat: "hair", hair: "#c9ccd2", moustache: "#c9ccd2", buttons: "#d9a441", sash: "#2f5fa8", build: "stout", skin: SKINS[1] };
const CLERK = (v: number): Outfit => ({ jacket: ["#2a2d33", "#4a3a5a", "#3a2a20"][v % 3], pants: "#2a2d33", boots: "#1d1a22", hat: "hair", hair: ["#c9ccd2", "#3a2a20", "#8a5a3c"][v % 3],
  moustache: v === 1 ? "#3a2a20" : undefined, buttons: "#f4f1ea", skin: SKINS[(v * 2) % 4] });
const VIS = (v: number): Outfit => ({ jacket: ["#c25a3a", "#5d7a3a", "#7b5ac9", "#3f9fd5", "#d9a441"][v % 5], pants: ["#3b3f52", "#6b4a2a", "#3b5b9a"][v % 3], boots: "#3a2a20",
  hat: "hair", hair: ["#2a201a", "#d9a441", "#8a5a3c", "#c9ccd2"][v % 4], skin: SKINS[(v * 3 + 2) % 4] });
const KID2: Outfit = { ...KID, hat: "hair", hair: "#5a3b2a", jacket: "#3f9fd5" };

/** a card that pops in (scale 0 -> 1 over 0.2 s) at t0 */
const pop = (t: number, t0: number) => smooth((t - (t0 - L2)) / 0.2);

/** the crowd along the quay */
const CROWD: V3[] = Array.from({ length: 22 }, (_, i) => [-30 + i * 2.9 + (hh(i, 1) - 0.5) * 1.2, QY + 0.25, QZ + 2.2 + hh(i, 2) * 4.5] as V3);
const crowd = (cam: CamInfo, out: Stage, t: number, ex: (i: number) => Expr, wave: (i: number) => number | undefined) =>
  CROWD.forEach((p, i) => stand(cam, out, who(100 + i, FOLK(i), `folk${i}`), p[0], p[1], p[2], t, { expr: ex(i), look: i % 3 - 1, wave: wave(i) }, i % 7 === 3 ? 0.75 : 1));

export const stage = (id: number, t: number, cam: CamInfo, gloom = 0): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  void gloom; void D0; void bodySide; void fxBurst; void fxStars; void INQ;
  switch (id) {
    case 1: { // the hook: the proud ship at the quay; then only masts above the water
      const sunk = t >= 4.45;
      crowd(cam, out, t, (i) => (sunk ? (i % 2 ? "shock" : "dazed") : i % 3 ? "grin" : "laugh"), (i) => (!sunk && i % 2 ? 0.9 : undefined));
      break;
    }
    case 2: crowd(cam, out, t, (i) => (i % 3 ? "grin" : "laugh"), (i) => (i % 2 ? 0.95 : undefined)); break;
    case 3: break; // the guns (all 3D)
    case 4: { // salute smoke, sails, gusts
      if (t < 13.6) crowd(cam, out, t, (i) => (i % 2 ? "grin" : "smile"), (i) => (i % 3 ? 0.9 : undefined));
      if (t < 13.6) puffs(out, t, W.fired - 0.05, onShip(4, t, 10.8, 3.8, halfW(10.8) + 1.0), 5, 2.4);
      if (t > 14.85) {
        crowd(cam, out, t, (i) => (after(t, W.bigger) ? "nervous" : after(t, W.came) ? "relief" : after(t, W.tipped) ? "nervous" : "smile"), () => undefined);
        for (const [g0, x0] of [[W.gust, -26], [W.gust2, -30]] as const) {
          const k = clamp01((t - (g0 - 0.35)) / 0.6), fade = 1 - clamp01((t - (g0 + 1.1)) / 0.4);
          if (k > 0 && fade > 0) { const kk = q(k, 20); fxCard(out, `gust${kk}`, 800, 400, (p) => gust(p, kk), [x0 + 8 * k, 20 + (g0 === W.gust ? 0 : 3), -9 + 6 * k], 14 * fade, 7 * fade); }
        }
      }
      break;
    }
    case 5: {
      if (t < 22.35) { // water over the sills of the lower gunports
        for (const x of [-4.8, -2.4, 0, 2.4, 4.8, 7.2]) {
          const p = onShip(5, t, x, 1.4, halfW(x) + 0.1), lvl = Math.max(0, p[1]);
          if (p[1] > 1.3 || t < W.water - 0.1) continue;
          const k = q(((t * 1.7 + hh(x * 3, 2)) % 1), 12), g = q(((t * 3 + x) % 1), 6);
          fxCard(out, `splash${k}`, 600, 300, (pp) => splash(pp, k), [p[0], lvl + 0.25, p[2] + 0.2], 1.6, 0.8);
          fxCard(out, `gush${g}`, 300, 500, (pp) => gush(pp, 0.7, g), [p[0], lvl + 0.55, p[2] + 0.05], 0.6, 1.0, Math.PI);
        }
      } else if (t < 24.85) {
        crowd(cam, out, t, (i) => (i % 2 ? "shock" : "nervous"), () => undefined);
        const k = q(((t - 22.35) * 0.8) % 1, 12);
        fxCard(out, `splash${k}`, 600, 300, (pp) => splash(pp, k), [4, 0.4, 6.5], 9, 4.5);
      } else crowd(cam, out, t, (i) => (after(t, W.sank2) ? (i % 3 ? "shock" : "dazed") : i % 2 ? "shock" : "pained"), () => undefined);
      break;
    }
    case 6: { // the stability test at the quay
      const amp = smooth((t - (W.running - 0.4)) / 0.5) * (1 - smooth((t - (W.stopped + 0.1)) / 0.8));
      if (t < 37.2) {
        for (let i = 0; i < 8; i++) {
          const lx = -9 + i * 2.5, lz = 3.2 * runAt(t + i * 0.04) * amp + (1 - amp) * (i % 2 ? 1.2 : -1.2);
          const p = onShip(6, t, lx, DECK, lz), moving = amp > 0.2;
          stand(cam, out, who(200 + i, SAILOR(i), `sailor${i}`), p[0], p[1], p[2], t,
            { mode: moving ? "stroll" : "stand", phase: q(((t * 1.6 + i * 0.13) % 1), 60), expr: after(t, W.rocked) && moving ? "nervous" : after(t, W.stopped) ? "relief" : "grin" }, 1, false);
        }
        const a = onShip(6, t, -12, DECK, -1.5);
        stand(cam, out, who(230, ADMIRAL, "admiral"), a[0], a[1], a[2], t,
          { expr: after(t, W.stopped) ? "stern" : after(t, W.rocked) ? "nervous" : "neutral", wave: after(t, W.stopped) ? 1 : undefined }, 1, false);
      } else { // then they sailed anyway: a clerk on the quay looks the other way
        stand(cam, out, who(240, CLERK(0), "clerk0"), -4, QY + 0.25, 15.2, t, { expr: after(t, W.then) ? "whistle" : "nervous", look: 1, headTilt: 0.25 });
      }
      break;
    }
    case 7: { // the bookcase; a kid leans on it; it tips over
      if (t > 41.9) {
        const B = BOOK, A: V3 = [B[0] - 3.4, 0, B[2] - 0.15], P: V3 = [B[0] - 0.95, 0, B[2] - 0.15];
        if (t < 44.15) walk(cam, out, who(300, KID2, "kid"), A, P, 42.1, 43.7, t, "whistle", 1.0, 0.75);
        else {
          const ex: Expr = after(t, W.leans + 0.35) ? "shock" : "smile_closed";
          out.places.push(person(cam, who(300, KID2, "kid"), P[0], 0, P[2], { side: true, mirror: false }, {}, { mode: "push", expr: ex, blink: lidAt(t, 300) }, 0.75));
          blob(out, P[0], 0, P[2], 0.75);
        }
        if (t > W.leans + 0.55) puffs(out, t, W.leans + 0.55, add(B, [2.0, 0.1, -0.2]), 5, 1.2);
      }
      break;
    }
    case 8: break; // the ship on the water, low angle (all 3D)
    case 9: { // the inquiry: three officials behind the table
      for (let i = 0; i < 3; i++) {
        const shrug = after(t, W.nobody);
        stand(cam, out, who(400 + i, CLERK(i), `clerk${i}`), INQ[0] - 1.2 + i * 1.2, 0, INQ[2] - 0.95, t,
          { expr: shrug ? (i === 1 ? "whistle" : i ? "smile_closed" : "nervous") : "stern", look: shrug ? (i === 1 ? 0 : i ? 1 : -1) : 0, headTilt: shrug && i !== 1 ? 0.25 * (i ? 1 : -1) : undefined }, 1, false);
      }
      break;
    }
    case 10: { // the sea floor: a shipworm turns back from the fresh water; bubbles
      if (t < 55.6) {
        const scared = after(t, W.fresh), u = smooth((t - 52.0) / 1.4), v = smooth((t - (W.fresh + 0.15)) / 1.6);
        const at: V3 = add(FLOOR, [12 - 5 * u + 14 * v, 3.5 + 0.2 * Math.sin(t * 3), 14 - 4 * u + 10 * v]);
        const ph = q((t * 1.5) % 1, 12);
        out.fx.push({ key: `worm${ph}${scared ? "s" : ""}`, cw: 600, ch: 240, draw: (p) => worm(p, ph, scared), x: at[0], y: at[1], z: at[2], w: scared ? 2.6 : -2.6, h: 1.04 });
      }
      for (let i = 0; i < 7; i++) {
        const u = ((t * 0.25 + hh(i, 8)) % 1);
        fxCard(out, "bubble", 120, 120, bubble, add(FLOOR, [-6 + i * 3.2 + hh(i, 2) * 2, 1 + u * 14, 6 + hh(i, 6) * 6]), 0.5 + 0.3 * hh(i, 4), 0.5 + 0.3 * hh(i, 4), 0, false, true);
      }
      break;
    }
    case 11: { // lifted out: the wreck breaks the surface
      if (t > 58.9) for (const [x, z] of [[-9, 6.2], [0, 6.4], [9, 6.0]] as const) {
        const k = q(((t - 58.9) * 0.9 + hh(x, 1)) % 1, 12);
        fxCard(out, `splash${k}`, 600, 300, (pp) => splash(pp, k), [x, 0.5, z], 5, 2.5);
      }
      break;
    }
    case 12: { // the museum: visitors, a kid at the rail
      const M = MUS;
      const V: [number, number, number][] = [[18, 0, 12], [12, 0, 13.5], [-8, 0, 12.5], [-16, 0, 14], [30, 0, 12.5], [4, 0, 15]];
      V.forEach(([x, , z], i) => stand(cam, out, who(500 + i, VIS(i), `vis${i}`), M[0] + x, 0, M[2] + z, t, { expr: i % 2 ? "smile" : "grin", look: i % 3 - 1 }));
      stand(cam, out, who(300, KID2, "kid"), M[0] + 13, 0, M[2] + 11, t, { expr: after(t, W.standing) ? "grin" : after(t, W.ship2) ? "shock" : "smile", look: -1 }, 0.75);
      break;
    }
  }
  return out;
};
export { FPS, fxStars, fxBurst };
