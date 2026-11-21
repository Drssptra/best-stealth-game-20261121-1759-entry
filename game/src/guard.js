// Guards: patrol routes, vision cones, suspicion, alarm and investigation.
// A guard has three moods:
//   patrol     — walks its route, cone sweeping ahead
//   suspicious — saw something; turns toward it, suspicion climbs
//   alarmed    — suspicion hit 100; rushes the last-seen spot
// After investigating an empty spot a guard calms down and patrols again,
// so getting spotted is a scare, not always a loss — unless a guard
// touches the thief while alarmed.
import { TILE, collideCircle, hasLineOfSight } from './level.js';

export const CONE_RANGE = 205;
export const CONE_HALF_ANGLE = 0.61; // ~35 degrees each side
export const GUARD_RADIUS = 14;
export const CATCH_DISTANCE = 22;

export function createGuard(def, levelIndex) {
  const start = def.waypoints[0];
  return {
    waypoints: def.waypoints.map(([c, r]) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 })),
    wpIndex: 1,
    x: start[0] * TILE + TILE / 2,
    y: start[1] * TILE + TILE / 2,
    angle: 0,
    speed: def.speed,
    pause: def.pause,
    pauseTimer: 0,
    mood: 'patrol', // patrol | suspicious | alarmed
    suspicion: 0, // 0..100
    lastSeen: null, // {x, y} where the thief was last spotted
    lookTimer: 0, // seconds spent looking around an empty spot
    scanDir: 1,
    levelIndex,
  };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(guard, targetAngle, rate, dt) {
  const d = angleDiff(targetAngle, guard.angle);
  const step = Math.max(-rate * dt, Math.min(rate * dt, d));
  guard.angle += step;
}

// Can this guard see the thief right now? Returns a visibility factor
// 0..1 (0 = unseen). Distance, angle, walls and cover all matter.
export function visibility(guard, player, level) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CONE_RANGE) return 0;
  const toPlayer = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(toPlayer, guard.angle)) > CONE_HALF_ANGLE) return 0;
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return 0;
  // Closer is easier to spot; cover hides you even inside the cone.
  let v = 1 - (dist / CONE_RANGE) * 0.55;
  if (player.sneaking) v *= 0.55;
  if (player.coverKind === 'bush') v *= player.sneaking ? 0.12 : 0.3;
  if (player.coverKind === 'shadow') v *= player.sneaking ? 0.25 : 0.5;
  if (!player.moving) v *= 0.85;
  return Math.max(0, Math.min(1, v));
}

function moveToward(guard, tx, ty, speed, level, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) return true;
  const nx = dx / d;
  const ny = dy / d;
  guard.angle = Math.atan2(ny, nx);
  const step = Math.min(d, speed * dt);
  guard.x += nx * step;
  guard.y += ny * step;
  collideCircle(level, guard, GUARD_RADIUS);
  return d <= step + 1;
}

// One tick of guard behaviour. Returns an event string for sounds:
// 'spotted' when the alarm first trips, 'lost' when the guard calms down.
export function updateGuard(guard, player, level, dt, noise) {
  const vis = visibility(guard, player, level);
  let event = null;

  // Hearing: a running thief close by raises suspicion even unseen.
  if (noise > 0.5) {
    const d = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (d < 130) guard.suspicion = Math.min(100, guard.suspicion + 14 * dt);
  }

  if (vis > 0) {
    // Seen! Suspicion climbs fast when clearly visible.
    guard.suspicion = Math.min(100, guard.suspicion + vis * 62 * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    if (guard.suspicion >= 100 && guard.mood !== 'alarmed') {
      guard.mood = 'alarmed';
      guard.lookTimer = 0;
      event = 'spotted';
    } else if (guard.suspicion >= 35 && guard.mood === 'patrol') {
      guard.mood = 'suspicious';
    }
  } else {
    // Nothing in sight: suspicion slowly drains, faster when calm.
    const drain = guard.mood === 'patrol' ? 22 : 9;
    guard.suspicion = Math.max(0, guard.suspicion - drain * dt);
    if (guard.mood === 'suspicious' && guard.suspicion < 12) {
      guard.mood = 'patrol';
      event = 'lost';
    }
  }

  if (guard.mood === 'alarmed') {
    // Rush the last-seen spot.
    const target = guard.lastSeen ?? { x: guard.x, y: guard.y };
    const arrived = moveToward(guard, target.x, target.y, guard.speed * 1.55, level, dt);
    if (arrived) {
      // Search the spot, looking around, then give up and calm down.
      guard.lookTimer += dt;
      guard.angle += guard.scanDir * 1.6 * dt;
      if (Math.random() < dt * 0.5) guard.scanDir *= -1;
      if (guard.lookTimer > 2.2) {
        guard.mood = 'patrol';
        guard.suspicion = 25;
        guard.lookTimer = 0;
        event = 'lost';
      }
    }
  } else if (guard.mood === 'suspicious' && guard.lastSeen) {
    // Walk toward the glimpse, cautiously.
    const arrived = moveToward(guard, guard.lastSeen.x, guard.lastSeen.y, guard.speed * 0.85, level, dt);
    if (arrived) {
      guard.lookTimer += dt;
      guard.angle += 1.1 * dt;
      if (guard.lookTimer > 1.4) {
        guard.mood = 'patrol';
        guard.lookTimer = 0;
      }
    }
  } else {
    // Patrol: walk the route, pausing at each waypoint.
    if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
      guard.angle += 0.5 * dt; // glance around while waiting
    } else {
      const wp = guard.waypoints[guard.wpIndex];
      const arrived = moveToward(guard, wp.x, wp.y, guard.speed, level, dt);
      if (arrived) {
        guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = guard.pause;
      }
    }
  }
  return event;
}

// True when an alarmed guard has caught the thief.
export function guardCaughtPlayer(guard, player) {
  if (guard.mood !== 'alarmed') return false;
  return Math.hypot(player.x - guard.x, player.y - guard.y) < CATCH_DISTANCE;
}

// The highest suspicion among all guards — the game's alarm meter.
export function maxSuspicion(guards) {
  let m = 0;
  for (const g of guards) m = Math.max(m, g.suspicion);
  return m;
}
