// BLOOMWARD's rules and state. The Game owns the economy (sunlight, heart,
// score), the state machine (title -> build -> wave -> won/lost), placement,
// upgrades and selling, and the per-frame world step that drives towers,
// bugs, projectiles and effects. Rendering and input live elsewhere; they
// call into here.

import { Garden, tileAt } from './garden.js';
import { makeRng } from './random.js';
import {
  START_SUN, START_HEART, WAVES_TOTAL, waveHpScale, waveClearBonus, upgradeCost,
} from './config.js';
import { spawnEnemy, updateEnemies } from './enemies.js';
import { makeTower, updateTowers, defByKey } from './towers.js';
import { updateProjectiles } from './projectiles.js';
import { updateEffects, spawnBurst, spawnFloater } from './effects.js';
import { buildSpawnQueue, WAVE_TABLE } from './waves.js';
import { sfx, setMuted, isMuted } from './audio.js';

export class Game {
  constructor(seed = 1) {
    this.seed = seed;
    this.mouse = { x: 0, y: 0 };
    this.ui = [];
    this.reset();
    this.state = 'title';
  }

  reset() {
    this.rng = makeRng(this.seed);
    this.garden = new Garden(this.seed);
    this.state = 'build';
    this.paused = false;
    this.speed = 1;
    this.time = 0;
    this.sun = START_SUN;
    this.heart = START_HEART;
    this.score = 0;
    this.wave = 0;
    this.waveBugsTotal = 0;
    this.waveBugsDone = 0;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.rings = [];
    this.trail = [];
    this.floaters = [];
    this.spawnQueue = [];
    this.waveT = 0;
    this.freezeWaveEnd = false;
    this.selectedCard = null;
    this.selectedTower = null;
    this.banner = null;
    this.shakeT = 0;
    this.shakeMag = 0;
    this.flashRed = 0;
    this.confettiT = 0;
    this.stats = { kills: 0, earned: 0, leaked: 0 };
  }

  startGame() {
    this.reset();
    this.banner = { title: 'WAVE 1 WHEN READY', sub: 'Plant flowers, then send the wave', t: 0, life: 2.4 };
  }

  // ---- waves ------------------------------------------------------------

  sendWave() {
    if (this.state !== 'build' || this.wave >= WAVES_TOTAL) return;
    this.wave += 1;
    this.spawnQueue = buildSpawnQueue(this.wave);
    this.waveBugsTotal = this.spawnQueue.length;
    this.waveBugsDone = 0;
    this.waveT = 0;
    this.state = 'wave';
    this.selectedTower = null;
    this.banner = { title: 'WAVE ' + this.wave, sub: WAVE_TABLE[this.wave - 1].name, t: 0, life: 2.2 };
    sfx.wave();
  }

  waveCleared() {
    const bonus = waveClearBonus(this.wave) + Math.min(12, Math.floor(this.sun * 0.08));
    this.sun += bonus;
    this.stats.earned += bonus;
    this.score += 25 * this.wave;
    spawnFloater(this, 500, 300, '+' + bonus + ' sunlight', '#ffb52e');
    sfx.sun();
    if (this.wave >= WAVES_TOTAL) {
      this.score += this.heart * 120 + 500;
      this.state = 'won';
      this.banner = null;
      for (let i = 0; i < 5; i += 1) {
        spawnBurst(this, this.rng.range(150, 850), this.rng.range(140, 420),
          ['#ff6b9d', '#ffd93d', '#3ec6ba', '#ff9f2e', '#e63950'], 22, 260);
      }
      sfx.win();
    } else {
      this.state = 'build';
      this.banner = { title: 'WAVE ' + this.wave + ' CLEARED', sub: '+' + bonus + ' sunlight banked', t: 0, life: 2.0 };
    }
  }

  // ---- combat outcomes ----------------------------------------------------

  damageEnemy(enemy, amount) {
    if (!enemy.alive) return;
    enemy.hp -= amount;
    enemy.flashT = 0.09;
    if (enemy.hp <= 0) {
      enemy.alive = false;
      this.stats.kills += 1;
      this.waveBugsDone += 1;
      this.sun += enemy.def.bounty;
      this.stats.earned += enemy.def.bounty;
      this.score += enemy.def.bounty * 5;
      spawnBurst(this, enemy.x, enemy.y, [enemy.def.color, '#b5e48c', '#ffffff'], 9, 130);
      spawnFloater(this, enemy.x, enemy.y - 14, '+' + enemy.def.bounty, '#ffb52e');
      sfx.die();
    }
  }

  onEnemyLeaked(enemy) {
    this.waveBugsDone += 1;
    this.stats.leaked += 1;
    this.heart -= enemy.def.heartDamage;
    this.shake(0.32, 5);
    this.flashRed = 0.4;
    const heartPos = this.garden.pointAt(this.garden.totalLength);
    spawnBurst(this, heartPos.x - 10, heartPos.y, ['#ef476f', '#ffd93d'], 12, 150);
    sfx.hurt();
    if (this.heart <= 0) {
      this.heart = 0;
      this.state = 'lost';
      sfx.lose();
    }
  }

  shake(seconds, magnitude) {
    this.shakeT = Math.max(this.shakeT, seconds);
    this.shakeMag = magnitude;
  }

  // ---- building -----------------------------------------------------------

  towerAt(c, r) {
    return this.towers.find((t) => t.c === c && t.r === r) || null;
  }

  canPlace(c, r) {
    return this.garden.isFree(c, r) && !this.towerAt(c, r);
  }

  tryPlace(c, r) {
    if (!this.selectedCard) return;
    const def = defByKey(this.selectedCard);
    if (!this.canPlace(c, r)) { sfx.error(); return; }
    if (this.sun < def.cost) {
      sfx.error();
      spawnFloater(this, this.mouse.x, this.mouse.y - 16, 'Need ' + def.cost + ' sunlight', '#e05252');
      return;
    }
    this.sun -= def.cost;
    const tower = makeTower(def.key, c, r);
    this.towers.push(tower);
    this.selectedTower = tower;
    spawnBurst(this, tower.x, tower.y + 10, ['#c9a86a', '#8a6a3a'], 7, 80);
    sfx.place();
  }

  /** Placement without the economy, for screenshot scenes and the test. */
  debugPlace(key, c, r, level = 1) {
    const tower = makeTower(key, c, r);
    tower.level = level;
    tower.popT = 1;
    let invested = tower.def.cost;
    if (level >= 2) invested += upgradeCost(tower.def, 1);
    if (level >= 3) invested += upgradeCost(tower.def, 2);
    tower.invested = invested;
    this.towers.push(tower);
    return tower;
  }

  /** Spawn a bug already part-way down the path (scenes and tests). */
  debugSpawn(type, dist) {
    const enemy = spawnEnemy(this, type, waveHpScale(Math.max(1, this.wave)));
    enemy.dist = dist;
    const p = this.garden.pointAt(dist);
    enemy.x = p.x;
    enemy.y = p.y;
    this.enemies.push(enemy);
    return enemy;
  }

  upgradeSelected() {
    const t = this.selectedTower;
    if (!t || t.level >= 3) return;
    const cost = upgradeCost(t.def, t.level);
    if (this.sun < cost) { sfx.error(); return; }
    this.sun -= cost;
    t.invested += cost;
    t.level += 1;
    spawnBurst(this, t.x, t.y - 8, ['#ffd93d', '#ffffff'], 12, 120);
    sfx.upgrade();
  }

  sellSelected() {
    const t = this.selectedTower;
    if (!t) return;
    const refund = Math.round(t.invested * 0.7);
    this.sun += refund;
    spawnFloater(this, t.x, t.y - 18, '+' + refund, '#ffb52e');
    this.towers = this.towers.filter((x) => x !== t);
    this.selectedTower = null;
    sfx.sun();
  }

  // ---- input --------------------------------------------------------------

  cancelSelection() {
    this.selectedCard = null;
    this.selectedTower = null;
  }

  uiAction(action, data) {
    if (action === 'start' || action === 'again') this.startGame();
    else if (action === 'card') {
      this.selectedCard = this.selectedCard === data ? null : data;
      this.selectedTower = null;
    } else if (action === 'sendWave') this.sendWave();
    else if (action === 'upgrade') this.upgradeSelected();
    else if (action === 'sell') this.sellSelected();
    else if (action === 'pause') this.paused = !this.paused;
    else if (action === 'speed') this.speed = this.speed === 1 ? 2 : 1;
    else if (action === 'mute') setMuted(!isMuted());
  }

  handleClick(x, y) {
    for (let i = this.ui.length - 1; i >= 0; i -= 1) {
      const h = this.ui[i];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
        this.uiAction(h.action, h.data);
        return;
      }
    }
    if (this.state !== 'build' && this.state !== 'wave') return;
    if (this.paused) return;
    const tile = tileAt(x, y);
    if (!tile) { this.cancelSelection(); return; }
    const tower = this.towerAt(tile.c, tile.r);
    if (tower) {
      this.selectedTower = tower;
      this.selectedCard = null;
      return;
    }
    if (this.selectedCard) this.tryPlace(tile.c, tile.r);
    else this.selectedTower = null;
  }

  handleKey(code) {
    if (this.state === 'title') {
      if (code === 'Enter' || code === 'Space') this.startGame();
      return;
    }
    if (this.state === 'won' || this.state === 'lost') {
      if (code === 'KeyR' || code === 'Enter') this.startGame();
      return;
    }
    if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3' || code === 'Digit4') {
      const defs = ['poppy', 'rose', 'mint', 'melon'];
      this.selectedCard = defs[Number(code.slice(-1)) - 1];
      this.selectedTower = null;
    } else if (code === 'Escape') this.cancelSelection();
    else if (code === 'Space') this.sendWave();
    else if (code === 'KeyP') this.paused = !this.paused;
    else if (code === 'KeyF') this.speed = this.speed === 1 ? 2 : 1;
    else if (code === 'KeyM') setMuted(!isMuted());
  }

  hoverTile() {
    return tileAt(this.mouse.x, this.mouse.y);
  }

  // ---- the world step -------------------------------------------------------

  stepWorld(dt) {
    if (this.state === 'wave') {
      this.waveT += dt;
      while (this.spawnQueue.length > 0 && this.spawnQueue[0].at <= this.waveT) {
        const next = this.spawnQueue.shift();
        this.enemies.push(spawnEnemy(this, next.type, waveHpScale(this.wave)));
      }
    }
    updateTowers(this, dt);
    updateEnemies(this, dt);
    updateProjectiles(this, dt);
    this.enemies = this.enemies.filter((e) => e.alive);
    if (this.state === 'wave' && !this.freezeWaveEnd && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.waveCleared();
    }
  }

  update(dt) {
    this.time += dt;
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.life) this.banner = null;
    }
    if (this.shakeT > 0) this.shakeT -= dt;
    if (this.flashRed > 0) this.flashRed -= dt * 1.6;
    updateEffects(this, dt);
    if (this.state === 'won') {
      this.confettiT -= dt;
      if (this.confettiT <= 0) {
        this.confettiT = 0.5;
        spawnBurst(this, this.rng.range(120, 880), this.rng.range(110, 200),
          ['#ff6b9d', '#ffd93d', '#3ec6ba', '#ff9f2e'], 10, 170);
      }
    }
    if (this.paused) return;
    if (this.state === 'build' || this.state === 'wave') {
      let remaining = dt * this.speed;
      while (remaining > 0) {
        const step = Math.min(remaining, 1 / 30);
        this.stepWorld(step);
        remaining -= step;
        if (this.state !== 'build' && this.state !== 'wave') break;
      }
    }
  }
}
