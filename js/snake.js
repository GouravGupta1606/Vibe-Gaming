/* =====================================================================
   VibGaming — snake.js
   ===================================================================== */

const container  = document.querySelector('.container');
const restartBtn = document.getElementById('restartBtn');
const musicBtn   = document.getElementById('musicToggle');
const scoreEl    = document.querySelector('.score-display');
let cells = [];

// Build grid
for (let i = 0; i < 625; i++) {
  const cell = document.createElement('div');
  cell.classList.add('cell');
  container.appendChild(cell);
  cells.push(cell);
}

let snake, headX, headY, direction, foodIndex, gameInterval, score;

function startGame() {
  cells.forEach(c => (c.className = 'cell'));
  if (gameInterval) clearInterval(gameInterval);

  snake     = [];
  headX     = 10;
  headY     = 10;
  direction = 'right';
  foodIndex = -1;
  score     = 0;
  updateScore();

  snake.push(headY * 25 + headX);
  placeFood();
  gameInterval = setInterval(move, 180);
}

function placeFood() {
  if (foodIndex !== -1) cells[foodIndex].classList.remove('food');
  let newFood;
  do { newFood = Math.floor(Math.random() * 625); }
  while (snake.includes(newFood));
  foodIndex = newFood;
  cells[foodIndex].classList.add('food');
}

function updateScore() {
  if (scoreEl) scoreEl.textContent = `Score: ${score}`;
}

document.addEventListener('keydown', e => {
  const d = e.key.replace('Arrow', '').toLowerCase();
  if (d === 'up'    && direction !== 'down')  direction = d;
  if (d === 'down'  && direction !== 'up')    direction = d;
  if (d === 'left'  && direction !== 'right') direction = d;
  if (d === 'right' && direction !== 'left')  direction = d;
});

function move() {
  snake.forEach(i => cells[i].classList.remove('snake', 'head'));

  if (direction === 'up')    headY--;
  if (direction === 'down')  headY++;
  if (direction === 'left')  headX--;
  if (direction === 'right') headX++;

  if (headX < 0 || headX > 24 || headY < 0 || headY > 24) {
    clearInterval(gameInterval);
    showGameOver();
    return;
  }

  const newHead = headY * 25 + headX;

  if (snake.includes(newHead)) {
    clearInterval(gameInterval);
    showGameOver();
    return;
  }

  snake.unshift(newHead);

  if (newHead === foodIndex) {
    score += 10;
    updateScore();
    placeFood();
  } else {
    snake.pop();
  }

  snake.forEach((i, idx) => {
    cells[i].classList.add(idx === 0 ? 'head' : 'snake');
  });
}

function showGameOver() {
  const overlay = document.createElement('div');
  overlay.className = 'go-overlay';
  overlay.innerHTML = `
    <div class="go-box">
      <h2>GAME OVER</h2>
      <p>Score: ${score} &nbsp;|&nbsp; Length: ${snake.length}</p>
      <button class="game-btn" id="playAgainBtn">Play Again</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('playAgainBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    startGame();
  });
}

restartBtn.addEventListener('click', startGame);

// Music toggle
musicBtn.addEventListener('click', () => {
  const music = document.getElementById('bgMusic');
  if (music.paused) {
    music.play();
    musicBtn.textContent = '🔊 Mute Music';
  } else {
    music.pause();
    musicBtn.textContent = '🔇 Unmute Music';
  }
});

startGame();
