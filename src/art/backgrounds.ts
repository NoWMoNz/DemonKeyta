import Phaser from 'phaser';
import { makeCanvas } from './PixelArt';
import { RNG } from '../utils/rng';

export function buildBackgrounds(scene: Phaser.Scene) {
  const rng = new RNG(42);

  // Menu backdrop (drawn at half resolution, displayed at 2x for chunky pixels)
  makeCanvas(scene, 'menu_bg', 320, 180, (c) => {
    const bands = ['#120a24', '#170d2c', '#1d1036', '#251440', '#2e1848', '#3a1d50', '#4a2256', '#5a2858'];
    bands.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, i * 14, 320, 14); });
    c.fillStyle = bands[bands.length - 1]; c.fillRect(0, bands.length * 14, 320, 180);
    // stars
    for (let i = 0; i < 90; i++) {
      c.fillStyle = rng.chance(0.2) ? '#ffe8a0' : '#d8d0ff';
      c.fillRect(rng.int(0, 319), rng.int(0, 100), 1, 1);
    }
    // moon
    c.fillStyle = '#fff4d8';
    for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) if (x * x + y * y <= 140) c.fillRect(250 + x, 34 + y, 1, 1);
    c.fillStyle = '#e8d8b8'; c.fillRect(244, 30, 3, 3); c.fillRect(254, 38, 4, 3); c.fillRect(249, 41, 2, 2);
    // far mountains
    c.fillStyle = '#2a1640';
    for (let x = 0; x < 320; x++) {
      const h = 100 + Math.sin(x / 23) * 10 + Math.sin(x / 9) * 4;
      c.fillRect(x, h, 1, 180 - h);
    }
    // castle on the hill (right)
    c.fillStyle = '#1a0c26';
    for (let x = 170; x < 320; x++) {
      const h = 120 - Math.sin((x - 170) / 48) * 26;
      c.fillRect(x, h, 1, 180 - h);
    }
    const tower = (x: number, w: number, top: number) => {
      c.fillRect(x, top, w, 120 - top);
      c.fillRect(x - 1, top - 2, w + 2, 2);
      for (let i = 0; i < w + 2; i += 3) c.fillRect(x - 1 + i, top - 4, 2, 2);
      c.beginPath(); c.moveTo(x - 2, top - 4); c.lineTo(x + w / 2, top - 18); c.lineTo(x + w + 2, top - 4); c.fill();
    };
    tower(222, 10, 58); tower(240, 14, 46); tower(260, 10, 60); tower(276, 8, 70);
    c.fillRect(218, 78, 72, 30);
    // castle windows
    const win = (x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(x, y, 2, 3); };
    win(244, 56, '#ff6ab0'); win(250, 56, '#ffb040'); win(226, 66, '#ffb040'); win(264, 70, '#ffb040'); win(246, 86, '#ff4060');
    // forest silhouette (left)
    c.fillStyle = '#140a20';
    for (let i = 0; i < 26; i++) {
      const x = i * 7 - 4, h = 118 + rng.int(-10, 6);
      c.beginPath(); c.moveTo(x, 150); c.lineTo(x + 5, h); c.lineTo(x + 10, 150); c.fill();
    }
    c.fillRect(0, 140, 320, 40);
  });

  // Drifting cloud for the menu parallax
  makeCanvas(scene, 'cloud', 80, 24, (c) => {
    const blobs = [[14, 15, 9], [28, 11, 11], [44, 9, 12], [60, 13, 10], [70, 16, 7], [36, 16, 9]];
    c.fillStyle = '#2a1840';
    for (const [x, y, r] of blobs) for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
      if (xx * xx + yy * yy <= r * r && y + yy < 24) c.fillRect(x + xx, y + yy, 1, 1);
    }
    c.fillStyle = '#4a3068';
    for (const [x, y, r] of blobs) for (let xx = -r + 2; xx <= r - 2; xx++) {
      const yy = -Math.round(Math.sqrt(Math.max(0, r * r - xx * xx)));
      c.fillRect(x + xx, y + yy, 1, 2);
    }
  });

  // Foreground: a cliff on the left for the hero, lower ground on the right
  makeCanvas(scene, 'menu_ground', 320, 60, (c) => {
    const top = (x: number) => {
      if (x < 100) return 20 + Math.round(Math.sin(x / 9) * 1.5);
      if (x < 130) return Math.round(20 + ((x - 100) / 30) * 22);
      return 42 + Math.round(Math.sin(x / 13) * 2 + Math.sin(x / 5) * 0.8);
    };
    for (let x = 0; x < 320; x++) {
      const t = top(x);
      c.fillStyle = '#0c140e'; c.fillRect(x, t, 1, 60 - t);
      c.fillStyle = '#16261a'; c.fillRect(x, t + 3, 1, 4);
      c.fillStyle = '#3a6a34'; c.fillRect(x, t, 1, 2);
      c.fillStyle = '#5a9a4a'; if (x % 3 === 0) c.fillRect(x, t - 1, 1, 1);
      if (rng.chance(0.08)) { c.fillStyle = '#5a9a4a'; c.fillRect(x, t - 2, 1, 2); }
    }
    // rocks in the cliff face
    c.fillStyle = '#1c2a20';
    for (let i = 0; i < 18; i++) c.fillRect(rng.int(0, 120), rng.int(26, 56), rng.int(2, 5), 1);
  });

  // Spotlight overlay (transparent center, dark edges)
  makeCanvas(scene, 'spotlight', 256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 22, 128, 128, 120);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.6)');
    g.addColorStop(1, 'rgba(0,0,0,0.92)');
    c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  });

  makeCanvas(scene, 'crosshair', 13, 13, (c) => {
    c.fillStyle = '#000000';
    c.fillRect(5, 0, 3, 5); c.fillRect(5, 8, 3, 5); c.fillRect(0, 5, 5, 3); c.fillRect(8, 5, 5, 3);
    c.fillStyle = '#ffffff';
    c.fillRect(6, 1, 1, 3); c.fillRect(6, 9, 1, 3); c.fillRect(1, 6, 3, 1); c.fillRect(9, 6, 3, 1);
    c.fillStyle = '#ff6060'; c.fillRect(6, 6, 1, 1);
  });

  // Light rays for the ending door
  makeCanvas(scene, 'rays', 64, 96, (c) => {
    for (let y = 0; y < 96; y++) {
      const a = 0.5 * (1 - y / 96);
      c.fillStyle = `rgba(255,240,200,${a})`;
      const w = 16 + y * 0.5;
      c.fillRect(32 - w / 2, y, w, 1);
    }
  });
}

/** Register 16x16 frames on each tileset so tiles can be used as image frames. */
export function registerTileFrames(scene: Phaser.Scene) {
  for (let i = 0; i < 3; i++) {
    const tex = scene.textures.get(`tiles_${i}`);
    for (let f = 0; f < 16; f++) if (!tex.has(String(f))) tex.add(String(f), 0, f * 16, 0, 16, 16);
  }
}
