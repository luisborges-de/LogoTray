import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.electronAPI for all tests
const mockElectronAPI = {
  invoke: vi.fn(),
  window: {
    show: vi.fn(),
    hide: vi.fn(),
    toggle: vi.fn(),
  },
  menubar: {
    show: vi.fn(),
    hide: vi.fn(),
    toggle: vi.fn(),
  },
  system: {
    getAppearance: vi.fn().mockResolvedValue({
      shouldUseDarkColors: false,
      themeSource: 'system',
    }),
    onAppearanceChanged: vi.fn(),
  },
  app: {
    quit: vi.fn(),
    getVersion: vi.fn().mockResolvedValue('1.0.0'),
  },
  logo: {
    search: vi.fn().mockResolvedValue([]),
  },
  drag: {
    createTempFile: vi.fn(),
  },
  clipboard: {
    writeImage: vi.fn(),
  },
  file: {
    saveDialog: vi.fn(),
  },
  on: vi.fn(),
  removeAllListeners: vi.fn(),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Mock jest functions for vitest compatibility
global.jest = {
  fn: vi.fn,
  clearAllMocks: vi.clearAllMocks,
} as any;