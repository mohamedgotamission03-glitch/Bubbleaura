import { Bubble, COLORS, COLS, DANGER_ROW, Grid, ROW_GAP, STONE, WORLDS, cluster, floating, key, levelSpec, neighbors, stagger } from './bubbles';
import { playBomb, playBubblePop, playDescend, playDrop, playGameOver, playLevelStart, playPowerUp, playShoot, playStick, playWin } from './audio';

export type Hud = { score: number; moves: number; moveLimit: number; progress: number; stars: number; streak: number; charge: number };
export type EndInfo = { won: boolean; score: number; stars: number; movesLeft: number; bonus: number; reason: 'cleared' | 'moves' | 'danger' };
type Callbacks = { onHud: (hud: Hud) => void; onEnd: (end: EndInfo) => void };
type Options = { sound: boolean; haptics: boolean };
type Piece = { kind: 'color' | 'bomb' | 'rainbow'; color: number };
type Metrics = { w: number; h: number; dpr: number; cell: number; radius: number; left: number; top: number; minX: number; maxX: number; cx: number; launcherY: number };
type Pop = { x: number; y: number; color: number; delay: number; age: number; burst: boolean };
type Fall = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; color: number };
type Particle = { x: number; y: number; vx: number; vy: number; r: number; color: string; age: number; life: number };
type Floater = { x: number; y: number; text: string; color: string; size: number; age: number; life: number };

const SPEED = 1150;
const EXTRA_MOVES = 5;
const colorOf = (color: number) => (color === STONE ? '#cfd3dc' : COLORS[color]);

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paintBubble(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: number) {
  if (color === STONE) {
    const gradient = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r);
    gradient.addColorStop(0, '#f1f3f8');
    gradient.addColorStop(0.45, '#9aa1b5');
    gradient.addColorStop(1, '#4b5166');
    g.beginPath(); g.arc(x, y, r * 0.96, 0, Math.PI * 2); g.fillStyle = gradient; g.fill();
    g.strokeStyle = '#3b4157aa'; g.lineWidth = Math.max(1, r * 0.08); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - r * 0.45, y - r * 0.1); g.lineTo(x - r * 0.1, y + r * 0.1); g.lineTo(x + r * 0.05, y - r * 0.25); g.lineTo(x + r * 0.5, y + r * 0.05); g.stroke();
    g.beginPath(); g.moveTo(x - r * 0.1, y + r * 0.1); g.lineTo(x - r * 0.2, y + r * 0.5); g.stroke();
    return;
  }
  const base = COLORS[color];
  const gradient = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.2, base);
  gradient.addColorStop(0.72, base);
  gradient.addColorStop(1, '#1b2347');
  g.beginPath(); g.arc(x, y, r * 0.96, 0, Math.PI * 2); g.fillStyle = gradient; g.fill();
  g.lineWidth = 1.2; g.strokeStyle = '#ffffff55'; g.stroke();
  g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.34, r * 0.22, r * 0.13, -0.5, 0, Math.PI * 2); g.fillStyle = '#ffffffd0'; g.fill();
  for (const side of [-1, 1]) {
    g.beginPath(); g.ellipse(x + side * r * 0.27, y + r * 0.1, r * 0.12, r * 0.16, 0, 0, Math.PI * 2); g.fillStyle = '#1b2347'; g.fill();
    g.beginPath(); g.arc(x + side * r * 0.27 - r * 0.03, y + r * 0.04, r * 0.05, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
    g.beginPath(); g.arc(x + side * r * 0.5, y + r * 0.34, r * 0.1, 0, Math.PI * 2); g.fillStyle = '#ff7a9a55'; g.fill();
  }
  g.beginPath(); g.arc(x, y + r * 0.32, r * 0.14, 0.15 * Math.PI, 0.85 * Math.PI); g.strokeStyle = '#1b2347'; g.lineWidth = Math.max(1, r * 0.07); g.lineCap = 'round'; g.stroke();
}

export class BubbleEngine {
  private ctx: CanvasRenderingContext2D;
  private spec: ReturnType<typeof levelSpec>;
  private m!: Metrics;
  private grid: Grid = new Map();
  private shift = 0;
  private current!: Piece;
  private next!: Piece;
  private shot: { x: number; y: number; vx: number; vy: number; piece: Piece } | null = null;
  private aimPoint: { x: number; y: number } | null = null;
  private pops: Pop[] = [];
  private falls: Fall[] = [];
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private jiggle = new Map<string, number>();
  private sprites = new Map<string, HTMLCanvasElement>();
  private score = 0;
  private moves: number;
  private misses = 0;
  private streak = 0;
  private charge = 0;
  private removedTotal = 0;
  private queued: 'bomb' | 'rainbow' | null = null;
  private paused = false;
  private result: EndInfo | null = null;
  private reported = false;
  private endAt = 0;
  private slide = 0;
  private shake = 0;
  private barrel = 0;
  private age = 0;
  private raf = 0;
  private last = 0;

  constructor(private canvas: HTMLCanvasElement, private level: number, private opts: Options, private cb: Callbacks) {
    this.ctx = canvas.getContext('2d')!;
    this.spec = levelSpec(level);
    this.moves = this.spec.moves;
    this.spec.bubbles.forEach(b => this.grid.set(key(b.row, b.col), { ...b }));
    this.current = this.makePiece();
    this.next = this.makePiece();
  }

  start() {
    playLevelStart(this.opts.sound);
    this.emit();
    this.raf = requestAnimationFrame(t => this.frame(t));
  }
  destroy() { cancelAnimationFrame(this.raf); }
  setOptions(opts: Options) { this.opts = opts; }
  setPaused(paused: boolean) { this.paused = paused; if (paused) this.aimPoint = null; }

  pointerDown(x: number, y: number) { if (!this.locked()) this.aimPoint = { x, y }; }
  pointerMove(x: number, y: number) { if (this.aimPoint && !this.locked()) this.aimPoint = { x, y }; }
  cancelAim() { this.aimPoint = null; }
  pointerUp(x: number, y: number) {
    if (!this.aimPoint || this.locked() || !this.m) { this.aimPoint = null; return; }
    this.aimPoint = null;
    if (y > this.m.launcherY + this.m.cell * 1.6) return;
    const dir = this.direction(x, y);
    this.shoot(dir.x, dir.y);
  }

  useBomb() {
    if (this.locked() || this.current.kind === 'bomb') return false;
    if (this.next.kind === 'bomb') [this.current, this.next] = [this.next, this.current];
    else this.current = { kind: 'bomb', color: 0 };
    playPowerUp(this.opts.sound);
    return true;
  }

  swap() {
    if (this.locked()) return;
    [this.current, this.next] = [this.next, this.current];
    playStick(this.opts.sound);
  }

  revive() {
    if (!this.result || this.result.won) return;
    const reason = this.result.reason;
    this.result = null; this.reported = false;
    this.moves += EXTRA_MOVES; this.streak = 0;
    if (reason === 'danger' || this.lowestRow() >= DANGER_ROW - 2) {
      const lowest = this.lowestRow();
      [...this.grid.values()].filter(b => b.row >= lowest - 2).forEach(b => { this.grid.delete(key(b.row, b.col)); this.dropFx(b); });
    }
    this.addFloater(this.m.cx, this.m.launcherY - this.m.cell * 3, `+${EXTRA_MOVES} moves!`, '#8dffd0', 30);
    playPowerUp(this.opts.sound);
    this.emit();
  }

  private locked() { return Boolean(this.shot) || Boolean(this.result) || this.paused; }

  private pos(row: number, col: number) {
    const { left, cell, top, radius } = this.m;
    return { x: left + (col + stagger(row, this.shift) * 0.5) * cell, y: top + radius + row * cell * ROW_GAP - this.slide };
  }

  private lowestRow() { let row = 0; this.grid.forEach(b => { if (b.row > row) row = b.row; }); return row; }

  private presentColors() {
    const set = new Set<number>();
    this.grid.forEach(b => { if (b.color >= 0) set.add(b.color); });
    return set.size ? [...set] : [0];
  }

  private makePiece(): Piece {
    if (this.queued) { const kind = this.queued; this.queued = null; return { kind, color: 0 }; }
    const colors = this.presentColors();
    return { kind: 'color', color: colors[Math.floor(Math.random() * colors.length)] };
  }

  private grantPower(kind: 'bomb' | 'rainbow') {
    if (this.next.kind === 'color') this.next = { kind, color: 0 };
    else this.queued = kind;
    playPowerUp(this.opts.sound);
    this.addFloater(this.m.cx, this.m.launcherY - this.m.cell * 2.6, kind === 'bomb' ? 'Bomb ready!' : 'Rainbow bubble!', kind === 'bomb' ? '#ffb15c' : '#ffffff', 26);
  }

  private direction(px: number, py: number) {
    let dx = px - this.m.cx, dy = py - this.m.launcherY;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    if (-dy < 0.16) { dy = -0.16; dx = Math.sign(dx || 1) * Math.sqrt(1 - dy * dy); }
    return { x: dx, y: dy };
  }

  private shoot(vx: number, vy: number) {
    const piece = this.current;
    this.shot = { x: this.m.cx, y: this.m.launcherY, vx, vy, piece };
    this.current = this.next;
    this.next = this.makePiece();
    this.moves -= 1;
    playShoot(this.opts.sound);
    this.emit();
  }

  private hits(x: number, y: number) {
    if (y <= this.m.top + this.m.radius) return true;
    const limit = this.m.cell * 0.88;
    for (const b of this.grid.values()) {
      const p = this.pos(b.row, b.col);
      if ((p.x - x) ** 2 + (p.y - y) ** 2 < limit * limit) return true;
    }
    return false;
  }

  private landingCell(x: number, y: number) {
    let best: { row: number; col: number } | null = null, nearest = Infinity;
    const maxRow = Math.min(DANGER_ROW + 2, this.lowestRow() + 3);
    for (let row = 0; row <= maxRow; row++) {
      for (let col = 0; col < COLS; col++) {
        if (this.grid.has(key(row, col))) continue;
        if (row > 0 && !neighbors(row, col, this.shift).some(([r, c]) => this.grid.has(key(r, c)))) continue;
        const p = this.pos(row, col);
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < nearest) { nearest = d; best = { row, col }; }
      }
    }
    return best;
  }

  private trace(dx: number, dy: number) {
    const m = this.m;
    let x = m.cx, y = m.launcherY, vx = dx, vy = dy;
    const points = [{ x, y }];
    const step = m.cell * 0.3;
    for (let i = 0; i < 520; i++) {
      x += vx * step; y += vy * step;
      if (x < m.minX) { x = m.minX; vx = Math.abs(vx); points.push({ x, y }); }
      else if (x > m.maxX) { x = m.maxX; vx = -Math.abs(vx); points.push({ x, y }); }
      if (this.hits(x, y)) { points.push({ x, y }); return { points, end: { x, y } }; }
    }
    return { points, end: null };
  }

  private land(x: number, y: number, piece: Piece) {
    const cell = this.landingCell(x, y);
    let removed: Bubble[] = [];
    let dropped: Bubble[] = [];
    let origin = { x, y };
    if (cell) {
      origin = this.pos(cell.row, cell.col);
      if (piece.kind === 'bomb') {
        removed = this.blast(cell.row, cell.col);
        removed.forEach(b => this.grid.delete(key(b.row, b.col)));
        this.shake = 1;
        playBomb(this.opts.sound);
        this.burst(origin.x, origin.y, '#ffb15c', 26, 420);
        this.buzz([30, 40, 40]);
      } else {
        const color = piece.kind === 'rainbow' ? this.rainbowColor(cell.row, cell.col) : piece.color;
        const bubble = { row: cell.row, col: cell.col, color };
        this.grid.set(key(cell.row, cell.col), bubble);
        const group = cluster(this.grid, bubble, this.shift);
        if (group.length >= 3) { removed = group; removed.forEach(b => this.grid.delete(key(b.row, b.col))); }
      }
    }
    if (removed.length) {
      dropped = floating(this.grid, this.shift);
      dropped.forEach(b => this.grid.delete(key(b.row, b.col)));
      this.misses = 0;
      this.streak += 1;
      this.reward(removed, dropped, origin, piece.kind === 'bomb');
    } else {
      this.streak = 0;
      this.misses += 1;
      playStick(this.opts.sound);
      this.burst(origin.x, origin.y, colorOf(piece.color), 5, 120);
    }
    if (cell) neighbors(cell.row, cell.col, this.shift).forEach(([r, c]) => { if (this.grid.has(key(r, c))) this.jiggle.set(key(r, c), this.age); });
    this.afterShot();
  }

  private blast(row: number, col: number) {
    const cx = col + stagger(row, this.shift) * 0.5, cy = row * ROW_GAP;
    return [...this.grid.values()].filter(b => (b.col + stagger(b.row, this.shift) * 0.5 - cx) ** 2 + (b.row * ROW_GAP - cy) ** 2 <= 2.1 ** 2);
  }

  private rainbowColor(row: number, col: number) {
    const options = new Set<number>();
    neighbors(row, col, this.shift).forEach(([r, c]) => { const b = this.grid.get(key(r, c)); if (b && b.color >= 0) options.add(b.color); });
    if (!options.size) return this.presentColors()[0];
    let best = [...options][0], bestSize = -1;
    options.forEach(color => {
      const probe = { row, col, color };
      this.grid.set(key(row, col), probe);
      const size = cluster(this.grid, probe, this.shift).length;
      if (size > bestSize) { bestSize = size; best = color; }
    });
    this.grid.delete(key(row, col));
    return best;
  }

  private reward(removed: Bubble[], dropped: Bubble[], origin: { x: number; y: number }, bomb: boolean) {
    const mult = Math.min(this.streak, 5);
    const gained = (removed.length * 10 + Math.max(0, removed.length - 3) * 5 + dropped.length * 20) * mult;
    this.score += gained;
    this.removedTotal += removed.length + dropped.length;
    removed.sort((a, b) => Math.hypot(this.pos(a.row, a.col).x - origin.x, this.pos(a.row, a.col).y - origin.y) - Math.hypot(this.pos(b.row, b.col).x - origin.x, this.pos(b.row, b.col).y - origin.y));
    removed.forEach((b, i) => { const p = this.pos(b.row, b.col); this.pops.push({ x: p.x, y: p.y, color: b.color, delay: i * 0.03, age: 0, burst: false }); });
    dropped.forEach(b => this.dropFx(b));
    if (!bomb) playBubblePop(this.opts.sound, removed.length, this.streak);
    if (dropped.length) playDrop(this.opts.sound, dropped.length);
    this.buzz(removed.length >= 6 ? [18, 24, 18] : 14);
    this.addFloater(origin.x, origin.y, `+${gained}`, '#fff6b0', 22 + Math.min(10, mult * 2));
    if (this.streak >= 2) this.addFloater(this.m.cx, this.m.top + this.m.cell * 3.2, `Combo x${mult}!`, '#ffd24a', 30 + mult * 2);
    else if (dropped.length >= 3) this.addFloater(this.m.cx, this.m.top + this.m.cell * 3.2, `Big drop! ${dropped.length}`, '#8dffd0', 28);
    else if (removed.length >= 4) {
      const words = ['Nice!', 'Sweet!', 'Great!', 'Awesome!', 'Fantastic!'];
      this.addFloater(this.m.cx, this.m.top + this.m.cell * 3.2, words[Math.min(words.length - 1, removed.length - 4)], '#ffe27a', 28);
    }
    if (this.streak > 0 && this.streak % 3 === 0) this.grantPower('rainbow');
    this.charge += (removed.length + dropped.length) * 3.2;
    if (this.charge >= 100) { this.charge = 0; this.grantPower('bomb'); }
  }

  private dropFx(b: Bubble) {
    const p = this.pos(b.row, b.col);
    this.falls.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 140, vy: -120 - Math.random() * 120, rot: 0, vr: (Math.random() - 0.5) * 8, color: b.color });
  }

  private afterShot() {
    const every = this.spec.descendEvery;
    if (every > 0 && this.misses >= every && this.grid.size > 0) this.addRow();
    if (this.grid.size === 0) { this.finish(true, 'cleared'); }
    else if (this.lowestRow() >= DANGER_ROW) this.finish(false, 'danger');
    else if (this.moves <= 0) this.finish(false, 'moves');
    this.emit();
  }

  private addRow() {
    this.misses = 0;
    const shifted: Grid = new Map();
    this.grid.forEach(b => shifted.set(key(b.row + 1, b.col), { ...b, row: b.row + 1 }));
    this.shift += 1;
    const colors = this.presentColors();
    for (let col = 0; col < COLS; col++) shifted.set(key(0, col), { row: 0, col, color: colors[Math.floor(Math.random() * colors.length)] });
    this.grid = shifted;
    this.slide = this.m.cell * ROW_GAP;
    this.shake = 0.6;
    playDescend(this.opts.sound);
    this.buzz([40, 30, 40]);
    this.addFloater(this.m.cx, this.m.top + this.m.cell * 2, 'New row!', '#ff9aa8', 28);
  }

  private starsFor() {
    const ratio = this.moves / this.spec.moves;
    return ratio >= 0.35 ? 3 : ratio >= 0.12 ? 2 : 1;
  }

  private finish(won: boolean, reason: EndInfo['reason']) {
    if (this.result) return;
    const bonus = won ? Math.max(0, this.moves) * 25 : 0;
    this.score += bonus;
    this.result = { won, score: this.score, stars: won ? this.starsFor() : 0, movesLeft: Math.max(0, this.moves), bonus, reason };
    this.endAt = this.age + (won ? 1.1 : 0.8);
    if (won) {
      playWin(this.opts.sound);
      const palette = [...COLORS, '#ffffff'];
      for (let i = 0; i < 90; i++) {
        this.particles.push({ x: Math.random() * this.m.w, y: -10 - Math.random() * 60, vx: (Math.random() - 0.5) * 160, vy: 80 + Math.random() * 260, r: 3 + Math.random() * 3, color: palette[i % palette.length], age: 0, life: 1.6 + Math.random() * 1.2 });
      }
    } else playGameOver(this.opts.sound);
  }

  private emit() {
    const total = this.removedTotal + this.grid.size;
    this.cb.onHud({ score: this.score, moves: Math.max(0, this.moves), moveLimit: this.spec.moves, progress: total ? this.removedTotal / total : 0, stars: this.starsFor(), streak: this.streak, charge: this.charge });
  }

  private buzz(pattern: number | number[]) { if (this.opts.haptics && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); }

  private addFloater(x: number, y: number, text: string, color: string, size: number) {
    this.floaters.push({ x, y, text, color, size, age: 0, life: 1.1 });
  }

  private burst(x: number, y: number, color: string, count: number, speed: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.8);
      this.particles.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 60, r: 2 + Math.random() * 3, color, age: 0, life: 0.45 + Math.random() * 0.4 });
    }
  }

  private measure() {
    const c = this.canvas, w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (!this.m || this.m.w !== w || this.m.h !== h || this.m.dpr !== dpr) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
      document.body.appendChild(probe);
      const probeStyle = getComputedStyle(probe);
      const safeTop = parseFloat(probeStyle.paddingTop) || 0;
      const safeBottom = parseFloat(probeStyle.paddingBottom) || 0;
      probe.remove();
      const top = safeTop + 86;
      const launcherY = h - Math.max(104, safeBottom + 92);
      const cell = Math.max(16, Math.min(44, (w - 16) / (COLS + 0.5), (launcherY - 74 - top) / ((DANGER_ROW - 1) * ROW_GAP + 1)));
      const left = (w - (COLS - 0.5) * cell) / 2;
      this.m = { w, h, dpr, cell, radius: cell / 2, left, top, minX: left, maxX: left + (COLS - 0.5) * cell, cx: w / 2, launcherY };
      this.sprites.clear();
    }
    return true;
  }

  private frame(time: number) {
    this.raf = requestAnimationFrame(t => this.frame(t));
    if (!this.measure()) return;
    const dt = Math.min(0.033, (time - (this.last || time)) / 1000);
    this.last = time;
    if (!this.paused) this.update(dt);
    this.draw(time);
  }

  private update(dt: number) {
    this.age += dt;
    if (this.shot) this.moveShot(dt);
    if (this.slide > 0) this.slide = Math.max(0, this.slide - (this.slide * 9 + 20) * dt);
    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.pops.forEach(p => { p.age += dt; if (!p.burst && p.age >= p.delay) { p.burst = true; this.burst(p.x, p.y, colorOf(p.color), 6, 230); } });
    this.pops = this.pops.filter(p => p.age - p.delay < 0.3);
    this.falls.forEach(f => { f.vy += 1900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt; });
    this.falls = this.falls.filter(f => f.y < this.m.h + 60);
    this.particles.forEach(p => { p.age += dt; p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; });
    this.particles = this.particles.filter(p => p.age < p.life);
    this.floaters.forEach(f => { f.age += dt; f.y -= 34 * dt; });
    this.floaters = this.floaters.filter(f => f.age < f.life);
    let target = 0;
    if (this.aimPoint) { const dir = this.direction(this.aimPoint.x, this.aimPoint.y); target = Math.atan2(dir.x, -dir.y); }
    this.barrel += (target - this.barrel) * Math.min(1, dt * 18);
    if (this.result && !this.reported && this.age >= this.endAt) { this.reported = true; this.cb.onEnd(this.result); }
  }

  private moveShot(dt: number) {
    const s = this.shot!, m = this.m;
    const total = SPEED * dt, steps = Math.max(1, Math.ceil(total / (m.cell * 0.25))), step = total / steps;
    for (let i = 0; i < steps; i++) {
      s.x += s.vx * step; s.y += s.vy * step;
      if (s.x < m.minX) { s.x = m.minX; s.vx = Math.abs(s.vx); }
      else if (s.x > m.maxX) { s.x = m.maxX; s.vx = -Math.abs(s.vx); }
      if (this.hits(s.x, s.y)) { this.shot = null; this.land(s.x, s.y, s.piece); return; }
    }
  }

  private sprite(color: number, r: number) {
    const id = `${color}:${Math.round(r * 4)}`;
    let sprite = this.sprites.get(id);
    if (sprite) return sprite;
    const dpr = this.m.dpr, size = Math.ceil((r * 2 + 10) * dpr);
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = size;
    const g = sprite.getContext('2d')!;
    g.scale(dpr, dpr);
    paintBubble(g, size / dpr / 2, size / dpr / 2, r, color);
    this.sprites.set(id, sprite);
    return sprite;
  }

  private drawSprite(color: number, x: number, y: number, r: number, alpha = 1, scale = 1) {
    const sprite = this.sprite(color, r), size = (sprite.width / this.m.dpr) * scale;
    this.ctx.globalAlpha = alpha;
    this.ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    this.ctx.globalAlpha = 1;
  }

  private drawPiece(piece: Piece, x: number, y: number, r: number, time: number) {
    const ctx = this.ctx;
    if (piece.kind === 'color') { this.drawSprite(piece.color, x, y, r); return; }
    if (piece.kind === 'bomb') {
      const gradient = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r);
      gradient.addColorStop(0, '#8a8fa8'); gradient.addColorStop(0.35, '#2b2d3e'); gradient.addColorStop(1, '#0a0b14');
      ctx.beginPath(); ctx.arc(x, y, r * 0.96, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
      ctx.strokeStyle = '#d7a56a'; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.moveTo(x + r * 0.35, y - r * 0.8); ctx.quadraticCurveTo(x + r * 0.7, y - r * 1.15, x + r * 0.95, y - r * 0.95); ctx.stroke();
      const pulse = 0.6 + Math.sin(time * 0.02) * 0.4;
      ctx.beginPath(); ctx.arc(x + r * 0.95, y - r * 0.95, r * (0.22 + pulse * 0.14), 0, Math.PI * 2); ctx.fillStyle = '#ffcf5a'; ctx.shadowColor = '#ff8a2a'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
      return;
    }
    const hue = (time * 0.12) % 360;
    const gradient = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
    gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(0.25, `hsl(${hue},95%,62%)`); gradient.addColorStop(0.65, `hsl(${(hue + 90) % 360},90%,58%)`); gradient.addColorStop(1, `hsl(${(hue + 200) % 360},80%,35%)`);
    ctx.beginPath(); ctx.arc(x, y, r * 0.96, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.shadowColor = '#ffffffaa'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.34, r * 0.22, r * 0.13, -0.5, 0, Math.PI * 2); ctx.fillStyle = '#ffffffd0'; ctx.fill();
  }

  private draw(time: number) {
    const { ctx, m } = this;
    ctx.setTransform(m.dpr, 0, 0, m.dpr, 0, 0);
    ctx.clearRect(0, 0, m.w, m.h);
    this.drawBackground(time);
    ctx.save();
    if (this.shake > 0.01) ctx.translate((Math.random() - 0.5) * this.shake * 9, (Math.random() - 0.5) * this.shake * 9);
    this.drawDanger(time);
    this.grid.forEach(b => {
      const p = this.pos(b.row, b.col), j = this.jiggle.get(key(b.row, b.col));
      let scale = 1;
      if (j !== undefined) {
        const t = (this.age - j) / 0.4;
        if (t >= 1) this.jiggle.delete(key(b.row, b.col)); else scale = 1 + Math.sin(t * Math.PI * 3) * 0.12 * (1 - t);
      }
      this.drawSprite(b.color, p.x, p.y, m.radius, 1, scale);
    });
    this.drawPops();
    this.drawFalls();
    if (this.aimPoint && !this.locked()) this.drawAim();
    this.drawLauncher(time);
    if (this.shot) this.drawPiece(this.shot.piece, this.shot.x, this.shot.y, m.radius * 1.02, time);
    this.drawParticles();
    this.drawFloaters();
    ctx.restore();
    this.drawTitle();
  }

  private drawBackground(time: number) {
    const { ctx, m } = this;
    const world = WORLDS[this.spec.theme];
    const gradient = ctx.createLinearGradient(0, 0, 0, m.h);
    gradient.addColorStop(0, world.top); gradient.addColorStop(1, world.bottom);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, m.w, m.h);
    ctx.fillStyle = world.glow;
    for (let i = 0; i < 9; i++) {
      const x = (((i * 173) % 100) / 100 * m.w + time * 0.008 * (1 + (i % 3))) % (m.w + 120) - 60;
      const y = ((i * 89) % 100) / 100 * m.h + Math.sin(time * 0.0005 + i) * 14;
      ctx.globalAlpha = 0.06 + (i % 3) * 0.02;
      ctx.beginPath(); ctx.arc(x, y, 18 + ((i * 37) % 40), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = world.hill;
    ctx.beginPath(); ctx.ellipse(m.cx, m.h + m.h * 0.06, m.w * 0.85, m.h * 0.17, 0, 0, Math.PI * 2); ctx.fill();
  }

  private drawDanger(time: number) {
    const { ctx, m } = this;
    const y = this.pos(DANGER_ROW, 0).y - m.cell * ROW_GAP * 0.5;
    const alert = this.lowestRow() >= DANGER_ROW - 3;
    const pulse = alert ? 0.55 + Math.sin(time * 0.012) * 0.3 : 0.28;
    ctx.save();
    ctx.strokeStyle = `rgba(255,96,120,${pulse})`; ctx.lineWidth = 2; ctx.setLineDash([9, 8]);
    ctx.beginPath(); ctx.moveTo(m.minX - m.radius, y); ctx.lineTo(m.maxX + m.radius, y); ctx.stroke();
    ctx.restore();
    const every = this.spec.descendEvery;
    if (every > 0) {
      for (let i = 0; i < every; i++) {
        const x = m.cx + (i - (every - 1) / 2) * 15;
        ctx.beginPath(); ctx.arc(x, y + 16, 4.5, 0, Math.PI * 2);
        if (i < this.misses) { ctx.fillStyle = '#ff6b84'; ctx.fill(); } else { ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
    }
  }

  private drawPops() {
    const { ctx } = this;
    this.pops.forEach(p => {
      const t = (p.age - p.delay) / 0.3, r = this.m.radius;
      if (t < 0) { this.drawSprite(p.color, p.x, p.y, r); return; }
      this.drawSprite(p.color, p.x, p.y, r, 1 - t, 1 + t * 0.45);
      ctx.globalAlpha = (1 - t) * 0.8; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * (1 - t) + 0.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, r * (0.9 + t * 1.3), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    });
  }

  private drawFalls() {
    const { ctx } = this;
    this.falls.forEach(f => {
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      this.drawSprite(f.color, 0, 0, this.m.radius, 0.95);
      ctx.restore();
    });
  }

  private drawAim() {
    const { ctx, m } = this;
    const dir = this.direction(this.aimPoint!.x, this.aimPoint!.y);
    const { points, end } = this.trace(dir.x, dir.y);
    ctx.fillStyle = '#ffffff';
    let carry = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], len = Math.hypot(b.x - a.x, b.y - a.y), gap = m.cell * 0.5;
      for (let d = gap - carry; d < len; d += gap) {
        const t = d / len;
        ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      carry = (carry + len) % gap;
    }
    ctx.globalAlpha = 1;
    if (end) {
      const cell = this.landingCell(end.x, end.y);
      if (cell) {
        const p = this.pos(cell.row, cell.col);
        ctx.globalAlpha = 0.45;
        if (this.current.kind === 'color') this.drawSprite(this.current.color, p.x, p.y, m.radius);
        else { ctx.strokeStyle = this.current.kind === 'bomb' ? '#ffb15c' : '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, m.radius * 0.9, 0, Math.PI * 2); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
    }
  }

  private drawLauncher(time: number) {
    const { ctx, m } = this;
    const ringR = m.radius * 1.75;
    ctx.beginPath(); ctx.arc(m.cx, m.launcherY, ringR * 1.35, 0, Math.PI * 2); ctx.fillStyle = '#ffffff12'; ctx.fill();
    ctx.save(); ctx.translate(m.cx, m.launcherY); ctx.rotate(this.barrel);
    ctx.fillStyle = '#ffffffd9'; roundedRect(ctx, -7, -ringR * 1.5, 14, ringR * 0.9, 6); ctx.fill();
    ctx.restore();
    ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff55';
    ctx.beginPath(); ctx.arc(m.cx, m.launcherY, ringR, 0, Math.PI * 2); ctx.stroke();
    if (this.charge > 0) {
      ctx.strokeStyle = '#ffd24a'; ctx.shadowColor = '#ffb040'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(m.cx, m.launcherY, ringR, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(100, this.charge)) / 100); ctx.stroke(); ctx.shadowBlur = 0;
    }
    this.drawPiece(this.current, m.cx, m.launcherY, m.radius * 1.08, time);
    const nx = m.cx + ringR * 1.95, ny = m.launcherY + 6;
    ctx.fillStyle = '#ffffffb0'; ctx.font = '900 9px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NEXT', nx, ny - m.radius * 1.15);
    this.drawPiece(this.next, nx, ny, m.radius * 0.78, time);
  }

  private drawParticles() {
    const { ctx } = this;
    this.particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  private drawFloaters() {
    const { ctx } = this;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    this.floaters.forEach(f => {
      const t = f.age / f.life, pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.5 : 1.1 - Math.min(0.1, (t - 0.15) * 0.2);
      ctx.globalAlpha = Math.min(1, (1 - t) * 2.2);
      ctx.font = `900 ${Math.round(f.size * pop)}px Nunito, sans-serif`;
      ctx.lineWidth = 5; ctx.strokeStyle = '#2a1a66'; ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1;
  }

  private drawTitle() {
    if (this.age > 2.1) return;
    const { ctx, m } = this;
    const alpha = Math.min(1, this.age / 0.3, (2.1 - this.age) / 0.5);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.font = '900 40px Nunito, sans-serif'; ctx.lineWidth = 7; ctx.strokeStyle = '#2a1a66';
    ctx.strokeText(`LEVEL ${this.level}`, m.cx, m.h * 0.5); ctx.fillStyle = '#ffffff'; ctx.fillText(`LEVEL ${this.level}`, m.cx, m.h * 0.5);
    ctx.font = '800 15px Nunito, sans-serif'; ctx.lineWidth = 4;
    ctx.strokeText(WORLDS[this.spec.theme].name.toUpperCase(), m.cx, m.h * 0.5 + 34); ctx.fillStyle = '#ffe9a8'; ctx.fillText(WORLDS[this.spec.theme].name.toUpperCase(), m.cx, m.h * 0.5 + 34);
    ctx.globalAlpha = 1;
  }
}
