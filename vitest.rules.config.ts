import { defineConfig } from 'vitest/config'

// Security rules tests. Run via `npm run test:rules`, which starts the
// Firestore + Storage emulators around this test run.
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    // Tests share one emulator, so run files one at a time.
    fileParallelism: false,
    testTimeout: 15000,
  },
})
