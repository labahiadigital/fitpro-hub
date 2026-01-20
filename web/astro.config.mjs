// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://trackfiz.com',
  compressHTML: true,
  build: {
    // Inline all stylesheets to eliminate render-blocking CSS
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      // Reduce CSS chunk size
      cssCodeSplit: false,
    },
  },
});
