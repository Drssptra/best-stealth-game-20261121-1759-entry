// The thief: movement, sneaking, noise and the relic.
import { TILE, collideCircle, inBush, inShadow } from './level.js';

export const WALK_SPEED = 150;
export const SNEAK_SPEED = 88;
export const PLAYER_RADIUS = 13;

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    angle: 0, // facing, radians
    sneaking: false,
    moving: false,
    stepTimer: 0, // for footstep sounds
    hasRelic: false,
    hidden: false, // in cover right now
    coverKind: null, // 'bush' | 'shadow' | null
  };
}

// Move the player from keyboard input or a click-to-move target.
// Returns true when a footstep sound should play.
export function updatePlayer(player, input, level, dt) {
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  if (mx === 0 && my === 0 && input.moveTarget) {
    const dx = input.moveTarget.x - player.x;
    const dy = input.moveTarget.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d > 8) {
      mx = dx / d;
      my = dy / d;
    } else {
      input.moveTarget = null;
    }
  }
  const len = Math.hypot(mx, my);
  player.moving = len > 0;
  player.sneaking = !!input.sneak;
  if (player.moving) {
    const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const nx = mx / len;
    const ny = my / len;
    player.angle = Math.atan2(ny, nx);
    player.x += nx * speed * dt;
    player.y += ny * speed * dt;
    collideCircle(level, player, PLAYER_RADIUS);
    player.x = Math.max(PLAYER_RADIUS, Math.min(960 - PLAYER_RADIUS, player.x));
    player.y = Math.max(PLAYER_RADIUS, Math.min(600 - PLAYER_RADIUS, player.y));
    // Footsteps: slower and quieter while sneaking.
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = player.sneaking ? 0.55 : 0.34;
      return true;
    }
  }
  // Cover status, used by the guards' detection.
  if (inBush(level, player.x, player.y)) {
    player.hidden = true;
    player.coverKind = 'bush';
  } else if (inShadow(level, player.x, player.y)) {
    player.hidden = true;
    player.coverKind = 'shadow';
  } else {
    player.hidden = false;
    player.coverKind = null;
  }
  return false;
}

// How loud the player is right now (0 = silent). Guards hear running nearby.
export function playerNoise(player) {
  if (!player.moving) return 0;
  return player.sneaking ? 0.15 : 1.0;
}

export function playerTile(player) {
  return { col: Math.floor(player.x / TILE), row: Math.floor(player.y / TILE) };
}
