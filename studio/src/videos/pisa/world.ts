// The Pisa world as one three.js scene: sky, lawn piazza, cathedral, town rows, the tower (eight stacked levels
// that lean and curve every frame), scaffolding, fountain, the 1838 walkway, the 1990 fence, and a separate ground
// cross-section set at x = CUT_X. update(id, f, camera) poses everything for shot `id` at frame f.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, Ray, house, prop, setSight, quad, tri } from "./build";
import { rep, ctex, grassHD, cobbleHD, cloudHD, roofHD, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, towerState, TowerState, ShotDef, R_TOWER, LEVEL_H, CUT_X, FOUNTAIN, FENCE_R, TRENCH, W, smooth, clamp01,
} from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // all vegetation is procedural (build.ts); no GLB props needed

// ---------------- painted marble ----------------
const MARBLE = "#efe7d6";
const courses = (g: CanvasRenderingContext2D, W: number, H: number, rows: number, r: () => number) => {
  for (let y = 0; y < rows; y++) {
    const y0 = (y * H) / rows;
    g.fillStyle = y % 5 === 2 ? "rgba(150,160,150,0.10)" : `rgba(${200 + r() * 30},${190 + r() * 30},${170 + r() * 20},0.10)`;
    g.fillRect(0, y0, W, H / rows);
    g.fillStyle = "rgba(120,105,90,0.22)"; g.fillRect(0, y0, W, 2);
  }
};
/** base level: blind arcade, 15 bays around */
const baseTex = () => ctex("pisaBase", 2048, 512, (g, r) => {
  g.fillStyle = MARBLE; g.fillRect(0, 0, 2048, 512); courses(g, 2048, 512, 14, r);
  const n = 15, bw = 2048 / n;
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * bw, top = 120, rad = bw * 0.36;
    g.fillStyle = "rgba(150,130,110,0.28)";
    g.beginPath(); g.moveTo(cx - rad, 512); g.lineTo(cx - rad, top + rad); g.arc(cx, top + rad, rad, Math.PI, 0); g.lineTo(cx + rad, 512); g.fill();
    g.strokeStyle = "rgba(60,45,45,0.55)"; g.lineWidth = 5;
    g.beginPath(); g.moveTo(cx - rad, 512); g.lineTo(cx - rad, top + rad); g.arc(cx, top + rad, rad, Math.PI, 0); g.lineTo(cx + rad, 512); g.stroke();
    g.fillStyle = "rgba(120,140,130,0.35)"; g.beginPath(); g.arc(cx, top + rad * 0.55, rad * 0.22, 0, 7); g.fill(); // inlaid lozenge
  }
});
/** gallery core: wall with dark doorways */
const coreTex = () => ctex("pisaCore", 1024, 512, (g, r) => {
  g.fillStyle = "#e6dcc8"; g.fillRect(0, 0, 1024, 512); courses(g, 1024, 512, 10, r);
  const n = 8, bw = 1024 / n;
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * bw, rad = bw * 0.22, top = 170;
    g.fillStyle = "#4a3c44";
    g.beginPath(); g.moveTo(cx - rad, 512); g.lineTo(cx - rad, top + rad); g.arc(cx, top + rad, rad, Math.PI, 0); g.lineTo(cx + rad, 512); g.fill();
  }
});
/** arch band over the columns: marble above the arches, cut out below (alpha) */
const archTex = (n: number) => ctex("pisaArch" + n, 2048, 256, (g) => {
  g.fillStyle = MARBLE; g.fillRect(0, 0, 2048, 256);
  g.fillStyle = "rgba(120,105,90,0.25)"; g.fillRect(0, 60, 2048, 3);
  g.globalCompositeOperation = "destination-out";
  const bw = 2048 / n;
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * bw, rad = bw * 0.44;
    g.beginPath(); g.moveTo(cx - rad, 256); g.lineTo(cx - rad, 150); g.arc(cx, 150, rad, Math.PI, 0); g.lineTo(cx + rad, 256); g.fill();
  }
  g.globalCompositeOperation = "source-over";
});
const cutFaceTex = () => ctex("pisaCutFace", 512, 1024, (g, r) => {
  g.fillStyle = "#d9cfbe"; g.fillRect(0, 0, 512, 1024);
  g.strokeStyle = "rgba(120,100,90,0.35)"; g.lineWidth = 4;
  for (let k = -1024; k < 1024; k += 40) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 1024, 1024); g.stroke(); } // section hatching
  for (let i = 0; i < 30; i++) { g.fillStyle = "rgba(150,140,130,0.25)"; g.fillRect(r() * 512, r() * 1024, 20, 8); }
});
/** the ground cross-section: topsoil, sandy silt, soft blue-grey clay with water, dense deep clay. y 0 at the top. */
const STRATA_H = 22;
const strataTex = () => ctex("pisaStrata", 2048, 1126, (g, r) => {
  const Hp = 1126, m = Hp / STRATA_H, band = (y0: number, y1: number, col: string) => { g.fillStyle = col; g.fillRect(0, y0 * m, 2048, (y1 - y0) * m); };
  band(0, 1.0, "#7a553b"); band(1.0, 4.2, "#c9a86a"); band(4.2, 12, "#8f9bab"); band(12, STRATA_H, "#6f6a78");
  const wavy = (y: number, col: string, w: number) => {
    g.strokeStyle = col; g.lineWidth = w; g.beginPath();
    for (let x = 0; x <= 2048; x += 16) { const yy = y * m + 10 * Math.sin(x / 90 + y); if (x) g.lineTo(x, yy); else g.moveTo(x, yy); }
    g.stroke();
  };
  for (const y of [1.0, 4.2, 12]) wavy(y, "rgba(40,30,40,0.75)", 7);
  for (let i = 0; i < 260; i++) { // pebbles in the silt, glints of water in the clay
    const y = 1.2 + r() * 2.8, x = r() * 2048;
    g.fillStyle = "rgba(140,115,80,0.6)"; g.beginPath(); g.ellipse(x, y * m, 6 + r() * 6, 4 + r() * 3, 0, 0, 7); g.fill();
  }
  for (let i = 0; i < 160; i++) {
    const y = 4.8 + r() * 6.6, x = r() * 2048;
    g.fillStyle = "rgba(200,225,250,0.55)"; g.beginPath(); g.ellipse(x, y * m, 5 + r() * 4, 7 + r() * 5, 0, 0, 7); g.fill();
  }
  for (let i = 0; i < 90; i++) { const y = 12.5 + r() * 9, x = r() * 2048; g.fillStyle = "rgba(60,55,70,0.5)"; g.fillRect(x, y * m, 22 + r() * 30, 4); }
});

// ---------------- sky helpers (from the bridge short) ----------------
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
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 1: { az: 20, el: 9 }, 15: { az: 25, el: 10 }, 10: { az: 120 }, 14: { az: 120 } };

/** every lens position of the piazza shots (houses and trees in the way are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) {
    if (s.set !== "piazza") continue;
    for (let f = s.a - 8; f < s.b + 8; f += 3) {
      const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
      const fw = look.clone().sub(o), len = fw.length() + 6;
      fw.normalize();
      const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
      const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
      for (const [sx, sy] of [[0, 0], [-0.7, 0], [0.7, 0], [0, 0.7], [0, -0.5], [-0.7, -0.5], [0.7, -0.5]])
        out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
    }
  }
  return out;
};

const ringGeo = (r0: number, r1: number, y: number, seg = 96) => { const g = new THREE.RingGeometry(r0, r1, seg, 1); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g; };
const flatQuad = (x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = 0) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);

/** one tower level as a group (local y 0 = its base) */
const buildLevel = (i: number, half = false): THREE.Group => {
  const grp = new THREE.Group(), b = new Batch(), h = LEVEL_H[i], R = R_TOWER;
  const th0 = half ? Math.PI / 2 : 0, thL = half ? Math.PI : Math.PI * 2;
  const marble = lam("pisaMarble", () => ({ color: MARBLE }));
  const cyl = (r: number, y0: number, y1: number, mat: THREE.Material, seg = 48, open = true) => {
    const c = new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, open, th0, thL); c.translate(0, (y0 + y1) / 2, 0); b.add(c, mat);
  };
  const disc = (r: number, y0: number, y1: number) => cyl(r, y0, y1, marble, 48, false);
  if (i === 0) {
    cyl(R, 0, h - 0.4, lam("pisaBaseM", () => ({ map: rep(baseTex(), 1, 1) })), 64);
    disc(R + 0.35, -0.3, 0.35); disc(R + 0.3, h - 0.45, h);
  } else if (i < 7) {
    cyl(R - 0.9, 0, h, lam("pisaCoreM", () => ({ map: rep(coreTex(), 2, 1) })), 40);
    const n = half ? 12 : 24;
    for (let k = 0; k < n; k++) {
      const a = th0 + ((k + 0.5) / (half ? 12 : 24)) * thL, col = new THREE.CylinderGeometry(0.15, 0.17, h - 1.3, 8);
      col.translate(Math.sin(a) * (R - 0.05), 0.3 + (h - 1.3) / 2, Math.cos(a) * (R - 0.05)); b.add(col, marble);
    }
    const arch = lam("pisaArchM24", () => ({ map: archTex(24), alphaTest: 0.5, side: THREE.DoubleSide }));
    cyl(R + 0.02, h - 1.25, h - 0.3, arch, 72);
    disc(R + 0.3, h - 0.35, h); disc(R - 0.85, 0, 0.3);
  } else { // belfry
    cyl(R - 1.3, 0, h - 0.6, lam("pisaCoreM", () => ({ map: rep(coreTex(), 2, 1) })), 40);
    for (let k = 0; k < (half ? 8 : 16); k++) {
      const a = th0 + ((k + 0.5) / (half ? 8 : 16)) * thL, col = new THREE.CylinderGeometry(0.13, 0.15, h - 1.6, 8);
      col.translate(Math.sin(a) * (R - 1.05), 0.3 + (h - 1.6) / 2, Math.cos(a) * (R - 1.05)); b.add(col, marble);
    }
    cyl(R - 1.0, h - 1.4, h - 0.6, lam("pisaArchM16", () => ({ map: archTex(16), alphaTest: 0.5, side: THREE.DoubleSide })), 56);
    disc(R - 0.8, h - 0.65, h - 0.3);
    const dome = new THREE.SphereGeometry(R - 1.6, 32, 12, th0, thL, 0, Math.PI / 2); dome.scale(1, 0.45, 1); dome.translate(0, h - 0.3, 0); b.add(dome, marble);
  }
  b.build(grp);
  grp.traverse((o) => { o.matrixAutoUpdate = true; });
  return grp;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private tower = new THREE.Group(); private levels: THREE.Group[] = [];
  private cutTower = new THREE.Group(); private cutLevels: THREE.Group[] = [];
  private scaffold = new THREE.Group();
  private trench = new THREE.Group(); private flood: THREE.Mesh;
  private fence = new THREE.Group(); private gates: THREE.Group[] = [];
  private strataMat: THREE.MeshLambertMaterial;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root;
    // ---- sky + light (as in the bridge short) ----
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
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    // ---- piazza ground, paths, cathedral (static batch) ----
    const b = new Batch();
    const grass = lam("grassHD", () => ({ map: grassHD() })), cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
    const marble = lam("pisaMarble", () => ({ color: MARBLE })), arcade = lam("pisaBaseM2", () => ({ map: rep(baseTex(), 3, 1.4) }));
    b.add(flatQuad(-900, 420, -900, 900, 330, 450), grass);
    b.add(ringGeo(R_TOWER - 0.2, R_TOWER + 4.2, 0.012), cobble);
    b.add(flatQuad(-2.2, 2.2, R_TOWER + 4, 60, 1.1, 14, 0.014), cobble);
    b.add(flatQuad(-60, 60, 26, 30, 30, 1, 0.013), cobble);
    // cathedral behind the tower: nave with blind arcades, slate roof, dome on a drum, gable front
    const nx0 = -44, nx1 = 10, nz0 = -58, nz1 = -40, nh = 15;
    b.add(boxGeo(V(nx0, 0, nz0), V(nx1, nh, nz1), 0), arcade);
    const slate = lam("roofSlate", () => ({ map: roofHD("#8f97a8", true), side: THREE.DoubleSide }));
    b.add(quad(V(nx0 - 0.4, nh - 0.2, nz1 + 0.4), V(nx1 + 0.4, nh - 0.2, nz1 + 0.4), V(nx1 + 0.4, nh + 5, (nz0 + nz1) / 2), V(nx0 - 0.4, nh + 5, (nz0 + nz1) / 2), 12, 2), slate);
    b.add(quad(V(nx1 + 0.4, nh - 0.2, nz0 - 0.4), V(nx0 - 0.4, nh - 0.2, nz0 - 0.4), V(nx0 - 0.4, nh + 5, (nz0 + nz1) / 2), V(nx1 + 0.4, nh + 5, (nz0 + nz1) / 2), 12, 2), slate);
    b.add(tri(V(nx1, nh, nz1), V(nx1, nh, nz0), V(nx1, nh + 5, (nz0 + nz1) / 2)), marble);
    b.add(tri(V(nx0, nh, nz0), V(nx0, nh, nz1), V(nx0, nh + 5, (nz0 + nz1) / 2)), marble);
    const drum = new THREE.CylinderGeometry(5.2, 5.2, 6, 32); drum.translate(-14, nh + 4, (nz0 + nz1) / 2); b.add(drum, arcade);
    const dome = new THREE.SphereGeometry(5.6, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2); dome.translate(-14, nh + 7, (nz0 + nz1) / 2); b.add(dome, slate);
    // fountain
    const [fx, , fz] = FOUNTAIN;
    const basin = new THREE.CylinderGeometry(2.3, 2.4, 0.65, 40, 1, true); basin.translate(fx, 0.32, fz); b.add(basin, marble);
    const rim = new THREE.TorusGeometry(2.35, 0.12, 8, 48); rim.rotateX(Math.PI / 2); rim.translate(fx, 0.66, fz); b.add(rim, marble);
    b.add(ringGeo(0, 2.3, 0.5).translate(fx, 0, fz), lam("fountainWater", () => ({ color: "#7fb3dc" })));
    const col = new THREE.CylinderGeometry(0.22, 0.3, 1.5, 16); col.translate(fx, 0.75, fz); b.add(col, marble);
    const bowl = new THREE.SphereGeometry(0.8, 24, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); bowl.translate(fx, 1.55, fz); b.add(bowl, marble);
    b.build(R);

    // town rows and trees around the piazza (anything in front of a lens is left out)
    const tb = new Batch(), r = rng(7);
    setSight(sightLines());
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length) % a.length];
    const row = (from: number, to: number, place: (u: number, w: number) => [number, number, number]) => {
      let u = from;
      while (u < to) { const w = pick([7, 9]); const [x, z, yaw] = place(u + w / 2, w); house(tb, x, z, yaw, w, 8, pick([7, 8.4, 9.8, 11.2]), Math.floor(r() * 8)); u += w + 0.3; }
    };
    row(-110, 110, (u) => [u, -82, 0]);
    row(-70, 70, (u) => [-78, u, Math.PI / 2]);
    row(-70, 70, (u) => [78, u, -Math.PI / 2]);
    row(-110, 110, (u) => [u, 95, Math.PI]);
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, d = 40 + r() * 32, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (z < -36 && z > -62 && x > -50 && x < 16) continue; // cathedral
      prop(tb, kit, pick(["tree_cone", "tree_cone", "tree_oak", "tree_default"]), x, 0, z, 8 + r() * 5, r() * 6);
    }
    for (let i = 0; i < 50; i++) { const a = r() * Math.PI * 2, d = 140 + r() * 120; prop(tb, kit, pick(["tree_cone", "tree_default"]), Math.cos(a) * d, 0, Math.sin(a) * d, 12 + r() * 6, r() * 6); }
    tb.build(R);
    setSight([]);

    // ---- the tower: nested levels ----
    let parent: THREE.Object3D = this.tower;
    for (let i = 0; i < LEVEL_H.length; i++) {
      const lv = buildLevel(i);
      lv.position.y = i === 0 ? 0 : LEVEL_H[i - 1];
      parent.add(lv); this.levels.push(lv); parent = lv;
    }
    this.tower.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    R.add(this.tower);
    // scaffold: wooden poles and planks around the top of the stump
    const sb = new Batch(), wood = lam("scaffWood", () => ({ color: "#a8724a" }));
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2, x = Math.sin(a) * (R_TOWER + 0.7), z = Math.cos(a) * (R_TOWER + 0.7);
      sb.add(boxGeo(V(x - 0.08, -3.5, z - 0.08), V(x + 0.08, 2.6, z + 0.08)), wood);
    }
    for (const y of [-2.0, 0.4, 2.2]) for (let k = 0; k < 10; k++) {
      const a0 = (k / 10) * Math.PI * 2, a1 = ((k + 1) / 10) * Math.PI * 2, rr = R_TOWER + 0.7;
      const p0 = V(Math.sin(a0) * rr, y, Math.cos(a0) * rr), p1 = V(Math.sin(a1) * rr, y, Math.cos(a1) * rr), mid = p0.clone().add(p1).multiplyScalar(0.5);
      const g = new THREE.BoxGeometry(p0.distanceTo(p1), 0.12, 0.12);
      sb.add(g, wood, new THREE.Matrix4().compose(mid, new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.atan2(-(p1.z - p0.z), p1.x - p0.x)), V(1, 1, 1)));
    }
    sb.build(this.scaffold);
    R.add(this.scaffold);

    // ---- 1838 walkway (catino) + flood ----
    const tbb = new Batch();
    tbb.add(ringGeo(TRENCH[0], TRENCH[1], 0.02), lam("trenchFloor", () => ({ color: "#b59a74" })));
    const wallIn = new THREE.CylinderGeometry(TRENCH[1], TRENCH[1], 0.5, 72, 1, true); wallIn.translate(0, 0.25, 0); tbb.add(wallIn, lam("pisaMarble", () => ({ color: MARBLE })));
    tbb.build(this.trench);
    this.flood = new THREE.Mesh(ringGeo(TRENCH[0] - 0.9, TRENCH[1] - 0.02, 0), lam("floodWater", () => ({ color: "#6fa3d6" })));
    this.trench.add(this.flood);
    R.add(this.trench);

    // ---- 1990 fence + gate (gap facing +z) ----
    const fb = new Batch(), iron = lam("fenceIron", () => ({ color: "#3d414c" }));
    const gap = Math.asin(1.6 / FENCE_R);
    for (let a = gap; a < Math.PI * 2 - gap; a += 0.11) {
      const x = Math.sin(a) * FENCE_R, z = Math.cos(a) * FENCE_R;
      fb.add(boxGeo(V(x - 0.05, 0, z - 0.05), V(x + 0.05, 1.6, z + 0.05)), iron);
    }
    for (const y of [0.3, 1.45]) {
      const tor = new THREE.TorusGeometry(FENCE_R, 0.045, 6, 160, Math.PI * 2 - 2 * gap); tor.rotateX(Math.PI / 2); tor.rotateY(-Math.PI / 2 + gap); tor.translate(0, y, 0);
      fb.add(tor, iron);
    }
    fb.build(this.fence);
    for (const s of [-1, 1]) {
      const leaf = new THREE.Group(), lb = new Batch();
      for (let k = 0; k <= 8; k++) lb.add(boxGeo(V(s * k * 0.2 - 0.03, 0, -0.03), V(s * k * 0.2 + 0.03, 1.55, 0.03)), iron);
      for (const y of [0.3, 1.45]) lb.add(boxGeo(V(Math.min(0, s * 1.6), y - 0.04, -0.04), V(Math.max(0, s * 1.6), y + 0.04, 0.04)), iron);
      lb.build(leaf);
      leaf.position.set(-s * 1.6, 0, Math.cos(gap) * FENCE_R);
      this.gates.push(leaf); this.fence.add(leaf);
    }
    R.add(this.fence);

    // ---- ground cross-section set ----
    const cb = new Batch();
    this.strataMat = lam("strataM", () => ({ map: strataTex() })) as THREE.MeshLambertMaterial;
    cb.add(quad(V(CUT_X - 40, -STRATA_H, 0), V(CUT_X + 40, -STRATA_H, 0), V(CUT_X + 40, 0, 0), V(CUT_X - 40, 0, 0), 1.6, 1), this.strataMat);
    cb.add(flatQuad(CUT_X - 400, CUT_X + 400, -400, 0, 300, 160), grass);
    cb.build(R);
    let cp: THREE.Object3D = this.cutTower;
    for (let i = 0; i < 3; i++) {
      const lv = buildLevel(i, true);
      lv.position.y = i === 0 ? 0 : LEVEL_H[i - 1];
      cp.add(lv); this.cutLevels.push(lv); cp = lv;
    }
    const cutFace = lam("cutFace", () => ({ map: cutFaceTex() }));
    const fb2 = new Batch();
    fb2.add(quad(V(-R_TOWER, -3, 0.03), V(R_TOWER, -3, 0.03), V(R_TOWER, 17, 0.03), V(-R_TOWER, 17, 0.03), 1, 2.5), cutFace);
    fb2.add(quad(V(-R_TOWER - 1.4, -3, 0.04), V(R_TOWER + 1.4, -3, 0.04), V(R_TOWER + 1.4, -0.02, 0.04), V(-R_TOWER - 1.4, -0.02, 0.04), 1.4, 0.4), lam("footing", () => ({ color: "#8f8577" })));
    const foot = new THREE.CylinderGeometry(R_TOWER + 1.4, R_TOWER + 1.4, 3, 48, 1, false, Math.PI / 2, Math.PI); foot.translate(0, -1.5, 0); fb2.add(foot, lam("footing", () => ({ color: "#8f8577" })));
    fb2.build(this.cutTower);
    this.cutTower.position.set(CUT_X, 0, 0);
    R.add(this.cutTower);
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

  private poseTower(levels: THREE.Group[], root: THREE.Group, st: TowerState) {
    root.rotation.z = THREE.MathUtils.degToRad(-st.lean);
    levels.forEach((lv, i) => {
      if (i >= 3) lv.rotation.z = THREE.MathUtils.degToRad(st.curve);
      const vis = st.floors - i;
      lv.visible = vis > 0;
      // the rising level grows up from its base; children ride on its top
      lv.scale.y = 1;
      const own = lv.children.filter((c) => !(c instanceof THREE.Group));
      for (const c of own) c.scale.y = clamp01(vis);
    });
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], st = towerState(id, t), L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 40);
    if (s.set === "piazza" && dist > 40) Rr = Math.max(Rr, 60);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...LOOK[s.light].bounce); TONE.uSat.value = LOOK[s.light].sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    // a century passes: the clouds race (shot 5, "for almost a hundred years")
    const race = id === 5 ? Math.max(0, t - (W.hundred - 1)) * 40 : 0;
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      const a = (i / 9) * Math.PI * 2 + 0.3 + race * 0.004, d = 620 + (i % 3) * 60;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- tower, scaffold, set pieces ----
    this.poseTower(this.levels, this.tower, st);
    this.poseTower(this.cutLevels, this.cutTower, { ...st, floors: Math.min(3, st.floors) });
    const k = Math.max(0, Math.min(LEVEL_H.length - 1, Math.ceil(st.floors) - 1));
    this.scaffold.visible = st.scaffold && s.set === "piazza" && st.floors < 8;
    if (this.scaffold.visible) {
      const top = this.levels[k];
      if (this.scaffold.parent !== top) top.add(this.scaffold);
      this.scaffold.position.set(0, LEVEL_H[k] * clamp01(st.floors - k), 0);
    }
    this.trench.visible = id >= 11 && id <= 14 && (id > 11 || t > W.walkway - 0.6);
    this.flood.visible = id === 11 && t > W.unluckily + 0.3;
    if (this.flood.visible) this.flood.position.y = 0.04 + 0.3 * smooth((t - W.unluckily - 0.3) / 0.9);
    this.fence.visible = id === 13 || id === 14;
    const shut = id === 14 ? 1 : smooth((t - W.shut + 0.35) / 0.35);
    this.gates.forEach((g, i) => { g.rotation.y = (i ? -1 : 1) * (Math.PI / 2) * (1 - shut); });
    // the clay firms up as the water seeps out (shot 8)
    const firm = id === 8 ? smooth((t - 27.2) / 1.6) : 0;
    this.strataMat.color.setRGB(0.92 + 0.08 * firm, 0.95, 1.05 - 0.17 * firm);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const stg = stage(id, t, st, { pos: cam.position, right, sun: sunDir });
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
      else { fxm.mesh.quaternion.copy(cam.quaternion); fxm.mesh.rotateZ(p.rot ?? 0); }
      fxm.mesh.scale.set(p.w, p.h, 1);
      fused.push(fxm);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}
