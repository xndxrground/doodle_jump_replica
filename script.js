const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

function resizeCanvas() {
  canvas.style.width = '400px';
  canvas.style.height = window.innerHeight + 'px';
  canvas.width = 400;
  canvas.height = window.innerHeight;
  if (game) {
    game.width = canvas.width;
    game.height = canvas.height;
  }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

game.init();
