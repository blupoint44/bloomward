// A tiny seeded random generator (mulberry32). The whole game draws from one
// of these so a seed always grows the same garden: decorations, spawn jitter
// and screenshot scenes are reproducible, and the headless test can replay a
// full match deterministically.

export function makeRng(seed) {
  let state = (seed >>> 0) || 1;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    /** Float in [min, max). */
    range(min, max) { return min + next() * (max - min); },
    /** Integer in [min, max] inclusive. */
    int(min, max) { return min + Math.floor(next() * (max - min + 1)); },
    /** True with probability p. */
    chance(p) { return next() < p; },
    pick(list) { return list[Math.floor(next() * list.length)]; },
  };
}
