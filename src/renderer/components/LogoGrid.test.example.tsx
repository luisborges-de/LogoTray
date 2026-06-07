/**
 * Example usage of LogoGrid component
 * This file demonstrates how the component works with mock data
 */

import React from 'react';
import { LogoGrid } from './LogoGrid';
import { LogoResult, LogoSource } from '../../types';

// Mock logo data for testing
const mockLogos: LogoResult[] = [
  {
    id: '1',
    url: 'https://logo.clearbit.com/apple.com',
    source: LogoSource.LOGO_DEV,
    format: 'png',
    size: { width: 128, height: 128 },
    transparent: true,
    quality: 'high',
    companyName: 'Apple',
    createdAt: new Date(),
  },
  {
    id: '2',
    url: 'https://logo.clearbit.com/google.com',
    source: LogoSource.BRANDFETCH,
    format: 'png',
    size: { width: 128, height: 128 },
    transparent: true,
    quality: 'high',
    companyName: 'Google',
    createdAt: new Date(),
  },
  {
    id: '3',
    url: 'https://logo.clearbit.com/microsoft.com',
    source: LogoSource.API_NINJAS,
    format: 'png',
    size: { width: 128, height: 128 },
    transparent: false,
    quality: 'medium',
    companyName: 'Microsoft',
    createdAt: new Date(),
  },
];

// Example 1: Loading state
export const LoadingExample = () => (
  <LogoGrid
    logos={[]}
    isLoading={true}
    isDark={false}
  />
);

// Example 2: Empty state
export const EmptyExample = () => (
  <LogoGrid
    logos={[]}
    isLoading={false}
    isDark={false}
  />
);

// Example 3: With results (light mode)
export const WithResultsLight = () => (
  <LogoGrid
    logos={mockLogos}
    isLoading={false}
    isDark={false}
    onDragStart={(logo) => console.log('Dragging:', logo.companyName)}
    onContextMenu={(logo) => console.log('Context menu:', logo.companyName)}
  />
);

// Example 4: With results (dark mode)
export const WithResultsDark = () => (
  <LogoGrid
    logos={mockLogos}
    isLoading={false}
    isDark={true}
    onDragStart={(logo) => console.log('Dragging:', logo.companyName)}
    onContextMenu={(logo) => console.log('Context menu:', logo.companyName)}
  />
);
