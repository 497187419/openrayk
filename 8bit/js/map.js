/**
 * 地图系统
 * 像素风虚拟空间 - 2.5D等轴测网格地图
 */

class GameMap {
    constructor(width, height, tileSize = 48) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.tileHeight = tileSize / 2; // 等轴测高度为宽度的一半
        
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
        this.waterOffset = 0;
        this.animTimer = 0;
    }

    /**
     * 初始化地图格子
     */
    initMap() {
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                // 随机生成一些装饰性变化
                const variation = Math.random();
                let type = 'floor';
                
                // 边缘装饰
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    type = 'border';
                }
                // 随机障碍物（约5%）
                else if (variation > 0.95) {
                    type = 'obstacle';
                    this.obstacles.add(`${x},${y}`);
                }
                // 随机装饰
                else if (variation > 0.9) {
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
        if (this.animTimer > 500) {
            this.waterOffset = (this.waterOffset + 1) % 4;
            this.animTimer = 0;
        }
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
        
        // 逆向等轴测公式
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
     * 绘制地图
     */
    draw(ctx, screenWidth, screenHeight) {
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
        
        // 绘制格子（从远到近，确保遮挡关系正确）
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
            { x: x + w / 2, y: y },         // 上
            { x: x + w, y: y + h / 2 },     // 右
            { x: x + w / 2, y: y + h },     // 下
            { x: x, y: y + h / 2 }          // 左
        ];
        
        // 根据类型绘制不同颜色
        let fillColor, strokeColor;
        
        switch(tile.type) {
            case 'floor':
                fillColor = (tile.x + tile.y) % 2 === 0 ? '#3a3a52' : '#353550';
                strokeColor = '#4a4a6a';
                break;
            case 'border':
                fillColor = '#2d2d44';
                strokeColor = '#5a5a7a';
                break;
            case 'obstacle':
                fillColor = '#2c2c3e';
                strokeColor = '#6c5ce7';
                break;
            case 'decoration':
                fillColor = '#3d3d55';
                strokeColor = '#4a4a6a';
                break;
            default:
                fillColor = '#3a3a52';
                strokeColor = '#4a4a6a';
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
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 绘制障碍物装饰
        if (tile.type === 'obstacle') {
            this.drawObstacle(ctx, x, y, w, h, tile.variant);
        }
        
        // 绘制装饰
        if (tile.type === 'decoration') {
            this.drawDecoration(ctx, x, y, w, h, tile.variant);
        }
    }

    /**
     * 绘制障碍物（像素树/石头，支持缩放）
     */
    drawObstacle(ctx, x, y, w, h, variant) {
        const cx = x + w / 2;
        const cy = y + h / 2 - 5 * this.zoom;
        const s = this.zoom;
        
        if (variant % 2 === 0) {
            // 像素树
            // 树干
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(cx - 3*s, cy, 6*s, 12*s);
            
            // 树冠（像素风格）
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(cx - 10*s, cy - 12*s, 20*s, 12*s);
            ctx.fillRect(cx - 7*s, cy - 18*s, 14*s, 6*s);
            ctx.fillRect(cx - 4*s, cy - 22*s, 8*s, 4*s);
            
            // 树冠高光
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(cx - 8*s, cy - 10*s, 4*s, 4*s);
            ctx.fillRect(cx - 5*s, cy - 16*s, 3*s, 3*s);
        } else {
            // 像素石头
            ctx.fillStyle = '#7f8c8d';
            ctx.fillRect(cx - 8*s, cy + 2*s, 16*s, 10*s);
            ctx.fillRect(cx - 6*s, cy - 2*s, 12*s, 6*s);
            ctx.fillRect(cx - 3*s, cy - 5*s, 6*s, 3*s);
            
            // 高光
            ctx.fillStyle = '#95a5a6';
            ctx.fillRect(cx - 6*s, cy + 4*s, 4*s, 3*s);
            ctx.fillRect(cx - 4*s, cy, 3*s, 2*s);
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
            // 小花
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(cx - 1*s, cy - 3*s, 2*s, 2*s);
            ctx.fillRect(cx - 3*s, cy - 1*s, 2*s, 2*s);
            ctx.fillRect(cx + 1*s, cy - 1*s, 2*s, 2*s);
            ctx.fillRect(cx - 1*s, cy + 1*s, 2*s, 2*s);
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(cx - 1*s, cy - 1*s, 2*s, 2*s);
        } else if (variant === 1) {
            // 小草
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(cx - 2*s, cy, 1*s, 4*s);
            ctx.fillRect(cx, cy - 1*s, 1*s, 5*s);
            ctx.fillRect(cx + 2*s, cy, 1*s, 4*s);
        } else {
            // 小石头
            ctx.fillStyle = '#95a5a6';
            ctx.fillRect(cx - 2*s, cy + 2*s, 4*s, 3*s);
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
