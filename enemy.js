class Enemy {
  constructor(x, y, game, speed) {
    this.x = x;
    this.y = y;
    this.size = 28;
    this.game = game;
    this.dir = Math.random() > 0.5 ? 1 : -1;
    this.speed = speed || 0.5 + Math.random() * 0.5;
    this.animFrame = 0;
    this.animTimer = 0;
  }

  update(dt) {
    this.x += this.dir * this.speed * dt;

    if (this.x < 0 || this.x + this.size > this.game.width) {
      this.dir *= -1;
    }

    this.animTimer += dt;
    if (this.animTimer > 15) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }
  }

  draw(ctx) {
    const g = this.game;
    const tex = g.textureLoader;
    const drawX = this.x;
    const drawY = this.y - g.cameraY;

    const texName = this.animFrame === 0 ? 'enemy1' : 'enemy2';
    const img = tex.get(texName);

    if (img && g.hasTextures) {
      ctx.drawImage(img, drawX, drawY, this.size, this.size);
    } else {
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.arc(drawX + this.size / 2, drawY + this.size / 2, this.size / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(drawX + this.size / 2 - 5, drawY + this.size / 2 - 3, 4, 0, Math.PI * 2);
      ctx.arc(drawX + this.size / 2 + 5, drawY + this.size / 2 - 3, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(drawX + this.size / 2 - 5, drawY + this.size / 2 - 3, 2, 0, Math.PI * 2);
      ctx.arc(drawX + this.size / 2 + 5, drawY + this.size / 2 - 3, 2, 0, Math.PI * 2);
      ctx.fill();

      if (this.animFrame === 0) {
        ctx.fillStyle = '#c62828';
        ctx.beginPath();
        ctx.ellipse(drawX + this.size / 2 - 12, drawY + this.size / 2 - 2, 8, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(drawX + this.size / 2 + 12, drawY + this.size / 2 - 2, 8, 4, 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#c62828';
        ctx.beginPath();
        ctx.ellipse(drawX + this.size / 2 - 10, drawY + this.size / 2 - 6, 7, 3, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(drawX + this.size / 2 + 10, drawY + this.size / 2 - 6, 7, 3, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

class Coin {
  constructor(x, y, game, type) {
    this.x = x;
    this.y = y;
    this.size = 20;
    this.game = game;
    this.type = type || 'bronze';
    this.value = this.type === 'gold' ? 50 : this.type === 'silver' ? 25 : 10;
    this.animFrame = 0;
    this.animTimer = 0;
    this.bobTimer = Math.random() * 100;
  }

  update(dt) {
    this.bobTimer += dt;
    this.animTimer += dt;
    if (this.animTimer > 6) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }
  }

  draw(ctx) {
    const g = this.game;
    const tex = g.textureLoader;
    const drawX = this.x;
    const drawY = this.y - g.cameraY + Math.sin(this.bobTimer * 0.05) * 3;

    let texName;
    if (this.type === 'gold') texName = `coin_gold${this.animFrame + 1}`;
    else if (this.type === 'silver') texName = `coin_silver${this.animFrame + 1}`;
    else texName = `coin_bronze${this.animFrame + 1}`;
    const img = tex.get(texName);

    const displaySize = 32;
    if (img && g.hasTextures) {
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const scale = Math.min(displaySize / iw, displaySize / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const ox = (displaySize - dw) / 2;
      const oy = (displaySize - dh) / 2;
      ctx.drawImage(img, drawX + ox, drawY + oy, dw, dh);
    } else {
      if (this.type === 'gold') {
        ctx.fillStyle = '#FFD700';
      } else if (this.type === 'silver') {
        ctx.fillStyle = '#C0C0C0';
      } else {
        ctx.fillStyle = '#CD7F32';
      }
      ctx.beginPath();
      ctx.arc(drawX + displaySize / 2, drawY + displaySize / 2, displaySize / 2, 0, Math.PI * 2);
      ctx.fill();

      if (this.type === 'gold') {
        ctx.fillStyle = '#FFA000';
      } else if (this.type === 'silver') {
        ctx.fillStyle = '#A0A0A0';
      } else {
        ctx.fillStyle = '#8B6914';
      }
      ctx.beginPath();
      ctx.arc(drawX + displaySize / 2, drawY + displaySize / 2, displaySize / 2 - 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      const letter = this.type === 'gold' ? 'G' : this.type === 'silver' ? 'S' : 'B';
      ctx.fillText(letter, drawX + displaySize / 2, drawY + displaySize / 2 + 6);
      ctx.textAlign = 'left';
    }
  }
}
