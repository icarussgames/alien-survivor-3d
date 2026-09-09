// ==================== ESTADO + GUARDADO ====================

save = loadSave();

function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS) || '{}');
    return {
      gems: raw.gems|0,
      life: raw.life|0 || raw.gems|0,
      up: raw.up || {},
      gal: raw.gal || ['surv','shot'],
      skin: raw.skin || 'surv',
      photo: raw.photo|0 || 1,
      cosm: raw.cosm || {},
      specs: raw.specs || {}
    };
  } catch (e) {
    return { gems:0, life:0, up:{}, gal:['surv','shot'], skin:'surv', photo:1, cosm:{}, specs:{} };
  }
}

function persist() { localStorage.setItem(LS, JSON.stringify(save)); }
function owned(id) { return save.up[id]|0; }
function hasCard(id) { return save.gal.indexOf(id) >= 0; }
function unlock(id) {
  if (hasCard(id)) return;
  save.gal.push(id);
  persist();
}
function freshSave() {
  save = { gems:0, life:0, up:{}, gal:['surv','shot'], skin:'surv', photo:1, cosm:{} };
  persist();
}
