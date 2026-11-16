// Juice: particles, splash rings, projectile trails, floating score text and
// muzzle puffs. Everything is a plain record in a game array, updated with
// the world and drawn over it; nothing here touches game rules.

export function spawnBurst(game, x, y, colors, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = game.rng.range(0, Math.PI * 2);
    const v = game.rng.range(speed * 0.3, speed);
    game.particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 30,
      t: 0,
      life: game.rng.range(0.3, 0.65),
      size: game.rng.range(2, 4.6),
      color: game.rng.pick(colors),
      spin: game.rng.range(-6, 6),
      rot: game.rng.range(0, Math.PI * 2),
    });
  }
}

export function spawnMuzzle(game, tower, target) {
  const a = Math.atan2(target.y - tower.y, target.x - tower.x);
  game.particles.push({
    x: tower.x + Math.cos(a) * 14,
    y: tower.y - 8 + Math.sin(a) * 14,
    vx: Math.cos(a) * 30,
    vy: Math.sin(a) * 30,
    t: 0, life: 0.14, size: 5.5, color: '#ffffff', spin: 0, rot: 0,
  });
}

export function spawnFloater(game, x, y, text, color) {
  game.floaters.push({ x, y, text, color, t: 0, life: 1.05 });
}

export function updateEffects(game, dt) {
  for (const p of game.particles) {
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 260 * dt;
    p.rot += p.spin * dt;
  }
  game.particles = game.particles.filter((p) => p.t < p.life);
  for (const r of game.rings) {
    r.t += dt;
    r.r = r.maxR * (r.t / r.life);
  }
  game.rings = game.rings.filter((r) => r.t < r.life);
  for (const s of game.trail) s.t += dt;
  game.trail = game.trail.filter((s) => s.t < s.life);
  for (const f of game.floaters) {
    f.t += dt;
    f.y -= 34 * dt;
  }
  game.floaters = game.floaters.filter((f) => f.t < f.life);
}

export function drawEffects(ctx, game) {
  // Projectile trails (under everything else here).
  for (const s of game.trail) {
    const a = 1 - s.t / s.life;
    ctx.fillStyle = `rgba(${s.color},${0.35 * a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3 * a + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  // Splash rings.
  for (const r of game.rings) {
    const a = 1 - r.t / r.life;
    ctx.strokeStyle = `rgba(${r.color},${0.75 * a})`;
    ctx.lineWidth = 3.4 * a + 0.6;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Particles: little petals and sparks.
  for (const p of game.particles) {
    const a = 1 - p.t / p.life;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Floating texts.
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '700 15px "Trebuchet MS", "Segoe UI", sans-serif';
  for (const f of game.floaters) {
    const a = f.t < 0.7 ? 1 : 1 - (f.t - 0.7) / (f.life - 0.7);
    ctx.globalAlpha = Math.max(0, a);
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = 'rgba(46,70,52,0.85)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}
