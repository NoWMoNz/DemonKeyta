import Phaser from 'phaser';
import { GAME_W, GAME_H, TEXT_COLORS, FONT } from '../game/constants';
import { DialogueBox } from '../ui/DialogueBox';
import { Button, drawPanel, text } from '../ui/widgets';
import { Audio } from '../audio/AudioEngine';
import { ENDING, Line, LOVER_NAME, QUEEN_NAME, CREDITS } from '../data/story';
import { fontStyle } from '../ui/thai';
import { WEAPONS, WeaponId } from '../data/weapons';
import { Progress, RunState } from '../systems/ProgressionSystem';

const S = 3; // world scale
const WORLD_W = 300;
const VIEW_W = GAME_W / S;

/**
 * Fully scripted cinematic: the Queen's defeat, the twist, and the hero's tragic end.
 * World objects live in a scaled container so the dialogue box can stay in screen space.
 */
export class EndingScene extends Phaser.Scene {
  private W!: Phaser.GameObjects.Container;
  private dlg!: DialogueBox;
  private hero!: Phaser.GameObjects.Sprite;
  private heroWeapon!: Phaser.GameObjects.Image;
  private queen!: Phaser.GameObjects.Image;
  private lover!: Phaser.GameObjects.Sprite;
  private hearts!: Phaser.GameObjects.Particles.ParticleEmitter;
  private tears!: Phaser.GameObjects.Particles.ParticleEmitter;
  private run!: RunState;
  private weapon: WeaponId = 'sword';
  private overlay!: Phaser.GameObjects.Rectangle;
  private queenShadow!: Phaser.GameObjects.Image;
  private loverShadow!: Phaser.GameObjects.Image;

  constructor() { super('Ending'); }

  init(data: { run: RunState; weapon?: WeaponId }) {
    this.run = data.run;
    this.weapon = data.weapon ?? 'sword';
  }

  create() {
    this.cameras.main.setBackgroundColor(0x05020a);
    this.W = this.add.container(0, 0).setScale(S);
    this.buildRoom();
    this.overlay = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xff80b0, 0).setOrigin(0).setDepth(50);
    this.dlg = new DialogueBox(this, 1000);
    this.input.setDefaultCursor('default');
    this.cameras.main.fadeIn(1500);
    Audio.playMusic(null);
    this.script();
  }

  // ------------------------------------------------------------ world
  private buildRoom() {
    const W = this.W;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { W.add(o); return o; };
    for (let x = 0; x < WORLD_W; x += 16) {
      add(this.add.image(x, -16, 'tiles_2', '10').setOrigin(0));
      add(this.add.image(x, 0, 'tiles_2', '11').setOrigin(0));
      for (let y = 16; y < 140; y += 16) {
        const f = x >= 64 && x < 96 ? (x === 64 ? '15' : '9') : String(1 + ((x / 16 + y / 16) % 4));
        add(this.add.image(x, y, 'tiles_2', f).setOrigin(0));
      }
    }
    // door on the right side of the top wall
    add(this.add.rectangle(254, 0, 18, 16, 0x050208).setOrigin(0));
    add(this.add.rectangle(252, 0, 2, 16, 0xf0c040).setOrigin(0));
    add(this.add.rectangle(272, 0, 2, 16, 0xf0c040).setOrigin(0));
    // decor
    add(this.add.image(80, 24, 'throne').setScale(1.3));
    for (const x of [30, 140, 200]) add(this.add.image(x, 9, 'banner'));
    for (const x of [44, 116, 170]) {
      add(this.add.image(x, 28, 'candelabra'));
      const g = add(this.add.image(x, 24, 'glow').setTint(0xffa040).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setScale(0.7));
      this.tweens.add({ targets: g, alpha: 0.2, duration: 260, yoyo: true, repeat: -1 });
    }
    for (let i = 0; i < 6; i++) add(this.add.image(20 + i * 50 + Math.random() * 20, 100 + Math.random() * 30, Math.random() < 0.5 ? 'bones' : 'skull').setAlpha(0.8));
    // battle smoke
    const smoke = this.add.particles(0, 0, 'smoke', {
      x: { min: 30, max: 170 }, y: { min: 40, max: 110 }, lifespan: 2500, speedY: { min: -6, max: -2 },
      scale: { start: 1.2, end: 2.5 }, alpha: { start: 0.15, end: 0 }, frequency: 120, tint: 0x806070, duration: 6000,
    });
    add(smoke);

    // characters
    this.queenShadow = add(this.add.image(80, 72, 'shadow').setScale(1.6));
    this.queen = add(this.add.image(80, 62, 'queen_cry').setScale(1, 0.86));
    add(this.add.image(128, 74, 'shadow'));
    this.hero = add(this.add.sprite(128, 67, 'hero_idle0').setFlipX(true).play('hero_idle'));
    this.heroWeapon = add(this.add.image(122, 70, WEAPONS[this.weapon].texture).setOrigin(0.15, 0.5).setRotation(Math.PI - 1.1).setFlipY(true));
    this.loverShadow = add(this.add.image(263, 18, 'shadow').setScale(1.8));
    this.lover = add(this.add.sprite(263, 4, 'lover_idle0').setAlpha(0).setTint(0x000000));

    this.tears = add(this.add.particles(0, 0, 'tear', {
      x: { min: 75, max: 85 }, y: 56, speedY: { min: 10, max: 30 }, speedX: { min: -14, max: 14 }, gravityY: 60,
      lifespan: 700, alpha: { start: 1, end: 0 }, frequency: 160,
    }));
    this.hearts = add(this.add.particles(0, 0, 'heart_px', {
      speed: { min: 15, max: 45 }, angle: { min: 220, max: 320 }, lifespan: 1600, gravityY: -10,
      scale: { start: 1, end: 0.3 }, alpha: { start: 1, end: 0 }, tint: [0xff6aa8, 0xff3070, 0xffb0d0], emitting: false,
    }));
  }

  private viewX(worldCenter: number) {
    return -Phaser.Math.Clamp(worldCenter - VIEW_W / 2, 0, WORLD_W - VIEW_W) * S;
  }

  private pan(worldCenter: number, ms: number, ease = 'Sine.easeInOut') {
    return new Promise<void>((res) => this.tweens.add({ targets: this.W, x: this.viewX(worldCenter), duration: ms, ease, onComplete: () => res() }));
  }

  private wait(ms: number) { return new Promise<void>((r) => this.time.delayedCall(ms, () => r())); }

  private emote(target: { x: number; y: number }, key: string, ms = 1400, dy = -14) {
    const e = this.add.image(target.x, target.y + dy, key).setScale(0);
    this.W.add(e);
    this.tweens.add({ targets: e, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.time.delayedCall(ms, () => this.tweens.add({ targets: e, alpha: 0, duration: 200, onComplete: () => e.destroy() }));
  }

  private say(who: Line['who'], t: string, name?: string, portrait?: string) {
    return this.dlg.say({ who, text: t, name, portrait });
  }

  private worldText(x: number, y: number, s: string, color: string, size = 8) {
    const t = this.add.text(x, y, s, { ...fontStyle(s, size), color, stroke: '#000', strokeThickness: 3, align: 'center' }).setOrigin(0.5).setScale(0.5);
    this.W.add(t);
    return t;
  }

  // ------------------------------------------------------------ script
  private async script() {
    await this.wait(1600);
    Audio.sfx('sob');
    this.tweens.add({ targets: this.queen, x: 80.6, duration: 80, yoyo: true, repeat: 12 });
    await this.wait(1200);

    // 1. She cries
    await this.say('queen', ENDING.queenCry, undefined, 'queen_cry');
    Audio.sfx('sob');
    this.emote(this.hero, 'emote_q');
    await this.say('hero', ENDING.heroHuh);
    this.dlg.hide();

    // 2. A door creaks open... and someone terrifying walks in
    Audio.sfx('creak');
    await this.wait(400);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0).setOrigin(0).setDepth(45);
    this.tweens.add({ targets: dim, fillAlpha: 0.35, duration: 1500 });
    await this.pan(WORLD_W, 1800);
    const rays = this.add.image(263, 0, 'rays').setOrigin(0.5, 0).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setTint(0xff3050);
    this.W.add(rays);
    this.tweens.add({ targets: rays, alpha: 0.9, duration: 800 });
    this.tweens.add({ targets: this.lover, alpha: 1, duration: 800 });
    // dark aura that follows him
    const aura = this.add.particles(0, 0, 'smoke', {
      follow: this.lover, followOffset: { x: 0, y: 6 }, speedY: { min: -18, max: -6 }, speedX: { min: -8, max: 8 },
      lifespan: 900, scale: { start: 1.1, end: 0 }, alpha: { start: 0.55, end: 0 }, frequency: 60, tint: [0x2a0a30, 0x500a20, 0x000000],
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-12, -10, 24, 24) } as Phaser.Types.GameObjects.Particles.EmitZoneData,
    });
    const embers = this.add.particles(0, 0, 'px', {
      follow: this.lover, speedY: { min: -26, max: -10 }, speedX: { min: -6, max: 6 }, lifespan: 800,
      scale: { start: 0.6, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 90, tint: [0xff2040, 0xff8040], blendMode: 'ADD',
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-12, -12, 24, 26) } as Phaser.Types.GameObjects.Particles.EmitZoneData,
    });
    this.W.addAt(aura, this.W.getIndex(this.lover));
    this.W.add(embers);
    this.loverShadow.setAlpha(0);
    this.tweens.add({ targets: this.loverShadow, alpha: 1, duration: 800 });
    await this.wait(900);
    // slow, heavy footsteps that shake the room
    this.lover.play('lover_walk');
    const steps = this.time.addEvent({
      delay: 480, loop: true, callback: () => {
        Audio.sfx('door', 0);
        this.cameras.main.shake(90, 0.006);
        const dust = this.add.particles(0, 0, 'smoke', { speed: { min: 8, max: 20 }, angle: { min: 180, max: 360 }, lifespan: 400, scale: { start: 0.5, end: 0 }, alpha: { start: 0.5, end: 0 }, tint: 0x806070, emitting: false });
        this.W.add(dust);
        dust.explode(4, this.lover.x, this.lover.y + 13);
        this.time.delayedCall(500, () => dust.destroy());
      },
    });
    this.tweens.add({ targets: this.loverShadow, x: 214, y: 72, duration: 3200 });
    await new Promise<void>((r) => this.tweens.add({ targets: this.lover, x: 214, y: 58, duration: 3200, onComplete: () => r() }));
    steps.remove();
    this.lover.play('lover_idle');
    this.tweens.addCounter({
      from: 0, to: 255, duration: 900,
      onUpdate: (tw) => { const v = Math.floor(tw.getValue() ?? 0); this.lover.setTint(Phaser.Display.Color.GetColor(v, v, v)); },
      onComplete: () => this.lover.clearTint(),
    });
    this.tweens.add({ targets: rays, alpha: 0.25, duration: 1000 });
    await this.wait(1000);
    // glasses glint
    this.lover.stop().setTexture('lover_glare');
    Audio.sfx('deflect');
    const glint = this.add.image(this.lover.x + 5, this.lover.y - 3, 'spark').setBlendMode(Phaser.BlendModes.ADD).setScale(0);
    this.W.add(glint);
    this.tweens.add({ targets: glint, scale: 1.6, angle: 90, duration: 220, yoyo: true, onComplete: () => glint.destroy() });
    await this.wait(700);
    this.lover.play('lover_idle');
    await this.pan(160, 1300);
    this.tweens.add({ targets: dim, fillAlpha: 0, duration: 1200 });
    // the hero is terrified
    this.hero.stop().setTexture('hero_sweat');
    this.emote(this.hero, 'emote_excl', 1200);
    Audio.sfx('gasp');
    this.tweens.add({ targets: [this.hero, this.heroWeapon], y: '-=3', duration: 120, yoyo: true, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: this.hero, x: '+=0.6', duration: 50, yoyo: true, repeat: 10, delay: 200 });
    await this.wait(600);
    await this.say('hero', ENDING.heroScared, undefined, 'hero_sweat');
    this.dlg.hide();
    aura.stop();
    embers.stop();

    // 3. She notices him
    this.tears.stop();
    this.queen.setTexture('queen_shock');
    Audio.sfx('gasp');
    this.emote(this.queen, 'emote_excl', 1200, -20);
    this.tweens.add({ targets: this.queen, y: 58, duration: 120, yoyo: true });
    await this.wait(1300);
    this.queen.setTexture('queen_blush').setScale(1, 1);
    this.emote(this.queen, 'emote_heart', 1200, -20);
    Audio.sfx('heart');
    await this.wait(900);
    await this.say('queen', ENDING.queenRun, undefined, 'queen_blush');
    this.dlg.hide();

    // 4. She dashes over (spinning the hero around on the way)
    Audio.sfx('whoosh');
    // she ends up in front of him (he is much bigger, she must stay visible in the hug)
    this.W.bringToTop(this.queenShadow);
    this.W.bringToTop(this.queen);
    this.tweens.add({ targets: this.queen, x: 203, y: 64, duration: 900, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: this.queenShadow, x: 203, y: 74, duration: 900, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: this.queen, scaleY: 0.92, duration: 90, yoyo: true, repeat: 4 });
    await this.wait(350);
    this.hero.stop();
    this.hero.setTexture('hero_hurt');
    this.tweens.add({ targets: [this.hero], angle: 720, duration: 700, ease: 'Cubic.easeOut' });
    this.heroWeapon.setVisible(false);
    await this.wait(600);

    // 5. The embrace
    Audio.sfx('heart');
    this.cameras.main.flash(400, 255, 200, 230);
    this.lover.stop().setTexture('lover_happy');
    this.tweens.add({ targets: [this.queen, this.lover], y: '-=4', duration: 140, yoyo: true, repeat: 1 });
    this.hearts.explode(30, 207, 52);
    this.time.addEvent({ delay: 450, loop: true, callback: () => this.hearts.explode(2, 207 + Phaser.Math.Between(-6, 6), 50) });
    this.tweens.add({ targets: this.overlay, fillAlpha: 0.1, duration: 1500 });
    Audio.playMusic('romance');
    this.hero.setAngle(0).setTexture('hero_sweat');
    await this.wait(1200);
    await this.say('lover', ENDING.loverHi, LOVER_NAME);
    await this.say('queen', ENDING.queenLove, undefined, 'queen_blush');
    Audio.sfx('heart');
    this.hearts.explode(16, 207, 50);
    await this.say('lover', ENDING.loverLove, LOVER_NAME, 'lover_happy');
    await this.say('queen', ENDING.queenLove2, undefined, 'queen_blush');
    this.dlg.hide();

    // 5b. A little photo memory of the real couple
    const memL = this.polaroid(GAME_W / 2 - 66, 130, 'photo_card_queen', 'queen_blush', QUEEN_NAME, -8).setDepth(60).setScale(0).setAlpha(0);
    const memR = this.polaroid(GAME_W / 2 + 66, 134, 'photo_card_lover', 'lover_happy', LOVER_NAME, 7).setDepth(60).setScale(0).setAlpha(0);
    const memHeart = this.add.image(GAME_W / 2, 118, 'heart').setDepth(61).setScale(0);
    Audio.sfx('heart');
    this.tweens.add({ targets: [memL, memR], scale: 1, alpha: 1, duration: 500, ease: 'Back.easeOut' });
    this.tweens.add({ targets: memHeart, scale: 3.5, duration: 500, delay: 300, ease: 'Back.easeOut' });
    this.hearts.explode(24, 207, 50);
    await this.wait(3200);
    this.tweens.add({ targets: [memL, memR, memHeart], alpha: 0, y: '-=20', duration: 600, onComplete: () => { memL.destroy(); memR.destroy(); memHeart.destroy(); } });

    // 6. The hero, alone
    await this.wait(400);
    const spot = this.add.image(0, 0, 'spotlight').setScale(3.2).setDepth(40).setAlpha(0);
    const updateSpot = () => spot.setPosition(this.W.x + this.hero.x * S, this.hero.y * S - 6);
    this.events.on('update', updateSpot);
    this.tweens.add({ targets: spot, alpha: 1, duration: 1800 });
    this.tweens.add({ targets: this.overlay, fillAlpha: 0, duration: 1500 });
    Audio.playMusic(null);
    await this.pan(128, 2200);
    Audio.sfx('crickets');
    this.emote(this.hero, 'emote_dots', 2000);
    await this.wait(2200);
    for (const n of ENDING.narr) await this.say('narrator', n);
    this.dlg.hide();
    Audio.sfx('crickets');
    await this.wait(900);

    // 7. The final exchange
    await this.say('hero', ENDING.heroDate, undefined, 'hero_sweat');
    this.tweens.add({ targets: spot, alpha: 0.4, duration: 400 });
    await this.say('queen', ENDING.queenStill, undefined, 'queen_idle0');
    this.tweens.add({ targets: spot, alpha: 1, duration: 400 });
    await this.say('hero', ENDING.heroDots, undefined, 'hero_sad');
    this.dlg.hide();
    this.hero.setTexture('hero_sad');

    // 8. Emotional damage
    Audio.playMusic('sad');
    await this.wait(800);
    const bar = this.add.graphics();
    this.W.add(bar);
    let hp = Math.max(1, this.run.hp);
    const maxHp = this.run.maxHp;
    const drawBar = () => {
      bar.clear();
      bar.fillStyle(0x000000, 0.8).fillRect(116, 50, 24, 5);
      bar.fillStyle(0xe04848).fillRect(117, 51, 22 * (hp / maxHp), 3);
    };
    drawBar();
    const heroLabel = this.worldText(128, 45, `${ENDING.heroHp} ${hp}/${maxHp}`, '#ffffff');
    await this.wait(900);
    const labels = ENDING.damage;
    let li = 0;
    while (hp > 0) {
      hp--;
      drawBar();
      heroLabel.setText(`${ENDING.heroHp} ${hp}/${maxHp}`);
      Audio.sfx('drain');
      this.hero.setTintFill(0xffffff);
      this.time.delayedCall(70, () => this.hero.clearTint());
      this.tweens.add({ targets: this.hero, x: 128 + 1, duration: 40, yoyo: true, repeat: 2 });
      const msg = hp === 0 ? ENDING.damageFinal : labels[li++ % labels.length];
      const t = this.worldText(128 + Phaser.Math.Between(-8, 8), 40, `-1 ${msg}`, hp === 0 ? TEXT_COLORS.gold : TEXT_COLORS.red);
      this.tweens.add({ targets: t, y: 24, alpha: 0, duration: 1400, onComplete: () => t.destroy() });
      await this.wait(hp === 1 ? 1200 : 650);
    }
    heroLabel.destroy(); bar.destroy();

    // 9. Dramatic death
    Audio.playMusic(null);
    Audio.sfx('sadTrombone');
    this.hero.setTexture('hero_dead');
    this.tweens.add({ targets: this.hero, angle: -90, y: 70, duration: 900, ease: 'Bounce.easeOut' });
    this.tweens.add({ targets: this.hero, alpha: 0.85, duration: 600 });
    this.hero.setTint(0x8080a0);
    await this.wait(2900);
    const smoke = this.add.particles(0, 0, 'smoke', { x: 128, y: 68, speed: { min: 10, max: 30 }, lifespan: 600, scale: { start: 1, end: 0 }, alpha: { start: 0.8, end: 0 }, emitting: false });
    this.W.add(smoke);
    smoke.explode(14, 128, 68);
    Audio.sfx('explode');
    this.hero.setVisible(false);
    const stone = this.add.image(128, 66, 'tombstone').setScale(0);
    this.W.add(stone);
    this.tweens.add({ targets: stone, scale: 1, duration: 400, ease: 'Back.easeOut' });
    this.worldText(128, 84, ENDING.tomb, '#c0c0d0').setAlpha(0.9);
    await this.wait(1200);
    this.hearts.explode(20, 207, 50);
    Audio.sfx('heart');
    await this.wait(1800);

    // 10. GAME OVER
    this.events.off('update', updateSpot);
    this.cameras.main.fadeOut(1500, 0, 0, 0);
    await this.wait(1600);
    this.W.setVisible(false);
    spot.setVisible(false);
    this.overlay.setVisible(false);
    this.cameras.main.fadeIn(10);
    await this.gameOverScreen();
  }

  private async gameOverScreen() {
    const bg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000).setOrigin(0).setDepth(100);
    void bg;
    const word = 'GAME OVER';
    const startX = GAME_W / 2 - (word.length * 32) / 2 + 16;
    for (let i = 0; i < word.length; i++) {
      if (word[i] === ' ') continue;
      const l = text(this, startX + i * 32, -40, word[i], 32, TEXT_COLORS.red, { stroke: '#300010', strokeThickness: 8 }).setOrigin(0.5).setDepth(101);
      this.tweens.add({ targets: l, y: 96, duration: 500, ease: 'Bounce.easeOut', delay: i * 160 });
      this.time.delayedCall(i * 160 + 250, () => { Audio.sfx('door'); this.cameras.main.shake(80, 0.004); });
    }
    Audio.sfx('gameover');
    await this.wait(word.length * 160 + 900);
    const l1 = text(this, GAME_W / 2, 152, ENDING.congrats, 8, TEXT_COLORS.white).setOrigin(0.5).setDepth(101).setAlpha(0);
    this.tweens.add({ targets: l1, alpha: 1, duration: 800 });
    await this.wait(1600);
    const l2 = text(this, GAME_W / 2, 176, ENDING.failedLove, 8, TEXT_COLORS.pink).setOrigin(0.5).setDepth(101).setAlpha(0);
    this.tweens.add({ targets: l2, alpha: 1, duration: 800 });
    await this.wait(1400);

    // Achievement popup
    Progress.data.endingSeen = true;
    Progress.unlock('third_wheel');
    Progress.save();
    Audio.sfx('achievement');
    const g = this.add.graphics();
    drawPanel(g, 0, 0, 300, 74, 0x2a1a10, 0xf0c040, 0.97);
    const cup = this.add.image(28, 37, 'trophy').setScale(2.5);
    const a1 = text(this, 54, 6, ENDING.achUnlocked, 8, TEXT_COLORS.gold);
    const a2 = text(this, 54, 27, ENDING.achName, 8, TEXT_COLORS.white);
    const a3 = text(this, 54, 48, ENDING.achDesc, 8, TEXT_COLORS.gray);
    const pop = this.add.container(GAME_W / 2 - 150, -60, [g, cup, a1, a2, a3]).setDepth(110);
    this.tweens.add({ targets: pop, y: 222, duration: 700, ease: 'Back.easeOut' });
    const shine = this.add.particles(0, 0, 'spark', {
      x: { min: GAME_W / 2 - 150, max: GAME_W / 2 + 150 }, y: { min: 222, max: 296 }, lifespan: 600,
      scale: { start: 1, end: 0 }, frequency: 90, tint: 0xfff0a0, blendMode: 'ADD', duration: 2500,
    }).setDepth(111);
    void shine;
    await this.wait(2000);

    const cont = text(this, GAME_W / 2, GAME_H - 30, ENDING.pressKey, 8, TEXT_COLORS.gray).setOrigin(0.5).setDepth(101);
    this.tweens.add({ targets: cont, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    await new Promise<void>((res) => {
      this.input.once('pointerdown', () => res());
      this.input.keyboard?.once('keydown', () => res());
    });
    this.dlg.hide();
    this.cameras.main.fadeOut(800);
    await this.wait(850);
    this.children.list.filter((c) => c !== this.dlg as unknown).forEach((c) => (c as Phaser.GameObjects.GameObject & { setVisible?: (v: boolean) => void }).setVisible?.(false));
    this.cameras.main.fadeIn(800);
    this.credits();
  }

  /** A tilted polaroid with a real photo (falls back to the pixel sprite if the photo is missing). */
  private polaroid(x: number, y: number, photo: string, fallback: string, caption: string, angle: number) {
    const c = this.add.container(x, y).setAngle(angle);
    const shadow = this.add.rectangle(3, 4, 112, 146, 0x000000, 0.45);
    const frame = this.add.rectangle(0, 0, 112, 146, 0xfaf6ee).setStrokeStyle(1, 0xd8d0c0);
    c.add([shadow, frame]);
    if (this.textures.exists(photo)) c.add(this.add.image(0, -9, photo).setDisplaySize(100, 120));
    else c.add(this.add.image(0, -9, fallback).setScale(4));
    c.add(text(this, 0, 62, caption, 8, '#5a3a4a').setOrigin(0.5));
    return c;
  }

  private credits() {
    Audio.playMusic('romance');
    const colors: Record<string, string> = {
      gold: TEXT_COLORS.gold, purple: TEXT_COLORS.purple, blue: TEXT_COLORS.blue, pink: TEXT_COLORS.pink,
      lover: '#ffb070', gray: TEXT_COLORS.gray, white: TEXT_COLORS.white, '': TEXT_COLORS.white,
    };
    const items: Phaser.GameObjects.GameObject[] = [];
    let y = 0;
    for (const [s, c, big] of CREDITS) {
      items.push(text(this, GAME_W / 2, y, s, big ? 16 : 8, colors[c] ?? TEXT_COLORS.white).setOrigin(0.5, 0));
      // real photo next to the two stars of the show
      const photo = s === QUEEN_NAME ? 'photo_queen_love' : s === LOVER_NAME ? 'photo_lover_happy' : null;
      if (photo && this.textures.exists(photo)) {
        items.push(this.add.rectangle(GAME_W / 2 - 110, y + 18, 52, 52, 0xfaf6ee));
        items.push(this.add.image(GAME_W / 2 - 110, y + 18, photo).setDisplaySize(48, 48));
        y += 22;
      }
      y += big ? 40 : s ? 24 : 12;
    }
    const container = this.add.container(0, GAME_H + 10, items).setDepth(200);
    const totalH = y;
    this.tweens.add({
      targets: container, y: -totalH - 10, duration: totalH * 36, ease: 'Linear',
      onComplete: () => this.finalCard(),
    });
    const skip = new Button(this, GAME_W - 50, 18, 'ข้าม', () => { this.tweens.killTweensOf(container); container.destroy(); skip.destroy(); this.finalCard(); }, 80, 22).setDepth(300);
  }

  private finalCard() {
    if (this.children.getByName('final')) return;
    const c = this.add.container(0, 0).setName('final').setDepth(300);
    const pq = this.polaroid(GAME_W / 2 - 66, 112, 'photo_card_queen', 'queen_blush', QUEEN_NAME, -6);
    const pl = this.polaroid(GAME_W / 2 + 66, 116, 'photo_card_lover', 'lover_happy', LOVER_NAME, 5);
    const heart = this.add.image(GAME_W / 2, 100, 'heart').setScale(3.5);
    const stone = this.add.image(GAME_W / 2 - 200, 170, 'tombstone').setScale(3).setAlpha(0.7);
    const hearts = this.add.particles(0, 0, 'heart_px', {
      x: GAME_W / 2, y: 90, speed: { min: 20, max: 60 }, angle: { min: 220, max: 320 }, lifespan: 1800,
      scale: { start: 2, end: 0.5 }, alpha: { start: 1, end: 0 }, frequency: 220, tint: [0xff6aa8, 0xff3070],
    });
    const t = text(this, GAME_W / 2, 214, ENDING.thanks, 16, TEXT_COLORS.gold, { stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    const t2 = text(this, GAME_W / 2, 248, ENDING.thanks2, 8, TEXT_COLORS.gray).setOrigin(0.5);
    const b = new Button(this, GAME_W / 2, 300, 'เมนูหลัก', () => {
      this.cameras.main.fadeOut(600);
      this.time.delayedCall(620, () => this.scene.start('Menu'));
    }, 200);
    c.add([stone, pq, pl, heart, hearts, t, t2, b]);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 1000 });
    this.tweens.add({ targets: heart, scale: 4.2, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: [pq, pl], y: '-=3', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
