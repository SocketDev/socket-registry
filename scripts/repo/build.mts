/**
 * @file Build script for socket-registry monorepo. Delegates to the registry
 *   package build with proper flag handling.
 */

import process from 'node:process'

import colors from 'yoctocolors-cjs'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import { isMainModule } from '../fleet/process/is-main-module.mts'
import { runMain } from '../fleet/process/run-main.mts'
import { runCommand } from '../fleet/util/run-command.mts'
import { ROOT_PATH } from './constants/paths.mts'

const logger = getDefaultLogger()

// Parse all flags from command line to pass through.
const args = process.argv.slice(2)
const quiet = args.some(arg => ['--quiet', '--silent', '-q'].includes(arg))

export async function runRegistryBuild(buildFlags: string[]): Promise<number> {
  const buildArgs = ['--filter', '@socketsecurity/registry', 'run', 'build']
  if (buildFlags.length > 0) {
    buildArgs.push('--', ...buildFlags)
  }
  return await runCommand('pnpm', buildArgs, {
    cwd: ROOT_PATH,
    env: {
      ...process.env,
      // Fleet setup owns the verified manager; builds must not refresh its lock entry.
      pnpm_config_pm_on_fail: 'ignore',
    },
  })
}

async function main(): Promise<void> {
  const exitCode = await runRegistryBuild(args)

  if (exitCode !== 0) {
    if (!quiet) {
      logger.error(
        colors.red('✗ Failed to build @socketsecurity/registry-stable'),
      )
    }
    process.exitCode = exitCode
    return
  }

  process.exitCode = 0
}

if (isMainModule(import.meta.url)) {
  runMain(
    async () => {
      await main().catch((e: unknown) => {
        logger.error(colors.red('✗ Build failed:'), e)
        process.exitCode = 1
      })
    },
    {
      describe: 'builds the registry package',
      help: 'Usage: pnpm build [--src] [--types] [--watch] [--needed] [--quiet]',
    },
  )
}
