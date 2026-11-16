import Phaser from 'phaser';
import { GAME_W, GAME_H, TEXT_COLORS, FONT, FONT_TH } from '../game/constants';
import { drawPanel, text } from './widgets';
import { Audio, SfxName } from '../audio/AudioEngine';
import { Line, QUEEN_NAME, LOVER_NAME, HERO_NAME } from '../data/story';
import { isThai, setTextAuto, thaiSize, wrapText } from './thai';

const SPEAKERS: Record<string, { name: string; color: string; portrait?: string; voice: SfxName }> = {
  hero: { name: HERO_NAME, color: TEXT_COLORS.blue, portrait: 'hero_idle0', voice: 'text' },
  queen: { name: QUEEN_NAME, color: TEXT_COLORS.pink, portrait: 'queen_idle0', voice: 'textQueen' },
  lover: { name: LOVER_NAME, color: '#ffb070', portrait: 'lover_idle0', voice: 'textLover' },
  king: { name: 'พระราชา', color: TEXT_COLORS.gold, portrait: 'king', voice: 'text' },
  narrator: { name: '', color: TEXT_COLORS.gray, voice: 'text' },
  sign: { name: 'โน้ต', color: '#e0c890', portrait: 'note', voice: 'text' },
  unknown: { name: '???', color: TEXT_COLORS.purple, voice: 'text' },
};

/** Pixel-art portrait -> real photo portrait (used when the photo was loaded). */
const PHOTO_FOR: Record<string, string> = {
  queen_idle0: 'photo_queen',
  queen_cast: 'photo_queen',
  queen_shock: 'photo_queen',
  queen_cry: 'photo_queen_cry',
  queen_blush: 'photo_queen_love',
  lover_idle0: 'photo_lover',
  lover_happy: 'photo_lover_happy',
};

const BOX_H = 96;
const PORTRAIT = 64;

/**
 * Screen-space dialogue box with portrait, name tag and typewriter text.
 * Must be created in a scene whose camera zoom is 1.
 */
export class DialogueBox {
  private root: Phaser.GameObjects.Container;
  private portrait: Phaser.GameObjects.Image;
  private portraitBg: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private body: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Text;
  private full = '';
  private shown = 0;
  private typing = false;
  private resolveLine: (() => void) | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;
  private voice: SfxName = 'text';
  private lineStart = 0;
  active = false;

  constructor(private scene: Phaser.Scene, depth = 1000) {
    const y = GAME_H - BOX_H - 8;
    const g = scene.add.graphics();
    drawPanel(g, 12, y, GAME_W - 24, BOX_H, 0x150f24, 0x8a6ac0, 0.96);
    this.portraitBg = scene.add.graphics();
    drawPanel(this.portraitBg, 20, y + 12, PORTRAIT + 8, PORTRAIT + 8, 0x2a2048, 0xf0c040, 1);
    this.portrait = scene.add.image(24 + PORTRAIT / 2, y + 16 + PORTRAIT / 2, 'hero_idle0');
    this.nameText = text(scene, 106, y + 6, '', 8, TEXT_COLORS.gold);
    this.body = text(scene, 106, y + 30, '', 8, TEXT_COLORS.white);
    this.arrow = text(scene, GAME_W - 30, y + BOX_H - 16, 'v', 8, TEXT_COLORS.gold);
    scene.tweens.add({ targets: this.arrow, y: y + BOX_H - 13, duration: 350, yoyo: true, repeat: -1 });
    this.root = scene.add.container(0, 0, [g, this.portraitBg, this.portrait, this.nameText, this.body, this.arrow])
      .setDepth(depth).setScrollFactor(0).setVisible(false);

    const advance = () => this.advance();
    scene.input.on('pointerdown', advance);
    const kb = scene.input.keyboard;
    kb?.on('keydown-E', advance);
    kb?.on('keydown-SPACE', advance);
    kb?.on('keydown-ENTER', advance);
    scene.events.once('shutdown', () => {
      scene.input.off('pointerdown', advance);
      kb?.off('keydown-E', advance); kb?.off('keydown-SPACE', advance); kb?.off('keydown-ENTER', advance);
    });
  }

  async play(lines: Line[]) {
    this.active = true;
    this.root.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.root, alpha: 1, duration: 150 });
    for (const l of lines) await this.showLine(l);
    this.root.setVisible(false);
    this.active = false;
  }

  /** Show a single line (box stays open). */
  say(l: Line) {
    this.active = true;
    this.root.setVisible(true).setAlpha(1);
    return this.showLine(l);
  }

  hide() { this.root.setVisible(false); this.active = false; }

  private showLine(l: Line) {
    const sp = SPEAKERS[l.who] ?? SPEAKERS.unknown;
    let portrait = l.portrait ?? sp.portrait;
    const photo = portrait ? PHOTO_FOR[portrait] : undefined;
    if (photo && this.scene.textures.exists(photo)) portrait = photo;
    const name = l.name ?? sp.name;
    const narrator = l.who === 'narrator';
    const showPortrait = !!portrait && !narrator;
    this.portrait.setVisible(showPortrait);
    this.portraitBg.setVisible(showPortrait);
    if (portrait) {
      this.portrait.setTexture(portrait);
      const sz = Math.max(this.portrait.width, this.portrait.height);
      // photos fill the frame; pixel sprites are scaled up by whole-ish steps
      this.portrait.setScale(portrait.startsWith('photo_') ? PORTRAIT / sz : Math.min(4, (PORTRAIT - 8) / sz));
    }
    const x = showPortrait ? 106 : 30;
    setTextAuto(this.nameText, name, 8).setColor(sp.color).setX(x);
    const width = GAME_W - x - 40;
    // pre-wrap the whole line so words don't jump between lines while typing
    const wrapped = isThai(l.text)
      ? wrapText(l.text, thaiSize(8), FONT_TH, width)
      : wrapText(l.text, 8, FONT, width);
    setTextAuto(this.body, wrapped, 8).setX(x).setColor(narrator ? '#d8d0e8' : TEXT_COLORS.white);
    this.body.setLineSpacing(isThai(l.text) ? -2 : 4);
    this.voice = sp.voice;
    this.full = wrapped;
    this.shown = 0;
    this.body.setText('');
    this.arrow.setVisible(false);
    this.typing = true;
    this.lineStart = this.scene.time.now;
    this.timer?.remove();
    this.timer = this.scene.time.addEvent({
      delay: 28, loop: true, callback: () => {
        this.shown++;
        this.body.setText(this.full.slice(0, this.shown));
        if (this.shown % 2 === 0 && this.full[this.shown - 1] !== ' ') Audio.sfx(this.voice, 0);
        if (this.shown >= this.full.length) this.finishTyping();
      },
    });
    return new Promise<void>((res) => { this.resolveLine = res; });
  }

  private finishTyping() {
    this.typing = false;
    this.timer?.remove();
    this.timer = null;
    this.body.setText(this.full);
    this.arrow.setVisible(true);
  }

  private advance() {
    if (!this.active || !this.resolveLine) return;
    // ignore clicks in the first moments of a line (prevents accidental skipping while fighting)
    if (this.scene.time.now - this.lineStart < 250) return;
    if (this.typing) { this.finishTyping(); return; }
    const r = this.resolveLine;
    this.resolveLine = null;
    Audio.sfx('click');
    r();
  }
}
