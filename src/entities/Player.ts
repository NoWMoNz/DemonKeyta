import Phaser from 'phaser';
import { DEPTH } from '../game/constants';
import { Input } from '../systems/InputState';
import type { RunState } from '../systems/ProgressionSystem';
import { WEAPONS, WeaponDef } from '../data/weapons';
import { Audio } from '../audio/AudioEngine';
import { damp, angleTo } from '../utils/math';
import { playerAttack } from '../weapons/WeaponSystem';
import type { GameScene } from '../scenes/GameScene';

const BASE_SPEED = 92;
const DASH_SPEED = 300;
const DASH_TIME = 170;
const DASH_CD = 950;
const IFRAMES = 1000;
const ARMOR_DELAY = 3500;
const ARMOR_TICK = 900;

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare scene: GameScene;
  run: RunState;
  weaponSprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  aim = 0;
  dashTime = 0;
  dashCd = 0;
  dashDir = 0;
  invuln = 0;
  attackCd = 0;
  sinceHit = 99999;
  armorTick = 0;
  recoil = 0;
  swing = 0;
  swingSign = 1;
  dead = false;
  vx = 0;
  vy = 0;
  buffs = { rage: 0, haste: 0, shield: 0 };
  private afterTimer = 0;
  private stepTimer = 0;
  private aura: Phaser.GameObjects.Image;
  private light: Phaser.GameObjects.Image;

  constructor(scene: GameScene, x: number, y: number, run: RunState) {
    super(scene, x, y, 'hero_idle0');
    this.run = run;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.ENTITY);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(8, 6).setOffset(4, 10);
    this.setOrigin(0.5, 0.6);
    this.shadow = scene.add.image(x, y + 6, 'shadow').setDepth(DEPTH.SHADOW);
    this.weaponSprite = scene.add.image(x, y, this.weapon.texture).setDepth(DEPTH.WEAPON);
    this.light = scene.add.image(x, y, 'glow').setDepth(DEPTH.FLOOR + 1).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0d0).setAlpha(0.13).setScale(2.4);
    this.aura = scene.add.image(x, y, 'glow').setDepth(DEPTH.ENTITY - 1).setBlendMode(Phaser.BlendModes.ADD).setVisible(false).setScale(0.6);
    this.refreshWeapon();
    this.play('hero_idle');
  }

  get weapon(): WeaponDef {
    const id = this.run.weapons[this.run.slot] ?? this.run.weapons.find((w) => w) ?? 'sword';
    return WEAPONS[id];
  }

  refreshWeapon() {
    const w = this.weapon;
    this.weaponSprite.setTexture(w.texture).setOrigin(w.originX, 0.5);
  }

  swapWeapon() {
    const other = 1 - this.run.slot;
    if (!this.run.weapons[other]) return;
    this.run.slot = other;
    this.refreshWeapon();
    this.attackCd = Math.min(this.attackCd, 120);
    Audio.sfx('click');
    this.scene.events.emit('weapon-changed');
  }

  heal(n: number) {
    const before = this.run.hp;
    this.run.hp = Math.min(this.run.maxHp, this.run.hp + n);
    if (this.run.hp > before) {
      this.scene.fx.number(this.x, this.y - 8, `+${this.run.hp - before}`, '#7ee07a');
      this.scene.fx.heartBurst(this.x, this.y - 4, 6);
    }
  }

  hurt(amount: number, fromX: number, fromY: number) {
    if (this.dead || this.invuln > 0 || this.dashTime > 0 || this.scene.cutscene) return false;
    this.sinceHit = 0;
    this.invuln = IFRAMES;
    const a = angleTo(fromX, fromY, this.x, this.y);
    this.vx += Math.cos(a) * 140;
    this.vy += Math.sin(a) * 140;
    if (this.buffs.shield > 0) {
      this.buffs.shield = 0;
      this.scene.fx.ringPulse(this.x, this.y, 0xf0c040, 0.8);
      this.scene.fx.burst(this.x, this.y, 0xf0c040, 14);
      Audio.sfx('armorBreak');
      this.invuln = 600;
      return true;
    }
    let dmg = amount;
    const r = this.run;
    if (r.armor > 0) {
      const absorbed = Math.min(r.armor, dmg);
      r.armor -= absorbed;
      dmg -= absorbed;
      Audio.sfx('armorBreak');
      this.scene.fx.burst(this.x, this.y, 0x8fa8c8, 8);
    }
    if (dmg > 0) {
      r.hp = Math.max(0, r.hp - dmg);
      Audio.sfx('hurt');
      this.scene.fx.shake(0.008, 160);
      this.scene.events.emit('player-hurt');
    }
    this.scene.fx.number(this.x, this.y - 8, `-${amount}`, '#ff6060');
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => { if (!this.dead) this.clearTint(); });
    if (r.hp <= 0) this.die();
    return true;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.stop();
    this.setTexture('hero_dead');
    this.setVelocity(0, 0);
    this.weaponSprite.setVisible(false);
    this.aura.setVisible(false);
    this.scene.tweens.add({ targets: this, angle: this.flipX ? -90 : 90, duration: 400, ease: 'Bounce.easeOut' });
    this.setTint(0x8080a0);
    this.scene.fx.burst(this.x, this.y, 0xe04848, 20);
    this.scene.onPlayerDeath();
  }

  update(_t: number, dt: number) {
    const sec = dt / 1000;
    this.shadow.setPosition(this.x, this.y + 6);
    this.light.setPosition(this.x, this.y + 2);
    if (this.dead) return;
    const s = this.scene;
    const r = this.run;

    // timers
    this.dashCd -= dt;
    this.attackCd -= dt;
    this.invuln -= dt;
    this.sinceHit += dt;
    this.buffs.rage = Math.max(0, this.buffs.rage - dt);
    this.buffs.haste = Math.max(0, this.buffs.haste - dt);
    this.buffs.shield = Math.max(0, this.buffs.shield - dt);
    if (this.sinceHit > ARMOR_DELAY && r.armor < r.maxArmor) {
      this.armorTick -= dt;
      if (this.armorTick <= 0) { r.armor++; this.armorTick = ARMOR_TICK; }
    } else this.armorTick = ARMOR_TICK;

    // movement input
    const locked = s.cutscene;
    let mx = locked ? 0 : Input.moveX + Input.touchMoveX;
    let my = locked ? 0 : Input.moveY + Input.touchMoveY;
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    const moving = ml > 0.1;

    const speed = BASE_SPEED * r.speedMul * (this.buffs.haste > 0 ? 1.3 : 1);
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.vx = Math.cos(this.dashDir) * DASH_SPEED;
      this.vy = Math.sin(this.dashDir) * DASH_SPEED;
      this.afterTimer -= dt;
      if (this.afterTimer <= 0) {
        this.afterTimer = 28;
        s.fx.ghost(this.texture.key, this.x, this.y, { tint: 0x6f9cf0, flipX: this.flipX, alpha: 0.5 });
      }
    } else {
      const k = damp(moving ? 20 : 14, sec);
      this.vx += (mx * speed - this.vx) * k;
      this.vy += (my * speed - this.vy) * k;
    }
    this.setVelocity(this.vx, this.vy);

    // aim
    if (!locked) {
      if (Input.usingTouch) {
        const target = s.nearestEnemy(this.x, this.y, 230);
        if (target) this.aim = angleTo(this.x, this.y, target.x, target.y);
        else if (moving) this.aim = Math.atan2(my, mx);
      } else {
        const p = s.input.activePointer;
        const wp = s.cameras.main.getWorldPoint(p.x, p.y);
        this.aim = angleTo(this.x, this.y - 2, wp.x, wp.y);
      }
    }
    const facingLeft = Math.cos(this.aim) < 0;
    this.setFlipX(facingLeft);

    // animation
    const spd = Math.hypot(this.vx, this.vy);
    if (this.dashTime <= 0) {
      if (spd > 20) {
        if (this.anims.currentAnim?.key !== 'hero_walk') this.play('hero_walk');
        this.stepTimer -= dt;
        if (this.stepTimer <= 0) { this.stepTimer = 260; Audio.sfx('step', 100); s.fx.dust(this.x, this.y + 7); }
      } else if (this.anims.currentAnim?.key !== 'hero_idle') this.play('hero_idle');
    }
    if (this.invuln > 0 && this.dashTime <= 0) this.setAlpha(Math.floor(this.invuln / 80) % 2 ? 0.45 : 1);
    else this.setAlpha(1);

    // actions
    if (!locked) {
      if (Input.dash && this.dashCd <= 0) {
        this.dashTime = DASH_TIME;
        this.dashCd = DASH_CD * r.dashCdMul;
        this.dashDir = moving ? Math.atan2(my, mx) : this.aim;
        Audio.sfx('dash');
        s.fx.puff(this.x, this.y + 6, 4, 0xc0c0d0);
      }
      if (Input.swap) this.swapWeapon();
      if ((Input.attack || Input.touchAttack) && this.attackCd <= 0) {
        const w = this.weapon;
        const atkSpeed = r.attackSpeed * (this.buffs.haste > 0 ? 1.3 : 1);
        this.attackCd = w.cooldown / atkSpeed;
        playerAttack(s, this, w);
      }
    }

    // weapon sprite
    this.recoil *= Math.max(0, 1 - sec * 18);
    this.swing *= Math.max(0, 1 - sec * 14);
    const w = this.weapon;
    const ang = this.aim + this.swing * (facingLeft ? -1 : 1);
    const hold = w.holdDist - this.recoil;
    this.weaponSprite.setPosition(this.x + Math.cos(ang) * hold, this.y + 2 + Math.sin(ang) * hold);
    this.weaponSprite.setRotation(ang).setFlipY(facingLeft);
    this.weaponSprite.setDepth(Math.sin(this.aim) < -0.3 ? DEPTH.ENTITY - 0.5 : DEPTH.WEAPON);

    // buff aura
    const buffColor = this.buffs.rage > 0 ? 0xff4040 : this.buffs.haste > 0 ? 0x40c0ff : this.buffs.shield > 0 ? 0xf0c040 : -1;
    this.aura.setVisible(buffColor >= 0).setPosition(this.x, this.y);
    if (buffColor >= 0) this.aura.setTint(buffColor).setAlpha(0.35 + Math.sin(_t / 120) * 0.1);
  }

  destroy(fromScene?: boolean) {
    this.weaponSprite?.destroy();
    this.shadow?.destroy();
    this.aura?.destroy();
    this.light?.destroy();
    super.destroy(fromScene);
  }
}
