import Phaser from 'phaser';
import { makeCanvas, makeSprite, pixCircle, pixRing } from './PixelArt';
import { RNG } from '../utils/rng';
import { T, TILE } from '../game/constants';

interface TilePalette {
  floor: string[]; // base, dark speckle, light speckle
  deco: string[]; // decoration colors
  corridor: string[];
  wallTop: string[]; // base, dark, light
  wallFace: string[]; // brick, mortar, shade, highlight
  block: string[];
  door: string[];
  carpet: string[];
  style: 'grass' | 'stone' | 'checker';
}

const PALETTES: TilePalette[] = [
  {
    style: 'grass',
    floor: ['#3f7a3a', '#346a30', '#4c8c44'],
    deco: ['#ff8ab0', '#ffe060', '#ffffff', '#6aa85a'],
    corridor: ['#7a6040', '#6a5236', '#8a7050'],
    wallTop: ['#26452a', '#1c3420', '#3c6a3a'],
    wallFace: ['#5a5a48', '#3a3a30', '#2a2a22', '#7a7a60'],
    block: ['#5a3a22', '#3a2414', '#7a5232'],
    door: ['#8a5a2a', '#4a2a10'],
    carpet: ['#3f7a3a', '#3f7a3a', '#3f7a3a'],
  },
  {
    style: 'stone',
    floor: ['#4a4a5c', '#3c3c4c', '#5a5a6e'],
    deco: ['#ece6d6', '#5a7a4a', '#2a2a36', '#8a8aa0'],
    corridor: ['#4a4038', '#3c342c', '#5a5046'],
    wallTop: ['#22223a', '#18182a', '#34345a'],
    wallFace: ['#3e3e58', '#26263a', '#1c1c2c', '#5a5a7a'],
    block: ['#6a6a7a', '#3a3a48', '#8a8a9a'],
    door: ['#7a7a8a', '#2a2a36'],
    carpet: ['#4a4a5c', '#4a4a5c', '#4a4a5c'],
  },
  {
    style: 'checker',
    floor: ['#3a2238', '#2e1a2e', '#4a2c48'],
    deco: ['#ff4060', '#9a4ad6', '#f0c040', '#1a0a1a'],
    corridor: ['#2a1828', '#22121f', '#3a2236'],
    wallTop: ['#1c0c20', '#120614', '#2e1834'],
    wallFace: ['#4a2440', '#2a1026', '#1a0818', '#6a3460'],
    block: ['#5a3050', '#30142a', '#7a4a70'],
    door: ['#c03040', '#3a0a14'],
    carpet: ['#8a1830', '#6a1024', '#f0c040'],
  },
];

export function buildTilesets(scene: Phaser.Scene) {
  PALETTES.forEach((p, i) => buildTileset(scene, `tiles_${i}`, p, i * 977 + 13));
}

function buildTileset(scene: Phaser.Scene, key: string, p: TilePalette, seed: number) {
  const rng = new RNG(seed);
  makeCanvas(scene, key, TILE * 16, TILE, (c) => {
    const px = (ox: number, x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(ox + x, y, 1, 1); };
    const fill = (ox: number, col: string) => { c.fillStyle = col; c.fillRect(ox, 0, TILE, TILE); };

    const floor = (idx: number, deco: boolean) => {
      const ox = idx * TILE;
      fill(ox, p.floor[0]);
      if (p.style === 'grass') {
        // soft patches of lighter / darker grass instead of noisy speckles
        for (let n = 0; n < 3; n++) {
          c.fillStyle = rng.chance(0.5) ? p.floor[1] : p.floor[2];
          const x = rng.int(0, 12), y = rng.int(0, 13), w = rng.int(3, 5);
          c.fillRect(ox + x + 1, y, w - 2, 1); c.fillRect(ox + x, y + 1, w, 1); c.fillRect(ox + x + 1, y + 2, w - 2, 1);
        }
        for (let n = 0; n < 7; n++) px(ox, rng.int(0, 15), rng.int(0, 15), p.floor[rng.chance(0.5) ? 1 : 2]);
        // little grass blades with a shadow
        for (let n = 0; n < 4; n++) {
          const x = rng.int(1, 13), y = rng.int(2, 14);
          px(ox, x, y, '#62aa52'); px(ox, x, y - 1, '#62aa52'); px(ox, x + 1, y, p.floor[1]);
        }
        if (deco) {
          for (let n = 0; n < 3; n++) {
            const x = rng.int(2, 13), y = rng.int(2, 13), col = p.deco[rng.int(0, 2)];
            px(ox, x, y, col); px(ox, x - 1, y, col); px(ox, x + 1, y, col); px(ox, x, y - 1, col); px(ox, x, y + 1, col); px(ox, x, y, '#ffe060');
          }
        }
      } else if (p.style === 'stone') {
        c.fillStyle = p.floor[1];
        c.fillRect(ox, 15, 16, 1); c.fillRect(ox + 15, 0, 1, 16);
        c.fillRect(ox, 7, 8, 1); c.fillRect(ox + 7, 0, 1, 7);
        c.fillStyle = p.floor[2]; c.fillRect(ox, 0, 15, 1); c.fillRect(ox, 8, 8, 1);
        for (let n = 0; n < 10; n++) px(ox, rng.int(0, 14), rng.int(0, 14), p.floor[rng.chance(0.5) ? 1 : 2]);
        if (deco) {
          if (rng.chance(0.5)) { // crack
            let x = rng.int(3, 12), y = rng.int(3, 12);
            for (let n = 0; n < 6; n++) { px(ox, x, y, p.deco[2]); x += rng.int(-1, 1); y += 1; }
          } else { // moss / bone
            for (let n = 0; n < 6; n++) px(ox, rng.int(3, 12), rng.int(3, 12), p.deco[1]);
            const bx = rng.int(3, 10), by = rng.int(4, 11);
            c.fillStyle = p.deco[0]; c.fillRect(ox + bx, by, 4, 1); c.fillRect(ox + bx - 1, by - 1, 1, 1); c.fillRect(ox + bx + 4, by + 1, 1, 1);
          }
        }
      } else {
        // checker
        const dark = idx % 2 === 0;
        fill(ox, dark ? p.floor[1] : p.floor[0]);
        c.fillStyle = dark ? p.floor[0] : p.floor[1];
        c.fillRect(ox, 0, 8, 8); c.fillRect(ox + 8, 8, 8, 8);
        c.fillStyle = p.floor[2]; c.fillRect(ox, 0, 16, 1); c.fillRect(ox, 0, 1, 16);
        if (deco) {
          if (idx === 5) {
            // a faint, rare rune
            c.fillStyle = '#5a2a6a';
            c.fillRect(ox + 6, 5, 4, 1); c.fillRect(ox + 5, 6, 1, 4); c.fillRect(ox + 10, 6, 1, 4); c.fillRect(ox + 6, 10, 4, 1);
            c.fillStyle = '#8a4aa0'; c.fillRect(ox + 7, 7, 2, 2);
          } else {
            // cracked tile
            c.fillStyle = '#1a0c18';
            let x = rng.int(3, 12), y = rng.int(1, 4);
            for (let n = 0; n < 9; n++) { c.fillRect(ox + x, y, 1, 1); x += rng.int(-1, 1); y += 1; if (n === 4) c.fillRect(ox + x + 1, y, 2, 1); }
            c.fillStyle = p.floor[2]; c.fillRect(ox + rng.int(2, 12), rng.int(2, 12), 2, 1);
          }
        }
        // subtle bevel on every tile
        c.fillStyle = '#00000033'; c.fillRect(ox + 15, 1, 1, 15); c.fillRect(ox + 1, 15, 15, 1);
      }
    };
    for (let i = 1; i <= 4; i++) floor(i, false);
    for (let i = 5; i <= 7; i++) floor(i, true);

    // corridor
    {
      const ox = T.CORRIDOR * TILE;
      fill(ox, p.corridor[0]);
      for (let n = 0; n < 26; n++) px(ox, rng.int(0, 15), rng.int(0, 15), p.corridor[rng.chance(0.5) ? 1 : 2]);
    }
    // carpet
    {
      const ox = T.CARPET * TILE;
      fill(ox, p.carpet[0]);
      for (let n = 0; n < 12; n++) px(ox, rng.int(0, 15), rng.int(0, 15), p.carpet[1]);
      const ox2 = T.CARPET_EDGE * TILE;
      fill(ox2, p.carpet[0]);
      c.fillStyle = p.carpet[2]; c.fillRect(ox2, 2, 16, 2); c.fillRect(ox2, 12, 16, 2);
      for (let x = 0; x < 16; x += 4) c.fillRect(ox2 + x, 6, 2, 4);
    }
    // wall top
    {
      const ox = T.WALL * TILE;
      fill(ox, p.wallTop[0]);
      if (p.style === 'grass') {
        // dense hedge: leaf clumps with a lit top and a dark underside
        for (let n = 0; n < 9; n++) {
          const x = rng.int(0, 13), y = rng.int(0, 13);
          c.fillStyle = p.wallTop[1]; c.fillRect(ox + x, y + 1, 4, 2);
          c.fillStyle = p.wallTop[2]; c.fillRect(ox + x + 1, y, 2, 2);
          c.fillStyle = '#5a8a4a'; c.fillRect(ox + x + 1, y, 1, 1);
        }
      } else {
        // large stone slabs with seams and lit edges
        c.fillStyle = p.wallTop[1];
        c.fillRect(ox, 7, 16, 1); c.fillRect(ox + 7, 0, 1, 7); c.fillRect(ox + 3, 8, 1, 8); c.fillRect(ox + 12, 8, 1, 8);
        c.fillStyle = p.wallTop[2];
        c.fillRect(ox, 0, 7, 1); c.fillRect(ox + 8, 0, 8, 1); c.fillRect(ox, 8, 3, 1); c.fillRect(ox + 4, 8, 8, 1); c.fillRect(ox + 13, 8, 3, 1);
        for (let n = 0; n < 10; n++) px(ox, rng.int(0, 15), rng.int(0, 15), p.wallTop[rng.chance(0.7) ? 1 : 2]);
      }
    }
    // wall face (bricks)
    const bricks = (ox: number, cols: string[]) => {
      fill(ox, cols[0]);
      c.fillStyle = cols[1];
      for (let row = 0; row < 4; row++) {
        const y = row * 4;
        c.fillRect(ox, y + 3, 16, 1);
        const off = row % 2 === 0 ? 0 : 4;
        for (let x = off; x < 16; x += 8) c.fillRect(ox + x, y, 1, 3);
      }
      c.fillStyle = cols[3]; c.fillRect(ox, 0, 16, 1);
      c.fillStyle = cols[2]; c.fillRect(ox, 13, 16, 3);
      for (let n = 0; n < 8; n++) px(ox, rng.int(0, 15), rng.int(0, 12), cols[3]);
    };
    bricks(T.WALL_FACE * TILE, p.wallFace);
    if (p.style === 'grass') {
      // moss drips
      const ox = T.WALL_FACE * TILE;
      for (let n = 0; n < 6; n++) { const x = rng.int(0, 15); c.fillStyle = '#3c6a3a'; c.fillRect(ox + x, 0, 1, rng.int(1, 5)); }
    }
    // block top + face
    {
      const ox = T.BLOCK * TILE;
      const fx = T.BLOCK_FACE * TILE;
      if (p.style === 'grass') {
        // TOP: tree stump with growth rings on a moss base
        fill(ox, '#2a4a28');
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
          const d = Math.hypot(x - 7.5, y - 7.5);
          if (d > 7.2) continue;
          c.fillStyle = d > 6 ? '#4a2c14' : Math.floor(d) % 2 === 0 ? '#b07a44' : '#94643a';
          c.fillRect(ox + x, y, 1, 1);
        }
        c.fillStyle = '#d09a5a'; c.fillRect(ox + 7, 7, 2, 2);
        // FACE: bark with vertical grooves and moss at the base
        fill(fx, '#5a3a20');
        c.fillStyle = '#3e2614';
        for (let x = 1; x < 16; x += 3) c.fillRect(fx + x, 0, 1, 16);
        c.fillStyle = '#7a5230'; for (let x = 2; x < 16; x += 3) c.fillRect(fx + x, 0, 1, 12);
        c.fillStyle = '#3c6a3a'; c.fillRect(fx, 13, 16, 3);
        c.fillStyle = '#5a9a4a'; for (let x = 0; x < 16; x += 2) c.fillRect(fx + x, 12 + (x % 4 === 0 ? 0 : 1), 1, 1);
      } else if (p.style === 'stone') {
        // TOP: stone sarcophagus lid with an engraved cross
        fill(ox, p.block[0]);
        c.fillStyle = p.block[2]; c.fillRect(ox + 1, 1, 14, 1); c.fillRect(ox + 1, 1, 1, 14);
        c.fillStyle = p.block[1]; c.fillRect(ox + 1, 14, 14, 1); c.fillRect(ox + 14, 1, 1, 14);
        c.fillStyle = p.block[1]; c.fillRect(ox + 7, 3, 2, 10); c.fillRect(ox + 4, 6, 8, 2);
        c.fillStyle = '#5a7a4a'; c.fillRect(ox + 2, 12, 3, 2); c.fillRect(ox + 12, 2, 2, 1);
        // FACE: carved slab
        fill(fx, p.block[1]);
        c.fillStyle = p.block[0]; c.fillRect(fx + 2, 2, 12, 10);
        c.fillStyle = p.block[2]; c.fillRect(fx + 2, 2, 12, 1);
        c.fillStyle = '#2a2a36'; c.fillRect(fx + 5, 5, 6, 1); c.fillRect(fx + 5, 8, 6, 1);
        c.fillStyle = '#00000066'; c.fillRect(fx, 13, 16, 3);
      } else {
        // TOP: pillar capital with a gold ring
        fill(ox, '#1c0c20');
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
          const d = Math.hypot(x - 7.5, y - 7.5);
          if (d > 7.4) continue;
          c.fillStyle = d > 6.2 ? '#c0902a' : d > 5.2 ? '#f0c040' : d < 2 ? p.block[2] : p.block[0];
          c.fillRect(ox + x, y, 1, 1);
        }
        // FACE: fluted column with a gold band
        fill(fx, p.block[0]);
        c.fillStyle = p.block[1]; for (let x = 1; x < 16; x += 4) c.fillRect(fx + x, 0, 1, 16);
        c.fillStyle = p.block[2]; for (let x = 3; x < 16; x += 4) c.fillRect(fx + x, 0, 1, 16);
        c.fillStyle = '#f0c040'; c.fillRect(fx, 1, 16, 2);
        c.fillStyle = '#a07020'; c.fillRect(fx, 3, 16, 1);
        c.fillStyle = '#00000066'; c.fillRect(fx, 13, 16, 3);
      }
    }
    // door (bars)
    {
      const ox = T.DOOR * TILE;
      fill(ox, p.door[1]);
      c.fillStyle = p.door[0];
      for (let x = 1; x < 16; x += 4) c.fillRect(ox + x, 0, 2, 16);
      c.fillRect(ox, 2, 16, 2); c.fillRect(ox, 12, 16, 2);
      c.fillStyle = '#ffffff55';
      for (let x = 1; x < 16; x += 4) c.fillRect(ox + x, 0, 1, 16);
    }
    // void
    // void stays transparent so the stage backdrop shows through
  });
}

/** Decorative props per stage plus shared ones. */
export function buildPropTextures(scene: Phaser.Scene) {
  // torch (2 frames)
  for (let f = 0; f < 2; f++) {
    makeCanvas(scene, `torch${f}`, 8, 14, (c) => {
      c.fillStyle = '#5a3a1a'; c.fillRect(3, 7, 2, 7);
      c.fillStyle = '#8a8a9a'; c.fillRect(2, 7, 4, 2);
      c.fillStyle = '#ff6020'; c.fillRect(2, 2 + f, 4, 5 - f);
      c.fillStyle = '#ffc040'; c.fillRect(3, 3 + f, 2, 3 - f);
      c.fillStyle = '#fff6c0'; c.fillRect(3, 5, 2, 1);
      if (f === 0) { c.fillStyle = '#ff6020'; c.fillRect(3, 0, 1, 2); } else { c.fillStyle = '#ff6020'; c.fillRect(4, 1, 1, 1); }
    });
  }
  // forest
  makeSprite(scene, 'bush', ['....kkk', '..kkGGg', '.kGGggg', 'kGgggrg', 'kggrggg', 'kgggggg', '.kddddd', '..kkkkk'],
    { k: '#14261a', G: '#7ac06a', g: '#3f8a3a', d: '#2a5a2a', r: '#ff5a7a' }, { mirror: true });
  makeSprite(scene, 'mushrooms', ['.rr......', 'rwrr.....', '.cc..rr..', '.cc.rwrr.', '.....cc..', '.....cc..'],
    { r: '#e04848', w: '#ffffff', c: '#f0dcb0' });
  makeSprite(scene, 'rock', ['..kkkk..', '.kGGggk.', 'kGgggggk', 'kggggdgk', '.kkkkkk.'], { k: '#1a1a20', G: '#9a9aa8', g: '#6a6a78', d: '#4a4a58' });
  makeSprite(scene, 'flowers', ['.p...y.', 'pyp.yry', '.p.g.y.', '..g.g..', '..g.g..'], { p: '#ff8ab0', y: '#ffe060', r: '#e04848', g: '#4a8a3a' });
  // cemetery
  makeSprite(scene, 'grave', ['...kkk', '..kGGg', '.kGggg', '.kGgkg', '.kgkkk', '.kggkg', '.kggkg', '.kgggg', '.kgggg', 'kddddd', 'kkkkkk'],
    { k: '#14141c', G: '#9a9aac', g: '#6a6a7c', d: '#3a4a2a' }, { mirror: true });
  makeSprite(scene, 'skull', ['.kkkk.', 'kwwwwk', 'kwkkwk', 'kwwwwk', '.kwkk.'.replace('kk.', 'wk.')], { k: '#1a1418', w: '#ece6d6' });
  makeSprite(scene, 'candle', ['..f..', '..F..', '.kwk.', '.kwk.', '.kwk.', 'kkkkk'], { f: '#ff9020', F: '#ffe080', k: '#2a2030', w: '#f0e8d8' });
  makeSprite(scene, 'deadtree', ['k...k...', '.k.k..k.', '..kk.k..', '...kk...', '...kk...', '...kk...', '..kkkk..'], { k: '#2a2030' });
  // castle
  makeSprite(scene, 'banner', ['kkkkkkkk', 'kppppppk', 'kpPyyPpk', 'kpyrrypk', 'kpyrrypk', 'kpPyyPpk', 'kppppppk', 'kppppppk', 'kpp..ppk', 'kp....pk'],
    { k: '#1a0a14', p: '#6a1a4a', P: '#9a3a7a', y: '#f0c040', r: '#e02040' });
  makeSprite(scene, 'candelabra', ['f.f.f', 'w.w.w', 'kkkkk', '..k..', '..k..', '..k..', '.kkk.'], { f: '#ffb040', w: '#f0e8d8', k: '#c0a040' });
  makeSprite(scene, 'bones', ['w....w', '.wwww.', 'w....w', '..kk..', '.kwwk.'], { w: '#ece6d6', k: '#1a1418' });
  // Throne
  makeSprite(scene, 'throne', [
    '....kk.....', '...kyyk....', '...kyrk....', '..kkyyk.kkk', '..kppppkyyk', '..kpPPPpkkk', '..kpPppppppp', '..kpPppppppp',
    '..kpPppppppp', '..kpppppppPp', '.kkkkkkkkkkk', 'kyyyyyyyyyyy', 'kgggggggggg.', 'kgkkkkkkkkkk', 'kgk........', 'kgk........', 'kkk........',
  ], { k: '#1a0a14', y: '#f0c040', r: '#e02040', p: '#6a1a4a', P: '#9a3a7a', g: '#3a1a30' }, { mirror: true });

  // Demonic summoning sigil (drawn white, tinted red in game)
  makeCanvas(scene, 'sigil', 64, 64, (c) => {
    c.fillStyle = '#ffffff';
    const line = (x0: number, y0: number, x1: number, y1: number) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) c.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
    };
    pixRing(c, 32, 32, 30, 1, '#ffffff');
    pixRing(c, 32, 32, 25, 1, '#ffffff');
    pixRing(c, 32, 32, 8, 1, '#ffffff');
    const pts = Array.from({ length: 5 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      return [32 + Math.cos(a) * 25, 32 + Math.sin(a) * 25];
    });
    for (let i = 0; i < 5; i++) { const [a, b] = [pts[i], pts[(i + 2) % 5]]; line(a[0], a[1], b[0], b[1]); }
    // runes between the two rings
    for (let i = 0; i < 15; i++) {
      const a = (i / 15) * Math.PI * 2;
      const x = Math.round(32 + Math.cos(a) * 27.5), y = Math.round(32 + Math.sin(a) * 27.5);
      const kind = i % 3;
      if (kind === 0) { c.fillRect(x, y - 1, 1, 3); c.fillRect(x - 1, y - 1, 1, 1); }
      else if (kind === 1) { c.fillRect(x - 1, y, 3, 1); c.fillRect(x, y + 1, 1, 1); }
      else { c.fillRect(x - 1, y - 1, 1, 1); c.fillRect(x + 1, y + 1, 1, 1); c.fillRect(x, y, 1, 1); }
    }
  });
  // Blood splats
  for (let v = 0; v < 3; v++) {
    makeCanvas(scene, `blood${v}`, 16, 12, (c) => {
      const r = new RNG(500 + v * 31);
      for (let i = 0; i < 7; i++) pixCircle(c, r.int(4, 11), r.int(3, 8), r.int(1, 3), i < 4 ? '#4a0810' : '#6a0c16');
      for (let i = 0; i < 5; i++) { c.fillStyle = '#4a0810'; c.fillRect(r.int(0, 15), r.int(0, 11), 1, 1); }
      c.fillStyle = '#8a1420'; c.fillRect(r.int(5, 9), r.int(4, 6), 2, 1);
    });
  }
  // Hanging chain for walls
  makeCanvas(scene, 'chain', 5, 20, (c) => {
    for (let y = 0; y < 18; y += 4) {
      c.fillStyle = '#5a5a68'; c.fillRect(1, y, 3, 3);
      c.fillStyle = '#1a1a22'; c.fillRect(2, y + 1, 1, 1);
      c.fillStyle = '#8a8a98'; c.fillRect(1, y, 1, 1);
    }
    c.fillStyle = '#5a5a68'; c.fillRect(0, 17, 5, 3); c.fillStyle = '#2a2a32'; c.fillRect(1, 18, 3, 1);
  });
  // Darkness mask: clear around the player, dark everywhere else
  makeCanvas(scene, 'darkmask', 256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 18, 128, 128, 112);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  });

  // Soft shadow cast by a wall onto the floor tile below it (adds depth)
  makeCanvas(scene, 'wallshade', 16, 16, (c) => {
    const rows = [0.5, 0.36, 0.25, 0.16, 0.09, 0.04];
    rows.forEach((a, y) => { c.fillStyle = `rgba(6,2,10,${a})`; c.fillRect(0, y, 16, 1); });
  });
  // Shadow cast to the right of a wall/pillar
  makeCanvas(scene, 'sideshade', 16, 16, (c) => {
    [0.3, 0.18, 0.08].forEach((a, x) => { c.fillStyle = `rgba(6,2,10,${a})`; c.fillRect(x, 0, 1, 16); });
  });

  // Light glow sprites used as fake lighting
  makeCanvas(scene, 'vignette', 320, 180, (c) => {
    const g = c.createRadialGradient(160, 90, 60, 160, 90, 200);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.75)');
    c.fillStyle = g; c.fillRect(0, 0, 320, 180);
  });
  makeCanvas(scene, 'firefly', 3, 3, (c) => pixCircle(c, 1, 1, 1, '#ffffff'));
}

/** Tileable backdrops shown outside the playable map, one per stage (+ a lava glow layer). */
export function buildVoidTextures(scene: Phaser.Scene) {
  const N = 64;
  // draw a shape at every wrap offset so the texture tiles seamlessly
  const wrap = (fn: (ox: number, oy: number) => void) => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) fn(ox, oy); };

  // forest: dense dark canopy
  makeCanvas(scene, 'abyss_0', N, N, (c) => {
    const r = new RNG(71);
    c.fillStyle = '#081208'; c.fillRect(0, 0, N, N);
    const cols = ['#0e2212', '#132c17', '#183620', '#1e4226'];
    for (let layer = 0; layer < 4; layer++) {
      for (let i = 0; i < 14; i++) {
        const x = r.int(0, N - 1), y = r.int(0, N - 1), rad = r.int(4, 8) - layer;
        wrap((ox, oy) => pixCircle(c, x + ox, y + oy, rad, cols[layer]));
        if (layer === 3) wrap((ox, oy) => { c.fillStyle = '#2a5432'; c.fillRect(x + ox - 1, y + oy - rad + 1, 2, 1); });
      }
    }
  });

  // cemetery: cold dark earth with tiny graves and crosses
  makeCanvas(scene, 'abyss_1', N, N, (c) => {
    const r = new RNG(72);
    c.fillStyle = '#0a0a12'; c.fillRect(0, 0, N, N);
    for (let i = 0; i < 90; i++) { c.fillStyle = r.chance(0.5) ? '#10101a' : '#151522'; c.fillRect(r.int(0, N - 1), r.int(0, N - 1), r.int(1, 3), 1); }
    for (let i = 0; i < 5; i++) {
      const x = r.int(2, N - 8), y = r.int(2, N - 10);
      c.fillStyle = '#1c1c2a';
      if (r.chance(0.5)) { c.fillRect(x + 2, y, 2, 8); c.fillRect(x, y + 2, 6, 2); }
      else { c.fillRect(x + 1, y, 4, 1); c.fillRect(x, y + 1, 6, 7); }
      c.fillStyle = '#0c0c14'; c.fillRect(x - 1, y + 8, 8, 1);
    }
  });

  // castle: black rock split by glowing lava cracks
  const cracks = new RNG(73);
  const crackPaths: [number, number][][] = [];
  for (let i = 0; i < 6; i++) {
    let x = cracks.int(0, N - 1), y = cracks.int(0, N - 1);
    const path: [number, number][] = [];
    for (let s = 0; s < 26; s++) { path.push([x, y]); x += cracks.int(-1, 1); y += cracks.int(0, 1) || 1; if (cracks.chance(0.3)) x += cracks.chance(0.5) ? 1 : -1; }
    crackPaths.push(path);
  }
  const drawCracks = (c: CanvasRenderingContext2D, outer: string, inner: string) => {
    for (const path of crackPaths) for (const [x, y] of path) wrap((ox, oy) => {
      c.fillStyle = outer; c.fillRect(((x + ox) % N + N) % N - 1 + (ox ? 0 : 0), ((y + oy) % N + N) % N, 3, 1);
      c.fillStyle = inner; c.fillRect(((x + ox) % N + N) % N, ((y + oy) % N + N) % N, 1, 1);
    });
  };
  makeCanvas(scene, 'abyss_2', N, N, (c) => {
    const r = new RNG(74);
    c.fillStyle = '#0c0508'; c.fillRect(0, 0, N, N);
    for (let i = 0; i < 12; i++) { const x = r.int(0, N - 1), y = r.int(0, N - 1); wrap((ox, oy) => pixCircle(c, x + ox, y + oy, r.int(3, 6), '#160a0e')); }
    drawCracks(c, '#4a0c08', '#a02010');
  });
  makeCanvas(scene, 'abyss_2_glow', N, N, (c) => drawCracks(c, '#ff3010', '#ffb040'));

  // floating rock for the castle abyss
  makeSprite(scene, 'floatrock', [
    '..kkkkk...', '.kGGgggk..', 'kGggggggk.', 'kgggggdgkk', '.kgdgggdk.', '..kddddk..', '...kddk...', '....kk....',
  ], { k: '#0a0406', G: '#5a3a44', g: '#3a222a', d: '#24141a' });
}
