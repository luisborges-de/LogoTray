import React, { useState, useEffect } from 'react';
import { LogoResult } from '../../types';
import { LogoCard } from './LogoCard';
import { ContextMenu } from './ContextMenu';

interface LogoGridProps {
  logos: LogoResult[];
  isLoading: boolean;
  isDark: boolean;
  isRecentSection?: boolean;
  favoriteLogos?: Set<string>;
  onToggleFavorite?: (logoUrl: string) => void;
  onDragStart?: (logo: LogoResult, event: React.DragEvent) => void;
  onContextMenu?: (logo: LogoResult, event: React.MouseEvent) => void;
  onCopy?: (logo: LogoResult) => void;
  onSave?: (logo: LogoResult) => void;
}

export const LogoGrid: React.FC<LogoGridProps> = ({
  logos,
  isLoading,
  isDark,
  isRecentSection = false,
  favoriteLogos,
  onToggleFavorite,
  onDragStart,
  onContextMenu,
  onCopy,
  onSave,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    logo: LogoResult;
    position: { x: number; y: number };
  } | null>(null);

  // Add CSS animations and scrollbar styling
  useEffect(() => {
    const styleId = 'logo-grid-styles';
    let existingStyle = document.getElementById(styleId);
    
    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        /* Hide scrollbar completely */
        .logo-scroll-container::-webkit-scrollbar {
          display: none;
        }

        /* Smooth scrolling momentum */
        .logo-scroll-container {
          /* Removed scroll-snap to prevent automatic scrolling when items move */
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      // Clean up on unmount
      const style = document.getElementById(styleId);
      if (style) {
        style.remove();
      }
    };
  }, [isDark]);

  const handleContextMenu = (logo: LogoResult, event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      logo,
      position: { x: event.clientX, y: event.clientY },
    });
    
    // Call parent handler if provided
    if (onContextMenu) {
      onContextMenu(logo, event);
    }
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleCopy = (logo: LogoResult) => {
    if (onCopy) {
      onCopy(logo);
    }
  };

  const handleSave = (logo: LogoResult) => {
    if (onSave) {
      onSave(logo);
    }
  };
  // Show loading placeholders
  if (isLoading) {
    return (
      <div
        style={{
          overflowX: 'auto',
          overflowY: 'visible',
          padding: '8px 4px 8px 4px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 70px)',
            gap: '10px',
            minWidth: 'fit-content',
            paddingTop: '4px',
            paddingBottom: '6px', // Space for shadows
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

  // Show logo grid with horizontal scrolling
  return (
    <div
      style={{
        position: 'relative',
        padding: '0',
      }}
    >
      {/* Horizontal scroll container */}
      <div
        className="logo-scroll-container"
        style={{
          overflowX: 'auto',
          overflowY: 'visible', // Allow vertical overflow for hover elevation
          padding: '4px 4px 4px 4px',
          scrollBehavior: 'auto',
          WebkitOverflowScrolling: 'touch',
          // Hide scrollbar completely
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
            minWidth: `${logos.length * 78}px`, // Ensure minimum width for scrolling (70px + 8px gap)
            paddingTop: '2px',
            paddingBottom: '2px',
            // Add momentum scrolling for iOS-like feel
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {logos.map((logo, index) => (
            <div
              key={`${logo.url}-${logo.id}`}
              style={{
                // Staggered animation entrance
                animation: `slideInFromRight 0.4s ease-out ${index * 0.05}s both`,
                width: '70px',
                height: '70px',
                flexShrink: 0,
              }}
            >
              <LogoCard
                logo={logo}
                isDark={isDark}
                isRecentSection={isRecentSection}
                isFavorite={favoriteLogos?.has(logo.url) || false}
                onToggleFavorite={onToggleFavorite}
                onDragStart={onDragStart}
                onContextMenu={handleContextMenu}
              />
            </div>
          ))}
        </div>
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

// Loading placeholder component
const LoadingPlaceholder: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  return (
    <div
      style={{
        width: '70px',
        height: '70px',
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
};
