// ==================== ENEMIGOS, DISPAROS Y JEFES ====================

var enemies = [];
var enemyShots = [];
var bossLive = false;
var lastBossTier = -1;
var boomRings = [];
var bossesDown = 0;
var lastMidTier = 0;
var rockT = 0;
var WHIP_REACH = 64;

function resetEnemies() {
  enemies = [];
  enemyShots = [];
  bossLive = false;
  lastBossTier = -1;
  lastMidTier = 0;
  rockT = 2.5;
  boomRings = [];
  bossesDown = 0;
}

function enemyFace(e) {
  if (e.kind === 'boss') return '👿';
  if (e.kind === 'mid') return '💣';
  if (e.kind === 'rock') return '🪨';
  if (e.kind === 'shooter') return '🛸';
  if (e.kind === 'whip') return '⚡';
  return '👽';
}


function enemyBars() {
  const n = bossesDown|0;
  if (n < 1) return 1;
  const roll = Math.random();
  const triple = n < 2 ? 0 : Math.min(0.12, 0.02 + (n - 2) * 0.02);
  const doble = Math.min(0.4, 0.10 + (n - 1) * 0.05);
  if (roll < triple) return 3;
  if (roll < triple + doble) return 2;
  return 1;
}

function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x = 0, y = 0;
  if (edge === 0) { x = Math.random() * W; y = -18; }
  if (edge === 1) { x = W + 18; y = Math.random() * H; }
  if (edge === 2) { x = Math.random() * W; y = H + 18; }
  if (edge === 3) { x = -18; y = Math.random() * H; }
  const sc = enemyScale();
  const roll = Math.random();
  let kind = 'normal';
  if (roll < 0.272) kind = 'shooter';
  else if (roll < 0.552) kind = 'whip';
  const mult = kind === 'whip' ? 1.2 : (kind === 'shooter' ? 1.8 : 1.6);
  const bars = enemyBars();
  const hp = mult * sc.hp * bars;
  const spd = (kind === 'whip' ? 96 : (kind === 'shooter' ? 44 : 34)) * sc.spd;
  enemies.push({
    x:x, y:y,
    r: kind === 'whip' ? 12 : (kind === 'shooter' ? 14 : 13),
    hp:hp, max:hp, bars:bars, spd:spd, kind:kind,
    shoot: 0.45 + Math.random() * 0.4, dmg: sc.dmg, flash:0, whip:0, tell:0, tellColor:'#fff'
  });
}

function spawnBoss() {
  if (bossLive) return;
  const sc = enemyScale();
  const first = bossesDown === 0;
  const hp = Math.round((first ? 110 : 32) * sc.hp * (1 + bossesDown * 0.45));
  enemies.push({
    x: W / 2, y: -30, r: 28, hp:hp, max:hp, bars: 1 + bossesDown,
    spd: 34 * sc.spd, kind: 'boss', shoot: 0.8, dmg: 1.4 * sc.dmg, big: true,
    flash:0, whip:0, tell:0, tellColor:'#fff',
    kit: first, move: 'shot', phase: 'cool', reward: bossesDown
  });
  bossLive = true;
  banner(first ? 'JEFE · disparo y látigo' : 'JEFE');
  beep(90, 0.28, 'sawtooth', 0.07);
}

function spawnMidBoss() {
  const edge = Math.floor(Math.random() * 4);
  let x = 0, y = 0;
  if (edge === 0) { x = Math.random() * W; y = -22; }
  if (edge === 1) { x = W + 22; y = Math.random() * H; }
  if (edge === 2) { x = Math.random() * W; y = H + 22; }
  if (edge === 3) { x = -22; y = Math.random() * H; }
  const sc = enemyScale();
  enemies.push({
    x:x, y:y, r:12, hp:1, max:1, bars:1,
    spd: 30 * sc.spd, kind:'mid', shoot:0, flash:0, whip:0, tell:0,
    tellColor:'#ff8844', explodeR:70, fuse:15, fuseMax:15
  });
  banner('BOMBA');
  beep(120, 0.18, 'sawtooth', 0.06);
}

function spawnAsteroid() {
  const edge = Math.floor(Math.random() * 4);
  let x = 0, y = 0;
  if (edge === 0) { x = Math.random() * W; y = -24; }
  if (edge === 1) { x = W + 24; y = Math.random() * H; }
  if (edge === 2) { x = Math.random() * W; y = H + 24; }
  if (edge === 3) { x = -24; y = Math.random() * H; }
  const a = Math.atan2(H / 2 - y, W / 2 - x) + (Math.random() - 0.5) * 0.5;
  const spd = 28 + Math.random() * 22;
  enemies.push({
    x:x, y:y, r:16 + Math.random() * 8,
    hp:99, max:99, bars:1, spd:spd, kind:'rock', block:true, solid:true,
    vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
    shoot:0, flash:0, whip:0, tell:0, spin: (Math.random() - 0.5) * 2
  });
}

function maybeMidBoss() {
  const m = Math.floor(aliveTime / 60);
  if (m < 1 || m <= lastMidTier) return;
  lastMidTier = m;
  if (m % 3 === 0) return;
  spawnMidBoss();
}

function maybeAsteroid(dt) {
  rockT -= dt;
  if (rockT > 0) return;
  rockT = (7 + Math.random() * 6) / 0.7;
  if (Math.random() < 0.55 * 0.7) spawnAsteroid();
}

function maybeBoss() {
  const t = tier();
  if (aliveTime >= WAVE && t > lastBossTier) {
    lastBossTier = t;
    spawnBoss();
  }
}

function enemyFire(e, spread) {
  const a = Math.atan2(player.y - e.y, player.x - e.x);
  const n = spread || 1;
  const step = n >= 5 ? 0.22 : 0.18;
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    const aa = a + (i - mid) * step;
    enemyShots.push({
      x:e.x, y:e.y,
      vx: Math.cos(aa) * (e.kind === 'boss' ? 150 : 170),
      vy: Math.sin(aa) * (e.kind === 'boss' ? 150 : 170),
      r: e.kind === 'boss' ? 6 : 2,
      boss: e.kind === 'boss',
      dmg: e.dmg,
      life: 2.2
    });
  }
}

function midExplode(e) {
  const reach = e.explodeR || 70;
  boomRings.push({ x:e.x, y:e.y, reach:reach, life:0.42, max:0.42 });
  if (player && Math.hypot(player.x - e.x, player.y - e.y) < reach + player.r) {
    if (!(player.star > 0)) hurt(40);
  }
  enemies.slice().forEach(function(o) {
    if (o === e || o.kind === 'rock' || o.kind === 'boss') return;
    if (Math.hypot(o.x - e.x, o.y - e.y) < reach + o.r) hitEnemy(o, Math.max(o.hp, 1));
  });
  flashAt(e.x, e.y, 34, 'rgba(255,120,40,.95)');
  for (let i = 0; i < 14; i++) {
    particles.push({ x:e.x, y:e.y, vx:(Math.random()-0.5)*260, vy:(Math.random()-0.5)*260, life:0.45, c:'#ff8844', s:5 });
  }
  beep(90, 0.16, 'sawtooth', 0.07);
  const i = enemies.indexOf(e);
  if (i >= 0) enemies.splice(i, 1);
}

function updateEnemies(dt) {
  maybeBoss();
  maybeMidBoss();
  maybeAsteroid(dt);
  enemies.slice().forEach(function(e){
    const dx = player.x - e.x, dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    e.shoot -= dt;
    e.flash = Math.max(0, (e.flash||0) - dt);
    e.whip = Math.max(0, (e.whip||0) - dt);
    e.ramCd = Math.max(0, (e.ramCd||0) - dt);

    if (e.kind === 'rock') {
      e.x += (e.vx || 0) * dt;
      e.y += (e.vy || 0) * dt;
      if (e.x < -40 || e.x > W + 40 || e.y < -40 || e.y > H + 40) {
        const i = enemies.indexOf(e);
        if (i >= 0) enemies.splice(i, 1);
      }
      if (Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r - 2) {
        if (player.star > 0) ramEnemy(e);
        else hurt(14);
      }
      return;
    }

    let want = e.spd;
    if (e.kind === 'shooter' && dist < 170) want = dist < 120 ? -e.spd * 0.4 : 0;
    if (e.kind === 'boss' && dist < 140) want = 0;
    if (e.kind === 'whip' && dist < WHIP_REACH - 14) want = 0;
    if (e.kind === 'mid') {
      e.fuse = (e.fuse == null ? 15 : e.fuse) - dt;
      const near = dist < e.r + player.r + 2;
      if (e.fuse <= 0 || near) {
        midExplode(e);
        return;
      }
    }
    e.x += (dx / dist) * want * dt;
    e.y += (dy / dist) * want * dt;
    if (e.kind === 'shooter' && e.shoot <= 0 && dist < 280) {
      e.shoot = 1.55;
      enemyFire(e, 1);
    }
    if (e.kind === 'boss') bossAct(e, dist);
    if (e.kind === 'whip' && dist < WHIP_REACH && e.shoot <= 0) {
      e.shoot = 0.85;
      e.whip = 0.16;
      if (!(player.star > 0)) hurt(20);
    }
    if (e.kind !== 'whip' && e.kind !== 'mid' && Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r - 2) {
      if (player.star > 0) ramEnemy(e);
      else hurt(e.kind === 'boss' ? 20 : 10);
    }
  });

  enemyShots.forEach(function(s){
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (Math.hypot(s.x - player.x, s.y - player.y) < s.r + player.r - 2) {
      s.life = 0;
      hurt(10);
    }
  });
  enemyShots = enemyShots.filter(function(s){
    return s.life > 0 && s.x > -30 && s.x < W + 30 && s.y > -30 && s.y < H + 30;
  });
}

function hitEnemy(e, dmg) {
  if (e.kind === 'rock' || e.solid) {
    flashAt(e.x, e.y, e.r + 4, 'rgba(180,180,180,.5)');
    return;
  }
  e.hp -= dmg;
  e.flash = 0.12;
  flashAt(e.x, e.y, e.r + 6, 'rgba(255,255,255,.9)');
  particles.push({ x:e.x, y:e.y, vx:(Math.random()-0.5)*40, vy:(Math.random()-0.5)*40, life:0.25, c:'#fff', s:3 });
  if (e.hp > 0) return;
  unlock('alien');
  if (e.kind === 'boss') {
    bossLive = false;
    bossesDown += 1;
    unlock('acech');
    const reward = bossReward(e.reward|0);
    if (bossesDown === 1) {
      if (reward && !ownsSpecial(reward.kind)) takeSpecial(reward.kind);
      runGems += 4;
      save.gems += 4;
      save.life = (save.life|0) + 4;
      persist();
      beginStageClear(e.x, e.y);
    } else {
      if (reward && !ownsSpecial(reward.kind)) {
        gems.push({ kind:reward.kind, special:true, x:e.x, y:e.y, v:0, r:10 });
      }
      afterBossWaves();
      banner(reward ? reward.label : 'Oleadas');
      for (let i = 0; i < 4; i++) gems.push({ kind:'gem', x:e.x + (Math.random()-0.5)*24, y:e.y, v:1, r:7 });
    }
  } else if (e.kind === 'rock') {
    /* rubble only */
  } else if (e.kind !== 'mid' && Math.random() < 0.88) {
    gems.push(rollDrop(e.x, e.y));
  } else if (e.kind === 'mid') {
    for (let i = 0; i < 2; i++) gems.push({ kind:'gem', x:e.x + (Math.random()-0.5)*16, y:e.y, v:1, r:6 });
  }
  enemies.splice(enemies.indexOf(e), 1);
}


function bossAct(e, dist) {
  if (e.phase === 'tell') {
    e.tell = 0.7;
    if (e.shoot > 0) return;
    if (e.move === 'shot') enemyFire(e, e.kit ? 5 : 3);
    if (e.move === 'whip') {
      e.whip = 0.18;
      if (dist < WHIP_REACH + 16) hurt(20);
    }
    e.phase = 'cool';
    e.shoot = 1.15;
    e.tell = 0;
    if (e.kit) e.move = e.move === 'shot' ? 'whip' : 'shot';
    return;
  }
  e.tell = 0;
  if (e.shoot > 0) return;
  e.phase = 'tell';
  e.shoot = 0.7;
  e.tell = 0.7;
  if (!e.kit) e.move = 'shot';
  e.tellColor = e.move === 'whip' ? '#ff9f43' : '#7af7ff';
}

function bossBlast(x, y) {
  const reach = 150;
  boomRings.push({ x:x, y:y, reach:reach, life:0.42, max:0.42 });
  if (player && Math.hypot(player.x - x, player.y - y) < reach) hurt(30);
  beep(70, 0.2, 'sawtooth', 0.07);
}

function ramEnemy(e) {
  if (!e || e.ramCd > 0) return;
  e.ramCd = 0.22;
  hitEnemy(e, e.kind === 'boss' ? dmgNow() : Math.max(e.hp, 1));
  flashAt(e.x, e.y, 16, 'rgba(255,210,60,.9)');
}

function rollDrop(x, y) {
  const roll = Math.random();
  const rate = itemDropRate();
  if (roll < rate) return { kind:'heal', x:x, y:y, v:0, r:8 };
  if (roll < rate * 2) return { kind:'bomb', x:x, y:y, v:0, r:8 };
  if (roll < rate * 3) return { kind:'magnet', x:x, y:y, v:0, r:8 };
  if (roll < rate * 4) return { kind:'star', x:x, y:y, v:0, r:8 };
  return { kind:'gem', x:x, y:y, v:1, r:6 };
}

function boom(x, y) {
  const boomDmg = Math.max(1, dmgNow() * 1.5);
  const reach = 260;
  boomRings.push({ x:x, y:y, reach:reach, life:0.42, max:0.42 });
  enemies.slice().forEach(function(en){
    if (Math.hypot(en.x - x, en.y - y) < reach) hitEnemy(en, boomDmg);
  });
  for (let i = 0; i < 16; i++) {
    particles.push({ x:x, y:y, vx:(Math.random()-0.5)*320, vy:(Math.random()-0.5)*320, life:0.55, c:'#ff8844', s:6 });
  }
  beep(90, 0.18, 'sawtooth', 0.07);
}

function tickBoomRings(dt) {
  boomRings.forEach(function(b){ b.life -= dt; });
  boomRings = boomRings.filter(function(b){ return b.life > 0; });
}

function drawBoomRings() {
  // Rings are drawn by the three.js view from boomRings.
}
