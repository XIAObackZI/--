// 计时器Worker

// 计时器状态
let timerState = {
    isRunning: false,
    startTime: 0,
    duration: 0,
    phaseType: 'focus', // 'focus' 或 'break'
    compensation: 0 // 时间补偿
};

// 精确计时器
let preciseInterval = null;

// 接收主线程消息
self.onmessage = function(e) {
    const { type, payload } = e.data;
    
    switch (type) {
        case 'START':
            startTimer(payload.duration, payload.phaseType);
            break;
        case 'PAUSE':
            pauseTimer();
            break;
        case 'RESUME':
            resumeTimer();
            break;
        case 'STOP':
            stopTimer();
            break;
        case 'SYNC':
            syncTime();
            break;
    }
};

// 启动计时器
function startTimer(duration, phaseType) {
    timerState = {
        isRunning: true,
        startTime: Date.now(),
        duration: duration,
        phaseType: phaseType,
        compensation: 0
    };
    
    startPreciseInterval();
}

// 暂停计时器
function pauseTimer() {
    timerState.isRunning = false;
    clearInterval(preciseInterval);
}

// 恢复计时器
function resumeTimer() {
    if (!timerState.isRunning) {
        timerState.compensation += Date.now() - timerState.startTime;
        timerState.startTime = Date.now();
        timerState.isRunning = true;
        startPreciseInterval();
    }
}

// 停止计时器
function stopTimer() {
    timerState = {
        isRunning: false,
        startTime: 0,
        duration: 0,
        phaseType: 'focus',
        compensation: 0
    };
    clearInterval(preciseInterval);
}

// 同步时间
function syncTime() {
    if (timerState.isRunning) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - timerState.startTime - timerState.compensation;
        const remainingTime = Math.max(0, timerState.duration - elapsedTime);
        
        // 发送进度更新
        self.postMessage({
            type: 'TICK',
            payload: {
                remainingTime,
                progress: 1 - (remainingTime / timerState.duration),
                phaseType: timerState.phaseType
            }
        });
        
        // 检查是否完成
        if (remainingTime <= 0) {
            self.postMessage({
                type: 'COMPLETE',
                payload: { phaseType: timerState.phaseType }
            });
            stopTimer();
        }
    }
}

// 启动精确计时器
function startPreciseInterval() {
    // 每100ms同步一次，以保持精确度
    preciseInterval = setInterval(syncTime, 100);
} 