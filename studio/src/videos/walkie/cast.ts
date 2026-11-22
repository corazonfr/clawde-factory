// Walkie-Scorchie cast (machinery from the bridge / Pisa shorts). Our cast as lit flat sprites in the 3D world. Each
// frame every character asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing.
// Characters are yaw-only billboards shaded by cardShade(); standing ones get a soft multiply contact blob. Effects are
// unlit cards. Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, KID, SKINS, fxBurst, fxStars, fxPuff, fxShadow, fxContact, fxRing,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import {
  FPS, D0, SHOTS, V3, W, smooth, clamp01, CAR, MIRROR, BADGE, MAT, CRACK, REPORTER, LAMP, PAPER, ARCHI, TABLE, KIDP, VEGAS_X, SPOT,
} from "./story";
import {
  mirror, badge, shimmer, doormat, crack, pan, fork, thermo, newspaper, walkie, cheque, drawing, scissors, coins, spoon, icecream,
  hotDot, sweat, palm, pigeon,
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

// ================= the Walkie-Scorchie cast =================
export type Stage = { places: Place[]; fx: FxPlace[] };

const SUITS = ["#2f3a5a", "#4a4d55", "#3b3f52", "#8a6a4a", "#2f5f6a", "#6d2f3a", "#5a6f7a"];
const WORKER = (v: number): Outfit => {
  const o: Outfit = { jacket: SUITS[v % 7], pants: ["#2a2d33", "#3b3f52", "#4a4d55"][v % 3], boots: "#241726", skin: SKINS[(v * 3 + 1) % 4] };
  return v % 3 === 1 ? { ...o, hat: "hair", hair: ["#5a3b2a", "#2a201a", "#d9a441"][v % 3], dress: ["#3f6fb5", "#c25a7a", "#d9a441", "#5d9a5a"][v % 4] }
    : { ...o, hat: "hair", hair: ["#3a2a20", "#2a201a", "#8a5a3c", "#c9ccd2"][v % 4], moustache: v % 5 === 2 ? "#3a2a20" : undefined };
};
const BIZ: Outfit = { jacket: "#2f3a5a", pants: "#2a2d33", boots: "#241726", hat: "hair", hair: "#3a2a20", buttons: "#c9ccd2" };
const SHOPK: Outfit = { jacket: "#5d7a3a", pants: "#3b3f52", boots: "#3a2a20", hat: "cap", cap: "#e9dcc0", moustache: "#4a3426", build: "stout" };
const REPORTER_O: Outfit = { jacket: "#b5653f", pants: "#3b5b9a", boots: "#3a2a20", hat: "hair", hair: "#8a5a3c", skin: SKINS[1] };
const DEV: Outfit = { jacket: "#4a4d55", pants: "#2a2d33", boots: "#241726", hat: "hair", hair: "#5a3b2a", build: "stout", buttons: "#e8c45a" };
const ARCH: Outfit = { jacket: "#2a2d33", pants: "#2a2d33", boots: "#241726", hat: "hair", hair: "#e9e6de", buttons: "#2a2d33", skin: SKINS[2] };
const BATHER = (v: number): Outfit => ({ jacket: ["#e2453c", "#3f9fd5", "#f2cf4a", "#e08ab0", "#5d9a5a", "#f08a2c"][v % 6], pants: ["#3f9fd5", "#f4f1ea", "#e2453c"][v % 3],
  boots: SKINS[v % 4], skin: SKINS[v % 4], hat: v % 2 ? "cap" : "hair", cap: "#f4f1ea", hair: ["#5a3b2a", "#d9a441", "#2a201a"][v % 3] });

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
/** heat shimmer over a point */
const heat = (out: Stage, t: number, at: V3, w = 1.2, h = 1.2) => {
  const ph = q((t * 1.5) % 1, 12);
  fxCard(out, `shimmer${ph}`, 400, 400, (p) => shimmer(p, ph), at, w, h, 0, false, true);
};
const puffs = (out: Stage, t: number, t0: number, at: V3, n = 4, s = 1) => {
  for (let i = 0; i < n; i++) {
    const u = ((t - t0) * 0.7 + i / n) % 1;
    if (t < t0) return;
    const k = q(u, 20);
    fxCard(out, `puff${k}`, 300, 300, (p) => fxPuff(p, k), [at[0] + (hh(i, 3) - 0.5) * 0.4 * s, at[1] + u * 1.2 * s, at[2] + (hh(i, 4) - 0.5) * 0.3 * s], 0.5 * s * (0.6 + u), 0.5 * s * (0.6 + u), 0, false, true);
  }
};
/** a crowd of office workers along a line, facing the lens */
const crowd = (cam: CamInfo, out: Stage, t: number, n: number, x0: number, dx: number, z0: number, dz: number, expr: (i: number) => Expr, wave?: (i: number) => number | undefined, base = 100) => {
  for (let i = 0; i < n; i++) {
    const x = x0 + i * dx + (hh(i, 1) - 0.5) * dx * 0.5, z = z0 + (i % 3) * dz + (hh(i, 2) - 0.5) * 0.6;
    stand(cam, out, who(base + i, WORKER(i), `w${i % 7}`), x, D0, z, t, { expr: expr(i), wave: wave?.(i), look: i % 2 ? 1 : -1 });
  }
};

export const stage = (id: number, t: number, cam: CamInfo, gloom = 0): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  switch (id) {
    case 1: { // the hook: the beam lands on the car; the mirror goes soft
      const m = q(0.15 + 0.6 * smooth((t - (W.melted0 - 0.2)) / 0.9), 30);
      fxCard(out, `mirror${m}`, 300, 300, (p) => mirror(p, m), [MIRROR[0], MIRROR[1], MIRROR[2] + 0.02], 0.36, 0.36);
      heat(out, t, [CAR[0] + 0.5, 1.6, CAR[2] + 0.4], 2.4, 1.6);
      if (t > 3.0) crowd(cam, out, t, 4, 9, 1.4, 6.6, 0.5, () => "shock", (i) => (i % 2 ? 0.9 : undefined));
      break;
    }
    case 2: { // London: proud office workers, then the nickname
      if (t < 6.6) {
        crowd(cam, out, t, 8, -64, 2.0, -6.9, -0.7, (i) => (after(t, W.shiny) ? (["grin", "smile", "smile_closed"] as Expr[])[i % 3] : "smile"));
      }
      if (t > 7.9) {
        stand(cam, out, who(1, WORKER(0), "w0"), -2.75, D0, -8.8, t, { expr: after(t, W.walkie) ? "grin" : "smile_closed", look: 1 });
        stand(cam, out, who(2, WORKER(4), "w4"), -1.55, D0, -9.3, t, { expr: after(t, W.walkie) ? "laugh" : "smile", wave: 0.9 });
        const up = smooth((t - (W.walkie - 0.35)) / 0.3);
        fxCard(out, "walkie", 220, 460, walkie, [-1.2, 1.55 + 0.35 * up, -9.15], 0.2, 0.42, -0.12);
      }
      break;
    }
    case 3: { // the car owner parks and leaves; an hour later, the mirror and the badge melt
      if (t < 13.45) {
        walk(cam, out, who(3, BIZ, "biz"), [4.3, D0, 5.45], [12.5, D0, 7.4], W.jaguar + 0.25, W.jaguar + 2.6, t, "smile_closed");
        if (t > W.jaguar - L2 && t < W.jaguar + 0.5) { const k = q((t - W.jaguar + L2) / 0.5, 20); fxCard(out, `ring${k}`, 300, 300, (p) => fxRing(p, k), [CAR[0], 1.2, CAR[2]], 1.2, 1.2); }
      } else {
        heat(out, t, [CAR[0] + 0.3, 1.7, CAR[2] + 0.4], 2.6, 1.8);
        if (t > 14.3 && t < 15.65) {
          const m = q(0.08 + 0.92 * smooth((t - (W.melted - 0.4)) / 0.45), 30);
          fxCard(out, `mirror${m}`, 300, 300, (p) => mirror(p, m), [MIRROR[0], MIRROR[1], MIRROR[2] + 0.02], 0.36, 0.36);
          if (m > 0.6) puffs(out, t, W.melted, [MIRROR[0], MIRROR[1] + 0.1, MIRROR[2]], 3, 0.4);
        }
        if (t >= 15.6) {
          const m = q(smooth((t - (W.badge - 0.45)) / 0.5), 30);
          fxCard(out, `badge${m}`, 240, 300, (p) => badge(p, m), [BADGE[0] + 0.04, BADGE[1] - 0.03, BADGE[2]], 0.17, 0.21);
          if (m > 0.5) puffs(out, t, W.badge, [BADGE[0] + 0.05, BADGE[1] + 0.1, BADGE[2]], 3, 0.35);
        }
      }
      break;
    }
    case 4: { // the doormat, then the paving
      const sc = q(smooth((t - (W.scorched - 0.3)) / 0.5), 20);
      fxCard(out, `mat${sc}`, 400, 260, (p) => doormat(p, sc), MAT, 1.1, 0.7, 0, true);
      if (sc > 0.3) puffs(out, t, W.scorched, [MAT[0] + 0.1, 0.1, MAT[2]], 5, 0.8);
      stand(cam, out, who(4, SHOPK, "shopk"), 12.95, D0, 8.62, t, { expr: after(t, W.scorched) ? "shock" : "smile", look: -1 });
      const g = q(smooth((t - (W.cracked - 0.2)) / 0.3), 20);
      if (t > 18.9) fxCard(out, `crack${g}`, 400, 400, (p) => crack(p, g), CRACK, 1.3, 1.3, 0.3, true);
      if (t > 18.9) heat(out, t, [CRACK[0], 0.6, CRACK[2] - 0.6], 1.6, 1.2);
      break;
    }
    case 5: { // the reporter fries an egg on the pavement, then eats it
      const eating = t > 23.85;
      out.places.push(person(cam, who(5, REPORTER_O, "rep"), REPORTER[0], D0, REPORTER[2], front0,
        { mode: "sit", blink: lidAt(t, 5), expr: eating ? (after(t, W.lunch) ? "smile_closed" : "lick") : after(t, W.fried) ? "grin" : "smile" }, {}));
      blob(out, REPORTER[0], D0, REPORTER[2]);
      const e = q(smooth((t - (W.fried - 0.15)) / 0.5), 20);
      fxCard(out, `pan${e}`, 500, 320, (p) => pan(p, e), [REPORTER[0] + 0.05, 0.24, REPORTER[2] + 0.42], 0.62, 0.4);
      if (e > 0.2 && !eating) heat(out, t, [REPORTER[0] + 0.05, 0.7, REPORTER[2] + 0.4], 0.7, 0.8);
      if (eating && t > W.ate - L2) fxCard(out, "forkBite", 160, 300, (p) => fork(p, true), [REPORTER[0] + 0.1, 0.62, REPORTER[2] + 0.25], 0.09, 0.17, 0.35);
      break;
    }
    case 6: { // ninety degrees: the thermometer pops; the pigeons leave
      const lv = q(0.3 + 0.62 * smooth((t - 25.6) / 1.5), 30), pop = q(smooth((t - (W.celsius - 0.08)) / 0.35), 20);
      fxCard(out, `thermo${lv}|${pop}`, 160, 520, (p) => thermo(p, lv, pop), [LAMP[0], 1.75, LAMP[2] + 0.16], 0.22, 0.72);
      for (let i = 0; i < 3; i++) {
        const go = smooth((t - (W.celsius - 0.1 + i * 0.12)) / 0.8), flap = go > 0 && go < 1 ? q(((t * 7 + i * 0.3) % 1) < 0.5 ? 0 : 0.4, 10) : 1;
        fxCard(out, `pigeon${flap}`, 300, 260, (p) => pigeon(p, flap), [LAMP[0] - 0.6 + i * 0.45 + go * 1.5, 0.13 + go * 1.8, LAMP[2] + 0.5 - go * 0.6], 0.3, 0.26);
      }
      break;
    }
    case 7: { // the newspaper lands; then everyone looks up
      const y = PAPER[1] + 1.4 * (1 - smooth((t - 28.15) / 0.35)) ** 2;
      if (t < 29.65) fxCard(out, "paper", 600, 400, newspaper, [PAPER[0], y, PAPER[2]], 0.84, 0.56, 0.25, true);
      if (t > 29.6) crowd(cam, out, t, 4, -12.6, 1.1, 6.0, 0.4, (i) => (after(t, W.scorchie) ? (i % 2 ? "shock" : "nervous") : "neutral"), (i) => (i % 2 ? 0.9 : undefined), 130);
      break;
    }
    case 8: { // luckily it's London (clouds); unluckily the sunniest summer in years
      const sunOut = after(t, W.unluckily), blaze = after(t, W.sunniest);
      crowd(cam, out, t, 9, -47, 1.5, 6.1, 0.55,
        (i) => (blaze ? (i % 3 ? "shock" : "nervous") : sunOut ? "nervous" : gloom > 0.5 ? (["smile_closed", "relief", "grin"] as Expr[])[i % 3] : "nervous"),
        (i) => (blaze && i % 2 ? 0.9 : undefined), 140);
      if (blaze) for (let i = 0; i < 4; i++) fxCard(out, "sweat", 120, 160, sweat, [-46.6 + i * 3.0, 1.95, 6.3 + (i % 3) * 0.55], 0.1, 0.13);
      break;
    }
    case 9: { // a flat window: a couple of passers-by under the parallel light
      crowd(cam, out, t, 3, 40, 3.0, -6.5, 0.6, () => "neutral", undefined, 160);
      break;
    }
    case 11: { // the kid, the spoon and the ice cream
      const glint = q(smooth((t - (W.spoon - 0.2)) / 0.15) * (1 - smooth((t - (W.spoon + 0.35)) / 0.3)), 10);
      const melt = q(smooth((t - (W.spoon + 0.55)) / 0.9), 20);
      stand(cam, out, who(60, { ...KID, hat: "hair", hair: "#5a3b2a" }, "kid"), KIDP[0], D0, KIDP[2], t,
        { expr: melt > 0.3 ? "shock" : after(t, W.spoon) ? "grin" : "smile", wave: 0.2 }, 0.75);
      fxCard(out, `spoon${glint}`, 200, 420, (p) => spoon(p, glint), [KIDP[0] + 0.24, 0.92, KIDP[2] + 0.08], 0.13, 0.27, -0.5);
      fxCard(out, `ice${melt}`, 260, 380, (p) => icecream(p, melt), [KIDP[0] - 0.2, 0.62, KIDP[2] + 0.08], 0.18, 0.26);
      if (t > W.spoon + 0.3 && melt < 0.95) fxCard(out, "hotdot", 200, 200, hotDot, [KIDP[0] - 0.2, 0.7, KIDP[2] + 0.1], 0.12, 0.12, 0, false, true);
      if (melt > 0.4) for (let i = 0; i < 3; i++) { const u = ((t - W.spoon) * 1.2 + i / 3) % 1; fxCard(out, "icedrip", 120, 160, sweat, [KIDP[0] - 0.24 + i * 0.04, 0.5 - u * 0.45, KIDP[2] + 0.1], 0.03, 0.04); }
      break;
    }
    case 12: { // the spot flares: a pigeon leaves in a hurry
      if (t > W.six) heat(out, t, [SPOT[0], 1.0, SPOT[2]], 3.5, 2.4);
      break;
    }
    case 13: { // 946 pounds: the developer hands the car owner a cheque
      stand(cam, out, who(3, BIZ, "biz"), 5.5, D0, 6.95, t, { expr: after(t, W.pounds) ? "grin" : "stern", look: 1, wave: after(t, W.car) ? 0.8 : undefined });
      stand(cam, out, who(6, DEV, "dev"), 7.1, D0, 6.2, t, { expr: after(t, W.fix) ? "smile_closed" : "nervous", look: -1 }, 1.03);
      const u = smooth((t - (W.paid - 0.2)) / 0.8);
      if (t > W.paid - 0.3) fxCard(out, "cheque", 420, 200, cheque, [6.75 - 0.9 * u, 1.05 + 0.05 * Math.sin(u * 3), 6.6 + 0.3 * u], 0.3, 0.14, -0.08);
      break;
    }
    case 15: { // the original design: snip
      const c = q(smooth((t - (W.cut - 0.15)) / 0.5), 30);
      fxCard(out, `drawing${c}`, 600, 760, (p) => drawing(p, c), [TABLE[0], 0.93, TABLE[2]], 1.0, 1.27, 0, true);
      const sx = smooth((t - (W.cut - 0.6)) / 0.6), open = q(Math.abs(Math.sin(t * 9)), 10);
      if (t > W.cut - 0.8 && t < W.cut + 0.6) fxCard(out, `scissors${open}`, 360, 220, (p) => scissors(p, open), [TABLE[0] - 0.55 + 0.45 * sx, 0.97, TABLE[2] - 0.05], 0.3, 0.18, Math.PI, true);
      if (t > W.money - 0.35) fxCard(out, "coins", 240, 200, coins, [TABLE[0] + 0.55, 1.0 + 0.35 * (1 - smooth((t - (W.money - 0.35)) / 0.25)), TABLE[2] + 0.25], 0.22, 0.18);
      break;
    }
    case 16: { // the architect: he knew it would reflect
      const hot = after(t, W.hot);
      stand(cam, out, who(7, ARCH, "arch"), ARCHI[0], D0, ARCHI[2], t,
        { expr: hot ? "nervous" : after(t, W.knew) ? "smile_closed" : "smile", wave: after(t, W.knew) && !hot ? 0.3 : undefined, look: hot ? -1 : 0 });
      if (hot) for (let i = 0; i < 2; i++) { const u = ((t - W.hot) * 0.9 + i * 0.5) % 1; fxCard(out, "sweat", 120, 160, sweat, [ARCHI[0] + 0.22 - i * 0.44, 1.75 - u * 0.25, ARCHI[2] + 0.1], 0.07, 0.09); }
      break;
    }
    case 17: { // Las Vegas: palms, loungers, sunbathers leaping up
      const VX = VEGAS_X, jump = smooth((t - (W.scorching - 0.08)) / 0.18) * (1 - smooth((t - (W.scorching + 0.5)) / 0.4));
      for (const [x, z, h] of [[-19, 8, 9], [19, 7, 10], [-17, 18, 8], [18, 20, 9], [-30, -12, 11], [30, -12, 10], [-8, 20, 7]] as const) {
        const sw = q(Math.sin(t * 0.8 + x) * 0.3, 10);
        fxCard(out, `palm${sw}`, 500, 900, (p) => palm(p, sw), [VX + x, h / 2, z], h * 0.56, h);
      }
      for (let i = 0; i < 3; i++) {
        const x = VX - 2.4 + i * 2.4, z = -3 + 0.2;
        if (t > W.scorching - L2) stand(cam, out, who(170 + i, BATHER(i), `b${i}`), x, D0 + 0.35 * jump, z + 0.9, t, { expr: i % 2 ? "shock" : "pained", wave: i % 2 ? 0.9 : -0.9 });
        else { out.places.push(person(cam, who(170 + i, BATHER(i), `b${i}`), x, 0.3, z, front0, { mode: "sit", blink: lidAt(t, 170 + i), expr: "smile_closed" }, {})); }
      }
      if (t > 65.0) heat(out, t, [VX, 1.4, -2.6], 4, 1.4);
      break;
    }
    case 18: { // a sequel: two passers-by in the golden light
      break;
    }
  }
  return out;
};
export { FPS, fxStars, fxBurst };
