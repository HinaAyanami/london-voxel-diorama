/* =========================================================================
   BAKE, LIGHT, SHOOT
   ========================================================================= */

/* ---------- bake the static world into instanced meshes ---------- */
const VOXEL_COUNT = buildStaticWorld();

/* ---------- camera framing ---------- */
const TARGET = new THREE.Vector3(0, 1.5, 0);
const FIT = [];
(function fitPoints() {
  for (let i = 0; i < 64; i++) {
    const th = i / 64 * TAU;
    const [x, z] = rimPoint(th);
    FIT.push(new THREE.Vector3(x, -8, z), new THREE.Vector3(x, 0.5, z), new THREE.Vector3(x, -20, z));
  }
  FIT.push(new THREE.Vector3(8, 47, -17.5));        // big ben
  FIT.push(new THREE.Vector3(24, 54, 30));          // the shard
  FIT.push(new THREE.Vector3(45, 30, -24));         // the gherkin
  FIT.push(new THREE.Vector3(-20, 31, 18));         // the eye
  FIT.push(new THREE.Vector3(-29, 32, -17.5));      // victoria tower
  FIT.push(new THREE.Vector3(19, 30, -28));         // st paul's
  for (const is of ISLETS) {
    const r = 13;
    for (const dx of [-r, r]) for (const dz of [-r, r]) for (const dy of [-18, 10]) {
      FIT.push(new THREE.Vector3(is.grp.position.x + dx, is.baseY + dy, is.grp.position.z + dz));
    }
  }
  // underside spikes and waterfall tails
  for (let i = 0; i < 16; i++) {
    const th = i / 16 * TAU;
    FIT.push(new THREE.Vector3(Math.cos(th) * A * 0.62, -56, Math.sin(th) * B * 0.62));
  }
  for (const f of FALLS) FIT.push(new THREE.Vector3(f.x, f.y - f.h - 2, f.z));
  for (const b of BALLOONS) FIT.push(new THREE.Vector3(b.x, b.y + 6, b.z));
  FIT.push(new THREE.Vector3(0, -34, 0));
})();

const _v = new THREE.Vector3(), _right = new THREE.Vector3(), _up = new THREE.Vector3(), _wup = new THREE.Vector3(0, 1, 0);
function requiredDistance(dir, fovDeg, aspect, margin) {
  const tanV = Math.tan(fovDeg * Math.PI / 360);
  const tanH = tanV * aspect;
  _right.crossVectors(_wup, dir).normalize();
  _up.crossVectors(dir, _right).normalize();
  let need = 0;
  for (let i = 0; i < FIT.length; i++) {
    _v.copy(FIT[i]).sub(TARGET);
    const px = _v.dot(_right), py = _v.dot(_up), pz = _v.dot(dir);
    need = Math.max(need, pz + Math.abs(px) / tanH, pz + Math.abs(py) / tanV);
  }
  return need * margin;
}

const CAM = { az: 0.52, sweep: 0.436, baseEl: 0.355 };

/* ---------- interactive view state ---------- */
const VIEW = {
  az: CAM.az, el: CAM.baseEl, zoom: 1,
  sway: 1, swayT: 0, lastInput: -1000,
  dragging: false, px: 0, py: 0
};
window.__view = VIEW;
const clampv = (v, a, b) => Math.max(a, Math.min(b, v));

/* =========================================================================
   LANDMARK FOCUS — click a building, fly in, read the note
   ========================================================================= */
const LANDMARKS = [
  { name: 'BIG BEN', zh: '伊丽莎白塔 · 大本钟', box: [5, 0, -21, 11, 47, -13], anchor: [8, 44.5, -17],
    desc: '1859 年完工的哥特复兴钟楼，高 96 米。|四面钟盘各 7 米，钟声曾是泰晤士河上的时间基准。' },
  { name: 'PALACE OF WESTMINSTER', zh: '威斯敏斯特宫', box: [-31, 0, -22, 4, 14, -11], anchor: [-14, 15, -17],
    desc: '英国议会所在地，11 世纪起是王室居所。|1834 年大火后重建，沿河立面近 300 米，屋顶布满小尖塔。' },
  { name: 'LONDON EYE', zh: '伦敦眼', box: [-35, 0, 14, -5, 31, 22], anchor: [-20, 31, 18],
    desc: '2000 年千禧年落成的观景摩天轮，高 135 米。|32 个玻璃舱对应伦敦 32 个行政区，转一圈约 30 分钟。' },
  { name: 'TOWER BRIDGE', zh: '伦敦塔桥', box: [39, 0, -8, 45, 21, 12], anchor: [42, 21, 2],
    desc: '1894 年通车的开合桥，两座哥特塔之间有 61 米高的空中连廊。|桥面每天开启，让高桅船从中间通过。' },
  { name: 'THE SHARD', zh: '碎片大厦', box: [20, 0, 26, 28, 52, 34], anchor: [24, 52, 30],
    desc: '2012 年建成，310 米，西欧最高建筑。|玻璃幕墙向上收拢成锯齿状尖顶，像几片碎玻璃。' },
  { name: 'THE GHERKIN', zh: '小黄瓜 · 圣玛丽斧街 30 号', box: [40, 0, -29, 50, 28, -19], anchor: [45, 28, -24],
    desc: '2004 年落成的 180 米办公塔。|菱形网格玻璃幕墙随高度旋转，是伦敦金融城的标志。' },
  { name: "ST PAUL'S CATHEDRAL", zh: '圣保罗大教堂', box: [9, 0, -33, 29, 31, -22], anchor: [19, 31, -28],
    desc: '1675–1710 年由克里斯托弗·雷恩重建。|穹顶高 111 米，曾保持世界最高教堂穹顶三百年。' },
  { name: 'TOWER OF LONDON', zh: '伦敦塔', box: [27, 0, -27, 42, 19, -12], anchor: [34, 19, -20],
    desc: '11 世纪诺曼征服后始建，白塔是核心。|曾作王宫、监狱与军械库，现藏英国王冠珠宝。' },
  { name: 'BUCKINGHAM PALACE', zh: '白金汉宫', box: [-44, 0, -35, -25, 17, -12], anchor: [-34, 17, -30],
    desc: '英国君主官邸，1703 年始建，1913 年形成今日立面。|门前是维多利亚纪念堂和一圈红花坛。' },
  { name: 'TRAFALGAR SQUARE', zh: '特拉法加广场', box: [-19, 0, -33, 5, 20, -19], anchor: [-7, 20, -26],
    desc: '1841 年为纪念特拉法加海战而建。|纳尔逊纪念柱高 52 米，基座四角是青铜狮子，背后是国家美术馆。' },
  { name: 'WESTMINSTER BRIDGE', zh: '威斯敏斯特桥', box: [12, 0, -11, 22, 5, 14], anchor: [17, 6, 2],
    desc: '1862 年通车的铸铁拱桥，绿色栏杆与灯柱是它的标志。|桥上是看议会大厦最经典的角度。' }
];
LANDMARKS.forEach((lm) => {
  lm._box = new THREE.Box3(
    new THREE.Vector3(lm.box[0], lm.box[1], lm.box[2]),
    new THREE.Vector3(lm.box[3], lm.box[4], lm.box[5])
  );
  lm._c = lm._box.getCenter(new THREE.Vector3());
  lm._a = new THREE.Vector3(lm.anchor[0], lm.anchor[1], lm.anchor[2]);
  lm._pts = [];
  for (const x of [lm.box[0], lm.box[3]]) for (const y of [lm.box[1], lm.box[4]]) for (const z of [lm.box[2], lm.box[5]]) {
    lm._pts.push(new THREE.Vector3(x, y, z));
  }
});

const FOCUS = { lm: null, az: 0, el: 0.4, dist: 60, zoom: 1 };
const camPos = new THREE.Vector3(0, 70, 260);
const camTgt = new THREE.Vector3(0, 1.5, 0);
const raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _hit = new THREE.Vector3();

const labelEl = document.getElementById('label');
const labelEyebrow = document.getElementById('labelEyebrow');
const labelName = document.getElementById('labelName');
const labelZh = document.getElementById('labelZh');
const labelL1 = document.getElementById('labelL1');
const labelL2 = document.getElementById('labelL2');
const dotEl = document.getElementById('dot');
const leaderEl = document.getElementById('leader');
const hintEl = document.getElementById('hint');
const HINT_WIDE = hintEl.textContent;
const HINT_FOCUS = '拖动旋转 · 滚轮缩放 · 点空白或 ESC 返回';
let inkPending = false;   // one GPU readback per focus / drag, never per frame
let inkTimer = 0;
const _inkBuf = new Uint8Array(4);

// sample what is actually behind the type and flip the ink colour
function sampleInk() {
  try {
    const r = labelEl.getBoundingClientRect();
    if (r.width < 20 || r.left < -200 || r.top < -200) return;
    const dpr = renderer.getPixelRatio();
    const gl = renderer.getContext();
    const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    const x = Math.max(0, Math.round(r.left * dpr));
    const y = Math.max(0, Math.round((H - r.bottom) * dpr));
    const w = Math.min(cw - x, Math.round(r.width * dpr));
    const h = Math.min(ch - y, Math.round(r.height * dpr));
    if (w < 8 || h < 8) return;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let sum = 0, n = 0;
    const stepX = Math.max(1, Math.floor(w / 22)), stepY = Math.max(1, Math.floor(h / 14));
    for (let py = 0; py < h; py += stepY) {
      for (let px = 0; px < w; px += stepX) {
        const i = (py * w + px) * 4;
        sum += (0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2]) / 255;
        n++;
      }
    }
    if (!n) return;
    const wantDark = sum / n > 0.58;
    if (labelEl.classList.contains('dark') !== wantDark) labelEl.classList.toggle('dark', wantDark);
  } catch (e) { /* never let a pixel probe break the render loop */ }
}

function fitDistance(dir, target, pts, margin) {
  const tanV = Math.tan(camera.fov * Math.PI / 360);
  const tanH = tanV * camera.aspect;
  _right.crossVectors(_wup, dir).normalize();
  _up.crossVectors(dir, _right).normalize();
  let need = 0;
  for (let i = 0; i < pts.length; i++) {
    _v.copy(pts[i]).sub(target);
    const px = _v.dot(_right), py = _v.dot(_up), pz = _v.dot(dir);
    need = Math.max(need, pz + Math.abs(px) / tanH, pz + Math.abs(py) / tanV);
  }
  return need * margin;
}

function pickLandmark(cx, cy) {
  _ndc.set((cx / W) * 2 - 1, -(cy / H) * 2 + 1);
  raycaster.setFromCamera(_ndc, camera);
  let best = null, bestD = Infinity;
  for (let i = 0; i < LANDMARKS.length; i++) {
    const lm = LANDMARKS[i];
    const hit = raycaster.ray.intersectBox(lm._box, _hit);
    if (!hit) continue;
    const d = _hit.distanceTo(raycaster.ray.origin);
    if (d < 0.5 || d >= bestD) continue;
    bestD = d; best = lm;
  }
  return best;
}

function focusLandmark(lm) {
  const off = camera.position.clone().sub(lm._c);
  const r = Math.max(1, off.length());
  const az0 = Math.atan2(off.x, off.z);
  const el0 = Math.asin(clamp(off.y / r, -1, 1));
  FOCUS.lm = lm;
  FOCUS.az = az0;
  FOCUS.el = clamp(el0 + 0.10, 0.10, 1.15);
  FOCUS.zoom = 1;
  const d = _v.set(Math.sin(FOCUS.az) * Math.cos(FOCUS.el), Math.sin(FOCUS.el), Math.cos(FOCUS.az) * Math.cos(FOCUS.el)).normalize().clone();
  FOCUS.dist = Math.max(14, fitDistance(d, lm._c, lm._pts, 1.06));
  const parts = lm.desc.split('|');
  labelEyebrow.textContent = 'LANDMARK ' + String(LANDMARKS.indexOf(lm) + 1).padStart(2, '0');
  labelName.textContent = lm.name;
  labelZh.textContent = lm.zh;
  labelL1.textContent = parts[0] || '';
  labelL2.textContent = parts[1] || '';
  labelL2.style.display = parts[1] ? '' : 'none';
  labelEl.classList.remove('on');   // forces the line-by-line reveal to replay on arrival
  hintEl.textContent = HINT_FOCUS;
  hintEl.classList.add('sticky');
  inkPending = false;
  clearTimeout(inkTimer);
  VIEW.lastInput = timeSec;
  VIEW.sway = 0;
}

function exitFocus() {
  if (!FOCUS.lm) return;
  FOCUS.lm = null;
  labelEl.classList.remove('on');
  dotEl.style.opacity = '0';
  leaderEl.style.opacity = '0';
  hintEl.textContent = HINT_WIDE;
  hintEl.classList.remove('sticky');
  VIEW.lastInput = timeSec;
}

function updateLabel() {
  if (!FOCUS.lm) return;
  const d = camera.position.distanceTo(FOCUS.lm._c);
  const near = d < FOCUS.dist * FOCUS.zoom * 1.75;
  if (!near) {
    labelEl.classList.remove('on');
    dotEl.style.opacity = '0';
    leaderEl.style.opacity = '0';
    return;
  }
  if (!labelEl.classList.contains('on')) {
    void labelEl.offsetWidth;
    labelEl.classList.add('on');
    inkPending = true;
  }
  _v.copy(FOCUS.lm._c).project(camera);
  let sx = clamp((_v.x * 0.5 + 0.5) * W, 30, W - 30);
  let sy = clamp((1 - (_v.y * 0.5 + 0.5)) * H, 40, H - 40);
  const pw = 344, ph = 210;
  let lx = sx + 150, ly = sy - 9;
  let flip = false;
  if (lx + pw > W - 18) { lx = sx - pw - 150; flip = true; }
  lx = clamp(lx, 16, W - pw - 16);
  ly = clamp(ly, 16, H - ph - 16);
  const lw = flip ? Math.max(0, sx - (lx + pw) - 8) : Math.max(0, lx - sx - 8);
  leaderEl.style.width = lw.toFixed(1) + 'px';
  leaderEl.style.transform = 'translate(' + (flip ? (lx + pw + 8) : (sx + 8)).toFixed(1) + 'px,' + sy.toFixed(1) + 'px)';
  leaderEl.style.opacity = '0.85';
  leaderEl.style.background = flip
    ? 'linear-gradient(90deg,rgba(245,207,122,0),rgba(245,207,122,.95))'
    : 'linear-gradient(90deg,rgba(245,207,122,.95),rgba(245,207,122,0))';
  labelEl.style.transform = 'translate(' + Math.round(lx) + 'px,' + Math.round(ly) + 'px)';
  dotEl.style.opacity = '0.95';
  dotEl.style.transform = 'translate(' + Math.round(sx) + 'px,' + Math.round(sy) + 'px)';
}

canvas.addEventListener('pointerdown', (e) => {
  VIEW.dragging = true;
  VIEW.px = e.clientX; VIEW.py = e.clientY;
  VIEW.sx = e.clientX; VIEW.sy = e.clientY;
  VIEW.moved = false;
  VIEW.lastInput = timeSec;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  canvas.classList.add('grabbing');
});
canvas.addEventListener('pointermove', (e) => {
  if (VIEW.dragging) {
    const dx = e.clientX - VIEW.px, dy = e.clientY - VIEW.py;
    if (Math.abs(e.clientX - VIEW.sx) + Math.abs(e.clientY - VIEW.sy) > 5) VIEW.moved = true;
    VIEW.px = e.clientX; VIEW.py = e.clientY;
    if (FOCUS.lm) {
      FOCUS.az -= dx * 0.005;
      FOCUS.el = clampv(FOCUS.el + dy * 0.0035, -0.15, 1.3);
    } else {
      VIEW.az -= dx * 0.0055;
      VIEW.el = clampv(VIEW.el + dy * 0.0035, 0.08, 0.86);
    }
    VIEW.lastInput = timeSec;
  } else {
    canvas.style.cursor = pickLandmark(e.clientX, e.clientY) ? 'pointer' : '';
  }
});
function endDrag(e) {
  if (!VIEW.dragging) return;
  VIEW.dragging = false;
  canvas.classList.remove('grabbing');
  try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
  VIEW.lastInput = timeSec;
  if (!VIEW.moved) {
    const lm = pickLandmark(e.clientX, e.clientY);
    if (lm) focusLandmark(lm); else exitFocus();
  } else if (FOCUS.lm) {
    inkPending = true;
  }
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', (e) => { VIEW.dragging = false; canvas.classList.remove('grabbing'); });
canvas.addEventListener('pointerleave', (e) => { if (VIEW.dragging) endDrag(e); });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (FOCUS.lm) {
    FOCUS.zoom = clampv(FOCUS.zoom * Math.exp(e.deltaY * 0.0013), 0.45, 2.2);
    clearTimeout(inkTimer);
    inkTimer = setTimeout(() => { if (FOCUS.lm) inkPending = true; }, 180);
  } else {
    VIEW.zoom = clampv(VIEW.zoom * Math.exp(e.deltaY * 0.0013), 0.55, 1.85);
  }
  VIEW.lastInput = timeSec;
}, { passive: false });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') exitFocus(); });
window.addEventListener('blur', () => { VIEW.dragging = false; canvas.classList.remove('grabbing'); });

/* ---------- post processing ---------- */
const DPR = Math.min(window.devicePixelRatio || 1, 2);
let W = window.innerWidth, H = window.innerHeight;

const rtScene = new THREE.WebGLRenderTarget(W * DPR, H * DPR, {
  type: THREE.HalfFloatType, samples: 4, depthBuffer: true, stencilBuffer: false
});
rtScene.texture.minFilter = THREE.LinearFilter;
rtScene.texture.magFilter = THREE.LinearFilter;

function mkRT(scale) {
  return new THREE.WebGLRenderTarget(Math.max(2, Math.floor(W * DPR * scale)), Math.max(2, Math.floor(H * DPR * scale)), {
    type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false
  });
}
const rtBright = mkRT(0.5), rtBlurA = mkRT(0.5), rtBlurB = mkRT(0.5), rtBright2 = mkRT(0.25), rtBlurC = mkRT(0.25), rtBlurD = mkRT(0.25);

const quadGeo = new THREE.PlaneGeometry(2, 2);
const quadScene = new THREE.Scene();
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quad = new THREE.Mesh(quadGeo, new THREE.MeshBasicMaterial());
quadScene.add(quad);
function pass(mat, target) {
  quad.material = mat;
  renderer.setRenderTarget(target);
  renderer.render(quadScene, quadCam);
}

const VS_QUAD = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const brightMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, threshold: { value: 1.35 }, knee: { value: 0.7 } },
  vertexShader: VS_QUAD,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float threshold, knee; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = max(c.r, max(c.g, c.b));
      float w = smoothstep(threshold, threshold + knee, l);
      gl_FragColor = vec4(c * w, 1.0);
    }`
});
const blurMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2(1, 0) }, res: { value: new THREE.Vector2(1, 1) } },
  vertexShader: VS_QUAD,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 dir, res; varying vec2 vUv;
    void main(){
      vec2 d = dir / res;
      vec3 c = texture2D(tDiffuse, vUv).rgb * 0.227027;
      c += texture2D(tDiffuse, vUv + d * 1.0).rgb * 0.1945946;
      c += texture2D(tDiffuse, vUv - d * 1.0).rgb * 0.1945946;
      c += texture2D(tDiffuse, vUv + d * 2.0).rgb * 0.1216216;
      c += texture2D(tDiffuse, vUv - d * 2.0).rgb * 0.1216216;
      c += texture2D(tDiffuse, vUv + d * 3.0).rgb * 0.054054;
      c += texture2D(tDiffuse, vUv - d * 3.0).rgb * 0.054054;
      c += texture2D(tDiffuse, vUv + d * 4.0).rgb * 0.016216;
      c += texture2D(tDiffuse, vUv - d * 4.0).rgb * 0.016216;
      gl_FragColor = vec4(c, 1.0);
    }`
});
const compMat = new THREE.ShaderMaterial({
  uniforms: {
    tScene: { value: null }, tB1: { value: null }, tB2: { value: null },
    exposure: { value: 1.32 }, bloom: { value: 0.4 }, sat: { value: 1.18 }
  },
  vertexShader: VS_QUAD,
  fragmentShader: `
    uniform sampler2D tScene, tB1, tB2;
    uniform float exposure, bloom, sat;
    varying vec2 vUv;
    vec3 aces(vec3 x){
      float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }
    void main(){
      vec3 c = texture2D(tScene, vUv).rgb;
      vec3 b = texture2D(tB1, vUv).rgb * 0.62 + texture2D(tB2, vUv).rgb * 0.55;
      c += b * bloom;
      c *= exposure;
      c = aces(c);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, sat);
      c = mix(c, c * vec3(1.02, 1.0, 0.97), 0.6);
      vec2 q = vUv - 0.5;
      float vig = smoothstep(1.02, 0.28, length(q * vec2(1.18, 1.0)));
      c *= mix(0.80, 1.0, vig);
      c = clamp(c, 0.0, 1.0);
      c = pow(c, vec3(0.4545));
      gl_FragColor = vec4(c, 1.0);
    }`
});

function resize() {
  W = window.innerWidth; H = window.innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  const w = Math.floor(W * DPR), h = Math.floor(H * DPR);
  skyUniforms.uRes.value.set(w, h);
  rtScene.setSize(w, h);
  rtBright.setSize(w * 0.5, h * 0.5); rtBlurA.setSize(w * 0.5, h * 0.5); rtBlurB.setSize(w * 0.5, h * 0.5);
  rtBright2.setSize(w * 0.25, h * 0.25); rtBlurC.setSize(w * 0.25, h * 0.25); rtBlurD.setSize(w * 0.25, h * 0.25);
  blurMat.uniforms.res.value.set(w * 0.5, h * 0.5);
}
window.addEventListener('resize', resize);
resize();

/* ---------- animation state ---------- */
const CLOCK_BASE = new Date();
CLOCK_BASE.setHours(10, 9, 30, 0);
const dummy = new THREE.Object3D();
const dustMatrix = new THREE.Matrix4();
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
let timeSec = 0;
let lastNow = performance.now();
let frames = 0, fpsAcc = 0, fps = 60;

function animateScene(time, dt) {
  const t12 = (time % 12) / 12;

  /* ---- camera: orbit + auto sway, or landmark focus; both smoothed ---- */
  const wantAuto = !VIEW.dragging && !FOCUS.lm && (time - VIEW.lastInput) > 3.0;
  VIEW.sway += (wantAuto ? 1 : -1) * dt * (wantAuto ? 0.5 : 7);
  VIEW.sway = clamp(VIEW.sway, 0, 1);
  if (wantAuto) VIEW.swayT += dt;
  else if (VIEW.sway <= 0.001 && !FOCUS.lm) VIEW.swayT = 0;

  const swayPhase = VIEW.swayT / 12;
  const az = VIEW.az + CAM.sweep * Math.sin(TAU * swayPhase) * VIEW.sway;
  const el = clamp(VIEW.el + 0.022 * Math.sin(TAU * swayPhase + 1.15) * VIEW.sway, 0.08, 0.9);
  const dir = _v.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize().clone();
  const fitD = requiredDistance(dir, camera.fov, camera.aspect, 1.075);
  const pulse = 1.022 - 0.048 * (0.5 - 0.5 * Math.cos(TAU * swayPhase));
  const zoom = VIEW.zoom * (1 + (pulse - 1) * VIEW.sway);

  const wantPos = _v.copy(TARGET).addScaledVector(dir, fitD * zoom).clone();
  const wantTgt = _v.copy(TARGET).clone();
  if (FOCUS.lm) {
    const fd = _v.set(Math.sin(FOCUS.az) * Math.cos(FOCUS.el), Math.sin(FOCUS.el), Math.cos(FOCUS.az) * Math.cos(FOCUS.el)).normalize().clone();
    wantPos.copy(FOCUS.lm._c).addScaledVector(fd, FOCUS.dist * FOCUS.zoom);
    wantTgt.copy(FOCUS.lm._c);
  }
  const blendK = dt > 0 ? 1 - Math.exp(-dt * (FOCUS.lm ? 4.6 : 7.5)) : 1;
  camPos.lerp(wantPos, blendK);
  camTgt.lerp(wantTgt, blendK);
  camera.position.copy(camPos);
  camera.lookAt(camTgt);
  sky.position.copy(camera.position);
  updateLabel();

  /* ---- water & weather ---- */
  waterUniforms.time.value = time;
  fallUniforms.time.value = time;

  /* ---- clock (a lively 24x) ---- */
  const mins = CLOCK_BASE.getMinutes() + CLOCK_BASE.getSeconds() / 60 + (time * 24) / 60;
  const hrs = (CLOCK_BASE.getHours() % 12) + mins / 60;
  const ma = -(mins % 60) / 60 * TAU;
  const ha = -(hrs % 12) / 12 * TAU;
  for (let i = 0; i < CLOCK.length; i++) {
    CLOCK[i].min.rotation.z = ma;
    CLOCK[i].hour.rotation.z = ha;
  }

  /* ---- the eye ---- */
  if (EYE) {
    const ang = time * EYE.speed;
    EYE.pivot.rotation.z = ang;
    const rp = EYE.R + 1.15;
    for (let i = 0; i < 32; i++) {
      const a = ang + (i / 32) * TAU;
      dummy.position.set(EYE.HUB.x + Math.cos(a) * rp, EYE.HUB.y + Math.sin(a) * rp, EYE.HUB.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      EYE.pods.setMatrixAt(i, dummy.matrix);
    }
    EYE.pods.instanceMatrix.needsUpdate = true;
  }

  /* ---- tower bridge ---- */
  let lift = 0;
  if (t12 < 0.30) lift = smooth(Math.min(1, t12 / 0.30));
  else if (t12 < 0.52) lift = 1;
  else if (t12 < 0.86) lift = 1 - smooth(Math.min(1, (t12 - 0.52) / 0.34));
  else lift = 0;
  for (const b of BASCULES) b.grp.rotation.x = -b.dir * lift * 0.68;

  /* ---- union jack ---- */
  if (FLAG) {
    const pos = FLAG.geo.attributes.position;
    const base = FLAG.base;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      const k = Math.max(0, x / 6.6);
      pos.setZ(i, z + Math.sin(x * 1.5 - time * 4.2) * 0.30 * k + Math.sin(y * 2.2 + time * 3.1) * 0.12 * k);
    }
    pos.needsUpdate = true;
    FLAG.geo.computeVertexNormals();
  }

  /* ---- guards ---- */
  if (GUARDS) {
    GUARDS.position.x = GUARD_BASE + Math.sin(time * TAU / 12) * 2.4;
    GUARDS.position.y = 0.5 + Math.abs(Math.sin(time * 3.4)) * 0.05;
  }

  /* ---- people ---- */
  for (let i = 0; i < PEOPLE.length; i++) {
    const p = PEOPLE[i];
    p.d += p.sp * dt;
    const q = p.loop.at(p.d);
    const nx = -q.uz, nz = q.ux;
    const bob = Math.abs(Math.sin(time * 7.5 + p.ph)) * 0.075;
    const x = q.x + nx * p.off, z = q.z + nz * p.off;
    dummy.position.set(x, GY + 0.48 * p.sc + bob, z);
    dummy.rotation.set(0, Math.atan2(q.ux, q.uz), 0);
    dummy.scale.set(0.5 * p.sc, 0.95 * p.sc, 0.42 * p.sc);
    dummy.updateMatrix();
    bodies.setMatrixAt(p.i, dummy.matrix);
    dummy.position.set(x, GY + 1.15 * p.sc + bob, z);
    dummy.scale.set(0.4 * p.sc, 0.4 * p.sc, 0.4 * p.sc);
    dummy.updateMatrix();
    heads.setMatrixAt(p.i, dummy.matrix);
  }
  bodies.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;

  /* ---- traffic ---- */
  for (const v of VEHICLES) {
    v.d += v.speed * dt;
    const q = v.loop.at(v.d);
    v.mesh.position.set(q.x, GY, q.z);
    v.mesh.rotation.y = Math.atan2(q.ux, q.uz);
  }

  /* ---- boats ---- */
  for (const b of BOATS) {
    b.d += b.sp * dt;
    const q = riverLoop.at(b.d);
    b.mesh.position.set(q.x, WATER_Y + b.yOff + Math.sin(time * 1.6 + b.ph) * 0.05, q.z);
    b.mesh.rotation.set(Math.sin(time * 1.3 + b.ph) * 0.03, Math.atan2(q.ux, q.uz), Math.sin(time * 1.1 + b.ph) * 0.04);
  }

  /* ---- gulls ---- */
  for (let i = 0; i < GULLS.length; i++) {
    const g = GULLS[i];
    g.a += g.sp * dt;
    const x = g.cx + Math.cos(g.a) * g.r;
    const z = g.cz + Math.sin(g.a) * g.r;
    const y = g.y + Math.sin(time * 0.7 + g.ph) * 1.6;
    const yaw = -g.a + (g.sp > 0 ? -Math.PI / 2 : Math.PI / 2);
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, yaw, Math.sin(time * 0.8 + g.ph) * 0.15);
    dummy.scale.setScalar(g.s);
    dummy.updateMatrix();
    gullBody.setMatrixAt(i, dummy.matrix);
    const flap = Math.sin(time * 9 + g.ph) * 0.65;
    const rx = -Math.sin(yaw), rz = -Math.cos(yaw);
    for (let w = 0; w < 2; w++) {
      const sgn = w === 0 ? 1 : -1;
      dummy.position.set(x + rx * 0.75 * g.s * sgn, y + 0.05, z + rz * 0.75 * g.s * sgn);
      dummy.rotation.set(0, yaw, 0);
      dummy.rotateZ(flap * sgn);
      dummy.scale.setScalar(g.s);
      dummy.updateMatrix();
      gullWings.setMatrixAt(i * 2 + w, dummy.matrix);
    }
  }
  gullBody.instanceMatrix.needsUpdate = true;
  gullWings.instanceMatrix.needsUpdate = true;

  /* ---- balloons ---- */
  for (const b of BALLOONS) {
    b.mesh.position.set(
      b.x + Math.cos(time * 0.16 + b.ph) * b.amp,
      b.y + Math.sin(time * 0.26 + b.ph) * 2.0,
      b.z + Math.sin(time * 0.13 + b.ph) * b.amp
    );
    b.mesh.rotation.y = time * 0.05 + b.ph;
    b.mesh.rotation.z = Math.sin(time * 0.3 + b.ph) * 0.02;
  }

  /* ---- clouds (fade away in landmark close-ups) ---- */
  for (const c of CLOUDS) {
    c.a += c.sp * dt * 0.35;
    c.mesh.position.x = Math.cos(c.a) * c.r;
    c.mesh.position.z = Math.sin(c.a) * c.r;
    c.mesh.position.y = c.y + Math.sin(time * 0.18 + c.ph) * 0.9;
    const wantOp = FOCUS.lm ? 0 : 0.9;
    const m = c.mesh.material;
    m.opacity += (wantOp - m.opacity) * (dt > 0 ? Math.min(1, dt * 5) : 1);
    c.mesh.visible = m.opacity > 0.02;
  }

  /* ---- islets & debris ---- */
  for (const is of ISLETS) {
    is.grp.position.y = is.baseY + Math.sin(time * TAU / 12 + is.ph) * is.amp;
    is.grp.rotation.y += is.spin * dt;
  }
  for (const d of DEBRIS) {
    d.mesh.position.y = d.y + Math.sin(time * d.sp + d.ph) * 1.1;
    d.mesh.rotation.y += dt * 0.06;
  }

  /* ---- mist ---- */
  if (MIST_POINTS) {
    const pos = MIST_POINTS.geometry.attributes.position;
    for (let i = 0; i < MIST.length; i++) {
      const m = MIST[i];
      const life = (time * m.sp * 0.55 + m.life) % 1;
      const y = m.fall.y - m.fall.h * (0.52 + life * 0.52);
      const spread = 1 + life * 1.9;
      pos.setXYZ(i,
        m.fall.x + m.hx * spread + Math.sin(time * 0.7 + m.ph) * 0.5,
        y,
        m.fall.z + m.hz * spread + Math.cos(time * 0.6 + m.ph) * 0.5);
    }
    pos.needsUpdate = true;
  }

  /* ---- fountain spray ---- */
  if (FOUNTAIN_POINTS) {
    const pos = FOUNTAIN_POINTS.points.geometry.attributes.position;
    const arr = FOUNTAIN_POINTS.data;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      const ph = (time * 0.55 + p.t) % 1;
      const tt = ph * 1.1;
      pos.setXYZ(i, p.x + p.vx * tt, p.y + p.vy * tt - 4.4 * tt * tt, p.z + p.vz * tt);
    }
    pos.needsUpdate = true;
  }
}

/* ---------- render loop ---------- */
window.__diag = { ready: false, voxels: VOXEL_COUNT, calls: 0, tris: 0, frames: 0, fps: 0, errors: [] };
window.__setTime = function (t) { timeSec = t; animateScene(t, 0); renderFrame(); };

function renderFrame() {
  // scene -> HDR target
  renderer.setRenderTarget(rtScene);
  renderer.clear();
  renderer.render(scene, camera);
  // bright pass
  brightMat.uniforms.tDiffuse.value = rtScene.texture;
  pass(brightMat, rtBright);
  // blur chain 1/2
  blurMat.uniforms.tDiffuse.value = rtBright.texture;
  blurMat.uniforms.dir.value.set(1, 0);
  pass(blurMat, rtBlurA);
  blurMat.uniforms.tDiffuse.value = rtBlurA.texture;
  blurMat.uniforms.dir.value.set(0, 1);
  pass(blurMat, rtBlurB);
  // downsample + blur 1/4
  brightMat.uniforms.tDiffuse.value = rtBlurB.texture;
  pass(brightMat, rtBright2);
  blurMat.uniforms.tDiffuse.value = rtBright2.texture;
  blurMat.uniforms.dir.value.set(2, 0);
  pass(blurMat, rtBlurC);
  blurMat.uniforms.tDiffuse.value = rtBlurC.texture;
  blurMat.uniforms.dir.value.set(0, 2);
  pass(blurMat, rtBlurD);
  // composite
  compMat.uniforms.tScene.value = rtScene.texture;
  compMat.uniforms.tB1.value = rtBlurB.texture;
  compMat.uniforms.tB2.value = rtBlurD.texture;
  pass(compMat, null);
  renderer.setRenderTarget(null);
  if (inkPending && FOCUS.lm && labelEl.classList.contains('on')) {
    inkPending = false;
    sampleInk();
  }
}

function tick(now) {
  if (FIXED_T !== null) {
    timeSec = FIXED_T;
    animateScene(timeSec, 0);
    renderFrame();
    finishLoading();
    window.__diag.ready = true;
    window.__diag.frames = 1;
    return;
  }
  const dt = Math.min(0.05, (now - lastNow) / 1000);
  lastNow = now;
  timeSec += dt;
  animateScene(timeSec, dt);
  renderFrame();
  frames++;
  window.__diag.frames = frames;
  if (frames === 3) finishLoading();
  if (frames > 20) {
    fpsAcc += dt;
    if (frames % 30 === 0) {
      fps = 30 / Math.max(0.0001, fpsAcc);
      window.__diag.fps = Math.round(fps);
      fpsAcc = 0;
    }
  }
  window.__diag.ready = true;
  window.__diag.calls = renderer.info.render.calls;
  window.__diag.tris = renderer.info.render.triangles;
  requestAnimationFrame(tick);
}
function finishLoading() {
  const l = document.getElementById('loader');
  if (l) setTimeout(() => l.classList.add('gone'), 260);
}

/* first frame */
lastNow = performance.now();
try {
  tick(performance.now());
} catch (err) {
  window.__diag.errors.push(String(err));
  fail(err);
}
