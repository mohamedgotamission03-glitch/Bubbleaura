let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (context) return context;
  const Context = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;
  context = new Context();
  return context;
}

function hit(at: number, pitch: number, length: number, volume: number) {
  const ctx = audio();
  if (!ctx) return;
  const frames = Math.max(1, Math.floor(ctx.sampleRate * length));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let noise = 0.17;
  for (let i = 0; i < frames; i++) {
    const t = i / ctx.sampleRate;
    const punch = Math.exp(-t * 34);
    const click = Math.exp(-t * 90);
    noise = noise * 0.96 + (Math.random() * 2 - 1) * 0.04;
    const body = Math.sin(2 * Math.PI * pitch * t * (1 + t * 1.4)) * punch;
    data[i] = Math.max(-1, Math.min(1, body * 0.82 + noise * click * 1.6));
  }
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, at);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(at);
}

function ready(enabled: boolean) {
  const ctx = audio();
  if (!enabled || !ctx) return null;
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export async function unlockAudio() {
  const ctx = audio();
  if (ctx?.state === 'suspended') await ctx.resume();
}

export function playPlace(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  hit(ctx.currentTime, 210, 0.07, 0.72);
}

export function playClear(enabled: boolean, lines: number) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  const bursts = Math.min(4, lines);
  for (let i = 0; i < bursts; i++) hit(now + i * 0.045, 240 + i * 90, 0.08, 0.62 + i * 0.08);
}

export function playWin(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  [260, 340, 430].forEach((pitch, index) => hit(ctx.currentTime + index * 0.06, pitch, 0.09, 0.7));
}

export function playUndo(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  hit(ctx.currentTime, 150, 0.06, 0.45);
}

export function stopAudio() {
  if (context?.state === 'running') void context.suspend();
}
