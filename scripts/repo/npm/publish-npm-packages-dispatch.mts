/**
 * @file The LOCAL lane of the family publish: dispatch the
 *   `npm-publish-packages.yml` workflow and watch the run it starts.
 *   Nothing here uploads. The fleet allows exactly one npm upload invocation,
 *   `scripts/fleet/publish-infra/npm/publish-command.mts`, and it must run
 *   where the trusted-publishing identity lives — a GitHub Actions job with
 *   `id-token: write`. An operator machine has no OIDC token, so a local
 *   upload either fails or silently falls back to a long-lived token; the
 *   local path that used to do exactly that is gone, and this is what replaced
 *   it.
 */

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'

import { ROOT_PATH } from '../constants/paths.mts'
import { runInherit } from '../../fleet/publish-shared.mts'

const logger = getDefaultLogger()

/**
 * The workflow file the local lane dispatches. Kept as a bare filename because
 * that is what `gh workflow run` accepts.
 */
export const PUBLISH_WORKFLOW_FILE = 'npm-publish-packages.yml'

export interface DispatchConfig {
  distTag?: string | undefined
  /**
   * False dispatches the workflow's dry-run preview (its own default).
   */
  publish?: boolean | undefined
  only?: string | undefined
  ref?: string | undefined
}

/**
 * The `gh` argv for one dispatch. Pure, so a test pins the input mapping
 * without a network call or a `gh` binary.
 *
 * Every input is passed explicitly rather than left to the workflow's default:
 * a dispatch that omits `publish` reads as "whatever the YAML says today",
 * which is exactly the ambiguity a publish command must not carry.
 */
export function buildWorkflowDispatchArgs(config: DispatchConfig): string[] {
  const {
    distTag = 'latest',
    only = '',
    publish = false,
    ref,
  } = { __proto__: null, ...config } as DispatchConfig
  const args = ['workflow', 'run', PUBLISH_WORKFLOW_FILE]
  if (ref) {
    args.push('--ref', ref)
  }
  args.push('--field', `publish=${publish ? 'true' : 'false'}`)
  args.push('--field', `dist-tag=${distTag}`)
  args.push('--field', `only=${only}`)
  return args
}

/**
 * The `gh` argv that watches the run this dispatch started. `gh run watch`
 * without a run id attaches to the most recent run, which is the one just
 * created; `--exit-status` makes a failed run a non-zero exit here so the
 * operator's shell reports the publish result rather than the dispatch result.
 */
export function buildWorkflowWatchArgs(): string[] {
  return ['run', 'watch', '--exit-status', '--compact']
}

/**
 * Dispatch the publish workflow and watch the resulting run.
 *
 * Returns the exit code to surface: 0 when the run finished green.
 */
export async function dispatchPublishWorkflow(
  config: DispatchConfig,
): Promise<number> {
  const args = buildWorkflowDispatchArgs(config)
  logger.log(`Dispatching ${PUBLISH_WORKFLOW_FILE}: gh ${args.join(' ')}`)
  const dispatchCode = await runInherit('gh', args, ROOT_PATH)
  if (dispatchCode !== 0) {
    throw new Error(
      `Failed to dispatch ${PUBLISH_WORKFLOW_FILE}.\n` +
        `  Where: \`gh ${args.join(' ')}\`, run from ${ROOT_PATH}.\n` +
        `  Saw vs wanted: gh exited ${dispatchCode}; wanted 0. The usual causes are an unauthenticated gh (\`gh auth status\`) or a workflow file that is not on the branch being dispatched.\n` +
        `  Fix: run \`gh auth status\`, confirm ${PUBLISH_WORKFLOW_FILE} exists on the target branch, then re-run.`,
    )
  }
  // The API takes a beat to register the run; watching immediately can attach
  // to the PREVIOUS run of the same workflow and report its result.
  await new Promise(resolve => setTimeout(resolve, 5000))
  const watchArgs = buildWorkflowWatchArgs()
  logger.log(`Watching the run: gh ${watchArgs.join(' ')}`)
  return await runInherit('gh', watchArgs, ROOT_PATH)
}

/**
 * Whether `gh` is callable. A missing CLI is the one dispatch failure worth
 * naming up front, because the fix is an install rather than a re-run.
 */
export async function hasGitHubCli(): Promise<boolean> {
  try {
    await spawn('gh', ['--version'], { stdioString: true })
    return true
  } catch {
    return false
  }
}
