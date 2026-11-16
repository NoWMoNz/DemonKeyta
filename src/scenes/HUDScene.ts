import Phaser from 'phaser';
import { GAME_W, GAME_H, TEXT_COLORS, COLORS, T } from '../game/constants';
import { drawPanel, text } from '../ui/widgets';
import { DialogueBox } from '../ui/DialogueBox';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { Input } from '../systems/InputState';
import { WEAPONS, RARITY_COLOR } from '../data/weapons';
import { isTouchDevice } from '../utils/helpers';
import { setTextAuto } from '../ui/thai';
import { Cheat } from '../systems/Cheat';
import { Audio } from '../audio/AudioEngine';
import type { GameScene } from './GameScene';

interface TouchBtn { img: Phaser.GameObjects.Image; icon: Phaser.GameObjects.GameObject; r: number; pointer: number }

export class HUDScene extends Phaser.Scene {
  dialogue!: DialogueBox;
  pointerOverUI = false;
  private g!: Phaser.GameObjects.Graphics;
  private darkness!: Phaser.GameObjects.Image;
  private darkAlpha = 0.5;
  private eyes: {
    wx: number; wy: number; parts: Phaser.GameObjects.GameObject[]; root: Phaser.GameObjects.Container;
    pupils: Phaser.GameObjects.Rectangle[]; size: number; fleeing: boolean;
  }[] = [];
  private eyeTimer = 0;
  private portrait!: Phaser.GameObjects.Image;
  private heartIcon!: Phaser.GameObjects.Image;
  private weaponGlow!: Phaser.GameObjects.Image;
  private hpText!: Phaser.GameObjects.Text;
  private armorText!: Phaser.GameObjects.Text;
  private weaponName!: Phaser.GameObjects.Text;
  private weaponIcon!: Phaser.GameObjects.Image;
  private weapon2Icon!: Phaser.GameObjects.Image;
  private stageText!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  private bossVisible = false;
  private bossShown = 1;
  private damageFlash!: Phaser.GameObjects.Rectangle;
  private crosshair!: Phaser.GameObjects.Image;
  private toastQueue: { title: string; color: string; sub?: string }[] = [];
  private toastBusy = false;
  private touch: Record<string, TouchBtn> = {};
  private joystick: VirtualJoystick | null = null;
  private interactAvailable = false;
  private hpShown = 0;
  private buffTexts: Phaser.GameObjects.Text[] = [];
  private buffIcons: Phaser.GameObjects.Image[] = [];

  constructor() { super('HUD'); }

  get game_(): GameScene { return this.scene.get('Game') as GameScene; }

  create() {
    // scene instances are reused between stages: reset all per-run state
    this.toastQueue = [];
    this.toastBusy = false;
    this.bossVisible = false;
    this.touch = {};
    this.joystick = null;
    this.buffIcons = [];
    this.buffTexts = [];
    this.interactAvailable = false;
    this.pointerOverUI = false;
    this.input.addPointer(3);
    const vign = this.add.image(GAME_W / 2, GAME_H / 2, 'vignette').setDisplaySize(GAME_W, GAME_H).setAlpha(0.7);
    const gs = this.game_;
    if (gs.stage.tintAlpha > 0) this.add.rectangle(0, 0, GAME_W, GAME_H, gs.stage.tint, gs.stage.tintAlpha).setOrigin(0).setBlendMode(Phaser.BlendModes.MULTIPLY);
    void vign;
    // darkness: only the area around the hero is fully lit (darker in later stages)
    this.darkness = this.add.image(GAME_W / 2, GAME_H / 2, 'darkmask').setScale(4).setAlpha(0);
    this.darkAlpha = [0.42, 0.7, 0.62][gs.stageIndex] ?? 0.5;
    this.eyes = [];
    this.eyeTimer = 1500;
    this.damageFlash = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xff0000, 0).setOrigin(0);

    this.g = this.add.graphics().setDepth(1);
    // portrait + bars (drawn in update); icons and numbers sit on top
    this.portrait = this.add.image(29, 29, 'hero_face').setScale(3).setDepth(1);
    this.heartIcon = this.add.image(58, 18, 'heart').setScale(1.1).setDepth(1);
    this.add.image(58, 36, 'buff_shield').setScale(0.75).setDepth(1);
    const num = { stroke: '#07050c', strokeThickness: 3 };
    this.hpText = text(this, 124, 13, '', 8, '#ffffff', num).setOrigin(0.5, 0).setDepth(2);
    this.armorText = text(this, 124, 32, '', 8, '#ffffff', num).setOrigin(0.5, 0).setDepth(2);

    this.stageText = text(this, GAME_W / 2, 10, `${gs.stage.subtitle} - ${gs.stage.name}`, 8, '#e8e0f0', { stroke: '#07050c', strokeThickness: 3 }).setOrigin(0.5, 0);

    // weapon panel
    const wy = GAME_H - 34;
    this.weaponGlow = this.add.image(GAME_W - 46, wy, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(1.1, 0.6).setAlpha(0.35).setDepth(1);
    this.weaponIcon = this.add.image(GAME_W - 46, wy, 'w_sword').setScale(2).setDepth(2);
    this.weapon2Icon = this.add.image(GAME_W - 104, wy + 4, 'w_staff').setScale(1).setAlpha(0.6).setDepth(2);
    this.weaponName = text(this, GAME_W - 8, wy - 24, '', 8, '#ffffff', { stroke: '#07050c', strokeThickness: 3 }).setOrigin(1, 1);

    // boss bar
    this.bossName = text(this, GAME_W / 2, 24, '', 8, TEXT_COLORS.pink, { stroke: '#07050c', strokeThickness: 4 }).setOrigin(0.5, 0).setVisible(false).setDepth(2);

    // buffs
    for (let i = 0; i < 3; i++) {
      this.buffIcons.push(this.add.image(18 + i * 30, 62, 'buff_rage').setVisible(false).setDepth(1));
      this.buffTexts.push(text(this, 28 + i * 30, 58, '', 8, '#ffffff', { stroke: '#07050c', strokeThickness: 3 }).setVisible(false).setDepth(1));
    }

    // pause button
    const pause = this.add.image(GAME_W - 18, 18, 'circle').setScale(0.36).setTint(0x2a2048).setAlpha(0.9).setInteractive({ useHandCursor: true });
    this.add.rectangle(GAME_W - 21, 18, 3, 10, 0xffffff);
    this.add.rectangle(GAME_W - 15, 18, 3, 10, 0xffffff);
    pause.on('pointerdown', () => this.game_.pauseGame());
    pause.on('pointerover', () => (this.pointerOverUI = true));
    pause.on('pointerout', () => (this.pointerOverUI = false));

    // secret owner-only cheat for touch screens: long-press the minimap
    if (Cheat.enabled) {
      const zone = this.add.zone(GAME_W - 100, 40, 110, 70).setInteractive();
      let hold: Phaser.Time.TimerEvent | null = null;
      zone.on('pointerdown', () => { hold = this.time.delayedCall(700, () => this.game_.cheatKillAll()); });
      const cancel = () => { hold?.remove(); hold = null; };
      zone.on('pointerup', cancel);
      zone.on('pointerout', cancel);
    }

    // touch controls
    if (isTouchDevice() || Input.usingTouch) this.createTouchControls();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      Audio.unlock();
      if (p.wasTouch && !this.joystick) { Input.usingTouch = true; this.createTouchControls(); }
    });

    this.crosshair = this.add.image(0, 0, 'crosshair').setDepth(2000);
    this.input.setDefaultCursor('none');
    this.events.once('shutdown', () => this.input.setDefaultCursor('default'));

    this.dialogue = new DialogueBox(this, 1500);
    this.game_.events.on('player-hurt', this.onHurt, this);
    this.events.once('shutdown', () => this.game_.events.off('player-hurt', this.onHurt, this));
    this.hpShown = gs.run.hp;
  }

  private onHurt() {
    this.damageFlash.setFillStyle(0xff0000, 0.35);
    this.tweens.add({ targets: this.damageFlash, fillAlpha: 0, duration: 350 });
  }

  // ------------------------------------------------------------- touch
  private createTouchControls() {
    if (this.joystick) return;
    this.joystick = new VirtualJoystick(this);
    const mk = (key: string, x: number, y: number, r: number, label: string, tint: number) => {
      const img = this.add.image(x, y, 'circle').setScale(r / 32).setTint(tint).setAlpha(0.45).setDepth(900);
      const icon = text(this, x, y, label, r > 30 ? 12 : 7, '#ffffff').setOrigin(0.5).setDepth(901).setAlpha(0.9);
      this.touch[key] = { img, icon, r, pointer: -1 };
    };
    mk('attack', GAME_W - 62, GAME_H - 70, 36, 'โจมตี', 0xe04848);
    mk('dash', GAME_W - 132, GAME_H - 38, 22, 'แดช', 0x3a6bd6);
    mk('swap', GAME_W - 40, GAME_H - 140, 18, 'สลับ', 0x6a5a9a);
    mk('interact', GAME_W - 120, GAME_H - 110, 20, 'ใช้', 0xf0c040);
    // weapon panel moves to the bottom center, between joystick and buttons
    this.weaponIcon.setPosition(GAME_W / 2 + 20, GAME_H - 26).setScale(1.5);
    this.weapon2Icon.setPosition(GAME_W / 2 - 46, GAME_H - 22);
    this.weaponName.setPosition(GAME_W / 2 + 60, GAME_H - 48);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      for (const [k, b] of Object.entries(this.touch)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, b.img.x, b.img.y) <= b.r + 8) {
          b.pointer = p.id;
          b.img.setAlpha(0.8);
          if (k === 'attack') Input.touchAttack = true;
          if (k === 'dash') Input.dash = true;
          if (k === 'swap') Input.swap = true;
          if (k === 'interact') Input.interact = true;
        }
      }
    });
    const up = (p: Phaser.Input.Pointer) => {
      for (const [k, b] of Object.entries(this.touch)) {
        if (b.pointer === p.id) {
          b.pointer = -1;
          b.img.setAlpha(0.45);
          if (k === 'attack') Input.touchAttack = false;
        }
      }
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  setInteractAvailable(v: boolean) {
    this.interactAvailable = v;
    const b = this.touch.interact;
    if (b) { b.img.setVisible(v); (b.icon as Phaser.GameObjects.Text).setVisible(v); }
  }

  // ------------------------------------------------------------- notifications
  showStageTitle(sub: string, name: string) {
    const t1 = text(this, GAME_W / 2, GAME_H / 2 - 30, sub.toUpperCase(), 8, TEXT_COLORS.gold).setOrigin(0.5).setAlpha(0);
    const t2 = text(this, GAME_W / 2, GAME_H / 2 - 12, name.toUpperCase(), 16, TEXT_COLORS.white, { stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setAlpha(0);
    const line = this.add.rectangle(GAME_W / 2, GAME_H / 2 + 4, 0, 2, COLORS.gold);
    this.tweens.add({ targets: [t1, t2], alpha: 1, duration: 500 });
    this.tweens.add({ targets: line, width: 220, duration: 600, ease: 'Quad.easeOut' });
    this.time.delayedCall(2200, () => {
      this.tweens.add({ targets: [t1, t2, line], alpha: 0, duration: 600, onComplete: () => { t1.destroy(); t2.destroy(); line.destroy(); } });
    });
  }

  toast(title: string, color: string = TEXT_COLORS.white, sub?: string) {
    this.toastQueue.push({ title, color, sub });
    if (!this.toastBusy) this.nextToast();
  }

  private nextToast() {
    const t = this.toastQueue.shift();
    if (!t) { this.toastBusy = false; return; }
    this.toastBusy = true;
    const y = 74;
    const a = text(this, GAME_W / 2, y, t.title, 16, t.color, { stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setScale(0.6).setAlpha(0);
    const b = t.sub ? text(this, GAME_W / 2, y + 16, t.sub, 8, TEXT_COLORS.gray, { stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setAlpha(0) : null;
    this.tweens.add({ targets: a, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });
    if (b) this.tweens.add({ targets: b, alpha: 1, duration: 300 });
    this.time.delayedCall(1400, () => {
      this.tweens.add({
        targets: [a, b].filter(Boolean), alpha: 0, y: '-=8', duration: 300,
        onComplete: () => { a.destroy(); b?.destroy(); this.nextToast(); },
      });
    });
  }

  showBossBar(name: string) {
    this.bossVisible = true;
    this.bossShown = 1;
    setTextAuto(this.bossName, name.toUpperCase(), 8).setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.bossName, alpha: 1, duration: 400 });
    this.stageText.setVisible(false);
  }

  hideBossBar() {
    this.bossVisible = false;
    this.bossName.setVisible(false);
    this.stageText.setVisible(true);
  }

  /**
   * A bevelled bar: dark frame, white "recent damage" trail, coloured fill with a lit top
   * and shaded bottom, and optional segment ticks (one per HP point).
   * colors = [base, light, dark, background]
   */
  private drawBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, ratio: number, trail: number, colors: number[], segments: number) {
    const [base, light, dark, back] = colors;
    const r = Phaser.Math.Clamp(ratio, 0, 1), tr = Phaser.Math.Clamp(trail, 0, 1);
    g.fillStyle(0x07050c, 1).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(back, 1).fillRect(x, y, w, h);
    g.fillStyle(0x000000, 0.35).fillRect(x, y, w, 2);
    if (tr > r) g.fillStyle(0xffffff, 0.55).fillRect(x + w * r, y, w * (tr - r), h);
    const fw = Math.round(w * r);
    if (fw > 0) {
      g.fillStyle(base, 1).fillRect(x, y, fw, h);
      g.fillStyle(light, 1).fillRect(x, y, fw, Math.max(1, Math.floor(h * 0.25)));
      g.fillStyle(0xffffff, 0.35).fillRect(x + 1, y + 1, Math.max(0, fw - 2), 1);
      g.fillStyle(dark, 1).fillRect(x, y + h - Math.max(1, Math.floor(h * 0.25)), fw, Math.max(1, Math.floor(h * 0.25)));
    }
    if (segments > 1 && segments <= 30) {
      g.fillStyle(0x07050c, 0.55);
      for (let i = 1; i < segments; i++) g.fillRect(Math.round(x + (w * i) / segments), y, 1, h);
    }
  }

  /** Darkness that follows the hero, and red eyes that watch from the dark outside the rooms. */
  private updateDarkness(gs: GameScene, dt: number) {
    const cam = gs.cameras.main;
    const p = gs.player;
    const toScreen = (wx: number, wy: number) => ({ x: (wx - cam.worldView.x) * cam.zoom, y: (wy - cam.worldView.y) * cam.zoom });
    const ps = toScreen(p.x, p.y);
    // lighter during boss fights so attacks stay readable
    const target = this.darkAlpha * (gs.bossTarget ? 0.55 : 1);
    this.darkness.setPosition(ps.x, ps.y).setAlpha(this.darkness.alpha + (target - this.darkness.alpha) * Math.min(1, dt / 400));

    // watching eyes: many pairs, always somewhere in the dark, following the hero
    const maxEyes = gs.bossTarget ? 5 : [7, 10, 10][gs.stageIndex] ?? 8;
    this.eyeTimer -= dt;
    if (this.eyeTimer <= 0 && this.eyes.length < maxEyes && !gs.cutscene) {
      this.eyeTimer = Phaser.Math.Between(250, 800);
      const view = cam.worldView;
      for (let i = 0; i < 20; i++) {
        const wx = Phaser.Math.Between(view.x + 8, view.right - 8), wy = Phaser.Math.Between(view.y + 8, view.bottom - 8);
        const t = gs.dungeon.tiles[Math.floor(wy / 16)]?.[Math.floor(wx / 16)];
        const dist = Phaser.Math.Distance.Between(wx, wy, p.x, p.y);
        // in the void, or on a floor far enough to be swallowed by the darkness
        const dark = t === T.VOID ? dist > 70 : dist > 130 && t !== undefined && t !== T.WALL && t !== T.WALL_FACE;
        if (!dark || this.eyes.some((e) => Phaser.Math.Distance.Between(e.wx, e.wy, wx, wy) < 24)) continue;
        this.spawnEyes(wx, wy);
        break;
      }
    }
    for (const e of [...this.eyes]) {
      const s = toScreen(e.wx, e.wy);
      e.root.setPosition(s.x, s.y);
      // pupils track the hero
      const a = Math.atan2(p.y - e.wy, p.x - e.wx);
      for (const pu of e.pupils) pu.setPosition(pu.getData('bx') + Math.cos(a) * 0.8 * e.size, Math.sin(a) * 0.5 * e.size);
      // too close: they snap shut and vanish
      if (!e.fleeing && Phaser.Math.Distance.Between(e.wx, e.wy, p.x, p.y) < 50) {
        e.fleeing = true;
        this.tweens.killTweensOf(e.root);
        this.tweens.add({ targets: e.root, scaleY: 0.05, alpha: 0, duration: 140, onComplete: () => this.removeEyes(e) });
      }
    }
  }

  private spawnEyes(wx: number, wy: number) {
    const roll = Math.random();
    const size = roll < 0.15 ? 2.2 : roll < 0.55 ? 1.4 : 1;
    const three = Math.random() < 0.12;
    const offsets = three ? [-6, 0, 6] : [-4, 4];
    const color = Math.random() < 0.15 ? 0xffb020 : 0xff3048;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const glow = this.add.image(0, 0, 'glow').setTint(color === 0xff3048 ? 0xff1030 : 0xff8010).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.3 * size + (three ? 0.1 : 0), 0.15 * size).setAlpha(0.45);
    parts.push(glow);
    const lids: Phaser.GameObjects.Rectangle[] = [];
    const pupils: Phaser.GameObjects.Rectangle[] = [];
    offsets.forEach((ox, i) => {
      const y = three && i === 1 ? -3 * size : 0;
      const eyeR = this.add.rectangle(ox * size, y, 3 * size, 2 * size, color);
      const pupil = this.add.rectangle(ox * size, y, Math.max(1, size), Math.max(1, size * 1.4), 0x1a0006).setData('bx', ox * size);
      lids.push(eyeR); pupils.push(pupil);
      parts.push(eyeR, pupil);
    });
    const root = this.add.container(0, 0, parts).setAlpha(0).setDepth(0.5);
    const eye = { wx, wy, parts, root, pupils, size, fleeing: false };
    this.eyes.push(eye);
    const life = Phaser.Math.Between(3500, 9000);
    this.tweens.add({ targets: root, alpha: Phaser.Math.FloatBetween(0.6, 1), duration: Phaser.Math.Between(400, 1200) });
    // blink a few times while watching
    const blinks = Math.floor(life / 1800);
    for (let i = 0; i < blinks; i++) {
      this.tweens.add({ targets: [...lids, ...pupils], scaleY: 0.1, duration: 80, yoyo: true, delay: 900 + i * Phaser.Math.Between(1300, 2100) });
    }
    this.tweens.add({
      targets: root, alpha: 0, duration: 700, delay: life,
      onComplete: () => this.removeEyes(eye),
    });
  }

  private removeEyes(e: { root: Phaser.GameObjects.Container }) {
    if (!this.eyes.includes(e as never)) return;
    this.eyes = this.eyes.filter((x) => x !== e);
    e.root.destroy();
  }

  // ------------------------------------------------------------- update
  update(_t: number, dt: number) {
    const gs = this.game_;
    if (!gs || !gs.player) return;
    const r = gs.run;
    const p = gs.player;
    const g = this.g;
    g.clear();
    this.updateDarkness(gs, dt);

    // HP / armor panel with the hero's portrait
    drawPanel(g, 6, 6, 186, 46, 0x150f24, 0x5a4a8a, 0.88);
    drawPanel(g, 10, 10, 38, 38, 0x2a2048, p.invuln > 0 && p.sinceHit < 400 ? 0xff5050 : 0x8a7ac0, 1);
    this.hpShown += (r.hp - this.hpShown) * Math.min(1, dt / 120);
    const barX = 66, barW = 118;
    this.drawBar(g, barX, 12, barW, 12, r.hp / r.maxHp, this.hpShown / r.maxHp, [0xe04848, 0xff9a9a, 0x9a2030, 0x2a0810], r.maxHp);
    const armorRatio = r.maxArmor ? r.armor / r.maxArmor : 0;
    this.drawBar(g, barX, 31, barW, 10, armorRatio, armorRatio, [0x8fa8c8, 0xe0ecff, 0x506078, 0x101826], r.maxArmor);
    if (p.sinceHit > 3500 && r.armor < r.maxArmor) {
      // armor is regenerating: a light sweeps across the bar
      const sx = barX + ((_t / 4) % (barW + 20)) - 10;
      g.fillStyle(0xffffff, 0.35).fillRect(Phaser.Math.Clamp(sx, barX, barX + barW - 4), 31, 4, 10);
    }
    this.hpText.setText(`${r.hp}/${r.maxHp}`);
    this.armorText.setText(`${r.armor}/${r.maxArmor}`);
    this.portrait.setTint(p.invuln > 0 && p.sinceHit < 300 ? 0xff8080 : 0xffffff);
    if (r.hp <= 2 && r.hp > 0) {
      const pulse = 0.12 + Math.sin(_t / 150) * 0.08;
      this.damageFlash.setFillStyle(0xff0000, Math.max(this.damageFlash.fillAlpha, pulse));
      this.heartIcon.setScale(1.1 + Math.max(0, Math.sin(_t / 120)) * 0.35);
    } else this.heartIcon.setScale(1.1);

    // buffs
    const buffs: [keyof typeof p.buffs, string][] = [['rage', 'buff_rage'], ['haste', 'buff_haste'], ['shield', 'buff_shield']];
    let bi = 0;
    for (const [k, tex] of buffs) {
      const ms = p.buffs[k];
      if (ms > 0 && bi < 3) {
        this.buffIcons[bi].setTexture(tex).setVisible(true);
        this.buffTexts[bi].setText(String(Math.ceil(ms / 1000))).setVisible(true);
        bi++;
      }
    }
    for (; bi < 3; bi++) { this.buffIcons[bi].setVisible(false); this.buffTexts[bi].setVisible(false); }

    // weapon panel
    const w = p.weapon;
    const other = r.weapons[1 - r.slot];
    const touch = !!this.joystick;
    const wx = this.weaponIcon.x, wy = this.weaponIcon.y;
    const rarityColor = Phaser.Display.Color.HexStringToColor(RARITY_COLOR[w.rarity]).color;
    drawPanel(g, wx - 42, wy - 20, 84, 40, 0x150f24, rarityColor, 0.88);
    this.weaponGlow.setPosition(wx, wy).setTint(rarityColor).setAlpha(0.28 + Math.sin(_t / 400) * 0.08);
    if (other) drawPanel(g, this.weapon2Icon.x - 18, this.weapon2Icon.y - 12, 36, 24, 0x150f24, 0x4a3a7a, 0.75);
    this.weaponIcon.setTexture(w.texture).setOrigin(0.5);
    this.weapon2Icon.setVisible(!!other);
    if (other) this.weapon2Icon.setTexture(WEAPONS[other].texture);
    const wn = w.name + (other && !touch ? '  [Q]' : '');
    if (this.weaponName.text !== wn) setTextAuto(this.weaponName, wn, 8);
    this.weaponName.setColor(RARITY_COLOR[w.rarity]);
    // cooldown bars (attack + dash)
    const atkCd = Math.max(0, p.attackCd) / (w.cooldown / r.attackSpeed);
    const atkFrac = 1 - Math.min(1, atkCd);
    this.drawBar(g, wx - 34, wy + 12, 68, 4, atkFrac, atkFrac, [0xf0c040, 0xfff0a0, 0xa07020, 0x1a1008], 1);
    const dashFrac = Math.min(1, 1 - Math.max(0, p.dashCd) / (950 * r.dashCdMul));
    const dx = touch ? GAME_W - 132 : wx - 68, dy = touch ? GAME_H - 64 : wy + 8;
    const dashReady = dashFrac >= 1;
    this.drawBar(g, dx - 14, dy, 28, 5, dashFrac, dashFrac, dashReady ? [0x6f9cf0, 0xc0dcff, 0x3050a0, 0x0a1020] : [0x3a4a7a, 0x5a6a9a, 0x202a4a, 0x0a1020], 1);

    // boss bar
    const boss = gs.bossTarget;
    if (this.bossVisible && boss) {
      const ratio = Math.max(0, boss.hp / boss.maxHp);
      this.bossShown += (ratio - this.bossShown) * Math.min(1, dt / 200);
      const bwid = 320, bx = GAME_W / 2 - bwid / 2, by = 44;
      const queen = boss.def.id === 'queen';
      drawPanel(g, bx - 8, by - 6, bwid + 16, 20, 0x150f24, queen ? 0xc04080 : 0x8a3a5a, 0.92);
      this.drawBar(g, bx, by, bwid, 8, ratio, this.bossShown,
        queen ? [0xff3080, 0xffa0d0, 0x901848, 0x2a0818] : [0xe04848, 0xff9a9a, 0x9a2030, 0x2a0810], 1);
      if (queen) {
        // phase markers
        g.fillStyle(0xffffff, 0.9);
        g.fillRect(bx + bwid * 0.66, by - 2, 2, 12);
        g.fillRect(bx + bwid * 0.33, by - 2, 2, 12);
      }
    }

    this.drawMinimap(g, touch);

    // crosshair
    const ptr = this.input.activePointer;
    const showCross = !Input.usingTouch && !this.dialogue.active;
    this.crosshair.setVisible(showCross).setPosition(Math.round(ptr.x), Math.round(ptr.y));
    if (showCross) this.input.setDefaultCursor('none');
    else this.input.setDefaultCursor('default');

    if (this.touch.interact) this.setInteractAvailable(this.interactAvailable);
  }

  private drawMinimap(g: Phaser.GameObjects.Graphics, touch: boolean) {
    const gs = this.game_;
    const rooms = gs.dungeon.rooms;
    const s = 7, gap = 3;
    const maxGx = Math.max(...rooms.map((r) => r.gx)), maxGy = Math.max(...rooms.map((r) => r.gy));
    const mw = (maxGx + 1) * (s + gap) + 8, mh = (maxGy + 1) * (s + gap) + 8;
    const ox = GAME_W - 40 - mw, oy = touch ? 6 : 6;
    drawPanel(g, ox, oy, mw, mh, 0x0a0710, 0x3a2a5a, 0.7);
    const pos = (r: { gx: number; gy: number }) => ({ x: ox + 5 + r.gx * (s + gap), y: oy + 5 + r.gy * (s + gap) });
    for (const r of rooms) {
      if (!r.discovered) continue;
      const a = pos(r);
      for (const l of r.links) {
        const o = rooms[l];
        if (!o.discovered) continue;
        const b = pos(o);
        g.fillStyle(0x6a5a8a).fillRect(Math.min(a.x, b.x) + s / 2 - 1, Math.min(a.y, b.y) + s / 2 - 1, Math.abs(a.x - b.x) + 2, Math.abs(a.y - b.y) + 2);
      }
    }
    for (const r of rooms) {
      if (!r.discovered) continue;
      const a = pos(r);
      const cur = gs.currentRoom === r;
      const col = cur ? 0xffffff : r.type === 'boss' ? 0xe04848 : r.type === 'treasure' ? 0xf0c040 : r.visited ? 0x8a7ab0 : 0x3a2a5a;
      g.fillStyle(col).fillRect(a.x, a.y, s, s);
      if (r.type === 'boss' && !cur) g.fillStyle(0x000000).fillRect(a.x + 2, a.y + 2, 3, 3);
    }
  }
}
