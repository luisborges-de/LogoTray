import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContextMenu } from './ContextMenu';
import { LogoResult, LogoSource } from '../../types';

describe('ContextMenu Basic Functionality', () => {
  const mockLogo: LogoResult = {
    id: 'test-logo-1',
    url: 'https://example.com/logo.png',
    source: LogoSource.LOGO_DEV,
    format: 'png' as const,
    size: { width: 100, height: 100 },
    transparent: true,
    quality: 'high' as const,
    companyName: 'Test Company',
    createdAt: new Date(),
  };

  const defaultProps = {
    logo: mockLogo,
    position: { x: 100, y: 100 },
    isDark: false,
    onClose: vi.fn(),
    onCopy: vi.fn(),
    onSave: vi.fn(),
  };

  it('renders without crashing', () => {
    render(<ContextMenu {...defaultProps} />);
    expect(screen.getByText('Test Company')).toBeInTheDocument();
  });

  it('displays copy and save options', () => {
    render(<ContextMenu {...defaultProps} />);
    
    expect(screen.getByText('Copy Logo')).toBeInTheDocument();
    expect(screen.getByText('Save Logo')).toBeInTheDocument();
  });

  it('shows appropriate icons', () => {
    render(<ContextMenu {...defaultProps} />);
    
    // Check for clipboard and save icons
    expect(screen.getByText('📋')).toBeInTheDocument();
    expect(screen.getByText('💾')).toBeInTheDocument();
  });

  it('renders with dark theme', () => {
    render(<ContextMenu {...defaultProps} isDark={true} />);
    
    expect(screen.getByText('Test Company')).toBeInTheDocument();
    expect(screen.getByText('Copy Logo')).toBeInTheDocument();
    expect(screen.getByText('Save Logo')).toBeInTheDocument();
  });

  it('handles different company names', () => {
    const customLogo = { ...mockLogo, companyName: 'Custom Corp' };
    render(<ContextMenu {...defaultProps} logo={customLogo} />);
    
    expect(screen.getByText('Custom Corp')).toBeInTheDocument();
  });
});