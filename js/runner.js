const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // ─── Constants ───────────────────────────────────────────────────────────
    const GROUND_Y = 240;
    const PLAYER_W = 36;
    const PLAYER_H = 50;
    const GRAVITY = 0.7;
    const JUMP_FORCE = -16;
    const DUCK_H = 28;

    // ─── State ───────────────────────────────────────────────────────────────
    let gameState = 'idle'; // idle | running | over
    let score = 0;
    let highScore = 0;
    let frameCount = 0;
    let gameSpeed = 5;
    let animFrame;

    // ─── Player ──────────────────────────────────────────────────────────────
    const player = {
      x: 100,
      y: GROUND_Y - PLAYER_H,
      vy: 0,
      jumpsLeft: 2,
      isDucking: false,
      trail: [],
      get h() { return this.isDucking ? DUCK_H : PLAYER_H; },
      get w() { return this.isDucking ? PLAYER_W + 14 : PLAYER_W; }
    };

    // ─── Obstacles ───────────────────────────────────────────────────────────
    let obstacles = [];
    let particles = [];
    let bgStars = [];
    let groundOffset = 0;

    // ─── Init stars ──────────────────────────────────────────────────────────
    for (let i = 0; i < 80; i++) {
      bgStars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * (GROUND_Y - 20),
        r: Math.random() * 1.5 + 0.3,
        speed: Math.random() * 0.5 + 0.1,
        alpha: Math.random() * 0.7 + 0.3
      });
    }

    // ─── Obstacle types ──────────────────────────────────────────────────────
    const OBSTACLE_TYPES = [
      // Low cactus (jump over)
      { w: 24, h: 50, groundOffset: 0, color: '#ff4444', glow: '#ff4444', type: 'cactus' },
      // Tall cactus (jump over)
      { w: 20, h: 72, groundOffset: 0, color: '#ff6600', glow: '#ff6600', type: 'tall' },
      // Wide low block (jump or duck)
      { w: 60, h: 28, groundOffset: 0, color: '#aa44ff', glow: '#aa44ff', type: 'block' },
      // Flying obstacle (duck under)
      { w: 50, h: 22, groundOffset: -80, color: '#ffcc00', glow: '#ffcc00', type: 'fly' },
      // Spiky mid obstacle
      { w: 32, h: 42, groundOffset: 0, color: '#00ffaa', glow: '#00ffaa', type: 'spike' },
    ];

    // ─── Spawn logic ─────────────────────────────────────────────────────────
    let nextSpawnAt = 100;

    function spawnObstacle() {
      const tmpl = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
      const obj = {
        x: canvas.width + 20,
        y: GROUND_Y - tmpl.h + tmpl.groundOffset,
        w: tmpl.w,
        h: tmpl.h,
        color: tmpl.color,
        glow: tmpl.glow,
        type: tmpl.type,
        speed: gameSpeed
      };
      obstacles.push(obj);
      const minGap = Math.max(60, 180 - score * 0.05);
      nextSpawnAt = frameCount + minGap + Math.floor(Math.random() * 80);
    }

    // ─── Input ───────────────────────────────────────────────────────────────
    function jump() {
      if (gameState === 'idle' || gameState === 'over') {
        startGame();
        return;
      }
      if (player.jumpsLeft > 0) {
        player.vy = JUMP_FORCE;
        player.jumpsLeft--;
        spawnJumpParticles();
      }
    }

    function duck(val) {
      player.isDucking = val;
      if (val) {
        // Snap to ground if ducking mid-air
        if (player.y < GROUND_Y - DUCK_H) {
          player.vy = 4;
        }
      }
    }

    document.addEventListener('keydown', e => {
      if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); jump(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); duck(true); }
    });
    document.addEventListener('keyup', e => {
      if (e.key === 'ArrowDown') duck(false);
    });

    // Touch support
    let touchStartY = 0;
    canvas.addEventListener('touchstart', e => {
      touchStartY = e.touches[0].clientY;
      jump();
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (dy > 40) duck(true);
      else setTimeout(() => duck(false), 200);
    });

    // ─── Particles ───────────────────────────────────────────────────────────
    function spawnJumpParticles() {
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: player.x + player.w / 2,
          y: player.y + player.h,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * -3 - 1,
          life: 1,
          color: '#00f2ff'
        });
      }
    }

    function spawnDeathParticles() {
      for (let i = 0; i < 20; i++) {
        particles.push({
          x: player.x + player.w / 2,
          y: player.y + player.h / 2,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 1,
          color: ['#ff4444', '#ff8800', '#ffcc00'][Math.floor(Math.random() * 3)]
        });
      }
    }

    // ─── Collision ───────────────────────────────────────────────────────────
    function checkCollision(obs) {
      const pad = 6; // small padding to make it feel fair
      return (
        player.x + pad < obs.x + obs.w &&
        player.x + player.w - pad > obs.x &&
        player.y + pad < obs.y + obs.h &&
        player.y + player.h - pad > obs.y
      );
    }

    // ─── Draw helpers ────────────────────────────────────────────────────────
    function drawGlowRect(x, y, w, h, color, blur = 15) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }

    function drawPlayer() {
      const px = player.x;
      const py = player.y;
      const pw = player.w;
      const ph = player.h;

      // Trail
      player.trail.forEach((t, i) => {
        ctx.save();
        ctx.globalAlpha = (i / player.trail.length) * 0.3;
        ctx.shadowColor = '#00f2ff';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#00f2ff';
        ctx.fillRect(t.x, t.y, t.w, t.h);
        ctx.restore();
      });

      // Body glow
      ctx.save();
      ctx.shadowColor = '#00f2ff';
      ctx.shadowBlur = 20;

      // Body
      ctx.fillStyle = '#00c8ff';
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 6);
      ctx.fill();

      // Visor / eye
      if (!player.isDucking) {
        ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 10;
        ctx.fillRect(px + pw - 12, py + 8, 8, 5);
      }

      // Legs animation
      if (gameState === 'running') {
        const legSwing = Math.sin(frameCount * 0.3) * 6;
        ctx.fillStyle = '#008ac8';
        ctx.fillRect(px + 6, py + ph - 4, 8, 6 + legSwing);
        ctx.fillRect(px + pw - 14, py + ph - 4, 8, 6 - legSwing);
      }

      ctx.restore();
    }

    function drawObstacle(obs) {
      ctx.save();
      ctx.shadowColor = obs.glow;
      ctx.shadowBlur = 20;
      ctx.fillStyle = obs.color;

      if (obs.type === 'cactus' || obs.type === 'tall') {
        // Cactus shape
        ctx.fillRect(obs.x + obs.w / 2 - 5, obs.y, 10, obs.h);
        if (obs.type === 'cactus') {
          ctx.fillRect(obs.x, obs.y + 14, obs.w, 8);
          ctx.fillRect(obs.x, obs.y + 8, 10, 10);
          ctx.fillRect(obs.x + obs.w - 10, obs.y + 8, 10, 10);
        }
      } else if (obs.type === 'spike') {
        // Spike shape
        ctx.fillRect(obs.x + obs.w / 2 - 4, obs.y + 10, 8, obs.h - 10);
        // Spikes on top
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(obs.x + i * 12, obs.y + 18);
          ctx.lineTo(obs.x + i * 12 + 6, obs.y);
          ctx.lineTo(obs.x + i * 12 + 12, obs.y + 18);
          ctx.fill();
        }
      } else if (obs.type === 'fly') {
        // Flying saucer shape
        ctx.beginPath();
        ctx.ellipse(obs.x + obs.w / 2, obs.y + obs.h / 2, obs.w / 2, obs.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.ellipse(obs.x + obs.w / 2, obs.y + obs.h / 2 - 4, obs.w / 4, obs.h / 4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Block
        ctx.beginPath();
        ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 4);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawGround() {
      ctx.save();
      ctx.strokeStyle = '#00f2ff';
      ctx.shadowColor = '#00f2ff';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(canvas.width, GROUND_Y);
      ctx.stroke();

      // Ground grid lines
      ctx.lineWidth = 0.5;
      ctx.shadowBlur = 2;
      ctx.globalAlpha = 0.3;
      const gridSize = 40;
      const offset = groundOffset % gridSize;
      for (let x = -offset; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y);
        ctx.lineTo(x - 60, canvas.height);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawBackground() {
      // Gradient sky
      const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      grad.addColorStop(0, '#050510');
      grad.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, GROUND_Y);

      // Stars
      bgStars.forEach(star => {
        ctx.save();
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (gameState === 'running') {
          star.x -= star.speed * (gameSpeed / 5);
          if (star.x < 0) star.x = canvas.width;
        }
      });

      // Ground area
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    }

    function drawParticles() {
      particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    function drawHUD() {
      if (gameState === 'idle') {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#00f2ff';
        ctx.shadowColor = '#00f2ff';
        ctx.shadowBlur = 20;
        ctx.font = 'bold 36px Orbitron';
        ctx.fillText('ENDLESS RUNNER', canvas.width / 2, 110);

        ctx.shadowBlur = 5;
        ctx.font = '16px Orbitron';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Press SPACE or ↑ to Start', canvas.width / 2, 155);
        ctx.fillText('Double Jump | Duck with ↓', canvas.width / 2, 180);
        ctx.restore();
      }

      if (gameState === 'over') {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';
        ctx.font = 'bold 38px Orbitron';
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 20;
        ctx.fillText('GAME OVER', canvas.width / 2, 100);

        ctx.font = '22px Orbitron';
        ctx.fillStyle = '#00f2ff';
        ctx.shadowColor = '#00f2ff';
        ctx.shadowBlur = 10;
        ctx.fillText(`Score: ${Math.floor(score)}`, canvas.width / 2, 145);
        ctx.fillText(`Best: ${Math.floor(highScore)}`, canvas.width / 2, 175);

        ctx.font = '15px Orbitron';
        ctx.fillStyle = '#888';
        ctx.shadowBlur = 0;
        ctx.fillText('Press SPACE or ↑ to Restart', canvas.width / 2, 215);
        ctx.restore();
      }
    }

    // ─── Update ──────────────────────────────────────────────────────────────
    function update() {
      if (gameState !== 'running') return;

      frameCount++;
      score += 0.1;

      // Speed up over time
      gameSpeed = 5 + Math.floor(score / 100) * 0.5;
      if (gameSpeed > 18) gameSpeed = 18;

      document.getElementById('scoreDisplay').textContent = Math.floor(score);
      document.getElementById('speedDisplay').textContent = Math.floor(gameSpeed - 4);

      // Player physics
      player.vy += GRAVITY;
      player.y += player.vy;

      if (player.y >= GROUND_Y - player.h) {
        player.y = GROUND_Y - player.h;
        player.vy = 0;
        player.jumpsLeft = 2;
      }

      // Trail
      player.trail.push({ x: player.x, y: player.y, w: player.w, h: player.h });
      if (player.trail.length > 6) player.trail.shift();

      // Ground scroll
      groundOffset += gameSpeed;

      // Particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.04;
      });
      particles = particles.filter(p => p.life > 0);

      // Spawn obstacles
      if (frameCount >= nextSpawnAt) spawnObstacle();

      // Move obstacles
      obstacles.forEach(obs => { obs.x -= gameSpeed; });
      obstacles = obstacles.filter(obs => obs.x + obs.w > -20);

      // Collision
      for (const obs of obstacles) {
        if (checkCollision(obs)) {
          gameOver();
          return;
        }
      }
    }

    // ─── Draw ────────────────────────────────────────────────────────────────
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawBackground();
      drawGround();
      obstacles.forEach(drawObstacle);
      drawPlayer();
      drawParticles();
      drawHUD();
    }

    // ─── Game lifecycle ───────────────────────────────────────────────────────
    function startGame() {
      score = 0;
      frameCount = 0;
      gameSpeed = 5;
      obstacles = [];
      particles = [];
      nextSpawnAt = 100;

      player.x = 100;
      player.y = GROUND_Y - PLAYER_H;
      player.vy = 0;
      player.jumpsLeft = 2;
      player.isDucking = false;
      player.trail = [];

      gameState = 'running';
    }

    function gameOver() {
      gameState = 'over';
      if (score > highScore) {
        highScore = score;
        document.getElementById('highScoreDisplay').textContent = Math.floor(highScore);
      }
      spawnDeathParticles();
    }

    // ─── Main loop ───────────────────────────────────────────────────────────
    function loop() {
      update();
      draw();
      animFrame = requestAnimationFrame(loop);
    }

    // Draw idle screen initially
    draw();
    loop();