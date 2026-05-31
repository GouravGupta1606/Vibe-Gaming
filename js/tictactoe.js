/* =====================================================================
   VibGaming — tictactoe.js
   ===================================================================== */

const boxes      = document.querySelectorAll('.box');
const resetBtn   = document.getElementById('resetBtn');
const msgArea    = document.getElementById('message-area');
const turnDisplay = document.getElementById('turn-display');

let count    = 0;
let gameOver = false;

const winCombos = [
  [0,1,2], [3,4,5], [6,7,8],   // rows
  [0,3,6], [1,4,7], [2,5,8],   // cols
  [0,4,8], [2,4,6]              // diagonals
];

function showMessage(text, type) {
  msgArea.innerHTML = '';
  const msg = document.createElement('div');
  msg.classList.add('message', type);
  msg.textContent = text;
  msgArea.appendChild(msg);
}

function checkWinner(player) {
  for (const [a, b, c] of winCombos) {
    if (boxes[a].innerText === player &&
        boxes[b].innerText === player &&
        boxes[c].innerText === player) {
      boxes[a].classList.add('winner');
      boxes[b].classList.add('winner');
      boxes[c].classList.add('winner');
      // Fixed win message (was broken template-literal ternary bug in original)
      showMessage(player === 'X' ? '🎉 X Wins!' : '🎉 O Wins!', 'win');
      gameOver = true;
      return true;
    }
  }
  return false;
}

boxes.forEach(box => {
  box.addEventListener('click', () => {
    if (box.innerText !== '' || gameOver) return;

    const player = (count % 2 === 0) ? 'X' : '0';
    box.innerText = player;
    box.classList.add(player === 'X' ? 'x-mark' : 'o-mark', 'taken');
    count++;

    if (checkWinner(player)) return;

    if (count === 9) {
      showMessage("🤝 It's a Draw!", 'draw');
      gameOver = true;
      return;
    }

    const next = (count % 2 === 0) ? 'X' : '0';
    turnDisplay.textContent   = next;
    turnDisplay.style.color   = next === 'X' ? '#ff4488' : '#00f2ff';
  });
});

resetBtn.addEventListener('click', () => {
  boxes.forEach(box => {
    box.innerText = '';
    box.className = 'box';
  });
  msgArea.innerHTML      = '';
  count    = 0;
  gameOver = false;
  turnDisplay.textContent = 'X';
  turnDisplay.style.color = '#00f2ff';
});
