import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { LogoResult } from '../../types';
import { LogoCard } from './LogoCard';
import { ContextMenu } from './ContextMenu';

interface VirtualizedLogoGridProps {
  logos: LogoResult[];
  isLoading: boolean;
  isDark: boolean;
  onDragStart?: (logo: LogoResult, event: React.DragEvent) => void;
  onContextMenu?: (logo: LogoResult, event: React.MouseEvent) => void;
  onCopy?: (logo: LogoResult) => void;
  onSave?: (logo: LogoResult) => void;
  containerHeight?: number;
  itemSize?: number;
  overscan?: number;
}

interface VirtualItem {
  index: number;
  logo: LogoResult;
  top: number;
  height: number;
}

export const VirtualizedLogoGrid: React.FC<VirtualizedLogoGridProps> = ({
  logos,
  isLoading,
  isDark,
  onDragStart,
  onContextMenu,
  onCopy,
  onSave,
  containerHeight = 300,
  itemSize = 70, // 60px + 10px gap
  overscan = 5,
}) => {
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    logo: LogoResult;
    position: { x: number; y: number };
  } | null>(null);

  // Calculate horizontal grid dimensions
  const itemWidth = itemSize;
  const totalWidth = logos.length * itemWidth;

  // Calculate visible items for horizontal scrolling
  const visibleItems = useMemo(() => {
    if (logos.length === 0) return [];

    const startIndex = Math.max(0, Math.floor(scrollLeft / itemWidth) - overscan);
    const endIndex = Math.min(
      logos.length - 1,
      Math.ceil((scrollLeft + containerWidth) / itemWidth) + overscan
    );

    const items: VirtualItem[] = [];
    
    for (let index = startIndex; index <= endIndex; index++) {
      if (index >= logos.length) break;

      items.push({
        index,
        logo: logos[index],
        top: 0, // All items are on the same row for horizontal layout
        height: 60, // Fixed height for logo cards
      });
    }

    return items;
  }, [logos, scrollLeft, containerWidth, itemWidth, overscan]);

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(event.currentTarget.scrollLeft);
  }, []);

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Context menu handlers
  const handleContextMenu = useCallback((logo: LogoResult, event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      logo,
      position: { x: event.clientX, y: event.clientY },
    });
    
    if (onContextMenu) {
      onContextMenu(logo, event);
    }
  }, [onContextMenu]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCopy = useCallback((logo: LogoResult) => {
    if (onCopy) {
      onCopy(logo);
    }
    setContextMenu(null);
  }, [onCopy]);

  const handleSave = useCallback((logo: LogoResult) => {
    if (onSave) {
      onSave(logo);
    }
    setContextMenu(null);
  }, [onSave]);

  // Show loading placeholders
  if (isLoading) {
    return (
      <div
        ref={containerRef}
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          padding: '8px 4px 4px 4px',
          height: containerHeight,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 60px)',
            gap: '10px',
            minWidth: 'fit-content',
            paddingBottom: '4px', // Space for scrollbar
          }}
        >
          {[...Array(6)].map((_, index) => (
            <LoadingPlaceholder key={index} isDark={isDark} />
          ))}
        </div>
      </div>
    );
  }

  // Show empty state
  if (logos.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
          height: containerHeight,
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{
            color: isDark ? 'rgba(249, 250, 251, 0.3)' : 'rgba(0, 0, 0, 0.15)',
            marginBottom: '16px',
          }}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <p
          style={{
            fontSize: '12px',
            fontWeight: '500',
            color: isDark ? 'rgba(249, 250, 251, 0.6)' : 'rgba(0, 0, 0, 0.6)',
            marginBottom: '6px',
            letterSpacing: '-0.01em',
          }}
        >
          No logos found
        </p>
        <p
          style={{
            fontSize: '10px',
            color: isDark ? 'rgba(249, 250, 251, 0.5)' : 'rgba(0, 0, 0, 0.5)',
            lineHeight: 1.5,
            maxWidth: '220px',
          }}
        >
          Try searching for a different company name or check your spelling
        </p>
      </div>
    );
  }

  // Show virtualized grid
  return (
    <div
      ref={containerRef}
      style={{
        height: containerHeight,
        overflowX: 'auto',
        overflowY: 'hidden',
        position: 'relative',
        padding: '8px 4px 4px 4px',
      }}
      onScroll={handleScroll}
    >
      {/* Virtual container */}
      <div
        style={{
          width: totalWidth,
          height: '60px', // Fixed height for horizontal layout
          position: 'relative',
          paddingBottom: '4px', // Space for scrollbar
        }}
      >
        {/* Visible items */}
        {visibleItems.map((item) => (
          <div
            key={item.logo.id}
            style={{
              position: 'absolute',
              left: item.index * itemWidth,
              top: 0,
              width: '60px',
              height: '60px',
            }}
          >
            <LazyLogoCard
              logo={item.logo}
              isDark={isDark}
              onDragStart={onDragStart}
              onContextMenu={handleContextMenu}
              isVisible={true} // All items in visibleItems are visible
            />
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          logo={contextMenu.logo}
          position={contextMenu.position}
          isDark={isDark}
          onClose={handleCloseContextMenu}
          onCopy={handleCopy}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Lazy loading logo card component
interface LazyLogoCardProps {
  logo: LogoResult;
  isDark: boolean;
  onDragStart?: (logo: LogoResult, event: React.DragEvent) => void;
  onContextMenu?: (logo: LogoResult, event: React.MouseEvent) => void;
  isVisible: boolean;
}

const LazyLogoCard: React.FC<LazyLogoCardProps> = React.memo(({
  logo,
  isDark,
  onDragStart,
  onContextMenu,
  isVisible,
}) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1,
      }
    );

    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Load immediately if visible (for virtualized items)
  useEffect(() => {
    if (isVisible) {
      setShouldLoad(true);
    }
  }, [isVisible]);

  return (
    <div ref={elementRef} style={{ width: '100%', height: '100%' }}>
      {shouldLoad ? (
        <LogoCard
          logo={logo}
          isDark={isDark}
          onDragStart={onDragStart}
          onContextMenu={onContextMenu}
        />
      ) : (
        <LoadingPlaceholder isDark={isDark} />
      )}
    </div>
  );
});

LazyLogoCard.displayName = 'LazyLogoCard';

// Loading placeholder component
const LoadingPlaceholder: React.FC<{ isDark: boolean }> = React.memo(({ isDark }) => {
  return (
    <div
      style={{
        aspectRatio: '1',
        borderRadius: '12px',
        background: isDark
          ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 100%)'
          : 'linear-gradient(90deg, rgba(0, 0, 0, 0.04) 0%, rgba(0, 0, 0, 0.08) 50%, rgba(0, 0, 0, 0.04) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        border: `1px solid ${
          isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'
        }`,
      }}
    />
  );
});

LoadingPlaceholder.displayName = 'LoadingPlaceholder';