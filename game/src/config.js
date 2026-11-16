// BLOOMWARD configuration: canvas layout, garden geometry, palette, and the
// data tables for flower towers and bug enemies. Everything tunable lives
// here so the rest of the code stays mechanical.

export const VIEW = { width: 1280, height: 720 };

export const LAYOUT = {
  topBarHeight: 76,
  gardenX: 20,
  gardenY: 92,
  tile: 48,
  cols: 20,
  rows: 12,
  panelX: 996,
  panelWidth: 264,
  panelY: 92,
  hintY: 676,
};

export const COLORS = {
  ink: '#2e4634',
  inkSoft: '#57755f',
  cream: '#fff8e7',
  creamDark: '#f3e5c3',
  panelEdge: '#d9c491',
  lawnA: '#7cc463',
  lawnB: '#74ba59',
  path: '#eed9a4',
  pathEdge: '#dcc084',
  soil: '#c9a86a',
  sun: '#ffb52e',
  sunDeep: '#f08c00',
  heart: '#ef476f',
  good: '#43aa5b',
  bad: '#e05252',
  white: '#ffffff',
};

/** The four plantable flower towers. Damage/range/cooldown are per shot. */
export const TOWER_DEFS = [
  {
    key: 'poppy', name: 'Petal Poppy', cost: 40, range: 118, damage: 6,
    cooldown: 0.34, projectileSpeed: 430, petal: '#ff6b9d', centre: '#ffd93d',
    blurb: 'Fast petals, light sting',
  },
  {
    key: 'rose', name: 'Thorn Rose', cost: 85, range: 150, damage: 30,
    cooldown: 1.7, projectileSpeed: 540, petal: '#e63950', centre: '#8f1d33',
    blurb: 'Slow, heavy thorns',
  },
  {
    key: 'mint', name: 'Frost Mint', cost: 60, range: 114, damage: 2,
    cooldown: 0.5, projectileSpeed: 390, petal: '#3ec6ba', centre: '#d9fbff',
    slowFactor: 0.5, slowSeconds: 1.3, blurb: 'Chills bugs to half speed',
  },
  {
    key: 'melon', name: 'Boom Melon', cost: 115, range: 140, damage: 15,
    cooldown: 1.25, projectileSpeed: 305, petal: '#ff9f2e', centre: '#c2571b',
    splash: 58, blurb: 'Lobs splash melons',
  },
];

/** The bugs that march the path. hp is wave-1 health; waves scale it up. */
export const ENEMY_DEFS = {
  aphid: { name: 'Aphid', hp: 16, speed: 62, bounty: 4, heartDamage: 1, radius: 11, color: '#8fd14f' },
  beetle: { name: 'Beetle', hp: 46, speed: 44, bounty: 7, heartDamage: 1, radius: 14, color: '#8a5a33' },
  snail: { name: 'Snail', hp: 115, speed: 26, bounty: 10, heartDamage: 2, radius: 15, color: '#c9a0dc' },
  wasp: { name: 'Wasp', hp: 22, speed: 97, bounty: 8, heartDamage: 1, radius: 12, color: '#ffd23e' },
  brute: { name: 'Brute Beetle', hp: 980, speed: 24, bounty: 45, heartDamage: 4, radius: 24, color: '#6e4525' },
};

export const WAVES_TOTAL = 12;
export const START_SUN = 130;
export const START_HEART = 20;

/** Health multiplier for enemies on a given wave (1-based). */
export function waveHpScale(wave) {
  return 1 + (wave - 1) * 0.22;
}

/** Sunlight paid for clearing a wave, before the savings bonus. */
export function waveClearBonus(wave) {
  return 14 + wave * 2;
}

/** Upgrade pricing and stat growth for tower levels 2 and 3. */
export function upgradeCost(def, level) {
  return level === 1 ? Math.round(def.cost * 0.75) : Math.round(def.cost * 1.1);
}

export function towerStats(def, level) {
  const steps = level - 1;
  return {
    damage: Math.round(def.damage * Math.pow(1.55, steps)),
    range: Math.round(def.range * Math.pow(1.07, steps)),
    cooldown: def.cooldown * Math.pow(0.94, steps),
  };
}
