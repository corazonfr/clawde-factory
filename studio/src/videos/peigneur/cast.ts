// Lake Peigneur cast (machinery from the bridge / Pisa / Walkie / Vasa shorts). Our cast as lit flat sprites in the 3D world. Each
// frame every character asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing.
// Characters are yaw-only billboards shaded by cardShade(); standing ones get a soft multiply contact blob. Effects are
// unlit cards. Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, KID, SKINS, townsfolk, fxBurst, fxStars, fxPuff, fxShadow, fxContact,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import { FPS, D0, SHOTS, V3, W, smooth, clamp01, PY, GY, LR, MINE, HEAD, KIT, add, rigAt, bargeAt, funnelAt } from "./story";
import { gush, bubble, splash, fish, drop, twinkle } from "./props2d";
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

// ---- the rig's deck (mirrors world.ts: rotation Y spin, then Z tilt; sink down) ----
const onRig = (id: number, t: number, lx: number, ly: number, lz: number): V3 => {
  const r = rigAt(id, t), c = Math.cos(r.tilt), sn = Math.sin(r.tilt);
  const x1 = lx * c - ly * sn, y1 = lx * sn + ly * c, cs = Math.cos(r.spin), ss = Math.sin(r.spin);
  return [x1 * cs + lz * ss, y1 - r.sink, -x1 * ss + lz * cs];
};

// ---- outfits ----
const WORKER = (v: number): Outfit => ({ jacket: ["#e0702c", "#3b5b9a", "#d9a441"][v % 3], pants: ["#3b3f52", "#2f4f7a", "#6b4a2a"][v % 3], boots: "#3a2a20",
  hat: "cap", cap: ["#f2c230", "#f4f1ea", "#e2453c"][v % 3], belt: "#3a2a20", skin: SKINS[(v * 3 + 1) % 4], moustache: v === 1 ? "#5a3b2a" : undefined });
const MINER = (v: number): Outfit => ({ jacket: ["#3d4a56", "#5d6472", "#4a3a2a", "#2f4f7a"][v % 4], pants: ["#2a2d33", "#3b3f52"][v % 2], boots: "#1d1a22",
  hat: "cap", cap: ["#f2c230", "#f4f1ea", "#e0a23a"][v % 3], belt: "#f2c230", skin: SKINS[(v * 2 + 1) % 4], moustache: v % 3 === 2 ? "#3a2a20" : undefined });
const FISHER = (v: number): Outfit => ({ jacket: ["#3f8a5a", "#c25a3a"][v % 2], pants: "#3b3f52", boots: "#3a2a20", hat: "hair", hair: ["#c9ccd2", "#3a2a20"][v % 2],
  moustache: v ? undefined : "#c9ccd2", build: v ? "adult" : "stout", skin: SKINS[(v + 1) % 4] });
const KID2: Outfit = { ...KID, hat: "hair", hair: "#5a3b2a", jacket: "#3f9fd5" };
const BED_Y = 12;
const KIDS = 0.9;
const bubbles = (out: Stage, t: number, base: V3, n: number, spread: number, rise: number, sz = 0.4) => {
  for (let i = 0; i < n; i++) {
    const u = ((t * 0.3 + hh(i, 8)) % 1);
    fxCard(out, "bubble", 120, 120, bubble, add(base, [(hh(i, 2) - 0.5) * spread, u * rise, (hh(i, 6) - 0.5) * spread * 0.6]), sz * (0.7 + 0.6 * hh(i, 4)), sz * (0.7 + 0.6 * hh(i, 4)), 0, false, true);
  }
};

export const stage = (id: number, t: number, cam: CamInfo, gloom = 0): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  void gloom; void D0; void bodySide; void fxBurst; void fxStars; void twinkle; void funnelAt; void clamp01;
  const crew = (exprs: (i: number) => Expr, look = 0) => {
    const spots: [number, number][] = [[1.6, 2.6], [-2.4, 1.8], [3.2, -0.6]];
    spots.forEach(([lx, lz], i) => {
      const p = onRig(id, t, lx, PY, lz);
      stand(cam, out, who(10 + i, WORKER(i), `worker${i}`), p[0], p[1], p[2], t, { expr: exprs(i), look: look || (i % 3) - 1 }, 1, false);
    });
  };
  switch (id) {
    case 1: if (t > 2.6) crew((i) => (i === 1 ? "whistle" : "grin")); break;
    case 3: { // a fisherman on his boat
      if (t > 10.15 && t < 11.05) stand(cam, out, who(30, FISHER(0), "fisher0"), 39.5, 0.55, 28.7, t, { expr: "smile", wave: after(t, W.boats) ? 0.9 : undefined }, 1, false);
      break;
    }
    case 4: { // the miners at work among the salt pillars
      const M = MINE, sp: [number, number][] = [[-1.5, 2.5], [1.3, 3.5], [-2.6, -2.5], [2.4, -1.5]];
      sp.forEach(([x, z], i) => stand(cam, out, who(40 + i, MINER(i), `miner${i}`), M[0] + x, 0, M[2] + z, t,
        { expr: i % 2 ? "whistle" : "grin", look: (i % 3) - 1, prop: i < 2 ? ["hammer", q((t * 1.4 + i * 0.4) % 1, 12)] : undefined }));
      break;
    }
    case 5: crew((i) => (after(t, W.tilt) ? (i ? "shock" : "nervous") : after(t, W.stuck) ? "shock" : i ? "neutral" : "grin")); break;
    case 6: crew((i) => (i % 2 ? "shock" : "nervous")); break;
    case 7: { // the crew runs along the shore
      for (let i = 0; i < 3; i++) {
        const a: V3 = [-8 - i * 1.8, GY, LR + 5 + i * 1.4], b: V3 = [14 - i * 1.8, GY, LR + 7 + i * 1.4];
        walk(cam, out, who(10 + i, WORKER(i), `worker${i}`), a, b, 21.2, 23.0, t, "shock", 2.4);
      }
      break;
    }
    case 8: { // splashes where the rig and the barges go under
      if (t > W.down - 0.3 && t < 24.4) { const k = q(((t - W.down + 0.3) * 1.2) % 1, 12); fxCard(out, `splash${k}`, 600, 300, (pp) => splash(pp, k), [0, -1.5, 6], 14, 7); }
      if (t > 24.35 && t < 25.3) for (let i = 0; i < 5; i++) { const b = bargeAt(8, t, i), k = q((t * 1.5 + i * 0.2) % 1, 12); if (b.on) fxCard(out, `splash${k}`, 600, 300, (pp) => splash(pp, k), [b.p[0], b.p[1] + 1.5, b.p[2]], 10, 5); }
      break;
    }
    case 9: { // the lake pours in through the roof; two miners run for it
      const M = MINE;
      if (t > 28.2) for (let i = 0; i < 4; i++) {
        const g = q((t * 3 + i * 0.25) % 1, 6);
        fxCard(out, `gush${g}`, 300, 500, (pp) => gush(pp, 1, g), add(M, [1 + (i - 1.5) * 1.1, 4.3, -5 + (i % 2) * 0.6]), 2.2, 6.6);
      }
      if (t > 28.4) { const k = q(((t - 28.4) * 1.3) % 1, 12); fxCard(out, `splash${k}`, 600, 300, (pp) => splash(pp, k), add(M, [1, Math.max(0.2, 3.4 * smooth((t - 28.9) / 3.2)) + 0.3, -4]), 9, 4.5); }
      if (t < 30.0) for (let i = 0; i < 2; i++) walk(cam, out, who(40 + i, MINER(i), `miner${i}`), add(M, [-1 + i * 2, 0, 2 + i]), add(M, [-14 + i * 2, 0, -2 + i]), 27.7, 30.4, t, "shock", 2.2);
      break;
    }
    case 10: { // the shaft head: every miner out, dripping, relieved
      const H = HEAD, sp: [number, number][] = [[-4.2, 2.2], [-2.0, 3.4], [0.2, 2.6], [2.4, 3.6], [4.5, 2.4], [-0.9, 0.6]];
      sp.forEach(([x, z], i) => {
        stand(cam, out, who(40 + i, MINER(i), `miner${i}`), H[0] + x, 0, H[2] + z, t,
          { expr: after(t, W.alive) ? (i % 2 ? "relief_open" : "laugh") : i % 2 ? "relief" : "dazed", wave: after(t, W.alive) && i % 3 === 0 ? 0.9 : undefined, look: (i % 3) - 1 });
        for (let j = 0; j < 2; j++) { const u = (t * 1.1 + hh(i * 3 + j, 2)) % 1; fxCard(out, "drop", 80, 120, drop, add(H, [x + (j - 0.5) * 0.5, 1.6 - 1.5 * u, z + 0.05]), 0.12, 0.18); }
      });
      break;
    }
    case 11: { // the flooded mine: fish swim between the salt pillars
      const M = MINE, u = (t - 34.35) / 2.05, ph = q((t * 2) % 1, 8);
      out.fx.push({ key: `fish${ph}`, cw: 400, ch: 240, draw: (p) => fish(p, ph), x: M[0] - 3 + 5 * u, y: 3.4 + 0.3 * Math.sin(t * 3), z: M[2] + 4, w: 1.6, h: 0.96 });
      out.fx.push({ key: `fish${ph}`, cw: 400, ch: 240, draw: (p) => fish(p, ph), x: M[0] + 3 - 4 * u, y: 4.6, z: M[2] - 2, w: -1.2, h: 0.72 });
      bubbles(out, t, add(M, [0, 0.5, 2]), 10, 12, 7, 0.3);
      break;
    }
    case 12: { // the kid with the sugar straw
      const ex: Expr = after(t, W.bigger) ? "shock" : after(t, W.sip) ? "smile_closed" : "smile";
      stand(cam, out, who(60, KID2, "kid"), KIT[0] + 0.02, 0, KIT[2] - 0.2, t, { expr: ex, look: 0 }, KIDS);
      break;
    }
    case 14: { // a fisherman on the levee stares at the canal running the wrong way
      stand(cam, out, who(31, FISHER(1), "fisher1"), LR + 20, GY + 1.6, 10.6, t, { expr: after(t, W.backwards) ? "dazed" : "neutral", look: -1 }, 1);
      break;
    }
    case 15: { // spray at the foot of the waterfall
      for (let i = 0; i < 4; i++) { const u = (t * 0.7 + i / 4) % 1, k = q(u, 20); fxCard(out, `puff${k}`, 300, 300, (p) => fxPuff(p, k), [LR - 6 - u * 3, -BED_Y + 0.5 + u * 3, -4 + i * 2.6], 3 + 3 * u, 3 + 3 * u, 0, false, true); }
      break;
    }
    case 16: { // barges pop up like corks
      for (let i = 0; i < 5; i++) {
        const t0 = W.popped - 0.4 + i * 0.18 + 0.35, b = bargeAt(16, t, i);
        if (t > t0 && t < t0 + 1.2) { const k = q((t - t0) / 1.2, 12); fxCard(out, `splash${k}`, 600, 300, (pp) => splash(pp, k), [b.p[0], 0.4, b.p[2] + 3], 12, 6); }
      }
      break;
    }
    case 18: { // the oil man on the shore
      if (t < 66.9) stand(cam, out, who(10, WORKER(0), "worker0"), 0, GY, LR + 2, t, { expr: after(t, W.oil) ? "nervous" : "neutral", look: -1 }, 1);
      break;
    }
  }
  return out;
};
export { FPS, fxStars, fxBurst };
