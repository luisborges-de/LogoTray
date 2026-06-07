import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface for type safety
export interface ElectronAPI {
  // Window management
  window: {
    show: () => Promise<void>;
    hide: () => Promise<void>;
    toggle: () => Promise<void>;
  };
  
  // Menubar management
  menubar: {
    show: () => Promise<void>;
    hide: () => Promise<void>;
    toggle: () => Promise<void>;
  };
  
  // System appearance
  system: {
    getAppearance: () => Promise<{
      shouldUseDarkColors: boolean;
      themeSource: string;
    }>;
    onAppearanceChanged: (callback: (appearance: {
      shouldUseDarkColors: boolean;
      themeSource: string;
    }) => void) => void;
  };
  
  // App lifecycle
  app: {
    quit: () => Promise<void>;
    getVersion: () => Promise<string>;
  };
  
  // Logo search
  logo: {
    search: (query: string) => Promise<any[]>;
  };
  
  // Drag and drop operations
  drag: {
    createTempFile: (data: { url: string; filename: string; logoData: any }) => Promise<string | null>;
  };
  
  // Clipboard operations
  clipboard: {
    writeImage: (data: { url: string; logoData: any }) => Promise<{ success: boolean; error?: string }>;
  };
  
  // File operations
  file: {
    saveDialog: (data: { url: string; defaultName: string; logoData: any }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  };
  
  // Generic IPC methods for future extensibility
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window management
  window: {
    show: () => ipcRenderer.invoke('window:show'),
    hide: () => ipcRenderer.invoke('window:hide'),
    toggle: () => ipcRenderer.invoke('window:toggle'),
  },
  
  // Menubar management
  menubar: {
    show: () => ipcRenderer.invoke('menubar:show'),
    hide: () => ipcRenderer.invoke('menubar:hide'),
    toggle: () => ipcRenderer.invoke('menubar:toggle'),
  },
  
  // System appearance
  system: {
    getAppearance: () => ipcRenderer.invoke('system:getAppearance'),
    onAppearanceChanged: (callback: (appearance: any) => void) => {
      ipcRenderer.on('appearance-changed', (_event, appearance) => {
        callback(appearance);
      });
    },
  },
  
  // App lifecycle
  app: {
    quit: () => ipcRenderer.invoke('app:quit'),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },
  
  // Logo search
  logo: {
    search: (query: string) => ipcRenderer.invoke('logo:search', query),
  },
  
  // Drag and drop operations
  drag: {
    createTempFile: (data: { url: string; filename: string; logoData: any }) => 
      ipcRenderer.invoke('drag:createTempFile', data),
  },
  
  // Clipboard operations
  clipboard: {
    writeImage: (data: { url: string; logoData: any }) => 
      ipcRenderer.invoke('clipboard:writeImage', data),
  },
  
  // File operations
  file: {
    saveDialog: (data: { url: string; defaultName: string; logoData: any }) => 
      ipcRenderer.invoke('file:saveDialog', data),
  },
  
  // Generic IPC methods for future extensibility
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, callback);
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
} as ElectronAPI);
