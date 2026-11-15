import { BubbleEngine } from './bubble-engine';
import { COLORS, cluster, key, type Grid } from './bubbles';

export const SCENE_W = 400;
export const SCENE_H = 760;
const FONT = 'Nunito, "Segoe UI", Arial, sans-serif';

export type Scene = { level: number; mode: 'aim' | 'shot' | 'bomb' };
export type Slide = { scene: Scene; tag: string; title: string[]; subtitle: string; top: string; bottom: string; accent: string };

export const SLIDES: Slide[] = [
  { scene: { level: 1, mode: 'aim' }, tag: 'EASY TO LEARN', title: ['Aim. Shoot.', 'Pop!'], subtitle: 'Match colors and clear the board.', top: '#6a4bd0', bottom: '#2c1d62', accent: '#ffd45c' },
  { scene: { level: 8, mode: 'aim' }, tag: '60 UNIQUE LEVELS', title: ['Every level', 'is a surprise'], subtitle: 'Hearts, diamonds, waves and more.', top: '#c2457d', bottom: '#3a1a52', accent: '#ffd45c' },
  { scene: { level: 22, mode: 'shot' }, tag: 'BIG COMBOS', title: ['Chain reactions', 'that feel great'], subtitle: 'Drop whole clusters with one shot.', top: '#1e7f9c', bottom: '#0f2547', accent: '#8dffd0' },
  { scene: { level: 33, mode: 'bomb' }, tag: 'POWER-UPS', title: ['Bombs and', 'rainbow bubbles'], subtitle: 'Blast through the toughest levels.', top: '#d36bc4', bottom: '#43307f', accent: '#ffe27a' },
  { scene: { level: 14, mode: 'aim' }, tag: 'TOUGHER TWISTS', title: ['Stone bubbles', 'keep you thinking'], subtitle: 'New challenges as you go.', top: '#e08a2e', bottom: '#4a1f4a', accent: '#fff3d2' },
];

const MENU_SLIDE: Slide = { scene: SLIDES[0].scene, tag: 'EASY TO START', title: ['Tap Play', 'and pop away'], subtitle: 'A friendly home with levels and gifts.', top: '#2c8fd6', bottom: '#1b2f7a', accent: '#ffd45c' };
const MONTAGE_SLIDE: Slide = { scene: SLIDES[1].scene, tag: '60 UNIQUE LEVELS', title: ['Hearts, waves,', 'diamonds & more'], subtitle: 'A fresh layout every single level.', top: '#c2457d', bottom: '#3a1a52', accent: '#ffd45c' };
const GIFT_SLIDE: Slide = { scene: SLIDES[4].scene, tag: 'DAILY GIFT', title: ['A free bomb', 'every day'], subtitle: 'Build a streak for bigger rewards.', top: '#e08a2e', bottom: '#4a1f4a', accent: '#fff3d2' };
const MONTAGE_LEVELS = [2, 3, 4, 8, 9, 10];

export const FORMATS = {
  phone: { label: 'Phone', w: 1080, h: 1920 },
  tablet7: { label: '7" tablet', w: 1200, h: 1920 },
  tablet10: { label: '10" tablet', w: 1600, h: 2560 },
} as const;
export type FormatId = keyof typeof FORMATS;

const frames = (n = 2) => new Promise<void>(resolve => {
  const step = (left: number) => requestAnimationFrame(() => (left <= 1 ? resolve() : step(left - 1)));
  step(n);
});
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function withDpr<T>(value: number, fn: () => Promise<T>): Promise<T> {
  const original = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
  try { Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => value }); } catch { /* keep the real ratio */ }
  try { return await fn(); }
  finally {
    if (original) Object.defineProperty(window, 'devicePixelRatio', original);
    else Reflect.deleteProperty(window, 'devicePixelRatio');
  }
}

type Live = { engine: BubbleEngine; canvas: HTMLCanvasElement; dispose: () => void };
function mount(level: number): Live {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${SCENE_W}px;height:${SCENE_H}px;pointer-events:none`;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  host.appendChild(canvas);
  document.body.appendChild(host);
  const engine = new BubbleEngine(canvas, level, { sound: false, haptics: false }, { onHud: () => {}, onEnd: () => {} });
  engine.start();
  return { engine, canvas, dispose: () => { engine.destroy(); host.remove(); } };
}

type Inside = { grid: Grid; current: { kind: string; color: number }; shift: number; shot: unknown; result: unknown; m?: { cx: number; launcherY: number }; pos(row: number, col: number): { x: number; y: number } };
const inside = (engine: BubbleEngine) => engine as unknown as Inside;

function aimTarget(engine: BubbleEngine) {
  const e = inside(engine);
  const seen = new Set<string>();
  let best: { x: number; y: number } | null = null;
  let bestSize = 0;
  e.grid.forEach(b => {
    if (b.color < 0 || seen.has(key(b.row, b.col))) return;
    const group = cluster(e.grid, b, e.shift);
    group.forEach(g => seen.add(key(g.row, g.col)));
    if (e.current.kind === 'color' && b.color !== e.current.color) return;
    const lowest = group.reduce((a, g) => (g.row > a.row ? g : a), group[0]);
    if (group.length > bestSize) { bestSize = group.length; best = e.pos(lowest.row, lowest.col); }
  });
  return best ?? { x: e.m?.cx ?? SCENE_W / 2, y: (e.m?.launcherY ?? SCENE_H - 100) - 300 };
}

function shootOnce(engine: BubbleEngine) {
  const target = aimTarget(engine);
  engine.pointerDown(target.x, target.y);
  engine.pointerUp(target.x, target.y);
}

export async function captureScene(scene: Scene): Promise<HTMLCanvasElement> {
  return withDpr(2, async () => {
    const live = mount(scene.level);
    try {
      await frames(4);
      if (scene.mode === 'bomb') { live.engine.useBomb(); await frames(2); }
      const target = aimTarget(live.engine);
      live.engine.pointerDown(target.x, target.y);
      if (scene.mode === 'shot') { live.engine.pointerUp(target.x, target.y); await sleep(620); }
      else await sleep(450);
      const out = document.createElement('canvas');
      out.width = live.canvas.width; out.height = live.canvas.height;
      out.getContext('2d')!.drawImage(live.canvas, 0, 0);
      return out;
    } finally { live.dispose(); }
  });
}

export async function loadIcon(): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = '/icon.svg';
  await image.decode();
  return image;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glossyBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const gradient = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.25, color);
  gradient.addColorStop(1, `${color}88`);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - r * 0.32, y - r * 0.38, r * 0.24, r * 0.14, -0.5, 0, Math.PI * 2); ctx.fillStyle = '#ffffffb0'; ctx.fill();
  ctx.restore();
}

const DECO: [number, number, number, number][] = [[0.1, 0.1, 60, 0], [0.9, 0.17, 90, 1], [0.05, 0.5, 44, 3], [0.95, 0.56, 70, 2], [0.1, 0.88, 80, 4], [0.9, 0.9, 52, 5], [0.5, 0.035, 34, 2], [0.3, 0.975, 38, 1]];

function drawBackdrop(ctx: CanvasRenderingContext2D, W: number, H: number, slide: Slide, t: number, u: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, slide.top); gradient.addColorStop(1, slide.bottom);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, W * 0.85);
  glow.addColorStop(0, 'rgba(255,255,255,0.16)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  DECO.forEach(([fx, fy, r, ci], i) => glossyBubble(ctx, fx * W, fy * H + Math.sin(t * 1.6 + i) * 14 * u, r * u, COLORS[ci], 0.55));
}

function fitSize(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  const width = ctx.measureText(text).width;
  return width > maxWidth ? (size * maxWidth) / width : size;
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  (ctx as unknown as { letterSpacing?: string }).letterSpacing = `${px}px`;
}

function drawBrandFooter(ctx: CanvasRenderingContext2D, W: number, y: number, u: number, icon: HTMLImageElement) {
  const size = 64 * u;
  ctx.font = `900 ${46 * u}px ${FONT}`;
  const text = 'Bubble Aura';
  const textWidth = ctx.measureText(text).width;
  const x = W / 2 - (textWidth + size + 16 * u) / 2;
  ctx.save();
  roundRect(ctx, x, y - size * 0.8, size, size, 16 * u); ctx.clip();
  ctx.drawImage(icon, x, y - size * 0.8, size, size);
  ctx.restore();
  ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x + size + 16 * u, y);
  ctx.textAlign = 'center';
}

export function drawSlide(ctx: CanvasRenderingContext2D, W: number, H: number, slide: Slide, source: CanvasImageSource, icon: HTMLImageElement, t = 0) {
  const u = W / 1080;
  drawBackdrop(ctx, W, H, slide, t, u);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const maxWidth = W * 0.88;

  const tagSize = 28 * u, tagTop = H * 0.05;
  ctx.font = `900 ${tagSize}px ${FONT}`; setSpacing(ctx, 3 * u);
  const tagWidth = ctx.measureText(slide.tag).width + 64 * u;
  roundRect(ctx, W / 2 - tagWidth / 2, tagTop, tagWidth, tagSize * 2, tagSize);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.fillText(slide.tag, W / 2, tagTop + tagSize * 1.35);
  setSpacing(ctx, 0);

  const titleSize = Math.min(...slide.title.map(line => fitSize(ctx, line, 900, 96 * u, maxWidth)));
  let lineY = tagTop + tagSize * 2 + titleSize * 1.12;
  ctx.font = `900 ${titleSize}px ${FONT}`;
  slide.title.forEach((line, i) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowOffsetY = 6 * u;
    ctx.fillStyle = i === slide.title.length - 1 ? slide.accent : '#ffffff';
    ctx.fillText(line, W / 2, lineY);
    ctx.restore();
    lineY += titleSize * 1.08;
  });

  const subSize = fitSize(ctx, slide.subtitle, 800, 40 * u, maxWidth);
  ctx.font = `800 ${subSize}px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  const subY = lineY - titleSize * 0.2;
  ctx.fillText(slide.subtitle, W / 2, subY);

  const top = subY + 56 * u, bottom = H * 0.925;
  let frameH = bottom - top, frameW = (frameH * SCENE_W) / SCENE_H;
  if (frameW > W * 0.84) { frameW = W * 0.84; frameH = (frameW * SCENE_H) / SCENE_W; }
  const x = (W - frameW) / 2, y = top;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 60 * u; ctx.shadowOffsetY = 24 * u;
  roundRect(ctx, x - 12 * u, y - 12 * u, frameW + 24 * u, frameH + 24 * u, 56 * u);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, x, y, frameW, frameH, 44 * u); ctx.clip();
  ctx.drawImage(source, x, y, frameW, frameH);
  ctx.restore();

  drawBrandFooter(ctx, W, H * 0.968, u, icon);
}

export function composeSlide(slide: Slide, sceneCanvas: CanvasImageSource, icon: HTMLImageElement, W: number, H: number) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  drawSlide(canvas.getContext('2d')!, W, H, slide, sceneCanvas, icon);
  return canvas;
}

export function composeFeatureGraphic(sceneCanvas: HTMLCanvasElement, icon: HTMLImageElement) {
  const W = 1024, H = 500;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const slide = SLIDES[0];
  drawBackdrop(ctx, W, H, slide, 0, 0.5);
  ctx.textBaseline = 'alphabetic';
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
  roundRect(ctx, 70, 80, 130, 130, 32); ctx.clip();
  ctx.drawImage(icon, 70, 80, 130, 130);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowOffsetY = 5;
  ctx.fillStyle = '#ffffff'; ctx.font = `900 ${fitSize(ctx, 'Bubble Aura', 900, 92, 520)}px ${FONT}`;
  ctx.fillText('Bubble Aura', 70, 290);
  ctx.fillStyle = slide.accent; ctx.font = `900 46px ${FONT}`;
  ctx.fillText('Pop & Match', 74, 345);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.font = `800 26px ${FONT}`;
  ctx.fillText('60 levels · bombs · rainbows', 74, 400);
  ctx.save();
  ctx.translate(W - 250, H / 2);
  ctx.rotate(-0.1);
  const fw = 330, fh = 420;
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 14;
  roundRect(ctx, -fw / 2 - 8, -fh / 2 - 8, fw + 16, fh + 16, 38); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.shadowColor = 'transparent';
  roundRect(ctx, -fw / 2, -fh / 2, fw, fh, 30); ctx.clip();
  const sw = sceneCanvas.width, sh = Math.min(sceneCanvas.height * 0.8, sw * (fh / fw));
  ctx.drawImage(sceneCanvas, 0, sceneCanvas.height * 0.06, sw, sh, -fw / 2, -fh / 2, fw, fh);
  ctx.restore();
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Export failed.'))), 'image/png'));
}

const easeOutBack = (x: number) => { const c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

function pill(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, shadow: string) {
  roundRect(g, x, y + 3, w, h, h / 2); g.fillStyle = shadow; g.fill();
  roundRect(g, x, y, w, h, h / 2); g.fillStyle = fill; g.fill();
}

// A canvas drawing of the real home screen, used for the trailer.
function drawMenuMock(canvas: HTMLCanvasElement, local: number, t: number, icon: HTMLImageElement) {
  const g = canvas.getContext('2d')!;
  g.setTransform(2, 0, 0, 2, 0, 0);
  g.clearRect(0, 0, SCENE_W, SCENE_H);
  const sky = g.createLinearGradient(0, 0, 0, SCENE_H);
  sky.addColorStop(0, '#d4f0fb'); sky.addColorStop(0.55, '#e9fbf6'); sky.addColorStop(1, '#fffaf3');
  g.fillStyle = sky; g.fillRect(0, 0, SCENE_W, SCENE_H);
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(30, SCENE_H, 170, 70, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(SCENE_W - 10, SCENE_H + 10, 190, 80, 0, 0, Math.PI * 2); g.fill();
  g.textBaseline = 'alphabetic';

  g.save(); roundRect(g, 20, 20, 42, 42, 14); g.clip(); g.drawImage(icon, 20, 20, 42, 42); g.restore();
  g.textAlign = 'left'; g.fillStyle = '#2d4668'; g.font = `900 19px ${FONT}`; g.fillText('Bubble Aura', 72, 42);
  g.fillStyle = '#96a1af'; g.font = `800 10px ${FONT}`; g.fillText('POP & MATCH', 72, 57);

  const chips: [string, string][] = [['🏆', '4,820'], ['⭐', '36'], ['💣', '3']];
  chips.forEach(([emoji, text], i) => {
    const x = 60 + i * 100;
    pill(g, x, 86, 88, 34, '#ffffff', '#bcd8e3');
    g.fillStyle = '#3d4f6b'; g.textAlign = 'center'; g.font = `900 14px ${FONT}`;
    g.fillText(`${emoji} ${text}`, x + 44, 108);
  });

  [[56, 178, 30, 0], [338, 160, 26, 1], [82, 306, 23, 4], [316, 300, 29, 2]].forEach(([x, y, r, c], i) => glossyBubble(g, x, y + Math.sin(t * 2 + i) * 6, r, COLORS[c], 1));
  g.save(); g.translate(SCENE_W / 2, 210); g.rotate(-0.05);
  g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 10;
  g.font = `900 66px ${FONT}`;
  g.strokeStyle = '#5a47c2'; g.strokeText('Bubble', 0, 0); g.fillStyle = '#ffffff'; g.fillText('Bubble', 0, 0);
  g.strokeStyle = '#c9791a'; g.strokeText('Aura', 0, 62); g.fillStyle = '#ffd45c'; g.fillText('Aura', 0, 62);
  pill(g, -62, 86, 124, 26, '#7968d9', '#5949b4');
  g.fillStyle = '#ffffff'; g.font = `900 11px ${FONT}`; g.fillText('POP & MATCH', 0, 104);
  g.restore();

  const pressed = local > 2.6 && local < 3.1;
  const pulse = pressed ? 0.95 : 1 + Math.sin(t * 3) * 0.015;
  g.save(); g.translate(SCENE_W / 2, 486); g.scale(pulse, pulse);
  roundRect(g, -170, -30 + (pressed ? 2 : 6), 340, 68, 22); g.fillStyle = '#c93a69'; g.fill();
  const play = g.createLinearGradient(0, -34, 0, 34); play.addColorStop(0, '#ff86ad'); play.addColorStop(1, '#ff4d86');
  roundRect(g, -170, -34 + (pressed ? 4 : 0), 340, 68, 22); g.fillStyle = play; g.fill();
  g.fillStyle = '#ffffff'; g.font = `900 24px ${FONT}`; g.textAlign = 'center';
  g.fillText('▶  Continue', -20, 8 + (pressed ? 4 : 0));
  roundRect(g, 66, -10 + (pressed ? 4 : 0), 76, 24, 12); g.fillStyle = 'rgba(255,255,255,0.28)'; g.fill();
  g.fillStyle = '#ffffff'; g.font = `900 12px ${FONT}`; g.fillText('Level 12', 104, 7 + (pressed ? 4 : 0));
  g.restore();

  roundRect(g, 30, 590, 168, 88, 20); g.fillStyle = '#bcd8e3'; g.fill();
  roundRect(g, 30, 586, 168, 88, 20); g.fillStyle = '#ffffff'; g.fill();
  g.textAlign = 'center'; g.fillStyle = '#4a5f7d'; g.font = `900 15px ${FONT}`;
  g.fillText('▦', 114, 616); g.fillText('Levels', 114, 640);
  g.fillStyle = '#8a9bb0'; g.font = `800 11px ${FONT}`; g.fillText('60 to play', 114, 658);
  const wiggle = Math.sin(t * 9) * 0.03;
  g.save(); g.translate(286, 630); g.rotate(wiggle);
  roundRect(g, -84, -40, 168, 88, 20); g.fillStyle = '#e6992b'; g.fill();
  roundRect(g, -84, -44, 168, 88, 20); g.fillStyle = '#fff3d2'; g.fill();
  g.fillStyle = '#a8570c'; g.font = `900 15px ${FONT}`; g.fillText('🎁 Daily gift', 0, -2);
  g.fillStyle = '#b8741f'; g.font = `800 11px ${FONT}`; g.fillText('Free bomb!', 0, 20);
  g.restore();
}

function drawGiftMock(canvas: HTMLCanvasElement, local: number, t: number, icon: HTMLImageElement) {
  drawMenuMock(canvas, 0, t, icon);
  const g = canvas.getContext('2d')!;
  g.fillStyle = 'rgba(32,57,85,0.55)'; g.fillRect(0, 0, SCENE_W, SCENE_H);
  const pop = easeOutBack(Math.min(1, local / 0.5));
  g.save(); g.translate(SCENE_W / 2, 380); g.scale(pop, pop);
  roundRect(g, -150, -190, 300, 380, 30); g.fillStyle = '#fffaf1'; g.fill();
  g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.stroke();
  g.textAlign = 'center';
  g.font = '72px sans-serif'; g.fillText('🎁', 0, -92 + Math.sin(t * 6) * -10);
  g.fillStyle = '#786bd0'; g.font = `900 11px ${FONT}`; g.fillText('DAILY GIFT · DAY 4', 0, -52);
  g.fillStyle = '#304c69'; g.font = `900 30px ${FONT}`; g.fillText('Surprise! 🎉', 0, -14);
  pill(g, -78, 8, 156, 52, '#fff3d2', '#e6992b');
  g.fillStyle = '#a8570c'; g.font = `900 24px ${FONT}`; g.fillText('💣 +2 bombs', 0, 43);
  g.fillStyle = '#77869a'; g.font = `700 12px ${FONT}`;
  g.fillText('Come back tomorrow for another one!', 0, 92);
  pill(g, -110, 112, 220, 50, '#7968d9', '#5949b4');
  g.fillStyle = '#ffffff'; g.font = `900 16px ${FONT}`; g.fillText('Yay, thanks!', 0, 143);
  g.restore();
  const colors = ['#ff5a8a', '#ffca35', '#20d2b5', '#8b63f0'];
  for (let i = 0; i < 40; i++) {
    const x = (i * 53) % SCENE_W;
    const y = ((local * 220 + i * 61) % (SCENE_H + 40)) - 20;
    g.save(); g.translate(x, y); g.rotate(local * 4 + i);
    g.fillStyle = colors[i % 4];
    if (i % 3 === 0) { g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill(); } else g.fillRect(-4, -6, 8, 12);
    g.restore();
  }
}

function drawTitleCard(ctx: CanvasRenderingContext2D, W: number, H: number, local: number, t: number, icon: HTMLImageElement, sub: string, chips: string[] = []) {
  const u = W / 1080;
  drawBackdrop(ctx, W, H, SLIDES[0], t, u);
  const pop = easeOutBack(Math.min(1, local / 0.8));
  const size = 380 * u * pop;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 50 * u; ctx.shadowOffsetY = 20 * u;
  roundRect(ctx, W / 2 - size / 2, H * 0.3 - size / 2, size, size, 90 * u * pop); ctx.clip();
  ctx.drawImage(icon, W / 2 - size / 2, H * 0.3 - size / 2, size, size);
  ctx.restore();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowOffsetY = 8 * u;
  ctx.fillStyle = '#ffffff'; ctx.font = `900 ${fitSize(ctx, 'Bubble Aura', 900, 140 * u, W * 0.88)}px ${FONT}`;
  ctx.fillText('Bubble Aura', W / 2, H * 0.55);
  ctx.restore();
  ctx.fillStyle = SLIDES[0].accent; ctx.font = `900 ${fitSize(ctx, sub, 900, 62 * u, W * 0.88)}px ${FONT}`;
  ctx.fillText(sub, W / 2, H * 0.55 + 100 * u);
  chips.forEach((text, i) => {
    const appear = Math.min(1, Math.max(0, (local - 0.5 - i * 0.25) / 0.3));
    if (appear <= 0) return;
    ctx.font = `900 ${38 * u}px ${FONT}`;
    const w = ctx.measureText(text).width + 70 * u, h = 76 * u, y = H * 0.55 + 190 * u + i * 100 * u;
    ctx.save(); ctx.globalAlpha = appear; ctx.translate(W / 2, y + h / 2); ctx.scale(0.8 + 0.2 * appear, 0.8 + 0.2 * appear);
    roundRect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillText(text, 0, 13 * u);
    ctx.restore();
  });
}

type PartKind = 'intro' | 'menu' | 'play' | 'montage' | 'gift' | 'outro';
type Part = { kind: PartKind; len: number; slide?: number };
const PARTS: Part[] = [
  { kind: 'intro', len: 2.6 },
  { kind: 'menu', len: 4.2 },
  { kind: 'play', slide: 0, len: 5 },
  { kind: 'montage', len: 4.4 },
  { kind: 'play', slide: 2, len: 5 },
  { kind: 'play', slide: 3, len: 5 },
  { kind: 'gift', len: 4 },
  { kind: 'outro', len: 4 },
];
export const PROMO_SECONDS = PARTS.reduce((sum, part) => sum + part.len, 0);

export async function recordPromo(onProgress: (value: number) => void, onStage: (text: string) => void = () => {}): Promise<Blob> {
  const W = 1080, H = 1920;
  const mime = ['video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm'].find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type));
  if (!mime) throw new Error('Video recording is not supported in this browser.');
  const icon = await loadIcon();

  onStage('Preparing level previews…');
  const montage: HTMLCanvasElement[] = [];
  for (const level of MONTAGE_LEVELS) montage.push(await captureScene({ level, mode: 'aim' }));

  const mock = document.createElement('canvas');
  mock.width = SCENE_W * 2; mock.height = SCENE_H * 2;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  // Frames are pushed manually after each draw so none is skipped or duplicated.
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
  let frameCount = 0;
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  const finished = new Promise<Blob>(resolve => { recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' })); });

  onStage('Recording…');
  await withDpr(2, async () => {
    let live = null as Live | null;
    let liveSlide = -1, lastShot = 0, bombUsed = false;
    recorder.start(250);
    const start = performance.now();
    await new Promise<void>(resolve => {
      const tick = () => {
        const t = (performance.now() - start) / 1000;
        if (t >= PROMO_SECONDS) { resolve(); return; }
        requestAnimationFrame(tick);
        let acc = 0, partIndex = 0;
        while (partIndex < PARTS.length - 1 && t >= acc + PARTS[partIndex].len) { acc += PARTS[partIndex].len; partIndex++; }
        const part = PARTS[partIndex], local = t - acc;
        if (part.kind !== 'play' && live) { live.dispose(); live = null; liveSlide = -1; }

        if (part.kind === 'play') {
          const slide = SLIDES[part.slide!];
          if (liveSlide !== part.slide) {
            live?.dispose();
            live = mount(slide.scene.level);
            liveSlide = part.slide!; lastShot = performance.now() + 700; bombUsed = false;
          }
          drawSlide(ctx, W, H, slide, live!.canvas, icon, t);
          const now = performance.now(), e = inside(live!.engine);
          if (now - lastShot > 850 && e.m && !e.shot && !e.result) {
            if (slide.scene.mode === 'bomb' && !bombUsed && local > 2.2) { live!.engine.useBomb(); bombUsed = true; }
            shootOnce(live!.engine);
            lastShot = now;
          }
        } else if (part.kind === 'menu') {
          drawMenuMock(mock, local, t, icon);
          drawSlide(ctx, W, H, MENU_SLIDE, mock, icon, t);
        } else if (part.kind === 'gift') {
          drawGiftMock(mock, local, t, icon);
          drawSlide(ctx, W, H, GIFT_SLIDE, mock, icon, t);
        } else if (part.kind === 'montage') {
          const per = part.len / montage.length;
          const index = Math.min(montage.length - 1, Math.floor(local / per));
          const within = (local - index * per) / per;
          drawSlide(ctx, W, H, MONTAGE_SLIDE, montage[Math.max(0, index - (within < 0.3 ? 1 : 0))], icon, t);
          if (within < 0.3 && index > 0) {
            ctx.save(); ctx.globalAlpha = within / 0.3;
            drawSlide(ctx, W, H, MONTAGE_SLIDE, montage[index], icon, t);
            ctx.restore();
          }
        } else if (part.kind === 'intro') {
          drawTitleCard(ctx, W, H, local, t, icon, 'Pop & Match');
        } else {
          drawTitleCard(ctx, W, H, local, t, icon, 'Pop. Match. Play free!', ['60 levels', 'Bombs & rainbows', 'Daily gifts']);
        }

        const fade = Math.max(0, 1 - local / 0.35, (t - (PROMO_SECONDS - 0.4)) / 0.4);
        if (fade > 0 && t > 0.05) { ctx.fillStyle = `rgba(20,10,50,${Math.min(1, fade)})`; ctx.fillRect(0, 0, W, H); }
        onProgress(t / PROMO_SECONDS);
        track.requestFrame?.();
        frameCount += 1;
      };
      tick();
    });
    live?.dispose();
    recorder.stop();
  });
  const blob = await finished;
  if (frameCount / PROMO_SECONDS < 10) throw new Error(`Only ${Math.round(frameCount / PROMO_SECONDS)} frames per second were drawn, so the video would stutter. Open this page in a normal Chrome or Edge tab (not the preview panel), keep it in front and try again.`);
  return blob;
}
