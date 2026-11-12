let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (context) return context;
  const Context = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;
  context = new Context();
  return context;
}

function ready(enabled: boolean) {
  const ctx = audio();
  if (!enabled || !ctx) return null;
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(at: number, freq: number, length: number, volume: number, type: OscillatorType = 'triangle', slide = freq) {
  const ctx = audio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), at + length);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

function sparkle(at: number, volume: number) {
  const ctx = audio();
  if (!ctx) return;
  const frames = Math.floor(ctx.sampleRate * 0.12);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    const t = i / frames;
    data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * (1 - t);
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(1400, at);
  gain.gain.setValueAtTime(volume, at);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(at);
}

const PHRASES = ['Interesting!', 'Doing good!', 'Excellent!', 'Perfect!'] as const;
let cheerIndex = 0;

export function cheerFor(_lines = 1, win = false, _streak = 1) {
  if (win) return 'Perfect!';
  const phrase = PHRASES[cheerIndex % PHRASES.length];
  cheerIndex += 1;
  return phrase;
}

export async function unlockAudio() {
  const ctx = audio();
  if (ctx?.state === 'suspended') await ctx.resume();
}

export function playPlace(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const notes = [523, 659, 784, 880];
  const note = notes[Math.floor(Math.random() * notes.length)];
  tone(ctx.currentTime, note, 0.11, 0.22, 'triangle', note * 1.02);
  tone(ctx.currentTime + 0.07, note * 1.5, 0.09, 0.12, 'sine');
  sparkle(ctx.currentTime, 0.08);
}

export function playClear(enabled: boolean, lines: number) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = lines >= 3 ? [523, 659, 784, 1046] : lines === 2 ? [523, 659, 784] : [659, 880];
  notes.forEach((note, index) => {
    tone(now + index * 0.07, note, 0.16, lines >= 3 ? 0.24 : 0.2, 'triangle', note * 1.04);
    tone(now + index * 0.07, note * 2, 0.1, 0.06, 'sine');
  });
  sparkle(now + 0.04, lines >= 3 ? 0.2 : 0.12);
}

export function playWin(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  [523, 659, 784, 1046, 1318].forEach((note, index) => tone(ctx.currentTime + index * 0.08, note, 0.2, 0.22, 'triangle'));
  sparkle(ctx.currentTime + 0.2, 0.16);
}

export function playUndo(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  tone(ctx.currentTime, 440, 0.1, 0.12, 'sine', 280);
}

export function stopAudio() {
  if (context?.state === 'running') void context.suspend();
}
