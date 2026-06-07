import { LogoResult, LogoSource } from '../api/types';

// Cache types and interfaces
export interface SearchCache {
  id: string;
  query: string;
  results: LogoResult[];
  createdAt: Date;
  expiresAt: Date;
  sources: LogoSource[];
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

export interface CacheConfig {
  maxSizeBytes: number;
  expirationDays: number;
  maxImageSizeBytes: number;
  enableImageOptimization: boolean;
  cleanupThresholdPercent: number;
}

// Re-export image processing types
export { ImageInfo, OptimizedImage } from './ImageProcessor';
