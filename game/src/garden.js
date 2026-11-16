// The garden itself: the tile grid, the sandy path the bugs march along, the
// Heartbloom they are marching to, and the seeded decorations that make each
// seed's lawn look hand-grown. Also owns path geometry: converting a
// distance travelled into an (x, y) on the path.

import { LAYOUT } from './config.js';
import { makeRng } from './random.js';

/** Path waypoints in tile coordinates; bugs enter off-grid at the first. */
const WAYPOINTS = [
  [-1, 2], [13, 2], [13, 4], [4, 4], [4, 7], [15, 7], [15, 9], [19, 9],
];

export const HEART_TILE = { c: 19, r: 9 };

/** Tiles a tower can never occupy besides the path and the Heartbloom. */
const ROCK_TILES = ['2,10', '17,1', '9,11', '6,0'];

export function tileCenter(c, r) {
  return {
    x: LAYOUT.gardenX + (c + 0.5) * LAYOUT.tile,
    y: LAYOUT.gardenY + (r + 0.5) * LAYOUT.tile,
  };
}

export function tileAt(x, y) {
  const c = Math.floor((x - LAYOUT.gardenX) / LAYOUT.tile);
  const r = Math.floor((y - LAYOUT.gardenY) / LAYOUT.tile);
  if (c < 0 || r < 0 || c >= LAYOUT.cols || r >= LAYOUT.rows) return null;
  return { c, r };
}

export class Garden {
  constructor(seed) {
    const rng = makeRng(seed ^ 0x9e3779b9);
    this.pathTiles = new Set();
    for (let i = 0; i < WAYPOINTS.length - 1; i += 1) {
      const [c0, r0] = WAYPOINTS[i];
      const [c1, r1] = WAYPOINTS[i + 1];
      const dc = Math.sign(c1 - c0);
      const dr = Math.sign(r1 - r0);
      let c = c0;
      let r = r0;
      while (c !== c1 || r !== r1) {
        if (c >= 0) this.pathTiles.add(c + ',' + r);
        c += dc;
        r += dr;
      }
    }
    this.pathTiles.add(HEART_TILE.c + ',' + HEART_TILE.r);

    // Pixel-space polyline with cumulative lengths for pointAt().
    this.points = WAYPOINTS.map(([c, r]) => tileCenter(c, r));
    this.segmentLengths = [];
    this.totalLength = 0;
    for (let i = 0; i < this.points.length - 1; i += 1) {
      const a = this.points[i];
      const b = this.points[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      this.segmentLengths.push(len);
      this.totalLength += len;
    }

    // One decoration per lawn tile: grass tufts, clover, pebbles, dots.
    this.decor = new Map();
    for (let r = 0; r < LAYOUT.rows; r += 1) {
      for (let c = 0; c < LAYOUT.cols; c += 1) {
        const key = c + ',' + r;
        if (this.pathTiles.has(key)) continue;
        const roll = rng.next();
        const kind = roll < 0.42 ? 'tuft' : roll < 0.58 ? 'clover' : roll < 0.7 ? 'pebble' : roll < 0.8 ? 'dotflower' : 'none';
        this.decor.set(key, {
          kind,
          dx: rng.range(-14, 14),
          dy: rng.range(-14, 14),
          size: rng.range(0.8, 1.25),
          hue: rng.pick(['#ff8fab', '#ffd93d', '#ffffff', '#c77dff']),
        });
      }
    }
    this.rocks = new Set(ROCK_TILES);
  }

  isPath(c, r) { return this.pathTiles.has(c + ',' + r); }

  isFree(c, r) {
    const key = c + ',' + r;
    return !this.pathTiles.has(key) && !this.rocks.has(key);
  }

  /** Point on the path at distance d (clamped), plus the heading angle. */
  pointAt(d) {
    let remaining = Math.max(0, d);
    for (let i = 0; i < this.segmentLengths.length; i += 1) {
      const len = this.segmentLengths[i];
      const a = this.points[i];
      const b = this.points[i + 1];
      if (remaining <= len || i === this.segmentLengths.length - 1) {
        const t = len === 0 ? 0 : Math.min(1, remaining / len);
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
      }
      remaining -= len;
    }
    const last = this.points[this.points.length - 1];
    return { x: last.x, y: last.y, angle: 0 };
  }
}

export function drawGarden(ctx, garden, time) {
  const { gardenX: gx, gardenY: gy, tile, cols, rows } = LAYOUT;
  // Lawn checkerboard.
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      ctx.fillStyle = (c + r) % 2 === 0 ? '#7cc463' : '#73b957';
      ctx.fillRect(gx + c * tile, gy + r * tile, tile, tile);
    }
  }
  // Sandy path with a soft edge.
  ctx.fillStyle = '#dcc084';
  for (const key of garden.pathTiles) {
    const [c, r] = key.split(',').map(Number);
    ctx.fillRect(gx + c * tile - 2, gy + r * tile - 2, tile + 4, tile + 4);
  }
  ctx.fillStyle = '#eed9a4';
  for (const key of garden.pathTiles) {
    const [c, r] = key.split(',').map(Number);
    ctx.fillRect(gx + c * tile, gy + r * tile, tile, tile);
  }
  // Pebble speckles on the path, fixed per tile so they never shimmer.
  ctx.fillStyle = 'rgba(160,128,72,0.35)';
  for (const key of garden.pathTiles) {
    const [c, r] = key.split(',').map(Number);
    const hx = gx + c * tile + ((c * 37 + r * 11) % 29) + 8;
    const hy = gy + r * tile + ((c * 13 + r * 29) % 29) + 8;
    ctx.beginPath();
    ctx.arc(hx, hy, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Lawn decorations.
  for (const [key, d] of garden.decor) {
    if (d.kind === 'none') continue;
    const [c, r] = key.split(',').map(Number);
    const x = gx + (c + 0.5) * tile + d.dx;
    const y = gy + (r + 0.5) * tile + d.dy;
    if (d.kind === 'tuft') {
      ctx.strokeStyle = 'rgba(46,110,52,0.55)';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + i * 4, y + 5);
        ctx.quadraticCurveTo(x + i * 5, y - 3, x + i * 6 + Math.sin(time * 1.4 + x) * 1.2, y - 7 * d.size);
        ctx.stroke();
      }
    } else if (d.kind === 'clover') {
      ctx.fillStyle = 'rgba(52,140,66,0.8)';
      for (let i = 0; i < 3; i += 1) {
        const a = (i / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4, 3.2 * d.size, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (d.kind === 'pebble') {
      ctx.fillStyle = 'rgba(120,120,110,0.5)';
      ctx.beginPath();
      ctx.ellipse(x, y, 5 * d.size, 3.6 * d.size, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = d.hue;
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * 3.6, y + Math.sin(a) * 3.6, 2.4 * d.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffb52e';
      ctx.beginPath();
      ctx.arc(x, y, 2 * d.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Rocks that block planting.
  for (const key of garden.rocks) {
    const [c, r] = key.split(',').map(Number);
    const { x, y } = tileCenter(c, r);
    ctx.fillStyle = '#9aa0a3';
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 17, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b7bcbe';
    ctx.beginPath();
    ctx.ellipse(x - 4, y - 2, 11, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The Heartbloom: a big pulsing flower at the path's end. */
export function drawHeartbloom(ctx, garden, time, heart, maxHeart) {
  const { x, y } = tileCenter(HEART_TILE.c, HEART_TILE.r);
  const pulse = 1 + Math.sin(time * 2.4) * 0.05;
  const frac = heart / maxHeart;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  // Stem and leaves.
  ctx.strokeStyle = '#3e8e4f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.quadraticCurveTo(2, 10, 0, 2);
  ctx.stroke();
  ctx.fillStyle = '#4caf68';
  ctx.beginPath();
  ctx.ellipse(-9, 16, 9, 4.5, -0.5, 0, Math.PI * 2);
  ctx.ellipse(9, 18, 9, 4.5, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Petals: full ring when healthy, grey and drooping as it wilts.
  const petals = 8;
  for (let i = 0; i < petals; i += 1) {
    const a = (i / petals) * Math.PI * 2 + Math.sin(time * 1.2) * 0.04;
    const wilt = i / petals > frac;
    ctx.fillStyle = wilt ? '#b9b3a4' : '#ef476f';
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 13, Math.sin(a) * 13 - 6, 8.5, 5.4, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd93d';
  ctx.beginPath();
  ctx.arc(0, -6, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
