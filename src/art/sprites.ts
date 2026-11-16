import Phaser from 'phaser';
import { makeSprite, makeCanvas, pixCircle, pixRing, Palette, R } from './PixelArt';

/* =========================================================================
 * CHARACTERS
 * ========================================================================= */

const HERO_PAL: Palette = {
  k: '#1a1326', m: '#9aa6b8', M: '#e2e8f0', d: '#5c6678', s: '#f2c6a0', S: '#d89c78', e: '#1a1326',
  b: '#3a6bd6', B: '#6f9cf0', c: '#24418f', r: '#e04848', R: '#ff8a8a', y: '#f0c040', l: '#4a3428', x: '#1a1326',
};

const HERO_TOP = [
  '................',
  '......rRr.......',
  '.....rRrr.......',
  '....kkkkkkk.....',
  '...kMMMmmmmk....',
  '...kMmmmmmmmk...',
  '...kmmmkssssk...',
  '...kmmksssesk...',
  '...kdmksssssk...',
  '....kdkkSSkk....',
  '...kccbbBbbk....',
  '..kccbbBbbbsk...',
  '..kcckyyyyykk...',
  '...kckbbbbbk....',
];
const LEGS = {
  stand: ['....klk..klk....', '....kk....kk....'],
  fwd: ['...klk...klk....', '...kk.....kk....'],
  back: ['.....klkklk.....', '.....kk.kk......'],
  wide: ['...klk....klk...', '...kk......kk...'],
};

/*
 * กาโตะ (the lover): a handsome vampire based on the photos. Short ear-length curly black hair,
 * thin gold fashion glasses, sharp brows and glowing red eyes, a tall slim build, a high-collared cape with red lining,
 * a white cravat with a ruby brooch and a long coat. 24 x 32 px, mirrored + hand-built legs.
 */
const LOVER_PAL: Palette = {
  k: '#0a0610', h: '#121018', H: '#34303e', s: '#e8c2a6', S: '#c69c82', f: '#2a1a14', L: '#4a3a5a',
  e: '#ff3048', W: '#ffffff', c: '#16121e', C: '#3a3450', r: '#7a0e1c', R: '#c02030', w: '#ece8f0',
  g: '#ff2040', y: '#f0c040', p: '#120e18', b: '#060408', E: '#3a2216', l: '#d8c8d8', B: '#f0a0a0', G: '#1e1418',
};
const LOVER_HALF = [
  '............',
  '............',
  '............',
  '.......kkkkk',
  '.....kkhHhhh',
  '....khHhhHhh',
  '....khhHhhHh',
  '...khhHhhhHs',
  '...khHhhkkss',
  '.k..khhsGGGs',
  'rk.khhkGsesG',
  'rrk.kSksGGGs',
  'rRk...kssssS',
  'rRk...ksssss',
  'rRrk..kSsssk',
  'rRrk...kSsss',
  '.rRrk...kSss',
  '.rRrk...kSSS',
  '..rRrrkkwwww',
  '..krRrkcwwwg',
  '..kcrRkcCwww',
  '..kcrRkcCcww',
  '.kccrRkcCcck',
  '.kccrRkcCccy',
  '.kccrRkcCcck',
  'kcccrRkcCccy',
  'kcccrRkcCcck',
  'kccrRRkcCcck',
  'kcrRRRkcCcck',
  'krRRRk.kccpp',
  'kkkkk..kcppk',
];
const mirrorRows = (rows: string[]) => rows.map((r) => { const h = r.padEnd(12, '.').slice(0, 12); return h + h.split('').reverse().join(''); });
/** Legs below the cape (left leg at L, right leg at R). */
function loverLegs(L: number, R: number): string[] {
  const a = Array(24).fill('.'), b = Array(24).fill('.');
  for (const x of [L, R]) {
    a[x] = 'k'; a[x + 1] = 'p'; a[x + 2] = 'k';
    b[x] = 'k'; b[x + 1] = 'b'; b[x + 2] = 'k';
  }
  return [a.join(''), b.join('')];
}

/*
 * ปีศาจคีตะ (the queen): based on the photos. Long dark-brown hair with lighter brown ends,
 * see-through center-parted bangs, big dark eyes, fair skin and a mole on her left cheek.
 * Keeps her demon horns and crimson gown. 24 x 24 px mirrored.
 */
const QUEEN_PAL: Palette = {
  k: '#1a0f12', p: '#2e1c16', P: '#4e3022', h: '#7a5034', o: '#f0e6d6', O: '#b4a48e', s: '#f8dcc8',
  e: '#2a1018', w: '#ffffff', r: '#ff2a5a', b: '#ffaab8', l: '#d0506a', x: '#120812',
  g: '#8a1030', G: '#d0304a', y: '#f0c040', t: '#8ad8ff',
};
const QUEEN_MOLE: [number, number, string][] = [[16, 13, '#4a2a1e']];
const QUEEN_HALF = [
  '............',
  '.o..........',
  '.oO.........',
  '..oO........',
  '..oOO...kkkk',
  '...oOOkkpppp',
  '....kkpPPppp',
  '...kppPpppPp',
  '...kpppppppp',
  '..kppkspspsp',
  '..kppksseess',
  '..kppksswess',
  '..kppkbsssss',
  '..kppksssssl',
  '..kpppkkssss',
  '..kppppkxxxx',
  '..khppkGgggy',
  '.khhppkGgggg',
  '.khhpkskgGgg',
  '.khhpkskgggy',
  '.khhkkgggggg',
  '..kkgGgggggg',
  '.kgGgggggggg',
  '.kkkkkkkkkkk',
];

const KING_PAL: Palette = {
  k: '#1a1326', y: '#f0c040', Y: '#fff090', r: '#b02838', R: '#e05060', s: '#f2c6a0', e: '#1a1326',
  w: '#f4f0e8', W: '#c8c0b8', f: '#ffffff', g: '#40a0ff',
};
const KING_HALF = [
  '........',
  '...y..y.',
  '...yyyyy',
  '...yyYyg',
  '..kssss s'.replace(' ', ''),
  '..ksesss',
  '..kwssss',
  '..kwwwww',
  '...kwwww',
  '..krrwww',
  '.krRrrrw',
  '.krRrryr',
  '.kfrrrrr',
  '.kfrrrrr',
  '..kkkkkk',
  '........',
];

/* =========================================================================
 * ENEMIES (mirrored halves, 8 wide => 16 px)
 * ========================================================================= */

const SLIME_ROWS = [
  '........', '........', '........', '........', '........',
  '.....kkk', '...kkggg', '..kgGggg', '.kgGWggg', '.kggggeg',
  'kggggggg', 'kgdggggg', 'kgdddggg', '.kdddddd', '..kkkkkk', '........',
];
const BAT_UP = [
  '........', '........', '........', 'k.......', 'kb......', 'kbbk....', '.kbbk..k', '.kbbbkkb',
  '..kbbbeb', '...kbbbb', '....kkkb', '........', '........', '........', '........', '........',
];
const BAT_DOWN = [
  '........', '........', '........', '........', '........', '........', '......kk', '....kkbb',
  '..kkbbeb', '.kbbbbbb', 'kbbk.kkb', 'kbk.....', 'k.......', '........', '........', '........',
];
const SHROOM_ROWS = [
  '........', '........', '.....kkk', '...kkRRR', '..kRRRwR', '.kRwRRRR', '.kRRRRwR', 'kRRRRRRR',
  'kkkkkkkk', '...kcccc', '...kcecc', '...kcccc', '...kCccc', '..kCCccc', '..kkkkkk', '........',
];
const SKELETON_ROWS = [
  '........', '....kkkk', '...kwwww', '..kwwwww', '..kwkkww', '..kwkeww', '..kdwwww', '...kwkwk',
  '....kkkk', '...kwdwd', '..kwkwdw', '..kkwdwd', '...kkwww', '....kwkk', '...kwwk.', '........',
];
const ARCHER_ROWS = [
  '........', '....kkkk', '...khhhh', '..khHhhh', '..khkkww', '.khhkeww', '.khhwwww', '.khhkwkw',
  '.khhhkkk', '.khhkwdw', '.khkwkdw', '..kkkwdw', '...kkwww', '....kwkk', '...kwwk.', '........',
];
const MAGE_ROWS = [
  '........', '.......k', '......kp', '.....kpp', '....kppp', '...kppkk', '...kpkxx', '...kpkex',
  '...kppkk', '..kpPppp', '..kpPppy', '.kpPpppy', '.kpPpppp', 'kpPppppp', 'kkkkkkkk', '........',
];
const KNIGHT_ROWS = [
  '........', '..O.....', '..Ok....', '...Okkkk', '...kaaaa', '..kaAaaa', '..kakkkk', '..kakrkk',
  '..kaaaaa', '.kAAkaaa', 'kAAkaaar', 'kaakaaaa', '.kkaaaaa', '...kaaak', '...kkkk.', '........',
];
const IMP_ROWS = [
  '........', '........', '..k.....', '..Rk....', '...Rkkkk', '...krrrr', '..krRrrr', '..krryrr',
  '..krrrrr', 'kk.krkkr', 'kWk.krrr', 'kwWkkrrr', '.kwk.krr', '..k..krk', '.....kk.', '........',
];

/* =========================================================================
 * PUBLIC: build all character / enemy / item textures
 * ========================================================================= */

export function buildCharacterTextures(scene: Phaser.Scene) {
  // Hero frames
  const hero = (key: string, legs: string[], bob = 0, mod?: (rows: string[]) => string[]) => {
    let rows = [...HERO_TOP, ...legs];
    if (mod) rows = mod(rows);
    if (bob > 0) rows = ['................', ...rows.slice(0, 13), ...rows.slice(14)];
    makeSprite(scene, key, rows, HERO_PAL, { width: 16 });
  };
  hero('hero_idle0', LEGS.stand);
  hero('hero_idle1', LEGS.stand, 1);
  hero('hero_walk0', LEGS.fwd);
  hero('hero_walk1', LEGS.stand, 1);
  hero('hero_walk2', LEGS.back);
  hero('hero_walk3', LEGS.stand, 1);
  hero('hero_hurt', LEGS.wide, 0, (r) => { r[7] = '...kmmksxsxsk...'; return r; });
  hero('hero_dead', LEGS.wide, 0, (r) => { r[7] = '...kmmksxsxsk...'; r[8] = '...kdmkskkksk...'; return r; });
  // 't' = sweat drop
  HERO_PAL.t = '#8ad8ff';
  hero('hero_sweat', LEGS.stand, 0, (r) => { r[5] = '...kMmmmmmmmk.t.'; r[6] = '...kmmmkssssktt.'; return r; });
  // face crop for the HUD portrait
  const heroSrc = scene.textures.get('hero_idle0').getSourceImage() as HTMLCanvasElement;
  makeCanvas(scene, 'hero_face', 12, 11, (c) => c.drawImage(heroSrc, 2, 1, 12, 11, 0, 0, 12, 11));
  hero('hero_sad', LEGS.stand, 1, (r) => { r[7] = '...kmmksssksk...'; r[8] = '...kdmkssSSsk...'; return r; });

  // Lover frames (24x32): mirrored top + legs
  const lover = (key: string, legs: string[], mod?: (rows: string[]) => string[], bob = false) => {
    let top = [...LOVER_HALF];
    if (mod) top = mod(top);
    let rows = mirrorRows(top);
    if (bob) rows = ['.'.repeat(24), ...rows.slice(0, rows.length - 1)];
    makeSprite(scene, key, [...rows, ...legs], LOVER_PAL, { width: 24 });
  };
  lover('lover_idle0', loverLegs(9, 12));
  lover('lover_idle1', loverLegs(9, 12), undefined, true);
  lover('lover_walk0', loverLegs(8, 13));
  lover('lover_walk1', loverLegs(9, 12), undefined, true);
  lover('lover_walk2', loverLegs(10, 12));
  // a warm smile that shows his fangs
  // eyes turn back to normal (warm brown, clear lenses) and he blushes a little
  const soft = (r: string[]) => { r[10] = 'rk.khhkGsEsG'; r[12] = 'rRk...ksBssS'; return r; };
  lover('lover_soft', loverLegs(9, 12), soft);
  lover('lover_happy', loverLegs(9, 12), (r) => { soft(r); r[14] = 'rRrk..kSssks'; r[15] = 'rRrk...kSssw'; return r; });
  // glasses catching the light
  lover('lover_glare', loverLegs(9, 12), (r) => { r[10] = 'rk.khhkGWWWG'; return r; });

  // Queen frames (24x24 mirrored)
  const queen = (key: string, mod?: (rows: string[]) => string[]) => {
    let rows = [...QUEEN_HALF];
    if (mod) rows = mod(rows);
    makeSprite(scene, key, rows, QUEEN_PAL, { mirror: true, patch: QUEEN_MOLE });
  };
  queen('queen_idle0');
  queen('queen_idle1', (r) => ['............', ...r.slice(0, 19), ...r.slice(20)]);
  queen('queen_cast', (r) => {
    r[15] = 's.kppppkxxxx'; r[16] = 'skhppkGggggy'; r[18] = '.khhpkkgGggg'; r[19] = '.khhpkkggggy';
    r[10] = '..kppkssrrss';
    return r;
  });
  queen('queen_cry', (r) => { r[10] = '..kppksskkss'; r[11] = '..kppksstsss'; r[12] = '..kppkbstsss'; return r; });
  queen('queen_blush', (r) => { r[10] = '..kppksskkss'; r[11] = '..kppkbbssss'; return r; });
  queen('queen_shock', (r) => { r[10] = '..kppkseeess'; r[11] = '..kppksewess'; r[13] = '..kppksssssk'; return r; });

  // King
  makeSprite(scene, 'king', KING_HALF, KING_PAL, { mirror: true });

  // ---------- enemies ----------
  makeSprite(scene, 'slime', SLIME_ROWS, { k: '#14261a', g: '#4cc04c', G: '#9ef09e', W: '#ffffff', d: '#2a7a3a', e: '#14261a' }, { mirror: true });
  makeSprite(scene, 'slime_blue', SLIME_ROWS, { k: '#101a2e', g: '#4c8ae0', G: '#a0d0ff', W: '#ffffff', d: '#2a4a9a', e: '#101a2e' }, { mirror: true });
  makeSprite(scene, 'slime_king', SLIME_ROWS, { k: '#14261a', g: '#58d058', G: '#b0ffb0', W: '#ffffff', d: '#2a8a3a', e: '#601020' }, { mirror: true });
  const batPal = { k: '#1a1020', b: '#5a3a7a', B: '#8a6ab0', e: '#ff4040' };
  makeSprite(scene, 'bat0', BAT_UP, batPal, { mirror: true });
  makeSprite(scene, 'bat1', BAT_DOWN, batPal, { mirror: true });
  const wispPal = { k: '#203038', b: '#7ab0c0', B: '#c0f0ff', e: '#ffffff' };
  makeSprite(scene, 'wisp0', BAT_UP, wispPal, { mirror: true });
  makeSprite(scene, 'wisp1', BAT_DOWN, wispPal, { mirror: true });
  makeSprite(scene, 'shroom', SHROOM_ROWS, { k: '#2a1010', R: '#d83a3a', w: '#fff0e0', c: '#f0dcb0', e: '#2a1010', C: '#c8b088' }, { mirror: true });
  makeSprite(scene, 'skeleton', SKELETON_ROWS, { k: '#1a1418', w: '#ece6d6', d: '#a8a090', e: '#ff4040' }, { mirror: true });
  makeSprite(scene, 'warden', SKELETON_ROWS, { k: '#1a1418', w: '#d8d0f0', d: '#8a80b0', e: '#60ffd0' }, { mirror: true });
  makeSprite(scene, 'archer', ARCHER_ROWS, { k: '#1a1418', w: '#ece6d6', d: '#a8a090', e: '#ff4040', h: '#3a5a3a', H: '#5a8a4a' }, { mirror: true });
  makeSprite(scene, 'mage', MAGE_ROWS, { k: '#120a1a', p: '#4a2a7a', P: '#7a4ab0', x: '#08040c', e: '#ffe040', y: '#f0c040' }, { mirror: true });
  makeSprite(scene, 'knight', KNIGHT_ROWS, { k: '#120808', a: '#4a2a32', A: '#7a4a52', O: '#e8dcc8', r: '#ff3040' }, { mirror: true });
  makeSprite(scene, 'imp', IMP_ROWS, { k: '#1a0808', r: '#c83030', R: '#ff6060', y: '#ffe040', W: '#6a2a4a', w: '#9a4a6a' }, { mirror: true });

  // crown accessory for mini-bosses
  makeSprite(scene, 'crown', ['.y..y..y.', '.yy.y.yy.', '.yyyyyyy.', '.yrryggy.'.replace('gg', 'yy')], { y: '#f0c040', r: '#e04848', g: '#40a0ff' });
}

export function buildItemTextures(scene: Phaser.Scene) {
  // Heart pickup
  makeSprite(scene, 'heart', ['.kk.', 'kRrk', 'kRrr', 'krrr', '.krr', '..kr', '...k'], { k: '#2a0a10', R: '#ffb0b0', r: '#e03040' }, { mirror: true });
  makeSprite(scene, 'heart_small', ['.kk.', 'kRrk', 'krrr', '.krr', '..kk'], { k: '#2a0a10', R: '#ffb0b0', r: '#ff5a8a' }, { mirror: true });
  makeSprite(scene, 'heart_px', ['.r.', 'rrr', '.rr', '..r'].map((r) => r), { r: '#ffffff' }, { mirror: true });

  // Chests
  const chestPal = { k: '#1a1010', b: '#8a5a2a', B: '#b07a3a', y: '#f0c040', Y: '#fff090', d: '#5a3a1a', x: '#2a1810' };
  makeSprite(scene, 'chest', [
    '........', '........', '..kkkkkk', '.kBBBBBB', 'kBbbbbbb', 'kbbbbbbb', 'kkkkkkky', 'kbbbbbyY',
    'kbbbbbbb', 'kdbbbbbb', 'kddddddd', 'kkkkkkkk',
  ], chestPal, { mirror: true });
  makeSprite(scene, 'chest_open', [
    '..kkkkkk', '.kBBBBBB', 'kBbbbbbb', 'kkkkkkkk', 'kxxxxxxx', 'kxYxxYxY', 'kkkkkkky', 'kbbbbbyY',
    'kbbbbbbb', 'kdbbbbbb', 'kddddddd', 'kkkkkkkk',
  ], chestPal, { mirror: true });

  // Sign / scroll note
  makeSprite(scene, 'note', [
    '.kkkkkkkkkk.', 'kwwwwwwwwwwk', 'kwkkkwkkkwwk', 'kwwwwwwwwwwk', 'kwkkwkkkkwwk', 'kwwwwwwwwwwk',
    'kwkkkkwkkwwk', 'kwwwwwwwwwwk', '.kkkkkkkkkk.', '.....kk.....', '.....kk.....', '....kkkk....',
  ], { k: '#3a2410', w: '#f0e0b0' });

  // Weapons (pointing right; origin set at grip by WeaponDef)
  const wk = { k: '#1a1326', b: '#6a4a2a', B: '#9a6a3a', y: '#f0c040', Y: '#fff090', M: '#eef2f8', m: '#a8b4c4', g: '#5a6070', G: '#a0a8b8', p: '#b060ff', P: '#e8c0ff', c: '#60e0ff', C: '#c8faff', w: '#ffffff', s: '#e8e0c8', r: '#e04848' };
  makeSprite(scene, 'w_sword', [
    '..k' + R('.', 13),
    '.kyk.' + R('k', 9) + '..',
    'kbby' + R('M', 11) + 'k',
    'kbby' + R('m', 10) + 'k.',
    '.kyk.' + R('k', 9) + '..',
    '..k' + R('.', 13),
  ], wk);
  makeSprite(scene, 'w_legend', [
    '...k' + R('.', 16),
    '..kyk.' + R('k', 12) + '..',
    '.kyYyk' + R('C', 12) + 'k.',
    'kbbpyC' + R('w', 13) + 'k',
    '.kyYyk' + R('c', 12) + 'k.',
    '..kyk.' + R('k', 12) + '..',
    '...k' + R('.', 16),
  ], wk);
  makeSprite(scene, 'w_staff', [
    R('.', 14) + 'kkk.',
    R('.', 13) + 'kpPpk',
    R('.', 12) + 'kpPwPpk'.slice(0, 6),
    'k' + R('B', 12) + 'kpPPpk'.slice(0, 5),
    'k' + R('b', 12) + 'kpppk'.slice(0, 5),
    R('.', 13) + 'kppk.',
    R('.', 14) + 'kk..',
  ], wk);
  makeSprite(scene, 'w_pistol', [
    '.kkkkkkkkk', 'kGGGGGGGGk', 'kggggggggk', 'kbbkkkkkk.', 'kbbk......', 'kBbk......', '.kk.......',
  ], wk);
  makeSprite(scene, 'w_shotgun', [
    R('.', 6) + R('k', 12),
    'kkkkkk' + R('G', 11) + 'k',
    'kBBBBk' + R('g', 11) + 'k',
    'kbbbbkkk' + R('b', 4) + R('k', 6),
    '.kbbk' + R('.', 13),
    '..kk' + R('.', 14),
  ], wk);
  makeSprite(scene, 'w_crossbow', [
    '........kk....', '........kBk...', '.......skbk...', '......s.kbk...', 'kkkkkkkkkkkkkk',
    'kbbbbbbbggggwk', 'kkkkkkkkkkkkkk', '......s.kbk...', '.......skbk...', '........kBk...', '........kk....',
  ], wk);
}

/* =========================================================================
 * EFFECTS / PROJECTILES / UI
 * ========================================================================= */

export function buildEffectTextures(scene: Phaser.Scene) {
  makeCanvas(scene, 'px', 2, 2, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 2, 2); });
  makeCanvas(scene, 'px1', 1, 1, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 1, 1); });
  makeCanvas(scene, 'glow', 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  });
  makeCanvas(scene, 'shadow', 14, 6, (c) => {
    c.fillStyle = 'rgba(0,0,0,0.35)';
    for (let y = 0; y < 6; y++) for (let x = 0; x < 14; x++) {
      const dx = (x - 6.5) / 7, dy = (y - 2.5) / 3;
      if (dx * dx + dy * dy <= 1) c.fillRect(x, y, 1, 1);
    }
  });
  makeCanvas(scene, 'circle', 64, 64, (c) => pixCircle(c, 32, 32, 31, '#ffffff'));
  makeCanvas(scene, 'ring', 64, 64, (c) => pixRing(c, 32, 32, 31, 3, '#ffffff'));
  makeCanvas(scene, 'slash', 40, 40, (c) => {
    // crescent: big circle minus offset circle
    for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
      const d1 = Math.hypot(x - 20, y - 20), d2 = Math.hypot(x - 14, y - 20);
      if (d1 <= 19 && d2 > 17 && x > 18) {
        const a = Math.min(1, (d1 - 10) / 9);
        c.fillStyle = `rgba(255,255,255,${0.35 + a * 0.65})`;
        c.fillRect(x, y, 1, 1);
      }
    }
  });
  makeCanvas(scene, 'spark', 7, 7, (c) => {
    c.fillStyle = '#fff';
    c.fillRect(3, 0, 1, 7); c.fillRect(0, 3, 7, 1); c.fillRect(2, 2, 3, 3);
  });
  makeCanvas(scene, 'smoke', 12, 12, (c) => pixCircle(c, 6, 6, 5, '#ffffff'));
  makeCanvas(scene, 'tear', 3, 4, (c) => { c.fillStyle = '#8ad8ff'; c.fillRect(1, 0, 1, 1); c.fillRect(0, 1, 3, 3); c.fillStyle = '#fff'; c.fillRect(0, 1, 1, 1); });
  makeCanvas(scene, 'muzzle', 9, 9, (c) => {
    c.fillStyle = '#fff6a0'; c.fillRect(4, 0, 1, 9); c.fillRect(0, 4, 9, 1); c.fillRect(2, 2, 5, 5);
    c.fillStyle = '#ffffff'; c.fillRect(3, 3, 3, 3);
  });
  makeCanvas(scene, 'beam', 16, 16, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 16, 16); });

  // Projectiles
  const orb = (key: string, r: number, outer: string, inner: string, core = '#ffffff') =>
    makeCanvas(scene, key, r * 2 + 2, r * 2 + 2, (c) => {
      pixCircle(c, r + 1, r + 1, r, outer);
      pixCircle(c, r + 1, r + 1, Math.max(1, r - 2), inner);
      pixCircle(c, r + 0.5, r + 0.5, Math.max(0, r - 4), core);
    });
  orb('b_bullet', 2, '#c08020', '#ffe060');
  orb('b_orb', 4, '#3080ff', '#80e0ff');
  orb('b_pellet', 2, '#c05020', '#ffb040');
  orb('e_orb', 4, '#a01030', '#ff5070');
  orb('e_spore', 3, '#4a8a2a', '#b0f060');
  orb('e_slime', 4, '#2a7a3a', '#7ee07a');
  orb('e_magic', 4, '#5a2090', '#c080ff');
  orb('q_orb', 5, '#80104a', '#ff40a0');
  orb('q_big', 8, '#60103a', '#ff3080', '#ffd0e8');
  makeCanvas(scene, 'b_bolt', 12, 3, (c) => {
    c.fillStyle = '#6a4a2a'; c.fillRect(0, 1, 9, 1);
    c.fillStyle = '#e0e8f0'; c.fillRect(9, 0, 3, 3);
    c.fillStyle = '#e04848'; c.fillRect(0, 0, 2, 3);
  });
  makeCanvas(scene, 'e_arrow', 12, 3, (c) => {
    c.fillStyle = '#d8d0c0'; c.fillRect(0, 1, 9, 1);
    c.fillStyle = '#ff6060'; c.fillRect(9, 0, 3, 3);
    c.fillStyle = '#80a060'; c.fillRect(0, 0, 2, 3);
  });
  makeCanvas(scene, 'e_bone', 10, 5, (c) => {
    c.fillStyle = '#ece6d6'; c.fillRect(2, 2, 6, 1);
    c.fillRect(0, 0, 3, 2); c.fillRect(0, 3, 3, 2); c.fillRect(7, 0, 3, 2); c.fillRect(7, 3, 3, 2);
  });
  makeCanvas(scene, 'q_petal', 9, 9, (c) => {
    c.fillStyle = '#ff4080';
    [[2, 0], [6, 0]].forEach(([x]) => c.fillRect(x - 1, 1, 3, 3));
    c.fillRect(0, 2, 9, 3); c.fillRect(1, 5, 7, 1); c.fillRect(2, 6, 5, 1); c.fillRect(3, 7, 3, 1); c.fillRect(4, 8, 1, 1);
    c.fillStyle = '#ffc0d8'; c.fillRect(2, 2, 2, 1);
  });
  makeCanvas(scene, 'b_wave', 14, 24, (c) => {
    for (let y = 0; y < 24; y++) for (let x = 0; x < 14; x++) {
      const d1 = Math.hypot(x + 6, y - 12), d2 = Math.hypot(x + 10, y - 12);
      if (d1 <= 19 && d2 > 19) { c.fillStyle = x > 9 ? '#ffffff' : '#80f0ff'; c.fillRect(x, y, 1, 1); }
    }
  });

  // Buff orbs
  const buff = (key: string, col: string, glyph: (c: CanvasRenderingContext2D) => void) =>
    makeCanvas(scene, key, 14, 14, (c) => {
      pixCircle(c, 7, 7, 6, '#1a1326');
      pixCircle(c, 7, 7, 5, col);
      c.fillStyle = '#ffffff';
      glyph(c);
    });
  buff('buff_rage', '#e04040', (c) => { c.fillRect(6, 3, 2, 5); c.fillRect(6, 9, 2, 2); });
  buff('buff_haste', '#40c0ff', (c) => { c.fillRect(4, 4, 2, 2); c.fillRect(6, 6, 2, 2); c.fillRect(4, 8, 2, 2); c.fillRect(8, 4, 2, 2); c.fillRect(10, 6, 1, 2); c.fillRect(8, 8, 2, 2); });
  buff('buff_shield', '#f0c040', (c) => { c.fillRect(4, 4, 6, 4); c.fillRect(5, 8, 4, 1); c.fillRect(6, 9, 2, 1); });

  // Portal
  makeCanvas(scene, 'portal', 32, 32, (c) => {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const dx = x - 15.5, dy = (y - 15.5) * 1.15;
      const d = Math.hypot(dx, dy);
      if (d > 15) continue;
      const a = Math.atan2(dy, dx);
      const swirl = Math.sin(a * 3 + d * 0.6);
      const col = d > 13 ? '#2a1050' : swirl > 0.3 ? '#c080ff' : swirl > -0.3 ? '#7a40d0' : '#40208a';
      c.fillStyle = d < 3 ? '#ffffff' : col;
      c.fillRect(x, y, 1, 1);
    }
  });

  // Summon circle (telegraph for spawns)
  makeCanvas(scene, 'summon', 32, 32, (c) => {
    pixRing(c, 16, 16, 15, 1, '#ffffff');
    pixRing(c, 16, 16, 10, 1, '#ffffff');
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      for (let t = 10; t <= 15; t++) c.fillRect(Math.round(16 + Math.cos(a) * t), Math.round(16 + Math.sin(a) * t), 1, 1);
    }
  });

  // Emote bubbles
  const bubble = (key: string, glyph: (c: CanvasRenderingContext2D) => void) =>
    makeCanvas(scene, key, 15, 15, (c) => {
      c.fillStyle = '#1a1326'; c.fillRect(1, 0, 13, 12); c.fillRect(0, 1, 15, 10); c.fillRect(5, 12, 4, 1); c.fillRect(6, 13, 2, 1);
      c.fillStyle = '#ffffff'; c.fillRect(1, 1, 13, 10); c.fillRect(6, 11, 2, 1);
      glyph(c);
    });
  bubble('emote_excl', (c) => { c.fillStyle = '#e04848'; c.fillRect(6, 2, 3, 5); c.fillRect(6, 8, 3, 2); });
  bubble('emote_q', (c) => { c.fillStyle = '#3a6bd6'; c.fillRect(5, 2, 5, 1); c.fillRect(9, 3, 1, 2); c.fillRect(7, 5, 2, 1); c.fillRect(7, 6, 1, 1); c.fillRect(7, 8, 1, 2); });
  bubble('emote_dots', (c) => { c.fillStyle = '#1a1326'; c.fillRect(3, 6, 2, 2); c.fillRect(7, 6, 2, 2); c.fillRect(11, 6, 2, 2); });
  bubble('emote_heart', (c) => {
    c.fillStyle = '#ff4080';
    c.fillRect(3, 3, 3, 2); c.fillRect(9, 3, 3, 2); c.fillRect(2, 4, 11, 3); c.fillRect(3, 7, 9, 1); c.fillRect(4, 8, 7, 1); c.fillRect(6, 9, 3, 1);
  });

  // Gravestone for the ending
  makeSprite(scene, 'tombstone', [
    '...kkkk...'.slice(0, 5), '..kgggg', '.kgGGgg', '.kgGgkg', 'kggkkkg', 'kgggkgg', 'kgggkgg', 'kgggggg', 'kgggggg', 'kkkkkkk',
  ], { k: '#1a1418', g: '#7a7a8a', G: '#a8a8b8' }, { mirror: true });

  // Bouquet
  makeSprite(scene, 'bouquet', [
    '.r.y.p.', 'rRrypPp', '.rgygp.', '..ggg..', '...g...', '..kgk..', '...g...',
  ], { r: '#e04060', R: '#ff90a0', y: '#ffe060', p: '#c080ff', P: '#f0d0ff', g: '#4caf50', k: '#ff7ab0' });

  // Trophy
  makeSprite(scene, 'trophy', [
    'kkkkkkk', 'kyyyyyy', 'kyYyyyy', 'kyYyyyy', '.kyyyyy', '..kyyyy', '...kkyy', '....kyy', '...kkyy', '..kyyyy', '..kkkkk',
  ], { k: '#5a3a10', y: '#f0c040', Y: '#fff6b0' }, { mirror: true });
}
