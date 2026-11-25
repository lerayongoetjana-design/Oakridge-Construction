/**
 * Oakridge Construction: "The Sandton Exchange" detailed architectural model.
 *
 * Builds two original GLB files entirely from code, with no third-party assets:
 *   assets/models/commercial.glb    the building, split into construction pieces
 *   assets/models/environment.glb   streets, parking, cars, gardens, neighbours, skyline
 *
 * Every building piece is a group carrying glTF extras that the website reads:
 *   stage   1..8 construction stage (site prep, foundation, frame, floors,
 *           façade, interiors, landscaping, completion)
 *   order   0..1 order within the stage
 *   until   stage at which a temporary item (crane, hoarding) is removed
 *   level   floor index (0 = ground, 12 = roof) for the exploded view
 *   config  optional configurator variant (rooftop layouts)
 *   phase   simplified phase for the lighter homepage viewer
 *
 * Usage: cd tools && npm install && node generate-exchange.mjs
 * Then compress: npx @gltf-transform/cli meshopt <in> <out>  (see README)
 */
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then((b) => { this.result = b; this.onloadend && this.onloadend(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then((b) => { this.result = "data:application/octet-stream;base64," + Buffer.from(b).toString("base64"); this.onloadend && this.onloadend(); }); }
};

/* ---------------------------------------------------------------- materials */
const std = (name, color, roughness, metalness, extra = {}) =>
  new THREE.MeshStandardMaterial({ name, color, roughness, metalness, ...extra });
const phys = (name, opts) => new THREE.MeshPhysicalMaterial({ name, ...opts });

const M = {
  glass: phys("glass", { color: 0xd4dde0, roughness: 0.04, metalness: 0, transmission: 0.82, ior: 1.5, thickness: 0.02, specularIntensity: 1 }),
  glassLobby: phys("glass-lobby", { color: 0xe9eeee, roughness: 0.03, metalness: 0, transmission: 0.9, ior: 1.5, thickness: 0.02 }),
  balustrade: phys("glass-balustrade", { color: 0xe6eeee, roughness: 0.05, metalness: 0, transmission: 0.88, ior: 1.5, thickness: 0.02 }),
  frame: std("aluminium", 0x9c7a4c, 0.32, 0.9),
  concrete: std("concrete", 0xc2bcb2, 0.86, 0),
  cladding: std("cladding", 0xd8cdb8, 0.62, 0),
  floor: std("stone-floor", 0xd6cdbd, 0.35, 0),
  timber: std("timber", 0x8a5d3b, 0.6, 0),
  furnWhite: std("furniture-white", 0xefebe4, 0.45, 0),
  furnDark: std("furniture-dark", 0x2b2b2b, 0.55, 0.2),
  fabric: std("fabric", 0x6f6457, 0.95, 0),
  ceilingLight: std("interior-light", 0xffffff, 0.4, 0, { emissive: 0xfff0d8, emissiveIntensity: 1 }),
  led: std("led", 0x2a2a2a, 0.4, 0, { emissive: 0xffd9a0, emissiveIntensity: 1 }),
  lamp: std("lamp", 0xf3efe6, 0.3, 0, { emissive: 0xffe2b5, emissiveIntensity: 1 }),
  water: std("water", 0x31545c, 0.04, 0.2),
  grass: std("grass", 0x55703a, 1, 0),
  foliage: std("foliage", 0x3f5d2a, 0.85, 0),
  shrub: std("shrub", 0x4a6a33, 0.9, 0),
  bark: std("bark", 0x5b4636, 1, 0),
  soil: std("soil", 0x3f3329, 1, 0),
  earth: std("earth", 0x7a5c43, 1, 0),
  planter: std("planter", 0x3a3734, 0.7, 0.3),
  steel: std("steel", 0x3b3d40, 0.45, 0.75),
  crane: std("crane", 0xd8a23f, 0.55, 0.3),
  hoarding: std("hoarding", 0x252525, 0.8, 0.1),
  cabin: std("cabin", 0xeeeae2, 0.6, 0.2),
  pv: std("solar-panel", 0x182230, 0.18, 0.6),
  rubber: std("rubber", 0x151515, 0.9, 0),
  carGlass: std("car-glass", 0x0e1114, 0.08, 0.6),
  paints: [std("paint-white", 0xeeeeec, 0.25, 0.3), std("paint-charcoal", 0x2a2c2f, 0.28, 0.5), std("paint-silver", 0xa9adb1, 0.25, 0.8), std("paint-bronze", 0x7a5a38, 0.3, 0.7)],
  asphalt: std("asphalt", 0x323233, 0.95, 0),
  paving: std("paving", 0xbdb4a5, 0.8, 0),
  marking: std("road-marking", 0xe9e5db, 0.6, 0),
  kerb: std("kerb", 0x9e988e, 0.85, 0),
  ground: std("ground", 0x4c5536, 1, 0),
  nGlass: std("neighbour-glass", 0x3b4a55, 0.12, 0.85),
  nStone: std("neighbour-stone", 0xb3aca0, 0.8, 0),
  nDark: std("neighbour-dark", 0x2c2e31, 0.6, 0.4),
  skyline: std("skyline", 0x59606a, 0.9, 0),
};

/* ---------------------------------------------------------------- helpers */
const tmp = new THREE.Object3D();
function place(g, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  tmp.position.set(x, y, z); tmp.rotation.set(rx, ry, rz); tmp.scale.set(sx, sy, sz); tmp.updateMatrix();
  g.applyMatrix4(tmp.matrix);
  return g;
}

class Piece {
  constructor(name, extras) { this.name = name; this.extras = extras; this.parts = new Map(); this.extraObjects = []; }
  add(mat, g) {
    g.deleteAttribute("uv");
    if (!g.index) { const idx = []; for (let i = 0; i < g.attributes.position.count; i++) idx.push(i); g.setIndex(idx); }
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(g);
    return this;
  }
  /** Box by its bottom-centre point. */
  box(mat, w, h, d, x = 0, y = 0, z = 0, ry = 0) { return this.add(mat, place(new THREE.BoxGeometry(w, h, d), x, y + h / 2, z, 0, ry)); }
  /** Box spanning two corners. */
  span(mat, x0, y0, z0, x1, y1, z1) {
    return this.add(mat, place(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  }
  cyl(mat, r, h, x, y, z, seg = 16, r2 = r) { return this.add(mat, place(new THREE.CylinderGeometry(r2, r, h, seg), x, y + h / 2, z)); }
  geo(mat, g) { return this.add(mat, g); }
  object(o) { this.extraObjects.push(o); return this; }
  build() {
    const group = new THREE.Group();
    group.name = this.name;
    group.userData = this.extras;
    for (const [mat, geos] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
      mesh.name = `${this.name}--${mat.name}`;
      group.add(mesh);
    }
    this.extraObjects.forEach((o) => group.add(o));
    return group;
  }
}

/** InstancedMesh from a geometry and a list of [x, y, z, rotY, scale]. */
function instanced(name, geometry, mat, items, extras) {
  geometry.deleteAttribute("uv");
  const im = new THREE.InstancedMesh(geometry, mat, items.length);
  im.name = name;
  // Placement data in plain numbers, so the website can rebuild detailed
  // foliage regardless of how the mesh data is compressed.
  if (extras) im.userData = extras;
  items.forEach(([x, y, z, ry = 0, s = 1, sy = s], i) => {
    tmp.position.set(x, y, z); tmp.rotation.set(0, ry, 0); tmp.scale.set(s, sy, s); tmp.updateMatrix();
    im.setMatrixAt(i, tmp.matrix);
  });
  return im;
}

// Seeded random so the generated scene is reproducible.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + (b - a) * rnd();

/* Reusable vegetation and furniture geometry -------------------------------- */
function treeGeometries(kind) {
  if (kind === "cypress") {
    const trunk = place(new THREE.CylinderGeometry(0.12, 0.18, 2, 7), 0, 1, 0);
    const crown = mergeGeometries([
      place(new THREE.ConeGeometry(1.1, 5.5, 9), 0, 4.2, 0),
      place(new THREE.ConeGeometry(0.85, 3.6, 9), 0, 6.1, 0),
    ]);
    return { trunk, crown };
  }
  const trunk = mergeGeometries([
    place(new THREE.CylinderGeometry(0.16, 0.26, 3.2, 7), 0, 1.6, 0),
    place(new THREE.CylinderGeometry(0.07, 0.1, 1.6, 6), 0.5, 3.4, 0, 0, 0, -0.5),
    place(new THREE.CylinderGeometry(0.07, 0.1, 1.5, 6), -0.45, 3.3, 0.2, 0.3, 0, 0.5),
  ].map((g) => g.toNonIndexed()));
  const blobs = [[0, 4.6, 0, 1.9], [1.1, 4.1, 0.5, 1.4], [-1.0, 4.2, -0.4, 1.5], [0.2, 5.4, -0.6, 1.3], [-0.4, 3.8, 1.0, 1.2]];
  const crown = mergeGeometries(blobs.map(([x, y, z, r]) => place(new THREE.IcosahedronGeometry(r, 1), x, y, z, rnd(), rnd(), 0, 1, 0.85, 1)));
  return { trunk, crown };
}
const ROUND = treeGeometries("round");
const CYPRESS = treeGeometries("cypress");
const SHRUB = place(new THREE.IcosahedronGeometry(0.7, 1), 0, 0.45, 0, 0, 0, 0, 1, 0.7, 1);

function addTrees(p, items, kind = "round") {
  const t = kind === "round" ? ROUND : CYPRESS;
  p.object(instanced(`${p.name}-trunks-${kind}`, t.trunk.clone(), M.bark, items));
  p.object(instanced(`${p.name}-crowns-${kind}`, t.crown.clone(), M.foliage, items, { foliage: kind, items: items.map((a) => a.map((v) => +(+v).toFixed(3))) }));
}

const BENCH = mergeGeometries([
  place(new THREE.BoxGeometry(2.2, 0.08, 0.55), 0, 0.46, 0),
  place(new THREE.BoxGeometry(0.4, 0.42, 0.5), -0.8, 0.21, 0),
  place(new THREE.BoxGeometry(0.4, 0.42, 0.5), 0.8, 0.21, 0),
]);

/* ================================================================ BUILDING */
const POD = { x: 22, z0: -16, z1: 16 };           // podium half-width, depth
const TOW = { x: 15, z0: -13, z1: 9 };            // tower half-width, depth
const CORE = { x: 5, z0: -6, z1: 2 };
const L0H = 6, L1H = 4.5, FH = 3.9, TOWER_FLOORS = 10;
const levelBase = (k) => (k === 0 ? 0 : k === 1 ? L0H : L0H + L1H + (k - 2) * FH);
const levelHeight = (k) => (k === 0 ? L0H : k === 1 ? L1H : FH);
const ROOF_Y = levelBase(2 + TOWER_FLOORS); // 49.5
const LEVELS = 2 + TOWER_FLOORS;            // 0..11 occupied, 12 = roof

const PHASE = { 1: "temp", 2: "foundation", 3: "frame", 4: "frame", 5: "facade", 6: "facade", 7: "site", 8: "site" };
function extras(stage, order = 0, more = {}) {
  const level = more.level != null ? more.level : -1;
  const phase = more.phase || (stage === 5 && level === 12 ? "roof" : PHASE[stage]);
  return { stage, order, level, phase, ...more };
}

function building() {
  const P = [];

  /* Stage 1: site preparation ---------------------------------------------- */
  const prep = new Piece("site-prep", extras(1, 0, { until: 3 }));
  prep.span(M.earth, -26, 0.01, -20, 26, 0.06, 30);
  for (const [x, z, r] of [[-20, 26, 3.2], [-14, 27, 2.4], [18, 26, 2.8]]) prep.add(M.earth, place(new THREE.ConeGeometry(r, r * 0.6, 10), x, r * 0.3, z));
  P.push(prep);

  const hoard = new Piece("site-hoarding", extras(1, 0.4, { until: 7 }));
  const fx = 28, fz0 = -22, fz1 = 32, fh = 2.4;
  hoard.span(M.hoarding, -fx, 0, fz0, fx, fh, fz0 + 0.12).span(M.hoarding, -fx, 0, fz1 - 0.12, -3, fh, fz1).span(M.hoarding, 3, 0, fz1 - 0.12, fx, fh, fz1)
    .span(M.hoarding, -fx, 0, fz0, -fx + 0.12, fh, fz1).span(M.hoarding, fx - 0.12, 0, fz0, fx, fh, fz1);
  hoard.span(M.frame, -fx, fh - 0.25, fz1 - 0.16, -3, fh - 0.12, fz1 + 0.02).span(M.frame, 3, fh - 0.25, fz1 - 0.16, fx, fh - 0.12, fz1 + 0.02);
  P.push(hoard);

  const cabins = new Piece("site-cabins", extras(1, 0.7, { until: 7 }));
  cabins.box(M.cabin, 2.4, 2.6, 6, 25, 0, -18).box(M.cabin, 2.4, 2.6, 6, 25, 2.6, -18).box(M.cabin, 2.4, 2.6, 6, 22.2, 0, -18)
    .box(M.steel, 0.9, 2.1, 0.05, 25, 0, -14.98);
  P.push(cabins);

  /* Stage 2: foundations ---------------------------------------------------- */
  const fnd = new Piece("foundation", extras(2, 0, { level: 0 }));
  fnd.span(M.concrete, -POD.x - 1, -1.2, POD.z0 - 1, POD.x + 1, 0, POD.z1 + 1);
  for (let x = -20; x <= 20; x += 8) for (let z = -14; z <= 14; z += 7) fnd.box(M.concrete, 2.2, 0.4, 2.2, x, 0, z);
  P.push(fnd);

  /* Crane (stage 2 to 7) ---------------------------------------------------- */
  const crane = new Piece("crane", extras(2, 0.2, { until: 7, phase: "crane" }));
  const cx = 31, cz = -10, ch = 66;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) crane.box(M.crane, 0.16, ch, 0.16, cx + dx * 0.9, 0, cz + dz * 0.9);
  for (let y = 0; y < ch; y += 2.2) {
    crane.span(M.crane, cx - 0.9, y, cz - 0.95, cx + 0.9, y + 0.08, cz - 0.85).span(M.crane, cx - 0.9, y, cz + 0.85, cx + 0.9, y + 0.08, cz + 0.95)
      .span(M.crane, cx - 0.95, y, cz - 0.9, cx - 0.85, y + 0.08, cz + 0.9).span(M.crane, cx + 0.85, y, cz - 0.9, cx + 0.95, y + 0.08, cz + 0.9);
  }
  crane.span(M.crane, cx - 44, ch, cz - 0.6, cx + 1, ch + 1.3, cz + 0.6).span(M.crane, cx, ch, cz - 0.7, cx + 14, ch + 1, cz + 0.7)
    .box(M.concrete, 4, 2.4, 2.4, cx + 11.5, ch - 2.4, cz).box(M.cabin, 2, 2.2, 2, cx, ch - 2.6, cz + 1.8)
    .add(M.crane, place(new THREE.ConeGeometry(1.2, 6, 4), cx, ch + 4, cz))
    .span(M.steel, cx - 30.05, ch - 22, cz - 0.05, cx - 29.95, ch, cz + 0.05).box(M.steel, 1.4, 0.9, 1.4, cx - 30, ch - 22.9, cz);
  P.push(crane);

  /* Floors ----------------------------------------------------------------- */
  for (let k = 0; k < LEVELS; k++) {
    const y = levelBase(k), h = levelHeight(k), tower = k >= 2;
    const ord = k / (LEVELS - 1);
    const lv = { level: k };

    // Stage 3: structure (core + columns)
    const st = new Piece(`structure-L${k}`, extras(3, ord, lv));
    st.span(M.concrete, -CORE.x, y, CORE.z0, CORE.x, y + h, CORE.z1);
    if (tower) {
      const ix = TOW.x - 1.2, iz0 = TOW.z0 + 1.2, iz1 = TOW.z1 - 1.2;
      for (let x = -12; x <= 12; x += 6) { st.box(M.concrete, 0.6, h, 0.6, x, y, iz1); st.box(M.concrete, 0.6, h, 0.6, x, y, iz0); }
      for (let z = iz0 + 5.4; z < iz1 - 1; z += 5.4) { st.box(M.concrete, 0.6, h, 0.6, ix, y, z); st.box(M.concrete, 0.6, h, 0.6, -ix, y, z); }
    } else if (k === 0) {
      for (let x = -20; x <= 20; x += 8) st.cyl(M.concrete, 0.42, h, x, y, 15.2, 20);   // front colonnade
      for (let x = -18; x <= 18; x += 9) st.box(M.concrete, 0.7, h, 0.7, x, y, -14.6);
      for (const z of [-7, 0, 7]) { st.box(M.concrete, 0.7, h, 0.7, -20.6, y, z); st.box(M.concrete, 0.7, h, 0.7, 20.6, y, z); }
    } else {
      for (let x = -18; x <= 18; x += 6) { st.box(M.concrete, 0.6, h, 0.6, x, y, 14.6); st.box(M.concrete, 0.6, h, 0.6, x, y, -14.6); }
      for (const z of [-7, 0, 7]) { st.box(M.concrete, 0.6, h, 0.6, -20.6, y, z); st.box(M.concrete, 0.6, h, 0.6, 20.6, y, z); }
    }
    P.push(st);

    // Stage 4: floor slab
    const sl = new Piece(`slab-L${k}`, extras(4, ord, lv));
    if (k <= 2) sl.span(k === 0 ? M.floor : M.concrete, -POD.x, y, POD.z0, POD.x, y + 0.3, POD.z1);
    else sl.span(M.concrete, -TOW.x, y, TOW.z0, TOW.x, y + 0.3, TOW.z1);
    if (k === 0) sl.span(M.floor, -9, 0, 16, 9, 0.15, 19); // entrance plinth
    P.push(sl);

    // Stage 5: façade
    const fa = new Piece(`facade-L${k}`, extras(5, ord, lv));
    if (k === 0) lobbyFacade(fa);
    else if (k === 1) conferenceFacade(fa, y, h);
    else towerFacade(fa, y, h, k);
    P.push(fa);

    // Stage 6: interiors
    const inn = new Piece(`interior-L${k}`, extras(6, ord, { ...lv, interior: true }));
    if (k === 0) lobbyInterior(inn); else if (k === 1) conferenceInterior(inn, y, h); else officeInterior(inn, y, h, k);
    P.push(inn);
  }

  // Roof slab + parapet + plant enclosure (stage 4/5)
  const roofSlab = new Piece("slab-L12", extras(4, 1, { level: 12 }));
  roofSlab.span(M.concrete, -TOW.x - 0.15, ROOF_Y, TOW.z0 - 0.15, TOW.x + 0.15, ROOF_Y + 0.5, TOW.z1 + 0.15);
  P.push(roofSlab);

  const roof = new Piece("facade-L12", extras(5, 1, { level: 12 }));
  const ry = ROOF_Y + 0.5;
  balustrade(roof, -TOW.x + 0.1, TOW.z1 - 0.1, TOW.x - 0.1, TOW.z1 - 0.1, ry);
  balustrade(roof, -TOW.x + 0.1, TOW.z0 + 0.1, TOW.x - 0.1, TOW.z0 + 0.1, ry);
  balustrade(roof, -TOW.x + 0.1, TOW.z0 + 0.1, -TOW.x + 0.1, TOW.z1 - 0.1, ry);
  balustrade(roof, TOW.x - 0.1, TOW.z0 + 0.1, TOW.x - 0.1, TOW.z1 - 0.1, ry);
  // plant enclosure with bronze louvres + solar array on top
  roof.span(M.steel, -6, ry, -12, 6, ry + 3.4, -5);
  for (let yy = ry + 0.3; yy < ry + 3.6; yy += 0.32) {
    roof.span(M.frame, -6.25, yy, -4.85, 6.25, yy + 0.06, -4.6).span(M.frame, -6.25, yy, -12.15, -6.0, yy + 0.06, -4.6).span(M.frame, 6.0, yy, -12.15, 6.25, yy + 0.06, -4.6);
  }
  for (let i = 0; i < 4; i++) roof.add(M.pv, place(new THREE.BoxGeometry(11, 0.06, 1.5), 0, ry + 3.75, -11.2 + i * 1.75, -0.28));
  P.push(roof);

  roofGardens(P, ry);
  podiumTerrace(P);
  site(P);
  lighting(P);
  return P;
}

function balustrade(p, x0, z0, x1, z1, y, h = 1.1) {
  const t = 0.03;
  const lenX = Math.abs(x1 - x0), lenZ = Math.abs(z1 - z0);
  if (lenX > lenZ) {
    p.span(M.balustrade, Math.min(x0, x1), y, z0 - t, Math.max(x0, x1), y + h, z0 + t);
    p.span(M.frame, Math.min(x0, x1), y + h, z0 - 0.05, Math.max(x0, x1), y + h + 0.06, z0 + 0.05);
  } else {
    p.span(M.balustrade, x0 - t, y, Math.min(z0, z1), x0 + t, y + h, Math.max(z0, z1));
    p.span(M.frame, x0 - 0.05, y + h, Math.min(z0, z1), x0 + 0.05, y + h + 0.06, Math.max(z0, z1));
  }
}

/** Recessed curtain wall with bronze mullions along one straight edge. */
function curtainWall(p, x0, z0, x1, z1, y0, h, opts = {}) {
  const { band = 0.9, recess = 0.35, spacing = 1.5, glass = M.glass, outward = 1 } = opts;
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const gy0 = y0 + band, gy1 = y0 + h;
  // spandrel band (cladding)
  if (band > 0) {
    if (alongX) p.span(M.cladding, Math.min(x0, x1) - 0.15, y0, z0 - 0.18 * outward, Math.max(x0, x1) + 0.15, gy0, z0 + 0.17 * outward);
    else p.span(M.cladding, x0 - 0.18 * outward, y0, Math.min(z0, z1) - 0.15, x0 + 0.17 * outward, gy0, Math.max(z0, z1) + 0.15);
  }
  // recessed glass
  const g = recess * outward;
  if (alongX) p.span(glass, Math.min(x0, x1), gy0, z0 - g - 0.015, Math.max(x0, x1), gy1, z0 - g + 0.015);
  else p.span(glass, x0 - g - 0.015, gy0, Math.min(z0, z1), x0 - g + 0.015, gy1, Math.max(z0, z1));
  // mullions and transoms
  const n = Math.max(1, Math.round(len / spacing));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = alongX ? Math.min(x0, x1) + t * len : x0;
    const z = alongX ? z0 : Math.min(z0, z1) + t * len;
    if (alongX) p.span(M.frame, x - 0.035, gy0, z - g - 0.02, x + 0.035, gy1, z - g + 0.2 * outward);
    else p.span(M.frame, x - g - 0.02, gy0, z - 0.035, x - g + 0.2 * outward, gy1, z + 0.035);
  }
  for (const yy of [gy0, gy1 - 0.06]) {
    if (alongX) p.span(M.frame, Math.min(x0, x1), yy, z0 - g - 0.02, Math.max(x0, x1), yy + 0.06, z0 - g + 0.12 * outward);
    else p.span(M.frame, x0 - g - 0.02, yy, Math.min(z0, z1), x0 - g + 0.12 * outward, yy + 0.06, Math.max(z0, z1));
  }
}

function towerFacade(p, y, h, k) {
  curtainWall(p, -TOW.x, TOW.z1, TOW.x, TOW.z1, y, h, { outward: 1 });
  curtainWall(p, -TOW.x, TOW.z0, TOW.x, TOW.z0, y, h, { outward: -1 });
  curtainWall(p, TOW.x, TOW.z0, TOW.x, TOW.z1, y, h, { outward: 1 });
  curtainWall(p, -TOW.x, TOW.z0, -TOW.x, TOW.z1, y, h, { outward: -1 });
  // corner fins
  for (const [x, z] of [[-TOW.x, TOW.z1], [TOW.x, TOW.z1], [-TOW.x, TOW.z0], [TOW.x, TOW.z0]]) p.span(M.cladding, x - 0.3, y, z - 0.3, x + 0.3, y + h, z + 0.3);
  // balconies on the side elevations, levels 4+
  if (k >= 4) {
    for (const s of [-1, 1]) {
      const bx0 = s * (TOW.x + 0.15), bx1 = s * (TOW.x + 1.9);
      const z0 = -8, z1 = 4;
      p.span(M.concrete, Math.min(bx0, bx1), y + 0.05, z0, Math.max(bx0, bx1), y + 0.3, z1);
      p.span(M.frame, Math.min(bx0, bx1), y + 0.02, z0 - 0.02, Math.max(bx0, bx1), y + 0.08, z1 + 0.02);
      balustrade(p, bx1, z0, bx1, z1, y + 0.3, 1.05);
      balustrade(p, bx0, z0, bx1, z0, y + 0.3, 1.05);
      balustrade(p, bx0, z1, bx1, z1, y + 0.3, 1.05);
    }
  }
}

function lobbyFacade(p) {
  const zf = 13; // recessed lobby glass line behind colonnade
  p.span(M.glassLobby, -20.5, 0.15, zf - 0.02, -5.5, L0H, zf + 0.02).span(M.glassLobby, 5.5, 0.15, zf - 0.02, 20.5, L0H, zf + 0.02);
  for (let x = -20.5; x <= 20.6; x += 2.5) if (Math.abs(x) > 5) p.span(M.frame, x - 0.05, 0.15, zf - 0.05, x + 0.05, L0H, zf + 0.18);
  p.span(M.frame, -20.5, 3.0, zf - 0.04, 20.5, 3.08, zf + 0.12).span(M.frame, -20.5, L0H - 0.12, zf - 0.04, 20.5, L0H, zf + 0.15);
  // entrance portal: bronze surround, revolving door, side doors
  p.span(M.frame, -5.6, 0.15, zf - 0.3, -5.3, L0H, zf + 0.3).span(M.frame, 5.3, 0.15, zf - 0.3, 5.6, L0H, zf + 0.3).span(M.frame, -5.6, 3.4, zf - 0.3, 5.6, 3.7, zf + 0.3);
  p.span(M.glassLobby, -5.3, 3.7, zf - 0.02, 5.3, L0H, zf + 0.02);
  const drum = new THREE.CylinderGeometry(1.7, 1.7, 2.7, 32, 1, true);
  p.add(M.glassLobby, place(drum, 0, 0.15 + 1.35, zf));
  p.cyl(M.frame, 1.75, 0.35, 0, 2.85, zf, 32).cyl(M.frame, 1.75, 0.08, 0, 0.15, zf, 32);
  for (const a of [0, Math.PI / 2]) p.add(M.glassLobby, place(new THREE.BoxGeometry(3.3, 2.6, 0.03), 0, 1.45, zf, 0, a + 0.4));
  p.span(M.glassLobby, -5.2, 0.15, zf - 0.02, -2.0, 3.35, zf + 0.02).span(M.glassLobby, 2.0, 0.15, zf - 0.02, 5.2, 3.35, zf + 0.02);
  p.span(M.frame, -3.65, 0.15, zf - 0.04, -3.55, 3.35, zf + 0.08).span(M.frame, 3.55, 0.15, zf - 0.04, 3.65, 3.35, zf + 0.08);
  // canopy
  p.span(M.cladding, -8, 4.55, 16, 8, 4.9, 22.5);
  p.span(M.frame, -8.1, 4.4, 22.4, 8.1, 5.0, 22.6).span(M.frame, -8.1, 4.4, 16, -7.9, 5.0, 22.6).span(M.frame, 7.9, 4.4, 16, 8.1, 5.0, 22.6);
  for (const x of [-7, 7]) p.add(M.steel, place(new THREE.CylinderGeometry(0.03, 0.03, 9.2, 6), x, 7.6, 18.9, -1.05, 0, 0));
  // side and rear: stone cladding with tall glazed slots
  for (const s of [-1, 1]) {
    p.span(M.cladding, s * POD.x - 0.25, 0, POD.z0, s * POD.x + 0.25, L0H, 12);
    for (let z = -12; z <= 8; z += 4) p.span(M.glassLobby, s * POD.x - 0.27, 0.6, z - 0.7, s * POD.x + 0.27, L0H - 0.6, z + 0.7);
  }
  p.span(M.cladding, -POD.x, 0, POD.z0 - 0.25, POD.x, L0H, POD.z0 + 0.25);
  for (let x = -18; x <= 18; x += 6) p.span(M.glassLobby, x - 1, 0.6, POD.z0 - 0.27, x + 1, L0H - 0.6, POD.z0 + 0.27);
}

function conferenceFacade(p, y, h) {
  curtainWall(p, -POD.x, POD.z1, POD.x, POD.z1, y, h, { band: 0, spacing: 1.2, recess: 0.6 });
  for (let x = -POD.x + 0.6; x <= POD.x; x += 1.2) p.span(M.frame, x - 0.04, y, POD.z1 - 0.05, x + 0.04, y + h, POD.z1 + 0.55);
  curtainWall(p, -POD.x, POD.z0, POD.x, POD.z0, y, h, { band: 1.2, outward: -1, spacing: 2 });
  curtainWall(p, POD.x, POD.z0, POD.x, POD.z1, y, h, { band: 1.2, spacing: 2 });
  curtainWall(p, -POD.x, POD.z0, -POD.x, POD.z1, y, h, { band: 1.2, outward: -1, spacing: 2 });
  // podium parapet band and roof-edge balustrade
  p.span(M.cladding, -POD.x - 0.2, y + h - 0.05, POD.z0 - 0.2, POD.x + 0.2, y + h + 0.35, POD.z0 + 0.2)
    .span(M.cladding, -POD.x - 0.2, y + h - 0.05, POD.z1 - 0.2, POD.x + 0.2, y + h + 0.35, POD.z1 + 0.2)
    .span(M.cladding, -POD.x - 0.2, y + h - 0.05, POD.z0, -POD.x + 0.2, y + h + 0.35, POD.z1)
    .span(M.cladding, POD.x - 0.2, y + h - 0.05, POD.z0, POD.x + 0.2, y + h + 0.35, POD.z1);
  const ty = y + h + 0.35;
  balustrade(p, -POD.x + 0.1, POD.z1 - 0.1, POD.x - 0.1, POD.z1 - 0.1, ty);
  balustrade(p, -POD.x + 0.1, POD.z0 + 0.1, -POD.x + 0.1, POD.z1 - 0.1, ty);
  balustrade(p, POD.x - 0.1, POD.z0 + 0.1, POD.x - 0.1, POD.z1 - 0.1, ty);
}

/* Interiors ------------------------------------------------------------------ */
function desk(p, x, y, z, ry = 0) {
  p.add(M.furnWhite, place(new THREE.BoxGeometry(1.6, 0.04, 0.8), x, y + 0.74, z, 0, ry));
  p.add(M.furnDark, place(new THREE.BoxGeometry(1.5, 0.5, 0.03), x, y + 0.45, z - 0.38 * Math.cos(ry), 0, ry));
  const cz = 0.65;
  p.add(M.furnDark, place(new THREE.BoxGeometry(0.5, 0.08, 0.5), x + Math.sin(ry) * cz, y + 0.46, z + Math.cos(ry) * cz, 0, ry));
  p.add(M.furnDark, place(new THREE.BoxGeometry(0.5, 0.55, 0.06), x + Math.sin(ry) * (cz + 0.24), y + 0.75, z + Math.cos(ry) * (cz + 0.24), 0, ry));
}
function ceilingLights(p, y, x0, x1, z0, z1, step = 2.4) {
  for (let x = x0; x <= x1; x += step) for (let z = z0; z <= z1; z += step) p.span(M.ceilingLight, x - 0.6, y, z - 0.3, x + 0.6, y + 0.04, z + 0.3);
}
function planterTree(p, x, y, z, s = 1) {
  p.cyl(M.planter, 0.35 * s, 0.6 * s, x, y, z, 12);
  p.add(M.foliage, place(new THREE.IcosahedronGeometry(0.55 * s, 1), x, y + 1.2 * s, z));
  p.add(M.foliage, place(new THREE.IcosahedronGeometry(0.4 * s, 1), x + 0.2 * s, y + 1.65 * s, z - 0.1));
}

function lobbyInterior(p) {
  const y = 0.15;
  p.span(M.timber, -5, y, CORE.z1, 5, L0H, CORE.z1 + 0.12);
  for (let x = -4.8; x <= 4.8; x += 0.32) p.span(M.timber, x - 0.05, y, CORE.z1 + 0.12, x + 0.05, L0H - 0.3, CORE.z1 + 0.28);
  // reception desk: stone body with bronze band
  p.span(M.cladding, -3.6, y, 5.2, 3.6, y + 1.1, 6.2).span(M.frame, -3.65, y + 1.1, 5.15, 3.65, y + 1.16, 6.25).span(M.frame, -3.62, y + 0.15, 6.2, 3.62, y + 0.25, 6.24);
  for (const x of [-1.6, 1.6]) p.add(M.furnDark, place(new THREE.BoxGeometry(0.5, 0.9, 0.5), x, y + 0.45, 4.6));
  // lounge
  for (const [x, z] of [[-13, 7], [13, 7]]) {
    p.span(M.fabric, x - 1.4, y, z - 0.45, x + 1.4, y + 0.45, z + 0.45).span(M.fabric, x - 1.4, y + 0.45, z - 0.45, x + 1.4, y + 0.85, z - 0.25);
    p.span(M.fabric, x - 1.4, y, z + 2.3, x + 1.4, y + 0.45, z + 3.2).span(M.fabric, x - 1.4, y + 0.45, z + 3.0, x + 1.4, y + 0.85, z + 3.2);
    p.span(M.frame, x - 0.7, y, z + 1.0, x + 0.7, y + 0.4, z + 1.8);
  }
  // pendant lights and turnstiles
  for (const x of [-2.4, 0, 2.4]) { p.cyl(M.lamp, 0.35, 0.5, x, 4.3, 5.7, 20, 0.12); p.span(M.steel, x - 0.01, 4.8, 5.69, x + 0.01, L0H, 5.71); }
  for (let x = -6; x <= 6; x += 1.5) if (Math.abs(x) > 4) p.span(M.frame, x - 0.08, y, 3.2, x + 0.08, y + 1.0, 4.4);
  for (const [x, z] of [[-9, 11], [9, 11], [-17, 3], [17, 3]]) planterTree(p, x, y, z, 1.5);
  ceilingLights(p, L0H - 0.12, -19, 19, 7, 12, 3);
}

function conferenceInterior(p, y, h) {
  const fy = y + 0.3;
  p.span(M.timber, -6, fy, 8.5, 6, fy + 0.76, 11).span(M.furnDark, -5.5, fy, 9.2, 5.5, fy + 0.7, 10.3);
  for (let x = -5; x <= 5; x += 1.4) for (const z of [7.9, 11.6]) p.add(M.furnDark, place(new THREE.BoxGeometry(0.55, 0.95, 0.55), x, fy + 0.47, z));
  for (const x of [-16, 16]) {
    p.span(M.furnWhite, x - 3, fy, 9, x + 3, fy + 0.75, 11);
    for (let xx = x - 2.4; xx <= x + 2.4; xx += 1.2) for (const z of [8.3, 11.7]) p.add(M.furnDark, place(new THREE.BoxGeometry(0.5, 0.9, 0.5), xx, fy + 0.45, z));
  }
  p.span(M.balustrade, -7.5, fy, 7, -7.4, y + h - 0.05, 14).span(M.balustrade, 7.4, fy, 7, 7.5, y + h - 0.05, 14);
  ceilingLights(p, y + h - 0.1, -20, 20, 7.5, 13, 2.6);
  ceilingLights(p, y + h - 0.1, -20, 20, -14, -9, 2.6);
}

function officeInterior(p, y, h, k) {
  const fy = y + 0.3;
  const exec = k >= 10;
  if (exec) {
    for (const x of [-11, -4, 4, 11]) {
      p.span(M.timber, x - 1.1, fy, 5.2, x + 1.1, fy + 0.76, 6.2);
      p.add(M.furnDark, place(new THREE.BoxGeometry(0.6, 1.05, 0.6), x, fy + 0.52, 4.4));
      p.span(M.fabric, x - 1.2, fy, 1.0 + 1.6, x + 1.2, fy + 0.45, 1.9 + 1.6);
    }
    p.span(M.timber, -3.5, fy, -10.6, 3.5, fy + 0.76, -8.6);
    for (let x = -3; x <= 3; x += 1.2) for (const z of [-11.2, -8]) p.add(M.furnDark, place(new THREE.BoxGeometry(0.5, 0.95, 0.5), x, fy + 0.47, z));
    for (const z of [-4, 0]) for (const s of [-1, 1]) p.span(M.balustrade, s * 7.5 - 0.04, fy, z - 2, s * 7.5 + 0.04, y + h - 0.05, z + 2);
  } else {
    for (let x = -12; x <= 12; x += 3.4) {
      desk(p, x, fy, 6.8, Math.PI); desk(p, x, fy, 5.2, 0);
      desk(p, x, fy, -10.6, 0); desk(p, x, fy, -9.0, Math.PI);
    }
    for (const s of [-1, 1]) for (let z = -6; z <= 1; z += 2.6) desk(p, s * 11.5, fy, z, s * Math.PI / 2);
  }
  for (const [x, z] of [[-13.4, 7.8], [13.4, 7.8], [-13.4, -11.8], [13.4, -11.8]]) planterTree(p, x, fy, z, 0.9);
  ceilingLights(p, y + h - 0.12, -13, 13, 4, 7.5, 2.6);
  ceilingLights(p, y + h - 0.12, -13, 13, -11.5, -8, 2.6);
  ceilingLights(p, y + h - 0.12, -13, -8, -6, 1.5, 2.6);
  ceilingLights(p, y + h - 0.12, 8, 13, -6, 1.5, 2.6);
}

/* Rooftop configurations (stage 7) ------------------------------------------ */
function roofGardens(P, ry) {
  const zFront0 = -4.2, zFront1 = TOW.z1 - 0.6;

  const garden = new Piece("roof-garden", extras(7, 0.6, { level: 12, config: "roof", variant: "garden", isDefault: true, phase: "roof" }));
  garden.span(M.timber, -TOW.x + 0.6, ry, zFront0, TOW.x - 0.6, ry + 0.12, zFront1);
  garden.span(M.grass, -13.5, ry + 0.12, zFront0 + 0.4, -6, ry + 0.16, zFront1 - 0.4);
  for (const x of [-12, -8]) { garden.span(M.planter, x - 1.6, ry + 0.12, -12.4, x + 1.6, ry + 0.8, -10.6); garden.add(M.shrub, place(SHRUB.clone(), x - 0.6, ry + 0.8, -11.5)); garden.add(M.shrub, place(SHRUB.clone(), x + 0.6, ry + 0.8, -11.5)); }
  for (const [x, z] of [[-11, 6.5], [-8, 1], [12.5, 6.5]]) {
    garden.span(M.planter, x - 0.9, ry + 0.12, z - 0.9, x + 0.9, ry + 0.9, z + 0.9);
    garden.add(M.bark, place(new THREE.CylinderGeometry(0.08, 0.12, 1.6, 6), x, ry + 1.7, z));
    garden.add(M.foliage, place(new THREE.IcosahedronGeometry(1.1, 1), x, ry + 3.1, z));
  }
  // pergola with lounge seating
  for (const [x, z] of [[2, -3], [12, -3], [2, 7], [12, 7]]) garden.span(M.frame, x - 0.1, ry + 0.12, z - 0.1, x + 0.1, ry + 3.1, z + 0.1);
  garden.span(M.frame, 1.8, ry + 3.0, -3.1, 12.2, ry + 3.15, -2.9).span(M.frame, 1.8, ry + 3.0, 6.9, 12.2, ry + 3.15, 7.1);
  for (let x = 2.2; x <= 11.9; x += 0.55) garden.span(M.timber, x - 0.06, ry + 3.15, -3.1, x + 0.06, ry + 3.27, 7.1);
  for (const [x, z] of [[4.5, 0.5], [9.5, 0.5], [4.5, 4.5], [9.5, 4.5]]) {
    garden.span(M.fabric, x - 1.3, ry + 0.12, z - 0.4, x + 1.3, ry + 0.55, z + 0.4).span(M.fabric, x - 1.3, ry + 0.55, z - 0.4, x + 1.3, ry + 0.95, z - 0.2);
  }
  garden.cyl(M.frame, 0.6, 0.42, 7, ry + 0.12, 2.5, 20);
  P.push(garden);

  const pool = new Piece("roof-pool", extras(7, 0.6, { level: 12, config: "roof", variant: "pool", phase: "roof" }));
  pool.span(M.floor, -TOW.x + 0.6, ry, zFront0, TOW.x - 0.6, ry + 0.12, zFront1);
  pool.span(M.cladding, -10.5, ry + 0.12, -0.3, 10.5, ry + 0.45, 4.3).span(M.water, -10, ry + 0.2, 0.2, 10, ry + 0.4, 3.8);
  for (let x = -9; x <= 9; x += 3) {
    pool.span(M.furnWhite, x - 0.35, ry + 0.12, 5.4, x + 0.35, ry + 0.42, 7.2).span(M.furnWhite, x - 0.35, ry + 0.42, 7.0, x + 0.35, ry + 0.8, 7.3);
  }
  for (const x of [-7.5, 1.5]) { pool.span(M.steel, x - 0.03, ry + 0.12, 6.3, x + 0.03, ry + 2.6, 6.36); pool.add(M.fabric, place(new THREE.ConeGeometry(1.6, 0.5, 8), x, ry + 2.7, 6.33)); }
  for (const x of [-12.5, 12.5]) { pool.span(M.planter, x - 1, ry + 0.12, -3.5, x + 1, ry + 0.9, 7.5); pool.add(M.shrub, place(SHRUB.clone(), x, ry + 0.9, 0)); pool.add(M.shrub, place(SHRUB.clone(), x, ry + 0.9, 4)); }
  P.push(pool);

  const solar = new Piece("roof-solar", extras(7, 0.6, { level: 12, config: "roof", variant: "solar", phase: "roof" }));
  solar.span(M.floor, -TOW.x + 0.6, ry, 4, TOW.x - 0.6, ry + 0.12, zFront1);
  for (let row = 0; row < 4; row++) for (let x = -12; x <= 12; x += 4.2) solar.add(M.pv, place(new THREE.BoxGeometry(4, 0.05, 1.6), x, ry + 0.75, -3.6 + row * 2.1, -0.32));
  for (let row = 0; row < 4; row++) solar.span(M.steel, -14, ry + 0.12, -3.6 + row * 2.1 - 0.05, 14, ry + 0.4, -3.6 + row * 2.1 + 0.05);
  for (let x = -12; x <= 12; x += 4) solar.span(M.planter, x - 1.4, ry + 0.12, 5.2, x + 1.4, ry + 0.7, 7.6).add(M.shrub, place(SHRUB.clone(), x, ry + 0.7, 6.4));
  P.push(solar);
}

function podiumTerrace(P) {
  const y = levelBase(2) + 0.3;
  const t = new Piece("podium-terrace", extras(7, 0.4, { level: 2 }));
  t.span(M.timber, -POD.x + 0.6, y, TOW.z1 + 0.5, POD.x - 0.6, y + 0.1, POD.z1 - 0.6);
  for (const x of [-18, -9, 9, 18]) {
    t.span(M.planter, x - 2, y, 13.4, x + 2, y + 0.75, 15);
    t.add(M.shrub, place(SHRUB.clone(), x - 1, y + 0.75, 14.2)).add(M.shrub, place(SHRUB.clone(), x + 1, y + 0.75, 14.2));
  }
  for (const s of [-1, 1]) for (const z of [-10, -2, 6]) { t.span(M.planter, s * 19 - 1.5, y, z - 1.5, s * 19 + 1.5, y + 0.75, z + 1.5); t.add(M.foliage, place(new THREE.IcosahedronGeometry(1.2, 1), s * 19, y + 2.1, z)); t.add(M.bark, place(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 6), s * 19, y + 1.2, z)); }
  for (const x of [-12, -4, 4, 12]) t.geo(M.timber, place(BENCH.clone(), x, y + 0.1, 11.5));
  P.push(t);
}

/* Site landscaping (stage 7) --------------------------------------------------- */
function site(P) {
  const s = new Piece("landscape-plaza", extras(7, 0.2, { landscape: true }));
  s.span(M.paving, -27, 0, 16, 27, 0.08, 33);
  s.span(M.paving, -27, 0, -20, -22.3, 0.08, 16).span(M.paving, 22.3, 0, -20, 27, 0.08, 16).span(M.paving, -27, 0, -22, 27, 0.08, -16.3);
  // reflecting pool with fountain jets
  s.span(M.cladding, -11, 0.08, 24, 11, 0.5, 29.6).span(M.water, -10.5, 0.15, 24.5, 10.5, 0.46, 29.1);
  for (let x = -9; x <= 9; x += 2) s.cyl(M.lamp, 0.04, 0.9 + (Math.abs(x) % 4 === 0 ? 0.6 : 0), x, 0.46, 26.8, 6, 0.02);
  // planters, lawns
  for (const x of [-21, 21]) s.span(M.planter, x - 4, 0.08, 18, x + 4, 0.6, 30).span(M.grass, x - 3.8, 0.6, 18.2, x + 3.8, 0.66, 29.8);
  for (const x of [-16, 16]) s.span(M.grass, x - 3, 0.08, 18.5, x + 3, 0.14, 22.5);
  addTrees(s, [[-21, 0.66, 20, 0.4, 1.0], [-21, 0.66, 27, 2.1, 0.9], [21, 0.66, 20, 1.2, 0.95], [21, 0.66, 27, 3.0, 1.05]], "round");
  addTrees(s, [[-24.5, 0.08, -18, 0, 0.9], [-24.5, 0.08, -8, 0, 1], [-24.5, 0.08, 2, 0, 0.95], [-24.5, 0.08, 12, 0, 1], [24.5, 0.08, -18, 0, 1], [24.5, 0.08, -8, 0, 0.9], [24.5, 0.08, 2, 0, 1.05], [24.5, 0.08, 12, 0, 0.95]], "cypress");
  s.object(instanced("plaza-benches", BENCH.clone(), M.timber, [[-14, 0.08, 23.2, 0], [14, 0.08, 23.2, 0], [-14, 0.08, 31, Math.PI], [14, 0.08, 31, Math.PI], [-6, 0.08, 31, Math.PI], [6, 0.08, 31, Math.PI]]));
  const plazaShrubs = [[-16, 0.14, 19.5], [-14.5, 0.14, 21.5], [-17.5, 0.14, 21.8], [16, 0.14, 19.5], [14.5, 0.14, 21.5], [17.5, 0.14, 21.8], [-19, 0.66, 23.5], [19, 0.66, 23.5], [-23, 0.66, 24], [23, 0.66, 24]];
  s.object(instanced("plaza-shrubs", SHRUB.clone(), M.shrub, plazaShrubs, { foliage: "shrub", items: plazaShrubs }));
  P.push(s);
}

/* Architectural lighting (stage 8) ------------------------------------------- */
function lighting(P) {
  const l = new Piece("lighting", extras(8, 0, { lighting: true }));
  // canopy downlights
  for (let x = -6; x <= 6; x += 3) for (const z of [17.5, 19.5, 21.5]) l.cyl(M.lamp, 0.16, 0.03, x, 4.52, z, 12);
  // vertical corner LED fins on the tower
  for (const [x, z] of [[-TOW.x, TOW.z1], [TOW.x, TOW.z1], [-TOW.x, TOW.z0], [TOW.x, TOW.z0]]) {
    const sx = Math.sign(x), sz = Math.sign(z);
    l.span(M.led, x + sx * 0.3, levelBase(2), z + sz * 0.3 - 0.04, x + sx * 0.34, ROOF_Y + 1.6, z + sz * 0.3 + 0.04);
  }
  // roof parapet and podium edge LED lines
  l.span(M.led, -TOW.x - 0.16, ROOF_Y + 0.42, TOW.z1 + 0.13, TOW.x + 0.16, ROOF_Y + 0.48, TOW.z1 + 0.17);
  l.span(M.led, -POD.x - 0.21, levelBase(2) + 0.25, POD.z1 + 0.19, POD.x + 0.21, levelBase(2) + 0.31, POD.z1 + 0.23);
  // colonnade uplights and plaza bollards
  for (let x = -20; x <= 20; x += 8) l.span(M.led, x - 0.25, 0.08, 15.9, x + 0.25, 0.14, 16.2);
  for (const x of [-26, -18, -10, 10, 18, 26]) { l.cyl(M.steel, 0.09, 0.9, x, 0.08, 32.4, 10); l.cyl(M.lamp, 0.1, 0.12, x, 0.98, 32.4, 10); }
  // signage band above the entrance
  l.span(M.led, -4.5, 3.9, 13.1, 4.5, 4.0, 13.18);
  P.push(l);
}

/* ============================================================== ENVIRONMENT */
function environment() {
  const root = new THREE.Group();
  root.name = "environment";
  const e = new Piece("env-static", { env: true });

  e.span(M.ground, -700, -0.12, -700, 700, -0.02, 700);
  // main road (along x) and side road (along z)
  e.span(M.asphalt, -700, -0.02, 38, 700, 0.02, 52).span(M.asphalt, 52, -0.02, -700, 62, 0.02, 38);
  for (let x = -690; x < 690; x += 6) if (x < 50 || x > 64) e.span(M.marking, x, 0.02, 44.9, x + 3, 0.03, 45.1);
  for (let z = -690; z < 36; z += 6) e.span(M.marking, 56.9, 0.02, z, 57.1, 0.03, z + 3);
  for (let x = -6; x <= 6; x += 1.2) e.span(M.marking, x, 0.02, 39, x + 0.6, 0.03, 51);
  // sidewalks and kerbs
  e.span(M.paving, -700, -0.02, 33, 52, 0.12, 38).span(M.paving, -700, -0.02, 52, 700, 0.12, 57).span(M.paving, 62, -0.02, -700, 67, 0.12, 38).span(M.paving, 47, -0.02, -700, 52, 0.12, 33);
  e.span(M.kerb, -700, -0.02, 37.8, 52, 0.16, 38.05).span(M.kerb, -700, -0.02, 51.95, 700, 0.16, 52.2);
  // parking lot with bays and basement ramp
  e.span(M.asphalt, -64, -0.02, -26, -30, 0.03, 31);
  for (let z = -24; z <= 28; z += 2.6) { e.span(M.marking, -63, 0.03, z, -57, 0.04, z + 0.1); e.span(M.marking, -37, 0.03, z, -31, 0.04, z + 0.1); }
  for (let z = -24; z <= 28; z += 2.6) { e.span(M.marking, -50, 0.03, z, -44, 0.04, z + 0.1); }
  e.span(M.kerb, -50.2, 0.03, -24, -43.8, 0.2, 28.2).span(M.grass, -49.8, 0.2, -23.6, -44.2, 0.24, 27.8);
  e.span(M.concrete, -30, -0.02, -12, -29.6, 1.2, 6).span(M.concrete, -26.4, -0.02, -12, -26, 1.2, 6).span(M.nDark, -29.6, 0.0, -12, -26.4, 0.05, 6);
  e.span(M.steel, -30.2, 0.9, 6, -25.8, 1.2, 6.3).span(M.crane, -29.5, 1.0, 7.5, -26.5, 1.08, 7.6).box(M.steel, 0.3, 1.1, 0.3, -29.8, 0, 7.55);
  // gardens east of the site
  e.span(M.grass, 28, -0.02, -26, 46, 0.06, 32);
  e.span(M.paving, 28, -0.02, 2, 46, 0.08, 4.5).span(M.paving, 36, -0.02, -26, 38.5, 0.08, 32);
  for (const [x0, z0, x1, z1] of [[29, -24, 35, -22.8], [39.5, -24, 45, -22.8], [29, 28.8, 35, 30], [39.5, 28.8, 45, 30]]) e.span(M.shrub, x0, 0.06, z0, x1, 0.9, z1);
  root.add(e.build());

  // trees
  const trees = [];
  for (let z = -22; z <= 28; z += 8) { trees.push([31, 0.06, z + rr(-1, 1), rnd() * 6, rr(0.85, 1.15)]); trees.push([43, 0.06, z + rr(-1, 1), rnd() * 6, rr(0.85, 1.15)]); }
  for (let x = -120; x <= 140; x += 14) { if (Math.abs(x) < 14) continue; trees.push([x + rr(-2, 2), 0.12, 35.5, rnd() * 6, rr(0.8, 1.1)]); trees.push([x + rr(-2, 2), 0.12, 54.5, rnd() * 6, rr(0.8, 1.1)]); }
  for (let z = -22; z <= 26; z += 8) trees.push([-47, 0.24, z, rnd() * 6, rr(0.7, 0.9)]);
  for (let z = -160; z <= 30; z += 16) trees.push([64.5, 0.12, z, rnd() * 6, rr(0.85, 1.1)]);
  const g = new Piece("env-trees", { env: true, landscape: true });
  addTrees(g, trees, "round");
  const envShrubs = Array.from({ length: 60 }, () => [rr(29, 45), 0.06, rr(-20, 28), rnd() * 6, rr(0.7, 1.4)]).filter(([x]) => Math.abs(x - 37.2) > 2).map((a) => a.map((v) => +v.toFixed(3)));
  g.object(instanced("env-shrubs", SHRUB.clone(), M.shrub, envShrubs, { foliage: "shrub", items: envShrubs }));
  root.add(g.build());

  // streetlights and benches
  const lightsPos = [];
  for (let x = -150; x <= 150; x += 24) { lightsPos.push([x, 0.12, 36.8, 0]); lightsPos.push([x + 12, 0.12, 53.2, Math.PI]); }
  for (let z = -150; z <= 20; z += 24) lightsPos.push([63.2, 0.12, z, -Math.PI / 2]);
  const pole = mergeGeometries([
    place(new THREE.CylinderGeometry(0.07, 0.11, 8, 8), 0, 4, 0),
    place(new THREE.BoxGeometry(0.1, 0.1, 1.8), 0, 7.95, 0.9),
    place(new THREE.BoxGeometry(0.5, 0.12, 0.9), 0, 7.9, 1.7),
  ]);
  const head = place(new THREE.BoxGeometry(0.42, 0.03, 0.8), 0, 7.83, 1.7);
  const sl = new Piece("env-streetlights", { env: true, streetlights: true });
  sl.object(instanced("streetlight-poles", pole, M.steel, lightsPos));
  sl.object(instanced("streetlight-lamps", head, M.lamp, lightsPos));
  sl.object(instanced("garden-benches", BENCH.clone(), M.timber, [[33, 0.06, 1, 0], [41, 0.06, 1, 0], [33, 0.06, 5.5, Math.PI], [41, 0.06, 5.5, Math.PI]]));
  root.add(sl.build());

  // cars: parked and on the road
  const cars = carGeometries();
  const spots = [];
  for (let z = -22.7; z <= 27; z += 2.6) {
    if (rnd() < 0.62) spots.push([-60, 0.03, z, Math.PI / 2]);
    if (rnd() < 0.55) spots.push([-47.5 - 0.2, 0.03, z, -Math.PI / 2, 1]);
    if (rnd() < 0.62) spots.push([-34, 0.03, z, -Math.PI / 2]);
  }
  const road = [[-80, 0.02, 41.5, Math.PI / 2], [-35, 0.02, 48.5, -Math.PI / 2], [18, 0.02, 41.5, Math.PI / 2], [70, 0.02, 48.5, -Math.PI / 2], [57, 0.02, -40, 0], [-140, 0.02, 48.5, -Math.PI / 2]];
  const all = spots.concat(road);
  const groups = [[], [], [], []];
  all.forEach((c, i) => groups[i % 4].push(c));
  const cp = new Piece("env-cars", { env: true });
  groups.forEach((list, i) => {
    cp.object(instanced(`cars-body-${i}`, cars.body.clone(), M.paints[i], list));
    cp.object(instanced(`cars-glass-${i}`, cars.glass.clone(), M.carGlass, list));
    cp.object(instanced(`cars-wheels-${i}`, cars.wheels.clone(), M.rubber, list));
  });
  root.add(cp.build());

  // neighbouring buildings
  const nb = new Piece("env-neighbours", { env: true, neighbours: true });
  const blocks = [
    [-40, 74, 30, 20, 16], [0, 165, 40, 26, 30], [44, 76, 26, 20, 18], [100, 76, 30, 24, 32],
    [100, 10, 26, 30, 20], [104, -44, 30, 26, 28], [100, -100, 34, 30, 44], [10, -78, 40, 24, 18],
    [-48, -78, 30, 26, 26], [-108, -44, 28, 34, 14], [-110, 22, 30, 26, 30], [-104, 84, 26, 24, 22],
    [160, 76, 30, 24, 26], [-160, 86, 28, 24, 38], [44, -140, 30, 30, 52], [-64, -150, 34, 24, 36],
  ];
  blocks.forEach(([x, z, w, d, h], i) => {
    const body = i % 3 === 0 ? M.nGlass : i % 3 === 1 ? M.nStone : M.nDark;
    nb.span(body, x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2);
    nb.span(M.nDark, x - w / 2 - 0.3, h, z - d / 2 - 0.3, x + w / 2 + 0.3, h + 0.8, z + d / 2 + 0.3);
    if (body !== M.nGlass) for (let yy = 3.5; yy < h - 1; yy += 3.6) nb.span(M.nGlass, x - w / 2 - 0.05, yy, z - d / 2 - 0.05, x + w / 2 + 0.05, yy + 1.8, z + d / 2 + 0.05);
  });
  root.add(nb.build());

  // distant skyline
  const sk = new Piece("env-skyline", { env: true, skyline: true });
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2 + rr(-0.02, 0.02);
    const r = rr(430, 900);
    const w = rr(18, 40), h = rnd() < 0.12 ? rr(90, 150) : rr(22, 70);
    sk.add(M.skyline, place(new THREE.BoxGeometry(w, h, w * rr(0.7, 1.2)), Math.cos(a) * r, h / 2, Math.sin(a) * r, 0, rnd() * 3));
  }
  root.add(sk.build());
  return root;
}

function carGeometries() {
  const s = new THREE.Shape();
  [[-2.3, 0.32], [2.3, 0.32], [2.32, 0.72], [2.05, 0.86], [1.1, 0.98], [0.45, 1.42], [-1.15, 1.44], [-1.95, 1.02], [-2.32, 0.92]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  const body = new THREE.ExtrudeGeometry(s, { depth: 1.76, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
  body.translate(0, 0, -0.88);
  const w = new THREE.Shape();
  [[1.0, 1.0], [0.42, 1.38], [-1.1, 1.4], [-1.82, 1.04]].forEach(([x, y], i) => (i ? w.lineTo(x, y) : w.moveTo(x, y)));
  w.closePath();
  const glass = new THREE.ExtrudeGeometry(w, { depth: 1.84, bevelEnabled: false });
  glass.translate(0, 0, -0.92);
  const wheels = mergeGeometries([[-1.45, -0.82], [-1.45, 0.82], [1.45, -0.82], [1.45, 0.82]].map(([x, z]) =>
    place(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16), x, 0.34, z, Math.PI / 2, 0, 0)));
  // rotate so the car's length runs along local z
  for (const g of [body, glass, wheels]) g.rotateY(Math.PI / 2);
  return { body: body.toNonIndexed(), glass: glass.toNonIndexed(), wheels };
}

/* ================================================================== EXPORT */
const here = path.dirname(fileURLToPath(import.meta.url));
const raw = path.resolve(here, "build");
mkdirSync(raw, { recursive: true });
const exporter = new GLTFExporter();

async function save(file, object) {
  const scene = new THREE.Scene();
  scene.add(object);
  const glb = await exporter.parseAsync(scene, { binary: true });
  writeFileSync(path.join(raw, file), Buffer.from(glb));
  console.log(`${file}  ${(glb.byteLength / 1024).toFixed(0)} KB (uncompressed)`);
}

const b = new THREE.Group();
b.name = "the-sandton-exchange";
b.userData = { title: "The Sandton Exchange", explodeGap: 2.6, roofY: ROOF_Y, levels: LEVELS + 1 };
building().forEach((p) => b.add(p.build()));
await save("commercial.glb", b);
await save("environment.glb", environment());
