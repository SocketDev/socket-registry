import { expect, it } from 'vitest'
import { readCliHelp } from '../cli-help.mts'

it('prints help without fetching the fleet payload', async () => {
  const result = await readCliHelp('bootstrap/fetch-session.mts')
  expect(result.code).toBe(0)
  expect(result.stdout).toContain(
    'Usage: node scripts/repo/bootstrap/fetch-session.mts',
  )
})
