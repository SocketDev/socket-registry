import { expect, it } from 'vitest'
import { collectPackageTrustDetails } from '../../../scripts/repo/npm/check-trusted-details.mts'

it('requires every maintainer and retains repository and provenance failures', () => {
  const issues = ['existing staged failure']
  const successes: string[] = []
  collectPackageTrustDetails(
    {
      name: '@example/module',
      version: '1.0.0',
      maintainers: ['example-maintainer', 'unexpected-maintainer'],
      repository: { url: 'https://github.com/example-org/module' },
    },
    new Set(['example-maintainer']),
    issues,
    successes,
  )
  expect(issues).toHaveLength(4)
  expect(issues[0]).toBe('existing staged failure')
  expect(successes).toEqual([])
})

it('accepts allowed maintainer records with repository and provenance evidence', () => {
  const issues: string[] = []
  const successes = ['existing staged success']
  collectPackageTrustDetails(
    {
      name: '@example/module',
      version: '1.0.0',
      maintainers: [
        { name: 'example-maintainer', email: 'maintainer@example.com' },
      ],
      repository: { url: 'https://github.com/SocketDev/example-module' },
      dist: { attestations: {} },
    },
    new Set(['example-maintainer <maintainer@example.com>']),
    issues,
    successes,
  )
  expect(issues).toEqual([])
  expect(successes).toHaveLength(4)
  expect(successes[0]).toBe('existing staged success')
})
