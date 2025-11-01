/**
 * @fileoverview Security and quality audit command for Claude CLI.
 * Performs comprehensive project audit.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { rootPath } from '../config.mjs'
import { log, printHeader, runClaude, runCommandWithOutput } from '../utils.mjs'

/**
 * Comprehensive security and quality audit.
 */
async function runAudit(claudeCmd, options = {}) {
  const opts = { __proto__: null, ...options }
  printHeader('Security & Quality Audit')

  log.step('Gathering project information')

  // Run various checks.
  const [npmAudit, depCheck, licenseCheck] = await Promise.all([
    runCommandWithOutput('npm', ['audit', '--json']),
    runCommandWithOutput('pnpm', ['licenses', 'list', '--json']),
    fs.readFile(path.join(rootPath, 'package.json'), 'utf8'),
  ])

  const packageJson = JSON.parse(licenseCheck)

  const prompt = `Perform a comprehensive audit of the project:

Package: ${packageJson.name}@${packageJson.version}

NPM Audit Results:
${npmAudit.stdout}

License Information:
${depCheck.stdout}

Analyze:
1. Security vulnerabilities (with severity and fixes)
2. License compliance issues
3. Dependency risks
4. Code quality metrics
5. Best practice violations
6. Outdated dependencies with breaking changes
7. Supply chain risks

Provide actionable recommendations with priorities.`

  await runClaude(claudeCmd, prompt, opts)

  return true
}

export { runAudit }
