// 游戏配置
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    PLAYER_SIZE: 40,
    ENEMY_SIZE: 35,
    BULLET_SIZE: 8,
    BULLET_SPEED: 8,
    PLAYER_SPEED: 5,
    ENEMY_SPEED: 2,
    MAX_ENEMIES: 5,
    SPAWN_INTERVAL: 3000,
    SHOOT_COOLDOWN: 300
};

// 游戏状态
const gameState = {
    canvas: null,
    ctx: null,
    player: null,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    score: 0,
    lives: 3,
    gameRunning: true,
    gamePaused: false,
    lastShot: 0,
    keys: {},
    lastSpawn: 0
};

// 玩家坦克类
class Tank {
    constructor(x, y, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.width = isPlayer ? CONFIG.PLAYER_SIZE : CONFIG.ENEMY_SIZE;
        this.height = this.width;
        this.speed = isPlayer ? CONFIG.PLAYER_SPEED : CONFIG.ENEMY_SPEED;
        this.direction = isPlayer ? 'up' : 'down'; // 玩家向上，敌人向下
        this.isPlayer = isPlayer;
        this.color = isPlayer ? '#4a9eff' : '#ff4444';
        this.lastShot = 0;
        this.moveTimer = 0;
        this.moveDirection = isPlayer ? 'up' : 'down'; // 初始移动方向
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // 旋转画布
        let angle = 0;
        switch (this.direction) {
            case 'up': angle = 0; break;
            case 'right': angle = Math.PI / 2; break;
            case 'down': angle = Math.PI; break;
            case 'left': angle = -Math.PI / 2; break;
        }
        ctx.rotate(angle);

        // 绘制坦克主体
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // 绘制坦克炮管
        ctx.fillStyle = this.isPlayer ? '#2a7edf' : '#df3434';
        ctx.fillRect(-this.width / 8, -this.height, this.width / 4, this.height / 2);

        // 绘制坦克履带
        ctx.fillStyle = this.isPlayer ? '#1a6ecf' : '#cf2424';
        ctx.fillRect(-this.width / 2 - 3, -this.height / 2, 4, this.height);
        ctx.fillRect(this.width / 2 - 1, -this.height / 2, 4, this.height);

        // 绘制坦克中心
        ctx.fillStyle = this.isPlayer ? '#5aafff' : '#ff5454';
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    move(dx, dy, canvasWidth, canvasHeight, otherTanks = []) {
        const newX = this.x + dx;
        const newY = this.y + dy;

        // 边界检测
        if (newX < 0 || newX + this.width > canvasWidth) return;
        if (newY < 0 || newY + this.height > canvasHeight) return;

        // 碰撞检测（其他坦克）
        for (let tank of otherTanks) {
            if (tank === this) continue;
            if (this.wouldCollide(newX, newY, tank)) return;
        }

        // 更新位置和方向
        this.x = newX;
        this.y = newY;

        if (dx > 0) this.direction = 'right';
        else if (dx < 0) this.direction = 'left';
        else if (dy > 0) this.direction = 'down';
        else if (dy < 0) this.direction = 'up';
    }

    wouldCollide(newX, newY, other) {
        return newX < other.x + other.width &&
               newX + this.width > other.x &&
               newY < other.y + other.height &&
               newY + this.height > other.y;
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot < CONFIG.SHOOT_COOLDOWN) return null;
        this.lastShot = now;

        const bullet = {
            x: this.x + this.width / 2 - CONFIG.BULLET_SIZE / 2,
            y: this.y + this.height / 2 - CONFIG.BULLET_SIZE / 2,
            width: CONFIG.BULLET_SIZE,
            height: CONFIG.BULLET_SIZE,
            direction: this.direction,
            speed: CONFIG.BULLET_SPEED,
            isPlayer: this.isPlayer,
            color: this.isPlayer ? '#00ffff' : '#ffaa00'
        };

        // 调整子弹起始位置
        switch (this.direction) {
            case 'up':
                bullet.y = this.y - CONFIG.BULLET_SIZE;
                bullet.x = this.x + this.width / 2 - CONFIG.BULLET_SIZE / 2;
                break;
            case 'down':
                bullet.y = this.y + this.height;
                bullet.x = this.x + this.width / 2 - CONFIG.BULLET_SIZE / 2;
                break;
            case 'left':
                bullet.x = this.x - CONFIG.BULLET_SIZE;
                bullet.y = this.y + this.height / 2 - CONFIG.BULLET_SIZE / 2;
                break;
            case 'right':
                bullet.x = this.x + this.width;
                bullet.y = this.y + this.height / 2 - CONFIG.BULLET_SIZE / 2;
                break;
        }

        return bullet;
    }

    aiMove(canvasWidth, canvasHeight, player, otherTanks) {
        this.moveTimer++;

        // 每60帧改变一次方向
        if (this.moveTimer > 60) {
            this.moveTimer = 0;
            const directions = ['up', 'down', 'left', 'right'];
            this.moveDirection = directions[Math.floor(Math.random() * directions.length)];
        }

        let dx = 0, dy = 0;
        switch (this.moveDirection) {
            case 'up': dy = -this.speed; break;
            case 'down': dy = this.speed; break;
            case 'left': dx = -this.speed; break;
            case 'right': dx = this.speed; break;
        }

        this.move(dx, dy, canvasWidth, canvasHeight, otherTanks);
    }
}

// 子弹类
class Bullet {
    constructor(bulletData) {
        Object.assign(this, bulletData);
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    }

    update(canvasWidth, canvasHeight) {
        switch (this.direction) {
            case 'up': this.y -= this.speed; break;
            case 'down': this.y += this.speed; break;
            case 'left': this.x -= this.speed; break;
            case 'right': this.x += this.speed; break;
        }

        return this.x >= 0 && this.x <= canvasWidth &&
               this.y >= 0 && this.y <= canvasHeight;
    }
}

// 初始化游戏
function initGame() {
    gameState.canvas = document.getElementById('gameCanvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    gameState.canvas.width = CONFIG.CANVAS_WIDTH;
    gameState.canvas.height = CONFIG.CANVAS_HEIGHT;

    // 创建玩家坦克
    gameState.player = new Tank(
        CONFIG.CANVAS_WIDTH / 2 - CONFIG.PLAYER_SIZE / 2,
        CONFIG.CANVAS_HEIGHT - CONFIG.PLAYER_SIZE - 10,
        true
    );

    // 重置游戏状态
    gameState.enemies = [];
    gameState.bullets = [];
    gameState.enemyBullets = [];
    gameState.score = 0;
    gameState.lives = 3;
    gameState.gameRunning = true;
    gameState.gamePaused = false;
    gameState.lastSpawn = Date.now();

    updateScore();

    // 开始游戏循环
    gameLoop();
}

// 更新分数显示
function updateScore() {
    document.getElementById('player-score').textContent = gameState.score;
    document.getElementById('player-lives').textContent = gameState.lives;
}

// 生成敌人
function spawnEnemy() {
    if (gameState.enemies.length >= CONFIG.MAX_ENEMIES) return;

    const x = Math.random() * (CONFIG.CANVAS_WIDTH - CONFIG.ENEMY_SIZE);
    const enemy = new Tank(x, -CONFIG.ENEMY_SIZE, false);
    gameState.enemies.push(enemy);
}

// 碰撞检测
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 更新游戏状态
function update() {
    if (!gameState.gameRunning || gameState.gamePaused) return;

    // 处理玩家移动
    let dx = 0, dy = 0;
    if (gameState.keys['ArrowUp'] || gameState.keys['KeyW']) dy = -CONFIG.PLAYER_SPEED;
    if (gameState.keys['ArrowDown'] || gameState.keys['KeyS']) dy = CONFIG.PLAYER_SPEED;
    if (gameState.keys['ArrowLeft'] || gameState.keys['KeyA']) dx = -CONFIG.PLAYER_SPEED;
    if (gameState.keys['ArrowRight'] || gameState.keys['KeyD']) dx = CONFIG.PLAYER_SPEED;

    gameState.player.move(dx, dy, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, gameState.enemies);

    // 发射子弹
    if (gameState.keys['Space']) {
        const bullet = gameState.player.shoot();
        if (bullet) {
            gameState.bullets.push(new Bullet(bullet));
        }
    }

    // 生成敌人
    if (Date.now() - gameState.lastSpawn > CONFIG.SPAWN_INTERVAL) {
        spawnEnemy();
        gameState.lastSpawn = Date.now();
    }

    // 更新敌人
    gameState.enemies.forEach(enemy => {
        enemy.aiMove(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, gameState.player, gameState.enemies);

        // 敌人随机射击
        if (Math.random() < 0.02) {
            const bullet = enemy.shoot();
            if (bullet) {
                gameState.enemyBullets.push(new Bullet(bullet));
            }
        }
    });

    // 更新子弹
    gameState.bullets = gameState.bullets.filter(bullet => {
        const alive = bullet.update(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // 检测击中敌人
        gameState.enemies = gameState.enemies.filter(enemy => {
            if (checkCollision(bullet, enemy)) {
                gameState.score += 100;
                updateScore();
                return false;
            }
            return true;
        });

        return alive;
    });

    // 更新敌人子弹
    gameState.enemyBullets = gameState.enemyBullets.filter(bullet => {
        const alive = bullet.update(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // 检测击中玩家
        if (alive && checkCollision(bullet, gameState.player)) {
            gameState.lives--;
            updateScore();

            if (gameState.lives <= 0) {
                gameOver();
            }
            return false;
        }

        return alive;
    });

    // 检测玩家与敌人碰撞
    gameState.enemies.forEach(enemy => {
        if (checkCollision(gameState.player, enemy)) {
            gameState.lives--;
            updateScore();

            if (gameState.lives <= 0) {
                gameOver();
            }
        }
    });
}

// 绘制游戏
function draw() {
    const ctx = gameState.ctx;

    // 清空画布
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // 绘制网格背景
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    for (let i = 0; i < CONFIG.CANVAS_WIDTH; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, CONFIG.CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let i = 0; i < CONFIG.CANVAS_HEIGHT; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(CONFIG.CANVAS_WIDTH, i);
        ctx.stroke();
    }

    // 绘制玩家
    gameState.player.draw(ctx);

    // 绘制敌人
    gameState.enemies.forEach(enemy => enemy.draw(ctx));

    // 绘制子弹
    gameState.bullets.forEach(bullet => bullet.draw(ctx));
    gameState.enemyBullets.forEach(bullet => bullet.draw(ctx));

    // 暂停提示
    if (gameState.gamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        ctx.fillStyle = '#4a9eff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏暂停', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
    }
}

// 游戏循环
function gameLoop() {
    if (!gameState.gameRunning) return;

    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 游戏结束
function gameOver() {
    gameState.gameRunning = false;
    const ctx = gameState.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    ctx.fillStyle = '#ff4444';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 30);

    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.fillText(`最终得分: ${gameState.score}`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 20);

    ctx.fillStyle = '#4a9eff';
    ctx.font = '20px Arial';
    ctx.fillText('按 R 键重新开始', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 60);
}

// 键盘事件处理
document.addEventListener('keydown', (e) => {
    gameState.keys[e.code] = true;

    if (e.code === 'KeyP') {
        gameState.gamePaused = !gameState.gamePaused;
    }

    if (e.code === 'KeyR' && !gameState.gameRunning) {
        initGame();
    }

    // 防止空格键滚动页面
    if (e.code === 'Space') {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.code] = false;
});

// 启动游戏
window.onload = initGame;