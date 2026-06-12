/**
 * 湛江赤坎区地图虚拟空间
 * 基于高德开放平台数据生成格子地图
 * GBA口袋妖怪式多区域切换
 */

// ==================== 区域配置 ====================
const ZONE_CONFIG = {
	cols: 3,
	rows: 3,
	zoneWidth: 24,
	zoneHeight: 24,
	tileSize: 48
};

const ZONE_NAMES = [
	['寸金北区', '寸金中区', '金沙湾区'],
	['北桥片区', '赤坎中心', '湾北片区'],
	['麻章交界', '椹川片区', '海滨片区']
];

// 区域特征：决定每个区域的地形偏向
// water: 水域概率, building: 建筑概率, road: 道路密度
const ZONE_FEATURES = [
	[{water:0.02, building:0.15, road:0.12}, {water:0.02, building:0.20, road:0.15}, {water:0.25, building:0.10, road:0.10}],
	[{water:0.03, building:0.12, road:0.10}, {water:0.05, building:0.30, road:0.18}, {water:0.20, building:0.15, road:0.12}],
	[{water:0.05, building:0.08, road:0.08}, {water:0.08, building:0.18, road:0.14}, {water:0.30, building:0.12, road:0.10}]
];

// ==================== 格子类型 ====================
const TILE_TYPES = {
	FLOOR: 'floor',
	ROAD: 'road',
	BUILDING: 'building',
	WATER: 'water',
	BORDER: 'border',
	ZONE_EDGE: 'zone_edge'
};

// ==================== 单区域地图 ====================
class ZoneMap {
	constructor(zoneX, zoneY, width, height, tileSize) {
		this.zoneX = zoneX;
		this.zoneY = zoneY;
		this.width = width;
		this.height = height;
		this.tileSize = tileSize;
		this.tileHeight = tileSize;

		this.tiles = [];
		this.obstacles = new Set();
		this.cameraX = 0;
		this.cameraY = 0;
		this.zoom = 1;

		this.animTimer = 0;
		this.starOffset = 0;
		this.stars = this.generateStars(80);

		this.generateMap();
	}

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

	generateMap() {
		const features = ZONE_FEATURES[this.zoneY][this.zoneX];

		for (let y = 0; y < this.height; y++) {
			this.tiles[y] = [];
			for (let x = 0; x < this.width; x++) {
				this.tiles[y][x] = {
					x, y,
					type: TILE_TYPES.FLOOR,
					variant: Utils.randomInt(0, 3)
				};
			}
		}

		this.generateRoads();

		for (let y = 1; y < this.height - 1; y++) {
			for (let x = 1; x < this.width - 1; x++) {
				const rand = Math.random();
				if (this.tiles[y][x].type === TILE_TYPES.ROAD) continue;

				if (rand < features.water) {
					this.generateCluster(x, y, TILE_TYPES.WATER, 3);
				} else if (rand < features.water + features.building) {
					this.generateCluster(x, y, TILE_TYPES.BUILDING, 4);
				}
			}
		}

		for (let x = 0; x < this.width; x++) {
			if (this.tiles[0][x].type !== TILE_TYPES.ROAD) this.tiles[0][x].type = TILE_TYPES.ZONE_EDGE;
			if (this.tiles[this.height-1][x].type !== TILE_TYPES.ROAD) this.tiles[this.height-1][x].type = TILE_TYPES.ZONE_EDGE;
		}
		for (let y = 0; y < this.height; y++) {
			if (this.tiles[y][0].type !== TILE_TYPES.ROAD) this.tiles[y][0].type = TILE_TYPES.ZONE_EDGE;
			if (this.tiles[y][this.width-1].type !== TILE_TYPES.ROAD) this.tiles[y][this.width-1].type = TILE_TYPES.ZONE_EDGE;
		}

		this.tiles[0][0].type = TILE_TYPES.BORDER;
		this.tiles[0][this.width-1].type = TILE_TYPES.BORDER;
		this.tiles[this.height-1][0].type = TILE_TYPES.BORDER;
		this.tiles[this.height-1][this.width-1].type = TILE_TYPES.BORDER;

		this.syncObstacles();
	}

	generateRoads() {
		const cx = Math.floor(this.width / 2);
		const cy = Math.floor(this.height / 2);

		for (let x = 0; x < this.width; x++) {
			this.tiles[cy][x].type = TILE_TYPES.ROAD;
			if (cy + 1 < this.height) this.tiles[cy+1][x].type = TILE_TYPES.ROAD;
		}
		for (let y = 0; y < this.height; y++) {
			this.tiles[y][cx].type = TILE_TYPES.ROAD;
			if (cx + 1 < this.width) this.tiles[y][cx+1].type = TILE_TYPES.ROAD;
		}

		if (this.zoneX > 0) {
			this.tiles[cy][0].type = TILE_TYPES.ROAD;
			if (cy + 1 < this.height) this.tiles[cy+1][0].type = TILE_TYPES.ROAD;
		}
		if (this.zoneX < ZONE_CONFIG.cols - 1) {
			this.tiles[cy][this.width-1].type = TILE_TYPES.ROAD;
			if (cy + 1 < this.height) this.tiles[cy+1][this.width-1].type = TILE_TYPES.ROAD;
		}
		if (this.zoneY > 0) {
			this.tiles[0][cx].type = TILE_TYPES.ROAD;
			if (cx + 1 < this.width) this.tiles[0][cx+1].type = TILE_TYPES.ROAD;
		}
		if (this.zoneY < ZONE_CONFIG.rows - 1) {
			this.tiles[this.height-1][cx].type = TILE_TYPES.ROAD;
			if (cx + 1 < this.width) this.tiles[this.height-1][cx+1].type = TILE_TYPES.ROAD;
		}
	}

	generateCluster(startX, startY, type, maxSize) {
		const size = Utils.randomInt(1, maxSize);
		const queue = [{x: startX, y: startY}];
		const visited = new Set([`${startX},${startY}`]);
		let count = 0;

		while (queue.length > 0 && count < size) {
			const {x, y} = queue.shift();
			if (x < 1 || x >= this.width - 1 || y < 1 || y >= this.height - 1) continue;
			if (this.tiles[y][x].type === TILE_TYPES.ROAD) continue;

			this.tiles[y][x].type = type;
			count++;

			const neighbors = [
				{x: x+1, y}, {x: x-1, y}, {x, y: y+1}, {x, y: y-1}
			].sort(() => Math.random() - 0.5);

			for (const n of neighbors) {
				const key = `${n.x},${n.y}`;
				if (!visited.has(key) && n.x >= 1 && n.x < this.width - 1 && n.y >= 1 && n.y < this.height - 1) {
					visited.add(key);
					if (Math.random() < 0.7) queue.push(n);
				}
			}
		}
	}

	syncObstacles() {
		this.obstacles.clear();
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const t = this.tiles[y][x].type;
				if (t === TILE_TYPES.BUILDING || t === TILE_TYPES.WATER || t === TILE_TYPES.BORDER) {
					this.obstacles.add(`${x},${y}`);
				}
			}
		}
	}

	isObstacle(x, y) {
		if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
		return this.obstacles.has(`${x},${y}`);
	}

	gridToScreen(gridX, gridY) {
		const tileW = this.tileSize * this.zoom;
		const tileH = tileW * 0.5;
		const cx = (gridX - gridY) * tileW / 2 + this.cameraX;
		const cy = (gridX + gridY) * tileH / 2 + this.cameraY;
		return {
			x: cx - tileW / 2,
			y: cy - tileH / 2
		};
	}

	screenToGrid(screenX, screenY) {
		const tileW = this.tileSize * this.zoom;
		const tileH = tileW * 0.5;
		const cx = screenX + tileW / 2 - this.cameraX;
		const cy = screenY + tileH / 2 - this.cameraY;
		const gridX = Math.floor((cx / (tileW / 2) + cy / (tileH / 2)) / 2);
		const gridY = Math.floor((cy / (tileH / 2) - cx / (tileW / 2)) / 2);
		return { x: gridX, y: gridY };
	}

	getRandomEmptyPosition() {
		let attempts = 0;
		while (attempts < 200) {
			const x = Utils.randomInt(2, this.width - 3);
			const y = Utils.randomInt(2, this.height - 3);
			if (!this.isObstacle(x, y)) {
				return { x, y };
			}
			attempts++;
		}
		return { x: Math.floor(this.width/2), y: Math.floor(this.height/2) };
	}

	centerCamera(screenWidth, screenHeight, targetX, targetY) {
		const center = this.gridToScreen(targetX, targetY);
		this.cameraX = screenWidth / 2 - center.x;
		this.cameraY = screenHeight / 2 - center.y;
	}

	followCamera(screenWidth, screenHeight, targetX, targetY, dt) {
		const center = this.gridToScreen(targetX, targetY);
		const targetCamX = screenWidth / 2 - center.x;
		const targetCamY = screenHeight / 2 - center.y;
		const lerp = 0.1;
		this.cameraX += (targetCamX - this.cameraX) * lerp;
		this.cameraY += (targetCamY - this.cameraY) * lerp;
	}

	update(dt) {
		this.animTimer += dt;
		this.starOffset += dt * 0.01;
	}

	drawStars(ctx, screenWidth, screenHeight) {
		ctx.save();
		const gradient = ctx.createLinearGradient(0, 0, 0, screenHeight);
		gradient.addColorStop(0, '#0a0e27');
		gradient.addColorStop(0.5, '#0f1535');
		gradient.addColorStop(1, '#1a1f4b');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, screenWidth, screenHeight);

		this.stars.forEach(star => {
			const twinkle = Math.sin(this.starOffset * star.twinkleSpeed * 100) * 0.3 + 0.7;
			const alpha = star.opacity * twinkle;
			const parallaxX = (this.cameraX * 0.05 + star.x) % screenWidth;
			const parallaxY = (this.cameraY * 0.05 + star.y) % screenHeight;
			const sx = parallaxX < 0 ? parallaxX + screenWidth : parallaxX;
			const sy = parallaxY < 0 ? parallaxY + screenHeight : parallaxY;
			ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
			ctx.fillRect(sx, sy, star.size, star.size);
		});
		ctx.restore();
	}

	draw(ctx, screenWidth, screenHeight) {
		this.drawStars(ctx, screenWidth, screenHeight);

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

		const tilesToDraw = [];
		for (let y = minY; y <= maxY; y++) {
			for (let x = minX; x <= maxX; x++) {
				if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
				tilesToDraw.push({ x, y, tile: this.tiles[y][x] });
			}
		}
		tilesToDraw.sort((a, b) => (a.x + a.y) - (b.x + b.y));
		tilesToDraw.forEach(({ x, y, tile }) => {
			const pos = this.gridToScreen(x, y);
			this.drawTile(ctx, pos.x, pos.y, tile);
		});
	}

	drawTile(ctx, x, y, tile) {
		const w = this.tileSize * this.zoom;
		const h = w * 0.5;
		const cx = x + w / 2;
		const cy = y + h / 2;
		const hw = w / 2;
		const hh = h / 2;
		const points = [
			{ x: cx, y: cy - hh },
			{ x: cx + hw, y: cy },
			{ x: cx, y: cy + hh },
			{ x: cx - hw, y: cy }
		];

		let fillColor, strokeColor;
		switch(tile.type) {
			case TILE_TYPES.FLOOR:
				fillColor = (tile.x + tile.y) % 2 === 0 ? 'rgba(20, 30, 50, 0.7)' : 'rgba(25, 35, 60, 0.7)';
				strokeColor = '#2a3f5f';
				break;
			case TILE_TYPES.ROAD:
				fillColor = 'rgba(45, 55, 72, 0.85)';
				strokeColor = '#4a5568';
				break;
			case TILE_TYPES.BUILDING:
				fillColor = 'rgba(30, 41, 59, 0.9)';
				strokeColor = '#64748b';
				break;
			case TILE_TYPES.WATER:
				fillColor = 'rgba(15, 40, 80, 0.85)';
				strokeColor = '#1e40af';
				break;
			case TILE_TYPES.ZONE_EDGE:
				fillColor = 'rgba(79, 195, 247, 0.15)';
				strokeColor = '#4fc3f7';
				break;
			case TILE_TYPES.BORDER:
				fillColor = 'rgba(10, 14, 39, 0.9)';
				strokeColor = '#1a2a4a';
				break;
			default:
				fillColor = 'rgba(20, 30, 50, 0.7)';
				strokeColor = '#2a3f5f';
		}

		ctx.beginPath();
		ctx.moveTo(points[0].x, points[0].y);
		for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
		ctx.closePath();

		ctx.fillStyle = fillColor;
		ctx.fill();
		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = Math.max(0.5, this.zoom);
		ctx.stroke();

		if (tile.type === TILE_TYPES.BUILDING) {
			const s = Math.max(1, this.zoom);
			const elev = hh * 0.5;
			const topPoints = points.map(p => ({ x: p.x, y: p.y - elev }));

			ctx.fillStyle = 'rgba(100, 116, 139, 0.8)';
			ctx.beginPath();
			ctx.moveTo(points[1].x, points[1].y);
			ctx.lineTo(points[2].x, points[2].y);
			ctx.lineTo(topPoints[2].x, topPoints[2].y);
			ctx.lineTo(topPoints[1].x, topPoints[1].y);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = 'rgba(71, 85, 105, 0.8)';
			ctx.beginPath();
			ctx.moveTo(points[2].x, points[2].y);
			ctx.lineTo(points[3].x, points[3].y);
			ctx.lineTo(topPoints[3].x, topPoints[3].y);
			ctx.lineTo(topPoints[2].x, topPoints[2].y);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
			ctx.beginPath();
			ctx.moveTo(topPoints[0].x, topPoints[0].y);
			for (let i = 1; i < topPoints.length; i++) ctx.lineTo(topPoints[i].x, topPoints[i].y);
			ctx.closePath();
			ctx.fill();
		}

		if (tile.type === TILE_TYPES.WATER) {
			const s = Math.max(1, this.zoom);
			ctx.fillStyle = 'rgba(96, 165, 250, 0.4)';
			ctx.fillRect(cx - 3*s, cy - 1*s, 6*s, 2*s);
		}

		if (tile.type === TILE_TYPES.ZONE_EDGE) {
			const s = Math.max(1, this.zoom);
			ctx.fillStyle = 'rgba(79, 195, 247, 0.5)';
			ctx.beginPath();
			ctx.arc(cx, cy, 2*s, 0, Math.PI*2);
			ctx.fill();
		}
	}
}

// ==================== 湛江游戏主类 ====================
class ZhanjiangGame {
	constructor(canvasId) {
		this.canvas = document.getElementById(canvasId);
		this.ctx = this.canvas.getContext('2d');
		this.ctx.imageSmoothingEnabled = false;

		this.currentZone = { x: 1, y: 1 };
		this.zones = new Map();

		this.tileSize = ZONE_CONFIG.tileSize;
		this.zoneWidth = ZONE_CONFIG.zoneWidth;
		this.zoneHeight = ZONE_CONFIG.zoneHeight;

		this.initAllZones();
		this.map = this.getCurrentZoneMap();

		this.pathFinder = new PathFinder(this.zoneWidth, this.zoneHeight);
		this.syncPathfinderObstacles();

		this.characters = new Map();
		this.player = null;

		this.lastTime = 0;
		this.isRunning = false;
		this.statusText = '就绪';

		this.isTransitioning = false;
		this.transitionAlpha = 0;
		this.transitionTargetZone = null;
		this.transitionPlayerPos = null;
		this.transitionDir = null;
		this.transitionPhase = 'none';

		this.cameraTarget = null;

		this.isDragging = false;
		this.dragStartX = 0;
		this.dragStartY = 0;
		this.cameraStartX = 0;
		this.cameraStartY = 0;
		this.clickStartTime = 0;
		this.clickStartX = 0;
		this.clickStartY = 0;

		this.resize();
		window.addEventListener('resize', () => this.resize());
		this.bindMouseEvents();
		this.bindKeyboardEvents();
	}

	initAllZones() {
		for (let y = 0; y < ZONE_CONFIG.rows; y++) {
			for (let x = 0; x < ZONE_CONFIG.cols; x++) {
				const zone = new ZoneMap(x, y, this.zoneWidth, this.zoneHeight, this.tileSize);
				this.zones.set(`${x},${y}`, zone);
			}
		}
	}

	getCurrentZoneMap() {
		return this.zones.get(`${this.currentZone.x},${this.currentZone.y}`);
	}

	syncPathfinderObstacles() {
		this.pathFinder = new PathFinder(this.zoneWidth, this.zoneHeight);
		const map = this.getCurrentZoneMap();
		for (let y = 0; y < this.zoneHeight; y++) {
			for (let x = 0; x < this.zoneWidth; x++) {
				if (map.isObstacle(x, y)) {
					this.pathFinder.addObstacle(x, y);
				}
			}
		}
	}

	bindMouseEvents() {
		const canvas = this.canvas;

		canvas.addEventListener('mousedown', (e) => {
			if (e.button !== 0) return;
			this.isDragging = true;
			this.dragStartX = e.clientX;
			this.dragStartY = e.clientY;
			const map = this.getCurrentZoneMap();
			this.cameraStartX = map.cameraX;
			this.cameraStartY = map.cameraY;
			this.clickStartTime = Date.now();
			this.clickStartX = e.clientX;
			this.clickStartY = e.clientY;
			canvas.style.cursor = 'grabbing';
		});

		window.addEventListener('mousemove', (e) => {
			if (!this.isDragging) return;
			const dx = e.clientX - this.dragStartX;
			const dy = e.clientY - this.dragStartY;
			const map = this.getCurrentZoneMap();
			map.cameraX = this.cameraStartX + dx;
			map.cameraY = this.cameraStartY + dy;
			this.cameraTarget = null;
		});

		window.addEventListener('mouseup', (e) => {
			if (!this.isDragging) return;
			this.isDragging = false;
			canvas.style.cursor = 'grab';

			const clickDuration = Date.now() - this.clickStartTime;
			const clickDx = Math.abs(e.clientX - this.clickStartX);
			const clickDy = Math.abs(e.clientY - this.clickStartY);

			if (clickDuration < 200 && clickDx < 5 && clickDy < 5) {
				this.handleClick(e);
			}
		});

		canvas.addEventListener('wheel', (e) => {
			e.preventDefault();
			const map = this.getCurrentZoneMap();
			const zoomSpeed = 0.1;
			const minZoom = 0.5;
			const maxZoom = 3;

			const rect = canvas.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;

			const gridBefore = map.screenToGrid(mouseX, mouseY);
			const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
			const newZoom = Math.max(minZoom, Math.min(maxZoom, map.zoom + delta));

			if (newZoom !== map.zoom) {
				map.zoom = newZoom;
				const screenAfter = map.gridToScreen(gridBefore.x, gridBefore.y);
				map.cameraX += mouseX - screenAfter.x;
				map.cameraY += mouseY - screenAfter.y;
				this.cameraTarget = null;
			}
		}, { passive: false });

		canvas.style.cursor = 'grab';
	}

	bindKeyboardEvents() {
		window.addEventListener('keydown', (e) => {
			if (!this.player || this.isTransitioning) return;

			let dx = 0, dy = 0;
			switch(e.key) {
				case 'ArrowUp': case 'w': case 'W':    dy = -1; break;
				case 'ArrowDown': case 's': case 'S':  dy = 1;  break;
				case 'ArrowLeft': case 'a': case 'A':  dx = -1; break;
				case 'ArrowRight': case 'd': case 'D': dx = 1;  break;
				default: return;
			}

			e.preventDefault();
			this.movePlayerByDirection(dx, dy);
		});
	}

	movePlayerByDirection(dx, dy) {
		if (!this.player || this.player.isMoving || this.isTransitioning) return;

		const tx = this.player.gridX + dx;
		const ty = this.player.gridY + dy;

		if (tx >= 0 && tx < this.zoneWidth && ty >= 0 && ty < this.zoneHeight) {
			if (this.pathFinder.isWalkable(tx, ty)) {
				let occupied = false;
				this.characters.forEach(char => {
					if (char.id !== 'player' && !char.isMoving && char.gridX === tx && char.gridY === ty) {
						occupied = true;
					}
				});
				if (!occupied) {
					this.player.moveTo(tx, ty);
					this.setStatus('移动中...');
				}
			}
		}
	}

	resize() {
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.ctx.imageSmoothingEnabled = false;
	}

	createPlayer(name, config = {}) {
		const map = this.getCurrentZoneMap();
		// 优先尝试地图中心，若被占则找最近空地
		const cx = Math.floor(this.zoneWidth / 2);
		const cy = Math.floor(this.zoneHeight / 2);
		let pos;
		if (!map.isObstacle(cx, cy)) {
			pos = { x: cx, y: cy };
		} else {
			pos = this.pathFinder.findNearestEmpty(cx, cy, 5) || map.getRandomEmptyPosition();
		}
		this.player = new Character('player', name, pos.x, pos.y, {
			...config,
			isAI: false,
			moveSpeed: 250
		});
		this.characters.set('player', this.player);
		this.cameraTarget = this.player;
		this.updatePlayerAvatar();
		return this.player;
	}

	createAI(name, config = {}) {
		const map = this.getCurrentZoneMap();
		const pos = map.getRandomEmptyPosition();
		const id = Utils.uuid();
		const ai = new Character(id, name, pos.x, pos.y, {
			...config,
			isAI: true,
			moveSpeed: Utils.randomInt(600, 1000)
		});
		this.characters.set(id, ai);
		return ai;
	}

	initAICrowd(count = 12) {
		for (let i = 0; i < count; i++) {
			const name = Utils.randomName() + Utils.randomInt(1, 99);
			this.createAI(name, {
				personality: Utils.randomChoice(['friendly', 'shy', 'talkative', 'calm'])
			});
		}
	}

	updatePathfinderOccupied(excludeChar = null) {
		const positions = [];
		this.characters.forEach(char => {
			if (excludeChar && char.id === excludeChar.id) return;
			if (!char.isMoving) {
				positions.push({ x: char.gridX, y: char.gridY });
			}
		});
		this.pathFinder.setOccupied(positions);
	}

	handleClick(e) {
		if (!this.player || this.isTransitioning) return;
		const map = this.getCurrentZoneMap();
		const rect = this.canvas.getBoundingClientRect();
		const screenX = e.clientX - rect.left;
		const screenY = e.clientY - rect.top;
		const gridPos = map.screenToGrid(screenX, screenY);

		if (gridPos.x >= 0 && gridPos.x < this.zoneWidth &&
			gridPos.y >= 0 && gridPos.y < this.zoneHeight) {
			this.movePlayerTo(gridPos.x, gridPos.y);
		}
	}

	movePlayerTo(x, y) {
		if (!this.player || this.isTransitioning) return;
		this.updatePathfinderOccupied();
		const path = this.pathFinder.findPath(
			{ x: this.player.gridX, y: this.player.gridY },
			{ x, y }
		);

		if (path.length > 0) {
			this.player.setPath(path);
			this.setStatus('正在移动...');
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

	checkZoneTransition() {
		if (!this.player || this.isTransitioning) return;

		const px = this.player.gridX;
		const py = this.player.gridY;
		let newZoneX = this.currentZone.x;
		let newZoneY = this.currentZone.y;
		let newPlayerX = px;
		let newPlayerY = py;
		let dir = null;

		if (px <= 0 && this.currentZone.x > 0) {
			newZoneX = this.currentZone.x - 1;
			newPlayerX = this.zoneWidth - 2;
			dir = 'left';
		} else if (px >= this.zoneWidth - 1 && this.currentZone.x < ZONE_CONFIG.cols - 1) {
			newZoneX = this.currentZone.x + 1;
			newPlayerX = 1;
			dir = 'right';
		} else if (py <= 0 && this.currentZone.y > 0) {
			newZoneY = this.currentZone.y - 1;
			newPlayerY = this.zoneHeight - 2;
			dir = 'up';
		} else if (py >= this.zoneHeight - 1 && this.currentZone.y < ZONE_CONFIG.rows - 1) {
			newZoneY = this.currentZone.y + 1;
			newPlayerY = 1;
			dir = 'down';
		}

		if (dir && (newZoneX !== this.currentZone.x || newZoneY !== this.currentZone.y)) {
			this.startZoneTransition(newZoneX, newZoneY, newPlayerX, newPlayerY, dir);
		}
	}

	startZoneTransition(zx, zy, px, py, dir) {
		this.isTransitioning = true;
		this.transitionTargetZone = { x: zx, y: zy };
		this.transitionPlayerPos = { x: px, y: py };
		this.transitionDir = dir;
		this.transitionPhase = 'out';
		this.transitionAlpha = 0;
		this.setStatus(`正在前往 ${ZONE_NAMES[zy][zx]}...`);
	}

	updateTransition(dt) {
		if (!this.isTransitioning) return;
		const speed = 0.08;

		if (this.transitionPhase === 'out') {
			this.transitionAlpha += speed;
			if (this.transitionAlpha >= 1) {
				this.transitionAlpha = 1;
				this.currentZone = { ...this.transitionTargetZone };
				this.map = this.getCurrentZoneMap();

				this.player.gridX = this.transitionPlayerPos.x;
				this.player.gridY = this.transitionPlayerPos.y;
				this.player.renderX = this.player.gridX;
				this.player.renderY = this.player.gridY;
				this.player.path = [];
				this.player.isMoving = false;

				this.syncPathfinderObstacles();
				this.map.centerCamera(this.canvas.width, this.canvas.height, this.player.gridX, this.player.gridY);
				this.cameraTarget = this.player;

				this.clearZoneAIs();
				this.spawnZoneAIs();
				this.transitionPhase = 'in';
			}
		} else if (this.transitionPhase === 'in') {
			this.transitionAlpha -= speed;
			if (this.transitionAlpha <= 0) {
				this.transitionAlpha = 0;
				this.isTransitioning = false;
				this.transitionPhase = 'none';
				this.setStatus(`已到达 ${ZONE_NAMES[this.currentZone.y][this.currentZone.x]}`);
				setTimeout(() => this.setStatus('就绪'), 2000);
			}
		}
	}

	clearZoneAIs() {
		const toRemove = [];
		this.characters.forEach((char, id) => {
			if (id !== 'player') toRemove.push(id);
		});
		toRemove.forEach(id => this.characters.delete(id));
	}

	spawnZoneAIs() {
		const count = Utils.randomInt(8, 14);
		for (let i = 0; i < count; i++) {
			const name = Utils.randomName() + Utils.randomInt(1, 99);
			this.createAI(name, {
				personality: Utils.randomChoice(['friendly', 'shy', 'talkative', 'calm'])
			});
		}
	}

	executeCommand(command) {
		if (!this.player || this.isTransitioning) return;
		const cmd = command.toLowerCase().trim();

		if (cmd.includes('打招呼') || cmd.includes('挥手')) {
			this.player.wave();
			this.player.say('你好！');
			this.setStatus('正在打招呼');
		} else if (cmd.includes('随机') || cmd.includes('走走')) {
			this.player.setRandomTarget(this);
			this.setStatus('随机探索中...');
		} else if (cmd.includes('找') || cmd.includes('去') || cmd.includes('聊天')) {
			let target = null;
			let minDist = Infinity;
			this.characters.forEach(char => {
				if (char.id !== 'player') {
					const dist = Utils.gridDistance(this.player.gridX, this.player.gridY, char.gridX, char.gridY);
					if (dist < minDist) {
						minDist = dist;
						target = char;
					}
				}
			});
			if (target) {
				const neighbors = [
					{x: target.gridX+1, y: target.gridY},
					{x: target.gridX-1, y: target.gridY},
					{x: target.gridX, y: target.gridY+1},
					{x: target.gridX, y: target.gridY-1}
				];
				let best = null, bestDist = Infinity;
				for (const n of neighbors) {
					if (this.pathFinder.isWalkable(n.x, n.y)) {
						const d = Utils.gridDistance(this.player.gridX, this.player.gridY, n.x, n.y);
						if (d < bestDist) { bestDist = d; best = n; }
					}
				}
				if (best) {
					this.movePlayerTo(best.x, best.y);
					const check = setInterval(() => {
						if (!this.player.isMoving && this.player.path.length === 0) {
							clearInterval(check);
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
			this.player.setRandomTarget(this);
			this.player.say(command);
			this.setStatus('执行中...');
		}
	}

	getDirectionTo(from, to) {
		const dx = to.gridX - from.gridX;
		const dy = to.gridY - from.gridY;
		if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
		return dy > 0 ? 'down' : 'up';
	}

	setStatus(text) {
		this.statusText = text;
		const el = document.getElementById('statusText');
		if (el) el.textContent = text;
	}

	updatePlayerAvatar() {
		const avatarCanvas = document.getElementById('playerAvatar');
		if (!avatarCanvas || !this.player) return;
		const ctx = avatarCanvas.getContext('2d');
		ctx.clearRect(0, 0, 32, 32);
		ctx.drawImage(this.player.pixelCanvas, 0, 0, 32, 32);
	}

	start() {
		this.isRunning = true;
		this.lastTime = Date.now();
		this.loop();
	}

	loop() {
		if (!this.isRunning) return;
		const now = Date.now();
		const dt = now - this.lastTime;
		this.lastTime = now;

		this.update(dt);
		this.draw();
		requestAnimationFrame(() => this.loop());
	}

	update(dt) {
		if (this.isTransitioning) {
			this.updateTransition(dt);
			return;
		}

		const map = this.getCurrentZoneMap();
		map.update(dt);

		this.updatePathfinderOccupied();
		this.characters.forEach(char => char.update(dt, this));

		this.checkZoneTransition();

		if (this.cameraTarget && !this.isDragging) {
			map.followCamera(this.canvas.width, this.canvas.height, this.cameraTarget.renderX, this.cameraTarget.renderY, dt);
		}
	}

	draw() {
		const ctx = this.ctx;
		const w = this.canvas.width;
		const h = this.canvas.height;

		ctx.clearRect(0, 0, w, h);

		const map = this.getCurrentZoneMap();
		map.draw(ctx, w, h);

		const tileW = this.tileSize * map.zoom;
		const tileH = tileW * 0.5;

		const charList = Array.from(this.characters.values());
		charList.sort((a, b) => (a.renderX + a.renderY) - (b.renderX + b.renderY));

		charList.forEach(char => {
			const pos = map.gridToScreen(char.renderX, char.renderY);
			char.draw(ctx, pos.x, pos.y, tileW, tileH, map.zoom);
		});

		ctx.font = `${Math.max(10, 14 * map.zoom)}px 'Press Start 2P', monospace`;
		ctx.textAlign = 'center';
		const zoneName = ZONE_NAMES[this.currentZone.y][this.currentZone.x];
		ctx.fillStyle = 'rgba(79, 195, 247, 0.9)';
		ctx.shadowColor = '#0a0e27';
		ctx.shadowBlur = 4;
		ctx.fillText(zoneName, w / 2, 40);
		ctx.shadowBlur = 0;

		this.drawMinimap(ctx, w, h);

		if (this.isTransitioning && this.transitionAlpha > 0) {
			ctx.fillStyle = `rgba(0, 0, 0, ${this.transitionAlpha})`;
			ctx.fillRect(0, 0, w, h);
		}
	}

	drawMinimap(ctx, screenW, screenH) {
		const size = 80;
		const padding = 10;
		const x = screenW - size - padding;
		const y = padding;
		const cellW = size / ZONE_CONFIG.cols;
		const cellH = size / ZONE_CONFIG.rows;

		ctx.fillStyle = 'rgba(10, 14, 39, 0.8)';
		ctx.strokeStyle = 'rgba(79, 195, 247, 0.4)';
		ctx.lineWidth = 1;
		ctx.fillRect(x, y, size, size);
		ctx.strokeRect(x, y, size, size);

		for (let ry = 0; ry < ZONE_CONFIG.rows; ry++) {
			for (let rx = 0; rx < ZONE_CONFIG.cols; rx++) {
				const cx = x + rx * cellW;
				const cy = y + ry * cellH;
				if (rx === this.currentZone.x && ry === this.currentZone.y) {
					ctx.fillStyle = 'rgba(79, 195, 247, 0.8)';
				} else {
					ctx.fillStyle = 'rgba(79, 195, 247, 0.2)';
				}
				ctx.fillRect(cx + 1, cy + 1, cellW - 2, cellH - 2);
			}
		}
	}
}

// ==================== 高德地图数据加载（可选增强） ====================
function initAmapData() {
	if (typeof AMap === 'undefined') {
		console.warn('高德JS API未加载，使用程序生成地图');
		return;
	}

	AMap.plugin(['AMap.DistrictSearch', 'AMap.PlaceSearch'], () => {
		const districtSearch = new AMap.DistrictSearch({
			subdistrict: 0,
			extensions: 'all',
			level: 'district'
		});

		districtSearch.search('赤坎区', (status, result) => {
			if (status === 'complete' && result.districtList && result.districtList.length > 0) {
				console.log('赤坎区边界数据已获取', result.districtList[0].boundaries);
			}
		});

		const placeSearch = new AMap.PlaceSearch({
			type: '道路',
			pageSize: 50,
			city: '湛江'
		});
		placeSearch.searchNearBy('', [110.365, 21.266], 5000, (status, result) => {
			if (status === 'complete') {
				console.log('道路POI', result.poiList);
			}
		});
	});
}
