/**
 * 游戏主逻辑
 * 像素风虚拟空间 - 核心控制器
 */

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // 禁用平滑缩放，保持像素清晰
        this.ctx.imageSmoothingEnabled = false;
        
        // 地图配置
        this.mapWidth = 30;
        this.mapHeight = 30;
        this.tileSize = 48;
        
        // 初始化地图
        this.map = new GameMap(this.mapWidth, this.mapHeight, this.tileSize);
        
        // 初始化寻路
        this.pathFinder = new PathFinder(this.mapWidth, this.mapHeight);
        // 将地图障碍物同步到寻路器
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this.map.isObstacle(x, y)) {
                    this.pathFinder.addObstacle(x, y);
                }
            }
        }
        
        // 角色管理
        this.characters = new Map();
        this.player = null;
        
        // 游戏状态
        this.lastTime = 0;
        this.isRunning = false;
        this.statusText = '就绪';
        
        // 视口跟随
        this.cameraTarget = null;
        
        // 鼠标交互状态
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.cameraStartX = 0;
        this.cameraStartY = 0;
        this.clickStartTime = 0;
        this.clickStartX = 0;
        this.clickStartY = 0;
        
        // 初始化画布大小
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // 绑定鼠标事件
        this.bindMouseEvents();
    }

    /**
     * 绑定鼠标交互事件（拖拽和缩放）
     */
    bindMouseEvents() {
        const canvas = this.canvas;
        
        // 鼠标按下 - 开始拖拽
        canvas.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // 只响应左键
            
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.cameraStartX = this.map.cameraX;
            this.cameraStartY = this.map.cameraY;
            this.clickStartTime = Date.now();
            this.clickStartX = e.clientX;
            this.clickStartY = e.clientY;
            
            canvas.style.cursor = 'grabbing';
        });
        
        // 鼠标移动 - 拖拽中
        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const dx = e.clientX - this.dragStartX;
            const dy = e.clientY - this.dragStartY;
            
            this.map.cameraX = this.cameraStartX + dx;
            this.map.cameraY = this.cameraStartY + dy;
            
            // 拖拽时取消相机跟随
            this.cameraTarget = null;
        });
        
        // 鼠标释放 - 结束拖拽
        window.addEventListener('mouseup', (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            canvas.style.cursor = 'grab';
            
            // 判断是否是点击（短时间+小位移）
            const clickDuration = Date.now() - this.clickStartTime;
            const clickDx = Math.abs(e.clientX - this.clickStartX);
            const clickDy = Math.abs(e.clientY - this.clickStartY);
            
            if (clickDuration < 200 && clickDx < 5 && clickDy < 5) {
                // 是点击，执行移动
                this.handleClick(e);
            }
        });
        
        // 鼠标滚轮 - 缩放
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const zoomSpeed = 0.1;
            const minZoom = 0.5;
            const maxZoom = 3;
            
            // 获取鼠标在画布上的位置
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // 计算鼠标指向的网格点（缩放前）
            const gridBefore = this.map.screenToGrid(mouseX, mouseY);
            
            // 计算新的缩放值
            const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
            const newZoom = Math.max(minZoom, Math.min(maxZoom, this.map.zoom + delta));
            
            if (newZoom !== this.map.zoom) {
                this.map.zoom = newZoom;
                
                // 重新计算该网格点的屏幕位置（缩放后）
                const screenAfter = this.map.gridToScreen(gridBefore.x, gridBefore.y);
                
                // 调整相机，使鼠标指向的点保持不变
                this.map.cameraX += mouseX - screenAfter.x;
                this.map.cameraY += mouseY - screenAfter.y;
                
                // 缩放时取消相机跟随
                this.cameraTarget = null;
            }
        }, { passive: false });
        
        // 设置初始鼠标样式
        canvas.style.cursor = 'grab';
    }

    /**
     * 调整画布大小
     */
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx.imageSmoothingEnabled = false;
    }

    /**
     * 创建玩家角色
     */
    createPlayer(name, config = {}) {
        const pos = this.map.getRandomEmptyPosition();
        this.player = new Character('player', name, pos.x, pos.y, {
            ...config,
            isAI: false,
            moveSpeed: 250
        });
        this.characters.set('player', this.player);
        this.cameraTarget = this.player;
        
        // 更新头像
        this.updatePlayerAvatar();
        
        return this.player;
    }

    /**
     * 创建AI角色
     */
    createAI(name, config = {}) {
        const pos = this.map.getRandomEmptyPosition();
        const id = Utils.uuid();
        const ai = new Character(id, name, pos.x, pos.y, {
            ...config,
            isAI: true,
            moveSpeed: Utils.randomInt(600, 1000)
        });
        this.characters.set(id, ai);
        return ai;
    }

    /**
     * 初始化AI人群
     */
    initAICrowd(count = 40) {
        for (let i = 0; i < count; i++) {
            const name = Utils.randomName() + Utils.randomInt(1, 99);
            this.createAI(name, {
                personality: Utils.randomChoice(['friendly', 'shy', 'talkative', 'calm'])
            });
        }
    }

    /**
     * 更新寻路器的占用格子
     * @param {Character} excludeChar - 需要排除的角色（正在寻路的角色自己）
     */
    updatePathfinderOccupied(excludeChar = null) {
        const positions = [];
        this.characters.forEach(char => {
            // 排除自己
            if (excludeChar && char.id === excludeChar.id) return;
            // 只占用静止的角色位置（移动中的角色不视为占用）
            if (!char.isMoving) {
                positions.push({ x: char.gridX, y: char.gridY });
            }
        });
        this.pathFinder.setOccupied(positions);
    }

    /**
     * 处理画布点击（直接移动到点击位置）
     */
    handleClick(e) {
        if (!this.player) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        const gridPos = this.map.screenToGrid(screenX, screenY);
        
        if (gridPos.x >= 0 && gridPos.x < this.mapWidth &&
            gridPos.y >= 0 && gridPos.y < this.mapHeight) {
            
            this.movePlayerTo(gridPos.x, gridPos.y);
        }
    }

    /**
     * 移动玩家到指定位置
     */
    movePlayerTo(x, y) {
        if (!this.player) return;
        
        this.updatePathfinderOccupied();
        const path = this.pathFinder.findPath(
            { x: this.player.gridX, y: this.player.gridY },
            { x, y }
        );
        
        if (path.length > 0) {
            this.player.setPath(path);
            this.setStatus('正在移动...');
            
            // 到达后清除状态
            const checkArrival = setInterval(() => {
                if (!this.player.isMoving && this.player.path.length === 0) {
                    clearInterval(checkArrival);
                    this.setStatus('已到达');
                    setTimeout(() => this.setStatus('就绪'), 2000);
                }
            }, 100);
        } else {
            this.setStatus('无法到达该位置');
            setTimeout(() => this.setStatus('就绪'), 2000);
        }
    }

    /**
     * 玩家执行指令
     */
    executeCommand(command) {
        if (!this.player) return;
        
        const cmd = command.toLowerCase().trim();
        
        // 解析指令
        if (cmd.includes('打招呼') || cmd.includes('挥手')) {
            this.player.wave();
            this.player.say('你好！');
            this.setStatus('正在打招呼');
            
        } else if (cmd.includes('随机') || cmd.includes('走走')) {
            this.player.setRandomTarget(this);
            this.setStatus('随机探索中...');
            
        } else if (cmd.includes('找') || cmd.includes('去')) {
            // 寻找特定目标
            let target = null;
            let minDist = Infinity;
            
            this.characters.forEach(char => {
                if (char.id !== 'player') {
                    const dist = Utils.gridDistance(
                        this.player.gridX, this.player.gridY,
                        char.gridX, char.gridY
                    );
                    if (dist < minDist) {
                        minDist = dist;
                        target = char;
                    }
                }
            });
            
            if (target) {
                // 找到目标旁边的一个空位
                const neighbors = [
                    { x: target.gridX + 1, y: target.gridY },
                    { x: target.gridX - 1, y: target.gridY },
                    { x: target.gridX, y: target.gridY + 1 },
                    { x: target.gridX, y: target.gridY - 1 }
                ];
                
                let bestNeighbor = null;
                let bestDist = Infinity;
                
                for (const n of neighbors) {
                    if (this.pathFinder.isWalkable(n.x, n.y)) {
                        const dist = Utils.gridDistance(
                            this.player.gridX, this.player.gridY,
                            n.x, n.y
                        );
                        if (dist < bestDist) {
                            bestDist = dist;
                            bestNeighbor = n;
                        }
                    }
                }
                
                if (bestNeighbor) {
                    this.movePlayerTo(bestNeighbor.x, bestNeighbor.y);
                    
                    // 到达后互动
                    const checkArrival = setInterval(() => {
                        if (!this.player.isMoving && this.player.path.length === 0) {
                            clearInterval(checkArrival);
                            this.player.direction = this.getDirectionTo(this.player, target);
                            this.player.wave();
                            this.player.say(`你好，${target.name}！`);
                            target.say('嗨！很高兴见到你！');
                            this.setStatus(`正在和${target.name}聊天`);
                        }
                    }, 100);
                }
            }
            
        } else if (cmd.includes('停止')) {
            this.player.path = [];
            this.player.isMoving = false;
            this.setStatus('已停止');
            
        } else {
            // 默认：随机移动并说话
            this.player.setRandomTarget(this);
            this.player.say(command);
            this.setStatus('执行中...');
        }
    }

    /**
     * 获取朝向目标的方向
     */
    getDirectionTo(from, to) {
        const dx = to.gridX - from.gridX;
        const dy = to.gridY - from.gridY;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'right' : 'left';
        } else {
            return dy > 0 ? 'down' : 'up';
        }
    }

    /**
     * 设置状态文本
     */
    setStatus(text) {
        this.statusText = text;
        const statusEl = document.getElementById('statusText');
        if (statusEl) {
            statusEl.textContent = text;
        }
    }

    /**
     * 更新玩家头像
     */
    updatePlayerAvatar() {
        const avatarCanvas = document.getElementById('playerAvatar');
        if (!avatarCanvas || !this.player) return;
        
        const ctx = avatarCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        
        // 清空
        ctx.clearRect(0, 0, 32, 32);
        
        // 绘制简化版头像
        const p = (x, y, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
        };
        
        // 脸
        ctx.fillStyle = this.player.skinColor;
        ctx.fillRect(8, 8, 16, 14);
        
        // 眼睛
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(11, 12, 3, 3);
        ctx.fillRect(18, 12, 3, 3);
        
        // 头发
        ctx.fillStyle = this.player.hairColor;
        ctx.fillRect(6, 6, 20, 4);
        ctx.fillRect(6, 10, 3, 6);
        ctx.fillRect(23, 10, 3, 6);
        
        // 身体
        ctx.fillStyle = this.player.clothesColor;
        ctx.fillRect(8, 22, 16, 8);
    }

    /**
     * 游戏主循环
     */
    gameLoop(timestamp) {
        if (!this.isRunning) return;
        
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        // 更新
        this.update(dt);
        
        // 渲染
        this.render();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    /**
     * 更新逻辑
     */
    update(dt) {
        // 更新地图
        this.map.update(dt);
        
        // 更新角色（传入game引用供AI使用）
        this.characters.forEach(char => {
            char.update(dt, this);
        });
        
        // 更新相机跟随
        if (this.cameraTarget) {
            this.map.followCamera(
                this.canvas.width,
                this.canvas.height,
                this.cameraTarget.gridX,
                this.cameraTarget.gridY,
                dt
            );
        }
        
        // 更新寻路占用
        this.updatePathfinderOccupied();
    }

    /**
     * 渲染画面
     */
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // 清空画布
        ctx.fillStyle = '#2d2d44';
        ctx.fillRect(0, 0, w, h);
        
        // 绘制地图
        this.map.draw(ctx, w, h);
        
        // 收集所有角色并按Y坐标排序（确保遮挡关系正确）
        const sortedChars = Array.from(this.characters.values()).sort((a, b) => {
            // 等轴测排序：使用渲染位置进行排序
            const aSum = a.renderX + a.renderY;
            const bSum = b.renderX + b.renderY;
            if (aSum !== bSum) return aSum - bSum;
            return a.renderY - b.renderY;
        });
        
        // 绘制角色（传入缩放值，使用渲染位置）
        sortedChars.forEach(char => {
            const pos = this.map.gridToScreen(char.renderX, char.renderY);
            char.draw(ctx, pos.x, pos.y, this.tileSize * this.map.zoom, this.tileSize / 2 * this.map.zoom, this.map.zoom);
        });
    }

    /**
     * 启动游戏
     */
    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        
        // 创建玩家
        this.createPlayer('我的分身', {
            skinColor: '#ffdbac',
            hairColor: '#2c3e50',
            clothesColor: '#3498db',
            pantsColor: '#2c3e50'
        });
        
        // 创建AI人群
        this.initAICrowd(50);
        
        // 启动循环
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    /**
     * 停止游戏
     */
    stop() {
        this.isRunning = false;
    }
}
