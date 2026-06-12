/**
 * 角色系统
 * Antigravity 像素风虚拟空间 - 玩家和AI角色
 * 16-bit像素风 + 彩色光环 + 平滑移动动画
 */

class Character {
    constructor(id, name, gridX, gridY, config = {}) {
        this.id = id;
        this.name = name;

        // 当前网格位置
        this.gridX = gridX;
        this.gridY = gridY;

        // 平滑移动插值位置（用于渲染）
        this.renderX = gridX;
        this.renderY = gridY;

        // 目标位置
        this.targetX = gridX;
        this.targetY = gridY;

        // 外观配置
        this.skinColor = config.skinColor || Utils.randomSkinColor();
        this.hairColor = config.hairColor || Utils.randomHairColor();
        this.clothesColor = config.clothesColor || Utils.randomColor();
        this.pantsColor = config.pantsColor || Utils.randomColor();
        this.hairStyle = config.hairStyle || Utils.randomInt(0, 3);

        // 光环颜色（用于标识）
        this.glowColor = config.glowColor || Utils.randomChoice([
            '#4fc3f7', '#69f0ae', '#ffd54f', '#ff8a65', '#ce93d8', '#80cbc4'
        ]);

        // 动画状态
        this.direction = 'down';
        this.isMoving = false;
        this.isWaving = false;
        this.moveProgress = 0;
        this.walkFrame = 0;
        this.waveFrame = 0;
        this.animTimer = 0;
        this.bobOffset = 0; // 上下起伏偏移

        // 气泡文字
        this.bubbleText = null;
        this.bubbleTimer = 0;
        this.bubbleDuration = 3000;
        this.bubbleSpeaker = null; // 说话者名字

        // 移动路径
        this.path = [];
        this.pathIndex = 0;
        this.moveSpeed = config.moveSpeed || 400; // 毫秒/格
        this.moveStartTime = 0;

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

        const rect = (x, y, w, h, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, w, h);
        };

        // === 身体 ===
        // 腿（带走路动画偏移）
        const legOffset = this.isMoving && this.walkFrame === 1 ? 1 : 0;
        rect(10, 32, 4, 8, this.pantsColor);
        rect(18, 32, 4, 8, this.pantsColor);

        // 躯干
        rect(10, 18, 12, 14, this.clothesColor);

        // 手臂
        const armOffset = this.isWaving ? -3 : (this.isMoving && this.walkFrame === 1 ? 2 : 0);
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
            rect(12, 14, 2, 1, '#e74c3c');
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
            rect(14, 16, 4, 1, '#e74c3c');
        } else {
            rect(15, 16, 2, 1, '#c0392b');
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
    update(dt, game = null) {
        this.animTimer += dt;

        // 平滑移动插值
        if (this.isMoving) {
            const elapsed = Date.now() - this.moveStartTime;
            const progress = Math.min(elapsed / this.moveSpeed, 1);

            // 使用缓动函数使移动更平滑
            const easeProgress = this.easeInOutCubic(progress);

            this.renderX = this.prevGridX + (this.gridX - this.prevGridX) * easeProgress;
            this.renderY = this.prevGridY + (this.gridY - this.prevGridY) * easeProgress;

            // 走路动画帧切换
            if (this.animTimer > 150) {
                this.walkFrame = this.walkFrame === 0 ? 1 : 0;
                this.animTimer = 0;
                this.needsRedraw = true;
            }

            // 移动完成
            if (progress >= 1) {
                this.isMoving = false;
                this.renderX = this.gridX;
                this.renderY = this.gridY;
                this.walkFrame = 0;
                this.needsRedraw = true;

                // 继续路径
                if (this.pathIndex < this.path.length) {
                    this.moveAlongPath();
                } else {
                    this.path = [];
                }
            }
        } else {
            this.renderX = this.gridX;
            this.renderY = this.gridY;
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
                this.bubbleSpeaker = null;
            }
        }

        // AI行为
        if (this.isAI && game) {
            this.updateAI(dt, game);
        }
    }

    /**
     * 缓动函数
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /**
     * AI行为更新
     */
    updateAI(dt, game) {
        this.actionTimer += dt;

        if (this.actionTimer >= this.actionInterval) {
            this.actionTimer = 0;
            this.actionInterval = Utils.randomInt(2000, 6000);

            const actions = ['idle', 'move', 'wave', 'chat'];
            const weights = [0.2, 0.5, 0.15, 0.15];

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
                    this.setRandomTarget(game);
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
        const range = 8;
        let attempts = 0;
        let path = null;

        while (attempts < 10) {
            const tx = Utils.randomInt(
                Math.max(1, this.gridX - range),
                Math.min(game.map.width - 2, this.gridX + range)
            );
            const ty = Utils.randomInt(
                Math.max(1, this.gridY - range),
                Math.min(game.map.height - 2, this.gridY + range)
            );

            if (tx !== this.gridX || ty !== this.gridY) {
                // 更新寻路占用（排除自己）
                game.updatePathfinderOccupied(this);
                path = game.pathFinder.findPath(
                    { x: this.gridX, y: this.gridY },
                    { x: tx, y: ty }
                );
                if (path.length > 1) {
                    this.setPath(path);
                    return;
                }
            }
            attempts++;
        }
    }

    /**
     * 设置移动路径
     */
    setPath(path) {
        this.path = path.slice(1);
        this.pathIndex = 0;
        this.moveAlongPath();
    }

    /**
     * 沿路径移动一步（平滑过渡）
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

        // 保存前一位置用于插值
        this.prevGridX = this.gridX;
        this.prevGridY = this.gridY;

        this.gridX = next.x;
        this.gridY = next.y;
        this.isMoving = true;
        this.moveStartTime = Date.now();
        this.needsRedraw = true;
    }

    /**
     * 直接移动到相邻格子
     */
    moveTo(x, y) {
        if (x > this.gridX) this.direction = 'right';
        else if (x < this.gridX) this.direction = 'left';
        else if (y > this.gridY) this.direction = 'down';
        else if (y < this.gridY) this.direction = 'up';

        this.prevGridX = this.gridX;
        this.prevGridY = this.gridY;
        this.gridX = x;
        this.gridY = y;
        this.isMoving = true;
        this.moveStartTime = Date.now();
        this.needsRedraw = true;

        setTimeout(() => {
            this.isMoving = false;
            this.renderX = this.gridX;
            this.renderY = this.gridY;
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
    say(text, duration = 3000, speaker = null) {
        this.bubbleText = text;
        this.bubbleTimer = duration;
        this.bubbleSpeaker = speaker || this.name;
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
     * 绘制角色（支持缩放和平滑移动）
     */
    draw(ctx, isoX, isoY, tileW, tileH, zoom = 1) {
        this.renderPixelSprite();

        // 使用渲染位置（插值后的平滑位置），并居中于格子
        const screenX = isoX + (tileW - 32 * zoom) / 2;
        const screenY = isoY + (tileH - 40 * zoom) / 2 - 20 * zoom;

        // 缩放后的尺寸
        const spriteW = 32 * zoom;
        const spriteH = 40 * zoom;
        const centerX = screenX + spriteW / 2;
        const bottomY = screenY + spriteH;

        // === 绘制彩色光环 ===
        // 外发光
        ctx.save();
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 15 * zoom;
        ctx.fillStyle = this.glowColor;
        ctx.beginPath();
        ctx.ellipse(centerX, bottomY - 2 * zoom, 14 * zoom, 5 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 内光环
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(centerX, bottomY - 2 * zoom, 10 * zoom, 3 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();

        // 光环边框
        ctx.strokeStyle = this.glowColor;
        ctx.lineWidth = Math.max(1, 1.5 * zoom);
        ctx.beginPath();
        ctx.ellipse(centerX, bottomY - 2 * zoom, 14 * zoom, 5 * zoom, 0, 0, Math.PI * 2);
        ctx.stroke();

        // === 绘制阴影 ===
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(centerX, bottomY + 2 * zoom, 12 * zoom, 4 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();

        // === 绘制像素精灵 ===
        ctx.drawImage(
            this.pixelCanvas,
            screenX,
            screenY,
            spriteW,
            spriteH
        );

        // === 绘制用户名（光环上方） ===
        const nameFontSize = Math.max(6, 8 * zoom);
        ctx.font = `${nameFontSize}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';

        // 名字背景（半透明）
        const nameWidth = ctx.measureText(this.name).width;
        const namePadding = 4 * zoom;
        const nameBgY = bottomY + 6 * zoom;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.roundRect(
            centerX - nameWidth / 2 - namePadding,
            nameBgY - nameFontSize / 2 - 2 * zoom,
            nameWidth + namePadding * 2,
            nameFontSize + 4 * zoom,
            3 * zoom
        );
        ctx.fill();

        // 名字文字
        ctx.fillStyle = '#fff';
        ctx.fillText(this.name, centerX, nameBgY);

        // 名字发光效果
        ctx.save();
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 8 * zoom;
        ctx.fillStyle = '#fff';
        ctx.fillText(this.name, centerX, nameBgY);
        ctx.restore();

        // === 绘制气泡 ===
        if (this.bubbleText) {
            Utils.drawSpeechBubble(ctx, centerX, screenY, this.bubbleText, this.bubbleSpeaker, 120, zoom);
        }
    }
}
