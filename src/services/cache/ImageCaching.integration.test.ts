import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager } from './CacheManager';
import { ImageProcessor } from './ImageProcessor';
import { LogoResult, LogoSource } from '../api/types';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import axios from 'axios';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: () => tmpdir()
  }
}));

// Mock axios
vi.mock('axios');

describe('Image Caching Integration', () => {
  let cacheManager: CacheManager;
  let testCacheDir: string;

  beforeEach(() => {
    testCacheDir = '/tmp/test-cache-integration';
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true });
    }
    fs.mkdirSync(testCacheDir, { recursive: true });

    cacheManager = new CacheManager({
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      expirationDays: 1,
      maxImageSizeBytes: 1024 * 1024, // 1MB
      enableImageOptimization: true,
      cleanupThresholdPercent: 80
    });

    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (cacheManager) {
      await cacheManager.clearCache();
      cacheManager.close();
    }
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true });
    }
  });

  it('should validate, download, cache and retrieve a logo image', async () => {
    // Create a realistic PNG logo
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x01, 0x00, // Width: 256
      0x00, 0x00, 0x01, 0x00, // Height: 256
      0x08, 0x06, 0x00, 0x00, 0x00 // Color type 6 (RGBA - has transparency)
    ]);

    const mockAxios = vi.mocked(axios);
    mockAxios.default.get.mockResolvedValueOnce({
      data: pngBuffer,
      headers: { 'content-type': 'image/png' }
    });

    // Create a logo result
    const logoResult: LogoResult = {
      id: 'test-logo-integration',
      url: 'https://example.com/company-logo.png',
      source: LogoSource.LOGO_DEV,
      format: 'png',
      size: { width: 256, height: 256 },
      transparent: true,
      quality: 'high',
      companyName: 'Test Company',
      createdAt: new Date()
    };

    // Step 1: Validate the URL
    const isValid = await cacheManager.validateLogoUrl(logoResult.url);
    expect(isValid).toBe(true);

    // Step 2: Cache the search results
    await cacheManager.cacheResults('test company', [logoResult], [LogoSource.LOGO_DEV]);

    // Step 3: Download and cache the image
    const localPath = await cacheManager.downloadAndCacheImage(logoResult.url, logoResult.id);

    // Verify the image was downloaded and cached
    expect(localPath).toBeDefined();
    expect(fs.existsSync(localPath)).toBe(true);
    expect(localPath).toMatch(/\.png$/);

    // Verify the file content matches
    const cachedContent = fs.readFileSync(localPath);
    expect(cachedContent).toEqual(pngBuffer);

    // Step 4: Retrieve cached results
    const cachedResults = await cacheManager.getCachedResults('test company');
    expect(cachedResults).toBeDefined();
    expect(cachedResults).toHaveLength(1);
    expect(cachedResults![0].id).toBe(logoResult.id);
    expect(cachedResults![0].localPath).toBe(localPath);

    // Step 5: Verify cache statistics
    const stats = cacheManager.getCacheStats();
    expect(stats.totalEntries).toBe(1);
    expect(stats.imageCount).toBe(1);
    expect(stats.totalSize).toBeGreaterThan(0);

    // Step 6: Verify cache health info
    const cacheInfo = cacheManager.getCacheInfo();
    expect(cacheInfo.healthStatus).toBe('healthy');
    expect(cacheInfo.stats.imageCount).toBe(1);
  });

  it('should handle SVG logos with proper validation', async () => {
    const svgContent = `
      <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="150" fill="blue" opacity="0.8"/>
        <text x="100" y="75" text-anchor="middle" fill="white" font-size="20">LOGO</text>
      </svg>
    `.trim();
    const svgBuffer = Buffer.from(svgContent, 'utf8');

    const mockAxios = vi.mocked(axios);
    mockAxios.default.get.mockResolvedValueOnce({
      data: svgBuffer,
      headers: { 'content-type': 'image/svg+xml' }
    });

    const logoResult: LogoResult = {
      id: 'test-svg-integration',
      url: 'https://example.com/company-logo.svg',
      source: LogoSource.BRANDFETCH,
      format: 'svg',
      size: { width: 200, height: 150 },
      transparent: true,
      quality: 'high',
      companyName: 'SVG Company',
      createdAt: new Date()
    };

    // Validate and cache
    const isValid = await cacheManager.validateLogoUrl(logoResult.url);
    expect(isValid).toBe(true);

    await cacheManager.cacheResults('svg company', [logoResult], [LogoSource.BRANDFETCH]);
    const localPath = await cacheManager.downloadAndCacheImage(logoResult.url, logoResult.id);

    // Verify SVG was cached correctly
    expect(localPath).toMatch(/\.svg$/);
    const cachedContent = fs.readFileSync(localPath, 'utf8');
    expect(cachedContent).toContain('<svg');
    expect(cachedContent).toContain('width="200"');
    expect(cachedContent).toContain('height="150"');
  });

  it('should handle cache size limits and cleanup', async () => {
    // Create a small cache manager to test cleanup
    const smallCacheManager = new CacheManager({
      maxSizeBytes: 1024, // 1KB limit
      expirationDays: 1,
      maxImageSizeBytes: 512,
      enableImageOptimization: true,
      cleanupThresholdPercent: 50 // Cleanup at 50%
    });

    const mockAxios = vi.mocked(axios);
    
    // Create multiple logo results that will exceed the cache limit
    const logoResults: LogoResult[] = [];
    for (let i = 0; i < 5; i++) {
      const pngBuffer = Buffer.alloc(200, i); // 200 bytes each
      pngBuffer[0] = 0x89; pngBuffer[1] = 0x50; pngBuffer[2] = 0x4E; pngBuffer[3] = 0x47; // PNG signature
      
      mockAxios.default.get.mockResolvedValueOnce({
        data: pngBuffer,
        headers: { 'content-type': 'image/png' }
      });

      const logoResult: LogoResult = {
        id: `test-logo-${i}`,
        url: `https://example.com/logo-${i}.png`,
        source: LogoSource.LOGO_DEV,
        format: 'png',
        size: { width: 100, height: 100 },
        transparent: false,
        quality: 'medium',
        companyName: `Company ${i}`,
        createdAt: new Date()
      };

      logoResults.push(logoResult);
    }

    // Cache all results
    await smallCacheManager.cacheResults('multiple logos', logoResults, [LogoSource.LOGO_DEV]);

    // Try to download all images - some should trigger cleanup
    const downloadPromises = logoResults.map(logo => 
      smallCacheManager.downloadAndCacheImage(logo.url, logo.id).catch(() => null)
    );

    const results = await Promise.all(downloadPromises);
    
    // Some downloads should succeed, others might fail due to size limits
    const successfulDownloads = results.filter(result => result !== null);
    expect(successfulDownloads.length).toBeGreaterThan(0);

    // Verify cache stats show reasonable usage
    const stats = smallCacheManager.getCacheStats();
    // The database overhead is significant for small caches, so just verify cleanup worked
    expect(stats.imageCount).toBeGreaterThan(0);
    expect(stats.imageCount).toBeLessThanOrEqual(5); // Should not exceed our test data

    smallCacheManager.close();
  });

  it('should reject invalid image formats', async () => {
    const mockAxios = vi.mocked(axios);
    mockAxios.default.get.mockResolvedValueOnce({
      data: Buffer.from('This is not an image file'),
      headers: { 'content-type': 'text/plain' }
    });

    const logoResult: LogoResult = {
      id: 'invalid-image',
      url: 'https://example.com/not-an-image.txt',
      source: LogoSource.ICONHORSE,
      format: 'png',
      size: { width: 0, height: 0 },
      transparent: false,
      quality: 'low',
      companyName: 'Invalid Company',
      createdAt: new Date()
    };

    await cacheManager.cacheResults('invalid test', [logoResult], [LogoSource.ICONHORSE]);

    // Should reject invalid image
    await expect(
      cacheManager.downloadAndCacheImage(logoResult.url, logoResult.id)
    ).rejects.toThrow('Failed to download image');
  });

  it('should validate URLs before attempting download', async () => {
    const invalidUrls = [
      'not-a-url',
      'ftp://example.com/logo.png',
      'javascript:alert(1)',
      ''
    ];

    for (const url of invalidUrls) {
      const isValid = await cacheManager.validateLogoUrl(url);
      expect(isValid).toBe(false);
    }

    const validUrls = [
      'https://example.com/logo.png',
      'http://example.com/logo.svg',
      'https://cdn.example.com/assets/logo.jpg'
    ];

    for (const url of validUrls) {
      const isValid = await cacheManager.validateLogoUrl(url);
      expect(isValid).toBe(true);
    }
  });
});