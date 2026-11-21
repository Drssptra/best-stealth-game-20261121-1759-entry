// Keyboard + mouse input. The game reads this plain object each frame:
//   up/down/left/right (WASD or arrows), sneak (Shift), moveTarget (click-to-move).
export function createInput(canvas) {
  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    sneak: false,
    moveTarget: null,
    pressed: {}, // keys pressed since last frame (edge-triggered)
  };

  const keyMap = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    const dir = keyMap[e.code];
    if (dir) {
      input[dir] = true;
      input.moveTarget = null; // keys override click-to-move
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sneak = true;
    if (!e.repeat) input.pressed[e.code] = true;
  });
  window.addEventListener('keyup', (e) => {
    const dir = keyMap[e.code];
    if (dir) input[dir] = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sneak = false;
  });
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = false;
    input.sneak = false;
  });

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.moveTarget = {
      x: ((e.clientX - rect.left) / rect.width) * 960,
      y: ((e.clientY - rect.top) / rect.height) * 600,
    };
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return input;
}

// Consume an edge-triggered key press (true once per physical press).
export function wasPressed(input, code) {
  if (input.pressed[code]) {
    delete input.pressed[code];
    return true;
  }
  return false;
}

export function clearPressed(input) {
  input.pressed = {};
}
