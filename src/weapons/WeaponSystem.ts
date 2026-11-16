import Phaser from 'phaser';
import { DEPTH } from '../game/constants';
import type { WeaponDef } from '../data/weapons';
import { Audio } from '../audio/AudioEngine';
import { angleDiff, angleTo, dist } from '../utils/math';
import type { Player } from '../entities/Player';
import type { GameScene } from '../scenes/GameScene';

/** Compute final damage for a player hit, including perks, buffs and crits. */
export function rollDamage(p: Player, base: number) {
  const r = p.run;
  const crit = Math.random() < r.crit;
  const dmg = base * r.damageMul * (p.buffs.rage > 0 ? 1.6 : 1) * (crit ? 2 : 1);
  return { dmg, crit };
}

export function playerAttack(s: GameScene, p: Player, w: WeaponDef) {
  if (w.kind === 'melee') melee(s, p, w);
  else ranged(s, p, w);
}

function melee(s: GameScene, p: Player, w: WeaponDef) {
  const reach = w.reach ?? 28;
  const arc = Phaser.Math.DegToRad(w.arc ?? 120);
  const ox = p.x, oy = p.y + 1;
  p.swingSign *= -1;
  p.swing = (arc / 2) * p.swingSign;
  Audio.sfx(w.sfx);
  if (w.shake) s.fx.shake(w.shake, 80);

  // slash visual
  const sx = ox + Math.cos(p.aim) * reach * 0.45;
  const sy = oy + Math.sin(p.aim) * reach * 0.45;
  const slash = s.add.image(sx, sy, 'slash').setRotation(p.aim).setDepth(DEPTH.FX)
    .setScale(reach / 22).setFlipY(p.swingSign < 0).setBlendMode(Phaser.BlendModes.ADD)
    .setTint(w.id === 'legend' ? 0x80f0ff : 0xffffff);
  s.tweens.add({ targets: slash, alpha: 0, scale: reach / 19, duration: 160, onComplete: () => slash.destroy() });

  // hit enemies
  let hitAny = false;
  for (const e of s.liveEnemies()) {
    const d = dist(ox, oy, e.x, e.y) - e.hitRadius;
    if (d > reach) continue;
    const a = angleTo(ox, oy, e.x, e.y);
    if (d > 8 && Math.abs(angleDiff(p.aim, a)) > arc / 2) continue;
    const { dmg, crit } = rollDamage(p, w.damage);
    e.hit(dmg, a, w.knockback, crit);
    hitAny = true;
  }
  if (hitAny) s.fx.shake(0.003, 60);

  // deflect enemy bullets (Soul-Knight-style melee parry)
  let deflected = 0;
  s.eBullets.children.each((obj) => {
    const b = obj as Phaser.Physics.Arcade.Image & { kill: () => void };
    if (!b.active) return true;
    const d = dist(ox, oy, b.x, b.y);
    if (d > reach + 6) return true;
    if (Math.abs(angleDiff(p.aim, angleTo(ox, oy, b.x, b.y))) > arc / 2 + 0.2) return true;
    s.fx.burst(b.x, b.y, 0xfff0a0, 5);
    b.kill();
    deflected++;
    return true;
  });
  if (deflected) Audio.sfx('deflect');

  // legendary crescent wave
  if (w.wave) {
    const { dmg, crit } = rollDamage(p, w.damage * 0.6);
    const b = s.pBullets.get() as import('../entities/Projectile').Bullet | null;
    if (b) b.fire(ox + Math.cos(p.aim) * 10, oy + Math.sin(p.aim) * 10, p.aim, 250, 'b_wave', dmg, { pierce: 99, life: 520, knock: 60, crit, tint: 0xffffff });
  }
}

function ranged(s: GameScene, p: Player, w: WeaponDef) {
  const pellets = w.pellets ?? 1;
  const spread = Phaser.Math.DegToRad(w.spread ?? 0);
  const muzzle = w.muzzle ?? 12;
  let ox = p.x + Math.cos(p.aim) * muzzle;
  let oy = p.y + 2 + Math.sin(p.aim) * muzzle;
  if (w.id === 'pistols') {
    // alternate between the two pistols
    p.swingSign *= -1;
    const perp = p.aim + Math.PI / 2;
    ox += Math.cos(perp) * 3 * p.swingSign;
    oy += Math.sin(perp) * 3 * p.swingSign;
  }
  for (let i = 0; i < pellets; i++) {
    let a = p.aim;
    if (pellets > 1) a += -spread / 2 + (spread * i) / (pellets - 1) + (Math.random() - 0.5) * 0.08;
    else a += (Math.random() - 0.5) * spread;
    const { dmg, crit } = rollDamage(p, w.damage);
    const b = s.pBullets.get() as import('../entities/Projectile').Bullet | null;
    if (!b) continue;
    const speed = (w.speed ?? 300) * (pellets > 1 ? Phaser.Math.FloatBetween(0.85, 1.1) : 1);
    b.fire(ox, oy, a, speed, w.projectile ?? 'b_bullet', dmg, {
      pierce: w.pierce, homing: w.homing, life: w.life, knock: w.knockback, crit,
      accel: w.id === 'shotgun' ? -500 : 0,
    });
    if (w.homing) b.homingTarget = () => s.nearestEnemy(b.x, b.y, 140);
  }
  p.recoil = w.id === 'shotgun' ? 5 : w.id === 'crossbow' ? 3 : 2;
  Audio.sfx(w.sfx);
  if (w.shake) s.fx.shake(w.shake, 90);
  const m = s.add.image(ox, oy, 'muzzle').setDepth(DEPTH.FX).setRotation(p.aim)
    .setTint(w.id === 'staff' ? 0x80e0ff : 0xffffff).setBlendMode(Phaser.BlendModes.ADD);
  s.tweens.add({ targets: m, alpha: 0, scale: 1.4, duration: 70, onComplete: () => m.destroy() });
}
