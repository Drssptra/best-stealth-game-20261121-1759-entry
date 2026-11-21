// Level definitions for Lantern Thief.
// Each level is a 24x15 grid of tiles (tile = 40px, canvas 960x600).
//   # wall        . floor      B bush (cover: hides you while sneaking)
//   C crate      (blocks sight and movement)
//   S shadow     (dark patch: guards spot you much slower here)
//   P player start   E exit (locked until the relic is taken)
//   R relic      L lantern (warm light pool, purely visual)
// Guards patrol the waypoint lists; waypoints are tile coordinates.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 15;

export const LEVELS = [
  {
    name: 'Level 1 — The Garden Gate',
    tip: 'Stay out of the yellow cones. Bushes and shadows hide you.',
    grid: [
      '########################',
      '#......#.......#.......#',
      '#.P....#...B...#...R...#',
      '#......#.......#.......#',
      '#..C...####.####...C...#',
      '#......#.......#.......#',
      '#..B.......S...#...B...#',
      '####.###.......###.#####',
      '#......#.......#.......#',
      '#..S...#...B.......S...#',
      '#......#.......#.......#',
      '#..C...####.####...C...#',
      '#......#.......#.......#',
      '#......#...B...#...E...#',
      '########################',
    ],
    guards: [
      { waypoints: [[2, 1], [5, 1], [5, 6], [2, 6]], speed: 62, pause: 0.9 },
      { waypoints: [[11, 1], [11, 13]], speed: 58, pause: 1.1 },
      { waypoints: [[18, 8], [21, 8], [21, 13], [18, 13]], speed: 66, pause: 0.6 },
    ],
  },
  {
    name: 'Level 2 — The Lantern Court',
    tip: 'Two guards cross the court. Wait for the cones to swing away.',
    grid: [
      '########################',
      '#...#......#......#....#',
      '#.P....B...#..S...#.R..#',
      '#...#......#......#....#',
      '#...####.#####.####....#',
      '#......#.......#.......#',
      '#..B...#...C.......B...#',
      '#......#.......#.......#',
      '###.#######.#######.####',
      '#......#.......#.......#',
      '#..S...#...B...#...S...#',
      '#......#.......#.......#',
      '#..C...####.####...C...#',
      '#......#...S...#...E...#',
      '########################',
    ],
    guards: [
      { waypoints: [[2, 1], [2, 7], [3, 7], [3, 1]], speed: 70, pause: 0.7 },
      { waypoints: [[5, 5], [5, 7], [2, 7], [2, 5]], speed: 74, pause: 0.5 },
      { waypoints: [[9, 5], [13, 5], [13, 7], [9, 7]], speed: 68, pause: 0.9 },
      { waypoints: [[20, 9], [21, 9], [21, 13], [20, 13]], speed: 72, pause: 0.8 },
    ],
  },
  {
    name: 'Level 3 — The Relic Hall',
    tip: 'Four guards, tight patrols. Shadows are your best friends now.',
    grid: [
      '########################',
      '#..#....#.....#....#...#',
      '#.P...B.#..S...#.B.#.R.#',
      '#..#....#.....#....#...#',
      '#..##.####.#####.##....#',
      '#......#.......#.......#',
      '#..B.......C.......B...#',
      '#..S...#.......#...S...#',
      '####.#####.#####.#####.#',
      '#......#.......#.......#',
      '#..C...#...B...#...C...#',
      '#......#.......#.......#',
      '#..B...####.####...B...#',
      '#......#...S...#...E...#',
      '########################',
    ],
    guards: [
      { waypoints: [[1, 1], [2, 1], [2, 3], [1, 3]], speed: 78, pause: 0.5 },
      { waypoints: [[10, 1], [12, 1], [12, 3], [10, 3]], speed: 82, pause: 0.4 },
      { waypoints: [[20, 1], [22, 1], [22, 3], [20, 3]], speed: 76, pause: 0.7 },
      { waypoints: [[2, 9], [4, 9], [4, 13], [2, 13]], speed: 80, pause: 0.6 },
      { waypoints: [[16, 9], [20, 9], [20, 13], [16, 13]], speed: 88, pause: 1.4 },
    ],
  },
];

// Turn a level's grid into the runtime pieces the game needs.
export function parseLevel(def) {
  const walls = [];
  const crates = [];
  const bushes = [];
  const shadows = [];
  let playerStart = { x: 60, y: 60 };
  let exit = { x: 900, y: 540 };
  let relic = { x: 900, y: 100 };
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = def.grid[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (ch === '#') walls.push({ x, y, w: TILE, h: TILE });
      else if (ch === 'C') crates.push({ x, y, w: TILE, h: TILE });
      else if (ch === 'B') bushes.push({ x, y, w: TILE, h: TILE });
      else if (ch === 'S') shadows.push({ x, y, w: TILE, h: TILE });
      else if (ch === 'P') playerStart = { x: x + TILE / 2, y: y + TILE / 2 };
      else if (ch === 'E') exit = { x: x + TILE / 2, y: y + TILE / 2 };
      else if (ch === 'R') relic = { x: x + TILE / 2, y: y + TILE / 2 };
    }
  }
  return { name: def.name, tip: def.tip, walls, crates, bushes, shadows, playerStart, exit, relic, guards: def.guards };
}

// True when the point is inside any solid block (wall or crate).
export function isSolid(level, x, y) {
  for (const b of level.walls) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
  for (const b of level.crates) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
  return false;
}

// True when the point is inside a bush tile (soft cover).
export function inBush(level, x, y) {
  for (const b of level.bushes) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
  return false;
}

// True when the point is inside a shadow patch (dark cover).
export function inShadow(level, x, y) {
  for (const b of level.shadows) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
  return false;
}

// Line of sight between two points, blocked by walls and crates.
// Steps along the line in small increments so thin walls still block.
export function hasLineOfSight(level, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isSolid(level, ax + dx * t, ay + dy * t)) return false;
  }
  return true;
}

// Circle-vs-solid collision: push the circle out of walls and crates.
export function collideCircle(level, pos, radius) {
  for (const b of [...level.walls, ...level.crates]) {
    const cx = Math.max(b.x, Math.min(pos.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(pos.y, b.y + b.h));
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 === 0) { pos.y = b.y - radius; continue; }
      const d = Math.sqrt(d2);
      pos.x = cx + (dx / d) * radius;
      pos.y = cy + (dy / d) * radius;
    }
  }
}
