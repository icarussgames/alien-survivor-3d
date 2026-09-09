// ==================== DATOS ====================

const W = 600, H = 600, LS = 'as_v1';
const WAVE = 180;

const TREE = [
  { id:'dano', name:'Damage+', desc:'Raises base damage.', cost:15, max:5, icon:'💥' },
  { id:'iman', name:'Magnet', desc:'Pulls gems in.', cost:20, max:1, icon:'🧲' },
  { id:'botas', name:'Boots', desc:'Move faster.', cost:25, max:1, icon:'👟' },
  { id:'vida', name:'Vitality', desc:'+20 max HP.', cost:30, max:1, icon:'❤️' },
  { id:'cura0', name:'Starting heal', desc:'Begin with +1 heal.', cost:18, max:2, icon:'💖' },
  { id:'bomba0', name:'Starting bomb', desc:'Begin with +1 bomb.', cost:22, max:2, icon:'💣' },
  { id:'capCura', name:'Heal capacity', desc:'+1 heal slot. Base 3.', cost:28, max:3, icon:'➕❤' },
  { id:'capBomba', name:'Bomb capacity', desc:'+1 bomb slot. Base 3.', cost:32, max:3, icon:'➕💣' },
  { id:'orbe', name:'Orb', desc:'Two orbs that hit enemies.', cost:40, max:1, icon:'🟣' },
  { id:'cono', name:'Cone', desc:'Extra short burst.', cost:55, max:1, icon:'🔶' },
  { id:'piel', name:'Neon skin', desc:'Equipable skin.', cost:40, max:1, icon:'🌈' }
];

const CHARS = [
  { id:'char_1', level:1, base:'assets/char1_base.jpg', s1:{outfit:'assets/char1_t1.jpg', pose:'assets/char1_p1.jpg'}, s2:{outfit:'assets/char1_t2.jpg', pose:'assets/char1_p2.jpg'} },
  { id:'char_2', level:2, base:'assets/char2_base.jpg', s1:{outfit:'assets/char2_t1.jpg', pose:'assets/char2_p1.jpg'}, s2:{outfit:'assets/char2_t2.jpg', pose:'assets/char2_p2.jpg'} },
  { id:'char_3', level:3, base:'assets/char3_base.jpg', s1:{outfit:'assets/char3_t1.jpg', pose:'assets/char3_p1.jpg'}, s2:{outfit:'assets/char3_t2.jpg', pose:'assets/char3_p2.jpg'} }
];

const PHOTO_AT = [25, 90, 220];
const COSM_COST = { s1_outfit:12, s1_pose:16, s2_outfit:22, s2_pose:28 };

var save = null;
var player = null;
var gems = [];
var shots = [];
var particles = [];
var exhaust = [];
var orbs = [];
var screen = 'menu';
var aliveTime = 0;
var spawnT = 0;
var lastTs = 0;
var runGems = 0;
var xp = 0;
var lvl = 1;
var xpNeed = 10;
var raf = 0;
var galIndex = 0;
var backScreen = 'menu';
var keys = {};
var stick = { on:false, x:0, y:0 };
var bannerT = 0;
var hyper = 0;
var stageClear = 0;
var starsBg = [];

var flashes = [];
