// "The Lake That Went Down the Drain" world as one three.js scene, four sets far apart:
//   the lake (origin: lakebed bowl with the crater, the water ring that drains and spins, the whirlpool funnel, the oil
//   rig, barges, fishing boats, the garden island and the chunk of it that slides in, the shore, the canal and its
//   waterfall), the salt mine (MINE: room and pillar under the lake, floods), the shaft head on dry land (HEAD) and the
//   kitchen with the sugar straw (KIT). update(id, f, camera) poses everything for one frame.
// All props are our own simple cartoon shapes (no copied plans).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, quad, house } from "./build";
import { ctex, cloudHD, rng, planksHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, ShotDef, V3, LR, GY, BED, PY, ISL, MINE, HEAD, KIT, MCEIL,
  lvlAt, funnelAt, rigAt, bargeAt, BARGES, mineWaterAt, flowAt, strawAt, smooth, clamp01, W, add,
} from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // all props are procedural; no GLB files

// ---------------- painted textures ----------------
const waterTex = (key: string, base: string, n = 70) => ctex(key, 1024, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < n; i++) {
    g.strokeStyle = r() < 0.55 ? "rgba(225,245,250,0.42)" : "rgba(20,60,70,0.22)"; g.lineWidth = 4 + r() * 4;
    const x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 30, y - 10, x + 70, y + 10, x + 110, y); g.stroke();
  }
});
const swirlTex = () => ctex("swirl", 1024, 512, (g, r) => {
  g.fillStyle = "#3c7f86"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = i % 2 ? "rgba(230,248,250,0.55)" : "rgba(15,45,55,0.35)"; g.lineWidth = 10 + r() * 14;
    const x = (i / 26) * 1024; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 80, 170, x + 160, 340, x + 260, 512); g.stroke();
    g.beginPath(); g.moveTo(x - 1024, 0); g.bezierCurveTo(x - 944, 170, x - 864, 340, x - 764, 512); g.stroke();
  }
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(10,25,32,0.75)");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
});
const fallTex = () => ctex("fall", 256, 1024, (g, r) => {
  g.fillStyle = "#6fb6c9"; g.fillRect(0, 0, 256, 1024);
  for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.6 ? "rgba(235,250,252,0.6)" : "rgba(30,80,95,0.3)"; g.fillRect(r() * 256, r() * 1024, 6 + r() * 10, 80 + r() * 200); }
});
const mudTex = () => ctex("lakeMud", 512, 512, (g, r) => {
  g.fillStyle = "#7a6a4a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? "rgba(150,135,95,0.35)" : "rgba(60,50,34,0.3)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 6 + r() * 26, 4 + r() * 12, r() * 3, 0, 7); g.fill(); }
});
const grassTex = () => ctex("shoreGrass", 512, 512, (g, r) => {
  g.fillStyle = "#6f9f4c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? "rgba(140,190,90,0.35)" : "rgba(50,90,40,0.25)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 18, 3 + r() * 8, r() * 3, 0, 7); g.fill(); }
});
const saltTex = () => ctex("salt", 512, 512, (g, r) => {
  g.fillStyle = "#d9d6cf"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 18 + Math.floor(r() * 30)) { g.fillStyle = r() < 0.5 ? "rgba(150,140,130,0.25)" : "rgba(255,255,255,0.35)"; g.fillRect(0, y, 512, 4 + r() * 10); }
  for (let i = 0; i < 90; i++) { g.fillStyle = "rgba(120,110,100,0.18)"; g.fillRect(r() * 512, r() * 512, 2 + r() * 6, 2 + r() * 6); }
});
const wallpaperTex = () => ctex("kitWall", 512, 512, (g) => {
  g.fillStyle = "#f0e2b8"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "rgba(200,90,70,0.14)"; for (let x = 0; x < 512; x += 64) for (let y = 0; y < 512; y += 64) g.fillRect(x + 20, y + 20, 24, 24);
});
const tileTex = (key: string, base: string, line: string, n = 8) => ctex(key, 512, 512, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512); g.strokeStyle = line; g.lineWidth = 4;
  for (let i = 0; i <= n; i++) { const p = (i * 512) / n; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 512); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(512, p); g.stroke(); }
});

/** per-shot sun override, camera-relative degrees (lights.ts); interiors get a high sun so walls do not shade the floor */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 18: { el: 35 }, 4: { az: 120, el: 70 }, 9: { az: 120, el: 70 }, 11: { az: 120, el: 70 }, 12: { az: 120, el: 62 }, 15: { az: 110, el: 55 } };
const SEA_SKY = ["#2f7c82", "#2b7279", "#256870", "#1f5d66", "#1a5059"];
const CAVE_SKY = ["#2a2622", "#26221f", "#221f1c", "#1f1c19", "#1c1916"];

const flatQuad = (x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = 0) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
const shadowAll = (o: THREE.Object3D, cast = true) => o.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) { m.castShadow = cast; m.receiveShadow = true; } });
const wallZ = (x0: number, x1: number, z: number, h: number, u = 1, v = 1) => quad(V(x0, 0, z), V(x1, 0, z), V(x1, h, z), V(x0, h, z), u, v);
const wallX = (x: number, z0: number, z1: number, h: number, sx: number, u = 1, v = 1) =>
  sx > 0 ? quad(V(x, 0, z1), V(x, 0, z0), V(x, h, z0), V(x, h, z1), u, v) : quad(V(x, 0, z0), V(x, 0, z1), V(x, h, z1), V(x, h, z0), u, v);
/** a room open toward +z: floor, back wall, side walls (walls cast no shadow, so the sun lights the floor) */
const room = (R: THREE.Object3D, c: V3, w: number, z0: number, z1: number, h: number, floor: THREE.Material, back: THREE.Material, side: THREE.Material, fu = w / 2, wu = 1) => {
  const b = new Batch(), x0 = c[0] - w / 2, x1 = c[0] + w / 2;
  b.add(flatQuad(x0, x1, c[2] + z0, c[2] + z1, fu, (fu * (z1 - z0)) / w, 0.006), floor);
  b.add(wallZ(x0, x1, c[2] + z0, h, wu, (wu * h) / w), back);
  b.add(wallX(x0, c[2] + z0, c[2] + z1, h, 1, wu, (wu * h) / w), side);
  b.add(wallX(x1, c[2] + z0, c[2] + z1, h, -1, wu, (wu * h) / w), side);
  b.build(R, false);
};

/** a cylinder between two points (unit cylinder along y, posed per frame) */
const segGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
const poseSeg = (m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, r: number) => {
  const d = b.clone().sub(a), L = d.length();
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.scale.set(r, L, r);
};
const strut = (b: Batch, a: THREE.Vector3, c: THREE.Vector3, r: number, mat: THREE.Material) => {
  const d = c.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, 8);
  b.add(g, mat, new THREE.Matrix4().compose(a.clone().addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()), V(1, 1, 1)));
};
/** a round cartoon tree (trunk + two crown balls) */
const tree = (b: Batch, x: number, y: number, z: number, s: number, k: number) => {
  b.add(new THREE.CylinderGeometry(0.25 * s, 0.35 * s, 3 * s, 8).translate(x, y + 1.5 * s, z), lam("trunk", () => ({ color: "#6b4a2a" })));
  b.add(new THREE.SphereGeometry(1.8 * s, 14, 10).translate(x, y + 4 * s, z), lam("crown" + (k % 3), () => ({ color: ["#4f8f3e", "#5c9a44", "#467f3a"][k % 3] })));
  b.add(new THREE.SphereGeometry(1.3 * s, 12, 8).translate(x + 0.7 * s, y + 5.2 * s, z - 0.3 * s), lam("crown" + ((k + 1) % 3), () => ({ color: ["#4f8f3e", "#5c9a44", "#467f3a"][(k + 1) % 3] })));
};
/** a mossy live oak: wide crown */
const oak = (b: Batch, x: number, y: number, z: number, s: number) => {
  b.add(new THREE.CylinderGeometry(0.4 * s, 0.6 * s, 3 * s, 8).translate(x, y + 1.5 * s, z), lam("trunk", () => ({ color: "#6b4a2a" })));
  b.add(new THREE.SphereGeometry(1, 16, 10).scale(4 * s, 2 * s, 3.4 * s).translate(x, y + 4 * s, z), lam("oak", () => ({ color: "#5a8a44" })));
};

/** lakebed height at radius r (bowl, steep near the shore, crater at the centre) */
const bedY = (r: number) => {
  let y = r < LR - 8 ? -BED : r < LR ? -BED * smooth((LR - r) / 8) : -0.5;
  if (r < 16) y -= 34 * (1 - (r / 16) ** 2);
  return y;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private water: THREE.Mesh; private water0: Float32Array;
  private funnel: THREE.Mesh;
  private rig = new THREE.Group();
  private barges: THREE.Group[] = [];
  private boats: THREE.Group[] = [];
  private chunk = new THREE.Group();
  private canalTex: THREE.Texture; private fallT: THREE.Texture; private fall: THREE.Mesh; private skiff = new THREE.Group();
  private mineWater: THREE.Mesh;
  private straw: THREE.Mesh; private glassWater: THREE.Mesh;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private c1 = new THREE.Color();

  constructor(_kit: Kit) {
    const R = this.root;
    // ---- sky + light (as in the earlier shorts) ----
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
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    // ---- the lake: bed, shore, water, whirlpool ----
    const bedG = new THREE.PlaneGeometry(2 * LR + 40, 2 * LR + 40, 160, 160).rotateX(-Math.PI / 2);
    const bp = bedG.attributes.position;
    for (let i = 0; i < bp.count; i++) bp.setY(i, bedY(Math.hypot(bp.getX(i), bp.getZ(i))));
    const uv = bedG.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 24, uv.getY(i) * 24);
    bedG.computeVertexNormals();
    const bed = new THREE.Mesh(bedG, lam("lakeMud", () => ({ map: mudTex() }))); bed.receiveShadow = true; bed.castShadow = false; R.add(bed);
    R.add(Object.assign(new THREE.Mesh(new THREE.CircleGeometry(5, 24).rotateX(-Math.PI / 2).translate(0, -45, 0), lam("pit", () => ({ color: "#1a1612" })))));
    const sb = new Batch();
    const ring = new THREE.RingGeometry(LR, 900, 128, 2).rotateX(-Math.PI / 2).translate(0, GY, 0);
    const ru = ring.attributes.uv, rp = ring.attributes.position; for (let i = 0; i < ru.count; i++) ru.setXY(i, rp.getX(i) / 10, rp.getZ(i) / 10);
    sb.add(ring, lam("shoreGrass", () => ({ map: grassTex() })));
    // a muddy lip so the shore edge reads
    sb.add(new THREE.CylinderGeometry(LR + 0.6, LR + 0.6, 1.6, 128, 1, true).translate(0, GY - 0.8, 0), lam("lip", () => ({ color: "#6e5e40", side: THREE.DoubleSide })));
    const tr = rng(17);
    for (let i = 0; i < 70; i++) { // trees round the shore (gap for the canal at +x and the island at the north-west)
      const a = tr() * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.22) continue;
      const d = LR + 10 + tr() * 60; tree(sb, Math.cos(a) * d, GY, Math.sin(a) * d, 1.2 + tr() * 0.9, i);
    }
    for (let i = 0; i < 9; i++) { const a = 0.9 + i * 0.5 + tr() * 0.2, d = LR + 34 + tr() * 30; house(sb, Math.cos(a) * d, Math.sin(a) * d, -a - Math.PI / 2, 9, 7, 6 + tr() * 3, i, GY); }
    // the canal at +x: levees either side of the channel
    for (const s of [1, -1]) sb.add(boxGeo(V(LR - 1, GY, s > 0 ? 7 : -10), V(900, GY + 1.6, s > 0 ? 10 : -7), 4), lam("levee", () => ({ color: "#7d9a52" })));
    // the garden island: a green hill with live oaks, a garden house and flower beds
    sb.add(new THREE.SphereGeometry(1, 40, 18).scale(40, 9, 30).translate(ISL[0], -3, ISL[2]), lam("islGrass", () => ({ map: grassTex() })));
    house(sb, ISL[0] - 6, ISL[2] - 4, 0.6, 10, 8, 7, 4, 4.6);
    const fl = ["#e2453c", "#f2c230", "#c25a7a", "#f4f1ea"];
    for (let i = 0; i < 40; i++) { const a = tr() * 6.28, d = 6 + tr() * 18; sb.add(new THREE.SphereGeometry(0.5, 8, 6).translate(ISL[0] + Math.cos(a) * d * 1.2, 4.6 + 0.2, ISL[2] + Math.sin(a) * d * 0.7), lam("flower" + (i % 4), () => ({ color: fl[i % 4] }))); }
    for (let i = 0; i < 8; i++) oak(sb, ISL[0] - 24 + i * 6 + tr() * 3, 2.5 + tr() * 2, ISL[2] - 12 + tr() * 14, 1.1 + tr() * 0.5);
    sb.build(R);
    // the water ring (its hole is the whirlpool's mouth), indexed so it deforms cleanly
    const wg = new THREE.RingGeometry(1, LR + 3, 160, 8).rotateX(-Math.PI / 2);
    const wu = wg.attributes.uv, wp = wg.attributes.position; for (let i = 0; i < wu.count; i++) wu.setXY(i, wp.getX(i) / 14, wp.getZ(i) / 14);
    this.water0 = Float32Array.from(wp.array as Float32Array);
    this.water = new THREE.Mesh(wg, lam("lakeWater", () => ({ map: waterTex("lakeWaterTex", "#4f949c") }))); this.water.receiveShadow = true; R.add(this.water);
    this.funnel = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.03, 1, 96, 12, true), lam("funnel", () => ({ map: swirlTex(), side: THREE.DoubleSide })));
    R.add(this.funnel);
    // the canal water (scrolls toward the sea, then backwards) and the waterfall at the old shore
    this.canalTex = waterTex("canalTex", "#5a9aa6", 40).clone(); this.canalTex.needsUpdate = true;
    const cw = new THREE.Mesh(flatQuad(LR - 1, 900, -7, 7, 60, 1, GY + 0.12), new THREE.MeshLambertMaterial({ map: this.canalTex })); cw.receiveShadow = true; R.add(cw);
    this.fallT = fallTex().clone(); this.fallT.needsUpdate = true;
    const fg = new THREE.PlaneGeometry(14, 1, 1, 16); // bent sheet: from the canal lip down to the bed, bulging out
    const fp = fg.attributes.position;
    for (let i = 0; i < fp.count; i++) { const v = fp.getY(i) + 0.5; fp.setXYZ(i, -9 * Math.sin((1 - v) * Math.PI * 0.5), GY + 0.1 - (1 - v) * (BED + GY + 0.6), fp.getX(i)); }
    fg.computeVertexNormals();
    this.fall = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ map: this.fallT, side: THREE.DoubleSide })); this.fall.position.set(LR - 0.5, 0, 0); R.add(this.fall);
    { const kb = new Batch(); kb.add(boxGeo(V(-2.2, -0.3, -1), V(2.2, 0.5, 1)), lam("skiff", () => ({ color: "#c25a3a" }))); kb.add(boxGeo(V(-2, 0.5, -0.8), V(2, 0.6, 0.8)), lam("skiffIn", () => ({ color: "#e9d9b4" }))); kb.build(this.skiff); shadowAll(this.skiff); R.add(this.skiff); }

    // ---- the oil rig: platform on legs, lattice derrick, drill pipe, shack ----
    {
      const b = new Batch(), steel = lam("rigSteel", () => ({ color: "#d9a441" })), red = lam("rigRed", () => ({ color: "#c0353a" })), grey = lam("rigGrey", () => ({ color: "#8d949c" }));
      b.add(boxGeo(V(-7, PY - 0.7, -7), V(7, PY, 7)), grey);
      for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) b.add(new THREE.CylinderGeometry(0.45, 0.45, 18, 10).translate(x, PY - 9, z), steel);
      const H = 26, b0 = 3.4, b1 = 0.8;
      const P = (s: number, u: number, y: number) => V(s * (b0 + (b1 - b0) * (y / H)), PY + y, u * (b0 + (b1 - b0) * (y / H)));
      for (const [s, u] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) strut(b, P(s, u, 0), P(s, u, H), 0.22, red);
      for (let y = 3; y < H; y += 4) {
        const c = [P(-1, -1, y), P(1, -1, y), P(1, 1, y), P(-1, 1, y)];
        for (let i = 0; i < 4; i++) strut(b, c[i], c[(i + 1) % 4], 0.12, y % 8 === 3 ? red : steel);
        const n = [P(-1, -1, y + 4), P(1, -1, y + 4), P(1, 1, y + 4), P(-1, 1, y + 4)];
        if (y + 4 < H) for (let i = 0; i < 4; i++) strut(b, c[i], n[(i + 1) % 4], 0.08, steel);
      }
      b.add(boxGeo(V(-1.3, PY + H, -1.3), V(1.3, PY + H + 1.4, 1.3)), red);
      b.add(new THREE.CylinderGeometry(0.28, 0.28, H + BED + 18, 10).translate(0, PY + (H - BED - 18) / 2, 0), grey);
      b.add(boxGeo(V(3.6, PY, -6.4), V(6.6, PY + 2.8, -2.4)), lam("shack", () => ({ color: "#f4f1ea" })));
      b.add(boxGeo(V(3.5, PY + 2.8, -6.5), V(6.7, PY + 3.1, -2.3)), red);
      b.add(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 12).rotateZ(Math.PI / 2).translate(-4.5, PY + 0.6, 4.5), lam("drum", () => ({ color: "#3b5b9a" })));
      b.build(this.rig); shadowAll(this.rig); R.add(this.rig);
    }
    // ---- barges and boats ----
    BARGES.forEach((_, i) => {
      const g = new THREE.Group(), b = new Batch();
      b.add(boxGeo(V(-7, -0.8, -2.6), V(7, 1.2, 2.6)), lam("barge" + (i % 2), () => ({ color: i % 2 ? "#5d6472" : "#7a4a32" })));
      b.add(boxGeo(V(-6.6, 1.2, -2.2), V(6.6, 1.3, 2.2)), lam("bargeDeck", () => ({ color: "#3a3530" })));
      if (i % 2) for (let k = 0; k < 3; k++) b.add(boxGeo(V(-5.5 + k * 3.8, 1.3, -1.6), V(-2.3 + k * 3.8, 3.2, 1.6)), lam("box" + k, () => ({ color: ["#b23a32", "#3b5b9a", "#3f8a5a"][k] })));
      else b.add(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(5.6, 2.2, 1.9).translate(0, 1.3, 0), lam("sand", () => ({ color: "#c9b07a" })));
      b.build(g); shadowAll(g); this.barges.push(g); R.add(g);
    });
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group(), b = new Batch();
      b.add(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(3.4, 1.2, 1.4), lam("boat" + i, () => ({ color: i ? "#f4f1ea" : "#3f9fd5" })));
      b.add(new THREE.CylinderGeometry(1, 1, 0.5, 20, 1, true).scale(3.4, 1, 1.4).translate(0, 0.25, 0), lam("boat" + i, () => ({ color: i ? "#f4f1ea" : "#3f9fd5" })));
      b.add(boxGeo(V(-0.8, 0.3, -0.9), V(1.0, 1.9, 0.9)), lam("cabin", () => ({ color: "#e9d9b4" })));
      b.add(boxGeo(V(-0.9, 1.9, -1.0), V(1.1, 2.1, 1.0)), lam("cabinRoof", () => ({ color: "#b23a32" })));
      b.build(g); shadowAll(g); this.boats.push(g); R.add(g);
    }
    // the chunk of the island that slides in (trees on a grassy slab)
    {
      const b = new Batch();
      b.add(new THREE.SphereGeometry(1, 28, 12).scale(18, 5, 13), lam("islGrass", () => ({ map: grassTex() })));
      for (let i = 0; i < 6; i++) tree(b, -10 + i * 4, 3.2 + (i % 2) * 0.6, -4 + (i % 3) * 3.5, 1.3, i);
      oak(b, 4, 3.6, 4, 1.2);
      b.build(this.chunk); shadowAll(this.chunk); R.add(this.chunk);
    }

    // ---- the salt mine: room and pillar ----
    room(R, MINE, 70, -30, 40, MCEIL, lam("mineFloor", () => ({ map: saltTex() })), lam("mineWall", () => ({ map: saltTex() })), lam("mineWall", () => ({ map: saltTex() })), 10, 6);
    {
      const b = new Batch(), salt = lam("pillar", () => ({ map: saltTex() }));
      { const y = MCEIL, x0 = MINE[0] - 35, x1 = MINE[0] + 35, z0 = MINE[2] - 30, z1 = MINE[2] + 40; b.add(quad(V(x0, y, z0), V(x1, y, z0), V(x1, y, z1), V(x0, y, z1), 8, 8), salt); }
      for (const x of [-21, 0, 21]) for (const z of [-14, 6, 26]) if (!(x === 0 && z === 6)) b.add(boxGeo(V(MINE[0] + x - 4, 0, MINE[2] + z - 4), V(MINE[0] + x + 4, MCEIL, MINE[2] + z + 4), 2), salt);
      for (let i = 0; i < 8; i++) b.add(new THREE.SphereGeometry(0.22, 10, 8).translate(MINE[0] - 14 + i * 4, MCEIL - 0.5, MINE[2] - 3), lam("lamp", () => ({ color: "#fff3b0", emissive: new THREE.Color(1.6, 1.4, 0.8) })));
      b.add(new THREE.CircleGeometry(2.4, 24).rotateX(Math.PI / 2).translate(MINE[0] + 1, MCEIL - 0.02, MINE[2] - 5), lam("ceilHole", () => ({ color: "#1d1a22" })));
      // a mining machine
      b.add(boxGeo(V(MINE[0] + 7, 0.6, MINE[2] - 9), V(MINE[0] + 12, 2.6, MINE[2] - 5)), lam("machine", () => ({ color: "#e0a23a" })));
      for (const [x, z] of [[7.8, -9.1], [11.2, -9.1], [7.8, -4.9], [11.2, -4.9]]) b.add(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 14).rotateX(Math.PI / 2).translate(MINE[0] + x, 0.6, MINE[2] + z), lam("tyre", () => ({ color: "#2a2d33" })));
      b.add(new THREE.CylinderGeometry(0.5, 0.7, 2.2, 12).rotateZ(Math.PI / 2).translate(MINE[0] + 13.4, 1.8, MINE[2] - 7), lam("rigGrey", () => ({ color: "#8d949c" })));
      b.add(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(2.4, 1.2, 1.8).translate(MINE[0] - 9, 0, MINE[2] - 6), lam("saltPile", () => ({ color: "#f4f1ea" })));
      b.build(R, false);
    }
    this.mineWater = new THREE.Mesh(flatQuad(MINE[0] - 35, MINE[0] + 35, MINE[2] - 30, MINE[2] + 40, 8, 8, 0), lam("mineWater", () => ({ map: waterTex("mineWaterTex", "#3f8796") })));
    this.mineWater.receiveShadow = true; R.add(this.mineWater);

    // ---- the shaft head on dry land ----
    {
      const b = new Batch(), steel = lam("headSteel", () => ({ color: "#5d6472" }));
      b.add(flatQuad(HEAD[0] - 300, HEAD[0] + 300, HEAD[2] - 300, HEAD[2] + 300, 40, 40, 0), lam("shoreGrass", () => ({ map: grassTex() })));
      b.add(flatQuad(HEAD[0] - 12, HEAD[0] + 12, HEAD[2] - 10, HEAD[2] + 14, 6, 6, 0.02), lam("gravel", () => ({ map: tileTex("gravelTex", "#a89e8c", "rgba(90,80,70,0.25)", 6) })));
      const top = 15;
      for (const s of [-1, 1]) { strut(b, V(HEAD[0] + s * 4, 0, HEAD[2] - 6), V(HEAD[0] + s * 1.2, top, HEAD[2] - 6), 0.28, steel); strut(b, V(HEAD[0] + s * 4, 0, HEAD[2] - 12), V(HEAD[0] + s * 1.2, top, HEAD[2] - 6), 0.22, steel); }
      for (let y = 3; y < top; y += 3.5) strut(b, V(HEAD[0] - 4 + 2.8 * (y / top), y, HEAD[2] - 6), V(HEAD[0] + 4 - 2.8 * (y / top), y, HEAD[2] - 6), 0.12, steel);
      b.add(new THREE.TorusGeometry(2.0, 0.22, 10, 32).translate(HEAD[0], top + 1.2, HEAD[2] - 6), lam("wheel", () => ({ color: "#c0353a" })));
      b.add(boxGeo(V(HEAD[0] - 2.4, 0, HEAD[2] - 8), V(HEAD[0] + 2.4, 3, HEAD[2] - 4)), lam("cage", () => ({ color: "#8d949c" })));
      b.add(boxGeo(V(HEAD[0] - 1.2, 0.02, HEAD[2] - 4.02), V(HEAD[0] + 1.2, 2.5, HEAD[2] - 3.98)), lam("cageDoor", () => ({ color: "#2a2d33" })));
      house(b, HEAD[0] + 14, HEAD[2] - 10, 0, 10, 8, 6, 2, 0);
      house(b, HEAD[0] - 15, HEAD[2] - 12, 0, 8, 7, 5, 5, 0);
      const r2 = rng(5); for (let i = 0; i < 22; i++) tree(b, HEAD[0] - 80 + r2() * 160, 0, HEAD[2] - 30 - r2() * 60, 1.3 + r2(), i);
      b.build(R);
    }

    // ---- the kitchen: table, glass, sugar straw ----
    room(R, KIT, 6, -1.4, 6, 3.2, lam("kitFloor", () => ({ map: tileTex("kitFloorTex", "#e9e2d2", "rgba(150,120,90,0.4)", 8) })), lam("kitWall", () => ({ map: wallpaperTex() })), lam("kitSide", () => ({ color: "#e2cfa0" })), 3);
    {
      const b = new Batch(), wood = lam("tableWood", () => ({ color: "#a8724a" }));
      b.add(boxGeo(V(KIT[0] - 0.8, 0.74, KIT[2] - 0.35), V(KIT[0] + 0.8, 0.78, KIT[2] + 0.55)), lam("cloth", () => ({ map: tileTex("clothTex", "#f4f1ea", "rgba(200,60,60,0.7)", 8) })));
      for (const [x, z] of [[-0.72, -0.28], [0.72, -0.28], [-0.72, 0.48], [0.72, 0.48]]) b.add(boxGeo(V(KIT[0] + x - 0.04, 0, KIT[2] + z - 0.04), V(KIT[0] + x + 0.04, 0.74, KIT[2] + z + 0.04)), wood);
      b.add(boxGeo(V(KIT[0] - 2.2, 1.3, KIT[2] - 1.39), V(KIT[0] - 1.0, 2.4, KIT[2] - 1.36)), lam("kitWindow", () => ({ color: "#9fd0ef" })));
      b.add(boxGeo(V(KIT[0] + 1.3, 0, KIT[2] - 1.4), V(KIT[0] + 2.9, 0.9, KIT[2] - 0.8)), lam("counter", () => ({ color: "#3f8a5a" })));
      b.add(boxGeo(V(KIT[0] + 1.25, 0.9, KIT[2] - 1.42), V(KIT[0] + 2.95, 0.95, KIT[2] - 0.76)), lam("counterTop", () => ({ color: "#f4f1ea" })));
      b.add(new THREE.CylinderGeometry(0.11, 0.09, 0.2, 18).translate(KIT[0] - 0.45, 0.88, KIT[2] + 0.1), lam("sugarBowl", () => ({ color: "#3f9fd5" })));
      b.add(new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(KIT[0] - 0.45, 0.97, KIT[2] + 0.1), lam("sugar", () => ({ color: "#fbf8f0" })));
      b.build(R);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.043, 0.16, 24, 1, true).translate(KIT[0] + 0.12, 0.86, KIT[2] + 0.2),
        new THREE.MeshLambertMaterial({ color: "#d8eef5", transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
      R.add(glass);
      this.glassWater = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.042, 1, 24), lam("glassWater", () => ({ color: "#8fd0e6" }))); R.add(this.glassWater);
      this.straw = new THREE.Mesh(segGeo, lam("sugarStraw", () => ({ color: "#fbf3e2" }))); this.straw.castShadow = true; R.add(this.straw);
    }
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
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], lake = s.set === "lake";
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const flooded = id === 11;
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 6, 120);
    if (lake) Rr = Math.max(Rr, 40);
    if (s.set === "mine") Rr = 40;
    if (s.set === "kitchen") Rr = 4;
    this.sun.position.copy(focus).addScaledVector(sunDir, 260); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 560; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    const dim = flooded ? [0.6, 0.85, 0.9] : s.set === "mine" ? [0.95, 0.9, 0.82] : [1, 1, 1];
    TONE.uLitCol.value.set(L.lit[0] * dim[0], L.lit[1] * dim[1], L.lit[2] * dim[2]); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => { untone(flooded ? SEA_SKY[i] : s.set === "mine" ? CAVE_SKY[i] : h, this.c1); su["c" + i].value.copy(this.c1); });
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    if (flooded) { untone("#2f7c82", this.fog.color); this.fog.near = 4; this.fog.far = 45; }
    else if (lake || s.set === "head") { untone(L.fog, this.fog.color); this.fog.near = L.fogNear * 3; this.fog.far = L.fogFar * 2.4; }
    else if (s.set === "mine") { untone("#3a332c", this.fog.color); this.fog.near = 20; this.fog.far = 90; }
    else { this.fog.near = 5000; this.fog.far = 9000; }
    scene.fog = this.fog; scene.background = null;
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.visible = lake || s.set === "head";
      const a = (i / this.clouds.length) * Math.PI * 2 + 0.3 + t * 0.002, d = 620 + (i % 3) * 60;
      m.position.set(cam.position.x + Math.cos(a) * d, 120 + (i % 4) * 38, cam.position.z + Math.sin(a) * d);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      const w = 130 + (i % 4) * 30;
      m.scale.set(w, w / 2, 1);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- the lake ----
    const lvl = lvlAt(id, t), fn = funnelAt(id, t);
    const rf = Math.max(0.01, fn.r);
    {
      const p = this.water.geometry.attributes.position as THREE.BufferAttribute, o = this.water0, R1 = LR + 3;
      for (let i = 0; i < p.count; i++) {
        const x = o[i * 3], z = o[i * 3 + 2], r0 = Math.hypot(x, z) || 1, r = rf + ((r0 - 1) * (R1 - rf)) / (R1 - 1);
        p.setXYZ(i, (x / r0) * r, 0, (z / r0) * r);
      }
      p.needsUpdate = true;
      this.water.position.set(0, lvl, 0); this.water.rotation.y = -fn.spin * 0.08;
      this.water.visible = lake && lvl > -BED - 1;
    }
    this.funnel.visible = lake && fn.r > 0.3;
    if (this.funnel.visible) {
      const depth = 0.8 * rf + 6;
      this.funnel.scale.set(rf, depth, rf); this.funnel.position.set(0, lvl - depth / 2 + 0.02, 0); this.funnel.rotation.y = -fn.spin;
    }
    const rg = rigAt(id, t);
    this.rig.visible = lake && rg.on;
    this.rig.position.set(0, -rg.sink, 0); this.rig.rotation.set(0, rg.spin, rg.tilt, "YXZ");
    this.barges.forEach((g, i) => {
      const b = bargeAt(id, t, i); g.visible = lake && b.on;
      g.position.set(b.p[0], b.p[1], b.p[2]); g.rotation.set(b.tilt, b.yaw, 0, "YXZ");
    });
    const boatsOn = lake && [1, 3, 5, 16, 17, 18].includes(id);
    const BP: V3[] = [[38, 0, 30], [-30, 0, 46]];
    this.boats.forEach((g, i) => { g.visible = boatsOn; g.position.set(BP[i][0] + (id >= 16 ? 10 : 0), 0.15 + 0.08 * Math.sin(t * 1.6 + i), BP[i][2]); g.rotation.set(0.03 * Math.sin(t * 1.3 + i), 0.7 + i * 2.1, 0); });
    {
      const on = lake && id <= 8, u = id === 8 ? clamp01((t - (W.trees - 0.3)) / 2.4) : 0;
      const c0: V3 = [-40, -2, -46];
      this.chunk.visible = on;
      this.chunk.position.set(c0[0] * (1 - 0.55 * u), c0[1] - 24 * u ** 2, c0[2] * (1 - 0.55 * u));
      this.chunk.rotation.set(0.5 * u, 0.6 + 1.6 * u, -0.4 * u);
    }
    // canal, skiff, waterfall
    let ph = t; if (t > 49) { ph = 49; for (let x = 49; x < t; x += 0.05) ph += flowAt(x) * 0.05; }
    this.canalTex.offset.set(-ph * 0.35, 0);
    this.skiff.visible = lake && (id === 14 || id === 15);
    this.skiff.position.set(LR + 30 + 2.2 * (ph - 49), GY + 0.2, 1.5); this.skiff.rotation.set(0, 0.1 * Math.sin(t), 0.04 * Math.sin(t * 1.7));
    this.fall.visible = lake && (id === 14 || id === 15) && t > W.backwards - 0.6;
    this.fallT.offset.set(0, t * 1.4);
    // ---- the mine ----
    const mw = mineWaterAt(id, t);
    this.mineWater.visible = s.set === "mine" && mw > 0;
    this.mineWater.position.set(0, Math.max(0.02, mw), 0);
    // ---- the kitchen ----
    const stw = strawAt(t);
    const g0 = V(KIT[0] + 0.12, 0.79, KIT[2] + 0.2);
    this.glassWater.scale.set(1, 0.15 * stw.lv, 1); this.glassWater.position.set(g0.x, 0.785 + 0.075 * stw.lv, g0.z);
    poseSeg(this.straw, g0, V(KIT[0] + 0.035, 0.965, KIT[2] - 0.17), stw.r);
    void add; void HEAD; void ISL;
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const stg = stage(id, t, { pos: cam.position, right, sun: sunDir }, 0);
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
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(Math.abs(p.w), p.h)))) continue;
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
    return focus;
  }
}
