import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogoDevClient } from './LogoDevClient';
import { LogoSource } from '../types';
import { AxiosInstance } from 'axios';

describe('LogoDevClient', () => {
  let client: LogoDevClient;
  let mockAxios: AxiosInstance;

  beforeEach(() => {
    // Create a mock Axios instance
    mockAxios = {
      head: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
    } as any;

    client = new LogoDevClient(mockAxios);
  });

  describe('search', () => {
    it('should return logo result for valid company name', async () => {
      // Mock successful HEAD request
      vi.mocked(mockAxios.head).mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        config: {} as any,
        statusText: 'OK',
      });

      const results = await client.search('google');

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        url: 'https://img.logo.dev/google.com',
        source: LogoSource.LOGO_DEV,
        format: 'png',
        transparent: true,
        quality: 'high',
        companyName: 'google',
      });
      expect(results[0].id).toBeDefined();
      expect(results[0].createdAt).toBeInstanceOf(Date);
    });

    it('should handle domain URLs correctly', async () => {
      vi.mocked(mockAxios.head).mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        config: {} as any,
        statusText: 'OK',
      });

      const results = await client.search('https://www.apple.com');

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://img.logo.dev/apple.com');
      expect(results[0].companyName).toBe('apple');
    });

    it('should handle domain without protocol', async () => {
      vi.mocked(mockAxios.head).mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        config: {} as any,
        statusText: 'OK',
      });

      const results = await client.search('microsoft.com');

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://img.logo.dev/microsoft.com');
      expect(results[0].companyName).toBe('microsoft');
    });

    it('should return empty array when logo does not exist', async () => {
      // Mock failed HEAD request (404)
      vi.mocked(mockAxios.head).mockRejectedValue({
        response: { status: 404 },
      });

      const results = await client.search('nonexistentcompany');

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
      vi.mocked(mockAxios.head).mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        config: {} as any,
        statusText: 'OK',
      });

      const results = await client.search('www.amazon.com');

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://img.logo.dev/amazon.com');
      expect(results[0].companyName).toBe('amazon');
    });

    it('should handle company names with spaces', async () => {
      vi.mocked(mockAxios.head).mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        config: {} as any,
        statusText: 'OK',
      });

      const results = await client.search('red bull');

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://img.logo.dev/redbull.com');
      expect(results[0].companyName).toBe('red bull');
    });
  });

  describe('getLogoUrl', () => {
    it('should return base URL without size parameter', () => {
      const url = client.getLogoUrl('google.com');

      expect(url).toBe('https://img.logo.dev/google.com');
    });

    it('should include size parameter when provided', () => {
      const url = client.getLogoUrl('google.com', 256);

      expect(url).toBe('https://img.logo.dev/google.com?size=256');
    });

    it('should handle different size values', () => {
      const url128 = client.getLogoUrl('apple.com', 128);
      const url512 = client.getLogoUrl('apple.com', 512);

      expect(url128).toBe('https://img.logo.dev/apple.com?size=128');
      expect(url512).toBe('https://img.logo.dev/apple.com?size=512');
    });
  });

  describe('domain extraction', () => {
    it('should extract domain from various URL formats', async () => {
      vi.mocked(mockAxios.head).mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        config: {} as any,
        statusText: 'OK',
      });

      const testCases = [
        { input: 'https://example.com', expected: 'example.com' },
        { input: 'http://www.example.com', expected: 'example.com' },
        { input: 'www.example.com', expected: 'example.com' },
        { input: 'example.com', expected: 'example.com' },
        { input: 'example', expected: 'example.com' },
      ];

      for (const testCase of testCases) {
        const results = await client.search(testCase.input);
        expect(results[0].url).toBe(`https://img.logo.dev/${testCase.expected}`);
      }
    });
  });

  describe('logo result properties', () => {
    it('should set correct default properties', async () => {
      vi.mocked(mockAxios.head).mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        config: {} as any,
        statusText: 'OK',
      });

      const results = await client.search('test');

      expect(results[0]).toMatchObject({
        source: LogoSource.LOGO_DEV,
        format: 'png',
        size: { width: 0, height: 0 },
        transparent: true,
        quality: 'high',
      });
    });

    it('should generate unique IDs for each result', async () => {
      vi.mocked(mockAxios.head).mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
        config: {} as any,
        statusText: 'OK',
      });

      const results1 = await client.search('company1');
      const results2 = await client.search('company2');

      expect(results1[0].id).not.toBe(results2[0].id);
    });
  });
});
