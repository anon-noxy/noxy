import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

const nuxtProject = await defineVitestProject({
  test: {
    name: 'nuxt',
    environment: 'nuxt',
    include: ['tests/nuxt/**/*.vitest.ts'],
    setupFiles: ['tests/setup/vitest.ts'],
  },
})

export default defineConfig({
  test: {
    globals: false,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'lcov'],
      include: ['app/components/**/*.{vue,ts}', 'app/composables/**/*.ts', 'app/stores/**/*.ts'],
      exclude: ['app/components/**/*.stories.*'],
    },
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'happy-dom',
          include: ['tests/composables/**/*.test.ts', 'tests/server/**/*.test.ts'],
          setupFiles: ['tests/setup/vitest.ts'],
        },
      },
      nuxtProject,
    ],
  },
})
