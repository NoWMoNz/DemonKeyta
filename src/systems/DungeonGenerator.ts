import { T } from '../game/constants';
import { RNG } from '../utils/rng';
import {
  BOSS_TEMPLATE, COMBAT_TEMPLATES, RoomTemplate, START_TEMPLATE, THRONE_TEMPLATE, TREASURE_TEMPLATE,
} from '../data/roomTemplates';
import type { StageDef } from '../data/stages';

export type RoomType = 'start' | 'combat' | 'treasure' | 'boss';

export interface Room {
  id: number;
  type: RoomType;
  gx: number;
  gy: number;
  x0: number; y0: number; x1: number; y1: number; // inner floor rect (tiles, inclusive)
  cx: number; cy: number; // center tile
  doors: { x: number; y: number }[];
  links: number[];
  template: RoomTemplate;
  cleared: boolean;
  visited: boolean;
  discovered: boolean;
}

export interface Dungeon {
  w: number;
  h: number;
  tiles: number[][];
  rooms: Room[];
  start: Room;
  boss: Room;
}

const CELL = 32;
const MARGIN = 2;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const walkable = (t: number) => (t >= T.FLOOR && t <= T.CARPET) || t === T.CARPET_EDGE;

export function generateDungeon(stage: StageDef, rng: RNG): Dungeon {
  for (let attempt = 0; attempt < 200; attempt++) {
    const d = tryGenerate(stage, rng);
    if (d) return d;
  }
  throw new Error('Dungeon generation failed');
}

function tryGenerate(stage: StageDef, rng: RNG): Dungeon | null {
  const mainCount = stage.combatRooms + 2;
  const cells: { gx: number; gy: number }[] = [{ gx: 0, gy: 0 }];
  const occ = new Set<string>(['0,0']);
  let lastDir = -1;
  for (let i = 1; i < mainCount; i++) {
    const prev = cells[i - 1];
    const options = DIRS.map((d, idx) => ({ d, idx }))
      .filter(({ d }) => !occ.has(`${prev.gx + d[0]},${prev.gy + d[1]}`))
      // avoid touching earlier rooms (keeps a clean tree layout)
      .filter(({ d }) => {
        const nx = prev.gx + d[0], ny = prev.gy + d[1];
        return DIRS.every(([ax, ay]) => {
          const k = `${nx + ax},${ny + ay}`;
          return k === `${prev.gx},${prev.gy}` || !occ.has(k);
        });
      });
    if (!options.length) return null;
    // prefer continuing straight a bit for nicer shapes
    let choice = rng.pick(options);
    const straight = options.find((o) => o.idx === lastDir);
    if (straight && rng.chance(0.4)) choice = straight;
    lastDir = choice.idx;
    const c = { gx: prev.gx + choice.d[0], gy: prev.gy + choice.d[1] };
    cells.push(c);
    occ.add(`${c.gx},${c.gy}`);
  }
  // treasure room branch
  const candidates = rng.shuffle(cells.slice(1, mainCount - 1).map((_, i) => i + 1));
  let treasure: { gx: number; gy: number; parent: number } | null = null;
  for (const pi of candidates) {
    const p = cells[pi];
    for (const d of rng.shuffle([...DIRS])) {
      const nx = p.gx + d[0], ny = p.gy + d[1];
      if (occ.has(`${nx},${ny}`)) continue;
      const touching = DIRS.some(([ax, ay]) => {
        const k = `${nx + ax},${ny + ay}`;
        return k !== `${p.gx},${p.gy}` && occ.has(k);
      });
      if (touching) continue;
      treasure = { gx: nx, gy: ny, parent: pi };
      break;
    }
    if (treasure) break;
  }
  if (!treasure) return null;

  const all = [...cells, { gx: treasure.gx, gy: treasure.gy }];
  const minX = Math.min(...all.map((c) => c.gx));
  const minY = Math.min(...all.map((c) => c.gy));
  const maxX = Math.max(...all.map((c) => c.gx));
  const maxY = Math.max(...all.map((c) => c.gy));
  const w = (maxX - minX + 1) * CELL + MARGIN * 2;
  const h = (maxY - minY + 1) * CELL + MARGIN * 2;
  const tiles: number[][] = Array.from({ length: h }, () => new Array(w).fill(T.VOID));

  const rooms: Room[] = [];
  const combatTemplates = rng.shuffle([...COMBAT_TEMPLATES]);
  const makeRoom = (gx: number, gy: number, type: RoomType, template: RoomTemplate): Room => {
    const tw = template.rows[0].length, th = template.rows.length;
    const cx = (gx - minX) * CELL + MARGIN + Math.floor(CELL / 2);
    const cy = (gy - minY) * CELL + MARGIN + Math.floor(CELL / 2);
    const x0 = cx - Math.floor(tw / 2), y0 = cy - Math.floor(th / 2);
    const room: Room = {
      id: rooms.length, type, gx: gx - minX, gy: gy - minY, x0, y0, x1: x0 + tw - 1, y1: y0 + th - 1, cx, cy,
      doors: [], links: [], template, cleared: type !== 'combat' && type !== 'boss', visited: false, discovered: false,
    };
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const ch = template.rows[y][x];
        let t: number;
        if (ch === '#') t = T.BLOCK;
        else if (ch === 'c') t = x === 0 || template.rows[y][x - 1] !== 'c' || template.rows[y][x + 1] !== 'c' ? T.CARPET_EDGE : T.CARPET;
        else t = rng.chance(0.07) ? T.FLOOR_DECO + rng.int(0, 2) : T.FLOOR + rng.int(0, 3);
        tiles[y0 + y][x0 + x] = t;
      }
    }
    rooms.push(room);
    return room;
  };

  cells.forEach((c, i) => {
    let type: RoomType = 'combat';
    let tpl: RoomTemplate;
    if (i === 0) { type = 'start'; tpl = START_TEMPLATE; }
    else if (i === mainCount - 1) { type = 'boss'; tpl = stage.boss === 'queen' ? THRONE_TEMPLATE : BOSS_TEMPLATE; }
    else tpl = combatTemplates[(i - 1) % combatTemplates.length];
    makeRoom(c.gx, c.gy, type, tpl);
  });
  const tRoom = makeRoom(treasure.gx, treasure.gy, 'treasure', TREASURE_TEMPLATE);

  const connect = (a: Room, b: Room) => {
    a.links.push(b.id); b.links.push(a.id);
    if (a.gy === b.gy) {
      const [L, Rr] = a.gx < b.gx ? [a, b] : [b, a];
      const y = L.cy;
      for (let x = L.x1 + 1; x <= Rr.x0 - 1; x++) for (let dy = -1; dy <= 1; dy++) tiles[y + dy][x] = T.CORRIDOR;
      for (let dy = -1; dy <= 1; dy++) { L.doors.push({ x: L.x1 + 1, y: y + dy }); Rr.doors.push({ x: Rr.x0 - 1, y: y + dy }); }
      clearNear(tiles, L, L.x1, y); clearNear(tiles, Rr, Rr.x0, y);
    } else {
      const [U, D] = a.gy < b.gy ? [a, b] : [b, a];
      const x = U.cx;
      for (let y = U.y1 + 1; y <= D.y0 - 1; y++) for (let dx = -1; dx <= 1; dx++) tiles[y][x + dx] = T.CORRIDOR;
      for (let dx = -1; dx <= 1; dx++) { U.doors.push({ x: x + dx, y: U.y1 + 1 }); D.doors.push({ x: x + dx, y: D.y0 - 1 }); }
      clearNear(tiles, U, x, U.y1); clearNear(tiles, D, x, D.y0);
    }
  };
  for (let i = 1; i < mainCount; i++) connect(rooms[i - 1], rooms[i]);
  connect(rooms[treasure.parent], tRoom);

  // walls around everything walkable
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tiles[y][x] !== T.VOID) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
        const t = tiles[y + dy]?.[x + dx];
        if (t !== undefined && (walkable(t) || t === T.BLOCK)) { near = true; break; }
      }
      if (near) tiles[y][x] = T.WALL;
    }
  }
  // faces: wall/block tiles with walkable tile below show their front face
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w; x++) {
      const below = tiles[y + 1][x];
      if (tiles[y][x] === T.WALL && walkable(below)) tiles[y][x] = T.WALL_FACE;
      else if (tiles[y][x] === T.BLOCK && below !== T.BLOCK) tiles[y][x] = T.BLOCK_FACE;
    }
  }

  return { w, h, tiles, rooms, start: rooms[0], boss: rooms[mainCount - 1] };
}

/** Make sure entrances are not blocked by template obstacles. */
function clearNear(tiles: number[][], room: Room, ex: number, ey: number) {
  for (let y = room.y0; y <= room.y1; y++) {
    for (let x = room.x0; x <= room.x1; x++) {
      if (Math.abs(x - ex) <= 2 && Math.abs(y - ey) <= 2 && tiles[y][x] === T.BLOCK) tiles[y][x] = T.FLOOR;
    }
  }
}
