import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['components/**/*.test.tsx', 'components/**/*.test.ts', 'test/**/*.test.ts', 'test/**/*.test.tsx'],
    exclude: ['backend/**', 'dist/**', 'e2e/**']
  }
});
