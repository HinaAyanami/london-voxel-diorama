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
