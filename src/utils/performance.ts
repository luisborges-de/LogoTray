/**
 * Performance utilities for monitoring and optimizing app performance
 */

export interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

export class PerformanceTracker {
  private static instance: PerformanceTracker;
  private entries: Map<string, PerformanceEntry> = new Map();
  private activeTimers: Map<string, number> = new Map();
  private isEnabled: boolean = process.env.NODE_ENV === 'development';

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  /**
   * Start timing an operation
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    this.activeTimers.set(name, performance.now());

    if (metadata) {
      const entry = this.entries.get(name) || {
        name,
        startTime: 0,
        duration: 0,
      };
      entry.metadata = { ...entry.metadata, ...metadata };
      this.entries.set(name, entry);
    }
  }

  /**
   * End timing an operation
   */
  end(name: string): number {
    if (!this.isEnabled) return 0;

    const startTime = this.activeTimers.get(name);
    if (!startTime) {
      console.warn(`Performance timer '${name}' was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.activeTimers.delete(name);

    const entry: PerformanceEntry = {
      name,
      startTime,
      duration,
      metadata: this.entries.get(name)?.metadata,
    };

    this.entries.set(name, entry);
    return duration;
  }

  /**
   * Measure a synchronous operation
   */
  measure<T>(name: string, operation: () => T, metadata?: Record<string, any>): T {
    this.start(name, metadata);
    try {
      const result = operation();
      return result;
    } finally {
      this.end(name);
    }
  }

  /**
   * Measure an asynchronous operation
   */
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await operation();
      return result;
    } finally {
      this.end(name);
    }
  }

  /**
   * Get performance entry by name
   */
  getEntry(name: string): PerformanceEntry | undefined {
    return this.entries.get(name);
  }

  /**
   * Get all performance entries
   */
  getAllEntries(): PerformanceEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get entries by pattern
   */
  getEntriesByPattern(pattern: RegExp): PerformanceEntry[] {
    return this.getAllEntries().filter(entry => pattern.test(entry.name));
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalEntries: number;
    averageDuration: number;
    slowestOperation: PerformanceEntry | null;
    fastestOperation: PerformanceEntry | null;
  } {
    const entries = this.getAllEntries();

    if (entries.length === 0) {
      return {
        totalEntries: 0,
        averageDuration: 0,
        slowestOperation: null,
        fastestOperation: null,
      };
    }

    const totalDuration = entries.reduce((sum, entry) => sum + entry.duration, 0);
    const averageDuration = totalDuration / entries.length;

    const slowestOperation = entries.reduce((slowest, entry) =>
      entry.duration > slowest.duration ? entry : slowest
    );

    const fastestOperation = entries.reduce((fastest, entry) =>
      entry.duration < fastest.duration ? entry : fastest
    );

    return {
      totalEntries: entries.length,
      averageDuration,
      slowestOperation,
      fastestOperation,
    };
  }

  /**
   * Log performance report
   */
  logReport(): void {
    if (!this.isEnabled) return;

    const summary = this.getSummary();
    const entries = this.getAllEntries().sort((a, b) => b.duration - a.duration);

    console.group('🚀 Performance Report');
    console.log(`Total operations: ${summary.totalEntries}`);
    console.log(`Average duration: ${summary.averageDuration.toFixed(2)}ms`);

    if (summary.slowestOperation) {
      console.log(`Slowest: ${summary.slowestOperation.name} (${summary.slowestOperation.duration.toFixed(2)}ms)`);
    }

    if (summary.fastestOperation) {
      console.log(`Fastest: ${summary.fastestOperation.name} (${summary.fastestOperation.duration.toFixed(2)}ms)`);
    }

    console.group('Top 10 slowest operations:');
    entries.slice(0, 10).forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.name}: ${entry.duration.toFixed(2)}ms`);
      if (entry.metadata) {
        console.log('   Metadata:', entry.metadata);
      }
    });
    console.groupEnd();

    console.groupEnd();
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
    this.activeTimers.clear();
  }

  /**
   * Enable or disable performance tracking
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if performance tracking is enabled
   */
  isTrackingEnabled(): boolean {
    return this.isEnabled;
  }
}

// Global performance tracker instance
export const perf = PerformanceTracker.getInstance();

// Convenience functions
export const startTimer = (name: string, metadata?: Record<string, any>) => perf.start(name, metadata);
export const endTimer = (name: string) => perf.end(name);
export const measureSync = <T>(name: string, operation: () => T) => perf.measure(name, operation);
export const measureAsync = <T>(name: string, operation: () => Promise<T>) => perf.measureAsync(name, operation);

// Performance monitoring decorator
export function performanceMonitor(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return perf.measure(methodName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

// Async performance monitoring decorator
export function asyncPerformanceMonitor(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return perf.measureAsync(methodName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

// Memory usage utilities
export function getMemoryUsage(): {
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

export function logMemoryUsage(label: string = 'Memory Usage'): void {
  const usage = getMemoryUsage();
  console.log(`${label}:`, usage);
}

// Bundle size analysis utilities
export function analyzeComponentSize(componentName: string, renderFunction: () => void): void {
  const startTime = performance.now();
  const startMemory = getMemoryUsage();

  renderFunction();

  const endTime = performance.now();
  const endMemory = getMemoryUsage();

  console.group(`📊 Component Analysis: ${componentName}`);
  console.log(`Render time: ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`Memory delta: ${endMemory.heapUsed - startMemory.heapUsed}MB`);
  console.groupEnd();
}