import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrandfetchClient } from './BrandfetchClient';
import { LogoSource } from '../types';
import { AxiosInstance } from 'axios';

describe('BrandfetchClient', () => {
  let client: BrandfetchClient;
  let mockAxios: AxiosInstance;

  beforeEach(() => {
    mockAxios = {
      get: vi.fn(),
      head: vi.fn(),
      post: vi.fn(),
    } as any;

    // Default: mock successful HEAD request for CDN validation
    vi.mocked(mockAxios.head).mockResolvedValue({
      status: 200,
      data: {},
      headers: {},
      config: {} as any,
      statusText: 'OK',
    });

    client = new BrandfetchClient(mockAxios);
  });

  describe('CDN search', () => {
    it('should return logo results from CDN for valid company name', async () => {
      const results = await client.search('google');

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        url: 'https://cdn.brandfetch.io/google.com',
        source: LogoSource.BRANDFETCH,
        format: 'png',
        transparent: true,
        quality: 'high',
        companyName: 'google',
      });
      expect(results[0].id).toBeDefined();
      expect(results[0].createdAt).toBeInstanceOf(Date);
      expect(mockAxios.head).toHaveBeenCalledWith(
        'https://cdn.brandfetch.io/google.com',
        expect.any(Object)
      );
    });

    it('should handle domain URLs correctly', async () => {
      const results = await client.search('https://www.apple.com');

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://cdn.brandfetch.io/apple.com');
      expect(results[0].companyName).toBe('apple');
      expect(mockAxios.head).toHaveBeenCalledWith(
        'https://cdn.brandfetch.io/apple.com',
        expect.any(Object)
      );
    });

    it('should return CDN logo for company', async () => {
      const results = await client.search('microsoft');

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://cdn.brandfetch.io/microsoft.com');
      expect(results[0].format).toBe('png');
    });

    it('should use CDN endpoint by default', async () => {
      const results = await client.search('test');

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://cdn.brandfetch.io/test.com');
    });

    it('should return empty array when CDN returns 404', async () => {
      vi.mocked(mockAxios.head).mockRejectedValue({
        response: { status: 404 },
      });

      const results = await client.search('nonexistent');

      expect(results).toHaveLength(0);
    });

    it('should return empty array for invalid query', async () => {
      const results = await client.search('');

      expect(results).toHaveLength(0);
      expect(mockAxios.head).not.toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      vi.mocked(mockAxios.head).mockRejectedValue(new Error('Network error'));

      const results = await client.search('google');

      expect(results).toHaveLength(0);
    });

    it('should handle www prefix in URLs', async () => {
      const results = await client.search('www.amazon.com');

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://cdn.brandfetch.io/amazon.com');
      expect(results[0].companyName).toBe('amazon');
    });

    it('should handle company names with spaces', async () => {
      const results = await client.search('red bull');

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://cdn.brandfetch.io/redbull.com');
      expect(results[0].companyName).toBe('red bull');
    });

    it('should handle domain without protocol', async () => {
      const results = await client.search('microsoft.com');

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://cdn.brandfetch.io/microsoft.com');
      expect(results[0].companyName).toBe('microsoft');
    });
  });

  describe('API search with key', () => {
    it('should use API endpoint when API key is provided', async () => {
      const clientWithKey = new BrandfetchClient(mockAxios, 'test-api-key');
      
      const mockResponse = {
        status: 200,
        data: {
          name: 'Test',
          domain: 'test.com',
          logos: [
            {
              type: 'logo',
              theme: 'light',
              formats: [
                {
                  src: 'https://example.com/logo.png',
                  background: 'transparent',
                  format: 'png',
                  width: 512,
                  height: 512,
                },
              ],
            },
          ],
        },
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await clientWithKey.search('test');

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://api.brandfetch.io/v2/brands/test.com',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-api-key',
          },
        })
      );
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://example.com/logo.png');
    });

    it('should fallback to CDN when API fails', async () => {
      const clientWithKey = new BrandfetchClient(mockAxios, 'test-api-key');
      
      vi.mocked(mockAxios.get).mockRejectedValue({
        response: { status: 404 },
      });

      const results = await clientWithKey.search('test');

      // Should fallback to CDN
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://cdn.brandfetch.io/test.com');
    });
  });

  describe('quality and format', () => {
    it('should mark CDN logos as high quality', async () => {
      const results = await client.search('test');

      expect(results[0].quality).toBe('high');
    });

    it('should mark CDN logos as PNG format', async () => {
      const results = await client.search('test');

      expect(results[0].format).toBe('png');
    });

    it('should mark CDN logos as transparent', async () => {
      const results = await client.search('test');

      expect(results[0].transparent).toBe(true);
    });
  });

  describe('domain extraction', () => {
    it('should extract domain from various URL formats', async () => {
      const testCases = [
        { input: 'https://example.com', expected: 'example.com' },
        { input: 'http://www.example.com', expected: 'example.com' },
        { input: 'www.example.com', expected: 'example.com' },
        { input: 'example.com', expected: 'example.com' },
        { input: 'example', expected: 'example.com' },
      ];

      for (const testCase of testCases) {
        const results = await client.search(testCase.input);
        expect(results[0].url).toBe(`https://cdn.brandfetch.io/${testCase.expected}`);
      }
    });
  });

  describe('logo result properties', () => {
    it('should generate unique IDs for each result', async () => {
      const results1 = await client.search('company1');
      const results2 = await client.search('company2');

      expect(results1[0].id).not.toBe(results2[0].id);
    });

    it('should set correct source', async () => {
      const results = await client.search('test');

      expect(results[0].source).toBe(LogoSource.BRANDFETCH);
    });

    it('should include creation timestamp', async () => {
      const results = await client.search('test');

      expect(results[0].createdAt).toBeInstanceOf(Date);
    });
  });
});
