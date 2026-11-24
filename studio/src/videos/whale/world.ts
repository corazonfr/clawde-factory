// "The Town That Blew Up a Whale" world as one three.js scene: sky, an Oregon beach (sand, wet sand, a grey-green
// Pacific with foam lines, dunes with beach grass, a dark conifer coast and a headland), the sperm whale, the stack of
// dynamite cases, the gulls' post, the highway truck, parked 1970 cars, the crater and scattered blubber after the
// blast, the bulldozer and the sand mound; plus two far-away sets: a town park (x = PARK_X: the picnic and, at
// golden hour, the park with its sign) and a car dealership lot (x = LOT_X). update(id, f, camera) poses everything.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, Ray, prop, setSight, quad } from "./build";
import { rep, ctex, cloudHD, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { Pen } from "./toon";
import { dealBanner, parkSign } from "./props2d";
import {
  FPS, SHOTS, camAt, ShotDef, WHALE, WHALE_L, CRATES, POST, TRUCK, CAR, FAR_Z, PARK_X, LOT_X, PICNIC, SIGN, SHOWROOM,
  gloomAt, whaleWhole, casesAt, carCrushed, moundAt, blastAt, smooth, clamp01, V3, W,
} from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // all props are procedural; no GLB files

// ---------------- painted textures ----------------
const sandTex = (key: string, base: string, dots = 1400) => ctex(key, 1024, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < dots; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.07)" : "rgba(110,80,40,0.07)"; g.fillRect(r() * 1024, r() * 1024, 2 + r() * 3, 2 + r() * 3); }
  g.strokeStyle = "rgba(120,90,50,0.10)"; g.lineWidth = 4;
  for (let i = 0; i < 26; i++) { const y = r() * 1024; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + 10 * Math.sin(x * 0.02 + i)); g.stroke(); } // wind ripples
});
const seaTex = () => ctex("sea", 1024, 1024, (g, r) => {
  g.fillStyle = "#5d8794"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 60; i++) { g.strokeStyle = r() < 0.5 ? "rgba(230,245,245,0.45)" : "rgba(30,80,100,0.25)"; g.lineWidth = 4 + r() * 4; const x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 30, y - 10, x + 70, y + 10, x + 110, y); g.stroke(); }
});
const foamTex = () => ctex("foam", 1024, 128, (g, r) => {
  g.clearRect(0, 0, 1024, 128);
  g.fillStyle = "#f4f6f2";
  g.beginPath(); g.moveTo(0, 64);
  for (let x = 0; x <= 1024; x += 16) g.lineTo(x, 50 + 18 * Math.sin(x * 0.03) + 8 * r());
  for (let x = 1024; x >= 0; x -= 16) g.lineTo(x, 84 + 10 * Math.sin(x * 0.05 + 1) + 6 * r());
  g.closePath(); g.fill();
});
const grassTex = () => ctex("parkGrass", 512, 512, (g, r) => {
  g.fillStyle = "#6aab4f"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) { g.strokeStyle = r() < 0.5 ? "rgba(150,210,110,0.35)" : "rgba(40,100,40,0.3)"; g.lineWidth = 2; const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y - 8); g.stroke(); }
});
const asphaltTex = () => ctex("asphalt", 1024, 1024, (g, r) => {
  g.fillStyle = "#5b5d66"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)"; g.fillRect(r() * 1024, r() * 1024, 2 + r() * 4, 2 + r() * 4); }
});
const skinTex = () => ctex("whaleSkin", 512, 512, (g, r) => {
  g.fillStyle = "#6a7079"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(40,40,50,0.13)"; g.lineWidth = 3;
  for (let i = 0; i < 22; i++) { const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 20, y + 4, x + 40, y - 4, x + 70, y + 2); g.stroke(); } // short wrinkles
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(220,225,230,0.10)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 12, 2 + r() * 5, r() * 3, 0, 7); g.fill(); }
});
const craterTex = () => ctex("crater", 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512);
  const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  gr.addColorStop(0, "rgba(140,110,80,0.95)"); gr.addColorStop(0.55, "rgba(170,140,100,0.8)"); gr.addColorStop(0.8, "rgba(200,170,120,0.45)"); gr.addColorStop(1, "rgba(220,190,140,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
});
const checkTex = () => ctex("picnicCheck", 512, 512, (g) => {
  g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "rgba(212,48,44,0.85)"; for (let i = 0; i < 8; i += 2) { g.fillRect(i * 64, 0, 64, 512); g.fillRect(0, i * 64, 512, 64); }
});
const showroomTex = () => ctex("showroom", 1024, 512, (g) => {
  g.fillStyle = "#e9e2d2"; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "#7f9fc6"; g.fillRect(40, 140, 944, 360);
  g.fillStyle = "rgba(255,255,255,0.22)"; for (let i = 0; i < 5; i++) g.fillRect(70 + i * 190, 150, 50, 340);
  g.fillStyle = "#2f3646"; for (let i = 0; i <= 6; i++) g.fillRect(40 + i * 157, 140, 10, 360);
  g.fillStyle = "#e2453c"; g.fillRect(0, 100, 1024, 26);
});
/** a Pen drawing as a world texture */
const penTex = (key: string, w: number, h: number, draw: (p: Pen) => void) => ctex(key, w, h, (g) => draw(new Pen(g)));
const glowTex = () => ctex("spotGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.7)"); gr.addColorStop(0.7, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
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
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 17: { az: 145, el: 12 }, 7: { az: 120, el: 40 }, 9: { az: 120, el: 40 } };

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

// ---------------- the whale ----------------
/** a 14 m sperm whale lying on its side along x (head at +x, belly toward +z), origin on the sand under its middle */
const whaleMesh = () => {
  const grp = new THREE.Group();
  const skin = lam("whaleSkinM", () => ({ map: rep(skinTex(), 4, 2) }));
  // body: a lathe around x. Profile [x, r]: thin tail stock, swelling body, the big blunt box of a head
  const prof: [number, number][] = [[-7.0, 0.05], [-6.9, 0.32], [-6.0, 0.55], [-4.5, 0.95], [-2.5, 1.35], [-0.5, 1.6], [1.5, 1.72], [3.5, 1.8], [5.6, 1.82], [6.5, 1.7], [6.95, 1.35], [7.12, 0.8], [7.18, 0.0]];
  const pts = prof.map(([x, r]) => new THREE.Vector2(r, x));
  const lathe = new THREE.LatheGeometry(pts, 40);
  lathe.rotateZ(-Math.PI / 2); // lathe axis (y) -> x
  // squash: lying on its side it is taller than it is wide, and the head is boxier
  const p = lathe.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), head = clamp01((x - 2) / 4);
    const box = 1 + 0.16 * head * (Math.abs(y) / 1.8) ** 2;
    p.setXYZ(i, x, y * 1.0 * box, z * (0.86 - 0.05 * head));
  }
  lathe.computeVertexNormals();
  const body = new THREE.Mesh(lathe, skin);
  body.position.set(0, 1.45, 0);
  grp.add(body);
  // the narrow lower jaw, on the belly side (+z) under the front of the head
  const jaw = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 4.2, 6, 12).rotateZ(Math.PI / 2), lam("whaleJaw", () => ({ color: "#d9dadc" })));
  jaw.position.set(4.6, 0.75, 1.12); grp.add(jaw);
  // eye, flipper, flukes (standing upright: the whale lies on its side)
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10).scale(1, 0.75, 0.35), lam("whaleEyeW", () => ({ color: "#f4f1ea" })));
  white.position.set(4.9, 1.6, 1.5); grp.add(white);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), lam("whaleEye", () => ({ color: "#1d1a22" })));
  eye.position.set(4.93, 1.58, 1.58); grp.add(eye);
  const fin = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8).scale(0.8, 0.12, 0.38), skin);
  fin.position.set(3.0, 0.55, 1.35); fin.rotation.set(0.3, 0.4, -0.3); grp.add(fin);
  const fl = new THREE.Shape();
  fl.moveTo(0, 0); fl.bezierCurveTo(-0.6, 0.4, -1.4, 1.6, -2.0, 2.3); fl.lineTo(-1.6, 1.0); fl.lineTo(-1.8, 0); fl.lineTo(-1.6, -1.0); fl.lineTo(-2.0, -2.3); fl.bezierCurveTo(-1.4, -1.6, -0.6, -0.4, 0, 0);
  const fg = new THREE.ExtrudeGeometry(fl, { depth: 0.16, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
  fg.translate(0, 0, -0.08);
  const flukes = new THREE.Mesh(fg, skin);
  flukes.position.set(-6.9, 1.45, 0); grp.add(flukes);
  shadowAll(grp);
  return grp;
};

/** a blubber chunk mesh (grey skin cap on creamy-pink fat), about 1 m, origin at its base */
const chunkGeo = (seed: number) => {
  // indexed sphere + a smooth positional wobble (shared vertices move together: no torn facets)
  const g = new THREE.SphereGeometry(0.5, 14, 10), p = g.attributes.position as THREE.BufferAttribute;
  const a = 1 + (seed % 7), b = 2 + (seed % 5);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.18 * Math.sin(a * x * 4 + b * z * 3) * Math.cos(b * y * 4 + a);
    p.setXYZ(i, x * k * 1.3, Math.max(-0.12, y) * k * 0.75, z * k);
  }
  g.computeVertexNormals(); g.translate(0, 0.1, 0);
  return g;
};

// ---------------- vehicles ----------------
/** a 1970 saloon, nose to +x, origin on the ground at its centre */
const carMesh = (col: string, key: string) => {
  const grp = new THREE.Group(), b = new Batch();
  const paint = lam("carPaint" + key, () => ({ color: col })), glassM = lam("carGlass", () => ({ color: "#2a3340" }));
  const chrome = lam("carChrome", () => ({ color: "#c9ccd2" })), tyre = lam("carTyre", () => ({ color: "#26252b" }));
  b.add(boxGeo(V(-2.6, 0.32, -0.95), V(2.6, 0.86, 0.95)), paint);
  b.add(boxGeo(V(2.6, 0.36, -0.95), V(2.7, 0.5, 0.95)), chrome);
  b.add(boxGeo(V(-2.7, 0.36, -0.95), V(-2.6, 0.5, 0.95)), chrome);
  for (const [x, z] of [[1.6, 0.9], [1.6, -0.9], [-1.6, 0.9], [-1.6, -0.9]]) {
    const w = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 20); w.rotateX(Math.PI / 2); w.translate(x, 0.34, z); b.add(w, tyre);
    const hub = new THREE.CylinderGeometry(0.17, 0.17, 0.26, 14); hub.rotateX(Math.PI / 2); hub.translate(x, 0.34, z); b.add(hub, chrome);
  }
  for (const z of [-0.62, 0.62]) {
    b.add(boxGeo(V(2.6, 0.6, z - 0.16), V(2.66, 0.74, z + 0.16)), lam("headlamp", () => ({ color: "#fff6dc" })));
    b.add(boxGeo(V(-2.66, 0.62, z - 0.2), V(-2.6, 0.74, z + 0.2)), lam("taillamp", () => ({ color: "#c0353a" })));
  }
  b.build(grp);
  // cabin + roof as their own group so the roof can be crushed
  const cabin = new THREE.Group(), cb = new Batch();
  const cab = new THREE.BoxGeometry(2.4, 0.5, 1.66); cab.translate(-0.2, 0.25, 0);
  const cp = cab.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cp.count; i++) if (cp.getY(i) > 0.3) { cp.setX(i, cp.getX(i) * 0.82 - 0.1); cp.setZ(i, cp.getZ(i) * 0.88); }
  cab.computeVertexNormals();
  cb.add(cab, glassM);
  cb.add(boxGeo(V(-1.2, 0.48, -0.74), V(0.6, 0.55, 0.74)), paint);
  cb.build(cabin);
  cabin.position.y = 0.86;
  grp.add(cabin);
  shadowAll(grp);
  return { grp, cabin };
};

const truckMesh = () => {
  const grp = new THREE.Group(), b = new Batch();
  const orange = lam("truckOrange", () => ({ color: "#e8962f" })), dark = lam("truckDark", () => ({ color: "#2a2d33" }));
  const glassM = lam("carGlass", () => ({ color: "#2a3340" })), tyre = lam("carTyre", () => ({ color: "#26252b" }));
  b.add(boxGeo(V(-4.0, 0.7, -1.2), V(1.2, 1.0, 1.2)), dark);                // chassis
  b.add(boxGeo(V(1.2, 0.7, -1.15), V(3.6, 1.7, 1.15)), orange);              // hood
  b.add(boxGeo(V(-0.4, 0.7, -1.2), V(1.3, 3.0, 1.2)), orange);               // cab
  b.add(boxGeo(V(0.6, 2.0, -1.0), V(1.33, 2.8, 1.0)), glassM);               // windscreen
  b.add(boxGeo(V(-4.2, 1.0, -1.25), V(-0.6, 2.4, 1.25)), orange);            // dump bed
  b.add(boxGeo(V(3.6, 0.8, -1.2), V(3.75, 1.2, 1.2)), dark);                 // bumper
  for (const [x, z] of [[2.6, 1.15], [2.6, -1.15], [-2.6, 1.15], [-2.6, -1.15], [-3.6, 1.15], [-3.6, -1.15]]) {
    const w = new THREE.CylinderGeometry(0.5, 0.5, 0.36, 20); w.rotateX(Math.PI / 2); w.translate(x, 0.5, z); b.add(w, tyre);
  }
  b.add(boxGeo(V(-0.1, 3.0, -0.3), V(0.3, 3.2, 0.3)), lam("beacon", () => ({ color: "#f2cf4a" })));
  b.build(grp);
  shadowAll(grp);
  return grp;
};

const dozerMesh = () => {
  const grp = new THREE.Group(), b = new Batch();
  const yel = lam("dozerYellow", () => ({ color: "#f0b52c" })), dark = lam("truckDark", () => ({ color: "#2a2d33" }));
  for (const z of [-1.0, 1.0]) b.add(boxGeo(V(-1.8, 0, z - 0.4), V(1.8, 0.8, z + 0.4)), dark); // tracks
  b.add(boxGeo(V(-1.6, 0.8, -1.1), V(1.4, 1.8, 1.1)), yel);                  // body
  b.add(boxGeo(V(-1.5, 1.8, -0.8), V(-0.1, 3.0, 0.8)), yel);                 // cab
  b.add(boxGeo(V(-1.4, 2.2, -0.82), V(-0.2, 2.8, 0.82)), lam("carGlass", () => ({ color: "#2a3340" })));
  b.add(boxGeo(V(-1.6, 1.8, -0.1), V(-1.4, 2.6, 0.1)), dark);                // exhaust
  const blade = new THREE.BoxGeometry(0.25, 1.3, 3.2); blade.translate(-2.4, 0.7, 0); b.add(blade, yel);
  for (const z of [-0.9, 0.9]) b.add(boxGeo(V(-2.4, 0.6, z - 0.1), V(-1.4, 0.8, z + 0.1)), dark);
  b.build(grp);
  shadowAll(grp);
  return grp;
};

/** additive light material (HDR colour, no ink) */
const lightMat = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1, 1, 1), fog: false, side: THREE.DoubleSide });

/** the 20 cases: a pyramid stack next to the whale, filled in order */
const CASE_POS: V3[] = (() => {
  const out: V3[] = [];
  const rows = [[7, 0], [6, 1], [4, 2], [3, 3]]; // [count, layer]
  for (const [n, layer] of rows) for (let i = 0; i < n; i++) out.push([CRATES[0] - (n - 1) * 0.33 + i * 0.66, layer * 0.42, CRATES[2] + (layer % 2) * 0.05]);
  return out.slice(0, 20);
})();

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
  private whale: THREE.Group;
  private cases: THREE.Mesh[] = [];
  private crater: THREE.Mesh;
  private debris = new THREE.Group();
  private mound: THREE.Mesh;
  private dozer: THREE.Group;
  private car: { grp: THREE.Group; cabin: THREE.Group };
  private roofChunk: THREE.Mesh;
  private flashLight: THREE.Mesh;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private c1 = new THREE.Color(); private c2 = new THREE.Color();

  constructor(kit: Kit) {
    const R = this.root;
    // ---- sky + light (as in the bridge / Pisa / Walkie shorts) ----
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

    setSight(sightLines().filter((r) => r.core));
    // ---- the beach ----
    const b = new Batch();
    b.add(flatQuad(-500, 500, -12, 500, 1000 / 8, 512 / 8), lam("drySand", () => ({ map: sandTex("drySand", "#e0c896") })));
    b.add(flatQuad(-500, 500, -24, -12, 1000 / 8, 12 / 8, 0.005), lam("wetSand", () => ({ map: sandTex("wetSand", "#b9a07a", 600) })));
    b.add(flatQuad(-600, 600, -900, -24, 1200 / 30, 876 / 30, -0.02), lam("sea", () => ({ map: seaTex() })));
    for (const [z, k] of [[-25.5, 1.6], [-31, 1.2], [-40, 1.0], [-55, 0.8]] as const)
      b.add(flatQuad(-600, 600, z - k, z + k, 1200 / 40, 1, 0.0), lam("foam", () => ({ map: foamTex(), transparent: true, alphaTest: 0.4 })));
    b.build(R, false);
    // dunes: long low sand hills behind the beach, beach grass on top, dark conifers behind; a green headland north
    const db = new Batch(), dune = lam("duneSand", () => ({ color: "#d9c08c" })), r = rng(17);
    for (let i = 0; i < 26; i++) {
      const x = -320 + i * 26 + r() * 10, z = 110 + r() * 30, h = 5 + r() * 6, w = 22 + r() * 16;
      const g = new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(w, h, 14 + r() * 8); g.translate(x, -0.3, z);
      db.add(g, dune);
    }
    db.build(R);
    const vb = new Batch(), gr = rng(23);
    for (let i = 0; i < 90; i++) { const x = -300 + gr() * 600, z = 104 + gr() * 34; prop(vb, kit, "plant_bush", x, 0, z, 1.0 + gr() * 0.8, i); }
    for (let i = 0; i < 160; i++) { const x = -360 + gr() * 720, z = 140 + gr() * 120; prop(vb, kit, "tree_cone", x, 0, z, 14 + gr() * 12, i); }
    vb.build(R);
    const hb = new Batch(), hill = lam("headland", () => ({ color: "#4f7a45" })), rock = lam("rock", () => ({ color: "#6d6a70" }));
    for (const [x, z, s, h] of [[-330, -40, 90, 70], [-420, -10, 110, 90], [380, 40, 120, 60]] as const) {
      const g = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(s, h, s * 0.8); g.translate(x, -2, z); hb.add(g, hill);
    }
    for (const [x, z, s] of [[-250, -70, 14], [-262, -58, 9], [-235, -88, 7]] as const) hb.add(new THREE.DodecahedronGeometry(s, 0).translate(x, s * 0.4, z), rock);
    hb.build(R);
    // the gulls' post, driftwood logs
    const pb = new Batch(), wood = lam("driftwood", () => ({ color: "#a89272" }));
    pb.add(new THREE.CylinderGeometry(0.12, 0.15, 1.7, 10).translate(POST[0], 0.85, POST[2]), wood);
    for (const [x, z, l, a] of [[-14, 18, 6, 0.4], [12, 22, 5, -0.3], [-22, 40, 7, 0.1], [26, 50, 6, 0.6], [-6, 58, 5, -0.5]] as const)
      pb.add(new THREE.CylinderGeometry(0.28, 0.32, l, 10).rotateZ(Math.PI / 2).rotateY(a).translate(x, 0.28, z), wood);
    pb.build(R);
    setSight([]);

    // ---- whale, cases, crater, debris, mound ----
    this.whale = whaleMesh(); this.whale.position.set(...WHALE); R.add(this.whale);
    const caseM = lam("caseWood", () => ({ map: ctex("caseTex", 256, 128, (g) => {
      g.fillStyle = "#b98a55"; g.fillRect(0, 0, 256, 128); g.fillStyle = "rgba(80,50,30,0.5)"; for (const y of [30, 64, 98]) g.fillRect(0, y, 256, 4);
      g.fillStyle = "#c0353a"; g.fillRect(0, 50, 256, 26); }) }));
    for (const [x, y, z] of CASE_POS) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.42).translate(0, 0.2, 0), caseM); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; this.cases.push(m); R.add(m); }
    this.crater = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: craterTex(), transparent: true, depthWrite: false }));
    this.crater.position.set(WHALE[0], 0.03, WHALE[2]); this.crater.scale.set(22, 1, 12); this.crater.layers.set(NOINK); this.crater.receiveShadow = true;
    R.add(this.crater);
    const fat = lam("blubberFat", () => ({ color: "#efc2b2" })), dr = rng(41);
    for (let i = 0; i < 70; i++) {
      const a = dr() * Math.PI * 2, d = 3 + dr() ** 0.7 * 60, x = Math.cos(a) * d * 1.2, z = Math.abs(Math.sin(a)) * d * (dr() < 0.5 ? 1.3 : -0.25);
      const m = new THREE.Mesh(chunkGeo(i + 3), fat); const s = 0.4 + dr() * (d < 12 ? 1.6 : 0.8);
      m.position.set(x, 0, z); m.scale.setScalar(s); m.rotation.y = dr() * 6; m.castShadow = m.receiveShadow = true; this.debris.add(m);
    }
    // a big leftover hunk of whale where it lay
    const hunk = new THREE.Mesh(chunkGeo(99), lam("whaleSkinM", () => ({ map: rep(skinTex(), 4, 2) })));
    hunk.scale.set(4.5, 2.2, 2.8); hunk.position.set(-2, 0, 0); hunk.castShadow = hunk.receiveShadow = true; this.debris.add(hunk);
    R.add(this.debris);
    this.mound = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), lam("moundSand", () => ({ map: sandTex("moundSand", "#d6bc88", 900) })));
    this.mound.scale.set(9, 2.4, 4.2); this.mound.position.set(-0.5, -0.1, 0); this.mound.castShadow = this.mound.receiveShadow = true;
    R.add(this.mound);
    this.dozer = dozerMesh(); R.add(this.dozer);
    // the blast glow (HDR, blooms)
    this.flashLight = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), lightMat(glowTex()));
    this.flashLight.layers.set(NOINK); this.flashLight.renderOrder = 4; R.add(this.flashLight);

    // ---- truck and cars ----
    const truck = truckMesh(); truck.position.set(...TRUCK); truck.rotation.y = Math.PI; R.add(truck);
    this.car = carMesh("#6fc0c4", "new"); this.car.grp.position.set(...CAR); R.add(this.car.grp);
    this.roofChunk = new THREE.Mesh(chunkGeo(7), fat); this.roofChunk.scale.set(1.4, 1.2, 1.2); this.roofChunk.castShadow = true; R.add(this.roofChunk);
    for (const [x, z, c, k, yaw] of [[24, FAR_Z + 4, "#c25a3a", "rust", 0.1], [31, FAR_Z + 3.2, "#e8c45a", "mustard", -0.05], [9.5, FAR_Z + 5.5, "#5d7a3a", "olive", 0.15], [-8, FAR_Z + 4.5, "#3b5b9a", "navy", -0.1]] as const) {
      const c2 = carMesh(c, k); c2.grp.position.set(x, 0, z); c2.grp.rotation.y = yaw; R.add(c2.grp);
    }

    // ---- the town park (picnic + the park sign at golden hour) ----
    const pk = new Batch();
    pk.add(flatQuad(PARK_X - 400, PARK_X + 400, -400, 400, 160, 160), lam("parkGrass", () => ({ map: grassTex() })));
    pk.add(flatQuad(PICNIC[0] - 1.2, PICNIC[0] + 1.2, PICNIC[2] - 1.0, PICNIC[2] + 1.0, 2, 2, 0.015), lam("picnic", () => ({ map: checkTex() })));
    pk.add(flatQuad(PARK_X - 400, PARK_X + 400, SIGN[2] + 3, SIGN[2] + 6, 800 / 3, 1, 0.012), lam("gravel", () => ({ color: "#d9c9a0" })));
    const post = lam("signPost", () => ({ color: "#6a4630" }));
    for (const dx of [-1.25, 1.25]) pk.add(boxGeo(V(SIGN[0] + dx - 0.09, 0, SIGN[2] - 0.09), V(SIGN[0] + dx + 0.09, 3.1, SIGN[2] + 0.09)), post);
    pk.add(boxGeo(V(SIGN[0] - 1.45, 1.2, SIGN[2] - 0.08), V(SIGN[0] + 1.45, 3.4, SIGN[2] + 0.06)), post);
    pk.add(quad(V(SIGN[0] - 1.4, 1.25, SIGN[2] + 0.07), V(SIGN[0] + 1.4, 1.25, SIGN[2] + 0.07), V(SIGN[0] + 1.4, 3.35, SIGN[2] + 0.07), V(SIGN[0] - 1.4, 3.35, SIGN[2] + 0.07)),
      lam("parkSignFace", () => ({ map: penTex("parkSignTex", 700, 520, parkSign) })));
    for (const [x, z] of [[SIGN[0] - 7, SIGN[2] + 2], [SIGN[0] + 6, SIGN[2] + 2.5]]) { // benches
      pk.add(boxGeo(V(x - 1, 0.42, z - 0.25), V(x + 1, 0.5, z + 0.25)), post);
      pk.add(boxGeo(V(x - 1, 0.5, z - 0.3), V(x + 1, 0.95, z - 0.22)), post);
      for (const dx of [-0.85, 0.85]) pk.add(boxGeo(V(x + dx - 0.05, 0, z - 0.2), V(x + dx + 0.05, 0.42, z + 0.2)), lam("benchIron", () => ({ color: "#2a2d33" })));
    }
    pk.add(new THREE.CylinderGeometry(0.25, 0.22, 0.4, 16).translate(PICNIC[0] + 0.85, 0.2, PICNIC[2] - 0.6), lam("basket", () => ({ color: "#c79a5a" })));
    pk.build(R);
    setSight(sightLines().filter((r2) => r2.core));
    const ptb = new Batch(), pr = rng(21);
    for (let i = 0; i < 70; i++) { const a = pr() * Math.PI * 2, d = 12 + pr() * 70; prop(ptb, kit, ["tree_oak", "tree_cone", "tree_fat"][i % 3], PARK_X + Math.cos(a) * d, 0, Math.sin(a) * d - 8, 7 + pr() * 6, i); }
    for (let i = 0; i < 10; i++) prop(ptb, kit, "hedge", SIGN[0] - 16 + i * 3.4, 0, SIGN[2] - 3, 1.1, i);
    ptb.build(R);
    setSight([]);

    // ---- the dealership lot ----
    const lb = new Batch();
    lb.add(flatQuad(LOT_X - 300, LOT_X + 300, -300, 300, 120, 120), lam("asphalt", () => ({ map: asphaltTex() })));
    lb.add(boxGeo(V(SHOWROOM[0] - 14, 0, SHOWROOM[2] - 10), V(SHOWROOM[0] + 14, 6, SHOWROOM[2])), lam("showroomSide", () => ({ color: "#e9e2d2" })));
    lb.add(quad(V(SHOWROOM[0] - 14, 0, SHOWROOM[2] + 0.02), V(SHOWROOM[0] + 14, 0, SHOWROOM[2] + 0.02), V(SHOWROOM[0] + 14, 6, SHOWROOM[2] + 0.02), V(SHOWROOM[0] - 14, 6, SHOWROOM[2] + 0.02)),
      lam("showroomFront", () => ({ map: showroomTex() })));
    lb.add(boxGeo(V(SHOWROOM[0] - 6.2, 6, SHOWROOM[2] - 0.4), V(SHOWROOM[0] + 6.2, 10.3, SHOWROOM[2] - 0.1)), lam("bannerBack", () => ({ color: "#f2cf4a" })));
    lb.add(quad(V(SHOWROOM[0] - 6, 6.1, SHOWROOM[2]), V(SHOWROOM[0] + 6, 6.1, SHOWROOM[2]), V(SHOWROOM[0] + 6, 10.1, SHOWROOM[2]), V(SHOWROOM[0] - 6, 10.1, SHOWROOM[2])),
      lam("dealBannerFace", () => ({ map: penTex("dealBannerTex", 900, 300, dealBanner) })));
    for (const x of [-12, 12]) lb.add(new THREE.CylinderGeometry(0.1, 0.1, 7, 8).translate(SHOWROOM[0] + x, 3.5, SHOWROOM[2] + 9), lam("flagPole", () => ({ color: "#c9ccd2" })));
    lb.build(R);
    for (const [x, z, c, k, yaw] of [[-7, -4, "#e2453c", "red", 0.4], [-3.6, -5, "#f4f1ea", "white", 0.3], [5, -4.6, "#3f9fd5", "blue", -0.4], [8.6, -3.6, "#6fc0c4", "new", -0.5], [10, 4, "#e8c45a", "mustard", -1.2]] as const) {
      const c2 = carMesh(c, k); c2.grp.position.set(LOT_X + x, 0, z); c2.grp.rotation.y = yaw; R.add(c2.grp);
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
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const gloom = gloomAt(id, t);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden" || dist > 40) Rr = Math.max(Rr, 70);
    this.sun.position.copy(focus).addScaledVector(sunDir, 260); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 560; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    const lerp3 = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k) as [number, number, number];
    TONE.uLitCol.value.set(...lerp3(L.lit, [0.86, 0.88, 0.94], gloom)); TONE.uShadeCol.value.set(...lerp3(L.shade, [0.6, 0.62, 0.7], gloom)); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...LOOK[s.light].bounce); TONE.uSat.value = LOOK[s.light].sat * (1 - 0.25 * gloom);
    CHAR.uCharTint.value.set(...lerp3(L.charTint, [0.8, 0.82, 0.88], gloom)); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad * (1 - gloom);
    CHAR.uBodyGrad.value = L.bodyGrad * (1 - gloom); CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => { untone(h, this.c1); untone(["#c9ced4", "#b9bfc7", "#a6adb7", "#9aa1ac", "#8d95a1"][i], this.c2); su["c" + i].value.copy(this.c1.lerp(this.c2, gloom)); });
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.color.lerp(untone("#bfc4ca", this.c2), gloom);
    this.fog.near = s.set === "beach" ? 70 : L.fogNear; this.fog.far = s.set === "beach" ? 620 : L.fogFar * 1.6;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      const a = (i / this.clouds.length) * Math.PI * 2 + 0.3 + t * 0.002, d = 620 + (i % 3) * 60;
      const lift = 120 + (i % 4) * 38 + gloom * 120;
      m.position.set(cam.position.x + Math.cos(a) * d, lift, cam.position.z + Math.sin(a) * d);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      const w = (130 + (i % 4) * 30) * (1 + 1.6 * gloom);
      m.scale.set(w, w / 2, 1);
      mat.map = this.cloudMaps[s.light][i % 4];
      mat.color.setRGB(1.1 - 0.45 * gloom, 1.1 - 0.42 * gloom, 1.1 - 0.36 * gloom);
    }
    // ---- set pieces ----
    const whole = whaleWhole(id, t), b = blastAt(t), mound = moundAt(id, t);
    this.whale.visible = whole;
    this.cases.forEach((m, i) => { m.visible = whole && i < casesAt(id, t); });
    const after = !whole && id <= 15;
    this.crater.visible = after && id < 15;
    this.debris.visible = after && id < 14;
    this.debris.children.forEach((m, i) => { m.visible = id !== 7 || (m as THREE.Mesh).position.length() < 8 + 70 * b * (0.4 + 0.6 * ((i * 37) % 10) / 10); });
    this.mound.visible = mound > 0;
    this.mound.scale.set(7 * (0.3 + 0.7 * mound), 1.8 * mound, 3.4 * (0.5 + 0.5 * mound));
    this.dozer.visible = id === 14;
    if (id === 14) { const u = smooth((t - 53.4) / 2.4); this.dozer.position.set(9 - 5.5 * u, 0, 1.5); this.dozer.rotation.y = 0; }
    const crushed = carCrushed(id, t);
    this.car.cabin.scale.y = crushed ? 0.45 : 1;
    this.roofChunk.visible = crushed || (id === 10 && t > W.crushed - 0.4);
    if (this.roofChunk.visible) {
      const fall = id === 10 ? 1 - smooth((t - (W.crushed - 0.4)) / 0.36) : 0;
      this.roofChunk.position.set(CAR[0] - 0.3, 1.1 + (crushed ? 0 : 0.45) + 9 * fall * fall, CAR[2]);
    }
    // the blast glow: a hot flash over the whale for the first ~0.6 s
    const fl = id === 7 && t > 30.2 ? Math.max(0, 1 - (t - 30.25) / 0.6) : 0;
    this.flashLight.visible = fl > 0;
    if (fl > 0) {
      this.flashLight.position.set(WHALE[0], 6, WHALE[2] + 2); this.flashLight.quaternion.copy(cam.quaternion);
      this.flashLight.scale.setScalar(60 * (0.6 + 0.4 * fl));
      (this.flashLight.material as THREE.MeshBasicMaterial).color.setRGB(3.5 * fl, 2.6 * fl, 1.4 * fl);
    }
    void FAR_Z; void WHALE_L; void PICNIC; void clamp01;
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const stg = stage(id, t, { pos: cam.position, right, sun: sunDir }, gloom);
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
