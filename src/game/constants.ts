/** Height is fixed; width adapts to the screen aspect ratio (16:9 up to ~21:9) to avoid letterboxing on phones. */
export const GAME_H = 360;
function computeWidth() {
  if (typeof window === 'undefined') return 640;
  const w = Math.max(window.innerWidth, window.innerHeight);
  const h = Math.min(window.innerWidth, window.innerHeight);
  const ratio = w / Math.max(1, h);
  return Math.round(Math.min(800, Math.max(640, GAME_H * ratio)) / 2) * 2;
}
export const GAME_W = computeWidth();
export const WORLD_ZOOM = 2;
export const TILE = 16;
export const FONT = '"Press Start 2P", monospace';
/** Thai-capable font, used automatically for any string containing Thai characters. */
export const FONT_TH = '"Kanit", "Press Start 2P", sans-serif';

/** Tile indices inside each stage tileset (16 columns x 2 rows). */
export const T = {
  VOID: 0,
  FLOOR: 1, // 1..4 plain variants
  FLOOR_DECO: 5, // 5..7 decorated variants
  CORRIDOR: 8,
  CARPET: 9,
  WALL: 10,
  WALL_FACE: 11,
  BLOCK: 12,
  BLOCK_FACE: 13,
  DOOR: 14,
  CARPET_EDGE: 15,
} as const;

export const SOLID_TILES = [T.WALL, T.WALL_FACE, T.BLOCK, T.BLOCK_FACE, T.DOOR];

export const DEPTH = {
  FLOOR: 0,
  DECOR: 2,
  SHADOW: 3,
  PICKUP: 5,
  TELEGRAPH: 6,
  ENTITY: 10,
  WEAPON: 11,
  PROJECTILE: 20,
  FX: 30,
  TEXT: 40,
  OVERLAY: 50,
} as const;

export const COLORS = {
  gold: 0xf0c040,
  red: 0xe04848,
  pink: 0xff7ab0,
  purple: 0x9a4ad6,
  white: 0xffffff,
  dark: 0x0d0a14,
  panel: 0x1d1530,
  panelLight: 0x3a2a5a,
  hp: 0xe04848,
  armor: 0x8fa8c8,
};

export const TEXT_COLORS = {
  gold: '#f0c040',
  white: '#f4eee0',
  gray: '#9a90a8',
  red: '#ff6060',
  pink: '#ff8ac0',
  purple: '#c890ff',
  blue: '#7ab8ff',
  green: '#7ee07a',
};
