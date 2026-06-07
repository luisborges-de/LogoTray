/**
 * Example usage of the CacheManager
 * This file demonstrates how to use the SQLite caching system
 */

import { CacheManager } from './CacheManager';
import { LogoResult, LogoSource } from '../api/types';

// Example function showing cache usage
export async function demonstrateCacheUsage() {
  // Initialize cache manager with custom configuration
  const cacheManager = new CacheManager({
    maxSizeBytes: 50 * 1024 * 1024, // 50MB cache limit
    expirationDays: 7, // Cache expires after 7 days
    maxImageSizeBytes: 2 * 1024 * 1024 // 2MB per image max
  });

  try {
    // Example logo results (normally from API calls)
    const logoResults: LogoResult[] = [
      {
        id: 'apple-logo-1',
        url: 'https://logo.dev/apple',
        source: LogoSource.LOGO_DEV,
        format: 'png',
        size: { width: 200, height: 200 },
        transparent: true,
        quality: 'high',
        companyName: 'Apple Inc.',
        createdAt: new Date()
      },
      {
        id: 'apple-logo-2',
        url: 'https://brandfetch.com/apple.png',
        source: LogoSource.BRANDFETCH,
        format: 'png',
        size: { width: 150, height: 150 },
        transparent: true,
        quality: 'medium',
        companyName: 'Apple Inc.',
        createdAt: new Date()
      }
    ];

    const query = 'apple';
    const sources = [LogoSource.LOGO_DEV, LogoSource.BRANDFETCH];

    // 1. Cache the search results
    console.log('Caching search results for:', query);
    await cacheManager.cacheResults(query, logoResults, sources);

    // 2. Retrieve cached results (should be instant)
    console.log('Retrieving cached results...');
    const cachedResults = await cacheManager.getCachedResults(query);
    
    if (cachedResults) {
      console.log(`Found ${cachedResults.length} cached logos for "${query}"`);
      
      // 3. Download and cache images locally
      for (const logo of cachedResults) {
        try {
          console.log(`Downloading image for ${logo.companyName}...`);
          const localPath = await cacheManager.downloadAndCacheImage(logo.url, logo.id);
          console.log(`Image cached at: ${localPath}`);
        } catch (error) {
          console.warn(`Failed to cache image for ${logo.id}:`, error);
        }
      }
    }

    // 4. Get cache statistics
    const stats = cacheManager.getCacheStats();
    console.log('Cache Statistics:', {
      totalEntries: stats.totalEntries,
      totalSizeMB: Math.round(stats.totalSize / (1024 * 1024) * 100) / 100,
      oldestEntry: stats.oldestEntry?.toISOString(),
      newestEntry: stats.newestEntry?.toISOString()
    });

    // 5. Clean up expired entries
    console.log('Cleaning up expired cache entries...');
    await cacheManager.cleanupExpiredCache();

    // 6. Test case-insensitive search
    const caseInsensitiveResults = await cacheManager.getCachedResults('APPLE');
    console.log(`Case-insensitive search found: ${caseInsensitiveResults?.length || 0} results`);

  } catch (error) {
    console.error('Cache demonstration error:', error);
  } finally {
    // Always close the cache manager when done
    cacheManager.close();
  }
}

// Example of cache cleanup and maintenance
export async function performCacheMaintenance() {
  const cacheManager = new CacheManager();

  try {
    console.log('Starting cache maintenance...');

    // Get current stats
    const beforeStats = cacheManager.getCacheStats();
    console.log('Before cleanup:', {
      entries: beforeStats.totalEntries,
      sizeMB: Math.round(beforeStats.totalSize / (1024 * 1024) * 100) / 100
    });

    // Clean expired entries
    await cacheManager.cleanupExpiredCache();

    // Get stats after cleanup
    const afterStats = cacheManager.getCacheStats();
    console.log('After cleanup:', {
      entries: afterStats.totalEntries,
      sizeMB: Math.round(afterStats.totalSize / (1024 * 1024) * 100) / 100
    });

    console.log('Cache maintenance completed');

  } catch (error) {
    console.error('Cache maintenance error:', error);
  } finally {
    cacheManager.close();
  }
}

// Example of clearing all cache data
export async function clearAllCache() {
  const cacheManager = new CacheManager();

  try {
    console.log('Clearing all cache data...');
    await cacheManager.clearCache();
    
    const stats = cacheManager.getCacheStats();
    console.log('Cache cleared. Remaining entries:', stats.totalEntries);

  } catch (error) {
    console.error('Error clearing cache:', error);
  } finally {
    cacheManager.close();
  }
}