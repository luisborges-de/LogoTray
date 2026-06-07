import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { LogoGrid } from './components/LogoGrid';
import { VirtualizedLogoGrid } from './components/VirtualizedLogoGrid';
import { LogoResult } from '../types';
import { useDebounce } from './hooks/useDebounce';

interface SystemAppearance {
  shouldUseDarkColors: boolean;
  themeSource: string;
}

const App: React.FC = () => {
  const [appearance, setAppearance] = useState<SystemAppearance | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<LogoResult[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recentLogos, setRecentLogos] = useState<LogoResult[]>([]);
  const [favoriteLogos, setFavoriteLogos] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search query to reduce API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Load recent logos from localStorage
  const loadRecentLogos = useCallback(() => {
    try {
      const stored = localStorage.getItem('logoTray-recentLogos');
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentLogos(parsed.slice(0, 10)); // Limit to 10 recent logos
      }
    } catch (error) {
      console.error('Failed to load recent logos:', error);
    }
  }, []);

  // Load favorites from localStorage
  const loadFavorites = useCallback(() => {
    try {
      const stored = localStorage.getItem('logoTray-favorites');
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavoriteLogos(new Set(parsed));
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback((logoUrl: string) => {
    setFavoriteLogos(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(logoUrl)) {
        newFavorites.delete(logoUrl);
      } else {
        newFavorites.add(logoUrl);
      }
      
      // Save to localStorage
      try {
        localStorage.setItem('logoTray-favorites', JSON.stringify(Array.from(newFavorites)));
      } catch (error) {
        console.error('Failed to save favorites:', error);
      }
      
      return newFavorites;
    });
  }, []);

  // Add logo to recent list
  const addToRecent = useCallback((logo: LogoResult) => {
    setRecentLogos(prev => {
      // Remove if already exists to avoid duplicates
      const filtered = prev.filter(item => item.url !== logo.url);
      // Add to beginning and limit to 10
      const updated = [logo, ...filtered].slice(0, 10);
      
      // Save to localStorage
      try {
        localStorage.setItem('logoTray-recentLogos', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save recent logos:', error);
      }
      
      return updated;
    });
  }, []);

  useEffect(() => {
    const getAppearance = async () => {
      try {
        const systemAppearance = await window.electronAPI.system.getAppearance();
        setAppearance(systemAppearance);
      } catch (error) {
        console.error('Failed to get system appearance:', error);
      }
    };

    getAppearance();
    loadRecentLogos();
    loadFavorites();

    // Auto-focus search input when app opens
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loadRecentLogos, loadFavorites]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key - hide window
      if (event.key === 'Escape') {
        event.preventDefault();
        handleHide();
      }

      // Cmd/Ctrl + Q - quit app
      if ((event.metaKey || event.ctrlKey) && event.key === 'q') {
        event.preventDefault();
        handleQuit();
      }

      // Cmd/Ctrl + K - focus search (common shortcut)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }

      // Cmd/Ctrl + Backspace - clear search
      if ((event.metaKey || event.ctrlKey) && event.key === 'Backspace') {
        event.preventDefault();
        setSearchQuery('');
        setSearchResults([]);
        setHasSearched(false);
        setSearchError(null);
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Memoized search function to prevent unnecessary re-renders
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setHasSearched(true);
    setSearchError(null);
    
    try {
      const results = await window.electronAPI.logo.search(query);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Search failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      setSearchError(errorMessage);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery) {
      handleSearch(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, handleSearch]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleHide = useCallback(async () => {
    try {
      await window.electronAPI.menubar.hide();
    } catch (error) {
      console.error('Failed to hide:', error);
    }
  }, []);

  const handleQuit = useCallback(async () => {
    try {
      await window.electronAPI.app.quit();
    } catch (error) {
      console.error('Failed to quit:', error);
    }
  }, []);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchQuery(value);
  }, []);

  // Memoized computed values
  const isDark = useMemo(() => appearance?.shouldUseDarkColors, [appearance]);
  const shouldUseVirtualization = useMemo(() => searchResults.length > 20, [searchResults.length]);
  
  // Sort recent logos: favorites first, then recent
  const sortedRecentLogos = useMemo(() => {
    return [...recentLogos].sort((a, b) => {
      const aIsFavorite = favoriteLogos.has(a.url);
      const bIsFavorite = favoriteLogos.has(b.url);
      
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return 0; // Keep original order for same type
    });
  }, [recentLogos, favoriteLogos]);

  return (
    <div 
      role="main"
      aria-label="LogoTray Application"
      style={{
        width: '100%',
        height: '100%',
        padding: '16px 12px 8px 12px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: isDark ? '#f9fafb' : '#1f2937',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale'
      }}
    >
      <header style={{
        fontSize: '16px',
        fontWeight: '600',
        margin: '0 0 12px 0',
        letterSpacing: '-0.02em',
        color: isDark ? '#f9fafb' : '#000000'
      }}>
        <h1 style={{ fontSize: 'inherit', fontWeight: 'inherit', margin: 0 }}>
          Logo<span style={{ color: 'rgb(20, 184, 166)' }}>Tray</span>
        </h1>
      </header>

      <div 
        role="search"
        style={{ 
          display: 'flex', 
          alignItems: 'center',
          padding: '10px 12px',
          background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          borderRadius: '8px',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.12)',
          marginBottom: '10px',
          transition: 'all 0.2s ease'
        }}
      >
        <svg 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          aria-hidden="true"
          style={{ 
            marginRight: '8px', 
            color: isDark ? 'rgba(249, 250, 251, 0.8)' : 'rgba(0, 0, 0, 0.6)',
            flexShrink: 0 
          }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search companies or paste domain..."
          onChange={handleInputChange}
          value={searchQuery}
          className={isDark ? 'search-input-dark' : 'search-input-light'}
          aria-label="Search for company logos"
          aria-describedby="search-help"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: '13px',
            color: isDark ? '#f9fafb' : '#111827',
            fontFamily: 'inherit',
            padding: 0,
            margin: 0,
            WebkitTextFillColor: isDark ? '#f9fafb' : '#111827',
            opacity: 1
          }}
        />
      </div>
      <span id="search-help" style={{ display: 'none' }}>
        Type a company name or paste a domain URL to search for logos. Press Escape to close, Cmd+K to focus search.
      </span>

      {/* Recent Logos Section */}
      {sortedRecentLogos.length > 0 && (
        <section 
          aria-label="Recently used logos"
          style={{
            marginBottom: '4px',
          }}
        >
          <h2 style={{
            fontSize: '10px',
            fontWeight: '600',
            color: isDark ? 'rgba(249, 250, 251, 0.6)' : 'rgba(0, 0, 0, 0.6)',
            marginBottom: '3px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: '0 0 3px 0',
          }}>
            Recent
          </h2>
          <LogoGrid
            logos={sortedRecentLogos}
            isLoading={false}
            isDark={isDark || false}
            isRecentSection={true}
            favoriteLogos={favoriteLogos}
            onToggleFavorite={toggleFavorite}
            onDragStart={(logo) => {
              console.log('Drag started for recent logo:', logo.companyName);
              addToRecent(logo); // Move to top of recent list
            }}
            onContextMenu={(logo) => {
              console.log('Context menu for recent logo:', logo.companyName);
            }}
            onCopy={(logo) => {
              console.log('Recent logo copied:', logo.companyName);
            }}
            onSave={(logo) => {
              console.log('Recent logo saved:', logo.companyName);
            }}
          />
        </section>
      )}

      {/* Search Results */}
      {hasSearched && (
        <section 
          aria-label="Search results"
          style={{
            marginBottom: sortedRecentLogos.length > 0 ? '2px' : '4px',
          }}
        >
          <h2 style={{
            fontSize: '10px',
            fontWeight: '600',
            color: isDark ? 'rgba(249, 250, 251, 0.6)' : 'rgba(0, 0, 0, 0.6)',
            marginBottom: '3px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: '0 0 3px 0',
          }}>
            Search Results
          </h2>
        </section>
      )}

      <section 
        aria-label="Logo results"
        aria-live="polite"
        aria-busy={isSearching}
        style={{
          flex: 1,
          marginBottom: '2px',
          overflowY: 'auto',
          overflowX: 'visible',
          minHeight: hasSearched ? '80px' : '140px',
        }}
      >
        {!hasSearched ? (
          <div
            role="status"
            aria-label="Empty state"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px 20px',
              textAlign: 'center',
              minHeight: '140px',
            }}
          >
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
              style={{
                color: isDark ? 'rgba(249, 250, 251, 0.25)' : 'rgba(0, 0, 0, 0.12)',
                marginBottom: '20px',
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <p
              style={{
                fontSize: '13px',
                fontWeight: '500',
                color: isDark ? 'rgba(249, 250, 251, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                marginBottom: '8px',
                letterSpacing: '-0.01em',
              }}
            >
              Search for company logos
            </p>
            <p
              style={{
                fontSize: '11px',
                color: isDark ? 'rgba(249, 250, 251, 0.5)' : 'rgba(0, 0, 0, 0.4)',
                lineHeight: 1.6,
                maxWidth: '240px',
              }}
            >
              Type a company name or paste a domain to find high-quality logos
            </p>
          </div>
        ) : searchError ? (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              textAlign: 'center',
              minHeight: '200px',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
              style={{
                color: 'rgba(239, 68, 68, 0.6)',
                marginBottom: '16px',
              }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p
              style={{
                fontSize: '12px',
                fontWeight: '500',
                color: 'rgba(239, 68, 68, 0.8)',
                marginBottom: '6px',
                letterSpacing: '-0.01em',
              }}
            >
              Search failed
            </p>
            <p
              style={{
                fontSize: '10px',
                color: isDark ? 'rgba(249, 250, 251, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                lineHeight: 1.5,
                maxWidth: '220px',
              }}
            >
              {searchError}
            </p>
          </div>
        ) : shouldUseVirtualization ? (
          <VirtualizedLogoGrid
            logos={searchResults}
            isLoading={isSearching}
            isDark={isDark || false}
            containerHeight={300}
            onDragStart={(logo) => {
              console.log('Drag started for logo:', logo.companyName, 'from', logo.source);
              addToRecent(logo);
            }}
            onContextMenu={(logo) => {
              console.log('Context menu for logo:', logo.companyName);
            }}
            onCopy={(logo) => {
              console.log('Logo copied:', logo.companyName);
            }}
            onSave={(logo) => {
              console.log('Logo saved:', logo.companyName);
            }}
          />
        ) : (
          <LogoGrid
            logos={searchResults}
            isLoading={isSearching}
            isDark={isDark || false}
            onDragStart={(logo) => {
              console.log('Drag started for logo:', logo.companyName, 'from', logo.source);
              addToRecent(logo);
            }}
            onContextMenu={(logo) => {
              console.log('Context menu for logo:', logo.companyName);
            }}
            onCopy={(logo) => {
              console.log('Logo copied:', logo.companyName);
            }}
            onSave={(logo) => {
              console.log('Logo saved:', logo.companyName);
            }}
          />
        )}
      </section>

      <footer 
        role="contentinfo"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '6px',
          marginTop: 'auto',
          paddingTop: '4px'
        }}
      >
        <div style={{
          fontSize: '9px',
          color: isDark ? 'rgba(249, 250, 251, 0.4)' : 'rgba(0, 0, 0, 0.35)',
          fontWeight: '500',
          letterSpacing: '0.02em'
        }}>
          {searchResults.length > 0 && `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handleHide}
            aria-label="Hide window (Escape)"
            title="Hide window (Escape)"
            style={{
              padding: '4px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: '5px',
              fontSize: '10px',
              fontWeight: '500',
              color: isDark ? 'rgba(249, 250, 251, 0.7)' : 'rgba(0, 0, 0, 0.55)',
              cursor: 'pointer',
              letterSpacing: '0.02em',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ESC
          </button>
          <button
            onClick={handleQuit}
            aria-label="Quit application (Command+Q)"
            title="Quit application (⌘Q)"
            style={{
              padding: '4px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: '5px',
              fontSize: '10px',
              fontWeight: '500',
              color: isDark ? 'rgba(249, 250, 251, 0.7)' : 'rgba(0, 0, 0, 0.55)',
              cursor: 'pointer',
              letterSpacing: '0.02em',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ⌘Q
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;