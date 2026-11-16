import Phaser from 'phaser';
import { DEPTH } from '../game/constants';
import { ENEMIES } from '../data/enemies';
import { Audio } from '../audio/AudioEngine';
import { Enemy } from './Enemy';
import { angleTo, dist } from '../utils/math';
import type { GameScene } from '../scenes/GameScene';
import type { Room } from '../systems/DungeonGenerator';

const rand = Phaser.Math.FloatBetween;

type Attack = 'fan' | 'ring' | 'hex' | 'spiral' | 'summon' | 'petals' | 'dashstrike' | 'cross' | 'meteor' | 'ringwave';

const PATTERNS: Attack[][] = [
  ['fan', 'hex', 'ring', 'fan', 'hex', 'ring'],
  ['spiral', 'summon', 'fan', 'petals', 'dashstrike', 'hex', 'petals', 'dashstrike'],
  ['cross', 'meteor', 'spiral', 'ringwave', 'dashstrike', 'cross', 'summon', 'petals', 'meteor'],
];

/**
 * The final boss. Three phases with readable, telegraphed attacks.
 * Phase thresholds: 66% and 33% HP. She cannot actually die: at 0 HP the ending begins.
 */
export class DemonQueen extends Enemy {
  phase = 0;
  engaged = false;
  attack: Attack | null = null;
  private patternIdx = 0;
  private k = 0;
  private sub = 0;
  private ang = 0;
  private castGlow: Phaser.GameObjects.Image;
  private bigAura: Phaser.GameObjects.Image;
  private sparkles: Phaser.GameObjects.Particles.ParticleEmitter;
  private bob = 0;
  private room: Room;
  private transitioning = false;
  private idleFrame = 0;
  private idleT = 0;

  constructor(scene: GameScene, x: number, y: number, room: Room) {
    super(scene, x, y, ENEMIES.queen);
    this.room = room;
    this.setScale(this.baseScale).setAlpha(1);
    this.state = 'dormant';
    this.bigAura = scene.add.image(x, y, 'glow').setDepth(DEPTH.ENTITY - 1).setTint(0xc02080)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setAlpha(0.55);
    this.castGlow = scene.add.image(x, y, 'glow').setDepth(DEPTH.ENTITY + 1).setTint(0xff60c0)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(0).setAlpha(0.9);
    this.sparkles = scene.add.particles(0, 0, 'px', {
      follow: this, speedY: { min: -40, max: -15 }, speedX: { min: -12, max: 12 }, lifespan: 900,
      scale: { start: 1, end: 0 }, alpha: { start: 0.9, end: 0 }, frequency: 70, tint: [0xff60c0, 0xa040ff, 0xff2060],
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 14) } as Phaser.Types.GameObjects.Particles.EmitZoneData,
    }).setDepth(DEPTH.ENTITY - 1);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(7, this.width / 2 - 7, this.height / 2 - 4);
  }

  get canContact() { return this.engaged && !this.dead && !this.transitioning; }

  activate() {
    this.engaged = true;
    this.state = 'move';
    this.t = 800;
    Audio.sfx('roar');
  }

  /** Never actually dies – triggers the ending instead. */
  die() {
    if (this.dead) return;
    this.dead = true;
    this.hp = 0;
    this.engaged = false;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setVelocity(0, 0);
    this.clearTint();
    this.castGlow.setScale(0);
    this.sparkles.stop();
    this.scene.onQueenDefeated(this);
  }

  hit(dmg: number, angle: number, force: number, crit = false) {
    if (!this.engaged || this.transitioning) return;
    super.hit(dmg, angle, force, crit);
    if (this.dead) return;
    const ratio = this.hp / this.maxHp;
    if (this.phase === 0 && ratio <= 0.66) this.enterPhase(1);
    else if (this.phase === 1 && ratio <= 0.33) this.enterPhase(2);
  }

  private async enterPhase(p: number) {
    this.phase = p;
    this.transitioning = true;
    this.attack = null;
    this.state = 'transition';
    this.invulnerable = true;
    this.castGlow.setScale(0);
    this.scene.clearEnemyBullets();
    this.scene.fx.flash(250, 255, 120, 200);
    this.scene.fx.shake(0.012, 400);
    this.scene.fx.ringPulse(this.x, this.y, 0xff60c0, 4, 700);
    Audio.sfx('roar');
    await this.scene.queenPhaseDialogue(p);
    if (this.dead || !this.scene) return;
    this.bigAura.setTint(p === 1 ? 0xe02060 : 0xff1030).setScale(p === 1 ? 2 : 2.4);
    this.transitioning = false;
    this.invulnerable = false;
    this.patternIdx = 0;
    this.state = 'move';
    this.t = 400;
  }

  update(time: number, dt: number) {
    if (this.dead) {
      this.shadow.setPosition(this.x, this.y + 18);
      this.bigAura.setPosition(this.x, this.y);
      return;
    }
    this.bob += dt;
    const hover = Math.sin(this.bob / 350) * 2;
    this.shadow.setPosition(this.x, this.y + 18).setScale(1.6 - hover * 0.03);
    this.bigAura.setPosition(this.x, this.y + 2).setAlpha(0.45 + Math.sin(this.bob / 300) * 0.12);
    this.castGlow.setPosition(this.x, this.y - 12);
    this.displayOriginY = this.height / 2 + hover;

    // idle animation unless casting
    const casting = this.state === 'cast';
    if (!casting) {
      this.idleT += dt;
      if (this.idleT > 400) { this.idleT = 0; this.idleFrame = 1 - this.idleFrame; }
      this.setTexture(this.idleFrame ? 'queen_idle1' : 'queen_idle0');
    } else this.setTexture('queen_cast');

    // tint handling
    this.clearTint();
    if (!this.engaged || this.scene.cutscene || this.transitioning) { this.setVelocity(0, 0); return; }

    this.t -= dt;
    this.cd -= dt;
    this.vx = 0; this.vy = 0;
    const s = this.scene;
    const p = s.player;
    const speedMul = [1, 1.35, 1.6][this.phase];
    const atkMul = [1, 0.85, 0.7][this.phase];

    switch (this.state) {
      case 'move': {
        if (this.mem.tx === undefined || dist(this.x, this.y, this.mem.tx, this.mem.ty) < 6) {
          // pick a glide target that keeps a respectful distance from the player
          const r = this.room;
          for (let i = 0; i < 12; i++) {
            this.mem.tx = (r.x0 + 3 + Math.random() * (r.x1 - r.x0 - 6)) * 16 + 8;
            this.mem.ty = (r.y0 + 2 + Math.random() * (r.y1 - r.y0) * 0.55) * 16 + 8;
            if (dist(this.mem.tx, this.mem.ty, p.x, p.y) > 90) break;
          }
        }
        // never glide straight into the player
        if (dist(this.x, this.y, p.x, p.y) < 40) {
          const away = angleTo(p.x, p.y, this.x, this.y);
          this.mem.tx = this.x + Math.cos(away) * 60;
          this.mem.ty = this.y + Math.sin(away) * 60;
        }
        const a = angleTo(this.x, this.y, this.mem.tx, this.mem.ty);
        this.vx = Math.cos(a) * this.def.speed * speedMul;
        this.vy = Math.sin(a) * this.def.speed * speedMul;
        if (this.t <= 0) this.startAttack();
        break;
      }
      case 'cast': {
        // telegraph: glowing orb grows above her head
        const total = this.mem.castTotal;
        this.castGlow.setScale(0.2 + (1 - Math.max(0, this.t) / total) * 0.6);
        if (this.t <= 0) { this.castGlow.setScale(0); this.state = 'attack'; this.k = 0; this.sub = 0; this.t = 0; }
        break;
      }
      case 'attack':
        this.runAttack(dt, atkMul, p.x, p.y, time);
        break;
    }
    this.kx *= 0.8; this.ky *= 0.8;
    this.setVelocity(this.vx + this.kx, this.vy + this.ky);
  }

  private startAttack() {
    const list = PATTERNS[this.phase];
    this.attack = list[this.patternIdx % list.length];
    this.patternIdx++;
    this.state = 'cast';
    const castTime = [650, 520, 450][this.phase];
    this.mem.castTotal = castTime;
    this.t = castTime;
    this.mem.tx = undefined as unknown as number;
    Audio.sfx('magic', 100);
    if (this.attack === 'cross' || this.attack === 'meteor') {
      this.scene.fx.ringPulse(this.x, this.y, 0xff2040, 2.5, castTime);
      Audio.sfx('telegraph');
    }
  }

  private finish(wait: number) {
    this.attack = null;
    this.state = 'move';
    this.t = wait * [1, 0.8, 0.6][this.phase];
  }

  private runAttack(dt: number, atkMul: number, px: number, py: number, time: number) {
    const s = this.scene;
    const ph = this.phase;
    this.t -= 0; // timers already ticked in update
    const shoot = (a: number, spd: number, tex = 'q_orb', o = {}) => s.enemyShoot(this.x, this.y - 4, a, spd, tex, this.def.shot, o);
    const toP = angleTo(this.x, this.y, px, py);

    switch (this.attack) {
      case 'fan': {
        if (this.t <= 0) {
          const n = ph === 0 ? 5 : 7;
          const spread = 0.9;
          for (let i = 0; i < n; i++) shoot(toP - spread / 2 + (spread * i) / (n - 1), 115 * (1 + ph * 0.1));
          Audio.sfx('enemyShoot');
          this.k++; this.t = 320 * atkMul;
          if (this.k >= (ph === 0 ? 3 : 4)) this.finish(900);
        }
        break;
      }
      case 'ring': {
        if (this.t <= 0) {
          const n = 20, gapAt = Math.floor(Math.random() * n);
          for (let i = 0; i < n; i++) {
            if (Math.abs(i - gapAt) <= 1) continue; // a safe gap to slip through
            shoot((i / n) * Math.PI * 2 + this.k * 0.15, 85);
          }
          Audio.sfx('enemyShoot');
          this.k++; this.t = 550 * atkMul;
          if (this.k >= 2) this.finish(900);
        }
        break;
      }
      case 'hex': {
        if (this.t <= 0) {
          const lead = this.k === 0 ? 0 : 20;
          const p = s.player;
          const tx = p.x + Math.sign(p.body!.velocity.x) * lead, ty = p.y + Math.sign(p.body!.velocity.y) * lead;
          s.telegraphCircle(tx, ty, 24, 1000, 2, 0xff40a0);
          Audio.sfx('telegraph', 60);
          this.k++; this.t = 300;
          if (this.k >= [3, 5, 7][ph]) this.finish(1100);
        }
        break;
      }
      case 'spiral': {
        if (this.k === 0) { this.k = 1; this.mem.dur = 3000; this.ang = Math.random() * Math.PI; this.sub = 0; }
        this.mem.dur -= dt; this.sub -= dt;
        if (this.sub <= 0) {
          this.sub = ph >= 2 ? 75 : 95;
          const arms = ph >= 2 ? 4 : 3;
          for (let i = 0; i < arms; i++) shoot(this.ang + (i / arms) * Math.PI * 2, 90);
          this.ang += 0.21;
          Audio.sfx('enemyShoot', 150);
        }
        if (this.mem.dur <= 0) this.finish(1000);
        break;
      }
      case 'summon': {
        if (s.minionCount() < 4) {
          const r = this.room;
          const spots = [
            { x: (r.x0 + 4) * 16, y: (r.cy) * 16 }, { x: (r.x1 - 4) * 16, y: (r.cy) * 16 },
            { x: r.cx * 16, y: (r.y1 - 3) * 16 },
          ];
          s.summon('imp', spots[0].x, spots[0].y);
          s.summon('imp', spots[1].x, spots[1].y);
          if (ph >= 2) s.summon('knight', spots[2].x, spots[2].y);
          else s.summon('bat', spots[2].x, spots[2].y);
        }
        this.finish(800);
        break;
      }
      case 'petals': {
        if (this.t <= 0) {
          const n = 14;
          const dir = this.k % 2 === 0 ? 1 : -1;
          for (let i = 0; i < n; i++) shoot((i / n) * Math.PI * 2 + this.k * 0.2, 85, 'q_petal', { turn: 0.7 * dir, spin: 4 });
          Audio.sfx('magic', 60);
          this.k++; this.t = 650 * atkMul;
          if (this.k >= 3) this.finish(900);
        }
        break;
      }
      case 'dashstrike': {
        if (this.k === 0) {
          // telegraph where she will appear
          const a = Math.random() * Math.PI * 2;
          const r = this.room;
          this.mem.dx = Phaser.Math.Clamp(px + Math.cos(a) * 75, (r.x0 + 1.5) * 16, (r.x1 - 0.5) * 16);
          this.mem.dy = Phaser.Math.Clamp(py + Math.sin(a) * 75, (r.y0 + 1.5) * 16, (r.y1 - 0.5) * 16);
          const mark = s.add.image(this.mem.dx, this.mem.dy, 'summon').setTint(0xff40a0).setDepth(DEPTH.TELEGRAPH).setScale(0.2).setAlpha(0.8);
          s.tweens.add({ targets: mark, scale: 1.1, angle: 180, duration: 550, onComplete: () => mark.destroy() });
          s.tweens.add({ targets: this, alpha: 0.15, duration: 250 });
          s.fx.puff(this.x, this.y, 8, 0xc040a0);
          Audio.sfx('whoosh');
          this.k = 1; this.t = 560;
        } else if (this.k === 1 && this.t <= 0) {
          for (let i = 0; i < 5; i++) s.fx.ghost('queen_idle0', Phaser.Math.Linear(this.x, this.mem.dx, i / 5), Phaser.Math.Linear(this.y, this.mem.dy, i / 5), { tint: 0xff40a0, scale: this.baseScale, alpha: 0.4 });
          this.setPosition(this.mem.dx, this.mem.dy);
          this.setAlpha(1);
          s.fx.puff(this.x, this.y, 8, 0xc040a0);
          this.k = 2; this.t = 220;
        } else if (this.k === 2 && this.t <= 0) {
          const n = ph >= 2 ? 12 : 10;
          for (let i = 0; i < n; i++) shoot((i / n) * Math.PI * 2 + Math.random() * 0.3, 95);
          Audio.sfx('enemyShoot');
          this.mem.rep = (this.mem.rep ?? 0) + 1;
          if (ph >= 2 && this.mem.rep < 2) { this.k = 0; this.t = 200; }
          else { this.mem.rep = 0; this.finish(900); }
        }
        break;
      }
      case 'cross': {
        // ULTIMATE: rotating crimson beams from the center of the arena
        if (this.k === 0) {
          this.k = 1;
          this.mem.cx = this.room.cx * 16 + 8;
          this.mem.cy = (this.room.cy - 1) * 16 + 8;
          s.tweens.add({ targets: this, x: this.mem.cx, y: this.mem.cy, duration: 450, ease: 'Sine.easeInOut' });
          this.t = 500; this.sub = 0; this.ang = Math.random() < 0.5 ? 0 : Math.PI / 4;
        } else if (this.k === 1 && this.t <= 0) {
          for (let i = 0; i < 4; i++) s.beam(this.mem.cx, this.mem.cy, this.ang + (i * Math.PI) / 2, 420, 20, 950, 450, 2);
          Audio.sfx('laser', 200);
          this.sub++;
          this.ang += Math.PI / 4;
          this.t = 1250;
          if (this.sub >= 3) this.k = 2;
        } else if (this.k === 2 && this.t <= -300) {
          this.finish(900);
        }
        break;
      }
      case 'meteor': {
        if (this.t <= 0) {
          const r = this.room;
          if (this.k < 9) {
            const onPlayer = this.k % 3 === 0;
            const x = onPlayer ? px : (r.x0 + 1 + Math.random() * (r.x1 - r.x0 - 2)) * 16 + 8;
            const y = onPlayer ? py : (r.y0 + 1 + Math.random() * (r.y1 - r.y0 - 2)) * 16 + 8;
            s.telegraphCircle(x, y, 26, 1100, 2, 0xff3020, true);
            this.k++; this.t = 140;
          } else this.finish(1200);
        }
        break;
      }
      case 'ringwave': {
        if (this.t <= 0) {
          const n = 26, gapAt = Math.floor(Math.random() * n);
          for (let i = 0; i < n; i++) {
            if (Math.abs(i - gapAt) <= 2) continue;
            shoot((i / n) * Math.PI * 2, 78, 'q_big', {});
          }
          Audio.sfx('explode', 100);
          s.fx.ringPulse(this.x, this.y, 0xff2060, 2, 500);
          this.k++; this.t = 700;
          if (this.k >= 3) this.finish(1000);
        }
        break;
      }
      default:
        this.finish(500);
    }
    void time;
  }

  destroy(fromScene?: boolean) {
    this.castGlow?.destroy();
    this.bigAura?.destroy();
    this.sparkles?.destroy();
    super.destroy(fromScene);
  }
}
