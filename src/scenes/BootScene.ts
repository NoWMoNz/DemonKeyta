import Phaser from 'phaser';
import { buildCharacterTextures, buildItemTextures, buildEffectTextures } from '../art/sprites';
import { buildTilesets, buildPropTextures, buildVoidTextures } from '../art/tiles';
import { buildBackgrounds, registerTileFrames } from '../art/backgrounds';

/** Generates every texture/animation procedurally, then shows the menu. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // Real photos used as dialogue portraits and in the ending. Missing files fall back to pixel art.
    const photos = ['queen', 'queen_cry', 'queen_love', 'lover', 'lover_happy', 'lover_alt', 'card_queen', 'card_lover'];
    for (const p of photos) this.load.image(`photo_${p}`, `assets/photos/${p}.jpg`);
    this.load.on('loaderror', (f: Phaser.Loader.File) => console.warn('optional asset missing:', f.key));
  }

  async create() {
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('8px "Press Start 2P"'),
          document.fonts.load('16px "Press Start 2P"'),
          document.fonts.load('13px "Kanit"', 'ภาษาไทย'),
        ]),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch { /* fall back to monospace */ }

    buildCharacterTextures(this);
    buildItemTextures(this);
    buildEffectTextures(this);
    buildTilesets(this);
    buildPropTextures(this);
    buildVoidTextures(this);
    buildBackgrounds(this);
    registerTileFrames(this);
    this.createAnims();

    document.getElementById('loading')?.remove();
    this.scene.start('Menu');
  }

  private createAnims() {
    const a = this.anims;
    const frames = (...keys: string[]) => keys.map((key) => ({ key }));
    a.create({ key: 'hero_idle', frames: frames('hero_idle0', 'hero_idle1'), frameRate: 2.5, repeat: -1 });
    a.create({ key: 'hero_walk', frames: frames('hero_walk0', 'hero_walk1', 'hero_walk2', 'hero_walk3'), frameRate: 10, repeat: -1 });
    a.create({ key: 'lover_idle', frames: frames('lover_idle0', 'lover_idle1'), frameRate: 2.5, repeat: -1 });
    a.create({ key: 'lover_walk', frames: frames('lover_walk0', 'lover_walk1', 'lover_walk2', 'lover_walk1'), frameRate: 8, repeat: -1 });
    a.create({ key: 'queen_idle', frames: frames('queen_idle0', 'queen_idle1'), frameRate: 2.5, repeat: -1 });
    a.create({ key: 'bat_fly', frames: frames('bat0', 'bat1'), frameRate: 7, repeat: -1 });
    a.create({ key: 'torch', frames: frames('torch0', 'torch1'), frameRate: 6, repeat: -1 });
  }
}
