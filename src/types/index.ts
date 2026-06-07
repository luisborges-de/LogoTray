// Re-export electron types
export * from './electron.d';

// Logo types
export enum LogoSource {
  LOGO_DEV = 'logo.dev',
  BRANDFETCH = 'brandfetch',
  API_NINJAS = 'api-ninjas',
  WIKIDATA = 'wikidata',
  ICONHORSE = 'iconhorse'
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

// Global type definitions
export interface AppConfig {
  apiKeys: {
    brandfetch?: string;
    apiNinjas?: string;
  };
  cache: {
    maxSize: number;
    expirationDays: number;
  };
  ui: {
    theme: 'auto' | 'light' | 'dark';
    accentColor: string;
    gridColumns: number;
  };
}
