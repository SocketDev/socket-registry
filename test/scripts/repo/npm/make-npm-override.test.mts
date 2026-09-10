import { expect, it } from 'vitest'
import { readCliHelp } from '../cli-help.mts'

it('prints usage without running command work', async () => {
  const result = await readCliHelp('npm/make-npm-override.mts')
  expect(result.code).toBe(0)
  expect(result.stdout).toContain('Usage: pnpm make-npm-override')
})
