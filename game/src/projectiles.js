// Projectiles: petals, thorns and frost orbs home in on their bug; Boom
// Melons fly a fixed arc to where the bug stood and burst in a splash. All
// damage is applied through game.damageEnemy so kills, bounties and effects
// live in one place.

import { spawnBurst } from './effects.js';
import { sfx } from './audio.js';

export function spawnProjectile(game, tower, target, stats) {
  const def = tower.def;
  const p = {
    key: def.key,
    x: tower.x,
    y: tower.y - 8,
    damage: stats.damage,
    splash: def.splash || 0,
    slowFactor: def.slowFactor || 0,
    slowSeconds: def.slowSeconds || 0,
    speed: def.projectileSpeed,
    target,
    tx: target.x,
    ty: target.y,
    sx: tower.x,
    sy: tower.y - 8,
    progress: 0,
    flightTime: 0,
    alive: true,
  };
  if (def.key === 'melon') {
    const dist = Math.hypot(p.tx - p.sx, p.ty - p.sy);
    p.flightTime = Math.max(0.25, dist / def.projectileSpeed);
  }
  game.projectiles.push(p);
}

function applyHit(game, p, enemy) {
  if (p.slowFactor) {
    enemy.slowFactor = p.slowFactor;
    enemy.slowT = Math.max(enemy.slowT, p.slowSeconds);
  }
  game.damageEnemy(enemy, p.damage);
  spawnBurst(game, enemy.x, enemy.y, ['#ffffff', enemy.def.color], 3, 60);
  sfx.hit();
}

function detonate(game, p) {
  const inBlast = game.enemies.filter((e) => e.alive && Math.hypot(e.x - p.tx, e.y - p.ty) <= p.splash + e.def.radius);
  for (const e of inBlast) game.damageEnemy(e, p.damage);
  spawnBurst(game, p.tx, p.ty, ['#ff9f2e', '#ffd93d', '#e2571b'], 16, 190);
  game.rings.push({ x: p.tx, y: p.ty, r: 8, maxR: p.splash, t: 0, life: 0.28, color: '255,159,46' });
  game.shake(0.12, 2.2);
  sfx.splash();
}

export function updateProjectiles(game, dt) {
  for (const p of game.projectiles) {
    if (!p.alive) continue;
    if (p.key === 'melon') {
      p.progress += dt / p.flightTime;
      if (p.progress >= 1) {
        p.alive = false;
        detonate(game, p);
      }
      continue;
    }
    // Homing shots: chase the bug; if it died, fizzle at its last spot.
    if (p.target && p.target.alive) {
      p.tx = p.target.x;
      p.ty = p.target.y;
    }
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (dist <= step + 4) {
      p.alive = false;
      if (p.target && p.target.alive) applyHit(game, p, p.target);
      else spawnBurst(game, p.tx, p.ty, ['#ffffff'], 2, 40);
    } else {
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
      game.trail.push({ x: p.x, y: p.y, t: 0, life: 0.16, color: p.key === 'mint' ? '160,240,255' : p.key === 'rose' ? '230,57,80' : '255,140,180' });
    }
  }
  game.projectiles = game.projectiles.filter((p) => p.alive);
}

export function drawProjectile(ctx, p) {
  if (p.key === 'melon') {
    const t = Math.min(1, p.progress);
    const x = p.sx + (p.tx - p.sx) * t;
    const y = p.sy + (p.ty - p.sy) * t - Math.sin(t * Math.PI) * 64;
    // Ground shadow tracks the arc's foot.
    ctx.fillStyle = 'rgba(60,40,10,0.3)';
    ctx.beginPath();
    ctx.ellipse(p.sx + (p.tx - p.sx) * t, p.sy + (p.ty - p.sy) * t + 8, 8 - t * 2, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9f2e';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2f7d3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x - 2, y, 5.6, -1.1, 1.1);
    ctx.arc(x + 3, y, 5.6, -1.1, 1.1);
    ctx.stroke();
    return;
  }
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.key === 'poppy') {
    ctx.fillStyle = '#ff6b9d';
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.4, 4.2, Math.atan2(p.ty - p.y, p.tx - p.x), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.key === 'rose') {
    const a = Math.atan2(p.ty - p.y, p.tx - p.x);
    ctx.rotate(a);
    ctx.fillStyle = '#7a4a21';
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -3);
    ctx.lineTo(-5, 3);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = '#bdf3ff';
    ctx.beginPath();
    ctx.arc(0, 0, 5.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-1.6, -1.8, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
