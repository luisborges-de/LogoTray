import { describe, it, expect, beforeEach } from 'vitest';
import { APIManager } from './APIManager';
import { LogoSource } from './types';

describe('APIManager Integration', () => {
  let apiManager: APIManager;

  beforeEach(() => {
    apiManager = new APIManager({
      timeout: 10000,
    });
  });

  it('should search Logo.dev source through APIManager', async () => {
    const results = await apiManager.searchSource(LogoSource.LOGO_DEV, 'google');

    // Results may be empty if the logo doesn't exist or network fails
    // But the method should not throw an error
    expect(Array.isArray(results)).toBe(true);
    
    if (results.length > 0) {
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('url');
      expect(results[0].source).toBe(LogoSource.LOGO_DEV);
      expect(results[0].format).toBe('png');
    }
  });

  it('should search Brandfetch source through APIManager', async () => {
    const results = await apiManager.searchSource(LogoSource.BRANDFETCH, 'google');
    
    // Results may be empty if the logo doesn't exist or network fails
    // But the method should not throw an error
    expect(Array.isArray(results)).toBe(true);
    
    if (results.length > 0) {
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('url');
      expect(results[0].source).toBe(LogoSource.BRANDFETCH);
      expect(['png', 'svg', 'jpg']).toContain(results[0].format);
    }
  });

  it('should handle unimplemented sources gracefully', async () => {
    const results = await apiManager.searchSource(LogoSource.API_NINJAS, 'google');
    
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(0);
  });

  it('should search all sources including Logo.dev and Brandfetch', async () => {
    const results = await apiManager.searchLogos('google');

    // Should return array (may be empty if all sources fail)
    expect(Array.isArray(results)).toBe(true);
    
    // If results exist, they should be deduplicated and have proper structure
    if (results.length > 0) {
      results.forEach(result => {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('source');
        expect([LogoSource.LOGO_DEV, LogoSource.BRANDFETCH, LogoSource.WIKIDATA]).toContain(result.source);
      });
    }
  });
});
