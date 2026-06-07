import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LogoGrid } from './LogoGrid';
import { LogoResult, LogoSource } from '../../types';

describe('Context Menu Integration with LogoGrid', () => {
  const mockLogos: LogoResult[] = [
    {
      id: 'test-logo-1',
      url: 'https://example.com/logo1.png',
      source: LogoSource.LOGO_DEV,
      format: 'png' as const,
      size: { width: 100, height: 100 },
      transparent: true,
      quality: 'high' as const,
      companyName: 'Test Company 1',
      createdAt: new Date(),
    },
    {
      id: 'test-logo-2',
      url: 'https://example.com/logo2.png',
      source: LogoSource.BRANDFETCH,
      format: 'png' as const,
      size: { width: 100, height: 100 },
      transparent: false,
      quality: 'medium' as const,
      companyName: 'Test Company 2',
      createdAt: new Date(),
    },
  ];

  const defaultProps = {
    logos: mockLogos,
    isLoading: false,
    isDark: false,
    onDragStart: vi.fn(),
    onContextMenu: vi.fn(),
    onCopy: vi.fn(),
    onSave: vi.fn(),
  };

  it('renders logos without context menu initially', () => {
    render(<LogoGrid {...defaultProps} />);
    
    // Should show logos
    expect(screen.getByAltText('Test Company 1')).toBeInTheDocument();
    expect(screen.getByAltText('Test Company 2')).toBeInTheDocument();
    
    // Should not show context menu initially
    expect(screen.queryByText('Copy Logo')).not.toBeInTheDocument();
    expect(screen.queryByText('Save Logo')).not.toBeInTheDocument();
  });

  it('shows context menu when right-clicking on a logo', () => {
    render(<LogoGrid {...defaultProps} />);
    
    const logoImage = screen.getByAltText('Test Company 1');
    
    // Right-click on the logo
    fireEvent.contextMenu(logoImage);
    
    // Context menu should appear
    expect(screen.getByText('Test Company 1')).toBeInTheDocument();
    expect(screen.getByText('Copy Logo')).toBeInTheDocument();
    expect(screen.getByText('Save Logo')).toBeInTheDocument();
  });

  it('shows context menu with correct company name', () => {
    render(<LogoGrid {...defaultProps} />);
    
    const logoImage = screen.getByAltText('Test Company 2');
    
    // Right-click on the second logo
    fireEvent.contextMenu(logoImage);
    
    // Context menu should show the correct company name
    expect(screen.getByText('Test Company 2')).toBeInTheDocument();
  });

  it('applies dark theme to context menu when isDark is true', () => {
    render(<LogoGrid {...defaultProps} isDark={true} />);
    
    const logoImage = screen.getByAltText('Test Company 1');
    
    // Right-click to show context menu
    fireEvent.contextMenu(logoImage);
    
    // Context menu should be visible with dark theme
    expect(screen.getByText('Copy Logo')).toBeInTheDocument();
    expect(screen.getByText('Save Logo')).toBeInTheDocument();
  });

  it('calls onContextMenu callback when right-clicking', () => {
    render(<LogoGrid {...defaultProps} />);
    
    const logoImage = screen.getByAltText('Test Company 1');
    
    // Right-click on the logo
    fireEvent.contextMenu(logoImage);
    
    // Should call the callback
    expect(defaultProps.onContextMenu).toHaveBeenCalledWith(
      mockLogos[0],
      expect.any(Object)
    );
  });

  it('shows context menu icons correctly', () => {
    render(<LogoGrid {...defaultProps} />);
    
    const logoImage = screen.getByAltText('Test Company 1');
    
    // Right-click to show context menu
    fireEvent.contextMenu(logoImage);
    
    // Should show the correct icons
    expect(screen.getByText('📋')).toBeInTheDocument(); // Copy icon
    expect(screen.getByText('💾')).toBeInTheDocument(); // Save icon
  });

  it('handles empty logo list correctly', () => {
    render(<LogoGrid {...defaultProps} logos={[]} />);
    
    // Should show empty state
    expect(screen.getByText('No logos found')).toBeInTheDocument();
    
    // Should not show any context menu
    expect(screen.queryByText('Copy Logo')).not.toBeInTheDocument();
  });

  it('handles loading state correctly', () => {
    render(<LogoGrid {...defaultProps} isLoading={true} />);
    
    // Should show loading placeholders, not actual logos
    expect(screen.queryByAltText('Test Company 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Copy Logo')).not.toBeInTheDocument();
  });
});