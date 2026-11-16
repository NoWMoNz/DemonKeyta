import Phaser from 'phaser';
import { GAME_W, GAME_H, TEXT_COLORS } from '../game/constants';
import { Button, text, keyboardMenu } from '../ui/widgets';
import { Progress, RunState } from '../systems/ProgressionSystem';
import { STAGES } from '../data/stages';
import { Audio } from '../audio/AudioEngine';

const QUIPS = [
  'ราชินีปีศาจไม่ได้สังเกตด้วยซ้ำ',
  'ที่ไหนสักแห่ง สไลม์กำลังหัวเราะเยาะเจ้าอยู่',
  'พระราชา "ไม่ได้โกรธ แค่ผิดหวัง"',
  'ทิป: ตอนแดช จะไม่โดนดาเมจชั่วครู่!',
  'ทิป: ดาบฟันกระสุนศัตรูทิ้งได้!',
  'ทิป: วงกลมสีแดงจะระเบิด อย่ายืนอยู่ในนั้น',
  'ทิป: เกราะจะฟื้นเองถ้าไม่โดนตีสักพัก',
];

export class GameOverScene extends Phaser.Scene {
  private run!: RunState;
  private atBoss = false;
  constructor() { super('GameOver'); }

  init(data: { run: RunState; atBoss?: boolean }) { this.run = data.run; this.atBoss = !!data.atBoss; }

  create() {
    this.cameras.main.fadeIn(600);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0408).setOrigin(0);
    this.add.particles(0, 0, 'px', {
      x: { min: 0, max: GAME_W }, y: -4, speedY: { min: 20, max: 50 }, lifespan: 9000, scale: { start: 1, end: 0.5 },
      alpha: { start: 0.6, end: 0 }, frequency: 80, tint: 0x802030,
    });
    const hero = this.add.image(GAME_W / 2, 120, 'hero_dead').setScale(4).setAngle(90).setTint(0x9090a0);
    this.add.image(GAME_W / 2, 140, 'shadow').setScale(4);
    void hero;
    const title = text(this, GAME_W / 2, 50, 'คุณตายแล้ว', 24, TEXT_COLORS.red, { stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setScale(2).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 600, ease: 'Bounce.easeOut' });
    const r = this.run;
    const mins = Math.floor(r.timeMs / 60000), secs = Math.floor((r.timeMs % 60000) / 1000);
    text(this, GAME_W / 2, 170, `ไปถึง: ${STAGES[r.stage].name}`, 8, TEXT_COLORS.white).setOrigin(0.5);
    text(this, GAME_W / 2, 186, `ฆ่า: ${r.kills}    เวลา: ${mins}:${String(secs).padStart(2, '0')}`, 8, TEXT_COLORS.gray).setOrigin(0.5);
    text(this, GAME_W / 2, 208, Phaser.Utils.Array.GetRandom(QUIPS), 8, TEXT_COLORS.purple).setOrigin(0.5);

    const buttons: Button[] = [];
    let y = 244;
    const bossRun = this.atBoss ? Progress.restoreBossCheckpoint() : null;
    if (bossRun) {
      buttons.push(new Button(this, GAME_W / 2, y, 'สู้บอสใหม่', () => this.scene.start('Game', { run: bossRun, toBoss: true }), 220));
      y += 32;
    }
    buttons.push(new Button(this, GAME_W / 2, y, 'เริ่มด่านนี้ใหม่', () => {
      const run = Progress.restoreCheckpoint();
      this.scene.start('Game', { run: run ?? undefined });
    }, 220));
    y += 32;
    buttons.push(new Button(this, GAME_W / 2, y, 'เมนูหลัก', () => this.scene.start('Menu'), 220, 26, 0x3a1a2a));
    keyboardMenu(this, buttons);
    Audio.playMusic('sad');
  }
}
