/**
 * @fileoverview Dependency analysis command for Claude CLI.
 * Analyzes project dependencies and provides recommendations.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { rootPath } from '../config.mjs'
import { log, printHeader, runClaude, runCommandWithOutput } from '../utils.mjs'

/**
 * Analyze and manage dependencies.
 */
async function runDependencyAnalysis(claudeCmd, options = {}) {
  const opts = { __proto__: null, ...options }
  printHeader('Dependency Analysis')

  // Read package.json.
  const packageJson = JSON.parse(
    await fs.readFile(path.join(rootPath, 'package.json'), 'utf8'),
  )

  // Check for outdated packages.
  log.progress('Checking for outdated packages')
  const outdatedResult = await runCommandWithOutput('pnpm', [
    'outdated',
    '--json',
  ])

  let outdatedPackages = {}
  try {
    outdatedPackages = JSON.parse(outdatedResult.stdout || '{}')
  } catch {
    // Ignore parse errors.
  }
  log.done('Dependency check complete')

  const prompt = `Analyze the dependencies for ${packageJson.name}:

Current dependencies:
${JSON.stringify(packageJson.dependencies || {}, null, 2)}

Current devDependencies:
${JSON.stringify(packageJson.devDependencies || {}, null, 2)}

Outdated packages:
${JSON.stringify(outdatedPackages, null, 2)}

IMPORTANT Socket Requirements:
- All dependencies MUST be pinned to exact versions (no ^ or ~ prefixes)
- Use pnpm add <pkg> --save-exact for all new dependencies
- GitHub CLI (gh) is required but installed separately (not via npm)

Provide:
1. Version pinning issues (identify any deps with ^ or ~ prefixes)
2. Security vulnerability analysis
3. Unused dependency detection
4. Update recommendations with migration notes (using exact versions)
5. License compatibility check
6. Bundle size impact analysis
7. Alternative package suggestions

Focus on actionable recommendations. Always recommend exact versions when suggesting updates.`

  await runClaude(claudeCmd, prompt, opts)

  return true
}

export { runDependencyAnalysis }
