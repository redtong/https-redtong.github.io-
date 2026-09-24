import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = s => document.querySelector(s);
const canvas = $('#scene');
const scene = new THREE.Scene();
scene.name = 'Afterglow fireworks';
scene.background = new THREE.Color('#040b19');
const camera = new THREE.PerspectiveCamera(47, innerWidth / innerHeight, .1, 250);
camera.position.set(0, 16, 59);
camera.lookAt(0, 14, 0);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
} catch (error) {
  $('#loading h2').textContent = '无法启动三维场景';
  $('#loading p').textContent = '请在支持 WebGL 2 的浏览器中启用硬件加速后重试。';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .86, .48, .36);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// Fixed-capacity typed buffers. Particles are recycled, never allocated as individual Mesh objects.
const CAPACITY = 26000;
const positions = new Float32Array(CAPACITY * 3);
const colors = new Float32Array(CAPACITY * 3);
const sizes = new Float32Array(CAPACITY);
const opacity = new Float32Array(CAPACITY);
const velocity = new Float32Array(CAPACITY * 3);
const ages = new Float32Array(CAPACITY);
const life = new Float32Array(CAPACITY);
const initialSize = new Float32Array(CAPACITY);
const gravity = new Float32Array(CAPACITY);
const drag = new Float32Array(CAPACITY);
const kind = new Uint8Array(CAPACITY);
const trailClock = new Float32Array(CAPACITY);
const phases = new Float32Array(CAPACITY);
const HEAD_CAPACITY = 6000;
let headCursor = 0, trailCursor = HEAD_CAPACITY, seed = 328719;
function random() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }
const range = (a, b) => a + random() * (b - a);
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacity, 1).setUsage(THREE.DynamicDrawUsage));
const vertexShader = `
attribute float aSize;
attribute float aOpacity;
varying vec3 vColor;
varying float vOpacity;
uniform float uScale;
uniform float uMirror;
uniform float uTime;
void main() {
  vec3 p = position;
  if (uMirror > .5) {
    p.y = -p.y * .66 - .35;
    p.x += sin(p.y * 3.8 + uTime * 2.4) * .11 + sin(p.y * 13. - uTime * 1.8) * .035;
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uScale / max(1., -mv.z), 0., 72.);
  vColor = color;
  vOpacity = aOpacity * (uMirror > .5 ? .23 : 1.);
}`;
const fragmentShader = `
varying vec3 vColor;
varying float vOpacity;
uniform float uMirror;
void main() {
  float d = length(gl_PointCoord - .5) * 2.;
  if (d > 1. || vOpacity < .003) discard;
  float glow = exp(-d * d * 5.5) * .46 + exp(-d * d * 45.) * .90;
  float ripple = uMirror > .5 ? (.45 + .55 * pow(sin(gl_FragCoord.y * .63), 2.)) : 1.;
  gl_FragColor = vec4(vColor, glow * vOpacity * ripple);
}`;
function particleMaterial(mirror) {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: innerHeight }, uMirror: { value: mirror }, uTime: { value: 0 } },
    vertexShader, fragmentShader, vertexColors: true, transparent: true,
    depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
}
const particleMat = particleMaterial(0), reflectionMat = particleMaterial(1);
const particles = new THREE.Points(geometry, particleMat);
particles.name = 'Live sparks and luminous trails';
particles.frustumCulled = false;
const reflection = new THREE.Points(geometry, reflectionMat);
reflection.name = 'Water reflection of live sparks';
reflection.frustumCulled = false;
scene.add(reflection, particles);

const starGeo = new THREE.BufferGeometry();
const stars = [], starColors = [];
for (let i = 0; i < 700; i++) {
  stars.push(range(-100, 100), range(4, 90), range(-100, -55));
  const b = range(.12, .60); starColors.push(b * .56, b * .73, b);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
const starField = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: .13, vertexColors: true, transparent: true, opacity: .72, depthWrite: false }));
starField.name = 'Distant star field';
scene.add(starField);
// A quiet water horizon, deliberately unobtrusive so the particles remain the subject.
const horizon = new THREE.Mesh(new THREE.PlaneGeometry(220, .035), new THREE.MeshBasicMaterial({ color: '#1d3b57', transparent: true, opacity: .38 }));
horizon.position.set(0, -.2, -10); scene.add(horizon);
for (let i = 0; i < 14; i++) {
  const line = new THREE.Mesh(new THREE.PlaneGeometry(range(4, 19), .008), new THREE.MeshBasicMaterial({ color: '#17324c', transparent: true, opacity: .16 }));
  line.position.set(range(-32, 32), range(-9, -1), range(-10, 2)); scene.add(line);
}

const palettes = {
  aurora: ['#64e8ff', '#b490ff', '#ff89d2', '#ffd4ae'],
  gold: ['#ffd78a', '#ffaf49', '#fff0b7', '#ffdc8c'],
  ice: ['#64eeff', '#92baff', '#b6fff4', '#6b83ff'],
  rose: ['#ff79a9', '#d09aff', '#ffb6d6', '#ff655b'],
};
const paletteColors = Object.fromEntries(Object.entries(palettes).map(([k, v]) => [k, v.map(c => new THREE.Color(c))]));
const names = { peony: '星芒牡丹', willow: '流金垂柳', ring: '星环交响', heart: '心形绽放' };
const state = { time: 0, paused: false, auto: true, shape: 'peony', palette: 'aurora', density: 1, bloom: true, launched: 0, exploded: 0, active: 0, fps: 0, lastShape: null, nextAuto: 2.4, showRemaining: 0 };
const rockets = [], events = [];
const white = new THREE.Color('#fff5db');
function spawn(x, y, z, vx, vy, vz, color, size, duration, type = 0, g = 3.1, damping = .62) {
  // Keep emitters in a separate ring so their own dense trails cannot evict them.
  const i = type > 0 ? headCursor : trailCursor;
  if (type > 0) headCursor = (headCursor + 1) % HEAD_CAPACITY;
  else trailCursor = HEAD_CAPACITY + (trailCursor - HEAD_CAPACITY + 1) % (CAPACITY - HEAD_CAPACITY);
  const k = i * 3;
  positions[k] = x; positions[k + 1] = y; positions[k + 2] = z;
  velocity[k] = vx; velocity[k + 1] = vy; velocity[k + 2] = vz;
  colors[k] = color.r * 1.65; colors[k + 1] = color.g * 1.65; colors[k + 2] = color.b * 1.65;
  ages[i] = 0; life[i] = duration; initialSize[i] = size; sizes[i] = size; opacity[i] = 1;
  gravity[i] = g; drag[i] = damping; kind[i] = type; trailClock[i] = range(0, .035); phases[i] = range(0, Math.PI * 2);
  return i;
}
function launch(x = range(innerWidth < 700 ? -6 : -13, innerWidth < 700 ? 6 : 13), y = range(16, 25), options = {}) {
  if (rockets.length >= 18) return false;
  const shape = options.shape || state.shape;
  const palette = options.palette || state.palette;
  const z = options.z ?? range(-5, 4);
  const start = new THREE.Vector3(x * .55 + range(-2, 2), .1, z);
  const target = new THREE.Vector3(x, y, z);
  rockets.push({ start, target, age: 0, duration: range(.95, 1.35), shape, palette, colorIndex: Math.floor(random() * 4), density: state.density, trail: 0 });
  state.launched++;
  return true;
}
function burst(rocket) {
  const { target: p, shape, palette, colorIndex, density } = rocket;
  const list = paletteColors[palette];
  const primary = list[colorIndex % list.length];
  state.exploded++; state.lastShape = shape;
  const count = Math.round((shape === 'willow' ? 220 : shape === 'heart' ? 240 : 320) * density);
  const baseSpeed = shape === 'willow' ? 10.5 : 12.6;
  for (let j = 0; j < count; j++) {
    let vx, vy, vz;
    const a = j * Math.PI * (3 - Math.sqrt(5));
    const t = j / count;
    if (shape === 'heart') {
      const angle = t * Math.PI * 2;
      vx = Math.pow(Math.sin(angle), 3) * 8.2;
      vy = (13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) * .51;
      vz = range(-.5, .5);
    } else if (shape === 'ring') {
      const angle = t * Math.PI * 2 * 3;
      const ring = j % 3;
      vx = Math.cos(angle) * baseSpeed;
      vy = Math.sin(angle) * baseSpeed * (ring === 1 ? .33 : .95);
      vz = Math.sin(angle) * baseSpeed * (ring === 1 ? .95 : .15) + Math.cos(angle) * (ring === 2 ? 4.5 : 0);
    } else {
      const ny = 1 - 2 * (j + .5) / count;
      const radial = Math.sqrt(1 - ny * ny);
      const s = baseSpeed * range(.78, 1.08);
      vx = Math.cos(a) * radial * s; vy = ny * s; vz = Math.sin(a) * radial * s;
    }
    const c = shape === 'ring' ? list[j % 3] : shape === 'willow' ? list[j % 4] : primary;
    const duration = shape === 'willow' ? range(3.2, 4.6) : shape === 'heart' ? range(2.0, 2.9) : range(1.8, 3.25);
    spawn(p.x, p.y, p.z, vx, vy, vz, c, range(.20, .31), duration, shape === 'willow' ? 2 : 1, shape === 'willow' ? 2.7 : 2.4, shape === 'heart' ? .59 : .64);
  }
  // Hot ignition core fades rapidly while the slower shell remains visible.
  for (let j = 0; j < 32; j++) spawn(p.x, p.y, p.z, range(-2, 2), range(-2, 2), range(-2, 2), white, range(.3, .9), range(.12, .32), 0, 0, 3);
  $('#last-burst').textContent = names[shape];
}

function step(dt) {
  if (state.paused) return;
  state.time += dt;
  if (state.auto && state.time >= state.nextAuto) {
    launch(); state.nextAuto = state.time + range(1.15, 1.95);
  }
  for (let i = events.length - 1; i >= 0; i--) {
    if (state.time >= events[i].at) { const e = events.splice(i, 1)[0]; launch(e.x, e.y, e.options); }
  }
  state.showRemaining = events.length;
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i]; r.age += dt;
    const u = Math.min(1, r.age / r.duration), q = 1 - (1 - u) * (1 - u);
    const x = THREE.MathUtils.lerp(r.start.x, r.target.x, q);
    const y = THREE.MathUtils.lerp(r.start.y, r.target.y, q);
    r.trail += dt;
    while (r.trail >= .012) {
      r.trail -= .012;
      spawn(x + range(-.035, .035), y, r.target.z, range(-.14, .14), range(-1.8, -.5), range(-.15, .15), white, .12, range(.28, .56), 0, 1.2, 1.2);
      spawn(x, y, r.target.z, 0, 0, 0, white, .29, .075, 0, 0, 0);
    }
    if (u >= 1) { burst(r); rockets.splice(i, 1); }
  }
  let active = 0;
  for (let i = 0; i < CAPACITY; i++) {
    if (life[i] <= 0) continue;
    ages[i] += dt;
    if (ages[i] >= life[i]) { life[i] = 0; sizes[i] = 0; opacity[i] = 0; continue; }
    const k = i * 3, damper = Math.exp(-drag[i] * dt);
    const px = positions[k], py = positions[k + 1], pz = positions[k + 2];
    velocity[k] *= damper; velocity[k + 1] = velocity[k + 1] * damper - gravity[i] * dt; velocity[k + 2] *= damper;
    positions[k] += velocity[k] * dt; positions[k + 1] += velocity[k + 1] * dt; positions[k + 2] += velocity[k + 2] * dt;
    const fraction = ages[i] / life[i];
    const fade = Math.pow(1 - fraction, kind[i] ? .58 : 1.45);
    const twinkle = fraction > .55 && kind[i] ? .55 + .45 * Math.pow(Math.sin(state.time * 26 + phases[i]), 2) : 1;
    opacity[i] = fade * twinkle;
    sizes[i] = initialSize[i] * (.58 + .42 * fade);
    if (positions[k + 1] < .1) { life[i] = 0; sizes[i] = opacity[i] = 0; continue; }
    active++;
    if (kind[i] > 0 && fraction < .84) {
      trailClock[i] += dt;
      if (trailClock[i] > .024) {
        trailClock[i] %= .024;
        const color = { r: colors[k] / 1.65, g: colors[k + 1] / 1.65, b: colors[k + 2] / 1.65 };
        const ti = spawn(px, py, pz, velocity[k] * .08, velocity[k + 1] * .06, velocity[k + 2] * .08, color, initialSize[i] * .77, kind[i] === 2 ? .62 : .27, 0, .55, 2.0);
        opacity[ti] = fade;
      }
    }
  }
  state.active = active;
  particleMat.uniforms.uTime.value = reflectionMat.uniforms.uTime.value = state.time;
  for (const attr of Object.values(geometry.attributes)) attr.needsUpdate = true;
}
function render() { composer.render(); }
function setPaused(value) {
  state.paused = value;
  $('#pause').setAttribute('aria-pressed', String(value));
  $('#pause').textContent = value ? '继续播放' : '暂停';
  $('#status').textContent = value ? '已暂停' : '实时演算';
  document.body.classList.toggle('paused', value);
}
function finale() {
  setPaused(false);
  if (events.length) { toast('齐放正在进行'); return; }
  const count = 9;
  for (let i = 0; i < count; i++) {
    const width = innerWidth < 700 ? 7 : 17;
    events.push({ at: state.time + i * .25, x: -width + i / (count - 1) * width * 2, y: 17 + Math.sin(i / (count - 1) * Math.PI) * 9,
      options: { shape: ['peony', 'ring', 'willow'][i % 3], palette: state.palette, z: -i % 3 } });
  }
  toast('九重齐放 · 抬头看');
}
let toastTimer;
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2200); }
$('#launch').addEventListener('click', () => { setPaused(false); launch(); });
$('#finale').addEventListener('click', finale);
$('#pause').addEventListener('click', () => setPaused(!state.paused));
$('#auto').addEventListener('change', e => { state.auto = e.target.checked; state.nextAuto = state.time + .4; });
$('#glow').addEventListener('change', e => { state.bloom = e.target.checked; bloom.enabled = state.bloom; });
$('#density').addEventListener('input', e => { state.density = Number(e.target.value); $('#density-value').textContent = state.density.toFixed(1) + '×'; });
for (const button of document.querySelectorAll('[data-shape]')) button.addEventListener('click', () => {
  state.shape = button.dataset.shape;
  for (const b of document.querySelectorAll('[data-shape]')) { const on = b === button; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', String(on)); }
  $('#shape-name').textContent = names[state.shape];
  setPaused(false); launch();
});
for (const button of document.querySelectorAll('[data-palette]')) button.addEventListener('click', () => {
  state.palette = button.dataset.palette;
  for (const b of document.querySelectorAll('[data-palette]')) { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); }
});
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const aim = new THREE.Vector3();
let down;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) return;
  raycaster.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, 1 - e.clientY / innerHeight * 2), camera);
  if (raycaster.ray.intersectPlane(plane, aim)) {
    setPaused(false); launch(THREE.MathUtils.clamp(aim.x, -25, 25), THREE.MathUtils.clamp(aim.y, 9, 30));
    const reticle = $('#reticle'); reticle.style.left = e.clientX + 'px'; reticle.style.top = e.clientY + 'px';
    reticle.classList.remove('pop'); void reticle.offsetWidth; reticle.classList.add('pop');
  }
  down = null;
});
$('#photo').addEventListener('click', () => {
  render();
  canvas.toBlob(blob => {
    if (!blob) return toast('截图失败，请重试');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'afterglow-fireworks.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000); toast('已保存无界面的烟花画面');
  });
});
window.addEventListener('keydown', e => {
  if (/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); finale(); }
  if (e.key.toLowerCase() === 'p') setPaused(!state.paused);
  if (e.key.toLowerCase() === 'h') { document.body.classList.toggle('cinema'); toast('按 H 恢复界面'); }
});
$('#cinema').addEventListener('click', () => { document.body.classList.add('cinema'); toast('按 H 或点击右上角恢复界面'); });
$('#exit-cinema').addEventListener('click', () => document.body.classList.remove('cinema'));
function resize() {
  camera.aspect = innerWidth / innerHeight;
  // Preserve vertical composition on portrait screens, and narrow the automatic launch area.
  camera.fov = innerWidth < 700 ? 55 : 47;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  particleMat.uniforms.uScale.value = reflectionMat.uniforms.uScale.value = innerHeight * renderer.getPixelRatio() * .95;
}
window.addEventListener('resize', resize); resize();
let last = performance.now(), statTime = last, frames = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min((now - last) / 1000, .05); last = now;
  // Small substeps stabilize gravity and trails without changing lifetime when fps varies.
  while (dt > 0.00001) { const h = Math.min(dt, 1 / 60); step(h); dt -= h; }
  render(); frames++;
  if (now - statTime > 450) {
    state.fps = Math.round(frames * 1000 / (now - statTime)); frames = 0; statTime = now;
    $('#particle-count').textContent = state.active.toLocaleString('en-US');
    $('#burst-count').textContent = String(state.exploded).padStart(2, '0');
    $('#fps').textContent = state.fps;
  }
}
function snapshot() {
  let finite = true, lit = 0, heads = 0, checksum = 0;
  const colorsPresent = new Set();
  for (let i = 0; i < CAPACITY; i++) if (life[i] > 0) {
    if (kind[i]) { heads++; colorsPresent.add(Array.from(colors.subarray(i * 3, i * 3 + 3)).map(v => v.toFixed(2)).join(',')); }
    const k = i * 3; finite &&= Number.isFinite(positions[k] + positions[k + 1] + positions[k + 2]);
    lit++; if (lit < 20) checksum += positions[k] + positions[k + 1];
  }
  return { ...state, rockets: rockets.length, queued: events.length, lit, heads, colorsPresent: colorsPresent.size, finite, checksum, capacity: CAPACITY, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, viewport: [innerWidth, innerHeight] };
}
function clear() {
  life.fill(0); sizes.fill(0); opacity.fill(0); rockets.length = 0; events.length = 0; state.active = 0;
  geometry.attributes.aSize.needsUpdate = geometry.attributes.aOpacity.needsUpdate = true;
}
window.__FIREWORKS__ = { scene, camera, renderer, composer, state, launch, finale, step, render, snapshot, setPaused, clear };
// The opening is already mid-flight: visitors see fireworks immediately, not an empty sky.
launch(-9, 23, { palette: 'gold', shape: 'willow', z: -3 });
launch(10, 20, { palette: 'ice', shape: 'peony', z: 1 });
launch(1, 28, { palette: 'rose', shape: 'ring', z: -5 });
state.nextAuto = 4;
for (let i = 0; i < 115; i++) step(1 / 60);
render();
$('#loading').classList.add('ready');
requestAnimationFrame(frame);
