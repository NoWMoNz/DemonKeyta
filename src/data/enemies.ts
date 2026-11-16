import { QUEEN_NAME } from './story';

export type Behavior =
  | 'hopper' | 'swooper' | 'turret' | 'chaser' | 'archer' | 'mage' | 'knight' | 'imp'
  | 'slimeking' | 'warden' | 'queen';

export type EnemyId =
  | 'slime' | 'slime_blue' | 'bat' | 'wisp' | 'shroom' | 'skeleton' | 'archer' | 'mage' | 'knight' | 'imp'
  | 'slimeking' | 'warden' | 'queen';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  textures: string[]; // animation frames
  hp: number;
  speed: number;
  contact: number; // contact damage
  shot: number; // projectile damage
  behavior: Behavior;
  scale: number;
  radius: number; // body radius in texture px
  cost: number; // spawn budget cost
  boss?: boolean;
  floats?: boolean;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  slime: { id: 'slime', name: 'Slime', textures: ['slime'], hp: 12, speed: 120, contact: 1, shot: 1, behavior: 'hopper', scale: 1, radius: 6, cost: 1 },
  slime_blue: { id: 'slime_blue', name: 'Frost Slime', textures: ['slime_blue'], hp: 16, speed: 140, contact: 1, shot: 1, behavior: 'hopper', scale: 1, radius: 6, cost: 1.5 },
  bat: { id: 'bat', name: 'Shade Bat', textures: ['bat0', 'bat1'], hp: 9, speed: 70, contact: 1, shot: 1, behavior: 'swooper', scale: 1, radius: 5, cost: 1.2, floats: true },
  wisp: { id: 'wisp', name: 'Grave Wisp', textures: ['wisp0', 'wisp1'], hp: 12, speed: 80, contact: 1, shot: 1, behavior: 'swooper', scale: 1, radius: 5, cost: 1.4, floats: true },
  shroom: { id: 'shroom', name: 'Spore Shroom', textures: ['shroom'], hp: 16, speed: 0, contact: 1, shot: 1, behavior: 'turret', scale: 1, radius: 6, cost: 1.5 },
  skeleton: { id: 'skeleton', name: 'Skeleton', textures: ['skeleton'], hp: 20, speed: 46, contact: 1, shot: 1, behavior: 'chaser', scale: 1, radius: 5, cost: 1.5 },
  archer: { id: 'archer', name: 'Bone Archer', textures: ['archer'], hp: 15, speed: 50, contact: 1, shot: 1, behavior: 'archer', scale: 1, radius: 5, cost: 1.8 },
  mage: { id: 'mage', name: 'Dark Mage', textures: ['mage'], hp: 22, speed: 30, contact: 1, shot: 1, behavior: 'mage', scale: 1, radius: 5, cost: 2.2 },
  knight: { id: 'knight', name: 'Demon Knight', textures: ['knight'], hp: 55, speed: 40, contact: 2, shot: 2, behavior: 'knight', scale: 1.15, radius: 6, cost: 3 },
  imp: { id: 'imp', name: 'Imp', textures: ['imp'], hp: 18, speed: 85, contact: 1, shot: 1, behavior: 'imp', scale: 1, radius: 5, cost: 2, floats: true },
  slimeking: { id: 'slimeking', name: 'ราชากูเบอร์โต้', textures: ['slime_king'], hp: 260, speed: 0, contact: 2, shot: 1, behavior: 'slimeking', scale: 3, radius: 6, cost: 0, boss: true },
  warden: { id: 'warden', name: 'ผู้คุมสุสาน', textures: ['warden'], hp: 400, speed: 55, contact: 2, shot: 1, behavior: 'warden', scale: 2.4, radius: 5, cost: 0, boss: true },
  queen: { id: 'queen', name: QUEEN_NAME, textures: ['queen_idle0', 'queen_idle1'], hp: 1250, speed: 70, contact: 1, shot: 1, behavior: 'queen', scale: 1.6, radius: 7, cost: 0, boss: true, floats: true },
};
