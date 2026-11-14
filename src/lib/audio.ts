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

const SOFT = ['Nice!', 'Good job!', 'Doing good!', 'Yes!', 'Sweet!'];
const WARM = ['Awesome!', 'Great!', 'Brilliant!', 'You got it!'];
const PEAK = ['Perfect!', 'Excellent!', 'Incredible!', 'Fantastic!', 'Unstoppable!'];
let cheerIndex = 0;

export function cheerFor(lines = 1, win = false, streak = 1) {
  if (win) return 'You did it!';
  const heat = Math.max(streak, lines);
  const bank = heat >= 4 || lines >= 3 ? PEAK : heat >= 2 ? WARM : SOFT;
  const phrase = bank[cheerIndex % bank.length];
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
  tone(ctx.currentTime, 620, 0.07, 0.2, 'triangle', 780);
}

export function playClear(enabled: boolean, lines: number, streak = 1) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  const step = Math.min(streak + lines - 1, 6);
  const base = 494 * Math.pow(1.06, step);
  const count = Math.min(1 + lines, 4);
  for (let i = 0; i < count; i++) {
    const note = base * Math.pow(1.2, i);
    tone(now + i * 0.055, note, 0.13, 0.16 + step * 0.01, 'triangle', note * 1.03);
  }
  sparkle(now, 0.08 + step * 0.015);
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
