import axios from 'axios';
import fs from 'fs';
import path from 'path';

export interface ImageInfo {
  format: 'png' | 'svg' | 'jpg' | 'webp';
  width: number;
  height: number;
  size: number; // File size in bytes
  hasTransparency: boolean;
  isValid: boolean;
}

export interface OptimizedImage {
  originalPath: string;
  thumbnailPath?: string;
  mediumPath?: string;
  info: ImageInfo;
}

export class ImageProcessor {
  private static readonly SUPPORTED_FORMATS = ['png', 'svg', 'jpg', 'jpeg', 'webp'];
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly THUMBNAIL_SIZE = 64;
  private static readonly MEDIUM_SIZE = 256;

  /**
   * Validate a logo URL without downloading
   */
  static async validateLogoUrl(url: string): Promise<boolean> {
    try {
      // Basic URL validation
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // Check if URL points to a supported image format
      const pathname = urlObj.pathname.toLowerCase();
      const hasImageExtension = this.SUPPORTED_FORMATS.some(format => 
        pathname.endsWith(`.${format}`)
      );

      // If no extension, try HEAD request to check content type
      if (!hasImageExtension) {
        try {
          const response = await axios.head(url, {
            timeout: 5000,
            maxRedirects: 3
          });
          
          const contentType = response.headers['content-type'] || '';
          return this.isImageContentType(contentType);
        } catch {
          // If HEAD fails, assume it might be valid (some servers don't support HEAD)
          return true;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Download and analyze image information
   */
  static async downloadAndAnalyze(url: string, maxSize: number = this.MAX_FILE_SIZE): Promise<{
    buffer: Buffer;
    info: ImageInfo;
  }> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        maxContentLength: maxSize,
        headers: {
          'User-Agent': 'LogoBuddy/1.0'
        }
      });

      const buffer = Buffer.from(response.data);
      const contentType = response.headers['content-type'] || '';
      
      // Analyze the image
      const info = await this.analyzeImageBuffer(buffer, contentType, url);
      
      if (!info.isValid) {
        throw new Error('Invalid image format or corrupted file');
      }

      return { buffer, info };
    } catch (error) {
      throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze image buffer to extract metadata
   */
  static async analyzeImageBuffer(buffer: Buffer, contentType: string, url: string): Promise<ImageInfo> {
    const format = this.detectImageFormat(buffer, contentType, url);
    
    if (!format) {
      return {
        format: 'png',
        width: 0,
        height: 0,
        size: buffer.length,
        hasTransparency: false,
        isValid: false
      };
    }

    try {
      const dimensions = await this.extractDimensions(buffer, format);
      const hasTransparency = this.detectTransparency(buffer, format);

      return {
        format,
        width: dimensions.width,
        height: dimensions.height,
        size: buffer.length,
        hasTransparency,
        isValid: true
      };
    } catch (error) {
      console.warn('Failed to analyze image:', error);
      return {
        format,
        width: 0,
        height: 0,
        size: buffer.length,
        hasTransparency: false,
        isValid: false
      };
    }
  }

  /**
   * Detect image format from buffer, content type, and URL
   */
  private static detectImageFormat(buffer: Buffer, contentType: string, url: string): 'png' | 'svg' | 'jpg' | 'webp' | null {
    // Check magic bytes first (most reliable)
    if (buffer.length >= 8) {
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return 'png';
      }
      
      // JPEG: FF D8 FF
      if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'jpg';
      }
      
      // WebP: RIFF....WEBP
      if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
        return 'webp';
      }
      
      // SVG: Check for XML declaration or <svg
      const start = buffer.toString('utf8', 0, Math.min(200, buffer.length)).toLowerCase();
      if (start.includes('<svg') || start.includes('<?xml')) {
        return 'svg';
      }
    }

    // Fallback to content type
    if (contentType.includes('png')) return 'png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
    if (contentType.includes('svg')) return 'svg';
    if (contentType.includes('webp')) return 'webp';

    // Fallback to URL extension
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.png')) return 'png';
    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'jpg';
    if (urlLower.includes('.svg')) return 'svg';
    if (urlLower.includes('.webp')) return 'webp';

    return null;
  }

  /**
   * Extract image dimensions from buffer
   */
  private static async extractDimensions(buffer: Buffer, format: string): Promise<{ width: number; height: number }> {
    switch (format) {
      case 'png':
        return this.extractPngDimensions(buffer);
      case 'jpg':
        return this.extractJpegDimensions(buffer);
      case 'webp':
        return this.extractWebpDimensions(buffer);
      case 'svg':
        return this.extractSvgDimensions(buffer);
      default:
        return { width: 0, height: 0 };
    }
  }

  /**
   * Extract PNG dimensions from IHDR chunk
   */
  private static extractPngDimensions(buffer: Buffer): { width: number; height: number } {
    if (buffer.length < 24) {
      throw new Error('Invalid PNG file');
    }
    
    // PNG IHDR chunk starts at byte 16
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    
    return { width, height };
  }

  /**
   * Extract JPEG dimensions from SOF marker
   */
  private static extractJpegDimensions(buffer: Buffer): { width: number; height: number } {
    let offset = 2; // Skip SOI marker
    
    while (offset < buffer.length - 4) {
      // Find SOF marker (0xFFC0 to 0xFFC3)
      if (buffer[offset] === 0xFF && (buffer[offset + 1] >= 0xC0 && buffer[offset + 1] <= 0xC3)) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }
      
      // Skip to next marker
      if (buffer[offset] === 0xFF) {
        const markerLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + markerLength;
      } else {
        offset++;
      }
    }
    
    throw new Error('Could not find JPEG dimensions');
  }

  /**
   * Extract WebP dimensions
   */
  private static extractWebpDimensions(buffer: Buffer): { width: number; height: number } {
    if (buffer.length < 30) {
      throw new Error('Invalid WebP file');
    }
    
    // Simple WebP format
    if (buffer.toString('ascii', 12, 16) === 'VP8 ') {
      const width = buffer.readUInt16LE(26) & 0x3FFF;
      const height = buffer.readUInt16LE(28) & 0x3FFF;
      return { width, height };
    }
    
    // Extended WebP format
    if (buffer.toString('ascii', 12, 16) === 'VP8X') {
      const width = (buffer.readUInt32LE(24) & 0xFFFFFF) + 1;
      const height = (buffer.readUInt32LE(27) & 0xFFFFFF) + 1;
      return { width, height };
    }
    
    throw new Error('Unsupported WebP format');
  }

  /**
   * Extract SVG dimensions from XML attributes
   */
  private static extractSvgDimensions(buffer: Buffer): { width: number; height: number } {
    const svgContent = buffer.toString('utf8');
    
    // Try to find width and height attributes
    const widthMatch = svgContent.match(/width\s*=\s*["']?(\d+(?:\.\d+)?)/i);
    const heightMatch = svgContent.match(/height\s*=\s*["']?(\d+(?:\.\d+)?)/i);
    
    if (widthMatch && heightMatch) {
      return {
        width: parseInt(widthMatch[1]),
        height: parseInt(heightMatch[1])
      };
    }
    
    // Try viewBox as fallback
    const viewBoxMatch = svgContent.match(/viewBox\s*=\s*["']?[^"']*?(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/i);
    if (viewBoxMatch) {
      return {
        width: parseInt(viewBoxMatch[3]), // Third value is width
        height: parseInt(viewBoxMatch[4]) // Fourth value is height
      };
    }
    
    // Default SVG size if no dimensions found
    return { width: 100, height: 100 };
  }

  /**
   * Detect if image has transparency
   */
  private static detectTransparency(buffer: Buffer, format: string): boolean {
    switch (format) {
      case 'png':
        return this.pngHasTransparency(buffer);
      case 'svg':
        return true; // SVGs can have transparency
      case 'webp':
        return true; // WebP supports transparency
      case 'jpg':
        return false; // JPEG doesn't support transparency
      default:
        return false;
    }
  }

  /**
   * Check if PNG has transparency
   */
  private static pngHasTransparency(buffer: Buffer): boolean {
    let offset = 8; // Skip PNG signature
    
    while (offset < buffer.length - 8) {
      const chunkLength = buffer.readUInt32BE(offset);
      const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
      
      if (chunkType === 'IHDR') {
        const colorType = buffer[offset + 17];
        // Color types 4 and 6 have alpha channel
        // Color type 3 (palette) might have transparency
        return colorType === 4 || colorType === 6 || colorType === 3;
      }
      
      if (chunkType === 'tRNS') {
        return true; // Transparency chunk found
      }
      
      offset += 12 + chunkLength; // Move to next chunk
    }
    
    return false;
  }

  /**
   * Check if content type indicates an image
   */
  private static isImageContentType(contentType: string): boolean {
    const imageTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/svg+xml',
      'image/webp'
    ];
    
    return imageTypes.some(type => contentType.toLowerCase().includes(type));
  }

  /**
   * Save image with multiple sizes (original, medium, thumbnail)
   */
  static async saveOptimizedImage(
    buffer: Buffer,
    info: ImageInfo,
    baseFilename: string,
    cacheDir: string
  ): Promise<OptimizedImage> {
    const extension = info.format;
    const originalPath = path.join(cacheDir, `${baseFilename}.${extension}`);
    
    // Save original
    fs.writeFileSync(originalPath, buffer);
    
    const result: OptimizedImage = {
      originalPath,
      info
    };

    // For now, we'll just save the original
    // In a production app, you might want to use a library like Sharp for resizing
    // But since we're keeping dependencies minimal, we'll skip thumbnail generation
    
    return result;
  }

  /**
   * Get file size in a human-readable format
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}