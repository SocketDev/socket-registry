import { expect, it } from 'vitest'
import { readCliHelp } from '../cli-help.mts'

it('prints usage without running command work', async () => {
  const result = await readCliHelp('check/npm-rankings-doc-is-current.mts')
  expect(result.code).toBe(0)
  expect(result.stdout).toContain(
    'Usage: node scripts/repo/check/npm-rankings-doc-is-current.mts',
  )
})
