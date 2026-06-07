// API types and interfaces
export enum LogoSource {
  LOGO_DEV = 'logo.dev',
  BRANDFETCH = 'brandfetch',
  API_NINJAS = 'api-ninjas',
  WIKIDATA = 'wikidata',
  ICONHORSE = 'iconhorse',
}

export interface LogoResult {
  id: string;
  url: string;
  localPath?: string;
  source: LogoSource;
  format: 'png' | 'svg' | 'jpg';
  size: {
    width: number;
    height: number;
  };
  transparent: boolean;
  quality: 'high' | 'medium' | 'low';
  companyName: string;
  createdAt: Date;
}
