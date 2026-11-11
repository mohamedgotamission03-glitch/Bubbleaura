// Original synthesized music and effects. No copied audio or samples.
const PATTERN = [0, 4, 7, 12, 7, 4, 9, 12, 16, 12, 9, 7];
let context: AudioContext | null = null;
let musicTimer: number | null = null;
let step = 0;
let musicWanted = false;

function audio(): AudioContext | null {
  if (context) return context;
  const Context = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;
  context = new Context();
  return context;
}
function tone(frequency: number, at: number, duration: number, volume: number, type: OscillatorType) {
  const ctx = audio();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1700, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + Math.min(0.03, duration / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.03);
}
function sparkle(at: number, volume: number) {
  const ctx = audio();
  if (!ctx) return;
  const frames = Math.floor(ctx.sampleRate * 0.14);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.value = 1600;
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(at);
}
function tickMusic() {
  const ctx = audio();
  if (!ctx || !musicWanted) return;
  const now = ctx.currentTime;
  tone(261.63 * 2 ** (PATTERN[step % PATTERN.length] / 12), now, 0.46, 0.016, 'triangle');
  if (step % 6 === 0) tone(130.81, now, 0.72, 0.01, 'sine');
  step += 1;
}
export async function unlockAudio() {
  const ctx = audio();
  if (ctx?.state === 'suspended') await ctx.resume();
}
export function setMusic(enabled: boolean) {
  musicWanted = enabled;
  if (!enabled) {
    if (musicTimer !== null) window.clearInterval(musicTimer);
    musicTimer = null;
    return;
  }
  const ctx = audio();
  if (!ctx || musicTimer !== null) return;
  void ctx.resume();
  tickMusic();
  musicTimer = window.setInterval(tickMusic, 360);
}
export function playPlace(enabled: boolean) {
  const ctx = audio();
  if (!enabled || !ctx) return;
  const now = ctx.currentTime;
  tone(520, now, 0.09, 0.045, 'triangle');
  tone(780, now + 0.03, 0.08, 0.02, 'sine');
}
export function playClear(enabled: boolean, lines: number) {
  const ctx = audio();
  if (!enabled || !ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5].slice(0, Math.min(4, lines + 1));
  const now = ctx.currentTime;
  notes.forEach((frequency, index) => tone(frequency, now + index * 0.07, 0.22, 0.05, 'triangle'));
  if (lines > 1) sparkle(now + 0.08, Math.min(0.045, 0.018 * lines));
}
export function playWin(enabled: boolean) {
  const ctx = audio();
  if (!enabled || !ctx) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => tone(frequency, ctx.currentTime + index * 0.11, 0.28, 0.05, 'triangle'));
}
export function playUndo(enabled: boolean) {
  const ctx = audio();
  if (!enabled || !ctx) return;
  tone(440, ctx.currentTime, 0.08, 0.03, 'sine');
  tone(330, ctx.currentTime + 0.05, 0.1, 0.025, 'triangle');
}
export function stopAudio() {
  setMusic(false);
  if (context?.state === 'running') void context.suspend();
}
