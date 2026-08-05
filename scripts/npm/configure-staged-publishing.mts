/**
 * @file Configure npm's trusted publisher for every package the trusted-package
 *   gate reports as not staged. npm exposes no registry API for this: the
 *   trusted-publisher form lives behind the signed-in web UI at
 *   `/package/<name>/access`, so this drives system Chrome through
 *   playwright-core.
 *   Five per-package states come out of reading that page. `create` is a
 *   package with no trusted publisher at all — the state that made every
 *   `@socketregistry/*` staging upload 401 the first time
 *   `.github/workflows/npm-publish-packages.yml` ran, because npm answers the
 *   OIDC token exchange with a 404 when no publisher matches the claim.
 *   `rebind` is a publisher pointing somewhere else, most often at the
 *   single-subject `npm-publish.yml` rather than the family stager. `configure`
 *   is a correct binding missing the staged-publish action. `narrow` is a
 *   correct binding that permits the staged publish AND still permits a direct
 *   one. `skip` is a package already correct, which is what makes a re-run a
 *   no-op.
 *   STAGE-ONLY IS THE TARGET, not a flag. Once a package's initial `0.0.0`
 *   placeholder exists there is nothing left that needs to publish directly,
 *   and leaving the direct grant beside the staged one means a release can
 *   still reach consumers with no approval step — so `--apply` clears "npm
 *   publish" and a package carrying both grants reads as `narrow` rather than
 *   `skip`. The clear is gated on the registry having answered for the package:
 *   every package in the plan has at least the placeholder, and a name the
 *   packument read came back empty for is bound but never narrowed.
 *   Dry run is the DEFAULT; `--apply` opts into writing. A dry run reads no
 *   page, so it reports every target as `create` and names the target binding;
 *   `--apply` reads each package first and narrows the state from what npm
 *   actually reports. The target list comes from
 *   `./check-trusted-packages-staged.mts` rather than a hardcoded array, so a
 *   package that gets configured drops out of the plan on the next run.
 *   Usage:
 *   pnpm run npm:configure-staged                  # plan only, writes nothing
 *   pnpm run npm:configure-staged --apply
 *   pnpm run npm:configure-staged --package date
 *   pnpm run npm:configure-staged --apply --limit 1
 *   Browser I/O lives in `./configure-staged-publishing-browser.mts`; the
 *   in-place form write in `./configure-staged-publishing-write.mts`; pure
 *   planning in `./configure-staged-publishing-plan.mts`; the binding target
 *   and the state decision in `./configure-staged-publishing-binding.mts`.
 */

import process from 'node:process'

import { parseArgs } from '@socketsecurity/lib-stable/argv/parse'
import { MILLISECONDS_PER_SECOND } from '@socketsecurity/lib-stable/constants/time'
import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { sleep } from '@socketsecurity/lib-stable/promises/timers'

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
  describePayloadKeyTree,
  findPayloadKeyPaths,
} from './configure-staged-publishing-dump.mts'
import {
  buildPackageAccessUrl,
  countConnectionPermissionTokens,
  decideStagedConfigurationState,
  describeBinding,
  describeUnreadableCause,
  DIRECT_PUBLISH_ACTION,
  DRY_RUN_PLAN_STATE,
  findUnmappedPermissionTokens,
  formatStagedPlanLine,
  formatUnreadableSettings,
  planStagedConfiguration,
  readTrustedPublisherState,
  STAGE_PUBLISH_ACTION,
  TARGET_BINDING,
} from './configure-staged-publishing-plan.mts'

import type { StagedTrustReport } from './check-trusted-packages-staged.mts'
import type { StagedConfigurationTarget } from './configure-staged-publishing-plan.mts'

const logger = getDefaultLogger()

// How long the window stays open after a failure so the operator can read the
// page that produced it. Closing the instant the loop ends left nothing to look
// at: the window blinked shut on the same tick the failure printed.
const FAILURE_HOLD_MS = 30 * MILLISECONDS_PER_SECOND

const { values: args } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    'dump-payload': { type: 'string', multiple: true },
    help: { type: 'boolean', default: false },
    limit: { type: 'string' },
    package: { type: 'string', multiple: true },
    'profile-dir': { type: 'string' },
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

// The key names a trusted-publisher block has ever gone by, in any nesting.
// Used only to point at where the block MOVED to, never to read a value.
const PUBLISHER_KEY_PATTERN =
  /oidc|trusted|publisher|connection|permission|action|workflow|repositor|environment|stage/i

/**
 * Print each package's access payload as a KEY TREE — key names, array lengths,
 * value types — and nothing else, then the reader's verdict for it. This is the
 * lane for re-deriving npm's payload contract when a read stops making sense:
 * it goes through the same session and the same wait machinery the write lane
 * uses, and writes nothing at all.
 *
 * No string value is ever printed. The payload carries the page CSRF token, the
 * signed-in account's email, and every maintainer's name, so a raw dump of it
 * would leak credentials into a terminal and into a transcript. Permission
 * tokens are reported by COUNT for the same reason — an unmapped token shows up
 * as a number, which is enough to know the action map needs an entry.
 *
 * ONE session covers every package: a per-package window would ask the operator
 * to clear the two-factor step-up again for each name.
 *
 * @throws {Error} When the operator wait outlasts its budget, when the session
 *   is signed out, or when a settled access page's payload is not JSON.
 */
export async function dumpAccessPayload(
  packageNames: readonly string[],
  options?: { profileDir?: string | undefined } | undefined,
): Promise<void> {
  const opts = { __proto__: null, ...options } as NonNullable<typeof options>
  const session = await openNpmSettingsSession({
    profileDir: opts.profileDir || undefined,
  })
  try {
    logger.success(
      `Signed in to npm as ${session.user}. Reading ${packageNames.length} package(s), read-only. Finish any sign-in, two-factor code, or challenge in the Chrome window when asked.`,
    )
    for (let i = 0, { length } = packageNames; i < length; i += 1) {
      const target: StagedConfigurationTarget = {
        latestVersion: undefined,
        name: packageNames[i]!,
        // The dump lane never writes, so it needs no registry evidence; zero is
        // the honest value for a read it did not perform.
        publishedVersionCount: 0,
        settingsUrl: buildPackageAccessUrl(packageNames[i]!),
      }
      // eslint-disable-next-line no-await-in-loop -- one browser page, one package at a time.
      const payload = await readSettingsPayload(session.page, target)
      logger.log('')
      logger.log(`Key tree for ${target.name} (no string values are printed):`)
      const tree = describePayloadKeyTree(payload)
      for (let j = 0, treeLength = tree.length; j < treeLength; j += 1) {
        logger.log(tree[j]!)
      }
      logger.log('')
      logger.log('Publisher-shaped key paths:')
      const paths = findPayloadKeyPaths(payload, PUBLISHER_KEY_PATTERN)
      if (!paths.length) {
        logger.log('  (none — the payload carries no publisher-shaped key)')
      }
      for (let j = 0, pathsLength = paths.length; j < pathsLength; j += 1) {
        logger.log(`  ${paths[j]!}`)
      }
      logger.log('')
      const reading = readTrustedPublisherState(payload)
      const state = decideStagedConfigurationState(reading)
      logger.log(
        formatStagedPlanLine({
          actions: reading.actions,
          binding: reading.binding,
          state,
          target,
        }),
      )
      logger.log(`  block:   ${reading.blockState}`)
      const tokens = countConnectionPermissionTokens(payload)
      if (tokens !== undefined) {
        // Tokens are reported by COUNT and LENGTH, never by value, for the same
        // reason the key tree redacts strings. A length is enough to identify
        // which grant is missing from the action table without printing the
        // payload into a terminal or a transcript.
        const unmapped = findUnmappedPermissionTokens(payload) ?? []
        const lengths = unmapped.map(token => `len=${token.length}`).join(', ')
        logger.log(
          `  tokens:  ${tokens} permission token(s) on the live connection, ` +
            `${tokens - unmapped.length} recognized` +
            `${unmapped.length ? ` — ${unmapped.length} unmapped (${lengths}); add each to the action table before writing` : ''}`,
        )
      }
      if (reading.blockState === 'unreadable') {
        logger.warn(describeUnreadableCause(payload))
      }
    }
  } finally {
    await session.close()
  }
}

function printHelp(): void {
  logger.log('')
  logger.log(
    'Usage: node scripts/npm/configure-staged-publishing.mts [options]',
  )
  logger.log('')
  logger.log(
    `Binds each package to ${describeBinding(TARGET_BINDING)}, allowing "${STAGE_PUBLISH_ACTION}"` +
      ` and clearing "${DIRECT_PUBLISH_ACTION}".`,
  )
  logger.log(
    'Per-package states: create (no trusted publisher), rebind (bound elsewhere),',
  )
  logger.log(
    '  configure (bound right, staged action missing), narrow (bound right and',
  )
  logger.log(
    `  staged, but "${DIRECT_PUBLISH_ACTION}" still allowed), skip (already correct).`,
  )
  logger.log('')
  logger.log('Options:')
  logger.log('  --apply          Write the change. Omitted, this is a dry run.')
  logger.log(
    '  --package <s>    Narrow to packages whose name contains <s>. Repeatable.',
  )
  logger.log('  --limit <n>      Configure at most n packages this run.')
  logger.log(
    '  --dump-payload <pkg>  Print that package access payload key tree, its',
  )
  logger.log(
    '                   read-only classification, and exit. Repeatable; one',
  )
  logger.log(
    '                   browser session covers every package. Key names, array',
  )
  logger.log(
    '                   lengths, and value types only — no string value is ever',
  )
  logger.log('                   printed. Writes nothing.')
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

  const dumpPayload = (args['dump-payload'] as string[] | undefined) ?? []
  if (dumpPayload.length) {
    await dumpAccessPayload(dumpPayload, {
      profileDir: (args['profile-dir'] as string | undefined) || undefined,
    })
    return
  }

  const apply = args['apply'] === true

  logger.log(
    'Reading the staged-publishing state of every package in the manifest and the packages/npm tree…',
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
    logger.log(
      formatStagedPlanLine({ state: DRY_RUN_PLAN_STATE, target: slice[i]! }),
    )
  }
  logger.log('')

  if (!apply) {
    logger.log(
      `Dry run: would bind ${slice.length} package(s) to ${describeBinding(TARGET_BINDING)}, ` +
        `allow "${STAGE_PUBLISH_ACTION}" and clear "${DIRECT_PUBLISH_ACTION}". ` +
        `No page was read, so every package above reads as "${DRY_RUN_PLAN_STATE}"; ` +
        '--apply reads each one first and narrows to rebind, configure, narrow, or skip.',
    )
    return
  }

  // ONE window and ONE page for the whole run: every package navigates the same
  // page and nothing closes until the run ends. A per-package browser would ask
  // the operator to clear a challenge again for each name.
  const session = await openNpmSettingsSession({
    profileDir: (args['profile-dir'] as string | undefined) || undefined,
  })
  logger.success(
    `Signed in to npm as ${session.user}. Each package waits for its access page to render before anything is read, so finish any sign-in or one-time password in the Chrome window when asked.`,
  )

  const configured: string[] = []
  const skipped: string[] = []
  const failed: string[] = []
  const failedUrls: string[] = []
  try {
    for (let i = 0, { length } = slice; i < length; i += 1) {
      const target = slice[i]!
      try {
        // Read the current binding BEFORE writing, so a package that is already
        // correct is skipped rather than re-submitted. The read waits out any
        // sign-in, one-time password, or challenge first.
        // eslint-disable-next-line no-await-in-loop -- one browser page, one package at a time.
        const payload = await readSettingsPayload(session.page, target)
        const reading = readTrustedPublisherState(payload)
        const state = decideStagedConfigurationState(reading)
        logger.log(
          formatStagedPlanLine({
            actions: reading.actions,
            binding: reading.binding,
            state,
            target,
          }),
        )
        if (state === 'skip') {
          logger.log(
            `${target.name}: already bound to the target, permits a staged publish, and no longer permits a direct one; skipping.`,
          )
          skipped.push(target.name)
          continue
        }
        if (state === 'unreadable') {
          throw new Error(
            formatUnreadableSettings(target, describeUnreadableCause(payload)),
          )
        }
        // The page is already sitting on this package's settled access page, so
        // the write drives the form where it stands. No navigation: a reload
        // here closes the form it is about to fill.
        // eslint-disable-next-line no-await-in-loop -- one browser page, one package at a time.
        await applyStagedPublishing(session.page, target, { state })
        logger.success(
          `${target.name}: ${state} done — bound to ${describeBinding(TARGET_BINDING)} with "${STAGE_PUBLISH_ACTION}" allowed and "${DIRECT_PUBLISH_ACTION}" cleared.`,
        )
        configured.push(target.name)
      } catch (e) {
        logger.error(errorMessage(e))
        failed.push(target.name)
        failedUrls.push(target.settingsUrl)
      }
    }
  } finally {
    // Hold the window on a failure instead of tearing it down on the same tick
    // the error printed, so the operator can read the page that failed.
    if (failedUrls.length) {
      logger.warn(
        `Holding the Chrome window open for ${FAILURE_HOLD_MS / MILLISECONDS_PER_SECOND}s so you can read the page(s) that failed:`,
      )
      for (let i = 0, { length } = failedUrls; i < length; i += 1) {
        logger.log(`  ${failedUrls[i]}`)
      }
      await sleep(FAILURE_HOLD_MS)
    }
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
