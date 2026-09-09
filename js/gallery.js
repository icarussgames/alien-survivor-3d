// ==================== GALERÍA ====================
// Un pack.zip se descomprime en este navegador (IndexedDB).
// No se sube a GitHub ni a Render. Si falta una foto, se usa assets/.

var packSrc = {};
var packCount = 0;

var PACK_SLOTS = ['base', 's1_outfit', 's1_pose', 's2_outfit', 's2_pose'];
var PACK_FILE = /(char[123])\/(base|s1_outfit|s1_pose|s2_outfit|s2_pose)\.(jpe?g|png|webp)$/i;

function galDb() {
  return new Promise(function(resolve, reject) {
    const req = indexedDB.open('as_gallery', 1);
    req.onupgradeneeded = function() { req.result.createObjectStore('imgs'); };
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

function idbPut(slot, blob) {
  return galDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      const tx = db.transaction('imgs', 'readwrite');
      tx.objectStore('imgs').put(blob, slot);
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function() { reject(tx.error); };
    });
  });
}

function idbGet(slot) {
  return galDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      const req = db.transaction('imgs').objectStore('imgs').get(slot);
      req.onsuccess = function() { resolve(req.result || null); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function idbClear() {
  return galDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      const tx = db.transaction('imgs', 'readwrite');
      tx.objectStore('imgs').clear();
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function() { reject(tx.error); };
    });
  });
}

function slotKey(folder, slot) {
  return 'char_' + folder.slice(4) + '_' + slot;
}

function mimeFor(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function rememberBlob(slot, blob) {
  if (packSrc[slot]) URL.revokeObjectURL(packSrc[slot]);
  if (!blob) {
    delete packSrc[slot];
    return;
  }
  packSrc[slot] = URL.createObjectURL(blob);
}

function loadLocalPack() {
  const slots = [];
  [1, 2, 3].forEach(function(n) {
    PACK_SLOTS.forEach(function(slot) { slots.push('char_' + n + '_' + slot); });
  });
  return Promise.all(slots.map(function(slot) {
    return idbGet(slot).then(function(blob) {
      rememberBlob(slot, blob);
      return !!blob;
    });
  })).then(function(flags) {
    packCount = flags.filter(Boolean).length;
    return packCount;
  });
}

function findEocd(view, len) {
  const start = Math.max(0, len - 22 - 65535);
  for (let i = len - 22; i >= start; i--) {
    if (view.getUint32(i, true) === 0x06054b50) return i;
  }
  return -1;
}

function unzipEntries(buf) {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  const eocd = findEocd(view, bytes.length);
  if (eocd < 0) return Promise.reject(new Error('No es un zip'));
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const jobs = [];
  for (let n = 0; n < count; n++) {
    if (p + 46 > bytes.length || view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOff = view.getUint32(p + 42, true);
    const name = new TextDecoder('utf-8').decode(bytes.subarray(p + 46, p + 46 + nameLen));
    const localNameLen = view.getUint16(localOff + 26, true);
    const localExtraLen = view.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + localNameLen + localExtraLen;
    const comp = bytes.subarray(dataStart, dataStart + compSize);
    jobs.push({ name: name.replace(/\\/g, '/'), method: method, comp: comp });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return Promise.all(jobs.map(function(job) {
    if (job.method === 0) return Promise.resolve({ name: job.name, data: job.comp });
    if (job.method !== 8) return Promise.resolve(null);
    const stream = new Blob([job.comp]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).arrayBuffer().then(function(out) {
      return { name: job.name, data: new Uint8Array(out) };
    });
  })).then(function(rows) {
    return rows.filter(Boolean);
  });
}

function importPackZip(file) {
  return file.arrayBuffer().then(unzipEntries).then(function(entries) {
    const found = [];
    entries.forEach(function(entry) {
      if (!entry || /__MACOSX|(^|\/)\./.test(entry.name)) return;
      const match = entry.name.match(PACK_FILE);
      if (!match) return;
      found.push({
        slot: slotKey(match[1].toLowerCase(), match[2].toLowerCase()),
        blob: new Blob([entry.data], { type: mimeFor(entry.name) })
      });
    });
    if (!found.length) {
      throw new Error('El zip no trae fotos con el nombre esperado. Usa char1/base.jpg y el resto igual.');
    }
    return idbClear().then(function() {
      return Promise.all(found.map(function(item) { return idbPut(item.slot, item.blob); }));
    }).then(function() { return loadLocalPack(); });
  });
}

function pickPackZip() {
  const input = document.getElementById('packFile');
  input.value = '';
  input.onchange = function() {
    const file = input.files && input.files[0];
    if (!file) return;
    importPackZip(file).then(function(n) {
      alert('Pack cargado en este navegador: ' + n + ' fotos. No se subió a ningún lado.');
      if (screen === 'gal') renderGal();
    }).catch(function(err) {
      alert(err && err.message ? err.message : 'No pude leer ese zip.');
    });
  };
  input.click();
}

function clearPack() {
  idbClear().then(function() {
    Object.keys(packSrc).forEach(function(slot) {
      URL.revokeObjectURL(packSrc[slot]);
      delete packSrc[slot];
    });
    packCount = 0;
    if (screen === 'gal') renderGal();
  });
}

function syncPhotos() {
  save.photo = save.photo|0 || 1;
  save.life = save.life|0;
  if (save.life >= 220) save.photo = 4;
  else if (save.life >= 90) save.photo = 3;
  else save.photo = 2;
}
function photoLocked(char) {
  if (char.level <= 1) return false;
  if (char.level === 2) return (save.life|0) < 90;
  return (save.life|0) < 220;
}
function cosmOn(key) { return !!(save.cosm && save.cosm[key]); }

function slotSrc(slot, fallback) {
  return packSrc[slot] || fallback;
}

function openGal() {
  if (screen === 'over') backScreen = 'over';
  else if (screen !== 'lib') backScreen = 'menu';
  syncPhotos();
  loadLocalPack().then(function() {
    renderGal();
    setScreen('gal');
  }).catch(function() {
    renderGal();
    setScreen('gal');
  });
}

function renderGal() {
  const local = packCount ? ' · pack local: ' + packCount + ' fotos' : '';
  document.getElementById('galHint').textContent = 'Gemas: ' + save.gems + ' · de por vida ' + (save.life|0) + local;
  const clear = document.getElementById('packClear');
  if (clear) clear.disabled = !packCount;
  const tabs = document.getElementById('galTabs');
  tabs.innerHTML = '';
  CHARS.forEach(function(char, i){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (i === galIndex ? '' : ' ghost');
    b.textContent = 'Foto ' + char.level;
    b.onclick = function(){ galIndex = i; openGal(); };
    tabs.appendChild(b);
  });

  const shop = document.getElementById('galShop');
  shop.innerHTML = '';
  const char = CHARS[galIndex];
  const locked = photoLocked(char);
  const need = char.level === 2 ? 90 : (char.level === 3 ? 220 : 0);

  function row(label, fallback, slot, buyKey, cost, prereq) {
    const src = slotSrc(slot, fallback);
    const el = document.createElement('div');
    el.className = 'gal-item';
    const img = document.createElement('img');
    img.src = src;
    img.alt = label;
    const owned = buyKey ? cosmOn(buyKey) : true;
    if (locked || (buyKey && !owned)) img.style.filter = 'blur(18px)';
    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('b');
    title.textContent = label;
    const sub = document.createElement('span');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn buy';
    if (locked) {
      sub.textContent = 'Se abre con ' + need + ' gemas de por vida';
      btn.textContent = 'Bloqueada';
      btn.disabled = true;
    } else if (!buyKey || owned) {
      img.style.filter = 'none';
      sub.textContent = buyKey ? 'Comprado' : 'Ya visible';
      btn.textContent = 'Ver';
      btn.onclick = function(){ showFs(src); };
    } else if (!prereq) {
      sub.textContent = 'Primero el outfit';
      btn.textContent = 'Comprar';
      btn.disabled = true;
    } else {
      sub.textContent = 'Cuesta ' + cost + ' gemas';
      btn.textContent = 'Comprar 💎' + cost;
      btn.onclick = function(){
        if (save.gems < cost) { alert('Te faltan ' + (cost - save.gems) + ' gemas.'); return; }
        save.gems -= cost;
        if (!save.cosm) save.cosm = {};
        save.cosm[buyKey] = true;
        persist();
        renderGal();
      };
    }

    meta.appendChild(title);
    meta.appendChild(sub);
    meta.appendChild(btn);
    el.appendChild(img);
    el.appendChild(meta);
    shop.appendChild(el);
  }

  row('Base', char.base, char.id+'_base', null, 0, true);
  row('Outfit 1', char.s1.outfit, char.id+'_s1_outfit', char.id+'_s1_outfit', COSM_COST.s1_outfit, true);
  row('Pose 1', char.s1.pose, char.id+'_s1_pose', char.id+'_s1_pose', COSM_COST.s1_pose, cosmOn(char.id+'_s1_outfit'));
  row('Outfit 2', char.s2.outfit, char.id+'_s2_outfit', char.id+'_s2_outfit', COSM_COST.s2_outfit, true);
  row('Pose 2', char.s2.pose, char.id+'_s2_pose', char.id+'_s2_pose', COSM_COST.s2_pose, cosmOn(char.id+'_s2_outfit'));
}

function openLib() { openGal(); }

function showFs(src) {
  document.getElementById('fsImg').src = src;
  document.getElementById('fs').classList.remove('hidden');
}
