/**
 * @file Shared fixtures for the npm-port-provenance suites: one wired port
 *   (Raynos/for-each v0.3.5) rendered as each of the four provenance records,
 *   so the pure-leg tests and the runner tests compare against the same bytes.
 */

import { mergeGitmodulesPins } from '../../../../../scripts/repo/check/npm-port-provenance/records.mts'

import type { NpmPortPin } from '../../../../../scripts/repo/check/npm-port-provenance/records.mts'
import type { Upstream } from '../../../../../scripts/fleet/lockstep/schema.mts'

export const PORTED_SHA = '45229651ed893773058ba9ccc42af8999014409f'

export const PORT_HEADER_SOURCE = `/**
 * @file Tests for for-each NPM package override. Ported 1:1 from upstream
 *   v0.3.5 (${PORTED_SHA}):
 *   https://github.com/Raynos/for-each/blob/${PORTED_SHA}/test/test.js.
 */

import { describe } from 'vitest'
`

export const GITMODULES_TEXT = `# for-each-v0.3.5 sha256:${'4'.repeat(64)}
[submodule "upstream/Raynos-for-each"]
\tref = ${PORTED_SHA}
\tpath = upstream/Raynos-for-each
\turl = https://github.com/Raynos/for-each.git
\tbranch = v0.3.5
\tshallow = true
\tsparse-checkout = test/
\tverify = none
`

export const UPSTREAMS: Readonly<Record<string, Upstream>> = {
  'Raynos-for-each': {
    submodule: 'upstream/Raynos-for-each',
    repo: 'https://github.com/Raynos/for-each',
  },
}

/**
 * The wired port's `.gitmodules` blocks, optionally from a mutated file text so
 * a suite can express a drifted pin without re-importing the parser.
 */
export function makePins(gitmodulesText?: string | undefined): NpmPortPin[] {
  return mergeGitmodulesPins(gitmodulesText ?? GITMODULES_TEXT)
}

/**
 * The wired port's `file-fork` row, with any field overridden for a test case.
 */
export function makeRow(
  overrides?: Record<string, unknown> | undefined,
): Record<string, unknown> & {
  kind: 'file-fork'
  id: string
  local: string
  upstream: string
  upstream_path: string
  forked_at_sha: string
  deviations: string[]
} {
  return {
    kind: 'file-fork' as const,
    id: 'npm-port-for-each',
    upstream: 'Raynos-for-each',
    local: 'test/npm/for-each.test.mts',
    upstream_path: 'test/test.js',
    forked_at_sha: PORTED_SHA,
    deviations: ['swap tape for vitest'],
    ...overrides,
  }
}
