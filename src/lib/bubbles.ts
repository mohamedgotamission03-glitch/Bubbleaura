export const COLS = 9;
export const ROW_GAP = Math.sqrt(3) / 2;
export const DANGER_ROW = 13;
export const MAX_LEVEL = 60;
export const STONE = -1;
export const COLORS = ['#ffc83d', '#327fff', '#f0443f', '#26c9d4', '#9b58f4', '#56d88f'];

export const WORLDS = [
  { name: 'Meadow Morning', top: '#5a3fc0', bottom: '#21183f', hill: '#382573', glow: '#b8a4ff' },
  { name: 'Sunset Bay', top: '#c2457d', bottom: '#3a1a52', hill: '#6a2a73', glow: '#ffb199' },
  { name: 'Crystal Cave', top: '#1e7f9c', bottom: '#0f2547', hill: '#1c4474', glow: '#8ff1ff' },
  { name: 'Candy Sky', top: '#d36bc4', bottom: '#43307f', hill: '#7a4cb0', glow: '#ffd1f3' },
  { name: 'Midnight Garden', top: '#243a8f', bottom: '#0b0f2b', hill: '#17306a', glow: '#7fb0ff' },
  { name: 'Golden Hour', top: '#e08a2e', bottom: '#4a1f4a', hill: '#7a3354', glow: '#ffe08a' },
];

export type Bubble = { row: number; col: number; color: number };
export type Grid = Map<string, Bubble>;
export type LevelSpec = { bubbles: Bubble[]; colors: number; moves: number; descendEvery: number; theme: number; rows: number };

export const key = (row: number, col: number) => `${row}:${col}`;
export const stagger = (row: number, shift: number) => (row + shift) & 1;

export function neighbors(row: number, col: number, shift: number): [number, number][] {
  const shifted = stagger(row, shift) === 1;
  const lo = shifted ? col : col - 1;
  const hi = shifted ? col + 1 : col;
  const all: [number, number][] = [[row, col - 1], [row, col + 1], [row - 1, lo], [row - 1, hi], [row + 1, lo], [row + 1, hi]];
  return all.filter(([r, c]) => r >= 0 && c >= 0 && c < COLS);
}

export function cluster(grid: Grid, start: Bubble, shift: number): Bubble[] {
  const seen = new Set([key(start.row, start.col)]);
  const out = [start];
  const stack = [start];
  while (stack.length) {
    const bubble = stack.pop()!;
    for (const [r, c] of neighbors(bubble.row, bubble.col, shift)) {
      const k = key(r, c);
      if (seen.has(k)) continue;
      const found = grid.get(k);
      if (found && found.color === start.color) { seen.add(k); out.push(found); stack.push(found); }
    }
  }
  return out;
}

export function floating(grid: Grid, shift: number): Bubble[] {
  const seen = new Set<string>();
  const stack: Bubble[] = [];
  grid.forEach(b => { if (b.row === 0) { seen.add(key(b.row, b.col)); stack.push(b); } });
  while (stack.length) {
    const bubble = stack.pop()!;
    for (const [r, c] of neighbors(bubble.row, bubble.col, shift)) {
      const k = key(r, c);
      const found = grid.get(k);
      if (found && !seen.has(k)) { seen.add(k); stack.push(found); }
    }
  }
  return [...grid.values()].filter(b => !seen.has(key(b.row, b.col)));
}

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shapes: ((row: number, col: number, rows: number) => boolean)[] = [
  () => true,
  (row, col) => { const inset = Math.floor(row * 0.5); return col >= inset && col < COLS - inset; },
  (row, col, rows) => { const mid = (rows - 1) / 2; const inset = Math.floor((1 - Math.abs(row - mid) / mid) * 3); return col >= inset && col < COLS - inset; },
  (row, col) => row === 0 || (row + col) % 5 !== 0,
  (row, col) => row < 2 || col < 3 || col > 5,
  (row, col) => Math.abs(col - 4) <= row + 2,
];

export function levelSpec(level: number): LevelSpec {
  const rand = mulberry32(level * 7919 + 13);
  const rows = Math.min(5 + Math.floor((level - 1) / 6), 10);
  const colors = Math.min(3 + Math.floor((level - 1) / 5), COLORS.length);
  const present = shapes[(level - 1) % shapes.length];
  const seeds = Array.from({ length: colors * 2 + 2 }, (_, i) => ({ x: rand() * COLS, y: rand() * rows * ROW_GAP, color: i % colors }));
  const bubbles: Bubble[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!present(row, col, rows)) continue;
      const x = col + (row & 1) * 0.5, y = row * ROW_GAP;
      let color = 0, nearest = Infinity;
      seeds.forEach(seed => { const d = (seed.x - x) ** 2 + (seed.y - y) ** 2; if (d < nearest) { nearest = d; color = seed.color; } });
      bubbles.push({ row, col, color });
    }
  }
  if (level >= 8) {
    const candidates = bubbles.filter(b => b.row >= 2 && b.row <= rows - 2);
    const stones = Math.min(1 + Math.floor((level - 8) / 6), 8);
    for (let i = 0; i < stones && candidates.length; i++) candidates.splice(Math.floor(rand() * candidates.length), 1)[0].color = STONE;
  }
  return {
    bubbles, colors, rows,
    moves: Math.max(14, Math.ceil(bubbles.length / 2.4) + 8 - Math.floor(level / 12)),
    descendEvery: level < 4 ? 0 : Math.max(4, 7 - Math.floor(level / 15)),
    theme: Math.floor((level - 1) / 10) % WORLDS.length,
  };
}
