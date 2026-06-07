import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DragHandler } from './DragHandler';

// Define types locally to avoid import issues in tests
enum LogoSource {
  LOGO_DEV = 'logo.dev',
  BRANDFETCH = 'brandfetch',
  API_NINJAS = 'api-ninjas',
  WIKIDATA = 'wikidata',
  ICONHORSE = 'iconhorse'
}

interface LogoResult {
  id: string;
  url: string;
  localPath?: string;
  source: LogoSource;
  format: 'png' | 'svg' | 'jpg';
  size: {
    width: number;
    height: number;
  };
  transparent: boolean;
  quality: 'high' | 'medium' | 'low';
  companyName: string;
  createdAt: Date;
}

// Mock DOM and window
const mockDocument = {
  createElement: vi.fn(() => ({
    style: {},
    appendChild: vi.fn(),
  })),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    contains: vi.fn(() => true),
  },
};

const mockElectronAPI = {
  invoke: vi.fn(),
};

// Mock global objects
global.document = mockDocument as any;
global.window = {
  electronAPI: mockElectronAPI,
} as any;

global.setTimeout = vi.fn((fn) => fn()) as any;

describe('DragHandler', () => {
  let dragHandler: DragHandler;
  let mockLogo: LogoResult;
  let mockDragEvent: DragEvent;

  beforeEach(() => {
    dragHandler = DragHandler.getInstance();
    
    mockLogo = {
      id: 'test-logo-1',
      url: 'https://example.com/logo.png',
      source: LogoSource.LOGO_DEV,
      format: 'png',
      size: { width: 200, height: 200 },
      transparent: true,
      quality: 'high',
      companyName: 'Test Company',
      createdAt: new Date(),
    };

    // Mock DataTransfer
    const mockDataTransfer = {
      effectAllowed: '',
      setData: vi.fn(),
      setDragImage: vi.fn(),
      dropEffect: 'copy',
    };

    mockDragEvent = {
      dataTransfer: mockDataTransfer,
      preventDefault: vi.fn(),
    } as unknown as DragEvent;

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('initiateDrag', () => {
    it('should set up drag operation with correct data', async () => {
      mockElectronAPI.invoke.mockResolvedValue('/tmp/test_company_logo.png');

      await dragHandler.initiateDrag(mockLogo, mockDragEvent);

      expect(mockDragEvent.dataTransfer?.effectAllowed).toBe('copy');
      expect(mockDragEvent.dataTransfer?.setData).toHaveBeenCalledWith(
        'DownloadURL',
        'png:test_company_logo.png:file:///tmp/test_company_logo.png'
      );
      expect(mockDragEvent.dataTransfer?.setData).toHaveBeenCalledWith(
        'text/uri-list',
        mockLogo.url
      );
      expect(mockDragEvent.dataTransfer?.setData).toHaveBeenCalledWith(
        'text/plain',
        mockLogo.url
      );
    });

    it('should handle IPC failure gracefully', async () => {
      mockElectronAPI.invoke.mockRejectedValue(new Error('IPC failed'));

      await dragHandler.initiateDrag(mockLogo, mockDragEvent);

      expect(mockDragEvent.dataTransfer?.setData).toHaveBeenCalledWith(
        'DownloadURL',
        'png:test_company_logo.png:https://example.com/logo.png'
      );
    });

    it('should create drag image element', async () => {
      await dragHandler.initiateDrag(mockLogo, mockDragEvent);

      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });
  });

  describe('handleDragEnd', () => {
    it('should return success when drop effect is not none', () => {
      const result = dragHandler.handleDragEnd(mockDragEvent);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return failure when drop effect is none', () => {
      if (mockDragEvent.dataTransfer) {
        mockDragEvent.dataTransfer.dropEffect = 'none';
      }

      const result = dragHandler.handleDragEnd(mockDragEvent);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Drag operation was cancelled or failed');
    });
  });

  describe('copyToClipboard', () => {
    it('should call IPC to copy image to clipboard', async () => {
      mockElectronAPI.invoke.mockResolvedValue({ success: true });

      const result = await dragHandler.copyToClipboard(mockLogo);

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith('clipboard:writeImage', {
        url: mockLogo.url,
        logoData: mockLogo,
      });
      expect(result.success).toBe(true);
    });

    it('should handle clipboard operation failure', async () => {
      mockElectronAPI.invoke.mockRejectedValue(new Error('Clipboard failed'));

      const result = await dragHandler.copyToClipboard(mockLogo);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Clipboard failed');
    });
  });

  describe('saveToFile', () => {
    it('should call IPC to save file', async () => {
      mockElectronAPI.invoke.mockResolvedValue({ 
        success: true, 
        filePath: '/Users/test/Downloads/test_company_logo.png' 
      });

      const result = await dragHandler.saveToFile(mockLogo);

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith('file:saveDialog', {
        url: mockLogo.url,
        defaultName: 'test_company_logo.png',
        logoData: mockLogo,
      });
      expect(result.success).toBe(true);
    });

    it('should handle save operation failure', async () => {
      mockElectronAPI.invoke.mockResolvedValue({ 
        success: false, 
        error: 'Save cancelled' 
      });

      const result = await dragHandler.saveToFile(mockLogo);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Save cancelled');
    });
  });

  describe('getCurrentDraggedLogo', () => {
    it('should return null initially', () => {
      expect(dragHandler.getCurrentDraggedLogo()).toBeNull();
    });

    it('should return the currently dragged logo', async () => {
      await dragHandler.initiateDrag(mockLogo, mockDragEvent);
      
      expect(dragHandler.getCurrentDraggedLogo()).toBe(mockLogo);
    });

    it('should reset to null after drag end', async () => {
      await dragHandler.initiateDrag(mockLogo, mockDragEvent);
      dragHandler.handleDragEnd(mockDragEvent);
      
      expect(dragHandler.getCurrentDraggedLogo()).toBeNull();
    });
  });
});