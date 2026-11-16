// Full-screen moments: the title card, the victory and defeat cards, the
// pause veil and the sliding wave banner. Each states the game's loop at a
// glance, which is what the screenshots are for.

import { COLORS, WAVES_TOTAL } from './config.js';
import { roundRect, drawSunIcon, drawHeartIcon } from './hud.js';
import { TOWER_DEFS } from './config.js';

const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

function veil(ctx) {
  ctx.fillStyle = 'rgba(34,56,38,0.52)';
  ctx.fillRect(0, 0, 1280, 720);
}

function panel(ctx, w, h) {
  const x = (1280 - w) / 2;
  const y = (720 - h) / 2;
  ctx.fillStyle = COLORS.cream;
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  return { x, y, w, h };
}

function bigFlower(ctx, x, y, def, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    ctx.fillStyle = def.petal;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 15, Math.sin(a) * 15, 11, 7, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = def.centre;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function actionButton(ctx, game, x, y, w, h, label, action) {
  ctx.fillStyle = COLORS.good;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 20px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  game.ui.push({ x, y, w, h, action, data: null });
}

export function drawTitle(ctx, game) {
  veil(ctx);
  const p = panel(ctx, 800, 492);
  bigFlower(ctx, 640, p.y + 74, TOWER_DEFS[1], 1.5);
  bigFlower(ctx, 566, p.y + 84, TOWER_DEFS[0], 1.0);
  bigFlower(ctx, 716, p.y + 84, TOWER_DEFS[3], 1.0);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `800 62px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('BLOOMWARD', 640, p.y + 168);
  ctx.font = `600 18.5px ${FONT}`;
  ctx.fillStyle = COLORS.inkSoft;
  ctx.fillText('Grow a living wall of flowers. Stop the bug parade before it nibbles the Heartbloom.', 640, p.y + 202);

  ctx.textAlign = 'left';
  ctx.font = `600 16.5px ${FONT}`;
  ctx.fillStyle = COLORS.ink;
  const lines = [
    'Plant flower towers on the lawn - squished bugs pay back sunlight for more flowers.',
    'Bugs march the sandy path to the Heartbloom. Lose all 20 hearts and the garden falls.',
    'Survive all ' + WAVES_TOTAL + ' waves: upgrade your best flowers, chill the fast ones, splash the crowds.',
  ];
  lines.forEach((line, i) => {
    drawSunIcon(ctx, p.x + 58, p.y + 240 + i * 30, 6);
    ctx.fillText(line, p.x + 78, p.y + 246 + i * 30);
  });

  ctx.textAlign = 'center';
  ctx.font = `600 14.5px ${FONT}`;
  ctx.fillStyle = COLORS.inkSoft;
  ctx.fillText('Mouse: plant & select · Keys 1-4: pick a flower · Space: send wave · F: fast · P: pause · M: sound', 640, p.y + 356);
  actionButton(ctx, game, 640 - 130, p.y + 384, 260, 56, 'START GARDENING', 'start');
  ctx.font = `600 13.5px ${FONT}`;
  ctx.fillStyle = COLORS.inkSoft;
  ctx.fillText('or press Enter', 640, p.y + 468);
  ctx.textAlign = 'left';
}

function statRow(ctx, label, value, x, y, w) {
  ctx.font = `600 16px ${FONT}`;
  ctx.fillStyle = COLORS.inkSoft;
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y);
  ctx.font = `800 17px ${FONT}`;
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = 'right';
  ctx.fillText(value, x + w, y);
  ctx.textAlign = 'left';
}

export function drawEnd(ctx, game) {
  const won = game.state === 'won';
  veil(ctx);
  const p = panel(ctx, 720, 470);
  bigFlower(ctx, 640, p.y + 70, won ? TOWER_DEFS[0] : TOWER_DEFS[2], 1.4);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `800 44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(won ? 'THE GARDEN BLOOMS!' : 'THE BUGS GOT IN...', 640, p.y + 148);
  ctx.font = `600 17px ${FONT}`;
  ctx.fillStyle = COLORS.inkSoft;
  ctx.fillText(
    won
      ? 'All ' + WAVES_TOTAL + ' waves turned back, and the Heartbloom stands tall.'
      : 'The Heartbloom was nibbled to a stem during wave ' + game.wave + '.',
    640, p.y + 182,
  );
  ctx.fillStyle = COLORS.sunDeep;
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText(game.score.toLocaleString('en-US'), 640, p.y + 240);
  ctx.font = `700 13px ${FONT}`;
  ctx.fillStyle = COLORS.inkSoft;
  ctx.fillText('FINAL SCORE', 640, p.y + 262);

  const rx = 640 - 210;
  statRow(ctx, 'Waves cleared', String(won ? WAVES_TOTAL : Math.max(0, game.wave - 1)) + ' of ' + WAVES_TOTAL, rx, p.y + 302, 420);
  statRow(ctx, 'Bugs squished', String(game.stats.kills), rx, p.y + 330, 420);
  statRow(ctx, 'Sunlight earned', String(game.stats.earned), rx, p.y + 358, 420);
  if (won) statRow(ctx, 'Heart bonus', game.heart + ' hearts x 120', rx, p.y + 386, 420);

  actionButton(ctx, game, 640 - 120, p.y + (won ? 402 : 388), 240, 52, 'GARDEN AGAIN', 'again');
  ctx.textAlign = 'left';
}

export function drawPause(ctx) {
  veil(ctx);
  ctx.fillStyle = COLORS.cream;
  ctx.font = `800 40px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', 640, 348);
  ctx.font = `600 17px ${FONT}`;
  ctx.fillText('Press P to keep gardening', 640, 382);
  ctx.textAlign = 'left';
}

export function drawBanner(ctx, game) {
  const b = game.banner;
  if (!b) return;
  const fadeIn = Math.min(1, b.t / 0.22);
  const fadeOut = Math.min(1, (b.life - b.t) / 0.4);
  const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
  const y = 108 + (1 - fadeIn) * -14;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `800 27px ${FONT}`;
  const tw = Math.max(ctx.measureText(b.title).width, 240);
  ctx.font = `600 14.5px ${FONT}`;
  const sw = ctx.measureText(b.sub).width;
  const w = Math.max(tw, sw) + 64;
  const x = 500 - w / 2;
  ctx.fillStyle = 'rgba(38,77,46,0.94)';
  roundRect(ctx, x, y, w, 66, 14);
  ctx.fill();
  ctx.fillStyle = COLORS.cream;
  ctx.font = `800 26px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(b.title, 500, y + 31);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = `600 14px ${FONT}`;
  ctx.fillText(b.sub, 500, y + 54);
  ctx.restore();
  ctx.textAlign = 'left';
}
