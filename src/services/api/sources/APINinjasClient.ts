import { AxiosInstance } from 'axios';
import { LogoResult, LogoSource } from '../types';
import { randomUUID } from 'crypto';

interface APINinjasLogoResponse {
  name: string;
  ticker?: string;
  logo: string;
}

export class APINinjasClient {
  private baseUrl = 'https://api.api-ninjas.com/v1';
  private client: AxiosInstance;
  private apiKey?: string;

  constructor(client: AxiosInstance, apiKey?: string) {
    this.client = client;
    this.apiKey = apiKey || process.env.API_NINJAS_API_KEY;
  }

  /**
   * Search for a company logo using API Ninjas Logo API
   * @param query - Company name or domain
   * @returns Array of logo results
   */
  async search(query: string): Promise<LogoResult[]> {
    try {
      if (!this.apiKey) {
        console.log('API Ninjas: No API key provided');
        return []; // API key is required for API Ninjas
      }

      const companyName = this.extractCompanyName(query);
      
      if (!companyName) {
        console.log('API Ninjas: Could not extract company name from query:', query);
        return [];
      }

      console.log('API Ninjas: Searching for company:', companyName);

      const url = `${this.baseUrl}/logo`;
      const headers = {
        'X-Api-Key': this.apiKey,
      };

      const response = await this.client.get<APINinjasLogoResponse[]>(url, {
        headers,
        params: {
          name: companyName,
        },
        timeout: 10000,
        validateStatus: (status) => status === 200,
      });

      console.log('API Ninjas: Response status:', response.status);
      console.log('API Ninjas: Response data:', response.data);

      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        console.log('API Ninjas: No results found');
        return [];
      }

      const results = this.parseLogoResults(response.data, query);
      console.log('API Ninjas: Parsed results:', results.length);
      return results;
    } catch (error) {
      console.error('API Ninjas: Search failed:', error);
      return [];
    }
  }

  /**
   * Parse API Ninjas response into LogoResult array
   */
  private parseLogoResults(logos: APINinjasLogoResponse[], query: string): LogoResult[] {
    const results: LogoResult[] = [];
    const companyName = this.extractCompanyName(query);

    for (const logo of logos) {
      if (!logo.logo || !this.isValidUrl(logo.logo)) {
        continue;
      }

      // Determine format from URL
      const format = this.detectFormat(logo.logo);
      
      // API Ninjas typically provides medium quality logos
      const result: LogoResult = {
        id: randomUUID(),
        url: logo.logo,
        source: LogoSource.API_NINJAS,
        format,
        size: {
          width: 0, // Unknown size from API
          height: 0,
        },
        transparent: format === 'png' || format === 'svg', // Assume PNG/SVG are transparent
        quality: 'medium',
        companyName: logo.name || companyName,
        createdAt: new Date(),
      };

      results.push(result);
    }

    // Return up to 10 results for better variety
    return results.slice(0, 10);
  }

  /**
   * Extract company name from query (company name or URL)
   */
  private extractCompanyName(query: string): string {
    const cleaned = query.trim();

    if (!cleaned) {
      return '';
    }

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

    // If it contains a dot, extract the first part (domain name)
    if (cleaned.includes('.')) {
      return cleaned.split('.')[0];
    }

    // Otherwise, return as-is (company name)
    return cleaned;
  }

  /**
   * Detect image format from URL
   */
  private detectFormat(url: string): 'png' | 'svg' | 'jpg' {
    const lowercaseUrl = url.toLowerCase();
    
    if (lowercaseUrl.includes('.svg') || lowercaseUrl.includes('format=svg')) {
      return 'svg';
    }
    
    if (lowercaseUrl.includes('.jpg') || lowercaseUrl.includes('.jpeg') || lowercaseUrl.includes('format=jpg')) {
      return 'jpg';
    }
    
    // Default to PNG (most common for logos)
    return 'png';
  }

  /**
   * Validate if a string is a valid URL
   */
  private isValidUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}