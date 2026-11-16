import Phaser from 'phaser';
import { DEPTH } from '../game/constants';
import { fontStyle } from '../ui/thai';
import { Settings } from './Settings';

/** Visual effects helper bound to a scene. */
export class Fx {
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private hearts: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private scene: Phaser.Scene) {
    this.sparks = scene.add.particles(0, 0, 'px', {
      speed: { min: 40, max: 150 }, lifespan: { min: 200, max: 450 }, scale: { start: 1, end: 0 },
      angle: { min: 0, max: 360 }, emitting: false,
    }).setDepth(DEPTH.FX);
    this.smoke = scene.add.particles(0, 0, 'smoke', {
      speed: { min: 10, max: 50 }, lifespan: { min: 300, max: 600 }, scale: { start: 0.7, end: 0 },
      alpha: { start: 0.6, end: 0 }, angle: { min: 0, max: 360 }, emitting: false,
    }).setDepth(DEPTH.FX - 1);
    this.hearts = scene.add.particles(0, 0, 'heart_px', {
      speed: { min: 20, max: 90 }, lifespan: { min: 600, max: 1200 }, scale: { start: 1.2, end: 0.4 },
      alpha: { start: 1, end: 0 }, angle: { min: 200, max: 340 }, gravityY: -20, emitting: false, tint: 0xff6aa8,
    }).setDepth(DEPTH.FX);
  }

  burst(x: number, y: number, color: number, count = 10) {
    this.sparks.setParticleTint(color);
    this.sparks.explode(count, x, y);
  }

  puff(x: number, y: number, count = 6, color = 0xffffff) {
    this.smoke.setParticleTint(color);
    this.smoke.explode(count, x, y);
  }

  /** Small puff of dust at the feet (footsteps). */
  dust(x: number, y: number) {
    const d = this.scene.add.image(x + Phaser.Math.Between(-2, 2), y, 'smoke').setDepth(DEPTH.SHADOW + 0.5)
      .setTint(0xd8d0c0).setAlpha(0.35).setScale(0.35);
    this.scene.tweens.add({ targets: d, scale: 0.7, alpha: 0, y: y - 3, duration: 380, onComplete: () => d.destroy() });
  }

  heartBurst(x: number, y: number, count = 12) {
    this.hearts.explode(count, x, y);
  }

  shake(intensity = 0.004, duration = 120) {
    if (!Settings.data.screenShake) return;
    this.scene.cameras.main.shake(duration, intensity);
  }

  flash(duration = 80, r = 255, g = 255, b = 255) {
    this.scene.cameras.main.flash(duration, r, g, b);
  }

  number(x: number, y: number, value: number | string, color = '#ffffff', big = false) {
    const str = typeof value === 'number' ? String(Math.round(value)) : value;
    const t = this.scene.add.text(x, y - 6, str, {
      ...fontStyle(str, 8), color, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTH.TEXT).setScale(big ? 0.75 : 0.5);
    this.scene.tweens.add({
      targets: t, y: y - 22, duration: 500, ease: 'Quad.easeOut',
      onComplete: () => this.scene.tweens.add({ targets: t, alpha: 0, duration: 200, onComplete: () => t.destroy() }),
    });
    return t;
  }

  /** A short-lived sprite that fades/scales out. */
  ghost(tex: string, x: number, y: number, opts: { tint?: number; scale?: number; flipX?: boolean; duration?: number; alpha?: number; rotation?: number } = {}) {
    const g = this.scene.add.image(x, y, tex).setDepth(DEPTH.ENTITY - 1).setAlpha(opts.alpha ?? 0.6)
      .setScale(opts.scale ?? 1).setFlipX(!!opts.flipX).setRotation(opts.rotation ?? 0);
    if (opts.tint !== undefined) g.setTintFill(opts.tint);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: opts.duration ?? 250, onComplete: () => g.destroy() });
    return g;
  }

  ringPulse(x: number, y: number, color: number, toScale = 1.5, duration = 400) {
    const r = this.scene.add.image(x, y, 'ring').setTint(color).setDepth(DEPTH.FX).setScale(0.1).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: r, scale: toScale, alpha: 0, duration, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
  }
}
