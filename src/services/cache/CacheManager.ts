import { DatabaseManager } from './database';
import { SearchCache } from './types';
import { LogoResult, LogoSource } from '../api/types';
import { ImageProcessor, ImageInfo, OptimizedImage } from './ImageProcessor';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface CacheConfig {
  maxSizeBytes: number; // Maximum cache size in bytes
  expirationDays: number; // Days before cache expires
  maxImageSizeBytes: number; // Maximum individual image size
  enableImageOptimization: boolean; // Whether to create optimized versions
  cleanupThresholdPercent: number; // Cleanup when cache exceeds this percentage
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  imageCount: number;
  imageSize: number;
  databaseSize: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  averageImageSize: number;
}

export class CacheManager {
  private dbManager: DatabaseManager;
  private config: CacheConfig;
  private imagesCacheDir: string;

  constructor(config: Partial<CacheConfig> = {}) {
    this.dbManager = new DatabaseManager();
    this.config = {
      maxSizeBytes: 100 * 1024 * 1024, // 100MB default
      expirationDays: 7, // 7 days default
      maxImageSizeBytes: 5 * 1024 * 1024, // 5MB per image
      enableImageOptimization: true, // Enable optimization by default
      cleanupThresholdPercent: 80, // Cleanup when 80% full
      ...config
    };

    // Create images cache directory
    const userDataPath = app.getPath('userData');
    this.imagesCacheDir = path.join(userDataPath, 'cache', 'images');
    
    if (!fs.existsSync(this.imagesCacheDir)) {
      fs.mkdirSync(this.imagesCacheDir, { recursive: true });
    }

    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  /**
   * Get cached search results for a query
   */
  async getCachedResults(query: string): Promise<LogoResult[] | null> {
    const db = this.dbManager.getDatabase();
    
    try {
      // Find non-expired cache entry
      const cacheEntry = db.prepare(`
        SELECT * FROM search_cache 
        WHERE query = ? AND expires_at > datetime('now')
        ORDER BY created_at DESC
        LIMIT 1
      `).get(query.toLowerCase()) as any;

      if (!cacheEntry) {
        return null;
      }

      // Get logo results for this cache entry
      const logoRows = db.prepare(`
        SELECT * FROM logo_results 
        WHERE cache_id = ?
        ORDER BY created_at ASC
      `).all(cacheEntry.id) as any[];

      const results: LogoResult[] = logoRows.map(row => ({
        id: row.id,
        url: row.url,
        localPath: row.local_path,
        source: row.source as LogoSource,
        format: row.format as 'png' | 'svg' | 'jpg',
        size: {
          width: row.width,
          height: row.height
        },
        transparent: Boolean(row.transparent),
        quality: row.quality as 'high' | 'medium' | 'low',
        companyName: row.company_name,
        createdAt: new Date(row.created_at)
      }));

      return results;
    } catch (error) {
      console.error('Error getting cached results:', error);
      return null;
    }
  }

  /**
   * Cache search results for a query
   */
  async cacheResults(query: string, results: LogoResult[], sources: LogoSource[]): Promise<void> {
    const db = this.dbManager.getDatabase();
    
    try {
      const cacheId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.config.expirationDays);

      // Start transaction
      const transaction = db.transaction(() => {
        // Insert search cache entry
        db.prepare(`
          INSERT INTO search_cache (id, query, sources, expires_at)
          VALUES (?, ?, ?, ?)
        `).run(cacheId, query.toLowerCase(), JSON.stringify(sources), expiresAt.toISOString());

        // Insert logo results
        const insertLogo = db.prepare(`
          INSERT INTO logo_results (
            id, cache_id, url, local_path, source, format, width, height,
            transparent, quality, company_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const result of results) {
          insertLogo.run(
            result.id,
            cacheId,
            result.url,
            result.localPath || null,
            result.source,
            result.format,
            result.size.width,
            result.size.height,
            result.transparent ? 1 : 0,
            result.quality,
            result.companyName
          );
        }
      });

      transaction();

      // Clean up old cache entries if needed
      await this.cleanupIfNeeded();
    } catch (error) {
      console.error('Error caching results:', error);
      throw error;
    }
  }

  /**
   * Validate a logo URL before attempting to download
   */
  async validateLogoUrl(url: string): Promise<boolean> {
    return ImageProcessor.validateLogoUrl(url);
  }

  /**
   * Download and cache an image locally with validation and optimization
   */
  async downloadAndCacheImage(url: string, logoId: string): Promise<string> {
    try {
      // Check if image is already cached
      const db = this.dbManager.getDatabase();
      const existingResult = db.prepare(`
        SELECT local_path, image_info FROM logo_results 
        WHERE id = ? AND local_path IS NOT NULL
      `).get(logoId) as any;

      if (existingResult && fs.existsSync(existingResult.local_path)) {
        return existingResult.local_path;
      }

      // Validate URL first
      const isValidUrl = await this.validateLogoUrl(url);
      if (!isValidUrl) {
        throw new Error('Invalid logo URL format');
      }

      // Download and analyze the image
      const { buffer, info } = await ImageProcessor.downloadAndAnalyze(url, this.config.maxImageSizeBytes);
      
      if (!info.isValid) {
        throw new Error('Downloaded file is not a valid image');
      }

      // Check cache size before saving
      await this.ensureCacheSpace(info.size);

      // Save optimized image
      const optimizedImage = await ImageProcessor.saveOptimizedImage(
        buffer,
        info,
        logoId,
        this.imagesCacheDir
      );

      // Update database with local path and image info
      db.prepare(`
        UPDATE logo_results 
        SET local_path = ?, image_info = ?, width = ?, height = ?, format = ?, transparent = ?
        WHERE id = ?
      `).run(
        optimizedImage.originalPath,
        JSON.stringify(info),
        info.width,
        info.height,
        info.format,
        info.hasTransparency ? 1 : 0,
        logoId
      );

      console.log(`Cached image: ${logoId} (${ImageProcessor.formatFileSize(info.size)}, ${info.width}x${info.height})`);
      
      return optimizedImage.originalPath;
    } catch (error) {
      console.error('Error downloading and caching image:', error);
      throw error;
    }
  }

  /**
   * Ensure there's enough cache space for a new image
   */
  private async ensureCacheSpace(requiredBytes: number): Promise<void> {
    const currentSize = this.getTotalCacheSize();
    const availableSpace = this.config.maxSizeBytes - currentSize;
    
    if (availableSpace < requiredBytes) {
      console.log('Cache space insufficient, cleaning up old entries...');
      await this.cleanupOldestEntries(requiredBytes);
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<void> {
    const db = this.dbManager.getDatabase();
    
    try {
      // Get expired cache entries with their logo file paths
      const expiredEntries = db.prepare(`
        SELECT sc.id, lr.local_path
        FROM search_cache sc
        LEFT JOIN logo_results lr ON sc.id = lr.cache_id
        WHERE sc.expires_at <= datetime('now')
      `).all() as any[];

      if (expiredEntries.length === 0) {
        return;
      }

      // Delete local image files
      const filesToDelete = expiredEntries
        .map(entry => entry.local_path)
        .filter(path => path && fs.existsSync(path));

      for (const filePath of filesToDelete) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.warn('Failed to delete cached image:', filePath, error);
        }
      }

      // Delete expired cache entries (cascade will delete logo_results)
      const deletedCount = db.prepare(`
        DELETE FROM search_cache 
        WHERE expires_at <= datetime('now')
      `).run().changes;

      console.log(`Cleaned up ${deletedCount} expired cache entries`);
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
    }
  }

  /**
   * Clean up cache if it exceeds size limits
   */
  private async cleanupIfNeeded(): Promise<void> {
    const totalSize = this.getTotalCacheSize();
    const thresholdSize = this.config.maxSizeBytes * (this.config.cleanupThresholdPercent / 100);
    
    if (totalSize > thresholdSize) {
      console.log(`Cache size (${ImageProcessor.formatFileSize(totalSize)}) exceeds threshold, cleaning up...`);
      await this.cleanupOldestEntries();
    }
  }

  /**
   * Start periodic cleanup task
   */
  private startPeriodicCleanup(): void {
    // Run cleanup every 30 minutes
    setInterval(async () => {
      try {
        await this.cleanupExpiredCache();
        await this.cleanupIfNeeded();
      } catch (error) {
        console.error('Error during periodic cleanup:', error);
      }
    }, 30 * 60 * 1000);
  }

  /**
   * Get total cache size in bytes
   */
  private getTotalCacheSize(): number {
    let totalSize = this.dbManager.getDatabaseSize();
    
    try {
      const files = fs.readdirSync(this.imagesCacheDir);
      for (const file of files) {
        const filePath = path.join(this.imagesCacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }
    } catch (error) {
      console.warn('Error calculating cache size:', error);
    }
    
    return totalSize;
  }

  /**
   * Clean up oldest cache entries to free space
   */
  private async cleanupOldestEntries(requiredBytes: number = 0): Promise<void> {
    const db = this.dbManager.getDatabase();
    
    try {
      // Calculate how much space we need to free
      const currentSize = this.getTotalCacheSize();
      const targetSize = Math.max(
        this.config.maxSizeBytes * 0.7, // Target 70% of max size
        currentSize - requiredBytes
      );
      const spaceToFree = currentSize - targetSize;

      if (spaceToFree <= 0) {
        return;
      }

      console.log(`Need to free ${ImageProcessor.formatFileSize(spaceToFree)} of cache space`);

      // Get oldest cache entries with file sizes
      const oldEntries = db.prepare(`
        SELECT sc.id, lr.local_path, lr.image_info
        FROM search_cache sc
        LEFT JOIN logo_results lr ON sc.id = lr.cache_id
        WHERE lr.local_path IS NOT NULL
        ORDER BY sc.created_at ASC
      `).all() as any[];

      let freedSpace = 0;
      const entriesToDelete: string[] = [];
      const filesToDelete: string[] = [];

      for (const entry of oldEntries) {
        if (freedSpace >= spaceToFree) {
          break;
        }

        if (entry.local_path && fs.existsSync(entry.local_path)) {
          try {
            const stats = fs.statSync(entry.local_path);
            freedSpace += stats.size;
            filesToDelete.push(entry.local_path);
            entriesToDelete.push(entry.id);
          } catch (error) {
            console.warn('Failed to get file stats:', entry.local_path, error);
          }
        }
      }

      // Delete local image files
      for (const filePath of filesToDelete) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.warn('Failed to delete cached image:', filePath, error);
        }
      }

      // Delete cache entries
      if (entriesToDelete.length > 0) {
        const placeholders = entriesToDelete.map(() => '?').join(',');
        const deletedCount = db.prepare(`
          DELETE FROM search_cache 
          WHERE id IN (${placeholders})
        `).run(...entriesToDelete).changes;

        console.log(`Cleaned up ${deletedCount} old cache entries, freed ${ImageProcessor.formatFileSize(freedSpace)}`);
      }
    } catch (error) {
      console.error('Error cleaning up old cache entries:', error);
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  getCacheStats(): CacheStats {
    const db = this.dbManager.getDatabase();
    
    try {
      const cacheStats = db.prepare(`
        SELECT 
          COUNT(*) as total_entries,
          MIN(created_at) as oldest_entry,
          MAX(created_at) as newest_entry
        FROM search_cache
      `).get() as any;

      const imageStats = db.prepare(`
        SELECT 
          COUNT(*) as image_count,
          AVG(CASE WHEN image_info IS NOT NULL THEN json_extract(image_info, '$.size') ELSE 0 END) as avg_size
        FROM logo_results
        WHERE local_path IS NOT NULL
      `).get() as any;

      const totalSize = this.getTotalCacheSize();
      const databaseSize = this.dbManager.getDatabaseSize();
      const imageSize = totalSize - databaseSize;

      return {
        totalEntries: cacheStats.total_entries || 0,
        totalSize,
        imageCount: imageStats.image_count || 0,
        imageSize,
        databaseSize,
        oldestEntry: cacheStats.oldest_entry ? new Date(cacheStats.oldest_entry) : null,
        newestEntry: cacheStats.newest_entry ? new Date(cacheStats.newest_entry) : null,
        averageImageSize: imageStats.avg_size || 0
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        imageCount: 0,
        imageSize: 0,
        databaseSize: 0,
        oldestEntry: null,
        newestEntry: null,
        averageImageSize: 0
      };
    }
  }

  /**
   * Get detailed cache information for debugging
   */
  getCacheInfo(): {
    config: CacheConfig;
    stats: CacheStats;
    healthStatus: 'healthy' | 'warning' | 'critical';
    recommendations: string[];
  } {
    const stats = this.getCacheStats();
    const usagePercent = (stats.totalSize / this.config.maxSizeBytes) * 100;
    
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    if (usagePercent > 90) {
      healthStatus = 'critical';
      recommendations.push('Cache is nearly full. Consider increasing maxSizeBytes or cleaning up manually.');
    } else if (usagePercent > 70) {
      healthStatus = 'warning';
      recommendations.push('Cache usage is high. Monitor for performance impact.');
    }

    if (stats.averageImageSize > 1024 * 1024) { // 1MB
      recommendations.push('Average image size is large. Consider enabling image optimization.');
    }

    if (stats.totalEntries > 1000) {
      recommendations.push('Large number of cache entries. Consider reducing expiration time.');
    }

    return {
      config: this.config,
      stats,
      healthStatus,
      recommendations
    };
  }

  /**
   * Clear all cache data
   */
  async clearCache(): Promise<void> {
    const db = this.dbManager.getDatabase();
    
    try {
      // Delete all cached image files
      const files = fs.readdirSync(this.imagesCacheDir);
      for (const file of files) {
        const filePath = path.join(this.imagesCacheDir, file);
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.warn('Failed to delete cached image:', filePath, error);
        }
      }

      // Clear database tables
      db.prepare('DELETE FROM search_cache').run();
      
      // Vacuum to reclaim space
      this.dbManager.vacuum();
      
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Close the cache manager and database connection
   */
  close(): void {
    this.dbManager.close();
  }
}