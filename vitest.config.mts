import { defineConfig } from 'vitest/config'

import { vitiatePlugin } from '@vitiate/core/plugin'

const fuzzTimeMs = Number(process.env.FUZZ_TIME_MS) || 15_000

// Vitiate's fuzz worker discovers this file when it spawns Vitest again.
export default defineConfig({
  plugins: [
    vitiatePlugin({
      instrument: { include: ['scripts/util/parse-args.mts'] },
      fuzz: { fuzzTimeMs, stopOnCrash: true },
    }),
  ],
  test: { include: ['test/**/*.fuzz.mts'] },
})
