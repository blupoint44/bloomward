// The flower towers. A tower watches its range for the bug that has marched
// furthest, fires on a cooldown, and is drawn as a flower whose shape and
// colours come from its definition. Levels grow damage, reach and a small
// crown of extra petals.

import { TOWER_DEFS, towerStats } from './config.js';
import { tileCenter } from './garden.js';
import { spawnProjectile } from './projectiles.js';
import { spawnMuzzle } from './effects.js';
import { sfx } from './audio.js';

export function defByKey(key) {
  return TOWER_DEFS.find((d) => d.key === key);
}

export function makeTower(key, c, r) {
  const def = defByKey(key);
  const { x, y } = tileCenter(c, r);
  return {
    def, level: 1, c, r, x, y,
    invested: def.cost,
    cooldownT: 0.2,
    aimAngle: -Math.PI / 2,
    popT: 0,
    sway: ((c * 31 + r * 57) % 628) / 100,
    shots: 0,
  };
}

export function statsOf(tower) {
  return towerStats(tower.def, tower.level);
}

/** The bug this tower would shoot: alive, in range, furthest along. */
export function findTarget(game, tower) {
  const { range } = statsOf(tower);
  let best = null;
  for (const e of game.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - tower.x, e.y - tower.y);
    if (d <= range + e.def.radius && (best === null || e.dist > best.dist)) best = e;
  }
  return best;
}

export function updateTowers(game, dt) {
  for (const t of game.towers) {
    if (t.popT < 1) t.popT = Math.min(1, t.popT + dt * 3.2);
    if (t.cooldownT > 0) t.cooldownT -= dt;
    const target = findTarget(game, t);
    if (target) {
      t.aimAngle = Math.atan2(target.y - t.y, target.x - t.x);
      if (t.cooldownT <= 0) {
        const stats = statsOf(t);
        t.cooldownT = stats.cooldown;
        t.shots += 1;
        spawnProjectile(game, t, target, stats);
        spawnMuzzle(game, t, target);
        sfx.shoot(t.def.key);
      }
    }
  }
}

export function drawRangeRing(ctx, x, y, range, ok) {
  ctx.save();
  ctx.fillStyle = ok ? 'rgba(255,255,255,0.13)' : 'rgba(224,82,82,0.15)';
  ctx.strokeStyle = ok ? 'rgba(255,255,255,0.75)' : 'rgba(224,82,82,0.8)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawTower(ctx, t, time) {
  const pop = 0.6 + 0.4 * (1 - Math.pow(1 - t.popT, 3));
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.scale(pop, pop);
  // Soil mound.
  ctx.fillStyle = '#b98d54';
  ctx.beginPath();
  ctx.ellipse(0, 15, 19, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a37c46';
  ctx.beginPath();
  ctx.ellipse(0, 13.5, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stem and leaves, swaying gently.
  const sway = Math.sin(time * 1.6 + t.sway) * 0.05;
  ctx.strokeStyle = '#3e8e4f';
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.quadraticCurveTo(sway * 30, 4, sway * 44, -4);
  ctx.stroke();
  ctx.fillStyle = '#4caf68';
  ctx.beginPath();
  ctx.ellipse(-8, 9, 8.4, 4, -0.5 + sway, 0, Math.PI * 2);
  ctx.ellipse(8, 11, 8.4, 4, 0.5 + sway, 0, Math.PI * 2);
  ctx.fill();
  // Flower head, turning toward the aim.
  ctx.translate(sway * 44, -6);
  const petals = 6 + t.level; // level 1: 7 petals, up to 9
  const headR = t.def.key === 'melon' ? 13 : 11 + t.level * 0.8;
  if (t.def.key === 'melon') {
    ctx.fillStyle = t.def.petal;
    ctx.beginPath();
    ctx.arc(0, 0, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2f7d3c';
    ctx.lineWidth = 2.4;
    for (const off of [-6, 0, 6]) {
      ctx.beginPath();
      ctx.arc(off, 0, headR - 2.5, -1.1, 1.1);
      ctx.stroke();
    }
    ctx.fillStyle = '#3e8e4f';
    ctx.beginPath();
    ctx.ellipse(3, -headR + 1, 6, 3.2, 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (let i = 0; i < petals; i += 1) {
      const a = (i / petals) * Math.PI * 2 + t.aimAngle * 0.15 + Math.sin(time * 2 + t.sway) * 0.03;
      ctx.fillStyle = t.def.petal;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * headR * 0.78, Math.sin(a) * headR * 0.78, headR * 0.52, headR * 0.34, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = t.def.centre;
    ctx.beginPath();
    ctx.arc(0, 0, headR * 0.52, 0, Math.PI * 2);
    ctx.fill();
    if (t.def.key === 'rose') {
      ctx.fillStyle = 'rgba(90,10,25,0.55)';
      ctx.beginPath();
      ctx.arc(0, 0, headR * 0.26, 0, Math.PI * 2);
      ctx.fill();
    }
    if (t.def.key === 'mint') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(-2.4, -2.6, 1.7, 0, Math.PI * 2);
      ctx.arc(2.8, 1.8, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  // Level pips under the mound.
  if (t.level > 1) {
    ctx.fillStyle = '#ffd93d';
    ctx.strokeStyle = 'rgba(120,84,10,0.8)';
    ctx.lineWidth = 1;
    for (let i = 0; i < t.level - 1; i += 1) {
      const px = t.x + (i - (t.level - 2) / 2) * 11;
      ctx.beginPath();
      ctx.arc(px, t.y + 24, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}
