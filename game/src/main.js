// BLOOMWARD bootstrap: build the game, wire input, and either run the live
// loop, stage a screenshot scene (?shot=start|play|siege|end&seed=1), or
// expose the test hooks (?test=1) the maker's headless checks drive.

import { Game } from './game.js';
import { drawGame } from './render.js';
import { bindInput } from './input.js';
import { stageShot, simulateMatch } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') || '1', 10);
const game = new Game(Number.isFinite(seedParam) && seedParam > 0 ? seedParam : 1);
window.__game = game;
bindInput(canvas, game);

const shotName = params.get('shot');
if (shotName) {
  stageShot(shotName, game);
  drawGame(ctx, game);
  window.__shotReady = true;
} else {
  if (params.get('test')) {
    window.__TEST__ = {
      state: () => ({
        state: game.state, wave: game.wave, sun: game.sun, heart: game.heart,
        score: game.score, kills: game.stats.kills,
        towers: game.towers.length, enemies: game.enemies.length,
      }),
      simulate: () => simulateMatch(game),
      restart: () => { game.startGame(); return game.state; },
    };
  }
  let last = performance.now();
  let statusT = 0;
  const frame = (now) => {
    const dt = Math.min(0.05, Math.max(0.0005, (now - last) / 1000));
    last = now;
    game.update(dt);
    drawGame(ctx, game);
    statusT += dt;
    if (status && statusT > 0.6) {
      statusT = 0;
      status.textContent = 'Bloomward: wave ' + game.wave + ' of 12, sunlight ' + game.sun
        + ', Heartbloom ' + game.heart + ' hearts, score ' + game.score + '.';
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
