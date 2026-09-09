// ==================== ITEMS CONSUMIBLES ====================
// Curas y bombas se guardan y se usan con el panel, no al recogerlas.

const ITEM_MAX = 4;

function addItem(kind) {
  if (!player) return false;
  if (kind === 'heal') {
    if (player.heal >= ITEM_MAX) return false;
    player.heal++;
    return true;
  }
  if (kind === 'bomb') {
    if (player.bombs >= ITEM_MAX) return false;
    player.bombs++;
    return true;
  }
  return false;
}

function useHeal() {
  if (!player || screen !== 'play' || player.heal <= 0) return;
  if (player.hp >= player.maxHp) return;
  player.heal--;
  player.hp = Math.min(player.maxHp, player.hp + 40);
  player.healFlash = 0.28;
  flashAt(player.x, player.y, 22, 'rgba(80,255,160,.95)');
  beep(640, 0.1, 'sine', 0.05);
  refreshItems();
}

function useBomb() {
  if (!player || screen !== 'play' || player.bombs <= 0) return;
  if (window.requestBombRoll) {
    if (!window.requestBombRoll()) return;
    player.bombs--;
    refreshItems();
    return;
  }
  player.bombs--;
  boom(player.x, player.y);
  refreshItems();
}

function refreshItems() {
  const h = document.getElementById('healN');
  const b = document.getElementById('bombN');
  if (h) h.textContent = player ? player.heal : 0;
  if (b) b.textContent = player ? player.bombs : 0;
}

var autoItemsOn = false;
var bombReady = true;

function bindAutoCheck() {
  const el = document.getElementById('autoCheck');
  const label = document.getElementById('autoItem');
  if (!el) return;
  autoItemsOn = localStorage.getItem('as_auto') === '1';
  el.checked = autoItemsOn;
  function saveAuto() {
    autoItemsOn = !!el.checked;
    localStorage.setItem('as_auto', autoItemsOn ? '1' : '0');
    bombReady = true;
  }
  el.onchange = saveAuto;
  if (label) {
    label.addEventListener('pointerdown', function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      el.checked = !el.checked;
      saveAuto();
    });
  }
}

function autoUseItems() {
  if (!autoItemsOn || !player || screen !== 'play') return;
  while (player.hp < 50 && player.heal > 0 && player.hp < player.maxHp) useHeal();
  const near = enemies.filter(function(e) {
    return Math.hypot(e.x - player.x, e.y - player.y) < WHIP_REACH;
  }).length;
  if (near < 6) bombReady = true;
  else if (bombReady && player.bombs > 0) {
    bombReady = false;
    useBomb();
  }
}
