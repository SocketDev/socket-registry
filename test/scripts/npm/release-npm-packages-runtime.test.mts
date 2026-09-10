import { beforeEach, expect, it, vi } from 'vitest'
import {
  maybeBumpPackage,
  packageData,
} from '../../../scripts/repo/npm/release-npm-packages.mts'
import type { BumpState } from '../../../scripts/repo/npm/release-npm-packages.mts'

const mocks = vi.hoisted(() => ({
  manifest: vi.fn(),
  read: vi.fn(),
  readSync: vi.fn(),
  save: vi.fn(),
  spawn: vi.fn(),
  update: vi.fn(),
}))

vi.mock(
  import('@socketsecurity/lib-stable/packages/manifest'),
  async original => ({
    ...(await original()),
    fetchPackageManifest: mocks.manifest,
  }),
)
vi.mock(import('@socketsecurity/lib-stable/packages/read'), async original => ({
  ...(await original()),
  readPackageJson: mocks.read,
  readPackageJsonSync: mocks.readSync,
}))
vi.mock(
  import('@socketsecurity/lib-stable/process/spawn/child'),
  async original => ({
    ...(await original()),
    spawn: mocks.spawn,
  }),
)

function createState(): BumpState {
  return {
    bumped: [],
    changed: [],
    changes: [],
    placeholders: [],
    unresolved: [],
    warnings: [],
  }
}

function createPackage() {
  return packageData({ name: '@example/package', path: '/example/package' })
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.manifest.mockResolvedValue({ version: '1.0.0' })
  mocks.readSync.mockReturnValue({ version: '1.0.0' })
  mocks.read.mockResolvedValue({
    content: { version: '1.0.0' },
    update: mocks.update,
    save: mocks.save,
  })
  mocks.spawn.mockResolvedValue({ stdout: ' M example.js' })
})

it('records an unresolved manifest without editing the package', async () => {
  mocks.manifest.mockResolvedValue(undefined)
  const pkg = createPackage()
  const state = createState()
  await maybeBumpPackage(pkg, { state })
  expect(state.unresolved).toEqual([pkg])
  expect(mocks.read).not.toHaveBeenCalled()
  expect(mocks.save).not.toHaveBeenCalled()
})

it('reports an unpublished placeholder using the local version', async () => {
  mocks.manifest.mockResolvedValue({ version: '0.0.0' })
  const pkg = createPackage()
  const state = createState()
  await maybeBumpPackage(pkg, { state })
  expect(pkg.version).toBe('1.0.0')
  expect(state.placeholders).toEqual([pkg])
  expect(mocks.spawn).not.toHaveBeenCalled()
  expect(mocks.save).not.toHaveBeenCalled()
})

it('preserves a version that is already ahead of the registry', async () => {
  mocks.read.mockResolvedValue({
    content: { version: '1.1.0' },
    update: mocks.update,
    save: mocks.save,
  })
  const pkg = createPackage()
  const state = createState()
  await maybeBumpPackage(pkg, { state })
  expect(pkg.version).toBe('1.1.0')
  expect(state.bumped).toEqual([pkg])
  expect(state.changed).toEqual([])
  expect(mocks.save).not.toHaveBeenCalled()
})

it('saves a patch for changed bytes and records the edited package', async () => {
  const pkg = createPackage()
  const state = createState()
  await maybeBumpPackage(pkg, { state })
  expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ version: '1.0.1' })
  expect(mocks.save).toHaveBeenCalledOnce()
  expect(pkg.version).toBe('1.0.1')
  expect(state.bumped).toEqual([pkg])
  expect(state.changed).toEqual([pkg])
})
