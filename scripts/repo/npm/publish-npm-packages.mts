/*
 * @file Publish the socket-registry FAMILY — the `@socketregistry/*` override
 *   packages plus the registry package itself. Three lanes, picked by where the
 *   run is and what it was asked for:
 *
 *   - `--approve` (local): list what CI staged and promote it under 2FA. Stays
 *     local by design — the OTP is a human's.
 *   - CI: stage every needs-publish package, collect per-package failures, exit 1
 *     if any (publish-npm-packages-stage.mts).
 *   - local, no `--approve`: DISPATCH `npm-publish-packages.yml` and watch the
 *     run (publish-npm-packages-dispatch.mts). Nothing uploads from here. There
 *     is no local upload path and no `--force` that reaches one. The fleet
 *     allows exactly one npm upload invocation,
 *     `scripts/fleet/registry-infra/npm/publish-command.mts`, and it must run
 *     where the trusted-publishing identity lives.
 */

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import { getEnv } from '../constants/env.mts'
import { isMainModule } from '../../fleet/_shared/is-main-module.mts'
import { runMain } from '../../fleet/_shared/run-main.mts'
import type { ScriptMeta } from '../../fleet/_shared/run-main.mts'
import {
  approveFlag,
  cliArgs,
  distTagFlag,
  dryRunFlag,
  onlyFlag,
  otpFlag,
  refFlag,
} from './publish-npm-packages-args.mts'
import { dispatchPublishWorkflow } from './publish-npm-packages-dispatch.mts'
import type { PublishState } from './publish-npm-packages-failures.mts'
import {
  publishExitCode,
  reportPublishFailures,
} from './publish-npm-packages-failures.mts'
import { approveStagedPackages } from './publish-npm-packages-publish.mts'
import { stageNeedsPublishPackages } from './publish-npm-packages-stage.mts'

const logger = getDefaultLogger()

const ENV = getEnv()

/**
 * The batched approve pass: list what CI staged and promote it under a
 * periodically-refreshed 2FA OTP. Local by design.
 */
async function runApproveLane(): Promise<number> {
  const state: PublishState = { fails: [], failures: [] }
  await approveStagedPackages(state, { dryRun: dryRunFlag, otp: otpFlag })
  reportPublishFailures(state)
  return publishExitCode(state)
}

/**
 * The local lane: dispatch the publish workflow and watch the run.
 */
async function runDispatchLane(): Promise<number> {
  if (dryRunFlag) {
    logger.log(
      'Local lane: a real run dispatches npm-publish-packages.yml and watches it. Nothing uploads from here.',
    )
    logger.log(
      `[dry-run] would dispatch publish=${cliArgs.publish ? 'true' : 'false'} dist-tag=${distTagFlag} only=${onlyFlag ?? ''}${refFlag ? ` ref=${refFlag}` : ''}`,
    )
    logger.log(
      '[dry-run] Without --publish the workflow itself runs its own dry-run preview.',
    )
    return 0
  }
  return await dispatchPublishWorkflow({
    distTag: distTagFlag,
    only: onlyFlag,
    publish: !!cliArgs.publish,
    ref: refFlag,
  })
}

/**
 * The CI lane: stage every needs-publish package and surface the failures.
 */
async function runStagingLane(): Promise<number> {
  const state = await stageNeedsPublishPackages({
    debug: !!cliArgs.debug,
    distTag: distTagFlag,
    dryRun: dryRunFlag,
    forcePublish: !!(
      cliArgs.forcePublish ||
      cliArgs['force-publish'] ||
      cliArgs['--']?.includes('--force-publish')
    ),
    forceRegistry: !!(
      cliArgs.forceRegistry ||
      cliArgs['force-registry'] ||
      cliArgs['--']?.includes('--force-registry')
    ),
    only: onlyFlag,
    skipNpmPackages: !!(
      cliArgs.skipNpmPackages ||
      cliArgs['skip-npm-packages'] ||
      cliArgs['--']?.includes('--skip-npm-packages')
    ),
  })
  reportPublishFailures(state)
  if (!state.fails.length) {
    logger.log('')
    logger.success('All versions staged successfully')
    logger.log(
      'Nothing is public yet. Promote locally: pnpm run package-npm-publish --approve',
    )
  }
  return publishExitCode(state)
}

/**
 * Route to the approve, staging, or dispatch lane.
 */
export async function main(): Promise<number> {
  if (approveFlag) {
    return await runApproveLane()
  }
  if (ENV.CI) {
    return await runStagingLane()
  }
  return await runDispatchLane()
}

const SCRIPT_META: ScriptMeta = {
  describe:
    'publishes the socket-registry package family — CI stages, local dispatches the workflow or promotes what is staged',
  help: `Usage: node scripts/repo/npm/publish-npm-packages.mts [options]

  Outside CI this DISPATCHES .github/workflows/npm-publish-packages.yml and
  watches the run; it never uploads. Inside CI it stages every needs-publish
  package through the one fleet-owned npm upload.

  --approve            promote what CI staged, under 2FA (local only)
  --dist-tag <tag>     dist-tag for release versions (default: latest)
  --dry-run            preview the plan; stage nothing, dispatch nothing
  --only <names>       comma-separated package filter (npm name or dir name)
  --otp <code>         2FA code reused across the --approve batch
  --publish            dispatch the workflow for real, not its dry run
  --ref <ref>          branch/tag the dispatch runs against
  --debug              list every version-bump commit, not just the first 10
  --force-publish      CI: stage at HEAD, skipping version-bump commit detection
  --force-registry     CI: stage the registry package regardless of its version
  --skip-npm-packages  CI: stage the registry package only`,
}

/* c8 ignore start - entrypoint guard; exercised via subprocess */
if (isMainModule(import.meta.url)) {
  runMain(main, SCRIPT_META)
}
/* c8 ignore stop */
