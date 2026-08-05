/**
 * @file Tests for scripts/npm/publish-npm-packages-dispatch.mts — the local
 *   lane's argv mapping. The dispatch is the ONLY thing a local run may do, so
 *   what it hands `gh` is the whole contract: every workflow input is passed
 *   explicitly rather than left to the YAML's default, and `publish` defaults
 *   to false so a bare dispatch previews instead of staging.
 */

import { describe, expect, test } from 'vitest'

import {
  buildWorkflowDispatchArgs,
  buildWorkflowWatchArgs,
  PUBLISH_WORKFLOW_FILE,
} from '../../../scripts/npm/publish-npm-packages-dispatch.mts'

describe('buildWorkflowDispatchArgs', () => {
  test('a bare dispatch targets the workflow and defaults to a dry run', () => {
    expect(buildWorkflowDispatchArgs({})).toEqual([
      'workflow',
      'run',
      PUBLISH_WORKFLOW_FILE,
      '--field',
      'publish=false',
      '--field',
      'dist-tag=latest',
      '--field',
      'only=',
    ])
  })

  test('every input maps to its workflow field', () => {
    expect(
      buildWorkflowDispatchArgs({
        distTag: 'next',
        only: 'own-keys,is-data-view',
        publish: true,
        ref: 'main',
      }),
    ).toEqual([
      'workflow',
      'run',
      PUBLISH_WORKFLOW_FILE,
      '--ref',
      'main',
      '--field',
      'publish=true',
      '--field',
      'dist-tag=next',
      '--field',
      'only=own-keys,is-data-view',
    ])
  })

  test('publish is always sent, never left to the YAML default', () => {
    const args = buildWorkflowDispatchArgs({ publish: false })
    expect(args).toContain('publish=false')
    expect(args.filter(arg => arg.startsWith('publish=')).length).toBe(1)
  })

  test('no ref means no --ref flag', () => {
    expect(buildWorkflowDispatchArgs({ distTag: 'beta' })).not.toContain(
      '--ref',
    )
  })
})

describe('buildWorkflowWatchArgs', () => {
  test('the watch surfaces the run result as its own exit status', () => {
    expect(buildWorkflowWatchArgs()).toEqual([
      'run',
      'watch',
      '--exit-status',
      '--compact',
    ])
  })
})
