import { expect, it } from 'vitest'
import { ensureWorkspacePackages } from '../../../../scripts/repo/bootstrap/prepare.mts'

it('repairs missing workspace globs without changing the catalog', () => {
  const input = "packages:\n  - 'registry'\n\ncatalog:\n  example: 1.0.0\n"
  const repaired = ensureWorkspacePackages(input, [
    'registry',
    'packages/npm/*',
  ])
  expect(repaired).toBe(
    "packages:\n  - 'registry'\n  - 'packages/npm/*'\n\ncatalog:\n  example: 1.0.0\n",
  )
  expect(
    ensureWorkspacePackages(repaired, ['registry', 'packages/npm/*']),
  ).toBe(repaired)
})

it('creates a missing workspace block before existing settings', () => {
  expect(ensureWorkspacePackages('catalog: {}\n', ['registry'])).toBe(
    "packages:\n  - 'registry'\n\ncatalog: {}\n",
  )
})
