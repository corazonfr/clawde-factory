// "The Space Telescope That Needed Glasses" world as one three.js scene, six sets far apart:
//   space (x 0 / y 3000: the telescope, the Earth below, stars; the orbiter at SHU with its arm), the launch pad
//   (origin: the stack, the platform and the tower), the control room (CTRL), the mirror lab (LAB), the eye-test room
//   (EYE) and the museum hall (MUS). update(id, f, camera) poses everything for one frame.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, quad } from "./build";
import { ctex, cloudHD, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, ShotDef, SP, EARTH, EARTH_R, SHU, PAD, CTRL, LAB, MIR, TOOL, EYE, MUS, MUSM, V3, W,
  liftAt, sharpScreen, lensOff, hubbleAt, smooth, add,
} from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // all props are procedural; no GLB files

// ---------------- painted textures ----------------
const foilTex = () => ctex("foil", 512, 512, (g, r) => {
  g.fillStyle = "#d6dae0"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.18)" : "rgba(90,100,120,0.10)"; g.fillRect(r() * 512, r() * 512, 30 + r() * 90, 8 + r() * 30); }
  g.strokeStyle = "rgba(70,75,90,0.35)"; g.lineWidth = 4;
  for (let x = 0; x <= 512; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  for (let y = 0; y <= 512; y += 170) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
});
const panelTex = () => ctex("solarPanel", 256, 1024, (g) => {
  g.fillStyle = "#2c4a96"; g.fillRect(0, 0, 256, 1024);
  g.strokeStyle = "#c9a45a"; g.lineWidth = 5;
  for (let x = 0; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); }
  for (let y = 0; y <= 1024; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  g.fillStyle = "rgba(255,255,255,0.12)"; for (let i = 0; i < 8; i++) g.fillRect(10 + i * 30, 0, 8, 1024);
});
const earthTex = () => ctex("earth", 2048, 1024, (g, r) => {
  g.fillStyle = "#2f6fb8"; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 30; i++) { // land
    const x = r() * 2048, y = 200 + r() * 620, rx = 60 + r() * 220, ry = 40 + r() * 140;
    g.fillStyle = r() < 0.6 ? "#5f9a4a" : "#c9a86a"; g.beginPath(); g.ellipse(x, y, rx, ry, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 90; i++) { // cloud swirls
    const x = r() * 2048, y = r() * 1024, w = 40 + r() * 200;
    g.strokeStyle = `rgba(255,255,255,${0.55 + r() * 0.35})`; g.lineWidth = 10 + r() * 26; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + w * 0.3, y - 30 * r(), x + w * 0.7, y + 30 * r(), x + w, y + (r() - 0.5) * 40); g.stroke();
  }
});
const tileTex = (key: string, base: string, line: string, n = 8) => ctex(key, 512, 512, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512); g.strokeStyle = line; g.lineWidth = 4;
  for (let i = 0; i <= n; i++) { const p = (i * 512) / n; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 512); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(512, p); g.stroke(); }
});
const woodTex = () => ctex("museumWood", 512, 512, (g, r) => {
  g.fillStyle = "#b98a55"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) { g.fillStyle = r() < 0.5 ? "rgba(255,230,190,0.10)" : "rgba(90,50,20,0.10)"; g.fillRect(0, y, 512, 64); g.fillStyle = "rgba(70,40,20,0.5)"; g.fillRect(0, y, 512, 3); }
});
/** the control-room screen: a fuzzy smudge of a star field, or a crisp spiral galaxy */
const screenTex = (sharp: boolean) => ctex(sharp ? "screenSharp" : "screenBlur", 1024, 600, (g, r) => {
  g.fillStyle = "#0b1230"; g.fillRect(0, 0, 1024, 600);
  if (!sharp) {
    for (let i = 0; i < 9; i++) {
      const x = 150 + r() * 720, y = 100 + r() * 400, rad = 40 + r() * 70, gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(220,225,255,0.55)"); gr.addColorStop(0.5, "rgba(170,180,240,0.22)"); gr.addColorStop(1, "rgba(120,130,220,0)");
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
    }
    const gr = g.createRadialGradient(512, 300, 0, 512, 300, 230); gr.addColorStop(0, "rgba(255,240,210,0.7)"); gr.addColorStop(1, "rgba(255,200,160,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 600);
  } else {
    for (let i = 0; i < 140; i++) { g.fillStyle = "#ffffff"; g.fillRect(r() * 1024, r() * 600, 3, 3); }
    g.save(); g.translate(512, 300); g.rotate(-0.4); g.scale(1, 0.62);
    for (let arm = 0; arm < 2; arm++) {
      g.strokeStyle = arm ? "#b9c8ff" : "#ffe2b0"; g.lineWidth = 14; g.lineCap = "round"; g.beginPath();
      for (let k = 0; k <= 80; k++) { const a = arm * Math.PI + k * 0.09, rr = 18 + k * 3.0; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
    }
    g.fillStyle = "#fff6dc"; g.beginPath(); g.arc(0, 0, 34, 0, 7); g.fill();
    g.restore();
  }
  g.strokeStyle = "#1d2440"; g.lineWidth = 20; g.strokeRect(0, 0, 1024, 600);
});
const chartScreenTex = () => ctex("sideScreen", 512, 384, (g, r) => {
  g.fillStyle = "#12301f"; g.fillRect(0, 0, 512, 384);
  g.strokeStyle = "#5fe08a"; g.lineWidth = 6; g.beginPath();
  for (let x = 0; x <= 512; x += 16) g.lineTo(x, 200 + 80 * Math.sin(x * 0.03) + 30 * r());
  g.stroke();
});
/** the eye chart: rows of E shapes, smaller each row (no readable text) */
const eyeChartTex = () => ctex("eyeChart", 512, 768, (g) => {
  g.fillStyle = "#f7f4ec"; g.fillRect(0, 0, 512, 768);
  g.fillStyle = "#1d1a22";
  const rows = [[1, 150], [2, 95], [3, 66], [4, 48], [5, 36], [6, 26]];
  let y = 50;
  for (const [n, s] of rows) {
    const gap = s * 0.6, w = n * s + (n - 1) * gap; let x = 256 - w / 2;
    for (let i = 0; i < n; i++) {
      const rot = (i + n) % 4; g.save(); g.translate(x + s / 2, y + s / 2); g.rotate((rot * Math.PI) / 2);
      const u = s / 5; g.fillRect(-s / 2, -s / 2, u, s); for (const k of [0, 2, 4]) g.fillRect(-s / 2, -s / 2 + k * u, s, u);
      g.restore(); x += s + gap;
    }
    y += s + 38;
  }
  g.fillStyle = "#e2453c"; g.fillRect(40, y - 18, 432, 6);
});
const mirrorTex = () => ctex("mirrorFace", 1024, 1024, (g) => {
  const gr = g.createRadialGradient(512, 512, 0, 512, 512, 512);
  gr.addColorStop(0, "#9fb8d6"); gr.addColorStop(0.35, "#dbe7f3"); gr.addColorStop(0.7, "#b4c6dc"); gr.addColorStop(1, "#eef4fa");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  g.fillStyle = "rgba(255,255,255,0.45)"; g.save(); g.translate(512, 512); g.rotate(-0.7); g.fillRect(-500, -150, 1000, 70); g.fillRect(-500, -30, 1000, 26); g.restore();
  g.fillStyle = "#2a2d33"; g.beginPath(); g.arc(512, 512, 120, 0, 7); g.fill(); // the central hole
});
const glowTex = () => ctex("spotGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.7)"); gr.addColorStop(0.7, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

/** per-shot sun override, camera-relative degrees (lights.ts); interiors get a high sun so walls do not shade the floor */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 4: { az: 120, el: 62 }, 5: { az: 110, el: 60 }, 6: { az: 110, el: 60 }, 7: { az: 125, el: 60 },
  9: { az: 120, el: 62 }, 10: { az: 135, el: 52 }, 1: { az: 100, el: 30 }, 8: { az: 100, el: 35 }, 3: { az: 100, el: 35 } };
const SPACE_SKY = ["#070a16", "#060914", "#050812", "#04060f", "#03050c"];

const flatQuad = (x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = 0) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
const shadowAll = (o: THREE.Object3D, cast = true) => o.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) { m.castShadow = cast; m.receiveShadow = true; } });
/** a wall quad facing +z (front) between x0..x1 at depth z */
const wallZ = (x0: number, x1: number, z: number, h: number, u = 1, v = 1) => quad(V(x0, 0, z), V(x1, 0, z), V(x1, h, z), V(x0, h, z), u, v);
/** a wall quad facing +x (sx = 1) or -x (sx = -1) between z0..z1 at x */
const wallX = (x: number, z0: number, z1: number, h: number, sx: number, u = 1, v = 1) =>
  sx > 0 ? quad(V(x, 0, z1), V(x, 0, z0), V(x, h, z0), V(x, h, z1), u, v) : quad(V(x, 0, z0), V(x, 0, z1), V(x, h, z1), V(x, h, z0), u, v);
/** a room open toward +z: floor, back wall, side walls (walls cast no shadow, so the sun lights the floor) */
const room = (R: THREE.Object3D, c: V3, w: number, z0: number, z1: number, h: number, floor: THREE.Material, back: THREE.Material, side: THREE.Material) => {
  const b = new Batch(), x0 = c[0] - w / 2, x1 = c[0] + w / 2;
  b.add(flatQuad(x0, x1, c[2] + z0, c[2] + z1, w / 2, (z1 - z0) / 2, 0.006), floor);
  b.add(wallZ(x0, x1, c[2] + z0, h), back);
  b.add(wallX(x0, c[2] + z0, c[2] + z1, h, 1), side);
  b.add(wallX(x1, c[2] + z0, c[2] + z1, h, -1), side);
  b.add(boxGeo(V(x0, 0, c[2] + z0), V(x1, 0.18, c[2] + z0 + 0.06)), lam("skirting", () => ({ color: "#3d414c" })));
  b.build(R, false);
};

// ---------------- the telescope ----------------
/** Hubble, tube along x (open end at +x), solar wings up and down, origin at the middle of the tube */
const hubbleMesh = () => {
  const grp = new THREE.Group(), b = new Batch();
  const foil = lam("foilM", () => ({ map: foilTex() })), grey = lam("hubGrey", () => ({ color: "#b9bfc8" })), dark = lam("hubDark", () => ({ color: "#1d1a22" }));
  b.add(new THREE.CylinderGeometry(2.1, 2.1, 13, 40, 1, true).rotateZ(Math.PI / 2), foil);
  b.add(new THREE.CylinderGeometry(2.25, 2.25, 3.2, 40).rotateZ(Math.PI / 2).translate(-8.1, 0, 0), grey);
  b.add(new THREE.CylinderGeometry(2.0, 2.0, 0.05, 40).rotateZ(Math.PI / 2).translate(6.2, 0, 0), dark); // the dark inside
  b.add(new THREE.TorusGeometry(2.1, 0.12, 8, 40).rotateY(Math.PI / 2).translate(6.5, 0, 0), grey);
  // the open aperture door, hinged at the top
  const door = new THREE.CylinderGeometry(2.1, 2.1, 0.12, 40); door.translate(0, 0, -2.1); door.rotateX(0); door.rotateZ(0.2);
  const dm = new THREE.Matrix4().makeTranslation(6.5, 2.1, 0).multiply(new THREE.Matrix4().makeRotationZ(-0.35)).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0));
  const dg = new THREE.CylinderGeometry(2.1, 2.1, 0.12, 40).translate(0, 0, 0).rotateZ(0); dg.translate(2.1, 0, 0);
  b.add(dg, foil, dm); void door;
  // solar wings (up / down) on short masts
  const panel = lam("panelM", () => ({ map: panelTex() }));
  for (const s of [1, -1]) {
    b.add(new THREE.CylinderGeometry(0.09, 0.09, 1.2, 8).translate(-4.5, s * 2.6, 0), grey);
    b.add(boxGeo(V(-5.7, s > 0 ? 3.2 : -15.2, -0.05), V(-3.3, s > 0 ? 15.2 : -3.2, 0.05)), panel);
  }
  // high-gain antennas
  for (const s of [1, -1]) {
    b.add(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6).rotateX(Math.PI / 2).translate(-1, 0, s * 3.1), grey);
    b.add(new THREE.SphereGeometry(0.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6).rotateX(s * Math.PI / 2).translate(-1, 0, s * 4.2), lam("dish", () => ({ color: "#f4f1ea" })));
  }
  b.build(grp);
  shadowAll(grp);
  return grp;
};

// ---------------- the orbiter ----------------
/** the space shuttle orbiter, nose +x, payload bay up (+y), origin at the middle of the fuselage */
const orbiterMesh = (bayOpen: boolean) => {
  const grp = new THREE.Group(), b = new Batch();
  const white = lam("orbWhite", () => ({ color: "#f4f1ea" })), black = lam("orbBlack", () => ({ color: "#2a2d33" })), grey = lam("orbGrey", () => ({ color: "#9aa1ac" }));
  b.add(boxGeo(V(-14, -2.0, -2.6), V(9, 2.2, 2.6)), white);
  b.add(boxGeo(V(-14, -2.45, -2.62), V(13, -1.95, 2.62)), black);
  const nose = new THREE.SphereGeometry(1, 24, 12); nose.scale(5.2, 2.2, 2.6); nose.translate(9, 0.1, 0); b.add(nose, white);
  b.add(boxGeo(V(9.2, 1.0, -1.6), V(11.2, 1.9, 1.6)), black); // cockpit windows
  // delta wings
  const wing = new THREE.Shape([new THREE.Vector2(6, 2.6), new THREE.Vector2(-11, 12), new THREE.Vector2(-15, 12), new THREE.Vector2(-15, 2.6)].map((v) => v));
  for (const s of [1, -1]) {
    const g = new THREE.ExtrudeGeometry(wing, { depth: 0.6, bevelEnabled: false });
    g.rotateX(Math.PI / 2); g.translate(0, -1.4, 0); if (s < 0) g.scale(1, 1, -1);
    b.add(g, white);
    const gb = new THREE.ExtrudeGeometry(wing, { depth: 0.12, bevelEnabled: false }); gb.rotateX(Math.PI / 2); gb.translate(0, -1.95, 0); if (s < 0) gb.scale(1, 1, -1);
    b.add(gb, black);
  }
  // tail fin
  const fin = new THREE.Shape([new THREE.Vector2(-8.5, 2.2), new THREE.Vector2(-14.5, 10.5), new THREE.Vector2(-17, 10.5), new THREE.Vector2(-15.8, 2.2)]);
  const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.5, bevelEnabled: false }); fg.translate(0, 0, -0.25); b.add(fg, white);
  for (const z of [-1.7, 1.7]) b.add(boxGeo(V(-15, 1.4, z - 0.8), V(-10, 3.0, z + 0.8)), white); // engine pods
  for (const [y, z] of [[1.0, 0], [-0.6, -1.3], [-0.6, 1.3]]) b.add(new THREE.CylinderGeometry(0.55, 0.95, 1.8, 16).rotateZ(Math.PI / 2).translate(-14.9, y, z), grey);
  // payload bay: a grey inside, two doors (open: hinged outward at the sides)
  b.add(flatQuad(-9.5, 7, -2.3, 2.3, 4, 1, 2.22), lam("bayInside", () => ({ color: "#8d949c" })));
  for (const s of [1, -1]) {
    const door = new THREE.CylinderGeometry(2.6, 2.6, 16.5, 20, 1, true, 0, Math.PI / 2);
    door.rotateZ(Math.PI / 2); door.translate(-1.25, 0, 0);
    const m = bayOpen ? new THREE.Matrix4().makeTranslation(-1.25 + 1.25, 2.2, s * 2.6).multiply(new THREE.Matrix4().makeRotationX(s * 1.1)).multiply(new THREE.Matrix4().makeTranslation(0, 0, -s * 2.6))
      : new THREE.Matrix4().makeTranslation(0, -0.4, 0);
    const dg = s > 0 ? door : door.clone().scale(1, 1, -1);
    b.add(dg, lam("bayDoor", () => ({ color: "#e9e4d8", side: THREE.DoubleSide })), m);
  }
  b.build(grp);
  shadowAll(grp);
  return grp;
};

/** the launch stack (tank, boosters, orbiter riding on the tank), standing on y = 8, origin at the tank's foot */
const stackMesh = () => {
  const grp = new THREE.Group(), b = new Batch();
  const tank = lam("etOrange", () => ({ color: "#c9783a" })), white = lam("orbWhite", () => ({ color: "#f4f1ea" })), grey = lam("orbGrey", () => ({ color: "#9aa1ac" }));
  b.add(new THREE.CylinderGeometry(4.2, 4.2, 40, 32).translate(0, 20, 0), tank);
  b.add(new THREE.ConeGeometry(4.2, 8, 32).translate(0, 44, 0), tank);
  for (const z of [-6.4, 6.4]) {
    b.add(new THREE.CylinderGeometry(1.85, 1.85, 37, 24).translate(0.4, 18.5, z), white);
    b.add(new THREE.ConeGeometry(1.85, 4.5, 24).translate(0.4, 39.2, z), white);
    b.add(new THREE.CylinderGeometry(1.2, 1.9, 2.4, 20).translate(0.4, -1.2, z), grey);
    for (const y of [6, 18, 30]) b.add(new THREE.CylinderGeometry(1.9, 1.9, 0.5, 24).translate(0.4, y, z), grey);
  }
  b.build(grp);
  const orb = orbiterMesh(false);
  orb.rotation.set(0, Math.PI, Math.PI / 2, "YXZ");
  orb.rotation.order = "XYZ"; orb.rotation.set(0, 0, 0);
  orb.rotateY(Math.PI); orb.rotateZ(Math.PI / 2);
  orb.position.set(7.2, 15.5, 0);
  grp.add(orb);
  shadowAll(grp);
  return grp;
};

/** the mirror on a stand: disc of radius 1.2 facing +z, tilted up by tilt */
const mirrorMesh = (tilt: number, key: string) => {
  const grp = new THREE.Group(), b = new Batch();
  const face = lam("mirrorFaceM", () => ({ map: mirrorTex() })), edge = lam("mirrorEdge", () => ({ color: "#8d949c" })), dark = lam("cellDark", () => ({ color: "#3d414c" }));
  const disc = new THREE.Group(), db = new Batch();
  db.add(new THREE.CircleGeometry(1.2, 64).translate(0, 0, 0.16), face);
  db.add(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 64, 1, true).rotateX(Math.PI / 2), edge);
  db.add(new THREE.TorusGeometry(1.26, 0.07, 8, 64).translate(0, 0, 0.1), dark);
  db.add(new THREE.CircleGeometry(1.2, 64).rotateY(Math.PI).translate(0, 0, -0.15), edge);
  db.build(disc);
  disc.rotation.x = -tilt;
  grp.add(disc);
  b.add(boxGeo(V(-1.45, -1.75, -0.3), V(-1.3, 0.1, 0.3)), dark);
  b.add(boxGeo(V(1.3, -1.75, -0.3), V(1.45, 0.1, 0.3)), dark);
  b.add(boxGeo(V(-1.6, -1.75, -0.6), V(1.6, -1.55, 0.6)), dark);
  b.build(grp);
  shadowAll(grp);
  void key;
  return grp;
};

/** additive light material (HDR colour, no ink) */
const lightMat = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1, 1, 1), fog: false, side: THREE.DoubleSide });
const screenMat = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(1.0, 1.0, 1.0) });

/** a cylinder between two points (unit cylinder along y, posed per frame) */
const segGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
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
  private stars: THREE.Points;
  private hubble: THREE.Group;
  private stack: THREE.Group;
  private arm: THREE.Mesh[] = [];
  private screen: THREE.Mesh; private blurMat: THREE.MeshBasicMaterial; private sharpMat: THREE.MeshBasicMaterial;
  private lens2: THREE.Mesh;
  private box: THREE.Mesh;
  private padGlow: THREE.Mesh;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private c1 = new THREE.Color(); private c2 = new THREE.Color();

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
    void discTex;
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }
    // ---- stars (follow the camera, like the sky) ----
    const sr = rng(5), sp: number[] = [];
    for (let i = 0; i < 2200; i++) { const u = sr() * 2 - 1, a = sr() * Math.PI * 2, s = Math.sqrt(1 - u * u); sp.push(900 * s * Math.cos(a), 900 * u, 900 * s * Math.sin(a)); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: new THREE.Color(1.4, 1.4, 1.5), size: 2.4, sizeAttenuation: false, fog: false, depthWrite: false }));
    this.stars.layers.set(NOINK); this.stars.frustumCulled = false; this.stars.renderOrder = -0.8; R.add(this.stars);

    // ---- space: the Earth, the telescope, the orbiter, the arm, the box ----
    const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 128, 64), lam("earthM", () => ({ map: earthTex() })));
    earth.position.set(...EARTH); earth.rotation.set(0.3, 0.8, 0.1); earth.receiveShadow = false; R.add(earth);
    this.hubble = hubbleMesh(); R.add(this.hubble);
    const orb = orbiterMesh(true); orb.position.set(...SHU); R.add(orb);
    const armM = lam("armWhite", () => ({ color: "#e9e4d8" }));
    for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(segGeo, armM); m.castShadow = true; this.arm.push(m); R.add(m); }
    this.box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 1.2), lam("costar", () => ({ map: ctex("costarTex", 256, 256, (g) => {
      g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#d9a441"; g.fillRect(0, 96, 256, 64); g.strokeStyle = "#3d414c"; g.lineWidth = 8; g.strokeRect(4, 4, 248, 248); }) })));
    this.box.castShadow = true; R.add(this.box);

    // ---- the launch pad ----
    const pb = new Batch();
    pb.add(flatQuad(-1000, 1000, -1000, 1000, 400, 400, -0.02), lam("ground", () => ({ map: tileTex("groundTex", "#a9b36a", "rgba(80,100,50,0.12)", 4) })));
    pb.add(flatQuad(-60, 60, -60, 60, 12, 12, 0.0), lam("concrete", () => ({ map: tileTex("concreteTex", "#cfcabf", "rgba(90,90,90,0.25)", 6) })));
    pb.add(boxGeo(V(-12, 0, -13), V(15, 6.5, 13)), lam("mlp", () => ({ color: "#8d949c" })));
    const red = lam("towerRed", () => ({ color: "#c0533a" }));
    for (const [x, z] of [[-22, -4], [-22, 4], [-14, -4], [-14, 4]]) pb.add(boxGeo(V(x - 0.5, 6.5, z - 0.5), V(x + 0.5, 82, z + 0.5)), red);
    for (let y = 10; y < 82; y += 6) { pb.add(boxGeo(V(-22, y, -4.3), V(-14, y + 0.5, -3.7)), red); pb.add(boxGeo(V(-22, y, 3.7), V(-14, y + 0.5, 4.3)), red); pb.add(boxGeo(V(-22.3, y, -4), V(-21.7, y + 0.5, 4)), red); }
    for (const y of [30, 50]) pb.add(boxGeo(V(-14, y, -1), V(-4, y + 1, 1)), red); // access arms
    pb.add(boxGeo(V(-23, 82, -5), V(-13, 83, 5)), red);
    const tr = rng(9);
    for (let i = 0; i < 40; i++) { const a = tr() * 6.28, d = 140 + tr() * 300; pb.add(new THREE.SphereGeometry(4 + tr() * 5, 10, 6).scale(1, 0.6, 1).translate(Math.cos(a) * d, 1, Math.sin(a) * d - 150), lam("scrub", () => ({ color: "#5d7a3a" }))); }
    pb.add(flatQuad(-1000, 1000, -1000, -420, 100, 30, 0.01), lam("ocean", () => ({ color: "#3a7fb8" })));
    pb.build(R);
    this.stack = stackMesh(); this.stack.position.set(PAD[0], 6.5, PAD[2]); R.add(this.stack);
    this.padGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), lightMat(glowTex())); this.padGlow.layers.set(NOINK); this.padGlow.renderOrder = 4; R.add(this.padGlow);

    // ---- the control room ----
    room(R, CTRL, 16, -6, 12, 12, lam("ctrlFloor", () => ({ map: tileTex("ctrlFloorTex", "#7d8796", "rgba(40,45,60,0.35)") })),
      lam("ctrlBack", () => ({ color: "#3d4a66" })), lam("ctrlSide", () => ({ color: "#56637d" })));
    const cb = new Batch(), deskM = lam("desk", () => ({ color: "#b9c2cf" })), topM = lam("deskTop", () => ({ color: "#6d7482" })), dk = lam("monitor", () => ({ color: "#2a2d33" }));
    cb.add(boxGeo(V(CTRL[0] - 3.45, 1.95, CTRL[2] - 6.0), V(CTRL[0] + 3.45, 6.05, CTRL[2] - 5.9)), dk);
    for (const dz of [0, 3.2]) {
      cb.add(boxGeo(V(CTRL[0] - 5.5, 0, CTRL[2] - 1.4 - dz * 1.0 - (dz ? 0.6 : 0)), V(CTRL[0] + 5.5, 0.92, CTRL[2] - 0.8 - dz - (dz ? 0.6 : 0))), deskM);
      cb.add(boxGeo(V(CTRL[0] - 5.6, 0.92, CTRL[2] - 1.5 - dz - (dz ? 0.6 : 0)), V(CTRL[0] + 5.6, 1.0, CTRL[2] - 0.7 - dz - (dz ? 0.6 : 0))), topM);
      for (let i = 0; i < 5; i++) cb.add(boxGeo(V(CTRL[0] - 4.6 + i * 2.2, 1.0, CTRL[2] - 1.45 - dz - (dz ? 0.6 : 0)), V(CTRL[0] - 3.8 + i * 2.2, 1.6, CTRL[2] - 1.25 - dz - (dz ? 0.6 : 0))), dk);
    }
    cb.build(R);
    this.blurMat = screenMat(screenTex(false)); this.sharpMat = screenMat(screenTex(true));
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 3.9), this.blurMat);
    this.screen.position.set(CTRL[0], 4.0, CTRL[2] - 5.85); R.add(this.screen);
    for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.95), screenMat(chartScreenTex())); m.position.set(CTRL[0] + s * 5.4, 4.2, CTRL[2] - 5.88); R.add(m); }
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.4), screenMat(chartScreenTex()));
    for (let i = 0; i < 5; i++) { const m = sm.clone(); m.position.set(CTRL[0] - 4.2 + i * 2.2, 1.3, CTRL[2] - 1.24); R.add(m); }

    // ---- the mirror lab ----
    room(R, LAB, 13, -6, 10, 9, lam("labFloor", () => ({ map: tileTex("labFloorTex", "#d3dbe3", "rgba(120,130,150,0.3)") })),
      lam("labBack", () => ({ color: "#cfe0ee" })), lam("labSide", () => ({ color: "#e8edf2" })));
    const mir = mirrorMesh(0.42, "lab"); mir.position.set(...MIR); R.add(mir);
    const lb = new Batch(), cab = lam("cabinet", () => ({ color: "#9fb4c8" }));
    lb.add(boxGeo(V(LAB[0] + 3.5, 0, LAB[2] - 5.9), V(LAB[0] + 6.4, 2.2, LAB[2] - 5.0)), cab);
    lb.add(boxGeo(V(LAB[0] - 6.4, 0, LAB[2] - 5.9), V(LAB[0] - 3.8, 0.95, LAB[2] - 4.6)), cab);
    lb.add(boxGeo(V(LAB[0] - 6.0, 4.6, LAB[2] - 5.95), V(LAB[0] + 6.0, 5.0, LAB[2] - 5.9)), lam("labStripe", () => ({ color: "#3f9fd5" })));
    lb.build(R);
    // the test tool: two rings joined by rods, three lenses inside, on a tripod, aimed at the mirror
    const tool = new THREE.Group(), tb = new Batch(), steel = lam("toolSteel", () => ({ color: "#5d6472" })), glassM = lam("lensGlass", () => ({ color: "#9fd4ff" }));
    for (const z of [0, -1.0]) tb.add(new THREE.TorusGeometry(0.28, 0.035, 8, 24).translate(0, 0, z), steel);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; tb.add(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 6).rotateX(Math.PI / 2).translate(0.28 * Math.cos(a), 0.28 * Math.sin(a), -0.5), steel); }
    for (const z of [-0.15, -0.85]) tb.add(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 24).rotateX(Math.PI / 2).translate(0, 0, z), glassM);
    tb.build(tool);
    this.lens2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24).rotateX(Math.PI / 2), glassM); this.lens2.castShadow = true;
    tool.add(this.lens2);
    tool.position.set(...TOOL); tool.lookAt(MIR[0], MIR[1], MIR[2]); tool.rotateY(Math.PI); R.add(tool);
    const tp = new Batch();
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.3, foot = V(TOOL[0] + 0.7 * Math.cos(a), 0, TOOL[2] + 0.7 * Math.sin(a)), top = V(TOOL[0], TOOL[1] - 0.3, TOOL[2]);
      const g = new THREE.CylinderGeometry(0.025, 0.025, foot.distanceTo(top), 6); const m = new THREE.Mesh(g); poseSeg(m, foot, top, 1); m.scale.set(1, 1, 1); m.updateMatrix(); tp.add(g, steel, m.matrix); }
    tp.build(R);

    // ---- the eye-test room ----
    room(R, EYE, 9, -1, 10, 7, lam("eyeFloor", () => ({ map: woodTex() })), lam("eyeBack", () => ({ color: "#efe3c8" })), lam("eyeSide", () => ({ color: "#d9c9a0" })));
    const chart = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.65), lam("eyeChartM", () => ({ map: eyeChartTex() })));
    chart.position.set(EYE[0] + 0.2, 1.75, EYE[2] - 0.97); chart.receiveShadow = true; R.add(chart);
    const eb = new Batch(), easelM = lam("easel", () => ({ color: "#8a5a3c" }));
    for (const dx of [-0.75, 0.75]) eb.add(boxGeo(V(EYE[0] - 2.6 + dx - 0.04, 0, EYE[2] + 1.05), V(EYE[0] - 2.6 + dx + 0.04, 2.35, EYE[2] + 1.13)), easelM);
    eb.add(boxGeo(V(EYE[0] - 3.45, 0.95, EYE[2] + 1.08), V(EYE[0] - 1.75, 1.02, EYE[2] + 1.2)), easelM);
    eb.add(boxGeo(V(EYE[0] - 3.4, 0.95, EYE[2] + 1.0), V(EYE[0] - 1.8, 2.25, EYE[2] + 1.07)), lam("board", () => ({ color: "#f7f4ec" })));
    eb.add(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16).translate(EYE[0] + 2.6, 0.25, EYE[2] + 0.2), lam("plantPot", () => ({ color: "#c25a3a" })));
    eb.add(new THREE.SphereGeometry(0.55, 14, 10).translate(EYE[0] + 2.6, 0.95, EYE[2] + 0.2), lam("plant", () => ({ color: "#5d9a4a" })));
    eb.build(R);

    // ---- the museum hall ----
    room(R, MUS, 22, -8, 14, 14, lam("musFloor", () => ({ map: woodTex() })), lam("musBack", () => ({ color: "#4a5f8f" })), lam("musSide", () => ({ color: "#56699a" })));
    const backup = mirrorMesh(0.12, "museum"); backup.position.set(...MUSM); R.add(backup);
    const mb = new Batch(), brass = lam("brass", () => ({ color: "#c9a45a" })), rope = lam("rope", () => ({ color: "#a3303a" }));
    mb.add(boxGeo(V(MUSM[0] - 1.8, 0, MUSM[2] - 0.8), V(MUSM[0] + 1.8, 0.3, MUSM[2] + 0.8)), lam("plinth", () => ({ color: "#e9e2d2" })));
    const posts = [-2.4, 0, 2.4].map((dx) => [MUSM[0] + dx, MUSM[2] + 1.7] as const);
    for (const [x, z] of posts) { mb.add(new THREE.CylinderGeometry(0.05, 0.05, 0.95, 10).translate(x, 0.475, z), brass); mb.add(new THREE.SphereGeometry(0.08, 10, 8).translate(x, 0.98, z), brass); mb.add(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16).translate(x, 0.025, z), brass); }
    for (let i = 0; i < 2; i++) mb.add(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 8).rotateZ(Math.PI / 2).translate(posts[i][0] + 1.2, 0.85, posts[i][1]), rope);
    mb.build(R);
    for (const [dx, w, h] of [[-7.5, 3.6, 2.4], [7.5, 3.6, 2.4]] as const) {
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat(screenTex(true))); pic.position.set(MUS[0] + dx, 3.4, MUS[2] - 7.95); R.add(pic);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.06), lam("frame", () => ({ color: "#c9a45a" }))); fr.position.set(MUS[0] + dx, 3.4, MUS[2] - 7.99); R.add(fr);
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
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], space = s.set === "space", inside = !space && s.set !== "pad";
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
    if (s.light === "golden" || dist > 40) Rr = Math.max(Rr, 70);
    if (s.set === "pad") Rr = 95;
    this.sun.position.copy(focus).addScaledVector(sunDir, 260); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 560; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...(space ? [0.2, 0.21, 0.32] as [number, number, number] : L.shade)); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, stars, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => { untone(space ? SPACE_SKY[i] : h, this.c1); su["c" + i].value.copy(this.c1); });
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    this.stars.visible = space; this.stars.position.copy(cam.position);
    untone(L.fog, this.fog.color);
    this.fog.near = space || inside ? 5000 : L.fogNear * 4; this.fog.far = space || inside ? 9000 : L.fogFar * 2.2;
    scene.fog = this.fog; scene.background = null;
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.visible = s.set === "pad";
      const a = (i / this.clouds.length) * Math.PI * 2 + 0.3 + t * 0.002, d = 620 + (i % 3) * 60;
      m.position.set(cam.position.x + Math.cos(a) * d, 120 + (i % 4) * 38, cam.position.z + Math.sin(a) * d);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      const w = 130 + (i % 4) * 30;
      m.scale.set(w, w / 2, 1);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- set pieces ----
    const H = hubbleAt(id, t);
    this.hubble.position.set(...H);
    this.hubble.rotation.set(0, 0, id === 3 || (id === 8 && t < 57.2) ? 0.05 * Math.sin(t * 0.4) : 0);
    // the arm: from the bay's front edge to the telescope's underside (shots 3, 8a, 8b)
    const armOn = space && (id === 3 || (id === 8 && t < 57.2));
    const base = V(SHU[0] + 5, SHU[1] + 2.3, SHU[2] - 2.3);
    const grip = id === 3 ? V(SHU[0] - 1, SHU[1] + 6.9 + 1.0 * smooth((t - 9.4) / 0.8), SHU[2]) : V(H[0], H[1] - 2.1, H[2]);
    const elbow = base.clone().add(grip).multiplyScalar(0.5).add(V(1.5, 3.2, -1.5));
    this.arm.forEach((m) => { m.visible = armOn; });
    if (armOn) { poseSeg(this.arm[0], base, elbow, 0.22); poseSeg(this.arm[1], elbow, grip, 0.2); }
    this.box.visible = id === 8 && t >= 52.4 && t < 57.2;
    if (this.box.visible) { const u = smooth((t - 52.6) / 4.0); this.box.position.set(H[0] - 4.6 - 1.4 * u, H[1] - 0.9 + 0.06 * Math.sin(t * 2), H[2] + 1.9); this.box.rotation.set(0.05, 0.2 * Math.sin(t * 0.7), 0.04); }
    const lift = liftAt(t);
    this.stack.position.set(PAD[0], 6.5 + (id === 2 ? lift : 0), PAD[2]);
    this.padGlow.visible = id === 2 && t > 7.0;
    if (this.padGlow.visible) {
      const k = smooth((t - 7.0) / 0.6);
      this.padGlow.position.set(PAD[0] + 3, 4 + lift, PAD[2] + 8); this.padGlow.quaternion.copy(cam.quaternion);
      this.padGlow.scale.setScalar(26 * k); (this.padGlow.material as THREE.MeshBasicMaterial).color.setRGB(2.6 * k, 1.7 * k, 0.8 * k);
    }
    this.screen.material = sharpScreen(id) ? this.sharpMat : this.blurMat;
    this.lens2.position.set(0.17 * lensOff(id, t), 0.06 * lensOff(id, t), -0.5);
    void W; void MUS; void add;
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
