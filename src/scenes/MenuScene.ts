import Phaser from 'phaser';
import { GAME_W, GAME_H, TEXT_COLORS } from '../game/constants';
import { Button, text, drawPanel, keyboardMenu } from '../ui/widgets';
import { Audio } from '../audio/AudioEngine';
import { Progress, newRun } from '../systems/ProgressionSystem';
import { STAGES } from '../data/stages';
import { MADE_BY } from '../data/story';
import { Cheat } from '../systems/Cheat';

export class MenuScene extends Phaser.Scene {
  private credits: Phaser.GameObjects.Container | null = null;

  constructor() { super('Menu'); }

  create() {
    this.credits = null;
    this.cameras.main.fadeIn(500);
    this.add.image(0, 0, 'menu_bg').setOrigin(0).setDisplaySize(GAME_W, GAME_H);

    // twinkling stars + embers
    this.add.particles(0, 0, 'px', {
      x: { min: 0, max: GAME_W }, y: { min: 0, max: 200 }, lifespan: 2000, scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 }, frequency: 120, tint: [0xffffff, 0xffe0a0, 0xd0c0ff],
    });
    this.add.particles(0, 0, 'firefly', {
      x: { min: 0, max: GAME_W }, y: GAME_H, speedY: { min: -30, max: -12 }, speedX: { min: -8, max: 8 },
      lifespan: 9000, alpha: { start: 0.9, end: 0 }, frequency: 300, tint: [0xd0ff60, 0xff90c0], blendMode: 'ADD',
    });

    // ground strip
    for (let x = 0; x < GAME_W; x += 32) {
      this.add.image(x, GAME_H - 32, 'tiles_0', String(1 + ((x / 32) % 4))).setOrigin(0).setScale(2);
      this.add.image(x, GAME_H - 64, 'tiles_0', String(10)).setOrigin(0).setScale(2);
    }

    // characters
    const hero = this.add.sprite(140, GAME_H - 54, 'hero_idle0').setScale(4).play('hero_walk');
    const heroW = this.add.image(162, GAME_H - 50, 'w_sword').setScale(4).setOrigin(0.15, 0.5).setRotation(-0.5);
    this.tweens.add({ targets: [hero, heroW], y: '-=3', duration: 300, yoyo: true, repeat: -1 });
    const slimes: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 3; i++) {
      const s = this.add.image(400 + i * 70, GAME_H - 50, i === 1 ? 'slime_blue' : 'slime').setScale(3).setFlipX(true);
      slimes.push(s);
      this.tweens.add({ targets: s, y: GAME_H - 66, scaleY: 3.4, scaleX: 2.7, duration: 280, yoyo: true, repeat: -1, delay: i * 180, ease: 'Quad.easeOut' });
    }
    const bat = this.add.sprite(-20, 140, 'bat0').setScale(3).play('bat_fly');
    this.tweens.add({ targets: bat, x: GAME_W + 40, duration: 9000, repeat: -1, delay: 1500 });
    this.tweens.add({ targets: bat, y: 120, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // logo
    const logo1 = text(this, GAME_W / 2, 46, 'THE HERO', 24, TEXT_COLORS.gold, { stroke: '#2a0a20', strokeThickness: 6 }).setOrigin(0.5);
    const logo2 = text(this, GAME_W / 2, 80, 'WAS NOT INVITED', 16, '#ffffff', { stroke: '#2a0a20', strokeThickness: 5 }).setOrigin(0.5);
    text(this, GAME_W / 2, 102, 'ผู้กล้าที่ไม่ได้รับเชิญ', 8, TEXT_COLORS.purple).setOrigin(0.5);
    this.tweens.add({ targets: [logo1, logo2], y: '+=3', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const sword = this.add.image(GAME_W / 2 - 104, 44, 'w_sword').setScale(2).setRotation(-Math.PI / 4);
    const sword2 = this.add.image(GAME_W / 2 + 104, 44, 'w_sword').setScale(2).setRotation(-Math.PI * 0.75).setFlipY(true);
    this.tweens.add({ targets: [sword, sword2], y: '+=3', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // buttons
    const snap = Progress.data.snapshot;
    const buttons: Button[] = [];
    let y = 136;
    if (snap) {
      buttons.push(new Button(this, GAME_W / 2, y, `เล่นต่อ: ${STAGES[snap.stage].name}`, () => this.startRun(true), 260));
      y += 32;
    }
    buttons.push(new Button(this, GAME_W / 2, y, 'เริ่มเกมใหม่', () => this.startRun(false), 260)); y += 32;
    buttons.push(new Button(this, GAME_W / 2, y, 'ตั้งค่า', () => this.scene.launch('Settings'), 260)); y += 32;
    buttons.push(new Button(this, GAME_W / 2, y, 'เครดิต', () => this.showCredits(), 260));
    keyboardMenu(this, buttons);


    // achievement badge
    if (Progress.data.achievements.includes('third_wheel')) {
      const g = this.add.graphics();
      drawPanel(g, 8, GAME_H - 44, 196, 36, 0x2a1a10, 0xf0c040, 0.9);
      this.add.image(26, GAME_H - 26, 'trophy').setScale(2);
      text(this, 42, GAME_H - 38, 'ความสำเร็จ', 8, TEXT_COLORS.gold);
      text(this, 42, GAME_H - 24, 'ก้างขวางคอขั้นสุดยอด', 8, TEXT_COLORS.white);
    }

    const hint = text(this, GAME_W - 8, GAME_H - 10, 'v1.0', 8, TEXT_COLORS.gray).setOrigin(1, 1);
    void hint;
    if (!Audio.ctx) {
      const t = text(this, GAME_W / 2, GAME_H - 10, 'คลิกตรงไหนก็ได้เพื่อเปิดเสียง', 8, TEXT_COLORS.gray).setOrigin(0.5, 1);
      this.tweens.add({ targets: t, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
      this.input.once('pointerdown', () => { Audio.unlock(); Audio.playMusic('menu'); t.destroy(); });
      this.input.keyboard?.once('keydown', () => { Audio.unlock(); Audio.playMusic('menu'); t.destroy(); });
    }
    Audio.playMusic('menu');
    void slimes;

    if (Cheat.justChanged) {
      Cheat.justChanged = false;
      const t = text(this, GAME_W / 2, 118, Cheat.enabled ? 'โหมดลับ: เปิดแล้ว (กด K ในเกม)' : 'โหมดลับ: ปิดแล้ว', 8, TEXT_COLORS.gold, { stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(50);
      this.tweens.add({ targets: t, alpha: 0, delay: 3500, duration: 800, onComplete: () => t.destroy() });
    }
  }

  private startRun(cont: boolean) {
    Audio.unlock();
    const run = cont ? Progress.restoreCheckpoint() : null;
    this.cameras.main.fadeOut(400);
    this.time.delayedCall(420, () => {
      if (run) this.scene.start('Game', { run });
      else { Progress.clearCheckpoint(); this.scene.start('Intro', { run: newRun() }); }
    });
  }

  private showCredits() {
    if (this.credits) return;
    const g = this.add.graphics();
    drawPanel(g, 70, 40, GAME_W - 140, GAME_H - 80, 0x150f24, 0x8a6ac0, 0.97);
    const lines = [
      ['ผู้กล้าที่ไม่ได้รับเชิญ', TEXT_COLORS.gold],
      ['', ''],
      ['ออกแบบ โค้ด ภาพ และเพลง', TEXT_COLORS.purple],
      [MADE_BY, TEXT_COLORS.white],
      ['', ''],
      ['เอนจิน', TEXT_COLORS.purple],
      ['Phaser 3 + TypeScript + Vite', TEXT_COLORS.white],
      ['', ''],
      ['ฟอนต์', TEXT_COLORS.purple],
      ['Press Start 2P (CodeMan38) / Kanit (Cadson Demak)', TEXT_COLORS.white],
      ['', ''],
      ['ภาพ เสียง และเพลงทั้งหมด', TEXT_COLORS.gray],
      ['สร้างขึ้นใหม่ด้วยโค้ด', TEXT_COLORS.gray],
    ];
    const items: Phaser.GameObjects.GameObject[] = [g];
    lines.forEach(([s, c], i) => items.push(text(this, GAME_W / 2, 58 + i * 15, s, 8, c || TEXT_COLORS.white).setOrigin(0.5, 0)));
    const close = new Button(this, GAME_W / 2, GAME_H - 58, 'ปิด', () => { this.credits?.destroy(); this.credits = null; }, 120);
    items.push(close);
    this.credits = this.add.container(0, 0, items).setDepth(100);
  }
}
