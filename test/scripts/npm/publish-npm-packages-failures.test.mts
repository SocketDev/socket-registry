/**
 * @file Tests for scripts/npm/publish-npm-packages-failures.mts. A wave that
 *   collected nine failures once logged `Unable to publish 9 packages` and
 *   exited 0, so every caller reading the exit code saw a successful publish.
 *   These specs pin that a recorded failure is both reportable and non-zero,
 *   and that a trusted-publisher problem names the package's access URL.
 */

import { describe, expect, test } from 'vitest'

import {
  formatPublishFailure,
  isTrustedPublisherProblem,
  publishExitCode,
  recordPublishFailure,
} from '../../../scripts/npm/publish-npm-packages-failures.mts'

import type { PublishState } from '../../../scripts/npm/publish-npm-packages-failures.mts'

function emptyState(): PublishState {
  return { fails: [], failures: [] }
}

describe('publishExitCode', () => {
  test('a clean run exits 0', () => {
    expect(publishExitCode(emptyState())).toBe(0)
  })

  test('any collected failure exits 1', () => {
    const state = emptyState()
    recordPublishFailure(state, {
      message: 'boom',
      printName: '@socketregistry/own-keys',
      reason: 'upload',
    })
    expect(publishExitCode(state)).toBe(1)
  })

  test('a state built without a failures array still records', () => {
    const state: PublishState = { fails: [] }
    recordPublishFailure(state, {
      message: 'boom',
      printName: '@socketregistry/own-keys',
      reason: 'upload',
    })
    expect(state.fails).toEqual(['@socketregistry/own-keys'])
    expect(state.failures).toHaveLength(1)
    expect(publishExitCode(state)).toBe(1)
  })
})

describe('formatPublishFailure', () => {
  test('every message carries all four ingredients', () => {
    const message = formatPublishFailure({
      detail: 'npm returned 400 Tag must be a non-empty string',
      printName: '@socketregistry/is-data-view',
      reason: 'upload',
    })
    expect(message).toContain('Failed to publish @socketregistry/is-data-view.')
    expect(message).toContain('  Where: ')
    expect(message).toContain('  Saw vs wanted: ')
    expect(message).toContain('  Fix: ')
  })

  test('a trusted-publisher problem names the package access URL', () => {
    const message = formatPublishFailure({
      detail: 'npm error Unable to authenticate, the OIDC exchange was skipped',
      printName: '@socketregistry/own-keys',
      reason: 'posture',
    })
    expect(message).toContain(
      'https://www.npmjs.com/package/@socketregistry/own-keys/access',
    )
    expect(message).toContain('npm-publish-packages.yml')
  })

  test('an approve failure builds the URL from the bare name, not name@version', () => {
    const message = formatPublishFailure({
      detail: '`pnpm stage approve abc` exited 1; wanted 0.',
      name: '@socketregistry/own-keys',
      printName: '@socketregistry/own-keys@1.0.0',
      reason: 'approve',
    })
    expect(message).toContain('npm view @socketregistry/own-keys versions')
    expect(message).not.toContain('own-keys@1.0.0/access')
  })
})

describe('isTrustedPublisherProblem', () => {
  test('matches npm trusted-publishing vocabulary in any case', () => {
    expect(isTrustedPublisherProblem('Skipped OIDC exchange')).toBe(true)
    expect(isTrustedPublisherProblem('no trusted publisher configured')).toBe(
      true,
    )
    expect(isTrustedPublisherProblem('missing id-token permission')).toBe(true)
  })

  test('an ordinary registry error is not one', () => {
    expect(isTrustedPublisherProblem('npm error 404 Not Found')).toBe(false)
  })
})
