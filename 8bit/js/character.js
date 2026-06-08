/**
 * 角色系统
 * 像素风虚拟空间 - 玩家和AI角色
 */

class Character {
    constructor(id, name, gridX, gridY, config = {}) {
        this.id = id;
        this.name = name;
        this.gridX = gridX;
        this.gridY = gridY;
        this.targetX = gridX;
        this.targetY = gridY;
        
        // 外观配置
        this.skinColor = config.skinColor || Utils.randomSkinColor();
        this.hairColor = config.hairColor || Utils.randomHairColor();
        this.clothesColor = config.clothesColor || Utils.randomColor();
        this.pantsColor = config.pantsColor || Utils.randomColor();
        this.hairStyle = config.hairStyle || Utils.randomInt(0, 3);
        
        // 动画状态
        this.direction = 'down'; // up, down, left, right
        this.isMoving = false;
        this.isWaving = false;
        this.moveProgress = 0;
        this.walkFrame = 0;
        this.waveFrame = 0;
        this.animTimer = 0;
        
        // 气泡文字
        this.bubbleText = null;
        this.bubbleTimer = 0;
        this.bubbleDuration = 3000;
        
        // 移动路径
        this.path = [];
        this.pathIndex = 0;
        this.moveSpeed = config.moveSpeed || 300; // 毫秒/格
        
        // AI属性
        this.isAI = config.isAI || false;
        this.personality = config.personality || Utils.randomChoice(['friendly', 'shy', 'talkative', 'calm']);
        this.actionTimer = 0;
        this.actionInterval = Utils.randomInt(2000, 5000);
        
        // 像素画布缓存
        this.pixelCanvas = document.createElement('canvas');
        this.pixelCanvas.width = 32;
        this.pixelCanvas.height = 40;
        this.pixelCtx = this.pixelCanvas.getContext('2d');
        this.needsRedraw = true;
    }

    /**
     * 绘制像素角色到缓存画布
     */
    renderPixelSprite() {
        if (!this.needsRedraw) return;
        
        const ctx = this.pixelCtx;
        ctx.clearRect(0, 0, 32, 40);
        
        // 像素绘制辅助
        const p = (x, y, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
        };
        
        const rect = (x, y, w, h, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, w, h);
        };
        
        // === 身体 ===
        // 腿
        const legOffset = this.isMoving && this.walkFrame === 1 ? 1 : 0;
        rect(10, 32, 4, 8, this.pantsColor);
        rect(18, 32, 4, 8, this.pantsColor);
        
        // 躯干
        rect(10, 18, 12, 14, this.clothesColor);
        
        // 手臂
        const armOffset = this.isWaving ? -2 : (this.isMoving && this.walkFrame === 1 ? 2 : 0);
        rect(6, 20, 4, 10, this.clothesColor);
        rect(22, 20 + armOffset, 4, 10, this.clothesColor);
        
        // 手
        rect(6, 30, 4, 3, this.skinColor);
        rect(22, 30 + armOffset, 4, 3, this.skinColor);
        
        // === 头部 ===
        // 脸
        rect(10, 6, 12, 12, this.skinColor);
        
        // 眼睛
        const eyeColor = '#1a1a2e';
        if (this.direction === 'left') {
            rect(12, 10, 2, 2, eyeColor);
            rect(12, 14, 2, 1, '#e74c3c'); // 腮红
        } else if (this.direction === 'right') {
            rect(18, 10, 2, 2, eyeColor);
            rect(18, 14, 2, 1, '#e74c3c');
        } else {
            rect(12, 10, 2, 2, eyeColor);
            rect(18, 10, 2, 2, eyeColor);
            rect(12, 14, 2, 1, '#e74c3c');
            rect(18, 14, 2, 1, '#e74c3c');
        }
        
        // 嘴巴
        if (this.bubbleText) {
            rect(14, 16, 4, 1, '#e74c3c'); // 微笑
        } else {
            rect(15, 16, 2, 1, '#c0392b'); // 平静
        }
        
        // === 头发 ===
        switch(this.hairStyle) {
            case 0: // 短发
                rect(8, 4, 16, 4, this.hairColor);
                rect(8, 8, 2, 6, this.hairColor);
                rect(22, 8, 2, 6, this.hairColor);
                rect(10, 6, 12, 2, this.hairColor);
                break;
            case 1: // 长发
                rect(8, 4, 16, 4, this.hairColor);
                rect(6, 6, 4, 14, this.hairColor);
                rect(22, 6, 4, 14, this.hairColor);
                rect(10, 6, 12, 2, this.hairColor);
                break;
            case 2: // 爆炸头
                rect(6, 2, 20, 6, this.hairColor);
                rect(8, 8, 2, 4, this.hairColor);
                rect(22, 8, 2, 4, this.hairColor);
                rect(10, 4, 12, 2, this.hairColor);
                break;
            case 3: // 帽子
                rect(8, 4, 16, 4, this.hairColor);
                rect(6, 6, 20, 2, this.clothesColor);
                rect(10, 8, 12, 2, this.hairColor);
                break;
        }
        
        this.needsRedraw = false;
    }

    /**
     * 更新角色状态
     */
    update(dt) {
        this.animTimer += dt;
        
        // 走路动画帧切换 (约10 FPS)
        if (this.isMoving) {
            if (this.animTimer > 150) {
                this.walkFrame = this.walkFrame === 0 ? 1 : 0;
                this.animTimer = 0;
                this.needsRedraw = true;
            }
        } else {
            this.walkFrame = 0;
        }
        
        // 挥手动画
        if (this.isWaving) {
            if (this.animTimer > 200) {
                this.waveFrame = (this.waveFrame + 1) % 3;
                this.animTimer = 0;
                this.needsRedraw = true;
            }
        }
        
        // 气泡计时
        if (this.bubbleText && this.bubbleTimer > 0) {
            this.bubbleTimer -= dt;
            if (this.bubbleTimer <= 0) {
                this.bubbleText = null;
            }
        }
        
        // AI行为
        if (this.isAI) {
            this.updateAI(dt);
        }
        
        // 执行路径移动
        if (this.path.length > 0 && !this.isMoving) {
            this.moveAlongPath();
        }
    }

    /**
     * AI行为更新
     */
    updateAI(dt) {
        this.actionTimer += dt;
        
        if (this.actionTimer >= this.actionInterval) {
            this.actionTimer = 0;
            this.actionInterval = Utils.randomInt(3000, 8000);
            
            // 随机行为
            const actions = ['idle', 'move', 'wave', 'chat'];
            const weights = [0.3, 0.4, 0.15, 0.15];
            
            let rand = Math.random();
            let action = 'idle';
            let cumulative = 0;
            
            for (let i = 0; i < actions.length; i++) {
                cumulative += weights[i];
                if (rand <= cumulative) {
                    action = actions[i];
                    break;
                }
            }
            
            switch(action) {
                case 'move':
                    this.setRandomTarget();
                    break;
                case 'wave':
                    this.wave();
                    break;
                case 'chat':
                    this.sayRandom();
                    break;
            }
        }
    }

    /**
     * 设置随机移动目标
     */
    setRandomTarget(game) {
        if (!game) return;
        const range = 5;
        const tx = Utils.randomInt(
            Math.max(0, this.gridX - range),
            Math.min(game.map.width - 1, this.gridX + range)
        );
        const ty = Utils.randomInt(
            Math.max(0, this.gridY - range),
            Math.min(game.map.height - 1, this.gridY + range)
        );
        
        if (tx !== this.gridX || ty !== this.gridY) {
            const path = game.pathFinder.findPath(
                { x: this.gridX, y: this.gridY },
                { x: tx, y: ty }
            );
            if (path.length > 0) {
                this.setPath(path);
            }
        }
    }

    /**
     * 设置移动路径
     */
    setPath(path) {
        this.path = path.slice(1); // 去掉当前位置
        this.pathIndex = 0;
        this.isMoving = true;
    }

    /**
     * 沿路径移动一步
     */
    moveAlongPath() {
        if (this.pathIndex >= this.path.length) {
            this.path = [];
            this.isMoving = false;
            return;
        }
        
        const next = this.path[this.pathIndex];
        this.pathIndex++;
        
        // 更新方向
        if (next.x > this.gridX) this.direction = 'right';
        else if (next.x < this.gridX) this.direction = 'left';
        else if (next.y > this.gridY) this.direction = 'down';
        else if (next.y < this.gridY) this.direction = 'up';
        
        this.gridX = next.x;
        this.gridY = next.y;
        this.isMoving = true;
        this.needsRedraw = true;
        
        // 移动完成后
        setTimeout(() => {
            this.isMoving = false;
            this.needsRedraw = true;
            if (this.pathIndex < this.path.length) {
                this.moveAlongPath();
            } else {
                this.path = [];
            }
        }, this.moveSpeed);
    }

    /**
     * 直接移动到相邻格子
     */
    moveTo(x, y) {
        if (x > this.gridX) this.direction = 'right';
        else if (x < this.gridX) this.direction = 'left';
        else if (y > this.gridY) this.direction = 'down';
        else if (y < this.gridY) this.direction = 'up';
        
        this.gridX = x;
        this.gridY = y;
        this.isMoving = true;
        this.needsRedraw = true;
        
        setTimeout(() => {
            this.isMoving = false;
            this.needsRedraw = true;
        }, this.moveSpeed);
    }

    /**
     * 挥手动作
     */
    wave() {
        this.isWaving = true;
        this.needsRedraw = true;
        setTimeout(() => {
            this.isWaving = false;
            this.waveFrame = 0;
            this.needsRedraw = true;
        }, 1000);
    }

    /**
     * 说话气泡
     */
    say(text, duration = 3000) {
        this.bubbleText = text;
        this.bubbleTimer = duration;
        this.needsRedraw = true;
    }

    /**
     * 随机说话
     */
    sayRandom() {
        const texts = {
            friendly: ['你好呀！', '今天天气不错', '嗨~', '见到你很高兴'],
            shy: ['...', '嗯', '你好', '呃...'],
            talkative: ['你知道吗...', '哈哈！', '太有趣了', '我想说...'],
            calm: ['嗯', '好的', '明白', '这样啊']
        };
        const textsForPersonality = texts[this.personality] || texts.friendly;
        this.say(Utils.randomChoice(textsForPersonality));
    }

    /**
     * 绘制角色（支持缩放）
     */
    draw(ctx, isoX, isoY, tileW, tileH, zoom = 1) {
        this.renderPixelSprite();
        
        // 计算屏幕位置（2.5D等轴测投影）
        const screenX = isoX;
        const screenY = isoY - 20 * zoom; // 向上偏移，让脚站在格子上
        
        // 缩放后的尺寸
        const spriteW = 32 * zoom;
        const spriteH = 40 * zoom;
        
        // 绘制阴影
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(screenX + spriteW / 2, screenY + spriteH - 2 * zoom, 12 * zoom, 4 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制像素精灵
        ctx.drawImage(
            this.pixelCanvas,
            screenX,
            screenY,
            spriteW,
            spriteH
        );
        
        // 绘制名字
        const fontSize = Math.max(6, 8 * zoom);
        ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(this.name, screenX + spriteW / 2 + 1, screenY - 4 * zoom);
        ctx.fillStyle = '#fff';
        ctx.fillText(this.name, screenX + spriteW / 2, screenY - 5 * zoom);
        
        // 绘制气泡
        if (this.bubbleText) {
            Utils.drawSpeechBubble(ctx, screenX + spriteW / 2, screenY, this.bubbleText, 120, zoom);
        }
    }
}
