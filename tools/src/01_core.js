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
