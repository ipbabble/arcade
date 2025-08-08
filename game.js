class AsteroidsGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.gameState = 'playing'; // playing, paused, gameOver
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        
        // Game objects
        this.player = new Player(this.width / 2, this.height / 2);
        this.asteroids = [];
        this.bullets = [];
        this.particles = [];
        
        // Input handling
        this.keys = {};
        this.setupEventListeners();
        
        // Game loop
        this.lastTime = 0;
        this.gameLoop = this.gameLoop.bind(this);
        
        // Initialize game
        this.player.bullets = this.bullets; // Give player access to bullets array
        this.spawnAsteroids();
        this.start();
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Game control keys
            if (e.code === 'Space') {
                e.preventDefault();
            } else if (e.code === 'KeyP') {
                this.togglePause();
            } else if (e.code === 'KeyR') {
                this.restart();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Button events
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restart();
        });
        
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.togglePause();
        });
    }
    
    start() {
        this.gameLoop(0);
    }
    
    gameLoop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (this.gameState === 'playing') {
            this.update(deltaTime);
        }
        
        this.render();
        requestAnimationFrame(this.gameLoop);
    }
    
    update(deltaTime) {
        // Update player
        this.player.update(deltaTime, this.keys, this.width, this.height, this.gameState);
        
        // Update bullets
        this.bullets.forEach((bullet, index) => {
            bullet.update(deltaTime);
            if (bullet.isOffscreen(this.width, this.height)) {
                this.bullets.splice(index, 1);
            }
        });
        
        // Update asteroids
        this.asteroids.forEach((asteroid, index) => {
            asteroid.update(deltaTime, this.width, this.height);
        });
        
        // Update particles
        this.particles.forEach((particle, index) => {
            particle.update(deltaTime);
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
            }
        });
        
        // Check collisions
        this.checkCollisions();
        
        // Check if all asteroids are destroyed
        if (this.asteroids.length === 0) {
            this.nextLevel();
        }
    }
    
    checkCollisions() {
        // Bullet-Asteroid collisions
        this.bullets.forEach((bullet, bulletIndex) => {
            this.asteroids.forEach((asteroid, asteroidIndex) => {
                if (this.isColliding(bullet, asteroid)) {
                    // Remove bullet and asteroid
                    this.bullets.splice(bulletIndex, 1);
                    this.asteroids.splice(asteroidIndex, 1);
                    
                    // Add score
                    this.addScore(asteroid.size * 10);
                    
                    // Create explosion particles
                    this.createExplosion(asteroid.x, asteroid.y, asteroid.size);
                    
                    // Split asteroid if it's large enough
                    if (asteroid.size > 20) {
                        this.splitAsteroid(asteroid);
                    }
                }
            });
        });
        
        // Player-Asteroid collisions
        this.asteroids.forEach((asteroid, index) => {
            if (this.isColliding(this.player, asteroid)) {
                this.playerHit();
                this.asteroids.splice(index, 1);
                this.createExplosion(this.player.x, this.player.y, 30);
            }
        });
    }
    
    isColliding(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < obj1.radius + obj2.radius;
    }
    
    playerHit() {
        this.lives--;
        this.updateUI();
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Reset player position
            this.player.x = this.width / 2;
            this.player.y = this.height / 2;
            this.player.vx = 0;
            this.player.vy = 0;
        }
    }
    
    addScore(points) {
        this.score += points;
        this.updateUI();
        
        // Animate score update
        const scoreElement = document.getElementById('score');
        scoreElement.classList.add('score-update');
        setTimeout(() => {
            scoreElement.classList.remove('score-update');
        }, 300);
    }
    
    createExplosion(x, y, size) {
        const particleCount = Math.floor(size / 2);
        for (let i = 0; i < particleCount; i++) {
            this.particles.push(new Particle(x, y));
        }
    }
    
    splitAsteroid(asteroid) {
        const newSize = asteroid.size / 2;
        for (let i = 0; i < 2; i++) {
            const newAsteroid = new Asteroid(
                asteroid.x + (Math.random() - 0.5) * 20,
                asteroid.y + (Math.random() - 0.5) * 20,
                newSize,
                asteroid.vx + (Math.random() - 0.5) * 50,
                asteroid.vy + (Math.random() - 0.5) * 50
            );
            this.asteroids.push(newAsteroid);
        }
    }
    
    spawnAsteroids() {
        const asteroidCount = 3 + this.level;
        for (let i = 0; i < asteroidCount; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            const size = 40 + Math.random() * 20;
            const vx = (Math.random() - 0.5) * 100;
            const vy = (Math.random() - 0.5) * 100;
            
            this.asteroids.push(new Asteroid(x, y, size, vx, vy));
        }
    }
    
    nextLevel() {
        this.level++;
        this.updateUI();
        this.spawnAsteroids();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').classList.remove('hidden');
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseMenu').classList.remove('hidden');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseMenu').classList.add('hidden');
        }
    }
    
    restart() {
        this.gameState = 'playing';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.asteroids = [];
        this.bullets = [];
        this.particles = [];
        this.player = new Player(this.width / 2, this.height / 2);
        this.player.bullets = this.bullets;
        
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('pauseMenu').classList.add('hidden');
        
        this.updateUI();
        this.spawnAsteroids();
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw stars background
        this.drawStars();
        
        // Draw game objects
        this.player.draw(this.ctx);
        this.asteroids.forEach(asteroid => asteroid.draw(this.ctx));
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        this.particles.forEach(particle => particle.draw(this.ctx));
    }
    
    drawStars() {
        this.ctx.fillStyle = '#fff';
        for (let i = 0; i < 100; i++) {
            const x = (i * 37) % this.width;
            const y = (i * 73) % this.height;
            const size = (i % 3) + 1;
            this.ctx.fillRect(x, y, size, size);
        }
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.rotation = 0;
        this.radius = 15;
        this.thrust = 0.5;
        this.maxSpeed = 5;
        this.friction = 0.98;
        this.rotationSpeed = 0.1;
        this.shootCooldown = 0;
        this.shootDelay = 200; // milliseconds
        this.bullets = null; // Will be set by the game
    }
    
    update(deltaTime, keys, width, height, gameState) {
        // Rotation
        if (keys['ArrowLeft'] || keys['KeyA']) {
            this.rotation -= this.rotationSpeed;
        }
        if (keys['ArrowRight'] || keys['KeyD']) {
            this.rotation += this.rotationSpeed;
        }
        
        // Thrust
        if (keys['ArrowUp'] || keys['KeyW']) {
            this.vx += Math.cos(this.rotation) * this.thrust;
            this.vy += Math.sin(this.rotation) * this.thrust;
        }
        
        // Shooting
        if (keys['Space'] && gameState === 'playing') {
            this.shoot();
        }
        
        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        // Limit speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Wrap around screen
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
        
        // Update shoot cooldown
        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
        }
    }
    
    shoot() {
        if (this.shootCooldown <= 0 && this.bullets) {
            const bulletSpeed = 10;
            const bulletVx = Math.cos(this.rotation) * bulletSpeed + this.vx;
            const bulletVy = Math.sin(this.rotation) * bulletSpeed + this.vy;
            
            this.bullets.push(new Bullet(this.x, this.y, bulletVx, bulletVy));
            this.shootCooldown = this.shootDelay;
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Draw ship
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -8);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, 8);
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
    }
}

class Asteroid {
    constructor(x, y, size, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.radius = size / 2;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        this.vertices = this.generateVertices();
    }
    
    generateVertices() {
        const vertices = [];
        const numVertices = 8 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            const radius = this.size / 2 + (Math.random() - 0.5) * 10;
            vertices.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        
        return vertices;
    }
    
    update(deltaTime, width, height) {
        this.x += this.vx * deltaTime / 1000;
        this.y += this.vy * deltaTime / 1000;
        this.rotation += this.rotationSpeed;
        
        // Wrap around screen
        if (this.x < -this.size) this.x = width + this.size;
        if (this.x > width + this.size) this.x = -this.size;
        if (this.y < -this.size) this.y = height + this.size;
        if (this.y > height + this.size) this.y = -this.size;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        this.vertices.forEach((vertex, index) => {
            if (index === 0) {
                ctx.moveTo(vertex.x, vertex.y);
            } else {
                ctx.lineTo(vertex.x, vertex.y);
            }
        });
        
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 2;
        this.life = 100; // milliseconds
    }
    
    update(deltaTime) {
        this.x += this.vx * deltaTime / 1000;
        this.y += this.vy * deltaTime / 1000;
        this.life -= deltaTime;
    }
    
    isOffscreen(width, height) {
        return this.x < 0 || this.x > width || this.y < 0 || this.y > height || this.life <= 0;
    }
    
    draw(ctx) {
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 200;
        this.vy = (Math.random() - 0.5) * 200;
        this.life = 1.0;
        this.decay = 0.02;
        this.size = Math.random() * 3 + 1;
    }
    
    update(deltaTime) {
        this.x += this.vx * deltaTime / 1000;
        this.y += this.vy * deltaTime / 1000;
        this.life -= this.decay;
        this.size *= 0.98;
    }
    
    draw(ctx) {
        const alpha = this.life;
        ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new AsteroidsGame();
});
