import Phaser from 'phaser';
import { GAME_W, GAME_H, TEXT_COLORS, COLORS } from '../game/constants';
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
    this.damageFlash = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xff0000, 0).setOrigin(0);

    this.g = this.add.graphics();
    this.hpText = text(this, 112, 13, '', 8).setOrigin(0.5, 0);
    this.armorText = text(this, 112, 29, '', 8).setOrigin(0.5, 0);
    this.add.image(18, 17, 'heart').setScale(1.2);
    this.add.image(18, 33, 'buff_shield').setScale(0.85);

    this.stageText = text(this, GAME_W / 2, 10, `${gs.stage.subtitle} - ${gs.stage.name}`, 8, TEXT_COLORS.gray).setOrigin(0.5, 0);

    // weapon panel
    const wy = GAME_H - 34;
    this.weaponIcon = this.add.image(GAME_W - 46, wy, 'w_sword').setScale(2);
    this.weapon2Icon = this.add.image(GAME_W - 104, wy + 4, 'w_staff').setScale(1).setAlpha(0.6);
    this.weaponName = text(this, GAME_W - 8, wy - 24, '', 8).setOrigin(1, 1);

    // boss bar
    this.bossName = text(this, GAME_W / 2, 26, '', 8, TEXT_COLORS.pink).setOrigin(0.5, 0).setVisible(false);

    // buffs
    for (let i = 0; i < 3; i++) {
      this.buffIcons.push(this.add.image(18 + i * 30, 56, 'buff_rage').setVisible(false));
      this.buffTexts.push(text(this, 28 + i * 30, 52, '', 8).setVisible(false));
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

  // ------------------------------------------------------------- update
  update(_t: number, dt: number) {
    const gs = this.game_;
    if (!gs || !gs.player) return;
    const r = gs.run;
    const p = gs.player;
    const g = this.g;
    g.clear();

    // HP / armor panel
    drawPanel(g, 6, 6, 152, 38, 0x150f24, 0x4a3a7a, 0.85);
    this.hpShown += (r.hp - this.hpShown) * Math.min(1, dt / 120);
    const bw = 116;
    g.fillStyle(0x3a0a14).fillRect(30, 12, bw, 11);
    g.fillStyle(0xffffff, 0.6).fillRect(30, 12, bw * Math.max(0, this.hpShown / r.maxHp), 11);
    g.fillStyle(COLORS.hp).fillRect(30, 12, bw * (r.hp / r.maxHp), 11);
    g.fillStyle(0xff9090).fillRect(30, 12, bw * (r.hp / r.maxHp), 2);
    g.fillStyle(0x1a2030).fillRect(30, 28, bw, 11);
    g.fillStyle(COLORS.armor).fillRect(30, 28, bw * (r.maxArmor ? r.armor / r.maxArmor : 0), 11);
    g.fillStyle(0xd0e0f0).fillRect(30, 28, bw * (r.maxArmor ? r.armor / r.maxArmor : 0), 2);
    this.hpText.setText(`${r.hp}/${r.maxHp}`);
    this.armorText.setText(`${r.armor}/${r.maxArmor}`);
    if (r.hp <= 2 && r.hp > 0) {
      const pulse = 0.12 + Math.sin(_t / 150) * 0.08;
      this.damageFlash.setFillStyle(0xff0000, Math.max(this.damageFlash.fillAlpha, pulse));
    }

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
    drawPanel(g, wx - 40, wy - 18, 80, 36, 0x150f24, Phaser.Display.Color.HexStringToColor(RARITY_COLOR[w.rarity]).color, 0.85);
    if (other) drawPanel(g, this.weapon2Icon.x - 18, this.weapon2Icon.y - 12, 36, 24, 0x150f24, 0x4a3a7a, 0.7);
    this.weaponIcon.setTexture(w.texture).setOrigin(0.5);
    this.weapon2Icon.setVisible(!!other);
    if (other) this.weapon2Icon.setTexture(WEAPONS[other].texture);
    const wn = w.name + (other && !touch ? '  [Q]' : '');
    if (this.weaponName.text !== wn) setTextAuto(this.weaponName, wn, 8);
    this.weaponName.setColor(RARITY_COLOR[w.rarity]);
    // cooldown bars (attack + dash)
    const atkCd = Math.max(0, p.attackCd) / (w.cooldown / r.attackSpeed);
    g.fillStyle(0x000000, 0.6).fillRect(wx - 34, wy + 12, 68, 3);
    g.fillStyle(0xf0c040).fillRect(wx - 34, wy + 12, 68 * (1 - Math.min(1, atkCd)), 3);
    const dashFrac = 1 - Math.max(0, p.dashCd) / (950 * r.dashCdMul);
    const dx = touch ? GAME_W - 132 : wx - 64, dy = touch ? GAME_H - 64 : wy + 10;
    g.fillStyle(0x000000, 0.6).fillRect(dx - 12, dy, 24, 4);
    g.fillStyle(dashFrac >= 1 ? 0x6f9cf0 : 0x3a4a7a).fillRect(dx - 12, dy, 24 * Math.min(1, dashFrac), 4);

    // boss bar
    const boss = gs.bossTarget;
    if (this.bossVisible && boss) {
      const ratio = Math.max(0, boss.hp / boss.maxHp);
      this.bossShown += (ratio - this.bossShown) * Math.min(1, dt / 200);
      const bwid = 300, bx = GAME_W / 2 - bwid / 2, by = 40;
      drawPanel(g, bx - 6, by - 4, bwid + 12, 14, 0x150f24, 0x8a3a6a, 0.9);
      g.fillStyle(0x3a0a20).fillRect(bx, by, bwid, 6);
      g.fillStyle(0xffffff, 0.7).fillRect(bx, by, bwid * this.bossShown, 6);
      g.fillStyle(boss.def.id === 'queen' ? 0xff3080 : 0xe04848).fillRect(bx, by, bwid * ratio, 6);
      if (boss.def.id === 'queen') {
        g.fillStyle(0xffffff, 0.8);
        g.fillRect(bx + bwid * 0.66, by - 1, 1, 8);
        g.fillRect(bx + bwid * 0.33, by - 1, 1, 8);
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
