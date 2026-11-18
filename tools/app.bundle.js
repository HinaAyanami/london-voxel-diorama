'use strict';

// ======================= 01_core.js =======================
/* =========================================================================
   LONDON — a floating voxel island
   All geometry is generated at load time. No external assets.
   ========================================================================= */

const QS = new URLSearchParams(location.search);
const FIXED_T = QS.has('t') ? Math.max(0, parseFloat(QS.get('t')) || 0) : null;
window.__ERRS = [];
window.addEventListener('error', (e) => { window.__ERRS.push(String((e && e.message) || (e && e.error) || 'error')); });

/* ---------- deterministic random ---------- */
let SEED = 20261114;
function rnd() { SEED = (SEED * 16807) % 2147483647; return (SEED - 1) / 2147483646; }
const rr = (a, b) => a + rnd() * (b - a);
const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
function hash2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }

/* ---------- palette ---------- */
const P = {
  grass: [0x4c9a36, 0x55a63c, 0x60b345, 0x468f31, 0x5cad40],
  lawnA: 0x5fae42, lawnB: 0x51a038,
  dirt: 0x6a4a30, dirt2: 0x7c5a3a,
  sand: 0xbfa575,
  rockOrange: 0xc27b40, rockTan: 0xdcb383, rockBrown: 0x8c5c36,
  rockGrey: 0x7b858c, rockDeep: 0x59646c, rockDark: 0x45525c,
  moss: 0x4f7c33, moss2: 0x3e6a2a,
  stone: 0xd6c7a6, stoneLight: 0xece2c9, stoneGrey: 0xbab4a4,
  stoneDark: 0x8f8b7f, stoneCool: 0xc2c6c4,
  slate: 0x43576c, slateDark: 0x2e4155, slateBlue: 0x3c5b78,
  gold: 0xf1c14d, goldDark: 0xb0842b, goldPale: 0xffdd8a,
  red: 0xd32b2b, redDeep: 0x9d1e1e,
  blue: 0x1d5fa3, blueDeep: 0x123f70, bluePale: 0x6fa8d8,
  white: 0xf4f0e5, cream: 0xf6ecd2,
  water: 0x19b4cf, waterDeep: 0x0c7f9b, waterLight: 0x7fe6f2,
  glass: 0x9adcf0, glassDeep: 0x2f7f9c, glassGreen: 0x6fc8b8,
  leaf1: 0x3e8a33, leaf2: 0x2e7030, leaf3: 0x56a83b, leaf4: 0x6bbb4a, leaf5: 0x357a2c,
  blossom: 0xf3a7c7, blossom2: 0xffc8dc, blossom3: 0xe98fb4,
  trunk: 0x5d3f2a, trunk2: 0x6e4c33,
  path: 0xc8b287, pathEdge: 0xa58e6c,
  road: 0x3b4046, roadLine: 0xd8d2bb,
  flowers: [0xe8466f, 0xf2c02e, 0xa45ad6, 0xf4f0e4, 0xff8a3d, 0xef5d8f, 0xffd166],
  skin: [0xe8b58e, 0xd29a6e, 0x8d5a3b, 0xf0c8a4, 0x6b4226],
  clothes: [0xd23b3b, 0x2f6fb5, 0xe0b23a, 0x3f8a5a, 0xe8e2d2, 0x8b4fa8, 0xd9732e, 0x2b2f3a, 0xc94f7c, 0x39a3a8]
};

/* ---------- renderer ---------- */
const canvas = document.getElementById('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
} catch (err) {
  fail(err);
}
function fail(err) {
  const l = document.getElementById('loader');
  if (l) { l.classList.add('failed'); const e = document.getElementById('err'); if (e) e.textContent = 'WebGL could not start here. ' + (err && err.message ? err.message : ''); }
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// the scene is rendered into a linear HDR target; sRGB encoding happens in the composite
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(new THREE.Color(0xcfe2f2), 270, 950);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.6, 4000);
camera.position.set(0, 70, 260);

/* ---------- sky ---------- */
const skyUniforms = {
  cTop: { value: new THREE.Color(0x0a2a66) },
  cMid: { value: new THREE.Color(0x5fa2e2) },
  cHor: { value: new THREE.Color(0xffd6a2) },
  cSun: { value: new THREE.Color(0xfff0cc) },
  uRes: { value: new THREE.Vector2(1600, 900) }
};
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  uniforms: skyUniforms,
  vertexShader: `
    void main(){
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`,
  fragmentShader: `
    uniform vec3 cTop, cMid, cHor, cSun;
    uniform vec2 uRes;
    void main(){
      vec2 s = gl_FragCoord.xy / uRes;
      float y = clamp(s.y, 0.0, 1.0);
      // warm haze low, mid blue, deep zenith
      vec3 col = mix(cHor, cMid, smoothstep(0.015, 0.36, y));
      col = mix(col, cTop, smoothstep(0.34, 0.98, y));
      // soft sun bloom top right
      vec2 p = (s - vec2(0.80, 0.86)) * vec2(1.0, 0.85);
      col += cSun * exp(-dot(p, p) * 7.0) * 0.16;
      // very subtle warm band right behind the island
      float band = exp(-pow((y - 0.34) * 4.2, 2.0));
      col += vec3(0.09, 0.05, 0.015) * band;
      gl_FragColor = vec4(col, 1.0);
    }`
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 40, 24), skyMat);
sky.renderOrder = -10;
sky.frustumCulled = false;
scene.add(sky);

/* ---------- environment (for glass reflections) ---------- */
(function buildEnv() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.00, '#2a5fa8');
  grad.addColorStop(0.34, '#79b7ea');
  grad.addColorStop(0.48, '#cfe6f7');
  grad.addColorStop(0.52, '#ffdfb4');
  grad.addColorStop(0.62, '#b9a888');
  grad.addColorStop(1.00, '#4c4438');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
  const sx = 512 * 0.62, sy = 256 * 0.255;
  const sg = g.createRadialGradient(sx, sy, 0, sx, sy, 92);
  sg.addColorStop(0, 'rgba(255,250,235,1)');
  sg.addColorStop(0.18, 'rgba(255,244,214,0.95)');
  sg.addColorStop(0.55, 'rgba(255,226,170,0.28)');
  sg.addColorStop(1, 'rgba(255,220,160,0)');
  g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, 92, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  scene.environment = pmrem.fromEquirectangular(tex).texture;
  tex.dispose(); pmrem.dispose();
})();

/* ---------- lights ---------- */
const sunDir = new THREE.Vector3(-0.44, 0.52, 0.46).normalize();
const sun = new THREE.DirectionalLight(0xffeccb, 3.1);
sun.position.copy(sunDir).multiplyScalar(260);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.left = -128;
sun.shadow.camera.right = 128;
sun.shadow.camera.top = 128;
sun.shadow.camera.bottom = -128;
sun.shadow.camera.near = 40;
sun.shadow.camera.far = 620;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 0.07;
sun.shadow.camera.updateProjectionMatrix();
sun.target.position.set(0, -6, 0);
scene.add(sun, sun.target);

const hemi = new THREE.HemisphereLight(0xa9d4ff, 0x42502f, 0.44);
scene.add(hemi);
const fill = new THREE.DirectionalLight(0x9ec4ff, 0.3);
fill.position.set(-120, 60, -160);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffd9a0, 0.24);
rim.position.set(-40, 10, 180);
scene.add(rim);

/* =========================================================================
   VOXEL ENGINE
   ========================================================================= */
const MAT = {
  solid: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0, envMapIntensity: 0.32 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.075, metalness: 0.62, envMapIntensity: 1.35 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.26, metalness: 0.9, envMapIntensity: 1.1 }),
  glow: new THREE.MeshStandardMaterial({ color: 0xfff2d2, emissive: 0xffc471, emissiveIntensity: 2.6, roughness: 0.3, metalness: 0.05 })
};
const VOX = { solid: [], glass: [], metal: [], glow: [] };
const OCC = new Set();
const okey = (x, y, z) => ((Math.round(x) + 512) * 1e6 + (Math.round(y) + 512) * 1e3 + (Math.round(z) + 512));

const _col = new THREE.Color();
function vary(hex, j) {
  if (!j) return hex;
  _col.setHex(hex);
  _col.multiplyScalar(1 + (rnd() * 2 - 1) * j);
  return _col.getHex();
}

function vox(x, y, z, hex, mat, sx, sy, sz, rx, ry, rz) {
  const m = mat || 'solid';
  VOX[m].push({
    x, y, z, c: hex,
    sx: sx === undefined ? 1 : sx, sy: sy === undefined ? 1 : sy, sz: sz === undefined ? 1 : sz,
    rx: rx || 0, ry: ry || 0, rz: rz || 0
  });
  if (m !== 'water') OCC.add(okey(x, y, z));
}

/* fill an axis-aligned box: x0..x0+w-1 etc. */
function fillBox(x0, y0, z0, w, h, d, hex, mat, jit) {
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) {
    vox(x0 + x, y0 + y, z0 + z, jit ? vary(hex, jit) : hex, mat);
  }
}
/* hollow box shell (walls only, open top) */
function shellBox(x0, y0, z0, w, h, d, hex, mat, jit) {
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) for (let y = 0; y < h; y++) {
    const edge = (x === 0 || x === w - 1 || z === 0 || z === d - 1);
    if (edge) vox(x0 + x, y0 + y, z0 + z, jit ? vary(hex, jit) : hex, mat);
  }
}
function vline(x0, y0, z0, x1, y1, z1, hex, mat, thick) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const n = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
  const t = thick || 1;
  for (let i = 0; i <= n; i++) {
    const f = n === 0 ? 0 : i / n;
    const px = Math.round(x0 + dx * f), py = Math.round(y0 + dy * f), pz = Math.round(z0 + dz * f);
    if (t <= 1) vox(px, py, pz, hex, mat);
    else fillBox(px - (t >> 1), py - (t >> 1), pz - (t >> 1), t, t, t, hex, mat);
  }
}
function vsphere(cx, cy, cz, r, hex, mat, jit, squash) {
  const ry = r * (squash === undefined ? 1 : squash);
  const rr2 = r * r;
  for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
        const dx = (x - cx) / r, dy = (y - cy) / ry, dz = (z - cz) / r;
        const d = dx * dx + dy * dy + dz * dz;
        if (d <= 1.0 && d > 0.55) vox(x, y, z, jit ? vary(hex, jit) : hex, mat);
      }
}
function vcyl(cx, cz, y0, y1, r, hex, mat, jit) {
  for (let y = y0; y <= y1; y++) {
    const rad = typeof r === 'function' ? r(y) : r;
    for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++)
      for (let z = Math.floor(cz - rad); z <= Math.ceil(cz + rad); z++) {
        const dx = x - cx, dz = z - cz;
        if (dx * dx + dz * dz <= rad * rad) vox(x, y, z, jit ? vary(hex, jit) : hex, mat);
      }
  }
}
function vring(cx, cy, cz, r, hex, mat, n, thick, plane) {
  // plane 'xy' (default) or 'xz'
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (plane === 'xz') vox(Math.round(x), cy, Math.round(cz + Math.sin(a) * r), hex, mat);
    else vox(Math.round(x), Math.round(y), Math.round(cz), hex, mat);
  }
}

/* ---------- animated prop helper: merge boxes into one geometry ---------- */
function mergedMesh(parts, mat, opts) {
  const pos = [], nor = [], colr = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
  for (let k = 0; k < parts.length; k++) {
    const b = parts[k];
    const g = new THREE.BoxGeometry(b[3], b[4], b[5]);
    e.set(b[7] || 0, b[8] || 0, b[9] || 0);
    q.setFromEuler(e); p.set(b[0], b[1], b[2]);
    m4.compose(p, q, s); g.applyMatrix4(m4);
    // BoxGeometry is indexed: flatten to triangle order, otherwise the merged
    // buffer is a triangle soup with stretched spikes across each box.
    const flat = g.index ? g.toNonIndexed() : g;
    const pa = flat.attributes.position.array, na = flat.attributes.normal.array;
    c.setHex(b[6]);
    for (let i = 0; i < pa.length; i += 3) {
      pos.push(pa[i], pa[i + 1], pa[i + 2]);
      nor.push(na[i], na[i + 1], na[i + 2]);
      colr.push(c.r, c.g, c.b);
    }
    if (flat !== g) flat.dispose();
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  const material = mat || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.05, envMapIntensity: 0.4 });
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (opts && opts.noShadow) { mesh.castShadow = false; }
  return mesh;
}

/* ---------- static voxel bake ---------- */
const AO8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const AO4 = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
function aoFactor(x, y, z) {
  let f = 1;
  if (OCC.has(okey(x, y + 1, z))) f *= 0.64;
  let h = 0;
  for (let i = 0; i < 8; i++) if (OCC.has(okey(x + AO8[i][0], y + 1, z + AO8[i][1]))) h++;
  f *= 1 - 0.055 * Math.min(h, 4);
  let d = 0;
  for (let i = 0; i < 4; i++) if (OCC.has(okey(x + AO4[i][0], y, z + AO4[i][1]))) d++;
  f *= 1 - 0.06 * d;
  return f;
}

const STATIC_MESHES = [];
function buildStaticWorld() {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();
  const cc = new THREE.Color();
  let total = 0;
  Object.keys(VOX).forEach((key) => {
    const list = VOX[key];
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(box, MAT[key], list.length);
    mesh.name = 'static-' + key;
    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      dummy.position.set(v.x, v.y, v.z);
      dummy.scale.set(v.sx, v.sy, v.sz);
      dummy.rotation.set(v.rx, v.ry, v.rz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      cc.setHex(v.c);
      if (key !== 'glow') cc.multiplyScalar(aoFactor(v.x, v.y, v.z));
      mesh.setColorAt(i, cc);
      total++;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = key !== 'glow';
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
    STATIC_MESHES.push(mesh);
  });
  return total;
}


// ======================= 02_island.js =======================
/* =========================================================================
   ISLAND — terrain, cliffs, underside, Thames, waterfalls
   ========================================================================= */

const A = 58, B = 52;
const RZ0 = -4, RZ1 = 8;          // river band (cell centres)
const GY = 0.5;                   // ground surface height
const WATER_Y = 0.12;             // shallow river, fully visible from the orbit

const key2 = (x, z) => (x + 200) * 1000 + (z + 200);
const rimJitter = (th) => 1 + 0.052 * Math.sin(3 * th + 0.7) + 0.03 * Math.sin(5 * th + 2.3) + 0.018 * Math.sin(9 * th + 4.4) + 0.008 * Math.sin(13 * th + 1.1);
function inside(x, z) {
  const nx = x / A, nz = z / B;
  const r = Math.hypot(nx, nz);
  const th = Math.atan2(nz, nx);
  return r < rimJitter(th);
}
function rimPoint(th) {
  const r = rimJitter(th);
  return [A * r * Math.cos(th), B * r * Math.sin(th)];
}

/* ---------- painted masks (roads, plazas, paths, lawns) ---------- */
const ROAD = new Set(), PLAZA = new Set(), PATH = new Set(), LAWN = new Set();
function addRect(set, x0, x1, z0, z1) {
  for (let x = Math.ceil(x0); x <= Math.floor(x1); x++)
    for (let z = Math.ceil(z0); z <= Math.floor(z1); z++) set.add(key2(x, z));
}
// roads
addRect(ROAD, -54, 54, -13, -10);
addRect(ROAD, -54, 54, 11, 14);
addRect(ROAD, 13, 21, -15, 18);
addRect(ROAD, 39, 45, -16, 20);
// plazas & paving
addRect(PLAZA, -16, 4, -31, -21);        // trafalgar square
addRect(PLAZA, -44, -20, -25, -14);      // buckingham forecourt
addRect(PLAZA, -30, 13, -22, -13);       // westminster apron (river side)
addRect(PLAZA, 8, 30, -34, -21);         // st paul's apron
addRect(PLAZA, 26, 42, -28, -12);        // tower of london ward
addRect(PLAZA, -55, 55, -9, -5);         // north embankment promenade
addRect(PLAZA, -55, 55, 8, 10);          // south embankment promenade
addRect(PLAZA, -17, 5, -38, -32);        // national gallery forecourt
for (let x = -38; x <= -2; x++) for (let z = 1; z <= 34; z++) {
  const dx = x + 20, dz = z - 18;
  if (dx * dx + dz * dz < 15 * 15) PLAZA.add(key2(x, z));   // london eye plaza
}
// striped lawns
addRect(LAWN, -56, 56, -50, -34);
addRect(LAWN, -56, -20, -33, -25);
addRect(LAWN, -56, 56, 15, 50);
addRect(LAWN, -56, -40, -25, 15);
addRect(LAWN, 30, 56, -50, -30);
addRect(LAWN, -2, 12, -34, -22);
addRect(LAWN, -40, -18, -22, -14);

function paintPath(pts, w) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) * 2.5);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const cx = lerp(x0, x1, t), cz = lerp(z0, z1, t);
      const rad = w * 0.5;
      for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++)
        for (let z = Math.floor(cz - rad); z <= Math.ceil(cz + rad); z++)
          if ((x - cx) ** 2 + (z - cz) ** 2 <= rad * rad + 0.4) PATH.add(key2(x, z));
    }
  }
}
// winding park walks
paintPath([[-6, -20], [-13, -17], [-20, -14], [-27, -15], [-34, -17]], 2.6);
paintPath([[-6, -32], [-2, -35], [4, -38], [12, -41], [22, -42]], 2.4);
paintPath([[-46, -8], [-44, 2], [-48, 12], [-44, 22], [-38, 31], [-26, 36]], 2.4);
paintPath([[-18, 44], [-6, 40], [6, 42], [16, 46], [28, 44]], 2.4);
paintPath([[10, 16], [4, 22], [-2, 28], [-6, 36], [2, 42]], 2.4);
paintPath([[30, 12], [34, 20], [40, 28], [46, 34]], 2.2);
paintPath([[-34, -26], [-38, -34], [-42, -40]], 2.2);
paintPath([[24, -34], [18, -38], [10, -42]], 2.2);

const LAND = new Set();
for (let x = -62; x <= 62; x++) for (let z = -56; z <= 56; z++) if (inside(x, z)) LAND.add(key2(x, z));

/* ---------- ground type ---------- */
function groundType(x, z) {
  if (z >= RZ0 && z <= RZ1) return 'river';
  const k = key2(x, z);
  if (!LAND.has(k)) return null;
  if (ROAD.has(k)) return 'road';
  if (PATH.has(k)) return 'path';
  if (PLAZA.has(k)) return 'plaza';
  if (LAWN.has(k)) return 'lawn';
  return 'grass';
}

/* ---------- build the land ---------- */
const BOUNDARY = [];
const UNDER = new Map();
const landCells = [];

for (let x = -62; x <= 62; x++) {
  for (let z = -56; z <= 56; z++) {
    const type = groundType(x, z);
    if (!type) continue;
    const k = key2(x, z);
    if (type === 'river') {
      // river bed + banks are added separately
      landCells.push([x, z, 1]);
      continue;
    }
    landCells.push([x, z, 0]);
    const r = Math.hypot(x / A, z / B);
    const under = Math.round(-10 - 32 * Math.pow(1 - Math.min(r, 1), 0.9) + (hash2(x * 0.7, z * 0.7) - 0.5) * 2.6);
    UNDER.set(k, under);

    // top skin
    const stripe = (Math.floor(x / 5) + Math.floor(z / 5)) & 1;
    let top, top2;
    if (type === 'road') {
      top = vary(P.road, 0.05);
      top2 = top;
    } else if (type === 'path') {
      top = vary(P.path, 0.06);
      top2 = top;
    } else if (type === 'plaza') {
      top = vary((x + z) % 6 === 0 ? P.stoneLight : P.stone, 0.04);
      top2 = top;
    } else if (type === 'lawn') {
      top = stripe ? P.lawnA : P.lawnB;
      top = vary(top, 0.025);
      top2 = top;
    } else {
      top = vary(pick(P.grass), 0.05);
      top2 = top;
    }
    vox(x, 0, z, top, 'solid', 1, 1, 1);
    vox(x, -1, z, vary(P.dirt, 0.08), 'solid', 1, 1, 1);

    // boundary / cliff
    let ox = 0, oz = 0, isEdge = false;
    if (!inside(x + 1, z)) { isEdge = true; ox = 1; }
    else if (!inside(x - 1, z)) { isEdge = true; ox = -1; }
    if (!inside(x, z + 1)) { isEdge = true; if (!ox) { ox = 0; oz = 1; } }
    else if (!inside(x, z - 1)) { isEdge = true; if (!ox) { ox = 0; oz = -1; } }

    if (isEdge) {
      BOUNDARY.push([x, z, ox, oz]);
      const ph = hash2(x * 1.3, z * 1.7) * 10;
      for (let y = -2; y >= under + 1; y--) {
        const band = Math.sin((y + ph) * 0.55) + Math.sin((y + ph * 0.7) * 0.23) * 1.4;
        let hex;
        if (y >= -1) hex = P.dirt2;
        else if (band > 0.55) hex = P.rockOrange;
        else if (band > -0.15) hex = P.rockTan;
        else if (band > -0.85) hex = P.rockBrown;
        else if (band > -1.5) hex = P.rockGrey;
        else hex = P.rockDeep;
        const m = hash2(y * 3.1, x * 2.7 + z);
        if (m > 0.9 && y < -1) hex = P.moss;
        else if (m > 0.83 && y < -1) hex = P.moss2;
        vox(x, y, z, vary(hex, 0.07), 'solid');
      }
      // rocky outcrops
      const h = hash2(x * 5.1, z * 4.3);
      if (h > 0.86) {
        const oy = -2 - Math.floor(hash2(x, z) * 5);
        const nx = ox || 0, nz = oz || 0;
        vox(x + nx, oy, z + nz, vary(P.rockGrey, 0.1), 'solid', 1.25, 0.9, 1.25);
        vox(x + nx, oy + 1, z + nz, P.moss, 'solid', 1.2, 0.5, 1.2);
      }
    }

    // underside shell
    vox(x, under, z, vary(pick([P.rockGrey, P.rockDeep, P.rockBrown, P.rockDark]), 0.08), 'solid');
    vox(x, under - 1, z, vary(P.rockDark, 0.08), 'solid');
  }
}

/* ---------- river bed, walls, water ---------- */
const riverXs = [];
for (let z = RZ0; z <= RZ1; z++) {
  let maxX = 0, minX = 0;
  for (let x = 0; x < 70; x++) if (inside(x + 0.5, z + 0.5)) maxX = x + 0.5;
  for (let x = 0; x > -70; x--) if (inside(x - 0.5, z + 0.5)) minX = x - 0.5;
  riverXs.push(maxX, Math.abs(minX));
}
const WATER_X = Math.min(...riverXs) - 1.5;

for (let x = Math.floor(-WATER_X); x <= Math.ceil(WATER_X); x++) {
  for (let z = RZ0; z <= RZ1; z++) {
    if (!inside(x, z)) continue;
    vox(x, -3.6, z, vary(0x6a7b74, 0.08), 'solid');
    // the river still needs an underside so the island shell is closed
    const r = Math.hypot(x / A, z / B);
    const under = Math.round(-10 - 32 * Math.pow(1 - Math.min(r, 1), 0.9) + (hash2(x * 0.7, z * 0.7) - 0.5) * 2.6);
    vox(x, under, z, vary(pick([P.rockGrey, P.rockDeep, P.rockBrown, P.rockDark]), 0.08), 'solid');
    vox(x, under - 1, z, vary(P.rockDark, 0.08), 'solid');
  }
}
// cliff face under the two river mouths (behind the waterfalls)
for (const sx of [-1, 1]) {
  const x = Math.round(sx * (WATER_X + 0.1));
  for (let z = RZ0; z <= RZ1; z++) {
    if (!inside(x + sx, z)) continue;
    const r = Math.hypot(x / A, z / B);
    const under = Math.round(-10 - 32 * Math.pow(1 - Math.min(r, 1), 0.9));
    for (let y = -2; y >= under; y--) {
      const band = Math.sin((y + hash2(x, z) * 9) * 0.55);
      vox(x, y, z, vary(band > 0 ? P.rockTan : P.rockBrown, 0.06), 'solid');
    }
  }
}
// embankment stone walls
for (let x = Math.floor(-WATER_X); x <= Math.ceil(WATER_X); x++) {
  for (const z of [RZ0, RZ1]) {
    if (!inside(x, z)) continue;
    for (let y = -4; y <= 0; y++) {
      vox(x, y, z, vary(y === 0 ? P.stoneLight : P.stone, 0.05), 'solid');
    }
  }
}
// parapet rails along the river (gaps at the two bridges)
for (let x = Math.floor(-WATER_X); x <= Math.ceil(WATER_X); x++) {
  if ((x >= 12 && x <= 22) || (x >= 38 && x <= 46)) continue;
  for (const [z, dir] of [[RZ0, -1], [RZ1, 1]]) {
    if (!inside(x, z)) continue;
    vox(x, 0.85, z, P.stoneLight, 'solid', 1, 0.55, 0.55);
    if (x % 8 === 0) {
      vox(x, 1.5, z, P.stoneLight, 'solid', 0.6, 0.7, 0.6);
    }
  }
}
// road centre dashes
for (let x = -52; x <= 52; x += 5) {
  if (x > 11 && x < 23) continue;
  if (x > 37 && x < 47) continue;
  vox(x, 0.52, -11.5, P.roadLine, 'solid', 2.0, 0.05, 0.22);
  vox(x, 0.52, 12.5, P.roadLine, 'solid', 2.0, 0.05, 0.22);
}

/* ---------- water surface shader ---------- */
const waterUniforms = {
  time: { value: 0 },
  cDeep: { value: new THREE.Color(0x0b7f9c) },
  cShallow: { value: new THREE.Color(0x2cc9dc) },
  cFoam: { value: new THREE.Color(0xdffbff) },
  sunDir: { value: sunDir.clone() }
};
const waterMat = new THREE.ShaderMaterial({
  uniforms: waterUniforms,
  transparent: false,
  vertexShader: `
    uniform float time;
    varying vec2 vUv; varying vec3 vW; varying float vH;
    void main(){
      vUv = uv;
      vec3 p = position;
      float h = sin(p.x*0.45 + time*1.15)*0.075
              + sin(p.z*0.85 - time*0.95)*0.055
              + sin((p.x+p.z)*0.27 + time*0.62)*0.05;
      p.y += h; vH = h;
      vec4 wp = modelMatrix * vec4(p,1.0);
      vW = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    uniform float time; uniform vec3 cDeep, cShallow, cFoam, sunDir;
    varying vec2 vUv; varying vec3 vW; varying float vH;
    void main(){
      vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
      vec3 V = normalize(cameraPosition - vW);
      float fres = pow(1.0 - max(dot(n,V),0.0), 3.0);
      float band = 0.5 + 0.5*sin(vW.x*0.12 + vW.z*0.2 + time*0.4);
      vec3 col = mix(cDeep, cShallow, 0.42 + 0.30*band + vH*3.0);
      vec3 R = reflect(-sunDir, n);
      float spec = pow(max(dot(R,V),0.0), 90.0);
      col += vec3(1.0,0.94,0.82) * spec * 1.6;
      float spark = smoothstep(0.72, 1.0, sin(vW.x*2.3 + time*2.6) * sin(vW.z*3.7 - time*2.1));
      col += cFoam * spark * 0.22;
      col = mix(col, vec3(0.72,0.90,1.0), fres*0.35);
      float edge = smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
      gl_FragColor = vec4(col, 1.0);
    }`
});
(function buildRiver() {
  const geo = new THREE.PlaneGeometry(WATER_X * 2, 11.4, 150, 12);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, waterMat);
  mesh.position.set(0, WATER_Y, 2);
  mesh.receiveShadow = false;
  scene.add(mesh);
})();

/* ---------- waterfalls ---------- */
const fallUniforms = { time: { value: 0 } };
const fallMat = new THREE.ShaderMaterial({
  uniforms: fallUniforms,
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform float time; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    void main(){
      vec2 uv = vUv;
      float flow = time*0.5;
      float s = 0.0;
      for(int i=0;i<4;i++){
        float fi = float(i);
        float x = uv.x*22.0 + fi*9.1;
        float y = uv.y*2.4 - flow*(2.4+fi*0.55);
        float v = sin(x + sin(y*3.1)*1.4)*0.5+0.5;
        v *= sin(y*2.7 + x*0.35)*0.5+0.5;
        s += pow(v, 2.4)*0.55;
      }
      vec3 col = mix(vec3(0.13,0.53,0.68), vec3(0.90,0.99,1.0), clamp(s,0.0,1.0));
      float side = smoothstep(0.0,0.07,uv.x)*smoothstep(1.0,0.93,uv.x);
      float bottom = smoothstep(0.0,0.34,uv.y);
      float top = smoothstep(1.0,0.965,uv.y);
      float a = (0.42 + 0.55*clamp(s,0.0,1.0)) * side * bottom;
      a *= 0.85 + 0.15*sin(uv.y*80.0 - time*8.0);
      gl_FragColor = vec4(col, a*0.9);
    }`
});
const FALLS = [];
function addWaterfall(x, y, z, w, h, ry, big) {
  const geo = new THREE.PlaneGeometry(w, h, 1, 30);
  geo.translate(0, -h / 2, 0);
  const mesh = new THREE.Mesh(geo, fallMat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.renderOrder = 4;
  mesh.frustumCulled = false;
  scene.add(mesh);
  FALLS.push({ x, y, z, w, h, ry, big: !!big });
}
// the thames pours off both ends
addWaterfall(-WATER_X - 0.2, WATER_Y + 0.1, 2, 11.4, 46, -Math.PI / 2, true);
addWaterfall(WATER_X + 0.2, WATER_Y + 0.1, 2, 11.4, 46, Math.PI / 2, true);

// three park streams spilling off the rim
const RIM_FALLS = [];
function parkFall(th, pondOffset) {
  const [rx, rz] = rimPoint(th);
  const nx = Math.cos(th), nz = Math.sin(th);
  const px = rx - nx * pondOffset, pz = rz - nz * pondOffset;
  // pond
  for (let ix = -2; ix <= 2; ix++) for (let iz = -2; iz <= 2; iz++) {
    const x = Math.round(px + ix), z = Math.round(pz + iz);
    if (!inside(x, z)) continue;
    if (ix * ix + iz * iz > 5.2) continue;
    vox(x, 0.55, z, vary(0x2aa9bf, 0.05), 'solid', 1, 0.16, 1);
    vox(x, -1, z, P.stoneDark, 'solid');
  }
  // stream to the rim
  const steps = Math.ceil(pondOffset);
  for (let s = 0; s <= steps; s++) {
    const f = s / steps;
    const x = Math.round(lerp(px, rx - nx * 1.4, f)), z = Math.round(lerp(pz, rz - nz * 1.4, f));
    vox(x, 0.58, z, 0x46c6d8, 'solid', 0.9, 0.12, 0.9);
  }
  const ry = Math.atan2(nx, nz);
  addWaterfall(rx + nx * 0.6, 0.55, rz + nz * 0.6, 3.2, 33, ry, false);
  RIM_FALLS.push([rx + nx * 0.6, 0.55, rz + nz * 0.6, 3.2, 33, ry]);
}
parkFall(0.95, 9);
parkFall(2.62, 8);
parkFall(4.25, 10);

/* ---------- hanging vines, roots, stalactites ---------- */
for (let i = 0; i < BOUNDARY.length; i++) {
  const b = BOUNDARY[i];
  const [x, z, ox, oz] = b;
  if (hash2(x * 7.7, z * 3.3) < 0.62) continue;
  const len = 2 + Math.floor(hash2(x * 2.1, z * 9.7) * 9);
  const sway = (hash2(x, z) - 0.5) * 0.22;
  for (let k = 0; k < len; k++) {
    const yy = -1 - k * 0.52;
    const jx = ox * 0.45 + (k > 2 ? sway * k * 0.25 : 0);
    const jz = oz * 0.45 + (k > 2 ? sway * k * 0.18 : 0);
    vox(x + jx, yy, z + jz, vary(k % 3 === 0 ? P.leaf5 : P.leaf2, 0.08), 'solid', 0.42, 0.55, 0.42, sway * 0.4, 0, sway);
    if (k === len - 1 && hash2(x, z * 2) > 0.5) {
      const fc = pick([0xf06a8c, 0xf4d24a, 0xffffff, 0xdd7ce0]);
      vox(x + jx, yy - 0.5, z + jz, fc, 'solid', 0.55, 0.4, 0.55);
    }
  }
}
// roots
for (let i = 0; i < 34; i++) {
  const b = BOUNDARY[Math.floor(rnd() * BOUNDARY.length)];
  const [x, z, ox, oz] = b;
  const under = UNDER.get(key2(x, z)) || -8;
  const len = 3 + Math.floor(rnd() * 7);
  const sx = x + ox * 0.8, sz = z + oz * 0.8;
  for (let k = 0; k < len; k++) {
    const yy = under + 1 - k * 0.7;
    vox(sx + Math.sin(k * 0.7) * 0.3, yy, sz + Math.cos(k * 0.6) * 0.3, vary(P.trunk, 0.12), 'solid', 0.3, 0.7, 0.3);
  }
}
// stalactite spikes
for (let i = 0; i < 20; i++) {
  const th = rnd() * Math.PI * 2, rad = 0.12 + rnd() * 0.7;
  const cx = A * rad * Math.cos(th), cz = B * rad * Math.sin(th);
  const r = Math.hypot(cx / A, cz / B);
  const base = Math.round(-10 - 32 * Math.pow(1 - r, 0.9));
  const len = 8 + Math.floor(rnd() * 15);
  const size = 2 + Math.floor(rnd() * 3);
  for (let k = 0; k < len; k++) {
    const w = Math.max(0.6, size * (1 - k / len));
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (Math.abs(dx) + Math.abs(dz) > w) continue;
      vox(Math.round(cx + dx * w * 0.8), base - k, Math.round(cz + dz * w * 0.8), vary(k % 5 === 0 ? P.rockTan : P.rockDeep, 0.09), 'solid');
    }
    if (k > len * 0.6 && hash2(i, k) > 0.7) vox(Math.round(cx + 1.2), base - k, Math.round(cz), P.moss, 'solid', 0.6, 0.5, 0.6);
  }
}

/* ---------- boulder clusters clinging to the underside ---------- */
for (let i = 0; i < 16; i++) {
  const th = rnd() * TAU, rad = 0.55 + rnd() * 0.4;
  const cx = A * rad * Math.cos(th), cz = B * rad * Math.sin(th);
  const r = Math.hypot(cx / A, cz / B);
  const base = Math.round(-10 - 32 * Math.pow(1 - Math.min(r, 1), 0.9));
  const n = 2 + Math.floor(rnd() * 4);
  for (let k = 0; k < n; k++) {
    const s2 = rr(1.2, 2.8);
    vox(cx + rr(-2, 2), base + rr(-1.5, 2.5), cz + rr(-2, 2), vary(pick([P.rockGrey, P.rockDeep, P.rockBrown]), 0.1), 'solid', s2, s2 * 0.8, s2);
    if (rnd() < 0.45) vox(cx + rr(-2, 2), base + rr(-0.5, 3), cz + rr(-2, 2), P.moss, 'solid', s2 * 0.7, s2 * 0.3, s2 * 0.7);
  }
}

/* ---------- floating debris rocks ---------- */
const DEBRIS = [];
for (let i = 0; i < 9; i++) {
  const th = rnd() * Math.PI * 2;
  const rad = 0.72 + rnd() * 0.5;
  const x = A * rad * Math.cos(th), z = B * rad * Math.sin(th);
  const y = rr(-16, 16);
  const s = rr(1.2, 2.6);
  const g = new THREE.Group();
  const parts = [];
  const n = 3 + Math.floor(rnd() * 4);
  for (let k = 0; k < n; k++) {
    parts.push([rr(-s, s) * 0.6, rr(-s, s) * 0.5, rr(-s, s) * 0.6, rr(0.8, 1.6) * s * 0.5, rr(0.8, 1.5) * s * 0.4, rr(0.8, 1.6) * s * 0.5, pick([P.rockGrey, P.rockDeep, P.rockBrown, P.moss]), rr(-0.4, 0.4), rr(0, 3), rr(-0.4, 0.4)]);
  }
  const m = mergedMesh(parts);
  m.position.set(x, y, z);
  scene.add(m);
  DEBRIS.push({ mesh: m, y, ph: rnd() * 6.28, sp: rr(0.3, 0.8) });
}


// ======================= 03_landmarks.js =======================
/* =========================================================================
   LANDMARKS
   ========================================================================= */

const EXCL = [];
function ex(x0, z0, x1, z1) { EXCL.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]); }

const CLOCK = [];
let FLAG = null;
const FOUNTAINS = [];
let EYE = null;
const BASCULES = [];
let GUARDS = null, GUARD_BASE = 0;

/* ---------- small helpers ---------- */
function windowPane(x, y, z, w, h, ry, tint) {
  // a recessed gothic-ish window: dark glass with a light frame
  vox(x, y, z, tint || 0x17384a, 'glass', w, h, 0.22, 0, ry || 0, 0);
}
function crenellate(x0, x1, z, y, hex) {
  for (let x = x0; x <= x1; x++) if ((x - x0) % 2 === 0) vox(x, y, z, hex, 'solid', 0.9, 0.8, 0.9);
}
function spire(x, z, y0, h, hex, tip) {
  vox(x, y0, z, hex, 'solid', 1.2, 1.2, 1.2);
  for (let i = 1; i <= h; i++) {
    const s = 1 - i / (h + 1);
    vox(x, y0 + i, z, i > h - 2 && tip ? tip : hex, 'solid', Math.max(0.22, s * 1.15), 1, Math.max(0.22, s * 1.15));
  }
}

/* =========================================================================
   PALACE OF WESTMINSTER
   ========================================================================= */
function buildWestminster() {
  const z0 = -21, z1 = -14;
  // plinth
  fillBox(-27, 1, z0 - 1, 32, 1, 9, P.stoneGrey);
  // main body
  fillBox(-26, 2, z0, 30, 6, 8, P.stone, 'solid', 0.03);
  fillBox(-26, 8, z0, 30, 1, 8, P.slateDark);           // roof slab

  // buttresses + windows along the river facade
  for (let x = -26; x <= 4; x += 3) {
    fillBox(x, 2, z1, 1, 7, 1, P.stoneLight);
    vox(x, 9, z1, P.stoneLight, 'solid', 0.8, 2.4, 0.8);
  }
  for (let x = -24; x <= 2; x += 3) {
    // tall arched window between the buttresses
    vox(x, 4.6, z1 + 0.15, 0x16394d, 'glass', 1.7, 3.8, 0.24);
    vox(x, 6.7, z1 + 0.28, P.stoneLight, 'solid', 1.9, 0.35, 0.2);
    vox(x, 5.6, z1 + 0.28, P.gold, 'solid', 0.16, 3.0, 0.22);
    vox(x, 4.6, z1 + 0.28, P.gold, 'solid', 1.7, 0.16, 0.22);
  }
  // small gothic pinnacles along the roof
  for (let x = -26; x <= 5; x += 3) {
    spire(x, z1 - 0.2, 9, 3, P.stoneLight, P.gold);
  }
  for (let x = -24; x <= 4; x += 6) spire(x, z0 + 0.4, 9, 2, P.stoneLight, P.gold);

  // central tower
  fillBox(-13, 2, -21, 7, 12, 8, P.stone, 'solid', 0.03);
  fillBox(-13, 13, -21, 7, 1, 8, P.slate);
  for (let x = -13; x <= -7; x += 2) for (const z of [-21, -14]) {
    vox(x, 10, z, 0x14384a, 'glass', 1.1, 3, 0.22);
  }
  spiring(-10, -17.5, 14, 7);
  // central spire cluster
  spire(-10, -17.5, 14, 8, P.slateBlue, P.gold);
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) spire(-10 + dx, -17.5 + dz, 13, 5, P.slateBlue, P.gold);

  // victoria tower
  buildVictoriaTower(-29.5, z0, 7, 8);

  // big ben
  buildBigBen(8, -17.5);

  // river terrace
  fillBox(-27, 1, -13, 32, 1, 2, P.stoneLight);
  ex(-30, -22, 12, -12);
}
function spiring(x, z, y, h) { spire(x, z, y, h, P.slateBlue, P.gold); }

function buildVictoriaTower(x0, z0, w, d) {
  fillBox(x0, 1, z0, w, 2, d, P.stoneGrey);
  fillBox(x0, 3, z0, w, 17, d, P.stone, 'solid', 0.025);
  // vertical ribs
  for (const [dx, dz] of [[0, 0], [w - 1, 0], [0, d - 1], [w - 1, d - 1]]) {
    for (let y = 3; y < 20; y++) vox(x0 + dx, y, z0 + dz, P.stoneLight, 'solid', 1.1, 1, 1.1);
  }
  // windows
  for (let y = 6; y <= 17; y += 4) {
    for (let dx = 2; dx <= w - 3; dx += 2) {
      vox(x0 + dx, y, z0 + d - 0.85, 0x16394d, 'glass', 1.0, 2.2, 0.22);
      vox(x0 + dx, y, z0 + 0.85, 0x16394d, 'glass', 1.0, 2.2, 0.22);
    }
  }
  // crown + corner turrets
  fillBox(x0 - 0.5, 20, z0 - 0.5, w + 1, 1, d + 1, P.stoneLight);
  crenellate(x0 - 0.5, x0 + w - 0.5, z0 - 0.5, 21, P.stoneLight);
  for (const [dx, dz] of [[0, 0], [w - 1, 0], [0, d - 1], [w - 1, d - 1]]) {
    spire(x0 + dx, z0 + dz, 20, 4, P.stoneLight, P.gold);
  }
  // flagpole + union jack
  vox(x0 + w / 2, 21, z0 + d / 2, 0x9a9a9a, 'metal', 0.22, 9.5, 0.22);
  vox(x0 + w / 2, 30.9, z0 + d / 2, P.gold, 'metal', 0.5, 0.6, 0.5);
  const tex = unionJackTexture();
  const fg = new THREE.PlaneGeometry(6.6, 4.0, 20, 12);
  fg.translate(3.3, 0, 0);
  const fm = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.95, metalness: 0 }));
  fm.position.set(x0 + w / 2 + 0.12, 27.0, z0 + d / 2);
  fm.castShadow = true;
  scene.add(fm);
  FLAG = { mesh: fm, geo: fg, base: fg.attributes.position.array.slice(0) };
}

function buildBigBen(cx, cz) {
  const x0 = cx - 3, z0 = cz - 3, W = 7, D = 7;
  // shaft
  fillBox(x0, 1, z0, W, 2, D, P.stoneGrey);
  fillBox(x0, 3, z0, W, 19, D, P.stone, 'solid', 0.022);
  // corner ribs
  for (const [dx, dz] of [[0, 0], [W - 1, 0], [0, D - 1], [W - 1, D - 1]]) {
    for (let y = 3; y < 22; y += 2) vox(x0 + dx, y, z0 + dz, P.stoneLight, 'solid', 1.15, 1.9, 1.15);
  }
  // tall windows on each face
  for (let y = 6; y <= 18; y += 6) {
    for (const zz of [z0 - 0.6, z0 + D - 0.4]) vox(cx, y, zz, 0x14384a, 'glass', 2.2, 3.6, 0.2);
    for (const xx of [x0 - 0.6, x0 + W - 0.4]) vox(xx, y, cz, 0x14384a, 'glass', 0.2, 3.6, 2.2);
  }
  // clock stage (one voxel proud of the shaft)
  fillBox(x0 - 1, 22, z0 - 1, W + 2, 7, D + 2, P.stoneLight, 'solid', 0.015);
  fillBox(x0 - 1.2, 22, z0 - 1.2, W + 2.4, 0.4, D + 2.4, P.goldDark);
  fillBox(x0 - 1.2, 28.6, z0 - 1.2, W + 2.4, 0.35, D + 2.4, P.gold);
  // belfry
  fillBox(x0 + 1, 29, z0 + 1, W - 2, 3, D - 2, P.stoneLight, 'solid', 0.02);
  const bz0 = z0 + 1, bz1 = z0 + D - 2, bx0 = x0 + 1, bx1 = x0 + W - 2;
  for (const [fx, fz] of [[cx, bz1 + 0.55], [cx, bz0 - 0.55], [bx0 - 0.55, cz], [bx1 + 0.55, cz]]) {
    vox(fx, 30.5, fz, 0x0f2b3a, 'glass', 2.2, 2.4, 0.25);
    vox(fx, 31.85, fz, P.gold, 'solid', 2.7, 0.25, 0.25);
  }
  // roof: steep slate spire (fine stepping so it reads as a spire, not stairs)
  fillBox(x0 - 0.7, 32.3, z0 - 0.7, W + 1.4, 0.8, D + 1.4, P.slateBlue);
  for (let i = 0; i < 11; i++) {
    const t = i / 11;
    const w = 1.0 + (W + 0.9) * Math.pow(1 - t, 0.8);
    fillBox(cx - w / 2, 33.1 + i, cz - w / 2, w, 1, w, i % 2 ? 0x33475c : P.slateBlue, 'solid', 0.02);
    if (i < 7) {
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        vox(cx + dx * w * 0.47, 33.6 + i, cz + dz * w * 0.47, P.goldDark, 'metal', 0.2, 1.1, 0.2);
      }
    }
  }
  // lantern + gilded finial
  vox(cx, 44.1, cz, 0x2b3c4e, 'solid', 1.5, 0.9, 1.5);
  vox(cx, 45.1, cz, P.gold, 'metal', 1.0, 1.7, 1.0);
  vox(cx, 46.4, cz, P.goldPale, 'metal', 0.45, 0.9, 0.45);
  for (const [dx, dz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) spire(cx + dx, cz + dz, 32.3, 3.4, P.slateBlue, P.gold);

  // four clock faces
  makeClockFace(cx, 25.6, z0 - 1.6, Math.PI);
  makeClockFace(cx, 25.6, z0 + D + 0.6, 0);
  makeClockFace(x0 - 1.6, 25.6, cz, -Math.PI / 2);
  makeClockFace(x0 + W + 1.6, 25.6, cz, Math.PI / 2);
}

function makeClockFace(cx, cy, cz, ry) {
  const s = 6.0;
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const put = (lx, ly, lz, hex, mat, sx, sy, sz) => {
    const wx = lx * cos + lz * sin;
    const wz = -lx * sin + lz * cos;
    vox(cx + wx, cy + ly, cz + wz, hex, mat, sx, sy, sz, 0, ry, 0);
  };
  // outer gold plate + stone surround
  put(0, 0, -0.02, P.stoneLight, 'solid', s + 0.35, s + 0.35, 0.26);
  put(0, 0, 0.04, P.gold, 'metal', s + 0.5, s + 0.5, 0.22);
  // circular dark bezel + white dial
  const R1 = s * 0.5 - 0.15, R0 = R1 - 0.55;
  for (let ix = -R1; ix <= R1; ix += 0.48) {
    for (let iy = -R1; iy <= R1; iy += 0.48) {
      const rr2 = Math.hypot(ix, iy);
      if (rr2 > R1) continue;
      if (rr2 > R0) put(ix, iy, 0.12, 0x23272c, 'solid', 0.52, 0.52, 0.12);
      else put(ix, iy, 0.12, 0xfffdf6, 'solid', 0.52, 0.52, 0.12);
    }
  }
  // ticks
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const r = R0 - 0.35;
    put(Math.sin(a) * r, Math.cos(a) * r, 0.19, 0x1b1b1b, 'solid', i % 3 === 0 ? 0.38 : 0.2, i % 3 === 0 ? 0.7 : 0.42, 0.09);
  }
  // hands group
  const grp = new THREE.Group();
  grp.position.set(cx, cy, cz);
  grp.rotation.y = ry;
  const mat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.55, metalness: 0.25 });
  const hourG = new THREE.BoxGeometry(0.36, 1.9, 0.14); hourG.translate(0, 0.95, 0);
  const minG = new THREE.BoxGeometry(0.28, 2.7, 0.12); minG.translate(0, 1.35, 0);
  const hour = new THREE.Mesh(hourG, mat); hour.position.z = 0.25;
  const min = new THREE.Mesh(minG, mat); min.position.z = 0.31;
  grp.add(hour, min);
  const capG = new THREE.CylinderGeometry(0.26, 0.26, 0.3, 10); capG.rotateX(Math.PI / 2);
  const cap = new THREE.Mesh(capG, new THREE.MeshStandardMaterial({ color: 0xd9a83c, metalness: 0.9, roughness: 0.3 }));
  cap.position.z = 0.32; grp.add(cap);
  scene.add(grp);
  CLOCK.push({ hour, min, grp });
}

/* =========================================================================
   LONDON EYE
   ========================================================================= */
function buildLondonEye() {
  const HUB = new THREE.Vector3(-20, 16, 18);
  const R = 13;
  const parts = [];
  const N = 48;
  for (let i = 0; i < N; i++) {
    const a = (i + 0.5) / N * TAU;
    const seg = 2 * R * Math.sin(Math.PI / N) * 1.06;
    for (const zz of [-0.42, 0.42]) {
      parts.push([Math.cos(a) * R, Math.sin(a) * R, zz, seg, 0.55, 0.5, 0xf6f2e6, 0, 0, a + Math.PI / 2]);
    }
    if (i % 3 === 0) parts.push([Math.cos(a) * R, Math.sin(a) * R, 0, 0.42, 0.42, 0.9, 0xdfdacb]);
    if (i % 4 === 0) parts.push([Math.cos(a) * R * 0.97, Math.sin(a) * R * 0.97, 0, 0.3, 2.0, 0.3, 0xe8e3d4, 0, 0, a + Math.PI / 2]);
  }
  // spokes
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU;
    parts.push([Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, 0.42, 0.3, R, 0.3, 0xe9e4d6, 0, 0, a - Math.PI / 2]);
  }
  // inner ring
  for (let i = 0; i < 32; i++) {
    const a = (i + 0.5) / 32 * TAU;
    const seg = 2 * R * 0.42 * Math.sin(Math.PI / 32) * 1.05;
    parts.push([Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.42, 0.42, seg, 0.5, 0.5, 0xf2eee0, 0, 0, a + Math.PI / 2]);
  }
  const wheel = mergedMesh(parts, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.35, envMapIntensity: 0.8 }));
  const pivot = new THREE.Group();
  pivot.position.copy(HUB);
  pivot.add(wheel);
  scene.add(pivot);

  // hub
  const hubG = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.2, 16), new THREE.MeshStandardMaterial({ color: 0xece7d8, roughness: 0.4, metalness: 0.3 }));
  hubG.rotation.x = Math.PI / 2;
  hubG.position.copy(HUB);
  scene.add(hubG);

  // support struts (static)
  const legs = [];
  const legMat = new THREE.MeshStandardMaterial({ color: 0xe8e3d4, roughness: 0.45, metalness: 0.25 });
  for (const zz of [-6.5, 6.5]) {
    const from = new THREE.Vector3(0, -1, 0), to = new THREE.Vector3(0, -15.4, zz);
    const len = from.distanceTo(to);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const ang = Math.atan2(-zz, 14.4);
    legs.push([mid.x, mid.y, mid.z, 0.55, len, 0.55, 0xe8e3d4, ang, 0, 0]);
  }
  legs.push([0, -15.4, 0, 0.8, 0.8, 13, 0xe8e3d4]);
  const support = mergedMesh(legs, legMat);
  support.position.copy(HUB);
  scene.add(support);

  // boarding platform + base
  vcyl(-20, 18, 1, 1, 7, P.stoneLight);
  fillBox(-24, 1, 14, 8, 1, 9, P.stoneLight);
  for (let i = 0; i < 8; i++) vox(-24 + i * 1.05, 1.5, 23, P.stoneGrey, 'solid');
  ex(-36, 2, -4, 34);

  // pods
  const podGeo = new THREE.BoxGeometry(1.7, 1.25, 1.0);
  const podMat = new THREE.MeshStandardMaterial({ color: 0xcfeef7, roughness: 0.08, metalness: 0.55, envMapIntensity: 1.5 });
  const pods = new THREE.InstancedMesh(podGeo, podMat, 32);
  pods.castShadow = true; pods.receiveShadow = true; pods.frustumCulled = false;
  scene.add(pods);

  EYE = { pivot, HUB, R, pods, wheels: wheel, speed: TAU / 52 };
}

/* =========================================================================
   TOWER BRIDGE
   ========================================================================= */
function buildTowerBridge() {
  const CX = 42;
  // tower builder
  function tower(zc, side) {
    const x0 = CX - 3.4, z0 = zc - 2.6, w = 7, d = 5.2;
    fillBox(x0, 1, z0, w, 1, d, P.stoneGrey);
    fillBox(x0, 2, z0, w, 12, d, P.stoneCool, 'solid', 0.02);
    // blue banding
    fillBox(x0 - 0.1, 11, z0 - 0.1, w + 0.2, 0.7, d + 0.2, P.blue);
    fillBox(x0 - 0.1, 4.2, z0 - 0.1, w + 0.2, 0.45, d + 0.2, P.blueDeep);
    // gothic windows
    for (let y = 6; y <= 9; y += 3) {
      for (let dx = 1.2; dx < w - 1; dx += 2.2) {
        vox(x0 + dx, y, z0 + d - 0.75, 0x123448, 'glass', 1.2, 2.2, 0.2);
      }
    }
    vox(CX, 3.4, zc, 0x11303f, 'glass', 3.0, 3.4, 4.4);
    fillBox(x0 - 0.4, 13.6, z0 - 0.4, w + 0.8, 1.2, d + 0.8, P.stoneLight);
    crenellate(x0 - 0.4, x0 + w + 0.4, z0 - 0.4, 14.8, P.stoneLight);
    // four turrets + slate caps
    for (const [dx, dz] of [[-0.4, -0.4], [w - 0.6, -0.4], [-0.4, d - 0.6], [w - 0.6, d - 0.6]]) {
      fillBox(x0 + dx, 13.8, z0 + dz, 1.8, 3.2, 1.8, P.stoneLight);
      spire(x0 + dx + 0.9, z0 + dz + 0.9, 17, 3.4, P.slateBlue, P.gold);
    }
    // suspended chains
    for (const sx of [-1, 1]) {
      const x = CX + sx * 3.55;
      for (let k = 0; k <= 26; k++) {
        const t = k / 26;
        const zz = zc + side * (2.6 + t * 10);
        const yy = 17.5 - Math.pow(t, 1.5) * 14.5;
        vox(x, yy, zz, P.bluePale, 'metal', 0.32, 0.32, 0.32);
        if (k % 4 === 0 && t < 0.85) {
          for (let yy2 = Math.round(yy - 0.4); yy2 > 2; yy2 -= 1) vox(x, yy2, zz, P.bluePale, 'metal', 0.14, 0.14, 0.14);
        }
      }
    }
  }
  tower(-6, -1);
  tower(10, 1);

  // high level walkways
  for (const xo of [-3.0, 3.0]) {
    fillBox(CX + xo - 1.1, 13.2, -3, 2.2, 1.0, 10, P.bluePale, 'solid', 0.02);
    fillBox(CX + xo - 1.2, 14.2, -3, 2.4, 0.35, 10, P.stoneLight);
    for (let z = -3; z < 7; z += 2) {
      vox(CX + xo, 12.6, z, P.blueDeep, 'solid', 0.35, 1.2, 0.35);
      vox(CX + xo, 13.7, z + 1, P.bluePale, 'metal', 2.0, 0.16, 0.16);
    }
  }
  // braced lattice between the walkways
  for (let z = -2; z <= 6; z += 2) {
    vox(CX - 1.6, 13.2, z, P.bluePale, 'metal', 0.2, 0.2, 0.2);
    vox(CX + 1.6, 13.2, z, P.bluePale, 'metal', 0.2, 0.2, 0.2);
  }
  // deck pieces on the banks
  fillBox(CX - 3, 0, -8, 6, 0.7, 4.2, P.stone);
  fillBox(CX - 3, 0, 8, 6, 0.7, 4.2, P.stone);
  fillBox(CX - 3, 0.55, -8, 6, 0.14, 4.2, P.road);
  fillBox(CX - 3, 0.55, 8, 6, 0.14, 4.2, P.road);
  // bascules
  for (const [zc, dir] of [[-3.2, 1], [7.2, -1]]) {
    const grp = new THREE.Group();
    grp.position.set(CX, 0.35, zc);
    const parts = [
      [0, -0.18, dir * 2.9, 6.4, 0.62, 5.8, P.stoneGrey],
      [0, 0.05, dir * 2.9, 6.2, 0.14, 5.9, P.road],
      [-3.0, 0.35, dir * 2.9, 0.25, 0.4, 5.9, P.blue],
      [3.0, 0.35, dir * 2.9, 0.25, 0.4, 5.9, P.blue],
      [0, 0.5, dir * 5.75, 6.4, 0.3, 0.3, P.bluePale]
    ];
    const m = mergedMesh(parts);
    grp.add(m);
    scene.add(grp);
    BASCULES.push({ grp, dir, base: 0 });
  }
  // lamps on the approach
  for (let z = -15; z <= 19; z += 4) {
    if (z > -4 && z < 9) continue;
    for (const sx of [-3.2, 3.2]) lamp(CX + sx, 0.5, z, 3.2);
  }
  ex(CX - 8, -18, CX + 8, 22);
}

/* =========================================================================
   THE SHARD & THE GHERKIN
   ========================================================================= */
function buildShard() {
  const cx = 24, cz = 30, H = 48;
  // podium
  fillBox(cx - 5, 1, cz - 5, 11, 2, 11, P.stoneGrey);
  for (let y = 1; y < H; y++) {
    const t = y / H;
    const hw = 3.1 * Math.pow(1 - t, 0.8) + 0.45;
    const hex = new THREE.Color(0x1d6ba6).lerp(new THREE.Color(0x7cc4e6), 0.08 + 0.34 * t).getHex();
    // shell of the square
    for (let x = -Math.round(hw); x <= Math.round(hw); x++) {
      for (let z = -Math.round(hw); z <= Math.round(hw); z++) {
        const onEdge = Math.abs(Math.abs(x) - hw) < 1.1 || Math.abs(Math.abs(z) - hw) < 1.1;
        if (!onEdge) continue;
        const corner = Math.abs(x) > hw - 1 && Math.abs(z) > hw - 1;
        vox(cx + x, y, cz + z, corner ? 0xcdeefb : hex, corner ? 'metal' : 'glass', 1, 1, 1);
      }
    }
    if (y === Math.floor(H * 0.55) || y === Math.floor(H * 0.78)) {
      // floor bands
      for (let x = -Math.round(hw); x <= Math.round(hw); x++) {
        vox(cx + x, y, cz - Math.round(hw) - 0.2, 0xffffff, 'metal', 0.9, 0.12, 0.12);
        vox(cx + x, y, cz + Math.round(hw) + 0.2, 0xffffff, 'metal', 0.9, 0.12, 0.12);
      }
    }
  }
  // jagged crown fins
  const fins = [[-2, -2, 6], [2, -2, 4], [2, 2, 8], [-2, 2, 5]];
  for (const [dx, dz, h] of fins) {
    spire(cx + dx, cz + dz, H - 3, h, 0xd9f4ff, 0xffffff);
  }
  vox(cx, H + 3, cz, P.stoneCool, 'metal', 0.35, 6, 0.35);
  ex(cx - 8, cz - 8, cx + 8, cz + 8);
}

function buildGherkin() {
  const cx = 45, cz = -24, H = 26;
  fillBox(cx - 5, 1, cz - 5, 11, 1, 11, P.stoneGrey);
  for (let y = 1; y <= H; y++) {
    const t = (y - 1) / H;
    const r = 4.7 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.94 + 0.06)), 0.62);
    if (r < 0.6) continue;
    const n = Math.max(10, Math.round(r * 8));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const x = Math.round(cx + Math.cos(a) * r), z = Math.round(cz + Math.sin(a) * r);
      const stripe = ((i + y * 1.7) % 7) < 1.6;
      const hex = stripe ? 0xe9f4ef : (0.5 + 0.5 * Math.sin(a * 3 + y * 0.2) > 0.5 ? 0x4fa896 : 0x3f8f84);
      vox(x, y, z, hex, stripe ? 'metal' : 'glass', 1.05, 1.05, 1.05);
    }
    // inner fill at the top/bottom to keep it solid
    if (t > 0.9 || t < 0.08) {
      for (let x = -Math.round(r); x <= Math.round(r); x++) for (let z = -Math.round(r); z <= Math.round(r); z++) {
        if (x * x + z * z < r * r * 0.8) vox(cx + x, y, cz + z, 0x3f8f84, 'glass');
      }
    }
  }
  vox(cx, H + 2, cz, P.stoneCool, 'metal', 0.3, 3, 0.3);
  ex(cx - 8, cz - 8, cx + 8, cz + 8);
}

/* =========================================================================
   ST PAUL'S CATHEDRAL
   ========================================================================= */
function buildStPauls() {
  const cx = 19, cz = -28;
  // podium
  fillBox(cx - 9, 1, cz - 6, 19, 1, 13, P.stoneGrey);
  // nave
  fillBox(cx - 7, 2, cz - 4, 15, 6, 9, P.stoneLight, 'solid', 0.02);
  fillBox(cx - 7, 8, cz - 4, 15, 1, 9, P.stoneGrey);
  // transepts
  fillBox(cx - 3, 2, cz - 6, 7, 5, 13, P.stoneLight);
  // west portico
  fillBox(cx - 9, 1, cz - 3, 3, 1, 7, P.stoneLight);
  for (let dz = -2; dz <= 2; dz += 2) {
    vox(cx - 9.4, 4.5, cz + dz, P.stoneLight, 'solid', 1.1, 7, 1.1);
    vox(cx - 9.4, 8.2, cz + dz, P.gold, 'solid', 1.3, 0.3, 1.3);
  }
  fillBox(cx - 9.4, 8.4, cz - 3, 3.4, 1, 7, P.stoneLight);
  vox(cx - 8.5, 9.2, cz, P.stoneLight, 'solid', 1.6, 1.2, 4.2);
  // west towers
  for (const dz of [-4.6, 4.6]) {
    fillBox(cx - 9, 1, cz + dz - 1, 4, 12, 3, P.stoneLight);
    spire(cx - 7, cz + dz, 13, 4, P.stoneLight, P.gold);
  }
  // drum
  for (let y = 8; y <= 12; y++) {
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * TAU;
      if (i % 2 === 0) vox(Math.round(cx + Math.cos(a) * 7.6), y, Math.round(cz + Math.sin(a) * 7.6), P.stoneLight, 'solid');
      else vox(Math.round(cx + Math.cos(a) * 7.6), y, Math.round(cz + Math.sin(a) * 7.6), 0x2c4756, 'glass', 0.7, 0.7, 0.7);
    }
  }
  fillBox(cx - 8, 12.4, cz - 8, 17, 0.8, 17, P.stoneLight);
  // dome
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const y = 13.2 + t * 10;
    const r = 7.9 * Math.sqrt(Math.max(0.001, 1 - t * t));
    const n = Math.max(8, Math.round(r * 6));
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU;
      vox(Math.round(cx + Math.cos(a) * r), y, Math.round(cz + Math.sin(a) * r), i > 22 ? P.goldPale : (i % 4 === 0 ? P.stoneCool : P.stoneLight), 'solid', 1.1, 1.1, 1.1);
    }
  }
  // lantern + cross
  fillBox(cx - 1.6, 23.5, cz - 1.6, 3.2, 2.6, 3.2, P.stoneLight);
  vox(cx, 27.2, cz, P.gold, 'metal', 0.35, 4.2, 0.35);
  vox(cx, 28.2, cz, P.gold, 'metal', 2.0, 0.32, 0.32);
  // surrounding steps & railings
  for (let i = 0; i < 3; i++) fillBox(cx - 10 + i, 1, cz - 7 + i, 21 - i * 2, 1, 1, P.stoneLight);
  for (let x = -11; x <= 11; x += 2) vox(cx + x, 1, cz - 8, P.stoneGrey, 'solid');
  ex(cx - 11, cz - 9, cx + 11, cz + 8);

  // railings
  for (let x = cx - 10; x <= cx + 10; x += 1.6) vox(x, 2.2, cz + 7, P.stoneGrey, 'metal', 0.14, 1.4, 0.14);
}

/* =========================================================================
   TOWER OF LONDON
   ========================================================================= */
function buildTowerOfLondon() {
  const cx = 34, cz = -20;
  // outer curtain wall (hollow square)
  const x0 = cx - 6, x1 = cx + 6, z0 = cz - 7, z1 = cz + 7;
  const wall = (ax, az, bx, bz) => {
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++)
      for (let z = Math.min(az, bz); z <= Math.max(az, bz); z++) {
        for (let y = 1; y <= 5; y++) vox(x, y, z, vary(P.stoneGrey, 0.04), 'solid');
        if ((x + z) % 2 === 0) vox(x, 6, z, P.stoneGrey, 'solid', 0.9, 0.7, 0.9);
      }
  };
  wall(x0, z0, x1, z0);
  wall(x0, z1, x1, z1);
  wall(x0, z0, x0, z1);
  wall(x1, z0, x1, z1);
  // corner towers
  for (const [dx, dz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    vcyl(dx, dz, 1, 7, 2.1, P.stoneGrey);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU;
      vox(Math.round(dx + Math.cos(a) * 2.1), 8, Math.round(dz + Math.sin(a) * 2.1), P.stoneGrey, 'solid', 0.9, 0.8, 0.9);
    }
  }
  // gatehouse to the river
  fillBox(cx - 2, 1, z1, 5, 7, 1.4, P.stoneGrey);
  fillBox(cx - 1.2, 1, z1 + 0.2, 2.4, 4, 1.2, 0x1a2b33, 'solid');
  // white tower
  fillBox(cx - 4, 1, cz - 4, 9, 1, 9, P.stoneGrey);
  fillBox(cx - 4, 2, cz - 4, 9, 13, 9, P.cream, 'solid', 0.012);
  for (let y = 3; y <= 13; y += 3.4) {
    for (const [fx, fz, w] of [[cx, cz - 4.6, 1.2], [cx, cz + 4.6, 1.2], [cx - 4.6, cz, 1.2], [cx + 4.6, cz, 1.2]]) {
      vox(fx, y, fz, 0x17313d, 'glass', w, 2.0, 0.2);
    }
  }
  fillBox(cx - 4.6, 15, cz - 4.6, 10.2, 0.8, 10.2, P.stoneGrey);
  crenellate(cx - 4.6, cx + 4.6, cz - 4.6, 15.9, P.stoneGrey);
  for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
    fillBox(cx + dx - 1, 14, cz + dz - 1, 3, 3, 3, P.cream);
    spire(cx + dx, cz + dz, 17, 3, P.cream, P.gold);
  }
  // green ward
  ex(x0 - 3, z0 - 3, x1 + 3, z1 + 3);
}

/* =========================================================================
   BUCKINGHAM PALACE + VICTORIA MEMORIAL
   ========================================================================= */
function buildBuckingham() {
  const cx = -34, cz = -30;
  fillBox(cx - 8, 1, cz - 4, 17, 1, 9, P.stoneGrey);
  fillBox(cx - 8, 2, cz - 4, 17, 7, 8, P.cream, 'solid', 0.02);
  fillBox(cx - 8, 9, cz - 4, 17, 1, 8, P.stoneGrey);
  // centre block
  fillBox(cx - 3, 2, cz - 5, 7, 9, 10, P.cream);
  fillBox(cx - 3, 11, cz - 5, 7, 1, 10, P.stoneGrey);
  // portico columns
  for (let dx = -2.4; dx <= 2.4; dx += 1.6) {
    vox(cx + dx, 5.4, cz + 4.4, P.cream, 'solid', 0.9, 6.5, 0.9);
  }
  fillBox(cx - 3, 9.6, cz + 3.4, 7, 1.2, 2.4, P.cream);
  fillBox(cx - 3.2, 10.6, cz + 3.2, 7.4, 0.8, 2.6, P.stoneGrey);
  // windows
  for (let dx = -7; dx <= 7; dx += 2.2) {
    vox(cx + dx, 4.4, cz + 4.15, 0x1b3a49, 'glass', 1.1, 2.2, 0.18);
    vox(cx + dx, 4.4, cz - 4.15, 0x1b3a49, 'glass', 1.1, 2.2, 0.18);
  }
  // roof balustrade + flag
  for (let dx = -8; dx <= 8; dx += 1.6) vox(cx + dx, 10.1, cz + 3.9, P.stoneLight, 'solid', 0.5, 0.9, 0.5);
  vox(cx, 11, cz - 1, 0x8d8d8d, 'metal', 0.16, 6, 0.16);
  vox(cx, 15.6, cz - 1, P.red, 'solid', 2.4, 1.5, 0.16);
  // forecourt railings & gates
  for (let x = cx - 12; x <= cx + 12; x += 1.2) {
    if (x > cx - 3 && x < cx + 3) continue;
    vox(x, 2.0, cz + 15, P.gold, 'metal', 0.12, 1.8, 0.12);
    vox(x, 2.9, cz + 15, P.gold, 'metal', 1.1, 0.12, 0.12);
  }
  fillBox(cx - 3, 1, cz + 15, 6, 0.4, 0.4, P.gold);
  // guards (animated figures)
  buildGuards(cx - 6.5, -16.5, 8);

  // victoria memorial
  const mx = -36, mz = -19;
  vcyl(mx, mz, 1, 1, 6.4, P.stoneLight);
  vcyl(mx, mz, 2, 2, 5.4, P.stoneLight);
  // pool ring
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * TAU;
    vox(Math.round(mx + Math.cos(a) * 5.9), 2.3, Math.round(mz + Math.sin(a) * 5.9), 0x2fb9cf, 'solid', 1.5, 0.28, 1.5);
  }
  // red flower ring
  for (let i = 0; i < 44; i++) {
    const a = i / 44 * TAU;
    for (let k = 0; k < 2; k++) {
      vox(Math.round(mx + Math.cos(a) * (7.6 + k * 0.8)), 1.0, Math.round(mz + Math.sin(a) * (7.6 + k * 0.8)), vary(0xd42b3c, 0.1), 'solid', 0.8, 0.6, 0.8);
    }
  }
  // pedestal + gilded victory
  fillBox(mx - 1.6, 2, mz - 1.6, 3.2, 4, 3.2, P.stoneLight);
  vox(mx, 6.5, mz, P.gold, 'metal', 0.9, 2.6, 0.9);
  vox(mx, 8.1, mz, P.gold, 'metal', 2.4, 0.45, 0.7);
  vox(mx, 7.7, mz, P.goldPale, 'metal', 0.5, 1.1, 0.5);
  ex(cx - 10, cz - 6, cx + 10, cz + 17);
  ex(mx - 9, mz - 9, mx + 9, mz + 9);
}

function buildGuards(x0, z, n) {
  const grp = new THREE.Group();
  const parts = [];
  for (let i = 0; i < n; i++) {
    const ox = i * 1.3;
    parts.push([ox, 0.55, 0, 0.62, 1.0, 0.42, 0x181c22]);     // legs
    parts.push([ox, 1.45, 0, 0.72, 1.0, 0.5, 0xc42030]);      // tunic
    parts.push([ox, 2.0, 0, 0.3, 0.28, 0.3, 0xf0c8a4]);       // face
    parts.push([ox, 2.28, 0, 0.52, 0.55, 0.52, 0x14161a]);    // bearskin
    parts.push([ox + 0.44, 1.5, 0, 0.14, 0.9, 0.14, 0x0e1014]); // rifle
  }
  const m = mergedMesh(parts);
  grp.add(m);
  grp.position.set(x0, 0.5, z);
  grp.rotation.y = 0;
  grp.scale.setScalar(0.72);
  scene.add(grp);
  GUARDS = grp;
  GUARD_BASE = x0;
}

/* =========================================================================
   TRAFALGAR SQUARE + NATIONAL GALLERY
   ========================================================================= */
function buildTrafalgar() {
  const cx = -7, cz = -26;
  // nelson's column
  fillBox(cx - 2, 1, cz - 2, 5, 1, 5, P.stoneLight);
  fillBox(cx - 1.6, 2, cz - 1.6, 4, 1, 4, P.stoneGrey);
  vox(cx, 5.4, cz, P.stoneLight, 'solid', 1.5, 5, 1.5);
  for (let y = 4; y <= 14; y += 0.4) vox(cx, y, cz, P.stoneLight, 'solid', 1.7, 0.35, 1.7);
  fillBox(cx - 1.3, 15, cz - 1.3, 2.6, 1, 2.6, P.stoneGrey);
  vox(cx, 17, cz, 0x2f3a3a, 'metal', 0.9, 2.2, 0.9);
  vox(cx, 18.2, cz, 0x2f3a3a, 'metal', 0.6, 0.7, 0.6);
  // four lions
  for (const [dx, dz] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) {
    fillBox(cx + dx - 1, 1, cz + dz - 1, 2, 1, 2, P.stoneGrey);
    vox(cx + dx, 2.4, cz + dz, 0x3c4438, 'solid', 1.9, 0.9, 1.0);
    vox(cx + dx, 3.1, cz + dz, 0x3c4438, 'solid', 0.9, 0.8, 0.9);
    vox(cx + dx, 2.9, cz + dz + 1.0, 0x3c4438, 'solid', 0.6, 0.5, 0.5);
  }
  // fountains
  for (const [fx, fz] of [[-13.5, -27], [-0.5, -27]]) {
    vcyl(fx, fz, 1, 1, 3.2, P.stoneLight);
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU;
      vox(Math.round(fx + Math.cos(a) * 2.6), 1.5, Math.round(fz + Math.sin(a) * 2.6), 0x39c2d6, 'solid', 0.9, 0.3, 0.9);
    }
    vox(fx, 1.7, fz, P.stoneLight, 'solid', 0.7, 1.4, 0.7);
    FOUNTAINS.push([fx, 1.9, fz]);
  }
  // national gallery
  const gz = -35;
  fillBox(cx - 10, 1, gz, 21, 1, 6, P.stoneGrey);
  fillBox(cx - 10, 2, gz, 21, 5, 5, P.cream, 'solid', 0.02);
  fillBox(cx - 10, 7, gz, 21, 1, 5, P.stoneGrey);
  for (let dx = -9; dx <= 9; dx += 2) {
    vox(cx + dx, 4, gz + 4.2, 0x1b3a49, 'glass', 1.0, 2.4, 0.2);
  }
  // portico
  for (let dx = -4; dx <= 4; dx += 1.4) vox(cx + dx, 3.6, gz + 5.4, P.cream, 'solid', 0.8, 5.4, 0.8);
  fillBox(cx - 4.6, 8.2, gz + 4.6, 9.2, 0.9, 2.2, P.stoneLight);
  fillBox(cx - 3, 9.1, gz + 5.0, 6, 0.7, 1.4, P.stoneLight);
  vcyl(cx, gz + 2, 9, 10, 3.2, P.stoneGrey);
  vsphere(cx, 11.2, gz + 2, 3.0, P.stoneCool, 'solid', 0.03, 0.7);
  vox(cx, 14.2, gz + 2, P.gold, 'metal', 0.25, 1.6, 0.25);
  ex(cx - 12, cz - 6, cx + 12, gz - 1);
}

/* =========================================================================
   WESTMINSTER BRIDGE
   ========================================================================= */
function buildWestminsterBridge() {
  const CX = 17;
  // deck
  fillBox(CX - 4, -0.4, -8, 9, 0.9, 20, P.stoneGrey);
  fillBox(CX - 3.6, 0.5, -8, 8.2, 0.12, 20, P.road);
  for (let z = -7; z <= 13; z += 5) vox(CX, 0.56, z, P.roadLine, 'solid', 0.22, 0.05, 2.0);
  // three shallow piers + a low stone causeway (the Thames here sits just below street level)
  for (const zc of [-2, 2, 6]) {
    for (const sx of [-1, 1]) {
      const x = CX + sx * 4.2;
      fillBox(x - 0.6, -0.6, zc - 1.2, 1.2, 1.2, 2.4, P.stone, 'solid', 0.04);
      vox(x, 0.15, zc, 0x1c3a44, 'glow', 0.55, 0.25, 1.6);
    }
  }
  // green balustrades
  for (const sx of [-4.2, 4.2]) {
    for (let z = -8; z <= 12; z++) {
      vox(CX + sx, 1.2, z, 0x2f6f52, 'metal', 0.4, 1.3, 0.28);
    }
    for (let z = -8; z <= 12; z += 1) vox(CX + sx, 1.9, z, 0x2f6f52, 'metal', 0.6, 0.14, 0.3);
  }
  // lamps
  for (let z = -6; z <= 10; z += 4) {
    lamp(CX - 4.2, 1.9, z, 2.8);
    lamp(CX + 4.2, 1.9, z, 2.8);
  }
  ex(CX - 5, -9, CX + 5, 13);
}

/* ---------- street lamp ---------- */
function lamp(x, y, z, h) {
  vox(x, y + h * 0.5, z, 0x1c2228, 'metal', 0.34, h, 0.34);
  vox(x, y + h, z, 0x1c2228, 'metal', 0.55, 0.2, 0.55);
  vox(x, y + h - 0.35, z, 0xffe3a8, 'glow', 0.5, 0.55, 0.5);
  vox(x, y + h + 0.15, z, 0x1c2228, 'metal', 0.3, 0.3, 0.3);
}

/* ---------- union jack texture ---------- */
function unionJackTexture() {
  const w = 512, h = 308;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#0a2a63'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f6f2e6'; g.lineWidth = h * 0.22;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
  g.strokeStyle = '#c8102e'; g.lineWidth = h * 0.09;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
  g.fillStyle = '#f6f2e6';
  g.fillRect(w * 0.5 - w * 0.105, 0, w * 0.21, h);
  g.fillRect(0, h * 0.5 - h * 0.17, w, h * 0.34);
  g.fillStyle = '#c8102e';
  g.fillRect(w * 0.5 - w * 0.062, 0, w * 0.124, h);
  g.fillRect(0, h * 0.5 - h * 0.1, w, h * 0.2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* ---------- build everything ---------- */
buildWestminster();
buildLondonEye();
buildTowerBridge();
buildShard();
buildGherkin();
buildStPauls();
buildTowerOfLondon();
buildBuckingham();
buildTrafalgar();
buildWestminsterBridge();


// ======================= 04_life.js =======================
/* =========================================================================
   LIFE — trees, parks, islets, people, traffic, boats, birds, balloons
   ========================================================================= */

/* ---------- tree scatter ---------- */
const TREES = [];
function canPlant(x, z) {
  if (!LAND.has(key2(x, z))) return false;
  const t = groundType(x, z);
  if (t !== 'grass' && t !== 'lawn') return false;
  if (Math.abs(x) > 54 || Math.abs(z) > 50) return false;
  for (let i = 0; i < EXCL.length; i++) {
    const e = EXCL[i];
    if (x >= e[0] - 1.5 && x <= e[2] + 1.5 && z >= e[1] - 1.5 && z <= e[3] + 1.5) return false;
  }
  if (!inside(x + 2, z) || !inside(x - 2, z) || !inside(x, z + 2) || !inside(x, z - 2)) return false;
  for (let i = 0; i < TREES.length; i++) {
    const d = (TREES[i][0] - x) ** 2 + (TREES[i][1] - z) ** 2;
    if (d < 18) return false;
  }
  return true;
}
function plantTree(x, z, forceType) {
  const kind = forceType || (rnd() < 0.16 ? 'blossom' : rnd() < 0.26 ? 'poplar' : 'plane');
  TREES.push([x, z, kind]);
  const th = kind === 'poplar' ? 5 : 3 + Math.floor(rnd() * 2);
  fillBox(x, 1, z, 1, th, 1, vary(P.trunk, 0.1));
  // a couple of branches
  vox(x + 0.5, th - 0.5, z, P.trunk2, 'solid', 1.6, 0.5, 0.6, 0, rr(0, 3), 0);
  if (kind === 'plane') {
    const cy = th + 2.0, R = 2.3 + rnd() * 0.8;
    vsphere(x, cy, z, R, vary(P.leaf1, 0.12), 'solid', 0, 0.82);
    vsphere(x + rr(-1.4, 1.4), cy + rr(0.4, 1.4), z + rr(-1.2, 1.2), R * 0.62, vary(P.leaf3, 0.1), 'solid', 0, 0.9);
    vsphere(x + rr(-1.2, 1.2), cy - rr(0.2, 0.9), z + rr(-1.2, 1.2), R * 0.55, vary(P.leaf4, 0.1), 'solid', 0, 0.9);
    if (rnd() < 0.4) vsphere(x + rr(-1, 1), cy + R * 0.6, z + rr(-1, 1), R * 0.45, P.leaf5, 'solid', 0.06, 0.7);
  } else if (kind === 'poplar') {
    const cy = 6.2, R = 1.5;
    for (let i = 0; i < 4; i++) {
      vsphere(x + rr(-0.3, 0.3), 3.4 + i * 1.5, z + rr(-0.3, 0.3), R * (1 - i * 0.11), vary(P.leaf2, 0.08), 'solid', 0, 1.05);
    }
    vox(x, 9.6, z, P.leaf3, 'solid', 0.6, 1.6, 0.6);
  } else {
    const cy = th + 1.8, R = 2.2 + rnd() * 0.5;
    vsphere(x, cy, z, R, vary(P.blossom, 0.08), 'solid', 0, 0.8);
    vsphere(x + rr(-1, 1), cy + 0.9, z + rr(-1, 1), R * 0.62, vary(P.blossom2, 0.06), 'solid', 0, 0.8);
    vsphere(x + rr(-0.8, 0.8), cy - 0.7, z + rr(-0.8, 0.8), R * 0.5, vary(P.blossom3, 0.06), 'solid', 0, 0.9);
  }
}
// golden-angle-ish scatter in the parks, plus hand-placed avenues
for (let i = 0; i < 2600; i++) {
  const x = rr(-54, 54), z = rr(-50, 50);
  if (canPlant(x, z)) plantTree(x, z);
  if (TREES.length >= 260) break;
}
// an avenue along the south bank
for (let x = -46; x <= 46; x += 7) {
  for (const z of [22, 33]) if (canPlant(x, z)) plantTree(x, z, 'plane');
}
// formal rows at Buckingham
for (let z = -33; z <= -25; z += 4) for (const x of [-46, -22]) if (canPlant(x, z)) plantTree(x, z, 'poplar');

/* ---------- hedges, flower beds, benches, phone boxes ---------- */
function hedge(x0, z0, x1, z1) {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
    for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
      if (!LAND.has(key2(x, z))) continue;
      vox(x, 1.1, z, vary(P.leaf2, 0.08), 'solid', 1, 1.4, 1);
      if (hash2(x, z) > 0.7) vox(x, 1.9, z, vary(P.leaf3, 0.1), 'solid', 0.8, 0.6, 0.8);
    }
}
hedge(-44, -22, -24, -22);
hedge(-44, -37, -24, -37);
hedge(-45, 24, -45, 36);

function flowerBed(x0, z0, w, d) {
  for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) {
    if (!LAND.has(key2(x, z))) continue;
    vox(x, 0.7, z, 0x5a3f2b, 'solid', 1, 0.35, 1);
    const h = hash2(x * 1.3, z * 2.1);
    const fc = P.flowers[Math.floor(h * P.flowers.length) % P.flowers.length];
    vox(x, 1.15, z, fc, 'solid', 0.75, 0.55, 0.75);
    if (h > 0.5) vox(x + rr(-0.2, 0.2), 1.5, z + rr(-0.2, 0.2), fc, 'solid', 0.4, 0.4, 0.4);
  }
  for (let x = x0 - 1; x <= x0 + w; x++) {
    vox(x, 0.75, z0 - 1, P.stoneLight, 'solid', 1, 0.5, 0.5);
    vox(x, 0.75, z0 + d, P.stoneLight, 'solid', 1, 0.5, 0.5);
  }
}
flowerBed(-8, -8.4, 6, 2);
flowerBed(2, -8.4, 6, 2);
flowerBed(24, 8.6, 8, 2);
flowerBed(-28, 8.6, 7, 2);
flowerBed(-15, -21.5, 6, 2);
flowerBed(-44, 30, 5, 4);
flowerBed(20, -22, 5, 2);

function phoneBox(x, z) {
  vox(x, 2.0, z, P.red, 'solid', 1.7, 2.6, 1.7);
  for (const [dx, dz] of [[0, 0.87], [0, -0.87]]) vox(x, 2.15, z + dz, 0xb9e2ef, 'glass', 1.2, 1.5, 0.08);
  for (const [dx, dz] of [[0.87, 0], [-0.87, 0]]) vox(x + dx, 2.15, z, 0xb9e2ef, 'glass', 0.08, 1.5, 1.2);
  vox(x, 3.15, z, P.cream, 'solid', 1.4, 0.35, 1.4);
  vox(x, 3.55, z, P.red, 'solid', 1.55, 0.4, 1.55);
  vox(x, 3.85, z, P.red, 'solid', 1.1, 0.3, 1.1);
  vox(x, 4.05, z, P.gold, 'metal', 0.5, 0.2, 0.5);
}
phoneBox(-3, -7.2);
phoneBox(6, -7.2);
phoneBox(-26, -13.6);
phoneBox(38, -8.6);
phoneBox(13, 9.4);
phoneBox(-41, 9.4);
phoneBox(44, 22.5);

function bench(x, z, ry) {
  const g = new THREE.Group();
  const parts = [
    [0, 0.55, 0, 1.9, 0.16, 0.55, 0x6b4a2e],
    [0, 1.05, -0.24, 1.9, 0.7, 0.14, 0x6b4a2e, -0.18],
    [-0.8, 0.3, 0, 0.14, 0.6, 0.5, 0x2a2a2a],
    [0.8, 0.3, 0, 0.14, 0.6, 0.5, 0x2a2a2a]
  ];
  const m = mergedMesh(parts);
  g.add(m); g.position.set(x, GY, z); g.rotation.y = ry || 0;
  scene.add(g);
}
bench(-18, -7.0, 0); bench(-12, -7.0, 0); bench(10, 9.0, Math.PI); bench(18, 9.0, Math.PI);
bench(-22, -33.5, 0); bench(6, -22.5, 0); bench(-24, 9.0, Math.PI); bench(30, 9.0, Math.PI);

/* ---------- lamps along the embankments & parks ---------- */
for (let x = -50; x <= 50; x += 11) {
  if (x > 10 && x < 24) continue;
  if (x > 40 && x < 52) continue;
  if (LAND.has(key2(x, -8))) lamp(x, GY, -8, 4.2);
  if (LAND.has(key2(x, 10))) lamp(x, GY, 10, 4.2);
}
for (let z = -32; z <= -22; z += 6) { lamp(-16, GY, z, 3.6); lamp(2, GY, z, 3.6); }
for (let x = -44; x <= -24; x += 6) lamp(x, GY, -24.5, 3.6);

/* =========================================================================
   ISLETS
   ========================================================================= */
const ISLETS = [];
function buildIslet(cfg) {
  const parts = [];
  const put = (x, y, z, hex, w, h, d) => parts.push([x, y, z, w || 1, h || 1, d || 1, hex]);
  const rx = cfg.rx, rz = cfg.rz, top = cfg.top;
  for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
    for (let z = -Math.ceil(rz); z <= Math.ceil(rz); z++) {
      const r = Math.hypot(x / rx, z / rz);
      const th = Math.atan2(z / rz, x / rx);
      const edge = 1 + 0.09 * Math.sin(3 * th + 1.3) + 0.06 * Math.sin(6 * th + 0.4);
      if (r > edge) continue;
      const under = Math.round(top - 5 - 7 * Math.pow(1 - Math.min(r, 1), 0.8) - hash2(x, z) * 1.6);
      put(x, top, z, vary(pick(P.grass), 0.05));
      put(x, top - 1, z, vary(P.dirt, 0.06));
      const band = Math.sin((top + x * 0.4) * 0.9);
      for (let y = top - 2; y >= under; y--) {
        put(x, y, z, vary(band > 0 ? P.rockTan : P.rockBrown, 0.06));
      }
      put(x, under - 1, z, vary(P.rockDeep, 0.07));
      if (r > 0.82 && hash2(x * 3, z * 5) > 0.8) put(x, top + 0.6, z, P.moss, 0.9, 0.4, 0.9);
    }
  }
  // hanging vines
  for (let i = 0; i < 18; i++) {
    const a = rnd() * TAU, rr2 = 0.86;
    const x = Math.round(Math.cos(a) * rx * rr2), z = Math.round(Math.sin(a) * rz * rr2);
    const len = 2 + Math.floor(rnd() * 4);
    for (let k = 0; k < len; k++) put(x, top - 1 - k * 0.6, z, vary(P.leaf2, 0.1), 0.4, 0.55, 0.4);
  }
  const prop = cfg.prop;
  if (prop === 'phone') {
    put(0, top + 2.0, 0, P.red, 1.7, 2.6, 1.7);
    put(0, top + 2.2, 0.88, 0xb9e2ef, 1.2, 1.4, 0.08);
    put(0, top + 3.15, 0, P.cream, 1.4, 0.35, 1.4);
    put(0, top + 3.6, 0, P.red, 1.5, 0.45, 1.5);
    put(-3, top + 1.8, -2, P.trunk, 0.6, 3.6, 0.6);
    put(-3, top + 4.4, -2, P.leaf1, 3.4, 2.6, 3.4);
  } else if (prop === 'lamp') {
    put(0, top + 2.2, 0, 0x1c2228, 0.3, 4.4, 0.3);
    put(0, top + 4.45, 0, 0xffe3a8, 0.55, 0.6, 0.55);
    put(0, top + 4.9, 0, 0x1c2228, 0.3, 0.35, 0.3);
    put(2.2, top + 0.7, 1.6, 0x6b4a2e, 1.9, 0.16, 0.55);
    put(2.2, top + 1.2, 1.36, 0x6b4a2e, 1.9, 0.7, 0.14);
    put(1.4, top + 0.3, 1.6, 0x2a2a2a, 0.14, 0.6, 0.5);
    put(3.0, top + 0.3, 1.6, 0x2a2a2a, 0.14, 0.6, 0.5);
  } else if (prop === 'cottage') {
    // stone plinth + walls
    put(0, top + 0.6, 0, P.stoneGrey, 5.6, 0.35, 4.6);
    put(0, top + 2.35, 0, P.cream, 5.0, 3.4, 4.0);
    // gable roof: stepped courses narrowing in z (ridge runs along x)
    for (let i = 0; i < 5; i++) {
      put(0, top + 4.0 + i * 0.5, 0, i % 2 ? 0xb8362c : P.red, 6.2, 0.55, 5.2 - i * 0.95);
    }
    put(0, top + 6.55, 0, 0x8e2b22, 6.0, 0.3, 0.55);
    put(1.75, top + 6.9, 0.9, 0x9c4a35, 0.75, 1.7, 0.75);
    // door, windows, shutters
    put(0, top + 1.85, 2.14, 0x4a2f1d, 1.4, 2.4, 0.34);
    put(-1.55, top + 2.55, 2.14, 0x2a5a70, 1.3, 1.3, 0.34);
    put(1.55, top + 2.55, 2.14, 0x2a5a70, 1.3, 1.3, 0.34);
    put(-1.55, top + 2.55, 2.24, P.cream, 0.16, 1.3, 0.1);
    put(1.55, top + 2.55, 2.24, P.cream, 0.16, 1.3, 0.1);
    // garden path
    for (let i = 0; i < 4; i++) put(0, top + 0.56, 2.6 + i * 1.1, P.path, 1.1, 0.12, 0.9);
    // flower dots
    for (let i = 0; i < 10; i++) {
      const a = rnd() * TAU;
      put(Math.cos(a) * 5.4, top + 0.6, Math.sin(a) * 4.4, pick(P.flowers), 0.6, 0.5, 0.6);
    }
    put(-4.0, top + 1.6, -2.7, P.trunk, 0.55, 3.0, 0.55);
    put(-4.0, top + 3.9, -2.7, P.blossom, 2.0, 1.8, 2.0);
    put(-3.0, top + 4.4, -2.3, P.blossom2, 1.3, 1.2, 1.3);
    put(-4.9, top + 4.2, -3.4, P.blossom3, 1.2, 1.1, 1.2);
  } else if (prop === 'pond') {
    for (let x = -3; x <= 3; x++) for (let z = -2; z <= 2; z++) {
      if (x * x * 0.7 + z * z * 1.2 > 9.5) continue;
      put(x, top + 0.55, z, 0x1fa6bd, 1, 0.2, 1);
    }
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU;
      put(Math.cos(a) * 4.1, top + 0.8, Math.sin(a) * 3.2, P.stoneLight, 0.9, 0.55, 0.9);
    }
    put(-3.5, top + 1.6, -2.5, P.trunk, 0.5, 2.8, 0.5);
    put(-3.5, top + 3.6, -2.5, P.leaf3, 2.4, 1.9, 2.4);
    put(3.4, top + 0.7, 2.2, P.leaf2, 2.0, 1.1, 2.0);
  } else if (prop === 'flowers') {
    for (let i = 0; i < 40; i++) {
      const a = rnd() * TAU, r = Math.sqrt(rnd()) * 5.4;
      put(Math.cos(a) * r, top + 0.75, Math.sin(a) * r * 0.7, pick(P.flowers), 0.7, 0.6, 0.7);
    }
    put(4.2, top + 1.8, -3.4, P.trunk, 0.6, 3.4, 0.6);
    put(4.2, top + 4.2, -3.4, P.leaf1, 3.0, 2.4, 3.0);
    for (let x = -6; x <= 6; x += 3) put(x, top + 0.65, 4.4, P.stoneLight, 1.2, 0.5, 0.8);
  } else if (prop === 'bandstand') {
    put(0, top + 0.6, 0, P.stoneLight, 8, 0.6, 8);
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) put(dx, top + 2.2, dz, P.cream, 0.35, 3.4, 0.35);
    for (let i = 2; i >= 0; i--) put(0, top + 4.2 + (2 - i) * 0.55, 0, i === 0 ? P.gold : P.bluePale, 5 + i * 1.6, 0.6, 5 + i * 1.6);
    put(0, top + 5.6, 0, P.gold, 0.5, 1.2, 0.5);
    put(0, top + 1.6, 0, P.wood || 0x8a6238, 2.4, 1.2, 2.4);
  }
  const mesh = mergedMesh(parts);
  const grp = new THREE.Group();
  grp.add(mesh);
  grp.position.set(cfg.x, cfg.y, cfg.z);
  grp.rotation.y = cfg.ry !== undefined ? cfg.ry : rnd() * TAU;
  scene.add(grp);
  const islet = { grp, baseY: cfg.y, ph: rnd() * TAU, amp: 0.35 + rnd() * 0.45, spin: rr(-0.02, 0.02) };
  ISLETS.push(islet);
  // its own little waterfall
  if (cfg.fall) {
    const geo = new THREE.PlaneGeometry(3.4, 14, 1, 20);
    geo.translate(0, -7, 0);
    const fm = new THREE.Mesh(geo, fallMat);
    fm.position.set(0, top - 0.6, rz * 0.82);
    fm.renderOrder = 4;
    grp.add(fm);
  }
}
buildIslet({ x: -72, y: 4, z: 7, rx: 9, rz: 7.5, top: 0, prop: 'phone' });
buildIslet({ x: 69, y: -3, z: -30, rx: 8, rz: 7, top: 0, prop: 'lamp' });
buildIslet({ x: 64, y: 7, z: 43, rx: 11, rz: 8.5, top: 0, prop: 'cottage', ry: 0.62 });
buildIslet({ x: -53, y: 10, z: -57, rx: 10, rz: 8, top: 0, prop: 'pond', fall: true });
buildIslet({ x: 12, y: 13, z: -72, rx: 8.5, rz: 7, top: 0, prop: 'flowers' });
buildIslet({ x: -21, y: -6, z: 70, rx: 9.5, rz: 8, top: 0, prop: 'bandstand' });

/* =========================================================================
   PEOPLE
   ========================================================================= */
function makeLoop(pts) {
  const segs = [];
  let len = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const l = Math.hypot(dx, dz);
    segs.push({ ax: a[0], az: a[1], dx, dz, l, start: len });
    len += l;
  }
  return {
    len, segs,
    at(d) {
      d = ((d % len) + len) % len;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (d <= s.start + s.l) {
          const f = (d - s.start) / s.l;
          return { x: s.ax + s.dx * f, z: s.az + s.dz * f, ux: s.dx / s.l, uz: s.dz / s.l };
        }
      }
      return { x: segs[0].ax, z: segs[0].az, ux: 1, uz: 0 };
    }
  };
}
function circleLoop(cx, cz, r, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
  }
  return makeLoop(pts);
}
const LOOPS = [
  makeLoop([[-46, -6.2], [46, -6.2], [46, -8.0], [-46, -8.0]]),
  makeLoop([[-46, 8.2], [46, 8.2], [46, 9.7], [-46, 9.7]]),
  circleLoop(-7, -26, 9.4, 22),
  circleLoop(-36, -19, 9.6, 26),
  circleLoop(-20, 18, 17.5, 30),
  makeLoop([[-44, 18], [-14, 18], [-6, 26], [-16, 38], [-40, 36], [-48, 28]]),
  makeLoop([[8, 18], [30, 20], [40, 30], [30, 40], [12, 36]]),
  makeLoop([[24, -36], [12, -40], [-2, -36], [-12, -30], [-4, -24]]),
  makeLoop([[-42, -30], [-42, -20], [-26, -20], [-26, -30]]),
  makeLoop([[13.5, -7], [21, -7], [21, 11], [13.5, 11]])
];
const NP = 30;
const PCOUNT = LOOPS.length * NP;
const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.0, envMapIntensity: 0.3 });
const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, PCOUNT);
const heads = new THREE.InstancedMesh(bodyGeo, bodyMat, PCOUNT);
bodies.castShadow = true; bodies.receiveShadow = true; bodies.frustumCulled = false;
heads.castShadow = true; heads.receiveShadow = true; heads.frustumCulled = false;
scene.add(bodies, heads);
const PEOPLE = [];
(function seedPeople() {
  const cc = new THREE.Color();
  let i = 0;
  for (let li = 0; li < LOOPS.length; li++) {
    for (let k = 0; k < NP; k++) {
      const d = (k / NP) * LOOPS[li].len + rr(-1.5, 1.5);
      const col = pick(P.clothes);
      const skin = pick(P.skin);
      bodies.setColorAt(i, cc.setHex(col));
      heads.setColorAt(i, cc.setHex(skin));
      PEOPLE.push({
        loop: LOOPS[li], d, sp: rr(0.45, 1.5) * (rnd() < 0.5 ? -1 : 1),
        off: rr(-0.9, 0.9), ph: rnd() * 6.28, sc: rr(0.78, 1.1), i
      });
      i++;
    }
  }
  bodies.instanceColor.needsUpdate = true;
  heads.instanceColor.needsUpdate = true;
})();

/* =========================================================================
   TRAFFIC
   ========================================================================= */
function busGeometry() {
  const parts = [
    [0, 1.75, 0, 2.15, 3.3, 6.4, P.red],
    [0, 1.35, 0.15, 2.18, 1.05, 5.5, 0xbfe2ef],
    [0, 2.75, 0.15, 2.18, 1.05, 5.5, 0xbfe2ef],
    [0, 3.52, 0, 2.2, 0.22, 6.45, P.white],
    [0, 2.45, 3.22, 1.95, 1.7, 0.1, 0x9fd4e6],
    [0, 0.7, 3.2, 1.5, 0.4, 0.1, 0xffe9b0],
    [0, 3.05, 3.24, 1.5, 0.5, 0.1, 0xf6f0dc],
    [-1.02, 0.45, 2.0, 0.36, 0.9, 0.9, 0x16181c],
    [1.02, 0.45, 2.0, 0.36, 0.9, 0.9, 0x16181c],
    [-1.02, 0.45, -2.0, 0.36, 0.9, 0.9, 0x16181c],
    [1.02, 0.45, -2.0, 0.36, 0.9, 0.9, 0x16181c]
  ];
  return mergedMesh(parts);
}
function cabGeometry() {
  const parts = [
    [0, 0.85, 0, 1.8, 1.35, 3.5, 0x14161a],
    [0, 1.75, -0.2, 1.7, 0.85, 1.9, 0x1b1e24],
    [0, 1.55, 0.75, 1.55, 0.7, 1.0, 0x9ec8d8],
    [0, 1.15, -0.2, 1.85, 0.55, 2.6, 0x2a2e34],
    [-0.9, 0.35, 1.1, 0.3, 0.7, 0.7, 0x0d0f12],
    [0.9, 0.35, 1.1, 0.3, 0.7, 0.7, 0x0d0f12],
    [-0.9, 0.35, -1.1, 0.3, 0.7, 0.7, 0x0d0f12],
    [0.9, 0.35, -1.1, 0.3, 0.7, 0.7, 0x0d0f12],
    [0, 2.2, -0.2, 0.55, 0.22, 0.3, 0xf0c14a]
  ];
  return mergedMesh(parts);
}
const busProto = busGeometry();
const cabProto = cabGeometry();
const VEHICLES = [];
function addVehicle(loop, kind, d, speed) {
  const src = kind === 'bus' ? busProto : cabProto;
  const m = new THREE.Mesh(src.geometry, src.material);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  VEHICLES.push({ mesh: m, loop, d, speed, kind });
}
const northLoop = makeLoop([[-44, -10.4], [44, -10.4], [49, -11.6], [44, -12.7], [-44, -12.7], [-49, -11.6]]);
const southLoop = makeLoop([[-44, 10.5], [44, 10.5], [49, 11.7], [44, 12.8], [-44, 12.8], [-49, 11.7]]);
const bridgeLoop = makeLoop([[15.4, -12.6], [15.4, 12.4], [18.6, 12.4], [18.6, -12.6]]);
for (let i = 0; i < 4; i++) addVehicle(northLoop, i % 2 ? 'cab' : 'bus', (i / 4) * northLoop.len + 12, 4.6);
for (let i = 0; i < 4; i++) addVehicle(northLoop, i % 2 ? 'bus' : 'cab', (i / 4) * northLoop.len + 90, 5.1);
for (let i = 0; i < 3; i++) addVehicle(southLoop, i % 2 ? 'cab' : 'bus', (i / 3) * southLoop.len + 20, 4.2);
for (let i = 0; i < 2; i++) addVehicle(southLoop, 'cab', (i / 2) * southLoop.len + 120, 4.9);
addVehicle(bridgeLoop, 'bus', 6, 3.4);
addVehicle(bridgeLoop, 'cab', 38, 3.9);

/* =========================================================================
   BOATS
   ========================================================================= */
function boatGeometry(big) {
  const s = big ? 1.25 : 1;
  const parts = [
    [0, 0.2 * s, 0, 2.4 * s, 0.9 * s, 6.2 * s, 0xf2eee2],
    [0, 0.75 * s, 0, 2.45 * s, 0.35 * s, 6.3 * s, 0x2a6fa8],
    [0, 1.35 * s, -0.3 * s, 2.0 * s, 1.0 * s, 3.4 * s, 0xf6f2e6],
    [0, 1.55 * s, -0.3 * s, 2.05 * s, 0.5 * s, 3.2 * s, 0x1d3a4a],
    [0, 1.9 * s, -1.6 * s, 0.8 * s, 0.8 * s, 0.7 * s, 0xd23b2b],
    [0, 0.95 * s, 2.6 * s, 1.2 * s, 0.35 * s, 0.8 * s, 0xa8895f],
    [0, 2.5 * s, -2.6 * s, 0.1, 0.9 * s, 0.1, 0x555],
    [0, 2.9 * s, -2.2 * s, 0.7 * s, 0.45 * s, 0.05, 0xd23b2b]
  ];
  return mergedMesh(parts);
}
const boatGeoA = boatGeometry(true), boatGeoB = boatGeometry(false);
const BOATS = [];
const riverLoop = makeLoop([[-40, -0.2], [40, -0.2], [45, 2.0], [40, 4.8], [-40, 4.8], [-45, 2.0]]);
(function() {
  for (let i = 0; i < 6; i++) {
    const src = i % 2 ? boatGeoB : boatGeoA;
    const m = new THREE.Mesh(src.geometry, src.material);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    BOATS.push({
      mesh: m, d: (i / 6) * riverLoop.len,
      sp: rr(1.6, 2.6) * (i % 2 ? 1 : -1), ph: rnd() * 6.28,
      yOff: i % 2 ? 0.15 : 0.212      // hull sits ~0.1 under the waterline
    });
  }
})();

/* =========================================================================
   SEAGULLS
   ========================================================================= */
const GULLS = [];
const gullBodyGeo = new THREE.BoxGeometry(0.22, 0.19, 0.8);
const gullWingGeo = new THREE.BoxGeometry(1.15, 0.05, 0.3);
const gullMat = new THREE.MeshStandardMaterial({ color: 0xf7f5ee, roughness: 0.8, metalness: 0.0 });
const gullBody = new THREE.InstancedMesh(gullBodyGeo, gullMat, 20);
const gullWings = new THREE.InstancedMesh(gullWingGeo, gullMat, 40);
gullBody.frustumCulled = false; gullWings.frustumCulled = false;
gullBody.castShadow = true; gullWings.castShadow = true;
scene.add(gullBody, gullWings);
for (let i = 0; i < 20; i++) {
  GULLS.push({
    cx: rr(-42, 42), cz: rr(-30, 34), r: rr(10, 34), y: rr(14, 34),
    a: rnd() * TAU, sp: rr(0.07, 0.17) * (rnd() < 0.5 ? 1 : -1), ph: rnd() * 6.28, s: rr(0.7, 1.2)
  });
}

/* =========================================================================
   BALLOONS
   ========================================================================= */
const BALLOONS = [];
function balloonGeometry(seed) {
  const parts = [];
  const R = 4.6;
  for (let y = -Math.round(R); y <= Math.round(R); y++) {
    const ry = y / R;
    const rad = R * Math.sqrt(Math.max(0, 1 - ry * ry * 0.86)) * 0.95;
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * TAU + y * 0.1;
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      const band = Math.floor((y + R + (seed || 0) * 2.6) / 1.7) % 6;
      const hex = band === 0 || band === 5 ? 0xc8102e : band === 1 || band === 4 ? 0xf6f2e6 : 0x0a2a63;
      parts.push([x, y, z, 1.15, 1.2, 1.15, hex, 0, -a, 0]);
    }
  }
  parts.push([0, -R - 1.3, 0, 1.5, 1.1, 1.5, 0x6b4a2e]);
  for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) {
    parts.push([dx, -R + 0.6, dz, 0.12, 3.2, 0.12, 0x3a3a3a]);
  }
  return mergedMesh(parts);
}
(function() {
  const specs = [
    { x: -50, z: -4, y: 38, r: 48, th: 0.6 },
    { x: 38, z: -33, y: 45, r: 55, th: 2.4 },
    { x: 8, z: 46, y: 34, r: 58, th: 4.0 }
  ];
  for (let i = 0; i < specs.length; i++) {
    const g = balloonGeometry(i);
    scene.add(g);
    BALLOONS.push({ mesh: g, ...specs[i], ph: rnd() * 6.28, amp: 2.5 + rnd() * 2 });
  }
})();

/* =========================================================================
   CLOUDS
   ========================================================================= */
const CLOUDS = [];
function cloudMesh() {
  const parts = [];
  const R = 6.5 + rnd() * 3;
  const H = 2.9 + rnd() * 2.1;
  const c = 1.2;
  for (let x = -R; x <= R; x += c) {
    for (let z = -R * 0.62; z <= R * 0.62; z += c) {
      const d = (x / R) * (x / R) + (z / (R * 0.62)) * (z / (R * 0.62));
      if (d > 1) continue;
      const top = H * Math.pow(1 - d, 0.55) * (0.72 + 0.28 * Math.sin(x * 0.45 + z * 0.3));
      if (top < 0.4) continue;
      for (let y = 0; y < top; y += c) {
        parts.push([x + rr(-0.12, 0.12), y + c * 0.5, z + rr(-0.12, 0.12), c, c, c, y + c * 0.5 < H * 0.42 ? 0xe6eef8 : 0xffffff]);
      }
    }
  }
  const m = mergedMesh(parts, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, transparent: true, opacity: 0.9, emissive: 0x3a4c60, emissiveIntensity: 0.32, envMapIntensity: 0.6 }), { noShadow: true });
  return m;
}
for (let i = 0; i < 7; i++) {
  const m = cloudMesh();
  const a = rnd() * TAU, r = rr(88, 128);
  m.position.set(Math.cos(a) * r, rr(30, 46), Math.sin(a) * r);
  m.rotation.y = rnd() * TAU;
  m.scale.setScalar(rr(0.8, 1.5));
  scene.add(m);
  CLOUDS.push({ mesh: m, a, r, y: m.position.y, sp: rr(0.01, 0.03) * (rnd() < 0.5 ? 1 : -1), ph: rnd() * 6.28 });
}

/* =========================================================================
   MIST + FOUNTAIN SPRAY
   ========================================================================= */
function softDotTexture(inner) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,' + inner + ')');
  gr.addColorStop(0.35, 'rgba(240,252,255,' + inner * 0.6 + ')');
  gr.addColorStop(1, 'rgba(220,245,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const dotTex = softDotTexture(0.95);
const MIST = [];
let MIST_POINTS = null;
(function buildMist() {
  const pts = [];
  const cols = [];
  for (const f of FALLS) {
    const n = f.big ? 120 : 50;
    for (let i = 0; i < n; i++) {
      const local = new THREE.Vector3(rr(-f.w * 0.55, f.w * 0.55), rr(-f.h * 0.95, -f.h * 0.35), rr(-1.2, 1.2));
      local.applyAxisAngle(new THREE.Vector3(0, 1, 0), f.ry);
      pts.push(f.x + local.x, f.y + local.y, f.z + local.z);
      const s = 0.9 + rnd() * 1.6;
      cols.push(s);
      MIST.push({ hx: local.x, hz: local.z, x: f.x + local.x, y: f.y + local.y, z: f.z + local.z, vy: rr(-1.4, -0.4), ph: rnd() * 6.28, life: rnd(), sp: rr(0.15, 0.5), size: s, fall: f });
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.PointsMaterial({ map: dotTex, size: 5.5, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, color: 0xeafcff });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 6;
  scene.add(points);
  MIST_POINTS = points;
})();

const FOUNTAIN_POINTS = (function buildFountainSpray() {
  const pts = [];
  for (const f of FOUNTAINS) {
    for (let i = 0; i < 70; i++) {
      const a = rnd() * TAU, sp = rr(0.5, 1.5);
      pts.push({ x: f[0], y: f[1], z: f[2], vx: Math.cos(a) * sp * 0.5, vz: Math.sin(a) * sp * 0.5, vy: rr(1.0, 2.6), t: rnd() });
    }
  }
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => { arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; });
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ map: dotTex, size: 1.6, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xdff8ff });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  scene.add(p);
  return { points: p, data: pts };
})();


// ======================= 05_animate.js =======================
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

