// ES module. Maps the 2D simulation (600x600, x/y) onto a top-down three.js plane.
import * as THREE from 'three';

const SCALE = 16;
const OBJ = 2;
const ARENA = 600;
const ARENA_HALF = 300 / SCALE;

function wx(x) { return (x - 300) / SCALE; }
function wz(y) { return (y - 300) / SCALE; }
function liftY(h) { return h; }

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setClearColor(0x050518);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x050518, 30, 62);

const camera = new THREE.OrthographicCamera(-ARENA_HALF, ARENA_HALF, ARENA_HALF, -ARENA_HALF, 0.1, 160);
camera.up.set(0, 0, -1);
camera.position.set(0, 48, 0);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0x6a7aaa, 0.55));
const key = new THREE.DirectionalLight(0xd8f6ff, 1.15);
key.position.set(8, 22, 10);
scene.add(key);
const rim = new THREE.DirectionalLight(0xff44aa, 0.35);
rim.position.set(-10, 8, -8);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(52, 52),
  new THREE.MeshStandardMaterial({ color: 0x070714, metalness: 0.2, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const grid = new THREE.GridHelper(40, 30, 0x123044, 0x0c1828);
grid.position.y = 0.02;
scene.add(grid);

const half = 300 / SCALE;
const edgeMat = new THREE.MeshBasicMaterial({ color: 0x123a55 });
function edgeBox(w, d, x, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), edgeMat);
  m.position.set(x, 0.04, z);
  scene.add(m);
}
edgeBox(half * 2 + 0.4, 0.12, 0, -half);
edgeBox(half * 2 + 0.4, 0.12, 0, half);
edgeBox(0.12, half * 2, -half, 0);
edgeBox(0.12, half * 2, half, 0);

const starGeo = new THREE.BufferGeometry();
const STAR_N = 160;
const starPos = new Float32Array(STAR_N * 3);
const starSeed = [];
for (let i = 0; i < STAR_N; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = Math.random() * 22;
  starSeed.push({ a: a, r: r, v: 4 + Math.random() * 10 });
  starPos[i * 3] = Math.cos(a) * r;
  starPos[i * 3 + 1] = 0.08;
  starPos[i * 3 + 2] = Math.sin(a) * r;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbcdcff, size: 0.12 }));
scene.add(stars);

const hyperLines = new THREE.LineSegments(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: 0xc8f4ff, transparent: true, opacity: 0.85 })
);
scene.add(hyperLines);

function makeShip() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a3a55, metalness: 0.45, roughness: 0.35 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x7af7ff, emissive: 0x145055, metalness: 0.6, roughness: 0.25 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), bodyMat);
  body.scale.set(1.3, 0.55, 1.1);
  g.add(body);
  function wing(sign) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.55), bodyMat);
    w.position.set(-0.15, 0, sign * 0.55);
    w.rotation.y = sign * 0.35;
    g.add(w);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.22), edgeMat);
    tip.position.set(-0.85, 0, sign * 0.95);
    g.add(tip);
  }
  wing(-1);
  wing(1);
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x7af7ff, emissive: 0x2288aa, roughness: 0.15 })
  );
  glass.position.set(0.25, 0.18, 0);
  g.add(glass);
  const engine = new THREE.PointLight(0xff8844, 1.4, 6);
  engine.position.set(-0.7, 0.1, 0);
  g.add(engine);
  const starRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.05, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.9 })
  );
  starRing.rotation.x = Math.PI / 2;
  starRing.position.y = 0.12;
  starRing.visible = false;
  g.add(starRing);
  g.userData.mats = { body: bodyMat, edge: edgeMat, glass: glass.material };
  g.userData.starRing = starRing;
  g.userData.glass = glass;
  return g;
}

const ship = makeShip();
scene.add(ship);

const enemyGeo = {
  body: new THREE.CapsuleGeometry(0.32, 0.35, 4, 8),
  box: new THREE.BoxGeometry(0.7, 0.28, 0.45),
  eye: new THREE.SphereGeometry(0.1, 8, 8),
  horn: new THREE.ConeGeometry(0.1, 0.38, 6),
  spike: new THREE.ConeGeometry(0.12, 0.55, 6)
};

function makeEnemyMesh(kind) {
  const g = new THREE.Group();
  let color = 0x39ff14;
  let emissive = 0x0a3310;
  if (kind === 'shooter') { color = 0x66aaff; emissive = 0x113355; }
  if (kind === 'whip') { color = 0xffcc33; emissive = 0x553300; }
  if (kind === 'boss') { color = 0xff3355; emissive = 0x440014; }
  const mat = new THREE.MeshStandardMaterial({ color: color, emissive: emissive, roughness: 0.42 });
  const body = new THREE.Mesh(kind === 'shooter' ? enemyGeo.box : enemyGeo.body, mat);
  if (kind !== 'shooter') body.rotation.z = Math.PI / 2;
  if (kind === 'whip') body.scale.set(1.2, 0.72, 0.7);
  g.add(body);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff4466, emissive: 0x661122 });
  const eye = new THREE.Mesh(enemyGeo.eye, eyeMat);
  eye.position.set(kind === 'boss' ? 0.42 : 0.28, 0.14, 0);
  eye.scale.setScalar(kind === 'boss' ? 1.6 : 1);
  g.add(eye);
  if (kind === 'shooter') {
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.12, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x9fd4ff, emissive: 0x224466 })
    );
    gun.position.set(0.48, 0.05, 0);
    g.add(gun);
  }
  if (kind === 'whip') {
    const spike = new THREE.Mesh(
      enemyGeo.spike,
      new THREE.MeshStandardMaterial({ color: 0xfff1a8, emissive: 0xaa7700 })
    );
    spike.rotation.z = -Math.PI / 2;
    spike.position.set(0.55, 0.05, 0);
    g.add(spike);
  }
  if (kind === 'boss') {
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xff88aa, emissive: 0x661133 });
    const h1 = new THREE.Mesh(enemyGeo.horn, hornMat);
    const h2 = new THREE.Mesh(enemyGeo.horn, hornMat);
    h1.position.set(0.15, 0.42, 0.22);
    h2.position.set(0.15, 0.42, -0.22);
    h1.rotation.z = -0.4;
    h2.rotation.z = -0.4;
    g.add(h1);
    g.add(h2);
  }
  const barBg = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.08, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x120814 })
  );
  barBg.position.set(0, 0.78, 0);
  const barFill = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.09, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xff3366 })
  );
  barFill.position.set(0, 0.78, 0);
  g.add(barBg);
  g.add(barFill);
  const tell = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.06, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0x7af7ff, transparent: true, opacity: 0.85 })
  );
  tell.rotation.x = Math.PI / 2;
  tell.position.y = 0.06;
  tell.visible = false;
  g.add(tell);
  const whipLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color: 0xffd166 })
  );
  whipLine.visible = false;
  g.add(whipLine);
  g.userData.kind = kind;
  g.userData.mat = mat;
  g.userData.barFill = barFill;
  g.userData.barBg = barBg;
  g.userData.tell = tell;
  g.userData.whipLine = whipLine;
  return g;
}

const shotGeo = new THREE.SphereGeometry(0.12, 8, 8);
const gemGeo = new THREE.OctahedronGeometry(0.22, 0);
const healGeo = new THREE.SphereGeometry(0.18, 10, 8);
const bombGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
const magGeo = new THREE.TorusGeometry(0.18, 0.06, 8, 16);
const orbGeo = new THREE.SphereGeometry(0.2, 10, 8);
const partGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
const flashGeo = new THREE.SphereGeometry(0.4, 10, 8);
const ringGeo = new THREE.TorusGeometry(0.4, 0.07, 8, 32);

const pools = {
  enemies: new Map(),
  shots: new Map(),
  eShots: new Map(),
  gems: new Map(),
  orbs: new Map(),
  parts: new Map(),
  flashes: new Map(),
  rings: new Map(),
  exhaust: new Map()
};

let roll = null;

function disposeMesh(mesh) {
  scene.remove(mesh);
  mesh.traverse(function(o) {
    if (o.geometry && o.geometry.dispose && !sharedGeo(o.geometry)) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(function(m) {
        if (m.map) m.map.dispose();
        if (m.dispose) m.dispose();
      });
    }
  });
}

function sharedGeo(g) {
  return g === enemyGeo.body || g === enemyGeo.box || g === enemyGeo.eye || g === enemyGeo.horn || g === enemyGeo.spike ||
    g === shotGeo || g === gemGeo || g === healGeo || g === bombGeo || g === magGeo || g === orbGeo ||
    g === partGeo || g === flashGeo || g === ringGeo;
}

function dropMap(map, live) {
  map.forEach(function(mesh, obj) {
    if (!live.has(obj)) {
      disposeMesh(mesh);
      map.delete(obj);
    }
  });
}

function place(mesh, x, y, h) {
  mesh.position.set(wx(x), h, wz(y));
}

function enemyScaleVisual(e) {
  const s = Math.max(0.75, (e.r || 13) / 14);
  return e.kind === 'boss' ? s * 1.15 : s;
}

function barColor(e) {
  const bars = Math.max(1, e.bars || 1);
  const per = e.max / bars;
  const leftLayers = Math.max(1, Math.ceil(e.hp / per - 1e-6));
  if (leftLayers > 1) return (bars >= 3 && leftLayers === 2) ? 0xc084fc : 0xffcc66;
  return 0xff3366;
}

function syncEnemies() {
  const live = new Set(window.enemies || []);
  dropMap(pools.enemies, live);
  (window.enemies || []).forEach(function(e) {
    let mesh = pools.enemies.get(e);
    if (!mesh) {
      mesh = makeEnemyMesh(e.kind || 'normal');
      scene.add(mesh);
      pools.enemies.set(e, mesh);
    }
    const s = enemyScaleVisual(e);
    mesh.scale.setScalar(s * OBJ);
    place(mesh, e.x, e.y, 0.4 * s * OBJ);
    const dx = (window.player ? window.player.x : e.x) - e.x;
    const dz = (window.player ? window.player.y : e.y) - e.y;
    mesh.rotation.y = -Math.atan2(dz, dx);
    mesh.userData.mat.emissiveIntensity = (e.flash || 0) > 0 ? 2.4 : 0.7;
    const bars = Math.max(1, e.bars || 1);
    const per = e.max / bars;
    const leftLayers = Math.max(1, Math.ceil(e.hp / per - 1e-6));
    const fill = Math.max(0.04, Math.min(1, (e.hp - (leftLayers - 1) * per) / per));
    mesh.userData.barFill.scale.x = fill;
    mesh.userData.barFill.position.x = -1.15 / 2 + (1.15 * fill) / 2;
    mesh.userData.barFill.material.color.setHex(barColor(e));
    mesh.userData.barBg.visible = bars > 0;
    const telling = (e.tell || 0) > 0;
    mesh.userData.tell.visible = telling;
    if (telling) {
      mesh.userData.tell.material.color.set(e.tellColor || '#7af7ff');
      const pulse = 1 + 0.18 * Math.sin((e.tell || 0) * 18);
      mesh.userData.tell.scale.set(pulse, pulse, pulse);
    }
    const whipping = (e.kind === 'whip' || e.kind === 'boss') && (e.whip || 0) > 0 && window.player;
    mesh.userData.whipLine.visible = !!whipping;
    if (whipping) {
      const reach = (e.kind === 'boss' ? 78 : 58) / SCALE / (s * OBJ);
      const arr = mesh.userData.whipLine.geometry.attributes.position;
      arr.setXYZ(0, 0.2, 0.25, 0);
      arr.setXYZ(1, reach * 0.55, 0.4, 0.55);
      arr.setXYZ(2, reach, 0.2, 0);
      arr.needsUpdate = true;
    }
  });
}

function shotMaterial(color) {
  return new THREE.MeshBasicMaterial({ color: color });
}

function syncShots() {
  const live = new Set(window.shots || []);
  dropMap(pools.shots, live);
  (window.shots || []).forEach(function(s) {
    let mesh = pools.shots.get(s);
    if (!mesh) {
      mesh = new THREE.Mesh(shotGeo, shotMaterial(s.c || 0x00ffff));
      scene.add(mesh);
      pools.shots.set(s, mesh);
    }
    const rad = Math.max(0.08, (s.r || 4) / SCALE);
    mesh.scale.setScalar(rad / 0.12 * OBJ);
    place(mesh, s.x, s.y, 0.42 * OBJ);
  });
}

function syncEnemyShots() {
  const live = new Set(window.enemyShots || []);
  dropMap(pools.eShots, live);
  (window.enemyShots || []).forEach(function(s) {
    let mesh = pools.eShots.get(s);
    if (!mesh) {
      mesh = new THREE.Mesh(shotGeo, shotMaterial(0xff4466));
      scene.add(mesh);
      pools.eShots.set(s, mesh);
    }
    const rad = Math.max(0.1, (s.r || 4) / SCALE);
    mesh.scale.setScalar(rad / 0.12 * OBJ);
    place(mesh, s.x, s.y, 0.38 * OBJ);
  });
}

function pickupMesh(g) {
  const kind = g.kind || 'gem';
  if (kind === 'heal') return new THREE.Mesh(healGeo, new THREE.MeshStandardMaterial({ color: 0x46ff9a, emissive: 0x14663a }));
  if (kind === 'bomb') return new THREE.Mesh(bombGeo, new THREE.MeshStandardMaterial({ color: 0xff8844, emissive: 0x662200 }));
  if (kind === 'magnet') {
    const m = new THREE.Mesh(magGeo, new THREE.MeshStandardMaterial({ color: 0x7af7ff, emissive: 0x114455 }));
    m.rotation.x = Math.PI / 2;
    return m;
  }
  if (kind === 'star') return new THREE.Mesh(gemGeo, new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0xaa7700 }));
  if (g.special || kind === 'fan') return new THREE.Mesh(gemGeo, new THREE.MeshStandardMaterial({ color: 0x7af7ff, emissive: 0x2288aa }));
  return new THREE.Mesh(gemGeo, new THREE.MeshStandardMaterial({ color: 0xff3df0, emissive: 0x661155 }));
}

function syncGems() {
  const live = new Set(window.gems || []);
  dropMap(pools.gems, live);
  const t = performance.now() / 1000;
  (window.gems || []).forEach(function(g) {
    let mesh = pools.gems.get(g);
    if (!mesh) {
      mesh = pickupMesh(g);
      scene.add(mesh);
      pools.gems.set(g, mesh);
    }
    const bob = 0.28 + Math.sin(t * 4 + g.x * 0.02) * 0.08;
    mesh.scale.setScalar(OBJ);
    place(mesh, g.x, g.y, bob * OBJ);
    mesh.rotation.y = t * 1.6;
  });
}

function syncOrbs() {
  const live = new Set(window.orbs || []);
  dropMap(pools.orbs, live);
  (window.orbs || []).forEach(function(o) {
    if (o.x == null) return;
    let mesh = pools.orbs.get(o);
    if (!mesh) {
      mesh = new THREE.Mesh(orbGeo, new THREE.MeshStandardMaterial({ color: 0xc084fc, emissive: 0x552288 }));
      scene.add(mesh);
      pools.orbs.set(o, mesh);
    }
    mesh.scale.setScalar(OBJ);
    place(mesh, o.x, o.y, 0.45 * OBJ);
  });
}

function colorOf(c) {
  if (!c) return 0xffffff;
  if (typeof c === 'number') return c;
  if (c.indexOf('255,136') >= 0 || c.indexOf('#ff8844') >= 0) return 0xff8844;
  if (c.indexOf('255,210') >= 0 || c.indexOf('#ffd') >= 0 || c.indexOf('#ffcc66') >= 0) return 0xffcc66;
  if (c.indexOf('80,255') >= 0) return 0x50ffa0;
  if (c.indexOf('255,70') >= 0 || c.indexOf('#ff') >= 0 && c.indexOf('3366') >= 0) return 0xff4666;
  if (c.indexOf('#7af7ff') >= 0) return 0x7af7ff;
  if (c.indexOf('#ff00ff') >= 0) return 0xff00ff;
  if (c.indexOf('#fff') >= 0) return 0xffffff;
  return 0xffffff;
}

function syncParticles() {
  const live = new Set(window.particles || []);
  dropMap(pools.parts, live);
  (window.particles || []).forEach(function(p) {
    let mesh = pools.parts.get(p);
    if (!mesh) {
      mesh = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ color: colorOf(p.c), transparent: true, opacity: 1 }));
      scene.add(mesh);
      pools.parts.set(p, mesh);
    }
    const s = Math.max(0.08, (p.s || 3) / SCALE);
    mesh.scale.setScalar(s / 0.12 * OBJ);
    place(mesh, p.x, p.y, 0.35 * OBJ);
    mesh.material.opacity = Math.max(0, Math.min(1, (p.life || 0) * 2));
    mesh.material.color.setHex(colorOf(p.c));
  });
}

function syncFlashes() {
  const live = new Set(window.flashes || []);
  dropMap(pools.flashes, live);
  (window.flashes || []).forEach(function(f) {
    let mesh = pools.flashes.get(f);
    if (!mesh) {
      mesh = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({ color: colorOf(f.color), transparent: true, opacity: 0.7 }));
      scene.add(mesh);
      pools.flashes.set(f, mesh);
    }
    const rad = Math.max(0.2, (f.r || 12) / SCALE);
    mesh.scale.setScalar(rad / 0.4 * OBJ);
    place(mesh, f.x, f.y, 0.4 * OBJ);
    mesh.material.opacity = Math.max(0, (f.life || 0) * 4);
    mesh.material.color.setHex(colorOf(f.color));
  });
}

function syncRings() {
  const live = new Set(window.boomRings || []);
  dropMap(pools.rings, live);
  (window.boomRings || []).forEach(function(b) {
    let mesh = pools.rings.get(b);
    if (!mesh) {
      mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.9 }));
      mesh.rotation.x = Math.PI / 2;
      scene.add(mesh);
      pools.rings.set(b, mesh);
    }
    const t = 1 - Math.max(0, b.life / (b.max || 0.42));
    const r2d = 16 + ((b.reach || 260) - 16) * t;
    const r3 = r2d / SCALE;
    const sc = Math.max(0.2, r3 / 0.4);
    mesh.scale.set(sc, sc, sc);
    mesh.position.set(wx(b.x), 0.18, wz(b.y));
    mesh.material.opacity = Math.max(0, 0.95 * (1 - t));
  });
}

function syncExhaust() {
  const live = new Set(window.exhaust || []);
  dropMap(pools.exhaust, live);
  (window.exhaust || []).forEach(function(p) {
    let mesh = pools.exhaust.get(p);
    if (!mesh) {
      mesh = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9 }));
      scene.add(mesh);
      pools.exhaust.set(p, mesh);
    }
    const k = Math.max(0, p.life / (p.max || 0.3));
    mesh.scale.set((0.5 + k) * OBJ, (0.5 + k) * OBJ, (1.2 + k * 2) * OBJ);
    place(mesh, p.x, p.y, 0.28 * OBJ);
    mesh.material.opacity = k;
    mesh.material.color.setHex(k > 0.55 ? 0xfff4c4 : (k > 0.28 ? 0xffb347 : 0xff5a1f));
  });
}

function applySkin() {
  const neon = !!(window.save && window.save.skin === 'piel');
  const mats = ship.userData.mats;
  mats.body.color.setHex(neon ? 0x2a1030 : 0x1a3a55);
  mats.edge.color.setHex(neon ? 0x39ff14 : 0x7af7ff);
  mats.edge.emissive.setHex(neon ? 0x145510 : 0x145055);
  mats.glass.color.setHex(neon ? 0xff4fd8 : 0x7af7ff);
  mats.glass.emissive.setHex(neon ? 0xaa2288 : 0x2288aa);
}

function placeShipIdle() {
  ship.visible = true;
  ship.scale.set(OBJ, OBJ, OBJ);
  ship.rotation.set(0, Math.sin(performance.now() / 900) * 0.2, 0);
  ship.position.set(0, 0.35 * OBJ, 0);
  ship.userData.starRing.visible = false;
  lockCamera();
}

function placeShipPlay() {
  if (!window.player) {
    placeShipIdle();
    return;
  }
  applySkin();
  const starOn = window.player.star > 0;
  ship.userData.starRing.visible = starOn;
  if (starOn) {
    const pulse = 1 + Math.sin((window.aliveTime || 0) * 14) * 0.08;
    ship.userData.starRing.scale.set(pulse, pulse, pulse);
  }
  const blink = window.player.ifr > 0 && !starOn && Math.floor(window.player.ifr * 16) % 2 === 0;
  ship.visible = !blink;
  if ((window.player.hitFlash || 0) > 0) ship.userData.glass.material.color.setHex(0xff4466);
  else if ((window.player.healFlash || 0) > 0) ship.userData.glass.material.color.setHex(0x50ffa0);
  else applySkin();
  ship.scale.set(OBJ, OBJ, OBJ);
  ship.rotation.z = 0;
  ship.rotation.x = 0;
  ship.rotation.y = -(window.player.ang || 0);
  ship.position.set(wx(window.player.x), 0.35 * OBJ, wz(window.player.y));
  lockCamera();
}

const SHIP_LEN = 2.1;

function tickRoll(dt) {
  roll.t += dt;
  const u = Math.min(1, roll.t / roll.dur);
  const start = new THREE.Vector3(wx(roll.x), 0.35 * OBJ, wz(roll.y));
  const toward = new THREE.Vector3(0, 1, 0);
  const perp = new THREE.Vector3(0, 0, 1);
  const radius = SHIP_LEN * OBJ * 5;
  const center = start.clone().addScaledVector(toward, radius);
  const theta = u * Math.PI * 2;
  const pos = center.clone()
    .addScaledVector(toward, -Math.cos(theta) * radius)
    .addScaledVector(perp, Math.sin(theta) * radius);
  const tangent = toward.clone().multiplyScalar(Math.sin(theta))
    .addScaledVector(perp, Math.cos(theta))
    .normalize();
  ship.visible = true;
  ship.position.copy(pos);
  ship.scale.set(OBJ, OBJ, OBJ);
  const nose = pos.clone().add(tangent);
  ship.lookAt(nose);
  ship.rotateZ(theta);
  lockCamera();
  if (!roll.dropped && u >= 0.5) {
    roll.dropped = true;
    if (typeof window.boom === 'function') window.boom(roll.x, roll.y);
  }
  if (u >= 1) {
    roll = null;
    ship.scale.set(OBJ, OBJ, OBJ);
    ship.rotation.set(0, 0, 0);
    if (window.player) {
      ship.position.set(wx(window.player.x), 0.35 * OBJ, wz(window.player.y));
      ship.rotation.y = -(window.player.ang || 0);
    }
  }
}

function tickStars3d(dt) {
  const hyp = window.hyper || 0;
  const pos = starGeo.attributes.position;
  const cx = window.player ? wx(window.player.x) : 0;
  const cz = window.player ? wz(window.player.y) : 0;
  const segs = [];
  for (let i = 0; i < STAR_N; i++) {
    const s = starSeed[i];
    if (hyp > 0) {
      s.r += (6 + s.v) * (1.2 + hyp * 2.2) * dt;
      if (s.r > 28) {
        s.a = Math.random() * Math.PI * 2;
        s.r = 0.4 + Math.random() * 1.6;
      }
      const x = cx + Math.cos(s.a) * s.r;
      const z = cz + Math.sin(s.a) * s.r;
      pos.setXYZ(i, x, 0.2 + hyp * 0.4, z);
      const streak = (0.6 + hyp * 2.2);
      segs.push(x, 0.2, z, x - Math.cos(s.a) * streak, 0.2, z - Math.sin(s.a) * streak);
    } else {
      s.a += dt * 0.015;
      s.r = 4 + ((s.r + s.v * dt * 0.15) % 20);
      pos.setXYZ(i, Math.cos(s.a) * s.r * 0.9, 0.08, Math.sin(s.a) * s.r * 0.9);
    }
  }
  pos.needsUpdate = true;
  if (hyp > 0 && segs.length) {
    hyperLines.geometry.dispose();
    hyperLines.geometry = new THREE.BufferGeometry();
    hyperLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
    hyperLines.visible = true;
  } else {
    hyperLines.visible = false;
  }
}

function lockCamera() {
  camera.position.set(0, 48, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
}

function followCameraIfHyper() {
  lockCamera();
}

function resize() {
  const parent = canvas.parentElement;
  if (!parent) return;
  const r = parent.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.left = -ARENA_HALF;
  camera.right = ARENA_HALF;
  camera.top = ARENA_HALF;
  camera.bottom = -ARENA_HALF;
  camera.updateProjectionMatrix();
  lockCamera();
}
window.addEventListener('resize', resize);
resize();

window.requestBombRoll = function() {
  if (roll || !window.player || window.asScreen !== 'play') return false;
  roll = { t: 0, dur: 1.7, dropped: false, x: window.player.x, y: window.player.y, yaw: window.player.ang || 0 };
  return true;
};

window.bombRollActive = function() { return !!roll; };

window.resetBombRoll = function() {
  roll = null;
  ship.scale.set(OBJ, OBJ, OBJ);
  ship.rotation.set(0, 0, 0);
};

function clearPools() {
  [pools.enemies, pools.shots, pools.eShots, pools.gems, pools.orbs, pools.parts, pools.flashes, pools.rings, pools.exhaust].forEach(function(map) {
    dropMap(map, new Set());
  });
}

window.renderFrame = function() {
  const dt = window.gameDt || 0.016;
  const scr = window.asScreen || 'menu';
  if (roll) tickRoll(dt);
  if (scr !== 'play' && scr !== 'stage' && scr !== 'level' && scr !== 'over') {
    if (!window.player) clearPools();
  }
  syncEnemies();
  syncShots();
  syncEnemyShots();
  syncGems();
  syncOrbs();
  syncParticles();
  syncFlashes();
  syncRings();
  syncExhaust();
  tickStars3d(dt);
  if (roll) {
    // camera and ship already posed by the roll
  } else if (window.player && (scr === 'play' || scr === 'level' || scr === 'over' || scr === 'stage')) placeShipPlay();
  else placeShipIdle();
  if ((window.hyper || 0) > 0 && !roll) followCameraIfHyper();
  renderer.render(scene, camera);
};

// first frame before the classic loop, in case the module is the one that paints menus
resize();
if (window.renderFrame) window.renderFrame();
