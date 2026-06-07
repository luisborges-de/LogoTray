# SQLite Caching System

This module provides a robust SQLite-based caching system for LogoBuddy, designed to store search results and downloaded logo images locally for fast retrieval.

## Features

- **SQLite Database**: Uses better-sqlite3 for high-performance local storage
- **Schema Migrations**: Automatic database schema versioning and migrations
- **Image Caching**: Downloads and stores logo images locally
- **Cache Expiration**: Automatic cleanup of expired cache entries
- **Size Management**: Configurable cache size limits with automatic cleanup
- **Error Handling**: Graceful handling of database and network errors
- **Performance Optimized**: Indexes and WAL mode for fast queries

## Architecture

### Components

1. **DatabaseManager**: Handles SQLite database initialization, migrations, and low-level operations
2. **CacheManager**: High-level cache operations including CRUD, image downloading, and cleanup
3. **Types**: TypeScript interfaces for cache data structures

### Database Schema

```sql
-- Search cache entries
CREATE TABLE search_cache (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  sources TEXT NOT NULL, -- JSON array of sources
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

-- Logo results for each search
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
```

## Usage

### Basic Usage

```typescript
import { CacheManager } from './services/cache';
import { LogoSource } from './services/api/types';

// Initialize cache manager
const cacheManager = new CacheManager({
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
  expirationDays: 7, // 7 days
  maxImageSizeBytes: 5 * 1024 * 1024 // 5MB per image
});

// Cache search results
const logoResults = [/* ... logo results from API ... */];
await cacheManager.cacheResults('apple', logoResults, [LogoSource.LOGO_DEV]);

// Retrieve cached results
const cachedResults = await cacheManager.getCachedResults('apple');

// Download and cache images
for (const logo of cachedResults) {
  const localPath = await cacheManager.downloadAndCacheImage(logo.url, logo.id);
  console.log(`Image cached at: ${localPath}`);
}

// Clean up when done
cacheManager.close();
```

### Configuration Options

```typescript
interface CacheConfig {
  maxSizeBytes: number;      // Maximum total cache size (default: 100MB)
  expirationDays: number;    // Days before cache expires (default: 7)
  maxImageSizeBytes: number; // Maximum individual image size (default: 5MB)
}
```

### Cache Management

```typescript
// Get cache statistics
const stats = cacheManager.getCacheStats();
console.log({
  totalEntries: stats.totalEntries,
  totalSize: stats.totalSize,
  oldestEntry: stats.oldestEntry,
  newestEntry: stats.newestEntry
});

// Clean up expired entries
await cacheManager.cleanupExpiredCache();

// Clear all cache data
await cacheManager.clearCache();
```

## File Structure

```
src/services/cache/
├── index.ts              # Main exports
├── CacheManager.ts       # High-level cache operations
├── database.ts           # Database management and migrations
├── types.ts              # TypeScript interfaces
├── CacheManager.test.ts  # CacheManager unit tests
├── database.test.ts      # DatabaseManager unit tests
├── example.ts            # Usage examples
└── README.md            # This documentation
```

## Cache Storage Locations

- **Database**: `{userData}/cache/logos.db`
- **Images**: `{userData}/cache/images/`

Where `{userData}` is the Electron app's user data directory.

## Performance Considerations

### Database Optimizations

- **WAL Mode**: Write-Ahead Logging for better concurrent access
- **Indexes**: Optimized queries with proper indexing
- **Prepared Statements**: Reused prepared statements for better performance
- **Transactions**: Batch operations in transactions

### Cache Strategies

- **LRU-style Cleanup**: Removes oldest entries when size limits are exceeded
- **Lazy Expiration**: Expired entries are cleaned up during normal operations
- **Size Monitoring**: Automatic cleanup when cache size exceeds limits

## Error Handling

The cache system handles various error scenarios gracefully:

- **Database Errors**: Returns null for failed operations, logs errors
- **Network Errors**: Throws errors for image download failures
- **Disk Space**: Monitors and cleans up when space is low
- **Corrupted Data**: Validates data integrity and rebuilds if needed

## Testing

Run the cache system tests:

```bash
npm test -- src/services/cache
```

The test suite covers:
- Database initialization and migrations
- CRUD operations for cache entries
- Image downloading and caching
- Cache expiration and cleanup
- Error handling scenarios
- Performance and concurrency

## Migration System

The database uses a simple migration system:

1. **Schema Versioning**: Each schema change gets a version number
2. **Automatic Migration**: Runs migrations on database initialization
3. **Forward Compatibility**: New versions can read older database formats
4. **Safe Upgrades**: Migrations are wrapped in transactions

To add a new migration:

1. Increment the target version in `getTargetSchemaVersion()`
2. Add the migration SQL to the `getMigrations()` method
3. Test the migration with existing data

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **7.1**: Local cache system with SQLite database
- **7.2**: Cache expiration and cleanup policies
- **7.4**: Database initialization and management
- **7.5**: Cache size monitoring and automatic cleanup

## Integration

The cache system integrates with:

- **APIManager**: Caches search results from multiple logo sources
- **Main Process**: Stores cache in user data directory
- **Renderer Process**: Provides cached results for instant display
- **File System**: Downloads and manages local image files