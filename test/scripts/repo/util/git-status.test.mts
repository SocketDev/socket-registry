import { beforeEach, expect, it, vi } from 'vitest'

import {
  getChangedFilesSync,
  getStagedFiles,
  getUnstagedFilesSync,
  isUnstaged,
} from '../../../../scripts/repo/util/git-status.mts'

const mocks = vi.hoisted(() => ({ spawn: vi.fn(), spawnSync: vi.fn() }))

vi.mock(import('@socketsecurity/lib-stable/process/spawn/child'), () => mocks)
vi.mock(import('node:fs'), async importOriginal => ({
  ...(await importOriginal()),
  existsSync: () => true,
}))

beforeEach(() => vi.resetAllMocks())

it('resolves status from the selected checkout and keeps only the renamed destination', () => {
  mocks.spawnSync
    .mockReturnValueOnce({ status: 0, stdout: '/example/checkout\n' })
    .mockReturnValueOnce({
      status: 0,
      stdout: 'R  new-file.mts\0old-file.mts\0 M modified.mts\0',
    })
  expect(
    getChangedFilesSync({ cwd: '/example/checkout/subdirectory' }),
  ).toEqual(['new-file.mts', 'modified.mts'])
  expect(mocks.spawnSync.mock.calls[0]?.[2].cwd).toBe(
    '/example/checkout/subdirectory',
  )
  expect(mocks.spawnSync.mock.calls[1]?.[2].cwd).toBe('/example/checkout')
})

it('reads staged paths from the selected checkout', async () => {
  mocks.spawn
    .mockResolvedValueOnce({ stdout: '/example/checkout\n' })
    .mockResolvedValueOnce({ stdout: 'staged.mts\n' })
  expect(await getStagedFiles({ cwd: '/example/checkout' })).toEqual([
    'staged.mts',
  ])
  expect(mocks.spawn.mock.calls[0]?.[2].cwd).toBe('/example/checkout')
})

it('checks an unstaged path with the same checkout options', async () => {
  mocks.spawn
    .mockResolvedValueOnce({ stdout: '/example/checkout\n' })
    .mockResolvedValueOnce({ stdout: 'modified.mts\n' })
  expect(await isUnstaged('modified.mts', { cwd: '/example/checkout' })).toBe(
    true,
  )
  expect(mocks.spawn.mock.calls[0]?.[2].cwd).toBe('/example/checkout')
})

it('returns no paths when the checkout cannot be resolved', () => {
  mocks.spawnSync.mockReturnValue({ status: 128, stdout: '' })
  expect(getUnstagedFilesSync({ cwd: '/example/missing-checkout' })).toEqual([])
})
