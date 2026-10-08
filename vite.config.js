import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Stamped into the bundle so a support report can say which build it came
  // from. Two people reporting "the same problem" on different builds was a
  // day of guessing.
  define: {
    __BUILD_STAMP__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  server: { port: 5173 },
  build: {
    // Real device baselines, not an abstract ES year: esbuild lowers whatever
    // syntax these versions lack. Safari 13.1 is iOS 13.4 (2020), which still
    // shows up on older iPhones in Iraq.
    target: ['es2019', 'safari13.1', 'chrome80', 'firefox78', 'edge88'],
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database'],
        },
      },
    },
  },
});
