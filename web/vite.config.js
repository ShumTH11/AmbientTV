import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// AmbientTV frontend — Vite config
// Dev: proxy /api and /media to backend (default :3000)
// Build: outputs to dist/ (serve via nginx or express.static)
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        host: true,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/media': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        chunkSizeWarningLimit: 1500,
    },
});
