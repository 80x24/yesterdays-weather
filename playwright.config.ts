import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 30000,
  retries: 1,
  use: {
    headless: true,
  },
})
