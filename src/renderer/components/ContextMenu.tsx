import React, { useEffect, useRef, useState } from 'react';
import { LogoResult } from '../../types';
import { DragHandler } from '../../services/drag';

interface ContextMenuProps {
  logo: LogoResult;
  position: { x: number; y: number };
  isDark: boolean;
  onClose: () => void;
  onCopy?: (logo: LogoResult) => void;
  onSave?: (logo: LogoResult) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  logo,
  position,
  isDark,
  onClose,
  onCopy,
  onSave,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const dragHandler = DragHandler.getInstance();

  // Show menu with animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Handle clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 150); // Wait for animation to complete
  };

  const handleCopy = async () => {
    if (copyStatus === 'copying') return;
    
    setCopyStatus('copying');
    
    try {
      const result = await dragHandler.copyToClipboard(logo);
      
      if (result.success) {
        setCopyStatus('success');
        if (onCopy) {
          onCopy(logo);
        }
        
        // Auto-close after success
        setTimeout(() => {
          handleClose();
        }, 800);
      } else {
        setCopyStatus('error');
        console.error('Copy failed:', result.error);
        
        // Reset status after error
        setTimeout(() => {
          setCopyStatus('idle');
        }, 2000);
      }
    } catch (error) {
      setCopyStatus('error');
      console.error('Copy operation failed:', error);
      
      // Reset status after error
      setTimeout(() => {
        setCopyStatus('idle');
      }, 2000);
    }
  };

  const handleSave = async () => {
    if (saveStatus === 'saving') return;
    
    setSaveStatus('saving');
    
    try {
      const result = await dragHandler.saveToFile(logo);
      
      if (result.success) {
        setSaveStatus('success');
        if (onSave) {
          onSave(logo);
        }
        
        // Auto-close after success
        setTimeout(() => {
          handleClose();
        }, 800);
      } else {
        setSaveStatus('error');
        console.error('Save failed:', result.error);
        
        // Reset status after error
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Save operation failed:', error);
      
      // Reset status after error
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }
  };

  // Calculate menu position to ensure it stays within viewport
  const getMenuStyle = () => {
    const menuWidth = 160;
    const menuHeight = 80;
    const padding = 8;
    
    let x = position.x;
    let y = position.y;
    
    // Adjust horizontal position if menu would go off-screen
    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding;
    }
    if (x < padding) {
      x = padding;
    }
    
    // Adjust vertical position if menu would go off-screen
    if (y + menuHeight > window.innerHeight - padding) {
      y = position.y - menuHeight;
    }
    if (y < padding) {
      y = padding;
    }
    
    return {
      left: `${x}px`,
      top: `${y}px`,
    };
  };

  const getCopyIcon = () => {
    switch (copyStatus) {
      case 'copying':
        return '⏳';
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      default:
        return '📋';
    }
  };

  const getSaveIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return '⏳';
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      default:
        return '💾';
    }
  };

  const getCopyText = () => {
    switch (copyStatus) {
      case 'copying':
        return 'Copying...';
      case 'success':
        return 'Copied!';
      case 'error':
        return 'Copy failed';
      default:
        return 'Copy Logo';
    }
  };

  const getSaveText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'success':
        return 'Saved!';
      case 'error':
        return 'Save failed';
      default:
        return 'Save Logo';
    }
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        zIndex: 1000,
        minWidth: '160px',
        borderRadius: '8px',
        background: isDark
          ? 'rgba(30, 30, 30, 0.95)'
          : 'rgba(255, 255, 255, 0.95)',
        border: `1px solid ${
          isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: isDark
          ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2)'
          : '0 8px 32px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-4px)',
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        transformOrigin: 'top left',
        overflow: 'hidden',
        ...getMenuStyle(),
      }}
    >
      {/* Menu header with logo info */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${
            isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          }`,
          fontSize: '11px',
          fontWeight: '600',
          color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '3px',
            background: `url(${logo.url}) center/contain no-repeat`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {logo.companyName}
        </span>
      </div>

      {/* Menu items */}
      <div style={{ padding: '4px 0' }}>
        {/* Copy option */}
        <button
          onClick={handleCopy}
          disabled={copyStatus === 'copying'}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: 'transparent',
            color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
            fontSize: '13px',
            fontWeight: '500',
            textAlign: 'left',
            cursor: copyStatus === 'copying' ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.1s ease',
            opacity: copyStatus === 'copying' ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (copyStatus === 'idle') {
              e.currentTarget.style.background = isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.05)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>
            {getCopyIcon()}
          </span>
          <span>{getCopyText()}</span>
        </button>

        {/* Save option */}
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: 'transparent',
            color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
            fontSize: '13px',
            fontWeight: '500',
            textAlign: 'left',
            cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.1s ease',
            opacity: saveStatus === 'saving' ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (saveStatus === 'idle') {
              e.currentTarget.style.background = isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.05)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>
            {getSaveIcon()}
          </span>
          <span>{getSaveText()}</span>
        </button>
      </div>
    </div>
  );
};