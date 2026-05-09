import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: false, drop_debugger: true },
      format: { comments: false },
    },
    lib: {
      entry: resolve(__dirname, 'src/enhancers/index.ts'),
      name: 'Prism',
      formats: ['es'],
      fileName: () => 'prism.js',
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'tom-select': ['tom-select'],
          'flatpickr': ['flatpickr'],
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});
