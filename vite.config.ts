import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // Repo name comes from GITHUB_REPOSITORY (e.g. owner/repo) or fallback repo name
  const repoName = process.env.GITHUB_REPOSITORY
    ? process.env.GITHUB_REPOSITORY.split('/')[1]
    : 'water-level-detection-system';

  // Vite base comes from the repo name; keep HashRouter for portable hash routing
  const base = process.env.VITE_BASE || (command === 'build' ? `/${repoName}/` : '/');

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'sw-cache-version',
        closeBundle() {
          const distSw = path.resolve(__dirname, 'dist/sw.js');
          if (fs.existsSync(distSw)) {
            let content = fs.readFileSync(distSw, 'utf-8');
            const buildVersion = `v-${Date.now()}`;
            content = content.replace(/__BUILD_VERSION__/g, buildVersion);
            fs.writeFileSync(distSw, content, 'utf-8');
          }
        },
      },
    ],
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
              return 'recharts';
            }
            if (id.includes('node_modules/firebase')) {
              return 'firebase';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'icons';
            }
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router')
            ) {
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
