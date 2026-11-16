import Phaser from 'phaser';
import type { Enemy } from '../entities/Enemy';
import { Audio } from '../audio/AudioEngine';
import { angleTo, dist } from '../utils/math';

const rand = Phaser.Math.FloatBetween;

/** Steer an enemy toward a point, with a simple wall-slide fallback. */
function moveToward(e: Enemy, tx: number, ty: number, speed: number) {
  const a = angleTo(e.x, e.y, tx, ty);
  const body = e.body as Phaser.Physics.Arcade.Body;
  let vx = Math.cos(a) * speed, vy = Math.sin(a) * speed;
  if ((body.blocked.left && vx < 0) || (body.blocked.right && vx > 0)) { vx = 0; vy = Math.sign(vy || 1) * speed; }
  if ((body.blocked.up && vy < 0) || (body.blocked.down && vy > 0)) { vy = 0; vx = Math.sign(vx || 1) * speed; }
  e.vx = vx; e.vy = vy;
}

function aimed(e: Enemy, count: number, spreadDeg: number, speed: number, tex: string, dmg: number, extra = 0) {
  const p = e.scene.player;
  const base = angleTo(e.x, e.y, p.x, p.y) + extra;
  const spread = Phaser.Math.DegToRad(spreadDeg);
  for (let i = 0; i < count; i++) {
    const a = count === 1 ? base : base - spread / 2 + (spread * i) / (count - 1);
    e.scene.enemyShoot(e.x, e.y, a, speed, tex, dmg);
  }
}

function ring(e: Enemy, count: number, speed: number, tex: string, dmg: number, offset = 0) {
  for (let i = 0; i < count; i++) e.scene.enemyShoot(e.x, e.y, offset + (i / count) * Math.PI * 2, speed, tex, dmg);
}

export function runAI(e: Enemy, dt: number, time: number) {
  const s = e.scene;
  const p = s.player;
  const d = dist(e.x, e.y, p.x, p.y);
  const pa = angleTo(e.x, e.y, p.x, p.y);
  const def = e.def;
  const eliteMul = e.elite ? 0.8 : 1; // elites attack a bit faster
  e.t -= dt;
  e.cd -= dt;
  if (p.dead) return;

  switch (def.behavior) {
    // ------------------------------------------------------------ SLIME
    case 'hopper': {
      if (e.state === 'init') { e.state = 'rest'; e.t = rand(200, 700); }
      if (e.state === 'rest') {
        if (e.t <= 0) {
          e.state = 'hop'; e.t = 380;
          e.mem.a = pa + rand(-0.4, 0.4);
          s.tweens.add({ targets: e, scaleY: e.baseScale * 1.25, scaleX: e.baseScale * 0.8, duration: 160, yoyo: true });
        }
      } else if (e.state === 'hop') {
        e.vx = Math.cos(e.mem.a) * def.speed;
        e.vy = Math.sin(e.mem.a) * def.speed;
        if (e.t <= 0) {
          e.state = 'rest'; e.t = rand(500, 950) * eliteMul;
          s.tweens.add({ targets: e, scaleY: e.baseScale * 0.75, scaleX: e.baseScale * 1.2, duration: 90, yoyo: true });
          if (def.id === 'slime_blue' || e.elite) {
            ring(e, e.elite ? 8 : 4, 70, 'e_slime', def.shot, rand(0, Math.PI));
            Audio.sfx('enemyShoot');
          }
        }
      }
      break;
    }
    // ------------------------------------------------------------ BAT / WISP
    case 'swooper': {
      if (e.state === 'init') { e.state = 'fly'; e.mem.orbit = rand(0, Math.PI * 2); e.mem.dir = Math.random() < 0.5 ? 1 : -1; }
      if (e.state === 'fly') {
        e.mem.orbit += (dt / 1000) * 1.3 * e.mem.dir;
        const r = 70 + Math.sin(time / 400 + e.x) * 12;
        moveToward(e, p.x + Math.cos(e.mem.orbit) * r, p.y + Math.sin(e.mem.orbit) * r, def.speed);
        if (e.cd <= 0 && d < 150) { e.state = 'windup'; e.t = 480; Audio.sfx('telegraph', 100); }
      } else if (e.state === 'windup') {
        e.warn();
        e.x += Math.sin(time / 20) * 0.4;
        e.mem.a = angleTo(e.x, e.y, p.x, p.y);
        if (e.t <= 0) {
          e.state = 'dash'; e.t = 400;
          if (def.id === 'wisp') { aimed(e, e.elite ? 3 : 1, 30, 100, 'e_magic', def.shot); Audio.sfx('enemyShoot'); }
        }
      } else if (e.state === 'dash') {
        e.vx = Math.cos(e.mem.a) * 240; e.vy = Math.sin(e.mem.a) * 240;
        if (e.t <= 0) { e.state = 'fly'; e.cd = rand(1800, 2800) * eliteMul; }
      }
      break;
    }
    // ------------------------------------------------------------ SHROOM TURRET
    case 'turret': {
      if (e.state === 'init') e.state = 'idle';
      if (e.state === 'idle') {
        e.setScale(e.baseScale * (1 + Math.sin(time / 300) * 0.04), e.baseScale * (1 - Math.sin(time / 300) * 0.04));
        if (e.cd <= 0 && d < 220) { e.state = 'charge'; e.t = 500; }
      } else if (e.state === 'charge') {
        e.warn(0xffa040);
        e.setScale(e.baseScale * (1 + (1 - e.t / 500) * 0.25));
        if (e.t <= 0) {
          if (e.elite) ring(e, 12, 70, 'e_spore', def.shot, rand(0, 1));
          else aimed(e, 3 + s.stageIndex, 40, 90, 'e_spore', def.shot);
          Audio.sfx('enemyShoot');
          e.setScale(e.baseScale);
          e.state = 'idle'; e.cd = rand(1900, 2600) * eliteMul;
        }
      }
      break;
    }
    // ------------------------------------------------------------ SKELETON
    case 'chaser': {
      if (e.state === 'init') e.state = 'walk';
      if (e.state === 'walk') {
        moveToward(e, p.x, p.y, def.speed * (e.elite ? 1.2 : 1));
        if (d < 40 && e.cd <= 0) { e.state = 'windup'; e.t = 400; e.mem.a = pa; }
        else if (e.elite && d > 90 && (e.mem.bone ?? 0) <= 0) {
          e.mem.bone = 1600;
          e.scene.enemyShoot(e.x, e.y, pa, 120, 'e_bone', def.shot, { spin: 12 });
        }
        e.mem.bone = (e.mem.bone ?? 0) - dt;
      } else if (e.state === 'windup') {
        e.warn();
        if (e.t <= 0) { e.state = 'lunge'; e.t = 200; }
      } else if (e.state === 'lunge') {
        e.vx = Math.cos(e.mem.a) * 210; e.vy = Math.sin(e.mem.a) * 210;
        if (e.t <= 0) { e.state = 'recover'; e.t = 550; }
      } else if (e.state === 'recover') {
        if (e.t <= 0) { e.state = 'walk'; e.cd = 900 * eliteMul; }
      }
      break;
    }
    // ------------------------------------------------------------ ARCHER
    case 'archer': {
      if (e.state === 'init') { e.state = 'move'; e.mem.dir = Math.random() < 0.5 ? 1 : -1; }
      if (e.state === 'move') {
        if (d < 95) moveToward(e, e.x - Math.cos(pa) * 50, e.y - Math.sin(pa) * 50, def.speed);
        else if (d > 160) moveToward(e, p.x, p.y, def.speed);
        else {
          const perp = pa + (Math.PI / 2) * e.mem.dir;
          e.vx = Math.cos(perp) * def.speed * 0.6; e.vy = Math.sin(perp) * def.speed * 0.6;
          if (Math.random() < 0.005) e.mem.dir *= -1;
        }
        if (e.cd <= 0 && d < 240) { e.state = 'aim'; e.t = 650; e.mem.line = 1; }
      } else if (e.state === 'aim') {
        e.warn(0xffd040);
        if (e.t > 250) e.mem.a = pa;
        if (e.mem.line && e.t <= 450) {
          e.mem.line = 0;
          s.telegraphLine(e.x, e.y, e.mem.a, 220, 3, 450, 0xff6060);
        }
        if (e.t <= 0) {
          const n = e.elite ? 3 : 1;
          for (let i = 0; i < n; i++) s.enemyShoot(e.x, e.y, e.mem.a + (i - (n - 1) / 2) * 0.22, 220, 'e_arrow', def.shot);
          Audio.sfx('crossbow');
          e.state = 'move'; e.cd = rand(1700, 2400) * eliteMul;
        }
      }
      break;
    }
    // ------------------------------------------------------------ DARK MAGE
    case 'mage': {
      if (e.state === 'init') { e.state = 'idle'; e.cd = rand(800, 1600); }
      if (e.state === 'idle') {
        e.vx = Math.cos(time / 700 + e.y) * def.speed; e.vy = Math.sin(time / 900 + e.x) * def.speed;
        if (e.cd <= 0) { e.state = 'vanish'; e.t = 300; s.tweens.add({ targets: e, alpha: 0, duration: 280 }); s.fx.puff(e.x, e.y, 5, 0xa060ff); }
      } else if (e.state === 'vanish') {
        if (e.t <= 0) {
          const pt = s.randomPointInRoom(80);
          if (pt) e.setPosition(pt.x, pt.y);
          s.fx.puff(e.x, e.y, 5, 0xa060ff);
          s.tweens.add({ targets: e, alpha: 1, duration: 250 });
          e.state = 'cast'; e.t = 650;
          Audio.sfx('magic', 100);
          s.fx.ringPulse(e.x, e.y, 0xa060ff, 0.6, 600);
        }
      } else if (e.state === 'cast') {
        e.warn(0xc080ff);
        if (e.t <= 0) {
          e.mem.pattern = ((e.mem.pattern ?? 0) + 1) % 2;
          if (e.mem.pattern === 0) ring(e, e.elite ? 12 : 8, 75, 'e_magic', def.shot, rand(0, 1));
          else aimed(e, e.elite ? 5 : 3, 30, 110, 'e_magic', def.shot);
          Audio.sfx('enemyShoot');
          e.state = 'idle'; e.cd = rand(2300, 3100) * eliteMul;
        }
      }
      break;
    }
    // ------------------------------------------------------------ DEMON KNIGHT
    case 'knight': {
      if (e.state === 'init') e.state = 'walk';
      if (e.state === 'walk') {
        moveToward(e, p.x, p.y, def.speed);
        if (e.cd <= 0 && d < 180) {
          e.state = 'aim'; e.t = 700; e.mem.a = pa;
          s.telegraphLine(e.x, e.y, pa, 220, 14, 700, 0xff3040);
          Audio.sfx('telegraph');
        }
      } else if (e.state === 'aim') {
        e.warn();
        if (e.t <= 0) { e.state = 'charge'; e.t = 600; }
      } else if (e.state === 'charge') {
        e.vx = Math.cos(e.mem.a) * 250; e.vy = Math.sin(e.mem.a) * 250;
        const b = e.body as Phaser.Physics.Arcade.Body;
        if (e.t < 520 && (b.blocked.left || b.blocked.right || b.blocked.up || b.blocked.down)) {
          e.state = 'stun'; e.t = 800;
          s.fx.shake(0.004, 100);
          s.fx.burst(e.x, e.y, 0xffffff, 10);
          if (e.elite) ring(e, 10, 80, 'e_orb', def.shot);
        } else if (e.t <= 0) { e.state = 'recover'; e.t = 600; }
      } else if (e.state === 'stun' || e.state === 'recover') {
        if (e.t <= 0) { e.state = 'walk'; e.cd = rand(2200, 3000) * eliteMul; }
      }
      break;
    }
    // ------------------------------------------------------------ IMP
    case 'imp': {
      if (e.state === 'init') { e.state = 'strafe'; e.mem.orbit = pa + Math.PI; e.mem.dir = 1; }
      if (e.state === 'strafe') {
        e.mem.orbit += (dt / 1000) * 0.9 * e.mem.dir;
        if (Math.random() < 0.004) e.mem.dir *= -1;
        moveToward(e, p.x + Math.cos(e.mem.orbit) * 95, p.y + Math.sin(e.mem.orbit) * 95, def.speed);
        if (e.cd <= 0 && d < 220) { e.state = 'aim'; e.t = 380; }
      } else if (e.state === 'aim') {
        e.warn(0xffd040);
        if (e.t <= 0) { e.state = 'burst'; e.mem.shots = e.elite ? 5 : 3; e.t = 0; }
      } else if (e.state === 'burst') {
        if (e.t <= 0) {
          aimed(e, 1, 0, 150, 'e_orb', def.shot);
          Audio.sfx('enemyShoot', 60);
          e.mem.shots--; e.t = 130;
          if (e.mem.shots <= 0) { e.state = 'strafe'; e.cd = rand(1400, 2000) * eliteMul; }
        }
      }
      break;
    }
    // ------------------------------------------------------------ MINI-BOSS: SLIME KING
    case 'slimeking': {
      e.enraged = e.hp < e.maxHp * 0.5;
      const fast = e.enraged ? 0.7 : 1;
      if (e.state === 'init') { e.state = 'idle'; e.t = 1200; e.mem.step = 0; }
      if (e.state === 'idle') {
        moveToward(e, p.x, p.y, 22);
        e.setScale(e.baseScale * (1 + Math.sin(time / 200) * 0.04), e.baseScale * (1 - Math.sin(time / 200) * 0.04));
        if (e.t <= 0) {
          const seq = ['jump', 'spray', 'jump', 'summon'];
          e.state = seq[e.mem.step % seq.length];
          e.mem.step++;
          e.t = 0; e.mem.k = 0;
        }
      } else if (e.state === 'jump') {
        if (e.mem.k === 0) {
          e.mem.k = 1;
          e.mem.tx = p.x; e.mem.ty = p.y;
          e.airborne = true;
          s.telegraphCircle(p.x, p.y, 30, 900 * fast, 2, 0x60ff60);
          Audio.sfx('whoosh');
          s.tweens.add({ targets: e, x: p.x, y: p.y, duration: 900 * fast, ease: 'Sine.easeInOut' });
          s.tweens.add({ targets: e, scale: e.baseScale * 1.45, duration: 450 * fast, yoyo: true, ease: 'Quad.easeOut' });
          e.t = 900 * fast;
        }
        if (e.t <= 0) {
          e.airborne = false;
          s.fx.shake(0.01, 200);
          Audio.sfx('explode');
          ring(e, e.enraged ? 16 : 12, 80, 'e_slime', 1, Math.random());
          e.state = 'idle'; e.t = 900 * fast;
        }
      } else if (e.state === 'spray') {
        if (e.t <= 0) {
          aimed(e, e.enraged ? 7 : 5, 70, 110, 'e_slime', 1);
          Audio.sfx('enemyShoot');
          e.mem.k++; e.t = 380;
          if (e.mem.k >= 3) { e.state = 'idle'; e.t = 1000 * fast; }
        }
      } else if (e.state === 'summon') {
        if (s.minionCount() < 4) {
          for (let i = 0; i < 2; i++) s.summon(Math.random() < 0.3 ? 'slime_blue' : 'slime', e.x + rand(-40, 40), e.y + rand(-30, 30));
        }
        e.state = 'idle'; e.t = 1200 * fast;
      }
      break;
    }
    // ------------------------------------------------------------ MINI-BOSS: GRAVE WARDEN
    case 'warden': {
      e.enraged = e.hp < e.maxHp * 0.5;
      const fast = e.enraged ? 0.72 : 1;
      if (e.state === 'init') { e.state = 'idle'; e.t = 1200; e.mem.step = 0; }
      if (e.state === 'idle') {
        moveToward(e, p.x, p.y, def.speed * 0.6);
        if (e.t <= 0) {
          const seq = ['charge', 'bones', 'charge', 'summon', 'spin', 'bones'];
          e.state = seq[e.mem.step % seq.length]; e.mem.step++;
          e.t = 0; e.mem.k = 0;
        }
      } else if (e.state === 'charge') {
        if (e.mem.k === 0) {
          e.mem.k = 1; e.mem.a = pa; e.t = 750 * fast;
          s.telegraphLine(e.x, e.y, pa, 320, 22, 750 * fast, 0x60ffd0);
          Audio.sfx('telegraph');
        } else if (e.mem.k === 1) {
          e.warn(0x60ffd0);
          if (e.t <= 0) { e.mem.k = 2; e.t = 650; Audio.sfx('roar', 300); }
        } else if (e.mem.k === 2) {
          e.vx = Math.cos(e.mem.a) * 270; e.vy = Math.sin(e.mem.a) * 270;
          const b = e.body as Phaser.Physics.Arcade.Body;
          const hitWall = b.blocked.left || b.blocked.right || b.blocked.up || b.blocked.down;
          if ((e.t < 580 && hitWall) || e.t <= 0) {
            e.mem.k = 3; e.t = 800 * fast;
            if (hitWall) {
              s.fx.shake(0.01, 200);
              Audio.sfx('explode');
              ring(e, 10, 85, 'e_bone', 1, Math.random());
            }
          }
        } else if (e.t <= 0) { e.state = 'idle'; e.t = 600 * fast; }
      } else if (e.state === 'bones') {
        if (e.t <= 0) {
          ring(e, 12, 85, 'e_bone', 1, e.mem.k * (Math.PI / 12));
          Audio.sfx('enemyShoot');
          e.mem.k++; e.t = 420;
          if (e.mem.k >= (e.enraged ? 3 : 2)) { e.state = 'idle'; e.t = 900 * fast; }
        }
      } else if (e.state === 'summon') {
        if (s.minionCount() < 3) {
          s.summon('skeleton', e.x - 40, e.y + 20);
          s.summon(e.enraged ? 'archer' : 'skeleton', e.x + 40, e.y + 20);
        }
        e.state = 'idle'; e.t = 1000 * fast;
      } else if (e.state === 'spin') {
        if (e.mem.k === 0) { e.mem.k = 1; e.mem.dur = 2200; e.mem.ang = 0; e.mem.fire = 0; }
        moveToward(e, p.x, p.y, 45);
        e.rotation = Math.sin(time / 60) * 0.2;
        e.mem.dur -= dt; e.mem.fire -= dt;
        if (e.mem.fire <= 0) {
          e.mem.fire = 130;
          e.mem.ang += 0.5;
          s.enemyShoot(e.x, e.y, e.mem.ang, 95, 'e_bone', 1, { spin: 10 });
          s.enemyShoot(e.x, e.y, e.mem.ang + Math.PI, 95, 'e_bone', 1, { spin: 10 });
        }
        if (e.mem.dur <= 0) { e.rotation = 0; e.state = 'idle'; e.t = 900 * fast; }
      }
      break;
    }
  }
}
