import { app, BrowserWindow, ipcMain, Tray, Menu, nativeTheme, screen, nativeImage, Notification, dialog, clipboard } from 'electron';

import { join } from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import * as os from 'os';
import { URL } from 'url';
import { APIManager } from '../services/api/APIManager';

// Safe logging function to prevent EPIPE errors
function safeLog(...args: any[]): void {
  try {
    console.log(...args);
  } catch (error: any) {
    // Ignore EPIPE errors when logging
    if (error?.code !== 'EPIPE') {
      // Try to log the error, but don't fail if that also causes an error
      try {
        console.error('Logging error:', error);
      } catch {
        // Silent fail
      }
    }
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Commented out for development - only needed for production builds
// if (require('electron-squirrel-startup')) {
//   app.quit();
// }

// Configure app as both dock and menubar application

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

class WindowManager {
  private popoverWindow: BrowserWindow | null = null;
  private mainWindow: BrowserWindow | null = null;

  createPopoverWindow(): BrowserWindow {
    if (this.popoverWindow) {
      return this.popoverWindow;
    }

    this.popoverWindow = new BrowserWindow({
      width: 360,
      height: 380,
      show: false,
      frame: false,
      resizable: false,
      transparent: true,
      skipTaskbar: true,
      alwaysOnTop: true,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      hasShadow: false, // We'll handle shadows with CSS
      backgroundColor: 'rgba(0, 0, 0, 0)', // Fully transparent background
      vibrancy: process.platform === 'darwin' ? 'popover' : undefined, // macOS-specific vibrancy
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false, // Keep animations smooth when window is hidden
        devTools: true, // Enable dev tools for debugging
      },
    });

    // Load the app - always use built files for now
    const htmlPath = join(__dirname, '../renderer/src/renderer/index.html');
    console.log('Loading HTML from:', htmlPath);
    this.popoverWindow.loadFile(htmlPath);

    // Handle window closed
    this.popoverWindow.on('closed', () => {
      this.popoverWindow = null;
    });

    // Log console messages from renderer (with error handling)
    this.popoverWindow.webContents.on('console-message', (event, level, message) => {
      safeLog(`Renderer [${level}]:`, message);
    });

    // Auto-hide when window loses focus (with slight delay to prevent accidental closes)
    this.popoverWindow.on('blur', () => {
      // Small delay to prevent immediate hiding when clicking buttons
      setTimeout(() => {
        if (this.popoverWindow && this.popoverWindow.isVisible() && !this.popoverWindow.isFocused()) {
          this.hideWindow();
        }
      }, 100);
    });

    return this.popoverWindow;
  }

  createMainWindow(): BrowserWindow {
    if (this.mainWindow) {
      return this.mainWindow;
    }

    this.mainWindow = new BrowserWindow({
      width: 900,
      height: 700,
      show: false,
      title: 'LogoTray - Beautiful Logo Search',
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 20, y: 20 },
      resizable: true,
      minimizable: true,
      maximizable: true,
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        devTools: false, // Disable dev tools for showcase
      },
    });

    // Load the showcase content
    const htmlPath = join(__dirname, '../renderer/src/renderer/showcase.html');
    this.mainWindow.loadFile(htmlPath);

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Log console messages from renderer
    this.mainWindow.webContents.on('console-message', (event, level, message) => {
      safeLog(`Main Window [${level}]:`, message);
    });

    return this.mainWindow;
  }

  showWindow(): void {
    if (!this.popoverWindow) {
      this.createPopoverWindow();
    }
    
    if (this.popoverWindow) {
      console.log('Showing popover window');
      this.popoverWindow.show();
      this.popoverWindow.focus();
      console.log('Window bounds:', this.popoverWindow.getBounds());
    }
  }

  hideWindow(): void {
    if (this.popoverWindow && this.popoverWindow.isVisible()) {
      this.popoverWindow.hide();
    }
  }

  showMainWindow(): void {
    if (!this.mainWindow) {
      this.createMainWindow();
    }
    
    if (this.mainWindow) {
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  hideMainWindow(): void {
    if (this.mainWindow && this.mainWindow.isVisible()) {
      this.mainWindow.hide();
    }
  }

  getWindow(): BrowserWindow | null {
    return this.popoverWindow;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  destroyWindow(): void {
    if (this.popoverWindow) {
      this.popoverWindow.destroy();
      this.popoverWindow = null;
    }
    if (this.mainWindow) {
      this.mainWindow.destroy();
      this.mainWindow = null;
    }
  }
}

class MenubarManager {
  private tray: Tray | null = null;
  private windowManager: WindowManager;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  createTray(): void {
    try {
      console.log('=== STARTING TRAY CREATION ===');
      console.log('Platform:', process.platform);
      console.log('Current working directory:', process.cwd());
      console.log('__dirname:', __dirname);
      
      // Create tray icon
      const icon = this.getTrayIconPath();
      console.log('Icon created, isEmpty:', icon.isEmpty());
      console.log('Icon size:', icon.getSize());
      
      if (icon.isEmpty()) {
        throw new Error('Icon is empty - this should not happen with programmatic icon');
      }
      
      console.log('Creating Tray object...');
      this.tray = new Tray(icon);
      console.log('Tray object created successfully');

      // Verify tray was created
      if (!this.tray) {
        throw new Error('Tray object is null');
      }

      console.log('Tray created successfully, setting up handlers...');

      // Set up tray tooltip
      this.tray.setToolTip('LogoTray - Quick Logo Search');
      console.log('Tooltip set');

      // Handle tray icon click
      this.tray.on('click', (event, bounds) => {
        console.log('Tray icon clicked at bounds:', bounds);
        this.togglePopover();
      });

      // Handle right-click for context menu
      this.tray.on('right-click', (event, bounds) => {
        console.log('Tray icon right-clicked at bounds:', bounds);
        this.showContextMenu();
      });

      // Listen for system appearance changes
      this.setupAppearanceChangeListener();
      
      console.log('Tray setup complete');
      console.log('Tray bounds:', this.tray.getBounds());
      console.log('Tray is destroyed?', this.tray.isDestroyed());
      
      // Show a notification to confirm tray creation
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: 'LogoTray Started',
          body: 'Look for the black square icon in your menubar!',
          silent: false
        });
        notification.show();
        console.log('Notification shown');
      } else {
        console.log('Notifications not supported');
      }

      console.log('=== TRAY CREATION COMPLETE ===');

    } catch (error) {
      console.error('=== TRAY CREATION FAILED ===');
      console.error('Failed to create tray:', error);
      console.error('Error stack:', error.stack);
    }
  }

  private getTrayIconPath(): Electron.NativeImage {
    console.log('Creating tray icon...');
    
    // Always use the programmatic icon for reliability
    const icon = this.createSimpleTrayIcon();
    console.log('Created programmatic icon, size:', icon.getSize());
    
    return icon;
  }

  private createUnicodeIcon(): Electron.NativeImage {
    // Create icon using Unicode character - more reliable on macOS
    const size = 16;
    const canvas = Buffer.alloc(size * size * 4);
    
    // Fill with transparent background
    canvas.fill(0);
    
    // Create a simple filled square that should be visible
    for (let y = 2; y < 14; y++) {
      for (let x = 2; x < 14; x++) {
        const idx = (y * size + x) * 4;
        canvas[idx] = 0;       // R - black
        canvas[idx + 1] = 0;   // G - black  
        canvas[idx + 2] = 0;   // B - black
        canvas[idx + 3] = 255; // A - fully opaque
      }
    }
    
    const image = nativeImage.createFromBuffer(canvas, { width: size, height: size });
    
    if (process.platform === 'darwin') {
      image.setTemplateImage(true);
    }
    
    console.log('Created Unicode-style icon');
    return image;
  }

  private createFallbackIcon(): Electron.NativeImage {
    // Create a simple solid square as fallback
    const size = 16;
    const canvas = Buffer.alloc(size * size * 4);
    
    // Fill entire icon with black
    for (let i = 0; i < canvas.length; i += 4) {
      canvas[i] = 0;     // R
      canvas[i + 1] = 0; // G
      canvas[i + 2] = 0; // B
      canvas[i + 3] = 255; // A
    }
    
    const image = nativeImage.createFromBuffer(canvas, { width: size, height: size });
    
    if (process.platform === 'darwin') {
      image.setTemplateImage(true);
    }
    
    console.log('Created fallback solid icon');
    return image;
  }

  private createSimpleTrayIcon(): Electron.NativeImage {
    // Create a simple, highly visible icon for macOS menubar
    const size = 16; // Standard macOS menubar icon size
    const canvas = Buffer.alloc(size * size * 4); // RGBA
    
    // Fill with transparent background
    canvas.fill(0);
    
    // Create a simple filled square that should be very visible
    for (let y = 2; y < 14; y++) {
      for (let x = 2; x < 14; x++) {
        const idx = (y * size + x) * 4;
        canvas[idx] = 0;       // R - black
        canvas[idx + 1] = 0;   // G - black  
        canvas[idx + 2] = 0;   // B - black
        canvas[idx + 3] = 255; // A - fully opaque
      }
    }
    
    const image = nativeImage.createFromBuffer(canvas, { width: size, height: size });
    
    // On macOS, mark as template for automatic appearance handling
    if (process.platform === 'darwin') {
      image.setTemplateImage(true);
    }
    
    console.log('Created simple square tray icon with size:', image.getSize());
    return image;
  }

  private togglePopover(): void {
    const window = this.windowManager.getWindow();
    
    if (window && window.isVisible()) {
      this.hidePopover();
    } else {
      this.showPopover();
    }
  }

  showPopover(): void {
    if (!this.tray) return;

    console.log('showPopover called');
    
    // Create window if it doesn't exist
    const window = this.windowManager.createPopoverWindow();
    console.log('Window created:', !!window);
    
    // Position the popover relative to the tray icon
    this.positionWindow();
    console.log('Window positioned');
    
    // Show the window
    this.windowManager.showWindow();
    console.log('Window show called');
  }

  hidePopover(): void {
    this.windowManager.hideWindow();
  }

  positionWindow(): void {
    if (!this.tray) return;

    const window = this.windowManager.getWindow();
    if (!window) return;

    // Get tray bounds
    const trayBounds = this.tray.getBounds();
    const windowBounds = window.getBounds();
    
    console.log('Tray bounds:', trayBounds);
    console.log('Window bounds:', windowBounds);
    
    // Calculate position - center horizontally under the tray icon
    let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
    let y = Math.round(trayBounds.y + trayBounds.height + 8); // 8px gap from menubar
    
    // Get the display where the tray is located
    const display = screen.getDisplayNearestPoint({
      x: trayBounds.x,
      y: trayBounds.y
    });
    
    console.log('Display work area:', display.workArea);

    // Ensure window stays within screen bounds horizontally
    const minX = display.workArea.x + 10; // 10px margin from screen edge
    const maxX = display.workArea.x + display.workArea.width - windowBounds.width - 10;
    x = Math.max(minX, Math.min(x, maxX));
    
    // For macOS menubar, position just below the menubar
    if (process.platform === 'darwin') {
      y = Math.max(25, y); // Ensure it's below the menubar (typically 25px high)
    }

    console.log('Final position:', { x, y });
    window.setPosition(x, y);
  }

  private showContextMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Quick Search',
        click: () => this.showPopover()
      },
      {
        label: 'Open LogoTray',
        click: () => this.windowManager.showMainWindow()
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit LogoTray',
        click: () => app.quit()
      }
    ]);

    this.tray.popUpContextMenu(contextMenu);
  }

  private setupAppearanceChangeListener(): void {
    // Listen for system appearance changes (light/dark mode)
    nativeTheme.on('updated', () => {
      this.handleSystemAppearanceChange();
    });
  }

  handleSystemAppearanceChange(): void {
    // Update tray icon for new appearance
    if (this.tray) {
      const icon = this.getTrayIconPath();
      this.tray.setImage(icon);
    }

    // Notify renderer process about appearance change
    const window = this.windowManager.getWindow();
    if (window) {
      window.webContents.send('appearance-changed', {
        shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
        themeSource: nativeTheme.themeSource
      });
    }
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

// Global instances
const windowManager = new WindowManager();
const menubarManager = new MenubarManager(windowManager);
const apiManager = new APIManager();

// IPC Communication Handlers
class IPCHandler {
  static setupHandlers(): void {
    // Window management
    ipcMain.handle('window:show', () => {
      windowManager.showWindow();
    });

    ipcMain.handle('window:hide', () => {
      windowManager.hideWindow();
    });

    ipcMain.handle('mainWindow:show', () => {
      windowManager.showMainWindow();
    });

    ipcMain.handle('mainWindow:hide', () => {
      windowManager.hideMainWindow();
    });

    ipcMain.handle('window:toggle', () => {
      const window = windowManager.getWindow();
      if (window && window.isVisible()) {
        windowManager.hideWindow();
      } else {
        windowManager.showWindow();
      }
    });

    // App lifecycle
    ipcMain.handle('app:quit', () => {
      app.quit();
    });

    ipcMain.handle('app:getVersion', () => {
      return app.getVersion();
    });

    // Menubar management
    ipcMain.handle('menubar:show', () => {
      menubarManager.showPopover();
    });

    ipcMain.handle('menubar:hide', () => {
      menubarManager.hidePopover();
    });

    ipcMain.handle('menubar:toggle', () => {
      const window = windowManager.getWindow();
      if (window && window.isVisible()) {
        menubarManager.hidePopover();
      } else {
        menubarManager.showPopover();
      }
    });

    // System appearance
    ipcMain.handle('system:getAppearance', () => {
      return {
        shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
        themeSource: nativeTheme.themeSource
      };
    });

    // Logo search functionality using APIManager
    ipcMain.handle('logo:search', async (_event, query: string) => {
      safeLog('Logo search requested for:', query);
      
      if (!query || query.trim().length === 0) {
        return [];
      }
      
      try {
        const results = await apiManager.searchLogos(query);
        safeLog(`Found ${results.length} logo(s) for "${query}"`);
        safeLog('Results by source:', results.map(r => ({ source: r.source, url: r.url })));
        return results;
      } catch (error) {
        console.error('Logo search failed:', error);
        return [];
      }
    });

    // Drag and drop functionality
    ipcMain.handle('drag:createTempFile', async (_event, { url, filename, logoData }) => {
      try {
        console.log('Creating temp file for drag operation:', filename);
        
        // Create temp directory if it doesn't exist
        const tempDir = join(os.tmpdir(), 'logobuddy-drag');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Create unique filename to avoid conflicts
        const timestamp = Date.now();
        const uniqueFilename = `${timestamp}_${filename}`;
        const tempFilePath = join(tempDir, uniqueFilename);
        
        // Download and save the image
        await IPCHandler.downloadImage(url, tempFilePath);
        
        console.log('Temp file created at:', tempFilePath);
        return tempFilePath;
      } catch (error) {
        console.error('Failed to create temp file:', error);
        return null;
      }
    });

    // Clipboard operations
    ipcMain.handle('clipboard:writeImage', async (_event, { url, logoData }) => {
      try {
        safeLog('Writing image to clipboard:', url);
        
        if (url.startsWith('file://') || url.startsWith('/')) {
          // Local file
          const filePath = url.replace('file://', '');
          const image = nativeImage.createFromPath(filePath);
          clipboard.writeImage(image);
        } else {
          // Remote URL - download first
          const tempDir = join(os.tmpdir(), 'logobuddy-clipboard');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const tempFilePath = join(tempDir, `clipboard_${Date.now()}.${logoData.format}`);
          await IPCHandler.downloadImage(url, tempFilePath);
          
          const image = nativeImage.createFromPath(tempFilePath);
          clipboard.writeImage(image);
          
          // Clean up temp file after a delay
          setTimeout(() => {
            try {
              if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
              }
            } catch (cleanupError) {
              console.warn('Failed to cleanup temp clipboard file:', cleanupError);
            }
          }, 5000);
        }
        
        return { success: true };
      } catch (error) {
        console.error('Failed to write image to clipboard:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // File save dialog
    ipcMain.handle('file:saveDialog', async (_event, { url, defaultName, logoData }) => {
      try {
        console.log('Opening save dialog for:', defaultName);
        
        const result = await dialog.showSaveDialog(windowManager.getMainWindow() || windowManager.getWindow() || undefined, {
          title: 'Save Logo',
          defaultPath: defaultName,
          filters: [
            { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        
        if (result.canceled || !result.filePath) {
          return { success: false, error: 'Save cancelled' };
        }
        
        // Download and save the image
        await IPCHandler.downloadImage(url, result.filePath);
        
        console.log('File saved to:', result.filePath);
        return { success: true, filePath: result.filePath };
      } catch (error) {
        console.error('Failed to save file:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
  }

  // Helper method to download images with redirect support
  static async downloadImage(url: string, filePath: string, maxRedirects: number = 5): Promise<void> {
    return new Promise((resolve, reject) => {
      // If it's already a local file, just copy it
      if (url.startsWith('file://') || url.startsWith('/')) {
        const sourcePath = url.replace('file://', '');
        try {
          fs.copyFileSync(sourcePath, filePath);
          resolve();
          return;
        } catch (error) {
          reject(error);
          return;
        }
      }
      
      // Download from remote URL with redirect handling
      const downloadWithRedirects = (currentUrl: string, redirectCount: number = 0) => {
        if (redirectCount > maxRedirects) {
          reject(new Error('Too many redirects'));
          return;
        }
        
        const client = currentUrl.startsWith('https:') ? https : http;
        const file = fs.createWriteStream(filePath);
        
        const request = client.get(currentUrl, (response) => {
          // Handle redirects
          if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
            const redirectLocation = response.headers.location;
            if (redirectLocation) {
              // Handle relative URLs by resolving them against the current URL
              let redirectUrl: string;
              try {
                if (redirectLocation.startsWith('http://') || redirectLocation.startsWith('https://')) {
                  // Absolute URL
                  redirectUrl = redirectLocation;
                } else {
                  // Relative URL - resolve against current URL
                  const currentUrlObj = new URL(currentUrl);
                  redirectUrl = new URL(redirectLocation, currentUrlObj.origin).toString();
                }
                
                safeLog(`Following redirect from ${currentUrl} to ${redirectUrl}`);
                file.destroy(); // Clean up the file stream
                downloadWithRedirects(redirectUrl, redirectCount + 1);
                return;
              } catch (urlError) {
                file.destroy();
                reject(new Error(`Invalid redirect URL: ${redirectLocation} - ${urlError.message}`));
                return;
              }
            } else {
              file.destroy();
              reject(new Error(`Redirect without location header: ${response.statusCode}`));
              return;
            }
          }
          
          if (response.statusCode !== 200) {
            file.destroy();
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            return;
          }
          
          response.pipe(file);
          
          file.on('finish', () => {
            file.close();
            resolve();
          });
          
          file.on('error', (error) => {
            fs.unlink(filePath, () => {}); // Clean up on error
            reject(error);
          });
        });
        
        request.on('error', (error) => {
          fs.unlink(filePath, () => {}); // Clean up on error
          reject(error);
        });
        
        request.setTimeout(10000, () => {
          request.destroy();
          fs.unlink(filePath, () => {}); // Clean up on timeout
          reject(new Error('Download timeout'));
        });
      };
      
      downloadWithRedirects(url);
    });
  }
}

// App lifecycle management
class AppLifecycle {
  static initialize(): void {
    // Set up IPC handlers
    IPCHandler.setupHandlers();

    // App event handlers
    app.on('ready', () => {
      console.log('App ready event fired');
      
      try {
        // Create the menubar tray icon
        menubarManager.createelectron.Tray();
        
        // Show main window on first launch
        windowManager.showMainWindow();
        
        console.log('LogoTray app ready');
      } catch (error) {
        console.error('Failed to create tray:', error);
      }
    });

    // Prevent app from quitting when all windows are closed (menubar behavior)
    app.on('window-all-closed', (event: Electron.Event) => {
      // On macOS, keep the app running even when all windows are closed
      // The app can still be accessed via the menubar tray icon
      if (process.platform === 'darwin') {
        event.preventDefault();
      }
    });

    // Handle second instance attempt
    app.on('second-instance', () => {
      // Show the popover if someone tries to run the app again
      windowManager.showWindow();
    });

    // Handle app activation (macOS) - show main window when dock icon is clicked
    app.on('activate', () => {
      windowManager.showMainWindow();
    });

    // Handle before quit
    app.on('before-quit', () => {
      menubarManager.destroy();
      windowManager.destroyWindow();
    });
  }
}

// Initialize the application
try {
  console.log('Initializing AppLifecycle...');
  AppLifecycle.initialize();
  safeLog('AppLifecycle initialized successfully');
  
  // Keep the app running
  setInterval(() => {
    // This prevents the app from exiting
  }, 1000);
} catch (error) {
  console.error('Failed to initialize AppLifecycle:', error);
  process.exit(1);
}
