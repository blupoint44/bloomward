// The frame around the garden: the top bar (sunlight, wave, heart, score and
// the pause/speed/sound buttons), the right-hand panel (tower cards, the
// selected tower's upgrade/sell box, the send-wave box) and the hint strip.
// Drawing registers click hotspots into game.ui as it goes.

import { COLORS, LAYOUT, TOWER_DEFS, WAVES_TOTAL, upgradeCost } from './config.js';
import { defByKey, statsOf } from './towers.js';
import { wavePreview } from './waves.js';
import { isMuted } from './audio.js';

const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawSunIcon(ctx, x, y, r) {
  ctx.save();
  ctx.strokeStyle = COLORS.sunDeep;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (r + 1.5), y + Math.sin(a) * (r + 1.5));
    ctx.lineTo(x + Math.cos(a) * (r + 4.5), y + Math.sin(a) * (r + 4.5));
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.sun;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawHeartIcon(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = COLORS.heart;
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.bezierCurveTo(-11, -2, -6, -11, 0, -5.5);
  ctx.bezierCurveTo(6, -11, 11, -2, 0, 7);
  ctx.fill();
  ctx.restore();
}

function drawFlowerIcon(ctx, x, y, def, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (def.key === 'melon') {
    ctx.fillStyle = def.petal;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2f7d3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-4, 0, 9, -1.1, 1.1);
    ctx.arc(4, 0, 9, -1.1, 1.1);
    ctx.stroke();
    return;
  }
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2;
    ctx.fillStyle = def.petal;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 6, 4, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = def.centre;
  ctx.beginPath();
  ctx.arc(0, 0, 5.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function button(ctx, game, { x, y, w, h, label, action, data = null, fill = COLORS.good, textColor = '#ffffff', font = 15, disabled = false }) {
  ctx.save();
  ctx.fillStyle = disabled ? '#b9b3a4' : fill;
  roundRect(ctx, x, y, w, h, 9);
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.font = `700 ${font}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
  if (!disabled) game.ui.push({ x, y, w, h, action, data });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (const word of words) {
    const trial = line ? line + ' ' + word : word;
    if (ctx.measureText(trial).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      lines += 1;
      if (lines >= maxLines) return y + lines * lineHeight;
      line = word;
    } else line = trial;
  }
  if (line) ctx.fillText(line, x, y + lines * lineHeight);
  return y + (lines + 1) * lineHeight;
}

export function drawTopBar(ctx, game) {
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(0, 0, 1280, LAYOUT.topBarHeight);
  ctx.fillStyle = COLORS.panelEdge;
  ctx.fillRect(0, LAYOUT.topBarHeight - 3, 1280, 3);

  drawFlowerIcon(ctx, 40, 38, TOWER_DEFS[1], 1.15);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `800 26px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('BLOOMWARD', 66, 39);

  ctx.font = `700 19px ${FONT}`;
  drawSunIcon(ctx, 316, 38, 10);
  ctx.fillStyle = COLORS.ink;
  ctx.fillText(String(game.sun), 336, 39);
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = `700 13px ${FONT}`;
  ctx.fillText('SUNLIGHT', 336, 60);

  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 19px ${FONT}`;
  ctx.fillText('WAVE ' + game.wave + '/' + WAVES_TOTAL, 452, 39);
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = `700 13px ${FONT}`;
  ctx.fillText(game.state === 'wave' ? 'IN THE GARDEN' : game.state === 'build' ? 'GET PLANTING' : 'THE GARDEN', 452, 60);

  drawHeartIcon(ctx, 640, 36, 1.5);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 19px ${FONT}`;
  ctx.fillText('x ' + game.heart, 658, 39);
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = `700 13px ${FONT}`;
  ctx.fillText('HEARTBLOOM', 658, 60);

  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 19px ${FONT}`;
  ctx.fillText('SCORE ' + game.score.toLocaleString('en-US'), 806, 39);
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = `700 13px ${FONT}`;
  ctx.fillText('BUGS SQUISHED ' + game.stats.kills, 806, 60);

  button(ctx, game, { x: 1092, y: 18, w: 44, h: 42, label: game.paused ? '>' : '||', action: 'pause', fill: '#57755f', font: 16 });
  button(ctx, game, { x: 1144, y: 18, w: 44, h: 42, label: game.speed + 'x', action: 'speed', fill: '#57755f', font: 15 });
  button(ctx, game, { x: 1196, y: 18, w: 44, h: 42, label: isMuted() ? 'X' : '~', action: 'mute', fill: '#57755f', font: 16 });
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = `600 10px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('PAUSE', 1114, 70);
  ctx.fillText('SPEED', 1166, 70);
  ctx.fillText('SOUND', 1218, 70);
  ctx.textAlign = 'left';
}

function drawCard(ctx, game, def, x, y, index) {
  const w = 112;
  const h = 100;
  const selected = game.selectedCard === def.key;
  const afford = game.sun >= def.cost;
  ctx.save();
  ctx.fillStyle = selected ? '#eaf7e2' : '#ffffff';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = selected ? COLORS.good : COLORS.panelEdge;
  ctx.lineWidth = selected ? 3 : 1.4;
  ctx.stroke();
  // Hotkey badge.
  ctx.fillStyle = selected ? COLORS.good : '#9db3a2';
  ctx.beginPath();
  ctx.arc(x + 13, y + 13, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(index + 1), x + 13, y + 13.5);
  drawFlowerIcon(ctx, x + w / 2, y + 34, def, 1.05);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 13px ${FONT}`;
  ctx.fillText(def.name, x + w / 2, y + 62);
  drawSunIcon(ctx, x + w / 2 - 16, y + 82, 6.5);
  ctx.fillStyle = afford ? COLORS.ink : COLORS.bad;
  ctx.font = `800 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(String(def.cost), x + w / 2 - 4, y + 83);
  if (!afford) {
    ctx.fillStyle = 'rgba(255,248,231,0.45)';
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
  }
  ctx.restore();
  game.ui.push({ x, y, w, h, action: 'card', data: def.key });
}

export function drawPanel(ctx, game) {
  const px = LAYOUT.panelX;
  const pw = LAYOUT.panelWidth;
  ctx.fillStyle = COLORS.cream;
  roundRect(ctx, px, LAYOUT.panelY, pw, 576, 12);
  ctx.fill();
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = COLORS.ink;
  ctx.font = `800 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('PLANT A TOWER', px + 16, LAYOUT.panelY + 26);

  const cardY = LAYOUT.panelY + 40;
  TOWER_DEFS.forEach((def, i) => {
    drawCard(ctx, game, def, px + 14 + (i % 2) * 122, cardY + Math.floor(i / 2) * 110, i);
  });

  // Info box: selected tower, selected card, or plain instructions.
  const infoY = cardY + 226;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, px + 14, infoY, pw - 28, 118, 10);
  ctx.fill();
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = COLORS.ink;
  if (game.selectedTower) {
    const t = game.selectedTower;
    const stats = statsOf(t);
    ctx.font = `800 15px ${FONT}`;
    ctx.fillText(t.def.name + '  ·  Lv ' + t.level, px + 26, infoY + 24);
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = COLORS.inkSoft;
    ctx.fillText('Damage ' + stats.damage + ' · Range ' + stats.range, px + 26, infoY + 46);
    ctx.fillText('A shot every ' + stats.cooldown.toFixed(2) + 's · ' + t.shots + ' shots fired', px + 26, infoY + 64);
    const upCost = t.level < 3 ? upgradeCost(t.def, t.level) : null;
    button(ctx, game, {
      x: px + 26, y: infoY + 76, w: 102, h: 32, font: 13,
      label: upCost === null ? 'MAX LEVEL' : 'Upgrade ' + upCost, action: 'upgrade',
      fill: COLORS.sun, textColor: COLORS.ink, disabled: upCost === null || game.sun < upCost,
    });
    button(ctx, game, {
      x: px + 134, y: infoY + 76, w: 102, h: 32, font: 13,
      label: 'Sell +' + Math.round(t.invested * 0.7), action: 'sell', fill: '#e8b4b8', textColor: COLORS.ink,
    });
  } else if (game.selectedCard) {
    const def = defByKey(game.selectedCard);
    ctx.font = `800 15px ${FONT}`;
    ctx.fillText(def.name + '  ·  ' + def.cost + ' sunlight', px + 26, infoY + 24);
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = COLORS.inkSoft;
    wrapText(ctx, def.blurb + '. Click a lawn tile to plant it; right-click or Esc to put it back.', px + 26, infoY + 46, pw - 52, 17, 3);
    const stats = statsOf({ def, level: 1 });
    ctx.fillText('Damage ' + stats.damage + ' · Range ' + stats.range + ' · every ' + stats.cooldown.toFixed(2) + 's', px + 26, infoY + 100);
  } else {
    ctx.font = `700 13.5px ${FONT}`;
    ctx.fillStyle = COLORS.inkSoft;
    wrapText(ctx, 'Pick a flower above (or press 1-4), then click a lawn tile to plant it. Click a planted flower to upgrade or sell it.', px + 26, infoY + 26, pw - 52, 18, 4);
  }

  // Wave box.
  const waveY = infoY + 132;
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.beginPath();
  ctx.moveTo(px + 16, waveY);
  ctx.lineTo(px + pw - 16, waveY);
  ctx.stroke();
  if (game.state === 'build' && game.wave < WAVES_TOTAL) {
    ctx.fillStyle = COLORS.ink;
    ctx.font = `800 14px ${FONT}`;
    ctx.fillText('NEXT: WAVE ' + (game.wave + 1) + ' OF ' + WAVES_TOTAL, px + 16, waveY + 24);
    ctx.font = `600 12.5px ${FONT}`;
    ctx.fillStyle = COLORS.inkSoft;
    wrapText(ctx, wavePreview(game.wave + 1), px + 16, waveY + 44, pw - 32, 16, 2);
    button(ctx, game, { x: px + 16, y: waveY + 76, w: pw - 32, h: 44, label: 'SEND WAVE ' + (game.wave + 1), action: 'sendWave', fill: COLORS.good, font: 17 });
  } else if (game.state === 'wave') {
    ctx.fillStyle = COLORS.ink;
    ctx.font = `800 14px ${FONT}`;
    ctx.fillText('WAVE ' + game.wave + ' IN THE GARDEN', px + 16, waveY + 24);
    ctx.font = `600 12.5px ${FONT}`;
    ctx.fillStyle = COLORS.inkSoft;
    ctx.fillText('Stopped ' + game.waveBugsDone + ' of ' + game.waveBugsTotal + ' bugs', px + 16, waveY + 46);
    ctx.fillText('Marching: ' + game.enemies.length + ' · still coming: ' + game.spawnQueue.length, px + 16, waveY + 64);
    const frac = game.waveBugsTotal ? game.waveBugsDone / game.waveBugsTotal : 0;
    ctx.fillStyle = '#e4d5ac';
    roundRect(ctx, px + 16, waveY + 78, pw - 32, 12, 6);
    ctx.fill();
    ctx.fillStyle = COLORS.good;
    roundRect(ctx, px + 16, waveY + 78, (pw - 32) * frac, 12, 6);
    ctx.fill();
  } else {
    ctx.fillStyle = COLORS.ink;
    ctx.font = `800 14px ${FONT}`;
    ctx.fillText(game.state === 'won' ? 'THE GARDEN BLOOMS' : game.state === 'lost' ? 'THE GARDEN FELL' : 'BLOOMWARD', px + 16, waveY + 24);
    ctx.font = `600 12.5px ${FONT}`;
    ctx.fillStyle = COLORS.inkSoft;
    ctx.fillText('Score ' + game.score.toLocaleString('en-US') + ' · ' + game.stats.kills + ' bugs squished', px + 16, waveY + 46);
  }
}

export function drawHints(ctx, game) {
  ctx.fillStyle = 'rgba(255,248,231,0.92)';
  ctx.font = `600 14px ${FONT}`;
  ctx.textAlign = 'center';
  let text = '1-4 pick a flower · Click the lawn to plant · Space sends the wave · F fast · P pause · M sound';
  if (game.state === 'title') text = 'An original garden tower defense · 12 waves · 4 flowers · 5 very hungry bugs';
  else if (game.state === 'won' || game.state === 'lost') text = 'Press R or the button to garden again';
  else if (game.selectedTower) text = 'Upgrade for harder hits · Sell returns 70% of what you spent';
  else if (game.selectedCard) text = 'Green ring: in range · Red: bugs already nibbled there, or a rock · Esc puts the flower back';
  ctx.fillText(text, 500, 700);
  ctx.textAlign = 'left';
}
