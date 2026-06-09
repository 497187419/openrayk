/**
 * 地图系统
 * Antigravity 像素风虚拟空间 - 2.5D等轴测网格地图
 * 深蓝星空背景 + 浅蓝线框网格
 */

class GameMap {
    constructor(width, height, tileSize = 48) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.tileHeight = tileSize / 2;
        
        // 地图数据
        this.tiles = [];
        this.obstacles = new Set();
        
        // 初始化地图
        this.initMap();
        
        // 视口
        this.cameraX = 0;
        this.cameraY = 0;
        this.zoom = 1;
        
        // 动画
        this.animTimer = 0;
        this.starOffset = 0;
        
        // 星空星星
        this.stars = this.generateStars(100);
    }

    /**
     * 生成星空背景星星
     */
    generateStars(count) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * 2000,
                y: Math.random() * 2000,
                size: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.8 + 0.2,
                twinkleSpeed: Math.random() * 0.02 + 0.005
            });
        }
        return stars;
    }

    /**
     * 初始化地图格子
     */
    initMap() {
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                const variation = Math.random();
                let type = 'floor';
                
                // 边缘
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    type = 'border';
                }
                // 随机装饰
                else if (variation > 0.92) {
                    type = 'decoration';
                }
                
                this.tiles[y][x] = {
                    x, y,
                    type,
                    variant: Utils.randomInt(0, 3)
                };
            }
        }
    }

    /**
     * 更新地图动画
     */
    update(dt) {
        this.animTimer += dt;
        this.starOffset += dt * 0.01;
    }

    /**
     * 将网格坐标转换为屏幕坐标（2.5D等轴测投影，支持缩放）
     */
    gridToScreen(gridX, gridY) {
        const isoX = (gridX - gridY) * (this.tileSize * this.zoom / 2) + this.cameraX;
        const isoY = (gridX + gridY) * (this.tileHeight * this.zoom / 2) + this.cameraY;
        return { x: isoX, y: isoY };
    }

    /**
     * 将屏幕坐标转换为网格坐标（支持缩放）
     */
    screenToGrid(screenX, screenY) {
        const x = screenX - this.cameraX;
        const y = screenY - this.cameraY;
        const ts = this.tileSize * this.zoom;
        const th = this.tileHeight * this.zoom;
        
        const gridX = Math.floor((x / (ts / 2) + y / (th / 2)) / 2);
        const gridY = Math.floor((y / (th / 2) - x / (ts / 2)) / 2);
        
        return { x: gridX, y: gridY };
    }

    /**
     * 设置相机位置（居中显示）
     */
    centerCamera(screenWidth, screenHeight, targetX, targetY) {
        const center = this.gridToScreen(targetX, targetY);
        this.cameraX = screenWidth / 2 - center.x;
        this.cameraY = screenHeight / 2 - center.y;
    }

    /**
     * 平滑跟随相机
     */
    followCamera(screenWidth, screenHeight, targetX, targetY, dt) {
        const center = this.gridToScreen(targetX, targetY);
        const targetCamX = screenWidth / 2 - center.x;
        const targetCamY = screenHeight / 2 - center.y;
        
        const lerp = 0.1;
        this.cameraX += (targetCamX - this.cameraX) * lerp;
        this.cameraY += (targetCamY - this.cameraY) * lerp;
    }

    /**
     * 绘制星空背景
     */
    drawStars(ctx, screenWidth, screenHeight) {
        ctx.save();
        
        // 深蓝渐变背景
        const gradient = ctx.createLinearGradient(0, 0, 0, screenHeight);
        gradient.addColorStop(0, '#0a0e27');
        gradient.addColorStop(0.5, '#0f1535');
        gradient.addColorStop(1, '#1a1f4b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, screenWidth, screenHeight);
        
        // 绘制星星
        this.stars.forEach(star => {
            const twinkle = Math.sin(this.starOffset * star.twinkleSpeed * 100) * 0.3 + 0.7;
            const alpha = star.opacity * twinkle;
            
            // 视差效果：星星随相机反向轻微移动
            const parallaxX = (this.cameraX * 0.05 + star.x) % screenWidth;
            const parallaxY = (this.cameraY * 0.05 + star.y) % screenHeight;
            
            const sx = parallaxX < 0 ? parallaxX + screenWidth : parallaxX;
            const sy = parallaxY < 0 ? parallaxY + screenHeight : parallaxY;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(sx, sy, star.size, star.size);
        });
        
        ctx.restore();
    }

    /**
     * 绘制地图
     */
    draw(ctx, screenWidth, screenHeight) {
        // 先绘制星空背景
        this.drawStars(ctx, screenWidth, screenHeight);
        
        // 计算可见区域
        const corners = [
            this.screenToGrid(0, 0),
            this.screenToGrid(screenWidth, 0),
            this.screenToGrid(0, screenHeight),
            this.screenToGrid(screenWidth, screenHeight)
        ];
        
        const minX = Math.max(0, Math.min(...corners.map(c => c.x)) - 2);
        const maxX = Math.min(this.width - 1, Math.max(...corners.map(c => c.x)) + 2);
        const minY = Math.max(0, Math.min(...corners.map(c => c.y)) - 2);
        const maxY = Math.min(this.height - 1, Math.max(...corners.map(c => c.y)) + 2);
        
        // 绘制格子（从远到近）
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
                
                const tile = this.tiles[y][x];
                const pos = this.gridToScreen(x, y);
                
                this.drawTile(ctx, pos.x, pos.y, tile);
            }
        }
    }

    /**
     * 绘制单个格子
     */
    drawTile(ctx, x, y, tile) {
        const w = this.tileSize * this.zoom;
        const h = this.tileHeight * this.zoom;
        
        // 格子顶点（菱形）
        const points = [
            { x: x + w / 2, y: y },
            { x: x + w, y: y + h / 2 },
            { x: x + w / 2, y: y + h },
            { x: x, y: y + h / 2 }
        ];
        
        // 根据类型绘制不同颜色
        let fillColor, strokeColor;
        
        switch(tile.type) {
            case 'floor':
                fillColor = (tile.x + tile.y) % 2 === 0 ? 'rgba(15, 21, 53, 0.6)' : 'rgba(18, 25, 64, 0.6)';
                strokeColor = '#2a3f5f';
                break;
            case 'border':
                fillColor = 'rgba(10, 14, 39, 0.8)';
                strokeColor = '#3a5f8f';
                break;
            case 'decoration':
                fillColor = 'rgba(15, 25, 55, 0.6)';
                strokeColor = '#2a3f5f';
                break;
            default:
                fillColor = 'rgba(15, 21, 53, 0.6)';
                strokeColor = '#2a3f5f';
        }
        
        // 绘制菱形格子
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.max(0.5, this.zoom);
        ctx.stroke();
        
        // 绘制装饰
        if (tile.type === 'decoration') {
            this.drawDecoration(ctx, x, y, w, h, tile.variant);
        }
    }

    /**
     * 绘制装饰物（支持缩放）
     */
    drawDecoration(ctx, x, y, w, h, variant) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const s = Math.max(1, this.zoom);
        
        if (variant === 0) {
            // 发光小花
            ctx.fillStyle = '#4fc3f7';
            ctx.fillRect(cx - 1*s, cy - 3*s, 2*s, 2*s);
            ctx.fillRect(cx - 3*s, cy - 1*s, 2*s, 2*s);
            ctx.fillRect(cx + 1*s, cy - 1*s, 2*s, 2*s);
            ctx.fillRect(cx - 1*s, cy + 1*s, 2*s, 2*s);
            ctx.fillStyle = '#81d4fa';
            ctx.fillRect(cx - 1*s, cy - 1*s, 2*s, 2*s);
        } else if (variant === 1) {
            // 发光小草
            ctx.fillStyle = '#69f0ae';
            ctx.fillRect(cx - 2*s, cy, 1*s, 4*s);
            ctx.fillRect(cx, cy - 1*s, 1*s, 5*s);
            ctx.fillRect(cx + 2*s, cy, 1*s, 4*s);
        } else {
            // 小光点
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(cx - 1*s, cy + 1*s, 2*s, 2*s);
        }
    }

    /**
     * 判断格子是否是障碍物
     */
    isObstacle(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return true;
        }
        return this.obstacles.has(`${x},${y}`);
    }

    /**
     * 获取随机空位置
     */
    getRandomEmptyPosition() {
        let attempts = 0;
        while (attempts < 100) {
            const x = Utils.randomInt(1, this.width - 2);
            const y = Utils.randomInt(1, this.height - 2);
            if (!this.isObstacle(x, y)) {
                return { x, y };
            }
            attempts++;
        }
        return { x: 5, y: 5 };
    }
}
