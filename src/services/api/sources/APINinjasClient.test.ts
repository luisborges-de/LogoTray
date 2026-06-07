import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APINinjasClient } from './APINinjasClient';
import { LogoSource } from '../types';
import { AxiosInstance } from 'axios';

describe('APINinjasClient', () => {
  let client: APINinjasClient;
  let mockAxios: AxiosInstance;

  beforeEach(() => {
    mockAxios = {
      get: vi.fn(),
      head: vi.fn(),
      post: vi.fn(),
    } as any;

    client = new APINinjasClient(mockAxios, 'test-api-key');
  });

  describe('search functionality', () => {
    it('should return logo results for valid company name', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Google Inc.',
            ticker: 'GOOGL',
            logo: 'https://example.com/google-logo.png',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('google');

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://api.api-ninjas.com/v1/logo',
        expect.objectContaining({
          headers: {
            'X-Api-Key': 'test-api-key',
          },
          params: {
            name: 'google',
          },
          timeout: 10000,
          validateStatus: expect.any(Function),
        })
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        url: 'https://example.com/google-logo.png',
        source: LogoSource.API_NINJAS,
        format: 'png',
        transparent: true,
        quality: 'medium',
        companyName: 'Google Inc.',
      });
      expect(results[0].id).toBeDefined();
      expect(results[0].createdAt).toBeInstanceOf(Date);
    });

    it('should handle multiple logo results', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Apple Inc.',
            ticker: 'AAPL',
            logo: 'https://example.com/apple-logo.png',
          },
          {
            name: 'Apple Computer',
            logo: 'https://example.com/apple-alt-logo.svg',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('apple');

      expect(results).toHaveLength(2);
      expect(results[0].companyName).toBe('Apple Inc.');
      expect(results[1].companyName).toBe('Apple Computer');
      expect(results[1].format).toBe('svg');
    });

    it('should limit results to maximum of 3', async () => {
      const mockResponse = {
        status: 200,
        data: [
          { name: 'Company 1', logo: 'https://example.com/logo1.png' },
          { name: 'Company 2', logo: 'https://example.com/logo2.png' },
          { name: 'Company 3', logo: 'https://example.com/logo3.png' },
          { name: 'Company 4', logo: 'https://example.com/logo4.png' },
          { name: 'Company 5', logo: 'https://example.com/logo5.png' },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('company');

      expect(results).toHaveLength(3);
    });

    it('should return empty array when no API key is provided', async () => {
      const clientWithoutKey = new APINinjasClient(mockAxios);

      const results = await clientWithoutKey.search('google');

      expect(results).toHaveLength(0);
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('should return empty array when API returns empty response', async () => {
      const mockResponse = {
        status: 200,
        data: [],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('nonexistent');

      expect(results).toHaveLength(0);
    });

    it('should return empty array when API returns null data', async () => {
      const mockResponse = {
        status: 200,
        data: null,
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('test');

      expect(results).toHaveLength(0);
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(mockAxios.get).mockRejectedValue({
        response: { status: 404 },
      });

      const results = await client.search('google');

      expect(results).toHaveLength(0);
    });

    it('should handle network errors gracefully', async () => {
      vi.mocked(mockAxios.get).mockRejectedValue(new Error('Network error'));

      const results = await client.search('google');

      expect(results).toHaveLength(0);
    });

    it('should return empty array for empty query', async () => {
      const results = await client.search('');

      expect(results).toHaveLength(0);
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('should return empty array for whitespace-only query', async () => {
      const results = await client.search('   ');

      expect(results).toHaveLength(0);
      expect(mockAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('company name extraction', () => {
    it('should extract company name from domain URLs', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Microsoft Corporation',
            logo: 'https://example.com/microsoft-logo.png',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('https://www.microsoft.com');

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://api.api-ninjas.com/v1/logo',
        expect.objectContaining({
          params: {
            name: 'microsoft',
          },
        })
      );
    });

    it('should handle domain without protocol', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Amazon',
            logo: 'https://example.com/amazon-logo.png',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('amazon.com');

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://api.api-ninjas.com/v1/logo',
        expect.objectContaining({
          params: {
            name: 'amazon',
          },
        })
      );
    });

    it('should handle company names as-is', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Tesla Inc.',
            logo: 'https://example.com/tesla-logo.png',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('Tesla');

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://api.api-ninjas.com/v1/logo',
        expect.objectContaining({
          params: {
            name: 'Tesla',
          },
        })
      );
    });
  });

  describe('format detection', () => {
    it('should detect PNG format from URL', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Test Company',
            logo: 'https://example.com/logo.png',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('test');

      expect(results[0].format).toBe('png');
      expect(results[0].transparent).toBe(true);
    });

    it('should detect SVG format from URL', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Test Company',
            logo: 'https://example.com/logo.svg',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('test');

      expect(results[0].format).toBe('svg');
      expect(results[0].transparent).toBe(true);
    });

    it('should detect JPG format from URL', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Test Company',
            logo: 'https://example.com/logo.jpg',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('test');

      expect(results[0].format).toBe('jpg');
      expect(results[0].transparent).toBe(false);
    });

    it('should default to PNG format for unknown extensions', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Test Company',
            logo: 'https://example.com/logo',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('test');

      expect(results[0].format).toBe('png');
    });
  });

  describe('URL validation', () => {
    it('should filter out invalid URLs', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Valid Company',
            logo: 'https://example.com/valid-logo.png',
          },
          {
            name: 'Invalid Company',
            logo: 'not-a-valid-url',
          },
          {
            name: 'Empty Logo Company',
            logo: '',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('test');

      expect(results).toHaveLength(1);
      expect(results[0].companyName).toBe('Valid Company');
    });

    it('should accept HTTP and HTTPS URLs', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'HTTPS Company',
            logo: 'https://example.com/logo.png',
          },
          {
            name: 'HTTP Company',
            logo: 'http://example.com/logo.png',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('test');

      expect(results).toHaveLength(2);
    });
  });

  describe('logo result properties', () => {
    it('should generate unique IDs for each result', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Company 1',
            logo: 'https://example.com/logo1.png',
          },
          {
            name: 'Company 2',
            logo: 'https://example.com/logo2.png',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('test');

      expect(results[0].id).not.toBe(results[1].id);
    });

    it('should set correct source', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Test Company',
            logo: 'https://example.com/logo.png',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('test');

      expect(results[0].source).toBe(LogoSource.API_NINJAS);
    });

    it('should set medium quality for all results', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Test Company',
            logo: 'https://example.com/logo.png',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('test');

      expect(results[0].quality).toBe('medium');
    });

    it('should include creation timestamp', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Test Company',
            logo: 'https://example.com/logo.png',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('test');

      expect(results[0].createdAt).toBeInstanceOf(Date);
    });

    it('should set size to 0x0 when unknown', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Test Company',
            logo: 'https://example.com/logo.png',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('test');

      expect(results[0].size).toEqual({ width: 0, height: 0 });
    });

    it('should use API response name when available', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Official Company Name Inc.',
            logo: 'https://example.com/logo.png',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('company');

      expect(results[0].companyName).toBe('Official Company Name Inc.');
    });

    it('should fallback to extracted name when API name is missing', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            logo: 'https://example.com/logo.png',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      const results = await client.search('company');

      expect(results[0].companyName).toBe('company');
    });
  });

  describe('environment variable API key', () => {
    it('should use environment variable when no API key provided', async () => {
      // Mock environment variable
      const originalEnv = process.env.API_NINJAS_API_KEY;
      process.env.API_NINJAS_API_KEY = 'env-api-key';

      const clientWithEnvKey = new APINinjasClient(mockAxios);

      const mockResponse = {
        status: 200,
        data: [
          {
            name: 'Test Company',
            logo: 'https://example.com/logo.png',
          },
        ],
        headers: {},
        config: {} as any,
        statusText: 'OK',
      };

      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse);

      await clientWithEnvKey.search('test');

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://api.api-ninjas.com/v1/logo',
        expect.objectContaining({
          headers: {
            'X-Api-Key': 'env-api-key',
          },
        })
      );

      // Restore environment variable
      if (originalEnv !== undefined) {
        process.env.API_NINJAS_API_KEY = originalEnv;
      } else {
        delete process.env.API_NINJAS_API_KEY;
      }
    });
  });
});