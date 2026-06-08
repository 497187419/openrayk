/**
 * 入口文件
 * 像素风虚拟空间 - 初始化与事件绑定
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
    // 初始化游戏
    const game = new Game('gameCanvas');
    
    // 启动游戏
    game.start();
    
    // 绑定UI事件
    bindUIEvents(game);
    
    // 窗口大小改变时重新调整
    window.addEventListener('resize', () => {
        game.resize();
    });
});

/**
 * 绑定UI事件
 */
function bindUIEvents(game) {
    const commandInput = document.getElementById('commandInput');
    const sendBtn = document.getElementById('sendBtn');
    const actionBtns = document.querySelectorAll('.action-btn');
    const statusText = document.getElementById('statusText');
    
    /**
     * 发送指令
     */
    function sendCommand() {
        const command = commandInput.value.trim();
        if (!command) return;
        
        // 更新状态
        statusText.textContent = '执行: ' + command;
        
        // 执行游戏指令
        game.executeCommand(command);
        
        // 清空输入框
        commandInput.value = '';
    }
    
    // 发送按钮点击
    sendBtn.addEventListener('click', sendCommand);
    
    // 输入框回车发送
    commandInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendCommand();
        }
    });
    
    // 快捷按钮
    actionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            
            switch(action) {
                case 'greet':
                    commandInput.value = '打招呼';
                    sendCommand();
                    break;
                case 'random':
                    commandInput.value = '随机走走';
                    sendCommand();
                    break;
                case 'chat':
                    commandInput.value = '找最近的人聊天';
                    sendCommand();
                    break;
                case 'stop':
                    commandInput.value = '停止';
                    sendCommand();
                    break;
            }
        });
    });
    
    // 触摸设备优化
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
        
        // 防止双击缩放
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }
    
    // 防止页面滚动（游戏需要全屏）
    document.addEventListener('touchmove', (e) => {
        if (e.target === game.canvas) {
            e.preventDefault();
        }
    }, { passive: false });
}
