import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { NPM_PACKAGES_PATH, REGISTRY_PKG_PATH } from '../constants/paths.mts'
import { runCapture } from '../lib/run-command.mts'

const registry = 'https://registry.npmjs.org/'
const workflows = ['publish-npm.yml', 'publish-npm-packages.yml'] as const
const tokenVars = ['NODE_AUTH_TOKEN', 'NPM_AUTH_TOKEN', 'NPM_TOKEN']

export interface NpmUploadResult {
  code: number
  output: string
  postureOk: boolean
  ran: boolean
}

export function getPublishWorkflow(
  env: NodeJS.ProcessEnv,
): (typeof workflows)[number] | undefined {
  if (
    env['GITHUB_ACTIONS'] !== 'true' ||
    env['GITHUB_EVENT_NAME'] !== 'workflow_dispatch' ||
    !env['GITHUB_REPOSITORY'] ||
    !env['GITHUB_RUN_ID']
  ) {
    return undefined
  }
  return workflows.find(name =>
    env['GITHUB_WORKFLOW_REF']?.startsWith(
      `${env['GITHUB_REPOSITORY']}/.github/workflows/${name}@`,
    ),
  )
}

export function publishAuthProblem(env: NodeJS.ProcessEnv): string | undefined {
  if (!getPublishWorkflow(env)) {
    return 'Staging requires a registry npm publish workflow in GitHub Actions.'
  }
  if (env['GITHUB_RUN_ATTEMPT'] !== '1') {
    return 'Inspect the original npm stage before dispatching another upload.'
  }
  const tokens = tokenVars.filter(name => env[name])
  if (tokens.length) {
    return `Trusted publishing forbids long-lived npm credentials (${tokens.join(', ')}).`
  }
  if (
    !env['ACTIONS_ID_TOKEN_REQUEST_URL'] ||
    !env['ACTIONS_ID_TOKEN_REQUEST_TOKEN']
  ) {
    return 'The stage upload requires a GitHub Actions OIDC token.'
  }
  return undefined
}

export function stagePublishArgs(
  tarball: string,
  tag: string,
  provenance: boolean,
): string[] {
  const args = [
    'stage',
    'publish',
    tarball,
    '--access',
    'public',
    '--tag',
    tag,
    '--registry',
    registry,
    '--no-git-checks',
    '--ignore-scripts',
  ]
  // An explicit false overrides publishConfig.provenance on private forks.
  args.push(provenance ? '--provenance' : '--no-provenance')
  return args
}

async function isPublicGitHubRepository(): Promise<boolean> {
  const eventPath = process.env['GITHUB_EVENT_PATH']
  if (!eventPath) {
    return false
  }
  const event: unknown = JSON.parse(await readFile(eventPath, 'utf8'))
  if (typeof event !== 'object' || event === null || !('repository' in event)) {
    return false
  }
  const { repository } = event
  return (
    typeof repository === 'object' &&
    repository !== null &&
    'private' in repository &&
    repository.private === false
  )
}

export async function uploadNpmPackage(config: {
  cwd: string
  tag: string
}): Promise<NpmUploadResult> {
  const { cwd, tag } = config
  const problem = publishAuthProblem(process.env)
  if (problem) {
    return { code: 0, output: problem, postureOk: false, ran: false }
  }
  const workflow = getPublishWorkflow(process.env)
  const absoluteCwd = path.resolve(cwd)
  const isOwnedPackage =
    workflow === 'publish-npm.yml'
      ? absoluteCwd === path.resolve(REGISTRY_PKG_PATH)
      : path.dirname(absoluteCwd) === path.resolve(NPM_PACKAGES_PATH)
  if (!isOwnedPackage) {
    return {
      code: 0,
      output: 'The npm publish workflow is not bound to this package.',
      postureOk: false,
      ran: false,
    }
  }

  const directory = await mkdtemp(path.join(os.tmpdir(), 'registry-npm-stage-'))
  try {
    const provenance = await isPublicGitHubRepository()
    // Use an empty user config so npm cannot use a cached local credential
    // if the OIDC exchange fails.
    const npmUserConfig = path.join(directory, 'npmrc')
    await writeFile(npmUserConfig, '', { mode: 0o600 })
    const packed = await runCapture(
      'pnpm',
      ['pack', '--config.ignore-scripts=true', '--pack-destination', directory],
      cwd,
      { captureStderr: true },
    )
    if (packed.code !== 0) {
      return {
        code: packed.code,
        output: packed.stdout + packed.stderr,
        postureOk: true,
        ran: false,
      }
    }
    const tarballs = (await readdir(directory)).filter(file =>
      file.endsWith('.tgz'),
    )
    if (tarballs.length !== 1) {
      return {
        code: 1,
        output: 'Expected exactly one packed npm tarball.',
        postureOk: true,
        ran: false,
      }
    }
    const staged = await runCapture(
      'pnpm',
      [
        ...stagePublishArgs(
          path.join(directory, tarballs[0]!),
          tag,
          provenance,
        ),
        '--npmrc-auth-file',
        npmUserConfig,
      ],
      cwd,
      { captureStderr: true },
    )
    const output = staged.stdout + staged.stderr
    process.stdout.write(staged.stdout)
    process.stderr.write(staged.stderr)
    // pnpm can report a skipped exchange and still exit zero.
    const postureOk = !/ERR_PNPM_AUTH_TOKEN_EXCHANGE|Skipped OIDC/u.test(output)
    return { code: staged.code, output, postureOk, ran: true }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
