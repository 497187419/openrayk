/**
 * 真实地图网格游戏
 * 基于高德地图POI数据生成可行走网格
 * 建筑POI映射为障碍物
 */

class RealMapGame {
	constructor(canvasId) {
		this.canvas = document.getElementById(canvasId);
		this.ctx = this.canvas.getContext('2d');
		this.resize();

		// 区域配置（湛江赤坎区）
		this.region = {
			minLng: 110.350878,
			maxLng: 110.356325,
			minLat: 21.266151,
			maxLat: 21.269927
		};

		// 网格配置（宽高比与真实地理区域 Mercator 投影对齐）
		this.cols = 40;
		this.rows = 30;
		this.tileSize = 28;
		this.grid = [];

		// 相机
		this.cameraX = 0;
		this.cameraY = 0;
		this.zoom = 1;

		// 高德底图
		this.amap = null;
		this.baseAmapZoom = 17;

		// 角色
		this.player = null;

		// 交互
		this.dragStart = null;
		this.dragCameraStart = null;
		this.clickStartTime = 0;
		this.clickStartPos = null;

		// 加载状态
		this.isLoading = true;
		this.loadingText = '正在连接高德地图...';
		this.loadingProgress = 0;

		// 建筑名称列表（用于显示）
		this.buildingNames = new Map(); // key: "x,y", value: name

		this.initGrid();
		this.bindEvents();
	}

	resize() {
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
	}

	initGrid() {
		this.grid = [];
		for (let y = 0; y < this.rows; y++) {
			this.grid[y] = [];
			for (let x = 0; x < this.cols; x++) {
				this.grid[y][x] = 0;
			}
		}
	}

	/**
	 * 经纬度转网格坐标
	 */
	latLngToGrid(lng, lat) {
		const rx = (lng - this.region.minLng) / (this.region.maxLng - this.region.minLng);
		const ry = (this.region.maxLat - lat) / (this.region.maxLat - this.region.minLat);
		const x = Math.floor(rx * this.cols);
		const y = Math.floor(ry * this.rows);
		return {
			x: Math.max(0, Math.min(this.cols - 1, x)),
			y: Math.max(0, Math.min(this.rows - 1, y))
		};
	}

	/**
	 * 网格坐标转经纬度
	 */
	gridToLatLng(x, y) {
		const rx = (x + 0.5) / this.cols;
		const ry = (y + 0.5) / this.rows;
		const lng = this.region.minLng + rx * (this.region.maxLng - this.region.minLng);
		const lat = this.region.maxLat - ry * (this.region.maxLat - this.region.minLat);
		return { lng, lat };
	}

	/**
	 * 加载地图数据（使用高德Web服务API JSONP，绕过JS API日志拦截）
	 */
	async loadMapData() {
		this.updateLoading('正在加载地图数据...', 10);

		const key = '9b4c09d7fd2721527b5e3a822be29d0a';
		const polygon = `${this.region.minLng},${this.region.minLat};${this.region.maxLng},${this.region.minLat};${this.region.maxLng},${this.region.maxLat};${this.region.minLng},${this.region.maxLat}`;

		try {
			const pois = await this.fetchPOIsByPolygon(key, polygon);
			this.updateLoading('正在生成网格...', 80);
			this.processPOIs(pois);
		} catch (e) {
			console.warn('POI加载失败，使用默认地图', e);
			this.generateDefaultObstacles();
		}

		this.updateLoading('地图加载完成', 100);
		setTimeout(() => {
			this.isLoading = false;
			const overlay = document.getElementById('loading-overlay');
			if (overlay) overlay.classList.add('hidden');
		}, 300);
	}

	/**
	 * 通过JSONP分页获取POI数据
	 */
	fetchPOIsByPolygon(key, polygon, page = 1, allPOIs = []) {
		return new Promise((resolve, reject) => {
			const callbackName = 'amap_poi_cb_' + Date.now() + '_' + page;
			const url = `https://restapi.amap.com/v3/place/polygon?polygon=${encodeURIComponent(polygon)}&key=${key}&types=120000|170000|130000|140000&offset=50&page=${page}&extensions=all&output=JSON&callback=${callbackName}`;

			const script = document.createElement('script');
			script.src = url;

			window[callbackName] = (data) => {
				delete window[callbackName];
				if (script.parentNode) script.parentNode.removeChild(script);

				if (data && data.status === '1' && data.pois) {
					allPOIs = allPOIs.concat(data.pois);
					const total = parseInt(data.count) || 0;
					this.updateLoading(`已获取 ${allPOIs.length} / ${total} 个POI...`, 30 + (page * 10));
					if (allPOIs.length < total && page < 5) {
						setTimeout(() => {
							this.fetchPOIsByPolygon(key, polygon, page + 1, allPOIs).then(resolve).catch(reject);
						}, 300);
					} else {
						resolve(allPOIs);
					}
				} else {
					resolve(allPOIs);
				}
			};

			script.onerror = () => {
				delete window[callbackName];
				if (script.parentNode) script.parentNode.removeChild(script);
				reject(new Error('Script load error'));
			};

			document.head.appendChild(script);

			setTimeout(() => {
				if (window[callbackName]) {
					delete window[callbackName];
					if (script.parentNode) script.parentNode.removeChild(script);
					resolve(allPOIs);
				}
			}, 10000);
		});
	}

	/**
	 * 处理POI数据，映射为网格障碍物
	 */
	processPOIs(pois) {
		for (const poi of pois) {
			let lng = null, lat = null;

			if (poi.location) {
				if (typeof poi.location === 'string') {
					const parts = poi.location.split(',');
					if (parts.length === 2) {
						lng = parseFloat(parts[0]);
						lat = parseFloat(parts[1]);
					}
				} else if (poi.location.lng !== undefined && poi.location.lat !== undefined) {
					lng = parseFloat(poi.location.lng);
					lat = parseFloat(poi.location.lat);
				}
			}

			if (lng === null || lat === null || isNaN(lng) || isNaN(lat)) continue;

			const pos = this.latLngToGrid(lng, lat);

			// 根据POI名称推测建筑大小
			let radius = 1;
			const name = poi.name || '';
			if (name.includes('小区') || name.includes('花园') || name.includes('广场')) {
				radius = 2;
			} else if (name.includes('大厦') || name.includes('中心') || name.includes('城')) {
				radius = 2;
			}

			// 标记为障碍物
			for (let dy = -radius; dy <= radius; dy++) {
				for (let dx = -radius; dx <= radius; dx++) {
					const nx = pos.x + dx;
					const ny = pos.y + dy;
					if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
						this.grid[ny][nx] = 1;
						const key = `${nx},${ny}`;
						if (!this.buildingNames.has(key)) {
							this.buildingNames.set(key, poi.name);
						}
					}
				}
			}
		}

		// 确保中心区域可行走（出生地）
		this.ensureWalkableCenter();

		if (pois.length === 0) {
			this.generateDefaultObstacles();
		}
	}

	/**
	 * 确保中心区域可行走
	 */
	ensureWalkableCenter() {
		const cx = Math.floor(this.cols / 2);
		const cy = Math.floor(this.rows / 2);
		for (let dy = -3; dy <= 3; dy++) {
			for (let dx = -3; dx <= 3; dx++) {
				const nx = cx + dx;
				const ny = cy + dy;
				if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
					this.grid[ny][nx] = 0;
				}
			}
		}
	}

	/**
	 * 生成默认障碍物（降级方案）
	 */
	generateDefaultObstacles() {
		for (let y = 0; y < this.rows; y++) {
			for (let x = 0; x < this.cols; x++) {
				if (Math.random() < 0.12) {
					this.grid[y][x] = 1;
				}
			}
		}
		this.ensureWalkableCenter();
	}

	/**
	 * 创建玩家角色
	 */
	createPlayer() {
		const cx = Math.floor(this.cols / 2);
		const cy = Math.floor(this.rows / 2);
		this.player = new Character('player', '探索者', cx, cy, {
			clothesColor: '#4fc3f7',
			glowColor: '#4fc3f7',
			personality: 'friendly'
		});
	}

	/**
	 * 网格坐标转屏幕坐标
	 */
	gridToScreen(x, y) {
		return {
			x: x * this.tileSize * this.zoom + this.cameraX,
			y: y * this.tileSize * this.zoom + this.cameraY
		};
	}

	/**
	 * 屏幕坐标转网格坐标
	 */
	screenToGrid(screenX, screenY) {
		return {
			x: Math.floor((screenX - this.cameraX) / (this.tileSize * this.zoom)),
			y: Math.floor((screenY - this.cameraY) / (this.tileSize * this.zoom))
		};
	}

	/**
	 * 启动游戏
	 */
	start() {
		this.initAmap();
		this.loadMapData().then(() => {
			this.createPlayer();
			this.centerCamera();
			this.gameLoop();
		});
	}

	/**
	 * 初始化高德底图
	 */
	initAmap() {
		if (typeof AMap === 'undefined') return;

		// 手动计算基准 zoom，使底图宽度与网格宽度精确对齐
		// Mercator 投影：zoom=z 时，1经度 = 256 * 2^z / 360 像素
		const targetW = this.cols * this.tileSize;
		const deltaLng = this.region.maxLng - this.region.minLng;
		this.baseAmapZoom = Math.log2(targetW * 360 / (deltaLng * 256));

		this.amap = new AMap.Map('amap-container', {
			viewMode: '2D',
			center: [(this.region.minLng + this.region.maxLng) / 2, (this.region.minLat + this.region.maxLat) / 2],
			zoom: this.baseAmapZoom
		});

		this.amap.setStatus({
			dragEnable: false,
			zoomEnable: false,
			doubleClickZoom: false,
			scrollWheel: false
		});
	}

	/**
	 * 相机以小人位置居中并同步底图
	 */
	centerCamera() {
		if (this.player) {
			this.cameraX = this.canvas.width / 2 - (this.player.gridX + 0.5) * this.tileSize * this.zoom;
			this.cameraY = this.canvas.height / 2 - (this.player.gridY + 0.5) * this.tileSize * this.zoom;
		} else {
			const mapW = this.cols * this.tileSize * this.zoom;
			const mapH = this.rows * this.tileSize * this.zoom;
			this.cameraX = (this.canvas.width - mapW) / 2;
			this.cameraY = (this.canvas.height - mapH) / 2;
		}
		this.syncMapFromCanvas();
	}

	/**
	 * 相机跟随小人平滑移动
	 */
	followPlayer() {
		if (!this.player || this.dragStart) return;
		const targetX = this.canvas.width / 2 - (this.player.renderX + 0.5) * this.tileSize * this.zoom;
		const targetY = this.canvas.height / 2 - (this.player.renderY + 0.5) * this.tileSize * this.zoom;
		if (Math.abs(targetX - this.cameraX) > 0.5 || Math.abs(targetY - this.cameraY) > 0.5) {
			this.cameraX = targetX;
			this.cameraY = targetY;
			this.syncMapFromCanvas();
		}
	}

	/**
	 * 将Canvas状态同步到底图
	 */
	syncMapFromCanvas() {
		if (!this.amap) return;
		const centerGridX = (this.canvas.width / 2 - this.cameraX) / (this.tileSize * this.zoom);
		const centerGridY = (this.canvas.height / 2 - this.cameraY) / (this.tileSize * this.zoom);
		const centerLatLng = this.gridToLatLng(centerGridX, centerGridY);
		this.amap.setCenter([centerLatLng.lng, centerLatLng.lat]);
		this.amap.setZoom(this.baseAmapZoom + Math.log2(Math.max(0.5, this.zoom)));
	}

	/**
	 * 更新加载UI
	 */
	updateLoading(text, progress) {
		this.loadingText = text;
		this.loadingProgress = progress;
		const loadingText = document.getElementById('loading-text');
		const loadingBar = document.getElementById('loading-bar-inner');
		if (loadingText) loadingText.textContent = text;
		if (loadingBar) loadingBar.style.width = progress + '%';
	}

	/**
	 * 游戏主循环
	 */
	gameLoop() {
		const loop = () => {
			this.update();
			this.render();
			requestAnimationFrame(loop);
		};
		requestAnimationFrame(loop);
	}

	/**
	 * 更新逻辑
	 */
	update(dt = 16) {
		if (this.player) {
			this.player.update(dt, this);
			this.followPlayer();
		}
	}

	/**
	 * 渲染画面
	 */
	render() {
		const ctx = this.ctx;
		const w = this.canvas.width;
		const h = this.canvas.height;
		ctx.clearRect(0, 0, w, h);

		if (this.isLoading) {
			this.renderLoading(ctx, w, h);
			return;
		}

		// 绘制角色
		if (this.player) {
			const pos = this.gridToScreen(this.player.renderX, this.player.renderY);
			const tw = this.tileSize * this.zoom;
			const th = this.tileSize * this.zoom;
			this.player.draw(ctx, pos.x, pos.y, tw, th, this.zoom);
		}
	}

	/**
	 * 渲染加载画面
	 */
	renderLoading(ctx, w, h) {
		ctx.fillStyle = '#0a0e27';
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = '#4fc3f7';
		ctx.font = '14px "Press Start 2P", monospace';
		ctx.textAlign = 'center';
		ctx.fillText(this.loadingText, w / 2, h / 2 + 40);
	}

	/**
	 * 绑定事件
	 */
	bindEvents() {
		this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
		this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
		this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));

		window.addEventListener('keydown', (e) => this.onKeyDown(e));

		this.canvas.addEventListener('wheel', (e) => {
			e.preventDefault();
			const oldZoom = this.zoom;
			this.zoom *= e.deltaY > 0 ? 0.9 : 1.1;
			this.zoom = Math.max(0.5, Math.min(3, this.zoom));

			const rect = this.canvas.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;
			this.cameraX = mx - (mx - this.cameraX) * (this.zoom / oldZoom);
			this.cameraY = my - (my - this.cameraY) * (this.zoom / oldZoom);
			this.syncMapFromCanvas();
		});
	}

	onMouseDown(e) {
		const rect = this.canvas.getBoundingClientRect();
		this.dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
		this.dragCameraStart = { x: this.cameraX, y: this.cameraY };
		this.clickStartTime = Date.now();
		this.clickStartPos = { x: this.dragStart.x, y: this.dragStart.y };
	}

	onMouseMove(e) {
		if (!this.dragStart) return;
		const rect = this.canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		this.cameraX = this.dragCameraStart.x + (x - this.dragStart.x);
		this.cameraY = this.dragCameraStart.y + (y - this.dragStart.y);
		this.syncMapFromCanvas();
	}

	onMouseUp(e) {
		const rect = this.canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const dt = Date.now() - this.clickStartTime;
		const dist = Math.hypot(x - this.clickStartPos.x, y - this.clickStartPos.y);

		if (dt < 300 && dist < 5) {
			this.handleMapClick(x, y);
		}
		this.dragStart = null;
	}

	/**
	 * 处理地图点击（寻路移动）
	 */
	handleMapClick(screenX, screenY) {
		if (!this.player || this.player.isMoving) return;
		const grid = this.screenToGrid(screenX, screenY);
		if (grid.x < 0 || grid.x >= this.cols || grid.y < 0 || grid.y >= this.rows) return;
		if (this.grid[grid.y][grid.x] === 1) return;

		const pathFinder = new PathFinder(this.grid, this.cols, this.rows);
		const path = pathFinder.findPath(
			{ x: this.player.gridX, y: this.player.gridY },
			{ x: grid.x, y: grid.y }
		);

		if (path.length > 0) {
			this.player.setPath(path);
		}

		// 更新坐标显示
		this.updateCoordDisplay(grid.x, grid.y);
	}

	/**
	 * 键盘控制
	 */
	onKeyDown(e) {
		if (!this.player || this.player.isMoving) return;
		let dx = 0, dy = 0;
		switch (e.key) {
			case 'ArrowUp': case 'w': case 'W': dy = -1; break;
			case 'ArrowDown': case 's': case 'S': dy = 1; break;
			case 'ArrowLeft': case 'a': case 'A': dx = -1; break;
			case 'ArrowRight': case 'd': case 'D': dx = 1; break;
			default: return;
		}
		e.preventDefault();

		const nx = this.player.gridX + dx;
		const ny = this.player.gridY + dy;
		if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows && this.grid[ny][nx] !== 1) {
			this.player.moveTo(nx, ny);
			this.updateCoordDisplay(nx, ny);
		}
	}

	/**
	 * 更新坐标显示UI
	 */
	updateCoordDisplay(gridX, gridY) {
		const coord = this.gridToLatLng(gridX, gridY);
		const lngEl = document.getElementById('lngText');
		const latEl = document.getElementById('latText');
		if (lngEl) lngEl.textContent = coord.lng.toFixed(6);
		if (latEl) latEl.textContent = coord.lat.toFixed(6);
	}
}
