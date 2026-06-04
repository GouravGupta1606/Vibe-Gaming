/* =====================================================================
   VibGaming — home.js
   Card hover effects + live runner preview canvas animation + Video Logic
   ===================================================================== */

//  Card hover image swaps 
const cardBackImages = {
  card1: 'memory',
  card2: null,      // runner — uses canvas
  card3: 'tictac',
  card4: 'snake',
  card5: 'brick',
};

function setCardBack(id, src) {
  const el = document.getElementById(id);
  if (!el) return;
  if (src) {
    el.querySelector('.card-face-back').style.backgroundImage = `url('../assets/images/${src}.jpg')`;
  }
}

document.querySelectorAll('.card-flip-wrap').forEach(wrap => {
  const id = wrap.dataset.card;
  const img = cardBackImages[id];
  if (img) {
    wrap.querySelector('.card-face-back').style.backgroundImage = `url('../assets/images/${img}.jpg')`;
  }
});

//  Live Runner preview animation 
(function () {
  const cv = document.getElementById('previewCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const GY = H - 38;
  let px = 60, py = GY - 30, pvy = 0;
  let obs = [{ x: W + 40, y: GY - 38, w: 18, h: 38, c: '#ff4444' }];
  let frame = 0, goff = 0;
  const stars = Array.from({ length: 45 }, () => ({
    x: Math.random() * W,
    y: Math.random() * (GY - 10),
    r: Math.random() * 1.2 + 0.3,
    s: Math.random() * 0.4 + 0.1
  }));

  function step() {
    frame++;
    // Auto-jump logic
    if (py >= GY - 30) {
      const nearest = obs.find(o => o.x - px < 120 && o.x - px > 0);
      if (nearest && nearest.x - px < 88) pvy = -13;
    }
    pvy += 0.6;
    py += pvy;
    if (py >= GY - 30) { py = GY - 30; pvy = 0; }

    obs.forEach(o => { o.x -= 4; });
    obs = obs.filter(o => o.x + o.w > 0);
    if (frame % 70 === 0) {
      const colors = ['#ff4444', '#aa44ff', '#ffcc00'];
      obs.push({ x: W + 20, y: GY - 35, w: 16, h: 35, c: colors[frame % 3] });
    }
    goff += 4;

    // Sky gradient
    const g = ctx.createLinearGradient(0, 0, 0, GY);
    g.addColorStop(0, '#050510');
    g.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, GY, W, H - GY);

    // Stars
    stars.forEach(s => {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      s.x -= s.s;
      if (s.x < 0) s.x = W;
    });
    ctx.globalAlpha = 1;

    // Ground
    ctx.strokeStyle = '#00f2ff';
    ctx.shadowColor = '#00f2ff';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GY);
    ctx.lineTo(W, GY);
    ctx.stroke();

    // Grid lines
    ctx.lineWidth = 0.4;
    ctx.globalAlpha = 0.2;
    for (let x = -(goff % 30); x < W; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, GY);
      ctx.lineTo(x - 50, H);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Obstacles
    obs.forEach(o => {
      ctx.fillStyle = o.c;
      ctx.shadowColor = o.c;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(o.x, o.y, o.w, o.h, 3);
      ctx.fill();
    });

    // Player
    ctx.fillStyle = '#00c8ff';
    ctx.shadowColor = '#00f2ff';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.roundRect(px, py, 22, 30, 4);
    ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 8;
    ctx.fillRect(px + 14, py + 6, 6, 4);
    ctx.shadowBlur = 0;

    requestAnimationFrame(step);
  }
  step();
})();

/* =====================================================================
   Video Wrapper Logic
   Handles unmuting and showing controls when the play overlay is clicked
   ===================================================================== */
document.querySelectorAll('.video-wrapper').forEach(wrapper => {
  wrapper.addEventListener('click', function () {
    const video = this.querySelector('video');
    const overlay = this.querySelector('.play-overlay');

    if (video && overlay) {
      video.muted = false;
      video.controls = true;
      overlay.style.display = 'none';
      video.currentTime = 0; // Starts the video from the beginning
    }
  });
});