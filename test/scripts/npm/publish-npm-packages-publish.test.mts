/**
 * @file Tests for scripts/repo/npm/publish-npm-packages-publish.mts with the npm
 *   upload MOCKED — nothing here touches the network or a registry. The live
 *   run that prompted this passed an EMPTY dist-tag to every package and npm
 *   400'd each one with `Tag must be a non-empty string`; the old `?? 'latest'`
 *   default could not catch it, because `''` is not nullish.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { PublishState } from '../../../scripts/repo/npm/publish-npm-packages-failures.mts'

const uploadNpmPackage = vi.fn()

vi.mock(
  import('../../../scripts/fleet/registry-infra/npm/publish-command.mts'),
  () => ({
    uploadNpmPackage: (...args: unknown[]) => uploadNpmPackage(...args),
  }),
)

const listStagedPackages = vi.fn()
const isAlreadyPublished = vi.fn()
const runInherit = vi.fn()
const password = vi.fn()
vi.mock(import('../../../scripts/fleet/registry-infra/npm/shared.mts'), () => ({
  listStagedPackages: (...args: unknown[]) => listStagedPackages(...args),
}))
vi.mock(import('../../../scripts/fleet/publish-shared.mts'), () => ({
  isAlreadyPublished: (...args: unknown[]) => isAlreadyPublished(...args),
  runInherit: (...args: unknown[]) => runInherit(...args),
}))
vi.mock(import('@socketsecurity/lib/stdio/prompts'), () => ({
  password: (...args: unknown[]) => password(...args),
}))

describe('stagePublish tag defaulting', () => {
  beforeEach(() => {
    uploadNpmPackage.mockReset()
    uploadNpmPackage.mockResolvedValue({
      code: 0,
      output: '',
      postureOk: true,
      ran: true,
    })
  })

  afterEach(() => {
    vi.resetModules()
  })

  test('an empty tag never reaches npm', async () => {
    const { stagePublish } =
      await import('../../../scripts/repo/npm/publish-npm-packages-publish.mts')
    const state: PublishState = { fails: [], failures: [] }
    await stagePublish(
      { path: '/tmp/pkg', printName: '@socketregistry/own-keys', tag: '' },
      state,
      {},
    )
    expect(uploadNpmPackage).toHaveBeenCalledTimes(1)
    expect(uploadNpmPackage.mock.calls[0]![0]).toMatchObject({ tag: 'latest' })
    expect(state.fails).toEqual([])
  })

  test('an explicit prerelease tag is forwarded as-is', async () => {
    const { stagePublish } =
      await import('../../../scripts/repo/npm/publish-npm-packages-publish.mts')
    await stagePublish(
      { path: '/tmp/pkg', printName: '@socketregistry/own-keys', tag: 'beta' },
      { fails: [], failures: [] },
      {},
    )
    expect(uploadNpmPackage.mock.calls[0]![0]).toMatchObject({ tag: 'beta' })
  })

  test('a posture refusal records a failure and does not retry', async () => {
    uploadNpmPackage.mockResolvedValue({
      code: 0,
      output: 'npm error Skipped OIDC exchange',
      postureOk: false,
      ran: true,
    })
    const { stagePublish } =
      await import('../../../scripts/repo/npm/publish-npm-packages-publish.mts')
    const state: PublishState = { fails: [], failures: [] }
    await stagePublish(
      { path: '/tmp/pkg', printName: '@socketregistry/own-keys' },
      state,
      {},
    )
    expect(uploadNpmPackage).toHaveBeenCalledTimes(1)
    expect(state.fails).toEqual(['@socketregistry/own-keys'])
    expect(state.failures?.[0]?.message).toContain(
      'https://www.npmjs.com/package/@socketregistry/own-keys/access',
    )
  })

  test('exhausted retries record a failure naming the tag that was used', async () => {
    uploadNpmPackage.mockResolvedValue({
      code: 1,
      output: 'npm error 400 Bad Request',
      postureOk: true,
      ran: true,
    })
    const { stagePublish } =
      await import('../../../scripts/repo/npm/publish-npm-packages-publish.mts')
    const state: PublishState = { fails: [], failures: [] }
    await stagePublish(
      { path: '/tmp/pkg', printName: '@socketregistry/own-keys' },
      state,
      { maxRetries: 2, retryDelay: 1 },
    )
    expect(uploadNpmPackage).toHaveBeenCalledTimes(2)
    expect(state.fails).toEqual(['@socketregistry/own-keys'])
    expect(state.failures?.[0]?.message).toContain('under tag "latest"')
  })

  test('a dry run stages nothing at all', async () => {
    const { stagePublish } =
      await import('../../../scripts/repo/npm/publish-npm-packages-publish.mts')
    await stagePublish(
      { path: '/tmp/pkg', printName: '@socketregistry/own-keys', tag: '' },
      { fails: [], failures: [] },
      { dryRun: true },
    )
    expect(uploadNpmPackage).not.toHaveBeenCalled()
  })
})

describe('approval eligibility', () => {
  beforeEach(() => {
    listStagedPackages.mockReset()
    isAlreadyPublished.mockReset()
    runInherit.mockReset()
    password.mockReset()
    listStagedPackages.mockResolvedValue([
      {
        name: '@example/already-public',
        version: '1.0.0',
        stageId: 'public-stage',
      },
      { name: '@example/missing-version', stageId: 'invalid-stage' },
      {
        name: '@example/eligible',
        version: '1.0.0',
        stageId: 'eligible-stage',
      },
    ])
    isAlreadyPublished.mockImplementation(
      async (name: string) => name === '@example/already-public',
    )
    runInherit.mockResolvedValue(0)
  })

  test('approves only complete unpublished entries with the supplied OTP', async () => {
    const { approveStagedPackages } =
      await import('../../../scripts/repo/npm/publish-npm-packages-publish.mts')
    const state: PublishState = { fails: [], failures: [] }
    await approveStagedPackages(state, {
      cwd: '/tmp/example-approval',
      otp: '000000',
    })
    expect(isAlreadyPublished.mock.calls).toEqual([
      ['@example/already-public', '1.0.0'],
      ['@example/eligible', '1.0.0'],
    ])
    expect(runInherit).toHaveBeenCalledExactlyOnceWith(
      'pnpm',
      ['stage', 'approve', 'eligible-stage', '--otp', '000000'],
      '/tmp/example-approval',
    )
    expect(password).not.toHaveBeenCalled()
    expect(state.fails).toEqual([])
  })

  test('previews eligible entries without prompting or promoting', async () => {
    const { approveStagedPackages } =
      await import('../../../scripts/repo/npm/publish-npm-packages-publish.mts')
    await approveStagedPackages({ fails: [] }, { dryRun: true })
    expect(isAlreadyPublished).toHaveBeenCalledTimes(2)
    expect(runInherit).not.toHaveBeenCalled()
    expect(password).not.toHaveBeenCalled()
  })
})
