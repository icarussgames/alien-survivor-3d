// ==================== ECONOMÍA / TIENDA ====================

function price(u) {
  if (u.id === 'dano') return u.cost + owned('dano') * 8;
  return u.cost;
}
function openShop() {
  backScreen = screen === 'over' ? 'over' : 'menu';
  document.getElementById('shopGems').textContent = save.gems;
  const list = document.getElementById('shopList');
  list.innerHTML = '';
  TREE.forEach(function(u){
    const have = owned(u.id);
    const open = have < u.max;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'gcard shop-card' + (open ? '' : ' lock');
    card.innerHTML = '<span class="ico">'+u.icon+'</span><b>'+u.name+'</b><small>'+have+'/'+u.max+' · '+(open ? '💎'+price(u) : 'Listo')+'</small>';
    card.onclick = function(){
      if (!open) return;
      const c = price(u);
      if (save.gems < c) { alert('Te faltan '+(c - save.gems)+' gemas.'); return; }
      save.gems -= c;
      save.up[u.id] = have + 1;
      if (u.id === 'piel') save.skin = 'piel';
      persist();
      openShop();
    };
    list.appendChild(card);
  });
  setScreen('shop');
}

function collectGem(g) {
  runGems += g.v;
  save.gems += g.v;
  save.life = (save.life|0) + g.v;
  unlock('gema');
  syncPhotos();
  persist();
  xp += g.v;
  beep(720, 0.07, 'square', 0.04);
  particles.push({ x:g.x, y:g.y, vx:0, vy:-30, life:0.4, c:'#ff00ff', s:4 });
  if (xp >= xpNeed) {
    xp -= xpNeed;
    lvl += 1;
    xpNeed = 10 + lvl * 4;
    offerLevel();
  }
}

function pullGems() {
  gems.forEach(function(g){
    const kind = g.kind || 'gem';
    if (kind === 'gem' || kind === 'heal' || kind === 'bomb' || kind === 'star') g.pull = true;
  });
  banner('IMÁN');
  beep(880, 0.1, 'sine', 0.05);
}

function collectPickup(g) {
  const kind = g.kind || 'gem';
  if (kind === 'heal' || kind === 'bomb') {
    if (!addItem(kind)) return;
    refreshItems();
    beep(500, 0.06, 'square', 0.04);
    return;
  }
  if (kind === 'magnet') {
    pullGems();
    return;
  }
  if (kind === 'star') {
    player.star = 5;
    banner('ESTRELLA');
    beep(740, 0.16, 'square', 0.06);
    return;
  }
  if (g.special) {
    takeSpecial(kind);
    return;
  }
  collectGem(g);
}
