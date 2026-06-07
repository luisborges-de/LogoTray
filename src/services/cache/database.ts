import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface DatabaseSchema {
  version: number;
  migrations: string[];
}

export class DatabaseManager {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    // Create cache directory in user data folder
    const userDataPath = app.getPath('userData');
    const cacheDir = path.join(userDataPath, 'cache');
    
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    this.dbPath = path.join(cacheDir, 'logos.db');
    this.db = new Database(this.dbPath);
    
    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000');
    
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Create schema_version table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const currentVersion = this.getCurrentSchemaVersion();
    const targetVersion = this.getTargetSchemaVersion();

    if (currentVersion < targetVersion) {
      this.runMigrations(currentVersion, targetVersion);
    }
  }

  private getCurrentSchemaVersion(): number {
    try {
      const result = this.db.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number | null };
      return result.version || 0;
    } catch {
      return 0;
    }
  }

  private getTargetSchemaVersion(): number {
    return 2; // Current schema version
  }

  private runMigrations(fromVersion: number, toVersion: number): void {
    const migrations = this.getMigrations();
    
    for (let version = fromVersion + 1; version <= toVersion; version++) {
      if (migrations[version]) {
        console.log(`Running migration to version ${version}`);
        this.db.exec(migrations[version]);
        this.db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(version);
      }
    }
  }

  private getMigrations(): Record<number, string> {
    return {
      1: `
        -- Create search_cache table
        CREATE TABLE search_cache (
          id TEXT PRIMARY KEY,
          query TEXT NOT NULL,
          sources TEXT NOT NULL, -- JSON array of sources
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL
        );

        -- Create logo_results table
        CREATE TABLE logo_results (
          id TEXT PRIMARY KEY,
          cache_id TEXT NOT NULL,
          url TEXT NOT NULL,
          local_path TEXT,
          source TEXT NOT NULL,
          format TEXT NOT NULL,
          width INTEGER NOT NULL,
          height INTEGER NOT NULL,
          transparent BOOLEAN NOT NULL,
          quality TEXT NOT NULL,
          company_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cache_id) REFERENCES search_cache (id) ON DELETE CASCADE
        );

        -- Create indexes for better performance
        CREATE INDEX idx_search_cache_query ON search_cache (query);
        CREATE INDEX idx_search_cache_expires_at ON search_cache (expires_at);
        CREATE INDEX idx_logo_results_cache_id ON logo_results (cache_id);
        CREATE INDEX idx_logo_results_company_name ON logo_results (company_name);
      `,
      2: `
        -- Add image_info column to store detailed image metadata
        ALTER TABLE logo_results ADD COLUMN image_info TEXT;
        
        -- Add index for local_path to optimize cleanup queries
        CREATE INDEX idx_logo_results_local_path ON logo_results (local_path);
        
        -- Add index for image size queries (using JSON extract)
        CREATE INDEX idx_logo_results_image_size ON logo_results (json_extract(image_info, '$.size'));
      `
    };
  }

  getDatabase(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }

  // Get database file size in bytes
  getDatabaseSize(): number {
    try {
      const stats = fs.statSync(this.dbPath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  // Vacuum database to reclaim space
  vacuum(): void {
    this.db.exec('VACUUM');
  }
}