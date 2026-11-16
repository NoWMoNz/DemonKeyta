import Phaser from 'phaser';
import { GAME_W, GAME_H, TEXT_COLORS } from '../game/constants';
import { Button, text, drawPanel, keyboardMenu } from '../ui/widgets';
import { Audio } from '../audio/AudioEngine';
import { Progress, newRun } from '../systems/ProgressionSystem';
import { STAGES } from '../data/stages';
import { MADE_BY } from '../data/story';
import { Cheat } from '../systems/Cheat';

/** menu_bg is drawn at 320x180 and stretched to the screen: convert its coordinates. */
const BX = (x: number) => (x / 320) * GAME_W;
const BY = (y: number) => (y / 180) * GAME_H;

export class MenuScene extends Phaser.Scene {
  /** After the first "tap to start" we skip the splash when returning to the menu. */
  private static started = false;
  private credits: Phaser.GameObjects.Container | null = null;
  private queen!: Phaser.GameObjects.Image;
  private queenEyes: Phaser.GameObjects.Rectangle[] = [];
  private flash!: Phaser.GameObjects.Rectangle;
  private logo!: Phaser.GameObjects.Container;
  private pointer!: Phaser.GameObjects.Image;
  private revealed = false;

  constructor() { super('Menu'); }

  create() {
    this.credits = null;
    this.revealed = false;
    this.queenEyes = [];
    this.cameras.main.fadeIn(700);

    this.buildBackdrop();
    this.buildForeground();
    this.buildLogo();
    this.flash = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xe8e0ff, 0).setOrigin(0).setDepth(40);
    this.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(GAME_W, GAME_H).setAlpha(0.55).setDepth(39);

    // lightning every few seconds
    this.time.delayedCall(2500, () => this.lightning());

    text(this, GAME_W - 8, GAME_H - 6, 'v1.1', 8, TEXT_COLORS.gray).setOrigin(1, 1).setDepth(50).setAlpha(0.6);

    if (MenuScene.started) {
      Audio.playMusic('menu');
      this.reveal(true);
    } else {
      this.splash();
    }

    if (Cheat.justChanged) {
      Cheat.justChanged = false;
      const t = text(this, GAME_W / 2, 150, Cheat.enabled ? 'โหมดลับ: เปิดแล้ว (กด K ในเกม)' : 'โหมดลับ: ปิดแล้ว', 8, TEXT_COLORS.gold, { stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(60);
      this.tweens.add({ targets: t, alpha: 0, delay: 3500, duration: 800, onComplete: () => t.destroy() });
    }
  }

  // ------------------------------------------------------------------ scenery
  private buildBackdrop() {
    this.add.image(0, 0, 'menu_bg').setOrigin(0).setDisplaySize(GAME_W, GAME_H);

    // moon glow
    const moon = this.add.image(BX(250), BY(34), 'glow').setTint(0xfff0c0).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2).setAlpha(0.35);
    this.tweens.add({ targets: moon, alpha: 0.22, scale: 2.0, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // twinkling stars
    this.add.particles(0, 0, 'px', {
      x: { min: 0, max: GAME_W }, y: { min: 0, max: 170 }, lifespan: 2200, scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 }, frequency: 110, tint: [0xffffff, 0xffe0a0, 0xd0c0ff],
    });
    // occasional shooting star
    this.time.addEvent({
      delay: 4200, loop: true, callback: () => {
        const sx = Phaser.Math.Between(40, GAME_W * 0.6), sy = Phaser.Math.Between(10, 60);
        const star = this.add.rectangle(sx, sy, 14, 1, 0xffffff, 0.9).setRotation(0.35).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: star, x: sx + 90, y: sy + 32, alpha: 0, duration: 700, onComplete: () => star.destroy() });
      },
    });

    // drifting clouds (parallax)
    for (let i = 0; i < 4; i++) {
      const y = 40 + i * 26 + Phaser.Math.Between(-6, 6);
      const c = this.add.image(Phaser.Math.Between(-80, GAME_W), y, 'cloud').setScale(2 + (i % 2)).setAlpha(0.55 + i * 0.08);
      const speed = 16000 + i * 7000;
      const drift = () => {
        c.x = -c.displayWidth;
        this.tweens.add({ targets: c, x: GAME_W + c.displayWidth, duration: speed, onComplete: drift });
      };
      this.tweens.add({ targets: c, x: GAME_W + c.displayWidth, duration: speed * ((GAME_W + c.displayWidth - c.x) / (GAME_W + 2 * c.displayWidth)), onComplete: drift });
    }

    // the Demon Queen, watching from her tower (a menacing silhouette with glowing eyes)
    const qx = BX(247), qy = BY(46) - 14;
    // a demonic sigil burning behind her
    const sig = this.add.image(qx, qy, 'sigil').setTint(0xff1840).setBlendMode(Phaser.BlendModes.ADD).setScale(1.25).setAlpha(0.5);
    this.tweens.add({ targets: sig, angle: 360, duration: 30000, repeat: -1 });
    this.tweens.add({ targets: sig, alpha: 0.22, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const aura = this.add.image(qx, qy, 'glow').setTint(0xff2050).setBlendMode(Phaser.BlendModes.ADD).setScale(1.3).setAlpha(0.45);
    this.tweens.add({ targets: aura, alpha: 0.25, scale: 1.1, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.queen = this.add.image(qx, qy, 'queen_idle0').setScale(1.2).setTint(0x1a0818);
    this.tweens.add({ targets: this.queen, y: qy - 1.5, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    for (const dx of [-3.6, 3.6]) {
      const eye = this.add.rectangle(qx + dx, qy - 1.6, 2, 1.4, 0xff3050).setBlendMode(Phaser.BlendModes.ADD);
      this.queenEyes.push(eye);
      this.tweens.add({ targets: eye, y: qy - 3.1, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.add.particles(qx, qy, 'px', {
      speedY: { min: -20, max: -6 }, speedX: { min: -6, max: 6 }, lifespan: 1400, scale: { start: 0.8, end: 0 },
      alpha: { start: 0.9, end: 0 }, frequency: 140, tint: [0xff2050, 0xa040ff], blendMode: 'ADD',
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-12, -10, 24, 22) } as Phaser.Types.GameObjects.Particles.EmitZoneData,
    });

    // bats leaving the castle
    this.time.addEvent({ delay: 3800, loop: true, callback: () => this.batSwarm(qx, qy + 20) });
    this.time.delayedCall(800, () => this.batSwarm(qx, qy + 20));
  }

  private batSwarm(x: number, y: number) {
    const n = Phaser.Math.Between(2, 4);
    for (let i = 0; i < n; i++) {
      const b = this.add.sprite(x, y, 'bat0').setScale(1.4).play('bat_fly').setAlpha(0.9);
      const tx = Phaser.Math.Between(-40, GAME_W * 0.5), ty = Phaser.Math.Between(20, 110);
      this.tweens.add({ targets: b, x: tx, duration: Phaser.Math.Between(4000, 6500), delay: i * 220, ease: 'Sine.easeIn', onComplete: () => b.destroy() });
      this.tweens.add({ targets: b, y: ty, duration: Phaser.Math.Between(4000, 6500), delay: i * 220, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: b, scale: 2.4, duration: 5000, delay: i * 220 });
    }
  }

  private buildForeground() {
    // ground: cliff on the left, lower meadow on the right
    this.add.image(0, GAME_H - 120, 'menu_ground').setOrigin(0).setDisplaySize(GAME_W, 120);

    // fireflies drifting up from the grass
    this.add.particles(0, 0, 'firefly', {
      x: { min: 0, max: GAME_W }, y: GAME_H - 10, speedY: { min: -26, max: -10 }, speedX: { min: -10, max: 10 },
      lifespan: 7000, alpha: { start: 0.9, end: 0 }, frequency: 260, tint: [0xd0ff60, 0xff90c0], blendMode: 'ADD',
    });
    // wind streaks
    this.add.particles(0, 0, 'px', {
      x: GAME_W + 4, y: { min: 160, max: GAME_H - 30 }, speedX: { min: -220, max: -140 }, lifespan: 4000,
      scaleX: { start: 6, end: 2 }, scaleY: 0.5, alpha: { start: 0.25, end: 0 }, frequency: 380,
    });

    // the hero on the cliff, sword pointed at the castle
    const hx = BX(46), hy = GAME_H - 80 - 30;
    this.add.image(hx, hy + 30, 'shadow').setScale(4, 3).setAlpha(0.6);
    const hero = this.add.sprite(hx, hy, 'hero_idle0').setScale(4).play('hero_idle');
    const sword = this.add.image(hx + 14, hy + 6, 'w_sword').setScale(4).setOrigin(0.15, 0.5).setRotation(-0.62);
    const glint = this.add.image(hx + 14 + Math.cos(-0.62) * 52, hy + 6 + Math.sin(-0.62) * 52, 'spark').setBlendMode(Phaser.BlendModes.ADD).setScale(0);
    this.time.addEvent({
      delay: 2800, loop: true, callback: () => this.tweens.add({ targets: glint, scale: 2.2, angle: 90, duration: 180, yoyo: true }),
    });
    this.tweens.add({ targets: [hero, sword], y: '-=2', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // slimes hopping in the meadow
    [0.66, 0.78, 0.9].forEach((fx, i) => {
      const base = GAME_H - 36 - 22;
      const s = this.add.image(GAME_W * fx, base, i === 1 ? 'slime_blue' : 'slime').setScale(3).setFlipX(true);
      this.add.image(s.x, base + 22, 'shadow').setScale(2.2, 2).setAlpha(0.5).setDepth(-1);
      this.tweens.add({ targets: s, y: base - 14, scaleY: 3.4, scaleX: 2.7, duration: 300, yoyo: true, repeat: -1, delay: i * 210, ease: 'Quad.easeOut' });
    });
  }

  private buildLogo() {
    const items: Phaser.GameObjects.GameObject[] = [];
    // crossed swords behind the title
    const s1 = this.add.image(-150, 14, 'w_legend').setScale(3).setRotation(-Math.PI / 4);
    const s2 = this.add.image(150, 14, 'w_legend').setScale(3).setRotation(-Math.PI * 0.75).setFlipY(true);
    const glow = this.add.image(0, 18, 'glow').setTint(0xffb040).setBlendMode(Phaser.BlendModes.ADD).setScale(5, 1.6).setAlpha(0.18);
    const t1 = text(this, 0, 0, 'THE HERO', 32, TEXT_COLORS.gold, { stroke: '#2a0a20', strokeThickness: 8 }).setOrigin(0.5);
    const t2 = text(this, 0, 38, 'WAS NOT INVITED', 16, '#ffffff', { stroke: '#2a0a20', strokeThickness: 6 }).setOrigin(0.5);
    t1.preFX?.addShine(0.5, 0.25, 4);
    // ribbon with the Thai title
    const rib = this.add.graphics();
    const rw = 190, ry = 66;
    rib.fillStyle(0x5a1030).fillTriangle(-rw / 2 - 18, ry - 9, -rw / 2, ry - 9, -rw / 2, ry + 9).fillTriangle(-rw / 2 - 18, ry + 9, -rw / 2, ry - 9, -rw / 2, ry + 9);
    rib.fillStyle(0x5a1030).fillTriangle(rw / 2 + 18, ry - 9, rw / 2, ry - 9, rw / 2, ry + 9).fillTriangle(rw / 2 + 18, ry + 9, rw / 2, ry - 9, rw / 2, ry + 9);
    rib.fillStyle(0x0a0410, 0.6).fillTriangle(-rw / 2 - 26, ry - 12, -rw / 2 - 12, ry, -rw / 2 - 26, ry + 12).fillTriangle(rw / 2 + 26, ry - 12, rw / 2 + 12, ry, rw / 2 + 26, ry + 12);
    rib.fillStyle(0xa02050).fillRect(-rw / 2, ry - 11, rw, 22);
    rib.fillStyle(0xd04070).fillRect(-rw / 2, ry - 11, rw, 2);
    rib.fillStyle(0x6a1438).fillRect(-rw / 2, ry + 9, rw, 2);
    const t3 = text(this, 0, ry, 'ผู้กล้าที่ไม่ได้รับเชิญ', 8, '#fff0f4', { stroke: '#4a0a20', strokeThickness: 3 }).setOrigin(0.5);
    items.push(glow, s1, s2, t1, t2, rib, t3);
    this.logo = this.add.container(GAME_W / 2, -120, items).setDepth(30);
    this.tweens.add({ targets: s1, rotation: -Math.PI / 4 - 0.05, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: s2, rotation: -Math.PI * 0.75 + 0.05, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ------------------------------------------------------------------ flow
  private splash() {
    // logo drops in, then "tap to start"
    this.tweens.add({ targets: this.logo, y: 78, duration: 1100, delay: 300, ease: 'Bounce.easeOut' });
    const prompt = text(this, GAME_W / 2, GAME_H - 64, 'แตะหน้าจอเพื่อเริ่มการผจญภัย', 16, '#ffffff', { stroke: '#1a0a20', strokeThickness: 5 })
      .setOrigin(0.5).setDepth(35).setAlpha(0);
    this.tweens.add({ targets: prompt, alpha: 1, delay: 1400, duration: 500 });
    this.tweens.add({ targets: prompt, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 1900 });
    const go = () => {
      if (this.revealed) return;
      MenuScene.started = true;
      Audio.unlock();
      Audio.sfx('start');
      Audio.playMusic('menu');
      this.cameras.main.flash(250, 255, 240, 220);
      this.tweens.add({ targets: prompt, alpha: 0, y: prompt.y + 20, duration: 250, onComplete: () => prompt.destroy() });
      this.reveal(false);
    };
    this.time.delayedCall(900, () => {
      this.input.once('pointerdown', go);
      this.input.keyboard?.once('keydown', go);
    });
  }

  private reveal(instant: boolean) {
    this.revealed = true;
    if (instant) this.logo.setY(70);
    else this.tweens.add({ targets: this.logo, y: 70, duration: 500, ease: 'Sine.easeOut' });

    const snap = Progress.data.snapshot;
    const entries: [string, () => void, number?][] = [];
    if (snap) entries.push([`เล่นต่อ: ${STAGES[snap.stage].name}`, () => this.startRun(true), 0x3a2050]);
    entries.push(['เริ่มเกมใหม่', () => this.startRun(false)]);
    entries.push(['ตั้งค่า', () => this.scene.launch('Settings')]);
    entries.push(['เครดิต', () => this.showCredits()]);

    const startY = snap ? 170 : 184;
    const buttons: Button[] = [];
    this.pointer = this.add.image(0, 0, 'w_sword').setScale(1.5).setDepth(36).setVisible(false);
    entries.forEach(([label, fn, color], i) => {
      const y = startY + i * 34;
      const b = new Button(this, GAME_W / 2, y, label, fn, 230, 28, color ?? 0x2a2048).setDepth(35);
      buttons.push(b);
      b.on('pointerover', () => {
        this.pointer.setVisible(true).setPosition(GAME_W / 2 - 138, y);
        this.tweens.killTweensOf(this.pointer);
        this.tweens.add({ targets: this.pointer, x: GAME_W / 2 - 132, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });
      if (!instant) {
        b.setAlpha(0).setY(y + 30);
        this.tweens.add({ targets: b, alpha: 1, y, duration: 420, delay: 250 + i * 90, ease: 'Back.easeOut' });
      }
    });
    keyboardMenu(this, buttons);

    // achievement badge (top-left)
    if (Progress.data.achievements.includes('third_wheel')) {
      const g = this.add.graphics().setDepth(35);
      drawPanel(g, 8, 8, 200, 40, 0x2a1a10, 0xf0c040, 0.9);
      const cup = this.add.image(28, 28, 'trophy').setScale(2).setDepth(35);
      this.tweens.add({ targets: cup, angle: { from: -6, to: 6 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      text(this, 46, 11, 'ความสำเร็จ', 8, TEXT_COLORS.gold).setDepth(35);
      text(this, 46, 27, 'ก้างขวางคอขั้นสุดยอด', 8, TEXT_COLORS.white).setDepth(35);
    }
  }

  /** Lightning flash that briefly reveals the Queen in full color. */
  private lightning() {
    if (!this.scene.isActive()) return;
    const tx = this.queen.x + Phaser.Math.Between(-30, 30);
    const g = this.add.graphics().setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
    let x = tx + Phaser.Math.Between(-40, 40), y = 0;
    g.lineStyle(2, 0xf0e8ff, 1).beginPath().moveTo(x, y);
    while (y < this.queen.y - 26) {
      x += Phaser.Math.Between(-10, 10); y += Phaser.Math.Between(6, 14);
      g.lineTo(x, y);
    }
    g.strokePath();
    this.flash.setFillStyle(0xe8e0ff, 0.45);
    this.tweens.add({ targets: this.flash, fillAlpha: 0, duration: 120, yoyo: true, hold: 40, onComplete: () => this.tweens.add({ targets: this.flash, fillAlpha: 0, duration: 1 }) });
    this.tweens.add({ targets: g, alpha: 0, duration: 380, onComplete: () => g.destroy() });
    this.queen.clearTint();
    this.queenEyes.forEach((e) => e.setVisible(false));
    this.time.delayedCall(220, () => { this.queen.setTint(0x1a0818); this.queenEyes.forEach((e) => e.setVisible(true)); });
    if (MenuScene.started) this.time.delayedCall(250, () => Audio.sfx('thunder'));
    this.time.delayedCall(Phaser.Math.Between(5500, 9500), () => this.lightning());
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
