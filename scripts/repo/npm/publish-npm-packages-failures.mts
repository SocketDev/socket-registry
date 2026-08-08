/**
 * @file How a failed package is recorded, formatted, and turned into an exit
 *   code. Split out of publish-npm-packages-publish.mts so that module stays
 *   under the file-size soft cap alongside its -git / -commit / -needs /
 *   -dispatch siblings.
 *   The reason this is its own surface rather than a `fails.push(name)` line:
 *   a wave that collected nine failures once ended
 *   `⚠ Unable to publish 9 packages` and exited 0, so every caller that reads
 *   the exit code saw a successful publish. Recording, reporting, and the exit
 *   code now live together, and the report is a What / Where / Saw-vs-wanted /
 *   Fix block per package rather than a comma-joined list of names.
 */

import { joinAnd } from '@socketsecurity/lib-stable/arrays/join'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { pluralize } from '@socketsecurity/lib-stable/words/pluralize'

const logger = getDefaultLogger()

export type PublishFailureReason = 'approve' | 'posture' | 'upload'

/**
 * One package's failure, kept alongside the bare `fails` name list.
 */
export interface PublishFailure {
  /**
   * The four-ingredient block, already formatted and printable as-is.
   */
  message: string
  printName: string
  reason: PublishFailureReason
}

/**
 * Shared mutable accumulator threaded through the publish/approve flow so
 * concurrent packages can report failures without a return value.
 */
export interface PublishState {
  fails: string[]
  failures?: PublishFailure[] | undefined
  skipped?: string[] | undefined
}

/**
 * Whether an upload's output says the package has no trusted-publisher config.
 * npm phrases this several ways across the OIDC exchange and the publish
 * itself, so the match is on the vocabulary rather than one sentence.
 */
export function isTrustedPublisherProblem(output: string): boolean {
  const haystack = output.toLowerCase()
  return (
    haystack.includes('trusted publish') ||
    haystack.includes('trusted publisher') ||
    haystack.includes('oidc') ||
    haystack.includes('id-token')
  )
}

/**
 * The What / Where / Saw-vs-wanted / Fix block for one failed package.
 *
 * A trusted-publisher problem names the package's own access page, because
 * that URL is where the fix is applied and hunting for it is the slow part of
 * an otherwise one-click repair.
 */
export function formatPublishFailure(config: {
  detail: string
  /**
   * The bare npm package name, used to build the access URL. Defaults to
   * `printName`, which already IS the bare name for an upload; an approve
   * failure prints `name@version`, so it passes the name separately.
   */
  name?: string | undefined
  printName: string
  reason: PublishFailureReason
}): string {
  const { detail, name, printName, reason } = config
  const accessUrl = `https://www.npmjs.com/package/${name ?? printName}/access`
  const where =
    reason === 'approve'
      ? `\`pnpm stage approve\` for ${printName}, run locally.`
      : `the staged upload of ${printName}, via scripts/fleet/registry-infra/npm/publish-command.mts.`
  let fix: string
  if (isTrustedPublisherProblem(detail)) {
    fix = `Configure this package's trusted publisher at ${accessUrl} — repository socket-registry, workflow npm-publish-packages.yml, environment npm-publish — then re-dispatch.`
  } else if (reason === 'approve') {
    fix = `Re-run \`pnpm run package-npm-publish --approve\` with a fresh 2FA code. If the entry was already promoted, confirm with \`npm view ${name ?? printName} versions\` before approving again.`
  } else if (reason === 'posture') {
    fix = `Re-dispatch npm-publish-packages.yml from GitHub Actions — the upload needs the workflow's OIDC identity, and no local npm token substitutes for it.`
  } else {
    fix = `Read the registry error above, fix it, then re-dispatch npm-publish-packages.yml. Package access page: ${accessUrl}.`
  }
  return (
    `Failed to publish ${printName}.\n` +
    `  Where: ${where}\n` +
    `  Saw vs wanted: ${detail}\n` +
    `  Fix: ${fix}`
  )
}

/**
 * Record one package's failure in both the name list and the detail list.
 * Callers construct state with only `fails`, so the detail array is created on
 * demand rather than being a required field every call site has to remember.
 */
export function recordPublishFailure(
  state: PublishState,
  failure: PublishFailure,
): void {
  state.fails.push(failure.printName)
  if (!state.failures) {
    state.failures = []
  }
  state.failures.push(failure)
}

/**
 * The exit code a run with this state must surface. A collected failure that
 * exits 0 reads as a successful publish to every caller that only checks the
 * code, which is how nine failed uploads once ended a green run.
 */
export function publishExitCode(state: PublishState): number {
  return state.fails.length ? 1 : 0
}

/**
 * Print every collected failure as its own four-ingredient block.
 */
export function reportPublishFailures(state: PublishState): void {
  const failures = state.failures ?? []
  if (!failures.length) {
    // A name collected without a detail block still has to be visible.
    if (state.fails.length) {
      logger.fail(
        `Unable to publish ${state.fails.length} ${pluralize('package', { count: state.fails.length })}: ${joinAnd(state.fails)}`,
      )
    }
    return
  }
  logger.log('')
  logger.fail(
    `Unable to publish ${failures.length} ${pluralize('package', { count: failures.length })}: ${joinAnd(failures.map(failure => failure.printName))}`,
  )
  for (const failure of failures) {
    logger.log('')
    logger.log(failure.message)
  }
}
