// ==================== INPUT: TECLADO + ANALOG STICK + DUALSENSE ====================

function held(code) { return !!keys[code]; }

var padMove = { x:0, y:0 };
var padPrev = {};
var padIndex = -1;
var padName = '';

function isDualSenseLike(gp) {
  if (!gp || !gp.id) return false;
  const id = String(gp.id).toLowerCase();
  return id.indexOf('dualsense') >= 0
    || id.indexOf('dualshock') >= 0
    || id.indexOf('wireless controller') >= 0
    || id.indexOf('sony') >= 0
    || id.indexOf('054c') >= 0
    || id.indexOf('ps5') >= 0
    || id.indexOf('ps4') >= 0;
}

function pickGamepad() {
  if (!navigator.getGamepads) return null;
  const list = navigator.getGamepads();
  if (!list) return null;
  if (padIndex >= 0 && list[padIndex]) return list[padIndex];
  let fallback = null;
  for (let i = 0; i < list.length; i++) {
    const gp = list[i];
    if (!gp) continue;
    if (isDualSenseLike(gp)) { padIndex = i; padName = gp.id; return gp; }
    if (!fallback) { fallback = gp; padIndex = i; padName = gp.id; }
  }
  return fallback;
}

function setPadStatus(on, label) {
  const el = document.getElementById('padStatus');
  if (!el) return;
  if (!on) {
    el.classList.add('hidden');
    el.textContent = '';
    return;
  }
  el.classList.remove('hidden');
  el.textContent = label || 'PAD';
}

function onPadConnected(ev) {
  const gp = ev.gamepad;
  padIndex = gp.index;
  padName = gp.id || 'Gamepad';
  setPadStatus(true, isDualSenseLike(gp) ? 'DUALSENSE' : 'PAD');
  if (typeof banner === 'function' && (screen === 'menu' || screen === 'play')) {
    banner(isDualSenseLike(gp) ? 'DUALSENSE' : 'GAMEPAD');
  }
}

function onPadDisconnected(ev) {
  if (padIndex === ev.gamepad.index) {
    padIndex = -1;
    padName = '';
    padMove = { x:0, y:0 };
    padPrev = {};
    setPadStatus(false);
  }
}

function pollGamepad() {
  padMove = { x:0, y:0 };
  const gp = pickGamepad();
  if (!gp) {
    setPadStatus(false);
    return;
  }
  setPadStatus(true, isDualSenseLike(gp) ? 'DUALSENSE' : 'PAD');
  const pressed = function(i) {
    return !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
  };
  // Standard mapping: axes 0/1 left stick. Some Android builds leave dead axes at 0.
  let x = gp.axes[0] || 0;
  let y = gp.axes[1] || 0;
  if (Math.hypot(x, y) < 0.18) { x = 0; y = 0; }
  // D-pad
  if (pressed(14)) x -= 1;
  if (pressed(15)) x += 1;
  if (pressed(12)) y -= 1;
  if (pressed(13)) y += 1;
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  padMove = { x:x, y:y };
  function edge(id, on) {
    const was = !!padPrev[id];
    padPrev[id] = on;
    return on && !was;
  }
  // Face: 0 Cross, 1 Circle, 2 Square, 3 Triangle. Shoulders: 4 L1, 5 R1.
  if (screen === 'menu') {
    if (edge('start', pressed(0) || pressed(9))) {
      if (typeof startRun === 'function') startRun();
    }
    return;
  }
  if (screen === 'over') {
    if (edge('retry', pressed(0) || pressed(9))) {
      if (typeof startRun === 'function') startRun();
    }
    return;
  }
  if (screen === 'stage') {
    if (edge('stageOk', pressed(0) || pressed(9))) exitStageToMenu();
    return;
  }
  if (screen === 'level') {
    if (edge('lvUp', pressed(12) || pressed(14))) moveLevelPick(-1);
    if (edge('lvDown', pressed(13) || pressed(15))) moveLevelPick(1);
    if (edge('lvOk', pressed(0) || pressed(9))) confirmLevelPick();
    return;
  }
  if (screen === 'play') {
    if (edge('heal', pressed(0) || pressed(2) || pressed(4) || pressed(6))) useHeal();
    if (edge('bomb', pressed(1) || pressed(5) || pressed(7))) useBomb();
  }
}

function moveVector() {
  let mx = 0, my = 0;
  if (held('ArrowLeft') || held('KeyA')) mx -= 1;
  if (held('ArrowRight') || held('KeyD')) mx += 1;
  if (held('ArrowUp') || held('KeyW')) my -= 1;
  if (held('ArrowDown') || held('KeyS')) my += 1;
  if (mx || my) return { x:mx, y:my };
  if (stick.on) return { x:stick.x, y:stick.y };
  if (padMove.x || padMove.y) return padMove;
  return { x:0, y:0 };
}

function bindInput() {
  window.addEventListener('gamepadconnected', onPadConnected);
  window.addEventListener('gamepaddisconnected', onPadDisconnected);
  // Wake any already-connected pad (PC). Android usually needs a button press first.
  const existing = pickGamepad();
  if (existing) setPadStatus(true, isDualSenseLike(existing) ? 'DUALSENSE' : 'PAD');

  const stickEl = document.getElementById('stick');
  const knob = document.getElementById('knob');
  function setKnob(px, py) {
    const r = stickEl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = px - cx, dy = py - cy;
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
  let stickPointer = null;
  stickEl.addEventListener('pointerdown', function(ev){
    if (stickPointer != null && stickPointer !== ev.pointerId) return;
    ev.preventDefault();
    stickPointer = ev.pointerId;
    try { stickEl.setPointerCapture(ev.pointerId); } catch (e) {}
    initAudio();
    setKnob(ev.clientX, ev.clientY);
  });
  stickEl.addEventListener('pointermove', function(ev){
    if (ev.pointerId !== stickPointer) return;
    setKnob(ev.clientX, ev.clientY);
  });
  function endStick(ev) {
    if (stickPointer != null && ev.pointerId !== stickPointer) return;
    stickPointer = null;
    resetKnob();
  }
  stickEl.addEventListener('pointerup', endStick);
  stickEl.addEventListener('pointercancel', endStick);

  window.addEventListener('keydown', function(ev){
    if (screen === 'stage') {
      if (ev.code === 'Enter' || ev.code === 'Space') { ev.preventDefault(); if (!ev.repeat) exitStageToMenu(); }
      return;
    }
    if (screen === 'level') {
      if (ev.code === 'ArrowUp' || ev.code === 'ArrowLeft') { ev.preventDefault(); if (!ev.repeat) moveLevelPick(-1); return; }
      if (ev.code === 'ArrowDown' || ev.code === 'ArrowRight') { ev.preventDefault(); if (!ev.repeat) moveLevelPick(1); return; }
      if (ev.code === 'Enter' || ev.code === 'Space') { ev.preventDefault(); if (!ev.repeat) confirmLevelPick(); return; }
      return;
    }
    if (screen !== 'play') return;
    const move = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'].indexOf(ev.code) >= 0;
    if (move) ev.preventDefault();
    if (ev.code === 'Digit1' || ev.key === 'q' || ev.key === 'Q') useHeal();
    if (ev.code === 'Digit2' || ev.key === 'e' || ev.key === 'E') useBomb();
    keys[ev.code] = true;
    initAudio();
  });
  window.addEventListener('keyup', function(ev){ keys[ev.code] = false; });
  window.addEventListener('blur', function(){ keys = {}; stick.on = false; });
}


function bindPress(el, fn) {
  if (!el) return;
  el.addEventListener('pointerdown', function(ev) {
    if (ev.button != null && ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    fn();
  });
}

function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function toggleFullscreen() {
  const root = document.documentElement;
  if (isFullscreen()) {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document);
    return;
  }
  const req = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!req) return;
  const p = req.call(root);
  if (p && p.catch) p.catch(function(){});
}

function syncFsLabel() {
  const on = isFullscreen();
  const menu = document.getElementById('fullBtn');
  if (menu) menu.textContent = on ? 'EXIT FULLSCREEN' : 'FULLSCREEN';
  const icon = document.getElementById('fsBtn');
  if (icon) icon.textContent = on ? '⤢' : '⛶';
}

function fitLayout() {
  const land = window.matchMedia('(orientation: landscape)').matches && window.innerWidth > window.innerHeight;
  const short = window.innerHeight <= 520;
  const touch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  document.body.classList.toggle('land', !!(land && short && touch));
}
