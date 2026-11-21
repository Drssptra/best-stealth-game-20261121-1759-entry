// Lantern Thief — game loop, states and scoring.
// Phases: title → playing → (caught | levelclear) → win. R restarts, P pauses.
import { LEVELS, parseLevel } from './level.js';
import { createPlayer, updatePlayer, playerNoise } from './player.js';
import { createGuard, updateGuard, guardCaughtPlayer, maxSuspicion } from './guard.js';
import { createInput, wasPressed, clearPressed } from './input.js';
import { createAudio } from './audio.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();

const state = {
  phase: 'title', // title | playing | paused | caught | levelclear | win
  levelIndex: 0,
  level: null,
  levelName: '',
  levelTip: '',
  player: null,
  guards: [],
  elapsed: 0,
  totalTime: 0,
  score: 0,
  levelScore: 0,
  hasRelic: false,
  alarm: 0,
  time: 0,
};

function loadLevel(index) {
  const def = LEVELS[index];
  state.levelIndex = index;
  state.level = parseLevel(def);
  state.levelName = def.name;
  state.levelTip = def.tip;
  state.player = createPlayer(state.level.playerStart);
  state.guards = def.guards.map((g) => createGuard(g, index));
  state.elapsed = 0;
  state.levelScore = 0;
  state.hasRelic = false;
  state.alarm = 0;
  input.moveTarget = null;
}

function startGame() {
  state.score = 0;
  state.totalTime = 0;
  loadLevel(0);
  state.phase = 'playing';
  audio.click();
}

function restartLevel() {
  loadLevel(state.levelIndex);
  state.phase = 'playing';
  audio.click();
}

function scoreForLevel() {
  // Base 1000, minus 4 per second, plus 500 for the relic, never below 100.
  return Math.max(100, 1000 - Math.floor(state.elapsed) * 4 + 500);
}

function update(dt) {
  state.time += dt;
  // Screenshot scenes (?shot=play) hold one frozen moment of real gameplay
  // so the frame shows the tense standoff instead of playing past it.
  if (state.frozen) return;
  if (state.phase !== 'playing') return;
  state.elapsed += dt;
  state.totalTime += dt;

  const stepped = updatePlayer(state.player, input, state.level, dt);
  if (stepped) audio.footstep(state.player.sneaking);

  const noise = playerNoise(state.player);
  for (const g of state.guards) {
    const event = updateGuard(g, state.player, state.level, dt, noise);
    if (event === 'spotted') audio.spotted();
    if (event === 'lost') audio.lost();
  }
  state.alarm = maxSuspicion(state.guards);

  // Relic pickup.
  if (!state.player.hasRelic) {
    const r = state.level.relic;
    if (Math.hypot(state.player.x - r.x, state.player.y - r.y) < 26) {
      state.player.hasRelic = true;
      state.hasRelic = true;
      audio.pickup();
    }
  }

  // Caught by an alarmed guard.
  for (const g of state.guards) {
    if (guardCaughtPlayer(g, state.player)) {
      state.phase = 'caught';
      audio.caught();
      return;
    }
  }

  // Exit: only open once the relic is taken.
  if (state.player.hasRelic) {
    const e = state.level.exit;
    if (Math.hypot(state.player.x - e.x, state.player.y - e.y) < 26) {
      state.levelScore = scoreForLevel();
      state.score += state.levelScore;
      if (state.levelIndex + 1 >= LEVELS.length) {
        state.phase = 'win';
        audio.win();
      } else {
        state.phase = 'levelclear';
        audio.win();
      }
    }
  }
}

function handleKeys() {
  if (wasPressed(input, 'KeyM')) audio.muted = !audio.muted;
  if (state.phase === 'title' && (wasPressed(input, 'Enter') || wasPressed(input, 'Space'))) startGame();
  else if (state.phase === 'playing' && wasPressed(input, 'KeyP')) state.phase = 'paused';
  else if (state.phase === 'paused' && wasPressed(input, 'KeyP')) state.phase = 'playing';
  else if (state.phase === 'caught' && wasPressed(input, 'KeyR')) restartLevel();
  else if (state.phase === 'levelclear' && wasPressed(input, 'Enter')) {
    loadLevel(state.levelIndex + 1);
    state.phase = 'playing';
    audio.click();
  } else if (state.phase === 'win' && wasPressed(input, 'KeyR')) startGame();
  else if (state.phase === 'playing' && wasPressed(input, 'KeyR')) restartLevel();
  clearPressed(input);
}

// Deterministic setups for screenshots (?shot=start|play|chase|end).
// The play shot drops the thief mid-garden with a guard's cone sweeping
// close by and suspicion half-raised — the game's tensest moment.
// The chase shot freezes an alarmed guard mid-pursuit instead of the
// CAUGHT overlay, so the frame shows the chase itself.
function applyShot(shot) {
  if (shot === 'start') {
    loadLevel(0);
    state.phase = 'title';
    return;
  }
  if (shot === 'play') {
    loadLevel(1);
    state.phase = 'playing';
    state.player.x = 340;
    state.player.y = 300;
    state.player.angle = 0;
    state.player.sneaking = true;
    state.player.hasRelic = true;
    state.hasRelic = true;
    state.elapsed = 87;
    state.score = 1150;
    const g = state.guards[1];
    g.x = 480;
    g.y = 300;
    g.angle = Math.PI;
    g.suspicion = 58;
    g.mood = 'suspicious';
    g.lastSeen = { x: 340, y: 300 };
    const g2 = state.guards[0];
    g2.x = 100;
    g2.y = 140;
    g2.angle = Math.PI / 2;
    // A third cone sweeping the upper middle so the cover shows the
    // court from two directions at once.
    const g3 = state.guards[2];
    g3.x = 540;
    g3.y = 200;
    g3.angle = Math.PI * 0.75;
    state.alarm = 58;
    return;
  }
  if (shot === 'chase') {
    // The chase as live gameplay, not the CAUGHT overlay: an alarmed
    // guard rushes the thief down the garden, red cone and all, while
    // the thief flees with the relic toward the open exit.
    loadLevel(0);
    state.phase = 'playing';
    state.player.x = 700;
    state.player.y = 460;
    state.player.angle = 2.03;
    state.player.sneaking = false;
    state.player.moving = true;
    state.player.hasRelic = true;
    state.hasRelic = true;
    state.elapsed = 63;
    state.score = 950;
    const g = state.guards[2];
    g.x = 740;
    g.y = 380;
    g.angle = Math.atan2(460 - 380, 700 - 740);
    g.suspicion = 100;
    g.mood = 'alarmed';
    g.lastSeen = { x: 700, y: 460 };
    const g2 = state.guards[1];
    g2.x = 460;
    g2.y = 220;
    g2.angle = Math.PI / 2;
    g2.suspicion = 41;
    g2.mood = 'suspicious';
    g2.lastSeen = { x: 700, y: 460 };
    state.alarm = 100;
    return;
  }
  if (shot === 'end') {
    loadLevel(0);
    state.phase = 'levelclear';
    state.elapsed = 74;
    state.levelScore = 1204;
    state.score = 1204;
    state.player.hasRelic = true;
    state.hasRelic = true;
    state.player.x = state.level.exit.x - 30;
    state.player.y = state.level.exit.y;
    return;
  }
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
// Debug hook for automated play-testing (read-only state inspection).
window.__lanternThief = state;
if (shot) {
  state.frozen = true;
  applyShot(shot);
} else {
  loadLevel(0);
  state.phase = 'title';
}

// Clicking the title screen starts the game (mouse support).
canvas.addEventListener('mousedown', () => {
  if (state.phase === 'title') startGame();
  else if (state.phase === 'levelclear') {
    loadLevel(state.levelIndex + 1);
    state.phase = 'playing';
  }
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  handleKeys();
  update(dt);
  render(ctx, state);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
