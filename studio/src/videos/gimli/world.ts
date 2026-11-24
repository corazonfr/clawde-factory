// The Gimli Glider world as one three.js scene: sky, a scrolling cloud deck for the cruise shots, the Boeing 767 (our own
// generic livery: white with a red tail, no logos), the cockpit interior, the gate in Montreal (apron, terminal, fuel
// truck, the fuel panel), the old air base at Gimli (runway, drag strip, race cars, bleachers, hangars, tower, trees) and
// a kitchen for the analogy. Each set sits far from the others; update(id, f, camera) poses everything per frame.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, Ray, prop, setSight, quad } from "./build";
import { ctex, cloudHD, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, ShotDef, AJ, CK, CAPT, FO, G, TRUCK, PANEL, GM, CROWD_Z, HANGAR, K, W,
  jetAt, engL, engR, screensAt, V3,
} from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // all props are procedural; no GLB files

// ---------------- painted textures ----------------
const noiseTex = (key: string, base: string, dots = 2200, a = 0.06, size = 1024) => ctex(key, size, size, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < dots; i++) { g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; g.fillRect(r() * size, r() * size, 2 + r() * 4, 2 + r() * 4); }
});
const grassTex = () => ctex("gimliGrass", 512, 512, (g, r) => {
  g.fillStyle = "#79ad52"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) { g.strokeStyle = r() < 0.5 ? "rgba(170,210,110,0.35)" : "rgba(50,100,40,0.28)"; g.lineWidth = 2; const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y - 8); g.stroke(); }
});
const glassTex = () => ctex("terminalGlass", 1024, 512, (g) => {
  g.fillStyle = "#d9d4c8"; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "#6f93bd"; g.fillRect(0, 120, 1024, 300);
  g.fillStyle = "rgba(255,255,255,0.22)"; for (let i = 0; i < 8; i++) g.fillRect(30 + i * 128, 130, 40, 280);
  g.fillStyle = "#2f3646"; for (let i = 0; i <= 16; i++) g.fillRect(i * 64, 120, 6, 300);
});
const screenTex = (k: number) => ctex("cockpitScreen" + k, 128, 128, (g) => {
  g.fillStyle = "#0b1a2a"; g.fillRect(0, 0, 128, 128);
  if (k % 2) { g.fillStyle = "#3f86c9"; g.fillRect(8, 8, 112, 56); g.fillStyle = "#8a5a2c"; g.fillRect(8, 64, 112, 56); g.strokeStyle = "#ffffff"; g.lineWidth = 4; g.beginPath(); g.moveTo(34, 64); g.lineTo(94, 64); g.stroke(); }
  else { g.strokeStyle = "#5fe08a"; g.lineWidth = 4; g.beginPath(); g.arc(64, 70, 40, Math.PI, 2 * Math.PI); g.stroke(); g.beginPath(); g.moveTo(64, 70); g.lineTo(90, 40); g.stroke(); g.fillStyle = "#f2cf4a"; g.fillRect(20, 100, 88, 8); }
});
const fanTex = () => ctex("jetFan", 256, 256, (g) => {
  g.fillStyle = "#2a2d33"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#8d949c"; g.lineWidth = 10;
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; g.beginPath(); g.moveTo(128, 128); g.quadraticCurveTo(128 + 70 * Math.cos(a + 0.4), 128 + 70 * Math.sin(a + 0.4), 128 + 124 * Math.cos(a), 128 + 124 * Math.sin(a)); g.stroke(); }
  g.fillStyle = "#c9ccd2"; g.beginPath(); g.arc(128, 128, 30, 0, 7); g.fill();
  g.fillStyle = "#1d1a22"; g.beginPath(); g.arc(128, 128, 8, 0, 7); g.fill();
});
const tileTex = () => ctex("kitchenTile", 512, 512, (g) => {
  g.fillStyle = "#f1e2b8"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(120,90,50,0.25)"; g.lineWidth = 4;
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke(); }
});
const floorTex = () => ctex("kitchenFloor", 512, 512, (g) => {
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? "#c25a3a" : "#efe6d2"; g.fillRect(i * 64, j * 64, 64, 64); }
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
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 13: { az: 150, el: 10 }, 15: { az: 130, el: 9 }, 5: { az: 150, el: 40 }, 9: { az: 150, el: 40 }, 7: { az: 120, el: 40 } };

// ---------------- sight lines (props in front of a lens are left out) ----------------
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) {
    for (let f = s.a - 8; f < s.b + 8; f += 3) {
      const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
      const fw = look.clone().sub(o), len = Math.min(fw.length() + 4, 40);
      fw.normalize();
      const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
      const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
      for (const [sx, sy] of [[0, 0], [-0.7, 0], [0.7, 0], [0, 0.7], [0, -0.5], [-0.7, -0.5], [0.7, -0.5]])
        out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
    }
  }
  return out;
};

const flatQuad = (x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = 0) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
const shadowAll = (o: THREE.Object3D, cast = true) => o.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) { m.castShadow = cast; m.receiveShadow = true; } });
const cyl = (r0: number, r1: number, len: number, seg = 20) => new THREE.CylinderGeometry(r0, r1, len, seg);
/** cylinder along x centred at (x, y, z) */
const cylX = (r0: number, r1: number, len: number, x: number, y: number, z: number, seg = 20) => cyl(r0, r1, len, seg).rotateZ(-Math.PI / 2).translate(x, y, z);
/** cylinder along z centred at (x, y, z) (wheels) */
const cylZ = (r: number, w: number, x: number, y: number, z: number, seg = 18) => cyl(r, r, w, seg).rotateX(Math.PI / 2).translate(x, y, z);
/** a flat planform (points in x, z) extruded down by `th` from height y */
const plate = (pts: [number, number][], th: number, y: number, dihedral = 0) => {
  const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false });
  g.rotateX(Math.PI / 2); // shape y -> world z, extrude depth -> world -y
  g.translate(0, y, 0);
  if (dihedral) { const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + dihedral * Math.max(0, Math.abs(p.getZ(i)) - 1.5)); }
  g.computeVertexNormals();
  return g;
};

// ---------------- the jet ----------------
const FUS_Y = 2.7;
type Jet = { grp: THREE.Group; gear: THREE.Group; noseGear: THREE.Group; fans: THREE.Mesh[]; slides: THREE.Group };
/** a Boeing 767-shaped airliner, nose +x, origin on the ground under the main gear */
const jetMesh = (): Jet => {
  const grp = new THREE.Group();
  const white = lam("jetWhite", () => ({ color: "#f2f1ee" })), grey = lam("jetGrey", () => ({ color: "#b9bec6" }));
  const red = lam("jetRed", () => ({ color: "#cf2b2b" })), dark = lam("jetDark", () => ({ color: "#26303c" }));
  const metal = lam("jetMetal", () => ({ color: "#8d949c" })), tyre = lam("carTyre", () => ({ color: "#26252b" }));
  const b = new Batch();
  // fuselage: a lathe along x, the tail cone swept up
  const prof: [number, number][] = [[-17.6, 0.2], [-17.1, 0.5], [-15, 1.05], [-12, 1.6], [-9, 1.88], [12, 1.9], [14.5, 1.82], [16.3, 1.55], [17.6, 1.05], [18.3, 0.5], [18.6, 0.0]];
  const fus = new THREE.LatheGeometry(prof.map(([x, r]) => new THREE.Vector2(r, x)), 40);
  fus.rotateZ(-Math.PI / 2);
  { const p = fus.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = p.getX(i); if (x < -9) p.setY(i, p.getY(i) + 0.1 * (-9 - x)); } }
  fus.computeVertexNormals(); fus.translate(0, FUS_Y, 0);
  b.add(fus, white);
  // belly fairing (grey) and the cheat line + windows on both sides
  b.add(boxGeo(V(-6, FUS_Y - 1.95, -1.3), V(5, FUS_Y - 1.2, 1.3)), grey);
  for (const sz of [-1, 1]) {
    b.add(boxGeo(V(-12, FUS_Y - 0.02, sz * 1.92 - 0.03), V(13, FUS_Y + 0.16, sz * 1.92 + 0.03)), red);
    for (let x = -11; x <= 12.5; x += 0.95) b.add(boxGeo(V(x - 0.15, FUS_Y + 0.38, sz * 1.86 - 0.04), V(x + 0.15, FUS_Y + 0.78, sz * 1.86 + 0.04)), dark);
    for (const x of [13.6, -10.2]) b.add(boxGeo(V(x - 0.45, FUS_Y - 0.6, sz * 1.9 - 0.03), V(x + 0.45, FUS_Y + 1.0, sz * 1.9 + 0.03)), grey); // doors
    const cw = new THREE.BoxGeometry(0.9, 0.42, 0.2); cw.rotateX(sz * 0.55); cw.translate(16.1, FUS_Y + 0.9, sz * 1.15); b.add(cw, dark);
  }
  // wings (dihedral), engines on pylons, the tail
  b.add(plate([[5, 1.5], [-3.5, 1.5], [-10.5, 17], [-8.2, 17]], 0.34, 1.68, 0.07), white);
  b.add(plate([[5, -1.5], [-8.2, -17], [-10.5, -17], [-3.5, -1.5]], 0.34, 1.68, 0.07), white);
  for (const sz of [-1, 1]) {
    b.add(cylX(1.15, 0.95, 4.4, 5.4, 1.55, sz * 6.2, 28), white);
    b.add(cylX(1.18, 1.18, 0.5, 7.4, 1.55, sz * 6.2, 28), red);
    b.add(cylX(0.62, 0.3, 1.2, 2.7, 1.55, sz * 6.2, 18), metal);
    b.add(boxGeo(V(1.0, 2.3, sz * 6.2 - 0.18), V(5.5, 2.25 + 0.35 + 0.07 * 4.7, sz * 6.2 + 0.18)), white);
  }
  const fin = new THREE.Shape([new THREE.Vector2(-10.6, 4.3), new THREE.Vector2(-17.0, 4.3), new THREE.Vector2(-18.3, 12.2), new THREE.Vector2(-16.0, 12.2)]);
  const finG = new THREE.ExtrudeGeometry(fin, { depth: 0.36, bevelEnabled: false }); finG.translate(0, 0, -0.18); finG.computeVertexNormals();
  b.add(finG, red);
  b.add(plate([[-13.6, 0.5], [-16.6, 0.5], [-19.0, 7.2], [-17.8, 7.2]], 0.24, FUS_Y + 1.45), white);
  b.add(plate([[-13.6, -0.5], [-17.8, -7.2], [-19.0, -7.2], [-16.6, -0.5]], 0.24, FUS_Y + 1.45), white);
  b.build(grp);
  // engine fans (spin while running)
  const fans: THREE.Mesh[] = [];
  const fanM = new THREE.MeshLambertMaterial({ map: fanTex() });
  for (const sz of [-1, 1]) {
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.98, 32).rotateY(Math.PI / 2), fanM);
    fan.position.set(7.62, 1.55, sz * 6.2); grp.add(fan); fans.push(fan);
  }
  // landing gear
  const gear = new THREE.Group(), gb = new Batch();
  for (const sz of [-1, 1]) {
    gb.add(cyl(0.14, 0.14, 1.2).translate(-0.8, 1.15, sz * 2.9), metal);
    for (const dz of [-0.32, 0.32]) for (const dx of [-0.6, 0.6]) gb.add(cylZ(0.55, 0.36, -0.8 + dx, 0.55, sz * 2.9 + dz), tyre);
  }
  gb.build(gear); grp.add(gear);
  const noseGear = new THREE.Group(), nb = new Batch();
  nb.add(cyl(0.11, 0.11, 1.3).translate(0, 1.05, 0), metal);
  for (const dz of [-0.24, 0.24]) nb.add(cylZ(0.45, 0.3, 0, 0.45, dz), tyre);
  nb.build(noseGear); noseGear.position.set(14.2, 0, 0); grp.add(noseGear);
  // escape slides (front and rear doors, right side)
  const slides = new THREE.Group(), sm = lam("slideYellow", () => ({ color: "#f2c230" }));
  for (const [x, top] of [[13.6, FUS_Y - 0.4], [-10.2, FUS_Y + 0.6]] as const) {
    const len = 8.2, s = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.35, len).translate(0, 0, len / 2), sm);
    s.position.set(x, top, 1.95); s.rotation.x = Math.atan2(top, len) * 0.98; s.castShadow = true; slides.add(s);
  }
  grp.add(slides);
  shadowAll(grp);
  return { grp, gear, noseGear, fans, slides };
};

// ---------------- vehicles ----------------
/** a drag racer, nose +x, origin on the ground */
const racerMesh = (col: string, key: string) => {
  const grp = new THREE.Group(), b = new Batch();
  const paint = lam("racer" + key, () => ({ color: col })), tyre = lam("carTyre", () => ({ color: "#26252b" })), dark = lam("truckDark", () => ({ color: "#2a2d33" }));
  b.add(boxGeo(V(-2.0, 0.3, -0.7), V(1.6, 0.8, 0.7)), paint);
  const nose = new THREE.BoxGeometry(1.8, 0.36, 1.2); nose.translate(2.4, 0.48, 0); b.add(nose, paint);
  b.add(boxGeo(V(-0.9, 0.8, -0.55), V(0.3, 1.3, 0.55)), dark);
  b.add(boxGeo(V(-2.3, 1.2, -0.9), V(-1.9, 1.3, 0.9)), paint);
  for (const z of [-0.6, 0.6]) b.add(boxGeo(V(-2.15, 0.8, z - 0.05), V(-2.05, 1.2, z + 0.05)), dark);
  for (const z of [-0.85, 0.85]) { b.add(cylZ(0.55, 0.5, -1.3, 0.55, z), tyre); b.add(cylZ(0.32, 0.2, 2.6, 0.32, z * 0.9), tyre); }
  b.build(grp);
  shadowAll(grp);
  return grp;
};
const fuelTruck = () => {
  const grp = new THREE.Group(), b = new Batch();
  const body = lam("fuelWhite", () => ({ color: "#eeeae0" })), red = lam("jetRed", () => ({ color: "#cf2b2b" }));
  const dark = lam("truckDark", () => ({ color: "#2a2d33" })), glassM = lam("carGlass", () => ({ color: "#2a3340" })), tyre = lam("carTyre", () => ({ color: "#26252b" }));
  b.add(boxGeo(V(-3.2, 0.6, -1.1), V(4.8, 0.95, 1.1)), dark);
  b.add(cylX(1.15, 1.15, 5.8, -0.1, 2.05, 0, 28), body);
  b.add(cylX(1.18, 1.18, 0.4, -0.1, 2.05, 0, 28), red);
  b.add(boxGeo(V(3.0, 0.95, -1.15), V(4.9, 2.9, 1.15)), red);
  b.add(boxGeo(V(4.2, 1.9, -1.0), V(4.93, 2.7, 1.0)), glassM);
  for (const [x, z] of [[3.9, 1.12], [3.9, -1.12], [-1.8, 1.12], [-1.8, -1.12], [-2.8, 1.12], [-2.8, -1.12]]) b.add(cylZ(0.5, 0.36, x, 0.5, z), tyre);
  b.add(boxGeo(V(-0.2, 3.2, -0.1), V(0.2, 3.35, 0.1)), lam("beacon", () => ({ color: "#f2cf4a" })));
  b.build(grp);
  shadowAll(grp);
  return grp;
};

/** additive light material (HDR colour, no ink) */
const lightMat = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1, 1, 1), fog: false, side: THREE.DoubleSide });
void lightMat;

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
  private deck = new THREE.Group();
  private jet: Jet;
  private screens: THREE.MeshBasicMaterial[] = [];
  private racers: THREE.Group[] = [];
  private parked = new THREE.Group();
  private bleachers = new THREE.Group();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private c1 = new THREE.Color(); private c2 = new THREE.Color();

  constructor(kit: Kit) {
    const R = this.root;
    // ---- sky + light (as in the bridge / Pisa / Walkie / whale shorts) ----
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
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    // ---- the cloud deck (three tiles of 700 m, scrolled under the jet / the cockpit) ----
    const cm = lam("cloudDeck", () => ({ color: "#f4f6fb" })), cr = rng(5);
    const tile = new Batch();
    for (let i = 0; i < 150; i++) {
      const r = 14 + cr() * 26, g = new THREE.SphereGeometry(1, 18, 10);
      g.scale(r * (1.3 + cr() * 0.8), r * (0.45 + cr() * 0.25), r * (1 + cr() * 0.5));
      g.translate(-350 + cr() * 700, -cr() * 8, -420 + cr() * 840);
      tile.add(g, cm);
    }
    for (const dx of [-700, 0, 700]) { const t = new THREE.Group(); tile.build(t, false); t.position.x = dx; this.deck.add(t); if (dx !== 700) for (let i = 0; i < 150; i++) { const r = 14 + cr() * 26, g = new THREE.SphereGeometry(1, 18, 10); g.scale(r * (1.3 + cr() * 0.8), r * (0.45 + cr() * 0.25), r * (1 + cr() * 0.5)); g.translate(-350 + cr() * 700, -cr() * 8, -420 + cr() * 840); tile.add(g, cm); } }
    R.add(this.deck);

    // ---- the jet ----
    this.jet = jetMesh(); R.add(this.jet.grp);

    // ---- the cockpit (no shadow casting: the sun must not black out the interior) ----
    {
      const c = new Batch(), X = CK[0], Y = CK[1], Z = CK[2];
      const wall = lam("ckWall", () => ({ color: "#c9c3b6" })), pnl = lam("ckPanel", () => ({ color: "#3d414c" })), seat = lam("ckSeat", () => ({ color: "#5a4a6a" }));
      const B = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: THREE.Material) => c.add(boxGeo(V(X + x0, Y + y0, Z + z0), V(X + x1, Y + y1, Z + z1)), m);
      B(-3.0, -0.1, -1.5, 1.3, 0, 1.5, lam("ckFloor", () => ({ color: "#4a4d55" })));
      B(-3.0, 0, -1.5, -2.8, 2.4, 1.5, wall);
      B(-2.81, 0, -0.35, -2.79, 2.0, 0.35, lam("ckDoor", () => ({ color: "#8a8478" })));
      for (const s of [-1, 1]) { B(-3.0, 0, s * 1.5 - 0.1, 0.5, 2.4, s * 1.5 + 0.1, wall); B(0.5, 0, s * 1.4 - 0.1, 1.3, 1.45, s * 1.4 + 0.1, wall); B(0.95, 1.45, s * 1.35 - 0.06, 1.05, 2.35, s * 1.35 + 0.06, pnl); }
      B(-3.0, 2.35, -1.5, 1.05, 2.45, 1.5, wall);
      B(-1.0, 2.1, -0.65, 0.45, 2.36, 0.65, pnl);
      B(0.5, 0.0, -1.35, 0.95, 1.4, 1.35, pnl);
      B(0.38, 1.4, -1.35, 1.0, 1.5, 1.35, lam("ckGlare", () => ({ color: "#2a2d33" })));
      B(0.95, 1.45, -0.05, 1.05, 2.35, 0.05, pnl);
      B(0.95, 2.25, -1.4, 1.05, 2.36, 1.4, pnl);
      for (const p of [CAPT, FO]) {
        const zx = p[2] - Z;
        B(-1.85, 0.25, zx - 0.32, -1.25, 0.42, zx + 0.32, seat);
        B(-1.95, 0.42, zx - 0.32, -1.82, 1.45, zx + 0.32, seat);
      }
      c.build(R, false);
      for (let i = 0; i < 6; i++) {
        const z = -1.05 + i * 0.42, m = new THREE.MeshBasicMaterial({ map: screenTex(i), color: new THREE.Color(1.15, 1.15, 1.15), fog: false, side: THREE.DoubleSide });
        const s = new THREE.Mesh(quad(V(X + 0.495, Y + 0.95, Z + z + 0.17), V(X + 0.495, Y + 0.95, Z + z - 0.17), V(X + 0.495, Y + 1.31, Z + z - 0.17), V(X + 0.495, Y + 1.31, Z + z + 0.17)), m);
        this.screens.push(m); R.add(s);
      }
    }

    setSight(sightLines().filter((r) => r.core));
    // ---- the gate in Montreal ----
    {
      const b = new Batch();
      b.add(flatQuad(G[0] - 420, G[0] + 420, -420, 420, 840 / 10, 840 / 10), lam("apron", () => ({ map: noiseTex("apron", "#8c8f96", 2600, 0.05) })));
      const yl = lam("apronLine", () => ({ color: "#f2cf4a" }));
      b.add(flatQuad(G[0] - 60, G[0] + 60, -0.25, 0.25, 1, 1, 0.012), yl);
      for (const z of [-30, 30]) b.add(flatQuad(G[0] - 80, G[0] + 80, z - 0.2, z + 0.2, 1, 1, 0.012), yl);
      b.add(boxGeo(V(G[0] - 90, 0, -75), V(G[0] + 70, 12, -45)), lam("termSide", () => ({ color: "#d9d4c8" })));
      b.add(quad(V(G[0] - 90, 0, -44.98), V(G[0] + 70, 0, -44.98), V(G[0] + 70, 12, -44.98), V(G[0] - 90, 12, -44.98), 160 / 40, 1), lam("termFront", () => ({ map: glassTex() })));
      b.add(boxGeo(V(G[0] - 92, 12, -77), V(G[0] + 72, 13, -43)), lam("termRoof", () => ({ color: "#8a8f99" })));
      b.add(boxGeo(V(G[0] + 30, 12, -70), V(G[0] + 36, 30, -64)), lam("termRoof", () => ({ color: "#8a8f99" })));
      b.add(boxGeo(V(G[0] + 29, 30, -71), V(G[0] + 37, 33, -63)), lam("carGlass", () => ({ color: "#2a3340" })));
      // the fuel panel
      b.add(boxGeo(V(PANEL[0] - 0.45, 0, PANEL[2] - 0.2), V(PANEL[0] + 0.45, 1.65, PANEL[2] + 0.2)), lam("panelBox", () => ({ color: "#e2453c" })));
      b.build(R);
      const tb = new Batch(), tr = rng(31);
      for (let i = 0; i < 40; i++) prop(tb, kit, "tree_cone", G[0] - 300 + tr() * 600, 0, -140 - tr() * 80, 10 + tr() * 8, i);
      tb.build(R);
      const truck = fuelTruck(); truck.position.set(...TRUCK); R.add(truck);
      const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(TRUCK[0] - 3.2, 1.0, TRUCK[2] - 0.6), V(TRUCK[0] - 4.2, 0.2, TRUCK[2] - 2.4), V(G[0] - 3.4, 0.4, 9.2), V(G[0] - 3.8, 1.85, 8.6)]), 40, 0.09, 8, false), lam("hose", () => ({ color: "#1d1a22" })));
      hose.castShadow = true; R.add(hose);
    }

    // ---- Gimli: the old air base, its runway and the drag strip ----
    {
      const b = new Batch();
      b.add(flatQuad(GM[0] - 650, GM[0] + 650, -650, 650, 1300 / 8, 1300 / 8), lam("gimliGrass", () => ({ map: grassTex() })));
      b.add(flatQuad(GM[0] - 760, GM[0] + 380, -22, 22, 1140 / 10, 44 / 10, 0.01), lam("runway", () => ({ map: noiseTex("runway", "#6a6d75", 2600, 0.06) })));
      b.add(flatQuad(GM[0] - 60, GM[0] + 380, -9, 9, 440 / 10, 18 / 10, 0.016), lam("dragStrip", () => ({ map: noiseTex("dragStrip", "#4e5057", 2600, 0.06) })));
      const wl = lam("rwLine", () => ({ color: "#f1eee6" }));
      for (let x = GM[0] - 740; x < GM[0] - 70; x += 30) b.add(flatQuad(x, x + 14, -0.35, 0.35, 1, 1, 0.02), wl);
      for (let i = 0; i < 8; i++) for (const s of [-1, 1]) b.add(flatQuad(GM[0] - 750, GM[0] - 715, s * (3 + i * 2.2), s * (3 + i * 2.2) + s * 1.2, 1, 1, 0.02), wl);
      b.add(flatQuad(GM[0] + 4, GM[0] + 5, -9, 9, 1, 1, 0.022), wl);
      for (let x = GM[0] - 60; x < GM[0] + 380; x += 8) for (const s of [-1, 1]) b.add(flatQuad(x, x + 4, s * 9.6 - 0.3, s * 9.6 + 0.3, 1, 1, 0.02), lam("dragLine", () => ({ color: "#f2cf4a" })));
      // hangars (curved roofs, door toward the runway) and the old tower
      const hw = lam("hangarWall", () => ({ color: "#b9a88a" })), hr = lam("hangarRoof", () => ({ color: "#8f969e" })), door = lam("hangarDoor", () => ({ color: "#5b6270" }));
      for (const hx of [HANGAR[0], HANGAR[0] + 60, HANGAR[0] - 60]) {
        b.add(boxGeo(V(hx - 15, 0, HANGAR[2] - 24), V(hx + 15, 7, HANGAR[2])), hw);
        b.add(new THREE.CylinderGeometry(12, 12, 30, 24, 1, false, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.55, 1).translate(hx, 7, HANGAR[2] - 12), hr);
        b.add(quad(V(hx - 11, 0, HANGAR[2] + 0.02), V(hx + 11, 0, HANGAR[2] + 0.02), V(hx + 11, 6.4, HANGAR[2] + 0.02), V(hx - 11, 6.4, HANGAR[2] + 0.02)), door);
      }
      b.add(boxGeo(V(GM[0] - 62, 0, -58), V(GM[0] - 56, 11, -52)), lam("towerWall", () => ({ color: "#e9e2d2" })));
      b.add(boxGeo(V(GM[0] - 63, 11, -59), V(GM[0] - 55, 14, -51)), lam("carGlass", () => ({ color: "#2a3340" })));
      b.add(boxGeo(V(GM[0] - 63.5, 14, -59.5), V(GM[0] - 54.5, 14.5, -50.5)), lam("termRoof", () => ({ color: "#8a8f99" })));
      b.build(R);
      // bleachers along the drag strip (hidden in the flashback)
      const bb = new Batch(), bl = lam("bleacher", () => ({ color: "#9aa1ac" })), seatM = lam("bleacherSeat", () => ({ color: "#3b5b9a" }));
      for (let k = 0; k < 4; k++) bb.add(boxGeo(V(GM[0] - 110, 0, CROWD_Z + 3 + k * 0.9), V(GM[0] + 30, 0.45 * (k + 1), CROWD_Z + 3.9 + k * 0.9)), k % 2 ? seatM : bl);
      bb.build(this.bleachers); R.add(this.bleachers);
      const tb = new Batch(), tr = rng(19);
      for (let i = 0; i < 110; i++) { const x = GM[0] - 600 + tr() * 1100, z = (tr() < 0.5 ? -1 : 1) * (120 + tr() * 160); prop(tb, kit, ["tree_oak", "tree_cone", "tree_fat"][i % 3], x, 0, z, 8 + tr() * 7, i); }
      tb.build(R);
      for (const [x, z, c, k] of [[GM[0] + 20, -14, "#e2453c", "a"], [GM[0] + 34, -15, "#f2cf4a", "b"], [GM[0] + 48, -14, "#3f9fd5", "c"], [GM[0] + 60, 14, "#5d7a3a", "d"]] as const) {
        const r = racerMesh(c, k); r.position.set(x, 0, z); r.rotation.y = 0.2; this.parked.add(r);
      }
      R.add(this.parked);
      for (const [c, k] of [["#e2453c", "r1"], ["#7b5ac9", "r2"]] as const) { const r = racerMesh(c, k); R.add(r); this.racers.push(r); }
    }
    setSight([]);

    // ---- the kitchen ----
    {
      const b = new Batch(), X = K[0];
      b.add(flatQuad(X - 5, X + 5, -3, 4, 10 / 1.2, 7 / 1.2), lam("kFloor", () => ({ map: floorTex() })));
      b.add(quad(V(X - 5, 0, -2.4), V(X + 5, 0, -2.4), V(X + 5, 3.2, -2.4), V(X - 5, 3.2, -2.4), 10 / 1.5, 3.2 / 1.5), lam("kTile", () => ({ map: tileTex() })));
      b.add(quad(V(X - 1.2, 1.45, -2.38), V(X + 0.6, 1.45, -2.38), V(X + 0.6, 2.6, -2.38), V(X - 1.2, 2.6, -2.38)), lam("kWindow", () => ({ color: "#9fc7e8" })));
      const cab = lam("kCab", () => ({ color: "#5d9a8a" })), top = lam("kTop", () => ({ color: "#efe6d2" })), wood = lam("kWood", () => ({ color: "#a8724a" }));
      b.add(boxGeo(V(X - 5, 0, -2.4), V(X + 5, 0.88, -1.8)), cab);
      b.add(boxGeo(V(X - 5, 0.88, -2.4), V(X + 5, 0.94, -1.75)), top);
      b.add(boxGeo(V(X - 4, 2.0, -2.4), V(X - 1.6, 2.9, -2.05)), cab);
      b.add(boxGeo(V(X + 1.2, 2.0, -2.4), V(X + 4, 2.9, -2.05)), cab);
      b.add(boxGeo(V(X - 1.1, 0.84, -0.6), V(X + 1.1, 0.92, 0.6)), wood);
      for (const [dx, dz] of [[-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5]]) b.add(boxGeo(V(X + dx - 0.05, 0, dz - 0.05), V(X + dx + 0.05, 0.84, dz + 0.05)), wood);
      b.build(R);
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
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = s.set === "cockpit" || s.set === "kitchen" ? 0.05 : 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K2 = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden" || dist > 40) Rr = Math.max(Rr, 70);
    this.sun.position.copy(focus).addScaledVector(sunDir, 260); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 560; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...LOOK[s.light].bounce); TONE.uSat.value = LOOK[s.light].sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun, clouds ----
    const su = this.skyMat.uniforms;
    K2.sky.c.forEach((h, i) => { untone(h, this.c1); su["c" + i].value.copy(this.c1); });
    const e = K2.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color);
    const FOG: Record<string, [number, number]> = { air: [160, 1300], cockpit: [160, 1300], gate: [60, 800], gimli: [80, 1000], kitchen: [40, 300] };
    [this.fog.near, this.fog.far] = FOG[s.set];
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    const high = s.set === "air" || s.set === "cockpit";
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      const a = (i / this.clouds.length) * Math.PI * 2 + 0.3 + t * 0.002, d = 620 + (i % 3) * 60;
      const lift = high ? cam.position.y - 30 + (i % 4) * 22 : 120 + (i % 4) * 38;
      m.position.set(cam.position.x + Math.cos(a) * d, lift, cam.position.z + Math.sin(a) * d);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      const w = 130 + (i % 4) * 30;
      m.scale.set(w, w / 2, 1);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- the cloud deck ----
    this.deck.visible = high;
    if (high) { const base = s.set === "air" ? AJ : CK; this.deck.position.set(base[0] - ((t * 45) % 700), base[1] - 46, base[2]); }
    // ---- the jet ----
    const jp = jetAt(id, t), J = this.jet;
    J.grp.visible = jp.visible;
    if (jp.visible) {
      const onGround = jp.pos[1] <= 0.001;
      J.grp.position.set(...jp.pos);
      J.grp.rotation.set(jp.roll, jp.yaw, jp.pitch - (onGround ? (1 - jp.nose) * 0.1 : 0), "YZX");
      J.gear.visible = jp.gear > 0.5;
      J.noseGear.visible = jp.gear > 0.5 && jp.nose > 0.05;
      J.noseGear.scale.y = Math.max(0.05, jp.nose);
      const run = s.set === "air" ? (id < 6 || id === 15) : false;
      const spin = (on: boolean, tOff: number) => (on ? t * 31 : tOff * 31 + (t - tOff) * 2.5);
      J.fans[0].rotation.x = s.set !== "air" ? 0.4 : run ? t * 31 : id === 6 ? spin(engL(t) > 0, W.stopped) : t * 2.5;
      J.fans[1].rotation.x = s.set !== "air" ? 1.1 : run ? t * 31 + 1 : id === 6 ? spin(engR(t) > 0, W.one) : t * 2.5 + 1;
      J.slides.visible = (id === 12 && t > 58.75) || id === 14;
    }
    // ---- cockpit screens, race cars, bleachers ----
    const lit = screensAt(t) > 0.5 || id === 5 || id === 9 ? 1 : 0;
    for (const m of this.screens) m.color.setScalar(id === 7 && !lit ? 0.04 : 1.15);
    const racing = id === 10 && t > 39.2;
    this.racers.forEach((r, i) => {
      r.visible = id === 10 || id === 12;
      const z = i ? 3 : -3;
      if (racing) r.position.set(GM[0] - 60 + 50 * (t - 39.3) - i * 3, 0, z);
      else r.position.set(GM[0] + 6, 0, z);
      r.rotation.y = 0;
    });
    this.parked.visible = id !== 13;
    this.bleachers.visible = id !== 13;
    void G; void FO; void V3check;
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
    return focus;
  }
}
const V3check: V3 = [0, 0, 0];
