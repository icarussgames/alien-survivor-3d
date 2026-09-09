import * as THREE from 'three';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setClearColor(0x050518);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x050518, 28, 55);

const view = 16;
const camera = new THREE.OrthographicCamera(-view, view, view, -view, 0.1, 120);
camera.position.set(0, 26, 14);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0x6a7aaa, 0.55));
const key = new THREE.DirectionalLight(0xd8f6ff, 1.15);
key.position.set(8, 22, 10);
scene.add(key);
const rim = new THREE.DirectionalLight(0xff44aa, 0.35);
rim.position.set(-10, 8, -8);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color:0x070714, metalness:0.2, roughness:0.9 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const grid = new THREE.GridHelper(80, 40, 0x123044, 0x0c1828);
grid.position.y = 0.02;
scene.add(grid);

function starField() {
  const geo = new THREE.BufferGeometry();
  const n = 180;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 70;
    pos[i * 3 + 1] = 0.05;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 70;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color:0xbcdcff, size:0.12 }));
  scene.add(pts);
}
starField();

function makeShip() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color:0x1a3a55, metalness:0.45, roughness:0.35 });
  const edgeMat = new THREE.MeshStandardMaterial({ color:0x7af7ff, emissive:0x145055, metalness:0.6, roughness:0.25 });
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
    new THREE.MeshStandardMaterial({ color:0x7af7ff, emissive:0x2288aa, roughness:0.15 })
  );
  glass.position.set(0.25, 0.18, 0);
  g.add(glass);
  const engine = new THREE.PointLight(0xff8844, 1.4, 6);
  engine.position.set(-0.7, 0.1, 0);
  g.add(engine);
  return g;
}

function makeEnemy(kind) {
  const g = new THREE.Group();
  const color = kind === 'shooter' ? 0x66aaff : 0x39ff14;
  const mat = new THREE.MeshStandardMaterial({ color, emissive:kind === 'shooter' ? 0x113355 : 0x0a3310, roughness:0.4 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.35, 4, 8), mat);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshStandardMaterial({ color:0xff4466, emissive:0x661122 })
  );
  eye.position.set(0.28, 0.12, 0);
  g.add(eye);
  g.userData.kind = kind;
  return g;
}

const ship = makeShip();
scene.add(ship);

const keys = {};
const stick = { on:false, x:0, y:0 };
const enemies = [];
const shots = [];
const trails = [];
let playing = false;
let hp = 100;
let shootT = 0;
let spawnT = 0;
let px = 0, pz = 0, ang = 0;
let last = 0;

function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  const a = r.width / Math.max(1, r.height);
  camera.left = -view * a;
  camera.right = view * a;
  camera.top = view;
  camera.bottom = -view;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function setScreen(name) {
  document.getElementById('menu').classList.toggle('hidden', name !== 'menu');
  document.getElementById('over').classList.toggle('hidden', name !== 'over');
  document.getElementById('hud').classList.toggle('hidden', name !== 'play');
  document.getElementById('pad').classList.toggle('hidden', name !== 'play');
}

function resetRun() {
  enemies.forEach(function(e){ scene.remove(e); });
  shots.forEach(function(s){ scene.remove(s.mesh); });
  trails.forEach(function(t){ scene.remove(t.mesh); });
  enemies.length = 0;
  shots.length = 0;
  trails.length = 0;
  px = 0; pz = 0; ang = 0;
  hp = 100;
  shootT = 0.2;
  spawnT = 0.4;
  ship.position.set(0, 0.35, 0);
  document.getElementById('hp').textContent = hp;
  playing = true;
  setScreen('play');
}

function moveVector() {
  let x = 0, z = 0;
  if (keys.ArrowLeft || keys.KeyA) x -= 1;
  if (keys.ArrowRight || keys.KeyD) x += 1;
  if (keys.ArrowUp || keys.KeyW) z -= 1;
  if (keys.ArrowDown || keys.KeyS) z += 1;
  if (x || z) return { x:x, z:z };
  if (stick.on) return { x:stick.x, z:stick.y };
  return { x:0, z:0 };
}

function spawnEnemy() {
  const a = Math.random() * Math.PI * 2;
  const r = 14 + Math.random() * 3;
  const kind = Math.random() < 0.35 ? 'shooter' : 'chaser';
  const e = makeEnemy(kind);
  e.position.set(px + Math.cos(a) * r, 0.4, pz + Math.sin(a) * r);
  e.userData.hp = kind === 'shooter' ? 3 : 2;
  scene.add(e);
  enemies.push(e);
}

function fireAt(tx, tz) {
  const dx = tx - px, dz = tz - pz;
  const d = Math.hypot(dx, dz) || 1;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshStandardMaterial({ color:0x00ffff, emissive:0x00ffff })
  );
  mesh.position.set(px, 0.45, pz);
  scene.add(mesh);
  shots.push({ mesh, vx:dx / d * 14, vz:dz / d * 14, life:1.1 });
}

function addTrail() {
  const back = ang + Math.PI;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.55),
    new THREE.MeshBasicMaterial({ color:0xffb347, transparent:true, opacity:0.9 })
  );
  mesh.position.set(px + Math.cos(back) * 0.8, 0.28, pz + Math.sin(back) * 0.8);
  mesh.rotation.y = -ang;
  scene.add(mesh);
  trails.push({ mesh, life:0.28 });
}

function nearest() {
  let best = null, bd = 1e9;
  enemies.forEach(function(e){
    const d = (e.position.x - px) ** 2 + (e.position.z - pz) ** 2;
    if (d < bd) { bd = d; best = e; }
  });
  return best;
}

function hurt(n) {
  hp -= n;
  document.getElementById('hp').textContent = Math.max(0, hp);
  if (hp <= 0) {
    playing = false;
    setScreen('over');
  }
}

function tick(dt) {
  const mv = moveVector();
  const len = Math.hypot(mv.x, mv.z);
  if (len > 0.08) {
    px += (mv.x / len) * 7.2 * dt;
    pz += (mv.z / len) * 7.2 * dt;
    ang = Math.atan2(mv.z, mv.x);
  }
  px = Math.max(-22, Math.min(22, px));
  pz = Math.max(-22, Math.min(22, pz));
  ship.position.set(px, 0.35, pz);
  ship.rotation.y = -ang;

  if (len > 0.08 && Math.random() < dt * 28) addTrail();

  camera.position.set(px, 26, pz + 14);
  camera.lookAt(px, 0, pz);

  spawnT -= dt;
  if (spawnT <= 0 && enemies.length < 10) {
    spawnEnemy();
    spawnT = 0.85;
  }

  shootT -= dt;
  const target = nearest();
  if (target && shootT <= 0) {
    fireAt(target.position.x, target.position.z);
    shootT = 0.32;
  }

  enemies.forEach(function(e){
    const dx = px - e.position.x, dz = pz - e.position.z;
    const d = Math.hypot(dx, dz) || 1;
    const spd = e.userData.kind === 'shooter' ? 1.6 : 2.4;
    e.position.x += dx / d * spd * dt;
    e.position.z += dz / d * spd * dt;
    e.rotation.y = -Math.atan2(dz, dx);
    if (d < 0.85) hurt(12 * dt);
  });

  shots.forEach(function(s){
    s.mesh.position.x += s.vx * dt;
    s.mesh.position.z += s.vz * dt;
    s.life -= dt;
    enemies.slice().forEach(function(e){
      if (s.life <= 0) return;
      if (Math.hypot(e.position.x - s.mesh.position.x, e.position.z - s.mesh.position.z) < 0.55) {
        s.life = 0;
        e.userData.hp -= 1;
        if (e.userData.hp <= 0) {
          scene.remove(e);
          enemies.splice(enemies.indexOf(e), 1);
        }
      }
    });
  });
  for (let i = shots.length - 1; i >= 0; i--) {
    if (shots[i].life <= 0) {
      scene.remove(shots[i].mesh);
      shots.splice(i, 1);
    }
  }
  for (let i = trails.length - 1; i >= 0; i--) {
    trails[i].life -= dt;
    trails[i].mesh.material.opacity = Math.max(0, trails[i].life * 3);
    if (trails[i].life <= 0) {
      scene.remove(trails[i].mesh);
      trails.splice(i, 1);
    }
  }
}

function loop(ts) {
  requestAnimationFrame(loop);
  const now = ts / 1000;
  const dt = Math.min(0.033, last ? now - last : 0.016);
  last = now;
  if (playing) tick(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);

document.getElementById('startBtn').onclick = resetRun;
document.getElementById('retryBtn').onclick = resetRun;

window.addEventListener('keydown', function(ev){ keys[ev.code] = true; });
window.addEventListener('keyup', function(ev){ keys[ev.code] = false; });

const stickEl = document.getElementById('stick');
const knob = document.getElementById('knob');
function setKnob(cx, cy) {
  const r = stickEl.getBoundingClientRect();
  let dx = cx - (r.left + r.width / 2);
  let dy = cy - (r.top + r.height / 2);
  const max = r.width * 0.34;
  const len = Math.hypot(dx, dy) || 1;
  const cl = Math.min(max, len);
  dx = dx / len * cl;
  dy = dy / len * cl;
  knob.style.left = (r.width / 2 + dx - 21) + 'px';
  knob.style.top = (r.height / 2 + dy - 21) + 'px';
  stick.on = len > 8;
  stick.x = dx / max;
  stick.y = dy / max;
}
function resetKnob() {
  stick.on = false; stick.x = 0; stick.y = 0;
  knob.style.left = '33px';
  knob.style.top = '33px';
}
stickEl.addEventListener('pointerdown', function(ev){
  ev.preventDefault();
  stickEl.setPointerCapture(ev.pointerId);
  setKnob(ev.clientX, ev.clientY);
});
stickEl.addEventListener('pointermove', function(ev){
  if (!stickEl.hasPointerCapture(ev.pointerId)) return;
  setKnob(ev.clientX, ev.clientY);
});
stickEl.addEventListener('pointerup', resetKnob);
stickEl.addEventListener('pointercancel', resetKnob);

setScreen('menu');
