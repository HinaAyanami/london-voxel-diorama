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
