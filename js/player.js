// ==================== STATS DE LA PARTIDA ====================
// Cada nivel sube una: Speed, Def o Atk.

var RUN = { spd: 0, def: 0, atk: 0, mag: 0, fan: 0, specs:{} };

function resetRunStats() {
  RUN = { spd: 0, def: 0, atk: 0, mag: 0, fan: 0, specs:{} };
  if (save && save.specs && save.specs.fan) {
    RUN.fan = 1;
    RUN.specs.fan = true;
  }
}

function bumpStat(id) {
  if (id === 'spd' || id === 'def' || id === 'atk' || id === 'mag') RUN[id] += 1;
}

function moveNow() {
  const base = owned('botas') ? 190 : 145;
  return Math.round(base * (1 + RUN.spd * 0.06));
}

function fireNow() {
  return Math.max(0.18, 0.50 * Math.pow(0.89, RUN.spd));
}

function shotDmg() {
  const base = 1 + owned('dano');
  return Math.round(base * (1 + RUN.atk * 0.2) * 10) / 10;
}

function takenDmg(n) {
  const mul = Math.max(0.55, 1 - RUN.def * 0.075);
  return Math.max(1, Math.round(n * mul));
}

function statLine(id) {
  if (id === 'spd') {
    return 'Mov ' + moveNow() + ' · disparo ' + fireNow().toFixed(2) + 's';
  }
  if (id === 'def') {
    return 'Recibes ' + Math.round(Math.max(0.55, 1 - RUN.def * 0.075) * 100) + '%';
  }
  if (id === 'mag') return 'Radio ' + magRadius();
  return 'Daño ' + shotDmg();
}

function nextStatLine(id) {
  const prev = RUN[id];
  RUN[id] = prev + 1;
  const line = statLine(id);
  RUN[id] = prev;
  return line;
}

function magRadius() {
  return Math.round(magnet() + RUN.mag * 8);
}
function grantFan() { RUN.fan = 1; }

function fireRate() { return fireNow(); }
function moveSpeed() { return moveNow(); }
function dmgNow() { return shotDmg(); }
function magNow() { return magRadius(); }
function spreadNow() { return Math.max((player && player.mods && player.mods.spread) || 0, RUN.fan || 0); }

// Un upgrade especial por jefe. Los siguientes se agregan acá.
var BOSS_REWARDS = [
  { kind:'fan', face:'✳️', label:'Disparo triple' }
];

function bossReward(n) {
  return BOSS_REWARDS[n] || null;
}

function ownsSpecial(kind) {
  return !!(RUN.specs && RUN.specs[kind]);
}

function takeSpecial(kind) {
  if (!RUN.specs) RUN.specs = {};
  if (RUN.specs[kind]) return false;
  RUN.specs[kind] = true;
  if (kind === 'fan') {
    RUN.fan = 1;
    if (save) {
      save.specs = save.specs || {};
      save.specs.fan = true;
      persist();
    }
  }
  for (var i = 0; i < BOSS_REWARDS.length; i++) {
    if (BOSS_REWARDS[i].kind === kind) {
      banner(BOSS_REWARDS[i].label);
      break;
    }
  }
  beep(640, 0.12, 'square', 0.05);
  return true;
}

function specialFace(kind) {
  for (var i = 0; i < BOSS_REWARDS.length; i++) {
    if (BOSS_REWARDS[i].kind === kind) return BOSS_REWARDS[i].face;
  }
  return '✳️';
}
