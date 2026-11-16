/**
 * Original chiptune tracks. Each voice is a list of 8th-note steps:
 *  - note name (e.g. "C5", "F#4", "Bb3") starts a note
 *  - "-" sustains the previous note
 *  - "." is a rest
 * Drums use k = kick, s = snare, h = hat.
 */
export interface Track {
  bpm: number;
  lead: string;
  bass: string;
  drums?: string;
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  leadVol?: number;
  bassVol?: number;
}

export type TrackId = 'menu' | 'forest' | 'cemetery' | 'castle' | 'boss' | 'romance' | 'sad' | 'tense';

export const TRACKS: Record<TrackId, Track> = {
  menu: {
    bpm: 116, leadWave: 'square', bassWave: 'triangle', leadVol: 0.07,
    lead: 'E5 - G5 - C6 - B5 A5 G5 - E5 - C5 D5 E5 - F5 - A5 - C6 - A5 F5 G5 - - - . . D5 . ' +
          'E5 - G5 - C6 - D6 C6 B5 - G5 - A5 B5 C6 - A5 - F5 - D5 - E5 F5 G5 - - - C5 - - - ',
    bass: 'C3 . C3 . G2 . G2 . A2 . A2 . E2 . E2 . F2 . F2 . C3 . C3 . G2 . G2 . G2 . B2 . ' +
          'C3 . C3 . G2 . G2 . E2 . E2 . A2 . A2 . F2 . F2 . G2 . G2 . C3 . G2 . C3 . . . ',
    drums: 'k.h.s.h.k.h.s.hhk.h.s.h.k.h.s.hhk.h.s.h.k.h.s.hhk.h.s.h.k.k.s.hh',
  },
  forest: {
    bpm: 108, leadWave: 'triangle', bassWave: 'triangle', leadVol: 0.12,
    lead: 'A4 - C5 - E5 - D5 C5 D5 - E5 - G5 - E5 - A5 - G5 E5 D5 - C5 D5 E5 - - - . . . . ' +
          'C5 - E5 - A5 - G5 E5 F5 - E5 - D5 - C5 - D5 - E5 - C5 - B4 - A4 - - - . . . . ',
    bass: 'A2 . E3 . A2 . E3 . G2 . D3 . G2 . D3 . F2 . C3 . F2 . C3 . E2 . B2 . E2 . G#2 . ' +
          'A2 . E3 . A2 . E3 . F2 . C3 . F2 . C3 . D2 . A2 . D2 . A2 . E2 . B2 . E2 . E2 . ',
    drums: 'k...h...k.k.h...k...h...k.k.h.h.k...h...k.k.h...k...h...k.k.hhh.',
  },
  cemetery: {
    bpm: 96, leadWave: 'square', bassWave: 'triangle', leadVol: 0.055,
    lead: 'D5 - - F5 E5 - D5 - C#5 - - E5 D5 - A4 - Bb4 - - D5 C5 - Bb4 A4 A4 - - - . . . . ' +
          'F5 - - A5 G5 - F5 - E5 - - G5 F5 - E5 - D5 - - F5 E5 - C#5 - D5 - - - . . . . ',
    bass: 'D2 . D2 . A2 . D2 . A1 . A1 . E2 . A1 . Bb1 . Bb1 . F2 . Bb1 . A1 . A1 . C#2 . E2 . ' +
          'D2 . D2 . A2 . D2 . C2 . C2 . G2 . C2 . Bb1 . Bb1 . F2 . Bb1 . A1 . A1 . A1 . . . ',
    drums: 'k.....h.s.....h.k.....h.s.....h.k.....h.s.....h.k.....h.s...s.h.',
  },
  castle: {
    bpm: 128, leadWave: 'sawtooth', bassWave: 'square', leadVol: 0.045, bassVol: 0.06,
    lead: 'E5 . E5 F5 E5 . D5 . C5 . C5 D5 B4 - - . E5 . E5 G5 F5 E5 D5 C5 B4 - - - G#4 - - . ',
    bass: 'E2 E2 E3 E2 E2 E2 E3 E2 A1 A1 A2 A1 A1 A1 A2 A1 C2 C2 C3 C2 C2 C2 C3 C2 B1 B1 B2 B1 B1 B1 B2 B1 ',
    drums: 'k.h.s.h.k.k.s.h.k.h.s.h.k.k.s.hs',
  },
  boss: {
    bpm: 150, leadWave: 'square', bassWave: 'sawtooth', leadVol: 0.06, bassVol: 0.05,
    lead: 'A5 . A5 G5 A5 . E5 . F5 . F5 E5 F5 . C5 . D5 . D5 C5 D5 . E5 F5 E5 . G#5 . B5 . E6 . ' +
          'A5 . C6 B5 A5 . E5 . F5 . A5 G5 F5 . C5 . D5 . F5 E5 D5 . B4 . C5 - D5 - E5 - - - ',
    bass: 'A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 F2 F3 F2 F3 F2 F3 D2 D3 D2 D3 D2 D3 D2 D3 E2 E3 E2 E3 E2 E3 G#2 B2 ' +
          'A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 F2 F3 F2 F3 F2 F3 D2 D3 D2 D3 D2 D3 D2 D3 E2 E3 E2 E3 E2 E3 E2 E3 ',
    drums: 'k.hsk.hsk.hsk.hsk.hsk.hsk.hskkss',
  },
  romance: {
    bpm: 80, leadWave: 'sine', bassWave: 'triangle', leadVol: 0.16, bassVol: 0.09,
    lead: 'A5 - G5 F5 C5 - F5 - E5 - D5 E5 F5 - - - D5 - E5 F5 G5 - A5 - G5 - F5 E5 F5 - - - ' +
          'C6 - Bb5 A5 G5 - A5 - F5 - E5 D5 C5 - - - D5 - E5 F5 G5 - E5 - F5 - - - - - . . ',
    bass: 'F2 C3 A3 C3 F2 C3 A3 C3 C2 G2 E3 G2 C2 G2 E3 G2 Bb1 F2 D3 F2 Bb1 F2 D3 F2 C2 G2 C3 E3 C2 G2 C3 E3 ' +
          'F2 C3 A3 C3 F2 C3 A3 C3 D2 A2 F3 A2 D2 A2 F3 A2 Bb1 F2 D3 F2 C2 G2 E3 G2 F2 C3 F3 C3 F2 . . . ',
    drums: '....h.......h.......h.......h...',
  },
  sad: {
    bpm: 66, leadWave: 'triangle', bassWave: 'sine', leadVol: 0.14, bassVol: 0.12,
    lead: 'E5 - - - D5 - C5 - B4 - - - A4 - - - C5 - - - B4 - A4 - G#4 - - - - - - - ',
    bass: 'A2 - - - - - - - E2 - - - - - - - F2 - - - - - - - E2 - - - - - - - ',
  },
  tense: {
    bpm: 90, leadWave: 'triangle', bassWave: 'sine', leadVol: 0.07, bassVol: 0.12,
    lead: 'E4 . . . . . F4 . E4 . . . . . . . E4 . . . . . F4 . G4 . F4 . E4 . . . ',
    bass: 'E1 - - - - - - - E1 - - - - - - - E1 - - - - - - - F1 - - - E1 - - - ',
  },
};
