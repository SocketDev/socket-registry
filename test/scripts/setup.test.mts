import { expect, it } from 'vitest'

import { readCliHelp } from './cli-help.mts'

it('prints setup usage without configuring Git', async () => {
  const result = await readCliHelp('setup.mts')
  expect(result.code).toBe(0)
  expect(result.stdout).toContain('Usage: pnpm run setup')
})
