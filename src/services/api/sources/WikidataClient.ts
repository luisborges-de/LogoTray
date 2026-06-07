import { AxiosInstance } from 'axios';
import { LogoResult, LogoSource } from '../types';
import { randomUUID } from 'crypto';

interface WikidataSearchResult {
  search: WikidataEntity[];
}

interface WikidataEntity {
  id: string;
  title: string;
  description?: string;
}

interface WikidataEntityData {
  entities: {
    [key: string]: {
      labels?: {
        [lang: string]: {
          language: string;
          value: string;
        };
      };
      claims?: {
        [property: string]: WikidataClaim[];
      };
    };
  };
}

interface WikidataClaim {
  mainsnak: {
    snaktype: string;
    property: string;
    datavalue?: {
      value: string | WikidataCommonsValue;
      type: string;
    };
  };
}

interface WikidataCommonsValue {
  filename: string;
}

export class WikidataClient {
  private wikidataApiUrl = 'https://www.wikidata.org/w/api.php';
  private commonsApiUrl = 'https://commons.wikimedia.org/w/api.php';
  private client: AxiosInstance;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  /**
   * Search for organization logos using Wikidata
   * @param query - Organization name (university, NGO, etc.)
   * @returns Array of logo results
   */
  async search(query: string): Promise<LogoResult[]> {
    try {
      const cleanQuery = query.trim();
      if (!cleanQuery) {
        return [];
      }

      // Search for entities matching the query
      const entities = await this.searchEntities(cleanQuery);
      
      if (entities.length === 0) {
        return [];
      }

      // Get logo information for found entities
      const results: LogoResult[] = [];
      
      for (const entity of entities.slice(0, 10)) { // Limit to top 10 entities
        const logos = await this.getEntityLogos(entity.id, cleanQuery);
        results.push(...logos);
      }

      return results.slice(0, 8); // Return top 8 results
    } catch (error) {
      // Silent fail - return empty array
      return [];
    }
  }

  /**
   * Search for entities in Wikidata
   */
  private async searchEntities(query: string): Promise<WikidataEntity[]> {
    try {
      const params = new URLSearchParams({
        action: 'wbsearchentities',
        search: query,
        language: 'en',
        format: 'json',
        limit: '10',
        type: 'item'
      });

      const response = await this.client.get<WikidataSearchResult>(
        `${this.wikidataApiUrl}?${params.toString()}`,
        {
          timeout: 10000,
          validateStatus: (status) => status === 200,
        }
      );

      return response.data?.search || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get logo information for a specific Wikidata entity
   */
  private async getEntityLogos(entityId: string, originalQuery: string): Promise<LogoResult[]> {
    try {
      const params = new URLSearchParams({
        action: 'wbgetentities',
        ids: entityId,
        format: 'json',
        props: 'labels|claims'
      });

      const response = await this.client.get<WikidataEntityData>(
        `${this.wikidataApiUrl}?${params.toString()}`,
        {
          timeout: 10000,
          validateStatus: (status) => status === 200,
        }
      );

      const entity = response.data?.entities?.[entityId];
      if (!entity) {
        return [];
      }

      const results: LogoResult[] = [];
      const entityName = entity.labels?.en?.value || originalQuery;

      // Look for logo properties
      const logoProperties = [
        'P154', // logo image
        'P18',  // image (fallback)
        'P41',  // flag image (for countries/regions)
        'P94'   // coat of arms image
      ];

      for (const property of logoProperties) {
        const claims = entity.claims?.[property];
        if (claims && claims.length > 0) {
          for (const claim of claims) {
            const logoResult = await this.processLogoClaim(claim, entityName, property);
            if (logoResult) {
              results.push(logoResult);
            }
          }
        }
      }

      return results;
    } catch (error) {
      return [];
    }
  }

  /**
   * Process a Wikidata claim to extract logo information
   */
  private async processLogoClaim(
    claim: WikidataClaim,
    entityName: string,
    property: string
  ): Promise<LogoResult | null> {
    try {
      if (claim.mainsnak.snaktype !== 'value' || !claim.mainsnak.datavalue) {
        return null;
      }

      let filename: string;
      
      if (typeof claim.mainsnak.datavalue.value === 'string') {
        filename = claim.mainsnak.datavalue.value;
      } else if (claim.mainsnak.datavalue.value && 'filename' in claim.mainsnak.datavalue.value) {
        filename = claim.mainsnak.datavalue.value.filename;
      } else {
        return null;
      }

      // Get the actual image URL from Wikimedia Commons
      const imageUrl = await this.getCommonsImageUrl(filename);
      if (!imageUrl) {
        return null;
      }

      // Determine quality based on property type
      let quality: 'high' | 'medium' | 'low' = 'medium';
      let transparent = false;

      if (property === 'P154') { // Official logo
        quality = 'high';
        transparent = true;
      } else if (property === 'P18') { // General image
        quality = 'medium';
      }

      // Determine format from filename
      const format = this.getFormatFromFilename(filename);
      if (format === 'svg') {
        quality = 'high';
        transparent = true;
      }

      return {
        id: randomUUID(),
        url: imageUrl,
        source: LogoSource.WIKIDATA,
        format,
        size: {
          width: 0, // Will be determined when image is loaded
          height: 0,
        },
        transparent,
        quality,
        companyName: entityName,
        createdAt: new Date(),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get the actual image URL from Wikimedia Commons
   */
  private async getCommonsImageUrl(filename: string): Promise<string | null> {
    try {
      // Remove "File:" prefix if present
      const cleanFilename = filename.replace(/^File:/, '');
      
      const params = new URLSearchParams({
        action: 'query',
        titles: `File:${cleanFilename}`,
        prop: 'imageinfo',
        iiprop: 'url|size',
        format: 'json'
      });

      const response = await this.client.get(
        `${this.commonsApiUrl}?${params.toString()}`,
        {
          timeout: 10000,
          validateStatus: (status) => status === 200,
        }
      );

      const pages = response.data?.query?.pages;
      if (!pages) {
        return null;
      }

      const page = Object.values(pages)[0] as any;
      const imageInfo = page?.imageinfo?.[0];
      
      if (imageInfo?.url) {
        return imageInfo.url;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Determine image format from filename
   */
  private getFormatFromFilename(filename: string): 'png' | 'svg' | 'jpg' {
    const extension = filename.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'svg':
        return 'svg';
      case 'png':
        return 'png';
      case 'jpg':
      case 'jpeg':
        return 'jpg';
      default:
        return 'png'; // Default fallback
    }
  }

  /**
   * Build SPARQL query for specific organization types
   * This method can be used for more targeted searches
   */
  buildSparqlQuery(organizationType: 'university' | 'ngo' | 'company', query: string): string {
    const baseQuery = `
      SELECT DISTINCT ?item ?itemLabel ?logo WHERE {
        ?item rdfs:label ?itemLabel .
        ?item wdt:P154 ?logo .
        FILTER(LANG(?itemLabel) = "en")
        FILTER(CONTAINS(LCASE(?itemLabel), "${query.toLowerCase()}"))
    `;

    let typeFilter = '';
    
    switch (organizationType) {
      case 'university':
        typeFilter = '?item wdt:P31/wdt:P279* wd:Q3918 .'; // Educational institution
        break;
      case 'ngo':
        typeFilter = '?item wdt:P31/wdt:P279* wd:Q79913 .'; // Non-governmental organization
        break;
      case 'company':
        typeFilter = '?item wdt:P31/wdt:P279* wd:Q4830453 .'; // Business enterprise
        break;
    }

    return `${baseQuery}
        ${typeFilter}
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
      }
      LIMIT 10
    `;
  }

  /**
   * Execute SPARQL query against Wikidata
   * This is an alternative search method for more precise queries
   */
  async executeSparqlQuery(sparqlQuery: string): Promise<LogoResult[]> {
    try {
      const sparqlEndpoint = 'https://query.wikidata.org/sparql';
      
      const response = await this.client.get(sparqlEndpoint, {
        params: {
          query: sparqlQuery,
          format: 'json'
        },
        headers: {
          'Accept': 'application/sparql-results+json',
          'User-Agent': 'LogoBuddy/1.0 (https://github.com/logobuddy/app)'
        },
        timeout: 15000,
        validateStatus: (status) => status === 200,
      });

      const bindings = response.data?.results?.bindings || [];
      const results: LogoResult[] = [];

      for (const binding of bindings) {
        if (binding.logo?.value && binding.itemLabel?.value) {
          const logoUrl = binding.logo.value;
          const entityName = binding.itemLabel.value;
          
          // Extract filename from Wikimedia Commons URL
          const filename = logoUrl.split('/').pop();
          if (filename) {
            const format = this.getFormatFromFilename(filename);
            
            results.push({
              id: randomUUID(),
              url: logoUrl,
              source: LogoSource.WIKIDATA,
              format,
              size: { width: 0, height: 0 },
              transparent: format === 'svg' || format === 'png',
              quality: format === 'svg' ? 'high' : 'medium',
              companyName: entityName,
              createdAt: new Date(),
            });
          }
        }
      }

      return results.slice(0, 8);
    } catch (error) {
      return [];
    }
  }
}