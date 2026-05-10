import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración de Vite: habilita JSX en .js y proxy de desarrollo hacia la API
export default defineConfig({
  plugins: [
    react({ include: /\.(js|jsx)$/ }),
  ],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  server: {
    // Redirige /api/* al backend local para evitar problemas de CORS en desarrollo
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
