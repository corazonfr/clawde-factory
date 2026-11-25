// Hubble-glasses cast (machinery from the bridge / Pisa / Walkie shorts). Our cast as lit flat sprites in the 3D world. Each
// frame every character asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing.
// Characters are yaw-only billboards shaded by cardShade(); standing ones get a soft multiply contact blob. Effects are
// unlit cards. Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, KID, PARENT, SKINS, fxBurst, fxStars, fxPuff, fxShadow, fxContact, fxRing,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import { FPS, D0, SHOTS, V3, W, LIFT, smooth, clamp01, SP, SHU, PAD, CTRL, MIR, TOOL, EYE, MUSM, add, liftAt, hubbleAt } from "./story";
import { glasses, hair, rays, knob, polisher, flame, twinkle } from "./props2d";
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

// ================= the exploding-whale cast =================
export type Stage = { places: Place[]; fx: FxPlace[] };

const who = (i: number, o: Outfit, okey: string): Who => ({ i, o, okey });
const front0 = { side: false, mirror: false };
/** a standing character facing the lens */
const stand = (cam: CamInfo, out: Stage, w: Who, x: number, y: number, z: number, t: number, fo: FrontOpts, sc = 1, shadow = true) => {
  out.places.push(person(cam, w, x, y, z, front0, { mode: "stand", blink: lidAt(t, w.i), ...fo }, {}, sc));
  if (shadow) blob(out, x, y, z, sc);
};
/** a character walking from a to b over [t0, t1] (side or front view picked from the lens) */
const walk = (cam: CamInfo, out: Stage, w: Who, a: V3, b: V3, t0: number, t1: number, t: number, expr: Expr, sp = 0.8) => {
  const u = clamp01((t - t0) / (t1 - t0)), x = a[0] + (b[0] - a[0]) * u, z = a[2] + (b[2] - a[2]) * u;
  const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1;
  const moving = t > t0 && t < t1, phase = q(((t - t0) * sp + hh(w.i, 5)) % 1, 120);
  const view = viewOf(cam, x, z, dx / L, dz / L);
  const fo: FrontOpts = { mode: moving ? "stroll" : "stand", phase, expr, blink: lidAt(t, w.i) };
  const so: SideOpts = { mode: moving ? "march" : "stand", phase, expr, blink: lidAt(t, w.i), stomp: 0.5, stride: 0.85 * view.fs };
  out.places.push(person(cam, w, x, a[1], z, view, fo, so));
  blob(out, x, a[1], z);
};
const fxCard = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, at: V3, w: number, h: number, rot = 0, flat = false, soft = false) =>
  out.fx.push({ key, cw, ch, draw, x: at[0], y: at[1], z: at[2], w, h, rot, flat, soft });
const L2 = LEAD;
const after = (t: number, w: number) => t > w - L2;
const puffs = (out: Stage, t: number, t0: number, at: V3, n = 4, s = 1) => {
  for (let i = 0; i < n; i++) {
    const u = ((t - t0) * 0.7 + i / n) % 1;
    if (t < t0) return;
    const k = q(u, 20);
    fxCard(out, `puff${k}`, 300, 300, (p) => fxPuff(p, k), [at[0] + (hh(i, 3) - 0.5) * 0.4 * s, at[1] + u * 1.2 * s, at[2] + (hh(i, 4) - 0.5) * 0.3 * s], 0.5 * s * (0.6 + u), 0.5 * s * (0.6 + u), 0, false, true);
  }
};

// ---- outfits ----
const ENGR = (v: number): Outfit => ({ jacket: ["#f4f1ea", "#dfe8f2", "#f4f1ea"][v % 3], pants: ["#3b3f52", "#5a4a3a", "#2a2d33"][v % 3], boots: "#2a2d33",
  hat: "hair", hair: ["#3a2a20", "#8a5a3c", "#c9ccd2"][v % 3], skin: SKINS[(v * 2 + 1) % 4], moustache: v === 2 ? "#c9ccd2" : undefined, buttons: "#3b5b9a" });
const TECH: Outfit = { jacket: "#f4f6f8", pants: "#f4f6f8", boots: "#dfe4ea", hat: "cap", cap: "#f4f6f8", buttons: "#9fb4c8" };
const ASTRO = (v: number): Outfit => ({ jacket: "#f4f1ea", pants: "#e9e4d8", boots: "#dcd6c8", hat: "helmet", skin: SKINS[(v * 3 + 1) % 4], buttons: v ? "#3b5b9a" : "#e2453c", build: "stout" });
const DOC: Outfit = { jacket: "#f4f1ea", pants: "#3f8a8a", boots: "#3a2a20", hat: "hair", hair: "#2a201a", skin: SKINS[3], buttons: "#3f8a8a" };
const KID2: Outfit = { ...KID, hat: "hair", hair: "#5a3b2a", jacket: "#3f9fd5" };
const VIS = (v: number): Outfit => ({ jacket: ["#c25a3a", "#5d7a3a", "#7b5ac9"][v % 3], pants: ["#3b3f52", "#6b4a2a", "#3b5b9a"][v % 3], boots: "#3a2a20",
  hat: "hair", hair: ["#2a201a", "#d9a441", "#8a5a3c"][v % 3], skin: SKINS[(v * 3 + 2) % 4] });

/** a card that pops in (scale 0 -> 1 over 0.2 s) at t0 */
const pop = (t: number, t0: number) => smooth((t - (t0 - L2)) / 0.2);
/** the glasses on the open end of the telescope */
const hubbleGlasses = (out: Stage, t: number, t0: number, at: V3) => {
  const k = pop(t, t0);
  if (k > 0) fxCard(out, "glassesBig", 600, 240, glasses, add(at, [7.9, 0.1, 0.9]), 4.4 * k, 1.76 * k);
};

export const stage = (id: number, t: number, cam: CamInfo, gloom = 0): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  void gloom; void TOOL; void SHU; void fxRing; void fxBurst; void bodySide; void PARENT; void walk; void puffs;
  switch (id) {
    case 1: { // the hook: the telescope over the Earth; it needs glasses
      if (t > 3.6) hubbleGlasses(out, t, W.glasses, SP);
      break;
    }
    case 2: { // liftoff: flames and smoke under the stack
      const lift = liftAt(t), base = 8 + lift;
      if (t > LIFT - 0.6) {
        const fl = q((t * 9) % 1, 6);
        for (const [x, z, s2] of [[0.4, -6.4, 1.3], [0.4, 6.4, 1.3], [7.2, 0, 1.0]] as const)
          fxCard(out, `flame${fl}`, 300, 600, (p) => flame(p, fl), [PAD[0] + x, base - 3.2 * s2 - 1, PAD[2] + z], 3.2 * s2, 6.4 * s2);
        for (let i = 0; i < 9; i++) {
          const u = clamp01((t - LIFT - i * 0.07) / 1.4), k = q(Math.min(0.85, u), 20);
          if (u <= 0) continue;
          const side = i % 2 ? 1 : -1, d = 4 + i * 2.2 * u;
          fxCard(out, `puff${k}`, 300, 300, (p) => fxPuff(p, k), [PAD[0] + 2 + (i % 3) * 3, 3 + i * 0.6, PAD[2] + side * d], 8 + 10 * u, 8 + 10 * u, 0, false, true);
        }
      } else {
        const k = q(((t * 0.5) % 1) * 0.6, 20); // a little steam on the pad
        fxCard(out, `puff${k}`, 300, 300, (p) => fxPuff(p, k), [PAD[0] + 6, 6, PAD[2] + 5], 4, 4, 0, false, true);
      }
      break;
    }
    case 3: break; // Hubble released over the Earth (all 3D)
    case 4: case 9: { // the control room
      const C = CTRL, sharp = id === 9;
      const blurry = after(t, W.blurry), still = after(t, W.still);
      const ex = (i: number): Expr => sharp ? (i % 2 ? "laugh" : "grin") : !after(t, W.first) ? "smile" : !blurry ? "neutral" : t > 19.1 ? (i === 0 ? "dazed" : "pained") : still ? "pained" : i === 2 ? "stern" : "nervous";
      const P: V3[] = [add(C, [-1.9, 0, 0.7]), add(C, [-0.3, 0, 1.5]), add(C, [1.45, 0, -0.35])];
      P.forEach((at, i) => stand(cam, out, who(1 + i, ENGR(i), `eng${i}`), at[0], D0, at[2], t,
        { expr: ex(i), look: i === 2 ? -1 : 0, wave: sharp ? 0.95 : undefined, headTilt: !sharp && t > W.nasa2 - 0.1 && i === 0 ? 0.35 : undefined }));
      // the focus knob on the desk: turns on each "adjust"
      const turn = smooth((t - W.adjust) / 0.5) + smooth((t - W.adjust2) / 0.5);
      out.fx.push({ key: "knob", cw: 240, ch: 240, draw: knob, x: C[0] + 1.0, y: 0.7, z: C[2] - 0.78, w: 0.22, h: 0.22, rot: -turn * 1.6, yaw: 0 });
      if (sharp && after(t, W.sharp2)) { const k = pop(t, W.sharp2); fxCard(out, "twinkle", 200, 200, twinkle, add(C, [1.7, 4.8, -5.8]), 0.9 * k, 0.9 * k); }
      break;
    }
    case 5: { // the lab: the big mirror; its edge; a hair
      stand(cam, out, who(5, TECH, "tech"), MIR[0] - 2.0, D0, MIR[2] + 1.1, t, { expr: after(t, W.wrong) ? "nervous" : "smile", look: 1 });
      if (t > 25.4 && after(t, W.less)) {
        const k = smooth((t - (W.less - L2)) / 0.6);
        fxCard(out, "hair", 600, 120, hair, add(MIR, [-0.85 - 0.6 * (1 - k), 0.25, 0.42]), 0.75, 0.15, -0.35);
      }
      break;
    }
    case 6: { // luckily polished carefully; unluckily the wrong shape; the tool
      if (t < 34.9) {
        const un = after(t, W.unluckily);
        stand(cam, out, who(5, TECH, "tech"), MIR[0] - 2.0, D0, MIR[2] + 1.1, t,
          { expr: !un ? "smile_closed" : after(t, W.wrong2) ? "shock" : "nervous", look: 1, wave: !un ? 0.55 : undefined });
        if (!un) {
          const a = (t - 29.7) * 5.5;
          fxCard(out, "polisher", 300, 300, polisher, add(MIR, [-0.55 + 0.3 * Math.cos(a), -0.35 + 0.25 * Math.sin(a), 0.62]), 0.45, 0.45);
        }
      }
      break;
    }
    case 7: { // bad eyesight; light lands in two places; the glasses
      const E = EYE, fixd = t > 46.9;
      if (t < 41.5 || fixd) {
        stand(cam, out, who(40, KID2, "kid"), E[0] + 0.55, D0, E[2] + 3.3, t,
          { expr: fixd ? (after(t, W.too) ? "grin" : "smile") : after(t, W.eyesight) ? "pained" : "neutral", look: -1 }, 0.75);
        if (!fixd) stand(cam, out, who(41, DOC, "doc"), E[0] - 0.3, D0, E[2] + 2.3, t, { expr: "smile", look: 1, wave: after(t, W.same) ? 0.8 : undefined });
        if (fixd) {
          const k = pop(t, W.fix + 0.05);
          if (k > 0) fxCard(out, "glassesKid", 600, 240, glasses, [E[0] + 0.55, 0.78 + 0.25 * (1 - k), E[2] + 3.42], 0.42, 0.17);
        }
      } else {
        const k = q(clamp01((t - (W.light - L2)) / 2.0), 30);
        out.fx.push({ key: `rays${k}`, cw: 800, ch: 600, draw: (p) => rays(p, k, 0), x: E[0] - 2.6, y: 1.6, z: E[2] + 1.22, w: 1.6, h: 1.2, yaw: 0.12 });
      }
      break;
    }
    case 8: { // Endeavour catches Hubble; two spacewalkers carry the box in; the glasses
      if (t >= 52.4 && t < 57.2) {
        const H = hubbleAt(8, t), u = smooth((t - 52.6) / 4.0);
        const bx = H[0] - 4.6 - 1.4 * u, bob = 0.06 * Math.sin(t * 2);
        stand(cam, out, who(60, ASTRO(0), "astro0"), bx - 0.95, H[1] - 1.75 + bob, H[2] + 2.45, t, { expr: after(t, W.corrective) ? "grin" : "smile", look: 1, wave: 0.5 }, 0.9, false);
        stand(cam, out, who(61, ASTRO(1), "astro1"), bx + 0.95, H[1] - 1.6 - bob, H[2] + 2.55, t, { expr: "smile", look: -1, wave: 0.5 }, 0.9, false);
      }
      if (t >= 57.2) hubbleGlasses(out, t, W.glasses2, SP);
      break;
    }
    case 10: { // the museum: the backup mirror that never flew
      const M = MUSM, y = D0;
      if (t < 64.95) {
        stand(cam, out, who(70, VIS(0), "vis0"), M[0] - 2.6, y, M[2] + 3.0, t, { expr: "smile", look: 1 });
        stand(cam, out, who(71, VIS(1), "vis1"), M[0] + 2.4, y, M[2] + 2.3, t, { expr: "smile_closed", look: -1 });
      }
      stand(cam, out, who(40, KID2, "kid"), M[0] + 1.6, y, M[2] + 2.6, t, { expr: after(t, W.never) ? "shock" : after(t, W.right) ? "grin" : "smile", look: -1 }, 0.75);
      stand(cam, out, who(72, VIS(2), "vis2"), M[0] + 2.45, y, M[2] + 2.25, t, { expr: after(t, W.flew) ? "laugh" : "smile", look: -1 });
      if (t > 67.6) { const k = pop(t, 67.8); fxCard(out, "twinkle", 200, 200, twinkle, add(M, [0.7, 0.75, 0.15]), 0.35 * k, 0.35 * k); }
      break;
    }
  }
  return out;
};
export { FPS, fxStars, fxBurst };
