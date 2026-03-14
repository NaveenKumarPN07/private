import { defineConfig }         from 'vite';
import react                    from '@vitejs/plugin-react';
import { nodePolyfills }        from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // polyfill these Node built-ins for simple-peer
      include: ['buffer', 'events', 'util', 'stream', 'process'],
      globals: {
        Buffer:  true,
        global:  true,
        process: true,
      },
    }),
  ],
  optimizeDeps: {
    include: ['simple-peer'],
  },
  server: {
    host: '0.0.0.0', 
    port: 3000,
  },
});