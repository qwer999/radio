// 성능 모니터링 컴포넌트
import React, { useState, useEffect } from 'react';
import { measureRenderTime, calculateFPS, getMemoryUsage } from '../../utils/performanceUtils';

/**
 * 애플리케이션 성능을 모니터링하고 표시하는 컴포넌트
 */
function PerformanceMonitor({ enabled = false }) {
  const [fps, setFps] = useState(0);
  const [memory, setMemory] = useState(null);
  const [renderTime, setRenderTime] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let frameId;
    let lastFrameTime = performance.now();

    // FPS 측정 함수
    const measureFPS = () => {
      const now = performance.now();
      const delta = now - lastFrameTime;
      lastFrameTime = now;

      // FPS 계산 및 업데이트
      setFps(calculateFPS(delta));

      // 메모리 사용량 업데이트 (가능한 경우)
      setMemory(getMemoryUsage());

      frameId = requestAnimationFrame(measureFPS);
    };

    // 렌더 시간 측정
    const startRenderMeasurement = () => {
      const time = measureRenderTime();
      setRenderTime(time);

      // 주기적으로 렌더 시간 측정
      setTimeout(startRenderMeasurement, 2000);
    };

    frameId = requestAnimationFrame(measureFPS);
    startRenderMeasurement();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-0 right-0 bg-black bg-opacity-75 text-white p-2 text-xs z-50 font-mono">
      <div>FPS: {fps.toFixed(1)}</div>
      <div>렌더 시간: {renderTime.toFixed(2)}ms</div>
      {memory && <div>메모리: {memory}MB</div>}
    </div>
  );
}

export default PerformanceMonitor;
