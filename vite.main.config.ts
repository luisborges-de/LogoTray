import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  build: {
    lib: {
      entry: {
        main: resolve(__dirname, 'src/main/main.ts'),
        preload: resolve(__dirname, 'src/main/preload.ts')
      },
      formats: ['cjs'],
      fileName: (_format, entryName) => `${entryName}.js`
    },
    outDir: 'dist/main',
    rollupOptions: {
      external: [
        'electron', 
        'path', 
        'fs', 
        'os', 
        'crypto', 
        'axios', 
        'http', 
        'https', 
        'url',
        'better-sqlite3',
        'uuid',
        // Add Node.js built-ins
        'events',
        'stream',
        'util',
        'buffer',
        'querystring',
        'net',
        'tls',
        'zlib',
      ],
      output: {
        // Optimize for Node.js environment
        format: 'cjs',
        exports: 'auto',
      },
    },
    // Enable minification for production
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
      mangle: false, // Keep function names for better debugging
    },
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'node18',
    // Optimize for startup performance
    reportCompressedSize: false, // Skip gzip size reporting for faster builds
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Optimize dependencies for main process
  optimizeDeps: {
    exclude: [
      'electron',
      'better-sqlite3',
    ],
  },
  plugins: [
    {
      name: 'copy-assets',
      closeBundle() {
        // Copy assets to dist folder
        const assetsDir = resolve(__dirname, 'dist/assets');
        if (!existsSync(assetsDir)) {
          mkdirSync(assetsDir, { recursive: true });
        }
        
        // Copy tray icons
        const svgSource = resolve(__dirname, 'assets/tray-icon.svg');
        const svgDest = resolve(assetsDir, 'tray-icon.svg');
        const pngSource = resolve(__dirname, 'src/assets/tray-icon.png');
        const pngDest = resolve(assetsDir, 'tray-icon.png');
        
        try {
          copyFileSync(svgSource, svgDest);
          console.log('✓ Copied tray-icon.svg to dist/assets');
        } catch (error) {
          console.error('Failed to copy tray-icon.svg:', error);
        }
        
        try {
          if (existsSync(pngSource)) {
            copyFileSync(pngSource, pngDest);
            console.log('✓ Copied tray-icon.png to dist/assets');
          }
        } catch (error) {
          console.error('Failed to copy tray-icon.png:', error);
        }
      }
    },
    {
      name: 'optimize-startup',
      generateBundle(options, bundle) {
        // Log bundle information for optimization insights
        const bundleInfo = Object.entries(bundle).map(([name, chunk]) => ({
          name,
          size: 'code' in chunk ? chunk.code.length : 0,
        }));
        
        console.log('Bundle optimization info:', bundleInfo);
      }
    }
  ]
});