/* Oakridge Construction: The Sandton Exchange, immersive 3D experience.
   Fictional portfolio demonstration by Launch Point Digital. All building
   names, figures and specifications shown here are invented for illustration.

   Loaded on demand by main.js for the [data-xp] element on studio.html. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const COARSE = window.matchMedia("(pointer: coarse)").matches;
const SMALL = Math.min(window.innerWidth, window.innerHeight) < 700;
const LOW_POWER = COARSE || SMALL;
const asset = (p) => new URL(`../${p}`, import.meta.url).href;
const MODEL_BYTES = { commercial: 524688, environment: 186292 };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

/* ============================================================ CONTENT ===== */
export const CAMERAS = {
  front: { label: "Front elevation", p: [0, 24, 108], t: [0, 24, 0] },
  rear: { label: "Rear elevation", p: [-22, 30, -108], t: [0, 24, -2] },
  street: { label: "Street-level entrance", p: [11, 1.7, 37], t: [0, 8, 12] },
  aerial: { label: "Aerial view", p: [120, 150, 130], t: [0, 12, 4] },
  rooftop: { label: "Rooftop terrace", p: [25, 59, 25], t: [1, 51, 1] },
  reception: { label: "Interior reception", p: [-7.5, 2.1, 12.2], t: [1.5, 2.4, 4.2], interior: true },
};

const FICTIONAL = "Illustrative specification: fictional demonstration content.";
export const HOTSPOTS = [
  { id: "reception", title: "Reception & arrival lobby", pos: [0, 2.6, 13.3], cam: { p: [9, 2.3, 28], t: [0, 3, 11] },
    text: "A six-metre, double-height lobby with a stone reception desk, timber feature wall and lounge seating.",
    facts: [["Ceiling height", "6 m"], ["Entry", "Revolving door + accessible doors"], ["Finishes", "Stone, bronze, timber"]] },
  { id: "conference", title: "Conference facilities", pos: [0, 8.3, 16.5], cam: { p: [-14, 10, 39], t: [0, 8, 13] },
    text: "The podium's first floor holds a boardroom, two meeting suites and a pre-function space behind fin-shaded glazing.",
    facts: [["Boardroom", "Seats 16"], ["Meeting suites", "2 × 12 seats"], ["Level", "Podium, level 1"]] },
  { id: "offices", title: "Commercial office space", pos: [15.6, 24.2, 0], cam: { p: [50, 27, 24], t: [12, 24, 0] },
    text: "Eight floors of open-plan workspace wrap a central concrete core, with daylight on all four sides.",
    facts: [["Floors", "Levels 2 – 9"], ["Floor plate", "≈ 660 m²"], ["Floor to floor", "3.9 m"]] },
  { id: "executive", title: "Executive offices", pos: [0, 47.6, 9.6], cam: { p: [24, 50, 42], t: [0, 47, 7] },
    text: "The two highest floors hold private offices, a boardroom and lounges with balconies on the east and west.",
    facts: [["Floors", "Levels 10 – 11"], ["Balconies", "East & west"], ["Views", "Four-sided"]] },
  { id: "rooftop", title: "Rooftop terrace", pos: [0, 51.6, 3], cam: { p: [25, 59, 25], t: [1, 51, 1] },
    text: "A landscaped roof terrace with a pergola lounge. Use Customise to switch between garden, pool deck and solar layouts.",
    facts: [["Area", "≈ 300 m²"], ["Layouts", "3 configurable"], ["Balustrade", "1.1 m glass"]] },
  { id: "facade", title: "Building façade", pos: [-7, 34, 9.5], cam: { p: [-30, 31, 50], t: [-6, 32, 8] },
    text: "Recessed glazing sits behind slim stone spandrels and brushed bronze mullions at 1.5 m centres for depth and shade.",
    facts: [["Mullion grid", "1.5 m"], ["Glass recess", "350 mm"], ["Frames", "Bronze aluminium"]] },
  { id: "systems", title: "Sustainable building systems", pos: [0, 54.4, -9], cam: { p: [-30, 72, -42], t: [0, 53, -8] },
    text: "Solar panels crown a louvred plant enclosure. The concept also allows for rainwater harvesting and heat-recovery ventilation.",
    facts: [["Solar", "Roof-mounted PV"], ["Water", "Rainwater harvesting"], ["Air", "Heat-recovery ventilation"]] },
  { id: "parking", title: "Parking facilities", pos: [-46, 1.6, 2], cam: { p: [-92, 30, 42], t: [-44, 0, 2] },
    text: "Surface visitor parking beside the podium, with a ramp to basement parking under the building.",
    facts: [["Surface bays", "≈ 60"], ["Basement", "Ramp access"], ["EV charging", "Planned"]] },
];

export const STAGES = [
  ["Site preparation", "Hoarding goes up, site cabins arrive and the ground is cleared and excavated."],
  ["Foundation development", "A reinforced concrete raft and pile caps spread the building's load into the ground."],
  ["Structural framework", "The concrete core and columns rise level by level, with the tower crane in place."],
  ["Floor construction", "Post-tensioned floor slabs are cast on each level, from the lobby to the roof."],
  ["External façade installation", "Stone spandrels, bronze mullions and glazing close the building in."],
  ["Interior finishing", "Reception, conference rooms, offices and lighting are fitted out."],
  ["Landscaping", "The plaza, water feature, trees, podium terrace and rooftop garden are planted."],
  ["Completed development", "Architectural lighting is commissioned, the crane leaves and the building opens."],
];

export const FLOORS = (() => {
  const f = [
    { level: 0, name: "Ground floor", use: "Reception & lobby", plan: "lobby" },
    { level: 1, name: "Level 1", use: "Conference centre", plan: "conference" },
  ];
  for (let k = 2; k <= 9; k++) f.push({ level: k, name: `Level ${k}`, use: "Commercial offices", plan: "office" });
  f.push({ level: 10, name: "Level 10", use: "Executive offices", plan: "executive" });
  f.push({ level: 11, name: "Level 11", use: "Executive offices", plan: "executive" });
  f.push({ level: 12, name: "Roof", use: "Terrace & plant", plan: "roof" });
  return f;
})();

const PLAN_TEXT = {
  lobby: "Double-height reception, lounges, lift lobby and the main entrance beneath the canopy.",
  conference: "Boardroom, two meeting suites and breakout space around the core.",
  office: "Open-plan workspace on all four sides of the core, with focus rooms at the ends.",
  executive: "Private offices along the front, boardroom at the rear and balconies to each side.",
  roof: "Roof terrace in front of a louvred, solar-topped plant enclosure.",
};

/* Lighting modes. Each uses a CC0 HDRI sky from Poly Haven (photographed in
   South Africa) for the visible sky, reflections and ambient light. The sky is
   rotated so its sun sits at the chosen azimuth (theta, degrees), and the
   directional light follows it. hdriTheta and elev were measured from the files. */
export const MODES = {
  morning: { label: "Morning", sky: "morning", hdriTheta: 53.9, theta: 105, elev: 27.9, sun: 0xffe3c4, sunI: 2.6, envI: 0.85, bgI: 1.15, exposure: 0.9, hemi: 0.12, hemiSky: 0xcfe0f5, hemiGround: 0x5e5040, fog: 0xc9d6e3, fogD: 0.0011, interior: 0.5, exterior: 0, glow: 0, bloom: 0, windows: 0 },
  afternoon: { label: "Afternoon", sky: "afternoon", hdriTheta: 55.7, theta: 30, elev: 48, sun: 0xfff5e8, sunI: 3.0, envI: 0.85, bgI: 1.15, exposure: 0.85, hemi: 0.12, hemiSky: 0xd9e6f2, hemiGround: 0x5a5244, fog: 0xd4deea, fogD: 0.001, interior: 0.35, exterior: 0, glow: 0, bloom: 0, windows: 0 },
  sunset: { label: "Sunset", sky: "sunset", hdriTheta: 54.0, theta: 245, elev: 6.2, sun: 0xffa566, sunI: 2.5, envI: 0.8, bgI: 1.1, exposure: 1.0, hemi: 0.1, hemiSky: 0xffcda6, hemiGround: 0x3b2e26, fog: 0xdcc0a6, fogD: 0.0012, interior: 1.8, exterior: 0.8, glow: 0.04, bloom: 0.32, windows: 0.7 },
  night: { label: "Night", sky: "night", hdriTheta: 0, theta: 200, elev: 38, sun: 0xa9bde8, sunI: 0.3, envI: 0.45, bgI: 0.55, exposure: 1.0, hemi: 0.08, hemiSky: 0x2d3a58, hemiGround: 0x15120f, fog: 0x151c2a, fogD: 0.0018, interior: 5, exterior: 2.6, glow: 0.12, bloom: 0.7, windows: 1.8 },
};

export const OPTIONS = {
  glass: { label: "Glass tint", default: "clear", items: {
    clear: ["Clear low-iron", 0xdfe8e8], bronze: ["Bronze tint", 0xd8be98], grey: ["Solar grey", 0xa5acaf], green: ["Blue-green", 0xa8cfc6] } },
  cladding: { label: "Exterior cladding", default: "travertine", items: {
    travertine: ["Travertine stone", 0xd8cdb8], charcoal: ["Charcoal metal", 0x3b3b3c], ivory: ["Ivory composite", 0xf1ece2] } },
  frame: { label: "Aluminium frames", default: "bronze", items: {
    bronze: ["Bronze", 0x9c7a4c], champagne: ["Champagne", 0xc9b58e], black: ["Black", 0x232323], silver: ["Silver", 0xb8bbbe] } },
  concrete: { label: "Concrete finish", default: "smooth", items: {
    smooth: ["Smooth light", 0xc2bcb2], board: ["Board-formed", 0xb5ada1], dark: ["Dark polished", 0x6d6964] } },
  lighting: { label: "Exterior lighting", default: "warm", items: {
    warm: ["Warm white", 0xffd9a0], neutral: ["Neutral white", 0xeef2ff], amber: ["Bronze amber", 0xffa850], off: ["Off", 0x000000] } },
  landscape: { label: "Landscaping", default: "lush", items: {
    lush: ["Lush subtropical", 0x4f6d36], fynbos: ["Indigenous fynbos", 0x7d7b4d], minimal: ["Minimal xeriscape", 0xb7ab95] } },
  roof: { label: "Rooftop garden", default: "garden", items: {
    garden: ["Garden lounge", 0x5c7a3a], pool: ["Pool deck", 0x3f6f7a], solar: ["Solar & garden", 0x1b2633] } },
};

/* ======================================================== FLOOR PLANS ===== */
function planSVG(type) {
  const S = 10, X = (x) => (x + 22) * S, Z = (z) => (z + 16) * S;
  const rect = (x0, z0, x1, z1, label, cls = "zone") =>
    `<rect class="${cls}" x="${X(x0)}" y="${Z(z0)}" width="${(x1 - x0) * S}" height="${(z1 - z0) * S}"/>` +
    (label ? `<text x="${X((x0 + x1) / 2)}" y="${Z((z0 + z1) / 2) + 4}">${label}</text>` : "");
  const tower = type === "office" || type === "executive" || type === "roof";
  let s = tower ? rect(-15, -13, 15, 9, "", "outline") : rect(-22, -16, 22, 16, "", "outline");
  if (type === "lobby") {
    s += rect(-20.5, 3, -6, 12.5, "Lounge") + rect(6, 3, 20.5, 12.5, "Lounge") + rect(-5.5, 3, 5.5, 12.5, "Reception")
      + rect(-21, -15, -6, -7, "Café") + rect(6, -15, 21, -7, "Mailroom & services") + rect(-22, 13, 22, 16, "Colonnade", "zone soft");
    s += `<path class="arrow" d="M${X(0)} ${Z(21)} L${X(0)} ${Z(14)} M${X(-1.2)} ${Z(15.4)} L${X(0)} ${Z(14)} L${X(1.2)} ${Z(15.4)}"/>`;
  } else if (type === "conference") {
    s += rect(-6, 7.5, 6, 15, "Boardroom") + rect(-21, 7.5, -7.5, 15, "Meeting suite") + rect(7.5, 7.5, 21, 15, "Meeting suite")
      + rect(-21, -15, -6, -7, "Breakout") + rect(6, -15, 21, -7, "Pre-function");
  } else if (type === "office") {
    s += rect(-14, 3, 14, 8.2, "Open-plan workspace") + rect(-14, -12.2, 14, -7, "Open-plan workspace")
      + rect(-14, -6, -6, 2, "Focus") + rect(6, -6, 14, 2, "Focus");
  } else if (type === "executive") {
    s += rect(-14, 3, -7.5, 8.2, "Office") + rect(-7, 3, -0.5, 8.2, "Office") + rect(0.5, 3, 7, 8.2, "Office") + rect(7.5, 3, 14, 8.2, "Office")
      + rect(-5, -12.2, 5, -7.5, "Boardroom") + rect(-14, -6, -6, 2, "Lounge") + rect(6, -6, 14, 2, "Lounge")
      + rect(-17, -8, -15.2, 4, "", "zone soft") + rect(15.2, -8, 17, 4, "", "zone soft");
  } else if (type === "roof") {
    s += rect(-14.4, -4.2, 14.4, 8.4, "Roof terrace") + rect(-6, -12, 6, -5, "Plant + solar", "zone core");
  }
  if (type !== "roof") s += rect(-5, -6, 5, 2, "Core", "zone core");
  return `<svg viewBox="0 0 440 ${type === "lobby" ? 380 : 320}" role="img" aria-label="Simplified floor layout">${s}</svg>`;
}

/* ===================================================== TEXTURES (procedural) */
function canvasTexture(size, draw) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function noise(g, s, base, amp, count, sizeMax) {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < count; i++) {
    const v = Math.floor(255 * (1 - amp * Math.random()));
    g.fillStyle = `rgba(${v},${v},${v},${0.08 + Math.random() * 0.12})`;
    const r = Math.random() * sizeMax + 0.5;
    g.fillRect(Math.random() * s, Math.random() * s, r, r);
  }
}
const TEX = {};
function buildTextures() {
  TEX.concrete = canvasTexture(512, (g, s) => {
    noise(g, s, "#f1efec", 0.35, 9000, 3);
    for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(120,115,108,${Math.random() * 0.35})`; g.beginPath(); g.arc(Math.random() * s, Math.random() * s, Math.random() * 1.6 + 0.4, 0, 7); g.fill(); }
  });
  TEX.board = canvasTexture(512, (g, s) => {
    noise(g, s, "#ebe7e1", 0.4, 8000, 3);
    for (let y = 0; y < s; y += 32) {
      g.fillStyle = `rgba(90,84,76,${0.18 + Math.random() * 0.12})`; g.fillRect(0, y, s, 2);
      for (let x = 0; x < s; x += 2) { g.fillStyle = `rgba(110,100,90,${Math.random() * 0.06})`; g.fillRect(x, y + 2, 2, 30); }
    }
  });
  TEX.stone = canvasTexture(512, (g, s) => {
    noise(g, s, "#f4f0ea", 0.25, 5000, 2);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(150,130,105,${0.08 + Math.random() * 0.15})`; g.lineWidth = Math.random() * 2 + 0.5;
      const y = Math.random() * s; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= s; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 3);
      g.stroke();
    }
    g.fillStyle = "rgba(120,110,95,0.35)"; g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 2, s);
  });
  TEX.paving = canvasTexture(512, (g, s) => {
    noise(g, s, "#efebe4", 0.3, 6000, 2);
    g.fillStyle = "rgba(80,74,66,0.45)";
    for (let i = 0; i < s; i += 128) { g.fillRect(0, i, s, 3); }
    for (let r = 0; r < 4; r++) for (let i = (r % 2) * 64; i < s; i += 128) g.fillRect(i, r * 128, 3, 128);
  });
  TEX.asphalt = canvasTexture(512, (g, s) => noise(g, s, "#d9d9d9", 0.6, 22000, 2));
  TEX.grass = canvasTexture(512, (g, s) => {
    noise(g, s, "#e3e3e3", 0.45, 16000, 3);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`; g.fillRect(Math.random() * s, Math.random() * s, 1, 3 + Math.random() * 4); }
  });
  TEX.timber = canvasTexture(256, (g, s) => {
    g.fillStyle = "#e9e3dc"; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) { g.fillStyle = `rgba(110,80,60,${Math.random() * 0.12})`; g.fillRect(0, y, s, 1); }
    for (let y = 0; y < s; y += 32) { g.fillStyle = "rgba(60,40,30,0.3)"; g.fillRect(0, y, s, 2); }
  });
  TEX.windows = canvasTexture(256, (g, s) => {
    g.fillStyle = "#9a9a9a"; g.fillRect(0, 0, s, s);
    for (let y = 8; y < s; y += 32) for (let x = 6; x < s; x += 16) {
      const lit = Math.random() < 0.45;
      g.fillStyle = lit ? "#ffffff" : "#5a5a5a"; g.fillRect(x, y, 10, 16);
    }
  });
}

const DATA_TEX = (rgba) => { const t = new THREE.DataTexture(new Uint8Array(rgba), 1, 1); t.needsUpdate = true; return t; };
const WHITE_TEX = DATA_TEX([255, 255, 255, 255]);
const FLAT_NORMAL = DATA_TEX([128, 128, 255, 255]);

/** World-space (triplanar) PBR texturing: colour, roughness and normal maps tile
    correctly on the generated geometry, which has no UV coordinates. */
function triplanar(mat, tex, scale, norScale = 1) {
  const u = {
    triMap: { value: tex }, triRough: { value: WHITE_TEX }, triNor: { value: FLAT_NORMAL },
    triScale: { value: scale }, triNorScale: { value: norScale }, triEmis: { value: 0 },
  };
  mat.userData.tri = u;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = "varying vec3 vTriPos;\nvarying vec3 vTriN;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vec4 triP = vec4(transformed, 1.0); vec3 triNo = objectNormal;
      #ifdef USE_INSTANCING
        triP = instanceMatrix * triP; triNo = mat3(instanceMatrix) * triNo;
      #endif
      vTriPos = (modelMatrix * triP).xyz; vTriN = normalize(mat3(modelMatrix) * triNo);`);
    sh.fragmentShader = "uniform sampler2D triMap;\nuniform sampler2D triRough;\nuniform sampler2D triNor;\nuniform float triScale;\nuniform float triNorScale;\nuniform float triEmis;\nvarying vec3 vTriPos;\nvarying vec3 vTriN;\n" +
      sh.fragmentShader
        .replace("#include <map_fragment>", `#include <map_fragment>
      vec3 triA = abs(normalize(vTriN));
      int triAxis = triA.y > max(triA.x, triA.z) ? 1 : (triA.x > triA.z ? 0 : 2);
      vec2 triUV = (triAxis == 1 ? vTriPos.xz : (triAxis == 0 ? vTriPos.zy : vTriPos.xy)) * triScale;
      vec4 triTex = texture2D(triMap, triUV);
      diffuseColor.rgb *= triTex.rgb;
      totalEmissiveRadiance += step(0.97, triTex.g) * triEmis * vec3(1.0, 0.8, 0.55);`)
        .replace("#include <roughnessmap_fragment>", `float roughnessFactor = roughness * texture2D(triRough, triUV).g;`)
        .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      {
        vec3 triNw = normalize(vTriN);
        vec3 triT = triAxis == 0 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
        vec3 triB = triAxis == 1 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
        vec3 triTn = texture2D(triNor, triUV).xyz * 2.0 - 1.0;
        triTn.xy *= triNorScale;
        vec3 triNp = normalize(triT * triTn.x + triB * triTn.y + triNw * max(triTn.z, 0.05));
        normal = normalize((viewMatrix * vec4(triNp, 0.0)).xyz);
      }`);
  };
  mat.customProgramCacheKey = () => "tri-pbr";
  mat.needsUpdate = true;
}

/* Foliage: leaf-card crowns with a painted, alpha-tested leaf texture --------- */
function leafTexture() {
  return canvasTexture(512, (g, s) => {
    g.clearRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) {
      const x = s * (0.12 + Math.random() * 0.76), y = s * (0.12 + Math.random() * 0.76);
      const rx = 9 + Math.random() * 12, ry = 4 + Math.random() * 5;
      const h = 82 + Math.random() * 30, sat = 30 + Math.random() * 25, l = 16 + Math.random() * 24;
      g.save(); g.translate(x, y); g.rotate(Math.random() * Math.PI * 2);
      const grd = g.createLinearGradient(-rx, 0, rx, 0);
      grd.addColorStop(0, `hsl(${h},${sat}%,${l * 0.7}%)`); grd.addColorStop(1, `hsl(${h},${sat}%,${l * 1.25}%)`);
      g.fillStyle = grd; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = `hsla(${h},${sat}%,${l * 0.5}%,0.6)`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-rx, 0); g.lineTo(rx, 0); g.stroke();
      g.restore();
    }
  });
}
function leafCrown(blobs, perBlob, size) {
  const parts = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (const [bx, by, bz, r] of blobs) {
    for (let i = 0; i < perBlob; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(r * Math.cbrt(Math.random()) * 0.9);
      v.y *= 0.85;
      const q = new THREE.PlaneGeometry(1, 1);
      const sc = size * (0.75 + Math.random() * 0.6);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(bx + v.x, by + v.y, bz + v.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)),
        new THREE.Vector3(sc, sc, sc));
      q.applyMatrix4(m);
      // Normals point away from the crown centre for soft, rounded shading.
      const n = v.clone().normalize().add(up.clone().multiplyScalar(0.35)).normalize();
      const na = q.attributes.normal;
      for (let k = 0; k < na.count; k++) na.setXYZ(k, n.x, n.y, n.z);
      parts.push(q);
    }
  }
  return mergeGeometries(parts);
}

function shown(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }

/* ====================================================== EXPERIENCE ======== */
class Experience {
  constructor(root) {
    this.root = root;
    this.stage = root.querySelector("[data-xp-stage]");
    this.q = (s) => root.querySelector(s);
    this.qa = (s) => root.querySelectorAll(s);
    this.mats = {};
    this.pieces = [];
    this.floorGroups = new Map();
    this.timeline = 8;
    this.explode = 0; this.explodeTarget = 0;
    this.selected = -1; this.slide = 0;
    this.config = {};
    Object.keys(OPTIONS).forEach((k) => (this.config[k] = OPTIONS[k].default));
    this.modeName = "afternoon";
    this.panelShift = 0;
    this.frames = [];
    this.visible = true;
  }

  /* ---------- setup -------------------------------------------------------- */
  async init() {
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: !LOW_POWER, powerPreference: "high-performance" }));
    this.maxPR = Math.min(window.devicePixelRatio || 1, LOW_POWER ? 1.25 : 1.75);
    this.pr = this.maxPR;
    r.setPixelRatio(this.pr);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.6;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.className = "xp-canvas";
    r.domElement.setAttribute("aria-hidden", "true");
    this.stage.appendChild(r.domElement);

    const scene = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.3, 6000);
    this.camera.position.set(260, 220, 300);

    // Physical sky (background) and a second copy rendered into the environment map
    this.pmrem = new THREE.PMREMGenerator(r);
    this.skies = {};
    this.sunDir = new THREE.Vector3();
    scene.fog = new THREE.FogExp2(0xb9b0a3, 0.0016);

    this.hemi = new THREE.HemisphereLight(0xdfe6ee, 0x5a5040, 0.5);
    scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight(0xffffff, 3));
    sun.castShadow = true;
    const sm = LOW_POWER ? 1024 : 2048;
    sun.shadow.mapSize.set(sm, sm);
    Object.assign(sun.shadow.camera, { left: -85, right: 85, top: 85, bottom: -85, near: 10, far: 520 });
    sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);
    sun.target.position.set(0, 10, 0);
    // Warm lobby light so the interior view reads at every time of day
    this.lobbyLight = new THREE.PointLight(0xffd9a8, 0, 26, 1.6);
    this.lobbyLight.position.set(0, 4.6, 7);
    scene.add(this.lobbyLight);

    // Post-processing: AO (desktop), bloom for illuminated elements, filmic output
    const comp = (this.composer = new EffectComposer(r));
    comp.addPass(new RenderPass(scene, this.camera));
    if (!LOW_POWER) {
      this.gtao = new GTAOPass(scene, this.camera, 512, 512);
      this.gtao.blendIntensity = 0.9;
      this.gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.2, thickness: 1.5, scale: 1, samples: 12 });
      comp.addPass(this.gtao);
    }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.5, 1.1);
    comp.addPass(this.bloom);
    comp.addPass(new OutputPass());

    // Controls
    const c = (this.controls = new OrbitControls(this.camera, r.domElement));
    c.enableDamping = true; c.dampingFactor = 0.06;
    c.maxPolarAngle = Math.PI * 0.495;
    c.minDistance = 6; c.maxDistance = 420;
    c.screenSpacePanning = true; c.autoRotateSpeed = 0.35;
    c.target.set(0, 20, 0);
    c.enabled = false;
    c.addEventListener("start", () => { this.userMoved = true; this.setAutoRotate(false); });

    this.resize = this.resize.bind(this);
    new ResizeObserver(this.resize).observe(this.stage);
    this.resize();
    new IntersectionObserver((e) => { this.visible = e[0].isIntersecting; }).observe(this.root);
    document.addEventListener("visibilitychange", () => { this.hidden = document.hidden; });

    buildTextures();
    await this.load();
    this.prepareMaterials();
    await this.applyMode(this.modeName, true);
    this.upgradeVegetation();
    Object.keys(this.config).forEach((k) => this.setOption(k, this.config[k], true));
    this.applyTimeline();
    this.buildHotspots();
    this.bindUI();

    this.tick = this.tick.bind(this);
    this.clock = new THREE.Clock();
    requestAnimationFrame(this.tick);
    this.root.classList.add("is-ready");
    this.runIntro();
    this.loadTextures();
  }

  load() {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const prog = { commercial: 0, environment: 0 };
    const bar = this.q("[data-xp-progress]"), pct = this.q("[data-xp-pct]");
    const report = () => {
      const total = MODEL_BYTES.commercial + MODEL_BYTES.environment;
      const p = (prog.commercial + prog.environment) / total;
      if (bar) bar.style.transform = `scaleX(${Math.min(1, p)})`;
      if (pct) pct.textContent = Math.min(99, Math.round(p * 100)) + "%";
    };
    const one = (name) => loader.loadAsync(asset(`models/${name}.glb`), (e) => { prog[name] = Math.min(e.loaded, MODEL_BYTES[name]); report(); })
      .then((g) => { prog[name] = MODEL_BYTES[name]; report(); return g.scene; });
    return Promise.all([one("commercial"), one("environment")]).then(([b, env]) => {
      this.building = b; this.env = env;
      this.scene.add(b, env);
      if (pct) pct.textContent = "100%";
    });
  }

  prepareMaterials() {
    const byName = this.mats;
    const collect = (o) => {
      if (!o.isMesh) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      list.forEach((m) => { (byName[m.name] = byName[m.name] || new Set()).add(m); });
    };
    this.building.traverse(collect);
    this.env.traverse(collect);
    const each = (name, fn) => (byName[name] || []).forEach(fn);

    // Textures in world space
    each("concrete", (m) => triplanar(m, TEX.concrete, 1 / 3));
    each("cladding", (m) => triplanar(m, TEX.stone, 1 / 2.4));
    each("stone-floor", (m) => triplanar(m, TEX.paving, 1 / 2));
    each("paving", (m) => triplanar(m, TEX.paving, 1 / 4));
    each("asphalt", (m) => triplanar(m, TEX.asphalt, 1 / 5));
    each("grass", (m) => triplanar(m, TEX.grass, 1 / 4));
    each("ground", (m) => triplanar(m, TEX.grass, 1 / 10));
    each("timber", (m) => triplanar(m, TEX.timber, 1 / 1.6));
    each("bark", (m) => triplanar(m, TEX.concrete, 1));
    each("neighbour-stone", (m) => triplanar(m, TEX.windows, 1 / 8));
    each("neighbour-dark", (m) => triplanar(m, TEX.windows, 1 / 8));
    each("skyline", (m) => triplanar(m, TEX.windows, 1 / 10));

    // Glass: transmission on capable devices, reflective glass on low-power ones
    // Glass: Fresnel reflections of the real sky, with the interior showing through
    ["glass", "glass-lobby", "glass-balustrade"].forEach((n) => each(n, (m) => {
      m.emissive = new THREE.Color(0xffd2a0);
      // Curtain-wall glass: dark solar tint so the sky reflection dominates, as on real towers.
      m.roughness = 0; m.metalness = 0; m.ior = 1.52; m.specularIntensity = 1; m.envMapIntensity = n === "glass" ? 1.6 : 1.4;
      // Reflective (low-e coated) glass: a partly metallic finish mirrors the sky.
      if (n === "glass") { m.color.setHex(0x45525b); m.metalness = 0.8; m.roughness = 0.02; }
      if (n === "glass-lobby") m.metalness = 0.15;
      if (LOW_POWER) { m.transmission = 0; m.transparent = true; m.opacity = n === "glass" ? 0.94 : 0.4; }
      else {
        m.thickness = 0.04; m.attenuationDistance = 6;
        m.transmission = n === "glass" ? 0.14 : n === "glass-lobby" ? 0.7 : 0.85;
      }
      m.needsUpdate = true;
    }));
    each("aluminium", (m) => { m.envMapIntensity = 1.2; m.roughness = 0.28; m.metalness = 0.95; });
    each("water", (m) => { m.envMapIntensity = 1.3; m.roughness = 0.01; m.metalness = 0.15; m.color.setHex(0x2a4550); });
    ["paint-white", "paint-charcoal", "paint-silver", "paint-bronze"].forEach((n) => each(n, (m) => { m.envMapIntensity = 1.2; m.roughness = 0.2; }));
    each("car-glass", (m) => { m.roughness = 0.02; });

    // Shadows and piece bookkeeping
    this.building.traverse((o) => {
      if (o.isMesh) {
        const n = o.material.name;
        o.castShadow = !/glass|interior|furniture|fabric|lamp|led/.test(n) && !/^interior-L/.test(o.parent?.name || "");
        o.receiveShadow = true;
        if (/glass/.test(n)) o.userData.isGlass = true;
      }
      const ud = o.userData || {};
      if (ud.stage) this.registerPiece(o);
    });
    this.env.traverse((o) => {
      if (!o.isMesh) return;
      o.receiveShadow = true;
      o.castShadow = !/skyline|ground|asphalt|paving|road|grass|kerb/.test(o.material.name);
    });
    this.interiorGroups = this.pieces.filter((p) => p.ud.interior);
  }

  registerPiece(o) {
    // Re-base the group on its lowest point so it can "grow" upwards.
    const box = new THREE.Box3().setFromObject(o);
    const minY = isFinite(box.min.y) ? box.min.y : 0;
    o.children.forEach((c) => (c.position.y -= minY));
    o.position.y += minY;
    const ud = o.userData;
    const piece = { obj: o, ud, baseY: o.position.y, baseZ: o.position.z, built: 1, glass: [] };
    o.traverse((m) => { if (m.isMesh && m.userData.isGlass) piece.glass.push(m); });
    this.pieces.push(piece);
    if (ud.level >= 0) {
      if (!this.floorGroups.has(ud.level)) this.floorGroups.set(ud.level, []);
      this.floorGroups.get(ud.level).push(piece);
    }
  }

  /* ---------- lighting modes -------------------------------------------------- */
  async loadSky(name) {
    if (this.skies[name]) return this.skies[name];
    const env = new RGBELoader().loadAsync(asset(`sky/${name}-1k.hdr`)).then((t) => {
      t.mapping = THREE.EquirectangularReflectionMapping;
      const rt = this.pmrem.fromEquirectangular(t);
      t.dispose();
      return rt.texture;
    });
    const bg = new THREE.TextureLoader().loadAsync(asset(`sky/${name}-${LOW_POWER ? "2k" : "4k"}.jpg`)).then((t) => {
      t.mapping = THREE.EquirectangularReflectionMapping;
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    });
    const [e, b] = await Promise.all([env, bg]);
    return (this.skies[name] = { env: e, bg: b });
  }

  async applyMode(name, instant) {
    const to = MODES[name];
    this.modeName = name;
    this.qa("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === name)));
    const token = (this.modeToken = (this.modeToken || 0) + 1);
    this.root.classList.add("is-sky-loading");
    let sky = null;
    try { sky = await this.loadSky(to.sky); } catch (e) { console.warn("Sky unavailable", e); }
    if (token !== this.modeToken) return;
    this.root.classList.remove("is-sky-loading");

    const dirOf = (m) => new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - m.elev), THREE.MathUtils.degToRad(m.theta));
    const L = this.light;
    const from = L ? { ...L, sun: L.sun.getHex(), hemiSky: L.hemiSky.getHex(), hemiGround: L.hemiGround.getHex(), fog: L.fog.getHex() } : { ...to, dir: dirOf(to) };
    const keys = ["sunI", "envI", "bgI", "hemi", "exposure", "fogD", "interior", "exterior", "glow", "bloom", "windows"];
    const colors = ["sun", "hemiSky", "hemiGround", "fog"];
    const toDir = dirOf(to);
    const swapSky = () => {
      if (!sky) return;
      this.scene.background = sky.bg;
      this.scene.environment = sky.env;
      const rot = THREE.MathUtils.degToRad(to.theta - to.hdriTheta);
      this.scene.backgroundRotation.set(0, rot, 0);
      this.scene.environmentRotation.set(0, rot, 0);
    };
    const step = (t) => {
      const cur = {};
      keys.forEach((k) => (cur[k] = lerp(from[k], to[k], t)));
      colors.forEach((k) => (cur[k] = new THREE.Color(from[k]).lerp(new THREE.Color(to[k]), t)));
      cur.dir = from.dir.clone().lerp(toDir, t).normalize();
      this.setLighting(cur);
    };
    if (this.modeTween) { this.modeTween.kill(); this.modeTween = null; }
    if (instant || REDUCE || !window.gsap) { swapSky(); step(1); return; }
    // Dip the sky brightness while the new sky is swapped in, then bring it up.
    const st = { t: 0 }; let swapped = false;
    this.modeTween = window.gsap.to(st, {
      t: 1, duration: 2.2, ease: "power2.inOut",
      onUpdate: () => {
        if (!swapped && st.t >= 0.5) { swapSky(); swapped = true; }
        step(st.t);
        this.scene.backgroundIntensity = this.light.bgI * (0.35 + 0.65 * Math.abs(st.t - 0.5) * 2);
      },
      onComplete: () => { this.modeTween = null; },
    });
  }

  setLighting(c) {
    this.sun.position.copy(c.dir).multiplyScalar(260).add(this.sun.target.position);
    this.sun.color.copy(c.sun); this.sun.intensity = c.sunI;
    this.hemi.color.copy(c.hemiSky); this.hemi.groundColor.copy(c.hemiGround); this.hemi.intensity = c.hemi;
    this.scene.environmentIntensity = c.envI;
    this.scene.backgroundIntensity = c.bgI;
    this.scene.fog.color.copy(c.fog); this.scene.fog.density = c.fogD;
    this.renderer.toneMappingExposure = c.exposure;
    this.bloom.strength = c.bloom;
    this.bloom.enabled = c.bloom > 0.01;
    this.lobbyLight.intensity = lerp(8, 45, clamp(c.interior / 5));
    this.light = c;
    this.applyEmissive();
  }

  /* ---------- scanned PBR surfaces (CC0, Poly Haven) -------------------------- */
  async loadTextures() {
    const tl = new THREE.TextureLoader();
    const aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const load = (p, srgb) => tl.loadAsync(asset(`textures/${p}.jpg`)).then((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = aniso;
      return t;
    });
    const sets = ["concrete", "board", "stone", "timber", "paving", "asphalt", "grass", "bark"];
    const pbr = {};
    try {
      await Promise.all(sets.map(async (s) => {
        const [map, rough, nor] = await Promise.all([load(`${s}/diff`, true), load(`${s}/rough`), load(`${s}/nor`)]);
        pbr[s] = { map, rough, nor };
      }));
    } catch (e) { console.warn("Surface textures unavailable, keeping generated ones.", e); return; }
    this.pbr = pbr;
    this.applySurfaces();
  }

  applySurfaces() {
    const P = this.pbr;
    if (!P) return;
    const each = (n, fn) => (this.mats[n] || []).forEach(fn);
    const use = (m, set, scale, tint, rough = 1, metal = 0, nor = 1) => {
      const u = m.userData.tri; if (!u) return;
      u.triMap.value = set.map; u.triRough.value = set.rough; u.triNor.value = set.nor;
      u.triScale.value = scale; u.triNorScale.value = nor;
      m.color.setHex(tint); m.roughness = rough; m.metalness = metal;
    };
    const cl = this.config.cladding, cc = this.config.concrete, ls = this.config.landscape;
    each("cladding", (m) => cl === "charcoal" ? use(m, P.concrete, 1 / 2.5, 0x4a4a4b, 0.7, 0.35, 0.8)
      : use(m, P.stone, 1 / 2, cl === "ivory" ? 0xfff8ee : 0xf4ede2, 1, 0, 1));
    each("concrete", (m) => cc === "board" ? use(m, P.board, 1 / 2.5, 0xf6f2ec, 1, 0, 1)
      : use(m, P.concrete, 1 / 2.5, cc === "dark" ? 0x77726c : 0xffffff, cc === "dark" ? 0.55 : 1, 0, 1));
    each("stone-floor", (m) => use(m, P.concrete, 1 / 3, 0xf3efe8, 0.35, 0, 0.4));
    each("timber", (m) => use(m, P.timber, 1 / 1.4, 0xffffff, 0.9, 0, 1));
    each("paving", (m) => use(m, P.paving, 1 / 2.5, 0xffffff, 1, 0, 1));
    each("asphalt", (m) => use(m, P.asphalt, 1 / 4, 0xb9b9b9, 1, 0, 1));
    const grassTint = { lush: 0x86b25c, fynbos: 0xc4b483, minimal: 0xd2c4a6 }[ls];
    each("grass", (m) => use(m, P.grass, 1 / 3, grassTint, 1, 0, 0.8));
    each("ground", (m) => use(m, P.grass, 1 / 7, new THREE.Color(grassTint).multiplyScalar(0.82).getHex(), 1, 0, 0.6));
    each("bark", (m) => use(m, P.bark, 1, 0xffffff, 1, 0, 1));
    this.root.classList.add("has-scanned-textures");
  }

  upgradeVegetation() {
    const tex = leafTexture();
    const leaf = new THREE.MeshStandardMaterial({ name: "leaf", map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.78, metalness: 0 });
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
    this.mats.leaf = new Set([leaf]);
    const geos = {
      round: leafCrown([[0, 4.6, 0, 1.9], [1.1, 4.1, 0.5, 1.4], [-1.0, 4.2, -0.4, 1.5], [0.2, 5.4, -0.6, 1.3], [-0.4, 3.8, 1.0, 1.2]], 24, 1.15),
      cypress: leafCrown([[0, 2.6, 0, 1.0], [0, 3.8, 0, 1.0], [0, 5.0, 0, 0.85], [0, 6.1, 0, 0.65], [0, 7.0, 0, 0.4]], 16, 0.9),
      shrub: leafCrown([[0, 0.45, 0, 0.75]], 18, 0.6),
    };
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    const swaps = [];
    for (const root of [this.building, this.env]) root.traverse((o) => { if (o.isInstancedMesh && o.userData.foliage) swaps.push(o); });
    for (const o of swaps) {
      const items = o.userData.items || [];
      const im = new THREE.InstancedMesh(geos[o.userData.foliage], leaf, items.length);
      items.forEach(([x, y, z, ry = 0, sc = 1], i) => {
        q.setFromAxisAngle(up, ry);
        im.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sc, sc, sc)));
      });
      im.castShadow = true; im.receiveShadow = true;
      im.customDepthMaterial = depth;
      im.frustumCulled = false;
      // Undo the re-basing applied to the parent construction piece, if any.
      const piece = this.pieces.find((p) => p.obj === o.parent);
      if (piece) im.position.y = -piece.baseY;
      o.parent.add(im);
      o.visible = false;
      o.userData.replaced = true;
    }
  }

  applyEmissive() {
    const c = this.light; if (!c) return;
    const each = (n, fn) => (this.mats[n] || []).forEach(fn);
    const opt = OPTIONS.lighting.items[this.config.lighting];
    const extOn = this.config.lighting !== "off";
    each("interior-light", (m) => { m.emissiveIntensity = c.interior; });
    each("led", (m) => { m.emissive.setHex(opt[1]); m.emissiveIntensity = extOn ? Math.max(0.12, c.exterior * 0.7) : 0; });
    each("lamp", (m) => { m.emissive.setHex(extOn ? opt[1] : 0x000000); m.emissiveIntensity = extOn ? c.exterior * 0.9 + 0.05 : 0; });
    ["glass", "glass-lobby"].forEach((n) => each(n, (m) => { m.emissiveIntensity = c.glow; }));
    each("neighbour-glass", (m) => { m.emissive = m.emissive || new THREE.Color(); m.emissive.setHex(0x8a6a44); m.emissiveIntensity = c.windows * 0.05; });
    ["neighbour-stone", "neighbour-dark", "skyline"].forEach((n) => each(n, (m) => { if (m.userData.tri) m.userData.tri.triEmis.value = c.windows; }));
  }

  /* ---------- configurator ---------------------------------------------------- */
  setOption(group, key, silent) {
    this.config[group] = key;
    const val = OPTIONS[group].items[key][1];
    const each = (n, fn) => (this.mats[n] || []).forEach(fn);
    if (group === "glass") each("glass", (m) => {
      // Tints darken the base so reflections stay strong.
      const c = new THREE.Color(val).multiplyScalar(0.33);
      m.color.copy(c); if (m.attenuationColor) m.attenuationColor.setHex(val);
    });
    if ((group === "cladding" || group === "concrete" || group === "landscape") && this.pbr) this.applySurfaces();
    if (group === "cladding" && !this.pbr) each("cladding", (m) => {
      m.color.setHex(val);
      m.metalness = key === "charcoal" ? 0.55 : 0; m.roughness = key === "charcoal" ? 0.38 : key === "ivory" ? 0.5 : 0.62;
      if (m.userData.tri) m.userData.tri.triMap.value = key === "travertine" ? TEX.stone : TEX.concrete;
    });
    if (group === "frame") each("aluminium", (m) => { m.color.setHex(val); m.roughness = key === "black" ? 0.45 : 0.32; });
    if (group === "concrete" && !this.pbr) each("concrete", (m) => {
      m.color.setHex(val); m.roughness = key === "dark" ? 0.4 : 0.86;
      if (m.userData.tri) m.userData.tri.triMap.value = key === "board" ? TEX.board : TEX.concrete;
    });
    if (group === "lighting") this.applyEmissive();
    if (group === "landscape") {
      const pal = { lush: [0x55703a, 0x3f5d2a, 0x4a6a33, true], fynbos: [0x8a8656, 0x6b7146, 0x9a6e5e, true], minimal: [0xb9ad97, 0x5d6a42, 0x4a6a33, false] }[key];
      if (!this.pbr) each("grass", (m) => m.color.setHex(pal[0]));
      each("foliage", (m) => m.color.setHex(pal[1]));
      each("leaf", (m) => m.color.setHex({ lush: 0xffffff, fynbos: 0xc9c08e, minimal: 0xddd3ae }[key]));
      each("shrub", (m) => { m.color.setHex(pal[2]); m.visible = pal[3]; });
    }
    if (group === "roof") this.applyTimeline();
    this.qa(`[data-option="${group}"]`).forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === key)));
    if (!silent) this.announce(`${OPTIONS[group].label}: ${OPTIONS[group].items[key][0]}`);
  }

  /* ---------- construction timeline ------------------------------------------ */
  setTimeline(t) {
    this.timeline = clamp(t, 0, 8);
    this.applyTimeline();
    const range = this.q("[data-timeline-range]");
    if (range && document.activeElement !== range) range.value = Math.round(this.timeline * 100);
    const idx = Math.min(7, Math.floor(this.timeline));
    this.q("[data-stage-num]").textContent = String(idx + 1).padStart(2, "0");
    this.q("[data-stage-name]").textContent = STAGES[idx][0];
    this.q("[data-stage-text]").textContent = STAGES[idx][1];
    this.qa("[data-stage-jump]").forEach((b, i) => { b.classList.toggle("is-done", i < idx); b.classList.toggle("is-active", i === idx); });
    this.updateHotspotVisibility();
  }
  applyTimeline() {
    const t = this.timeline;
    for (const p of this.pieces) {
      const ud = p.ud;
      const start = ud.stage - 1 + (ud.order || 0) * 0.72;
      let e = smooth(clamp((t - start) / 0.28));
      if (ud.until) e *= 1 - smooth(clamp((t - (ud.until - 1) - 0.25) / 0.35));
      if (ud.config === "roof" && ud.variant !== this.config.roof) e = 0;
      p.built = e;
      p.obj.visible = e > 0.002;
      p.obj.scale.set(1, Math.max(e, 0.001), 1);
    }
  }
  playTimeline() {
    if (!window.gsap) return;
    if (this.timeline >= 7.99) this.setTimeline(0);
    const btn = this.q("[data-timeline-play]");
    this.playing = window.gsap.to(this, {
      timeline: 8, duration: (8 - this.timeline) * (REDUCE ? 1.2 : 2.4), ease: "none",
      onUpdate: () => this.setTimeline(this.timeline),
      onComplete: () => this.pauseTimeline(),
    });
    btn.setAttribute("aria-pressed", "true"); btn.querySelector("span").textContent = "Pause";
  }
  pauseTimeline() {
    if (this.playing) { this.playing.kill(); this.playing = null; }
    const btn = this.q("[data-timeline-play]");
    if (btn) { btn.setAttribute("aria-pressed", "false"); btn.querySelector("span").textContent = "Play"; }
  }

  /* ---------- exploded view ------------------------------------------------- */
  setExploded(on) {
    this.explodeTarget = on ? 1 : 0;
    if (!on) this.selectFloor(-1);
    if (on && this.timeline < 8) { this.pauseTimeline(); this.setTimeline(8); }
    if (on) this.flyTo([78, 58, 96], [0, 34, 0], 2.2);
    if (REDUCE) this.explode = this.explodeTarget;
    this.updateHotspotVisibility();
  }
  selectFloor(level) {
    this.selected = level;
    this.qa("[data-floor]").forEach((b) => b.setAttribute("aria-pressed", String(+b.getAttribute("data-floor") === level)));
    const info = this.q("[data-floor-info]");
    if (level < 0) { if (info) info.hidden = true; return; }
    const f = FLOORS.find((x) => x.level === level);
    info.hidden = false;
    this.q("[data-floor-name]").textContent = `${f.name} · ${f.use}`;
    this.q("[data-floor-text]").textContent = PLAN_TEXT[f.plan];
    this.q("[data-floor-plan]").innerHTML = planSVG(f.plan);
    // Frame the floor as it slides out of the stack
    const y = this.levelY(level) + level * 2.6;
    this.flyTo([46, y + 22, 78], [0, y, 10], 1.8);
  }
  levelY(k) { return k === 0 ? 0 : k === 1 ? 6 : k >= 12 ? 49.5 : 10.5 + (k - 2) * 3.9; }

  /* ---------- camera ------------------------------------------------------------ */
  flyTo(p, t, dur = 2.4, onDone) {
    const cam = this.camera, c = this.controls;
    const to = V(p), tt = V(t);
    const interior = to.y < 4.5 && Math.abs(to.x) < 21 && to.z < 13 && to.z > -16;
    c.minDistance = interior ? 0.5 : 6;
    c.maxDistance = interior ? 12 : 420;
    if (REDUCE || !window.gsap) { cam.position.copy(to); c.target.copy(tt); c.update(); onDone && onDone(); return; }
    if (this.flight) this.flight.kill();
    this.setAutoRotate(false);
    const from = cam.position.clone(), tf = c.target.clone();
    const mid = from.clone().lerp(to, 0.5);
    mid.y += Math.min(60, from.distanceTo(to) * 0.22);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const s = { t: 0 };
    c.enabled = false;
    this.flight = window.gsap.to(s, {
      t: 1, duration: dur, ease: "power2.inOut",
      onUpdate: () => { cam.position.copy(curve.getPoint(s.t)); c.target.lerpVectors(tf, tt, s.t); },
      onComplete: () => { c.enabled = true; this.flight = null; onDone && onDone(); },
    });
  }
  camera_(key) {
    const k = CAMERAS[key];
    this.qa("[data-camera]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-camera") === key)));
    this.setAutoRotate(false);
    this.flyTo(k.p, k.t, key === "reception" ? 3.2 : 2.6);
  }
  setAutoRotate(on) {
    this.controls.autoRotate = on && !REDUCE;
    const b = this.q('[data-xp-action="rotate"]');
    if (b) b.setAttribute("aria-pressed", String(this.controls.autoRotate));
  }

  /* ---------- hotspots ------------------------------------------------------------ */
  buildHotspots() {
    const layer = this.q("[data-xp-hotspots]");
    this.hs = HOTSPOTS.map((h, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "xp-hs";
      b.innerHTML = `<span class="xp-hs-dot" aria-hidden="true">${i + 1}</span><span class="xp-hs-label">${h.title}</span>`;
      b.setAttribute("aria-label", `Hotspot ${i + 1}: ${h.title}`);
      b.addEventListener("click", () => this.openHotspot(i));
      layer.appendChild(b);
      return { el: b, pos: V(h.pos), occluded: false };
    });
    this.raycaster = new THREE.Raycaster();
  }
  openHotspot(i) {
    const h = HOTSPOTS[i];
    this.setAutoRotate(false);
    this.flyTo(h.cam.p, h.cam.t, 2.4);
    const p = this.q("[data-xp-info]");
    this.q("[data-info-num]").textContent = String(i + 1).padStart(2, "0");
    this.q("[data-info-title]").textContent = h.title;
    this.q("[data-info-text]").textContent = h.text;
    this.q("[data-info-facts]").innerHTML = h.facts.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("");
    this.q("[data-info-note]").textContent = FICTIONAL;
    p.hidden = false;
    this.root.classList.add("has-info");
    this.q("[data-info-close]").focus({ preventScroll: true });
    this.activeHotspot = i;
  }
  closeInfo() {
    const p = this.q("[data-xp-info]");
    if (p.hidden) return;
    p.hidden = true;
    this.root.classList.remove("has-info");
    if (this.activeHotspot != null && this.hs[this.activeHotspot]) this.hs[this.activeHotspot].el.focus({ preventScroll: true });
    this.activeHotspot = null;
  }
  updateHotspotVisibility() {
    const show = this.timeline >= 7.99 && this.explodeTarget === 0 && !this.inIntro && (!this.mode || this.mode === "explore" || this.mode === "cameras" || this.mode === "lighting" || this.mode === "customise");
    this.q("[data-xp-hotspots]").hidden = !show;
  }
  placeHotspots(frame) {
    if (!this.hs || this.q("[data-xp-hotspots]").hidden) return;
    const v = new THREE.Vector3();
    const checkOcclusion = frame % 12 === 0;
    for (const h of this.hs) {
      v.copy(h.pos).project(this.camera);
      const on = v.z < 1 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02;
      if (checkOcclusion && on) {
        const dir = h.pos.clone().sub(this.camera.position);
        const dist = dir.length();
        this.raycaster.set(this.camera.position, dir.normalize());
        this.raycaster.far = dist - 1.2;
        const hit = this.raycaster.intersectObject(this.building, true).find((x) => !x.object.userData.isGlass && shown(x.object));
        h.occluded = !!hit;
      }
      h.el.classList.toggle("is-off", !on);
      h.el.classList.toggle("is-behind", on && h.occluded);
      h.el.tabIndex = on ? 0 : -1;
      if (on) h.el.style.transform = `translate(${((v.x + 1) / 2) * this.w}px, ${((1 - v.y) / 2) * this.h}px)`;
    }
  }

  /* ---------- UI ------------------------------------------------------------------- */
  setMode(mode) {
    if (mode && this.mode === mode) mode = null;
    this.mode = mode;
    this.qa("[data-xp-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-xp-mode") === mode)));
    this.qa("[data-panel]").forEach((p) => { p.hidden = p.getAttribute("data-panel") !== mode; });
    this.root.classList.toggle("has-panel", !!this.q(`[data-panel="${mode}"]`));
    if (mode !== "exploded" && this.explodeTarget) this.setExploded(false);
    if (mode === "exploded" && !this.explodeTarget) this.setExploded(true);
    if (mode !== "timeline") this.pauseTimeline();
    if (mode !== "timeline" && this.timeline < 8) this.setTimeline(8);
    if (mode === "timeline") { this.closeInfo(); this.flyTo([92, 62, 112], [0, 22, 0], 2.2); }
    if (mode !== "explore") this.closeInfo();
    this.updateHotspotVisibility();
  }
  announce(msg) { const a = this.q("[data-xp-live]"); if (a) a.textContent = msg; }

  bindUI() {
    this.qa("[data-xp-mode]").forEach((b) => b.addEventListener("click", () => this.setMode(b.getAttribute("data-xp-mode"))));
    this.qa("[data-mode]").forEach((b) => b.addEventListener("click", () => { this.applyMode(b.getAttribute("data-mode")); this.announce(`${MODES[b.getAttribute("data-mode")].label} lighting`); }));
    this.qa("[data-camera]").forEach((b) => b.addEventListener("click", () => { this.camera_(b.getAttribute("data-camera")); this.announce(CAMERAS[b.getAttribute("data-camera")].label); }));
    this.qa("[data-option]").forEach((b) => b.addEventListener("click", () => this.setOption(b.getAttribute("data-option"), b.getAttribute("data-value"))));
    this.qa("[data-floor]").forEach((b) => b.addEventListener("click", () => { const l = +b.getAttribute("data-floor"); this.selectFloor(this.selected === l ? -1 : l); }));
    this.qa("[data-hotspot-open]").forEach((b) => b.addEventListener("click", () => this.openHotspot(+b.getAttribute("data-hotspot-open"))));
    this.qa("[data-stage-jump]").forEach((b, i) => b.addEventListener("click", () => { this.pauseTimeline(); this.setTimeline(i + 0.999); }));
    const range = this.q("[data-timeline-range]");
    range.addEventListener("input", () => { this.pauseTimeline(); this.setTimeline(range.value / 100); });
    this.q("[data-timeline-play]").addEventListener("click", () => (this.playing ? this.pauseTimeline() : this.playTimeline()));
    this.q("[data-timeline-reset]").addEventListener("click", () => { this.pauseTimeline(); this.setTimeline(0); });
    this.q("[data-reassemble]").addEventListener("click", () => this.setMode(null));
    this.q("[data-info-close]").addEventListener("click", () => this.closeInfo());
    this.q('[data-xp-action="rotate"]').addEventListener("click", () => this.setAutoRotate(!this.controls.autoRotate));
    this.q('[data-xp-action="reset"]').addEventListener("click", () => this.reset());
    const fs = this.q('[data-xp-action="fullscreen"]');
    if (!document.fullscreenEnabled) fs.hidden = true;
    fs.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else this.root.requestFullscreen().catch(() => {});
    });
    document.addEventListener("fullscreenchange", () => {
      const on = document.fullscreenElement === this.root;
      fs.setAttribute("aria-pressed", String(on));
      fs.querySelector("span").textContent = on ? "Exit fullscreen" : "Fullscreen";
      this.root.classList.toggle("is-fullscreen", on);
    });
    this.q("[data-xp-skip]").addEventListener("click", () => this.endIntro(true));

    // Keyboard orbit / zoom on the stage, Escape closes panels
    this.stage.addEventListener("keydown", (e) => {
      const c = this.controls, off = this.camera.position.clone().sub(c.target);
      const sph = new THREE.Spherical().setFromVector3(off);
      if (e.key === "ArrowLeft") sph.theta -= 0.1; else if (e.key === "ArrowRight") sph.theta += 0.1;
      else if (e.key === "ArrowUp") sph.phi = clamp(sph.phi - 0.06, 0.1, c.maxPolarAngle);
      else if (e.key === "ArrowDown") sph.phi = clamp(sph.phi + 0.06, 0.1, c.maxPolarAngle);
      else if (e.key === "+" || e.key === "=") sph.radius = clamp(sph.radius * 0.88, c.minDistance, c.maxDistance);
      else if (e.key === "-" || e.key === "_") sph.radius = clamp(sph.radius * 1.14, c.minDistance, c.maxDistance);
      else return;
      e.preventDefault();
      this.setAutoRotate(false);
      off.setFromSpherical(sph); this.camera.position.copy(c.target).add(off);
    });
    this.root.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!this.q("[data-xp-info]").hidden) this.closeInfo();
      else if (this.mode) this.setMode(null);
    });

    // Click a floor in exploded view to select it
    let down = null;
    this.renderer.domElement.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
    this.renderer.domElement.addEventListener("pointerup", (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || this.explodeTarget !== 1) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      this.raycaster.setFromCamera(ndc, this.camera); this.raycaster.far = Infinity;
      const hit = this.raycaster.intersectObject(this.building, true).find((x) => shown(x.object));
      if (!hit) return;
      let o = hit.object; while (o && !(o.userData && o.userData.stage)) o = o.parent;
      if (o && o.userData.level >= 0) this.selectFloor(o.userData.level);
    });
  }

  reset() {
    this.pauseTimeline();
    this.closeInfo();
    this.setMode(null);
    this.setTimeline(8);
    this.explodeTarget = 0; this.selectFloor(-1);
    Object.keys(OPTIONS).forEach((k) => this.setOption(k, OPTIONS[k].default, true));
    this.applyMode("afternoon");
    this.camera_("front");
    this.announce("Experience reset");
  }

  /* ---------- intro ------------------------------------------------------------------ */
  runIntro() {
    const intro = this.q("[data-xp-intro]");
    this.setMode(null);
    const finalP = [16, 9, 60], finalT = [0, 13, 8];
    if (REDUCE || !window.gsap) {
      this.camera.position.set(...finalP); this.controls.target.set(...finalT);
      this.endIntro(false);
      return;
    }
    this.inIntro = true;
    this.updateHotspotVisibility();
    this.root.classList.add("is-intro");
    intro.hidden = false;
    const path = new THREE.CatmullRomCurve3([
      V([280, 230, 320]), V([150, 110, 190]), V([105, 62, 20]), V([20, 48, -112]), V([-104, 36, -40]), V([-82, 22, 58]), V(finalP),
    ], false, "centripetal");
    const targets = new THREE.CatmullRomCurve3([V([0, 8, 0]), V([0, 18, 0]), V([0, 24, 0]), V([0, 26, 0]), V([0, 22, 0]), V([0, 16, 6]), V(finalT)]);
    const s = { t: 0 };
    const tl = (this.introTl = window.gsap.timeline({ onComplete: () => this.endIntro(false) }));
    tl.to(s, { t: 1, duration: 13, ease: "power1.inOut", onUpdate: () => { this.camera.position.copy(path.getPoint(s.t)); this.controls.target.copy(targets.getPoint(s.t)); } }, 0);
    tl.fromTo(intro.querySelectorAll(".xp-intro-anim"), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.4, ease: "expo.out", stagger: 0.18 }, 0.4);
    tl.to(intro, { opacity: 0, duration: 1.2, ease: "power2.out" }, 10.4);
  }
  endIntro(skipped) {
    if (this.introTl) { this.introTl.kill(); this.introTl = null; }
    if (skipped) { this.camera.position.set(16, 9, 60); this.controls.target.set(0, 13, 8); }
    this.inIntro = false;
    const intro = this.q("[data-xp-intro]");
    intro.hidden = true; intro.style.opacity = "";
    this.root.classList.remove("is-intro");
    this.root.classList.add("is-live");
    this.controls.enabled = true;
    this.setAutoRotate(!REDUCE && !this.userMoved);
    this.updateHotspotVisibility();
    if (skipped) this.stage.focus({ preventScroll: true });
  }

  /* ---------- frame loop ------------------------------------------------------------- */
  resize() {
    const w = this.stage.clientWidth, h = this.stage.clientHeight;
    if (!w || !h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.pr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.updateViewOffset(true);
  }
  updateViewOffset(force) {
    // Keep the building clear of open panels: shift the view left (desktop) or up (mobile).
    const wide = this.w > 900;
    const open = this.root.classList.contains("has-panel");
    const target = open ? (wide ? Math.min(210, this.w * 0.14) : this.h * 0.16) : 0;
    this.panelShift = force || REDUCE ? target : lerp(this.panelShift, target, 0.08);
    if (Math.abs(this.panelShift) < 0.5 && target === 0) { this.camera.clearViewOffset(); }
    else if (wide) this.camera.setViewOffset(this.w, this.h, this.panelShift, 0, this.w, this.h);
    else this.camera.setViewOffset(this.w, this.h, 0, this.panelShift, this.w, this.h);
    this.camera.updateProjectionMatrix();
  }
  adapt(dt) {
    this.frames.push(dt);
    if (this.frames.length < 90) return;
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    this.frames.length = 0;
    if (avg > 0.034) {
      if (this.gtao && this.gtao.enabled) { this.gtao.enabled = false; return; }
      if (this.pr > 0.65) { this.pr = Math.max(0.6, this.pr - 0.15); this.renderer.setPixelRatio(this.pr); this.resize(); }
    } else if (avg < 0.018 && this.pr < this.maxPR) {
      this.pr = Math.min(this.maxPR, this.pr + 0.1); this.renderer.setPixelRatio(this.pr); this.resize();
    }
  }
  tick() {
    requestAnimationFrame(this.tick);
    const dt = Math.min(0.1, this.clock.getDelta());
    if (!this.visible || this.hidden) return;
    this.frame = (this.frame || 0) + 1;

    // Exploded animation and floor slide-out
    const k = REDUCE ? 1 : 1 - Math.pow(0.0015, dt);
    this.explode = lerp(this.explode, this.explodeTarget, k);
    this.slide = lerp(this.slide, this.selected >= 0 ? 1 : 0, k);
    const gap = 2.6;
    for (const p of this.pieces) {
      const lv = p.ud.level;
      p.obj.position.y = p.baseY + (lv >= 0 ? lv * gap * this.explode : 0);
      p.obj.position.z = p.baseZ + (lv === this.selected && lv >= 0 ? 18 * this.slide : 0);
      const hideGlass = this.explode > 0.04;
      p.glass.forEach((m) => { m.visible = !hideGlass; });
    }
    // Interior level-of-detail: skip furniture when the camera is far away
    const far = this.camera.position.length() > 230 && this.explodeTarget === 0;
    this.interiorGroups.forEach((p) => { if (p.built > 0.002) p.obj.visible = !far; });

    this.updateViewOffset(false);
    this.controls.update();
    this.composer.render(dt);
    this.placeHotspots(this.frame);
    this.adapt(dt);
  }
}

/* ======================================================== MOUNT ============ */
export async function mount(root) {
  const xp = new Experience(root);
  root.__xp = xp;
  try {
    await xp.init();
  } catch (err) {
    root.classList.add("is-fallback");
    console.warn("3D experience unavailable, showing a still image.", err);
  }
  return xp;
}
