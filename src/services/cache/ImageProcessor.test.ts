import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImageProcessor } from './ImageProcessor';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';

describe('ImageProcessor', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'imageprocessor-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('validateLogoUrl', () => {
    it('should validate valid image URLs', async () => {
      const validUrls = [
        'https://example.com/logo.png',
        'https://example.com/logo.jpg',
        'https://example.com/logo.svg',
        'https://example.com/logo.webp',
        'http://example.com/image.jpeg'
      ];

      for (const url of validUrls) {
        const result = await ImageProcessor.validateLogoUrl(url);
        expect(result).toBe(true);
      }
    });

    it('should reject invalid URLs', async () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com/logo.png',
        'file:///local/file.png',
        '',
        'javascript:alert(1)'
      ];

      for (const url of invalidUrls) {
        const result = await ImageProcessor.validateLogoUrl(url);
        expect(result).toBe(false);
      }
    });
  });

  describe('detectImageFormat', () => {
    it('should detect PNG format from magic bytes', async () => {
      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const result = await ImageProcessor.analyzeImageBuffer(pngBuffer, '', 'test.png');
      expect(result.format).toBe('png');
    });

    it('should detect JPEG format from magic bytes', async () => {
      // JPEG magic bytes: FF D8 FF
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      const result = await ImageProcessor.analyzeImageBuffer(jpegBuffer, '', 'test.jpg');
      expect(result.format).toBe('jpg');
    });

    it('should detect SVG format from content', async () => {
      const svgContent = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
      const svgBuffer = Buffer.from(svgContent, 'utf8');
      const result = await ImageProcessor.analyzeImageBuffer(svgBuffer, 'image/svg+xml', 'test.svg');
      expect(result.format).toBe('svg');
    });

    it('should fallback to content type detection', async () => {
      const buffer = Buffer.from('fake image data');
      const result = await ImageProcessor.analyzeImageBuffer(buffer, 'image/png', 'unknown');
      expect(result.format).toBe('png');
    });

    it('should fallback to URL extension detection', async () => {
      const buffer = Buffer.from('fake image data');
      const result = await ImageProcessor.analyzeImageBuffer(buffer, '', 'test.jpg');
      expect(result.format).toBe('jpg');
    });
  });

  describe('extractDimensions', () => {
    it('should extract PNG dimensions correctly', async () => {
      // Create a minimal PNG with known dimensions (100x200)
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x64, // Width: 100
        0x00, 0x00, 0x00, 0xC8, // Height: 200
        0x08, 0x02, 0x00, 0x00, 0x00 // Color type, etc.
      ]);

      const result = await ImageProcessor.analyzeImageBuffer(pngBuffer, 'image/png', 'test.png');
      expect(result.width).toBe(100);
      expect(result.height).toBe(200);
    });

    it('should extract SVG dimensions from attributes', async () => {
      const svgContent = '<svg width="150" height="300" xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
      const svgBuffer = Buffer.from(svgContent, 'utf8');
      
      const result = await ImageProcessor.analyzeImageBuffer(svgBuffer, 'image/svg+xml', 'test.svg');
      expect(result.width).toBe(150);
      expect(result.height).toBe(300);
    });

    it('should extract SVG dimensions from viewBox', async () => {
      const svgContent = '<svg viewBox="0 0 250 400" xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
      const svgBuffer = Buffer.from(svgContent, 'utf8');
      
      const result = await ImageProcessor.analyzeImageBuffer(svgBuffer, 'image/svg+xml', 'test.svg');
      expect(result.width).toBe(250);
      expect(result.height).toBe(400);
    });

    it('should use default SVG dimensions when none found', async () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
      const svgBuffer = Buffer.from(svgContent, 'utf8');
      
      const result = await ImageProcessor.analyzeImageBuffer(svgBuffer, 'image/svg+xml', 'test.svg');
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });
  });

  describe('detectTransparency', () => {
    it('should detect PNG transparency from color type', async () => {
      // PNG with RGBA color type (6)
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x64, // Width: 100
        0x00, 0x00, 0x00, 0xC8, // Height: 200
        0x08, 0x06, 0x00, 0x00, 0x00 // Color type 6 (RGBA)
      ]);

      const result = await ImageProcessor.analyzeImageBuffer(pngBuffer, 'image/png', 'test.png');
      expect(result.hasTransparency).toBe(true);
    });

    it('should detect SVG transparency', async () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
      const svgBuffer = Buffer.from(svgContent, 'utf8');
      
      const result = await ImageProcessor.analyzeImageBuffer(svgBuffer, 'image/svg+xml', 'test.svg');
      expect(result.hasTransparency).toBe(true);
    });

    it('should detect JPEG has no transparency', async () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      const result = await ImageProcessor.analyzeImageBuffer(jpegBuffer, 'image/jpeg', 'test.jpg');
      expect(result.hasTransparency).toBe(false);
    });
  });

  describe('saveOptimizedImage', () => {
    it('should save image to specified path', async () => {
      const buffer = Buffer.from('fake image data');
      const info = {
        format: 'png' as const,
        width: 100,
        height: 100,
        size: buffer.length,
        hasTransparency: true,
        isValid: true
      };

      const result = await ImageProcessor.saveOptimizedImage(buffer, info, 'test-logo', tempDir);
      
      expect(result.originalPath).toBe(path.join(tempDir, 'test-logo.png'));
      expect(fs.existsSync(result.originalPath)).toBe(true);
      expect(result.info).toEqual(info);
    });

    it('should use correct file extension based on format', async () => {
      const formats: Array<{ format: 'png' | 'svg' | 'jpg' | 'webp'; extension: string }> = [
        { format: 'png', extension: 'png' },
        { format: 'svg', extension: 'svg' },
        { format: 'jpg', extension: 'jpg' },
        { format: 'webp', extension: 'webp' }
      ];

      for (const { format, extension } of formats) {
        const buffer = Buffer.from('fake image data');
        const info = {
          format,
          width: 100,
          height: 100,
          size: buffer.length,
          hasTransparency: false,
          isValid: true
        };

        const result = await ImageProcessor.saveOptimizedImage(buffer, info, `test-${format}`, tempDir);
        expect(result.originalPath).toBe(path.join(tempDir, `test-${format}.${extension}`));
        expect(fs.existsSync(result.originalPath)).toBe(true);
      }
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(ImageProcessor.formatFileSize(0)).toBe('0.0 B');
      expect(ImageProcessor.formatFileSize(512)).toBe('512.0 B');
      expect(ImageProcessor.formatFileSize(1024)).toBe('1.0 KB');
      expect(ImageProcessor.formatFileSize(1536)).toBe('1.5 KB');
      expect(ImageProcessor.formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(ImageProcessor.formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
    });
  });
});