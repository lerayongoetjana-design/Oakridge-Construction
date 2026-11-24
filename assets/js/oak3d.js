/* Oakridge Construction: 3D architectural engine (Three.js / WebGL)
   Fictional portfolio demonstration by Launch Point Digital.
   Loaded on demand by main.js when a [data-oak3d] element nears the viewport. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const MODEL_URL = (name) => new URL(`../models/${name}.glb`, import.meta.url).href;
const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const COARSE = window.matchMedia("(pointer: coarse)").matches;

export const MODELS = {
  residential: {
    title: "Constantia Hill Villa", type: "Residential", location: "Constantia, Cape Town",
    text: "A two-storey family home with a cantilevered timber-clad upper floor, full-height glazing and a pool terrace.",
    facts: [["Storeys", "2"], ["Structure", "Concrete & steel"], ["Envelope", "Render, timber, glass"]],
    hotspots: {
      hs_cantilever: ["Cantilevered upper floor", "The timber-clad upper volume projects beyond the ground floor, creating a shaded terrace below."],
      hs_glazing: ["Full-height glazing", "Sliding glass walls open the living spaces completely onto the garden and pool deck."],
      hs_pool: ["Pool & timber deck", "A pool set into a hardwood deck, aligned with the main living room for long views."],
      hs_roof: ["Insulated flat roof", "Concealed roof structure with space reserved for solar panels and water heating."],
    },
  },
  commercial: {
    title: "The Sandton Exchange", type: "Commercial", location: "Sandton, Johannesburg",
    text: "A premium office tower on a two-storey podium, wrapped in glass and bronze fins that shade the façade.",
    facts: [["Storeys", "14 + crown"], ["Structure", "Concrete core & frame"], ["Envelope", "Glass & bronze fins"]],
    hotspots: {
      hs_facade: ["Shaded glass façade", "Vertical bronze fins cut glare and solar heat while keeping views open from every floor."],
      hs_core: ["Concrete core", "The central core holds lifts, stairs and services, and gives the tower its stability."],
      hs_podium: ["Retail podium", "A double-height podium with a bronze entrance canopy facing the public plaza."],
      hs_crown: ["Rooftop crown", "A bronze frame conceals rooftop plant and gives the tower a distinctive silhouette."],
    },
  },
  industrial: {
    title: "Midrand Logistics Park", type: "Industrial", location: "Midrand, Gauteng",
    text: "A distribution warehouse with a clear-span steel frame, eight loading docks and a two-storey glass office.",
    facts: [["Clear span", "Steel portal frame"], ["Docks", "8 loading bays"], ["Office", "2 storeys"]],
    hotspots: {
      hs_docks: ["Loading docks", "Eight dock levellers under a continuous canopy for all-weather loading."],
      hs_frame: ["Steel portal frame", "A clear-span frame leaves the warehouse floor free of internal columns."],
      hs_office: ["Glass office pavilion", "Two storeys of offices overlooking the yard, with a separate visitor entrance."],
      hs_roof: ["Roof with skylights", "Skylight strips bring daylight deep into the warehouse and cut lighting costs."],
    },
  },
};

export const STAGES = [
  { at: 0.0, label: "Site & foundations" },
  { at: 0.12, label: "Structural frame" },
  { at: 0.45, label: "Façade & envelope" },
  { at: 0.8, label: "Roof & services" },
  { at: 0.9, label: "Landscaping & handover" },
];

const WINDOWS = {
  foundation: [0, 0.12], frame: [0.1, 0.55], facade: [0.42, 0.82], roof: [0.78, 0.9], site: [0.86, 1],
};

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

/* Model loading (cached) -------------------------------------------------- */
const loader = new GLTFLoader();
const cache = new Map();
function loadModel(name) {
  if (!cache.has(name)) cache.set(name, loader.loadAsync(MODEL_URL(name)));
  return cache.get(name).then((g) => g.scene.clone(true));
}

/* Building: construction progress, exploded view, hotspots --------------- */
class Building {
  constructor(scene, name, dusk) {
    this.name = name;
    this.object = scene;
    this.pieces = [];
    this.hotspots = [];
    this.gap = 3;
    scene.traverse((o) => {
      if (o.userData && o.userData.explodeGap) this.gap = o.userData.explodeGap;
      if (o.userData && o.userData.phase) {
        this.pieces.push({ obj: o, phase: o.userData.phase, level: o.userData.level, baseY: o.position.y });
      }
      if (o.isMesh) {
        const site = o.parent && o.parent.userData.phase === "site";
        o.castShadow = !site;
        o.receiveShadow = true;
        // Each viewer gets its own materials so dusk and daylight scenes can differ.
        const m = (o.material = o.material.clone());
        m.envMapIntensity = /glass/.test(m.name) ? 1.6 : m.name === "bronze" ? 1.3 : 0.7;
        if (m.name === "glass-warm") m.emissiveIntensity = dusk ? 1.4 : 0.12;
      }
      if (o.name && o.name.startsWith("hs_")) this.hotspots.push({ id: o.name, obj: o });
    });
    // Assign each piece a time window inside its phase.
    const byPhase = {};
    this.pieces.forEach((p) => (byPhase[p.phase] = byPhase[p.phase] || []).push(p));
    Object.keys(byPhase).forEach((ph) => {
      const list = byPhase[ph].sort((a, b) => a.level - b.level);
      const w = WINDOWS[ph] || [0, 1];
      const span = w[1] - w[0];
      const n = list.length;
      const dur = n === 1 ? span : Math.min(span, (span / n) * 2.6);
      list.forEach((p, i) => { p.start = w[0] + (n === 1 ? 0 : ((span - dur) * i) / (n - 1)); p.dur = dur; });
    });
    this.progress = 1;
    this.explode = 0;
    this.measure();
  }
  measure() {
    this.apply(1, 0);
    const box = new THREE.Box3();
    this.pieces.forEach((p) => { if (p.phase !== "site" && p.phase !== "crane") box.expandByObject(p.obj); });
    this.box = box;
    this.center = box.getCenter(new THREE.Vector3());
    this.size = box.getSize(new THREE.Vector3());
    this.radius = this.size.length() / 2;
  }
  apply(progress, explode) {
    this.progress = progress;
    this.explode = explode;
    for (const p of this.pieces) {
      let t;
      if (p.phase === "crane") {
        t = progress < 0.08 ? progress / 0.08 : progress > 0.84 ? 1 - (progress - 0.84) / 0.06 : 1;
      } else {
        t = (progress - p.start) / p.dur;
      }
      const e = easeOut(clamp(t));
      p.built = e;
      p.obj.visible = e > 0.002;
      if (p.phase === "site") p.obj.scale.set(1, Math.max(e, 0.001), 1);
      else if (p.phase === "crane") p.obj.scale.set(1, Math.max(e, 0.001), 1);
      else p.obj.scale.set(1, Math.max(e, 0.001), 1);
      const lift = p.level > 0 ? p.level * this.gap * explode : 0;
      p.obj.position.y = p.baseY + lift;
    }
  }
  isBuilt(obj) {
    let o = obj;
    while (o && !(o.userData && o.userData.phase)) o = o.parent;
    if (!o) return true;
    const p = this.pieces.find((x) => x.obj === o);
    return !p || p.built > 0.97;
  }
}

function backgroundTexture(top, mid, bottom) {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 256;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, top); grd.addColorStop(0.62, mid); grd.addColorStop(1, bottom);
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* Viewer ------------------------------------------------------------------ */
export class Viewer {
  constructor(container, opts = {}) {
    this.el = container;
    this.mode = opts.mode || "studio";
    this.opts = opts;
    this.progressTarget = opts.progress != null ? opts.progress : 1;
    this.progress = this.progressTarget;
    this.explodeTarget = 0;
    this.explode = 0;
    this.showHotspots = this.mode === "studio";
    this.mouse = { x: 0, y: 0, sx: 0, sy: 0 };
    this.visible = true;
    this.start = performance.now();
    this.listeners = {};

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: !COARSE || window.devicePixelRatio < 2, powerPreference: "high-performance", preserveDrawingBuffer: !!opts.capture }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, COARSE ? 1.5 : 1.75));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = this.mode === "hero" ? 1.25 : 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.className = "oak3d-canvas";
    r.domElement.setAttribute("role", "img");
    container.appendChild(r.domElement);

    const scene = (this.scene = new THREE.Scene());
    const dusk = this.mode === "hero";
    scene.background = dusk
      ? backgroundTexture("#161514", "#3a3029", "#7a5a3a")
      : backgroundTexture("#161616", "#22201d", "#2b2723");
    scene.fog = new THREE.Fog(dusk ? 0x4a3a2c : 0x24211e, dusk ? 220 : 160, dusk ? 700 : 520);

    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(r), 0.04).texture;

    scene.add(new THREE.HemisphereLight(0xf5f2eb, 0x1c1c1c, dusk ? 0.7 : 0.55));
    const sun = (this.sun = new THREE.DirectionalLight(dusk ? 0xffc48a : 0xfff1dc, dusk ? 3.4 : 2.4));
    sun.castShadow = true;
    sun.shadow.mapSize.set(COARSE ? 1024 : 2048, COARSE ? 1024 : 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);
    const rim = new THREE.DirectionalLight(0xb58b52, dusk ? 1.1 : 0.5);
    rim.position.set(-80, 40, -90);
    scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(900, 64),
      new THREE.MeshStandardMaterial({ color: dusk ? 0x2a2622 : 0x2c2925, roughness: 1, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    scene.add(ground);

    this.camera = new THREE.PerspectiveCamera(this.mode === "studio" ? 38 : 32, 1, 0.5, 2500);

    if (this.mode === "studio") {
      const c = (this.controls = new OrbitControls(this.camera, r.domElement));
      c.enableDamping = true;
      c.dampingFactor = 0.07;
      c.maxPolarAngle = Math.PI * 0.49;
      c.screenSpacePanning = true;
      c.autoRotateSpeed = 0.55;
      c.addEventListener("start", () => this.emit("interact"));
    }

    // Hotspot layer
    this.hsLayer = document.createElement("div");
    this.hsLayer.className = "oak3d-hotspots";
    this.hsLayer.hidden = !this.showHotspots;
    container.appendChild(this.hsLayer);

    this.resize = this.resize.bind(this);
    new ResizeObserver(this.resize).observe(container);
    this.resize();

    new IntersectionObserver((e) => { this.visible = e[0].isIntersecting; }, { rootMargin: "100px" }).observe(container);
    document.addEventListener("visibilitychange", () => { this.hidden = document.hidden; });

    if (this.mode === "hero" && !COARSE && !REDUCE) {
      window.addEventListener("pointermove", (e) => {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
      }, { passive: true });
    }

    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }

  on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); }
  emit(ev, data) { (this.listeners[ev] || []).forEach((f) => f(data)); }

  async setModel(name) {
    this.el.classList.add("is-loading-model");
    this.modelName = name;
    const obj = await loadModel(name);
    if (this.modelName !== name) return;
    if (this.building) this.scene.remove(this.building.object);
    const b = (this.building = new Building(obj, name, this.mode === "hero"));
    this.scene.add(obj);
    this.renderer.domElement.setAttribute("aria-label", `Interactive 3D model of ${MODELS[name].title}, a fictional ${MODELS[name].type.toLowerCase()} building`);

    // Frame the building and fit the shadow camera.
    const R = Math.max(b.size.x, b.size.z, b.size.y);
    const s = this.sun.shadow.camera;
    const ext = R * 0.9;
    s.left = -ext * 1.3; s.right = ext * 1.3; s.top = ext * 1.3; s.bottom = -ext * 1.3; s.near = 1; s.far = R * 6;
    s.updateProjectionMatrix();
    this.sun.position.set(b.center.x - R * 1.1, R * 1.35, b.center.z + R * 0.55);
    this.sun.target.position.copy(b.center);
    this.computeFit();

    if (this.controls) {
      const c = this.controls;
      c.target.copy(b.center);
      this.resetView(true);
      if (!REDUCE && this.opts.assemble !== false) { this.progress = 0; }
    }
    this.buildHotspots();
    b.apply(this.progress, this.explode);
    this.el.classList.remove("is-loading-model");
    this.el.classList.add("is-3d-ready");
    this.emit("model", name);
  }

  computeFit() {
    const b = this.building;
    if (!b) return;
    // Fit the model to whichever of the vertical or horizontal field of view is tighter.
    const v = (this.camera.fov * Math.PI) / 180;
    const h = 2 * Math.atan(Math.tan(v / 2) * this.camera.aspect);
    this.fitDistance = (b.radius / Math.sin(Math.min(v, h) / 2)) * 0.95;
    if (this.controls) {
      this.controls.minDistance = this.fitDistance * 0.35;
      this.controls.maxDistance = this.fitDistance * 2.2;
    }
  }

  resetView(instant) {
    if (!this.building || !this.controls) return;
    const b = this.building, d = this.fitDistance;
    const pos = new THREE.Vector3(b.center.x + d * 0.62, b.center.y + d * 0.42, b.center.z + d * 0.68);
    this.controls.target.copy(b.center);
    if (instant || REDUCE) this.camera.position.copy(pos);
    else this.camTween = { from: this.camera.position.clone(), to: pos, t: 0 };
  }

  orbitBy(dAz, dPol) {
    if (!this.controls) return;
    const c = this.controls, off = this.camera.position.clone().sub(c.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.theta += dAz;
    sph.phi = clamp(sph.phi + dPol, 0.15, c.maxPolarAngle);
    off.setFromSpherical(sph);
    this.camera.position.copy(c.target).add(off);
  }
  zoomBy(f) {
    if (!this.controls) return;
    const c = this.controls, off = this.camera.position.clone().sub(c.target);
    const len = clamp(off.length() * f, c.minDistance, c.maxDistance);
    this.camera.position.copy(c.target).add(off.setLength(len));
  }

  setProgress(p, instant) { this.progressTarget = clamp(p); if (instant) this.progress = this.progressTarget; }
  setExplode(on) {
    if ((this.explodeTarget === 1) === on) return;
    this.explodeTarget = on ? 1 : 0;
    if (REDUCE) this.explode = this.explodeTarget;
    // Pull the camera back (or in) so the separated levels stay in frame.
    if (this.controls && this.building) {
      const c = this.controls, off = this.camera.position.clone().sub(c.target);
      const lift = this.building.size.y * 0.35 * (on ? 1 : -1);
      const to = c.target.clone().add(off.multiplyScalar(on ? 1.4 : 1 / 1.4));
      const target = c.target.clone().setY(c.target.y + lift);
      if (REDUCE) { this.camera.position.copy(to); c.target.copy(target); }
      else this.camTween = { from: this.camera.position.clone(), to, t: 0, tFrom: c.target.clone(), tTo: target };
    }
  }
  setHotspots(on) { this.showHotspots = on; this.hsLayer.hidden = !on; }
  setAutoRotate(on) { if (this.controls) this.controls.autoRotate = on && !REDUCE; }

  buildHotspots() {
    this.hsLayer.innerHTML = "";
    const info = MODELS[this.modelName].hotspots;
    this.hsButtons = this.building.hotspots.map((h, i) => {
      const data = info[h.id] || [h.id, ""];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "oak3d-hs";
      btn.innerHTML = `<span aria-hidden="true">${i + 1}</span>`;
      btn.setAttribute("aria-label", `Hotspot ${i + 1}: ${data[0]}`);
      btn.addEventListener("click", () => this.emit("hotspot", { index: i, title: data[0], text: data[1], button: btn }));
      this.hsLayer.appendChild(btn);
      return { btn, obj: h.obj };
    });
  }

  resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    if (this.mode === "hero" && w > 900) {
      // Shift the frame so the tower sits to the right of the headline.
      this.camera.setViewOffset(w, h, -w * 0.27, 0, w, h);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
    this.computeFit();
  }

  updateCamera(now) {
    const b = this.building;
    if (!b) return;
    const time = (now - this.start) / 1000;
    if (this.mode === "hero") {
      const k = REDUCE ? 1 : easeInOut(clamp(time / 5.5));
      const portrait = this.h > this.w;
      const radius = lerp(320, 182, k) * (portrait ? 1.6 : 1);
      this.mouse.sx = lerp(this.mouse.sx, this.mouse.x, 0.04);
      this.mouse.sy = lerp(this.mouse.sy, this.mouse.y, 0.04);
      const angle = -0.75 + (REDUCE ? 0 : time * 0.035) + this.mouse.sx * 0.08;
      const height = lerp(170, 12, k) + this.mouse.sy * 5;
      this.camera.position.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
      this.camera.lookAt(0, lerp(8, portrait ? 34 : 31, k), 0);
      if (!this.opts.staticProgress) this.progressTarget = REDUCE ? 1 : easeInOut(clamp((time - 0.8) / 4));
      this.progress = this.progressTarget;
    } else if (this.mode === "build") {
      const p = this.progress;
      const d = this.fitDistance || 100;
      const angle = 0.7 + p * 1.0;
      const height = lerp(d * 0.95, d * 0.34, easeInOut(p));
      const radius = lerp(d * 0.8, d * 0.98, p) * (this.h > this.w ? 1.35 : 1);
      this.camera.position.set(b.center.x + Math.sin(angle) * radius, height, b.center.z + Math.cos(angle) * radius);
      this.camera.lookAt(b.center.x, lerp(0, b.center.y * 0.9, p), b.center.z);
    } else if (this.camTween) {
      const tw = this.camTween;
      tw.t = Math.min(1, tw.t + 0.025);
      this.camera.position.lerpVectors(tw.from, tw.to, easeInOut(tw.t));
      if (tw.tFrom && this.controls) this.controls.target.lerpVectors(tw.tFrom, tw.tTo, easeInOut(tw.t));
      if (tw.t >= 1) this.camTween = null;
    }
  }

  tick(now) {
    requestAnimationFrame(this.tick);
    if ((!this.visible || this.hidden) && !this.opts.capture) return;
    const b = this.building;
    if (b) {
      if (this.mode !== "hero") {
        const k = this.mode === "build" ? 0.12 : 0.045;
        this.progress = REDUCE ? this.progressTarget : lerp(this.progress, this.progressTarget, k);
        if (Math.abs(this.progress - this.progressTarget) < 0.0005) this.progress = this.progressTarget;
      }
      this.explode = REDUCE ? this.explodeTarget : lerp(this.explode, this.explodeTarget, 0.07);
      b.apply(this.progress, this.explode);
    }
    this.updateCamera(now);
    if (this.controls) this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (b && this.showHotspots && this.hsButtons) this.placeHotspots();
    if (b && !this.ready) { this.ready = true; this.emit("ready"); }
  }

  placeHotspots() {
    const v = new THREE.Vector3();
    for (const h of this.hsButtons) {
      h.obj.getWorldPosition(v);
      v.project(this.camera);
      const on = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && this.building.isBuilt(h.obj);
      h.btn.classList.toggle("is-off", !on);
      h.btn.tabIndex = on ? 0 : -1;
      if (on) h.btn.style.transform = `translate(${((v.x + 1) / 2) * this.w}px, ${((1 - v.y) / 2) * this.h}px)`;
    }
  }
}

/* Mounting: wires each [data-oak3d] block to its UI ---------------------- */
function stageFor(p) {
  let s = 0;
  STAGES.forEach((st, i) => { if (p >= st.at) s = i; });
  return s;
}

export function mount(el) {
  const mode = el.getAttribute("data-oak3d");
  const section = el.closest("[data-oak3d-section]") || el.parentElement;
  const model = el.getAttribute("data-model") || "commercial";
  const viewer = new Viewer(el, { mode, capture: el.hasAttribute("data-capture"), progress: mode === "build" ? 0 : 1 });
  el.__viewer = viewer;
  viewer.on("ready", () => el.classList.add("is-3d-ready"));
  // Start the cinematic hero sequence once the page loader has finished.
  if (mode === "hero" && window.oakIntro) window.oakIntro.then(() => { viewer.start = performance.now(); });

  // Model selection tabs
  const tabs = section.querySelectorAll("[data-model-tab]");
  function selectModel(name) {
    tabs.forEach((t) => {
      const on = t.getAttribute("data-model-tab") === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    const m = MODELS[name];
    section.querySelectorAll("[data-model-field]").forEach((f) => {
      const key = f.getAttribute("data-model-field");
      if (key === "facts") {
        f.innerHTML = m.facts.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("");
      } else if (m[key] != null) f.textContent = m[key];
    });
    const card = section.querySelector("[data-hotspot-card]");
    if (card) card.hidden = true;
    const still = el.querySelector(".oak3d-fallback");
    if (still) still.src = new URL(`../img/3d/${name}.jpg`, import.meta.url).href;
    viewer.setModel(name);
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectModel(t.getAttribute("data-model-tab")));
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus(); next.click();
    });
  });

  // Start model: ?model= on the studio page
  let start = model;
  try {
    const q = new URLSearchParams(location.search).get("model");
    if (q && MODELS[q] && mode === "studio") start = q;
  } catch (e) { /* ignore */ }
  if (tabs.length) selectModel(start); else viewer.setModel(start);

  // Construction progress: scroll (via main.js) or slider
  const range = section.querySelector("[data-progress-range]");
  const stageEls = section.querySelectorAll("[data-stage]");
  const bar = section.querySelector("[data-progress-bar]");
  const pct = section.querySelector("[data-progress-pct]");
  function reflect(p) {
    const s = stageFor(p);
    stageEls.forEach((li, i) => {
      li.classList.toggle("is-active", i === s);
      li.classList.toggle("is-done", i < s);
    });
    if (bar) bar.style.transform = `scaleX(${p})`;
    if (pct) pct.textContent = Math.round(p * 100) + "%";
    if (range && document.activeElement !== range) range.value = Math.round(p * 100);
  }
  el.__setProgress = (p) => { viewer.setProgress(p); reflect(p); };
  if (range) {
    range.addEventListener("input", () => { const p = range.value / 100; viewer.setProgress(p); reflect(p); });
  }
  if (mode === "studio") reflect(1);
  if (mode === "build") reflect(el.__pendingProgress || 0), viewer.setProgress(el.__pendingProgress || 0, true);

  // Studio controls
  section.querySelectorAll("[data-action]").forEach((btn) => {
    const act = btn.getAttribute("data-action");
    btn.addEventListener("click", () => {
      if (act === "explode" || act === "hotspots" || act === "rotate") {
        const on = btn.getAttribute("aria-pressed") !== "true";
        btn.setAttribute("aria-pressed", String(on));
        if (act === "explode") viewer.setExplode(on);
        if (act === "hotspots") { viewer.setHotspots(on); if (!on) hideCard(); }
        if (act === "rotate") viewer.setAutoRotate(on);
      }
      if (act === "reset") { viewer.resetView(); viewer.setProgress(1); reflect(1); }
      if (act === "zoom-in") viewer.zoomBy(0.8);
      if (act === "zoom-out") viewer.zoomBy(1.25);
    });
  });
  viewer.on("interact", () => {
    const rot = section.querySelector('[data-action="rotate"]');
    if (rot && rot.getAttribute("aria-pressed") === "true") { rot.setAttribute("aria-pressed", "false"); viewer.setAutoRotate(false); }
  });

  // Keyboard orbit on the canvas wrapper
  if (mode === "studio") {
    el.tabIndex = 0;
    el.addEventListener("keydown", (e) => {
      const k = e.key;
      if (k === "ArrowLeft") viewer.orbitBy(-0.12, 0);
      else if (k === "ArrowRight") viewer.orbitBy(0.12, 0);
      else if (k === "ArrowUp") viewer.orbitBy(0, -0.08);
      else if (k === "ArrowDown") viewer.orbitBy(0, 0.08);
      else if (k === "+" || k === "=") viewer.zoomBy(0.85);
      else if (k === "-" || k === "_") viewer.zoomBy(1.18);
      else return;
      e.preventDefault();
    });
  }

  // Hotspot card
  const card = section.querySelector("[data-hotspot-card]");
  function hideCard() { if (card) card.hidden = true; }
  if (card) {
    const close = card.querySelector("[data-hotspot-close]");
    if (close) close.addEventListener("click", hideCard);
    viewer.on("hotspot", ({ index, title, text, button }) => {
      card.querySelector("[data-hotspot-num]").textContent = String(index + 1).padStart(2, "0");
      card.querySelector("[data-hotspot-title]").textContent = title;
      card.querySelector("[data-hotspot-text]").textContent = text;
      card.hidden = false;
      card.__from = button;
    });
    card.addEventListener("keydown", (e) => { if (e.key === "Escape") { hideCard(); if (card.__from) card.__from.focus(); } });
  }
  if (mode === "studio") viewer.setAutoRotate(true);
  return viewer;
}
