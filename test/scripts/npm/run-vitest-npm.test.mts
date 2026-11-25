import { expect, it } from 'vitest'
import { readCliHelp } from '../cli-help.mts'

it('prints usage without running command work', async () => {
  const result = await readCliHelp('npm/run-vitest-npm.mts')
  expect(result.code).toBe(0)
  expect(result.stdout).toContain('Usage: pnpm test:npm')
})
