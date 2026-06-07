import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DragHandler } from './DragHandler';

// Integration test for drag functionality
describe('DragHandler Integration', () => {
  let dragHandler: DragHandler;

  beforeEach(() => {
    dragHandler = DragHandler.getInstance();
    
    // Mock DOM elements
    global.document = {
      createElement: vi.fn(() => ({
        style: {},
        appendChild: vi.fn(),
        src: '',
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        contains: vi.fn(() => true),
      },
    } as any;

    global.window = {
      electronAPI: undefined,
    } as any;

    global.setTimeout = vi.fn((fn) => fn()) as any;
  });

  it('should be a singleton', () => {
    const instance1 = DragHandler.getInstance();
    const instance2 = DragHandler.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it('should handle drag operations without electron API', async () => {
    const mockLogo = {
      id: 'test-1',
      url: 'https://example.com/logo.png',
      source: 'logo.dev' as any,
      format: 'png' as any,
      size: { width: 100, height: 100 },
      transparent: true,
      quality: 'high' as any,
      companyName: 'Test Company',
      createdAt: new Date(),
    };

    const mockDataTransfer = {
      effectAllowed: '',
      setData: vi.fn(),
      setDragImage: vi.fn(),
      dropEffect: 'copy',
    };

    const mockEvent = {
      dataTransfer: mockDataTransfer,
    } as unknown as DragEvent;

    // Should not throw even without electron API
    await expect(dragHandler.initiateDrag(mockLogo, mockEvent)).resolves.not.toThrow();
    
    // Should set up basic drag data
    expect(mockDataTransfer.effectAllowed).toBe('copy');
    expect(mockDataTransfer.setData).toHaveBeenCalledWith('text/uri-list', mockLogo.url);
    expect(mockDataTransfer.setData).toHaveBeenCalledWith('text/plain', mockLogo.url);
  });

  it('should handle clipboard operations gracefully without electron API', async () => {
    const mockLogo = {
      id: 'test-1',
      url: 'https://example.com/logo.png',
      source: 'logo.dev' as any,
      format: 'png' as any,
      size: { width: 100, height: 100 },
      transparent: true,
      quality: 'high' as any,
      companyName: 'Test Company',
      createdAt: new Date(),
    };

    // Mock navigator.clipboard
    Object.defineProperty(global, 'navigator', {
      value: {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      },
      writable: true,
    });

    const result = await dragHandler.copyToClipboard(mockLogo);
    
    expect(result.success).toBe(true);
    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(mockLogo.url);
  });

  it('should handle file save operations gracefully without electron API', async () => {
    const mockLogo = {
      id: 'test-1',
      url: 'https://example.com/logo.png',
      source: 'logo.dev' as any,
      format: 'png' as any,
      size: { width: 100, height: 100 },
      transparent: true,
      quality: 'high' as any,
      companyName: 'Test Company',
      createdAt: new Date(),
    };

    // Mock document methods for download
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    global.document.createElement = vi.fn(() => mockLink);
    global.document.body.appendChild = vi.fn();
    global.document.body.removeChild = vi.fn();

    const result = await dragHandler.saveToFile(mockLogo);
    
    expect(result.success).toBe(true);
    expect(mockLink.href).toBe(mockLogo.url);
    expect(mockLink.download).toBe('test_company_logo.png');
    expect(mockLink.click).toHaveBeenCalled();
  });
});