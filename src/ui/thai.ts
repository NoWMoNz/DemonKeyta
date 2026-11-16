import Phaser from 'phaser';
import { FONT, FONT_TH } from '../game/constants';

/**
 * Thai text support.
 * - Strings containing Thai use the Kanit font at a larger size (the pixel font has no Thai glyphs).
 * - Thai has no spaces between words, so wrapping uses Intl.Segmenter word boundaries.
 */
const TH_RE = /[฀-๿]/;
export const isThai = (s: string) => TH_RE.test(s);

/** Pixel-font size -> equivalent Kanit size. */
export const thaiSize = (px: number) => Math.round(px * 1.6);

/** Includes tall Thai marks so Phaser measures enough vertical room (no clipped tone marks). */
const TEST_STRING = '|MÉqgy ปู่ฟ้าญู้ฎั้ฐ';

export function fontStyle(str: string, size: number): Phaser.Types.GameObjects.Text.TextStyle {
  return isThai(str)
    ? { fontFamily: FONT_TH, fontSize: `${thaiSize(size)}px`, testString: TEST_STRING }
    : { fontFamily: FONT, fontSize: `${size}px` };
}

/** Change a text object's content and switch font/size to match the language. */
export function setTextAuto(t: Phaser.GameObjects.Text, str: string, baseSize: number) {
  const st = fontStyle(str, baseSize);
  t.setFontFamily(st.fontFamily as string);
  t.setFontSize(st.fontSize as string);
  if (st.testString) t.style.testString = st.testString;
  t.setText(str);
  return t;
}

let measureCtx: CanvasRenderingContext2D | null = null;
type Segmenter = { segment(s: string): Iterable<{ segment: string }> };
let segmenter: Segmenter | null | undefined;

function words(str: string): string[] {
  if (segmenter === undefined) {
    const S = (Intl as unknown as { Segmenter?: new (l: string, o: object) => Segmenter }).Segmenter;
    segmenter = S ? new S('th', { granularity: 'word' }) : null;
  }
  if (segmenter) return Array.from(segmenter.segment(str), (s) => s.segment);
  return str.split(/(\s+)/); // fallback: split on spaces only
}

/** Greedy word wrap that works for Thai. Returns text with '\n' inserted. */
export function wrapText(str: string, fontSizePx: number, fontFamily: string, maxWidth: number) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  const ctx = measureCtx!;
  ctx.font = `${fontSizePx}px ${fontFamily}`;
  const out: string[] = [];
  for (const para of str.split('\n')) {
    let line = '';
    for (const w of words(para)) {
      const test = line + w;
      if (line && ctx.measureText(test).width > maxWidth) {
        out.push(line.trimEnd());
        line = w.trimStart();
        // a single segment longer than the line: hard-break by characters
        while (ctx.measureText(line).width > maxWidth && line.length > 1) {
          let i = line.length - 1;
          while (i > 1 && ctx.measureText(line.slice(0, i)).width > maxWidth) i--;
          out.push(line.slice(0, i));
          line = line.slice(i);
        }
      } else line = test;
    }
    out.push(line.trimEnd());
  }
  return out.join('\n');
}
