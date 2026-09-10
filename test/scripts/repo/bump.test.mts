import { expect, it } from 'vitest'
import { readCliHelp } from './cli-help.mts'

it('prints usage without running command work', async () => {
  const result = await readCliHelp('bump.mts')
  expect(result.code).toBe(0)
  expect(result.stdout).toContain('Usage: pnpm bump')
})
