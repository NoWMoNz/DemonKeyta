import type { SfxName } from '../audio/AudioEngine';

export type WeaponId = 'sword' | 'staff' | 'pistols' | 'shotgun' | 'crossbow' | 'legend';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  desc: string;
  rarity: Rarity;
  kind: 'melee' | 'ranged';
  texture: string;
  /** grip position as fraction of texture width */
  originX: number;
  holdDist: number;
  damage: number;
  cooldown: number; // ms
  knockback: number;
  sfx: SfxName;
  shake: number;
  // melee
  reach?: number;
  arc?: number; // degrees
  wave?: boolean; // legendary sword fires a crescent wave
  // ranged
  projectile?: string;
  speed?: number;
  spread?: number; // degrees
  pellets?: number;
  life?: number; // ms
  pierce?: number;
  homing?: number;
  muzzle?: number; // distance from player center to muzzle
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#e8e8e8',
  rare: '#60b0ff',
  epic: '#c080ff',
  legendary: '#ffc040',
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  sword: {
    id: 'sword', name: 'ดาบคู่ใจ', desc: 'ฟันระยะใกล้ ปัดกระสุนทิ้งได้!', rarity: 'common', kind: 'melee',
    texture: 'w_sword', originX: 0.15, holdDist: 6, damage: 6, cooldown: 340, knockback: 170, sfx: 'sword', shake: 0,
    reach: 30, arc: 120,
  },
  staff: {
    id: 'staff', name: 'คทาเด็กฝึก', desc: 'ยิงลูกเวทติดตามเป้าหมาย', rarity: 'common', kind: 'ranged',
    texture: 'w_staff', originX: 0.2, holdDist: 5, damage: 4, cooldown: 300, knockback: 60, sfx: 'staff', shake: 0,
    projectile: 'b_orb', speed: 230, spread: 3, pellets: 1, life: 1100, pierce: 0, homing: 3.2, muzzle: 16,
  },
  pistols: {
    id: 'pistols', name: 'ปืนพกคู่', desc: 'ยิงรัวสุด ๆ', rarity: 'rare', kind: 'ranged',
    texture: 'w_pistol', originX: 0.15, holdDist: 7, damage: 2.4, cooldown: 115, knockback: 30, sfx: 'pistol', shake: 0,
    projectile: 'b_bullet', speed: 380, spread: 7, pellets: 1, life: 800, pierce: 0, muzzle: 14,
  },
  shotgun: {
    id: 'shotgun', name: 'ลูกซองบึ้ม', desc: 'แรงมากในระยะประชิด', rarity: 'rare', kind: 'ranged',
    texture: 'w_shotgun', originX: 0.2, holdDist: 6, damage: 2.6, cooldown: 640, knockback: 140, sfx: 'shotgun', shake: 0.004,
    projectile: 'b_pellet', speed: 320, spread: 34, pellets: 7, life: 330, pierce: 0, muzzle: 16,
  },
  crossbow: {
    id: 'crossbow', name: 'หน้าไม้พราน', desc: 'ลูกดอกทะลุศัตรูหลายตัว', rarity: 'epic', kind: 'ranged',
    texture: 'w_crossbow', originX: 0.3, holdDist: 6, damage: 9, cooldown: 520, knockback: 120, sfx: 'crossbow', shake: 0.002,
    projectile: 'b_bolt', speed: 480, spread: 0, pellets: 1, life: 900, pierce: 4, muzzle: 14,
  },
  legend: {
    id: 'legend', name: 'ดาบดาวตก', desc: 'ระดับตำนาน! ฟันแล้วปล่อยคลื่นดาบ', rarity: 'legendary', kind: 'melee',
    texture: 'w_legend', originX: 0.15, holdDist: 6, damage: 11, cooldown: 300, knockback: 220, sfx: 'bigsword', shake: 0.003,
    reach: 36, arc: 150, wave: true,
  },
};

/** Weapons that can appear in chests, by stage. */
export const CHEST_POOL: WeaponId[][] = [
  ['pistols', 'shotgun'],
  ['pistols', 'shotgun', 'crossbow'],
  ['crossbow', 'shotgun', 'pistols'],
];
