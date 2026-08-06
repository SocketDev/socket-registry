/**
 * @file The npm publish ORCHESTRATION for the publish workflow: staged
 *   publishing with exponential-backoff retry, a concurrency-bounded fan-out
 *   over a package list, and a batched `pnpm stage approve` loop that refreshes
 *   the 2FA OTP as it walks hundreds of staged packages. Split out of
 *   publish-npm-packages.mts so that orchestrator stays under the file-size
 *   soft cap.
 *   The upload itself is NOT here. Every package's bytes go up through the one
 *   fleet-owned invocation, `uploadNpmPackage` in
 *   `scripts/fleet/publish-infra/npm/publish-command.mts`, which owns the argv,
 *   the provenance decision, and the trusted-publishing auth posture. What this
 *   file owns is the part that is genuinely per-repo: publish order, retry
 *   policy, and how an approve batch refreshes its OTP.
 *   Same staged shape as the fleet-canonical `scripts/fleet/publish.mts`: CI
 *   uploads via OIDC (`--staged`), a human promotes via 2FA (`--approve`). This
 *   monorepo publishes hundreds of packages per wave, so the approve step
 *   batches `pnpm stage approve` calls under one OTP and re-prompts before the
 *   ~30s TOTP window can expire mid-batch. The canonical script instead offers
 *   a one-shot multi-select, which is built for a single package.
 *   Failure recording, formatting, and the exit code live one file over, in
 *   publish-npm-packages-failures.mts.
 */

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { joinAnd } from '@socketsecurity/lib-stable/arrays/join'
import { isPlainObject as isObjectObject } from '@socketsecurity/lib-stable/objects/predicates'
import { pEach } from '@socketsecurity/lib-stable/promises/iterate'
import { pluralize } from '@socketsecurity/lib-stable/words/pluralize'
import { password } from '@socketsecurity/lib/stdio/prompts'

import { LATEST } from '../constants/packages.mts'
import { ROOT_PATH } from '../constants/paths.mts'
import {
  formatPublishFailure,
  recordPublishFailure,
} from './publish-npm-packages-failures.mts'
import type { PublishState } from './publish-npm-packages-failures.mts'
import { extractNpmError } from '../util/errors.mts'
import { uploadNpmPackage } from '../../fleet/publish-infra/npm/publish-command.mts'
import { listStagedPackages } from '../../fleet/publish-infra/npm/shared.mts'
import type { StageListEntry } from '../../fleet/publish-infra/npm/shared.mts'
import { isAlreadyPublished, runInherit } from '../../fleet/publish-shared.mts'

const logger = getDefaultLogger()

// npm TOTP codes are valid ~30s; refresh well inside that window so a slow
// approve call never straddles two codes. Also cap the number of approvals
// per code — a fast run through many small packages can burn 25 approvals
// in under a second, but staying on one code across an entire multi-hundred
// -package batch invites a code going stale mid-batch on a slow network.
const OTP_BATCH_SIZE = 25
const OTP_BATCH_WINDOW_MS = 25_000

/**
 * A package entry as produced by the publish orchestrator: printable name,
 * dist-tag, and the on-disk path `pnpm stage publish` is run from.
 */
interface PublishPackageEntry {
  name?: string | undefined
  path: string
  printName: string
  tag?: string | undefined
}

interface StagePublishOptions {
  dryRun?: boolean | undefined
  maxRetries?: number | undefined
  retryDelay?: number | undefined
}

interface ApproveOptions {
  cwd?: string | undefined
  dryRun?: boolean | undefined
  otp?: string | undefined
}

/**
 * Publish package using pnpm's staged-publish flow (upload only; a separate
 * `approveStagedPackages` promote step makes it public).
 *
 * @throws {TypeError} When state parameter is not an object.
 */
export async function publish(
  pkg: PublishPackageEntry,
  state: PublishState,
  options: StagePublishOptions,
) {
  await stagePublish(pkg, state, options)
}

/**
 * Publish multiple packages with concurrency control.
 *
 * @throws {TypeError} When state parameter is not an object.
 */
export async function publishPackages(
  packages: PublishPackageEntry[],
  state: PublishState,
  options: StagePublishOptions,
) {
  const okayPackages = packages.filter(
    pkg => !state.fails.includes(pkg.printName),
  )
  // Chunk non-failed package names to process them in parallel 3 at a time.
  await pEach(
    okayPackages,
    async pkg => {
      await publish(pkg, state, options)
    },
    { concurrency: 3 },
  )
}

/**
 * Stage a package's tarball via `pnpm stage publish`. Nothing is publicly
 * visible until `approveStagedPackages` promotes it with a human 2FA OTP.
 *
 * @throws {TypeError} When state parameter is not an object.
 */
export async function stagePublish(
  pkg: PublishPackageEntry,
  state: PublishState,
  options: StagePublishOptions,
) {
  const merged: StagePublishOptions = Object.assign(
    Object.create(null),
    options,
  )
  const { dryRun = false, maxRetries = 3, retryDelay = 1000 } = merged
  if (!isObjectObject(state)) {
    throw new TypeError('A state object is required')
  }

  // `||`, not `??`: an EMPTY tag is the failure mode this guards. npm rejects
  // `--tag ''` with `Tag must be a non-empty string`, and the tag arrived empty
  // for every package until the resolver in -needs.mts replaced a
  // `getReleaseTag(version)` call that always returned ''.
  const tag = pkg.tag || LATEST

  if (dryRun) {
    logger.log(`[dry-run] would stage publish ${pkg.printName} (tag=${tag})`)
    return
  }

  // Retry flow:
  // 1. Upload through `uploadNpmPackage`, the one fleet-owned npm upload. It
  //    builds the `pnpm stage publish` argv, decides provenance, and asserts
  //    the trusted-publishing auth posture on both sides of the spawn.
  // 2. On success, exit immediately.
  // 3. On a posture refusal, stop without retrying: either nothing was
  //    uploaded because a long-lived token would have masked OIDC, or the
  //    upload reported a failed OIDC exchange and exited 0 anyway. Retrying
  //    repeats the same wrong identity.
  // 4. If the version is already public (cannot publish over), exit.
  // 5. On other failures, retry with exponential backoff: 1s, 2s, 4s delays.
  // 6. After maxRetries exhausted, add to fails list and log final error.
  let lastOutput = ''
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    if (attempt > 0) {
      const delay = retryDelay * 2 ** (attempt - 1)
      logger.log(
        `${pkg.printName}: Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`,
      )
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    const result = await uploadNpmPackage({
      cwd: pkg.path,
      mode: 'staged',
      tag,
    })
    if (!result.postureOk) {
      recordPublishFailure(state, {
        message: formatPublishFailure({
          detail: `the npm auth posture refused the upload${result.ran ? ' after it ran' : ' before it ran'}; wanted a clean trusted-publishing exchange. ${extractNpmError(result.output) || 'No registry output was captured.'}`,
          printName: pkg.printName,
          reason: 'posture',
        }),
        printName: pkg.printName,
        reason: 'posture',
      })
      logger.fail(
        `${pkg.printName}: npm auth posture refused the upload; not retrying.`,
      )
      return
    }
    if (result.code === 0) {
      // Success - exit retry loop.
      return
    }
    lastOutput = result.output
    // Don't retry if package already exists.
    if (lastOutput.includes('cannot publish over')) {
      return
    }
    // Log the error but continue retrying.
    if (lastOutput && attempt < maxRetries - 1) {
      logger.warn(`${pkg.printName}: Publish attempt ${attempt + 1} failed`)
    }
  }

  // All retries exhausted.
  recordPublishFailure(state, {
    message: formatPublishFailure({
      detail: `${maxRetries} upload ${pluralize('attempt', { count: maxRetries })} failed under tag "${tag}"; wanted one exit-0 upload. ${extractNpmError(lastOutput) || 'No registry output was captured.'}`,
      printName: pkg.printName,
      reason: 'upload',
    }),
    printName: pkg.printName,
    reason: 'upload',
  })
  if (lastOutput) {
    logger.log('')
    logger.log(extractNpmError(lastOutput))
    logger.log('')
  }
}

/**
 * Resolve the OTP to use for the next batch of approve calls: the `--otp`
 * flag when one was supplied (reused for every refresh — CI/scripted use),
 * otherwise an interactive hidden-character prompt. Leaving the prompt blank
 * falls through to pnpm's per-call web-OTP flow.
 */
async function promptOtp(
  otpFromFlag: string | undefined,
): Promise<string | undefined> {
  if (otpFromFlag) {
    return otpFromFlag
  }
  const entered = (await password({
    message: '2FA OTP (TOTP code for batch; leave blank for browser web-OTP):',
    mask: '*',
  })) as string | undefined
  return entered || undefined
}

/**
 * `pnpm stage approve` in batches, at monorepo scale (hundreds of staged
 * packages per wave). A single npm TOTP code is valid ~30s, so one code
 * can't cover an entire wave: every `OTP_BATCH_SIZE` approvals or
 * `OTP_BATCH_WINDOW_MS` elapsed — whichever comes first — the loop
 * re-prompts for a fresh code before continuing.
 *
 * Fails loud per package: an approve failure is recorded in `state.fails`
 * and the loop keeps going so one bad package doesn't stall the rest of the
 * wave; the caller reports the collected failures and exits non-zero.
 *
 * @throws {TypeError} When state parameter is not an object.
 */
export async function approveStagedPackages(
  state: PublishState,
  options: ApproveOptions,
) {
  const merged: ApproveOptions = Object.assign(Object.create(null), options)
  const { cwd = ROOT_PATH, dryRun = false, otp: otpFromFlag } = merged
  if (!isObjectObject(state)) {
    throw new TypeError('A state object is required')
  }

  const staged = await listStagedPackages()
  if (!staged.length) {
    logger.log('No packages currently staged for approval.')
    return
  }

  // Filter out already-published versions. If a stage upload was approved
  // earlier but the entry lingers in stage list (registry quirk), don't
  // re-approve it.
  const eligible: StageListEntry[] = []
  for (const entry of staged) {
    // eslint-disable-next-line no-await-in-loop
    if (
      entry.name &&
      entry.version &&
      !(await isAlreadyPublished(entry.name, entry.version))
    ) {
      eligible.push(entry)
    }
  }
  if (!eligible.length) {
    logger.log('All staged entries are already published; nothing to approve.')
    return
  }

  logger.log('')
  logger.log(
    `Approving ${eligible.length} staged ${pluralize('package', { count: eligible.length })}...`,
  )

  if (dryRun) {
    for (let i = 0, { length } = eligible; i < length; i += 1) {
      const entry = eligible[i]!
      logger.log(
        `[dry-run] would approve ${entry.name}@${entry.version} (id: ${entry.stageId})`,
      )
    }
    logger.log(
      'Dry-run complete. Re-run without --dry-run to prompt for OTP and promote.',
    )
    return
  }

  let otp = await promptOtp(otpFromFlag)
  let batchCount = 0
  let batchStartedAt = Date.now()
  let approved = 0
  const approveFails: string[] = []

  for (let i = 0, { length } = eligible; i < length; i += 1) {
    const entry = eligible[i]!
    const elapsedMs = Date.now() - batchStartedAt
    if (batchCount >= OTP_BATCH_SIZE || elapsedMs >= OTP_BATCH_WINDOW_MS) {
      logger.log(
        `Refreshing OTP after ${batchCount} ${pluralize('approval', { count: batchCount })} / ${Math.round(elapsedMs / 1000)}s — npm TOTP codes expire ~30s.`,
      )
      // eslint-disable-next-line no-await-in-loop
      otp = await promptOtp(otpFromFlag)
      batchCount = 0
      batchStartedAt = Date.now()
    }

    const args = ['stage', 'approve', entry.stageId!]
    if (otp) {
      args.push('--otp', otp)
    }
    // eslint-disable-next-line no-await-in-loop
    const code = await runInherit('pnpm', args, cwd)
    batchCount += 1
    if (code === 0) {
      approved += 1
    } else {
      const printName = `${entry.name}@${entry.version}`
      approveFails.push(printName)
      recordPublishFailure(state, {
        message: formatPublishFailure({
          detail: `\`pnpm stage approve ${entry.stageId}\` exited ${code}; wanted 0. A wrong or expired 2FA code and a package whose staged entry was already promoted both land here.`,
          name: entry.name,
          printName,
          reason: 'approve',
        }),
        printName,
        reason: 'approve',
      })
      logger.warn(`${printName}: Approve attempt failed (exit ${code})`)
    }
  }

  if (approveFails.length) {
    const msg = `Unable to approve ${approveFails.length} staged ${pluralize('package', { count: approveFails.length })}:`
    logger.warn(`${msg} ${joinAnd(approveFails)}`)
  }
  logger.log(
    `Approved ${approved} ${pluralize('package', { count: approved })}`,
  )
}
