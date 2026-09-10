import { expect, it } from 'vitest'
import { readCliHelp } from '../cli-help.mts'

it('prints usage without running command work', async () => {
  const result = await readCliHelp('testing/analyze-ci-failures.mts')
  expect(result.code).toBe(0)
  expect(result.stdout).toContain('Usage: pnpm analyze-ci-failures')
})
