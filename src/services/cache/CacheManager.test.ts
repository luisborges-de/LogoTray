import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { CacheManager } from './CacheManager';
import { LogoResult, LogoSource } from '../api/types';
import fs from 'fs';
import path from 'path';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-cache')
  }
}));

// Mock axios for image downloading
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    head: vi.fn()
  }
}));

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let testCacheDir: string;
  let testCounter = 0;

  beforeAll(() => {
    // Create test cache directory
    testCacheDir = '/tmp/test-cache';
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true });
    }
    fs.mkdirSync(testCacheDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up test cache directory
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    // Clear any existing cache data
    if (fs.existsSync(path.join(testCacheDir, 'cache'))) {
      fs.rmSync(path.join(testCacheDir, 'cache'), { recursive: true });
    }
    
    cacheManager = new CacheManager({
      maxSizeBytes: 1024 * 1024, // 1MB for testing
      expirationDays: 1,
      maxImageSizeBytes: 100 * 1024 // 100KB for testing
    });

    // Clear axios mock calls
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (cacheManager) {
      await cacheManager.clearCache();
      cacheManager.close();
    }
  });

  const createTestLogoResult = (id: string, companyName: string): LogoResult => ({
    id: `${id}-${++testCounter}`, // Make IDs unique across tests
    url: `https://example.com/logo-${id}.png`,
    source: LogoSource.LOGO_DEV,
    format: 'png',
    size: { width: 100, height: 100 },
    transparent: true,
    quality: 'high',
    companyName,
    createdAt: new Date()
  });

  describe('cacheResults and getCachedResults', () => {
    it('should cache and retrieve search results', async () => {
      const query = 'test company';
      const result1 = createTestLogoResult('1', 'Test Company');
      const result2 = createTestLogoResult('2', 'Test Company');
      const results = [result1, result2];
      const sources = [LogoSource.LOGO_DEV, LogoSource.BRANDFETCH];

      // Cache the results
      await cacheManager.cacheResults(query, results, sources);

      // Retrieve cached results
      const cachedResults = await cacheManager.getCachedResults(query);

      expect(cachedResults).toBeDefined();
      expect(cachedResults).toHaveLength(2);
      expect(cachedResults![0].id).toBe(result1.id);
      expect(cachedResults![0].companyName).toBe('Test Company');
      expect(cachedResults![1].id).toBe(result2.id);
    });

    it('should return null for non-existent cache entries', async () => {
      const cachedResults = await cacheManager.getCachedResults('non-existent query');
      expect(cachedResults).toBeNull();
    });

    it('should handle case-insensitive queries', async () => {
      const query = 'Test Company';
      const result = createTestLogoResult('1', 'Test Company');
      const results = [result];
      const sources = [LogoSource.LOGO_DEV];

      await cacheManager.cacheResults(query, results, sources);

      // Test different cases
      const cachedResults1 = await cacheManager.getCachedResults('test company');
      const cachedResults2 = await cacheManager.getCachedResults('TEST COMPANY');

      expect(cachedResults1).toBeDefined();
      expect(cachedResults2).toBeDefined();
      expect(cachedResults1![0].id).toBe(result.id);
      expect(cachedResults2![0].id).toBe(result.id);
    });
  });

  describe('validateLogoUrl', () => {
    it('should validate valid image URLs', async () => {
      const validUrls = [
        'https://example.com/logo.png',
        'https://example.com/logo.jpg',
        'https://example.com/logo.svg'
      ];

      for (const url of validUrls) {
        const result = await cacheManager.validateLogoUrl(url);
        expect(result).toBe(true);
      }
    });

    it('should reject invalid URLs', async () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com/logo.png',
        ''
      ];

      for (const url of invalidUrls) {
        const result = await cacheManager.validateLogoUrl(url);
        expect(result).toBe(false);
      }
    });
  });

  describe('downloadAndCacheImage', () => {
    it('should download and cache a PNG image with validation', async () => {
      const axios = await import('axios');
      // Create a minimal PNG buffer with magic bytes
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x64, // Width: 100
        0x00, 0x00, 0x00, 0x64, // Height: 100
        0x08, 0x02, 0x00, 0x00, 0x00 // Color type, etc.
      ]);
      
      vi.mocked(axios.default.get).mockResolvedValueOnce({
        data: pngBuffer,
        headers: { 'content-type': 'image/png' }
      });

      // First cache a logo result
      const logoResult = createTestLogoResult('test-logo', 'Test Company');
      await cacheManager.cacheResults('test download', [logoResult], [LogoSource.LOGO_DEV]);

      // Download and cache the image
      const localPath = await cacheManager.downloadAndCacheImage(
        'https://example.com/logo.png',
        logoResult.id
      );

      expect(localPath).toBeDefined();
      expect(fs.existsSync(localPath)).toBe(true);
      expect(localPath).toMatch(/\.png$/);

      // Verify the file content
      const fileContent = fs.readFileSync(localPath);
      expect(fileContent).toEqual(pngBuffer);
    });

    it('should download and cache an SVG image', async () => {
      const axios = await import('axios');
      const svgContent = '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
      const svgBuffer = Buffer.from(svgContent, 'utf8');
      
      vi.mocked(axios.default.get).mockResolvedValueOnce({
        data: svgBuffer,
        headers: { 'content-type': 'image/svg+xml' }
      });

      // First cache a logo result
      const logoResult = createTestLogoResult('test-svg', 'Test Company');
      await cacheManager.cacheResults('test svg', [logoResult], [LogoSource.LOGO_DEV]);

      // Download and cache the image
      const localPath = await cacheManager.downloadAndCacheImage(
        'https://example.com/logo.svg',
        logoResult.id
      );

      expect(localPath).toBeDefined();
      expect(fs.existsSync(localPath)).toBe(true);
      expect(localPath).toMatch(/\.svg$/);
    });

    it('should return existing local path if image is already cached', async () => {
      const axios = await import('axios');
      // Create a proper PNG buffer with IHDR chunk
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x64, // Width: 100
        0x00, 0x00, 0x00, 0x64, // Height: 100
        0x08, 0x02, 0x00, 0x00, 0x00 // Color type, etc.
      ]);
      
      vi.mocked(axios.default.get).mockResolvedValue({
        data: pngBuffer,
        headers: { 'content-type': 'image/png' }
      });

      // First cache a logo result
      const logoResult = createTestLogoResult('test-logo-cached', 'Test Company');
      await cacheManager.cacheResults('test cached', [logoResult], [LogoSource.LOGO_DEV]);

      // Download and cache the image first time
      const localPath1 = await cacheManager.downloadAndCacheImage(
        'https://example.com/logo.png',
        logoResult.id
      );

      // Download again - should return same path without making HTTP request
      const localPath2 = await cacheManager.downloadAndCacheImage(
        'https://example.com/logo.png',
        logoResult.id
      );

      expect(localPath1).toBe(localPath2);
      expect(vi.mocked(axios.default.get)).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid image formats', async () => {
      const axios = await import('axios');
      const invalidBuffer = Buffer.from('not an image');
      
      vi.mocked(axios.default.get).mockResolvedValueOnce({
        data: invalidBuffer,
        headers: { 'content-type': 'text/plain' }
      });

      // First cache a logo result
      const logoResult = createTestLogoResult('invalid-image', 'Test Company');
      await cacheManager.cacheResults('invalid test', [logoResult], [LogoSource.LOGO_DEV]);

      // Attempt to download - should throw
      await expect(
        cacheManager.downloadAndCacheImage('https://example.com/invalid.txt', logoResult.id)
      ).rejects.toThrow('Failed to download image');
    });

    it('should handle large images by rejecting them', async () => {
      const axios = await import('axios');
      
      vi.mocked(axios.default.get).mockRejectedValueOnce(
        new Error('maxContentLength size of 102400 exceeded')
      );

      // First cache a logo result
      const logoResult = createTestLogoResult('large-image', 'Test Company');
      await cacheManager.cacheResults('large test', [logoResult], [LogoSource.LOGO_DEV]);

      // Attempt to download - should throw
      await expect(
        cacheManager.downloadAndCacheImage('https://example.com/large.png', logoResult.id)
      ).rejects.toThrow();
    });
  });

  describe('cleanupExpiredCache', () => {
    it('should clean up expired cache entries', async () => {
      // Create cache manager with very short expiration for testing
      const shortExpirationManager = new CacheManager({
        expirationDays: -1, // Expire immediately (negative days)
        maxSizeBytes: 1024 * 1024,
        maxImageSizeBytes: 100 * 1024
      });

      const results = [createTestLogoResult('expired', 'Expired Company')];
      await shortExpirationManager.cacheResults('expired query', results, [LogoSource.LOGO_DEV]);

      // Clean up expired entries
      await shortExpirationManager.cleanupExpiredCache();

      // Verify the entry is gone
      const cachedResults = await shortExpirationManager.getCachedResults('expired query');
      expect(cachedResults).toBeNull();

      shortExpirationManager.close();
    });
  });

  describe('getCacheStats', () => {
    it('should return correct cache statistics', async () => {
      const results1 = [createTestLogoResult('stats-1', 'Company 1')];
      const results2 = [createTestLogoResult('stats-2', 'Company 2')];

      await cacheManager.cacheResults('query1', results1, [LogoSource.LOGO_DEV]);
      await cacheManager.cacheResults('query2', results2, [LogoSource.BRANDFETCH]);

      const stats = cacheManager.getCacheStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.imageCount).toBe(0); // No images downloaded yet
      expect(stats.databaseSize).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
      expect(stats.newestEntry).toBeInstanceOf(Date);
    });

    it('should return zero stats for empty cache', async () => {
      const stats = cacheManager.getCacheStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSize).toBeGreaterThan(0); // Database file exists
      expect(stats.imageCount).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });
  });

  describe('getCacheInfo', () => {
    it('should return cache health information', async () => {
      const info = cacheManager.getCacheInfo();

      expect(info.config).toBeDefined();
      expect(info.stats).toBeDefined();
      expect(info.healthStatus).toMatch(/^(healthy|warning|critical)$/);
      expect(Array.isArray(info.recommendations)).toBe(true);
    });

    it('should detect critical cache usage', async () => {
      // Create a cache manager with very small size limit
      const smallCacheManager = new CacheManager({
        maxSizeBytes: 1000, // 1KB
        expirationDays: 1,
        maxImageSizeBytes: 500
      });

      // Add some data to exceed the limit
      const results = Array.from({ length: 10 }, (_, i) => 
        createTestLogoResult(`critical-${i}`, `Company ${i}`)
      );
      await smallCacheManager.cacheResults('critical test', results, [LogoSource.LOGO_DEV]);

      const info = smallCacheManager.getCacheInfo();
      
      // Should detect high usage
      expect(['warning', 'critical']).toContain(info.healthStatus);
      expect(info.recommendations.length).toBeGreaterThan(0);

      smallCacheManager.close();
    });
  });

  describe('clearCache', () => {
    it('should clear all cache data', async () => {
      const results = [createTestLogoResult('clear-1', 'Clear Company')];
      await cacheManager.cacheResults('clear query', results, [LogoSource.LOGO_DEV]);

      // Verify cache has data
      let stats = cacheManager.getCacheStats();
      expect(stats.totalEntries).toBe(1);

      // Clear cache
      await cacheManager.clearCache();

      // Verify cache is empty
      stats = cacheManager.getCacheStats();
      expect(stats.totalEntries).toBe(0);

      const cachedResults = await cacheManager.getCachedResults('clear query');
      expect(cachedResults).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Close the database to simulate error
      cacheManager.close();

      // These operations should not throw but return null/handle gracefully
      const cachedResults = await cacheManager.getCachedResults('test');
      expect(cachedResults).toBeNull();

      // Recreate for cleanup
      cacheManager = new CacheManager();
    });

    it('should handle image download errors gracefully', async () => {
      const axios = await import('axios');
      vi.mocked(axios.default.get).mockRejectedValueOnce(new Error('Network error'));

      // First cache a logo result
      const logoResult = createTestLogoResult('error-logo', 'Error Company');
      await cacheManager.cacheResults('error test', [logoResult], [LogoSource.LOGO_DEV]);

      // Attempt to download - should throw
      await expect(
        cacheManager.downloadAndCacheImage('https://example.com/error.png', logoResult.id)
      ).rejects.toThrow('Network error');
    });
  });
});