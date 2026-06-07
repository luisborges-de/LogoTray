import React, { useState } from 'react';
import { LogoResult } from '../../types';
import { DragHandler } from '../../services/drag';

interface LogoCardProps {
  logo: LogoResult;
  isDark: boolean;
  isRecentSection?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (logoUrl: string) => void;
  onDragStart?: (logo: LogoResult, event: React.DragEvent) => void;
  onContextMenu?: (logo: LogoResult, event: React.MouseEvent) => void;
}

export const LogoCard: React.FC<LogoCardProps> = ({
  logo,
  isDark,
  isRecentSection = false,
  isFavorite = false,
  onToggleFavorite,
  onDragStart,
  onContextMenu,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

  const dragHandler = DragHandler.getInstance();

  const handleDragStart = async (event: React.DragEvent) => {
    try {
      setIsDragging(true);
      setDragError(null);
      
      // Call the drag handler to set up the drag operation
      await dragHandler.initiateDrag(logo, event.nativeEvent);
      
      // Call the parent handler if provided
      if (onDragStart) {
        onDragStart(logo, event);
      }
    } catch (error) {
      console.error('Drag start failed:', error);
      setDragError(error instanceof Error ? error.message : 'Drag failed');
      setIsDragging(false);
    }
  };

  const handleDragEnd = (event: React.DragEvent) => {
    try {
      const result = dragHandler.handleDragEnd(event.nativeEvent);
      
      if (!result.success && result.error) {
        setDragError(result.error);
      }
    } catch (error) {
      console.error('Drag end failed:', error);
      setDragError(error instanceof Error ? error.message : 'Drag completion failed');
    } finally {
      setIsDragging(false);
      
      // Clear error after a delay
      if (dragError) {
        setTimeout(() => setDragError(null), 3000);
      }
    }
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    if (onContextMenu) {
      onContextMenu(logo, event);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: '70px',
        height: '70px',
        borderRadius: '12px',
        background: isDark
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(255, 255, 255, 0.8)',
        border: `1px solid ${
          dragError
            ? 'rgba(239, 68, 68, 0.4)'
            : isDragging
            ? 'rgba(34, 197, 94, 0.4)'
            : isHovered
            ? isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'
            : isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.08)'
        }`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        cursor: isDragging ? 'grabbing' : isHovered ? 'grab' : 'grab',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isDragging 
          ? 'translateY(-2px)' 
          : isHovered 
          ? 'translateY(-2px)' 
          : 'translateY(0)',
        boxShadow: dragError
          ? isDark
            ? '0 8px 24px rgba(239, 68, 68, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)'
            : '0 8px 24px rgba(239, 68, 68, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)'
          : isDragging
          ? isDark
            ? '0 8px 24px rgba(34, 197, 94, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)'
            : '0 8px 24px rgba(34, 197, 94, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)'
          : isHovered
          ? isDark
            ? '0 4px 16px rgba(0, 0, 0, 0.3)'
            : '0 4px 16px rgba(0, 0, 0, 0.1)'
          : isDark
          ? '0 2px 8px rgba(0, 0, 0, 0.2)'
          : '0 2px 8px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
        display: imageError ? 'none' : 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        opacity: isDragging ? 0.7 : 1,
      }}
    >


      {/* Drag state indicator */}
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.8)',
            boxShadow: '0 0 12px rgba(34, 197, 94, 0.6)',
            animation: 'pulse 0.8s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Error indicator */}
      {dragError && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.8)',
            boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Logo image */}
      <img
        src={logo.url}
        alt={logo.companyName}
        onError={() => setImageError(true)}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          position: 'relative',
          zIndex: 1,
          filter: isHovered ? 'brightness(1.1)' : 'brightness(1)',
          transition: 'filter 0.2s ease',
        }}
      />

      {/* Source badge */}
      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          padding: '2px 3px',
          borderRadius: '3px',
          background: isDark
            ? 'rgba(0, 0, 0, 0.6)'
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          fontSize: '6px',
          fontWeight: '600',
          color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
          textTransform: 'uppercase',
          letterSpacing: '0.2px',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s ease',
          pointerEvents: 'none',
          maxWidth: 'calc(100% - 8px)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: '1',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {logo.source}
      </div>

      {/* Favorite star button - only for recent section */}
      {isRecentSection && onToggleFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(logo.url);
          }}
          style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            width: '14px',
            height: '14px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            opacity: isHovered || isFavorite ? 1 : 0,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill={isFavorite ? 'rgb(20, 184, 166)' : 'none'}
            stroke="rgb(20, 184, 166)"
            strokeWidth="2"
            style={{
              transition: 'all 0.2s ease',
              filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))',
            }}
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        </button>
      )}

      {/* Transparent indicator */}
      {logo.transparent && !isDragging && !dragError && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.8)',
            boxShadow: '0 0 8px rgba(34, 197, 94, 0.4)',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Drag instruction tooltip */}
      {isHovered && !isDragging && !dragError && (
        <div
          style={{
            position: 'absolute',
            bottom: '-28px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 8px',
            borderRadius: '6px',
            background: isDark
              ? 'rgba(0, 0, 0, 0.8)'
              : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            fontSize: '9px',
            fontWeight: '500',
            color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 10,
            border: `1px solid ${
              isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
        >
          Drag to app or right-click
        </div>
      )}

      {/* Error message tooltip */}
      {dragError && (
        <div
          style={{
            position: 'absolute',
            bottom: '-32px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 8px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.9)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            fontSize: '9px',
            fontWeight: '500',
            color: 'white',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 10,
            border: '1px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            maxWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {dragError}
        </div>
      )}
    </div>
  );
};
