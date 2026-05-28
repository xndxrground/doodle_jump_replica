class Platform {
  constructor(x, y, type, game) {
    this.x = x;
    this.y = y;
    this.width = 70;
    this.height = 16;
    this.type = type;
    this.game = game;
    this.breaking = false;
    this.broken = false;
    this.breakTimer = 0;
    this.scored = false;
    this.dir = 1;
    this.speed = 0;
    this.crackFrame = 0;
    this.decor = null;
  }

  update(dt) {
    if (this.type === 'purple' && !this.broken) {
      this.x += this.dir * this.speed * dt;
      if (this.x < 0 || this.x + this.width > this.game.width) {
        this.dir *= -1;
      }
    }

    if (this.breaking) {
      this.breakTimer += dt;
      this.crackFrame = Math.min(Math.floor(this.breakTimer / 8), 3);
      if (this.breakTimer > 30) {
        this.broken = true;
      }
    }
  }

  draw(ctx) {
    if (this.broken) return;

    const g = this.game;
    const tex = g.textureLoader;
    const drawX = this.x;
    const drawY = this.y - g.cameraY;

    const texName = `platform_${this.type}`;
    const img = tex.get(texName);

    if (img && g.hasTextures) {
      ctx.drawImage(img, drawX, drawY, this.width, this.height);
    } else {
      const colors = { green: '#4CAF50', brown: '#8D6E63', blue: '#2196F3', purple: '#9C27B0' };
      ctx.fillStyle = colors[this.type] || '#4CAF50';
      ctx.fillRect(drawX, drawY, this.width, this.height);

      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(drawX, drawY + this.height - 4, this.width, 4);
    }

    if (this.breaking) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      if (this.crackFrame >= 1) {
        ctx.beginPath();
        ctx.moveTo(drawX + 10, drawY);
        ctx.lineTo(drawX + 20, drawY + this.height);
        ctx.stroke();
      }
      if (this.crackFrame >= 2) {
        ctx.beginPath();
        ctx.moveTo(drawX + 35, drawY);
        ctx.lineTo(drawX + 25, drawY + this.height);
        ctx.stroke();
      }
      if (this.crackFrame >= 3) {
        ctx.beginPath();
        ctx.moveTo(drawX + 55, drawY);
        ctx.lineTo(drawX + 60, drawY + this.height / 2);
        ctx.lineTo(drawX + 50, drawY + this.height);
        ctx.stroke();
      }
    }

    if (this.decor && !this.broken) {
      const decorImg = tex.get(this.decor);
      if (decorImg && g.hasTextures) {
        ctx.drawImage(decorImg, drawX + this.width / 2 - 12, drawY - 16, 24, 24);
      }
    }
  }
}
