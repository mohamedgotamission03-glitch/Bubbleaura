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
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

function sparkle(at: number, volume: number, length = 0.12) {
  const ctx = audio();
  if (!ctx) return;
  const frames = Math.floor(ctx.sampleRate * length);
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
  filter.frequency.setValueAtTime(1500, at);
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
  const notes = [523, 587, 659, 784, 880];
  const note = notes[Math.floor(Math.random() * notes.length)];
  const now = ctx.currentTime;
  tone(now, note, 0.09, 0.15, 'triangle', note * 1.08);
  tone(now + 0.025, note * 1.5, 0.11, 0.045, 'sine', note * 1.45);
  tone(now, 150, 0.07, 0.055, 'sine', 85);
}

export function playClear(enabled: boolean, lines: number, streak = 1) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  const heat = Math.min(Math.max(streak, lines), 7);
  const scale = [523, 587, 659, 784, 880, 1046, 1175];
  const first = Math.min(heat - 1, scale.length - 3);
  const notes = lines >= 3 ? 4 : lines === 2 ? 3 : 2;

  tone(now, 180 + heat * 14, 0.13, 0.11 + heat * 0.012, 'sine', 65);
  for (let index = 0; index < notes; index++) {
    const note = scale[first + index];
    const at = now + index * (heat >= 3 ? 0.045 : 0.06);
    tone(at, note, 0.16, 0.15 + heat * 0.012, 'triangle', note * 1.035);
    if (heat >= 2) tone(at, note * 2, 0.1, 0.045 + heat * 0.004, 'sine');
  }
  sparkle(now + 0.025, 0.07 + heat * 0.018, heat >= 4 ? 0.19 : 0.12);
  if (heat >= 3) tone(now + 0.17, scale[Math.min(first + notes, scale.length - 1)], 0.2, 0.1, 'sine');
}

export function playWin(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  [523, 659, 784, 1046, 1318].forEach((note, index) => {
    tone(now + index * 0.075, note, 0.22, 0.18, 'triangle');
    if (index > 1) tone(now + index * 0.075, note * 1.5, 0.14, 0.05, 'sine');
  });
  tone(now, 130, 0.22, 0.12, 'sine', 55);
  sparkle(now + 0.17, 0.2, 0.24);
}

export function playUndo(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(now, 440, 0.1, 0.12, 'sine', 280);
  tone(now + 0.035, 660, 0.08, 0.05, 'triangle', 390);
}

export function playSelect(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(now, 392, 0.07, 0.08, 'triangle', 523);
  tone(now + 0.035, 659, 0.09, 0.045, 'sine', 784);
}

export function playMenu(enabled: boolean, opening: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = opening ? [523, 659] : [659, 523];
  notes.forEach((note, index) => tone(now + index * 0.045, note, 0.09, 0.055, 'sine', note * 0.98));
}

export function playLevelStart(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  [392, 523, 659, 784].forEach((note, index) => tone(now + index * 0.07, note, 0.16, 0.09, 'triangle'));
  sparkle(now + 0.17, 0.07, 0.14);
}

export function playGameOver(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  [523, 440, 392].forEach((note, index) => tone(now + index * 0.12, note, 0.18, 0.075, 'sine', note * 0.96));
}

export function playRevive(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  [392, 523, 659, 1046].forEach((note, index) => tone(now + index * 0.055, note, 0.2, 0.12, 'triangle'));
  sparkle(now + 0.12, 0.15, 0.2);
}

export function playShoot(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(now, 320, 0.09, 0.09, 'sine', 700);
  tone(now + 0.02, 900, 0.05, 0.03, 'triangle', 1200);
}

export function playStick(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(now, 230, 0.07, 0.09, 'sine', 150);
}

const POP_SCALE = [523, 587, 659, 784, 880, 1046, 1175, 1318];

export function playBubblePop(enabled: boolean, count: number, streak = 1) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  const base = POP_SCALE[Math.min(Math.max(streak, 1), POP_SCALE.length) - 1];
  const pops = Math.min(count, 5);
  for (let i = 0; i < pops; i++) {
    const note = base * (1 + i * 0.12);
    tone(now + i * 0.04, note, 0.1, 0.13, 'sine', note * 0.55);
    tone(now + i * 0.04, note * 2, 0.05, 0.04, 'triangle', note * 1.5);
  }
  if (count >= 6) sparkle(now + 0.05, 0.12, 0.2);
}

export function playDrop(enabled: boolean, count: number) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(now, 720, 0.28, 0.1, 'triangle', 180);
  if (count >= 4) tone(now + 0.08, 960, 0.26, 0.07, 'sine', 240);
}

export function playBomb(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(now, 170, 0.4, 0.26, 'sawtooth', 38);
  tone(now, 90, 0.35, 0.2, 'sine', 40);
  sparkle(now, 0.16, 0.3);
}

export function playPowerUp(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  [523, 659, 784, 1046].forEach((note, index) => tone(now + index * 0.05, note, 0.14, 0.09, 'triangle'));
  sparkle(now + 0.1, 0.1, 0.16);
}

export function playGift(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(now, 190, 0.12, 0.12, 'sine', 70);
  sparkle(now + 0.05, 0.12, 0.18);
  [523, 659, 784, 1046, 1318, 1568].forEach((note, index) => {
    tone(now + 0.12 + index * 0.07, note, 0.22, 0.13, 'triangle');
    tone(now + 0.12 + index * 0.07, note * 2, 0.14, 0.04, 'sine');
  });
  [1046, 1318, 1568].forEach((note, index) => tone(now + 0.6, note, 0.55, 0.1 - index * 0.015, 'sine'));
  sparkle(now + 0.55, 0.16, 0.35);
}

export function playDescend(enabled: boolean) {
  const ctx = ready(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(now, 150, 0.22, 0.14, 'sawtooth', 70);
  tone(now + 0.1, 130, 0.2, 0.1, 'sawtooth', 60);
}

export function stopAudio() {
  if (context?.state === 'running') void context.suspend();
}

// Background music: a bright, looping 8-bar tune (C – G – Am – F – C – G – F – G) made from simple synth notes.
const BAR = 2;
const N = { B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66 };
const CHORDS = {
  C: { bass: 130.81, pad: [261.63, 329.63, 392] },
  G: { bass: 98, pad: [246.94, 293.66, 392] },
  Am: { bass: 110, pad: [261.63, 329.63, 440] },
  F: { bass: 87.31, pad: [261.63, 349.23, 440] },
};
const SONG: { chord: keyof typeof CHORDS; melody: number[] }[] = [
  { chord: 'C', melody: [N.E5, 0, N.G5, 0, N.C6, 0, N.G5, N.E5] },
  { chord: 'G', melody: [N.D5, 0, N.G5, 0, N.A5, 0, N.G5, N.D5] },
  { chord: 'Am', melody: [N.E5, 0, N.A5, 0, N.C6, 0, N.A5, N.E5] },
  { chord: 'F', melody: [N.F5, 0, N.A5, 0, N.C6, 0, N.A5, N.F5] },
  { chord: 'C', melody: [N.G5, 0, N.E5, 0, N.C6, 0, N.E5, N.G5] },
  { chord: 'G', melody: [N.D5, 0, N.G5, 0, N.B5, 0, N.G5, N.D5] },
  { chord: 'F', melody: [N.A5, 0, N.F5, 0, N.C6, 0, N.F5, N.A5] },
  { chord: 'G', melody: [N.G5, 0, N.B5, 0, N.D6, 0, N.B5, N.G5] },
];
let musicGain: GainNode | null = null;
let musicTimer: number | null = null;
let nextBar = 0;
let barIndex = 0;

function note(at: number, freq: number, length: number, volume: number, type: OscillatorType = 'sine', attack = 0.012) {
  const ctx = audio();
  if (!ctx || !musicGain) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

function playBar(at: number, index: number) {
  const bar = SONG[index % SONG.length];
  const chord = CHORDS[bar.chord];
  note(at, chord.bass, 0.9, 0.09, 'triangle');
  note(at + 1, chord.bass, 0.9, 0.07, 'triangle');
  chord.pad.forEach(freq => note(at, freq, 1.9, 0.02, 'sine', 0.25));
  for (let beat = 0; beat < 4; beat++) note(at + beat * 0.5, 90, 0.09, 0.05, 'sine');
  bar.melody.forEach((freq, step) => { if (freq) note(at + step * 0.25, freq, 0.24, 0.05, 'triangle'); });
}

function scheduleMusic() {
  const ctx = audio();
  if (!ctx || !musicGain) return;
  if (ctx.state !== 'running') { nextBar = ctx.currentTime + 0.1; return; }
  while (nextBar < ctx.currentTime + 1.6) { playBar(nextBar, barIndex++); nextBar += BAR; }
}

export function startMusic() {
  const ctx = audio();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  if (musicTimer !== null) return;
  musicGain = ctx.createGain();
  musicGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  musicGain.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 1.2);
  musicGain.connect(ctx.destination);
  barIndex = 0;
  nextBar = ctx.currentTime + 0.1;
  musicTimer = window.setInterval(scheduleMusic, 400);
  scheduleMusic();
}

export function stopMusic() {
  const ctx = audio();
  if (!ctx || musicTimer === null) return;
  window.clearInterval(musicTimer);
  musicTimer = null;
  const gain = musicGain;
  musicGain = null;
  if (gain) {
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    window.setTimeout(() => gain.disconnect(), 700);
  }
}

