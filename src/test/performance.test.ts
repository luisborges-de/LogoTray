import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { perf, PerformanceTracker } from '../utils/performance';

describe('Performance Optimizations', () => {
  let tracker: PerformanceTracker;

  beforeEach(() => {
    tracker = PerformanceTracker.getInstance();
    tracker.clear();
    tracker.setEnabled(true);
  });

  afterEach(() => {
    tracker.clear();
  });

  describe('PerformanceTracker', () => {
    it('should track synchronous operations', () => {
      const result = tracker.measure('test-sync', () => {
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toBe(499500); // Sum of 0 to 999
      
      const entry = tracker.getEntry('test-sync');
      expect(entry).toBeDefined();
      expect(entry!.name).toBe('test-sync');
      expect(entry!.duration).toBeGreaterThan(0);
    });

    it('should track asynchronous operations', async () => {
      const result = await tracker.measureAsync('test-async', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'completed';
      });

      expect(result).toBe('completed');
      
      const entry = tracker.getEntry('test-async');
      expect(entry).toBeDefined();
      expect(entry!.name).toBe('test-async');
      expect(entry!.duration).toBeGreaterThanOrEqual(10);
    });

    it('should provide performance summary', () => {
      // Add multiple entries
      tracker.measure('fast-op', () => 1 + 1);
      tracker.measure('slow-op', () => {
        let sum = 0;
        for (let i = 0; i < 10000; i++) {
          sum += Math.random();
        }
        return sum;
      });

      const summary = tracker.getSummary();
      expect(summary.totalEntries).toBe(2);
      expect(summary.averageDuration).toBeGreaterThan(0);
      expect(summary.slowestOperation?.name).toBe('slow-op');
      expect(summary.fastestOperation?.name).toBe('fast-op');
    });

    it('should handle timer start/end manually', () => {
      tracker.start('manual-timer');
      
      // Simulate work
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }
      
      const duration = tracker.end('manual-timer');
      
      expect(duration).toBeGreaterThan(0);
      
      const entry = tracker.getEntry('manual-timer');
      expect(entry).toBeDefined();
      expect(entry!.duration).toBe(duration);
    });

    it('should filter entries by pattern', () => {
      tracker.measure('search-logos', () => 'result1');
      tracker.measure('search-cache', () => 'result2');
      tracker.measure('render-component', () => 'result3');

      const searchEntries = tracker.getEntriesByPattern(/^search-/);
      expect(searchEntries).toHaveLength(2);
      expect(searchEntries.map(e => e.name)).toEqual(['search-logos', 'search-cache']);
    });
  });

  describe('Debouncing', () => {
    it('should debounce function calls', (done) => {
      let callCount = 0;
      const debouncedFn = debounce(() => {
        callCount++;
      }, 50);

      // Call multiple times rapidly
      debouncedFn();
      debouncedFn();
      debouncedFn();

      // Should only be called once after delay
      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 100);
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage', () => {
      const usage = getMemoryUsage();
      
      expect(usage).toHaveProperty('heapUsed');
      expect(usage).toHaveProperty('heapTotal');
      expect(usage).toHaveProperty('external');
      expect(usage).toHaveProperty('rss');
      
      expect(typeof usage.heapUsed).toBe('number');
      expect(usage.heapUsed).toBeGreaterThan(0);
    });
  });
});

// Helper function for debouncing test
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Helper function for memory usage test
function getMemoryUsage(): {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
} {
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
    rss: Math.round(usage.rss / 1024 / 1024), // MB
  };
}