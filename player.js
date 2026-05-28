class Player {
  constructor(x, y, game) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 30;
    this.game = game;
    this.vy = 0;
    this.vx = 0;
    this.speed = 5;
    this.onGround = false;
    this.animFrame = 0;
    this.animTimer = 0;
    this.facing = 1;
    this.jetpackActive = false;
    this.jetpackTime = 0;
    this.adminMode = false;
    this.shieldActive = false;
  }

  activateJetpack() {
    this.jetpackActive = true;
    this.jetpackTime = 120;
  }

  toggleAdminMode() {
    this.adminMode = !this.adminMode;
    if (this.adminMode) {
      this.jetpackActive = false;
      this.vy = 0;
      this.vx = 0;
    } else {
      this.jetpackActive = false;
      this.vy = 0;
      this.vx = 0;
      this.onGround = false;
    }
  }

  update(dt) {
    const g = this.game;

    if (this.adminMode) {
      const flySpeed = 8;
      let dx = 0, dy = 0;
      if (g.keys['ArrowLeft'] || g.keys['a']) { dx = -flySpeed; this.facing = -1; }
      if (g.keys['ArrowRight'] || g.keys['d']) { dx = flySpeed; this.facing = 1; }
      if (g.keys['ArrowUp'] || g.keys['w']) dy = -flySpeed;
      if (g.keys['ArrowDown'] || g.keys['s']) dy = flySpeed;

      this.x += dx * dt;
      this.y += dy * dt;
      this.vx = dx;
      this.vy = dy;

      if (this.x + this.width < 0) this.x = g.width;
      if (this.x > g.width) this.x = -this.width;

      this.animTimer += dt;
      if (this.animTimer > 10) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 2;
      }
      return;
    }

    if (g.keys['ArrowLeft'] || g.keys['a']) {
      this.vx = -this.speed;
      this.facing = -1;
    } else if (g.keys['ArrowRight'] || g.keys['d']) {
      this.vx = this.speed;
      this.facing = 1;
    } else {
      this.vx *= 0.8;
    }

    if (this.jetpackActive) {
      this.vy = -3;
      this.jetpackTime -= dt;
      if (this.jetpackTime <= 0) {
        this.jetpackActive = false;
      }
    } else {
      this.vy += g.gravity * dt;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x + this.width < 0) this.x = g.width;
    if (this.x > g.width) this.x = -this.width;

    this.onGround = false;

    for (const p of g.platforms) {
      if (p.broken) continue;
      if (this.vy >= 0 &&
        this.x + this.width > p.x &&
        this.x < p.x + p.width &&
        this.y + this.height > p.y &&
        this.y + this.height < p.y + p.height + this.vy + 5) {

        this.y = p.y - this.height;
        this.vy = g.jumpStrength;
        this.onGround = true;
        g.playSound('jump');

        if (p.type === 'blue') {
          this.vy = g.springStrength;
        }

        if (p.type === 'brown') {
          p.breaking = true;
        }

        if (!p.scored) {
          p.scored = true;
          g.score += 1;
        }
        break;
      }
    }

    for (let i = g.enemies.length - 1; i >= 0; i--) {
      const e = g.enemies[i];
      if (g.invulnTimer > 0) break;
      if (this.x + this.width > e.x && this.x < e.x + e.size &&
        this.y + this.height > e.y && this.y < e.y + e.size) {
        if (this.shieldActive) {
          this.shieldActive = false;
          g.enemies.splice(i, 1);
          g.addFloatingText('+50', e.x + e.size / 2, e.y - g.cameraY);
          g.score += 50;
          continue;
        }
        g.lives--;
        g.invulnTimer = 60;
        g.hitFlash = 6;
        g.screenShake = 8;
        g.playSound('hit');
        this.vy = 2;
        if (g.lives <= 0) {
          g.gameOver = true;
          g.playSound('death');
          if (g.score > g.highScore) {
            g.highScore = g.score;
            localStorage.setItem('doodleHighScore', g.score);
            g.isNewBest = true;
          }
        }
        g.enemies.splice(i, 1);
        return;
      }
    }

    for (let i = g.coins.length - 1; i >= 0; i--) {
      const c = g.coins[i];
      if (this.x + this.width > c.x && this.x < c.x + c.size &&
        this.y + this.height > c.y && this.y < c.y + c.size) {
        g.score += c.value;
        if (c.type === 'gold') g.goldCollected++;
        else if (c.type === 'silver') g.silverCollected++;
        else g.bronzeCollected++;
        g.addFloatingText('+' + c.value, c.x + c.size / 2, c.y - g.cameraY);
        g.spawnFlash = { wx: c.x + c.size / 2, wy: c.y, timer: 6 };
        g.coins.splice(i, 1);
      }
    }

    this.animTimer += dt;
    if (this.animTimer > 10) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }
  }

  draw(ctx) {
    const g = this.game;
    const tex = g.textureLoader;
    const drawX = this.x;
    const drawY = this.y - g.cameraY;

    ctx.save();

    if (g.invulnTimer > 0 && Math.floor(g.invulnTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    const cx = drawX + this.width / 2;
    const cy = drawY + this.height / 2;

    if (this.facing === -1) {
      ctx.translate(cx, 0);
      ctx.scale(-1, 1);
      ctx.translate(-cx, 0);
    }

    if (this.adminMode) {
      ctx.fillStyle = 'rgba(0, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(drawX + this.width / 2, drawY + this.height / 2, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(drawX + this.width / 2, drawY + this.height / 2, 24, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.shieldActive) {
      ctx.fillStyle = 'rgba(100, 200, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(drawX + this.width / 2, drawY + this.height / 2, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(drawX + this.width / 2, drawY + this.height / 2, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (this.jetpackActive) {
      const jpImg = tex.get('jetpack_player');
      if (jpImg && g.hasTextures) {
        ctx.drawImage(jpImg, drawX - 3, drawY - 4, 24, 28);
      } else {
        ctx.fillStyle = '#FF6F00';
        ctx.beginPath();
        ctx.arc(drawX + this.width / 2, drawY + this.height / 2, 14, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 3; i++) {
          const angle = Math.PI * 2 / 3 * i - Math.PI / 2;
          const fx = drawX + this.width / 2 + Math.cos(angle) * 18;
          const fy = drawY + this.height / 2 + Math.sin(angle) * 18;
          ctx.fillStyle = '#FF3D00';
          ctx.beginPath();
          ctx.moveTo(fx, fy + 6);
          ctx.lineTo(fx - 4, fy);
          ctx.lineTo(fx + 4, fy);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    const texName = this.animFrame === 0 ? 'player1' : 'player2';
    const img = tex.get(texName);

    if (img && g.hasTextures) {
      ctx.drawImage(img, drawX, drawY, this.width, this.height);
    } else {
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(drawX, drawY, this.width, this.height);

      ctx.fillStyle = '#fff';
      ctx.fillRect(drawX + 6, drawY + 6, 6, 6);
      ctx.fillRect(drawX + 18, drawY + 6, 6, 6);

      if (this.animFrame === 0) {
        ctx.fillStyle = '#333';
        ctx.fillRect(drawX + 5, drawY + 24, 8, 6);
        ctx.fillRect(drawX + 17, drawY + 24, 8, 6);
      } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(drawX + 3, drawY + 24, 10, 6);
        ctx.fillRect(drawX + 17, drawY + 24, 10, 6);
      }
    }

    if (this.jetpackActive) {
      const flameY = drawY + this.height;
      const flicker = Math.random() * 4;
      ctx.fillStyle = '#FF3D00';
      ctx.beginPath();
      ctx.moveTo(drawX + 8, flameY);
      ctx.lineTo(drawX + 15, flameY + 14 + flicker);
      ctx.lineTo(drawX + 22, flameY);
      ctx.fill();
      ctx.fillStyle = '#FFEA00';
      ctx.beginPath();
      ctx.moveTo(drawX + 11, flameY);
      ctx.lineTo(drawX + 15, flameY + 8 + flicker * 0.5);
      ctx.lineTo(drawX + 19, flameY);
      ctx.fill();
    }

    ctx.restore();
  }
}
