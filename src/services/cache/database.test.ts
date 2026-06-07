import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { DatabaseManager } from './database';
import fs from 'fs';
import path from 'path';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-db-cache')
  }
}));

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;
  let testCacheDir: string;

  beforeAll(() => {
    // Create test cache directory
    testCacheDir = '/tmp/test-db-cache';
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true });
    }
    fs.mkdirSync(testCacheDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up test cache directory
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Clear any existing database
    if (fs.existsSync(path.join(testCacheDir, 'cache'))) {
      fs.rmSync(path.join(testCacheDir, 'cache'), { recursive: true });
    }
    dbManager = new DatabaseManager();
  });

  afterEach(() => {
    dbManager.close();
  });

  describe('initialization', () => {
    it('should create database and tables', () => {
      const db = dbManager.getDatabase();
      
      // Check that tables exist
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as { name: string }[];

      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('schema_version');
      expect(tableNames).toContain('search_cache');
      expect(tableNames).toContain('logo_results');
    });

    it('should set correct schema version', () => {
      const db = dbManager.getDatabase();
      
      const version = db.prepare(`
        SELECT MAX(version) as version FROM schema_version
      `).get() as { version: number };

      expect(version.version).toBe(2);
    });

    it('should create indexes for performance', () => {
      const db = dbManager.getDatabase();
      
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `).all() as { name: string }[];

      const indexNames = indexes.map(i => i.name);
      expect(indexNames).toContain('idx_search_cache_query');
      expect(indexNames).toContain('idx_search_cache_expires_at');
      expect(indexNames).toContain('idx_logo_results_cache_id');
      expect(indexNames).toContain('idx_logo_results_company_name');
    });
  });

  describe('database operations', () => {
    it('should allow inserting and querying data', () => {
      const db = dbManager.getDatabase();
      
      // Insert test data
      const cacheId = 'test-cache-id';
      const query = 'test query';
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      db.prepare(`
        INSERT INTO search_cache (id, query, sources, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(cacheId, query, JSON.stringify(['logo.dev']), expiresAt.toISOString());

      // Query the data
      const result = db.prepare(`
        SELECT * FROM search_cache WHERE id = ?
      `).get(cacheId) as any;

      expect(result).toBeDefined();
      expect(result.id).toBe(cacheId);
      expect(result.query).toBe(query);
      expect(JSON.parse(result.sources)).toEqual(['logo.dev']);
    });

    it('should enforce foreign key constraints', () => {
      const db = dbManager.getDatabase();
      
      // Try to insert logo_result without corresponding search_cache
      expect(() => {
        db.prepare(`
          INSERT INTO logo_results (
            id, cache_id, url, source, format, width, height,
            transparent, quality, company_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'logo-1',
          'non-existent-cache-id',
          'https://example.com/logo.png',
          'logo.dev',
          'png',
          100,
          100,
          1,
          'high',
          'Test Company'
        );
      }).toThrow();
    });

    it('should cascade delete logo_results when search_cache is deleted', () => {
      const db = dbManager.getDatabase();
      
      // Insert search_cache entry
      const cacheId = 'cascade-test';
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      db.prepare(`
        INSERT INTO search_cache (id, query, sources, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(cacheId, 'cascade test', JSON.stringify(['logo.dev']), expiresAt.toISOString());

      // Insert logo_results entry
      db.prepare(`
        INSERT INTO logo_results (
          id, cache_id, url, source, format, width, height,
          transparent, quality, company_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'logo-cascade',
        cacheId,
        'https://example.com/logo.png',
        'logo.dev',
        'png',
        100,
        100,
        1,
        'high',
        'Test Company'
      );

      // Verify both entries exist
      const cacheCount = db.prepare('SELECT COUNT(*) as count FROM search_cache WHERE id = ?').get(cacheId) as { count: number };
      const logoCount = db.prepare('SELECT COUNT(*) as count FROM logo_results WHERE cache_id = ?').get(cacheId) as { count: number };
      
      expect(cacheCount.count).toBe(1);
      expect(logoCount.count).toBe(1);

      // Delete search_cache entry
      db.prepare('DELETE FROM search_cache WHERE id = ?').run(cacheId);

      // Verify logo_results entry was also deleted (cascade)
      const remainingLogos = db.prepare('SELECT COUNT(*) as count FROM logo_results WHERE cache_id = ?').get(cacheId) as { count: number };
      expect(remainingLogos.count).toBe(0);
    });
  });

  describe('utility methods', () => {
    it('should return database size', () => {
      const size = dbManager.getDatabaseSize();
      expect(size).toBeGreaterThan(0);
    });

    it('should vacuum database', () => {
      // This should not throw
      expect(() => dbManager.vacuum()).not.toThrow();
    });
  });

  describe('migration system', () => {
    it('should handle multiple database instances with same schema', () => {
      // Create another database manager instance
      const dbManager2 = new DatabaseManager();
      
      // Both should have the same schema version
      const db1 = dbManager.getDatabase();
      const db2 = dbManager2.getDatabase();
      
      const version1 = db1.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number };
      const version2 = db2.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number };
      
      expect(version1.version).toBe(version2.version);
      
      dbManager2.close();
    });
  });
});