/* =====================================================================
   VibGaming — memory.js
   ===================================================================== */

const emojis = ['🐶', '🐱', '🦊', '🐼', '🐸', '🐵', '🐯', '🦁'];

let firstCard  = null;
let lockBoard  = false;
let moves      = 0;
let matchedPairs = 0;

/* Fisher-Yates shuffle — true random card positions every game */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initGame() {
  moves        = 0;
  matchedPairs = 0;
  firstCard    = null;
  lockBoard    = false;

  document.getElementById('moves').textContent     = 0;
  document.getElementById('matched').textContent   = 0;
  document.getElementById('remaining').textContent = 8;
  document.getElementById('win-msg').style.display       = 'none';
  document.getElementById('restart-btn').style.display   = 'none';

  const board = document.getElementById('game-board');
  board.innerHTML = '';

  const cardValues = shuffle([...emojis, ...emojis]);

  cardValues.forEach(value => {
    const card = document.createElement('div');
    card.classList.add('card');
    card.innerHTML = `<div class="front"></div><div class="back">${value}</div>`;
    card.addEventListener('click', () => flipCard(card, value));
    board.appendChild(card);
  });
}

function flipCard(card, value) {
  if (lockBoard ||
      card.classList.contains('flipped') ||
      card.classList.contains('matched')) return;

  card.classList.add('flipped');

  if (!firstCard) {
    firstCard = { card, value };
    return;
  }

  // Second card flipped — count the move
  moves++;
  document.getElementById('moves').textContent = moves;
  lockBoard = true;

  if (firstCard.value === value) {
    // Match!
    firstCard.card.classList.add('matched');
    card.classList.add('matched');
    matchedPairs++;
    document.getElementById('matched').textContent   = matchedPairs;
    document.getElementById('remaining').textContent = 8 - matchedPairs;

    firstCard  = null;
    lockBoard  = false;

    if (matchedPairs === 8) {
      setTimeout(() => {
        document.getElementById('win-msg').style.display     = 'block';
        document.getElementById('restart-btn').style.display = 'inline-block';
      }, 400);
    }
  } else {
    // No match — flip back after brief pause
    const second = card;
    const first  = firstCard.card;
    firstCard    = null;
    setTimeout(() => {
      second.classList.remove('flipped');
      first.classList.remove('flipped');
      lockBoard = false;
    }, 900);
  }
}

// Start on page load
initGame();
