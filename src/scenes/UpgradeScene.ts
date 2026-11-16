import Phaser from 'phaser';
import { GAME_W, GAME_H, TEXT_COLORS } from '../game/constants';
import { drawPanel, text } from '../ui/widgets';
import { PERKS, PerkDef } from '../data/perks';
import { STAGES } from '../data/stages';
import { Audio } from '../audio/AudioEngine';
import type { RunState } from '../systems/ProgressionSystem';

/** Stage-clear reward: choose 1 of 3 perks. */
export class UpgradeScene extends Phaser.Scene {
  private run!: RunState;
  private chosen = false;

  constructor() { super('Upgrade'); }

  init(data: { run: RunState }) { this.run = data.run; this.chosen = false; }

  create() {
    this.cameras.main.fadeIn(400);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0614, 1).setOrigin(0);
    this.add.particles(0, 0, 'px', {
      x: { min: 0, max: GAME_W }, y: GAME_H + 4, speedY: { min: -60, max: -20 }, lifespan: 6000,
      scale: { start: 1, end: 0 }, alpha: { start: 0.8, end: 0 }, frequency: 60, tint: [0xa060ff, 0xf0c040, 0x60c0ff], blendMode: 'ADD',
    });
    Audio.sfx('clear');
    text(this, GAME_W / 2, 34, 'ผ่านด่านแล้ว!', 24, TEXT_COLORS.gold, { stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    const next = STAGES[this.run.stage + 1];
    text(this, GAME_W / 2, 66, `ด่านต่อไป: ${next.name}`, 8, TEXT_COLORS.gray).setOrigin(0.5);
    text(this, GAME_W / 2, 92, 'เลือกพรหนึ่งอย่าง', 8, TEXT_COLORS.white).setOrigin(0.5);

    const choices = Phaser.Utils.Array.Shuffle([...PERKS]).slice(0, 3) as PerkDef[];
    choices.forEach((perk, i) => this.card(GAME_W / 2 + (i - 1) * 180, 190, perk, i));
    const keys = ['ONE', 'TWO', 'THREE'];
    keys.forEach((k, i) => this.input.keyboard?.once(`keydown-${k}`, () => this.choose(choices[i])));
  }

  private card(x: number, y: number, perk: PerkDef, i: number) {
    const w = 156, h = 150;
    const g = this.add.graphics();
    const draw = (hover: boolean) => {
      g.clear();
      drawPanel(g, -w / 2, -h / 2, w, h, hover ? 0x2e2250 : 0x1a1430, hover ? 0xf0c040 : perk.color, 0.97);
    };
    draw(false);
    const icon = this.add.image(0, -36, 'glow').setTint(perk.color).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9);
    const orb = this.add.image(0, -36, 'circle').setTint(perk.color).setScale(0.3);
    const name = text(this, 0, -6, perk.name, 8, TEXT_COLORS.gold).setOrigin(0.5, 0);
    const desc = text(this, 0, 16, perk.desc, 8, TEXT_COLORS.white, { align: 'center', lineSpacing: 0 }).setOrigin(0.5, 0);
    const key = text(this, 0, h / 2 - 16, `[${i + 1}]`, 8, TEXT_COLORS.gray).setOrigin(0.5);
    const c = this.add.container(x, y + 30, [g, icon, orb, name, desc, key]).setSize(w, h).setInteractive({ useHandCursor: true }).setAlpha(0);
    this.tweens.add({ targets: c, y, alpha: 1, duration: 400, delay: i * 120, ease: 'Back.easeOut' });
    this.tweens.add({ targets: icon, scale: 1.1, duration: 700, yoyo: true, repeat: -1 });
    c.on('pointerover', () => { draw(true); Audio.sfx('hover'); });
    c.on('pointerout', () => draw(false));
    c.on('pointerdown', () => this.choose(perk));
  }

  private choose(perk: PerkDef) {
    if (this.chosen) return;
    this.chosen = true;
    perk.apply(this.run);
    this.run.perks.push(perk.id);
    Audio.sfx('buff');
    this.cameras.main.flash(300, 255, 240, 200);
    this.time.delayedCall(500, () => {
      this.cameras.main.fadeOut(400);
      this.time.delayedCall(420, () => {
        this.run.stage++;
        this.run.armor = this.run.maxArmor;
        this.scene.stop('HUD');
        this.scene.stop('Game');
        this.scene.start('Game', { run: this.run });
      });
    });
  }
}
