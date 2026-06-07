import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosInstance } from 'axios';
import { WikidataClient } from './WikidataClient';
import { LogoSource } from '../types';

// Mock axios instance
const mockAxios = {
  get: vi.fn(),
} as unknown as AxiosInstance;

describe('WikidataClient', () => {
  let client: WikidataClient;

  beforeEach(() => {
    client = new WikidataClient(mockAxios);
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should return empty array for empty query', async () => {
      const results = await client.search('');
      expect(results).toEqual([]);
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('should return empty array for whitespace-only query', async () => {
      const results = await client.search('   ');
      expect(results).toEqual([]);
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('should search for entities and return logo results', async () => {
      // Mock entity search response
      const searchResponse = {
        data: {
          search: [
            {
              id: 'Q49108',
              title: 'Massachusetts Institute of Technology',
              description: 'private research university in Cambridge, Massachusetts'
            }
          ]
        }
      };

      // Mock entity data response
      const entityResponse = {
        data: {
          entities: {
            Q49108: {
              labels: {
                en: {
                  language: 'en',
                  value: 'Massachusetts Institute of Technology'
                }
              },
              claims: {
                P154: [
                  {
                    mainsnak: {
                      snaktype: 'value',
                      property: 'P154',
                      datavalue: {
                        value: 'MIT_logo.svg',
                        type: 'string'
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      };

      // Mock Commons image info response
      const commonsResponse = {
        data: {
          query: {
            pages: {
              '12345': {
                imageinfo: [
                  {
                    url: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/MIT_logo.svg',
                    width: 512,
                    height: 256
                  }
                ]
              }
            }
          }
        }
      };

      (mockAxios.get as any)
        .mockResolvedValueOnce(searchResponse) // Entity search
        .mockResolvedValueOnce(entityResponse) // Entity data
        .mockResolvedValueOnce(commonsResponse); // Commons image info

      const results = await client.search('MIT');

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        url: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/MIT_logo.svg',
        source: LogoSource.WIKIDATA,
        format: 'svg',
        transparent: true,
        quality: 'high',
        companyName: 'Massachusetts Institute of Technology'
      });
    });

    it('should handle multiple logo properties', async () => {
      const searchResponse = {
        data: {
          search: [{ id: 'Q123', title: 'Test University' }]
        }
      };

      const entityResponse = {
        data: {
          entities: {
            Q123: {
              labels: { en: { value: 'Test University' } },
              claims: {
                P154: [{ // Logo image
                  mainsnak: {
                    snaktype: 'value',
                    property: 'P154',
                    datavalue: { value: 'logo.png', type: 'string' }
                  }
                }],
                P18: [{ // General image
                  mainsnak: {
                    snaktype: 'value',
                    property: 'P18',
                    datavalue: { value: 'image.jpg', type: 'string' }
                  }
                }]
              }
            }
          }
        }
      };

      const commonsResponse = {
        data: {
          query: {
            pages: {
              '1': { imageinfo: [{ url: 'https://commons.wikimedia.org/logo.png' }] }
            }
          }
        }
      };

      (mockAxios.get as any)
        .mockResolvedValueOnce(searchResponse)
        .mockResolvedValueOnce(entityResponse)
        .mockResolvedValueOnce(commonsResponse)
        .mockResolvedValueOnce(commonsResponse);

      const results = await client.search('Test University');

      expect(results).toHaveLength(2);
      expect(results[0].format).toBe('png');
      expect(results[1].format).toBe('jpg');
    });

    it('should handle network errors gracefully', async () => {
      (mockAxios.get as any).mockRejectedValue(new Error('Network error'));

      const results = await client.search('MIT');

      expect(results).toEqual([]);
    });

    it('should handle malformed responses gracefully', async () => {
      (mockAxios.get as any).mockResolvedValue({ data: null });

      const results = await client.search('MIT');

      expect(results).toEqual([]);
    });

    it('should handle entities without logos', async () => {
      const searchResponse = {
        data: {
          search: [{ id: 'Q123', title: 'No Logo Entity' }]
        }
      };

      const entityResponse = {
        data: {
          entities: {
            Q123: {
              labels: { en: { value: 'No Logo Entity' } },
              claims: {} // No logo claims
            }
          }
        }
      };

      (mockAxios.get as any)
        .mockResolvedValueOnce(searchResponse)
        .mockResolvedValueOnce(entityResponse);

      const results = await client.search('No Logo Entity');

      expect(results).toEqual([]);
    });
  });

  describe('buildSparqlQuery', () => {
    it('should build university SPARQL query', () => {
      const query = client.buildSparqlQuery('university', 'Harvard');
      
      expect(query).toContain('FILTER(CONTAINS(LCASE(?itemLabel), "harvard"))');
      expect(query).toContain('wdt:P31/wdt:P279* wd:Q3918'); // Educational institution
      expect(query).toContain('wdt:P154'); // Logo property
    });

    it('should build NGO SPARQL query', () => {
      const query = client.buildSparqlQuery('ngo', 'Red Cross');
      
      expect(query).toContain('FILTER(CONTAINS(LCASE(?itemLabel), "red cross"))');
      expect(query).toContain('wdt:P31/wdt:P279* wd:Q79913'); // NGO
    });

    it('should build company SPARQL query', () => {
      const query = client.buildSparqlQuery('company', 'Apple');
      
      expect(query).toContain('FILTER(CONTAINS(LCASE(?itemLabel), "apple"))');
      expect(query).toContain('wdt:P31/wdt:P279* wd:Q4830453'); // Business enterprise
    });
  });

  describe('executeSparqlQuery', () => {
    it('should execute SPARQL query and return results', async () => {
      const sparqlResponse = {
        data: {
          results: {
            bindings: [
              {
                item: { value: 'http://www.wikidata.org/entity/Q49108' },
                itemLabel: { value: 'MIT' },
                logo: { value: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/MIT_logo.svg' }
              }
            ]
          }
        }
      };

      (mockAxios.get as any).mockResolvedValue(sparqlResponse);

      const query = 'SELECT * WHERE { ?item wdt:P154 ?logo }';
      const results = await client.executeSparqlQuery(query);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        url: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/MIT_logo.svg',
        source: LogoSource.WIKIDATA,
        format: 'svg',
        companyName: 'MIT'
      });

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://query.wikidata.org/sparql',
        expect.objectContaining({
          params: { query, format: 'json' },
          headers: expect.objectContaining({
            'Accept': 'application/sparql-results+json'
          })
        })
      );
    });

    it('should handle SPARQL query errors gracefully', async () => {
      (mockAxios.get as any).mockRejectedValue(new Error('SPARQL error'));

      const results = await client.executeSparqlQuery('INVALID QUERY');

      expect(results).toEqual([]);
    });

    it('should handle empty SPARQL results', async () => {
      const sparqlResponse = {
        data: {
          results: {
            bindings: []
          }
        }
      };

      (mockAxios.get as any).mockResolvedValue(sparqlResponse);

      const results = await client.executeSparqlQuery('SELECT * WHERE { }');

      expect(results).toEqual([]);
    });

    it('should limit results to 3 items', async () => {
      const sparqlResponse = {
        data: {
          results: {
            bindings: Array.from({ length: 5 }, (_, i) => ({
              item: { value: `http://www.wikidata.org/entity/Q${i}` },
              itemLabel: { value: `Entity ${i}` },
              logo: { value: `https://commons.wikimedia.org/logo${i}.svg` }
            }))
          }
        }
      };

      (mockAxios.get as any).mockResolvedValue(sparqlResponse);

      const results = await client.executeSparqlQuery('SELECT * WHERE { }');

      expect(results).toHaveLength(3);
    });
  });

  describe('format detection', () => {
    it('should detect SVG format correctly', async () => {
      const searchResponse = {
        data: { search: [{ id: 'Q123', title: 'Test' }] }
      };

      const entityResponse = {
        data: {
          entities: {
            Q123: {
              labels: { en: { value: 'Test' } },
              claims: {
                P154: [{
                  mainsnak: {
                    snaktype: 'value',
                    property: 'P154',
                    datavalue: { value: 'logo.svg', type: 'string' }
                  }
                }]
              }
            }
          }
        }
      };

      const commonsResponse = {
        data: {
          query: {
            pages: {
              '1': { imageinfo: [{ url: 'https://commons.wikimedia.org/logo.svg' }] }
            }
          }
        }
      };

      (mockAxios.get as any)
        .mockResolvedValueOnce(searchResponse)
        .mockResolvedValueOnce(entityResponse)
        .mockResolvedValueOnce(commonsResponse);

      const results = await client.search('Test');

      expect(results[0].format).toBe('svg');
      expect(results[0].quality).toBe('high');
      expect(results[0].transparent).toBe(true);
    });

    it('should detect PNG format correctly', async () => {
      const searchResponse = {
        data: { search: [{ id: 'Q123', title: 'Test' }] }
      };

      const entityResponse = {
        data: {
          entities: {
            Q123: {
              labels: { en: { value: 'Test' } },
              claims: {
                P154: [{
                  mainsnak: {
                    snaktype: 'value',
                    property: 'P154',
                    datavalue: { value: 'logo.png', type: 'string' }
                  }
                }]
              }
            }
          }
        }
      };

      const commonsResponse = {
        data: {
          query: {
            pages: {
              '1': { imageinfo: [{ url: 'https://commons.wikimedia.org/logo.png' }] }
            }
          }
        }
      };

      (mockAxios.get as any)
        .mockResolvedValueOnce(searchResponse)
        .mockResolvedValueOnce(entityResponse)
        .mockResolvedValueOnce(commonsResponse);

      const results = await client.search('Test');

      expect(results[0].format).toBe('png');
      expect(results[0].transparent).toBe(true);
    });
  });

  describe('Commons image URL resolution', () => {
    it('should handle File: prefix in filename', async () => {
      const searchResponse = {
        data: { search: [{ id: 'Q123', title: 'Test' }] }
      };

      const entityResponse = {
        data: {
          entities: {
            Q123: {
              labels: { en: { value: 'Test' } },
              claims: {
                P154: [{
                  mainsnak: {
                    snaktype: 'value',
                    property: 'P154',
                    datavalue: { value: 'File:logo.png', type: 'string' }
                  }
                }]
              }
            }
          }
        }
      };

      const commonsResponse = {
        data: {
          query: {
            pages: {
              '1': { imageinfo: [{ url: 'https://commons.wikimedia.org/logo.png' }] }
            }
          }
        }
      };

      (mockAxios.get as any)
        .mockResolvedValueOnce(searchResponse)
        .mockResolvedValueOnce(entityResponse)
        .mockResolvedValueOnce(commonsResponse);

      const results = await client.search('Test');

      expect(results).toHaveLength(1);
      
      // Check that the third call was to Commons API with correct parameters
      const commonsCall = (mockAxios.get as any).mock.calls[2];
      expect(commonsCall[0]).toContain('commons.wikimedia.org');
      expect(commonsCall[0]).toContain('titles=File%3Alogo.png');
    });

    it('should handle Commons API errors gracefully', async () => {
      const searchResponse = {
        data: { search: [{ id: 'Q123', title: 'Test' }] }
      };

      const entityResponse = {
        data: {
          entities: {
            Q123: {
              labels: { en: { value: 'Test' } },
              claims: {
                P154: [{
                  mainsnak: {
                    snaktype: 'value',
                    property: 'P154',
                    datavalue: { value: 'logo.png', type: 'string' }
                  }
                }]
              }
            }
          }
        }
      };

      (mockAxios.get as any)
        .mockResolvedValueOnce(searchResponse)
        .mockResolvedValueOnce(entityResponse)
        .mockRejectedValueOnce(new Error('Commons API error'));

      const results = await client.search('Test');

      expect(results).toEqual([]);
    });
  });
});