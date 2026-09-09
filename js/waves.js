// ==================== WAVE DIRECTOR ====================
// Picks phases at random and smooths intensity like a moving average.
// Spawn cadence comes from that intensity, not a fixed clock.

var WAVE_DIR = null;

// Intense is gated until ~55s. Peak only comes off Intense, less often, ~8s.
var WAVE_PHASES = {
  relax:  { label:'Calm',     t:0.16, min:10, max:16, next:['normal','relax','normal'] },
  normal: { label:'Normal',   t:0.42, min:20, max:36, next:['relax','normal','normal','relax','hard'] },
  hard:   { label:'Intense',  t:0.72, min:10, max:16, next:['normal','normal','normal','spike'] },
  spike:  { label:'Peak',     t:0.94, min:7.5, max:8.5, next:['normal','normal','relax'] }
};

function resetWaves() {
  WAVE_DIR = { id:'normal', smooth:0.42, target:0.42, left:24, label:'Normal', base:0 };
}

function pickWave() {
  const cur = WAVE_PHASES[WAVE_DIR.id] || WAVE_PHASES.normal;
  const bag = cur.next.slice();
  let id = bag[Math.floor(Math.random() * bag.length)];
  // Hold Intense until the run has warmed up.
  if (id === 'hard' && (aliveTime || 0) < 55) {
    id = Math.random() < 0.55 ? 'normal' : 'relax';
  }
  // Peak must stay rarer than Intense: never jump Normal → Peak.
  if (id === 'spike' && WAVE_DIR.id !== 'hard') id = 'normal';
  const phase = WAVE_PHASES[id];
  const span = phase.min + Math.random() * (phase.max - phase.min);
  WAVE_DIR.id = id;
  WAVE_DIR.target = phase.t;
  WAVE_DIR.left = span;
  WAVE_DIR.label = phase.label;
}

function tickWaves(dt) {
  if (!WAVE_DIR) resetWaves();
  WAVE_DIR.left -= dt;
  if (WAVE_DIR.left <= 0) pickWave();
  const k = 1 - Math.exp(-dt / 1.7);
  WAVE_DIR.smooth += (WAVE_DIR.target - WAVE_DIR.smooth) * k;
}

function afterBossWaves() {
  if (!WAVE_DIR) resetWaves();
  WAVE_DIR.base = Math.min(0.22, (WAVE_DIR.base || 0) + 0.06);
  WAVE_DIR.id = 'normal';
  WAVE_DIR.target = WAVE_PHASES.normal.t;
  WAVE_DIR.smooth = Math.max(WAVE_DIR.smooth, 0.38);
  WAVE_DIR.left = 22;
  WAVE_DIR.label = 'Normal';
}

function waveSpawn() {
  const base = WAVE_DIR.base || 0;
  const heat = bossLive ? Math.min(WAVE_DIR.smooth, 0.4) : Math.min(1, WAVE_DIR.smooth + base);
  const pressure = Math.min(1, (aliveTime || 0) / 480) + (bossesDown || 0) * 0.08;
  const every = Math.max(0.2, (1.18 - pressure * 0.22 - base * 0.35) / (0.55 + heat * 1.45));
  const cap = Math.min(42, Math.round(5 + pressure * 6 + base * 8 + heat * 11));
  return { every:every, cap:cap, heat:WAVE_DIR.smooth, label:WAVE_DIR.label };
}

function itemDropRate() {
  if (!WAVE_DIR) return 0.03;
  if (WAVE_DIR.id === 'spike') return 0.07;
  if (WAVE_DIR.id === 'hard') return 0.05;
  return 0.03;
}
