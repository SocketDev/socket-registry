/**
 * @file Tests for scripts/npm/publish-npm-packages-publish.mts with the npm
 *   upload MOCKED — nothing here touches the network or a registry. The live
 *   run that prompted this passed an EMPTY dist-tag to every package and npm
 *   400'd each one with `Tag must be a non-empty string`; the old `?? 'latest'`
 *   default could not catch it, because `''` is not nullish.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const uploadNpmPackage = vi.fn()

vi.mock(
  import('../../../scripts/fleet/publish-infra/npm/publish-command.mts'),
  () => ({
    uploadNpmPackage: (...args: unknown[]) => uploadNpmPackage(...args),
  }),
)

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
      await import('../../../scripts/npm/publish-npm-packages-publish.mts')
    const state = { fails: [] as string[], failures: [] }
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
      await import('../../../scripts/npm/publish-npm-packages-publish.mts')
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
      await import('../../../scripts/npm/publish-npm-packages-publish.mts')
    const state = { fails: [] as string[], failures: [] }
    await stagePublish(
      { path: '/tmp/pkg', printName: '@socketregistry/own-keys' },
      state,
      {},
    )
    expect(uploadNpmPackage).toHaveBeenCalledTimes(1)
    expect(state.fails).toEqual(['@socketregistry/own-keys'])
    expect(state.failures[0]!.message).toContain(
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
      await import('../../../scripts/npm/publish-npm-packages-publish.mts')
    const state = { fails: [] as string[], failures: [] }
    await stagePublish(
      { path: '/tmp/pkg', printName: '@socketregistry/own-keys' },
      state,
      { maxRetries: 2, retryDelay: 1 },
    )
    expect(uploadNpmPackage).toHaveBeenCalledTimes(2)
    expect(state.fails).toEqual(['@socketregistry/own-keys'])
    expect(state.failures[0]!.message).toContain('under tag "latest"')
  })

  test('a dry run stages nothing at all', async () => {
    const { stagePublish } =
      await import('../../../scripts/npm/publish-npm-packages-publish.mts')
    await stagePublish(
      { path: '/tmp/pkg', printName: '@socketregistry/own-keys', tag: '' },
      { fails: [], failures: [] },
      { dryRun: true },
    )
    expect(uploadNpmPackage).not.toHaveBeenCalled()
  })
})
