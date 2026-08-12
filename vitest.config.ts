import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Tests do not need Tailwind or the PWA plugin, so the test config stays
// separate from the build config and only loads what it uses.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
