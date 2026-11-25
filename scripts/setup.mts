import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { isMainModule, runMain } from './lib/cli.mts'
import { REPO_ROOT } from './lib/paths.mts'
import { runCommand } from './lib/run-command.mts'

export async function main(): Promise<number> {
  if (process.env.CI || !existsSync(path.join(REPO_ROOT, '.git'))) {
    return 0
  }
  return runCommand('git', ['config', 'core.hooksPath', '.git-hooks'], {
    cwd: REPO_ROOT,
  })
}

if (isMainModule(import.meta.url)) {
  runMain(main, {
    describe: 'Configure the repository Git hooks.',
    help: 'Usage: pnpm run setup',
  })
}
