import { EventEmitter } from 'events';

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export interface MemoryThresholds {
  warning: number; // MB
  critical: number; // MB
  cleanup: number; // MB
}

export interface MemoryManagerConfig {
  thresholds: MemoryThresholds;
  checkInterval: number; // milliseconds
  enableGarbageCollection: boolean;
  maxImageCacheSize: number; // Number of images to keep in memory
}

export class MemoryManager extends EventEmitter {
  private config: MemoryManagerConfig;
  private imageCache = new Map<string, { data: Buffer; timestamp: number; size: number }>();
  private monitoringInterval?: NodeJS.Timeout;
  private lastCleanup = 0;
  private readonly CLEANUP_COOLDOWN = 30000; // 30 seconds

  constructor(config: Partial<MemoryManagerConfig> = {}) {
    super();
    
    this.config = {
      thresholds: {
        warning: 100, // 100MB
        critical: 200, // 200MB
        cleanup: 150, // 150MB
      },
      checkInterval: 10000, // 10 seconds
      enableGarbageCollection: true,
      maxImageCacheSize: 50, // Keep max 50 images in memory
      ...config,
    };

    this.startMonitoring();
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.checkInterval);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024), // MB
    };
  }

  /**
   * Check memory usage and trigger cleanup if needed
   */
  private checkMemoryUsage(): void {
    const stats = this.getMemoryStats();
    const totalMemory = stats.heapUsed + stats.external;

    // Emit memory status events
    if (totalMemory > this.config.thresholds.critical) {
      this.emit('memory:critical', stats);
      this.performEmergencyCleanup();
    } else if (totalMemory > this.config.thresholds.warning) {
      this.emit('memory:warning', stats);
      
      if (totalMemory > this.config.thresholds.cleanup) {
        this.performCleanup();
      }
    } else {
      this.emit('memory:normal', stats);
    }
  }

  /**
   * Cache an image in memory with size limits
   */
  cacheImage(id: string, data: Buffer): void {
    const size = data.length;
    
    // Don't cache very large images in memory
    if (size > 5 * 1024 * 1024) { // 5MB
      return;
    }

    // Remove oldest entries if cache is full
    if (this.imageCache.size >= this.config.maxImageCacheSize) {
      this.cleanupImageCache(Math.floor(this.config.maxImageCacheSize * 0.3)); // Remove 30%
    }

    this.imageCache.set(id, {
      data,
      timestamp: Date.now(),
      size,
    });
  }

  /**
   * Get cached image from memory
   */
  getCachedImage(id: string): Buffer | null {
    const cached = this.imageCache.get(id);
    if (cached) {
      // Update timestamp for LRU
      cached.timestamp = Date.now();
      return cached.data;
    }
    return null;
  }

  /**
   * Remove image from memory cache
   */
  removeCachedImage(id: string): void {
    this.imageCache.delete(id);
  }

  /**
   * Get memory cache statistics
   */
  getCacheStats(): {
    count: number;
    totalSize: number;
    averageSize: number;
    oldestTimestamp: number;
  } {
    let totalSize = 0;
    let oldestTimestamp = Date.now();

    for (const cached of this.imageCache.values()) {
      totalSize += cached.size;
      if (cached.timestamp < oldestTimestamp) {
        oldestTimestamp = cached.timestamp;
      }
    }

    return {
      count: this.imageCache.size,
      totalSize: Math.round(totalSize / 1024 / 1024), // MB
      averageSize: this.imageCache.size > 0 ? Math.round(totalSize / this.imageCache.size / 1024) : 0, // KB
      oldestTimestamp,
    };
  }

  /**
   * Perform regular cleanup
   */
  private performCleanup(): void {
    const now = Date.now();
    
    // Avoid too frequent cleanups
    if (now - this.lastCleanup < this.CLEANUP_COOLDOWN) {
      return;
    }

    this.lastCleanup = now;

    // Clean up image cache
    this.cleanupImageCache(Math.floor(this.config.maxImageCacheSize * 0.2)); // Remove 20%

    // Force garbage collection if enabled
    if (this.config.enableGarbageCollection && global.gc) {
      global.gc();
    }

    this.emit('memory:cleanup', this.getMemoryStats());
  }

  /**
   * Perform emergency cleanup when memory is critically high
   */
  private performEmergencyCleanup(): void {
    // Clear most of the image cache
    this.cleanupImageCache(Math.floor(this.config.maxImageCacheSize * 0.7)); // Remove 70%

    // Force garbage collection multiple times
    if (this.config.enableGarbageCollection && global.gc) {
      global.gc();
      setTimeout(() => global.gc && global.gc(), 100);
    }

    this.emit('memory:emergency-cleanup', this.getMemoryStats());
  }

  /**
   * Clean up image cache by removing oldest entries
   */
  private cleanupImageCache(countToRemove: number): void {
    if (this.imageCache.size === 0 || countToRemove <= 0) {
      return;
    }

    // Sort by timestamp (oldest first)
    const entries = Array.from(this.imageCache.entries()).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp
    );

    const toRemove = Math.min(countToRemove, entries.length);
    let removedSize = 0;

    for (let i = 0; i < toRemove; i++) {
      const [id, cached] = entries[i];
      removedSize += cached.size;
      this.imageCache.delete(id);
    }

    console.log(`Cleaned up ${toRemove} cached images, freed ${Math.round(removedSize / 1024 / 1024)}MB`);
  }

  /**
   * Clear all cached images
   */
  clearImageCache(): void {
    const count = this.imageCache.size;
    const stats = this.getCacheStats();
    
    this.imageCache.clear();
    
    console.log(`Cleared ${count} cached images, freed ${stats.totalSize}MB`);
    this.emit('memory:cache-cleared', { count, size: stats.totalSize });
  }

  /**
   * Get memory pressure level
   */
  getMemoryPressure(): 'low' | 'medium' | 'high' | 'critical' {
    const stats = this.getMemoryStats();
    const totalMemory = stats.heapUsed + stats.external;

    if (totalMemory > this.config.thresholds.critical) {
      return 'critical';
    } else if (totalMemory > this.config.thresholds.cleanup) {
      return 'high';
    } else if (totalMemory > this.config.thresholds.warning) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MemoryManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring with new interval if changed
    if (newConfig.checkInterval && this.monitoringInterval) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Destroy the memory manager
   */
  destroy(): void {
    this.stopMonitoring();
    this.clearImageCache();
    this.removeAllListeners();
  }
}

// Global memory manager instance
let globalMemoryManager: MemoryManager | null = null;

export function getMemoryManager(): MemoryManager {
  if (!globalMemoryManager) {
    globalMemoryManager = new MemoryManager();
  }
  return globalMemoryManager;
}

export function destroyMemoryManager(): void {
  if (globalMemoryManager) {
    globalMemoryManager.destroy();
    globalMemoryManager = null;
  }
}