// All canvas drawing: the night garden, vision cones, characters and HUD.
// Palette: deep blue night, warm lantern gold, danger red.
import { TILE, COLS, ROWS } from './level.js';
import { CONE_RANGE, CONE_HALF_ANGLE } from './guard.js';

// Deterministic per-tile variation so the floor never looks flat.
function tileHash(col, row) {
  let h = (col * 374761393 + row * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function coneColor(guard) {
  if (guard.mood === 'alarmed') return 'rgba(255, 64, 48, 0.30)';
  if (guard.mood === 'suspicious') return 'rgba(255, 166, 48, 0.26)';
  return 'rgba(255, 214, 110, 0.20)';
}

function drawCone(ctx, guard) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, CONE_RANGE, guard.angle - CONE_HALF_ANGLE, guard.angle + CONE_HALF_ANGLE);
  ctx.closePath();
  ctx.fillStyle = coneColor(guard);
  ctx.fill();
  ctx.strokeStyle = coneColor(guard).replace(/0\.\d+\)$/, '0.5)');
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawFloor(ctx, level) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const v = tileHash(col, row);
      const base = 16 + Math.floor(v * 7);
      ctx.fillStyle = `rgb(${base + 2}, ${base + 4}, ${base + 14})`;
      ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
      if (v > 0.82) {
        ctx.fillStyle = 'rgba(255, 220, 140, 0.05)';
        ctx.fillRect(col * TILE + 8, row * TILE + 8, 10, 10);
      }
    }
  }
}

function drawShadowsAndBushes(ctx, level) {
  for (const s of level.shadows) {
    ctx.fillStyle = 'rgba(4, 6, 16, 0.55)';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = 'rgba(120, 140, 220, 0.10)';
    ctx.fillRect(s.x + 4, s.y + 4, s.w - 8, 4);
  }
  for (const b of level.bushes) {
    ctx.fillStyle = '#1d3a1e';
    ctx.beginPath();
    ctx.arc(b.x + 12, b.y + 14, 13, 0, Math.PI * 2);
    ctx.arc(b.x + 27, b.y + 10, 14, 0, Math.PI * 2);
    ctx.arc(b.x + 20, b.y + 27, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c5a28';
    ctx.beginPath();
    ctx.arc(b.x + 14, b.y + 12, 7, 0, Math.PI * 2);
    ctx.arc(b.x + 27, b.y + 24, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWallsAndCrates(ctx, level) {
  for (const w of level.walls) {
    ctx.fillStyle = '#232a42';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#39436b';
    ctx.fillRect(w.x, w.y, w.w, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(w.x, w.y + w.h - 4, w.w, 4);
  }
  for (const c of level.crates) {
    ctx.fillStyle = '#5a3d22';
    ctx.fillRect(c.x + 3, c.y + 3, c.w - 6, c.h - 6);
    ctx.strokeStyle = '#7d5a33';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 3, c.y + 3, c.w - 6, c.h - 6);
    ctx.beginPath();
    ctx.moveTo(c.x + 3, c.y + 3);
    ctx.lineTo(c.x + c.w - 3, c.y + c.h - 3);
    ctx.moveTo(c.x + c.w - 3, c.y + 3);
    ctx.lineTo(c.x + 3, c.y + c.h - 3);
    ctx.stroke();
  }
}

function drawRelicAndExit(ctx, level, hasRelic, time) {
  // Exit arch: green when open, grey padlock glow when locked.
  const e = level.exit;
  ctx.save();
  ctx.beginPath();
  ctx.arc(e.x, e.y, 26, 0, Math.PI * 2);
  ctx.fillStyle = hasRelic ? 'rgba(80, 255, 140, 0.18)' : 'rgba(140, 150, 170, 0.10)';
  ctx.fill();
  ctx.strokeStyle = hasRelic ? '#50ff8c' : '#6b7490';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(e.x, e.y, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = hasRelic ? '#50ff8c' : '#8b93b8';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(hasRelic ? '➤' : '🔒', e.x, e.y + 1);
  ctx.restore();
  if (!hasRelic) {
    // The relic: a golden idol that sparkles.
    const r = level.relic;
    const tw = 0.6 + 0.4 * Math.sin(time * 4);
    ctx.save();
    ctx.beginPath();
    ctx.arc(r.x, r.y, 22 + 4 * tw, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 210, 90, ${0.12 + 0.1 * tw})`;
    ctx.fill();
    ctx.fillStyle = '#ffd25a';
    ctx.beginPath();
    ctx.moveTo(r.x, r.y - 12);
    ctx.lineTo(r.x + 9, r.y + 2);
    ctx.lineTo(r.x + 5, r.y + 12);
    ctx.lineTo(r.x - 5, r.y + 12);
    ctx.lineTo(r.x - 9, r.y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8a5a00';
    ctx.beginPath();
    ctx.arc(r.x - 3, r.y - 1, 1.8, 0, Math.PI * 2);
    ctx.arc(r.x + 3, r.y - 1, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawGuard(ctx, guard, time) {
  // Lantern glow around the guard.
  const glow = ctx.createRadialGradient(guard.x, guard.y, 4, guard.x, guard.y, 46);
  glow.addColorStop(0, 'rgba(255, 190, 90, 0.35)');
  glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 46, 0, Math.PI * 2);
  ctx.fill();
  // Body: warm-lit watchman with a helmet.
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.rotate(guard.angle);
  ctx.fillStyle = '#c8a24a';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2f18';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd25a';
  ctx.beginPath();
  ctx.moveTo(14, -5);
  ctx.lineTo(24, 0);
  ctx.lineTo(14, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Mood mark: ? while suspicious, ! while alarmed.
  if (guard.mood !== 'patrol') {
    const bob = Math.sin(time * 5) * 2;
    ctx.fillStyle = guard.mood === 'alarmed' ? '#ff4030' : '#ffa630';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(guard.mood === 'alarmed' ? '!' : '?', guard.x, guard.y - 26 + bob);
  }
  // Suspicion arc over the guard's head.
  if (guard.suspicion > 1) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 19, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / 100) * Math.PI * 2);
    ctx.strokeStyle = guard.suspicion >= 100 ? '#ff4030' : '#ffa630';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}

function drawPlayer(ctx, player, time) {
  ctx.save();
  // Cloak: a dark hooded figure, rim-lit by the lanterns.
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.fillStyle = player.sneaking ? '#1c2438' : '#2a3454';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = player.coverKind ? '#50ff8c' : '#ffd25a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 13, -0.9, 0.9);
  ctx.stroke();
  ctx.fillStyle = '#0d1120';
  ctx.beginPath();
  ctx.arc(2, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd25a';
  ctx.beginPath();
  ctx.moveTo(13, -4);
  ctx.lineTo(21, 0);
  ctx.lineTo(13, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Hiding shimmer when tucked in cover.
  if (player.coverKind) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 3);
    ctx.strokeStyle = '#50ff8c';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHud(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 20, 0.78)';
  ctx.fillRect(0, 0, 960, 34);
  ctx.fillStyle = '#e8e4d0';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.levelName, 12, 18);
  ctx.textAlign = 'center';
  ctx.fillText(`⏱ ${formatTime(state.elapsed)}`, 480, 18);
  ctx.textAlign = 'right';
  ctx.fillText(`Score ${state.score}   Relic ${state.hasRelic ? '★' : '☆'}   Level ${state.levelIndex + 1}/3`, 948, 18);
  // Alarm meter: the highest guard suspicion.
  const w = 180;
  const x = 390;
  const y = 40;
  ctx.fillStyle = 'rgba(8, 10, 20, 0.78)';
  ctx.fillRect(x - 6, y - 6, w + 12, 20);
  ctx.fillStyle = '#222a44';
  ctx.fillRect(x, y, w, 8);
  const s = state.alarm / 100;
  ctx.fillStyle = s >= 1 ? '#ff4030' : s >= 0.35 ? '#ffa630' : '#ffd25a';
  ctx.fillRect(x, y, w * s, 8);
  ctx.fillStyle = '#e8e4d0';
  ctx.font = '11px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(s >= 1 ? 'SPOTTED!' : s >= 0.35 ? 'SUSPICION' : 'UNSEEN', x + w + 10, y + 5);
  ctx.restore();
}

export function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function overlay(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 8, 16, 0.82)';
  ctx.fillRect(0, 0, 960, 600);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(title, 480, 190);
  ctx.fillStyle = '#e8e4d0';
  ctx.font = '18px Georgia, serif';
  lines.forEach((line, i) => ctx.fillText(line, 480, 250 + i * 30));
  ctx.restore();
}

export function render(ctx, state) {
  const { level, player, guards, time } = state;
  ctx.clearRect(0, 0, 960, 600);
  drawFloor(ctx, level);
  drawShadowsAndBushes(ctx, level);
  drawRelicAndExit(ctx, level, player.hasRelic, time);
  for (const g of guards) drawCone(ctx, g);
  drawWallsAndCrates(ctx, level);
  for (const g of guards) drawGuard(ctx, g, time);
  drawPlayer(ctx, player, time);
  // Soft vignette: the night closes in at the edges.
  const vg = ctx.createRadialGradient(480, 300, 220, 480, 300, 640);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, 960, 600);
  drawHud(ctx, state);
  if (state.phase === 'title') {
    overlay(ctx, 'LANTERN THIEF', [
      'Sneak through the night garden. Steal the golden relic.',
      'Slip past the lantern guards and reach the glowing exit — unseen.',
      '',
      'WASD / arrows move · hold Shift to sneak · click to walk there',
      'Bushes and shadows hide you · a guard who spots you gives chase',
      '',
      'Press Enter or click to begin',
    ], '#ffd25a');
  } else if (state.phase === 'caught') {
    overlay(ctx, 'CAUGHT!', [
      'A lantern guard grabbed you in the light.',
      `Level ${state.levelIndex + 1} — score ${state.score}`,
      '',
      'Press R to try the level again',
    ], '#ff5040');
  } else if (state.phase === 'levelclear') {
    overlay(ctx, 'CLEAN GETAWAY!', [
      `${state.levelName} cleared in ${formatTime(state.elapsed)}.`,
      `Level score ${state.levelScore} · total ${state.score}`,
      '',
      'Press Enter for the next level',
    ], '#50ff8c');
  } else if (state.phase === 'win') {
    overlay(ctx, 'THE RELIC IS YOURS', [
      'Three gardens, three relics, never once caught in the light.',
      `Final score ${state.score} · total time ${formatTime(state.totalTime)}`,
      '',
      'Press R to play again',
    ], '#ffd25a');
  } else if (state.phase === 'paused') {
    overlay(ctx, 'PAUSED', ['Press P to keep sneaking'], '#e8e4d0');
  }
  // First-seconds tip while playing.
  if (state.phase === 'playing' && state.elapsed < 6) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 10, 20, 0.78)';
    ctx.fillRect(230, 560, 500, 26);
    ctx.fillStyle = '#ffd25a';
    ctx.font = '14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.levelTip, 480, 573);
    ctx.restore();
  }
}
