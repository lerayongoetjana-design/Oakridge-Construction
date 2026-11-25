/* Oakridge Construction: homepage hero, the concept photo rendered in 3D.
   The photo is displaced by a depth map onto a dense mesh and viewed through a
   real perspective camera, so the building, trees and sky separate as the
   camera drifts. Fictional portfolio demonstration by Launch Point Digital. */
import * as THREE from "three";

const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const COARSE = window.matchMedia("(pointer: coarse)").matches;
const asset = (p) => new URL(`../${p}`, import.meta.url).href;
const lerp = (a, b, t) => a + (b - a) * t;

const VERT = /* glsl */ `
  uniform sampler2D depthMap;
  uniform float depthScale;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    float d = texture2D(depthMap, uv).r;          // 1 = near, 0 = far
    vec3 p = position;
    p.z += (d - 0.5) * depthScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const FRAG = /* glsl */ `
  uniform sampler2D photo;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(photo, vUv);
    #include <colorspace_fragment>
  }`;

export async function mount(root) {
  const stage = root.querySelector("[data-depth-stage]") || root;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, COARSE ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "depth-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  stage.appendChild(renderer.domElement);

  const tl = new THREE.TextureLoader();
  const [photo, depth] = await Promise.all([
    tl.loadAsync(asset(COARSE ? "img/hero-office-960.jpg" : "img/hero-office.jpg")),
    tl.loadAsync(asset("img/hero-office-depth.png")),
  ]);
  photo.colorSpace = THREE.SRGBColorSpace;
  photo.anisotropy = renderer.capabilities.getMaxAnisotropy();
  depth.colorSpace = THREE.NoColorSpace;
  photo.minFilter = THREE.LinearMipmapLinearFilter;

  const aspect = 1672 / 941;
  const W = 2 * aspect, H = 2;
  const seg = COARSE ? 220 : 360;
  const geo = new THREE.PlaneGeometry(W, H, seg, Math.round(seg / aspect));
  const mat = new THREE.ShaderMaterial({
    uniforms: { photo: { value: photo }, depthMap: { value: depth }, depthScale: { value: 0.42 } },
    vertexShader: VERT, fragmentShader: FRAG,
  });
  const mesh = new THREE.Mesh(geo, mat);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c1c1c);
  scene.add(mesh);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const baseDist = 1 / Math.tan(THREE.MathUtils.degToRad(15)); // plane height 2 fills the frame
  let w = 1, h = 1, visible = true;
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  let scrollP = 0;

  function resize() {
    w = stage.clientWidth; h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(root);

  if (!REDUCE) {
    if (!COARSE) window.addEventListener("pointermove", (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
    window.addEventListener("scroll", () => {
      scrollP = Math.min(1, Math.max(0, window.scrollY / Math.max(1, root.offsetHeight)));
    }, { passive: true });
  }

  const t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const t = (now - t0) / 1000;
    mouse.sx = lerp(mouse.sx, mouse.x, 0.05);
    mouse.sy = lerp(mouse.sy, mouse.y, 0.05);
    // "Cover" fit: pull in until the photo fills the viewport even at the drift extremes.
    const coverScale = Math.max(1, camera.aspect / aspect) * 1.05;
    const intro = REDUCE ? 1 : 1 - Math.pow(1 - Math.min(1, t / 3.2), 3); // gentle dolly-in on load
    const drift = REDUCE ? 0 : Math.sin(t * 0.18);
    const x = (REDUCE ? 0 : drift * 0.06 + mouse.sx * 0.1);
    const y = (REDUCE ? 0 : Math.sin(t * 0.13) * 0.03 - mouse.sy * 0.05) + scrollP * 0.12;
    const z = baseDist / coverScale + (1 - intro) * 0.45 - scrollP * 0.25;
    camera.position.set(x, y, z);
    camera.lookAt(x * 0.35, y * 0.35 + scrollP * 0.05, 0);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  root.classList.add("is-ready");
  return { renderer };
}
