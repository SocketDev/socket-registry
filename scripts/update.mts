/** Update workspace dependencies and refresh the published registry manifest. */

import path from 'node:path'
import process from 'node:process'

import { isMainModule, runMain } from './lib/cli.mts'
import { REPO_ROOT } from './lib/paths.mts'
import { runCommand } from './lib/run-command.mts'

export async function main(): Promise<number> {
  const code = await runCommand('pnpm', ['update', ...process.argv.slice(2)], {
    cwd: REPO_ROOT,
  })
  if (code !== 0) {
    return code
  }
  // npm releases can change without any local edits to the dependency graph.
  return await runCommand(
    process.execPath,
    [path.join(import.meta.dirname, 'npm', 'update-manifest.mts'), '--force'],
    { cwd: REPO_ROOT },
  )
}

if (isMainModule(import.meta.url)) {
  runMain(main, {
    json: 'result',
    describe: 'updates dependencies and refreshes the registry manifest',
    help: 'Usage: pnpm update [pnpm update options]',
  })
}
