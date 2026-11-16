import Phaser from 'phaser';
import { makeCanvas, makeSprite, pixCircle } from './PixelArt';
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
        for (let n = 0; n < 22; n++) px(ox, rng.int(0, 15), rng.int(0, 15), rng.chance(0.5) ? p.floor[1] : p.floor[2]);
        for (let n = 0; n < 3; n++) { const x = rng.int(1, 14), y = rng.int(2, 14); px(ox, x, y, p.floor[2]); px(ox, x, y - 1, p.floor[2]); }
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
          // glowing rune
          c.fillStyle = p.deco[1];
          c.fillRect(ox + 6, 4, 4, 1); c.fillRect(ox + 5, 5, 1, 6); c.fillRect(ox + 10, 5, 1, 6); c.fillRect(ox + 6, 11, 4, 1); c.fillRect(ox + 7, 7, 2, 2);
        }
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
      for (let n = 0; n < 30; n++) px(ox, rng.int(0, 15), rng.int(0, 15), p.wallTop[rng.chance(0.6) ? 1 : 2]);
      if (p.style === 'grass') {
        for (let n = 0; n < 6; n++) { const x = rng.int(1, 13), y = rng.int(1, 13); c.fillStyle = p.wallTop[2]; c.fillRect(ox + x, y, 2, 2); }
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
      fill(ox, p.block[0]);
      c.fillStyle = p.block[2]; c.fillRect(ox + 1, 1, 14, 2); c.fillRect(ox + 1, 1, 2, 14);
      c.fillStyle = p.block[1]; c.fillRect(ox, 15, 16, 1); c.fillRect(ox + 15, 0, 1, 16);
      if (p.style === 'grass') {
        // tree stump rings
        c.fillStyle = p.block[1];
        c.fillRect(ox + 5, 5, 6, 1); c.fillRect(ox + 5, 10, 6, 1); c.fillRect(ox + 5, 5, 1, 6); c.fillRect(ox + 10, 5, 1, 6);
      } else {
        c.fillStyle = p.block[1]; c.fillRect(ox + 4, 4, 8, 8);
        c.fillStyle = p.block[0]; c.fillRect(ox + 5, 5, 6, 6);
      }
      bricks(T.BLOCK_FACE * TILE, [p.block[1], p.block[0], '#00000055', p.block[2]]);
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
    fill(0, '#0a0710');
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

  // Light glow sprites used as fake lighting
  makeCanvas(scene, 'vignette', 320, 180, (c) => {
    const g = c.createRadialGradient(160, 90, 60, 160, 90, 200);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.75)');
    c.fillStyle = g; c.fillRect(0, 0, 320, 180);
  });
  makeCanvas(scene, 'firefly', 3, 3, (c) => pixCircle(c, 1, 1, 1, '#ffffff'));
}
