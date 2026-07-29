/**
 * @file Configure npm staged publishing for every package the trusted-package
 *   gate reports as not staged. npm exposes no registry API for this: the
 *   trusted publisher's "Allowed actions" control lives behind the signed-in
 *   web UI at `/package/<name>/access`, so this drives system Chrome through
 *   playwright-core.
 *   Dry run is the DEFAULT; `--apply` opts into writing. The target list comes
 *   from `./check-trusted-packages-staged.mts` rather than a hardcoded array,
 *   so a package configured on one run drops out of the plan on the next, and
 *   a package whose settings already permit a staged publish is skipped without
 *   a write. Both together make a re-run a no-op.
 *   `--stage-only` additionally clears "npm publish". It is OFF by default:
 *   clearing it forces every publish through the approval queue, which breaks a
 *   pipeline still publishing directly. Adding the staged action is additive
 *   and safe; removing the direct one is a release-pipeline decision.
 *   Usage:
 *   pnpm run npm:configure-staged                  # plan only, writes nothing
 *   pnpm run npm:configure-staged --apply
 *   pnpm run npm:configure-staged --package date
 *   pnpm run npm:configure-staged --apply --stage-only
 *   Browser I/O lives in `./configure-staged-publishing-browser.mts`; pure
 *   planning and payload parsing in `./configure-staged-publishing-plan.mts`.
 */

import process from 'node:process'

import { parseArgs } from '@socketsecurity/lib-stable/argv/parse'
import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import {
  loadStagedRoster,
  readStagedTrust,
} from './check-trusted-packages-staged.mts'
import {
  applyStagedPublishing,
  DEFAULT_PROFILE_DIR,
  openNpmSettingsSession,
  readSettingsPayload,
} from './configure-staged-publishing-browser.mts'
import {
  decideStagedConfigurationAction,
  DIRECT_PUBLISH_ACTION,
  formatUnreadableSettings,
  planStagedConfiguration,
  readAllowedActions,
  STAGE_PUBLISH_ACTION,
} from './configure-staged-publishing-plan.mts'

import type { StagedTrustReport } from './check-trusted-packages-staged.mts'

const logger = getDefaultLogger()

const { values: args } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
    limit: { type: 'string' },
    package: { type: 'string', multiple: true },
    'profile-dir': { type: 'string' },
    'stage-only': { type: 'boolean', default: false },
  },
  strict: false,
})

/**
 * Read every roster package's staged-publishing state. Serial so a registry
 * failure's message stays tied to the package that produced it, and so a
 * failing read stops the run instead of being averaged into a batch result.
 */
export async function loadStagedReports(
  filters: readonly string[],
): Promise<StagedTrustReport[]> {
  let roster = await loadStagedRoster()
  if (filters.length) {
    roster = roster.filter(entry =>
      filters.some(f =>
        entry.name.toLowerCase().includes(f.trim().toLowerCase()),
      ),
    )
  }
  const reports: StagedTrustReport[] = []
  for (let i = 0, { length } = roster; i < length; i += 1) {
    // eslint-disable-next-line no-await-in-loop -- serial reads keep each registry error tied to its package.
    reports.push(await readStagedTrust(roster[i]!))
  }
  return reports
}

/**
 * Clamp the plan to `--limit`, for a cautious first pass over a large roster.
 */
export function resolveConfigureLimit(
  rawLimit: string | undefined,
  targetCount: number,
): number {
  const parsed = Number.parseInt(String(rawLimit ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, targetCount)
    : targetCount
}

function printHelp(): void {
  logger.log('')
  logger.log(
    'Usage: node scripts/npm/configure-staged-publishing.mts [options]',
  )
  logger.log('')
  logger.log('Options:')
  logger.log('  --apply          Write the change. Omitted, this is a dry run.')
  logger.log(
    '  --package <s>    Narrow to packages whose name contains <s>. Repeatable.',
  )
  logger.log('  --limit <n>      Configure at most n packages this run.')
  logger.log(
    '  --stage-only     Also clear "npm publish", forcing every publish through the',
  )
  logger.log(
    '                   approval queue. Off by default: clearing it breaks a pipeline',
  )
  logger.log('                   that still publishes directly.')
  logger.log(
    `  --profile-dir    Chrome profile holding the signed-in npm session. Default:`,
  )
  logger.log(`                   ${DEFAULT_PROFILE_DIR}`)
  logger.log('  --help           Show this message.')
  logger.log('')
}

export async function main(): Promise<void> {
  if (args['help']) {
    printHelp()
    return
  }

  const apply = args['apply'] === true
  const stageOnly = args['stage-only'] === true

  logger.log(
    'Reading the staged-publishing state of every package in the manifest…',
  )
  const reports = await loadStagedReports(
    (args['package'] as string[] | undefined) ?? [],
  )
  const targets = planStagedConfiguration(reports)
  const unpublishedCount = reports.filter(
    r => r.verdict === 'unpublished',
  ).length
  const stagedCount = reports.filter(r => r.verdict === 'staged').length

  logger.log('')
  logger.log(
    `${reports.length} package(s) in the roster: ${stagedCount} already staged, ` +
      `${targets.length} to configure, ${unpublishedCount} not published yet.`,
  )
  if (!targets.length) {
    logger.success('Nothing to configure.')
    return
  }

  const slice = targets.slice(
    0,
    resolveConfigureLimit(args['limit'] as string | undefined, targets.length),
  )
  logger.log('')
  for (let i = 0, { length } = slice; i < length; i += 1) {
    const target = slice[i]!
    const latest = target.latestVersion
      ? ` (latest ${target.latestVersion})`
      : ''
    logger.log(`  ${target.name}${latest} -> ${target.settingsUrl}`)
  }
  logger.log('')

  if (!apply) {
    logger.log(
      `Dry run: would set "${STAGE_PUBLISH_ACTION}" on ${slice.length} package(s)` +
        `${stageOnly ? ` and clear "${DIRECT_PUBLISH_ACTION}"` : ''}. ` +
        'Re-run with --apply to write.',
    )
    return
  }

  const session = await openNpmSettingsSession({
    profileDir: (args['profile-dir'] as string | undefined) || undefined,
  })
  logger.success(`Signed in to npm as ${session.user}.`)

  const configured: string[] = []
  const skipped: string[] = []
  const failed: string[] = []
  try {
    for (let i = 0, { length } = slice; i < length; i += 1) {
      const target = slice[i]!
      try {
        // Read current state BEFORE writing, so a package that already permits
        // a staged publish is skipped rather than re-submitted.
        // eslint-disable-next-line no-await-in-loop -- one browser page, one package at a time.
        const payload = await readSettingsPayload(session.page, target)
        const action = decideStagedConfigurationAction(
          readAllowedActions(payload),
        )
        if (action === 'already-configured') {
          logger.log(
            `${target.name}: already permits a staged publish; skipping.`,
          )
          skipped.push(target.name)
          continue
        }
        if (action === 'unreadable') {
          throw new Error(
            formatUnreadableSettings(
              target,
              'the settings payload carried no recognizable "Allowed actions" block.',
            ),
          )
        }
        // eslint-disable-next-line no-await-in-loop -- one browser page, one package at a time.
        await applyStagedPublishing(session.page, target, { stageOnly })
        logger.success(`${target.name}: set "${STAGE_PUBLISH_ACTION}".`)
        configured.push(target.name)
      } catch (e) {
        logger.error(errorMessage(e))
        failed.push(target.name)
      }
    }
  } finally {
    await session.close()
  }

  logger.log('')
  logger.log(
    `Configured ${configured.length}, skipped ${skipped.length}, failed ${failed.length}.`,
  )
  if (failed.length) {
    logger.fail(`Needs attention: ${failed.join(', ')}`)
    process.exitCode = 1
  }
}

main().catch((e: unknown) => {
  logger.error(errorMessage(e))
  process.exitCode = 1
})
