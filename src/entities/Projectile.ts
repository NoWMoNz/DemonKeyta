import Phaser from 'phaser';
import { DEPTH } from '../game/constants';

export interface BulletOpts {
  pierce?: number;
  homing?: number;
  knock?: number;
  crit?: boolean;
  life?: number;
  accel?: number; // px/s^2
  turn?: number; // rad/s (curving bullets)
  spin?: number; // visual rotation speed
  scale?: number;
  tint?: number;
  delay?: number; // ms before moving (for staged patterns)
  noWall?: boolean; // passes through walls
}

/** Pooled projectile used by both the player and enemies. */
export class Bullet extends Phaser.Physics.Arcade.Image {
  damage = 1;
  life = 0;
  pierce = 0;
  homing = 0;
  knock = 0;
  crit = false;
  accel = 0;
  turn = 0;
  spin = 0;
  speed = 0;
  angleRad = 0;
  delay = 0;
  noWall = false;
  hits = new Set<unknown>();
  homingTarget: (() => { x: number; y: number } | null) | null = null;

  fire(x: number, y: number, angle: number, speed: number, tex: string, damage: number, o: BulletOpts = {}) {
    this.setTexture(tex);
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true).setAlpha(1);
    this.setDepth(DEPTH.PROJECTILE);
    this.setScale(o.scale ?? 1);
    if (o.tint !== undefined) this.setTint(o.tint); else this.clearTint();
    this.damage = damage;
    this.speed = speed;
    this.angleRad = angle;
    this.life = o.life ?? 3000;
    this.pierce = o.pierce ?? 0;
    this.homing = o.homing ?? 0;
    this.knock = o.knock ?? 0;
    this.crit = !!o.crit;
    this.accel = o.accel ?? 0;
    this.turn = o.turn ?? 0;
    this.spin = o.spin ?? 0;
    this.delay = o.delay ?? 0;
    this.noWall = !!o.noWall;
    this.hits.clear();
    const w = this.width, h = this.height;
    const r = Math.max(1.5, Math.min(w, h) / 2 - 0.5);
    if (Math.abs(w - h) <= 2) this.body!.setCircle(r, w / 2 - r, h / 2 - r);
    else (this.body as Phaser.Physics.Arcade.Body).setSize(Math.min(w, h) + 1, Math.min(w, h) + 1, true);
    this.setRotation(this.spin ? 0 : angle);
    this.applyVel();
    return this;
  }

  private applyVel() {
    const s = this.delay > 0 ? 0 : this.speed;
    this.setVelocity(Math.cos(this.angleRad) * s, Math.sin(this.angleRad) * s);
  }

  kill() {
    this.disableBody(true, true);
    this.homingTarget = null;
  }

  update(_time: number, dt: number) {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) { this.kill(); return; }
    const sec = dt / 1000;
    let changed = false;
    if (this.delay > 0) {
      this.delay -= dt;
      if (this.delay <= 0) changed = true;
    }
    if (this.accel) { this.speed = Math.max(10, this.speed + this.accel * sec); changed = true; }
    if (this.turn) { this.angleRad += this.turn * sec; changed = true; }
    if (this.homing && this.homingTarget) {
      const t = this.homingTarget();
      if (t) {
        const want = Math.atan2(t.y - this.y, t.x - this.x);
        let d = want - this.angleRad;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.angleRad += Phaser.Math.Clamp(d, -this.homing * sec, this.homing * sec);
        changed = true;
      }
    }
    if (changed) this.applyVel();
    if (this.spin) this.rotation += this.spin * sec;
    else if (changed) this.rotation = this.angleRad;
    if (this.life < 120) this.setAlpha(this.life / 120);
  }
}
