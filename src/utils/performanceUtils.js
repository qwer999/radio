// 메모리 누수 감지 및 성능 최적화 유틸리티

export const MemoryLeakDetector = {
  // 등록된 리스너들을 추적
  listeners: new Map(),

  // 이벤트 리스너 등록 (자동 추적)
  addEventListener(element, type, handler, options) {
    const key = `${element.constructor.name}-${type}-${Date.now()}`;

    element.addEventListener(type, handler, options);

    this.listeners.set(key, {
      element,
      type,
      handler,
      timestamp: Date.now(),
    });

    return () => this.removeEventListener(key);
  },

  // 이벤트 리스너 제거
  removeEventListener(key) {
    const listener = this.listeners.get(key);
    if (listener) {
      listener.element.removeEventListener(listener.type, listener.handler);
      this.listeners.delete(key);
    }
  },

  // 등록된 모든 리스너 정리
  cleanup() {
    this.listeners.forEach((listener, key) => {
      listener.element.removeEventListener(listener.type, listener.handler);
    });
    this.listeners.clear();
  },

  // 현재 등록된 리스너 수 반환
  getListenerCount() {
    return this.listeners.size;
  },

  // 리스너 정보 반환
  getListenersInfo() {
    return Array.from(this.listeners.entries()).map(([key, listener]) => ({
      key,
      type: listener.type,
      element: listener.element.constructor.name,
      age: Date.now() - listener.timestamp,
    }));
  },
};

// 성능 측정 유틸리티
export const PerformanceUtils = {
  // 함수 실행 시간 측정
  measureFunction(fn, name) {
    return function (...args) {
      const start = performance.now();
      const result = fn.apply(this, args);
      const end = performance.now();

      if (end - start > 16) {
        // 16ms 이상이면 경고 (60fps 기준)
        console.warn(`🐌 Slow function detected: ${name} took ${(end - start).toFixed(2)}ms`);
      }

      return result;
    };
  },

  // 컴포넌트 렌더링 시간 측정
  measureRender(Component, name) {
    return function MeasuredComponent(props) {
      const start = performance.now();
      const result = Component(props);
      const end = performance.now();

      if (end - start > 16) {
        console.warn(`🐌 Slow render detected: ${name} took ${(end - start).toFixed(2)}ms`);
      }

      return result;
    };
  },

  // throttle 유틸리티
  throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;

    return function (...args) {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  },

  // debounce 유틸리티
  debounce(func, delay) {
    let timeoutId;

    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },
};

// React Hook: 성능 모니터링
export function usePerformanceMonitor(componentName) {
  const renderCount = React.useRef(0);
  const startTime = React.useRef(performance.now());

  React.useEffect(() => {
    renderCount.current++;
    const renderTime = performance.now() - startTime.current;

    if (renderTime > 16) {
      console.warn(`🐌 Component ${componentName} render #${renderCount.current} took ${renderTime.toFixed(2)}ms`);
    }

    startTime.current = performance.now();
  });

  return {
    renderCount: renderCount.current,
    componentName,
  };
}
