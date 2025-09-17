import { useState, useEffect, useRef } from 'react';

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    memory: null,
    performance: null,
    renderCount: 0,
    lastUpdate: null,
    fps: 0,
    avgRenderTime: 0,
  });
  const [isVisible, setIsVisible] = useState(false);
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() });
  const renderTimesRef = useRef([]);

  useEffect(() => {
    let animationFrameId;
    let updateCount = 0;

    const calculateFPS = () => {
      const now = performance.now();
      fpsRef.current.frames++;

      if (now - fpsRef.current.lastTime >= 1000) {
        const fps = Math.round((fpsRef.current.frames * 1000) / (now - fpsRef.current.lastTime));
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = now;
        return fps;
      }
      return null;
    };

    const updateMetrics = () => {
      const startTime = performance.now();
      updateCount++;

      const fps = calculateFPS();

      const newMetrics = {
        renderCount: updateCount,
        lastUpdate: new Date().toLocaleTimeString(),
        fps: fps !== null ? fps : metrics.fps,
      };

      // 렌더링 시간 측정
      const renderTime = performance.now() - startTime;
      renderTimesRef.current.push(renderTime);
      if (renderTimesRef.current.length > 10) {
        renderTimesRef.current.shift(); // 최근 10개만 유지
      }

      newMetrics.avgRenderTime =
        renderTimesRef.current.length > 0 ? (renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length).toFixed(2) : 0;

      // 메모리 정보 (Chrome에서만 사용 가능)
      if ('memory' in performance) {
        newMetrics.memory = {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
        };
      }

      // 성능 정보
      if ('getEntriesByType' in performance) {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          newMetrics.performance = {
            domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
            loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
          };
        }
      }

      setMetrics(newMetrics);

      // 5초마다 업데이트
      setTimeout(() => {
        animationFrameId = requestAnimationFrame(updateMetrics);
      }, 5000);
    };

    if (isVisible) {
      updateMetrics();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isVisible]);

  // 키보드 단축키로 토글 (Ctrl + Shift + P)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(!isVisible);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <div className="fixed top-4 right-4 bg-gray-800 text-white opacity-60 p-2 rounded cursor-pointer text-xs" onClick={() => setIsVisible(true)}>
        Performance
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg text-xs max-w-xs z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Performance Monitor</h3>
        <button onClick={() => setIsVisible(false)} className="text-red-400 hover:text-red-300">
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <strong>Updates:</strong> {metrics.renderCount}
        </div>

        <div>
          <strong>Last Update:</strong> {metrics.lastUpdate}
        </div>

        <div>
          <strong>FPS:</strong>{' '}
          <span className={metrics.fps < 30 ? 'text-red-400' : metrics.fps < 50 ? 'text-yellow-400' : 'text-green-400'}>{metrics.fps}</span>
        </div>

        <div>
          <strong>Avg Render:</strong>{' '}
          <span className={metrics.avgRenderTime > 16 ? 'text-red-400' : 'text-green-400'}>{metrics.avgRenderTime}ms</span>
        </div>

        {metrics.memory && (
          <div>
            <strong>Memory Usage:</strong>
            <div className="ml-2">
              Used: <span className={metrics.memory.used > 100 ? 'text-yellow-400' : 'text-green-400'}>{metrics.memory.used}MB</span>
              <br />
              Total: {metrics.memory.total}MB
              <br />
              Limit: {metrics.memory.limit}MB
            </div>
          </div>
        )}

        {metrics.performance && (
          <div>
            <strong>Performance:</strong>
            <div className="ml-2">
              DOM: {metrics.performance.domContentLoaded}ms
              <br />
              Load: {metrics.performance.loadComplete}ms
            </div>
          </div>
        )}

        <div className="mt-3 text-gray-400">Press Ctrl+Shift+P to toggle</div>

        <div className="mt-4 pt-3 border-t border-gray-700">
          <button
            onClick={() => window.resetPlaylist && window.resetPlaylist()}
            className="w-full py-2 bg-red-700 hover:bg-red-600 rounded text-white font-medium transition-colors"
          >
            재생목록 리셋
          </button>
        </div>
      </div>
    </div>
  );
}
