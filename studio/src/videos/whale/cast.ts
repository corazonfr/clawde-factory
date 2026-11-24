// Exploding-whale cast (machinery from the bridge / Pisa / Walkie shorts). Our cast as lit flat sprites in the 3D world. Each
// frame every character asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing.
// Characters are yaw-only billboards shaded by cardShade(); standing ones get a soft multiply contact blob. Effects are
// unlit cards. Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, KID, PARENT, SKINS, fxBurst, fxStars, fxPuff, fxShadow, fxContact, fxRing,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import {
  FPS, D0, SHOTS, V3, W, BOOM, smooth, clamp01, WHALE, CRATES, POST, TRUCK, ENG, VET, NEAR_Z, FAR_Z, TVCAM, PLUNGER, CAR, CHUNK,
  PICNIC, SIGN, LOT_X,
} from "./story";
import {
  gull, plunger, sticks, stink, thought, tvcam, boom, chunk, flyChunk, ketchup, splat, mist, pennants, cone,
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

// ---- outfits (1970 Oregon coast) ----
const ENGR: Outfit = { jacket: "#e9e4d8", pants: "#5a4a3a", boots: "#3a2a20", hat: "cap", cap: "#f2cf4a", buttons: "#3b5b9a" };
const CREW = (v: number): Outfit => ({ jacket: "#f08a2c", pants: ["#3b5b9a", "#5a4a3a", "#3d414c"][v % 3], boots: "#3a2a20", hat: "cap", cap: "#f2cf4a", skin: SKINS[(v * 3 + 1) % 4], moustache: v % 2 ? "#4a3426" : undefined });
const VETO: Outfit = { jacket: "#5d6b3a", pants: "#4a4d3a", boots: "#2a2d33", hat: "cap", cap: "#4a5530", moustache: "#c9ccd2", skin: SKINS[1], build: "stout", buttons: "#c9b46a" };
const LOCAL = (v: number): Outfit => {
  const j = ["#c9853a", "#8a5a3c", "#3f8a8a", "#c25a3a", "#e8c45a", "#5d7a3a", "#a0522d", "#7b5ac9"][v % 8];
  const o: Outfit = { jacket: j, pants: ["#3b3f52", "#6b4a2a", "#3b5b9a", "#4a4d55"][v % 4], boots: "#3a2a20", skin: SKINS[(v * 3 + 2) % 4] };
  return v % 3 === 1 ? { ...o, hat: "hair", hair: ["#5a3b2a", "#d9a441", "#2a201a", "#8a5a3c"][v % 4], dress: ["#d9a441", "#c25a7a", "#3f8a8a", "#e2453c"][v % 4] }
    : { ...o, hat: v % 4 === 2 ? "cap" : "hair", cap: "#8a5a3c", hair: ["#3a2a20", "#2a201a", "#8a5a3c", "#c9ccd2"][v % 4], moustache: v % 5 === 2 ? "#3a2a20" : undefined };
};
const CAMMAN: Outfit = { jacket: "#3b5b9a", pants: "#3b3f52", boots: "#2a2d33", hat: "cap", cap: "#2a2d33", moustache: "#5a3b2a" };
const OWNER: Outfit = { jacket: "#6d2f3a", pants: "#2a2d33", boots: "#241726", hat: "hair", hair: "#3a2a20", buttons: "#e8c45a", build: "stout" };
const SALES: Outfit = { jacket: "#d9a441", pants: "#5a3b2a", boots: "#3a2a20", hat: "hair", hair: "#2a201a", moustache: "#2a201a", buttons: "#f4f1ea" };
const RANGER: Outfit = { jacket: "#5d7a3a", pants: "#6b5a3a", boots: "#3a2a20", hat: "cap", cap: "#8a6a3a", skin: SKINS[3] };

/** a crowd of locals along a line, facing the lens */
const crowd = (cam: CamInfo, out: Stage, t: number, n: number, x0: number, dx: number, z0: number, dz: number, expr: (i: number) => Expr, wave?: (i: number) => number | undefined, base = 100) => {
  for (let i = 0; i < n; i++) {
    const x = x0 + i * dx + (hh(i, 1) - 0.5) * dx * 0.5, z = z0 + (i % 3) * dz + (hh(i, 2) - 0.5) * 0.6;
    stand(cam, out, who(base + i, LOCAL(i), `l${i % 8}`), x, D0, z, t, { expr: expr(i), wave: wave?.(i), look: i % 2 ? 1 : -1 });
  }
};
/** gulls perched on the post; mood 0 calm .. 1 eager; go 0 perched .. 1 gone (flying off up and left) */
const gulls = (out: Stage, t: number, mood: number, go = 0) => {
  for (let i = 0; i < 3; i++) {
    const g = clamp01(go - i * 0.08), flap = g > 0 ? (((t * 8 + i * 0.37) % 1) < 0.5 ? 0 : 0.4) : 1;
    const at: V3 = [POST[0] - 0.28 + i * 0.28 - g * (6 + i * 2), 1.86 + (i === 1 ? 0.06 : 0) + g * (5 + i), POST[2] + 0.05 * i];
    fxCard(out, `gull${q(flap, 10)}|${mood > 0.5 ? 1 : 0}`, 300, 260, (p) => gull(p, flap, mood), at, 0.42, 0.36, 0, false, false);
  }
};
/** stink lines over the whale */
const stinks = (out: Stage, t: number, k = 1) => {
  for (let i = 0; i < 4; i++) {
    const ph = q(((t * 0.6 + i * 0.27) % 1), 12);
    fxCard(out, `stink${ph}`, 300, 420, (p) => stink(p, ph), [WHALE[0] - 4.5 + i * 3.2, 4.4 + 0.3 * (i % 2), WHALE[2] + 0.5], 1.6 * k, 2.2 * k, 0, false, true);
  }
};
/** blubber chunks falling out of the sky around `at` from t0 on, landing with a dust puff */
const rain = (out: Stage, t: number, t0: number, at: V3, n: number, spread: number, size = 1) => {
  for (let i = 0; i < n; i++) {
    const ts = t0 + hh(i, 21) * 1.6, u = (t - ts) / 1.3;
    if (u < 0) continue;
    const x = at[0] + (hh(i, 22) - 0.5) * spread, z = at[2] + (hh(i, 23) - 0.5) * spread * 0.5, s = size * (0.5 + hh(i, 24) * 0.9);
    if (u < 1) {
      const y = 0.3 + 15 * (1 - u) * (1 - u) * (1 + u);
      fxCard(out, `chunk${i % 5}`, 260, 220, (p) => chunk(p, i % 5), [x, y, z], 0.9 * s, 0.76 * s, q(t * 3 + i, 8));
    } else {
      fxCard(out, `chunkSq${i % 5}`, 260, 220, (p) => chunk(p, i % 5, 0.6), [x, 0.3 * s, z], 0.9 * s, 0.7 * s);
      if (u < 2.2) { const k = q((u - 1) / 1.2, 20); fxCard(out, `puff${k}`, 300, 300, (p) => fxPuff(p, k), [x, 0.45 * s, z + 0.1], 1.4 * s, 1.4 * s, 0, false, true); }
    }
  }
};

export const stage = (id: number, t: number, cam: CamInfo, gloom = 0): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  void gloom; void TRUCK;
  switch (id) {
    case 1: { // the hook: a dead whale on the beach, gulls; then the cases of dynamite
      gulls(out, t, 0);
      if (t > 3.2) fxCard(out, "sticksTop", 200, 260, sticks, [CRATES[0] + 0.1, 1.05, CRATES[2] + 0.25], 0.36, 0.46, -0.25);
      break;
    }
    case 2: { // Florence: locals come to look; a person for scale; the smell
      if (t < 6.35) crowd(cam, out, t, 7, -6, 2.0, 5.5, 0.9, () => "neutral", undefined, 100);
      else if (t < 9.95) {
        stand(cam, out, who(101, LOCAL(1), "l1"), 2.6, D0, 3.8, t, { expr: after(t, W.tons) ? "shock" : "neutral", look: -1 });
        stand(cam, out, who(104, LOCAL(4), "l4"), -3.2, D0, 4.2, t, { expr: "neutral", look: 1 });
      } else {
        const nose = after(t, W.smellier);
        stand(cam, out, who(102, LOCAL(2), "l2"), -6.0, D0, 9.5, t, { expr: nose ? "pained" : "neutral", wave: nose ? 0.15 : undefined, look: -1 });
        stand(cam, out, who(103, LOCAL(3), "l3"), -4.9, D0, 8.9, t, { expr: nose ? "dazed" : "neutral", look: -1 });
      }
      if (t > 9.6) stinks(out, t);
      gulls(out, t, 0);
      break;
    }
    case 3: { // the highway department arrives; the engineer sizes it up like a boulder
      walk(cam, out, who(1, ENGR, "engr"), [TRUCK[0] - 2.2, D0, TRUCK[2] + 1.6], [ENG[0], D0, ENG[2]], 11.5, 13.2, t, "stern");
      for (let i = 0; i < 2; i++) walk(cam, out, who(10 + i, CREW(i), `crew${i}`), [TRUCK[0] - 1 + i, D0, TRUCK[2] + 2], [ENG[0] + 1.6 + i * 1.2, D0, ENG[2] + 1.4 + i * 0.6], 11.8 + i * 0.3, 13.6, t, "neutral");
      if (after(t, W.boulder) && t > 13.4) {
        const pop = smooth((t - (W.boulder - 0.1)) / 0.2);
        fxCard(out, "thought", 520, 440, thought, [ENG[0] - 0.65, 2.65, ENG[2] - 0.2], 1.25 * pop, 1.06 * pop);
      }
      stinks(out, t, 0.9);
      break;
    }
    case 4: { // the plan: blow it to tiny pieces; the gulls get interested
      const big = after(t, W.blow);
      stand(cam, out, who(1, ENGR, "engr"), ENG[0], D0, ENG[2], t, { expr: big ? "grin" : "smile", wave: big ? 0.95 : undefined, look: -1 });
      stand(cam, out, who(10, CREW(0), "crew0"), ENG[0] + 1.4, D0, ENG[2] + 1.2, t, { expr: big ? "nervous" : "neutral", look: -1 });
      stand(cam, out, who(11, CREW(1), "crew1"), ENG[0] - 1.3, D0, ENG[2] + 0.9, t, { expr: "neutral", look: 1 });
      if (big && t < 17.6) { const k = q(((t - W.blow) * 1.6) % 1, 12); fxCard(out, `burst${k}`, 500, 500, (p) => fxBurst(p, k, "#ffd84a"), [ENG[0] + 0.55, 2.35, ENG[2] + 0.1], 0.6, 0.6); }
      gulls(out, t, after(t, W.seagulls) ? 1 : 0);
      break;
    }
    case 5: { // the veteran: twenty sticks would do it. They used twenty cases.
      if (t < 22.95) {
        const up = after(t, W.twenty);
        stand(cam, out, who(2, VETO, "vet"), VET[0], D0, VET[2], t, { expr: up ? "stern" : "neutral", wave: up ? 0.7 : undefined, look: 0 });
        if (up) fxCard(out, "sticks", 200, 260, sticks, [VET[0] + 0.42, 1.95, VET[2] + 0.05], 0.26, 0.34, -0.15);
      } else {
        stand(cam, out, who(2, VETO, "vet"), VET[0], D0, VET[2], t, { expr: after(t, W.cases) ? "dazed" : "nervous", look: -1 });
        stand(cam, out, who(1, ENGR, "engr"), ENG[0], D0, ENG[2], t, { expr: "grin", wave: 0.6, look: -1 });
        for (let i = 0; i < 2; i++) stand(cam, out, who(10 + i, CREW(i), `crew${i}`), CRATES[0] + 3 + i * 1.2, D0, CRATES[2] + 1.4, t, { expr: "smile", look: -1 });
      }
      break;
    }
    case 6: { // crowds, the TV camera, everyone moves back
      if (t < 27.15) {
        crowd(cam, out, t, 11, -9, 1.7, NEAR_Z, 0.8, (i) => (i % 3 ? "smile" : "grin"), (i) => (i % 4 === 1 ? 0.8 : undefined), 100);
        stand(cam, out, who(20, CAMMAN, "camman"), TVCAM[0] + 0.7, D0, TVCAM[2] + 0.2, t, { expr: after(t, W.rolled) ? "grin" : "smile", look: -1 });
        fxCard(out, "tvcam", 260, 460, tvcam, [TVCAM[0], 1.0, TVCAM[2]], 0.75, 1.32);
      } else if (t < 28.3) {
        for (let i = 0; i < 11; i++) {
          const x = -9 + i * 1.7 + (hh(i, 1) - 0.5) * 0.8, z = NEAR_Z + (i % 3) * 0.8;
          walk(cam, out, who(100 + i, LOCAL(i), `l${i % 8}`), [x, D0, z], [x, D0, z + 6], 27.2 + 0.05 * i, 29.5, t, "neutral", 1.0);
        }
      } else {
        crowd(cam, out, t, 11, -9, 1.7, FAR_Z, 0.8, () => "neutral", undefined, 100);
        fxCard(out, "tvcam", 260, 460, tvcam, [TVCAM[0], 1.0, FAR_Z - 1], 0.75, 1.32);
      }
      break;
    }
    case 7: { // the button, then BOOM
      if (t < BOOM - 0.05) {
        const d = q(smooth((t - (W.pushed - 0.1)) / 0.15), 10);
        stand(cam, out, who(1, ENGR, "engr"), PLUNGER[0] - 0.55, D0, PLUNGER[2] - 0.35, t, { expr: d > 0.5 ? "grin" : "stern", look: 1 });
        fxCard(out, `plunger${d}`, 300, 360, (p) => plunger(p, d), [PLUNGER[0], 0.36, PLUNGER[2]], 0.6, 0.72);
      } else {
        const k = q(clamp01((t - BOOM) / 1.5), 30);
        fxCard(out, `boom${k}`, 800, 900, (p) => boom(p, k), [WHALE[0], 17, WHALE[2] + 1], 32, 36);
        for (let i = 0; i < 26; i++) { // chunks thrown out of the blast
          const u = t - BOOM - 0.05;
          if (u < 0) break;
          const a = hh(i, 31) * Math.PI * 2, sp = 10 + hh(i, 32) * 16, vy = 14 + hh(i, 33) * 14;
          const x = WHALE[0] + Math.cos(a) * sp * u, z = WHALE[2] + Math.abs(Math.sin(a)) * sp * u * 1.2, y = 2 + vy * u - 4.9 * u * u;
          if (y > 0) fxCard(out, `chunk${i % 5}`, 260, 220, (p) => chunk(p, i % 5), [x, y, z], 1.6, 1.35, q(u * 4 + i, 8));
        }
        crowd(cam, out, t, 4, -13.5, 1.6, FAR_Z - 9.5, 0.3, (i) => (after(t, W.luckily) ? (i % 2 ? "laugh" : "grin") : "shock"), (i) => (i % 2 || after(t, W.hurt) ? 0.9 : undefined), 150);
      }
      break;
    }
    case 8: { // luckily nobody was hurt / unluckily a quarter of a mile was not far enough
      const up = after(t, W.unluckily);
      crowd(cam, out, t, 9, -6, 1.5, FAR_Z, 0.7, (i) => (up ? (after(t, W.enough) ? (i % 2 ? "shock" : "nervous") : "neutral") : (i % 3 ? "laugh" : "grin")),
        (i) => (!up && i % 2 ? 0.9 : undefined), 100);
      if (up) rain(out, t, 32.2, [0.5, 0, FAR_Z - 3], 14, 14, 1.4);
      break;
    }
    case 9: { // chunks of whale rain on the crowd; everyone runs
      for (let i = 0; i < 10; i++) {
        const x = -8 + i * 1.6, z = FAR_Z + (i % 3) * 0.7;
        walk(cam, out, who(100 + i, LOCAL(i), `l${i % 8}`), [x, D0, z], [x + 6 + (i % 3), D0, z + 8], 34.3 + 0.04 * i, 37.5, t, "shock", 1.3);
      }
      rain(out, t, 33.9, [2, 0, FAR_Z + 1], 28, 26, 1.1);
      break;
    }
    case 10: { // the brand-new car
      stand(cam, out, who(30, OWNER, "owner"), CAR[0] + 1.6, D0, CAR[2] + 2.2, t, { expr: after(t, W.crushed) ? (after(t, W.car) ? "dazed" : "shock") : "smile", look: -1, wave: after(t, W.crushed) ? 0.9 : undefined });
      if (after(t, W.crushed)) {
        const k = q(clamp01((t - W.crushed) / 0.5), 20);
        if (k < 1) fxCard(out, `burstW${k}`, 500, 500, (p) => fxBurst(p, k, "#ffffff"), [CAR[0] - 0.3, 1.9, CAR[2] + 0.4], 2.2, 2.2);
        puffs(out, t, W.crushed, [CAR[0] - 0.3, 1.3, CAR[2] + 0.6], 4, 1.2);
        const st = q((t * 0.8) % 1, 12);
        if (after(t, W.car)) fxCard(out, `stars${st}`, 420, 210, (p) => fxStars(p, st), [CAR[0] + 1.6, 2.15, CAR[2] + 2.3], 0.6, 0.3);
      }
      break;
    }
    case 11: { // the blast scared the gulls away
      gulls(out, t, 0, smooth((t - (W.blast - 0.1)) / 1.1));
      break;
    }
    case 12: { // blubber: thick, rubbery fat; dynamite doesn't make dust, it throws it
      const thrown = t > 46.9 && after(t, W.throws);
      if (!thrown) {
        const jig = t > W.rubbery - L2 && t < W.rubbery + 0.8 ? q(0.5 + 0.5 * Math.sin((t - W.rubbery) * 30) * (1 - (t - W.rubbery) / 0.8), 10) : 0;
        fxCard(out, `bigChunk${jig}`, 260, 220, (p) => chunk(p, 3, jig), [CHUNK[0], 0.32, CHUNK[2]], 0.8, 0.68);
        if (after(t, W.dynamiteB) && t < 46.9) fxCard(out, "stick1", 200, 260, sticks, [CHUNK[0] + 0.52, 0.24, CHUNK[2] + 0.05], 0.22, 0.29, 0.3);
        if (after(t, W.dust) && t < 46.9) { const fd = smooth((t - W.dust) / 0.25) * (1 - smooth((t - 46.65) / 0.2)); if (fd > 0.05) fxCard(out, "mist", 400, 300, mist, [CHUNK[0], 0.5, CHUNK[2] + 0.1], 1.1 * fd, 0.8 * fd, 0, false, true); }
      } else {
        const u = t - (W.throws - L2);
        fxCard(out, "flyChunk3", 300, 220, (p) => flyChunk(p, 3), [CHUNK[0] - 3 * u, 0.32 + 6 * u - 4.9 * u * u + 1.5 * u, CHUNK[2] - 6 * u], 1.0, 0.74, 0.4);
        puffs(out, t, W.throws - L2, [CHUNK[0], 0.2, CHUNK[2]], 4, 0.9);
      }
      break;
    }
    case 13: { // stomp on a ketchup packet: big red splats everywhere
      const P = PICNIC, st = after(t, W.stomp), spl = after(t, W.big);
      out.places.push(person(cam, who(41, PARENT, "dad"), P[0] - 0.55, D0, P[2] - 0.55, front0,
        { mode: "sit", blink: lidAt(t, 41), expr: spl ? (after(t, W.everywhere) ? "dazed" : "shock") : "smile_closed" }, {}));
      blob(out, P[0] - 0.55, D0, P[2] - 0.55);
      stand(cam, out, who(40, { ...KID, hat: "hair", hair: "#5a3b2a" }, "kid"), P[0] + 0.45, D0, P[2] + 0.15, t,
        { expr: st ? (spl ? "laugh" : "grin") : "smile", lift: st && t < W.stomp + 0.3 ? 90 : 60, wave: st ? 0.5 : undefined }, 0.75);
      const sq = q(smooth((t - (W.stomp - 0.05)) / 0.12), 10);
      fxCard(out, `ketchup${sq}`, 360, 220, (p) => ketchup(p, sq), [P[0] + 0.25, 0.16, P[2] + 0.75], 0.5, 0.3);
      if (spl) {
        const n = after(t, W.everywhere) ? 9 : 4;
        const SP: V3[] = [[P[0] - 0.58, 0.75, P[2] - 0.4], [P[0] - 0.42, 1.0, P[2] - 0.38], [P[0] + 0.5, 0.55, P[2] + 0.3], [P[0] + 0.8, 0.32, P[2] - 0.5],
          [P[0] - 0.2, 0.05, P[2] + 0.3], [P[0] - 0.75, 0.5, P[2] - 0.35], [P[0] + 0.3, 0.8, P[2] + 0.25], [P[0] - 1.0, 0.05, P[2] + 0.1], [P[0] + 0.9, 0.05, P[2] + 0.5]];
        for (let i = 0; i < n; i++) {
          const ti = i < 4 ? W.big + i * 0.08 : W.everywhere + (i - 4) * 0.06, sz = q(smooth((t - ti) / 0.12), 10);
          if (sz > 0) fxCard(out, `splat${i % 4}|${sz}`, 260, 260, (p) => splat(p, i % 4, sz), [SP[i][0], SP[i][1], SP[i][2] + 0.05], 0.2, 0.2, i * 0.7);
        }
      }
      break;
    }
    case 14: { // bulldozed and buried
      stand(cam, out, who(10, CREW(0), "crew0"), 6, D0, 6.5, t, { expr: "neutral", look: -1 });
      stand(cam, out, who(11, CREW(1), "crew1"), -7, D0, 5.5, t, { expr: "pained", look: 1 });
      puffs(out, t, 53.5, [3.5, 0.4, 1.5], 4, 2.0);
      break;
    }
    case 15: { // today: Oregon buries beached whales where they land
      stand(cam, out, who(50, RANGER, "ranger"), 2.0, D0, 7.0, t, { expr: after(t, W.land) ? "smile_closed" : "smile", look: -1, wave: after(t, W.buries) ? 0.4 : undefined });
      fxCard(out, "cone", 200, 300, cone, [4.4, 0.38, 5.6], 0.5, 0.75);
      fxCard(out, "cone", 200, 300, cone, [-0.8, 0.38, 5.4], 0.5, 0.75);
      gulls(out, t, 1);
      break;
    }
    case 16: { // the crushed car; the dealership: a whale of a deal
      if (t < 60.8) {
        stand(cam, out, who(30, OWNER, "owner"), CAR[0] + 1.5, D0, CAR[2] + 2.0, t, { expr: "pained", look: -1 });
      } else {
        const deal = after(t, W.whaleDeal);
        const X = LOT_X;
        if (t < 62.8) {
          walk(cam, out, who(30, OWNER, "owner"), [X + 4, D0, 4], [X + 0.4, D0, 0.6], 60.9, 62.4, t, "smile");
          stand(cam, out, who(31, SALES, "sales"), X - 0.6, D0, 0.4, t, { expr: "grin", wave: 0.9, look: 1 });
        } else {
          stand(cam, out, who(30, OWNER, "owner"), X + 0.2, D0, 0.7, t, { expr: deal ? "grin" : "smile", look: -1, wave: deal ? 0.5 : undefined });
          stand(cam, out, who(31, SALES, "sales"), X - 0.65, D0, 0.45, t, { expr: deal ? "laugh" : "grin", wave: deal ? 0.6 : 0.9, look: 1 });
          if (deal) { const st = q((t * 0.9) % 1, 12); fxCard(out, `stars${st}`, 420, 210, (p) => fxStars(p, st), [X - 0.2, 2.3, 0.7], 0.7, 0.35); }
        }
        for (const [x, y, z] of [[-6, 5.2, -6], [6, 5.2, -6], [0, 5.6, -2]] as const) fxCard(out, "pennants", 900, 160, pennants, [X + x, y, z], 7, 1.25);
      }
      break;
    }
    case 17: { // fifty years later: the town votes; the park sign
      const hands = after(t, W.voted);
      if (t < 66.85) {
        crowd(cam, out, t, 10, SIGN[0] - 7, 1.55, SIGN[2] + 9, 0.7, (i) => (hands ? (i % 3 ? "grin" : "laugh") : "smile"), (i) => (hands ? (i % 2 ? 0.95 : 0.7) : undefined), 200);
      } else {
        stand(cam, out, who(201, LOCAL(1), "l1"), SIGN[0] - 1.35, D0, SIGN[2] + 2.2, t, { expr: after(t, W.exploding) ? "laugh" : "grin", look: 1 });
        stand(cam, out, who(40, { ...KID, hat: "hair", hair: "#5a3b2a" }, "kid"), SIGN[0] + 1.35, D0, SIGN[2] + 2.2, t, { expr: "grin", wave: after(t, W.exploding) ? 0.9 : undefined, look: -1 }, 0.75);
        if (after(t, W.exploding)) { const k = q(clamp01((t - W.exploding) / 0.6), 20); if (k < 1) fxCard(out, `burst${k}`, 500, 500, (p) => fxBurst(p, k, "#ffd84a"), [SIGN[0], 2.3, SIGN[2] + 0.2], 3.2, 3.2); }
      }
      break;
    }
  }
  return out;
};
export { FPS, fxStars, fxBurst };
