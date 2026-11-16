// Screenshot scenes behind ?shot=start|play|siege|end, plus the autopilot
// the headless test uses to play a whole match. Scenes are staged with the
// game's own rules (real towers, real bugs, fixed steps of the real world
// step), so every screenshot is a frame the game itself produced.

import { upgradeCost } from './config.js';
import { defByKey } from './towers.js';
import { spawnBurst } from './effects.js';

function step(game, seconds) {
  const n = Math.round(seconds / 0.05);
  for (let i = 0; i < n; i += 1) game.stepWorld(0.05);
}

export function stageShot(name, game) {
  game.reset();
  game.freezeWaveEnd = true;
  if (name === 'play') {
    game.debugPlace('poppy', 6, 3);
    game.debugPlace('rose', 12, 3, 2);
    game.debugPlace('mint', 5, 6);
    game.debugPlace('poppy', 10, 6);
    game.debugPlace('melon', 14, 8);
    game.wave = 3;
    game.state = 'wave';
    game.sun = 85;
    game.score = 640;
    game.heart = 18;
    game.stats.kills = 23;
    game.stats.earned = 210;
    game.waveBugsTotal = 20;
    game.waveBugsDone = 4;
    game.debugSpawn('snail', 150);
    game.debugSpawn('aphid', 320);
    game.debugSpawn('aphid', 395);
    game.debugSpawn('beetle', 690);
    game.debugSpawn('wasp', 905);
    game.debugSpawn('aphid', 1080);
    game.debugSpawn('beetle', 1260);
    game.debugSpawn('aphid', 1470);
    game.debugSpawn('snail', 1690);
    game.debugSpawn('wasp', 1900);
    step(game, 2.6);
  } else if (name === 'siege') {
    game.debugPlace('poppy', 6, 3, 2);
    game.debugPlace('rose', 12, 3, 3);
    game.debugPlace('mint', 5, 6, 2);
    game.debugPlace('melon', 10, 6, 2);
    game.debugPlace('poppy', 14, 8);
    game.debugPlace('rose', 16, 6, 2);
    game.debugPlace('melon', 7, 9);
    game.debugPlace('mint', 12, 10);
    game.wave = 9;
    game.state = 'wave';
    game.sun = 140;
    game.score = 5210;
    game.heart = 14;
    game.stats.kills = 148;
    game.stats.earned = 1240;
    game.waveBugsTotal = 34;
    game.waveBugsDone = 19;
    game.debugSpawn('snail', 240);
    game.debugSpawn('beetle', 380);
    game.debugSpawn('brute', 520);
    game.debugSpawn('aphid', 600);
    game.debugSpawn('aphid', 655);
    game.debugSpawn('beetle', 690);
    game.debugSpawn('aphid', 720);
    game.debugSpawn('beetle', 830);
    game.debugSpawn('wasp', 940);
    game.debugSpawn('wasp', 1030);
    game.debugSpawn('beetle', 1080);
    step(game, 5);
    game.banner = { title: 'WAVE 9', sub: 'Everything at once', t: 1.1, life: 99 };
  } else if (name === 'end') {
    game.debugPlace('poppy', 6, 3, 2);
    game.debugPlace('rose', 12, 3, 3);
    game.debugPlace('mint', 5, 6, 2);
    game.debugPlace('melon', 10, 6, 3);
    game.debugPlace('poppy', 14, 8, 2);
    game.debugPlace('rose', 16, 6, 2);
    game.debugPlace('melon', 7, 9, 2);
    game.debugPlace('mint', 12, 10, 2);
    game.debugPlace('poppy', 3, 3);
    game.wave = 12;
    game.state = 'won';
    game.sun = 235;
    game.score = 9875;
    game.heart = 9;
    game.stats.kills = 231;
    game.stats.earned = 2210;
    for (let i = 0; i < 6; i += 1) {
      spawnBurst(game, 140 + i * 150, 150 + (i % 3) * 90,
        ['#ff6b9d', '#ffd93d', '#3ec6ba', '#ff9f2e', '#e63950'], 16, 240);
    }
  } else {
    game.debugPlace('poppy', 6, 3);
    game.debugPlace('rose', 12, 3, 2);
    game.debugPlace('melon', 14, 8);
    game.state = 'title';
    game.time = 2.3;
  }
}

/**
 * Play a full match with a fixed planting plan and greedy upgrades; used by
 * the headless smoke test to prove the whole loop (economy, targeting,
 * waves, win or lose, restart) works end to end. Returns a summary.
 */
export function simulateMatch(game) {
  const plan = [
    ['poppy', 6, 3], ['rose', 12, 3], ['mint', 5, 6], ['melon', 10, 6],
    ['poppy', 14, 8], ['rose', 16, 6], ['mint', 12, 10], ['melon', 7, 9],
    ['poppy', 3, 3], ['rose', 8, 1], ['poppy', 17, 4],
  ];
  game.startGame();
  const placed = new Set();
  let steps = 0;
  while ((game.state === 'build' || game.state === 'wave') && steps < 80000) {
    if (game.state === 'build') {
      let acted = true;
      while (acted) {
        acted = false;
        for (const [key, c, r] of plan) {
          const id = key + ':' + c + ',' + r;
          if (placed.has(id)) continue;
          const def = defByKey(key);
          if (game.sun >= def.cost && game.canPlace(c, r)) {
            game.selectedCard = key;
            game.tryPlace(c, r);
            placed.add(id);
            acted = true;
          }
        }
        const up = game.towers.find((t) => t.level < 3 && game.sun >= upgradeCost(t.def, t.level) + 30);
        if (up) {
          game.selectedTower = up;
          game.upgradeSelected();
          acted = true;
        }
      }
      game.selectedCard = null;
      game.sendWave();
    }
    game.stepWorld(0.05);
    steps += 1;
  }
  return {
    state: game.state, wave: game.wave, kills: game.stats.kills,
    leaked: game.stats.leaked, heart: game.heart, score: game.score,
    sun: game.sun, towers: game.towers.length, steps,
  };
}
