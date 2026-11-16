// Pointer and keyboard wiring. The canvas is fixed at 1280x720 logical
// pixels and CSS-scaled to the window, so every event is converted back to
// logical coordinates here. All game decisions happen in game.js; this file
// only translates DOM events into game calls.

import { VIEW } from './config.js';
import { unlockAudio } from './audio.js';

export function bindInput(canvas, game) {
  const toLogical = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW.width,
      y: ((event.clientY - rect.top) / rect.height) * VIEW.height,
    };
  };

  canvas.addEventListener('pointermove', (event) => {
    const p = toLogical(event);
    game.mouse.x = p.x;
    game.mouse.y = p.y;
  });

  canvas.addEventListener('pointerdown', (event) => {
    unlockAudio();
    const p = toLogical(event);
    game.mouse.x = p.x;
    game.mouse.y = p.y;
    game.handleClick(p.x, p.y);
  });

  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    game.cancelSelection();
  });

  window.addEventListener('keydown', (event) => {
    unlockAudio();
    if (event.repeat) return;
    game.handleKey(event.code);
    if (event.code === 'Space') event.preventDefault();
  });
}
