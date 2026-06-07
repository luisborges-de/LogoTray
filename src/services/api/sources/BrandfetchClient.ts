import { AxiosInstance } from 'axios';
import { LogoResult, LogoSource } from '../types';
import { randomUUID } from 'crypto';

interface BrandfetchBrand {
  name: string;
  domain: string;
  claimed?: boolean;
  logos?: BrandfetchLogo[];
  images?: BrandfetchImage[];
}

interface BrandfetchLogo {
  type: string;
  theme: string;
  formats: BrandfetchFormat[];
}

interface BrandfetchImage {
  type: string;
  formats: BrandfetchFormat[];
}

interface BrandfetchFormat {
  src: string;
  background?: string;
  format: string;
  height?: number;
  width?: number;
  size?: number;
}

export class BrandfetchClient {
  private apiBaseUrl = 'https://api.brandfetch.io/v2';
  private cdnBaseUrl = 'https://cdn.brandfetch.io';
  private client: AxiosInstance;
  private apiKey?: string;
  private cdnClientId = '1idvc3_vP4BOQ6jIquH'; // CDN client identifier for hotlinking

  constructor(client: AxiosInstance, apiKey?: string) {
    this.client = client;
    this.apiKey = apiKey || process.env.BRANDFETCH_API_KEY;
  }

  /**
   * Search for a company logo using Brandfetch CDN
   * @param query - Company name or domain
   * @returns Array of logo results
   */
  async search(query: string): Promise<LogoResult[]> {
    try {
      const domain = this.extractDomain(query);
      
      if (!domain) {
        return [];
      }

      // Use CDN endpoint with client ID parameter
      return this.searchViaCDN(domain, query);
    } catch (error) {
      // Silent fail - return empty array
      return [];
    }
  }

  /**
   * Search using Brandfetch CDN (works without API key)
   */
  private async searchViaCDN(domain: string, query: string): Promise<LogoResult[]> {
    try {
      const companyName = this.extractCompanyName(query);
      const validResults: LogoResult[] = [];
      
      // Try only the most likely domain variations to reduce empty results
      const domainVariations = this.generateDomainVariations(domain, query).slice(0, 2); // Limit to 2 most likely
      
      for (const testDomain of domainVariations) {
        // Test with PNG first (most common for logos)
        const testUrl = `${this.cdnBaseUrl}/${testDomain}?c=${this.cdnClientId}&w=512&f=png`;
        
        // Validate if this domain has a logo
        const isValid = await this.validateBrandfetchUrl(testUrl);
        
        if (isValid) {
          // Only generate multiple variations if we know the domain has logos
          const formats = [
            { format: 'png', transparent: true, ext: 'png' },
            { format: 'svg', transparent: true, ext: 'svg' }
          ];
          
          for (const formatInfo of formats) {
            // Try fewer size variations to reduce duplicates
            const sizes = [
              { w: 512, quality: 'high' as const },
              { w: 256, quality: 'medium' as const }
            ];
            
            for (const sizeInfo of sizes) {
              const logoUrl = `${this.cdnBaseUrl}/${testDomain}?c=${this.cdnClientId}&w=${sizeInfo.w}&f=${formatInfo.ext}`;
              
              const result: LogoResult = {
                id: randomUUID(),
                url: logoUrl,
                source: LogoSource.BRANDFETCH,
                format: formatInfo.format as 'png' | 'svg' | 'jpg',
                size: {
                  width: sizeInfo.w,
                  height: 0,
                },
                transparent: formatInfo.transparent,
                quality: sizeInfo.quality,
                companyName,
                createdAt: new Date(),
              };
              
              validResults.push(result);
            }
          }
        }
      }

      // Return validated results
      return validResults.slice(0, 8);
    } catch (error) {
      return [];
    }
  }

  /**
   * Validate if a Brandfetch CDN URL returns a valid logo
   */
  private async validateBrandfetchUrl(url: string): Promise<boolean> {
    try {
      const response = await this.client.head(url, {
        timeout: 3000,
        validateStatus: (status) => status === 200,
      });
      
      if (response.status !== 200) {
        return false;
      }
      
      // Check Content-Length to ensure it's not empty or too small
      const contentLength = response.headers['content-length'];
      if (contentLength && parseInt(contentLength) < 1000) {
        return false; // Likely empty or fallback image
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate domain variations to try
   */
  private generateDomainVariations(domain: string, query: string): string[] {
    const variations = new Set<string>();
    
    // Add the original domain
    variations.add(domain);
    
    // If query doesn't look like a domain, try common variations
    if (!query.includes('.')) {
      const cleanQuery = query.toLowerCase().replace(/\s+/g, '');
      variations.add(`${cleanQuery}.com`);
      variations.add(`${cleanQuery}.io`);
      variations.add(`${cleanQuery}.org`);
      variations.add(`${cleanQuery}.net`);
    }
    
    // Try without www prefix
    if (domain.startsWith('www.')) {
      variations.add(domain.substring(4));
    }
    
    // Try with www prefix if not present
    if (!domain.startsWith('www.')) {
      variations.add(`www.${domain}`);
    }
    
    return Array.from(variations);
  }

  /**
   * Search using Brandfetch API (requires API key)
   */
  private async searchViaAPI(domain: string, query: string): Promise<LogoResult[]> {
    try {
      const url = `${this.apiBaseUrl}/brands/${domain}`;
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`,
      };

      const response = await this.client.get<BrandfetchBrand>(url, {
        headers,
        timeout: 10000,
        validateStatus: (status) => status === 200,
      });

      if (!response.data) {
        return [];
      }

      return this.parseLogoResults(response.data, query);
    } catch (error) {
      return [];
    }
  }



  /**
   * Parse Brandfetch API response into LogoResult array
   */
  private parseLogoResults(brand: BrandfetchBrand, query: string): LogoResult[] {
    const results: LogoResult[] = [];
    const companyName = this.extractCompanyName(query);

    // Process logos array (primary source)
    if (brand.logos && brand.logos.length > 0) {
      for (const logo of brand.logos) {
        // Prioritize logos with transparent backgrounds
        const formats = this.sortFormatsByQuality(logo.formats);
        
        for (const format of formats) {
          // Skip if no source URL
          if (!format.src) continue;

          // Determine if transparent based on background property
          const isTransparent = !format.background || format.background === 'transparent';
          
          // Prioritize transparent PNGs and SVGs
          if (format.format === 'png' || format.format === 'svg') {
            results.push(this.createLogoResult(format, brand, companyName, isTransparent));
          }
        }
      }
    }

    // Fallback to images array if no logos found
    if (results.length === 0 && brand.images && brand.images.length > 0) {
      for (const image of brand.images) {
        const formats = this.sortFormatsByQuality(image.formats);
        
        for (const format of formats) {
          if (!format.src) continue;
          
          if (format.format === 'png' || format.format === 'svg') {
            results.push(this.createLogoResult(format, brand, companyName, false));
          }
        }
      }
    }

    // Deduplicate by URL and return top results
    const uniqueResults = this.deduplicateResults(results);
    return uniqueResults.slice(0, 8); // Return top 8 results
  }

  /**
   * Create a LogoResult from a Brandfetch format
   */
  private createLogoResult(
    format: BrandfetchFormat,
    brand: BrandfetchBrand,
    companyName: string,
    isTransparent: boolean
  ): LogoResult {
    // Determine quality based on size and format
    let quality: 'high' | 'medium' | 'low' = 'medium';
    
    if (format.format === 'svg') {
      quality = 'high'; // SVG is always high quality
    } else if (format.width && format.width >= 512) {
      quality = 'high';
    } else if (format.width && format.width >= 256) {
      quality = 'medium';
    } else {
      quality = 'low';
    }

    return {
      id: randomUUID(),
      url: format.src,
      source: LogoSource.BRANDFETCH,
      format: this.normalizeFormat(format.format),
      size: {
        width: format.width || 0,
        height: format.height || 0,
      },
      transparent: isTransparent,
      quality,
      companyName,
      createdAt: new Date(),
    };
  }

  /**
   * Sort formats by quality (prefer larger sizes and transparent backgrounds)
   */
  private sortFormatsByQuality(formats: BrandfetchFormat[]): BrandfetchFormat[] {
    return [...formats].sort((a, b) => {
      // Prioritize SVG
      if (a.format === 'svg' && b.format !== 'svg') return -1;
      if (b.format === 'svg' && a.format !== 'svg') return 1;

      // Prioritize transparent backgrounds
      const aTransparent = !a.background || a.background === 'transparent';
      const bTransparent = !b.background || b.background === 'transparent';
      if (aTransparent && !bTransparent) return -1;
      if (bTransparent && !aTransparent) return 1;

      // Sort by size (larger is better)
      const aSize = a.width || 0;
      const bSize = b.width || 0;
      return bSize - aSize;
    });
  }

  /**
   * Deduplicate results by URL
   */
  private deduplicateResults(results: LogoResult[]): LogoResult[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      if (seen.has(result.url)) {
        return false;
      }
      seen.add(result.url);
      return true;
    });
  }

  /**
   * Normalize format string to match LogoResult format type
   */
  private normalizeFormat(format: string): 'png' | 'svg' | 'jpg' {
    const normalized = format.toLowerCase();
    if (normalized === 'png') return 'png';
    if (normalized === 'svg') return 'svg';
    if (normalized === 'jpg' || normalized === 'jpeg') return 'jpg';
    return 'png'; // Default fallback
  }

  /**
   * Extract domain from query (company name or URL)
   */
  private extractDomain(query: string): string | null {
    const cleaned = query.trim().toLowerCase();

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
}
