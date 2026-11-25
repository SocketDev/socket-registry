import { defineConfig } from 'vitest/config'

import config from './vitest.config.mts'

export default defineConfig({
  ...config,
  test: {
    ...config.test,
    include: ['test/npm/**/*.test.mts'],
    exclude: ['**/node_modules/**', '**/fixture/**'],
  },
})
