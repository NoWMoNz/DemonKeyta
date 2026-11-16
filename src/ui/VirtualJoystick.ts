import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../game/constants';
import { Input } from '../systems/InputState';

/** Floating virtual joystick on the left side of the screen. */
export class VirtualJoystick {
  private base: Phaser.GameObjects.Image;
  private thumb: Phaser.GameObjects.Image;
  private pointerId = -1;
  private ox = 0;
  private oy = 0;
  private readonly radius = 34;
  private homeX = 80;
  private homeY = GAME_H - 80;

  constructor(private scene: Phaser.Scene) {
    this.base = scene.add.image(this.homeX, this.homeY, 'ring').setScale(1.1).setAlpha(0.35).setDepth(900).setScrollFactor(0);
    this.thumb = scene.add.image(this.homeX, this.homeY, 'circle').setScale(0.45).setAlpha(0.5).setDepth(901).setScrollFactor(0).setTint(0xd0c0ff);

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.pointerId !== -1 || p.x > GAME_W * 0.42 || p.y < 60) return;
      this.pointerId = p.id;
      this.ox = p.x; this.oy = p.y;
      this.base.setPosition(p.x, p.y).setAlpha(0.6);
      this.thumb.setPosition(p.x, p.y).setAlpha(0.85);
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pointerId) return;
      let dx = p.x - this.ox, dy = p.y - this.oy;
      const len = Math.hypot(dx, dy);
      if (len > this.radius) { dx = (dx / len) * this.radius; dy = (dy / len) * this.radius; }
      this.thumb.setPosition(this.ox + dx, this.oy + dy);
      const dead = 6;
      if (len < dead) { Input.touchMoveX = 0; Input.touchMoveY = 0; }
      else { Input.touchMoveX = dx / this.radius; Input.touchMoveY = dy / this.radius; }
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pointerId) return;
      this.pointerId = -1;
      Input.touchMoveX = 0; Input.touchMoveY = 0;
      this.base.setPosition(this.homeX, this.homeY).setAlpha(0.35);
      this.thumb.setPosition(this.homeX, this.homeY).setAlpha(0.5);
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
  }

  setVisible(v: boolean) { this.base.setVisible(v); this.thumb.setVisible(v); }
}
