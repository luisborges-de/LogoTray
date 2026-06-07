import { AxiosInstance } from 'axios';
import { LogoResult, LogoSource } from '../types';
import { randomUUID } from 'crypto';

export class IconHorseClient {
  private baseUrl = 'https://icon.horse/icon';
  private client: AxiosInstance;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  /**
   * Search for a company logo using IconHorse API as fallback
   * @param query - Company name or domain
   * @returns Array of logo results
   */
  async search(query: string): Promise<LogoResult[]> {
    try {
      const domain = this.extractDomain(query);
      
      if (!domain) {
        return [];
      }

      const results: LogoResult[] = [];
      const companyName = this.extractCompanyName(query);

      // IconHorse provides different sizes, try multiple for better options
      const sizes = [
        { size: 512, quality: 'high' as const },
        { size: 256, quality: 'medium' as const },
        { size: 128, quality: 'medium' as const },
        { size: 64, quality: 'low' as const }
      ];

      for (const sizeInfo of sizes) {
        const logoUrl = `${this.baseUrl}/${domain}?size=${sizeInfo.size}`;
        
        // Validate that the logo exists and assess quality
        const qualityAssessment = await this.assessLogoQuality(logoUrl);
        
        if (qualityAssessment.exists) {
          const result: LogoResult = {
            id: randomUUID(),
            url: logoUrl,
            source: LogoSource.ICONHORSE,
            format: 'png', // IconHorse typically returns PNG
            size: {
              width: sizeInfo.size,
              height: sizeInfo.size, // IconHorse returns square icons
            },
            transparent: qualityAssessment.hasTransparency,
            quality: qualityAssessment.quality || sizeInfo.quality,
            companyName,
            createdAt: new Date(),
          };

          results.push(result);
        }
      }

      // Return all results (up to 4 different sizes)
      return results;
    } catch (error) {
      // Silent fail - return empty array
      return [];
    }
  }

  /**
   * Extract domain from query (company name or URL)
   */
  private extractDomain(query: string): string | null {
    const cleaned = query.trim().toLowerCase();

    // Return null for empty queries
    if (!cleaned) {
      return null;
    }

    // If it looks like a URL, extract the domain
    if (cleaned.includes('://') || cleaned.includes('www.')) {
      try {
        const url = cleaned.startsWith('http') ? cleaned : `https://${cleaned}`;
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace(/^www\./, '');
        
        // Validate that hostname contains at least one dot and is not just "invalid-url"
        if (!hostname.includes('.') || hostname === 'invalid-url') {
          return null;
        }
        
        return hostname;
      } catch {
        return null;
      }
    }

    // If it's a domain-like string (contains a dot)
    if (cleaned.includes('.')) {
      return cleaned.replace(/^www\./, '');
    }

    // Otherwise, assume it's a company name and append .com
    const domain = cleaned.replace(/\s+/g, '');
    return domain ? `${domain}.com` : null;
  }

  /**
   * Extract company name from query
   */
  private extractCompanyName(query: string): string {
    const cleaned = query.trim();

    // If it's a URL, extract the domain name
    if (cleaned.includes('://') || cleaned.includes('www.')) {
      try {
        const url = cleaned.startsWith('http') ? cleaned : `https://${cleaned}`;
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace(/^www\./, '');
        return hostname.split('.')[0];
      } catch {
        return cleaned;
      }
    }

    // If it contains a dot, extract the first part
    if (cleaned.includes('.')) {
      return cleaned.split('.')[0];
    }

    return cleaned;
  }

  /**
   * Assess the quality of an IconHorse logo
   * IconHorse is a fallback service, so we need to determine if it's returning
   * a real logo or just a generic fallback
   */
  private async assessLogoQuality(url: string): Promise<{
    exists: boolean;
    quality?: 'high' | 'medium' | 'low';
    hasTransparency: boolean;
  }> {
    try {
      const response = await this.client.head(url, {
        timeout: 5000,
        validateStatus: (status) => status === 200,
      });
      
      if (response.status !== 200) {
        return { exists: false, hasTransparency: false };
      }
      
      // Check Content-Length to assess quality
      const contentLength = response.headers['content-length'];
      const contentType = response.headers['content-type'];
      
      let quality: 'high' | 'medium' | 'low' = 'low';
      let hasTransparency = false;
      
      if (contentLength) {
        const size = parseInt(contentLength);
        
        // IconHorse fallback images are typically very small
        if (size < 500) {
          return { exists: false, hasTransparency: false }; // Likely a generic fallback
        }
        
        // Assess quality based on file size
        if (size > 10000) {
          quality = 'high';
        } else if (size > 3000) {
          quality = 'medium';
        } else {
          quality = 'low';
        }
      }
      
      // PNG images might have transparency
      if (contentType && contentType.includes('png')) {
        hasTransparency = true;
      }
      
      return { 
        exists: true, 
        quality,
        hasTransparency 
      };
    } catch (error) {
      return { exists: false, hasTransparency: false };
    }
  }

  /**
   * Get direct logo URL for a domain with specific size
   * @param domain - Company domain
   * @param size - Desired size (width/height in pixels)
   */
  getLogoUrl(domain: string, size: number = 256): string {
    return `${this.baseUrl}/${domain}?size=${size}`;
  }
}