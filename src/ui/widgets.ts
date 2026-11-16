import Phaser from 'phaser';
import { FONT, FONT_TH, TEXT_COLORS } from '../game/constants';
import { fontStyle, isThai, setTextAuto, thaiSize, wrapText } from './thai';
import { Audio } from '../audio/AudioEngine';

/** Draws a chunky pixel-art panel into a Graphics object. */
export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill = 0x1d1530, border = 0x5a4a8a, alpha = 0.94) {
  const C = Phaser.Display.Color;
  const light = C.IntegerToColor(border).brighten(30).color;
  const dark = C.IntegerToColor(border).darken(35).color;
  // drop shadow
  g.fillStyle(0x000000, 0.35 * alpha);
  g.fillRect(x + 3, y + 4, w - 2, h - 2);
  // dark outline with cut corners
  g.fillStyle(0x07050c, alpha);
  g.fillRect(x + 2, y, w - 4, h);
  g.fillRect(x, y + 2, w, h - 4);
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
  // bevelled border: lit top-left, shaded bottom-right
  g.fillStyle(dark, 1);
  g.fillRect(x + 2, y + 1, w - 4, h - 2);
  g.fillRect(x + 1, y + 2, w - 2, h - 4);
  g.fillStyle(border, 1);
  g.fillRect(x + 2, y + 1, w - 5, h - 3);
  g.fillRect(x + 1, y + 2, w - 3, h - 5);
  g.fillStyle(light, 1);
  g.fillRect(x + 2, y + 1, w - 5, 1);
  g.fillRect(x + 1, y + 2, 1, h - 5);
  // body with a soft vertical gradient
  g.fillStyle(fill, alpha);
  g.fillRect(x + 3, y + 3, w - 6, h - 6);
  const inner = h - 6;
  g.fillStyle(0xffffff, 0.07);
  g.fillRect(x + 3, y + 3, w - 6, Math.min(10, Math.max(2, Math.floor(inner * 0.35))));
  g.fillStyle(0xffffff, 0.12);
  g.fillRect(x + 3, y + 3, w - 6, 1);
  const shade = Math.min(8, Math.floor(inner * 0.3));
  g.fillStyle(0x000000, 0.2);
  g.fillRect(x + 3, y + h - 3 - shade, w - 6, shade);
  // corner studs on larger panels
  if (w > 60 && h > 30) {
    g.fillStyle(light, 1);
    for (const [cx, cy] of [[x + 5, y + 5], [x + w - 7, y + 5], [x + 5, y + h - 7], [x + w - 7, y + h - 7]]) g.fillRect(cx, cy, 2, 2);
  }
}

/**
 * Creates a text object. Thai strings automatically get the Thai font, a larger size
 * and Thai-aware word wrapping.
 */
export function text(scene: Phaser.Scene, x: number, y: number, str: string, size = 8, color = TEXT_COLORS.white, opts: Phaser.Types.GameObjects.Text.TextStyle = {}) {
  const st = fontStyle(str, size);
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    color, lineSpacing: isThai(str) ? 0 : Math.round(size * 0.5), ...opts, ...st,
  };
  let content = str;
  const ww = opts.wordWrap?.width;
  if (isThai(str) && ww) {
    content = wrapText(str, thaiSize(size), FONT_TH, ww);
    style.wordWrap = undefined;
  }
  void FONT;
  return scene.add.text(x, y, content, style);
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private bw: number;
  private bh: number;
  private hovered = false;
  private onClick: () => void;
  private color: number;
  disabled = false;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, w = 160, h = 26, color = 0x2a2048) {
    super(scene, x, y);
    this.bw = w; this.bh = h; this.onClick = onClick; this.color = color;
    this.bg = scene.add.graphics();
    this.label = text(scene, 0, 0, label, 8, TEXT_COLORS.white).setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => { if (this.disabled) return; this.hovered = true; this.redraw(); Audio.sfx('hover'); });
    this.on('pointerout', () => { this.hovered = false; this.redraw(); });
    this.on('pointerdown', () => {
      if (this.disabled) return;
      Audio.unlock();
      Audio.sfx('click');
      scene.tweens.add({ targets: this, scale: 0.94, duration: 50, yoyo: true });
      onClick();
    });
    this.redraw();
    scene.add.existing(this);
  }

  setLabel(s: string) { setTextAuto(this.label, s, 8); return this; }

  setDisabled(v: boolean) { this.disabled = v; this.setAlpha(v ? 0.45 : 1); return this; }

  trigger() { if (!this.disabled) { Audio.sfx('click'); this.onClick(); } }

  private redraw() {
    const g = this.bg;
    g.clear();
    if (this.hovered) {
      // soft golden glow around the focused button
      g.fillStyle(0xf0c040, 0.12);
      g.fillRect(-this.bw / 2 - 5, -this.bh / 2 - 4, this.bw + 10, this.bh + 8);
      g.fillStyle(0xf0c040, 0.16);
      g.fillRect(-this.bw / 2 - 2, -this.bh / 2 - 2, this.bw + 4, this.bh + 4);
    }
    drawPanel(g, -this.bw / 2, -this.bh / 2, this.bw, this.bh, this.hovered ? 0x4a3a7a : this.color, this.hovered ? 0xf0c040 : 0x6a5a9a);
    this.label.setColor(this.hovered ? TEXT_COLORS.gold : TEXT_COLORS.white);
  }
}

/** Simple vertical menu with keyboard (arrows/WASD + Enter) and mouse support. */
export function keyboardMenu(scene: Phaser.Scene, buttons: Button[]) {
  let idx = -1;
  const focus = (i: number) => {
    const live = buttons.filter((b) => !b.disabled);
    if (!live.length) return;
    idx = (i + live.length) % live.length;
    live.forEach((b, j) => b.emit(j === idx ? 'pointerover' : 'pointerout'));
  };
  const kb = scene.input.keyboard!;
  const up = () => focus(idx - 1);
  const down = () => focus(idx + 1);
  const enter = () => { const live = buttons.filter((b) => !b.disabled); if (idx >= 0 && live[idx]) live[idx].trigger(); };
  kb.on('keydown-UP', up); kb.on('keydown-W', up);
  kb.on('keydown-DOWN', down); kb.on('keydown-S', down);
  kb.on('keydown-ENTER', enter);
  scene.events.once('shutdown', () => {
    kb.off('keydown-UP', up); kb.off('keydown-W', up); kb.off('keydown-DOWN', down); kb.off('keydown-S', down); kb.off('keydown-ENTER', enter);
  });
}
