/**
 * @file What a release check PRINTS, and the exit code that state earns.
 *   Split out of release-npm-packages.mts so that entry stays under the
 *   file-size soft cap; the entry decides what changed, this module decides
 *   what the operator is told about it.
 *   The loud part is deliberate: a run that ends 0 having said nothing is
 *   indistinguishable from a run that found nothing, which is how nine
 *   unpublished packages stayed invisible.
 */

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import { logSectionHeader } from '../util/logging.mts'

import type { BumpState } from './release-npm-packages.mts'

const logger = getDefaultLogger()

function logGroupedMessages(
  header: string,
  emoji: string,
  messages: string[],
): void {
  if (!messages.length) {
    return
  }
  logger.log('')
  logSectionHeader(header, { emoji })
  for (let i = 0, { length } = messages; i < length; i += 1) {
    logger.log(messages[i])
  }
}

/**
 * Report what needs publishing, and hand back the exit code that state earns.
 *
 * Exit 1 has two triggers. A package npm could not resolve at all cannot be
 * staged by anyone, so the run is a failure whether or not a release was asked
 * for. And `--release` says a release is EXPECTED: finding nothing publishable
 * under that flag means the caller's premise was wrong, which is worth an exit
 * code rather than a quiet zero.
 */
export function reportReleaseState(
  state: BumpState,
  options?: { release?: boolean | undefined } | undefined,
): number {
  const { release = false } = { __proto__: null, ...options } as {
    release?: boolean | undefined
  }
  const publishable = state.bumped.length + state.placeholders.length

  if (state.placeholders.length) {
    logger.log('')
    logSectionHeader('Never published (npm holds the 0.0.0 placeholder)', {
      emoji: '📦',
    })
    for (const pkg of state.placeholders) {
      logger.log(`  ${pkg.name}@${pkg.version} — npm has 0.0.0`)
    }
  }

  logGroupedMessages('Warnings', '⚠️', state.warnings)
  logGroupedMessages('Changes', 'ℹ', state.changes)

  if (state.unresolved.length) {
    logger.fail(
      `npm resolved no manifest for ${state.unresolved.length} ${state.unresolved.length === 1 ? 'package' : 'packages'}.\n` +
        `  Where: scripts/repo/npm/release-npm-packages.mts, the per-package manifest lookup.\n` +
        `  Saw vs wanted: ${state.unresolved.map(pkg => `${pkg.name}@${pkg.tag}`).join(', ')} resolved to nothing; wanted a manifest for every package, so the run can say whether it needs publishing.\n` +
        `  Fix: confirm the names exist with \`npm view <name>\`, and confirm the dist-tag resolves. A never-claimed name has to be reserved before a release can stage it.`,
    )
    return 1
  }

  if (!publishable) {
    if (release) {
      logger.fail(
        `Nothing can be staged, but a release was requested.\n` +
          `  Where: scripts/repo/npm/release-npm-packages.mts --release.\n` +
          `  Saw vs wanted: 0 packages changed and 0 sit at the npm 0.0.0 placeholder; wanted at least one publishable package.\n` +
          `  Fix: land the change you meant to release, then re-run. Drop --release to use this as a read-only check.`,
      )
      return 1
    }
    logger.log('No packages need publishing.')
    return 0
  }

  logger.log('')
  logger.log(
    `${publishable} ${publishable === 1 ? 'package needs' : 'packages need'} publishing (${state.bumped.length} changed, ${state.placeholders.length} never published).`,
  )
  logger.log(
    'Stage them by dispatching npm-publish-packages.yml: pnpm run package-npm-publish --publish',
  )
  return 0
}
