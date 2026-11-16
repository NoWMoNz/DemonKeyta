import type { WeaponId } from '../data/weapons';

export interface RunState {
  stage: number;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  weapons: (WeaponId | null)[];
  slot: number;
  damageMul: number;
  speedMul: number;
  dashCdMul: number;
  attackSpeed: number;
  crit: number;
  lifesteal: number;
  perks: string[];
  kills: number;
  timeMs: number;
  deaths: number;
}

export function newRun(): RunState {
  return {
    stage: 0,
    hp: 6,
    maxHp: 6,
    armor: 4,
    maxArmor: 4,
    weapons: ['sword', 'staff'],
    slot: 0,
    damageMul: 1,
    speedMul: 1,
    dashCdMul: 1,
    attackSpeed: 1,
    crit: 0.05,
    lifesteal: 0,
    perks: [],
    kills: 0,
    timeMs: 0,
    deaths: 0,
  };
}

interface SaveData {
  snapshot: RunState | null; // state at the start of the furthest stage reached
  bossSnapshot?: RunState | null; // state when entering the current stage's boss room
  endingSeen: boolean;
  achievements: string[];
  totalDeaths: number;
  clears: number;
}

const KEY = 'thwni_save_v1';

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { snapshot: null, endingSeen: false, achievements: [], totalDeaths: 0, clears: 0, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { snapshot: null, endingSeen: false, achievements: [], totalDeaths: 0, clears: 0 };
}

export const Progress = {
  data: load(),
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  },
  /** Save a checkpoint at the start of a stage (so "Continue"/"Retry" work). */
  checkpoint(run: RunState) {
    this.data.snapshot = JSON.parse(JSON.stringify(run));
    this.save();
  },
  clearCheckpoint() {
    this.data.snapshot = null;
    this.save();
  },
  /** Fresh copy of the checkpoint, restoring HP/armor to full for a fair retry. */
  restoreCheckpoint(): RunState | null {
    const s = this.data.snapshot;
    if (!s) return null;
    const r: RunState = { ...newRun(), ...JSON.parse(JSON.stringify(s)) };
    r.hp = r.maxHp;
    r.armor = r.maxArmor;
    return r;
  },
  bossCheckpoint(run: RunState | null) {
    this.data.bossSnapshot = run ? JSON.parse(JSON.stringify(run)) : null;
    this.save();
  },
  restoreBossCheckpoint(): RunState | null {
    const s = this.data.bossSnapshot;
    if (!s) return null;
    const r: RunState = { ...newRun(), ...JSON.parse(JSON.stringify(s)) };
    r.hp = r.maxHp;
    r.armor = r.maxArmor;
    return r;
  },
  unlock(id: string) {
    if (!this.data.achievements.includes(id)) {
      this.data.achievements.push(id);
      this.save();
      return true;
    }
    return false;
  },
};
