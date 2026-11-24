/**
 * Oakridge Construction: original procedural building models.
 *
 * Generates three lightweight GLB files (residential, commercial, industrial)
 * for the 3D viewer. Every model is built from simple geometry in this script,
 * so it is entirely original work, with no third-party assets.
 *
 * Each model is split into "pieces" (groups) carrying extras:
 *   { phase: foundation | frame | facade | roof | site | crane, level: n }
 * The website uses them for scroll-driven construction and the exploded view.
 * Empty nodes named "hs_*" mark hotspot positions.
 *
 * Usage:  cd tools && npm install && node generate-models.mjs
 */
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Minimal FileReader so GLTFExporter can produce binary output in Node.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => { this.result = buf; this.onloadend && this.onloadend(); this.onload && this.onload({ target: this }); });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = "data:application/octet-stream;base64," + Buffer.from(buf).toString("base64");
      this.onloadend && this.onloadend(); this.onload && this.onload({ target: this });
    });
  }
};

/* Materials: realistic architectural palette ----------------------------- */
const M = {
  concrete:  new THREE.MeshStandardMaterial({ name: "concrete",  color: 0xb9b2a6, roughness: 0.92, metalness: 0 }),
  concreteDk:new THREE.MeshStandardMaterial({ name: "concrete-dark", color: 0x7d776e, roughness: 0.95, metalness: 0 }),
  render:    new THREE.MeshStandardMaterial({ name: "render",    color: 0xf1ece2, roughness: 0.88, metalness: 0 }),
  glass:     new THREE.MeshStandardMaterial({ name: "glass",     color: 0x2a3640, roughness: 0.06, metalness: 0.92 }),
  glassWarm: new THREE.MeshStandardMaterial({ name: "glass-warm",color: 0x2f3236, roughness: 0.08, metalness: 0.85, emissive: 0x6b4418, emissiveIntensity: 1 }),
  bronze:    new THREE.MeshStandardMaterial({ name: "bronze",    color: 0xb58b52, roughness: 0.32, metalness: 0.85 }),
  steel:     new THREE.MeshStandardMaterial({ name: "steel",     color: 0x2b2b2b, roughness: 0.45, metalness: 0.7 }),
  cladding:  new THREE.MeshStandardMaterial({ name: "cladding",  color: 0x3a3a3a, roughness: 0.55, metalness: 0.55 }),
  roofSheet: new THREE.MeshStandardMaterial({ name: "roof-sheet",color: 0xa8a39a, roughness: 0.5, metalness: 0.6 }),
  timber:    new THREE.MeshStandardMaterial({ name: "timber",    color: 0x8a5d3b, roughness: 0.72, metalness: 0 }),
  stone:     new THREE.MeshStandardMaterial({ name: "stone",     color: 0xd8d0c0, roughness: 0.9, metalness: 0 }),
  asphalt:   new THREE.MeshStandardMaterial({ name: "asphalt",   color: 0x3b3b3b, roughness: 0.95, metalness: 0 }),
  grass:     new THREE.MeshStandardMaterial({ name: "grass",     color: 0x5f6b45, roughness: 1, metalness: 0 }),
  foliage:   new THREE.MeshStandardMaterial({ name: "foliage",   color: 0x4f5a37, roughness: 0.9, metalness: 0, flatShading: true }),
  bark:      new THREE.MeshStandardMaterial({ name: "bark",      color: 0x5b4636, roughness: 1, metalness: 0 }),
  water:     new THREE.MeshStandardMaterial({ name: "water",     color: 0x3f6a78, roughness: 0.05, metalness: 0.4 }),
  crane:     new THREE.MeshStandardMaterial({ name: "crane",     color: 0xb58b52, roughness: 0.5, metalness: 0.4 }),
  white:     new THREE.MeshStandardMaterial({ name: "white",     color: 0xf4f1ea, roughness: 0.6, metalness: 0.1 }),
};

/* Piece: collects geometry per material, then merges to one mesh each ----- */
class Piece {
  constructor(name, phase, level, baseY = 0) {
    this.name = name; this.phase = phase; this.level = level; this.baseY = baseY;
    this.parts = new Map(); this.empties = [];
  }
  /** Box by bottom-centre position (x, y, z are relative to piece base). */
  box(mat, w, h, d, x = 0, y = 0, z = 0, rot = null) {
    const g = new THREE.BoxGeometry(w, h, d);
    const o = new THREE.Object3D();
    o.position.set(x, y + h / 2, z);
    if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
    o.updateMatrix();
    g.applyMatrix4(o.matrix);
    return this.add(mat, g);
  }
  geo(mat, g, x = 0, y = 0, z = 0, rot = null, scale = null) {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
    if (scale) o.scale.set(scale[0], scale[1], scale[2]);
    o.updateMatrix();
    g.applyMatrix4(o.matrix);
    return this.add(mat, g);
  }
  add(mat, g) {
    // Faceted architecture: drop UVs and normals and weld vertices. GLTFLoader
    // switches to flat shading when normals are absent, so files stay small.
    g.deleteAttribute("uv");
    g.deleteAttribute("normal");
    g = mergeVertices(g);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(g);
    return this;
  }
  hotspot(name, x, y, z) { this.empties.push([name, x, y, z]); return this; }
  build() {
    const group = new THREE.Group();
    group.name = this.name;
    group.position.y = this.baseY;
    group.userData = { phase: this.phase, level: this.level };
    for (const [mat, geos] of this.parts) {
      const merged = mergeGeometries(geos, false);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = `${this.name}-${mat.name}`;
      group.add(mesh);
    }
    for (const [n, x, y, z] of this.empties) {
      const e = new THREE.Object3D(); e.name = n; e.position.set(x, y, z); group.add(e);
    }
    return group;
  }
}

function tree(p, x, z, s = 1) {
  p.geo(M.bark, new THREE.CylinderGeometry(0.18 * s, 0.25 * s, 2.4 * s, 6), x, 1.2 * s, z);
  p.geo(M.foliage, new THREE.IcosahedronGeometry(1.9 * s, 0), x, 3.6 * s, z, [0.3, x, 0.2], [1, 1.15, 1]);
}

function model(name, pieces, extras) {
  const root = new THREE.Group();
  root.name = name;
  root.userData = extras;
  pieces.forEach((p) => root.add(p.build()));
  return root;
}

/* ===================================================== COMMERCIAL TOWER === */
function commercial() {
  const P = [];
  // Foundation raft
  P.push(new Piece("foundation", "foundation", 0, -1.2)
    .box(M.concreteDk, 42, 1.2, 36));

  // Podium: two storeys of 5 m
  for (let k = 0; k < 2; k++) {
    const y = k * 5;
    const f = new Piece(`frame_L${k}`, "frame", k + 1, y).box(M.concrete, 40, 0.45, 34);
    for (let ix = -3; ix <= 3; ix++) for (let iz = -2; iz <= 2; iz++)
      if (Math.abs(ix) === 3 || Math.abs(iz) === 2) f.box(M.concrete, 0.7, 5, 0.7, ix * 6.3, 0, iz * 7.9);
    P.push(f);
    const fa = new Piece(`facade_L${k}`, "facade", k + 1, y).box(M.glassWarm, 38.6, 4.4, 32.6, 0, 0.45, 0);
    for (let i = -9; i <= 9; i++) fa.box(M.bronze, 0.14, 4.4, 0.5, i * 2.1, 0.45, 16.5);
    if (k === 0) fa.box(M.bronze, 18, 0.35, 5, 0, 4.2, 18.6).hotspot("hs_podium", 0, 3, 19);
    P.push(fa);
  }
  // Tower floors
  const floors = 12, fh = 3.8, base = 10;
  for (let k = 0; k < floors; k++) {
    const y = base + k * fh;
    const w = k >= 9 ? 22 : 26;              // upper setback
    const f = new Piece(`frame_L${k + 2}`, "frame", k + 3, y)
      .box(M.concrete, w, 0.38, w)
      .box(M.concreteDk, 9, fh, 9);           // core
    const c = w / 2 - 0.6;
    for (let i = -2; i <= 2; i++) {
      const t = (i / 2) * c;
      f.box(M.concrete, 0.55, fh, 0.55, t, 0, c).box(M.concrete, 0.55, fh, 0.55, t, 0, -c)
       .box(M.concrete, 0.55, fh, 0.55, c, 0, t).box(M.concrete, 0.55, fh, 0.55, -c, 0, t);
    }
    if (k === 6) f.hotspot("hs_core", 0, fh, 0);
    P.push(f);

    const fa = new Piece(`facade_L${k + 2}`, "facade", k + 3, y)
      .box(M.glass, w - 0.4, fh - 0.38, w - 0.4, 0, 0.38, 0);
    const n = 7, half = (w - 0.4) / 2;
    for (let i = 0; i < n; i++) {
      const t = -half + 1 + (i * (w - 2.4)) / (n - 1);
      fa.box(M.bronze, 0.16, fh - 0.38, 0.8, t, 0.38, half + 0.4)
        .box(M.bronze, 0.16, fh - 0.38, 0.8, t, 0.38, -half - 0.4)
        .box(M.bronze, 0.8, fh - 0.38, 0.16, half + 0.4, 0.38, t)
        .box(M.bronze, 0.8, fh - 0.38, 0.16, -half - 0.4, 0.38, t);
    }
    if (k === 4) fa.hotspot("hs_facade", half + 0.9, fh / 2, 0);
    P.push(fa);
  }
  // Roof crown
  const top = base + floors * fh;
  const r = new Piece("roof", "roof", floors + 3, top)
    .box(M.concrete, 22, 0.5, 22)
    .box(M.steel, 11, 3, 11, 0, 0.5, 0);
  for (const [x, z] of [[-10.6, -10.6], [10.6, -10.6], [-10.6, 10.6], [10.6, 10.6]]) r.box(M.bronze, 0.4, 7, 0.4, x, 0.5, z);
  r.box(M.bronze, 21.6, 0.4, 0.4, 0, 7.1, -10.6).box(M.bronze, 21.6, 0.4, 0.4, 0, 7.1, 10.6)
   .box(M.bronze, 0.4, 0.4, 21.6, -10.6, 7.1, 0).box(M.bronze, 0.4, 0.4, 21.6, 10.6, 7.1, 0)
   .hotspot("hs_crown", 0, 8, 0);
  P.push(r);

  // Landscaped plaza
  const s = new Piece("site", "site", -1, 0)
    .box(M.stone, 70, 0.12, 56, 0, -0.12, 0)
    .box(M.water, 16, 0.18, 3, 0, -0.06, 23);
  for (const [x, z] of [[-28, 22], [-20, 24], [20, 24], [28, 22], [-30, -6], [30, -6], [-30, 8], [30, 8], [-24, -22], [24, -22]]) tree(s, x, z, 1.1);
  P.push(s);

  // Tower crane (visible during construction only)
  const cr = new Piece("crane", "crane", -1, 0);
  const mx = 25, mz = -6, mh = 72;
  for (let y = 0; y < mh; y += 4.5) {
    cr.box(M.crane, 1.6, 0.12, 0.12, mx, y, mz - 0.8).box(M.crane, 1.6, 0.12, 0.12, mx, y, mz + 0.8)
      .box(M.crane, 0.12, 0.12, 1.6, mx - 0.8, y, mz).box(M.crane, 0.12, 0.12, 1.6, mx + 0.8, y, mz);
  }
  for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) cr.box(M.crane, 0.18, mh, 0.18, mx + dx, 0, mz + dz);
  cr.box(M.crane, 46, 1, 1, mx - 16, mh, mz).box(M.steel, 5, 2.4, 2.6, mx + 9, mh - 1.2, mz)
    .box(M.steel, 2.2, 2.2, 2.2, mx, mh - 2.6, mz + 1.6)
    .box(M.steel, 0.06, 14, 0.06, mx - 30, mh - 14, mz).box(M.steel, 1.4, 0.8, 1.4, mx - 30, mh - 14.8, mz);
  P.push(cr);

  return model("commercial", P, { title: "The Sandton Exchange", explodeGap: 2.4, height: top + 8 });
}

/* ===================================================== RESIDENTIAL VILLA == */
function residential() {
  const P = [];
  P.push(new Piece("foundation", "foundation", 0, -0.6).box(M.concreteDk, 24, 0.6, 15, 0, 0, -1)
    .box(M.concreteDk, 11, 0.6, 4.6, 2, 0, 9));

  // Ground floor
  const g = new Piece("frame_L0", "frame", 1, 0).box(M.stone, 22, 0.3, 13, 0, 0, -1)
    .box(M.render, 22, 3.4, 0.35, 0, 0.3, -7.3)
    .box(M.render, 0.35, 3.4, 13, -10.8, 0.3, -1)
    .box(M.render, 6, 3.4, 0.35, -7.8, 0.3, 5.3)
    .box(M.render, 0.35, 3.4, 6, 10.8, 0.3, -4.2)
    .box(M.steel, 0.25, 3.4, 0.25, 10.8, 0.3, 5.3).box(M.steel, 0.25, 3.4, 0.25, 4.8, 0.3, 5.3);
  P.push(g);
  P.push(new Piece("facade_L0", "facade", 1, 0)
    .box(M.glassWarm, 15.6, 3.3, 0.12, 2.9, 0.3, 5.35)
    .box(M.glassWarm, 0.12, 3.3, 7, 10.85, 0.3, 1.9)
    .box(M.steel, 15.6, 0.12, 0.2, 2.9, 3.48, 5.35)
    .hotspot("hs_glazing", 3, 1.8, 5.6));

  // Upper floor: cantilevered timber box
  const uy = 3.7;
  const u = new Piece("frame_L1", "frame", 2, uy).box(M.render, 17, 0.35, 9.5, 3.5, 0, -2.5)
    .box(M.render, 0.35, 3.2, 9.5, -4.8, 0.35, -2.5)
    .box(M.render, 0.35, 3.2, 9.5, 11.8, 0.35, -2.5);
  P.push(u);
  const uf = new Piece("facade_L1", "facade", 2, uy)
    .box(M.glass, 16.2, 2.9, 0.1, 3.5, 0.45, 2.2)
    .box(M.timber, 16.6, 3.2, 0.25, 3.5, 0.35, -7.2);
  for (let i = 0; i < 30; i++) uf.box(M.timber, 0.12, 3.1, 0.18, -4.3 + i * 0.55, 0.4, 2.45);
  uf.hotspot("hs_cantilever", 12.2, 1.6, -2.5);
  P.push(uf);

  // Roofs with bronze fascia
  const rf = new Piece("roof", "roof", 3, uy + 3.55)
    .box(M.white, 18.4, 0.35, 11, 3.5, 0, -2.4)
    .box(M.bronze, 18.6, 0.45, 0.12, 3.5, -0.05, 3.15)
    .box(M.bronze, 0.12, 0.45, 11, 12.75, -0.05, -2.4)
    .box(M.cladding, 4, 0.08, 2.2, 0, 0.35, -4).box(M.cladding, 4, 0.08, 2.2, 5, 0.35, -4)
    .hotspot("hs_roof", 2.5, 0.8, -4);
  P.push(rf);
  P.push(new Piece("roof_L0", "roof", 1.5, 3.7)
    .box(M.white, 7.2, 0.3, 7, -7.4, 0, 1.6)
    .box(M.bronze, 7.4, 0.4, 0.12, -7.4, -0.05, 5.15));

  // Pool, deck, lawn, trees
  const s = new Piece("site", "site", -1, 0)
    .box(M.grass, 40, 0.1, 34, 0, -0.1, 0)
    .box(M.timber, 13, 0.25, 5.5, 2, 0, 9.1)
    .box(M.stone, 12.2, 0.32, 0.4, 2, 0, 11.9)
    .box(M.water, 11, 0.28, 3.4, 2, 0, 9.6)
    .box(M.stone, 40, 0.9, 0.5, 0, 0, -16.8)
    .hotspot("hs_pool", 2, 0.6, 9.6);
  for (const [x, z, sc] of [[-14, -11, 1.2], [15, -12, 1], [-15, 10, 0.9], [16, 9, 1.1], [-12, 14, 0.7]]) tree(s, x, z, sc);
  P.push(s);

  return model("residential", P, { title: "Constantia Hill Villa", explodeGap: 3.2, height: 12 });
}

/* ===================================================== INDUSTRIAL PARK ==== */
function industrial() {
  const P = [];
  const L = 66, W = 38, H = 10, ridge = 2.4;
  P.push(new Piece("foundation", "foundation", 0, -0.6).box(M.concreteDk, L + 2, 0.6, W + 2));

  // Steel portal frames
  const f = new Piece("frame", "frame", 1, 0).box(M.concrete, L, 0.25, W);
  const pitch = Math.atan2(ridge, W / 2);
  const rafterLen = Math.hypot(W / 2, ridge);
  for (let i = 0; i <= 11; i++) {
    const x = -L / 2 + (i * L) / 11;
    f.box(M.steel, 0.5, H, 0.5, x, 0, W / 2 - 0.3).box(M.steel, 0.5, H, 0.5, x, 0, -W / 2 + 0.3);
    f.geo(M.steel, new THREE.BoxGeometry(0.45, 0.7, rafterLen), x, H + ridge / 2, W / 4, [pitch, 0, 0]);
    f.geo(M.steel, new THREE.BoxGeometry(0.45, 0.7, rafterLen), x, H + ridge / 2, -W / 4, [-pitch, 0, 0]);
  }
  f.hotspot("hs_frame", -L / 2 + 6, H + 1.2, 0);
  P.push(f);

  // Cladding with loading docks
  const c = new Piece("cladding", "facade", 2, 0)
    .box(M.cladding, L, H, 0.2, 0, 0, W / 2)
    .box(M.cladding, L, H, 0.2, 0, 0, -W / 2)
    .box(M.cladding, 0.2, H, W, -L / 2, 0, 0)
    .box(M.cladding, 0.2, H, W, L / 2, 0, 0)
    .box(M.bronze, L + 0.1, 0.7, 0.25, 0, H - 1.4, W / 2 + 0.02)
    .box(M.bronze, L + 0.1, 0.7, 0.25, 0, H - 1.4, -W / 2 - 0.02);
  const gable = new THREE.Shape();
  gable.moveTo(-W / 2, 0); gable.lineTo(W / 2, 0); gable.lineTo(0, ridge); gable.closePath();
  const gg = () => new THREE.ExtrudeGeometry(gable, { depth: 0.2, bevelEnabled: false });
  c.geo(M.cladding, gg(), -L / 2 - 0.1, H, 0, [0, Math.PI / 2, 0]);
  c.geo(M.cladding, gg(), L / 2 - 0.1, H, 0, [0, Math.PI / 2, 0]);
  // ribs on long walls
  for (let i = 0; i < 44; i++) {
    const x = -L / 2 + 0.75 + i * 1.5;
    c.box(M.steel, 0.12, H - 2, 0.12, x, 0, W / 2 + 0.16).box(M.steel, 0.12, H - 2, 0.12, x, 0, -W / 2 - 0.16);
  }
  for (let i = 0; i < 8; i++) {
    const x = -L / 2 + 8 + i * 6.6;
    c.box(M.steel, 3.6, 4.2, 0.3, x, 1.2, W / 2 + 0.2).box(M.concrete, 4.2, 1.2, 2.4, x, 0, W / 2 + 1.2);
  }
  c.box(M.white, L - 10, 0.3, 3.4, -4, 5.6, W / 2 + 1.8).hotspot("hs_docks", -10, 4, W / 2 + 2.6);
  P.push(c);

  // Two-storey glass office pavilion
  const ox = L / 2 + 5.5;
  P.push(new Piece("office_frame", "frame", 1, 0)
    .box(M.concrete, 11, 0.3, 18, ox, 0, 2).box(M.concrete, 11, 0.3, 18, ox, 3.8, 2)
    .box(M.concreteDk, 3, 7.6, 4, ox - 3.5, 0, -5));
  P.push(new Piece("office_facade", "facade", 2, 0)
    .box(M.glassWarm, 10.6, 3.4, 17.6, ox, 0.3, 2).box(M.glass, 10.6, 3.4, 17.6, ox, 4.1, 2)
    .box(M.bronze, 11.2, 0.4, 18.4, ox, 7.5, 2)
    .hotspot("hs_office", ox + 5.6, 3.8, 6));

  // Roof sheeting with skylights
  const rf = new Piece("roof", "roof", 3, H);
  rf.geo(M.roofSheet, new THREE.BoxGeometry(L + 1, 0.2, rafterLen + 0.6), 0, ridge / 2 + 0.45, W / 4, [pitch, 0, 0]);
  rf.geo(M.roofSheet, new THREE.BoxGeometry(L + 1, 0.2, rafterLen + 0.6), 0, ridge / 2 + 0.45, -W / 4, [-pitch, 0, 0]);
  for (let i = 0; i < 5; i++) {
    const x = -L / 2 + 8 + i * 12.5;
    rf.geo(M.glass, new THREE.BoxGeometry(4, 0.08, 9), x, ridge / 2 + 0.6, W / 4, [pitch, 0, 0]);
    rf.geo(M.glass, new THREE.BoxGeometry(4, 0.08, 9), x, ridge / 2 + 0.6, -W / 4, [-pitch, 0, 0]);
  }
  rf.hotspot("hs_roof", 8, ridge + 1, -W / 4);
  P.push(rf);

  // Yard, trucks and trees
  const s = new Piece("site", "site", -1, 0)
    .box(M.asphalt, 110, 0.1, 82, 4, -0.1, 4)
    .box(M.grass, 110, 0.12, 6, 4, -0.1, -40);
  for (const [x, z] of [[-14, 33], [6, 33]]) {
    s.box(M.white, 13.5, 3.6, 2.5, x, 0.9, z, [0, 0.0, 0]).box(M.steel, 13.5, 0.5, 2.3, x, 0.4, z)
     .box(M.steel, 2.6, 3, 2.5, x + 8.4, 0.5, z).box(M.bronze, 0.1, 1.2, 2.3, x + 9.75, 1.8, z);
  }
  for (let i = 0; i < 9; i++) tree(s, -48 + i * 12, -38, 1);
  P.push(s);

  return model("industrial", P, { title: "Midrand Logistics Park", explodeGap: 7, height: 16 });
}

/* Export ------------------------------------------------------------------ */
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../assets/models");
mkdirSync(outDir, { recursive: true });
const exporter = new GLTFExporter();

// The commercial tower is now generated in far more detail by generate-exchange.mjs.
for (const [file, build] of [["residential", residential], ["industrial", industrial]]) {
  const scene = new THREE.Scene();
  scene.add(build());
  const glb = await exporter.parseAsync(scene, { binary: true });
  const buf = Buffer.from(glb);
  writeFileSync(path.join(outDir, `${file}.glb`), buf);
  console.log(`${file}.glb  ${(buf.length / 1024).toFixed(1)} KB`);
}
