// Game interfaces and types
interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

type BrickType = 'basic' | 'strong' | 'unbreakable';

// Game constants
const GAME_CONFIG = {
  canvas: {
    width: 800,
    height: 600
  },
  paddle: {
    width: 100,
    height: 20,
    speed: 8
  },
  ball: {
    radius: 10,
    speed: 5
  },
  brick: {
    width: 75,
    height: 30,
    padding: 10,
    offsetTop: 60,
    offsetLeft: 30,
    rows: 5,
    cols: 9
  },
  colors: {
    paddle: '#0095DD',
    ball: '#0095DD',
    bricks: [
      '#FF5252', // Red
      '#FFEB3B', // Yellow
      '#4CAF50', // Green
      '#2196F3', // Blue
      '#9C27B0'  // Purple
    ]
  }
} as const;

class Ball {
  public position: Position;
  public velocity: Position;
  public readonly radius: number;
  public readonly speed: number;

  constructor() {
    this.radius = GAME_CONFIG.ball.radius;
    this.speed = GAME_CONFIG.ball.speed;
    this.reset();
  }

  reset(): void {
    this.position = {
      x: GAME_CONFIG.canvas.width / 2,
      y: GAME_CONFIG.canvas.height - 50
    };
    this.velocity = {
      x: (Math.random() > 0.5 ? 1 : -1) * this.speed,
      y: -this.speed
    };
  }

  update(): void {
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = GAME_CONFIG.colors.ball;
    ctx.fill();
    ctx.closePath();
  }

  reverseX(): void {
    this.velocity.x = -this.velocity.x;
  }

  reverseY(): void {
    this.velocity.y = -this.velocity.y;
  }
}

class Paddle {
  public position: Position;
  public readonly size: Size;
  public readonly speed: number;
  private rightPressed: boolean = false;
  private leftPressed: boolean = false;

  constructor() {
    this.size = {
      width: GAME_CONFIG.paddle.width,
      height: GAME_CONFIG.paddle.height
    };
    this.speed = GAME_CONFIG.paddle.speed;
    this.reset();

    // Setup event listeners
    this.setupEventListeners();
  }

  reset(): void {
    this.position = {
      x: (GAME_CONFIG.canvas.width - this.size.width) / 2,
      y: GAME_CONFIG.canvas.height - this.size.height - 10
    };
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Right' || e.key === 'ArrowRight') {
        this.rightPressed = true;
      } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        this.leftPressed = true;
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.key === 'Right' || e.key === 'ArrowRight') {
        this.rightPressed = false;
      } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        this.leftPressed = false;
      }
    });

    // Touch/mouse support
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    canvas.addEventListener('mousemove', (e) => {
      const relativeX = e.clientX - canvas.offsetLeft;
      if (relativeX > 0 && relativeX < canvas.width) {
        this.position.x = relativeX - this.size.width / 2;
      }
    });
  }

  update(): void {
    if (this.rightPressed) {
      this.position.x += this.speed;
    } else if (this.leftPressed) {
      this.position.x -= this.speed;
    }

    // Wall collision
    if (this.position.x < 0) {
      this.position.x = 0;
    } else if (this.position.x + this.size.width > GAME_CONFIG.canvas.width) {
      this.position.x = GAME_CONFIG.canvas.width - this.size.width;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.rect(
      this.position.x,
      this.position.y,
      this.size.width,
      this.size.height
    );
    ctx.fillStyle = GAME_CONFIG.colors.paddle;
    ctx.fill();
    ctx.closePath();
  }
}

class Brick {
  public position: Position;
  public readonly size: Size;
  public readonly type: BrickType;
  public active: boolean;
  public hits: number;

  constructor(x: number, y: number, row: number) {
    this.position = { x, y };
    this.size = {
      width: GAME_CONFIG.brick.width,
      height: GAME_CONFIG.brick.height
    };
    
    // Different brick types based on row
    if (row === 0) {
      this.type = 'unbreakable';
      this.hits = Infinity;
    } else if (row === 1) {
      this.type = 'strong';
      this.hits = 2;
    } else {
      this.type = 'basic';
      this.hits = 1;
    }
    
    this.active = true;
  }

  hit(): boolean {
    if (this.type === 'unbreakable') return false;
    
    this.hits--;
    if (this.hits <= 0) {
      this.active = false;
      return true; // Brick destroyed
    }
    return false; // Brick still alive
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    let color: string;
    switch (this.type) {
      case 'unbreakable':
        color = '#666666';
        break;
      case 'strong':
        color = this.hits === 2 ? '#FF9800' : '#FFC107';
        break;
      default:
        color = GAME_CONFIG.colors.bricks[
          Math.floor(this.position.y / (GAME_CONFIG.brick.height + GAME_CONFIG.brick.padding)) % 
          GAME_CONFIG.colors.bricks.length
        ];
    }

    ctx.beginPath();
    ctx.rect(
      this.position.x,
      this.position.y,
      this.size.width,
      this.size.height
    );
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.stroke();
    ctx.closePath();
  }
}

class ArkanoidGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ball: Ball;
  private paddle: Paddle;
  private bricks: Brick[][];
  private score: number = 0;
  private lives: number = 3;
  private gameOver: boolean = false;
  private animationFrameId: number = 0;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    // Set canvas size
    this.canvas.width = GAME_CONFIG.canvas.width;
    this.canvas.height = GAME_CONFIG.canvas.height;

    this.ball = new Ball();
    this.paddle = new Paddle();
    this.bricks = this.createBricks();

    this.setupEventListeners();
  }

  private createBricks(): Brick[][] {
    const bricks: Brick[][] = [];
    
    for (let row = 0; row < GAME_CONFIG.brick.rows; row++) {
      bricks[row] = [];
      for (let col = 0; col < GAME_CONFIG.brick.cols; col++) {
        const brickX = col * (GAME_CONFIG.brick.width + GAME_CONFIG.brick.padding) + GAME_CONFIG.brick.offsetLeft;
        const brickY = row * (GAME_CONFIG.brick.height + GAME_CONFIG.brick.padding) + GAME_CONFIG.brick.offsetTop;
        bricks[row][col] = new Brick(brickX, brickY, row);
      }
    }
    
    return bricks;
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.gameOver) {
        this.restart();
      }
    });
  }

  private collisionDetection(): void {
    // Brick collision
    for (let row = 0; row < this.bricks.length; row++) {
      for (let col = 0; col < this.bricks[row].length; col++) {
        const brick = this.bricks[row][col];
        
        if (brick.active) {
          if (
            this.ball.position.x + this.ball.radius > brick.position.x &&
            this.ball.position.x - this.ball.radius < brick.position.x + brick.size.width &&
            this.ball.position.y + this.ball.radius > brick.position.y &&
            this.ball.position.y - this.ball.radius < brick.position.y + brick.size.height
          ) {
            this.ball.reverseY();
            if (brick.hit()) {
              this.score += brick.type === 'strong' ? 20 : 10;
            }
          }
        }
      }
    }

    // Paddle collision
    if (
      this.ball.position.y + this.ball.radius > this.paddle.position.y &&
      this.ball.position.x > this.paddle.position.x &&
      this.ball.position.x < this.paddle.position.x + this.paddle.size.width
    ) {
      // Calculate bounce angle based on where the ball hits the paddle
      const hitPos = (this.ball.position.x - this.paddle.position.x) / this.paddle.size.width;
      const angle = hitPos * Math.PI - Math.PI / 2; // -90 to 90 degrees
      
      const speed = Math.sqrt(this.ball.velocity.x ** 2 + this.ball.velocity.y ** 2);
      this.ball.velocity.x = Math.sin(angle) * speed;
      this.ball.velocity.y = -Math.cos(angle) * speed;
    }

    // Wall collision
    if (this.ball.position.x + this.ball.radius > GAME_CONFIG.canvas.width || 
        this.ball.position.x - this.ball.radius < 0) {
      this.ball.reverseX();
    }

    // Ceiling collision
    if (this.ball.position.y - this.ball.radius < 0) {
      this.ball.reverseY();
    }

    // Bottom collision (lose life)
    if (this.ball.position.y + this.ball.radius > GAME_CONFIG.canvas.height) {
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver = true;
      } else {
        this.ball.reset();
        this.paddle.reset();
      }
    }
  }

  private drawScore(): void {
    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = '#0095DD';
    this.ctx.fillText(`Score: ${this.score}`, 8, 20);
    this.ctx.fillText(`Lives: ${this.lives}`, this.canvas.width - 80, 20);
  }

  private drawGameOver(): void {
    this.ctx.font = '36px Arial';
    this.ctx.fillStyle = '#0095DD';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.font = '18px Arial';
    this.ctx.fillText('Press Enter to restart', this.canvas.width / 2, this.canvas.height / 2 + 40);
    this.ctx.textAlign = 'left';
  }

  private checkWin(): boolean {
    for (let row = 0; row < this.bricks.length; row++) {
      for (let col = 0; col < this.bricks[row].length; col++) {
        const brick = this.bricks[row][col];
        if (brick.active && brick.type !== 'unbreakable') {
          return false;
        }
      }
    }
    return true;
  }

  private drawWin(): void {
    this.ctx.font = '36px Arial';
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('YOU WIN!', this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.font = '18px Arial';
    this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 40);
    this.ctx.fillText('Press Enter to play again', this.canvas.width / 2, this.canvas.height / 2 + 80);
    this.ctx.textAlign = 'left';
  }

  update(): void {
    if (this.gameOver) return;

    this.ball.update();
    this.paddle.update();
    this.collisionDetection();

    if (this.checkWin()) {
      this.gameOver = true;
    }
  }

  draw(): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw game objects
    this.ball.draw(this.ctx);
    this.paddle.draw(this.ctx);

    // Draw bricks
    for (let row = 0; row < this.bricks.length; row++) {
      for (let col = 0; col < this.bricks[row].length; col++) {
        this.bricks[row][col].draw(this.ctx);
      }
    }

    // Draw UI
    this.drawScore();

    if (this.gameOver) {
      if (this.lives <= 0) {
        this.drawGameOver();
      } else {
        this.drawWin();
      }
    }
  }

  gameLoop(): void {
    this.update();
    this.draw();
    
    if (!this.gameOver) {
      this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  start(): void {
    this.gameLoop();
  }

  restart(): void {
    this.gameOver = false;
    this.score = 0;
    this.lives = 3;
    this.ball.reset();
    this.paddle.reset();
    this.bricks = this.createBricks();
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.start();
  }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
  const game = new ArkanoidGame('gameCanvas');
  game.start();
});