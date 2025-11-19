import { defineConfig, externalizeDepsPlugin, bytecodePlugin } from 'electron-vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';

export default defineConfig(({ mode }) => ({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/main',
      rollupOptions: {
        input: path.resolve(__dirname, 'electron/main.ts'),
        output: {
          format: 'cjs',
          entryFileNames: 'main.cjs',
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/preload',
      rollupOptions: {
        input: path.resolve(__dirname, 'electron/preload.ts'),
        output: {
          format: 'cjs',
          entryFileNames: 'preload.cjs',
        },
      },
    },
  },
  renderer: {
    root: '.',
    build: {
      outDir: 'dist-electron/renderer',
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'index.html'),
        },
      },
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '::',
      port: 8080,
    },
  },
}));
