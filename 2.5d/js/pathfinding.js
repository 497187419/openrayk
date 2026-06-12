/**
 * A*寻路算法实现
 * 像素风虚拟空间 - 网格寻路
 */

class PathFinder {
    constructor(gridWidth, gridHeight) {
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.obstacles = new Set(); // 存储 "x,y" 格式的障碍物
        this.occupied = new Set();  // 临时占用的格子（其他角色位置）
    }

    /**
     * 添加障碍物
     */
    addObstacle(x, y) {
        this.obstacles.add(`${x},${y}`);
    }

    /**
     * 移除障碍物
     */
    removeObstacle(x, y) {
        this.obstacles.delete(`${x},${y}`);
    }

    /**
     * 设置临时占用（其他角色位置）
     */
    setOccupied(positions) {
        this.occupied.clear();
        positions.forEach(pos => {
            this.occupied.add(`${pos.x},${pos.y}`);
        });
    }

    /**
     * 判断格子是否可通行
     */
    isWalkable(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
            return false;
        }
        const key = `${x},${y}`;
        return !this.obstacles.has(key) && !this.occupied.has(key);
    }

    /**
     * A*寻路核心算法
     * @param {Object} start - 起点 {x, y}
     * @param {Object} end - 终点 {x, y}
     * @returns {Array} - 路径点数组，寻路失败返回空数组
     */
    findPath(start, end) {
        // 起点或终点不可达
        if (!this.isWalkable(start.x, start.y) || !this.isWalkable(end.x, end.y)) {
            return [];
        }

        // 起点就是终点
        if (start.x === end.x && start.y === end.y) {
            return [start];
        }

        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const startKey = `${start.x},${start.y}`;
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(start, end));
        openSet.push({ x: start.x, y: start.y, f: fScore.get(startKey) });

        while (openSet.length > 0) {
            // 取出f值最小的节点
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            const currentKey = `${current.x},${current.y}`;

            // 到达终点
            if (current.x === end.x && current.y === end.y) {
                return this.reconstructPath(cameFrom, current);
            }

            closedSet.add(currentKey);

            // 检查四个方向邻居（上下左右）
            const directions = [
                { x: 1, y: 0 }, { x: -1, y: 0 },
                { x: 0, y: 1 }, { x: 0, y: -1 }
            ];

            for (const dir of directions) {
                const neighbor = { x: current.x + dir.x, y: current.y + dir.y };
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (closedSet.has(neighborKey)) continue;
                if (!this.isWalkable(neighbor.x, neighbor.y)) continue;

                const tentativeG = gScore.get(currentKey) + 1;

                if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeG);
                    fScore.set(neighborKey, tentativeG + this.heuristic(neighbor, end));

                    const existingIndex = openSet.findIndex(n => n.x === neighbor.x && n.y === neighbor.y);
                    if (existingIndex === -1) {
                        openSet.push({ x: neighbor.x, y: neighbor.y, f: fScore.get(neighborKey) });
                    } else {
                        openSet[existingIndex].f = fScore.get(neighborKey);
                    }
                }
            }
        }

        // 寻路失败
        return [];
    }

    /**
     * 启发函数（曼哈顿距离）
     */
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    /**
     * 重建路径
     */
    reconstructPath(cameFrom, current) {
        const path = [current];
        let currentKey = `${current.x},${current.y}`;

        while (cameFrom.has(currentKey)) {
            current = cameFrom.get(currentKey);
            path.unshift(current);
            currentKey = `${current.x},${current.y}`;
        }

        return path;
    }

    /**
     * 寻找最近的空格子（用于随机移动或靠近目标）
     */
    findNearestEmpty(x, y, radius = 5) {
        if (this.isWalkable(x, y)) return { x, y };

        for (let r = 1; r <= radius; r++) {
            const candidates = [];
            // 检查一圈
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    if (Math.abs(dx) + Math.abs(dy) === r) {
                        if (this.isWalkable(x + dx, y + dy)) {
                            candidates.push({ x: x + dx, y: y + dy, dist: Math.abs(dx) + Math.abs(dy) });
                        }
                    }
                }
            }
            if (candidates.length > 0) {
                candidates.sort((a, b) => a.dist - b.dist);
                return candidates[0];
            }
        }
        return null;
    }
}
