import { beforeEach, expect, it, vi } from 'vitest'
import { REGISTRY_PKG_PATH } from '../../../scripts/repo/constants/paths.mts'
import { publishAtCommit } from '../../../scripts/repo/npm/publish-npm-packages-commit.mts'

const mocks = vi.hoisted(() => ({
  __proto__: null,
  changed: vi.fn(),
  checkout: vi.fn(),
  manifest: vi.fn(),
  readPackage: vi.fn(),
  publish: vi.fn(),
  spawn: vi.fn(),
}))
vi.mock(import('@socketsecurity/lib-stable/git/changed'), () => ({
  getChangedFiles: mocks.changed,
}))
vi.mock(import('@socketsecurity/lib-stable/packages/manifest'), () => ({
  fetchPackageManifest: mocks.manifest,
}))
vi.mock(import('@socketsecurity/lib-stable/packages/read'), () => ({
  readPackageJsonSync: mocks.readPackage,
}))
vi.mock(import('@socketsecurity/lib-stable/process/spawn/child'), () => ({
  spawn: mocks.spawn,
}))
vi.mock(import('../../../scripts/repo/constants/testing.mts'), () => ({
  getNpmPackageNames: () => ['example-module'],
}))
vi.mock(
  import('../../../scripts/repo/npm/publish-npm-packages-git.mts'),
  () => ({
    checkoutCommit: mocks.checkout,
    getCommitSha: async () => 'example-sha',
  }),
)
vi.mock(
  import('../../../scripts/repo/npm/publish-npm-packages-publish.mts'),
  () => ({
    publishPackages: mocks.publish,
  }),
)

const events: string[] = []
beforeEach(() => {
  vi.resetAllMocks()
  events.length = 0
  mocks.readPackage.mockImplementation((pkgPath: string) => ({
    name:
      pkgPath === REGISTRY_PKG_PATH ? '@example/registry' : '@example/module',
    version: '1.1.0',
  }))
  mocks.manifest.mockResolvedValue({ version: '1.0.0' })
  mocks.changed.mockResolvedValue(['registry/manifest.json'])
  mocks.spawn.mockImplementation(async (command: string, args: string[]) => {
    events.push(`${command}:${args.join(' ')}`)
    return { code: 0 }
  })
  mocks.publish.mockImplementation(
    async (packages: Array<{ name: string }>) => {
      events.push(`publish:${packages.map(pkg => pkg.name).join(',')}`)
    },
  )
})

it('refreshes and commits the manifest between override and registry publishing', async () => {
  const result = await publishAtCommit('example-sha')
  expect(events[0]).toBe('pnpm:run build')
  const overrideIndex = events.indexOf('publish:@example/module')
  const updateIndex = events.findIndex(event =>
    event.includes('scripts/repo/npm/update-manifest.mts --force'),
  )
  const commitIndex = events.findIndex(event => event.startsWith('git:commit '))
  const registryIndex = events.indexOf('publish:@example/registry')
  expect(overrideIndex).toBeGreaterThan(0)
  expect(updateIndex).toBeGreaterThan(overrideIndex)
  expect(commitIndex).toBeGreaterThan(updateIndex)
  expect(registryIndex).toBeGreaterThan(commitIndex)
  expect(mocks.publish.mock.calls[0]![1]).toBe(mocks.publish.mock.calls[1]![1])
  expect(result).toEqual({ fails: [], failures: [], skipped: [] })
})

it('forwards dry-run without building or refreshing the checkout', async () => {
  await publishAtCommit('example-sha', { dryRun: true })
  expect(mocks.checkout).toHaveBeenCalledWith('example-sha', { dryRun: true })
  expect(mocks.spawn).not.toHaveBeenCalled()
  expect(mocks.changed).not.toHaveBeenCalled()
  expect(mocks.publish).toHaveBeenCalledTimes(2)
  expect(mocks.publish.mock.calls.every(call => call[2].dryRun)).toBe(true)
})
