/**
 * 工具函数集合
 * 像素风虚拟空间
 */

const Utils = {
    /**
     * 生成指定范围的随机整数
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * 从数组中随机取一个元素
     */
    randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    /**
     * 随机颜色生成（像素风配色）
     */
    randomColor() {
        const colors = [
            '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
            '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
            '#d35400', '#c0392b', '#2980b9', '#27ae60',
            '#8e44ad', '#16a085', '#f1c40f', '#e91e63'
        ];
        return this.randomChoice(colors);
    },

    /**
     * 肤色库
     */
    randomSkinColor() {
        const skins = ['#ffdbac', '#f1c27d', '#e0ac69', '#8d5524', '#c68642'];
        return this.randomChoice(skins);
    },

    /**
     * 发色库
     */
    randomHairColor() {
        const hairs = ['#2c3e50', '#8e44ad', '#d35400', '#f1c40f', '#95a5a6', '#2ecc71'];
        return this.randomChoice(hairs);
    },

    /**
     * 像素风名字生成
     */
    randomName() {
        const names = ['小星', '阿杰', '米米', '豆豆', '乐乐', '可可', '皮皮', '球球',
                       '悠悠', '团团', '圆圆', '点点', '花花', '草草', '树树', '石石',
                       '火火', '水水', '风风', '雷雷', '光光', '暗暗', '金金', '木木'];
        return this.randomChoice(names);
    },

    /**
     * 简单的像素画绘制辅助
     * 在canvas上绘制像素点
     */
    drawPixel(ctx, x, y, color, size = 1) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
    },

    /**
     * 绘制矩形（像素对齐）
     */
    drawRect(ctx, x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    },

    /**
     * 绘制带边框的矩形
     */
    drawBorderRect(ctx, x, y, w, h, fillColor, borderColor, borderWidth = 1) {
        ctx.fillStyle = fillColor;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
        if (borderColor) {
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderWidth;
            ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, Math.floor(w) - 1, Math.floor(h) - 1);
        }
    },

    /**
     * 等轴测投影转换 (2.5D视角)
     * 将网格坐标转换为屏幕坐标
     * @param {number} gridX - 网格X坐标
     * @param {number} gridY - 网格Y坐标
     * @param {number} tileW - 格子宽度
     * @param {number} tileH - 格子高度（等轴测高度，通常是宽度的一半）
     * @param {number} offsetX - 屏幕偏移X
     * @param {number} offsetY - 屏幕偏移Y
     */
    isoToScreen(gridX, gridY, tileW, tileH, offsetX, offsetY) {
        const screenX = (gridX - gridY) * (tileW / 2) + offsetX;
        const screenY = (gridX + gridY) * (tileH / 2) + offsetY;
        return { x: screenX, y: screenY };
    },

    /**
     * 屏幕坐标转网格坐标（逆向等轴测）
     */
    screenToIso(screenX, screenY, tileW, tileH, offsetX, offsetY) {
        const x = screenX - offsetX;
        const y = screenY - offsetY;
        const gridX = Math.floor((x / (tileW / 2) + y / (tileH / 2)) / 2);
        const gridY = Math.floor((y / (tileH / 2) - x / (tileW / 2)) / 2);
        return { x: gridX, y: gridY };
    },

    /**
     * 两点间距离（网格距离）
     */
    gridDistance(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    },

    /**
     * 延迟函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 防抖函数
     */
    debounce(fn, delay) {
        let timer = null;
        return function(...args) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    /**
     * 生成UUID
     */
    uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * 像素字体绘制（带阴影）
     */
    drawPixelText(ctx, text, x, y, color = '#fff', size = 10, align = 'left') {
        ctx.font = `${size}px 'Press Start 2P', monospace`;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        
        // 文字阴影
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillText(text, x + 1, y + 1);
        
        // 主文字
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    },

    /**
     * 绘制像素气泡（支持缩放）
     */
    drawSpeechBubble(ctx, x, y, text, maxWidth = 120, zoom = 1) {
        const fontSize = Math.max(8, 10 * zoom);
        ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
        const metrics = ctx.measureText(text);
        const textWidth = Math.min(metrics.width, maxWidth * zoom);
        const padding = 8 * zoom;
        const bubbleWidth = textWidth + padding * 2;
        const bubbleHeight = 24 * zoom;
        
        // 气泡背景
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillRect(x - bubbleWidth/2, y - bubbleHeight - 8 * zoom, bubbleWidth, bubbleHeight);
        
        // 气泡边框（像素风格）
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = Math.max(1, 2 * zoom);
        ctx.strokeRect(x - bubbleWidth/2, y - bubbleHeight - 8 * zoom, bubbleWidth, bubbleHeight);
        
        // 小三角
        ctx.beginPath();
        ctx.moveTo(x - 6 * zoom, y - 8 * zoom);
        ctx.lineTo(x, y - 2 * zoom);
        ctx.lineTo(x + 6 * zoom, y - 8 * zoom);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // 文字
        ctx.fillStyle = '#1a1a2e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y - bubbleHeight/2 - 8 * zoom);
    }
};
