import type { RunState } from '../systems/ProgressionSystem';

export interface PerkDef {
  id: string;
  name: string;
  desc: string;
  color: number;
  apply: (r: RunState) => void;
}

export const PERKS: PerkDef[] = [
  { id: 'vitality', name: 'พลังชีวิต', desc: 'HP สูงสุด +2\nและฟื้นเลือดเต็ม', color: 0xe04848, apply: (r) => { r.maxHp += 2; r.hp = r.maxHp; } },
  { id: 'iron', name: 'ผิวเหล็ก', desc: 'เกราะสูงสุด +2', color: 0x8fa8c8, apply: (r) => { r.maxArmor += 2; r.armor = r.maxArmor; } },
  { id: 'power', name: 'วิญญาณคมกริบ', desc: 'ดาเมจ +25%', color: 0xff8040, apply: (r) => { r.damageMul += 0.25; } },
  { id: 'swift', name: 'ฝีเท้าไว', desc: 'ความเร็ว +12%\nคูลดาวน์แดช -30%', color: 0x40c0ff, apply: (r) => { r.speedMul += 0.12; r.dashCdMul *= 0.7; } },
  { id: 'luck', name: 'เครื่องรางนำโชค', desc: 'โอกาสคริ +15%\n(คริแรง x2)', color: 0xf0c040, apply: (r) => { r.crit += 0.15; } },
  { id: 'vamp', name: 'จุมพิตแวมไพร์', desc: 'ฆ่าศัตรูมีโอกาส 10%\nฟื้น 1 HP', color: 0xff60a0, apply: (r) => { r.lifesteal += 0.1; } },
  { id: 'hands', name: 'มือไว', desc: 'ความเร็วโจมตี +20%', color: 0x80e080, apply: (r) => { r.attackSpeed += 0.2; } },
];
