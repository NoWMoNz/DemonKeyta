import Phaser from 'phaser';
import { GAME_W, GAME_H, TEXT_COLORS } from '../game/constants';
import { Button, drawPanel, text, keyboardMenu } from '../ui/widgets';
import { Audio } from '../audio/AudioEngine';
import { Progress } from '../systems/ProgressionSystem';
import { PERKS } from '../data/perks';
import type { GameScene } from './GameScene';

export class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  create() {
    const gs = this.scene.get('Game') as GameScene;
    const run = gs.run;
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05030a, 0.7).setOrigin(0).setInteractive();
    const g = this.add.graphics();
    const w = 300, h = 250, x = (GAME_W - w) / 2, y = (GAME_H - h) / 2;
    drawPanel(g, x, y, w, h, 0x150f24, 0x8a6ac0, 0.98);
    text(this, GAME_W / 2, y + 14, 'หยุดชั่วคราว', 16, TEXT_COLORS.gold).setOrigin(0.5, 0);
    const mins = Math.floor(run.timeMs / 60000), secs = Math.floor((run.timeMs % 60000) / 1000);
    text(this, GAME_W / 2, y + 50, `${gs.stage.name}   เวลา ${mins}:${String(secs).padStart(2, '0')}   ฆ่า ${run.kills}`, 8, TEXT_COLORS.gray).setOrigin(0.5, 0);
    const perks = run.perks.map((id) => PERKS.find((p) => p.id === id)?.name).filter(Boolean).join(', ');
    text(this, GAME_W / 2, y + 68, perks ? `พลังเสริม: ${perks}` : 'ยังไม่มีพลังเสริม', 8, TEXT_COLORS.purple, { wordWrap: { width: w - 30 }, align: 'center' }).setOrigin(0.5, 0);

    let row = y + 108;
    const resume = () => {
      Audio.setDuck(1);
      this.scene.stop();
      this.scene.resume('Game');
    };
    const buttons = [
      new Button(this, GAME_W / 2, row, 'เล่นต่อ', resume, 200),
      new Button(this, GAME_W / 2, (row += 32), 'เริ่มด่านนี้ใหม่', () => {
        Audio.setDuck(1);
        const r = Progress.restoreCheckpoint();
        this.scene.stop('HUD');
        this.scene.stop('Settings');
        this.scene.start('Game', { run: r ?? undefined });
      }, 200),
      new Button(this, GAME_W / 2, (row += 32), 'ตั้งค่า', () => this.scene.launch('Settings'), 200),
      new Button(this, GAME_W / 2, (row += 32), 'เมนูหลัก', () => {
        Audio.setDuck(1);
        this.scene.stop('HUD');
        this.scene.stop('Game');
        this.scene.stop('Settings');
        this.scene.start('Menu');
      }, 200, 26, 0x3a1a2a),
    ];
    keyboardMenu(this, buttons);
    this.input.keyboard?.on('keydown-ESC', () => { if (!this.scene.isActive('Settings')) resume(); });
    this.input.keyboard?.on('keydown-P', resume);
  }
}
