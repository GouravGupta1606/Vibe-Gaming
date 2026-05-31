/* =====================================================================
   VibGaming — brick.js  (Upgraded Brick Breaker)

   Features:
   ─ Mouse + keyboard (smooth hold-down) paddle control
   ─ 3 lives with heart display
   ─ Level progression (speed + rows increase)
   ─ 4 power-up types: Wide Paddle, Slow Ball, Extra Life, Fireball
   ─ Particle explosions on brick break
   ─ Combo multiplier (consecutive hits)
   ─ Accurate circle-vs-rect collision
   ─ Ball angle varies by where it hits paddle
   ─ HUD: Score | Lives | Level | High Score
   ─ States: MENU → PLAYING → PAUSED → LIFE_LOST → GAME_OVER → WIN
   ─ Keyboard: ← → to move, P to pause, SPACE to launch/restart
   ===================================================================== */

// ── Canvas setup ──────────────────────────────────────────────────────
const canvas  = document.getElementById('board');
const ctx     = canvas.getContext('2d');
const W = canvas.width  = 660;
const H = canvas.height = 520;

// ── Game constants ────────────────────────────────────────────────────
const PADDLE_W_NORMAL = 110;
const PADDLE_W_WIDE   = 180;
const PADDLE_H        = 12;
const BALL_R          = 9;
const BRICK_COLS      = 10;
const BRICK_W         = 54;
const BRICK_H         = 16;
const BRICK_GAP       = 6;
const BRICK_OFF_X     = (W - (BRICK_COLS * (BRICK_W + BRICK_GAP) - BRICK_GAP)) / 2;
const BRICK_OFF_Y     = 52;
const BASE_SPEED      = 4.5;
const MAX_LEVELS      = 8;
const MAX_ROWS_START  = 4;

// ── Color palettes ────────────────────────────────────────────────────
const BRICK_COLORS = [
  ['#ff4466','#ff6680'],  // red
  ['#ff9900','#ffbb44'],  // orange
  ['#ffdd00','#ffee66'],  // yellow
  ['#7fff00','#aaff44'],  // green
  ['#00f2ff','#66f8ff'],  // cyan
  ['#aa44ff','#cc88ff'],  // purple
];

// Power-up type config
const PU_TYPES = {
  WIDE:  { color: '#00f2ff', glow: '#00f2ff', label: 'WIDE',  icon: '⬛' },
  SLOW:  { color: '#7fff00', glow: '#7fff00', label: 'SLOW',  icon: '🐢' },
  LIFE:  { color: '#ff4488', glow: '#ff4488', label: '+❤️',   icon: '❤' },
  FIRE:  { color: '#ff9900', glow: '#ff9900', label: 'FIRE',  icon: '🔥' },
};
const PU_LIST = Object.keys(PU_TYPES);

// ── Game state ────────────────────────────────────────────────────────
let state;      // 'MENU' | 'PLAYING' | 'PAUSED' | 'LIFE_LOST' | 'GAME_OVER' | 'WIN'
let score, lives, level, combo, hiScore;
let paddle, ball, bricks, particles, powerUps;
let paddleWidthCurrent, ballSpeedMult, fireActive;
let puTimers = {};          // { WIDE: framesLeft, SLOW: framesLeft }
let keys = {};
let mouseX = null;          // null = use keyboard
let launched = false;

// ── HUD DOM refs ──────────────────────────────────────────────────────
const hudScore  = document.getElementById('hud-score');
const hudLives  = document.getElementById('hud-lives');
const hudLevel  = document.getElementById('hud-level');
const hudHi     = document.getElementById('hud-hi');

function updateHUD() {
  hudScore.textContent = score;
  hudLives.textContent = '❤'.repeat(Math.max(0, lives));
  hudLevel.textContent = level;
  hudHi.textContent    = Math.max(score, hiScore);
}

// ── Paddle ────────────────────────────────────────────────────────────
function makePaddle() {
  return {
    x: W / 2 - paddleWidthCurrent / 2,
    y: H - 32,
    w: paddleWidthCurrent,
    h: PADDLE_H,
    vx: 0,
  };
}

// ── Ball ──────────────────────────────────────────────────────────────
function makeBall() {
  const spd = (BASE_SPEED + level * 0.35) * (puTimers.SLOW > 0 ? 0.55 : 1);
  return {
    x: W / 2,
    y: paddle.y - BALL_R - 2,
    vx: spd * (Math.random() < 0.5 ? 1 : -1) * 0.6,
    vy: -spd,
    r: BALL_R,
  };
}

// ── Bricks ────────────────────────────────────────────────────────────
function makeBricks() {
  const rows = MAX_ROWS_START + Math.min(level - 1, 4);
  const arr  = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      const hp  = level >= 4 && r < 2 ? 2 : 1;       // armored bricks on high levels
      const colorIdx = (r + c) % BRICK_COLORS.length;
      arr.push({
        x: BRICK_OFF_X + c * (BRICK_W + BRICK_GAP),
        y: BRICK_OFF_Y + r * (BRICK_H + BRICK_GAP),
        w: BRICK_W, h: BRICK_H,
        hp, maxHp: hp,
        colorIdx,
        dead: false,
        puType: Math.random() < 0.12 ? PU_LIST[Math.floor(Math.random() * PU_LIST.length)] : null,
      });
    }
  }
  return arr;
}

// ── Init / Reset ──────────────────────────────────────────────────────
function initGame() {
  score   = 0;
  lives   = 3;
  level   = 1;
  combo   = 0;
  hiScore = parseInt(localStorage.getItem('vg_brick_hi') || '0');
  paddleWidthCurrent = PADDLE_W_NORMAL;
  ballSpeedMult = 1;
  fireActive    = false;
  puTimers      = { WIDE: 0, SLOW: 0, FIRE: 0 };
  particles     = [];
  powerUps      = [];
  paddle = makePaddle();
  bricks = makeBricks();
  ball   = makeBall();
  launched = false;
  state  = 'MENU';
  updateHUD();
}

function startLevel() {
  paddleWidthCurrent = PADDLE_W_NORMAL;
  puTimers   = { WIDE: 0, SLOW: 0, FIRE: 0 };
  particles  = [];
  powerUps   = [];
  paddle     = makePaddle();
  bricks     = makeBricks();
  ball       = makeBall();
  launched   = false;
  updateHUD();
}

// ── Collision: circle vs AABB ─────────────────────────────────────────
function circleRect(bx, by, br, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(bx, rx + rw));
  const nearY = Math.max(ry, Math.min(by, ry + rh));
  const dx = bx - nearX, dy = by - nearY;
  return dx * dx + dy * dy <= br * br;
}

function resolveCircleRect(bx, by, br, rx, ry, rw, rh) {
  // Returns which face was hit: 'top'|'bottom'|'left'|'right'
  const nearX = Math.max(rx, Math.min(bx, rx + rw));
  const nearY = Math.max(ry, Math.min(by, ry + rh));
  const overlapX = br - Math.abs(bx - nearX);
  const overlapY = br - Math.abs(by - nearY);
  if (overlapX < overlapY) return bx < rx ? 'left' : 'right';
  return by < ry ? 'top' : 'bottom';
}

// ── Particles ─────────────────────────────────────────────────────────
function spawnParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = Math.random() * 3.5 + 1;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 1,
      decay: Math.random() * 0.03 + 0.02,
      r: Math.random() * 3 + 1.5,
      color,
    });
  }
}

// ── Power-up drop ─────────────────────────────────────────────────────
function dropPowerUp(brick) {
  if (!brick.puType) return;
  const cfg = PU_TYPES[brick.puType];
  powerUps.push({
    x: brick.x + brick.w / 2,
    y: brick.y + brick.h / 2,
    vy: 2.2,
    type: brick.puType,
    color: cfg.color,
    glow: cfg.glow,
    label: cfg.label,
    r: 14,
    dead: false,
  });
}

function applyPowerUp(type) {
  if (type === 'WIDE') {
    paddleWidthCurrent = PADDLE_W_WIDE;
    paddle.w = PADDLE_W_WIDE;
    puTimers.WIDE = 420;
  } else if (type === 'SLOW') {
    puTimers.SLOW = 360;
    const spd = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
    const factor = 0.55;
    ball.vx = (ball.vx / spd) * spd * factor;
    ball.vy = (ball.vy / spd) * spd * factor;
  } else if (type === 'LIFE') {
    lives = Math.min(5, lives + 1);
    updateHUD();
  } else if (type === 'FIRE') {
    puTimers.FIRE = 300;
    fireActive = true;
  }
}

// ── Update paddle ─────────────────────────────────────────────────────
function updatePaddle() {
  const SPEED = 9;
  if (mouseX !== null) {
    // Mouse control — smooth follow
    const target = mouseX - paddle.w / 2;
    paddle.x += (target - paddle.x) * 0.18;
  } else {
    if (keys['ArrowLeft']  || keys['a'] || keys['A']) paddle.x -= SPEED;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) paddle.x += SPEED;
  }
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

  // Shrink back if WIDE expired
  if (puTimers.WIDE > 0) {
    puTimers.WIDE--;
    if (puTimers.WIDE === 0) {
      paddleWidthCurrent = PADDLE_W_NORMAL;
      paddle.w = PADDLE_W_NORMAL;
    }
  }
  if (puTimers.SLOW > 0) {
    puTimers.SLOW--;
    if (puTimers.SLOW === 0) {
      // Restore speed
      const spd = (BASE_SPEED + level * 0.35);
      const cur = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
      if (cur > 0) {
        ball.vx = (ball.vx / cur) * spd;
        ball.vy = (ball.vy / cur) * spd;
      }
    }
  }
  if (puTimers.FIRE > 0) {
    puTimers.FIRE--;
    if (puTimers.FIRE === 0) fireActive = false;
  }
}

// ── Update ball ────────────────────────────────────────────────────────
function updateBall() {
  if (!launched) {
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - BALL_R - 2;
    return;
  }

  ball.x += ball.vx;
  ball.y += ball.vy;

  // Wall bounces
  if (ball.x - ball.r <= 0)   { ball.x = ball.r;     ball.vx = Math.abs(ball.vx); }
  if (ball.x + ball.r >= W)   { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
  if (ball.y - ball.r <= 0)   { ball.y = ball.r;     ball.vy = Math.abs(ball.vy); }

  // Ball lost
  if (ball.y - ball.r > H + 20) {
    lives--;
    updateHUD();
    if (lives <= 0) {
      state = 'GAME_OVER';
      if (score > hiScore) {
        hiScore = score;
        localStorage.setItem('vg_brick_hi', hiScore);
        updateHUD();
      }
    } else {
      state = 'LIFE_LOST';
    }
    return;
  }

  // Paddle collision
  if (circleRect(ball.x, ball.y, ball.r, paddle.x, paddle.y, paddle.w, paddle.h) && ball.vy > 0) {
    // Angle based on hit position relative to paddle centre
    const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2); // -1 to 1
    const maxAngle = Math.PI * 0.38;
    const angle    = hitPos * maxAngle;
    const spd      = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
    ball.vx = spd * Math.sin(angle);
    ball.vy = -spd * Math.cos(angle);
    ball.y  = paddle.y - ball.r - 1;
    combo   = 0;
    return;
  }

  // Brick collisions
  for (const brick of bricks) {
    if (brick.dead) continue;
    if (!circleRect(ball.x, ball.y, ball.r, brick.x, brick.y, brick.w, brick.h)) continue;

    if (!fireActive) {
      const face = resolveCircleRect(ball.x, ball.y, ball.r, brick.x, brick.y, brick.w, brick.h);
      if (face === 'top' || face === 'bottom') ball.vy *= -1;
      else ball.vx *= -1;
    }

    brick.hp--;
    combo++;
    const multiplier = Math.min(combo, 8);
    const points     = 100 * multiplier;
    score           += points;
    updateHUD();
    spawnParticles(
      brick.x + brick.w / 2,
      brick.y + brick.h / 2,
      BRICK_COLORS[brick.colorIdx][0],
      fireActive ? 20 : 10
    );

    if (brick.hp <= 0) {
      brick.dead = true;
      dropPowerUp(brick);
    }
    if (!fireActive) break; // only one brick per frame unless fireball
  }
}

// ── Update power-ups ───────────────────────────────────────────────────
function updatePowerUps() {
  for (const pu of powerUps) {
    if (pu.dead) continue;
    pu.y += pu.vy;
    if (pu.y > H + 30) { pu.dead = true; continue; }

    // Paddle pickup
    if (pu.x > paddle.x && pu.x < paddle.x + paddle.w &&
        pu.y + pu.r > paddle.y && pu.y - pu.r < paddle.y + paddle.h) {
      applyPowerUp(pu.type);
      spawnParticles(pu.x, pu.y, pu.color, 16);
      pu.dead = true;
    }
  }
  powerUps = powerUps.filter(p => !p.dead);
}

// ── Update particles ──────────────────────────────────────────────────
function updateParticles() {
  for (const p of particles) {
    p.x    += p.vx;
    p.y    += p.vy;
    p.vy   += 0.08;
    p.life -= p.decay;
  }
  particles = particles.filter(p => p.life > 0);
}

// ── Check level complete ───────────────────────────────────────────────
function checkLevelComplete() {
  if (bricks.every(b => b.dead)) {
    score += 500 * level;
    updateHUD();
    if (level >= MAX_LEVELS) {
      state = 'WIN';
      if (score > hiScore) {
        hiScore = score;
        localStorage.setItem('vg_brick_hi', hiScore);
        updateHUD();
      }
    } else {
      level++;
      state = 'PLAYING';
      startLevel();
    }
  }
}

// ── Draw helpers ──────────────────────────────────────────────────────
function drawRoundedRect(x, y, w, h, r, fill, stroke, sBlur, sColor) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (sBlur) { ctx.shadowBlur = sBlur; ctx.shadowColor = sColor; }
  if (fill)  { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.shadowBlur = 0;
}

function drawPaddle() {
  const pg = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.h);
  const c1 = puTimers.WIDE > 0 ? '#00f2ff' : puTimers.FIRE > 0 ? '#ff9900' : '#ff00ff';
  const c2 = puTimers.WIDE > 0 ? '#0066aa' : puTimers.FIRE > 0 ? '#aa4400' : '#aa0099';
  pg.addColorStop(0, c1);
  pg.addColorStop(1, c2);
  ctx.shadowBlur  = 22;
  ctx.shadowColor = c1;
  drawRoundedRect(paddle.x, paddle.y, paddle.w, paddle.h, 6, pg, null, 0);
  ctx.shadowBlur = 0;
}

function drawBall() {
  const grd = ctx.createRadialGradient(
    ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, ball.r * 0.1,
    ball.x, ball.y, ball.r
  );
  const bc = fireActive ? '#ff9900' : '#ffffff';
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.6, bc);
  grd.addColorStop(1, fireActive ? '#ff4400' : 'rgba(0,200,255,0.6)');
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.shadowBlur  = fireActive ? 30 : 20;
  ctx.shadowColor = fireActive ? '#ff9900' : '#00f2ff';
  ctx.fillStyle   = grd;
  ctx.fill();
  ctx.shadowBlur  = 0;
}

function drawBricks() {
  for (const brick of bricks) {
    if (brick.dead) continue;
    const [c1, c2] = BRICK_COLORS[brick.colorIdx];
    const grd = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.h);
    const ratio = brick.hp / brick.maxHp;
    grd.addColorStop(0, brick.hp < brick.maxHp ? '#888' : c2);
    grd.addColorStop(1, brick.hp < brick.maxHp ? '#555' : c1);

    ctx.shadowBlur  = 10;
    ctx.shadowColor = c1;
    drawRoundedRect(brick.x + 1, brick.y + 1, brick.w - 2, brick.h - 2, 4, grd, null, 0);

    // HP overlay shine
    ctx.globalAlpha = 0.35;
    ctx.fillStyle   = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(brick.x + 2, brick.y + 1, brick.w - 4, (brick.h - 2) * 0.45, [4,4,0,0]);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;

    // Power-up dot
    if (brick.puType) {
      const dotColor = PU_TYPES[brick.puType].color;
      ctx.beginPath();
      ctx.arc(brick.x + brick.w / 2, brick.y + brick.h / 2, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.shadowBlur = 8; ctx.shadowColor = dotColor;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

function drawPowerUps() {
  for (const pu of powerUps) {
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
    ctx.fillStyle   = pu.color + '33';
    ctx.strokeStyle = pu.color;
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 15;
    ctx.shadowColor = pu.glow;
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle  = '#fff';
    ctx.font       = `bold 9px Orbitron, sans-serif`;
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pu.label, pu.x, pu.y);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawActivePU() {
  const active = [];
  if (puTimers.WIDE > 0)
    active.push({ label: `WIDE ${Math.ceil(puTimers.WIDE / 60)}s`, color: '#00f2ff' });
  if (puTimers.SLOW > 0)
    active.push({ label: `SLOW ${Math.ceil(puTimers.SLOW / 60)}s`, color: '#7fff00' });
  if (puTimers.FIRE > 0)
    active.push({ label: `FIRE ${Math.ceil(puTimers.FIRE / 60)}s`, color: '#ff9900' });

  active.forEach((a, i) => {
    ctx.fillStyle   = a.color + 'cc';
    ctx.font        = 'bold 11px Orbitron, sans-serif';
    ctx.textAlign   = 'right';
    ctx.textBaseline = 'top';
    ctx.shadowBlur  = 8;
    ctx.shadowColor = a.color;
    ctx.fillText(a.label, W - 10, 8 + i * 18);
  });
  ctx.shadowBlur = 0;
}

function drawCombo() {
  if (combo <= 1) return;
  ctx.fillStyle   = '#ffcc00';
  ctx.font        = `bold ${Math.min(24, 11 + combo * 2)}px Orbitron, sans-serif`;
  ctx.textAlign   = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowBlur  = 12;
  ctx.shadowColor = '#ffcc00';
  ctx.fillText(`x${combo} COMBO`, 10, 8);
  ctx.shadowBlur  = 0;
}

// ── Overlay screens ───────────────────────────────────────────────────
function drawCenteredBox(lines) {
  // lines: [{text, size, color, glow}]
  const bw = 440, bh = lines.length * 50 + 40;
  const bx = (W - bw) / 2, by = (H - bh) / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,242,255,0.4)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  lines.forEach((l, i) => {
    ctx.font        = `${l.bold ? 'bold' : ''} ${l.size}px Orbitron, sans-serif`;
    ctx.fillStyle   = l.color || '#fff';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    if (l.glow) { ctx.shadowBlur = 18; ctx.shadowColor = l.glow; }
    ctx.fillText(l.text, W / 2, by + 36 + i * 50);
    ctx.shadowBlur = 0;
  });
}

function drawMenu() {
  drawCenteredBox([
    { text: '🎮 BRICK BREAKER',       size: 26, color: '#00f2ff', glow: '#00f2ff', bold: true },
    { text: 'SPACE or Click to Start', size: 14, color: '#aaa' },
    { text: '← → or Mouse to move',   size: 13, color: '#777' },
    { text: 'P = Pause',               size: 12, color: '#555' },
  ]);
}

function drawPaused() {
  drawCenteredBox([
    { text: 'PAUSED',              size: 30, color: '#ffcc00', glow: '#ffcc00', bold: true },
    { text: 'Press P to Resume',   size: 14, color: '#aaa' },
  ]);
}

function drawLifeLost() {
  drawCenteredBox([
    { text: '💥 OOPS!',                       size: 26, color: '#ff4444', glow: '#ff4444', bold: true },
    { text: `${lives} ${lives === 1 ? 'Life' : 'Lives'} Remaining`, size: 16, color: '#aaa' },
    { text: 'SPACE or Click to Continue',      size: 13, color: '#777' },
  ]);
}

function drawGameOver() {
  drawCenteredBox([
    { text: 'GAME OVER',        size: 30, color: '#ff4444', glow: '#ff4444', bold: true },
    { text: `Final Score: ${score}`,   size: 16, color: '#ffcc00', glow: '#ffcc00' },
    { text: `Best: ${hiScore}`,        size: 13, color: '#aaa' },
    { text: 'SPACE or Click to Retry', size: 12, color: '#666' },
  ]);
}

function drawWin() {
  drawCenteredBox([
    { text: '🏆 YOU WIN!',             size: 28, color: '#7fff00', glow: '#7fff00', bold: true },
    { text: `Score: ${score}`,          size: 18, color: '#ffcc00', glow: '#ffcc00' },
    { text: `Best: ${hiScore}`,         size: 13, color: '#aaa' },
    { text: 'SPACE or Click to Replay', size: 12, color: '#666' },
  ]);
}

function drawLaunchHint() {
  if (launched) return;
  ctx.fillStyle    = 'rgba(255,255,255,0.5)';
  ctx.font         = '11px Orbitron, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SPACE or Click to launch', W / 2, paddle.y - 22);
}

// ── Main draw ─────────────────────────────────────────────────────────
function draw() {
  // Background
  ctx.fillStyle = '#080818';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = 'rgba(0,242,255,0.03)';
  ctx.lineWidth   = 1;
  for (let x = 0; x < W; x += 44) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 44) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  drawBricks();
  drawPowerUps();
  drawParticles();
  drawPaddle();
  drawBall();
  drawActivePU();
  drawCombo();
  drawLaunchHint();

  if (state === 'MENU')      drawMenu();
  if (state === 'PAUSED')    drawPaused();
  if (state === 'LIFE_LOST') drawLifeLost();
  if (state === 'GAME_OVER') drawGameOver();
  if (state === 'WIN')       drawWin();
}

// ── Main loop ─────────────────────────────────────────────────────────
function loop() {
  requestAnimationFrame(loop);
  if (state === 'PLAYING') {
    updatePaddle();
    updateBall();
    updatePowerUps();
    updateParticles();
    checkLevelComplete();
  }
  draw();
}

// ── Input ─────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  keys[e.key] = true;

  if (e.key === 'p' || e.key === 'P') {
    if (state === 'PLAYING') state = 'PAUSED';
    else if (state === 'PAUSED') state = 'PLAYING';
  }

  if (e.code === 'Space') {
    e.preventDefault();
    handleAction();
  }
});

document.addEventListener('keyup', e => { keys[e.key] = false; });

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  mouseX = (e.clientX - rect.left) * scaleX;
});

canvas.addEventListener('mouseleave', () => { mouseX = null; });

canvas.addEventListener('click', () => { handleAction(); });

function handleAction() {
  switch (state) {
    case 'MENU':
      state    = 'PLAYING';
      launched = false;
      break;
    case 'PAUSED':
      state = 'PLAYING';
      break;
    case 'PLAYING':
      if (!launched) { launched = true; }
      break;
    case 'LIFE_LOST':
      paddle   = makePaddle();
      ball     = makeBall();
      launched = false;
      state    = 'PLAYING';
      break;
    case 'GAME_OVER':
      initGame();
      state = 'PLAYING';
      break;
    case 'WIN':
      initGame();
      state = 'PLAYING';
      break;
  }
}

// Music toggle
document.getElementById('musicToggle').addEventListener('click', () => {
  const music = document.getElementById('bgMusic');
  const btn   = document.getElementById('musicToggle');
  if (music.paused) { music.play(); btn.textContent = '🔊 Mute Music'; }
  else               { music.pause(); btn.textContent = '🔇 Unmute Music'; }
});

// ── Boot ──────────────────────────────────────────────────────────────
initGame();
loop();
