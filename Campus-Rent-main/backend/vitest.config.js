import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 60,
        functions: 50,
        branches: 40,
      },
      include: [
        'src/**/*.js',
      ],
      exclude: [
        'src/server.js',
        'src/config/cloudinary.js',
        'src/middleware/uploadMiddleware.js',
        'src/services/uploadService.js',
        'coverage',
        'tests',
        'prisma',
      ],
    },
  },
});