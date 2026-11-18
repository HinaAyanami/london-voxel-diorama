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
