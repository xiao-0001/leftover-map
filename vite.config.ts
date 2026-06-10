import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// Tailwind + PostCSS config is inlined here (instead of separate
// tailwind.config.js / postcss.config.js files) to keep the project root tidy.
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: ['./index.html', './src/**/*.{ts,tsx}'],
          theme: {
            extend: {
              colors: {
                brand: { 50: '#f0fdf4', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
                seven: '#e74c3c',
                family: '#27ae60',
              },
              fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', '"PingFang TC"', '"Microsoft JhengHei"', 'sans-serif'],
              },
            },
          },
        }),
        autoprefixer(),
      ],
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8788',
    },
  },
});
