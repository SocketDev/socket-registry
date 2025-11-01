/**
 * @fileoverview Authentication handling for Claude and GitHub CLI.
 * Provides functions to check and ensure authentication status.
 */

import crypto from 'node:crypto'

import colors from 'yoctocolors-cjs'

import { log, WIN32 } from './config.mjs'
import { runCommand, runCommandWithOutput } from './command-execution.mjs'

/**
 * Check if Claude Code CLI is available.
 */
async function checkClaude() {
  const checkCommand = WIN32 ? 'where' : 'which'

  log.progress('Checking for Claude Code CLI')

  // Check for 'claude' command (Claude Code)
  const result = await runCommandWithOutput(checkCommand, ['claude'])
  if (result.exitCode === 0) {
    log.done('Found Claude Code CLI (claude)')
    return 'claude'
  }

  // Check for 'ccp' as alternative
  log.progress('Checking for alternative CLI (ccp)')
  const ccpResult = await runCommandWithOutput(checkCommand, ['ccp'])
  if (ccpResult.exitCode === 0) {
    log.done('Found Claude Code CLI (ccp)')
    return 'ccp'
  }

  log.failed('Claude Code CLI not found')
  return false
}

/**
 * Check if a commit SHA is part of a pull request.
 * @param {string} sha - The commit SHA to check
 * @param {string} owner - The repository owner
 * @param {string} repo - The repository name
 * @returns {Promise<{isPR: boolean, prNumber?: number, prTitle?: string}>}
 */
async function checkIfCommitIsPartOfPR(sha, owner, repo) {
  try {
    const result = await runCommandWithOutput('gh', [
      '--json',
      '--limit',
      '--repo',
      '--search',
      '--state',
      '1',
      'all',
      'list',
      'number,title,state',
      'pr',
      sha,
      `${owner}/${repo}`,
    ])

    if (result.exitCode === 0 && result.stdout) {
      const prs = JSON.parse(result.stdout)
      if (prs.length > 0) {
        const pr = prs[0]
        return {
          isPR: true,
          prNumber: pr.number,
          prState: pr.state,
          prTitle: pr.title,
        }
      }
    }
  } catch (e) {
    log.warn(`Failed to check if commit is part of PR: ${e.message}`)
  }

  return { isPR: false }
}

/**
 * Ensure Claude Code is authenticated, prompting for authentication if needed.
 * Returns true if authenticated, false if unable to authenticate.
 */
async function ensureClaudeAuthenticated(claudeCmd) {
  let attempts = 0
  const maxAttempts = 3

  while (attempts < maxAttempts) {
    // Check if Claude is working by checking version
    log.progress('Checking Claude Code status')
    const versionCheck = await runCommandWithOutput(claudeCmd, ['--version'])

    if (versionCheck.exitCode === 0) {
      // Claude Code is installed and working
      // Check if we need to login by testing actual Claude functionality
      log.progress(
        'Testing Claude authentication (this may take up to 15 seconds)',
      )

      const testPrompt =
        'Respond with only the word "AUTHENTICATED" if you receive this message.'
      const startTime = Date.now()

      // Set up progress interval for the 15-second test
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        log.progress(
          `Testing authentication... (${Math.round(elapsed / 1000)}s/15s)`,
        )
        // Update every 3 seconds.
      }, 3000)

      const testResult = await runCommandWithOutput(claudeCmd, ['--print'], {
        env: { ...process.env, CLAUDE_OUTPUT_MODE: 'text' },
        input: testPrompt,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 15_000,
      })

      clearInterval(progressInterval)

      // Check for authentication errors
      const output = (testResult.stdout + testResult.stderr).toLowerCase()
      const authErrors = [
        'api key',
        'authentication',
        'login required',
        'not logged in',
        'please login',
        'unauthorized',
      ]

      const needsAuth = authErrors.some(error => output.includes(error))
      const authenticated = output.includes('authenticated')

      if (!needsAuth && (authenticated || testResult.exitCode === 0)) {
        log.done('Claude Code ready')
        return true
      }

      if (!needsAuth && testResult.stdout.length > 10) {
        // Claude responded with something, likely working
        log.done('Claude Code ready')
        return true
      }
    }

    attempts++

    if (attempts >= maxAttempts) {
      log.error(`Failed to setup Claude Code after ${maxAttempts} attempts`)
      return false
    }

    // Not authenticated, provide instructions for manual authentication
    log.warn('Claude Code login required')
    console.log(colors.yellow('\nClaude Code needs to be authenticated.'))
    console.log('\nTo authenticate:')
    console.log('  1. Open a new terminal')
    console.log(`  2. Run: ${colors.green('claude')}`)
    console.log('  3. Follow the browser authentication prompts')
    console.log(
      '  4. Once authenticated, return here and press Enter to continue',
    )

    // Wait for user to press Enter
    await new Promise(resolve => {
      process.stdin.once('data', () => {
        resolve()
      })
    })

    // Give it a moment for the auth to register
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return false
}

/**
 * Ensure GitHub CLI is authenticated, prompting for login if needed.
 * Returns true if authenticated, false if unable to authenticate.
 */
async function ensureGitHubAuthenticated() {
  let attempts = 0
  const maxAttempts = 3

  while (attempts < maxAttempts) {
    log.progress('Checking GitHub authentication')
    const authCheck = await runCommandWithOutput('gh', ['auth', 'status'])

    if (authCheck.exitCode === 0) {
      log.done('GitHub CLI authenticated')
      return true
    }

    attempts++

    if (attempts >= maxAttempts) {
      log.error(
        `Failed to authenticate with GitHub after ${maxAttempts} attempts`,
      )
      return false
    }

    // Not authenticated, prompt for login
    log.warn('GitHub authentication required')
    console.log(colors.yellow('\nYou need to authenticate with GitHub.'))
    console.log('Follow the prompts to complete authentication.\n')

    // Run gh auth login interactively
    log.progress('Starting GitHub login process')
    const loginResult = await runCommand('gh', ['auth', 'login'], {
      stdio: 'inherit',
    })

    if (loginResult === 0) {
      log.done('Login process completed')
      // Give it a moment for the auth to register
      await new Promise(resolve => setTimeout(resolve, 2000))
    } else {
      log.failed('Login process failed')
      console.log(colors.red('\nLogin failed. Please try again.'))

      if (attempts < maxAttempts) {
        console.log(
          colors.yellow(`\nAttempt ${attempts + 1} of ${maxAttempts}`),
        )
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  return false
}

/**
 * Create a semantic hash of error output for tracking duplicate errors.
 * Normalizes errors to catch semantically identical issues with different line numbers.
 * @param {string} errorOutput - The error output to hash
 * @returns {string} A hex hash of the normalized error
 */
function hashError(errorOutput) {
  // Normalize error for semantic comparison
  const normalized = errorOutput
    .trim()
    // Remove timestamps
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^Z\s]*/g, 'TIMESTAMP')
    .replace(/\d{2}:\d{2}:\d{2}/g, 'TIME')
    // Remove line:column numbers (but keep file paths)
    .replace(/:\d+:\d+/g, ':*:*')
    .replace(/line \d+/gi, 'line *')
    .replace(/column \d+/gi, 'column *')
    // Remove specific SHAs and commit hashes
    .replace(/\b[0-9a-f]{7,40}\b/g, 'SHA')
    // Remove absolute file system paths (keep relative paths)
    .replace(/\/[^\s]*?\/([^/\s]+)/g, '$1')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Take first 500 chars (increased from 200 for better matching)
    .slice(0, 500)

  // Use proper cryptographic hashing for consistent results
  return crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')
    .slice(0, 16)
}

export {
  checkClaude,
  checkIfCommitIsPartOfPR,
  ensureClaudeAuthenticated,
  ensureGitHubAuthenticated,
  hashError,
}
