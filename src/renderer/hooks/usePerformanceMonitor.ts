import { useEffect, useRef, useState } from 'react';

export interface PerformanceMetrics {
  renderTime: number;
  searchTime: number;
  memoryUsage: number;
  componentRenders: number;
  lastUpdate: number;
}

export interface PerformanceConfig {
  enableLogging: boolean;
  sampleRate: number; // 0-1, percentage of renders to measure
  memoryCheckInterval: number; // milliseconds
}

export function usePerformanceMonitor(
  componentName: string,
  config: Partial<PerformanceConfig> = {}
) {
  const finalConfig: PerformanceConfig = {
    enableLogging: process.env.NODE_ENV === 'development',
    sampleRate: 0.1, // 10% of renders
    memoryCheckInterval: 5000, // 5 seconds
    ...config,
  };

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    searchTime: 0,
    memoryUsage: 0,
    componentRenders: 0,
    lastUpdate: Date.now(),
  });

  const renderStartTime = useRef<number>(0);
  const searchStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const lastMemoryCheck = useRef<number>(0);

  // Start render timing
  const startRenderTiming = () => {
    if (Math.random() > finalConfig.sampleRate) return;
    renderStartTime.current = performance.now();
  };

  // End render timing
  const endRenderTiming = () => {
    if (renderStartTime.current === 0) return;
    
    const renderTime = performance.now() - renderStartTime.current;
    renderCount.current += 1;
    
    setMetrics(prev => ({
      ...prev,
      renderTime,
      componentRenders: renderCount.current,
      lastUpdate: Date.now(),
    }));

    if (finalConfig.enableLogging && renderTime > 16) { // > 1 frame at 60fps
      console.warn(`Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }

    renderStartTime.current = 0;
  };

  // Start search timing
  const startSearchTiming = () => {
    searchStartTime.current = performance.now();
  };

  // End search timing
  const endSearchTiming = () => {
    if (searchStartTime.current === 0) return;
    
    const searchTime = performance.now() - searchStartTime.current;
    
    setMetrics(prev => ({
      ...prev,
      searchTime,
      lastUpdate: Date.now(),
    }));

    if (finalConfig.enableLogging) {
      console.log(`Search completed in ${componentName}: ${searchTime.toFixed(2)}ms`);
    }

    searchStartTime.current = 0;
  };

  // Memory monitoring
  useEffect(() => {
    const checkMemory = () => {
      const now = Date.now();
      if (now - lastMemoryCheck.current < finalConfig.memoryCheckInterval) {
        return;
      }

      lastMemoryCheck.current = now;

      // Use performance.memory if available (Chrome/Electron)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB

        setMetrics(prev => ({
          ...prev,
          memoryUsage,
          lastUpdate: Date.now(),
        }));

        if (finalConfig.enableLogging && memoryUsage > 100) { // > 100MB
          console.warn(`High memory usage in ${componentName}: ${memoryUsage.toFixed(2)}MB`);
        }
      }
    };

    const interval = setInterval(checkMemory, finalConfig.memoryCheckInterval);
    checkMemory(); // Initial check

    return () => clearInterval(interval);
  }, [componentName, finalConfig.enableLogging, finalConfig.memoryCheckInterval]);

  // Log performance summary periodically
  useEffect(() => {
    if (!finalConfig.enableLogging) return;

    const logSummary = () => {
      console.group(`Performance Summary - ${componentName}`);
      console.log(`Renders: ${metrics.componentRenders}`);
      console.log(`Last render time: ${metrics.renderTime.toFixed(2)}ms`);
      console.log(`Last search time: ${metrics.searchTime.toFixed(2)}ms`);
      console.log(`Memory usage: ${metrics.memoryUsage.toFixed(2)}MB`);
      console.groupEnd();
    };

    const interval = setInterval(logSummary, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [componentName, metrics, finalConfig.enableLogging]);

  return {
    metrics,
    startRenderTiming,
    endRenderTiming,
    startSearchTiming,
    endSearchTiming,
  };
}

// Hook for measuring component render performance
export function useRenderPerformance(componentName: string) {
  const { startRenderTiming, endRenderTiming, metrics } = usePerformanceMonitor(componentName);

  useEffect(() => {
    startRenderTiming();
    return endRenderTiming;
  });

  return metrics;
}

// Hook for measuring async operations
export function useAsyncPerformance(componentName: string) {
  const { startSearchTiming, endSearchTiming, metrics } = usePerformanceMonitor(componentName);

  const measureAsync = async <T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      console.log(`${operationName} in ${componentName}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`${operationName} failed in ${componentName} after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };

  return {
    metrics,
    measureAsync,
    startTiming: startSearchTiming,
    endTiming: endSearchTiming,
  };
}