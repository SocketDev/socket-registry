/**
 * @file Tests for the scripts/npm/publish-npm-packages.mts lane router. The
 *   orchestrator used to carry a local upload path behind `--force`; that path
 *   is deleted, so outside CI the only thing the script can do is DISPATCH the
 *   workflow. These specs pin that the escape hatch is gone and that the local
 *   dry run previews a dispatch rather than an upload.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ROOT_PATH } from '../../../scripts/constants/paths.mts'

const ORCHESTRATOR_PATH = path.join(
  ROOT_PATH,
  'scripts',
  'npm',
  'publish-npm-packages.mts',
)

const ARGS_PATH = path.join(
  ROOT_PATH,
  'scripts',
  'npm',
  'publish-npm-packages-args.mts',
)

describe('the local upload path is deleted', () => {
  test('the orchestrator never spawns a publish itself', () => {
    const source = readFileSync(ORCHESTRATOR_PATH, 'utf8')
    expect(source).not.toContain('stage publish')
    expect(source).not.toContain('publishAtCommit')
  })

  test('--force is gone from the CLI surface', () => {
    const source = readFileSync(ARGS_PATH, 'utf8')
    // `--force-publish` / `--force-registry` stay; the bare `--force` that
    // unlocked a local upload does not.
    expect(source).not.toMatch(/^\s{4}force:\s*\{/m)
    expect(source).not.toMatch(/cliArgs\.force\b(?!-|Publish|Registry)/)
  })
})

describe('main outside CI', () => {
  let originalArgv: string[]

  beforeEach(() => {
    originalArgv = process.argv
    vi.stubEnv('CI', '')
    vi.resetModules()
  })

  afterEach(() => {
    process.argv = originalArgv
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  test.each([['--dry-run', '--dist-tag', 'next']])(
    'parses dry-run aliases with %j',
    async (...args) => {
      process.argv = [process.argv[0]!, ORCHESTRATOR_PATH, ...args]
      const { dryRunFlag, distTagFlag } =
        await import('../../../scripts/npm/publish-npm-packages-args.mts')
      expect(dryRunFlag).toBe(true)
      expect(distTagFlag).toBe('next')
    },
  )

  test('retains dry-run flags after the argument separator', async () => {
    process.argv = [process.argv[0]!, ORCHESTRATOR_PATH, '--', '--dry-run']
    const { dryRunFlag } =
      await import('../../../scripts/npm/publish-npm-packages-args.mts')
    expect(dryRunFlag).toBe(true)
  })

  test('a dry run previews the dispatch and uploads nothing', async () => {
    process.argv = [process.argv[0]!, ORCHESTRATOR_PATH, '--dry-run']
    // The module captures ENV + cliArgs at import time, so it is imported
    // fresh under the stubbed environment.
    const { main } =
      await import('../../../scripts/npm/publish-npm-packages.mts')
    await expect(main()).resolves.toBe(0)
  })
})

describe('main in CI', () => {
  let originalArgv: string[]

  beforeEach(() => {
    originalArgv = process.argv
    process.argv = [process.argv[0]!, ORCHESTRATOR_PATH]
    vi.stubEnv('CI', 'true')
    vi.stubEnv('GITHUB_ACTIONS', '')
    vi.resetModules()
  })

  afterEach(() => {
    process.argv = originalArgv
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  test('refuses a live stage outside the publish workflow', async () => {
    const { main } =
      await import('../../../scripts/npm/publish-npm-packages.mts')
    await expect(main()).rejects.toThrow(
      /requires a registry npm publish workflow/u,
    )
  })

  test('requires local context for interactive promotion', async () => {
    process.argv.push('--approve')
    const { main } =
      await import('../../../scripts/npm/publish-npm-packages.mts')
    await expect(main()).rejects.toThrow(/local npm session/u)
  })
})
