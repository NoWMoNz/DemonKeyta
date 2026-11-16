import { Settings } from '../systems/Settings';
import { TRACKS, Track, TrackId } from './music';

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteFreq(n: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
  if (!m) return 0;
  let semi = NOTE_INDEX[m[1]];
  if (m[2] === '#') semi++;
  if (m[2] === 'b') semi--;
  const midi = (parseInt(m[3], 10) + 1) * 12 + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

type Step = { freq: number; len: number } | null;
function parseVoice(src: string): Step[] {
  const toks = src.trim().split(/\s+/);
  const out: Step[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t === '.' || t === '-') { out.push(null); continue; }
    let len = 1;
    while (toks[i + len] === '-') len++;
    out.push({ freq: noteFreq(t), len });
  }
  return out;
}

export type SfxName =
  | 'sword' | 'bigsword' | 'pistol' | 'shotgun' | 'staff' | 'crossbow' | 'hit' | 'deflect' | 'enemyDie' | 'enemyShoot'
  | 'magic' | 'dash' | 'hurt' | 'armorBreak' | 'pickup' | 'heal' | 'buff' | 'chest' | 'door' | 'doorOpen' | 'clear'
  | 'click' | 'hover' | 'explode' | 'telegraph' | 'spawn' | 'roar' | 'laser' | 'portal' | 'text' | 'textQueen'
  | 'textLover' | 'heart' | 'sob' | 'creak' | 'step' | 'sadTrombone' | 'drain' | 'gameover' | 'achievement'
  | 'crickets' | 'whoosh' | 'gasp';

class Engine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private noiseBuf!: AudioBuffer;
  private current: TrackId | null = null;
  private parsed: { lead: Step[]; bass: Step[]; drums: string; t: Track } | null = null;
  private step = 0;
  private nextTime = 0;
  private lastPlayed: Record<string, number> = {};
  private duck = 1;

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applySettings();
      window.setInterval(() => this.schedule(), 25);
      if (this.current) this.nextTime = this.ctx.currentTime + 0.05;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applySettings() {
    if (!this.ctx) return;
    const s = Settings.data;
    this.musicGain.gain.setTargetAtTime(s.music ? s.musicVolume * this.duck : 0, this.ctx.currentTime, 0.08);
    this.sfxGain.gain.setTargetAtTime(s.sfx ? s.sfxVolume : 0, this.ctx.currentTime, 0.02);
  }

  /** Lower music volume (e.g. while paused). */
  setDuck(v: number) { this.duck = v; this.applySettings(); }

  // ---------------- MUSIC ----------------
  playMusic(id: TrackId | null) {
    if (id === this.current) return;
    this.current = id;
    if (!id) { this.parsed = null; return; }
    const t = TRACKS[id];
    this.parsed = { lead: parseVoice(t.lead), bass: parseVoice(t.bass), drums: t.drums ?? '', t };
    this.step = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.08;
  }

  get currentTrack() { return this.current; }

  private schedule() {
    if (!this.ctx || !this.parsed) return;
    if (this.nextTime < this.ctx.currentTime - 0.5) this.nextTime = this.ctx.currentTime + 0.05;
    const { t, lead, bass, drums } = this.parsed;
    const stepDur = 60 / t.bpm / 2;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      const s = this.step;
      const time = this.nextTime;
      const l = lead[s % lead.length];
      if (l && l.freq) this.musicNote(l.freq, time, l.len * stepDur * 0.92, t.leadWave, t.leadVol ?? 0.08, true);
      const b = bass[s % bass.length];
      if (b && b.freq) this.musicNote(b.freq, time, b.len * stepDur * 0.85, t.bassWave, t.bassVol ?? 0.1, false);
      if (drums.length) {
        const d = drums[s % drums.length];
        if (d === 'k') this.kick(time);
        else if (d === 's') this.snare(time);
        else if (d === 'h') this.hat(time);
      }
      this.step++;
      this.nextTime += stepDur;
    }
  }

  private musicNote(freq: number, time: number, dur: number, wave: OscillatorType, vol: number, vibrato: boolean) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.value = freq;
    if (vibrato && dur > 0.3) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 5.5;
      lg.gain.value = freq * 0.008;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(time + 0.12);
      lfo.stop(time + dur + 0.05);
    }
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.012);
    g.gain.setValueAtTime(vol, time + Math.max(0.02, dur - 0.06));
    g.gain.linearRampToValueAtTime(0, time + dur);
    o.connect(g).connect(this.musicGain);
    o.start(time);
    o.stop(time + dur + 0.02);
  }

  private kick(time: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(40, time + 0.12);
    g.gain.setValueAtTime(0.25, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    o.connect(g).connect(this.musicGain);
    o.start(time); o.stop(time + 0.16);
  }
  private snare(time: number) { this.noiseAt(this.musicGain, time, 0.12, 1800, 'highpass', 0.12); }
  private hat(time: number) { this.noiseAt(this.musicGain, time, 0.04, 7000, 'highpass', 0.05); }

  private noiseAt(dest: AudioNode, time: number, dur: number, freq: number, type: BiquadFilterType, vol: number, freqEnd?: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, time);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, time + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(time, Math.random() * 0.5);
    src.stop(time + dur + 0.02);
  }

  // ---------------- SFX ----------------
  private tone(f0: number, f1: number, dur: number, wave: OscillatorType, vol: number, delay = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }
  private noise(dur: number, freq: number, type: BiquadFilterType, vol: number, freqEnd?: number, delay = 0) {
    this.noiseAt(this.sfxGain, this.ctx!.currentTime + delay, dur, freq, type, vol, freqEnd);
  }
  private seq(freqs: number[], gap: number, dur: number, wave: OscillatorType, vol: number) {
    freqs.forEach((f, i) => this.tone(f, f, dur, wave, vol, i * gap));
  }

  /** Play a named sound effect; rate-limited per name to avoid stacking. */
  sfx(name: SfxName, minGapMs = 30) {
    if (!this.ctx || !Settings.data.sfx) return;
    const now = performance.now();
    if (now - (this.lastPlayed[name] ?? 0) < minGapMs) return;
    this.lastPlayed[name] = now;
    const r = 1 + (Math.random() - 0.5) * 0.1;
    switch (name) {
      case 'sword': this.noise(0.12, 3000 * r, 'bandpass', 0.35, 800); this.tone(500, 200, 0.08, 'triangle', 0.08); break;
      case 'bigsword': this.noise(0.2, 2400, 'bandpass', 0.45, 500); this.tone(880, 220, 0.2, 'sawtooth', 0.06); this.tone(1320, 660, 0.25, 'sine', 0.06, 0.03); break;
      case 'pistol': this.tone(900 * r, 300, 0.06, 'square', 0.07); this.noise(0.05, 4000, 'highpass', 0.1); break;
      case 'shotgun': this.noise(0.25, 1500, 'lowpass', 0.5, 200); this.tone(200, 60, 0.15, 'square', 0.12); break;
      case 'staff': this.tone(600 * r, 1200, 0.12, 'sine', 0.12); this.tone(900, 1800, 0.1, 'triangle', 0.05, 0.02); break;
      case 'crossbow': this.tone(300, 120, 0.06, 'square', 0.08); this.noise(0.08, 2500, 'bandpass', 0.2); break;
      case 'hit': this.noise(0.06, 2000 * r, 'bandpass', 0.3); this.tone(220, 110, 0.06, 'square', 0.06); break;
      case 'deflect': this.tone(1800, 2400, 0.06, 'square', 0.05); this.tone(2400, 1200, 0.08, 'triangle', 0.06, 0.03); break;
      case 'enemyDie': this.tone(400 * r, 60, 0.25, 'square', 0.08); this.noise(0.2, 1200, 'lowpass', 0.25, 200); break;
      case 'enemyShoot': this.tone(700 * r, 350, 0.1, 'triangle', 0.08); break;
      case 'magic': this.tone(300, 900, 0.25, 'sine', 0.1); this.tone(450, 1350, 0.25, 'triangle', 0.04, 0.05); break;
      case 'dash': this.noise(0.18, 600, 'bandpass', 0.3, 3000); break;
      case 'hurt': this.tone(300, 80, 0.25, 'sawtooth', 0.12); this.noise(0.12, 1000, 'lowpass', 0.3); break;
      case 'armorBreak': this.tone(1500, 400, 0.15, 'square', 0.06); this.noise(0.1, 5000, 'highpass', 0.15); break;
      case 'pickup': this.seq([660, 880, 1320], 0.06, 0.1, 'square', 0.06); break;
      case 'heal': this.seq([523, 659, 784], 0.08, 0.18, 'sine', 0.12); break;
      case 'buff': this.seq([440, 554, 659, 880], 0.05, 0.12, 'triangle', 0.1); break;
      case 'chest': this.tone(200, 400, 0.15, 'square', 0.08); [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, f, 0.15, 'square', 0.05, 0.15 + i * 0.1)); break;
      case 'door': this.tone(110, 70, 0.3, 'square', 0.1); this.noise(0.3, 400, 'lowpass', 0.3); break;
      case 'doorOpen': this.tone(140, 220, 0.25, 'square', 0.06); this.noise(0.25, 600, 'lowpass', 0.2); break;
      case 'clear': this.seq([523, 659, 784, 1047], 0.1, 0.2, 'square', 0.06); break;
      case 'click': this.tone(1200, 1200, 0.04, 'square', 0.05); break;
      case 'hover': this.tone(800, 800, 0.025, 'square', 0.025); break;
      case 'explode': this.noise(0.5, 1200, 'lowpass', 0.6, 80); this.tone(120, 30, 0.4, 'sine', 0.3); break;
      case 'telegraph': this.tone(440, 880, 0.3, 'triangle', 0.05); break;
      case 'spawn': this.tone(200, 600, 0.3, 'sine', 0.06); this.noise(0.3, 800, 'bandpass', 0.08, 3000); break;
      case 'roar': this.noise(0.9, 400, 'lowpass', 0.5, 100); this.tone(110, 55, 0.9, 'sawtooth', 0.15); this.tone(165, 70, 0.9, 'square', 0.06); break;
      case 'laser': this.tone(150, 1200, 0.5, 'sawtooth', 0.08); this.noise(0.5, 3000, 'bandpass', 0.15); break;
      case 'portal': this.tone(200, 800, 0.6, 'sine', 0.1); this.tone(300, 1200, 0.6, 'triangle', 0.05, 0.1); break;
      case 'text': this.tone(520 * r, 520 * r, 0.025, 'square', 0.025); break;
      case 'textQueen': this.tone(760 * r, 700 * r, 0.03, 'triangle', 0.05); break;
      case 'textLover': this.tone(380 * r, 380 * r, 0.03, 'triangle', 0.06); break;
      case 'heart': this.tone(660, 990, 0.15, 'sine', 0.1); this.tone(990, 1320, 0.2, 'sine', 0.08, 0.1); break;
      case 'sob': this.tone(500, 380, 0.35, 'sine', 0.06); this.tone(480, 360, 0.3, 'sine', 0.05, 0.4); break;
      case 'creak': this.tone(90, 140, 0.6, 'sawtooth', 0.05); this.noise(0.6, 300, 'bandpass', 0.1); break;
      case 'step': this.noise(0.04, 500, 'lowpass', 0.12); break;
      case 'sadTrombone':
        [[392, 0], [370, 0.45], [349, 0.9]].forEach(([f, d]) => this.tone(f, f * 0.98, 0.42, 'sawtooth', 0.07, d));
        this.tone(330, 300, 1.4, 'sawtooth', 0.07, 1.35);
        break;
      case 'drain': this.tone(300, 150, 0.15, 'triangle', 0.08); break;
      case 'gameover': this.seq([392, 330, 262, 196], 0.3, 0.4, 'square', 0.07); break;
      case 'achievement': this.seq([523, 659, 784, 1047, 1319], 0.08, 0.25, 'square', 0.06); break;
      case 'crickets': for (let i = 0; i < 6; i++) this.tone(4200, 4300, 0.04, 'sine', 0.03, i * 0.09 + (i > 2 ? 0.4 : 0)); break;
      case 'whoosh': this.noise(0.4, 300, 'bandpass', 0.3, 2000); break;
      case 'gasp': this.tone(600, 900, 0.12, 'triangle', 0.08); break;
    }
  }
}

export const Audio = new Engine();
