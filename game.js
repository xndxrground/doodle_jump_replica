class TextureLoader {
  constructor() {
    this.textures = {};
  }

  load(name, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.textures[name] = img; resolve(img); };
      img.onerror = () => { this.textures[name] = null; resolve(null); };
      img.src = src;
    });
  }

  get(name) {
    return this.textures[name] || null;
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.gameWidth = 400;
    this.gameHeight = 600;

    this.textureLoader = new TextureLoader();
    this.player = null;
    this.platforms = [];
    this.enemies = [];
    this.coins = [];
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('doodleHighScore')) || 0;
    this.level = 1;
    this.gameOver = false;
    this.started = false;

    this.cameraY = 0;
    this.gravity = 0.5;
    this.jumpStrength = -12;
    this.springStrength = -18;
    this.screenShake = 0;

    this.keys = {};
    this.lastPlatformY = 0;
    this.followThreshold = 0;

    this.jetpackItem = null;
    this.enemySpawnTimer = 0;
    this.bubbleItems = [];
    this.sounds = {};
    this.showSettings = false;
    this.settingsVolume = parseInt(localStorage.getItem('doodleVolume')) || 50;
    this.settingsSelected = 0;
    this.prevSettingsUp = false;
    this.prevSettingsDown = false;
    this.prevSettingsLeft = false;
    this.prevSettingsRight = false;
    this.isDraggingSlider = false;
    this._prevVolumePreview = -1;
    this.paused = false;
    this.floatingTexts = [];
    this.clouds = [];
    this.lives = 3;
    this.invulnTimer = 0;
    this.hitFlash = 0;

    this.levelConfigs = {
      1: { scrollSpeed: 0.3, enemyChance: 0.01, movingPlatformChance: 0, springChance: 0, breakingChance: 0, enemySpawnInterval: 600, maxEnemies: 2, enemySpeed: 0.5 },
      2: { scrollSpeed: 0.6, enemyChance: 0.04, movingPlatformChance: 0, springChance: 0.2, breakingChance: 0.2, enemySpawnInterval: 360, maxEnemies: 3, enemySpeed: 0.8 },
      3: { scrollSpeed: 0.65, enemyChance: 0.03, movingPlatformChance: 0.2, springChance: 0.2, breakingChance: 0.2, enemySpawnInterval: 300, maxEnemies: 3, enemySpeed: 1.0 }
    };

    this.frameCount = 0;
    this.prevF2 = false;
    this.prevF4 = false;
    this.spawnFlash = null;

    this.showMenu = true;
    this.menuButtons = [];
    this.menuSelected = 0;
    this.gameOverButtons = [];
    this.gameOverSelected = 0;
    this.prevEnter = false;
    this.prevSpace = false;
    this.prevArrowUp = false;
    this.prevArrowDown = false;
    this.prevArrowLeft = false;
    this.prevArrowRight = false;
    this.bronzeCollected = 0;
    this.silverCollected = 0;
    this.goldCollected = 0;
    this.isNewBest = false;

    window.addEventListener('keydown', (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys[key] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space', 'Enter', 'F2', 'F4', 'Escape', 'a', 'd', 'w', 's'].includes(e.key)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys[key] = false;
    });
    canvas.addEventListener('click', (e) => this.handleClick(e));
    canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    this.loadSound('jump', 'assets/sounds/jump.mp3');
    this.loadSound('death', 'assets/sounds/death.mp3');
    this.loadSound('hit', 'assets/sounds/hit.mp3');
  }

  loadSound(name, path) {
    const audio = new Audio();
    audio.volume = this.settingsVolume / 100;
    audio.addEventListener('error', () => {
      console.warn('Sound not loaded:', path);
    });
    audio.src = path;
    this.sounds[name] = audio;
  }

  updateVolume() {
    const vol = this.settingsVolume / 100;
    for (const name in this.sounds) {
      this.sounds[name].volume = vol;
    }
  }

  playSound(name) {
    const sound = this.sounds[name];
    if (!sound) return;
    if (sound.currentTime > 0) {
      sound.currentTime = 0;
    }
    sound.play().catch(() => {});
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    if (this.showSettings) {
      const panelX = this.width / 2 - 160;
      const panelY = this.height / 2 - 130;
      const panelW = 320;
      const panelH = 260;
      const pad = 20;

      if (x < panelX || x > panelX + panelW || y < panelY || y > panelY + panelH) {
        this.closeSettings();
        this.menuSelected = 3;
        return;
      }

      const xBtnX = panelX + panelW - 16;
      const xBtnY = panelY + 6;
      if (x >= xBtnX - 8 && x <= xBtnX + 8 && y >= xBtnY - 8 && y <= xBtnY + 8) {
        this.closeSettings();
        this.menuSelected = 3;
        return;
      }

      const sliderLeft = panelX + pad;
      const sliderRight = panelX + panelW - pad;
      const sliderY = panelY + 75;
      if (y >= sliderY - 10 && y <= sliderY + 10 && x >= sliderLeft && x <= sliderRight) {
        const pct = (x - sliderLeft) / (sliderRight - sliderLeft);
        this.settingsVolume = Math.round(Math.max(0, Math.min(100, pct * 100)));
        this.isDraggingSlider = true;
        this.updateVolume();
        this._prevVolumePreview = -1;
        return;
      }

      const btnY = panelY + panelH - 70;
      const btnW = 120;
      const btnH = 36;
      const applyX = panelX + panelW / 2 - btnW - 10;
      const closeBtnX = panelX + panelW / 2 + 10;

      if (x >= applyX && x <= applyX + btnW && y >= btnY && y <= btnY + btnH) {
        this.applySettings();
        this.menuSelected = 3;
        return;
      }
      if (x >= closeBtnX && x <= closeBtnX + btnW && y >= btnY && y <= btnY + btnH) {
        this.closeSettings();
        this.menuSelected = 3;
        return;
      }
      return;
    }

    if (this.showMenu) {
      for (const btn of this.menuButtons) {
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          if (btn.action === 'settings') {
            this.showSettings = true;
            this.isDraggingSlider = false;
            this.settingsSelected = 0;
          } else {
            this.start(btn.level);
          }
          return;
        }
      }
    }

    if (this.gameOver) {
      for (const btn of this.gameOverButtons) {
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          this.activateGameOverButton(btn.action);
          return;
        }
      }
    }
  }

  handleMenuInput() {
    if (this.showSettings) return;
    const up = this.keys['ArrowUp'];
    const down = this.keys['ArrowDown'];
    const left = this.keys['ArrowLeft'];
    const right = this.keys['ArrowRight'];
    const enter = this.keys['Enter'];
    const space = this.keys[' '] || this.keys['Space'];

    if ((up && !this.prevArrowUp) || (left && !this.prevArrowLeft)) {
      this.menuSelected = (this.menuSelected - 1 + this.menuButtons.length) % this.menuButtons.length;
    }
    if ((down && !this.prevArrowDown) || (right && !this.prevArrowRight)) {
      this.menuSelected = (this.menuSelected + 1) % this.menuButtons.length;
    }
    if ((enter || space) && !(this.prevEnter || this.prevSpace)) {
      if (this.menuButtons.length > 0) {
        const btn = this.menuButtons[this.menuSelected];
        if (btn.action === 'settings') {
          this.showSettings = true;
          this.isDraggingSlider = false;
          this.settingsSelected = 0;
        } else {
          this.start(btn.level);
        }
      }
    }

    this.prevArrowUp = !!up;
    this.prevArrowDown = !!down;
    this.prevArrowLeft = !!left;
    this.prevArrowRight = !!right;
    this.prevEnter = !!enter;
    this.prevSpace = !!space;
  }

  handleGameOverInput() {
    if (this.showSettings) return;
    const left = this.keys['ArrowLeft'];
    const right = this.keys['ArrowRight'];
    const up = this.keys['ArrowUp'];
    const down = this.keys['ArrowDown'];
    const enter = this.keys['Enter'];
    const space = this.keys[' '] || this.keys['Space'];

    if ((left && !this.prevArrowLeft) || (up && !this.prevArrowUp)) {
      this.gameOverSelected = (this.gameOverSelected - 1 + this.gameOverButtons.length) % this.gameOverButtons.length;
    }
    if ((right && !this.prevArrowRight) || (down && !this.prevArrowDown)) {
      this.gameOverSelected = (this.gameOverSelected + 1) % this.gameOverButtons.length;
    }
    if ((enter || space) && !(this.prevEnter || this.prevSpace)) {
      if (this.gameOverButtons.length > 0) {
        this.activateGameOverButton(this.gameOverButtons[this.gameOverSelected].action);
      }
    }

    this.prevArrowLeft = !!left;
    this.prevArrowRight = !!right;
    this.prevArrowUp = !!up;
    this.prevArrowDown = !!down;
    this.prevEnter = !!enter;
    this.prevSpace = !!space;
  }

  activateGameOverButton(action) {
    if (action === 'retry') {
      this.start(this.level);
    } else if (action === 'menu') {
      this.showMenu = true;
      this.gameOver = false;
      this.started = false;
      this.prevF2 = false;
      this.prevF4 = false;
      this.gameOverSelected = 0;
      this.menuSelected = 0;
    }
  }

  handleSettingsInput() {
    const up = this.keys['ArrowUp'];
    const down = this.keys['ArrowDown'];
    const left = this.keys['ArrowLeft'];
    const right = this.keys['ArrowRight'];
    const enter = this.keys['Enter'];
    const space = this.keys[' '] || this.keys['Space'];

    const maxIndex = 2; // 0=slider, 1=apply, 2=close

    if (up && !this.prevSettingsUp) {
      this.settingsSelected = (this.settingsSelected - 1 + maxIndex + 1) % (maxIndex + 1);
    }
    if (down && !this.prevSettingsDown) {
      this.settingsSelected = (this.settingsSelected + 1) % (maxIndex + 1);
    }

    if (this.settingsSelected === 0) {
      if (left && !this.prevSettingsLeft) {
        this.settingsVolume = Math.max(0, this.settingsVolume - 5);
        this.updateVolume();
        this.playSound('jump');
      }
      if (right && !this.prevSettingsRight) {
        this.settingsVolume = Math.min(100, this.settingsVolume + 5);
        this.updateVolume();
        this.playSound('jump');
      }
    }

    if ((enter || space) && !(this.prevEnter || this.prevSpace)) {
      this.applySettings();
      this.menuSelected = 3;
    }

    this.prevSettingsUp = !!up;
    this.prevSettingsDown = !!down;
    this.prevSettingsLeft = !!left;
    this.prevSettingsRight = !!right;
    this.prevEnter = !!enter;
    this.prevSpace = !!space;
  }

  handleMouseDown(e) {
    if (!this.showSettings) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const panelX = this.width / 2 - 160;
    const panelY = this.height / 2 - 130;
    const panelW = 320;
    const panelH = 260;
    const pad = 20;
    const sliderLeft = panelX + pad;
    const sliderRight = panelX + panelW - pad;
    const sliderY = panelY + 75;
    if (y >= sliderY - 10 && y <= sliderY + 10 && x >= sliderLeft && x <= sliderRight) {
      const pct = (x - sliderLeft) / (sliderRight - sliderLeft);
      this.settingsVolume = Math.round(Math.max(0, Math.min(100, pct * 100)));
      this.isDraggingSlider = true;
      this.updateVolume();
      this._prevVolumePreview = -1;
    }
  }

  handleMouseMove(e) {
    if (!this.isDraggingSlider || !this.showSettings) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const panelX = this.width / 2 - 160;
    const panelW = 320;
    const pad = 20;
    const sliderLeft = panelX + pad;
    const sliderRight = panelX + panelW - pad;
    const pct = Math.max(0, Math.min(1, (x - sliderLeft) / (sliderRight - sliderLeft)));
    const newVol = Math.round(pct * 100);
    if (newVol !== this._prevVolumePreview) {
      this._prevVolumePreview = newVol;
      this.settingsVolume = newVol;
      this.updateVolume();
      this.playSound('jump');
    }
  }

  handleMouseUp(e) {
    if (this.isDraggingSlider) {
      this.isDraggingSlider = false;
    }
  }

  closeSettings() {
    this.showSettings = false;
    this.isDraggingSlider = false;
    this.settingsVolume = parseInt(localStorage.getItem('doodleVolume')) || 50;
    this.updateVolume();
    this._prevVolumePreview = -1;
  }

  applySettings() {
    localStorage.setItem('doodleVolume', this.settingsVolume);
    this.showSettings = false;
    this.isDraggingSlider = false;
    this._prevVolumePreview = -1;
  }

  async init() {
    await this.loadTextures();

    const textureNames = ['player1', 'player2', 'platform_green', 'platform_brown', 'platform_blue', 'platform_purple', 'enemy1', 'enemy2', 'rocket', 'jetpack', 'jetpack_player', 'coin_gold1', 'coin_gold2', 'coin_gold3', 'coin_gold4', 'coin_bronze1', 'coin_bronze2', 'coin_bronze3', 'coin_bronze4', 'coin_silver1', 'coin_silver2', 'coin_silver3', 'coin_silver4', 'jetpack_icon', 'bubble', 'bubble_icon', 'cloud'];
    const loaded = [];
    const failed = [];
    for (const name of textureNames) {
      if (this.textureLoader.get(name)) loaded.push(name);
      else failed.push(name);
    }
    if (loaded.length) console.log('Textures loaded:', loaded.join(', '));
    if (failed.length) console.log('Textures not found (fallback):', failed.join(', '));

    this.hasTextures = loaded.length > 0;

    this.showMenu = true;
    this.lastLoop = performance.now();
    this.mainLoop(this.lastLoop);
  }

  mainLoop(time) {
    const dt = Math.min((time - (this.lastLoop || time)) / 16.67, 3);
    this.lastLoop = time;
    this.frameCount++;

    if (this.showSettings && this.keys['Escape'] && !this.prevEscape) {
      this.closeSettings();
      this.menuSelected = 3;
      this.keys['Escape'] = false;
    } else if (!this.showMenu && !this.gameOver && !this.showSettings && this.keys['Escape'] && !this.prevEscape) {
      this.paused = !this.paused;
    }
    this.prevEscape = !!this.keys['Escape'];

    if (this.showMenu) {
      this.handleMenuInput();
    } else if (!this.gameOver && !this.paused) {
      this.prevArrowUp = !!this.keys['ArrowUp'];
      this.prevArrowDown = !!this.keys['ArrowDown'];
      this.prevArrowLeft = !!this.keys['ArrowLeft'];
      this.prevArrowRight = !!this.keys['ArrowRight'];
      this.prevEnter = !!this.keys['Enter'];
      this.prevSpace = !!(this.keys[' '] || this.keys['Space']);
      this.update(dt);
    } else {
      this.handleGameOverInput();
    }

    if (this.showSettings) {
      this.handleSettingsInput();
    }

    this.render();

    requestAnimationFrame((t) => this.mainLoop(t));
  }

  async loadTextures() {
    const assets = [
      ['player1', 'assets/player/jump1.png'],
      ['player2', 'assets/player/jump2.png'],
      ['platform_green', 'assets/platforms/green.png'],
      ['platform_brown', 'assets/platforms/brown.png'],
      ['platform_blue', 'assets/platforms/blue.png'],
      ['platform_purple', 'assets/platforms/purple.png'],
      ['enemy1', 'assets/enemies/fly1.png'],
      ['enemy2', 'assets/enemies/fly2.png'],
      ['rocket', 'assets/player/rocket.png'],
      ['jetpack', 'assets/bonuses/jetpack.png'],
      ['jetpack_player', 'assets/bonuses/jetpack_on_player.png'],
      ['coin_gold1', 'assets/bonuses/coin_gold/frame1.png'],
      ['coin_gold2', 'assets/bonuses/coin_gold/frame2.png'],
      ['coin_gold3', 'assets/bonuses/coin_gold/frame3.png'],
      ['coin_gold4', 'assets/bonuses/coin_gold/frame4.png'],
      ['coin_bronze1', 'assets/bonuses/coin_bronze/frame1.png'],
      ['coin_bronze2', 'assets/bonuses/coin_bronze/frame2.png'],
      ['coin_bronze3', 'assets/bonuses/coin_bronze/frame3.png'],
      ['coin_bronze4', 'assets/bonuses/coin_bronze/frame4.png'],
      ['jetpack_icon', 'assets/bonuses/jetpack_icon.png'],
      ['bubble', 'assets/bonuses/bubble.png'],
      ['bubble_icon', 'assets/bonuses/bubble_icon.png'],
      ['coin_silver1', 'assets/bonuses/coin_silver/frame1.png'],
      ['coin_silver2', 'assets/bonuses/coin_silver/frame2.png'],
      ['coin_silver3', 'assets/bonuses/coin_silver/frame3.png'],
      ['coin_silver4', 'assets/bonuses/coin_silver/frame4.png'],
      ['cloud', 'assets/background/cloud.png'],
      ['grass1', 'assets/decor/grass1.png'],
      ['grass2', 'assets/decor/grass2.png'],
      ['mushroom_brown', 'assets/decor/mushroom_brown.png'],
      ['mushroom_red', 'assets/decor/mushroom_red.png'],
      ['heart_full', 'assets/ui/heart_full.png'],
      ['heart_empty', 'assets/ui/heart_empty.png'],
      ['coin_bronze_icon', 'assets/ui/coin_bronze_icon.png'],
      ['coin_silver_icon', 'assets/ui/coin_silver_icon.png'],
      ['coin_gold_icon', 'assets/ui/coin_gold_icon.png']
    ];
    await Promise.all(assets.map(([name, src]) => this.textureLoader.load(name, src)));
  }

  start(level) {
    this.level = level;
    this.showMenu = false;
    this.followThreshold = this.gameHeight * 2 / 3;
    this.platforms = [];
    this.enemies = [];
    this.coins = [];
    this.score = 0;
    this.cameraY = 0;
    this.gameOver = false;
    this.started = true;
    this.frameCount = 0;
    this.screenShake = 0;
    this.prevF2 = false;
    this.prevF4 = false;
    this.spawnFlash = null;

    this.jetpackItem = null;
    this.bubbleItems = [];
    this.enemySpawnTimer = 0;
    this.floatingTexts = [];
    this.clouds = [];
    this.bronzeCollected = 0;
    this.silverCollected = 0;
    this.goldCollected = 0;
    this.isNewBest = false;
    this.lives = 3;
    this.invulnTimer = 0;
    this.hitFlash = 0;
    this.menuSelected = 0;
    this.gameOverSelected = 0;
    for (let i = 0; i < 6; i++) {
      this.spawnCloud(true);
    }

    this.generateInitialPlatforms();

    this.player = new Player(this.width / 2 - 15, this.startPlatform.y - 30, this);

    this.ensurePlayerOnPlatform();
  }

  generateInitialPlatforms() {
    const startX = this.width / 2 - 35;
    const startY = this.gameHeight - 80;
    this.startPlatform = new Platform(startX, startY, 'green', this);
    this.platforms.push(this.startPlatform);

    this.lastPlatformY = startY;
    for (let i = 0; i < 7; i++) {
      const y = this.lastPlatformY - 70 - Math.random() * 30;
      this.lastPlatformY = y;
      const x = Math.random() * (this.width - 80);
      this.platforms.push(new Platform(x, y, 'green', this));
    }
  }

  ensurePlayerOnPlatform() {
    for (const p of this.platforms) {
      if (p.broken) continue;
      if (this.player.x + this.player.width > p.x &&
          this.player.x < p.x + p.width &&
          this.player.y + this.player.height >= p.y &&
          this.player.y + this.player.height <= p.y + p.height + 10) {
        this.player.y = p.y - this.player.height;
        return;
      }
    }

    let nearest = null;
    let minDist = Infinity;
    const playerBottom = this.player.y + this.player.height;
    for (const p of this.platforms) {
      if (p.broken) continue;
      if (this.player.x + this.player.width > p.x && this.player.x < p.x + p.width) {
        const dist = Math.abs(playerBottom - p.y);
        if (dist < minDist) {
          minDist = dist;
          nearest = p;
        }
      }
    }
    if (nearest) {
      this.player.y = nearest.y - this.player.height;
    }
  }

  spawnItemNearPlayer() {
    if (!this.player) return;

    const y = this.player.y;
    const spacing = 45;
    const count = 6;
    const totalWidth = (count - 1) * spacing;
    const startX = this.player.x + this.player.width / 2 - totalWidth / 2;

    this.spawnFlash = { wx: startX + totalWidth / 2, wy: y, timer: 6 };

    for (let i = 0; i < count; i++) {
      const ix = Math.max(10, Math.min(startX + i * spacing, this.width - 32));
      if (i === 0) {
        this.coins.push(new Coin(ix, y, this, 'bronze'));
      } else if (i === 1) {
        this.coins.push(new Coin(ix, y, this, 'silver'));
      } else if (i === 2) {
        this.coins.push(new Coin(ix, y, this, 'gold'));
      } else if (i === 3) {
        this.jetpackItem = { x: ix, y: y, w: 24, h: 24 };
      } else if (i === 4) {
        this.bubbleItems.push({ x: ix, y: y, w: 32, h: 32 });
      } else {
        const enemy = new Enemy(ix, y, this);
        this.enemies.push(enemy);
      }
    }
  }

  generatePlatform() {
    const cfg = this.levelConfigs[this.level];
    const y = this.lastPlatformY - 60 - Math.random() * 40;
    this.lastPlatformY = y;

    let type = 'green';
    const r = Math.random();
    if (r < cfg.breakingChance) type = 'brown';
    else if (r < cfg.breakingChance + cfg.springChance) type = 'blue';
    else if (r < cfg.breakingChance + cfg.springChance + cfg.movingPlatformChance) type = 'purple';

    const x = Math.random() * (this.width - 80);
    const platform = new Platform(x, y, type, this);

    if (type === 'purple') {
      platform.dir = Math.random() > 0.5 ? 1 : -1;
      platform.speed = 1 + Math.random() * 0.5;
    }

    if (type === 'green' && Math.random() < 0.4) {
      platform.decor = Math.random() < 0.5 ? 'grass1' : 'grass2';
    } else if (type === 'blue' && Math.random() < 0.3) {
      platform.decor = 'mushroom_red';
    } else if (type === 'purple' && Math.random() < 0.3) {
      platform.decor = 'mushroom_brown';
    }

    this.platforms.push(platform);

    if (Math.random() < cfg.enemyChance) {
      this.enemies.push(new Enemy(x + 20, y - 30, this, cfg.enemySpeed));
    }

    if (Math.random() < 0.7) {
      this.tryAddBonusToPlatform(platform);
    }
  }

  hasBonusOnPlatform(p) {
    const bonusY = p.y - 24;
    for (const c of this.coins) {
      if (Math.abs(c.y - bonusY) < 10 && c.x > p.x - 10 && c.x < p.x + p.width + 10) return true;
    }
    if (this.jetpackItem) {
      if (Math.abs(this.jetpackItem.y - bonusY) < 10 && this.jetpackItem.x > p.x - 10 && this.jetpackItem.x < p.x + p.width + 10) return true;
    }
    for (const b of this.bubbleItems) {
      if (Math.abs(b.y - bonusY) < 10 && b.x > p.x - 10 && b.x < p.x + p.width + 10) return true;
    }
    return false;
  }

  tryAddBonusToPlatform(p) {
    const totalBonuses = this.coins.length + (this.jetpackItem ? 1 : 0) + this.bubbleItems.length;
    if (totalBonuses >= 9) return;
    if (this.hasBonusOnPlatform(p)) return;

    const roll = Math.random();
    if (roll < 0.35) {
      this.coins.push(new Coin(p.x + Math.random() * (p.width - 20), p.y - 24, this, 'bronze'));
    } else if (roll < 0.55) {
      this.coins.push(new Coin(p.x + Math.random() * (p.width - 20), p.y - 24, this, 'silver'));
    } else if (roll < 0.65) {
      this.coins.push(new Coin(p.x + Math.random() * (p.width - 20), p.y - 24, this, 'gold'));
    } else if (roll < 0.90) {
      if (!this.jetpackItem) {
        this.jetpackItem = { x: p.x + p.width / 2 - 12, y: p.y - 24, w: 24, h: 24 };
      }
    } else {
      this.bubbleItems.push({ x: p.x + Math.random() * (p.width - 32), y: p.y - 32, w: 32, h: 32 });
    }
  }

  update(dt) {
    if (this.screenShake > 0) this.screenShake -= 0.1 * dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;

    this.player.update(dt);

    const cfg = this.levelConfigs[this.level];

    if (!this.player.adminMode) {
      this.cameraY -= cfg.scrollSpeed * dt;

      const playerScreenY = this.player.y - this.cameraY;
      if (playerScreenY < this.followThreshold) {
        this.cameraY = this.player.y - this.followThreshold;
      }
    }

    this.enemySpawnTimer -= dt;
    if (this.enemySpawnTimer <= 0) {
      this.enemySpawnTimer = cfg.enemySpawnInterval;
      if (this.enemies.length >= cfg.maxEnemies) return;
      const validPlatforms = this.platforms.filter(p =>
        !p.broken &&
        p.y - this.cameraY > -350 && p.y - this.cameraY < -50 &&
        p !== this.startPlatform &&
        !(this.player &&
          this.player.x + this.player.width > p.x && this.player.x < p.x + p.width &&
          this.player.y + this.player.height >= p.y && this.player.y <= p.y + p.height)
      );
      if (validPlatforms.length > 0) {
        const p = validPlatforms[Math.floor(Math.random() * validPlatforms.length)];
        const enemyX = p.x + Math.random() * Math.max(p.width - 28, 1);
        const enemy = new Enemy(enemyX, p.y - 30, this, cfg.enemySpeed);
        if (!(this.player &&
          enemy.x + enemy.size > this.player.x && enemy.x < this.player.x + this.player.width &&
          enemy.y + enemy.size > this.player.y && enemy.y < this.player.y + this.player.height)) {
          this.enemies.push(enemy);
        }
      }
    }

    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const p = this.platforms[i];
      p.update(dt);
      if (p.y - this.cameraY > this.gameHeight + 100) {
        this.platforms.splice(i, 1);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt);
      if (e.y - this.cameraY > this.gameHeight + 100) {
        this.enemies.splice(i, 1);
      }
    }

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.update(dt);
      if (c.y - this.cameraY > this.gameHeight + 100) {
        this.coins.splice(i, 1);
      }
    }

    for (let i = this.bubbleItems.length - 1; i >= 0; i--) {
      const b = this.bubbleItems[i];
      if (b.y - this.cameraY > this.gameHeight + 100) {
        this.bubbleItems.splice(i, 1);
      }
    }

    while (this.lastPlatformY - this.cameraY > -300) {
      this.generatePlatform();
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.timer -= dt;
      ft.y -= 0.5 * dt;
      if (ft.timer <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cl = this.clouds[i];
      cl.y += cl.speed * dt;
      if (cl.y > this.gameHeight + cl.size) {
        this.clouds.splice(i, 1);
      }
    }
    while (this.clouds.length < 5) {
      this.spawnCloud(false);
    }

    if (this.keys['F2'] && !this.prevF2) {
      this.player.toggleAdminMode();
    }
    this.prevF2 = !!this.keys['F2'];

    if (this.keys['F4'] && !this.prevF4) {
      this.spawnItemNearPlayer();
    }
    this.prevF4 = !!this.keys['F4'];

    if (this.spawnFlash) {
      this.spawnFlash.timer -= dt;
      if (this.spawnFlash.timer <= 0) {
        this.spawnFlash = null;
      }
    }

    if (!this.player.adminMode) {
      for (let i = this.bubbleItems.length - 1; i >= 0; i--) {
        const b = this.bubbleItems[i];
        const pl = this.player;
        if (pl.x + pl.width > b.x && pl.x < b.x + b.w &&
            pl.y + pl.height > b.y && pl.y < b.y + b.h) {
          pl.shieldActive = true;
          this.bubbleItems.splice(i, 1);
          this.addFloatingText('+SHIELD', b.x + b.w / 2, b.y - this.cameraY);
          this.spawnFlash = { wx: b.x + b.w / 2, wy: b.y, timer: 6 };
        }
      }
    }

    if (!this.player.adminMode && this.jetpackItem) {
      const j = this.jetpackItem;
      const pl = this.player;
      if (pl.x + pl.width > j.x && pl.x < j.x + j.w &&
          pl.y + pl.height > j.y && pl.y < j.y + j.h) {
        pl.activateJetpack();
        this.jetpackItem = null;
      }
    }

    if (!this.player.adminMode && this.player.y - this.cameraY > this.gameHeight + 50) {
      this.gameOver = true;
      this.playSound('death');
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('doodleHighScore', this.score);
        this.isNewBest = true;
      }
    }
  }

  drawBubble(ctx, b) {
    const drawX = b.x;
    const drawY = b.y - this.cameraY;
    const tex = this.textureLoader;
    const img = tex.get('bubble');
    if (img && this.hasTextures) {
      ctx.drawImage(img, drawX, drawY, 32, 32);
    } else {
      ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(drawX + 16, drawY + 16, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(drawX + 16, drawY + 16, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  addFloatingText(text, x, y) {
    this.floatingTexts.push({ text: text, x: x, y: y, timer: 30 });
  }

  spawnCloud(initial) {
    const size = 40 + Math.random() * 60;
    this.clouds.push({
      x: Math.random() * (this.width + 80) - 40,
      y: initial ? Math.random() * this.gameHeight : -size,
      size: size,
      speed: 0.3 + Math.random() * 0.4
    });
  }

  drawJetpack(ctx) {
    const j = this.jetpackItem;
    const drawX = j.x;
    const drawY = j.y - this.cameraY;
    const tex = this.textureLoader;
    const img = tex.get('jetpack');

    if (img && this.hasTextures) {
      ctx.drawImage(img, drawX, drawY, 24, 24);
    } else {
      ctx.fillStyle = '#FF6F00';
      ctx.fillRect(drawX, drawY, 24, 24);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('J', drawX + 12, drawY + 18);
      ctx.textAlign = 'left';
    }
  }

  renderMenuScreen(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const labels = ['Уровень 1 — Лёгкий', 'Уровень 2 — Средний', 'Уровень 3 — Сложный'];
    const colors = ['#4CAF50', '#FF9800', '#f44336'];
    const btnW = 240;
    const btnH = 44;
    const gap = 12;

    const titleH = 55;
    const subtitleH = 30;
    const bestH = this.highScore > 0 ? 25 : 0;
    const buttonsH = 4 * btnH + 3 * gap;
    const hintH = 30;
    const totalH = titleH + subtitleH + bestH + 20 + buttonsH + hintH;
    const menuTop = (this.height - totalH) / 2;

    let y = menuTop;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DOODLE JUMP', this.width / 2, y + titleH - 5);
    y += titleH;

    ctx.font = '16px Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Выберите уровень сложности', this.width / 2, y + subtitleH - 5);
    y += subtitleH;

    if (this.highScore > 0) {
      ctx.font = '14px Arial';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`BEST: ${this.highScore}`, this.width / 2, y + bestH - 5);
      y += bestH;
    }

    y += 20;
    const startY = y;

    this.menuButtons = [];

    for (let i = 0; i < 4; i++) {
      const bx = this.width / 2 - btnW / 2;
      const by = startY + i * (btnH + gap);

      if (i === this.menuSelected) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        const r = 8;
        ctx.beginPath();
        ctx.moveTo(bx + r - 2, by - 2);
        ctx.lineTo(bx + btnW - r + 2, by - 2);
        ctx.quadraticCurveTo(bx + btnW + 2, by - 2, bx + btnW + 2, by + r - 2);
        ctx.lineTo(bx + btnW + 2, by + btnH - r + 2);
        ctx.quadraticCurveTo(bx + btnW + 2, by + btnH + 2, bx + btnW - r + 2, by + btnH + 2);
        ctx.lineTo(bx + r - 2, by + btnH + 2);
        ctx.quadraticCurveTo(bx - 2, by + btnH + 2, bx - 2, by + btnH - r + 2);
        ctx.lineTo(bx - 2, by + r - 2);
        ctx.quadraticCurveTo(bx - 2, by - 2, bx + r - 2, by - 2);
        ctx.closePath();
        ctx.stroke();
      }

      ctx.fillStyle = i < 3 ? colors[i] : '#455A64';
      ctx.beginPath();
      const r = 8;
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + btnW - r, by);
      ctx.quadraticCurveTo(bx + btnW, by, bx + btnW, by + r);
      ctx.lineTo(bx + btnW, by + btnH - r);
      ctx.quadraticCurveTo(bx + btnW, by + btnH, bx + btnW - r, by + btnH);
      ctx.lineTo(bx + r, by + btnH);
      ctx.quadraticCurveTo(bx, by + btnH, bx, by + btnH - r);
      ctx.lineTo(bx, by + r);
      ctx.quadraticCurveTo(bx, by, bx + r, by);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = i < 3 ? 'bold 18px Arial' : 'bold 16px Arial';
      ctx.textAlign = 'center';
      const text = i < 3 ? labels[i] : '🔊 ГРОМКОСТЬ ' + this.settingsVolume + '%';
      ctx.fillText(text, this.width / 2, by + 28);

      this.menuButtons.push({ x: bx, y: by, w: btnW, h: btnH, level: i < 3 ? i + 1 : null, action: i < 3 ? null : 'settings' });
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    const hintY = startY + 4 * (btnH + gap) + 15;
    ctx.fillText('Стрелки: выбор  •  Enter/Space: выбрать  •  Клик: нажать', this.width / 2, hintY);
    ctx.textAlign = 'left';
  }

  renderSettingsScreen() {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, this.width, this.height);

    const panelX = this.width / 2 - 160;
    const panelY = this.height / 2 - 130;
    const panelW = 320;
    const panelH = 260;
    const pad = 20;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    const pr = 10;
    ctx.moveTo(panelX + pr, panelY);
    ctx.lineTo(panelX + panelW - pr, panelY);
    ctx.quadraticCurveTo(panelX + panelW, panelY, panelX + panelW, panelY + pr);
    ctx.lineTo(panelX + panelW, panelY + panelH - pr);
    ctx.quadraticCurveTo(panelX + panelW, panelY + panelH, panelX + panelW - pr, panelY + panelH);
    ctx.lineTo(panelX + pr, panelY + panelH);
    ctx.quadraticCurveTo(panelX, panelY + panelH, panelX, panelY + panelH - pr);
    ctx.lineTo(panelX, panelY + pr);
    ctx.quadraticCurveTo(panelX, panelY, panelX + pr, panelY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('НАСТРОЙКИ', panelX + panelW / 2, panelY + 35);

    ctx.fillStyle = '#999';
    ctx.font = '18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('ГРОМКОСТЬ ЗВУКОВ', panelX + pad, panelY + 68);

    const sliderLeft = panelX + pad;
    const sliderRight = panelX + panelW - pad;
    const sliderY = panelY + 90;
    const thumbX = sliderLeft + (sliderRight - sliderLeft) * (this.settingsVolume / 100);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(sliderLeft, sliderY - 3, sliderRight - sliderLeft, 6);

    if (this.settingsSelected === 0) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(thumbX, sliderY, 13, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#1976D2';
    ctx.beginPath();
    ctx.arc(thumbX, sliderY, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.settingsVolume + '%', panelX + panelW / 2, sliderY + 35);

    const btnY = panelY + panelH - 70;
    const btnW = 120;
    const btnH = 36;
    const applyX = panelX + panelW / 2 - btnW - 10;
    const closeBtnX = panelX + panelW / 2 + 10;
    const br = 6;

    ctx.fillStyle = '#4CAF50';
    if (this.settingsSelected === 1) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(applyX + br - 2, btnY - 2);
      ctx.lineTo(applyX + btnW - br + 2, btnY - 2);
      ctx.quadraticCurveTo(applyX + btnW + 2, btnY - 2, applyX + btnW + 2, btnY + br - 2);
      ctx.lineTo(applyX + btnW + 2, btnY + btnH - br + 2);
      ctx.quadraticCurveTo(applyX + btnW + 2, btnY + btnH + 2, applyX + btnW - br + 2, btnY + btnH + 2);
      ctx.lineTo(applyX + br - 2, btnY + btnH + 2);
      ctx.quadraticCurveTo(applyX - 2, btnY + btnH + 2, applyX - 2, btnY + btnH - br + 2);
      ctx.lineTo(applyX - 2, btnY + br - 2);
      ctx.quadraticCurveTo(applyX - 2, btnY - 2, applyX + br - 2, btnY - 2);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(applyX + br, btnY);
    ctx.lineTo(applyX + btnW - br, btnY);
    ctx.quadraticCurveTo(applyX + btnW, btnY, applyX + btnW, btnY + br);
    ctx.lineTo(applyX + btnW, btnY + btnH - br);
    ctx.quadraticCurveTo(applyX + btnW, btnY + btnH, applyX + btnW - br, btnY + btnH);
    ctx.lineTo(applyX + br, btnY + btnH);
    ctx.quadraticCurveTo(applyX, btnY + btnH, applyX, btnY + btnH - br);
    ctx.lineTo(applyX, btnY + br);
    ctx.quadraticCurveTo(applyX, btnY, applyX + br, btnY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ПРИМЕНИТЬ', applyX + btnW / 2, btnY + 24);

    ctx.fillStyle = '#757575';
    if (this.settingsSelected === 2) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(closeBtnX + br - 2, btnY - 2);
      ctx.lineTo(closeBtnX + btnW - br + 2, btnY - 2);
      ctx.quadraticCurveTo(closeBtnX + btnW + 2, btnY - 2, closeBtnX + btnW + 2, btnY + br - 2);
      ctx.lineTo(closeBtnX + btnW + 2, btnY + btnH - br + 2);
      ctx.quadraticCurveTo(closeBtnX + btnW + 2, btnY + btnH + 2, closeBtnX + btnW - br + 2, btnY + btnH + 2);
      ctx.lineTo(closeBtnX + br - 2, btnY + btnH + 2);
      ctx.quadraticCurveTo(closeBtnX - 2, btnY + btnH + 2, closeBtnX - 2, btnY + btnH - br + 2);
      ctx.lineTo(closeBtnX - 2, btnY + br - 2);
      ctx.quadraticCurveTo(closeBtnX - 2, btnY - 2, closeBtnX + br - 2, btnY - 2);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(closeBtnX + br, btnY);
    ctx.lineTo(closeBtnX + btnW - br, btnY);
    ctx.quadraticCurveTo(closeBtnX + btnW, btnY, closeBtnX + btnW, btnY + br);
    ctx.lineTo(closeBtnX + btnW, btnY + btnH - br);
    ctx.quadraticCurveTo(closeBtnX + btnW, btnY + btnH, closeBtnX + btnW - br, btnY + btnH);
    ctx.lineTo(closeBtnX + br, btnY + btnH);
    ctx.quadraticCurveTo(closeBtnX, btnY + btnH, closeBtnX, btnY + btnH - br);
    ctx.lineTo(closeBtnX, btnY + br);
    ctx.quadraticCurveTo(closeBtnX, btnY, closeBtnX + br, btnY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('ЗАКРЫТЬ', closeBtnX + btnW / 2, btnY + 24);

    ctx.fillStyle = '#999';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    const xBtnX = panelX + panelW - 16;
    const xBtnY = panelY + 6;
    ctx.fillText('✕', xBtnX, xBtnY + 6);
    ctx.textAlign = 'left';
  }

  render() {
    const ctx = this.ctx;

    if (this.showMenu) {
      this.renderMenuScreen(ctx);
      return;
    }

    ctx.save();
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake * 4;
      const shakeY = (Math.random() - 0.5) * this.screenShake * 4;
      ctx.translate(shakeX, shakeY);
    }

    const scaleY = this.height / this.gameHeight;
    ctx.scale(1, scaleY);

    const gradient = ctx.createLinearGradient(0, 0, 0, this.gameHeight);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F7FA');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.gameHeight);

    const cloudImg = this.textureLoader.get('cloud');
    for (const cl of this.clouds) {
      if (cloudImg && this.hasTextures) {
        ctx.drawImage(cloudImg, cl.x, cl.y, cl.size, cl.size * 0.6);
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.ellipse(cl.x + cl.size / 2, cl.y + cl.size * 0.3, cl.size / 2, cl.size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cl.x + cl.size * 0.3, cl.y + cl.size * 0.25, cl.size * 0.3, cl.size * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cl.x + cl.size * 0.7, cl.y + cl.size * 0.25, cl.size * 0.3, cl.size * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const p of this.platforms) {
      p.draw(ctx);
    }

    for (const c of this.coins) {
      c.draw(ctx);
    }

    if (this.jetpackItem) {
      this.drawJetpack(ctx);
    }

    for (const b of this.bubbleItems) {
      this.drawBubble(ctx, b);
    }

    for (const e of this.enemies) {
      e.draw(ctx);
    }

    this.player.draw(ctx);

    if (this.spawnFlash) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.spawnFlash.timer / 8})`;
      ctx.beginPath();
      ctx.arc(this.spawnFlash.wx, this.spawnFlash.wy - this.cameraY, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const ft of this.floatingTexts) {
      ctx.fillStyle = `rgba(255, 255, 100, ${Math.min(ft.timer / 15, 1)})`;
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.textAlign = 'left';
    }

    ctx.restore();

    if (this.player && this.player.adminMode) {
      ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('ADMIN MODE ON', this.width - 12, 28);
      ctx.textAlign = 'left';
    }

    let scoreBgW = 140;
    if (this.lives > 0) scoreBgW += 40;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, scoreBgW, 70);
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.fillText(`Score: ${this.score}`, 10, 30);
    ctx.fillText(`Level: ${this.level}`, 10, 55);

    if (this.player) {
      const heartSize = 22;
      const heartGap = 4;
      const heartY = 10;
      const heartStartX = this.width - (heartSize + heartGap) * 3;
      const heartImgFull = this.textureLoader.get('heart_full');
      const heartImgEmpty = this.textureLoader.get('heart_empty');
      for (let i = 0; i < 3; i++) {
        const hx = heartStartX + i * (heartSize + heartGap);
        if (i < this.lives) {
          if (heartImgFull && this.hasTextures) {
            ctx.drawImage(heartImgFull, hx, heartY, heartSize, heartSize);
          } else {
            ctx.fillStyle = '#e53935';
            ctx.beginPath();
            ctx.arc(hx + heartSize / 2, heartY + heartSize / 2, heartSize / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          if (heartImgEmpty && this.hasTextures) {
            ctx.drawImage(heartImgEmpty, hx, heartY, heartSize, heartSize);
          } else {
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(hx + heartSize / 2, heartY + heartSize / 2, heartSize / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    if (this.player && (this.player.shieldActive || this.player.jetpackActive)) {
      const indicators = [];
      if (this.player.jetpackActive) {
        const secs = (this.player.jetpackTime / 60).toFixed(1);
        indicators.push({ icon: 'jetpack_icon', label: 'JETPACK', text: secs + 'с', color: '#FF6F00', iconColor: '#FF6F00' });
      }
      if (this.player.shieldActive) {
        indicators.push({ icon: 'bubble_icon', label: 'SHIELD', text: '1 hit', color: '#64C8FF', iconColor: 'rgba(100, 200, 255, 0.6)' });
      }

      const slotW = 130;
      const slotH = 36;
      const gap = 8;
      const totalW = indicators.length * slotW + (indicators.length - 1) * gap;
      const startX = (this.width - totalW) / 2;
      const y = this.height - 40;
      const r = 6;

      ctx.save();
      for (let i = 0; i < indicators.length; i++) {
        const ind = indicators[i];
        const x = startX + i * (slotW + gap);

        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + slotW - r, y);
        ctx.quadraticCurveTo(x + slotW, y, x + slotW, y + r);
        ctx.lineTo(x + slotW, y + slotH - r);
        ctx.quadraticCurveTo(x + slotW, y + slotH, x + slotW - r, y + slotH);
        ctx.lineTo(x + r, y + slotH);
        ctx.quadraticCurveTo(x, y + slotH, x, y + slotH - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();

        const img = this.textureLoader.get(ind.icon);
        if (img && this.hasTextures) {
          ctx.drawImage(img, x + 6, y + 6, 24, 24);
        } else {
          ctx.fillStyle = ind.iconColor;
          ctx.beginPath();
          ctx.arc(x + 18, y + 18, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(ind.label[0], x + 18, y + 22);
          ctx.textAlign = 'left';
        }

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(ind.text, x + 36, y + 23);
      }
      ctx.restore();
    }

    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${this.hitFlash / 8})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, this.width, this.height);

      const titleH = 60;
      const scoreH = 40;
      const bestH = 30;
      const newBestH = this.isNewBest ? 35 : 0;
      const coinH = 30;
      const btnGap = 20;
      const btnH = 44;
      const totalH = titleH + scoreH + bestH + newBestH + coinH + btnGap + btnH;
      const top = (this.height - totalH) / 2;
      let y = top;

      ctx.fillStyle = '#e53935';
      ctx.font = 'bold 52px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', this.width / 2, y + titleH - 5);
      y += titleH;

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px Arial';
      ctx.fillText(`SCORE: ${this.score}`, this.width / 2, y + scoreH - 5);
      y += scoreH;

      ctx.font = '20px Arial';
      ctx.fillStyle = '#aaa';
      ctx.fillText(`BEST: ${this.highScore}`, this.width / 2, y + bestH - 5);
      y += bestH;

      if (this.isNewBest) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 22px Arial';
        ctx.fillText('NEW BEST!', this.width / 2, y + newBestH - 5);
        y += newBestH;
      }

      const coinIconSize = 20;
      const coinTypes = [
        { type: 'bronze', count: this.bronzeCollected, texName: 'coin_bronze_icon', color: '#CD7F32', inner: '#8B6914', letter: 'B' },
        { type: 'silver', count: this.silverCollected, texName: 'coin_silver_icon', color: '#C0C0C0', inner: '#A0A0A0', letter: 'S' },
        { type: 'gold', count: this.goldCollected, texName: 'coin_gold_icon', color: '#FFD700', inner: '#FFA000', letter: 'G' }
      ];
      const coinSlotW = 80;
      const coinTotalW = coinTypes.length * coinSlotW;
      const coinStartX = this.width / 2 - coinTotalW / 2;
      const coinY = y + 4;
      for (let i = 0; i < coinTypes.length; i++) {
        const ct = coinTypes[i];
        const cx = coinStartX + i * coinSlotW;
        const img = this.textureLoader.get(ct.texName);
        if (img && this.hasTextures) {
          ctx.drawImage(img, cx, coinY, coinIconSize, coinIconSize);
        } else {
          ctx.fillStyle = ct.color;
          ctx.beginPath();
          ctx.arc(cx + coinIconSize / 2, coinY + coinIconSize / 2, coinIconSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = ct.inner;
          ctx.beginPath();
          ctx.arc(cx + coinIconSize / 2, coinY + coinIconSize / 2, coinIconSize / 2 - 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(ct.letter, cx + coinIconSize / 2, coinY + coinIconSize / 2 + 4);
          ctx.textAlign = 'left';
        }
        ctx.fillStyle = '#ccc';
        ctx.font = '17px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`x ${ct.count}`, cx + coinIconSize + 6, coinY + coinIconSize - 4);
        ctx.textAlign = 'left';
      }
      y += 30;

      y += btnGap;

      const btnLabels = ['RETRY', 'MENU'];
      const btnColors = ['#4CAF50', '#2196F3'];
      const btnW = 130;
      const gap = 24;
      const totalW = btnW * 2 + gap;
      const startX = this.width / 2 - totalW / 2;
      const btnY = y;

      this.gameOverButtons = [];

      for (let i = 0; i < 2; i++) {
        const bx = startX + i * (btnW + gap);

        if (i === this.gameOverSelected) {
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 3;
          const r = 6;
          ctx.beginPath();
          ctx.moveTo(bx + r - 2, btnY - 2);
          ctx.lineTo(bx + btnW - r + 2, btnY - 2);
          ctx.quadraticCurveTo(bx + btnW + 2, btnY - 2, bx + btnW + 2, btnY + r - 2);
          ctx.lineTo(bx + btnW + 2, btnY + btnH - r + 2);
          ctx.quadraticCurveTo(bx + btnW + 2, btnY + btnH + 2, bx + btnW - r + 2, btnY + btnH + 2);
          ctx.lineTo(bx + r - 2, btnY + btnH + 2);
          ctx.quadraticCurveTo(bx - 2, btnY + btnH + 2, bx - 2, btnY + btnH - r + 2);
          ctx.lineTo(bx - 2, btnY + r - 2);
          ctx.quadraticCurveTo(bx - 2, btnY - 2, bx + r - 2, btnY - 2);
          ctx.closePath();
          ctx.stroke();
        }

        ctx.fillStyle = btnColors[i];
        ctx.beginPath();
        const r = 6;
        ctx.moveTo(bx + r, btnY);
        ctx.lineTo(bx + btnW - r, btnY);
        ctx.quadraticCurveTo(bx + btnW, btnY, bx + btnW, btnY + r);
        ctx.lineTo(bx + btnW, btnY + btnH - r);
        ctx.quadraticCurveTo(bx + btnW, btnY + btnH, bx + btnW - r, btnY + btnH);
        ctx.lineTo(bx + r, btnY + btnH);
        ctx.quadraticCurveTo(bx, btnY + btnH, bx, btnY + btnH - r);
        ctx.lineTo(bx, btnY + r);
        ctx.quadraticCurveTo(bx, btnY, bx + r, btnY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(btnLabels[i], bx + btnW / 2, btnY + 29);

        const actions = ['retry', 'menu'];
        this.gameOverButtons.push({ x: bx, y: btnY, w: btnW, h: btnH, action: actions[i] });
      }

      ctx.textAlign = 'left';
    }

    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 52px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', this.width / 2, this.height / 2);
      ctx.textAlign = 'left';
    }

    if (this.showSettings) {
      this.renderSettingsScreen();
    }
  }
}
