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

function drawTitleCard(ctx: CanvasRenderingContext2D, W: number, H: number, local: number, t: number, icon: HTMLImageElement, line: string, sub: string) {
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
  ctx.fillText(line, W / 2, H * 0.55);
  ctx.restore();
  ctx.fillStyle = SLIDES[0].accent; ctx.font = `900 ${fitSize(ctx, sub, 900, 62 * u, W * 0.88)}px ${FONT}`;
  ctx.fillText(sub, W / 2, H * 0.55 + 100 * u);
}

type Part = { kind: 'intro' | 'outro' } | { kind: 'play'; slide: number };
const PARTS: (Part & { len: number })[] = [
  { kind: 'intro', len: 2.6 },
  { kind: 'play', slide: 0, len: 5.5 },
  { kind: 'play', slide: 1, len: 5.5 },
  { kind: 'play', slide: 2, len: 5.5 },
  { kind: 'play', slide: 3, len: 5.5 },
  { kind: 'outro', len: 3.2 },
];
export const PROMO_SECONDS = PARTS.reduce((sum, part) => sum + part.len, 0);

export async function recordPromo(onProgress: (value: number) => void): Promise<Blob> {
  const W = 1080, H = 1920;
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type));
  if (!mime) throw new Error('Video recording is not supported in this browser.');
  const icon = await loadIcon();
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  const finished = new Promise<Blob>(resolve => { recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' })); });

  await withDpr(2, async () => {
    let live = null as Live | null;
    let liveSlide = -1, lastShot = 0, bombUsed = false;
    recorder.start(250);
    const start = performance.now();
    await new Promise<void>(resolve => {
      const tick = () => {
        const t = (performance.now() - start) / 1000;
        if (t >= PROMO_SECONDS) { resolve(); return; }
        let acc = 0, partIndex = 0;
        while (partIndex < PARTS.length - 1 && t >= acc + PARTS[partIndex].len) { acc += PARTS[partIndex].len; partIndex++; }
        const part = PARTS[partIndex], local = t - acc;
        if (part.kind === 'play') {
          const slide = SLIDES[part.slide];
          if (liveSlide !== part.slide) {
            live?.dispose();
            live = mount(slide.scene.level);
            liveSlide = part.slide; lastShot = performance.now() + 700; bombUsed = false;
          }
          drawSlide(ctx, W, H, slide, live!.canvas, icon, t);
          const now = performance.now(), e = inside(live!.engine);
          if (now - lastShot > 850 && e.m && !e.shot && !e.result) {
            if (slide.scene.mode === 'bomb' && !bombUsed && local > 2.2) { live!.engine.useBomb(); bombUsed = true; }
            shootOnce(live!.engine);
            lastShot = now;
          }
        } else {
          if (live) { live.dispose(); live = null; liveSlide = -1; }
          if (part.kind === 'intro') drawTitleCard(ctx, W, H, local, t, icon, 'Bubble Aura', 'Pop & Match');
          else drawTitleCard(ctx, W, H, local, t, icon, 'Bubble Aura', 'Pop. Match. Play free!');
        }
        const fade = Math.max(0, 1 - local / 0.35, (t - (PROMO_SECONDS - 0.4)) / 0.4);
        if (fade > 0 && t > 0.05) { ctx.fillStyle = `rgba(20,10,50,${Math.min(1, fade)})`; ctx.fillRect(0, 0, W, H); }
        onProgress(t / PROMO_SECONDS);
        requestAnimationFrame(tick);
      };
      tick();
    });
    live?.dispose();
    recorder.stop();
  });
  return finished;
}
