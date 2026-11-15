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

// u: -1..1 across the board, v: 0 (ceiling) .. 1 (lowest row), x: bubble units 0..8.5.
type ShapeInput = { u: number; v: number; x: number; row: number; col: number; rows: number };
const SHAPES: ((s: ShapeInput) => boolean)[] = [
  () => true, // classic block
  ({ u, v }) => Math.abs(u) <= 1 - v * 0.8, // funnel
  ({ u, v }) => Math.abs(u) + Math.abs(v - 0.45) * 1.7 <= 1.05, // diamond
  ({ v, x, row }) => row < 2 || v <= 0.5 + 0.3 * Math.sin(x * 0.9 + 0.6), // waves
  ({ u, v }) => Math.abs(u) <= 0.3 + Math.abs(v - 0.5) * 1.4, // hourglass
  ({ u, row }) => row < 2 || Math.abs(u) >= 0.45, // twin towers
  ({ u, v }) => Math.abs(u) <= 0.3 + v * 0.75, // mountain
  ({ u, v }) => { const X = u * 1.25, Y = (1 - v) * 2.2 - 1.1; return (X * X + Y * Y - 1) ** 3 - X * X * Y ** 3 <= 0; }, // heart
  ({ u, v }) => Math.abs(u) <= 0.26 || Math.abs(v - 0.55) <= 0.18, // plus
  ({ u, row, rows }) => row < 2 || Math.abs(u) >= 0.72 || row >= rows - 1, // frame
  ({ x, row }) => x >= row * 0.7 - 1, // slope
  ({ row, col }) => row < 1 || (row + col) % 3 !== 0, // islands
  ({ x, row }) => row < 2 || (x + row * 1.2) % 4 < 2.8, // zigzag
];

type ColorInput = { x: number; y: number; row: number; colors: number; rand: () => number; blob: number };
const COLOR_MODES: ((c: ColorInput) => number)[] = [
  c => c.blob, // soft blobs
  c => Math.floor(c.row / 1.5) % c.colors, // bands
  c => Math.floor(Math.hypot(c.x - 4.25, c.y - 1.5) / 1.3) % c.colors, // rings
  c => Math.floor((c.x + c.y * 1.3) / 1.6) % c.colors, // diagonals
  c => (c.rand() < 0.14 ? Math.floor(c.rand() * c.colors) : c.blob), // speckled blobs
];

export function levelSpec(level: number): LevelSpec {
  const rand = mulberry32(level * 7919 + 13);
  const rows = Math.min(6 + Math.floor((level - 1) / 8), 10);
  const colors = Math.min(3 + Math.floor((level - 1) / 5), COLORS.length);
  const cycle = Math.floor((level - 1) / SHAPES.length);
  const mirror = (cycle & 1) === 1;
  const present = SHAPES[(level - 1) % SHAPES.length];
  const colorMode = level <= 5 ? 0 : (level * 3 + cycle) % COLOR_MODES.length;
  const seeds = Array.from({ length: colors * 2 + 2 }, (_, i) => ({ x: rand() * COLS, y: rand() * rows * ROW_GAP, color: i % colors }));
  const build = (shape: (s: ShapeInput) => boolean) => {
    const out: Bubble[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = col + (row & 1) * 0.5, y = row * ROW_GAP;
        const sx = mirror ? COLS - 0.5 - x : x;
        if (!shape({ u: (sx - 4.25) / 4.25, v: row / (rows - 1), x: sx, row, col, rows })) continue;
        let blob = 0, nearest = Infinity;
        seeds.forEach(seed => { const d = (seed.x - x) ** 2 + (seed.y - y) ** 2; if (d < nearest) { nearest = d; blob = seed.color; } });
        out.push({ row, col, color: COLOR_MODES[colorMode]({ x, y, row, colors, rand, blob }) });
      }
    }
    const grid: Grid = new Map(out.map(b => [key(b.row, b.col), b]));
    const loose = new Set(floating(grid, 0).map(b => key(b.row, b.col)));
    return out.filter(b => !loose.has(key(b.row, b.col)));
  };
  let bubbles = build(present);
  if (bubbles.length < 20 || !bubbles.some(b => b.row === 0)) bubbles = build(SHAPES[0]);

  if (level >= 8) {
    const candidates = bubbles.filter(b => b.row >= 2 && b.row <= rows - 2);
    const stones = Math.min(1 + Math.floor((level - 8) / 6), 8);
    for (let i = 0; i < stones && candidates.length; i++) candidates.splice(Math.floor(rand() * candidates.length), 1)[0].color = STONE;
  }
  if (level >= 14 && level % 3 === 2) {
    // Armored bottoms: the lowest bubble of every third column is a stone.
    for (let col = 1; col < COLS; col += 3) {
      const lowest = bubbles.filter(b => b.col === col).sort((a, b) => b.row - a.row)[0];
      if (lowest && lowest.row > 1) lowest.color = STONE;
    }
  }
  return {
    bubbles, colors, rows,
    moves: Math.max(14, Math.ceil(bubbles.length / 2.4) + 8 - Math.floor(level / 12)),
    descendEvery: level < 4 ? 0 : Math.max(4, 7 - Math.floor(level / 15)),
    theme: Math.floor((level - 1) / 10) % WORLDS.length,
  };
}
