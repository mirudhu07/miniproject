import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true, // Fails clearly if 3000 is occupied instead of picking next port silently
    host: '0.0.0.0',
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
});
