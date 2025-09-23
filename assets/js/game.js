(function(){
  const canvas = document.getElementById('game');
  if (!canvas) return;
  const c = canvas.getContext('2d');

  function resize() {
    const ratio = 960 / 540;
    const w = Math.min(canvas.parentElement.clientWidth, 960);
    const h = Math.round(w / ratio);
    canvas.width = 960;
    canvas.height = 540;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  const W = () => canvas.width, H = () => canvas.height;
  let running = true, paused = false;
  let playerScore = 0, aiScore = 0;
  let highScore = parseInt(localStorage.getItem('soccer_high') || '0', 10);
  let gameTime = 0;
  const matchDuration = 90; // 90 seconds match

  // Game objects
  const field = {
    width: W(),
    height: H(),
    centerX: W() / 2,
    centerY: H() / 2,
    goalWidth: 120,
    goalDepth: 20,
    penaltyAreaWidth: 300,
    penaltyAreaHeight: 150,
    centerCircleRadius: 80
  };

  const player = {
    x: W() * 0.25,
    y: H() / 2,
    radius: 20,
    speed: 5,
    color: '#3B82F6'
  };

  const ai = {
    x: W() * 0.75,
    y: H() / 2,
    radius: 20,
    speed: 4,
    color: '#EF4444'
  };

  const ball = {
    x: W() / 2,
    y: H() / 2,
    radius: 10,
    speedX: 0,
    speedY: 0,
    color: '#FFFFFF',
    friction: 0.98,
    maxSpeed: 12
  };

  // Input handling
  const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    shoot: false
  };

  window.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.up = true;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.down = true;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = true;
    if (e.key === ' ' || e.key === 'Enter') keys.shoot = true;
    if (e.key === 'p' || e.key === 'P') paused = !paused;
    if (e.key === 'r' || e.key === 'R') restart();
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.up = false;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.down = false;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = false;
    if (e.key === ' ' || e.key === 'Enter') keys.shoot = false;
  });

  // Collision detection
  function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  function checkCollision(obj1, obj2) {
    return distance(obj1.x, obj1.y, obj2.x, obj2.y) < obj1.radius + obj2.radius;
  }

  // Ball physics
  function updateBall() {
    // Apply friction
    ball.speedX *= ball.friction;
    ball.speedY *= ball.friction;
    
    // Update position
    ball.x += ball.speedX;
    ball.y += ball.speedY;
    
    // Boundary collision
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.speedX *= -0.7;
    }
    if (ball.x + ball.radius > W()) {
      ball.x = W() - ball.radius;
      ball.speedX *= -0.7;
    }
    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.speedY *= -0.7;
    }
    if (ball.y + ball.radius > H()) {
      ball.y = H() - ball.radius;
      ball.speedY *= -0.7;
    }
    
    // Limit speed
    const speed = Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2);
    if (speed > ball.maxSpeed) {
      ball.speedX = (ball.speedX / speed) * ball.maxSpeed;
      ball.speedY = (ball.speedY / speed) * ball.maxSpeed;
    }
    
    // Goal detection
    if (ball.x < field.goalDepth && 
        ball.y > H()/2 - field.goalWidth/2 && 
        ball.y < H()/2 + field.goalWidth/2) {
      aiScore++;
      resetBall();
    }
    
    if (ball.x > W() - field.goalDepth && 
        ball.y > H()/2 - field.goalWidth/2 && 
        ball.y < H()/2 + field.goalWidth/2) {
      playerScore++;
      resetBall();
    }
  }

  function resetBall() {
    ball.x = W() / 2;
    ball.y = H() / 2;
    ball.speedX = 0;
    ball.speedY = 0;
    player.x = W() * 0.25;
    player.y = H() / 2;
    ai.x = W() * 0.75;
    ai.y = H() / 2;
  }

  // Player movement
  function updatePlayer() {
    if (keys.up && player.y - player.radius > 0) player.y -= player.speed;
    if (keys.down && player.y + player.radius < H()) player.y += player.speed;
    if (keys.left && player.x - player.radius > 0) player.x -= player.speed;
    if (keys.right && player.x + player.radius < W()) player.x += player.speed;
    
    // Ball interaction
    if (checkCollision(player, ball)) {
      const angle = Math.atan2(ball.y - player.y, ball.x - player.x);
      const power = keys.shoot ? 8 : 4;
      ball.speedX += Math.cos(angle) * power;
      ball.speedY += Math.sin(angle) * power;
    }
  }

  // AI movement
  function updateAI() {
    // Simple AI that follows the ball
    const dx = ball.x - ai.x;
    const dy = ball.y - ai.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > ai.radius + ball.radius + 10) {
      ai.x += (dx / dist) * ai.speed;
      ai.y += (dy / dist) * ai.speed;
    }
    
    // Keep AI in bounds
    ai.x = Math.max(ai.radius, Math.min(W() - ai.radius, ai.x));
    ai.y = Math.max(ai.radius, Math.min(H() - ai.radius, ai.y));
    
    // Ball interaction
    if (checkCollision(ai, ball)) {
      const angle = Math.atan2(ball.y - ai.y, ball.x - ai.x);
      ball.speedX += Math.cos(angle) * 5;
      ball.speedY += Math.sin(angle) * 5;
    }
  }

  // Draw field
  function drawField() {
    // Field background
    c.fillStyle = '#1a5e1a';
    c.fillRect(0, 0, W(), H());
    
    // Field lines
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    
    // Outer boundary
    c.strokeRect(10, 10, W() - 20, H() - 20);
    
    // Center line
    c.beginPath();
    c.moveTo(W() / 2, 10);
    c.lineTo(W() / 2, H() - 10);
    c.stroke();
    
    // Center circle
    c.beginPath();
    c.arc(W() / 2, H() / 2, field.centerCircleRadius, 0, Math.PI * 2);
    c.stroke();
    
    // Goals
    c.fillStyle = '#ffffff';
    c.fillRect(0, H()/2 - field.goalWidth/2, field.goalDepth, field.goalWidth);
    c.fillRect(W() - field.goalDepth, H()/2 - field.goalWidth/2, field.goalDepth, field.goalWidth);
    
    // Penalty areas
    c.strokeRect(10, H()/2 - field.penaltyAreaHeight/2, field.penaltyAreaWidth, field.penaltyAreaHeight);
    c.strokeRect(W() - 10 - field.penaltyAreaWidth, H()/2 - field.penaltyAreaHeight/2, field.penaltyAreaWidth, field.penaltyAreaHeight);
  }

  // Draw players and ball
  function drawPlayers() {
    // Player
    c.fillStyle = player.color;
    c.beginPath();
    c.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    c.fill();
    
    // AI
    c.fillStyle = ai.color;
    c.beginPath();
    c.arc(ai.x, ai.y, ai.radius, 0, Math.PI * 2);
    c.fill();
    
    // Ball
    c.fillStyle = ball.color;
    c.beginPath();
    c.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    c.fill();
  }

  // Draw HUD
  function drawHUD() {
    c.fillStyle = 'rgba(255, 255, 255, 0.92)';
    c.font = '20px Inter, Arial';
    c.fillText(`Player: ${playerScore}`, 20, 30);
    c.fillText(`AI: ${aiScore}`, W() - 80, 30);
    
    const timeLeft = Math.max(0, matchDuration - Math.floor(gameTime));
    c.textAlign = 'center';
    c.fillText(`${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`, W() / 2, 30);
    c.textAlign = 'left';
    
    c.fillText(`High Score: ${highScore}`, 20, H() - 20);
    
    if (paused) {
      c.textAlign = 'center';
      c.font = '30px Inter, Arial';
      c.fillText('PAUSED', W() / 2, H() / 2);
      c.textAlign = 'left';
    }
    
    if (gameTime >= matchDuration) {
      c.textAlign = 'center';
      c.font = '30px Inter, Arial';
      c.fillText('MATCH ENDED', W() / 2, H() / 2 - 30);
      c.font = '20px Inter, Arial';
      if (playerScore > aiScore) {
        c.fillText('You Win! Press R to restart', W() / 2, H() / 2 + 10);
      } else if (playerScore < aiScore) {
        c.fillText('AI Wins! Press R to restart', W() / 2, H() / 2 + 10);
      } else {
        c.fillText('Draw! Press R to restart', W() / 2, H() / 2 + 10);
      }
      c.textAlign = 'left';
    }
  }

  // Game loop
  function loop() {
    if (!running || paused) {
      requestAnimationFrame(loop);
      return;
    }
    
    // Update game time
    gameTime += 1/60;
    
    // Check if match ended
    if (gameTime >= matchDuration) {
      running = false;
    }
    
    // Update game objects
    updateBall();
    updatePlayer();
    updateAI();
    
    // Draw everything
    c.clearRect(0, 0, W(), H());
    drawField();
    drawPlayers();
    drawHUD();
    
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Restart function
  function restart() {
    highScore = Math.max(highScore, playerScore);
    localStorage.setItem('soccer_high', String(highScore));
    
    // Save to leaderboard
    const lb = JSON.parse(localStorage.getItem('soccer_leaderboard') || '[]');
    lb.push({
      score: playerScore,
      opponent: aiScore,
      at: new Date().toISOString()
    });
    lb.sort((a, b) => b.score - a.score);
    localStorage.setItem('soccer_leaderboard', JSON.stringify(lb.slice(0, 50)));
    
    // Reset game state
    running = true;
    paused = false;
    playerScore = 0;
    aiScore = 0;
    gameTime = 0;
    resetBall();
  }

  // Button event listeners
  document.getElementById('btn-pause')?.addEventListener('click', () => { 
    paused = !paused; 
  });
  
  document.getElementById('btn-restart')?.addEventListener('click', restart);
})();