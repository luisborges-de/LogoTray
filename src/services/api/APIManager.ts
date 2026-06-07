import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { LogoResult, LogoSource } from './types';
import { LogoDevClient, BrandfetchClient, APINinjasClient, WikidataClient, IconHorseClient } from './sources';
import { perf } from '../../utils/performance';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

interface APIManagerConfig {
  timeout?: number;
  retryConfig?: RetryConfig;
}

export class APIManager {
  private client: AxiosInstance;
  private retryConfig: RetryConfig;
  private logoDevClient: LogoDevClient;
  private brandfetchClient: BrandfetchClient;
  private apiNinjasClient: APINinjasClient;
  private wikidataClient: WikidataClient;
  private iconHorseClient: IconHorseClient;
  private searchCache = new Map<string, { results: LogoResult[]; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in-memory cache

  constructor(config: APIManagerConfig = {}) {
    this.client = axios.create({
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.retryConfig = config.retryConfig || {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
    };

    this.setupInterceptors();
    
    // Initialize logo source clients with API tokens
    const logoDevToken = 'pk_fkWpQm9pSLWCz80Pld9uvQ';
    const apiNinjasKey = 'CdKBhgDVKg6Y/972Ekk2eQ==vjWMINjoEHfUVDbH';
    this.logoDevClient = new LogoDevClient(this.client, logoDevToken);
    this.brandfetchClient = new BrandfetchClient(this.client);
    this.apiNinjasClient = new APINinjasClient(this.client, apiNinjasKey);
    this.wikidataClient = new WikidataClient(this.client);
    this.iconHorseClient = new IconHorseClient(this.client);
  }

  private setupInterceptors(): void {
    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as AxiosRequestConfig & { retryCount?: number };
        
        if (!config) {
          return Promise.reject(error);
        }

        // Initialize retry count
        config.retryCount = config.retryCount || 0;

        // Check if we should retry
        if (this.shouldRetry(error, config.retryCount)) {
          config.retryCount += 1;

          // Calculate delay with exponential backoff
          const delay = this.calculateBackoffDelay(config.retryCount);

          // Wait before retrying
          await this.sleep(delay);

          // Retry the request
          return this.client(config);
        }

        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: AxiosError, retryCount: number): boolean {
    // Don't retry if max retries reached
    if (retryCount >= this.retryConfig.maxRetries) {
      return false;
    }

    // Retry on network errors
    if (!error.response) {
      return true;
    }

    // Retry on specific status codes
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    return retryableStatusCodes.includes(error.response.status);
  }

  private calculateBackoffDelay(retryCount: number): number {
    // Exponential backoff: baseDelay * 2^(retryCount - 1)
    const delay = this.retryConfig.baseDelay * Math.pow(2, retryCount - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    
    // Cap at maxDelay
    return Math.min(delay + jitter, this.retryConfig.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Search for logos across all sources with performance optimizations
   */
  async searchLogos(query: string): Promise<LogoResult[]> {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Check in-memory cache first
    const cached = this.searchCache.get(normalizedQuery);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      perf.measure('search-cache-hit', () => {
        console.log(`Cache hit for query: ${query}`);
      });
      return cached.results;
    }

    return perf.measureAsync('search-logos-total', async () => {
      const primarySources = [
        LogoSource.LOGO_DEV,
        LogoSource.BRANDFETCH,
        LogoSource.API_NINJAS,
        LogoSource.WIKIDATA,
      ];

      // Search primary sources in parallel with timeout
      const searchPromises = primarySources.map((source) =>
        Promise.race([
          this.searchSource(source, query),
          new Promise<LogoResult[]>((_, reject) => 
            setTimeout(() => reject(new Error(`${source} timeout`)), 8000)
          )
        ]).catch((error) => {
          console.warn(`Search failed for ${source}:`, error.message);
          return [];
        })
      );

      const results = await Promise.all(searchPromises);
      const allResults = results.flat();
      
      // If no results from primary sources, use IconHorse as fallback
      if (allResults.length === 0) {
        try {
          const fallbackResults = await perf.measureAsync('search-fallback', () =>
            this.searchSource(LogoSource.ICONHORSE, query)
          );
          allResults.push(...fallbackResults);
        } catch (error) {
          console.warn('Fallback search failed:', error);
        }
      }
      
      // Deduplicate and cache results
      const finalResults = this.deduplicateResults(allResults);
      
      // Cache results in memory
      this.searchCache.set(normalizedQuery, {
        results: finalResults,
        timestamp: Date.now(),
      });

      // Clean up old cache entries
      this.cleanupCache();
      
      return finalResults;
    });
  }

  /**
   * Search a specific logo source with performance tracking
   */
  async searchSource(source: LogoSource, query: string): Promise<LogoResult[]> {
    return perf.measureAsync(`search-${source}`, async () => {
      switch (source) {
        case LogoSource.LOGO_DEV:
          return this.logoDevClient.search(query);
        
        case LogoSource.BRANDFETCH:
          return this.brandfetchClient.search(query);
        
        case LogoSource.API_NINJAS:
          return this.apiNinjasClient.search(query);
        
        case LogoSource.WIKIDATA:
          return this.wikidataClient.search(query);
        
        case LogoSource.ICONHORSE:
          return this.iconHorseClient.search(query);
        
        default:
          return [];
      }
    }, { source, query: query.substring(0, 20) });
  }

  /**
   * Clean up old cache entries to prevent memory leaks
   */
  private cleanupCache(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];
    
    for (const [key, value] of this.searchCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        entriesToDelete.push(key);
      }
    }
    
    entriesToDelete.forEach(key => this.searchCache.delete(key));
    
    // Limit cache size to prevent memory issues
    if (this.searchCache.size > 100) {
      const entries = Array.from(this.searchCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20 entries
      for (let i = 0; i < 20 && i < entries.length; i++) {
        this.searchCache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Clear the in-memory cache
   */
  clearCache(): void {
    this.searchCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; oldestEntry: number; newestEntry: number } {
    let oldestEntry = Date.now();
    let newestEntry = 0;
    
    for (const value of this.searchCache.values()) {
      if (value.timestamp < oldestEntry) oldestEntry = value.timestamp;
      if (value.timestamp > newestEntry) newestEntry = value.timestamp;
    }
    
    return {
      size: this.searchCache.size,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Validate if a logo URL is accessible
   */
  async validateLogoUrl(url: string): Promise<boolean> {
    try {
      // Skip validation for known CDN providers that might block HEAD requests
      if (url.includes('cdn.brandfetch.io') || url.includes('logo.dev')) {
        return true; // Trust these CDN providers
      }

      const response = await this.client.head(url, {
        timeout: 3000,
      });
      return response.status === 200;
    } catch (error) {
      // For CDN URLs, try a GET request with range header as fallback
      if (url.includes('cdn.') || url.includes('logo')) {
        try {
          const response = await this.client.get(url, {
            timeout: 3000,
            headers: { 'Range': 'bytes=0-1023' }, // Only fetch first 1KB
          });
          return response.status === 200 || response.status === 206;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Filter out logos with invalid/inaccessible URLs
   */
  private async filterValidLogos(results: LogoResult[]): Promise<LogoResult[]> {
    // Validate URLs in parallel but limit concurrency to avoid overwhelming servers
    const batchSize = 5;
    const validResults: LogoResult[] = [];
    
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      const validationPromises = batch.map(async (result) => {
        const isValid = await this.validateLogoUrl(result.url);
        return isValid ? result : null;
      });
      
      const batchResults = await Promise.all(validationPromises);
      validResults.push(...batchResults.filter((result): result is LogoResult => result !== null));
    }
    
    return validResults;
  }

  /**
   * Deduplicate logo results based on URL similarity
   */
  private deduplicateResults(results: LogoResult[]): LogoResult[] {
    const seen = new Map<string, LogoResult>();

    for (const result of results) {
      const key = this.normalizeUrl(result.url);
      
      if (!seen.has(key)) {
        seen.set(key, result);
      } else {
        // Keep the higher quality result
        const existing = seen.get(key)!;
        if (this.compareQuality(result, existing) > 0) {
          seen.set(key, result);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Normalize URL for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove protocol and www, convert to lowercase
      return urlObj.hostname.replace(/^www\./, '') + urlObj.pathname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Compare quality of two logo results
   * Returns positive if a is better, negative if b is better, 0 if equal
   */
  private compareQuality(a: LogoResult, b: LogoResult): number {
    // Quality score weights
    const qualityScores = { high: 3, medium: 2, low: 1 };
    const formatScores = { svg: 3, png: 2, jpg: 1 };

    let scoreA = qualityScores[a.quality] + formatScores[a.format];
    let scoreB = qualityScores[b.quality] + formatScores[b.format];

    // Bonus for transparent backgrounds
    if (a.transparent) scoreA += 2;
    if (b.transparent) scoreB += 2;

    return scoreA - scoreB;
  }

  /**
   * Make a GET request with retry logic
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * Make a POST request with retry logic
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }
}
