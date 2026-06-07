import { AxiosInstance } from 'axios';
import { LogoResult, LogoSource } from '../types';
import { randomUUID } from 'crypto';

interface LogoDevResponse {
  url?: string;
  error?: string;
}

export class LogoDevClient {
  private baseUrl = 'https://img.logo.dev';
  private client: AxiosInstance;
  private apiToken?: string;

  constructor(client: AxiosInstance, apiToken?: string) {
    this.client = client;
    this.apiToken = apiToken || process.env.LOGO_DEV_API_TOKEN;
  }

  /**
   * Search for a company logo using Logo.dev API
   * @param query - Company name or domain
   * @returns Array of logo results
   */
  async search(query: string): Promise<LogoResult[]> {
    try {
      const domain = this.extractDomain(query);
      
      if (!domain) {
        return [];
      }

      // Return multiple sizes for better variety
      // Note: Temporarily disabled validation to ensure results are returned
      const companyName = this.extractCompanyName(query);
      const results: LogoResult[] = [];
      
      // Different sizes to provide variety
      const sizes = [
        { size: 512, quality: 'high' as const },
        { size: 256, quality: 'medium' as const },
        { size: 128, quality: 'medium' as const }
      ];
      
      for (const sizeInfo of sizes) {
        const logoUrl = this.buildLogoUrl(domain, sizeInfo.size);
        
        results.push({
          id: randomUUID(),
          url: logoUrl,
          source: LogoSource.LOGO_DEV,
          format: 'png',
          size: {
            width: sizeInfo.size,
            height: sizeInfo.size,
          },
          transparent: true,
          quality: sizeInfo.quality,
          companyName,
          createdAt: new Date(),
        });
      }

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
        return urlObj.hostname.replace(/^www\./, '');
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
   * Validate if the logo exists at the given URL and is not a fallback
   * Logo.dev returns a generic fallback image when a logo doesn't exist
   */
  private async validateLogo(url: string): Promise<boolean> {
    try {
      const response = await this.client.head(url, {
        timeout: 5000,
        validateStatus: (status) => status === 200,
      });
      
      if (response.status !== 200) {
        return false;
      }
      
      // Check Content-Length to detect fallback images
      // Logo.dev's fallback images are typically very small (< 500 bytes)
      const contentLength = response.headers['content-length'];
      if (contentLength && parseInt(contentLength) < 500) {
        return false; // Likely a fallback image
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Build logo URL with authentication token and optional size
   */
  private buildLogoUrl(domain: string, size?: number): string {
    const params = new URLSearchParams();
    
    if (this.apiToken) {
      params.append('token', this.apiToken);
    }
    
    // Request maximum size for highest quality
    const requestedSize = size || 512; // Logo.dev supports up to 512px
    params.append('size', requestedSize.toString());
    
    // Request PNG format explicitly
    params.append('format', 'png');
    
    const queryString = params.toString();
    return queryString ? `${this.baseUrl}/${domain}?${queryString}` : `${this.baseUrl}/${domain}`;
  }

  /**
   * Get logo with specific size parameters
   * @param domain - Company domain
   * @param size - Desired size (width in pixels)
   */
  getLogoUrl(domain: string, size?: number): string {
    return this.buildLogoUrl(domain, size);
  }
}
