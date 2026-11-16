// Procedural WebAudio sound effects: every sound is synthesized from
// oscillators, so the game ships no audio files. The context is created
// lazily on the first user gesture; before that (and in headless screenshot
// or test runs) every call is a safe no-op.

let context = null;
let master = null;
let muted = false;

export function unlockAudio() {
  if (context) {
    if (context.state === 'suspended') context.resume();
    return;
  }
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  context = new Ctor();
  master = context.createGain();
  master.gain.value = 0.16;
  master.connect(context.destination);
}

export function setMuted(value) { muted = value; }
export function isMuted() { return muted; }

function tone({ freq, end = null, type = 'sine', dur = 0.12, vol = 1, delay = 0 }) {
  if (!context || muted) return;
  const t0 = context.currentTime + delay;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (end !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  shoot(key) {
    if (key === 'poppy') tone({ freq: 660, end: 420, type: 'square', dur: 0.05, vol: 0.25 });
    else if (key === 'rose') tone({ freq: 210, end: 120, type: 'sawtooth', dur: 0.08, vol: 0.3 });
    else if (key === 'mint') tone({ freq: 990, end: 1400, type: 'sine', dur: 0.07, vol: 0.25 });
    else tone({ freq: 170, end: 90, type: 'triangle', dur: 0.13, vol: 0.4 });
  },
  hit() { tone({ freq: 1500, type: 'square', dur: 0.02, vol: 0.08 }); },
  splash() { tone({ freq: 300, end: 60, type: 'triangle', dur: 0.18, vol: 0.45 }); },
  die() { tone({ freq: 420, end: 70, type: 'triangle', dur: 0.16, vol: 0.3 }); },
  sun() {
    tone({ freq: 1318, type: 'sine', dur: 0.06, vol: 0.22 });
    tone({ freq: 1760, type: 'sine', dur: 0.09, vol: 0.2, delay: 0.05 });
  },
  place() { tone({ freq: 300, end: 520, type: 'triangle', dur: 0.08, vol: 0.35 }); },
  upgrade() {
    tone({ freq: 523, type: 'triangle', dur: 0.08, vol: 0.3 });
    tone({ freq: 784, type: 'triangle', dur: 0.1, vol: 0.3, delay: 0.07 });
  },
  error() { tone({ freq: 150, type: 'square', dur: 0.09, vol: 0.25 }); },
  hurt() { tone({ freq: 95, end: 45, type: 'sine', dur: 0.28, vol: 0.7 }); },
  wave() {
    tone({ freq: 392, type: 'triangle', dur: 0.12, vol: 0.35 });
    tone({ freq: 587, type: 'triangle', dur: 0.16, vol: 0.35, delay: 0.1 });
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.16, vol: 0.35, delay: i * 0.11 }));
  },
  lose() {
    [440, 349, 262, 196].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.2, vol: 0.3, delay: i * 0.14 }));
  },
};
