import { LogoResult } from '../../types';

export interface DragOperationResult {
  success: boolean;
  error?: string;
}

export class DragHandler {
  private static instance: DragHandler;
  private draggedLogo: LogoResult | null = null;
  private dragStartTime: number = 0;

  static getInstance(): DragHandler {
    if (!DragHandler.instance) {
      DragHandler.instance = new DragHandler();
    }
    return DragHandler.instance;
  }

  /**
   * Initiates a drag operation for a logo
   */
  async initiateDrag(logo: LogoResult, event: DragEvent): Promise<void> {
    try {
      this.draggedLogo = logo;
      this.dragStartTime = Date.now();

      // Set drag effect
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'copy';
        
        // Create a temporary file for the drag operation
        const fileData = await this.createDragFile(logo);
        
        if (fileData) {
          // Set the file data for drag operation
          event.dataTransfer.setData('DownloadURL', fileData.downloadURL);
          event.dataTransfer.setData('text/uri-list', logo.url);
          event.dataTransfer.setData('text/plain', logo.url);
          
          // Create drag image
          this.createDragImage(event, logo);
        }
      }
    } catch (error) {
      console.error('Failed to initiate drag:', error);
      throw error;
    }
  }

  /**
   * Handles drag end event
   */
  handleDragEnd(event: DragEvent): DragOperationResult {
    try {
      const dragDuration = Date.now() - this.dragStartTime;
      const wasSuccessful = event.dataTransfer?.dropEffect !== 'none';

      // Reset drag state
      this.draggedLogo = null;
      this.dragStartTime = 0;

      return {
        success: wasSuccessful,
        error: wasSuccessful ? undefined : 'Drag operation was cancelled or failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown drag error'
      };
    }
  }

  /**
   * Creates a file for drag operations to external applications
   */
  private async createDragFile(logo: LogoResult): Promise<{ downloadURL: string } | null> {
    try {
      // Use the cached local path if available, otherwise use the remote URL
      const imageUrl = logo.localPath || logo.url;
      
      // Create a filename based on company name and format
      const sanitizedName = logo.companyName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const filename = `${sanitizedName}_logo.${logo.format}`;
      
      // For Electron, we'll use the IPC to handle file creation in the main process
      if (typeof window !== 'undefined' && window.electronAPI) {
        try {
          const filePath = await window.electronAPI.invoke('drag:createTempFile', {
            url: imageUrl,
            filename: filename,
            logoData: logo
          });
          
          if (filePath) {
            return {
              downloadURL: `${logo.format}:${filename}:file://${filePath}`
            };
          }
        } catch (ipcError) {
          console.warn('IPC drag file creation failed, falling back to URL:', ipcError);
        }
      }
      
      // Fallback to URL-based drag
      return {
        downloadURL: `${logo.format}:${filename}:${imageUrl}`
      };
    } catch (error) {
      console.error('Failed to create drag file:', error);
      return null;
    }
  }

  /**
   * Creates a custom drag image for better visual feedback
   */
  private createDragImage(event: DragEvent, logo: LogoResult): void {
    try {
      // Create a drag image element
      const dragImage = document.createElement('div');
      dragImage.style.cssText = `
        position: absolute;
        top: -1000px;
        left: -1000px;
        width: 80px;
        height: 80px;
        background: rgba(20, 184, 166, 0.1);
        border: 2px solid rgba(20, 184, 166, 0.4);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        box-shadow: 0 8px 24px rgba(20, 184, 166, 0.2);
        pointer-events: none;
        z-index: 10000;
      `;

      // Add logo image to drag preview
      const img = document.createElement('img');
      img.src = logo.url;
      img.style.cssText = `
        max-width: 60px;
        max-height: 60px;
        object-fit: contain;
        border-radius: 6px;
      `;
      
      dragImage.appendChild(img);
      document.body.appendChild(dragImage);

      // Set the custom drag image
      if (event.dataTransfer) {
        event.dataTransfer.setDragImage(dragImage, 40, 40);
      }

      // Clean up the drag image after a short delay
      setTimeout(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      }, 100);
    } catch (error) {
      console.warn('Failed to create custom drag image:', error);
      // Continue with default drag image
    }
  }

  /**
   * Copies a logo to the clipboard
   */
  async copyToClipboard(logo: LogoResult): Promise<DragOperationResult> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        await window.electronAPI.invoke('clipboard:writeImage', {
          url: logo.localPath || logo.url,
          logoData: logo
        });
        return { success: true };
      } else {
        // Fallback for web environments
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(logo.url);
          return { success: true };
        } else {
          return { success: false, error: 'Clipboard not available' };
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to copy to clipboard'
      };
    }
  }

  /**
   * Saves a logo to a file
   */
  async saveToFile(logo: LogoResult): Promise<DragOperationResult> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.invoke('file:saveDialog', {
          url: logo.localPath || logo.url,
          defaultName: `${logo.companyName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_logo.${logo.format}`,
          logoData: logo
        });
        
        return {
          success: result.success,
          error: result.error
        };
      } else {
        // Fallback for web environments - trigger download
        if (typeof document !== 'undefined') {
          const link = document.createElement('a');
          link.href = logo.url;
          link.download = `${logo.companyName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_logo.${logo.format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          return { success: true };
        } else {
          return { success: false, error: 'Document not available' };
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save file'
      };
    }
  }

  /**
   * Gets the currently dragged logo
   */
  getCurrentDraggedLogo(): LogoResult | null {
    return this.draggedLogo;
  }
}