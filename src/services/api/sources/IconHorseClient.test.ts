import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosInstance } from 'axios';
import { IconHorseClient } from './IconHorseClient';
import { LogoSource } from '../types';

// Mock axios instance
const mockAxios = {
  head: vi.fn(),
} as unknown as AxiosInstance;

describe('IconHorseClient', () => {
  let client: IconHorseClient;

  beforeEach(() => {
    client = new IconHorseClient(mockAxios);
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should return empty array for empty query', async () => {
      const results = await client.search('');
      expect(results).toEqual([]);
    });

    it('should return empty array for whitespace query', async () => {
      const results = await client.search('   ');
      expect(results).toEqual([]);
    });

    it('should search for company name and return logo results', async () => {
      // Mock successful HEAD request with good quality logo
      mockAxios.head = vi.fn().mockResolvedValue({
        status: 200,
        headers: {
          'content-length': '5000',
          'content-type': 'image/png',
        },
      });

      const results = await client.search('apple');

      expect(results).toHaveLength(4); // 4 different sizes
      expect(results[0]).toMatchObject({
        source: LogoSource.ICONHORSE,
        format: 'png',
        companyName: 'apple',
        transparent: true,
        quality: 'medium',
      });
      expect(results[0].url).toContain('apple.com');
      expect(results[0].size).toEqual({ width: 512, height: 512 });
    });

    it('should handle domain URLs correctly', async () => {
      mockAxios.head = vi.fn().mockResolvedValue({
        status: 200,
        headers: {
          'content-length': '8000',
          'content-type': 'image/png',
        },
      });

      const results = await client.search('https://google.com');

      expect(results).toHaveLength(4);
      expect(results[0].companyName).toBe('google');
      expect(results[0].url).toContain('google.com');
    });

    it('should handle www domains correctly', async () => {
      mockAxios.head = vi.fn().mockResolvedValue({
        status: 200,
        headers: {
          'content-length': '6000',
          'content-type': 'image/png',
        },
      });

      const results = await client.search('www.microsoft.com');

      expect(results).toHaveLength(4);
      expect(results[0].companyName).toBe('microsoft');
      expect(results[0].url).toContain('microsoft.com');
      expect(results[0].url).not.toContain('www.');
    });

    it('should assess logo quality based on content length', async () => {
      // Mock high quality logo (large file size)
      mockAxios.head = vi.fn().mockResolvedValueOnce({
        status: 200,
        headers: {
          'content-length': '15000',
          'content-type': 'image/png',
        },
      }).mockResolvedValueOnce({
        status: 200,
        headers: {
          'content-length': '5000',
          'content-type': 'image/png',
        },
      }).mockResolvedValueOnce({
        status: 200,
        headers: {
          'content-length': '2000',
          'content-type': 'image/png',
        },
      }).mockResolvedValueOnce({
        status: 200,
        headers: {
          'content-length': '1500',
          'content-type': 'image/png',
        },
      });

      const results = await client.search('tesla');

      expect(results).toHaveLength(4);
      expect(results[0].quality).toBe('high'); // 15000 bytes
      expect(results[1].quality).toBe('medium'); // 5000 bytes
      expect(results[2].quality).toBe('low'); // 2000 bytes
      expect(results[3].quality).toBe('low'); // 1500 bytes
    });

    it('should filter out fallback images (small file size)', async () => {
      // Mock small fallback image
      mockAxios.head = vi.fn().mockResolvedValue({
        status: 200,
        headers: {
          'content-length': '300', // Very small, likely fallback
          'content-type': 'image/png',
        },
      });

      const results = await client.search('nonexistentcompany');

      expect(results).toEqual([]); // Should filter out small fallback images
    });

    it('should handle 404 responses gracefully', async () => {
      mockAxios.head = vi.fn().mockResolvedValue({
        status: 404,
      });

      const results = await client.search('nonexistent');

      expect(results).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      mockAxios.head = vi.fn().mockRejectedValue(new Error('Network error'));

      const results = await client.search('apple');

      expect(results).toEqual([]);
    });

    it('should detect transparency for PNG images', async () => {
      mockAxios.head = vi.fn().mockResolvedValue({
        status: 200,
        headers: {
          'content-length': '5000',
          'content-type': 'image/png',
        },
      });

      const results = await client.search('apple');

      expect(results[0].transparent).toBe(true);
    });

    it('should not detect transparency for non-PNG images', async () => {
      mockAxios.head = vi.fn().mockResolvedValue({
        status: 200,
        headers: {
          'content-length': '5000',
          'content-type': 'image/jpeg',
        },
      });

      const results = await client.search('apple');

      expect(results[0].transparent).toBe(false);
    });

    it('should return results for different sizes', async () => {
      mockAxios.head = vi.fn().mockResolvedValue({
        status: 200,
        headers: {
          'content-length': '5000',
          'content-type': 'image/png',
        },
      });

      const results = await client.search('apple');

      expect(results.length).toBe(4); // 4 different sizes: 512, 256, 128, 64
      expect(results[0].size.width).toBe(512);
      expect(results[1].size.width).toBe(256);
      expect(results[2].size.width).toBe(128);
      expect(results[3].size.width).toBe(64);
    });

    it('should handle malformed URLs gracefully', async () => {
      const results = await client.search('http://invalid-url');

      expect(results).toEqual([]);
    });
  });

  describe('getLogoUrl', () => {
    it('should generate correct URL with default size', () => {
      const url = client.getLogoUrl('apple.com');
      expect(url).toBe('https://icon.horse/icon/apple.com?size=256');
    });

    it('should generate correct URL with custom size', () => {
      const url = client.getLogoUrl('google.com', 512);
      expect(url).toBe('https://icon.horse/icon/google.com?size=512');
    });

    it('should handle domains without protocol', () => {
      const url = client.getLogoUrl('microsoft.com', 128);
      expect(url).toBe('https://icon.horse/icon/microsoft.com?size=128');
    });
  });

  describe('domain extraction', () => {
    it('should extract domain from company name', async () => {
      mockAxios.head = vi.fn().mockResolvedValue({
        status: 200,
        headers: {
          'content-length': '5000',
          'content-type': 'image/png',
        },
      });

      const results = await client.search('Apple Inc');
      expect(results[0].url).toContain('appleinc.com');
    });

    it('should extract domain from full URL', async () => {
      mockAxios.head = vi.fn().mockResolvedValue({
        status: 200,
        headers: {
          'content-length': '5000',
          'content-type': 'image/png',
        },
      });

      const results = await client.search('https://www.apple.com/products');
      expect(results[0].url).toContain('apple.com');
      expect(results[0].companyName).toBe('apple');
    });

    it('should handle domain-like strings', async () => {
      mockAxios.head = vi.fn().mockResolvedValue({
        status: 200,
        headers: {
          'content-length': '5000',
          'content-type': 'image/png',
        },
      });

      const results = await client.search('apple.com');
      expect(results[0].url).toContain('apple.com');
      expect(results[0].companyName).toBe('apple');
    });
  });

  describe('error handling', () => {
    it('should handle timeout errors', async () => {
      mockAxios.head = vi.fn().mockRejectedValue({ code: 'ECONNABORTED' });

      const results = await client.search('apple');
      expect(results).toEqual([]);
    });

    it('should handle invalid response headers', async () => {
      mockAxios.head = vi.fn().mockResolvedValue({
        status: 200,
        headers: {}, // Missing content-length and content-type
      });

      const results = await client.search('apple');
      expect(results).toHaveLength(4); // Should still return results with default quality
      expect(results[0].quality).toBe('low'); // Default quality when no content-length
    });

    it('should handle non-numeric content-length', async () => {
      mockAxios.head = vi.fn().mockResolvedValue({
        status: 200,
        headers: {
          'content-length': 'invalid',
          'content-type': 'image/png',
        },
      });

      const results = await client.search('apple');
      expect(results).toHaveLength(4);
      expect(results[0].quality).toBe('low'); // Default when content-length is invalid
    });
  });
});