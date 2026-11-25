// "The Warship That Sank Before It Left the Harbour" world as one three.js scene, five sets far apart:
//   the harbour (origin: water, the quay with the crowd, the town behind it, the far shore; the warship, the raised wreck
//   with its pontoons), the bookcase room (BOOK), the inquiry room (INQ), the sea floor (FLOOR: the wreck in the mud) and
//   the museum hall (MUS: the ship standing on its cradle). update(id, f, camera) poses everything for one frame.
// The ship is our own cartoon two-decker (no copied plans): an elliptical hull, two rows of gunports with red lids and
// guns, a tall stern castle, three masts with billowing sails that unfurl on "the sails filled".
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, quad, house } from "./build";
import { ctex, cloudHD, rng, stoneHD, planksHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, SHIP, QZ, QY, DECK, BOOK, INQ, FLOOR, MUS, MUSHIP, V3, shipAt, tipAt, add } from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // all props are procedural; no GLB files

// ---------------- painted textures ----------------
const hullTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) {
    g.fillStyle = r() < 0.5 ? "rgba(255,220,170,0.08)" : "rgba(40,20,10,0.10)"; g.fillRect(0, y, 512, 32);
    g.fillStyle = "rgba(30,15,8,0.55)"; g.fillRect(0, y, 512, 3);
    for (let x = (y / 32) % 2 ? 0 : 128; x < 512; x += 256) g.fillRect(x, y, 3, 32);
  }
});
const seaTex = () => ctex("harbourSea", 1024, 1024, (g, r) => {
  g.fillStyle = "#3f86a8"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = r() < 0.55 ? "rgba(225,245,250,0.45)" : "rgba(20,60,90,0.25)"; g.lineWidth = 4 + r() * 4;
    const x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 30, y - 10, x + 70, y + 10, x + 110, y); g.stroke();
  }
});
const mudTex = () => ctex("seaMud", 512, 512, (g, r) => {
  g.fillStyle = "#6e6a4c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? "rgba(140,135,95,0.35)" : "rgba(50,52,36,0.3)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 6 + r() * 26, 4 + r() * 12, r() * 3, 0, 7); g.fill(); }
});
const flagTex = () => ctex("swedeFlag", 256, 160, (g) => {
  g.fillStyle = "#2f5fa8"; g.fillRect(0, 0, 256, 160);
  g.fillStyle = "#f2c230"; g.fillRect(80, 0, 30, 160); g.fillRect(0, 65, 256, 30);
});
const wallpaperTex = () => ctex("wallpaper", 512, 512, (g, r) => {
  g.fillStyle = "#e9d9b4"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "rgba(160,110,70,0.16)"; for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 18, 512);
  void r;
});
const tileTex = (key: string, base: string, line: string, n = 8) => ctex(key, 512, 512, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512); g.strokeStyle = line; g.lineWidth = 4;
  for (let i = 0; i <= n; i++) { const p = (i * 512) / n; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 512); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(512, p); g.stroke(); }
});

/** per-shot sun override, camera-relative degrees (lights.ts); interiors get a high sun so walls do not shade the floor */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 7: { az: 120, el: 62 }, 9: { az: 120, el: 62 }, 10: { az: 110, el: 70 }, 12: { az: 165, el: 42 } };
const SEA_SKY = ["#2f7c82", "#2b7279", "#256870", "#1f5d66", "#1a5059"];
const HALL_SKY = ["#2a2d3a", "#262a36", "#232633", "#20232f", "#1d202b"];

const flatQuad = (x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = 0) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
const shadowAll = (o: THREE.Object3D, cast = true) => o.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) { m.castShadow = cast; m.receiveShadow = true; } });
const wallZ = (x0: number, x1: number, z: number, h: number, u = 1, v = 1) => quad(V(x0, 0, z), V(x1, 0, z), V(x1, h, z), V(x0, h, z), u, v);
const wallX = (x: number, z0: number, z1: number, h: number, sx: number, u = 1, v = 1) =>
  sx > 0 ? quad(V(x, 0, z1), V(x, 0, z0), V(x, h, z0), V(x, h, z1), u, v) : quad(V(x, 0, z0), V(x, 0, z1), V(x, h, z1), V(x, h, z0), u, v);
/** a room open toward +z: floor, back wall, side walls (walls cast no shadow, so the sun lights the floor) */
const room = (R: THREE.Object3D, c: V3, w: number, z0: number, z1: number, h: number, floor: THREE.Material, back: THREE.Material, side: THREE.Material, fu = w / 2) => {
  const b = new Batch(), x0 = c[0] - w / 2, x1 = c[0] + w / 2;
  b.add(flatQuad(x0, x1, c[2] + z0, c[2] + z1, fu, (fu * (z1 - z0)) / w, 0.006), floor);
  b.add(wallZ(x0, x1, c[2] + z0, h), back);
  b.add(wallX(x0, c[2] + z0, c[2] + z1, h, 1), side);
  b.add(wallX(x1, c[2] + z0, c[2] + z1, h, -1), side);
  b.add(boxGeo(V(x0, 0, c[2] + z0), V(x1, 0.18, c[2] + z0 + 0.06)), lam("skirting", () => ({ color: "#5a3b2a" })));
  b.build(R, false);
};

// ---------------- the warship ----------------
/** half-width of the hull at x (ship-local), the ellipse of the waterline plan */
export const HL = 24, HB = 5.6;
const halfW = (x: number) => HB * Math.sqrt(Math.max(0, 1 - (x / HL) ** 2));
type ShipOpts = { sails: boolean; flags: boolean; wreck: boolean; key: string; short?: boolean };
type ShipRig = { grp: THREE.Group; sails: THREE.Object3D[] };
/** sail: a billowing sheet facing +x, hung from its top edge (origin at the yard), w across, h down */
const sailGeo = (w: number, h: number) => {
  const g = new THREE.PlaneGeometry(w, h, 10, 8); g.translate(0, -h / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = (p.getX(i) + w / 2) / w, v = -p.getY(i) / h;
    p.setZ(i, 0.16 * w * Math.sin(Math.PI * u) * Math.sin(Math.PI * (0.25 + 0.75 * v)));
  }
  g.computeVertexNormals();
  g.rotateY(Math.PI / 2); // face +x, bulge toward the bow
  return g;
};
const shipMesh = (o: ShipOpts): ShipRig => {
  const grp = new THREE.Group(), b = new Batch(), sails: THREE.Object3D[] = [];
  const k = o.key;
  const hull = lam(`hull${k}`, () => ({ map: hullTex(`hullTex${k}`, o.wreck ? "#4d3b2c" : "#6b4a2a") }));
  const deck = lam(`deck${k}`, () => ({ map: hullTex(`deckTex${k}`, o.wreck ? "#7a6448" : "#b98a55") }));
  const gold = lam(`gold${k}`, () => ({ color: o.wreck ? "#8a7448" : "#d9a441" }));
  const blue = lam(`stern${k}`, () => ({ color: o.wreck ? "#3d4a56" : "#3b5b9a" }));
  const red = lam(`lid${k}`, () => ({ color: o.wreck ? "#6b3a30" : "#b23a32" }));
  const dark = lam("portDark", () => ({ color: "#1d1a22" }));
  const gun = lam(`gun${k}`, () => ({ color: o.wreck ? "#4a4a3a" : "#8a6a3a" }));
  const spar = lam(`spar${k}`, () => ({ color: o.wreck ? "#3d3226" : "#7a5534" }));
  // lower hull (half ellipsoid) and topsides (elliptical wall up to the deck)
  b.add(new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(HL, 8, HB), hull);
  b.add(new THREE.CylinderGeometry(1, 1, DECK, 48, 1, true).scale(HL, 1, HB).translate(0, DECK / 2, 0), hull);
  b.add(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2).scale(HL, 1, HB).translate(0, DECK, 0), deck);
  for (const [y, h] of [[DECK - 0.35, 0.3], [2.7, 0.22]] as const) b.add(new THREE.CylinderGeometry(1.012, 1.012, h, 48, 1, true).scale(HL, 1, HB).translate(0, y, 0), gold);
  // stern castle, transom, forecastle
  b.add(boxGeo(V(-21.2, DECK, -3.4), V(-14, DECK + 4.6, 3.4)), hull);
  b.add(boxGeo(V(-21.3, DECK + 4.6, -3.5), V(-13.9, DECK + 4.85, 3.5)), gold);
  b.add(boxGeo(V(-22.2, 2.2, -2.9), V(-21.2, DECK + 6.2, 2.9)), blue);
  for (const y of [4.5, 8.5, 11.8]) b.add(boxGeo(V(-22.3, y, -3.0), V(-22.1, y + 0.3, 3.0)), gold);
  b.add(boxGeo(V(-22.4, DECK + 1.4, -1.0), V(-22.15, DECK + 3.4, 1.0)), gold); // the big carved panel
  b.add(boxGeo(V(13, DECK, -3.7), V(19, DECK + 2.0, 3.7)), hull);
  b.add(boxGeo(V(12.9, DECK + 2.0, -3.8), V(19.1, DECK + 2.2, 3.8)), gold);
  // bowsprit and the beakhead
  const bs = new THREE.CylinderGeometry(0.28, 0.4, 16, 10); bs.translate(0, 8, 0); bs.rotateZ(-1.12); bs.translate(21, DECK - 0.5, 0);
  b.add(bs, spar);
  b.add(boxGeo(V(22, 3.2, -0.5), V(27, 4.0, 0.5)), gold);
  // gunports: two rows on both sides, lids open (hinged up), a gun in each
  for (const y of [1.4, 3.8]) for (let x = -12; x <= 12.01; x += 2.4) for (const s of [1, -1]) {
    const z = s * (halfW(x) + 0.02);
    b.add(boxGeo(V(x - 0.4, y - 0.4, z - 0.06), V(x + 0.4, y + 0.4, z + 0.06)), dark);
    b.add(boxGeo(V(x - 0.45, y + 0.44, s > 0 ? z : z - 0.75), V(x + 0.45, y + 0.52, s > 0 ? z + 0.75 : z)), red);
    b.add(new THREE.CylinderGeometry(0.17, 0.22, 1.3, 10).rotateX(Math.PI / 2).translate(x, y, z + s * 0.35), gun);
  }
  // masts, tops, yards
  const masts: [number, number][] = o.wreck || o.short ? [[13, 14], [-1, 18], [-13, 11]] : [[13, 36], [-1, 44], [-13, 28]];
  for (const [x, h] of masts) {
    b.add(new THREE.CylinderGeometry(0.28, 0.5, h, 12).translate(x, DECK + h / 2, 0), spar);
    if (o.wreck || o.short) continue;
    b.add(new THREE.CylinderGeometry(1.5, 1.2, 0.5, 14).translate(x, DECK + h * 0.42, 0), spar); // the top
    for (const [fy, len] of [[0.36, h * 0.42], [0.74, h * 0.3]] as const)
      b.add(new THREE.CylinderGeometry(0.16, 0.16, len, 8).rotateX(Math.PI / 2).translate(x + 0.5, DECK + h * fy, 0), spar);
  }
  b.build(grp);
  // stays (thin black ropes) from mast tops to bow / stern
  if (!o.wreck && !o.short) {
    const rb = new Batch(), rope = lam("rope", () => ({ color: "#2a201a" }));
    const seg = (a: THREE.Vector3, c: THREE.Vector3) => { const d = c.clone().sub(a), L = d.length(); const g = new THREE.CylinderGeometry(0.05, 0.05, L, 5); const m = new THREE.Matrix4().compose(a.clone().addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()), V(1, 1, 1)); rb.add(g, rope, m); };
    seg(V(13, DECK + 36, 0), V(34, DECK + 7, 0)); seg(V(-1, DECK + 44, 0), V(13, DECK + 2, 0)); seg(V(-13, DECK + 28, 0), V(-1, DECK + 2, 0));
    for (const [x, h] of masts) for (const s of [1, -1]) seg(V(x, DECK + h * 0.42, 0), V(x - 1.5, DECK - 0.4, s * (halfW(x - 1.5) + 0.1)));
    rb.build(grp, false);
  }
  shadowAll(grp);
  // sails (own meshes: they unfurl) and flags
  if (o.sails) {
    const cloth = lam("sailCloth", () => ({ color: "#f1e6cc", side: THREE.DoubleSide }));
    for (const [x, h] of masts) for (const [fy, len, sh] of [[0.36, h * 0.42, h * 0.32], [0.74, h * 0.3, h * 0.24]] as const) {
      const piv = new THREE.Group(); piv.position.set(x + 0.6, DECK + h * fy, 0);
      const m = new THREE.Mesh(sailGeo(len * 0.92, sh), cloth); m.castShadow = true; m.receiveShadow = true;
      piv.add(m); grp.add(piv); sails.push(piv);
    }
  }
  if (o.flags) {
    const fm = lam("flagM", () => ({ map: flagTex(), side: THREE.DoubleSide }));
    for (const [x, h] of masts) {
      const g = new THREE.PlaneGeometry(4.2, 2.6, 8, 2); g.translate(-2.1, 0, 0);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.35 * Math.sin(p.getX(i) * 1.3));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, fm); m.position.set(x, DECK + h + 1.4, 0); m.castShadow = true; grp.add(m);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6), lam(`spar${k}`, () => ({ color: "#7a5534" }))); pole.position.set(x, DECK + h + 1.2, 0); grp.add(pole);
    }
  }
  return { grp, sails };
};

/** a cylinder between two points (unit cylinder along y, posed per frame) */
const segGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
const poseSeg = (m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, r: number) => {
  const d = b.clone().sub(a), L = d.length();
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.scale.set(r, L, r);
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
  private ship: ShipRig; private wreck: ShipRig;
  private lift = new THREE.Group(); private cables: THREE.Mesh[] = [];
  private bookcase = new THREE.Group();
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

    // ---- the harbour ----
    const hb = new Batch();
    hb.add(flatQuad(-700, 700, -700, 700, 700 / 12, 700 / 12, 0), lam("sea", () => ({ map: seaTex() })));
    const quayStone = lam("quayStone", () => ({ map: stoneHD("quayHD") }));
    hb.add(boxGeo(V(-160, -3, QZ), V(160, QY, 130), 4), quayStone);
    hb.add(boxGeo(V(-160, QY, QZ), V(160, QY + 0.25, QZ + 0.8), 2), lam("quayCope", () => ({ color: "#b7aa96" })));
    for (let x = -60; x <= 60; x += 9) hb.add(new THREE.CylinderGeometry(0.28, 0.34, 0.8, 12).translate(x + 4, QY + 0.4, QZ + 1.4), lam("bollard", () => ({ color: "#3d414c" })));
    // the far shore: land, small houses, green hills, trees
    hb.add(boxGeo(V(-700, -2, -700), V(700, 2.5, -170), 40), lam("farLand", () => ({ color: "#7aa356" })));
    const tr = rng(11);
    for (let i = 0; i < 26; i++) { const x = -330 + i * 26 + tr() * 8; house(hb, x, -182 - tr() * 10, 0, 8 + tr() * 4, 7, 7 + tr() * 5, i, 2.5); }
    for (let i = 0; i < 9; i++) hb.add(new THREE.SphereGeometry(1, 24, 12).scale(120 + tr() * 60, 40 + tr() * 30, 80).translate(-500 + i * 130, 2, -330 - tr() * 60), lam("hill" + (i % 2), () => ({ color: i % 2 ? "#5f9248" : "#6aa04f" })));
    for (let i = 0; i < 40; i++) hb.add(new THREE.SphereGeometry(4 + tr() * 3, 12, 8).translate(-400 + tr() * 800, 6, -200 - tr() * 40), lam("treeFar", () => ({ color: "#4a8a3e" })));
    // the town behind the quay, facing the water
    for (let i = 0; i < 16; i++) { const x = -150 + i * 19 + tr() * 3; house(hb, x, 82 + tr() * 4, Math.PI, 12 + tr() * 4, 9, 9 + tr() * 6, i + 3, QY); }
    hb.add(new THREE.CylinderGeometry(3.5, 4, 26, 16).translate(-40, QY + 13, 96), lam("churchTower", () => ({ color: "#d8c9a8" })));
    hb.add(new THREE.ConeGeometry(4.4, 18, 16).translate(-40, QY + 35, 96), lam("spire", () => ({ color: "#4f7f6a" })));
    hb.build(R);
    this.ship = shipMesh({ sails: true, flags: true, wreck: false, key: "A" }); R.add(this.ship.grp);
    this.wreck = shipMesh({ sails: false, flags: false, wreck: true, key: "W" }); R.add(this.wreck.grp);
    // the 1961 lift: two pontoons with cranes, cables down to the wreck
    const lb = new Batch(), pont = lam("pontoon", () => ({ color: "#5d6472" })), crane = lam("crane", () => ({ color: "#e0a23a" }));
    for (const s of [1, -1]) {
      lb.add(boxGeo(V(-20, -1, s > 0 ? 8.2 : -11.2), V(20, 1.4, s > 0 ? 11.2 : -8.2)), pont);
      for (const x of [-10, 10]) {
        const c = new THREE.CylinderGeometry(0.35, 0.45, 16, 10); c.translate(0, 8, 0); c.rotateX(-s * 0.32); c.translate(x, 1.4, s * 9.7);
        lb.add(c, crane);
      }
    }
    lb.build(this.lift);
    const cm = lam("cable", () => ({ color: "#2a2d33" }));
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(segGeo, cm); this.cables.push(m); this.lift.add(m); }
    R.add(this.lift);

    // ---- the bookcase room ----
    room(R, BOOK, 10, -1.2, 9, 5, lam("bookFloor", () => ({ map: planksHD() })), lam("bookWall", () => ({ map: wallpaperTex() })), lam("bookSide", () => ({ color: "#dcc79c" })), 3);
    const rb = new Batch();
    rb.add(new THREE.CircleGeometry(1.6, 40).rotateX(-Math.PI / 2).scale(1.4, 1, 1).translate(BOOK[0] - 0.4, 0.012, BOOK[2] + 1.2), lam("rug", () => ({ color: "#a3303a" })));
    rb.add(boxGeo(V(BOOK[0] - 3.4, 1.6, BOOK[2] - 1.19), V(BOOK[0] - 2.0, 3.2, BOOK[2] - 1.15)), lam("window", () => ({ color: "#9fd0ef" })));
    rb.add(boxGeo(V(BOOK[0] - 3.5, 1.5, BOOK[2] - 1.15), V(BOOK[0] - 1.9, 1.6, BOOK[2] - 1.0)), lam("sill", () => ({ color: "#f4f1ea" })));
    rb.add(new THREE.CylinderGeometry(0.22, 0.28, 0.5, 14).translate(BOOK[0] + 2.6, 0.25, BOOK[2] - 0.6), lam("pot", () => ({ color: "#c25a3a" })));
    rb.add(new THREE.SphereGeometry(0.5, 14, 10).translate(BOOK[0] + 2.6, 0.9, BOOK[2] - 0.6), lam("plant", () => ({ color: "#5d9a4a" })));
    rb.build(R);
    // the bookcase: pivot on its bottom right edge, so it tips to +x
    const bc = new Batch(), wood = lam("caseWood", () => ({ color: "#a8724a" })), back = lam("caseBack", () => ({ color: "#7a4f33" }));
    const W2 = 1.2, H2 = 2.1, D2 = 0.4, ox = -W2; // local: x from -1.2 (left) to 0 (pivot side)
    bc.add(boxGeo(V(ox, 0, -D2), V(ox + 0.06, H2, 0)), wood); bc.add(boxGeo(V(-0.06, 0, -D2), V(0, H2, 0)), wood);
    bc.add(boxGeo(V(ox, 0, -D2), V(0, H2, -D2 + 0.03)), back);
    for (const y of [0.05, 0.68, 1.3, 1.95]) bc.add(boxGeo(V(ox, y, -D2), V(0, y + 0.05, 0)), wood);
    bc.add(boxGeo(V(ox - 0.03, H2, -D2 - 0.02), V(0.03, H2 + 0.07, 0.03)), wood);
    const bcol = ["#b23a32", "#2f5fa8", "#3f8a5a", "#d9a441", "#6b3a7a", "#2a2d33", "#c25a3a"];
    let bx = ox + 0.08, bi = 0; const br = rng(4);
    while (bx < -0.12) { // the heavy books, packed on the top shelf
      const w = 0.12 + br() * 0.08, h = 0.36 + br() * 0.1;
      bc.add(boxGeo(V(bx, 2.0, -D2 + 0.04), V(bx + w, 2.0 + h, -0.03)), lam("book" + (bi % 7), () => ({ color: bcol[bi % 7] })));
      bx += w + 0.01; bi++;
    }
    bc.add(boxGeo(V(-0.5, 0.1, -D2 + 0.06), V(-0.42, 0.38, -0.06)), lam("book2", () => ({ color: bcol[2] }))); // one little book at the bottom
    bc.build(this.bookcase);
    shadowAll(this.bookcase);
    this.bookcase.position.set(BOOK[0] + 0.6, 0, BOOK[2] - 0.55); R.add(this.bookcase);

    // ---- the inquiry room ----
    room(R, INQ, 9, -1.6, 9, 5, lam("inqFloor", () => ({ map: planksHD() })), lam("inqWall", () => ({ color: "#8a6a4a" })), lam("inqSide", () => ({ color: "#7a5a3c" })), 3);
    const ib = new Batch(), cloth = lam("tableCloth", () => ({ color: "#2f6a43" }));
    ib.add(boxGeo(V(INQ[0] - 2.6, 0, INQ[2] - 0.55), V(INQ[0] + 2.6, 0.78, INQ[2] + 0.45)), cloth);
    ib.add(boxGeo(V(INQ[0] - 2.65, 0.78, INQ[2] - 0.6), V(INQ[0] + 2.65, 0.84, INQ[2] + 0.5)), lam("tableTop", () => ({ color: "#6b4a2a" })));
    for (const dx of [-1.6, -0.2, 1.1]) ib.add(boxGeo(V(INQ[0] + dx, 0.84, INQ[2] + 0.0), V(INQ[0] + dx + 0.42, 0.86, INQ[2] + 0.3)), lam("paper", () => ({ color: "#f4f1ea" })));
    ib.add(new THREE.CylinderGeometry(0.05, 0.08, 0.45, 10).translate(INQ[0] + 2.1, 1.06, INQ[2] + 0.1), lam("candle", () => ({ color: "#d9a441" })));
    ib.add(boxGeo(V(INQ[0] - 0.9, 2.2, INQ[2] - 1.59), V(INQ[0] + 0.9, 3.6, INQ[2] - 1.55)), lam("portraitFrame", () => ({ color: "#c9a45a" })));
    ib.add(boxGeo(V(INQ[0] - 0.75, 2.33, INQ[2] - 1.55), V(INQ[0] + 0.75, 3.47, INQ[2] - 1.53)), lam("portrait", () => ({ color: "#3b5b9a" }))); // a painted ship at sea, blue
    ib.build(R);

    // ---- the sea floor ----
    const fb = new Batch();
    fb.add(flatQuad(FLOOR[0] - 300, FLOOR[0] + 300, FLOOR[2] - 300, FLOOR[2] + 300, 40, 40, 0), lam("mud", () => ({ map: mudTex() })));
    const fr2 = rng(21);
    for (let i = 0; i < 30; i++) { const a = fr2() * 6.28, d = 14 + fr2() * 60; fb.add(new THREE.SphereGeometry(0.6 + fr2() * 1.6, 10, 8).scale(1, 0.6, 1).translate(FLOOR[0] + Math.cos(a) * d, 0.2, FLOOR[2] + Math.sin(a) * d), lam("rock", () => ({ color: "#5a5f58" }))); }
    for (let i = 0; i < 40; i++) { const a = fr2() * 6.28, d = 10 + fr2() * 50, h = 1 + fr2() * 2.5; fb.add(new THREE.ConeGeometry(0.15, h, 6).translate(FLOOR[0] + Math.cos(a) * d, h / 2, FLOOR[2] + Math.sin(a) * d), lam("weed", () => ({ color: "#4f8a4a" }))); }
    fb.build(R);
    const fw = shipMesh({ sails: false, flags: false, wreck: true, key: "W" }).grp;
    fw.position.set(FLOOR[0], -1.2, FLOOR[2]); fw.rotation.set(0.12, 0.35, 0.03); R.add(fw);

    // ---- the museum hall ----
    room(R, MUS, 92, -30, 62, 40, lam("musFloor", () => ({ map: tileTex("musFloorTex", "#4a4440", "rgba(20,18,16,0.4)", 4) })),
      lam("musBack", () => ({ color: "#3a3f55" })), lam("musSide", () => ({ color: "#434862" })), 23);
    const ms = shipMesh({ sails: false, flags: false, wreck: false, short: true, key: "M" }).grp;
    ms.position.set(...MUSHIP); R.add(ms);
    const mb = new Batch(), steel = lam("cradle", () => ({ color: "#8d949c" }));
    for (const x of [-16, -6, 4, 14]) { mb.add(boxGeo(V(MUS[0] + x - 0.6, 0, MUS[2] - 3.2), V(MUS[0] + x + 0.6, 2.2, MUS[2] + 3.2)), steel); }
    mb.add(boxGeo(V(MUS[0] - 30, 0, MUS[2] + 9), V(MUS[0] + 34, 1.0, MUS[2] + 9.2)), lam("railing", () => ({ color: "#c9a45a" })));
    for (const x of [-30, -14, 2, 18, 34]) mb.add(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8).translate(MUS[0] + x, 0.5, MUS[2] + 9.1), lam("railing", () => ({ color: "#c9a45a" })));
    mb.build(R);
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
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], harbour = s.set === "harbour";
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (harbour) Rr = Math.max(Rr, 60);
    if (s.set === "museum" || s.set === "floor") Rr = 70;
    this.sun.position.copy(focus).addScaledVector(sunDir, 260); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 560; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    const dim = s.set === "floor" ? [0.62, 0.86, 0.9] : s.set === "museum" ? [1.05, 1.0, 0.95] : [1, 1, 1];
    TONE.uLitCol.value.set(L.lit[0] * dim[0], L.lit[1] * dim[1], L.lit[2] * dim[2]); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => { untone(s.set === "floor" ? SEA_SKY[i] : s.set === "museum" ? HALL_SKY[i] : h, this.c1); su["c" + i].value.copy(this.c1); });
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    if (s.set === "floor") { untone("#2f7c82", this.fog.color); this.fog.near = 12; this.fog.far = 95; }
    else if (harbour) { untone(L.fog, this.fog.color); this.fog.near = L.fogNear * 3; this.fog.far = L.fogFar * 2.4; }
    else { this.fog.near = 5000; this.fog.far = 9000; }
    scene.fog = this.fog; scene.background = null;
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.visible = harbour;
      const a = (i / this.clouds.length) * Math.PI * 2 + 0.3 + t * 0.002, d = 620 + (i % 3) * 60;
      m.position.set(cam.position.x + Math.cos(a) * d, 120 + (i % 4) * 38, cam.position.z + Math.sin(a) * d);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      const w = 130 + (i % 4) * 30;
      m.scale.set(w, w / 2, 1);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- set pieces ----
    const st = shipAt(id, t);
    this.ship.grp.visible = harbour && !st.wreck;
    this.ship.grp.position.set(SHIP[0], SHIP[1] - st.sink, SHIP[2]);
    this.ship.grp.rotation.set(st.heel, 0, 0);
    const sl = id === 6 && t > 37.3 ? 0.15 + 0.85 * Math.min(1, (t - 37.3) / 0.8) : 0.12 + 0.88 * st.sails;
    for (const p of this.ship.sails) p.scale.set(1, sl, 1);
    this.wreck.grp.visible = harbour && st.wreck;
    this.lift.visible = harbour && st.wreck;
    if (st.wreck) {
      this.wreck.grp.position.set(SHIP[0], SHIP[1] - st.sink, SHIP[2]); this.wreck.grp.rotation.set(st.heel, 0, 0);
      const tips = [V(-10, 15.5, 4.6), V(10, 15.5, 4.6), V(-10, 15.5, -4.6), V(10, 15.5, -4.6)];
      this.cables.forEach((m, i) => poseSeg(m, tips[i], V(tips[i].x * 0.9, SHIP[1] - st.sink + 1, Math.sign(tips[i].z) * 4.5), 0.07));
    }
    this.bookcase.rotation.set(0, 0, -tipAt(t));
    void add; void MUS; void INQ;
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
