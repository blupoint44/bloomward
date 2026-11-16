// Scene composition: garden, Heartbloom, bugs, towers, projectiles and
// effects, then the HUD frame, banner and any full-screen card. Also the
// placement ghost and selection ring, which are pure feedback.

import { COLORS, LAYOUT, START_HEART } from './config.js';
import { drawGarden, drawHeartbloom, tileCenter } from './garden.js';
import { drawEnemy } from './enemies.js';
import { drawTower, drawRangeRing, statsOf, defByKey, makeTower } from './towers.js';
import { drawProjectile } from './projectiles.js';
import { drawEffects } from './effects.js';
import { drawTopBar, drawPanel, drawHints } from './hud.js';
import { drawTitle, drawEnd, drawPause, drawBanner } from './screens.js';

export function drawGame(ctx, game) {
  game.ui = [];
  ctx.fillStyle = '#2c5d3a';
  ctx.fillRect(0, 0, 1280, 720);

  ctx.save();
  if (game.shakeT > 0) {
    const m = game.shakeMag * Math.max(0, game.shakeT / 0.32);
    ctx.translate(Math.sin(game.time * 91) * m, Math.cos(game.time * 83) * m * 0.7);
  }
  // Garden frame shadow.
  ctx.fillStyle = 'rgba(20,40,24,0.35)';
  ctx.fillRect(LAYOUT.gardenX - 6, LAYOUT.gardenY - 6, LAYOUT.cols * LAYOUT.tile + 12, LAYOUT.rows * LAYOUT.tile + 12);
  drawGarden(ctx, game.garden, game.time);
  drawHeartbloom(ctx, game.garden, game.time, game.heart, START_HEART);

  const playing = game.state === 'build' || game.state === 'wave';
  // Selection ring under the chosen tower.
  if (playing && game.selectedTower) {
    const t = game.selectedTower;
    drawRangeRing(ctx, t.x, t.y, statsOf(t).range, true);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 24, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Placement ghost.
  if (playing && !game.paused && game.selectedCard) {
    const tile = game.hoverTile();
    if (tile) {
      const def = defByKey(game.selectedCard);
      const { x, y } = tileCenter(tile.c, tile.r);
      const ok = game.canPlace(tile.c, tile.r) && game.sun >= def.cost;
      ctx.fillStyle = ok ? 'rgba(255,255,255,0.3)' : 'rgba(224,82,82,0.35)';
      ctx.fillRect(LAYOUT.gardenX + tile.c * LAYOUT.tile + 2, LAYOUT.gardenY + tile.r * LAYOUT.tile + 2, LAYOUT.tile - 4, LAYOUT.tile - 4);
      drawRangeRing(ctx, x, y, def.range, ok);
      ctx.save();
      ctx.globalAlpha = 0.6;
      const ghost = makeTower(def.key, tile.c, tile.r);
      ghost.popT = 1;
      drawTower(ctx, ghost, game.time);
      ctx.restore();
    }
  }

  for (const e of game.enemies) drawEnemy(ctx, e, game.time);
  for (const t of game.towers) drawTower(ctx, t, game.time);
  for (const p of game.projectiles) drawProjectile(ctx, p);
  drawEffects(ctx, game);

  if (game.flashRed > 0) {
    ctx.fillStyle = `rgba(224,60,60,${(game.flashRed * 0.32).toFixed(3)})`;
    ctx.fillRect(LAYOUT.gardenX, LAYOUT.gardenY, LAYOUT.cols * LAYOUT.tile, LAYOUT.rows * LAYOUT.tile);
  }
  ctx.restore();

  drawTopBar(ctx, game);
  drawPanel(ctx, game);
  drawHints(ctx, game);
  drawBanner(ctx, game);

  if (game.state === 'title') drawTitle(ctx, game);
  else if (game.state === 'won' || game.state === 'lost') drawEnd(ctx, game);
  else if (game.paused) drawPause(ctx);
}
