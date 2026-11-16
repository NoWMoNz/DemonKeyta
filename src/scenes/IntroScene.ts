import Phaser from 'phaser';
import { GAME_W, GAME_H, TEXT_COLORS } from '../game/constants';
import { DialogueBox } from '../ui/DialogueBox';
import { Button } from '../ui/widgets';
import { INTRO } from '../data/story';
import { Audio } from '../audio/AudioEngine';
import type { RunState } from '../systems/ProgressionSystem';
import { wait } from '../utils/helpers';

/** The King gives the hero his mission. */
export class IntroScene extends Phaser.Scene {
  private run!: RunState;
  private done = false;

  constructor() { super('Intro'); }

  init(data: { run: RunState }) { this.run = data.run; this.done = false; }

  create() {
    Audio.playMusic('menu');
    // royal hall
    const S = 3;
    for (let y = 0; y < GAME_H; y += 16 * S) {
      for (let x = 0; x < GAME_W; x += 16 * S) {
        this.add.image(x, y, 'tiles_1', String(1 + ((x + y) / 48) % 4)).setOrigin(0).setScale(S);
      }
    }
    for (let x = 0; x < GAME_W; x += 16 * S) {
      this.add.image(x, 0, 'tiles_1', '10').setOrigin(0).setScale(S);
      this.add.image(x, 16 * S, 'tiles_1', '11').setOrigin(0).setScale(S);
    }
    for (let y = 96; y < GAME_H; y += 48) this.add.image(GAME_W / 2 + 60, y, 'tiles_2', '9').setOrigin(0.5, 0).setScale(S, S).setTint(0xffd0a0);
    this.add.image(GAME_W / 2 + 60, 120, 'throne').setScale(S).setTint(0xffd890);
    const banner = (x: number) => this.add.image(x, 70, 'banner').setScale(S).setTint(0x90a0ff);
    banner(140); banner(500);
    const king = this.add.image(GAME_W / 2 + 60, 140, 'king').setScale(S);
    this.tweens.add({ targets: king, y: 137, duration: 800, yoyo: true, repeat: -1 });
    const hero = this.add.sprite(GAME_W / 2 - 80, 200, 'hero_idle0').setScale(S).play('hero_idle');
    this.add.image(hero.x + 16, hero.y + 6, 'w_sword').setScale(S).setOrigin(0.15, 0.5).setRotation(1.2);
    this.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(GAME_W, GAME_H).setAlpha(0.8);

    const black = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 1).setOrigin(0).setDepth(500);
    const skip = new Button(this, GAME_W - 54, 18, 'ข้าม >>', () => this.finish(), 90, 22).setDepth(2000);
    void skip;
    const dlg = new DialogueBox(this, 1000);

    (async () => {
      await wait(this, 300);
      const narr = INTRO.filter((l) => l.who === 'narrator');
      const rest = INTRO.filter((l) => l.who !== 'narrator');
      await dlg.play(narr);
      if (this.done) return;
      this.tweens.add({ targets: black, alpha: 0, duration: 900 });
      await wait(this, 900);
      await dlg.play(rest);
      this.finish();
    })();
    void TEXT_COLORS;
  }

  private finish() {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(600);
    this.time.delayedCall(650, () => this.scene.start('Game', { run: this.run }));
  }
}
