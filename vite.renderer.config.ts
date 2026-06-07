import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh for better development experience
      fastRefresh: true,
      // Optimize JSX runtime
      jsxRuntime: 'automatic',
    }),
  ],
  base: './', // Use relative paths for Electron
  build: {
    outDir: 'dist/renderer',
    // Enable minification and compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        safari10: true,
      },
    },
    // Optimize chunk splitting
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer/index.html'),
        showcase: resolve(__dirname, 'src/renderer/showcase.html'),
      },
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'utils': ['axios', 'uuid'],
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Set chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging
    sourcemap: false, // Disable in production for smaller bundle
    // Target modern browsers for better optimization
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3001,
    // Enable HMR for faster development
    hmr: {
      overlay: true,
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'axios',
      'uuid',
    ],
    exclude: [
      // Exclude Electron-specific modules
      'electron',
    ],
  },
  // Enable CSS code splitting
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase',
    },
  },
  // Performance optimizations
  esbuild: {
    // Remove unused imports
    treeShaking: true,
    // Optimize for size
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  },
});