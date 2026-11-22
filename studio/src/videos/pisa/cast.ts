// Pisa cast (machinery from the bridge short). Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, KID, SKINS, fxBurst, fxStars, fxPuff, fxShadow, fxContact,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import {
  FPS, D0, SHOTS, V3, W, smooth, clamp01, TowerState, towerPoint, levelBase, MAYOR, KID_AT, ARCHITECT, DICTATOR, OFFICIAL, FENCE_R, CUT_X,
} from "./story";
import { sponge, drop, pigeon, tools, bananas, lantern, drill, cement, bucket, hole, weeds, squirt } from "./props2d";
import { LIGHTS } from "./lights";
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
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
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

// ================= the Pisa cast =================
export type Stage = { places: Place[]; fx: FxPlace[] };

const MASON = (v: number): Outfit => ({ jacket: ["#8a5a3c", "#6d7a4a", "#9a6b4a", "#5a6f7a"][v % 4], pants: "#5a4a3c", boots: "#3a2a20",
  hat: "cap", cap: ["#e9dcc0", "#c9b48a", "#dcc9a0"][v % 3], skin: SKINS[v % 4], moustache: v % 3 === 1 ? "#4a3426" : undefined });
const FOLK = (v: number): Outfit => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9"];
  const o: Outfit = { jacket: coats[v % 6], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[v % 4] };
  return v % 2 ? { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] } : { ...o, hat: "hair", hair: ["#5a3b2a", "#2a201a", "#8a5a3c"][v % 3] };
};
const MAYOR_O: Outfit = { jacket: "#8c3b4a", pants: "#3b3f52", boots: "#3a2a20", hat: "hair", hair: "#3a2a20", sash: "#e8c45a", moustache: "#3a2a20", build: "stout", buttons: "#e8c45a" };
const ARCH_O: Outfit = { jacket: "#2f5f6a", pants: "#3b3f52", boots: "#241726", hat: "tophat", moustache: "#5a3b2a", buttons: "#e8c45a" };
const DICT_O: Outfit = { jacket: "#4a4d55", pants: "#2a2d33", boots: "#241726", hat: null, build: "stout", buttons: "#c9ccd2", belt: "#2a2d33" };
const ENGINEER = (v: number): Outfit => ({ jacket: "#f08a2c", pants: "#3b5b9a", boots: "#3a2a20", hat: "cap", cap: "#f4f1ea", skin: SKINS[(v + 1) % 4] });
const OFFICIAL_O: Outfit = { jacket: "#3f6fb5", pants: "#2f3a5a", boots: "#241726", hat: "cap", cap: "#2f3a5a", moustache: "#4a3426" };
const TOURIST = (v: number): Outfit => {
  const tops = ["#e2453c", "#3f9fd5", "#f2cf4a", "#5d9a5a", "#e08ab0", "#f08a2c"];
  const o: Outfit = { jacket: tops[v % 6], pants: ["#3b5b9a", "#d8c8a8", "#3b3f52"][v % 3], boots: "#f4f1ea", skin: SKINS[v % 4] };
  return v % 3 === 1 ? { ...o, hat: "cap", cap: ["#2f5f6a", "#e2453c"][v % 2] } : { ...o, hat: "hair", hair: ["#5a3b2a", "#2a201a", "#d9a441"][v % 3] };
};

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
const fxCard = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, at: V3, w: number, h: number, rot = 0, flat = false) =>
  out.fx.push({ key, cw, ch, draw, x: at[0], y: at[1], z: at[2], w, h, rot, flat });

/** builders standing on the top of the tower stump (follow the lean) */
const topCrew = (cam: CamInfo, out: Stage, st: TowerState, t: number, n: number, expr: (i: number) => Expr, top: number) => {
  for (let i = 0; i < n; i++) {
    const lx = -2.4 + i * (4.8 / Math.max(1, n - 1)), lz = 2.6 - (i % 2) * 1.2;
    const [x, y, z] = towerPoint(st, lx, top + 0.25, lz);
    stand(cam, out, who(10 + i, MASON(i), `m${i % 4}`), x, y, z, t, { expr: expr(i) });
  }
};

const LEAD2 = LEAD;
export const stage = (id: number, t: number, st: TowerState, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const top = levelBase(Math.floor(st.floors));
  switch (id) {
    case 1: case 15: { // tourists doing the "holding it up" pose
      const n = 9;
      for (let i = 0; i < n; i++) {
        const x = -7 + i * 1.6 + (hh(i) - 0.5) * 0.8, z = 18 + (i % 3) * 2.2 + hh(i, 2) * 1.5;
        stand(cam, out, who(40 + i, TOURIST(i), `t${i % 6}`), x, D0, z, t, { expr: (["grin", "smile", "laugh", "smile_closed"] as Expr[])[i % 4], wave: i % 2 ? 0.9 : -0.9 });
      }
      if (id === 15) { // the engineers, done: they put the buckets down (on "stopped")
        for (let i = 0; i < 2; i++) {
          const x = -3.2 + i * 1.3, z = 20.5;
          stand(cam, out, who(80 + i, ENGINEER(i), `e${i}`), x, D0, z, t, { expr: t > W.stopped - LEAD2 ? "smile_closed" : "neutral" });
          if (t > W.stopped - LEAD2) fxCard(out, "bucket", 240, 240, bucket, [x + 0.45, D0 + 0.22, z + 0.1], 0.45, 0.45);
        }
      }
      break;
    }
    case 2: { // Pisa 1173: proud townsfolk, the mayor, masons on the first floors
      for (let i = 0; i < 14; i++) {
        const x = -9 + (i % 7) * 2.6 + (hh(i) - 0.5), z = 17 + Math.floor(i / 7) * 3 + hh(i, 3) * 1.4;
        if (Math.hypot(x - MAYOR[0], z - MAYOR[2]) < 1.6) continue;
        stand(cam, out, who(20 + i, FOLK(i), `f${i % 6}`), x, D0, z, t, { expr: t > W.proud - LEAD2 ? (["grin", "smile", "smile_closed"] as Expr[])[i % 3] : "smile" });
      }
      stand(cam, out, who(1, MAYOR_O, "mayor"), MAYOR[0], D0, MAYOR[2], t, { expr: t > W.proud - LEAD2 ? "grin" : "smile_closed", wave: t > W.proud - LEAD2 ? 0.6 : undefined }, 1.05);
      topCrew(cam, out, st, t, 3, () => "smile_closed", top);
      break;
    }
    case 3: { // three floors up: it tips
      const tipped = t > W.tip - LEAD2;
      topCrew(cam, out, st, t, 4, (i) => (tipped ? (i % 2 ? "shock" : "nervous") : "neutral"), top);
      if (tipped) { // a bucket slides along the platform toward the low side
        const u = smooth((t - W.tip) / 0.5);
        fxCard(out, "bucket", 240, 240, bucket, towerPoint(st, 0.5 + 2.2 * u, top + 0.45, 0.5), 0.6, 0.6, -0.3 * u);
        if (t < W.tip + 0.3) fxCard(out, `burst${q(clamp01((t - W.tip) / 0.3), 30)}`, 500, 500, (p) => fxBurst(p, q(clamp01((t - W.tip) / 0.3), 30)), towerPoint(st, 3.6, top + 0.6, 2), 2.2, 2.2);
      }
      break;
    }
    case 4: case 8: { // the ground cross-section: drops seep out of the clay (shot 8)
      if (id === 8) for (let i = 0; i < 14; i++) {
        const u = ((t - 26.9) * 0.45 + hh(i)) % 1, x = CUT_X - 9 + hh(i, 2) * 18, y = -11 + hh(i, 3) * 6 + u * 9;
        fxCard(out, "drop", 120, 160, drop, [x, y, 0.15], 0.45 * (1 - u * 0.3), 0.6 * (1 - u * 0.3));
      }
      break;
    }
    case 5: { // war: tools down, everyone walks off
      for (let i = 0; i < 8; i++) {
        const a: V3 = [-4 + i * 1.4, D0, 7 + (i % 3) * 1.6], b: V3 = [-26 - i * 1.5, D0, 22 + (i % 3) * 2];
        if (t < W.left + 1.2) walk(cam, out, who(10 + i, MASON(i), `m${i % 4}`), a, b, W.dropped + 0.2 + i * 0.08, W.dropped + 6, t, t < W.dropped ? "nervous" : "stern");
      }
      for (let i = 0; i < 6; i++) fxCard(out, "tools", 400, 200, tools, [-4 + i * 1.6, D0 + 0.03, 8 + (i % 3) * 1.4], 0.9, 0.45, 0, true);
      const g = smooth((t - W.hundred + 0.6) / 1.5);
      if (g > 0) for (let i = 0; i < 10; i++) fxCard(out, `weeds${q(g, 20)}`, 300, 260, (p) => weeds(p, q(g, 20)), [-5 + i * 1.3, D0 + 0.55, 8.4 + (i % 3)], 1.2, 1.05);
      break;
    }
    case 6: { // the abandoned stump; a pigeon lands
      const u = clamp01((t - 18.8) / 1.0), land = towerPoint(st, 1.2, top + 0.35, 3.3);
      const at: V3 = [land[0] + 3 * (1 - u), land[1] + 2.5 * (1 - u) ** 2, land[2] + 1.5 * (1 - u)];
      const flap = u < 1 ? q(((t * 6) % 1) < 0.5 ? 0 : 0.4, 10) : 1;
      fxCard(out, `pigeon${flap}`, 300, 260, (p) => pigeon(p, flap), at, 0.7, 0.6);
      for (let i = 0; i < 5; i++) fxCard(out, "weedsTop", 300, 260, (p) => weeds(p, 0.8), towerPoint(st, -2.8 + i * 1.3, top + 0.45, 2.4 + (i % 2) * 0.6), 1.1, 0.95);
      break;
    }
    case 7: { // the sponge: fast squish, then slow seep
      stand(cam, out, who(60, KID, "kid"), KID_AT[0], D0, KID_AT[2], t, { expr: t < W.fast - LEAD2 ? "smile" : t < W.slowly - LEAD2 ? "laugh" : "smile_closed" }, 0.75);
      let sq = 0;
      if (t >= W.fast && t < W.slowly - 0.3) sq = smooth((t - W.fast) / 0.12) * (1 - smooth((t - W.squishes - 0.4) / 0.25));
      if (t >= W.slowly - 0.1) sq = 0.9 * smooth((t - W.slowly + 0.1) / 2.2);
      const wet = t < W.slowly ? 1 : 1 - 0.6 * smooth((t - W.slowly) / 2.2), sk = q(sq, 30);
      const hands: V3 = [KID_AT[0], D0 + 0.5, KID_AT[2] + 0.12];
      fxCard(out, `sponge${sk}|${q(wet, 10)}`, 400, 300, (p) => sponge(p, sk, q(wet, 10)), hands, 0.5, 0.375);
      if (t >= W.fast && t < W.fast + 0.7) { const u = q((t - W.fast) / 0.7, 30); fxCard(out, `squirt${u}`, 500, 400, (p) => squirt(p, u), [hands[0], hands[1] + 0.05, hands[2] + 0.02], 1.0, 0.8); }
      if (t >= W.slowly) for (let i = 0; i < 4; i++) {
        const u = ((t - W.slowly) * 0.8 + i / 4) % 1;
        fxCard(out, "drop", 120, 160, drop, [hands[0] - 0.12 + i * 0.08, hands[1] - 0.12 - u * 0.6, hands[2] + 0.02], 0.05, 0.065);
      }
      break;
    }
    case 9: { // 1272: masons back on top of the rising tower, crowd below
      topCrew(cam, out, st, t, 3, () => "grin", top);
      for (let i = 0; i < 8; i++) stand(cam, out, who(20 + i, MASON(i + 2), `m${(i + 2) % 4}`), -6 + i * 1.7, D0, 9 + (i % 2) * 2, t, { expr: "smile" });
      break;
    }
    case 10: fxCard(out, "bananas", 500, 400, bananas, [-3.6, 16.8, 60], 3.4, 2.7, -0.2); break;
    case 11: { // 1838: the architect and his walkway
      const flooded = t > W.water - LEAD2;
      stand(cam, out, who(2, ARCH_O, "arch"), ARCHITECT[0], D0, ARCHITECT[2], t,
        { expr: t < W.luckily - LEAD2 ? "smile_closed" : t < W.unluckily - LEAD2 ? "grin" : flooded ? "shock" : "nervous", wave: t > W.walkway - LEAD2 && t < W.luckily ? 0.5 : undefined });
      fxCard(out, "lantern", 160, 300, lantern, [ARCHITECT[0] + 0.55, D0 + 0.75, ARCHITECT[2] + 0.1], 0.32, 0.6);
      for (let i = 0; i < 5; i++) {
        const x = -6 + i * 2.6, z = 14 + (i % 2) * 2;
        if (t > W.walkway) stand(cam, out, who(30 + i, FOLK(i + 1), `f${(i + 1) % 6}`), x, D0, z, t, { expr: flooded ? "shock" : "smile" });
      }
      break;
    }
    case 12: { // 1934: the dictator, the drills, the cement
      stand(cam, out, who(3, DICT_O, "dict"), DICTATOR[0], D0, DICTATOR[2], t, { expr: t > W.embarrassing - LEAD2 ? "stern" : "neutral" }, 1.05);
      if (t > W.drilled - 0.2) for (let i = 0; i < 4; i++) {
        const a = -0.9 + i * 0.6, x = Math.sin(a) * 6.2, z = Math.cos(a) * 6.2;
        stand(cam, out, who(70 + i, MASON(i), `m${i % 4}`), x + 0.7, D0, z + 0.6, t, { expr: "stern" });
        const sp = q((t * 3 + i * 0.25) % 1, 12);
        fxCard(out, `drill${sp}`, 260, 520, (p) => drill(p, sp), [x, D0 + 0.55, z + 0.3], 0.55, 1.1);
      }
      if (t > W.drilled) for (let i = 0; i < 16; i++) {
        const a = -1.4 + i * 0.19, r = 5.6;
        if ((t - W.drilled) * 8 > i) fxCard(out, "hole", 128, 128, hole, [Math.sin(a) * r, D0 + 0.03, Math.cos(a) * r], 0.35, 0.35, 0, true);
      }
      if (t > W.cement - 0.4) for (let i = 0; i < 6; i++) {
        const g = q(smooth((t - W.cement + 0.4 - i * 0.1) / 0.5), 20), a = -1.2 + i * 0.45;
        if (g > 0) fxCard(out, `cement${g}`, 400, 260, (p) => cement(p, g), [Math.sin(a) * 5.4, D0 + 0.04, Math.cos(a) * 5.4], 1.6, 1.05, 0, true);
      }
      break;
    }
    case 13: { // 1990: the official shuts the gate
      stand(cam, out, who(4, OFFICIAL_O, "official"), OFFICIAL[0], D0, OFFICIAL[2], t, { expr: t > W.shut - LEAD2 ? "stern" : "nervous" });
      for (let i = 0; i < 6; i++) stand(cam, out, who(50 + i, TOURIST(i), `t${i % 6}`), -4 + i * 1.6, D0, FENCE_R + 4 + (i % 2) * 1.4, t, { expr: t > W.shut - LEAD2 ? "nervous" : "smile" });
      break;
    }
    case 14: { // engineers take soil out from under the high side, a bucket at a time
      for (let i = 0; i < 3; i++) {
        const x = -8.2 - i * 0.2, z = 4.2 - i * 1.6;
        stand(cam, out, who(80 + i, ENGINEER(i), `e${i}`), x, D0, z, t, { expr: t > W.sinkBack - LEAD2 ? "grin" : i % 2 ? "neutral" : "smile_closed" });
        fxCard(out, "drillE", 260, 520, (p) => drill(p, 0.25), [x + 0.6, D0 + 0.4, z - 0.2], 0.4, 0.8, 0.5);
      }
      for (let i = 0; i < 4; i++) { // buckets carried away, one after another
        const u = ((t - 55) * 0.25 + i / 4) % 1, x = -8.6 - 6 * u, z = 2 + 4 * u;
        fxCard(out, "bucket", 240, 240, bucket, [x, D0 + 0.25 + 0.05 * Math.abs(Math.sin(u * 30)), z], 0.5, 0.5);
      }
      break;
    }
    case 16: { // the straight tower: nobody cares
      for (let i = 0; i < 8; i++) {
        const x = -6 + i * 1.7 + (hh(i) - 0.5) * 0.6, z = 20 + (i % 3) * 2;
        stand(cam, out, who(40 + i, TOURIST(i), `t${i % 6}`), x, D0, z, t, { expr: i % 3 === 1 ? "stern" : "neutral", look: i % 2 ? 1 : -1 });
      }
      break;
    }
  }
  return out;
};
export { FPS, fxStars, fxPuff };
