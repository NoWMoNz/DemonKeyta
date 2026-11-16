import type { TrackId } from '../audio/music';
import type { EnemyId } from './enemies';

export interface StageDef {
  index: number;
  name: string;
  subtitle: string;
  music: TrackId;
  bg: number;
  combatRooms: number;
  waves: [number, number]; // min/max waves per combat room
  budget: number; // budget per wave (grows per room)
  budgetGrowth: number;
  pool: Partial<Record<EnemyId, number>>; // weights
  eliteChance: number;
  boss: 'slimeking' | 'warden' | 'queen';
  ambient: 'fireflies' | 'fog' | 'embers';
  props: string[];
  tint: number; // ambient overlay tint
  tintAlpha: number;
}

export const STAGES: StageDef[] = [
  {
    index: 0, name: 'ป่าต้องมนตร์', subtitle: 'ด่าน 1', music: 'forest', bg: 0x0a1a0c,
    combatRooms: 4, waves: [2, 2], budget: 4, budgetGrowth: 0.8,
    pool: { slime: 5, bat: 3, shroom: 2, slime_blue: 1 },
    eliteChance: 0.04, boss: 'slimeking', ambient: 'fireflies',
    props: ['bush', 'mushrooms', 'rock', 'flowers'], tint: 0x103020, tintAlpha: 0.0,
  },
  {
    index: 1, name: 'สุสานต้องสาป', subtitle: 'ด่าน 2', music: 'cemetery', bg: 0x0a0a14,
    combatRooms: 5, waves: [2, 3], budget: 5, budgetGrowth: 0.8,
    pool: { skeleton: 4, archer: 3, wisp: 2, mage: 2, slime_blue: 1 },
    eliteChance: 0.1, boss: 'warden', ambient: 'fog',
    props: ['grave', 'skull', 'candle', 'deadtree', 'bones'], tint: 0x101030, tintAlpha: 0.18,
  },
  {
    index: 2, name: 'ปราสาทปีศาจ', subtitle: 'ด่าน 3', music: 'castle', bg: 0x12060e,
    combatRooms: 5, waves: [2, 3], budget: 6.5, budgetGrowth: 1,
    pool: { knight: 2, imp: 4, mage: 3, archer: 2, skeleton: 2 },
    eliteChance: 0.16, boss: 'queen', ambient: 'embers',
    props: ['candelabra', 'bones', 'skull', 'candle'], tint: 0x400818, tintAlpha: 0.22,
  },
];
