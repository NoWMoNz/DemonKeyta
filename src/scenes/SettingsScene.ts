import Phaser from 'phaser';
import { GAME_W, GAME_H, TEXT_COLORS } from '../game/constants';
import { Button, drawPanel, text } from '../ui/widgets';
import { Settings } from '../systems/Settings';
import { Audio } from '../audio/AudioEngine';

export class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }

  create() {
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.6).setOrigin(0).setInteractive();
    const g = this.add.graphics();
    const w = 320, h = 236, x = (GAME_W - w) / 2, y = (GAME_H - h) / 2;
    drawPanel(g, x, y, w, h, 0x150f24, 0x8a6ac0, 0.98);
    text(this, GAME_W / 2, y + 14, 'ตั้งค่า', 16, TEXT_COLORS.gold).setOrigin(0.5, 0);

    const s = Settings.data;
    const apply = () => { Settings.save(); Audio.applySettings(); };
    const label = (on: boolean) => (on ? 'เปิด' : 'ปิด');
    let row = y + 52;
    const music = new Button(this, GAME_W / 2, row, `เพลง: ${label(s.music)}`, () => { s.music = !s.music; music.setLabel(`เพลง: ${label(s.music)}`); apply(); }, 240); row += 30;
    const vol = new Button(this, GAME_W / 2, row, `ระดับเสียงเพลง: ${Math.round(s.musicVolume * 10)}`, () => {
      s.musicVolume = s.musicVolume >= 1 ? 0.1 : Math.round((s.musicVolume + 0.1) * 10) / 10;
      vol.setLabel(`ระดับเสียงเพลง: ${Math.round(s.musicVolume * 10)}`); apply();
    }, 240); row += 30;
    const sfx = new Button(this, GAME_W / 2, row, `เสียงเอฟเฟกต์: ${label(s.sfx)}`, () => { s.sfx = !s.sfx; sfx.setLabel(`เสียงเอฟเฟกต์: ${label(s.sfx)}`); apply(); }, 240); row += 30;
    const sfxVol = new Button(this, GAME_W / 2, row, `ระดับเสียงเอฟเฟกต์: ${Math.round(s.sfxVolume * 10)}`, () => {
      s.sfxVolume = s.sfxVolume >= 1 ? 0.1 : Math.round((s.sfxVolume + 0.1) * 10) / 10;
      sfxVol.setLabel(`ระดับเสียงเอฟเฟกต์: ${Math.round(s.sfxVolume * 10)}`); apply(); Audio.sfx('pickup');
    }, 240); row += 30;
    const shake = new Button(this, GAME_W / 2, row, `จอสั่น: ${label(s.screenShake)}`, () => { s.screenShake = !s.screenShake; shake.setLabel(`จอสั่น: ${label(s.screenShake)}`); apply(); }, 240); row += 38;
    new Button(this, GAME_W / 2, row, 'กลับ', () => this.scene.stop(), 140, 26, 0x3a1a2a);
    this.input.keyboard?.once('keydown-ESC', () => this.scene.stop());
  }
}
