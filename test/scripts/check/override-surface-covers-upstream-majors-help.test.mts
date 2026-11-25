import { expect, it } from 'vitest'
import { readCliHelp } from '../cli-help.mts'

it('prints usage without running command work', async () => {
  const result = await readCliHelp(
    'check/override-surface-covers-upstream-majors.mts',
  )
  expect(result.code).toBe(0)
  expect(result.stdout).toContain(
    'Usage: node scripts/check/override-surface-covers-upstream-majors.mts',
  )
})
