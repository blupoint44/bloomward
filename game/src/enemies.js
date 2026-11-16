// The bugs. An enemy is a small record that walks the garden path by
// distance; this file spawns them, advances them (with Frost Mint chill
// applied), and draws each species in its own shapes.

import { ENEMY_DEFS } from './config.js';

let nextId = 1;

export function spawnEnemy(game, type, hpScale) {
  const def = ENEMY_DEFS[type];
  const hp = Math.round(def.hp * hpScale);
  const enemy = {
    id: nextId += 1,
    type,
    def,
    hp,
    maxHp: hp,
    dist: 0,
    x: 0,
    y: 0,
    angle: 0,
    slowT: 0,
    slowFactor: 1,
    flashT: 0,
    wobble: game.rng.range(0, Math.PI * 2),
    alive: true,
  };
  const p = game.garden.pointAt(0);
  enemy.x = p.x;
  enemy.y = p.y;
  return enemy;
}

export function updateEnemies(game, dt) {
  const pathLength = game.garden.totalLength;
  for (const e of game.enemies) {
    if (!e.alive) continue;
    if (e.slowT > 0) e.slowT -= dt;
    if (e.flashT > 0) e.flashT -= dt;
    const speed = e.def.speed * (e.slowT > 0 ? e.slowFactor : 1);
    e.dist += speed * dt;
    const p = game.garden.pointAt(e.dist);
    e.x = p.x;
    e.y = p.y + Math.sin(game.time * 6 + e.wobble) * 1.5;
    e.angle = p.angle;
    if (e.dist >= pathLength) {
      e.alive = false;
      game.onEnemyLeaked(e);
    }
  }
  game.enemies = game.enemies.filter((e) => e.alive);
}

function healthBar(ctx, e) {
  if (e.hp >= e.maxHp) return;
  const w = e.def.radius * 2;
  const frac = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = 'rgba(30,40,30,0.65)';
  ctx.fillRect(e.x - w / 2, e.y - e.def.radius - 11, w, 5);
  ctx.fillStyle = frac > 0.45 ? '#7ed957' : frac > 0.2 ? '#ffb52e' : '#e05252';
  ctx.fillRect(e.x - w / 2 + 1, e.y - e.def.radius - 10, (w - 2) * frac, 3);
}

function chilledTint(ctx, e) {
  if (e.slowT <= 0) return;
  ctx.fillStyle = 'rgba(140,225,255,0.4)';
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.def.radius + 2, 0, Math.PI * 2);
  ctx.fill();
}

function flash(ctx, e, drawBody) {
  drawBody();
  if (e.flashT > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, e.flashT * 9);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.def.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawEnemy(ctx, e, time) {
  chilledTint(ctx, e);
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.type === 'aphid') {
    flash(ctx, { ...e, x: 0, y: 0 }, () => {
      ctx.fillStyle = '#6db33f';
      ctx.strokeStyle = 'rgba(70,90,40,0.8)';
      ctx.lineWidth = 1.6;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(2, s * 5);
        ctx.lineTo(8 + Math.sin(time * 14 + e.wobble) * 2, s * 10);
        ctx.stroke();
      }
      ctx.fillStyle = e.def.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5da236';
      ctx.beginPath();
      ctx.arc(7, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#20301a';
      ctx.beginPath();
      ctx.arc(8.5, -2.4, 1.3, 0, Math.PI * 2);
      ctx.arc(8.5, 2.4, 1.3, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (e.type === 'beetle' || e.type === 'brute') {
    const s = e.type === 'brute' ? 1.7 : 1;
    ctx.scale(s, s);
    flash(ctx, { ...e, x: 0, y: 0, def: { radius: 14 } }, () => {
      ctx.strokeStyle = 'rgba(40,26,14,0.85)';
      ctx.lineWidth = 2;
      for (const sd of [-1, 1]) for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-4 + i * 5, sd * 9);
        ctx.lineTo(-6 + i * 5 + Math.sin(time * 10 + i) * 1.5, sd * 15);
        ctx.stroke();
      }
      ctx.fillStyle = e.def.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 11.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(46,28,12,0.7)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(9, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(2, -10.5);
      ctx.quadraticCurveTo(6, 0, 2, 10.5);
      ctx.stroke();
      ctx.fillStyle = '#54381d';
      ctx.beginPath();
      ctx.arc(11, 0, 5.4, 0, Math.PI * 2);
      ctx.fill();
      if (e.type === 'brute') {
        ctx.strokeStyle = '#3c2712';
        ctx.lineWidth = 2.6;
        for (const sd of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(13, sd * 3);
          ctx.quadraticCurveTo(19, sd * 6, 21, sd * 1);
          ctx.stroke();
        }
      }
    });
  } else if (e.type === 'snail') {
    flash(ctx, { ...e, x: 0, y: 0 }, () => {
      ctx.fillStyle = '#a8d08d';
      ctx.beginPath();
      ctx.ellipse(1, 3, 15, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7aa95c';
      ctx.lineWidth = 2;
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(13, -2);
        ctx.lineTo(17, -8 + sd * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#7aa95c';
      ctx.beginPath();
      ctx.arc(17.5, -8.5, 1.8, 0, Math.PI * 2);
      ctx.arc(15.5, -9.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = e.def.color;
      ctx.beginPath();
      ctx.arc(-3, -3, 11.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9b7bb5';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(-3, -3, 7.4, 0.4, Math.PI * 1.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-3, -3, 3.8, Math.PI * 0.9, Math.PI * 2.4);
      ctx.stroke();
    });
  } else { // wasp
    const hover = Math.sin(time * 9 + e.wobble) * 2.5;
    ctx.translate(0, hover - 3);
    flash(ctx, { ...e, x: 0, y: 0 }, () => {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      const flap = Math.sin(time * 46 + e.wobble) * 0.35;
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(-1, sd * 8, 4.4, 9 + flap * 6, sd * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = e.def.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12.5, 7.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#33302a';
      for (const bx of [-6.5, -0.5, 5]) {
        ctx.fillRect(bx, -7, 3.2, 14);
      }
      ctx.beginPath();
      ctx.moveTo(-12.5, 0);
      ctx.lineTo(-17.5, -1.8);
      ctx.lineTo(-17.5, 1.8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(9.5, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.restore();
  healthBar(ctx, e);
}
