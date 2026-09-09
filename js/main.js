// ==================== LOOP, COMBATE Y PANTALLAS ====================
// Simulation stays in 2D units (600x600). js/view.js (ES module) draws it in three.js.

function setScreen(name) {
  screen = name;
  window.asScreen = name;
  ['menu','over','level','stage','shop','gal','lib','inspect','hud','bar','pad'].forEach(function(n){
    const el = document.getElementById(n);
    if (!el) return;
    const show = n === name || (name === 'play' && (n === 'hud' || n === 'bar' || n === 'pad'));
    el.classList.toggle('hidden', !show);
  });
}

function fmt(sec) {
  sec = Math.max(0, Math.floor(sec));
  return Math.floor(sec / 60) + ':' + (sec % 60 < 10 ? '0' : '') + (sec % 60);
}

function banner(text) {
  const el = document.getElementById('banner');
  el.textContent = text;
  el.classList.remove('hidden');
  bannerT = 2.2;
}

function hud() {
  document.getElementById('time').textContent = fmt(aliveTime);
  document.getElementById('hp').textContent = Math.max(0, Math.ceil(player ? player.hp : 0));
  document.getElementById('runGems').textContent = runGems;
  document.getElementById('lifeGems').textContent = save.gems;
  const stats = document.getElementById('stats');
  if (stats) stats.textContent = 'SPD ' + RUN.spd + '  DEF ' + RUN.def + '  ATK ' + RUN.atk + '  MAG ' + RUN.mag;
  document.getElementById('xp').style.width = Math.min(100, (xp / xpNeed) * 100) + '%';
  refreshItems();
  if (bannerT > 0) bannerT -= 0.016;
  else document.getElementById('banner').classList.add('hidden');
}

function flashAt(x, y, r, color) {
  flashes.push({ x:x, y:y, r:r, life:0.16, color:color });
}

function hurt(n) {
  if (!player || player.ifr > 0 || player.star > 0) return;
  if (window.bombRollActive && window.bombRollActive()) return;
  player.hp -= takenDmg(n);
  player.ifr = 0.6;
  player.hitFlash = 0.2;
  flashAt(player.x, player.y, 26, 'rgba(255,70,90,.95)');
  beep(140, 0.12, 'sawtooth', 0.06);
  if (player.hp <= 0) endRun();
}

function endRun() {
  if (window.resetBombRoll) window.resetBombRoll();
  setScreen('over');
  document.getElementById('fTime').textContent = fmt(aliveTime);
  document.getElementById('fRun').textContent = runGems;
  document.getElementById('fLife').textContent = save.gems;
  beep(90, 0.3, 'triangle', 0.07);
}

function shootAt(target) {
  const a = Math.atan2(target.y - player.y, target.x - player.x);
  const n = 1 + Math.min(2, spreadNow()) * 2;
  const step = 0.22;
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    const aa = a + (i - mid) * step;
    shots.push({ x:player.x, y:player.y, vx:Math.cos(aa)*280, vy:Math.sin(aa)*280, r:4, dmg:dmgNow(), life:1.2, c:'#00ffff' });
  }
  unlock('shot');
  beep(480, 0.04, 'square', 0.03);
}

function nearest() {
  let best = null, bd = 1e9;
  enemies.forEach(function(e){
    const d = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
    if (d < bd) { bd = d; best = e; }
  });
  return best;
}

var levelPick = 0;

function paintLevelPick() {
  const nodes = document.querySelectorAll('#picks .pick');
  nodes.forEach(function(n, i){ n.classList.toggle('on', i === levelPick); });
  if (nodes[levelPick]) nodes[levelPick].scrollIntoView({ block:'nearest' });
}

function moveLevelPick(dir) {
  const n = document.querySelectorAll('#picks .pick').length;
  if (!n) return;
  levelPick = (levelPick + dir + n) % n;
  paintLevelPick();
}

function confirmLevelPick() {
  const nodes = document.querySelectorAll('#picks .pick');
  const el = nodes[levelPick];
  if (el) el.click();
}

function offerLevel() {
  const picks = [
    { id:'spd', name:'+Speed', desc:'Más rápido al moverte y al disparar. ' + nextStatLine('spd') },
    { id:'def', name:'+Def', desc:'Menos daño recibido. ' + nextStatLine('def') },
    { id:'atk', name:'+Atk', desc:'Más daño a enemigos. ' + nextStatLine('atk') },
    { id:'mag', name:'+Mag', desc:'Más radio para juntar gemas. ' + nextStatLine('mag') }
  ];
  const box = document.getElementById('picks');
  box.innerHTML = '';
  picks.forEach(function(p){
    const b = document.createElement('button');
    b.className = 'pick';
    b.innerHTML = '<b>'+p.name+' '+RUN[p.id]+'</b><br><span style="color:#9499c7">'+p.desc+'</span>';
    b.onclick = function(){ applyPick(p.id); };
    box.appendChild(b);
  });
  levelPick = 0;
  paintLevelPick();
  setScreen('level');
  beep(540, 0.1, 'square', 0.05);
}

function applyPick(id) {
  bumpStat(id);
  setScreen('play');
}

function startRun() {
  initAudio();
  if (window.resetBombRoll) window.resetBombRoll();
  player = {
    x:300, y:300, r:14, hp:maxHp(), maxHp:maxHp(),
    ang:0, ifr:0, shoot:0.25, cone:0.5,
    mods:{ dmg:0, rate:0, mag:0, spread:0 },
    heal: owned('cura0')|0, bombs: owned('bomba0')|0, hitFlash:0, healFlash:0, star:0
  };
  flashes = [];
  gems = []; shots = []; particles = []; exhaust = []; orbs = [];
  hyper = 0; stageClear = 0;
  if (owned('orbe')) orbs = [{ a:0 }, { a:Math.PI }];
  resetEnemies();
  resetRunStats();
  resetWaves();
  aliveTime = 0; spawnT = 0.5; lastTs = 0;
  runGems = 0; xp = 0; lvl = 1; xpNeed = 10;
  bannerT = 0;
  setScreen('play');
  refreshItems();
  hud();
  if (!raf) raf = requestAnimationFrame(loop);
}

function exitStageToMenu() {
  hyper = 0;
  stageClear = 0;
  if (window.resetBombRoll) window.resetBombRoll();
  setScreen('menu');
}

function beginStageClear(x, y) {
  enemies = [];
  enemyShots = [];
  shots = [];
  gems = [];
  boomRings.push({ x:x, y:y, reach:520, life:0.7, max:0.7 });
  for (let i = 0; i < 28; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 80 + Math.random() * 260;
    particles.push({ x:x, y:y, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd, life:0.7, c: i % 2 ? '#7af7ff' : '#ffcc66', s:4 });
  }
  hyper = 1;
  stageClear = 2.4;
  banner('ETAPA 1');
  beep(70, 0.35, 'sawtooth', 0.08);
}

function tickStars(dt) {
  const cx = W / 2, cy = H / 2;
  starsBg.forEach(function(s){
    if (hyper > 0) {
      let dx = s.x - cx, dy = s.y - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const spd = (50 + s.v * 16) * (4 + hyper * 10) * dt;
      s.x += dx / dist * spd;
      s.y += dy / dist * spd;
      s.streak = 10 + hyper * 36;
      if (s.x < -30 || s.x > W + 30 || s.y < -30 || s.y > H + 30) {
        const a = Math.random() * Math.PI * 2;
        const r = 10 + Math.random() * 36;
        s.x = cx + Math.cos(a) * r;
        s.y = cy + Math.sin(a) * r;
      }
    } else {
      s.streak = 0;
      s.y += s.v * dt;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    }
  });
}

function update(dt) {
  if (stageClear > 0) {
    stageClear -= dt;
    hyper = 1 + (2.4 - Math.max(0, stageClear)) * 1.4;
    tickStars(dt);
    tickBoomRings(dt);
    particles.forEach(function(p){ p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt; });
    particles = particles.filter(function(p){ return p.life > 0; });
    if (stageClear <= 0) {
      const el = document.getElementById('stageGems');
      if (el) el.textContent = save.gems;
      setScreen('stage');
    }
    hud();
    return;
  }
  if (window.bombRollActive && window.bombRollActive()) {
    hud();
    return;
  }
  aliveTime += dt;
  if (aliveTime >= 30) unlock('oleada');
  if (aliveTime >= 60) unlock('acech');
  if (bannerT > 0) bannerT -= dt;

  tickWaves(dt);
  spawnT -= dt;
  const wave = waveSpawn();
  if (spawnT <= 0 && enemies.length < wave.cap) {
    spawnEnemy();
    spawnT = wave.every;
  }

  const mv = moveVector();
  const len = Math.hypot(mv.x, mv.y);
  if (len > 0.08) {
    player.x += (mv.x / len) * moveSpeed() * dt;
    player.y += (mv.y / len) * moveSpeed() * dt;
    player.ang = Math.atan2(mv.y, mv.x);
  }
  player.x = Math.max(18, Math.min(W - 18, player.x));
  player.y = Math.max(18, Math.min(H - 18, player.y));
  player.ifr = Math.max(0, player.ifr - dt);
  player.shoot -= dt;
  player.cone -= dt;

  const target = nearest();
  if (target && player.shoot <= 0) {
    shootAt(target);
    player.shoot = fireRate();
  }
  if (owned('cono') && target && player.cone <= 0) {
    const a = Math.atan2(target.y - player.y, target.x - player.x);
    for (let i = -1; i <= 1; i++) {
      const aa = a + i * 0.2;
      shots.push({ x:player.x, y:player.y, vx:Math.cos(aa)*230, vy:Math.sin(aa)*230, r:3, dmg:Math.max(1, dmgNow()-1), life:0.4, c:'#ffcc66' });
    }
    player.cone = Math.max(0.42, 1.05 - (player.mods.rate||0) * 0.1);
  }

  enemies.forEach(function(e){ if (e.orbT) e.orbT = Math.max(0, e.orbT - dt); });
  orbs.forEach(function(o, i){
    o.a += dt * 2.2;
    o.x = player.x + Math.cos(o.a + i) * 36;
    o.y = player.y + Math.sin(o.a + i) * 36;
    enemies.slice().forEach(function(e){
      if ((e.orbT||0) > 0) return;
      if (Math.hypot(e.x - o.x, e.y - o.y) < e.r + 8) {
        e.orbT = 0.4;
        hitEnemy(e, dmgNow());
      }
    });
  });

  shots.forEach(function(s){ s.x += s.vx*dt; s.y += s.vy*dt; s.life -= dt; });
  shots = shots.filter(function(s){ return s.life > 0 && s.x > -20 && s.x < W+20 && s.y > -20 && s.y < H+20; });
  shots.forEach(function(s){
    enemies.slice().forEach(function(e){
      if (s.life > 0 && Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.r) {
        s.life = 0;
        hitEnemy(e, s.dmg);
      }
    });
  });

  updateEnemies(dt);

  if (player.star > 0) player.star = Math.max(0, player.star - dt);
  tickExhaust(dt);

  const mag = magNow();
  gems.forEach(function(g){
    const d = Math.hypot(g.x - player.x, g.y - player.y);
    const kind = g.kind || 'gem';
    const pull = (g.pull && kind !== 'magnet' && d > 1) || (kind === 'gem' && d < mag && d > 1);
    if (pull) {
      const spd = g.pull ? 520 : 160;
      g.x += (player.x - g.x) / d * spd * dt;
      g.y += (player.y - g.y) / d * spd * dt;
    }
    if (d < player.r + g.r + 4) g.got = true;
  });
  gems.filter(function(g){ return g.got; }).forEach(collectPickup);
  gems = gems.filter(function(g){ return !g.got; });

  tickBoomRings(dt);
  autoUseItems();
  particles.forEach(function(p){ p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt; });
  particles = particles.filter(function(p){ return p.life > 0; });
  tickStars(dt);
  hud();
}

function tickExhaust(dt) {
  if (!player) return;
  const back = player.ang + Math.PI;
  player.exhaustAcc = (player.exhaustAcc || 0) + dt;
  const every = 0.026;
  while (player.exhaustAcc >= every) {
    player.exhaustAcc -= every;
    const spread = (Math.random() - 0.5) * 0.4;
    const a = back + spread;
    const ox = player.x + Math.cos(back) * 12 + (Math.random() - 0.5) * 3;
    const oy = player.y + Math.sin(back) * 12 + (Math.random() - 0.5) * 3;
    const spd = 170 + Math.random() * 190;
    exhaust.push({
      x:ox, y:oy, px:ox, py:oy,
      vx:Math.cos(a) * spd, vy:Math.sin(a) * spd,
      life:0.2 + Math.random() * 0.12, max:0.32
    });
  }
  exhaust.forEach(function(p){
    p.px = p.x; p.py = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  });
  if (exhaust.length > 90) exhaust.splice(0, exhaust.length - 90);
  exhaust = exhaust.filter(function(p){ return p.life > 0; });
}

function paintFx() {
  if (player) {
    player.hitFlash = Math.max(0, (player.hitFlash||0) - 0.016);
    player.healFlash = Math.max(0, (player.healFlash||0) - 0.016);
  }
  flashes.forEach(function(f){ f.life -= 0.016; });
  flashes = flashes.filter(function(f){ return f.life > 0; });
}

function loop(ts) {
  raf = requestAnimationFrame(loop);
  pollGamepad();
  const now = ts / 1000;
  const dt = Math.min(0.033, lastTs ? now - lastTs : 0.016);
  lastTs = now;
  window.gameDt = dt;
  if (screen === 'play' && player && player.hp > 0) update(dt);
  paintFx();
  if (window.renderFrame) window.renderFrame();
}

function boot() {
  for (let i = 0; i < 50; i++) {
    starsBg.push({ x:Math.random()*W, y:Math.random()*H, s:Math.random()*1.8+0.4, v:Math.random()*12+6 });
  }
  bindInput();
  document.getElementById('startBtn').onclick = startRun;
  document.getElementById('retryBtn').onclick = startRun;
  document.getElementById('shopBtn').onclick = openShop;
  document.getElementById('shopBtn2').onclick = openShop;
  document.getElementById('galBtn').onclick = openGal;
  document.getElementById('shipBtn').onclick = function(){ setScreen('inspect'); };
  document.getElementById('inspectBack').onclick = function(){ setScreen('menu'); };
  document.getElementById('galBtn2').onclick = openGal;
  if (document.getElementById('libBack')) document.getElementById('libBack').onclick = openGal;
  document.getElementById('galBack').onclick = function(){ setScreen(backScreen === 'over' ? 'over' : 'menu'); };
  document.getElementById('packBtn').onclick = pickPackZip;
  document.getElementById('packBtn2').onclick = pickPackZip;
  document.getElementById('packClear').onclick = clearPack;
  document.getElementById('shopBack').onclick = function(){ setScreen(backScreen === 'over' ? 'over' : 'menu'); };
  document.getElementById('fs').onclick = function(){ document.getElementById('fs').classList.add('hidden'); };
  bindPress(document.getElementById('useHeal'), useHeal);
  bindPress(document.getElementById('useBomb'), useBomb);
  bindPress(document.getElementById('fullBtn'), toggleFullscreen);
  bindPress(document.getElementById('fsBtn'), toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFsLabel);
  document.addEventListener('webkitfullscreenchange', syncFsLabel);
  fitLayout();
  window.addEventListener('resize', fitLayout);
  window.addEventListener('orientationchange', fitLayout);
  document.getElementById('wipe').onclick = function(){ freshSave(); openShop(); };
  bindAutoCheck();
  const stageMenu = document.getElementById('stageMenu');
  if (stageMenu) stageMenu.onclick = exitStageToMenu;
  setScreen('menu');
  requestAnimationFrame(loop);
}

boot();
