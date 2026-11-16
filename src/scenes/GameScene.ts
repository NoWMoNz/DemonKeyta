import Phaser from 'phaser';
import { DEPTH, SOLID_TILES, T, TILE, WORLD_ZOOM, TEXT_COLORS, FONT } from '../game/constants';
import { STAGES, StageDef } from '../data/stages';
import { ENEMIES, EnemyId } from '../data/enemies';
import { WEAPONS, WeaponId, CHEST_POOL, RARITY_COLOR } from '../data/weapons';
import { NOTES, BOSS_INTRO, QUEEN_PREFIGHT, QUEEN_PHASE2, QUEEN_PHASE3 } from '../data/story';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { DemonQueen } from '../entities/DemonQueen';
import { Bullet, BulletOpts } from '../entities/Projectile';
import { generateDungeon, Dungeon, Room } from '../systems/DungeonGenerator';
import { Fx } from '../systems/Fx';
import { Input } from '../systems/InputState';
import { RunState, newRun, Progress } from '../systems/ProgressionSystem';
import { Audio } from '../audio/AudioEngine';
import { RNG } from '../utils/rng';
import { dist, pointToRay } from '../utils/math';
import { wait, isTouchDevice } from '../utils/helpers';
import { fontStyle, setTextAuto } from '../ui/thai';
import { Cheat } from '../systems/Cheat';
import type { HUDScene } from './HUDScene';

interface Interactable {
  x: number;
  y: number;
  label: string;
  labelColor?: string;
  sprite: Phaser.GameObjects.Image;
  extra?: Phaser.GameObjects.GameObject[];
  onInteract: () => void;
  enabled: boolean;
  walkIn?: boolean;
}

interface Pickup {
  sprite: Phaser.GameObjects.Image;
  kind: 'heart' | 'rage' | 'haste' | 'shield';
  t: number;
}

export class GameScene extends Phaser.Scene {
  stageIndex = 0;
  stage!: StageDef;
  run!: RunState;
  dungeon!: Dungeon;
  layer!: Phaser.Tilemaps.TilemapLayer;
  player!: Player;
  enemies!: Phaser.Physics.Arcade.Group;
  pBullets!: Phaser.Physics.Arcade.Group;
  eBullets!: Phaser.Physics.Arcade.Group;
  fx!: Fx;
  cutscene = false;
  currentRoom: Room | null = null;
  activeRoom: Room | null = null;
  bossTarget: Enemy | null = null;
  queen: DemonQueen | null = null;
  private rng = new RNG();
  private interactables: Interactable[] = [];
  private pickups: Pickup[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private hpBars!: Phaser.GameObjects.Graphics;
  private wavesLeft = 0;
  private waveIndex = 0;
  private pendingSpawns = 0;
  private waveDelay = 0;
  private roomOrder = 0;
  private ending = false;
  private toBoss = false;
  private cheatUntil = 0;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private ambient: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor() { super('Game'); }

  init(data: { run?: RunState; toBoss?: boolean }) {
    this.run = data.run ?? newRun();
    this.toBoss = !!data.toBoss;
    this.stageIndex = this.run.stage;
    this.stage = STAGES[this.stageIndex];
    this.cutscene = false;
    this.currentRoom = null;
    this.activeRoom = null;
    this.bossTarget = null;
    this.queen = null;
    this.interactables = [];
    this.pickups = [];
    this.pendingSpawns = 0;
    this.wavesLeft = 0;
    this.roomOrder = 0;
    this.ending = false;
    Input.reset();
  }

  get hud() { return this.scene.get('HUD') as HUDScene; }

  create() {
    if (!this.toBoss) {
      Progress.checkpoint(this.run);
      Progress.bossCheckpoint(null);
    }
    this.cameras.main.setBackgroundColor(this.stage.bg);
    this.fx = new Fx(this);

    // ---------------- dungeon & tilemap ----------------
    this.dungeon = generateDungeon(this.stage, this.rng);
    const d = this.dungeon;
    const map = this.make.tilemap({ data: d.tiles, tileWidth: TILE, tileHeight: TILE });
    const ts = map.addTilesetImage(`tiles_${this.stageIndex}`, `tiles_${this.stageIndex}`, TILE, TILE, 0, 0)!;
    this.layer = map.createLayer(0, ts, 0, 0)!;
    this.layer.setCollision(SOLID_TILES);
    this.layer.setDepth(DEPTH.FLOOR);
    this.physics.world.setBounds(0, 0, d.w * TILE, d.h * TILE);

    // ---------------- groups ----------------
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.pBullets = this.physics.add.group({ classType: Bullet, maxSize: 260, runChildUpdate: true });
    this.eBullets = this.physics.add.group({ classType: Bullet, maxSize: 600, runChildUpdate: true });
    this.decorate();

    // ---------------- player ----------------
    const sr = d.start;
    this.player = new Player(this, sr.cx * TILE + 8, (sr.cy + 1) * TILE + 8, this.run);
    sr.visited = true; sr.discovered = true;
    if (this.toBoss) {
      // "Retry boss": skip straight to the boss door with earlier rooms already cleared
      for (const r of d.rooms) {
        r.discovered = true;
        if (r.type === 'combat') { r.cleared = true; r.visited = true; }
      }
      const b = d.boss;
      const door = b.doors[1] ?? b.doors[0];
      const ox = door.x < b.x0 ? -2 : door.x > b.x1 ? 2 : 0;
      const oy = door.y < b.y0 ? -2 : door.y > b.y1 ? 2 : 0;
      this.player.setPosition((door.x + ox) * TILE + 8, (door.y + oy) * TILE + 8);
    }
    sr.links.forEach((id) => (d.rooms[id].discovered = true));

    // ---------------- physics ----------------
    this.physics.add.collider(this.player, this.layer);
    this.physics.add.collider(this.enemies, this.layer);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.pBullets, this.layer, (b) => this.bulletWall(b as Bullet));
    this.physics.add.collider(this.eBullets, this.layer, (b) => this.bulletWall(b as Bullet), (b) => !(b as Bullet).noWall);
    this.physics.add.overlap(this.pBullets, this.enemies, (b, e) => this.bulletHitEnemy(b as Bullet, e as Enemy));
    this.physics.add.overlap(this.player, this.eBullets, (_p, b) => this.bulletHitPlayer(b as Bullet));
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => {
      const en = e as Enemy;
      if (en.canContact) this.player.hurt(en.def.contact, en.x, en.y);
    });

    // ---------------- camera ----------------
    const cam = this.cameras.main;
    cam.setZoom(WORLD_ZOOM);
    cam.setBounds(0, 0, d.w * TILE, d.h * TILE);
    cam.startFollow(this.player, true, 0.14, 0.14);
    cam.fadeIn(500);

    this.prompt = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '8px', color: TEXT_COLORS.white, stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5, 1).setScale(0.5).setDepth(DEPTH.TEXT).setVisible(false);
    this.hpBars = this.add.graphics().setDepth(DEPTH.TEXT - 1);

    this.setupAmbient();
    this.setupInput();

    // ---------------- HUD ----------------
    if (this.scene.isActive('HUD')) this.scene.stop('HUD');
    this.scene.launch('HUD');
    this.time.delayedCall(60, () => this.hud.showStageTitle(this.stage.subtitle, this.stage.name));
    Audio.playMusic(this.stage.music);

    this.events.once('shutdown', () => { this.ambient?.destroy(); });
  }

  // =====================================================================
  // SETUP
  // =====================================================================
  private setupInput() {
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E,Q,ESC,P,ONE,TWO,SHIFT') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-SPACE', () => (Input.dash = true));
    kb.on('keydown-SHIFT', () => (Input.dash = true));
    kb.on('keydown-E', () => (Input.interact = true));
    kb.on('keydown-Q', () => (Input.swap = true));
    kb.on('keydown-ONE', () => { if (this.run.slot !== 0) Input.swap = true; });
    kb.on('keydown-TWO', () => { if (this.run.slot !== 1 && this.run.weapons[1]) Input.swap = true; });
    kb.on('keydown-ESC', () => this.pauseGame());
    kb.on('keydown-P', () => this.pauseGame());
    kb.on('keydown-K', () => this.cheatKillAll());
    this.input.mouse?.disableContextMenu();
    this.input.on('wheel', () => (Input.swap = true));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (!p.wasTouch) Input.usingTouch = false; });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      Audio.unlock();
      if (p.wasTouch) Input.usingTouch = true;
      else if (p.rightButtonDown()) Input.dash = true;
    });
    this.game.events.on('blur', this.onBlur, this);
    this.events.once('shutdown', () => this.game.events.off('blur', this.onBlur, this));
  }

  private onBlur() { if (!this.player?.dead && !this.ending) this.pauseGame(); }

  pauseGame() {
    if (this.ending || this.player.dead || !this.scene.isActive()) return;
    Input.reset();
    this.scene.pause();
    this.scene.launch('Pause');
    Audio.setDuck(0.35);
  }

  private decorate() {
    const d = this.dungeon;
    const props = this.stage.props;
    for (const r of d.rooms) {
      // torches/banners on the top wall
      for (let x = r.x0 + 1; x <= r.x1 - 1; x += 4) {
        if (d.tiles[r.y0 - 1]?.[x] !== T.WALL_FACE) continue;
        const wx = x * TILE + 8, wy = (r.y0 - 1) * TILE + 8;
        if (this.stageIndex === 2 && (x - r.x0) % 8 === 5) {
          this.add.image(wx, wy + 2, 'banner').setDepth(DEPTH.DECOR);
          continue;
        }
        const torch = this.add.sprite(wx, wy, 'torch0').setDepth(DEPTH.DECOR).play('torch');
        torch.anims.setProgress(Math.random());
        const glow = this.add.image(wx, wy + 2, 'glow').setDepth(DEPTH.DECOR).setTint(0xff9040).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setScale(1.2);
        this.tweens.add({ targets: glow, alpha: 0.22, scale: 1.1, duration: 180 + Math.random() * 200, yoyo: true, repeat: -1 });
      }
      // floor props, avoiding doors and center
      const count = r.type === 'boss' ? 4 : this.rng.int(2, 5);
      for (let i = 0; i < count; i++) {
        const x = this.rng.int(r.x0, r.x1), y = this.rng.int(r.y0, r.y1);
        const t = d.tiles[y][x];
        if (t < T.FLOOR || t > T.FLOOR_DECO + 2) continue;
        if (Math.abs(x - r.cx) < 3 && Math.abs(y - r.cy) < 3) continue;
        if (r.doors.some((dd) => Math.abs(dd.x - x) < 3 && Math.abs(dd.y - y) < 3)) continue;
        this.add.image(x * TILE + 8, y * TILE + 8, this.rng.pick(props)).setDepth(DEPTH.DECOR);
      }
    }
    // story notes
    const notes = NOTES[this.stageIndex];
    const sr = d.start;
    this.addNote(sr.x0 + 2, sr.y0 + 1, notes[0]);
    const tr = d.rooms.find((r) => r.type === 'treasure')!;
    this.addNote(tr.x0 + 1, tr.y1 - 1, notes[1]);
    const combats = d.rooms.filter((r) => r.type === 'combat');
    const cr = combats[Math.floor(combats.length / 2)];
    this.addNote(cr.x1 - 1, cr.y0, notes[2]);

    // tutorial text in the first stage
    if (this.stageIndex === 0) {
      const touch = Input.usingTouch || isTouchDevice();
      const lines = touch
        ? 'แตะจอฝั่งซ้ายเพื่อเดิน\nปุ่มขวา: โจมตี / แดช / สลับอาวุธ\nเล็งศัตรูที่ใกล้ที่สุดให้อัตโนมัติ'
        : 'WASD: เดิน   เมาส์: เล็ง\nคลิก: โจมตี   SPACE: แดช (หลบ)\nQ: สลับอาวุธ   E: ใช้ / เปิด / อ่าน';
      this.add.text(sr.cx * TILE + 8, (sr.y1) * TILE, lines, { ...fontStyle(lines, 8), color: '#ffffff', align: 'center', lineSpacing: 2 })
        .setOrigin(0.5, 1).setScale(0.5).setAlpha(0.55).setDepth(DEPTH.DECOR);
    }

    // treasure chest
    const owned = this.run.weapons;
    let pool = CHEST_POOL[this.stageIndex].filter((w) => !owned.includes(w));
    if (this.stageIndex === 2 && !owned.includes('legend')) pool = ['legend'];
    const wid: WeaponId = pool.length ? this.rng.pick(pool) : this.rng.pick(CHEST_POOL[this.stageIndex]);
    this.addChest(tr.cx * TILE + 8, tr.cy * TILE + 8, wid);

    // throne room setup
    if (this.stage.boss === 'queen') {
      const b = d.boss;
      this.add.image(b.cx * TILE + 8, (b.y0 + 1) * TILE + 4, 'throne').setDepth(DEPTH.DECOR).setScale(1.5);
      for (const dx of [-6, 6]) for (const dy of [3, 9]) {
        const c = this.add.image((b.cx + dx) * TILE + 8, (b.y0 + dy) * TILE + 8, 'candelabra').setDepth(DEPTH.DECOR);
        const g = this.add.image(c.x, c.y - 3, 'glow').setTint(0xffa040).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setDepth(DEPTH.DECOR);
        this.tweens.add({ targets: g, alpha: 0.2, duration: 250, yoyo: true, repeat: -1 });
      }
      this.queen = new DemonQueen(this, b.cx * TILE + 8, (b.y0 + 3) * TILE + 8, b);
      this.addEnemy(this.queen);
    }
  }

  private setupAmbient() {
    const kind = this.stage.ambient;
    const cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig =
      kind === 'fireflies'
        ? { speedX: { min: -8, max: 8 }, speedY: { min: -10, max: 4 }, lifespan: 3000, scale: { start: 1, end: 0.2 }, alpha: { start: 0, end: 0.9, ease: 'Sine.easeInOut' } as never, tint: [0xd0ff60, 0xffe080], frequency: 220, blendMode: 'ADD' }
        : kind === 'fog'
          ? { speedX: { min: 4, max: 14 }, speedY: { min: -2, max: 2 }, lifespan: 5000, scale: { start: 3, end: 5 }, alpha: { start: 0.07, end: 0 }, tint: 0xa0a8c0, frequency: 260 }
          : { speedX: { min: -6, max: 6 }, speedY: { min: -30, max: -10 }, lifespan: 2600, scale: { start: 1, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xff6020, 0xffa040, 0xff2040], frequency: 140, blendMode: 'ADD' };
    const tex = kind === 'fog' ? 'smoke' : kind === 'fireflies' ? 'firefly' : 'px';
    this.ambient = this.add.particles(0, 0, tex, {
      ...cfg,
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-180, -100, 360, 200) } as Phaser.Types.GameObjects.Particles.EmitZoneData,
    }).setDepth(DEPTH.FX - 2);
  }

  // =====================================================================
  // INTERACTABLES & PICKUPS
  // =====================================================================
  private addNote(tx: number, ty: number, msg: string) {
    const s = this.add.image(tx * TILE + 8, ty * TILE + 8, 'note').setDepth(DEPTH.DECOR + 1);
    this.tweens.add({ targets: s, y: s.y - 1, duration: 800, yoyo: true, repeat: -1 });
    const it: Interactable = {
      x: s.x, y: s.y, label: 'อ่าน', sprite: s, enabled: true,
      onInteract: async () => {
        this.cutscene = true;
        await this.hud.dialogue.play([{ who: 'sign', text: msg }]);
        this.cutscene = false;
      },
    };
    this.interactables.push(it);
  }

  private addChest(x: number, y: number, weapon: WeaponId) {
    const s = this.add.image(x, y, 'chest').setDepth(DEPTH.ENTITY - 1);
    const it: Interactable = {
      x, y, label: 'เปิด', sprite: s, enabled: true,
      onInteract: () => {
        it.enabled = false;
        s.setTexture('chest_open');
        Audio.sfx('chest');
        this.fx.burst(x, y - 4, 0xf0c040, 20);
        this.fx.ringPulse(x, y, 0xf0c040, 1);
        this.addWeaponDrop(x, y + 14, weapon);
      },
    };
    this.interactables.push(it);
  }

  addWeaponDrop(x: number, y: number, weapon: WeaponId) {
    const def = WEAPONS[weapon];
    const s = this.add.image(x, y, def.texture).setDepth(DEPTH.PICKUP).setOrigin(0.5);
    const glow = this.add.image(x, y, 'glow').setDepth(DEPTH.PICKUP - 1).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(Phaser.Display.Color.HexStringToColor(RARITY_COLOR[def.rarity]).color).setScale(0.5).setAlpha(0.6);
    this.tweens.add({ targets: [s], y: y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const it: Interactable = {
      x, y, label: def.name, labelColor: RARITY_COLOR[def.rarity], sprite: s, extra: [glow], enabled: true,
      onInteract: () => {
        const r = this.run;
        const emptySlot = r.weapons.findIndex((w) => !w);
        let dropped: WeaponId | null = null;
        if (emptySlot >= 0) { r.weapons[emptySlot] = weapon; r.slot = emptySlot; }
        else { dropped = r.weapons[r.slot]; r.weapons[r.slot] = weapon; }
        this.removeInteractable(it);
        this.player.refreshWeapon();
        Audio.sfx('pickup');
        this.hud.toast(`${def.name}!`, RARITY_COLOR[def.rarity], def.desc);
        this.events.emit('weapon-changed');
        if (dropped) this.addWeaponDrop(this.player.x, this.player.y + 8, dropped);
      },
    };
    this.interactables.push(it);
  }

  private removeInteractable(it: Interactable) {
    it.enabled = false;
    it.sprite.destroy();
    it.extra?.forEach((e) => e.destroy());
    this.interactables = this.interactables.filter((i) => i !== it);
  }

  private addPortal(x: number, y: number) {
    const s = this.add.image(x, y, 'portal').setDepth(DEPTH.DECOR + 1).setScale(0);
    const glow = this.add.image(x, y, 'glow').setDepth(DEPTH.DECOR).setTint(0xa060ff).setBlendMode(Phaser.BlendModes.ADD).setScale(1.5).setAlpha(0.6);
    this.tweens.add({ targets: s, scale: 1, duration: 600, ease: 'Back.easeOut' });
    this.tweens.add({ targets: s, angle: 360, duration: 3000, repeat: -1 });
    Audio.sfx('portal');
    const it: Interactable = {
      x, y, label: 'ไปด่านต่อไป', labelColor: TEXT_COLORS.purple, sprite: s, extra: [glow], enabled: true,
      onInteract: () => {
        it.enabled = false;
        this.goNextStage();
      },
    };
    this.interactables.push(it);
  }

  spawnPickup(x: number, y: number, kind: Pickup['kind']) {
    const tex = kind === 'heart' ? 'heart' : `buff_${kind}`;
    const s = this.add.image(x, y, tex).setDepth(DEPTH.PICKUP);
    // little pop out
    const a = Math.random() * Math.PI * 2;
    this.tweens.add({ targets: s, x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 10, duration: 250, ease: 'Quad.easeOut' });
    this.pickups.push({ sprite: s, kind, t: 0 });
  }

  private updatePickups(dt: number) {
    const p = this.player;
    for (const pk of [...this.pickups]) {
      pk.t += dt;
      pk.sprite.setScale(1 + Math.sin(pk.t / 200) * 0.08);
      if (pk.t < 400) continue;
      const d = dist(p.x, p.y, pk.sprite.x, pk.sprite.y);
      const wantsHeart = pk.kind !== 'heart' || p.run.hp < p.run.maxHp;
      if (!wantsHeart) continue;
      if (d < 44) {
        const a = Math.atan2(p.y - pk.sprite.y, p.x - pk.sprite.x);
        const sp = (dt / 1000) * (60 + (44 - d) * 6);
        pk.sprite.x += Math.cos(a) * sp; pk.sprite.y += Math.sin(a) * sp;
      }
      if (d < 10) {
        if (pk.kind === 'heart') { p.heal(2); Audio.sfx('heal'); }
        else {
          if (pk.kind === 'shield') p.buffs.shield = 15000;
          else p.buffs[pk.kind] = 10000;
          Audio.sfx('buff');
          const names = { rage: ['คลั่ง!', 'ดาเมจ x1.6'], haste: ['เร่งความเร็ว!', 'เร็วขึ้นทุกอย่าง'], shield: ['โล่!', 'กันการโจมตีได้ 1 ครั้ง'] } as const;
          this.hud.toast(names[pk.kind][0], pk.kind === 'rage' ? TEXT_COLORS.red : pk.kind === 'haste' ? TEXT_COLORS.blue : TEXT_COLORS.gold, names[pk.kind][1]);
          this.fx.ringPulse(p.x, p.y, 0xffffff, 0.8);
        }
        pk.sprite.destroy();
        this.pickups = this.pickups.filter((x) => x !== pk);
      }
    }
  }

  private updateInteract() {
    const p = this.player;
    let best: Interactable | null = null;
    let bd = 22;
    for (const it of this.interactables) {
      if (!it.enabled) continue;
      const d = dist(p.x, p.y, it.x, it.y);
      if (d < bd) { bd = d; best = it; }
    }
    this.hud.setInteractAvailable(!!best && !this.cutscene);
    if (best && !this.cutscene) {
      const key = Input.usingTouch ? '' : '[E] ';
      setTextAuto(this.prompt, `${key}${best.label}`, 8).setColor(best.labelColor ?? TEXT_COLORS.white)
        .setPosition(best.x, best.y - 10).setVisible(true);
      if (Input.interact) best.onInteract();
    } else this.prompt.setVisible(false);
  }

  // =====================================================================
  // COMBAT HELPERS (used by enemies / weapons)
  // =====================================================================
  liveEnemies(): Enemy[] {
    return (this.enemies.getChildren() as Enemy[]).filter((e) => e.active && !e.dead);
  }

  nearestEnemy(x: number, y: number, range: number): Enemy | null {
    let best: Enemy | null = null;
    let bd = range;
    for (const e of this.liveEnemies()) {
      if (e.state === 'spawn') continue;
      if (e instanceof DemonQueen && !e.engaged) continue;
      const d = dist(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  addEnemy(e: Enemy) {
    this.enemies.add(e);
    const b = e.body as Phaser.Physics.Arcade.Body;
    b.setImmovable(!!e.def.boss);
    b.setCollideWorldBounds(true);
  }

  minionCount() { return this.liveEnemies().filter((e) => e.minion).length; }

  enemyShoot(x: number, y: number, angle: number, speed: number, tex: string, dmg: number, opts: BulletOpts = {}) {
    const b = this.eBullets.get() as Bullet | null;
    if (!b) return null;
    b.fire(x, y, angle, speed, tex, dmg, { life: 6000, ...opts });
    return b;
  }

  clearEnemyBullets() {
    this.eBullets.children.each((o) => {
      const b = o as Bullet;
      if (b.active) { this.fx.puff(b.x, b.y, 1, 0xffc0e0); b.kill(); }
      return true;
    });
  }

  private bulletWall(b: Bullet) {
    if (!b.active) return;
    this.fx.burst(b.x, b.y, 0xd0c8b0, 3);
    b.kill();
  }

  private bulletHitEnemy(b: Bullet, e: Enemy) {
    if (!b.active || e.dead || e.state === 'spawn' || b.hits.has(e)) return;
    if (e instanceof DemonQueen && !e.engaged) return;
    b.hits.add(e);
    e.hit(b.damage, Math.atan2(b.body!.velocity.y, b.body!.velocity.x), b.knock, b.crit);
    if (b.pierce > 0) b.pierce--;
    else b.kill();
  }

  private bulletHitPlayer(b: Bullet) {
    if (!b.active || this.player.dead) return;
    if (this.player.dashTime > 0 || this.player.invuln > 0 || this.cutscene) return;
    this.player.hurt(b.damage, b.x, b.y);
    this.fx.burst(b.x, b.y, 0xff6080, 6);
    b.kill();
  }

  telegraphLine(x: number, y: number, angle: number, len: number, width: number, ms: number, color = 0xff4040) {
    const r = this.add.rectangle(x, y, len, width, color, 0.18).setOrigin(0, 0.5).setRotation(angle).setDepth(DEPTH.TELEGRAPH);
    const c = this.add.rectangle(x, y, len, 1, color, 0.85).setOrigin(0, 0.5).setRotation(angle).setDepth(DEPTH.TELEGRAPH);
    this.tweens.add({ targets: [r, c], alpha: { from: 0.9, to: 0.3 }, duration: 120, yoyo: true, repeat: Math.max(0, Math.floor(ms / 240) - 1) });
    this.time.delayedCall(ms, () => { r.destroy(); c.destroy(); });
  }

  telegraphCircle(x: number, y: number, r: number, ms: number, dmg: number, color = 0xff4040, meteor = false) {
    const sc = (r * 2) / 64;
    const ring = this.add.image(x, y, 'ring').setTint(color).setScale(sc).setAlpha(0.9).setDepth(DEPTH.TELEGRAPH);
    const fill = this.add.image(x, y, 'circle').setTint(color).setScale(0).setAlpha(0.3).setDepth(DEPTH.TELEGRAPH);
    this.tweens.add({ targets: fill, scale: sc, duration: ms, ease: 'Linear' });
    if (meteor) {
      const m = this.add.image(x - 60, y - 160, 'q_big').setDepth(DEPTH.FX).setScale(1.4).setAlpha(0);
      this.time.delayedCall(Math.max(0, ms - 320), () => {
        m.setAlpha(1);
        this.tweens.add({ targets: m, x, y, duration: 320, ease: 'Quad.easeIn', onComplete: () => m.destroy() });
      });
    }
    this.time.delayedCall(ms, () => {
      ring.destroy(); fill.destroy();
      if (this.ending) return;
      this.fx.burst(x, y, color, 14);
      this.fx.ringPulse(x, y, color, sc * 1.1, 300);
      this.fx.shake(0.004, 100);
      Audio.sfx('explode', 90);
      if (!this.player.dead && dist(x, y, this.player.x, this.player.y) < r + 3) this.player.hurt(dmg, x, y);
    });
  }

  beam(x: number, y: number, angle: number, len: number, width: number, warnMs: number, activeMs: number, dmg: number) {
    const warn = this.add.rectangle(x, y, len, width, 0xff2050, 0.15).setOrigin(0, 0.5).setRotation(angle).setDepth(DEPTH.TELEGRAPH);
    const line = this.add.rectangle(x, y, len, 1, 0xff4070, 0.9).setOrigin(0, 0.5).setRotation(angle).setDepth(DEPTH.TELEGRAPH);
    this.tweens.add({ targets: [warn, line], alpha: { from: 1, to: 0.35 }, duration: 100, yoyo: true, repeat: -1 });
    this.time.delayedCall(warnMs, () => {
      warn.destroy(); line.destroy();
      if (this.ending) return;
      const outer = this.add.rectangle(x, y, len, width, 0xff2060, 0.85).setOrigin(0, 0.5).setRotation(angle).setDepth(DEPTH.FX).setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add.rectangle(x, y, len, width * 0.4, 0xffffff, 1).setOrigin(0, 0.5).setRotation(angle).setDepth(DEPTH.FX);
      this.fx.shake(0.006, activeMs);
      const ev = this.time.addEvent({
        delay: 30, repeat: Math.floor(activeMs / 30), callback: () => {
          if (!this.player.dead && pointToRay(this.player.x, this.player.y, x, y, angle, len) < width / 2 + 2) this.player.hurt(dmg, x, y);
        },
      });
      this.tweens.add({ targets: [outer, core], scaleY: 0, alpha: 0, delay: activeMs * 0.7, duration: activeMs * 0.3, onComplete: () => { outer.destroy(); core.destroy(); ev.remove(); } });
    });
  }

  /** Spawn an enemy with a summoning-circle telegraph. */
  summon(id: EnemyId, x: number, y: number, opts: { elite?: boolean; minion?: boolean; wave?: boolean } = {}) {
    const minion = opts.minion ?? !opts.wave;
    // clamp into the current room
    const r = this.activeRoom ?? this.currentRoom;
    if (r) {
      x = Phaser.Math.Clamp(x, (r.x0 + 1) * TILE, (r.x1) * TILE);
      y = Phaser.Math.Clamp(y, (r.y0 + 1) * TILE, (r.y1) * TILE);
    }
    this.pendingSpawns++;
    const elite = !!opts.elite;
    const circle = this.add.image(x, y, 'summon').setDepth(DEPTH.TELEGRAPH).setTint(elite ? 0xff3050 : 0xc080ff).setScale(0.2).setAlpha(0.9);
    this.tweens.add({ targets: circle, scale: elite ? 1 : 0.7, angle: 180, duration: 650 });
    Audio.sfx('spawn', 80);
    this.time.delayedCall(700, () => {
      circle.destroy();
      this.pendingSpawns--;
      if (this.ending || this.player.dead) return;
      if (this.time.now < this.cheatUntil) return; // cancelled by the secret kill-all
      const e = new Enemy(this, x, y, ENEMIES[id], { elite, minion });
      this.addEnemy(e);
      this.fx.puff(x, y, 5, 0xc0a0ff);
    });
  }

  randomPointInRoom(minDist: number) {
    const r = this.activeRoom ?? this.currentRoom;
    if (!r) return null;
    const t = this.dungeon.tiles;
    for (let i = 0; i < 50; i++) {
      const x = this.rng.int(r.x0 + 1, r.x1 - 1), y = this.rng.int(r.y0 + 1, r.y1 - 1);
      const tile = t[y][x];
      if (tile === T.BLOCK || tile === T.BLOCK_FACE) continue;
      if (t[y + 1]?.[x] === T.BLOCK) continue;
      const wx = x * TILE + 8, wy = y * TILE + 8;
      if (dist(wx, wy, this.player.x, this.player.y) < minDist) continue;
      return { x: wx, y: wy };
    }
    return { x: r.cx * TILE + 8, y: r.cy * TILE + 8 };
  }

  // =====================================================================
  // ROOMS
  // =====================================================================
  private setDoors(room: Room, closed: boolean) {
    for (const dd of room.doors) {
      this.layer.putTileAt(closed ? T.DOOR : T.CORRIDOR, dd.x, dd.y);
      if (closed) this.fx.puff(dd.x * TILE + 8, dd.y * TILE + 8, 2, 0xa0a0a0);
    }
    Audio.sfx(closed ? 'door' : 'doorOpen');
  }

  private updateRooms() {
    const p = this.player;
    const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    const room = this.dungeon.rooms.find((r) => tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1) ?? null;
    if (room !== this.currentRoom) {
      this.currentRoom = room;
      if (room) {
        room.visited = true; room.discovered = true;
        room.links.forEach((id) => (this.dungeon.rooms[id].discovered = true));
      }
    }
    if (!room || room.cleared || this.activeRoom) return;
    const inside = tx >= room.x0 + 1 && tx <= room.x1 - 1 && ty >= room.y0 + 1 && ty <= room.y1 - 1;
    if (!inside) return;
    if (room.type === 'combat') this.startCombatRoom(room);
    else if (room.type === 'boss') this.startBossRoom(room);
  }

  private startCombatRoom(room: Room) {
    this.activeRoom = room;
    this.roomOrder++;
    this.setDoors(room, true);
    this.wavesLeft = this.rng.int(this.stage.waves[0], this.stage.waves[1]);
    this.waveIndex = 0;
    this.spawnWave();
  }

  private spawnWave() {
    const st = this.stage;
    let budget = st.budget + (this.roomOrder - 1) * st.budgetGrowth + this.waveIndex * 0.6;
    const pool = Object.entries(st.pool) as [EnemyId, number][];
    const total = pool.reduce((a, [, w]) => a + w, 0);
    const picks: EnemyId[] = [];
    let guard = 0;
    while (budget > 0.5 && picks.length < 9 && guard++ < 50) {
      let roll = Math.random() * total;
      let id = pool[0][0];
      for (const [eid, w] of pool) { roll -= w; if (roll <= 0) { id = eid; break; } }
      const cost = ENEMIES[id].cost;
      if (cost > budget + 0.6) continue;
      picks.push(id);
      budget -= cost;
    }
    for (const id of picks) {
      const pt = this.randomPointInRoom(70)!;
      this.summon(id, pt.x, pt.y, { wave: true, minion: false, elite: Math.random() < st.eliteChance });
    }
    this.waveIndex++;
    this.wavesLeft--;
  }

  /** Secret owner-only cheat: instantly defeat every monster (and skip the rest of the room's waves). */
  cheatKillAll() {
    if (!Cheat.enabled || this.ending || this.player.dead || this.cutscene) return;
    this.wavesLeft = 0;
    this.cheatUntil = this.time.now + 900;
    let n = 0;
    for (const e of this.liveEnemies()) {
      if (e instanceof DemonQueen && !e.engaged) continue;
      e.die();
      n++;
    }
    this.time.delayedCall(50, () => this.clearEnemyBullets());
    this.fx.flash(250, 255, 240, 200);
    this.fx.shake(0.01, 250);
    if (n) this.hud.toast('พลังลับ!', TEXT_COLORS.gold);
  }

  private updateWaves(dt: number) {
    const room = this.activeRoom;
    if (!room || room.type !== 'combat') return;
    // the Queen waits dormant in her throne room for the whole stage: she never counts toward clearing other rooms
    const remaining = this.liveEnemies().filter((e) => e !== this.queen).length;
    if (this.pendingSpawns > 0 || remaining > 0) { this.waveDelay = 500; return; }
    this.waveDelay -= dt;
    if (this.waveDelay > 0) return;
    if (this.wavesLeft > 0) this.spawnWave();
    else this.roomCleared(room);
  }

  private roomCleared(room: Room) {
    room.cleared = true;
    this.activeRoom = null;
    this.setDoors(room, false);
    Audio.sfx('clear');
    this.hud.toast('เคลียร์ห้องแล้ว!', TEXT_COLORS.green);
    const cx = this.player.x, cy = this.player.y;
    if (Math.random() < 0.4) this.spawnPickup(cx, cy - 20, 'heart');
    if (Math.random() < 0.18) this.spawnPickup(cx + 16, cy - 20, this.rng.pick(['rage', 'haste', 'shield'] as const));
  }

  private async startBossRoom(room: Room) {
    Progress.bossCheckpoint(this.run);
    this.activeRoom = room;
    this.setDoors(room, true);
    this.cutscene = true;
    this.player.setVelocity(0, 0);
    this.player.vx = this.player.vy = 0;
    const bx = room.cx * TILE + 8, by = (room.cy - 2) * TILE + 8;
    const cam = this.cameras.main;
    cam.stopFollow();

    if (this.stage.boss === 'queen' && this.queen) {
      Audio.playMusic('tense');
      cam.pan(this.queen.x, this.queen.y + 30, 1200, 'Sine.easeInOut');
      await wait(this, 1300);
      await this.hud.dialogue.play(QUEEN_PREFIGHT);
      cam.pan(this.player.x, this.player.y, 600, 'Sine.easeInOut');
      await wait(this, 650);
      cam.startFollow(this.player, true, 0.14, 0.14);
      this.cutscene = false;
      this.bossTarget = this.queen;
      this.queen.activate();
      Audio.playMusic('boss');
      this.hud.showBossBar(this.queen.def.name);
      return;
    }

    const id = this.stage.boss as EnemyId;
    cam.pan(bx, by, 900, 'Sine.easeInOut');
    await wait(this, 500);
    const boss = new Enemy(this, bx, by, ENEMIES[id]);
    this.addEnemy(boss);
    if (id === 'slimeking') {
      const crown = this.add.image(bx, by, 'crown').setDepth(DEPTH.ENTITY + 1).setScale(2);
      this.events.on('update', () => {
        if (!boss.active) { crown.destroy(); return; }
        crown.setPosition(boss.x, boss.y - boss.displayHeight * 0.42).setScale(boss.scaleX / 1.5);
      });
    }
    Audio.sfx('roar');
    this.fx.shake(0.01, 400);
    await wait(this, 700);
    await this.hud.dialogue.play(BOSS_INTRO[id]);
    cam.pan(this.player.x, this.player.y, 500, 'Sine.easeInOut');
    await wait(this, 550);
    cam.startFollow(this.player, true, 0.14, 0.14);
    this.cutscene = false;
    this.bossTarget = boss;
    Audio.playMusic('boss');
    this.hud.showBossBar(boss.def.name);
  }

  async queenPhaseDialogue(phase: number) {
    this.cutscene = true;
    await wait(this, 500);
    await this.hud.dialogue.play(phase === 1 ? QUEEN_PHASE2 : QUEEN_PHASE3);
    this.cutscene = false;
    // a little mercy between phases
    const r = this.dungeon.boss;
    this.spawnPickup((r.x0 + 3) * TILE, (r.y1 - 2) * TILE, 'heart');
    this.spawnPickup((r.x1 - 2) * TILE, (r.y1 - 2) * TILE, phase === 2 ? 'shield' : 'heart');
  }

  // =====================================================================
  // EVENTS
  // =====================================================================
  onEnemyKilled(e: Enemy) {
    this.run.kills++;
    if (Math.random() < this.run.lifesteal) this.player.heal(1);
    if (e.def.boss && e.def.id !== 'queen') {
      this.bossTarget = null;
      this.hud.hideBossBar();
      this.fx.shake(0.015, 600);
      this.fx.flash(300);
      for (const m of this.liveEnemies()) if (m !== this.queen) m.die();
      this.clearEnemyBullets();
      const room = this.activeRoom!;
      this.time.delayedCall(900, () => {
        room.cleared = true;
        this.activeRoom = null;
        this.setDoors(room, false);
        Audio.playMusic(this.stage.music);
        Audio.sfx('clear');
        this.hud.toast('ปราบบอสสำเร็จ!', TEXT_COLORS.gold);
        const pool = CHEST_POOL[this.stageIndex].filter((w) => !this.run.weapons.includes(w));
        this.addChest(room.cx * TILE - 24, room.cy * TILE + 8, pool.length ? this.rng.pick(pool) : 'crossbow');
        this.spawnPickup(room.cx * TILE + 40, room.cy * TILE + 8, 'heart');
        this.spawnPickup(room.cx * TILE + 40, room.cy * TILE + 8, 'heart');
        this.addPortal(room.cx * TILE + 8, (room.cy - 3) * TILE + 8);
      });
      return;
    }
    if (e.minion) return;
    const heartChance = e.elite ? 0.5 : 0.08;
    if (Math.random() < heartChance) this.spawnPickup(e.x, e.y, 'heart');
    else if (Math.random() < (e.elite ? 0.35 : 0.03)) this.spawnPickup(e.x, e.y, this.rng.pick(['rage', 'haste', 'shield'] as const));
  }

  onPlayerDeath() {
    this.run.deaths++;
    Progress.data.totalDeaths++;
    Progress.save();
    this.cameras.main.stopFollow();
    this.cameras.main.zoomTo(WORLD_ZOOM * 1.4, 1200, 'Sine.easeInOut');
    Audio.playMusic(null);
    Audio.sfx('gameover');
    this.time.delayedCall(1800, () => {
      this.scene.stop('HUD');
      this.scene.start('GameOver', { run: this.run, atBoss: this.activeRoom?.type === 'boss' });
    });
  }

  async onQueenDefeated(q: DemonQueen) {
    if (this.ending) return;
    this.ending = true;
    this.cutscene = true;
    this.bossTarget = null;
    this.hud.hideBossBar();
    this.clearEnemyBullets();
    for (const m of this.liveEnemies()) if (m !== q) m.die();
    Audio.playMusic(null);
    Audio.sfx('explode');
    this.fx.flash(600, 255, 220, 240);
    this.fx.shake(0.02, 900);
    this.cameras.main.stopFollow();
    this.cameras.main.pan(q.x, q.y + 10, 1200, 'Sine.easeInOut');
    this.cameras.main.zoomTo(WORLD_ZOOM * 1.3, 1600, 'Sine.easeInOut');
    this.tweens.add({ targets: q, scaleY: q.baseScale * 0.85, duration: 600, delay: 500 });
    q.setTexture('queen_cry');
    Progress.data.clears++;
    Progress.save();
    await wait(this, 2200);
    this.cameras.main.fadeOut(1200, 0, 0, 0);
    await wait(this, 1300);
    this.scene.stop('HUD');
    this.scene.start('Ending', { run: this.run, weapon: this.player.weapon.id });
  }

  private goNextStage() {
    this.cutscene = true;
    Audio.sfx('portal');
    this.tweens.add({ targets: this.player, scale: 0, angle: 360, alpha: 0, duration: 700 });
    this.player.weaponSprite.setVisible(false);
    this.cameras.main.fadeOut(800, 20, 0, 40);
    this.time.delayedCall(850, () => {
      this.scene.pause();
      this.scene.launch('Upgrade', { run: this.run });
    });
  }

  /** Called by UpgradeScene after a perk is chosen. */
  continueToNextStage() {
    this.run.stage++;
    this.run.armor = this.run.maxArmor;
    this.scene.stop('HUD');
    this.scene.start('Game', { run: this.run });
  }

  // =====================================================================
  // UPDATE
  // =====================================================================
  update(time: number, dt: number) {
    if (dt > 100) dt = 100;
    // keyboard movement
    const k = this.keys;
    Input.moveX = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    Input.moveY = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    Input.attack = !Input.usingTouch && this.input.activePointer.leftButtonDown() && !this.hud?.pointerOverUI;

    if (!this.cutscene && !this.player.dead) this.run.timeMs += dt;
    this.player.update(time, dt);
    if (!this.player.dead) {
      this.updateRooms();
      this.updateWaves(dt);
      this.updatePickups(dt);
      this.updateInteract();
    }
    this.drawHpBars();
    if (this.ambient) {
      const c = this.cameras.main;
      this.ambient.setPosition(c.midPoint.x, c.midPoint.y);
    }

    Input.dash = false;
    Input.swap = false;
    Input.interact = false;
  }

  private drawHpBars() {
    const g = this.hpBars;
    g.clear();
    for (const e of this.liveEnemies()) {
      if (e.def.boss || e.hp >= e.maxHp || e.state === 'spawn') continue;
      const w = 14 * Math.max(1, e.baseScale), x = e.x - w / 2, y = e.y - e.displayHeight / 2 - 5;
      g.fillStyle(0x000000, 0.7).fillRect(x - 1, y - 1, w + 2, 4);
      g.fillStyle(e.elite ? 0xff3050 : 0xe04848, 1).fillRect(x, y, w * (e.hp / e.maxHp), 2);
    }
  }
}
