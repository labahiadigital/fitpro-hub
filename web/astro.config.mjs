// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://trackfiz.com',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
});
