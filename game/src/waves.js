// The twelve waves: hand-tuned groups of bugs with a flavour line each. A
// wave is a list of groups; groups spawn back to back with a short breather
// between them, bugs inside a group drip in at the group's interval.

const g = (type, count, interval) => ({ type, count, interval });

export const WAVE_TABLE = [
  { name: 'Aphids on the breeze', groups: [g('aphid', 8, 0.95)] },
  { name: 'More mouths', groups: [g('aphid', 13, 0.8)] },
  { name: 'Beetles join in', groups: [g('aphid', 8, 0.7), g('beetle', 4, 1.1)] },
  { name: 'The hungry rows', groups: [g('aphid', 14, 0.55), g('beetle', 5, 1.0)] },
  { name: 'Slow and armoured', groups: [g('beetle', 6, 1.0), g('snail', 4, 1.6)] },
  { name: 'Wasps dive in', groups: [g('wasp', 10, 0.5), g('aphid', 8, 0.6)] },
  { name: 'Shells everywhere', groups: [g('beetle', 10, 0.8), g('snail', 6, 1.3)] },
  { name: 'The wasp storm', groups: [g('wasp', 16, 0.38), g('beetle', 6, 0.9)] },
  { name: 'Everything at once', groups: [g('snail', 8, 1.1), g('beetle', 10, 0.7), g('wasp', 8, 0.45)] },
  { name: 'Something big stirs', groups: [g('brute', 1, 0.5), g('beetle', 8, 0.8), g('aphid', 10, 0.5)] },
  { name: 'The last swarm', groups: [g('wasp', 22, 0.3), g('snail', 10, 1.0)] },
  { name: 'The grand nibbling', groups: [g('brute', 2, 6), g('beetle', 12, 0.6), g('wasp', 14, 0.35), g('snail', 8, 0.9)] },
];

/** Flat spawn schedule for a wave: [{type, at}] with times in seconds. */
export function buildSpawnQueue(wave) {
  const table = WAVE_TABLE[wave - 1];
  const queue = [];
  let at = 0.4;
  for (const group of table.groups) {
    for (let i = 0; i < group.count; i += 1) {
      queue.push({ type: group.type, at });
      at += group.interval;
    }
    at += 1.1;
  }
  return queue;
}

/** Total bugs in a wave, for the progress readout. */
export function waveBugCount(wave) {
  return WAVE_TABLE[wave - 1].groups.reduce((sum, gr) => sum + gr.count, 0);
}

/** "8 Aphid · 4 Beetle" style summary for the panel's next-wave preview. */
export function wavePreview(wave) {
  const counts = new Map();
  for (const group of WAVE_TABLE[wave - 1].groups) {
    counts.set(group.type, (counts.get(group.type) || 0) + group.count);
  }
  const names = { aphid: 'Aphid', beetle: 'Beetle', snail: 'Snail', wasp: 'Wasp', brute: 'Brute' };
  return [...counts.entries()].map(([type, n]) => `${n} ${names[type]}${n > 1 ? 's' : ''}`).join(' · ');
}
