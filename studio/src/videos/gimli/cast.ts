// Gimli Glider cast (machinery from the bridge / Pisa / Walkie shorts). Our cast as lit flat sprites in the 3D world. Each
// frame every character asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing.
// Characters are yaw-only billboards shaded by cardShade(); standing ones get a soft multiply contact blob. Effects are
// unlit cards. Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, KID, PARENT, SKINS, fxBurst, fxStars, fxPuff, fxShadow, fxContact, fxRing,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import {
  FPS, D0, SHOTS, V3, W, smooth, clamp01, AJ, CK, CAPT, FO, TRUCK, WK1, WK2, PANEL, TANKA, TANKB, GM, CROWD_Z, HANGAR, K, STOP_X,
  tankA, tankB, jetAt,
} from "./story";
import {
  clipboard, gauge, tank, lamp, thoughtGlider, balance, flourBag, kscale, cake, bike, checkFlag, plaster, wrench, dust,
} from "./props2d";
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

// ================= the Gimli Glider cast =================
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

// ---- outfits (1983: airline crew, ramp workers, race fans, a baker) ----
const CAPTAIN: Outfit = { jacket: "#26324a", pants: "#26324a", boots: "#1d1a22", hat: "cap", cap: "#26324a", buttons: "#e8c45a", build: "stout", skin: SKINS[1] };
const FOFF: Outfit = { jacket: "#26324a", pants: "#26324a", boots: "#1d1a22", hat: "cap", cap: "#26324a", buttons: "#e8c45a", moustache: "#5a3b2a", skin: SKINS[0] };
const YOUNG: Outfit = { jacket: "#4a6a9a", pants: "#4a6a9a", boots: "#1d1a22", hat: "cap", cap: "#3b5070", buttons: "#d9dde0", skin: SKINS[0] };
const RAMP = (v: number): Outfit => ({ jacket: v % 2 ? "#f08a2c" : "#f2cf4a", pants: ["#3b5b9a", "#3d414c"][v % 2], boots: "#3a2a20", hat: "cap", cap: v % 2 ? "#2a2d33" : "#e2453c", skin: SKINS[(v * 3 + 1) % 4], moustache: v % 2 ? undefined : "#4a3426" });
const BAKER: Outfit = { jacket: "#f4f1ea", pants: "#3b3f52", boots: "#3a2a20", hat: "hair", hair: "#8a5a3c", dress: "#f4f1ea", skin: SKINS[2] };
const MECH = (v: number): Outfit => ({ jacket: "#3f6f9a", pants: "#3f6f9a", boots: "#2a2d33", hat: "cap", cap: "#e2453c", skin: SKINS[(v * 2 + 1) % 4] });
const FAN = (v: number): Outfit => {
  const j = ["#c9853a", "#8a5a3c", "#3f8a8a", "#c25a3a", "#e8c45a", "#5d7a3a", "#a0522d", "#7b5ac9"][v % 8];
  const o: Outfit = { jacket: j, pants: ["#3b3f52", "#6b4a2a", "#3b5b9a", "#4a4d55"][v % 4], boots: "#3a2a20", skin: SKINS[(v * 3 + 2) % 4] };
  return v % 3 === 1 ? { ...o, hat: "hair", hair: ["#5a3b2a", "#d9a441", "#2a201a", "#8a5a3c"][v % 4], dress: ["#d9a441", "#c25a7a", "#3f8a8a", "#e2453c"][v % 4] }
    : { ...o, hat: v % 4 === 2 ? "cap" : "hair", cap: "#e2453c", hair: ["#3a2a20", "#2a201a", "#8a5a3c", "#c9ccd2"][v % 4], moustache: v % 5 === 2 ? "#3a2a20" : undefined };
};
const KIDB = (v: number): Outfit => ({ ...KID, jacket: ["#f08a2c", "#3f9fd5", "#c25a7a"][v % 3], hat: v % 2 ? "cap" : "hair", hair: "#5a3b2a", cap: "#e2453c", skin: SKINS[(v + 1) % 4] });
void PARENT; void fxRing; void fxStars;

/** a row of people facing the lens */
const crowd = (cam: CamInfo, out: Stage, t: number, n: number, x0: number, dx: number, z0: number, dz: number, expr: (i: number) => Expr, wave?: (i: number) => number | undefined, base = 100) => {
  for (let i = 0; i < n; i++) {
    const x = x0 + i * dx + (hh(i, 1) - 0.5) * dx * 0.5, z = z0 + (i % 3) * dz + (hh(i, 2) - 0.5) * 0.6;
    stand(cam, out, who(base + i, FAN(i), `f${i % 8}`), x, D0, z, t, { expr: expr(i), wave: wave?.(i), look: i % 2 ? 1 : -1 });
  }
};
/** a seated pilot (cockpit) */
const sit = (cam: CamInfo, out: Stage, w: Who, at: V3, t: number, fo: FrontOpts) => {
  out.places.push(person(cam, w, at[0], at[1], at[2], front0, { mode: "sit", blink: lidAt(t, w.i), ...fo }, {}));
};
/** dark engine smoke from a stopping engine, drifting back */
const smoke = (out: Stage, t: number, t0: number, at: V3, s = 1) => {
  if (t < t0) return;
  for (let i = 0; i < 5; i++) {
    const u = (t - t0) * 0.8 - i * 0.12;
    if (u < 0 || u > 1) continue;
    const k = q(u, 20);
    fxCard(out, `puff${k}`, 300, 300, (p) => fxPuff(p, k), [at[0] - u * 9 * s, at[1] + u * 0.8 * s + (hh(i, 3) - 0.5) * 0.4, at[2] + (hh(i, 4) - 0.5) * 0.6], 1.6 * s * (0.6 + u), 1.6 * s * (0.6 + u), 0, false, true);
  }
};
/** a flat prop card facing straight down +z (yaw 0) */
const faceZ = (out: Stage) => { out.fx[out.fx.length - 1].yaw = 0; };

export const stage = (id: number, t: number, cam: CamInfo, gloom = 0): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  void gloom;
  const w1 = who(1, RAMP(0), "ramp0"), w2 = who(2, RAMP(1), "ramp1"), cap = who(3, CAPTAIN, "capt"), fo = who(4, FOFF, "fo");
  switch (id) {
    case 1: { // cruising at 41,000 ft; one engine coughs
      if (t > 2.7) smoke(out, t, 3.3, [AJ[0] + 2.6, AJ[1] + 1.55, AJ[2] + 6.2], 0.6);
      break;
    }
    case 2: { // "because of a maths mistake": a ramp worker and his sums; then the shiny new jet
      if (t < 5.8) {
        stand(cam, out, w1, WK1[0], D0, WK1[2], t, { expr: after(t, W.maths) ? "dazed" : "neutral", look: -1, headTilt: after(t, W.maths) ? 0.12 : 0 });
        fxCard(out, "clip1", 260, 320, (p) => clipboard(p, 1), [WK1[0] + 0.28, 1.2, WK1[2] + 0.22], 0.3, 0.37, 0.08);
      } else {
        stand(cam, out, w1, WK1[0], D0, WK1[2], t, { expr: "smile", look: -1 });
        stand(cam, out, w2, WK2[0], D0, WK2[2], t, { expr: "smile", look: 1 });
      }
      break;
    }
    case 3: { // kilograms; the broken gauge; sums by hand; in pounds
      if (t < 11.1) {
        stand(cam, out, w2, TRUCK[0] - 1.6, D0, TRUCK[2] - 2.2, t, { expr: "smile", look: -1, wave: 0.5 });
      } else if (t < 12.95) {
        const br = after(t, W.broken) ? 1 : q((t * 2) % 1, 10) * 0.4;
        fxCard(out, `gauge${br}`, 300, 300, (p) => gauge(p, br), [PANEL[0], 1.32, PANEL[2] + 0.215], 0.62, 0.62); faceZ(out);
        if (after(t, W.broken) && t < W.broken + 0.5) { const k = q((t - W.broken) / 0.5, 20); fxCard(out, `burstW${k}`, 500, 500, (p) => fxBurst(p, k, "#ffffff"), [PANEL[0], 1.35, PANEL[2] + 0.3], 0.9, 0.9); }
      } else if (t < 13.8) {
        const k = q(clamp01((t - 13.0) / 0.8), 6);
        stand(cam, out, w1, WK1[0], D0, WK1[2], t, { expr: "stern", look: 1, headTilt: 0.1 });
        fxCard(out, `clip${k}`, 260, 320, (p) => clipboard(p, k), [WK1[0] + 0.25, 1.15, WK1[2] + 0.25], 0.3, 0.37, -0.1);
      } else {
        stand(cam, out, w1, WK1[0], D0, WK1[2], t, { expr: after(t, W.pounds) ? "grin" : "smile", look: -1, wave: after(t, W.pounds) ? 0.85 : undefined });
        fxCard(out, "clip1", 260, 320, (p) => clipboard(p, 1), [WK1[0] - 0.25, 1.15, WK1[2] + 0.25], 0.3, 0.37, 0.1);
        stand(cam, out, w2, WK1[0] - 1.5, D0, WK1[2] - 0.5, t, { expr: "smile", look: 1 });
      }
      break;
    }
    case 4: { // needed vs loaded
      const a = q(tankA(t), 40), b = q(tankB(t), 40), mk = t > 17.9 ? 1 : -1;
      fxCard(out, `tankA${a}`, 300, 600, (p) => tank(p, a, "#3f9fd5", -1), [TANKA[0], 2.2, TANKA[2]], 2.2, 4.4); faceZ(out);
      fxCard(out, `tankB${b}|${mk}`, 300, 600, (p) => tank(p, b, "#e8963a", mk), [TANKB[0], 2.2, TANKB[2]], 2.2, 4.4); faceZ(out);
      stand(cam, out, w1, TANKB[0] + 2.0, D0, TANKB[2] + 1.0, t, { expr: after(t, W.less) ? "shock" : after(t, W.loaded) ? "smile" : "neutral", look: -1 });
      stand(cam, out, w2, TANKA[0] - 0.6, D0, TANKA[2] + 1.6, t, { expr: after(t, W.half) ? "nervous" : "smile", look: 1 });
      break;
    }
    case 5: { // a warning beeped
      const on = after(t, W.warning) && ((t - W.warning) * 3) % 1 < 0.6 ? 1 : 0;
      sit(cam, out, cap, CAPT, t, { expr: after(t, W.beeped) ? "stern" : "neutral", look: 1 });
      sit(cam, out, fo, FO, t, { expr: after(t, W.beeped) ? "shock" : "neutral", look: -1 });
      fxCard(out, `lamp${on}`, 220, 220, (p) => lamp(p, on), [CK[0] - 0.7, CK[1] + 2.0, CK[2]], 0.26, 0.26);
      break;
    }
    case 6: { // left engine stops, then the right
      smoke(out, t, W.stopped - 0.05, [AJ[0] + 2.6, AJ[1] + 1.55, AJ[2] - 6.2], 0.8);
      smoke(out, t, W.one - 0.05, [AJ[0] + 2.6, AJ[1] + 1.55, AJ[2] + 6.2], 0.8);
      break;
    }
    case 7: { // the screens go dark; the warning lamp keeps blinking
      const on = ((t - W.warning) * 3) % 1 < 0.6 ? 1 : 0;
      fxCard(out, `lamp${on}`, 220, 220, (p) => lamp(p, on), [CK[0] + 0.46, CK[1] + 1.43, CK[2] - 0.6], 0.16, 0.16);
      break;
    }
    case 8: break; // a very heavy glider
    case 9: { // luckily: a glider pilot. Unluckily: no Winnipeg
      if (t < 32.0) {
        sit(cam, out, cap, CAPT, t, { expr: after(t, W.fun) ? "smile_closed" : "smile", look: 1 });
        if (after(t, W.gliders)) { const pop = smooth((t - (W.gliders - 0.1)) / 0.2); fxCard(out, "thoughtGlider", 520, 440, thoughtGlider, [CAPT[0] + 0.15, CAPT[1] + 1.42, CAPT[2] + 0.32], 0.62 * pop, 0.52 * pop); }
      } else {
        sit(cam, out, fo, FO, t, { expr: after(t, W.winnipeg) ? "pained" : "nervous", look: -1 });
      }
      break;
    }
    case 10: { // Gimli: an old air force base, now partly a race track, and a race on that day
      if (t > 37.5) {
        crowd(cam, out, t, 12, GM[0] - 34, 2.2, CROWD_Z, 0.8, (i) => (after(t, W.raceB) ? (i % 3 ? "grin" : "laugh") : "smile"), (i) => (after(t, W.raceB) && i % 2 ? 0.9 : undefined), 100);
        for (let i = 0; i < 2; i++) {
          stand(cam, out, who(60 + i, KIDB(i), `kid${i}`), GM[0] - 1 + i * 2.6, D0, 9 + i * 0.6, t, { expr: "grin", look: i ? -1 : 1, wave: i ? 0.7 : undefined }, 0.75);
          fxCard(out, `bike${i}`, 420, 260, (p) => bike(p, i ? "#c25a7a" : "#3f9fd5"), [GM[0] - 0.2 + i * 2.6, 0.38, 9.3 + i * 0.6], 1.2, 0.74);
        }
        const wv = q((t * 2.2) % 1, 8), up = after(t, W.race);
        stand(cam, out, who(70, FAN(5), "flagger"), GM[0] + 7, D0, 11, t, { expr: up ? "grin" : "smile", wave: up ? 0.95 : undefined, look: -1 });
        if (up) fxCard(out, `flag${wv}`, 300, 300, (p) => checkFlag(p, wv), [GM[0] + 7.55, 2.35, 11.1], 0.8, 0.8);
      }
      if (t > 39.3) for (let i = 0; i < 2; i++) {
        const x = GM[0] - 60 + 50 * (t - 39.3) - i * 3 - 2.5;
        for (let j = 0; j < 3; j++) { const k = q(((t * 3 + j / 3) % 1), 12); fxCard(out, `puff${k}`, 300, 300, (p) => fxPuff(p, k), [x - 1.5 - k * 3, 0.6 + k * 0.5, i ? 3 : -3], 1.2 + k, 1.2 + k, 0, false, true); }
      }
      break;
    }
    case 11: { // the analogy
      const bk = who(80, BAKER, "baker");
      if (t < 44.0) {
        const tl = q(smooth((t - 42.75) / 0.35), 12);
        fxCard(out, `balance${tl}`, 600, 440, (p) => balance(p, tl), [K[0], 1.27, K[2]], 0.95, 0.7);
      } else if (t < 47.9) {
        stand(cam, out, bk, K[0] - 0.15, D0, K[2] - 1.0, t, { expr: after(t, W.pounds2) ? "grin" : "smile", look: 1 });
        fxCard(out, "flour", 260, 320, flourBag, [K[0] - 0.55, 1.15, K[2] + 0.1], 0.36, 0.44);
        const nd = q(0.45 * smooth((t - W.weigh) / 0.6), 20);
        fxCard(out, `kscale${nd}`, 300, 300, (p) => kscale(p, nd), [K[0] + 0.38, 1.14, K[2] + 0.15], 0.42, 0.42);
      } else {
        const h = q(1 - 0.65 * smooth((t - (W.less2 - 0.05)) / 0.35), 20);
        stand(cam, out, bk, K[0] - 0.35, D0, K[2] - 1.0, t, { expr: after(t, W.cake) ? "dazed" : after(t, W.less2) ? "shock" : "smile", look: 1 });
        fxCard(out, `cake${h}`, 420, 380, (p) => cake(p, h), [K[0] + 0.15, 1.2, K[2] + 0.1], 0.6, 0.54);
        if (after(t, W.less2) && t < W.less2 + 0.8) { const k = q((t - W.less2) / 0.8, 20); fxCard(out, `puff${k}`, 300, 300, (p) => fxPuff(p, k), [K[0] + 0.15, 1.25 + k * 0.2, K[2] + 0.2], 0.5, 0.5, 0, false, true); }
      }
      break;
    }
    case 12: { // the landing
      const jp = jetAt(12, t).pos;
      if (t < 51.6) crowd(cam, out, t, 4, GM[0] - 155, 1.6, CROWD_Z + 0.5, 0.3, (i) => (i % 2 ? "shock" : "nervous"), (i) => (i % 2 ? 0.9 : undefined), 120);
      if (t > 55.5 && t < 58.9) {
        crowd(cam, out, t, 6, GM[0] - 122, 2.6, CROWD_Z, 0.5, () => "shock", (i) => (i % 2 ? 0.95 : undefined), 130);
        if (after(t, W.folded) && t < 58.35) {
          for (let j = 0; j < 3; j++) { const k = q(((t * 4 + j / 3) % 1), 10); fxCard(out, `burstY${k}`, 500, 500, (p) => fxBurst(p, k, "#ffd84a"), [jp[0] + 17.5 - k * 3, 0.8, 1.8], 1.6, 1.6, j); }
        }
        for (let j = 0; j < 3; j++) { const k = q(((t * 2 + j / 3) % 1), 12); fxCard(out, `dust${k}`, 300, 220, (p) => dust(p, k), [jp[0] - 2 - k * 6, 1.5 + k, 3.2], 4 + 3 * k, 3 + 2 * k, 0, false, true); }
      }
      if (t >= 58.9) {
        for (let i = 0; i < 5; i++) stand(cam, out, who(140 + i, FAN(i + 2), `p${i}`), STOP_X + 11 + i * 1.5, D0, 9.5 + (i % 2) * 1.2, t, { expr: after(t, W.hurt) ? (i % 2 ? "relief" : "smile") : "dazed", wave: after(t, W.hurt) && i % 2 ? 0.8 : undefined, look: i % 2 ? 1 : -1 });
        crowd(cam, out, t, 4, STOP_X + 20, 1.6, 12, 0.5, () => "grin", (i) => (i % 2 ? 0.95 : 0.6), 160);
      }
      break;
    }
    case 13: { // flashback: the first officer, years before, at this base
      const sal = after(t, W.served);
      stand(cam, out, who(5, YOUNG, "young"), HANGAR[0], D0, HANGAR[2] + 9.5, t, { expr: sal ? "grin" : "smile", wave: sal ? 0.98 : undefined, look: -1 });
      stand(cam, out, who(6, { ...YOUNG, moustache: "#3a2a20", skin: SKINS[3] }, "young2"), HANGAR[0] - 2.2, D0, HANGAR[2] + 7.6, t, { expr: "smile", look: 1 });
      break;
    }
    case 14: { // patched up
      fxCard(out, "plaster", 420, 200, plaster, [STOP_X + 17.2, 1.55, 1.7], 1.7, 0.81, -0.2);
      stand(cam, out, who(90, MECH(0), "mech0"), STOP_X + 15.5, D0, 4.2, t, { expr: after(t, W.patched) ? "grin" : "smile", wave: 0.8, look: 1 });
      fxCard(out, "wrench", 300, 120, wrench, [STOP_X + 15.85, 2.05, 4.3], 0.5, 0.2, -0.6);
      stand(cam, out, who(91, MECH(1), "mech1"), STOP_X + 19.5, D0, 3.6, t, { expr: "smile", look: -1 });
      break;
    }
    case 15: break; // twenty-five more years: the Gimli Glider
  }
  return out;
};
export { FPS, fxStars, fxBurst };
