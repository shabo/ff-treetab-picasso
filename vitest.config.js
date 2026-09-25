import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/emoji-data.js'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        'src/lib/**': { lines: 90, perFile: true }
      }
    }
  }
});
