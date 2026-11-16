import Phaser from 'phaser';
import { DEPTH } from '../game/constants';
import type { EnemyDef } from '../data/enemies';
import { Audio } from '../audio/AudioEngine';
import { runAI } from '../systems/EnemyAI';
import type { GameScene } from '../scenes/GameScene';

export interface EnemyOpts { elite?: boolean; minion?: boolean }

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare scene: GameScene;
  def: EnemyDef;
  hp: number;
  maxHp: number;
  elite: boolean;
  minion: boolean;
  state = 'spawn';
  t = 0;
  cd = 0;
  vx = 0;
  vy = 0;
  kx = 0;
  ky = 0;
  dead = false;
  airborne = false;
  invulnerable = false;
  enraged = false;
  mem: Record<string, number> = {};
  baseScale: number;
  shadow: Phaser.GameObjects.Image;
  aura: Phaser.GameObjects.Image | null = null;
  private animT = 0;
  private frameIdx = 0;
  private flashT = 0;

  constructor(scene: GameScene, x: number, y: number, def: EnemyDef, opts: EnemyOpts = {}) {
    super(scene, x, y, def.textures[0]);
    this.def = def;
    this.elite = !!opts.elite;
    this.minion = !!opts.minion;
    const stageHpMul = 1 + scene.stageIndex * 0.15;
    this.maxHp = this.hp = def.hp * (def.boss ? 1 : stageHpMul) * (this.elite ? 2.6 : 1);
    this.baseScale = def.scale * (this.elite ? 1.3 : 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.ENTITY);
    const r = def.radius;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(r, this.width / 2 - r, this.height - r * 2 - 1);
    if (def.boss) body.setImmovable(true);
    this.shadow = scene.add.image(x, y, 'shadow').setDepth(DEPTH.SHADOW).setScale(this.baseScale * 0.9);
    if (this.elite) {
      this.aura = scene.add.image(x, y, 'glow').setDepth(DEPTH.ENTITY - 1).setTint(0xff3050)
        .setBlendMode(Phaser.BlendModes.ADD).setScale(0.55 * this.baseScale).setAlpha(0.5);
    }
    // spawn pop-in
    this.setScale(0.1).setAlpha(0);
    this.t = 320;
    scene.tweens.add({ targets: this, scale: this.baseScale, alpha: def.id === 'wisp' ? 0.8 : 1, duration: 300, ease: 'Back.easeOut' });
    this.cd = Phaser.Math.Between(600, 1400);
  }

  get hitRadius() { return this.def.radius * this.baseScale; }
  get canContact() { return !this.dead && this.state !== 'spawn' && !this.airborne; }

  hit(dmg: number, angle: number, force: number, crit = false) {
    if (this.dead || this.state === 'spawn') return;
    if (this.invulnerable) {
      this.scene.fx.number(this.x, this.y - 10, 'ไม่ระคาย!', '#c0c0c0');
      return;
    }
    this.hp -= dmg;
    const resist = this.def.boss ? 0.08 : this.def.id === 'knight' ? 0.4 : 1;
    this.kx += Math.cos(angle) * force * resist;
    this.ky += Math.sin(angle) * force * resist;
    this.flashT = 70;
    this.setTintFill(0xffffff);
    this.scene.fx.number(this.x, this.y - 8 * this.baseScale, dmg, crit ? '#ffd040' : '#ffffff', crit);
    this.scene.fx.burst(this.x, this.y, crit ? 0xffd040 : 0xffffff, crit ? 6 : 3);
    Audio.sfx('hit', 40);
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.hp = 0;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    Audio.sfx('enemyDie');
    const color = this.deathColor();
    this.scene.fx.burst(this.x, this.y, color, this.def.boss ? 40 : 14);
    this.scene.fx.puff(this.x, this.y, this.def.boss ? 14 : 5, 0xd0c8e0);
    if (this.elite) {
      // fair, slow death burst
      for (let i = 0; i < 8; i++) this.scene.enemyShoot(this.x, this.y, (i / 8) * Math.PI * 2, 70, 'e_orb', 1);
    }
    this.clearTint();
    this.scene.tweens.add({
      targets: this, scaleX: this.baseScale * 1.4, scaleY: 0.1, alpha: 0, duration: 220,
      onComplete: () => this.destroy(),
    });
    this.scene.onEnemyKilled(this);
  }

  private deathColor() {
    switch (this.def.id) {
      case 'slime': case 'slimeking': return 0x5ad05a;
      case 'slime_blue': return 0x60a0ff;
      case 'shroom': return 0xe04848;
      case 'imp': case 'knight': return 0xff4040;
      case 'mage': return 0xa060ff;
      case 'wisp': return 0xa0f0ff;
      case 'bat': return 0x8a6ab0;
      default: return 0xece6d6;
    }
  }

  update(time: number, dt: number) {
    if (this.dead) return;
    this.shadow.setPosition(this.x, this.y + this.height * 0.5 * this.scaleY - 2);
    this.aura?.setPosition(this.x, this.y);
    if (this.flashT > 0) this.flashT -= dt;
    else this.clearTint();
    if (this.state === 'spawn') {
      this.t -= dt;
      this.setVelocity(0, 0);
      if (this.t <= 0) this.state = 'init';
      return;
    }
    if (this.scene.cutscene) { this.setVelocity(0, 0); return; }

    // animation
    if (this.def.textures.length > 1) {
      this.animT += dt;
      if (this.animT > 140) { this.animT = 0; this.frameIdx = (this.frameIdx + 1) % this.def.textures.length; this.setTexture(this.def.textures[this.frameIdx]); }
    }

    this.vx = 0; this.vy = 0;
    runAI(this, dt, time);

    const k = Math.exp(-dt / 90);
    this.kx *= k; this.ky *= k;
    this.setVelocity(this.vx + this.kx, this.vy + this.ky);
    if (this.def.behavior !== 'hopper' && this.def.behavior !== 'slimeking' && Math.abs(this.vx) > 2) this.setFlipX(this.vx < 0);
  }

  /** Brief tint used for attack telegraphs. */
  warn(color = 0xff4040) {
    if (this.flashT <= 0) this.setTint(color);
  }

  destroy(fromScene?: boolean) {
    this.shadow?.destroy();
    this.aura?.destroy();
    super.destroy(fromScene);
  }
}
