/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// GitHub Pages serves this repo at /bcr-meal-plan/
export default defineConfig({
  base: '/bcr-meal-plan/',
  plugins: [preact()],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
