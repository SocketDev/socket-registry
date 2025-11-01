/**
 * @fileoverview Migration command - helps with migrations.
 * Provides step-by-step migration guidance for various scenarios.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { runClaude } from '../command-execution.mjs'
import { log, rootPath } from '../config.mjs'
import { printHeader } from '../utils/formatting.mjs'

/**
 * Help with migrations.
 */
async function runMigration(claudeCmd, options = {}) {
  const opts = { __proto__: null, ...options }
  printHeader('Migration Assistant')

  const { positionals = [] } = opts
  const migrationType = positionals[0]

  if (!migrationType) {
    log.info('Available migration types:')
    log.substep('node <version>    - Node.js version upgrade')
    log.substep('deps              - Dependency updates')
    log.substep('esm               - CommonJS to ESM')
    log.substep('typescript        - JavaScript to TypeScript')
    log.substep('vitest            - Jest/Mocha to Vitest')
    return false
  }

  const packageJson = JSON.parse(
    await fs.readFile(path.join(rootPath, 'package.json'), 'utf8'),
  )

  const prompt = `Help migrate ${packageJson.name} for: ${migrationType}

Current setup:
${JSON.stringify(packageJson, null, 2)}

Provide:
1. Step-by-step migration guide
2. Breaking changes to address
3. Code modifications needed
4. Configuration updates
5. Testing strategy
6. Rollback plan
7. Common issues and solutions

Be specific and actionable.`

  await runClaude(claudeCmd, prompt, opts)

  return true
}

export { runMigration }
