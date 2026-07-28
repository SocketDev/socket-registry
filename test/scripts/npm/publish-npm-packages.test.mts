/**
 * @file Tests for the scripts/npm/publish-npm-packages.mts orchestrator's
 *   fail-loud contract. Outside CI and without --force the flow refuses with a
 *   What / Where / Saw-vs-wanted / Fix message; a silent `return` there exits 0
 *   and reads as a successful publish to anything that only checks the exit
 *   code.
 */

import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ROOT_PATH } from '../../../scripts/constants/paths.mts'

const ORCHESTRATOR_PATH = path.join(
  ROOT_PATH,
  'scripts',
  'npm',
  'publish-npm-packages.mts',
)

describe('main outside CI', () => {
  let originalArgv: string[]

  beforeEach(() => {
    originalArgv = process.argv
    process.argv = [process.argv[0]!, ORCHESTRATOR_PATH]
    vi.stubEnv('CI', '')
    vi.resetModules()
  })

  afterEach(() => {
    process.argv = originalArgv
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  test('refuses LOUD instead of exiting 0 having done nothing', async () => {
    // The module captures ENV + cliArgs at import time, so it is imported
    // fresh under the stubbed environment.
    const { main } =
      await import('../../../scripts/npm/publish-npm-packages.mts')
    await expect(main()).rejects.toThrow(
      /Refusing to run the npm publish flow[\s\S]*Where:[\s\S]*Saw vs wanted:[\s\S]*Fix:/,
    )
  })

  test('the refusal names both ways forward', async () => {
    const { main } =
      await import('../../../scripts/npm/publish-npm-packages.mts')
    const error = await main().catch((e: unknown) => e as Error)
    expect(error.message).toContain('dispatch the publish workflow from CI')
    expect(error.message).toContain('--force')
    expect(error.message).toContain('--dry-run')
  })
})
