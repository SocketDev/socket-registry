/**
 * @fileoverview Green CI command - runs checks, auto-fixes failures, pushes, and monitors CI until green.
 * This command automates the full workflow of ensuring CI passes by detecting and fixing issues locally,
 * then monitoring remote CI runs and applying fixes as needed.
 */

import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import colors from 'yoctocolors-cjs'

import {
  analyzeRootCause,
  celebrateSuccess,
  displayAnalysis,
  hashError,
  runPreCommitScan,
  saveErrorHistory,
} from '../error-analysis.mjs'
import {
  checkIfCommitIsPartOfPR,
  ensureGitHubAuthenticated,
} from '../authentication.mjs'
import { generateCommitMessage } from './commit.mjs'
import { runCommand, runCommandWithOutput } from '../command-execution.mjs'
import { log } from '../config.mjs'
import { CostTracker } from '../cost-tracker.mjs'
import { ProgressTracker } from '../progress-tracker.mjs'
import { SnapshotManager } from '../snapshot-manager.mjs'
import { cleanupOldData, initStorage } from '../storage.mjs'
import { formatDuration, printFooter, printHeader } from '../utils/formatting.mjs'

const WIN32 = process.platform === 'win32'

/**
 * Calculate adaptive poll delay based on CI state.
 * Polls faster when jobs are running, slower when queued.
 */
function calculatePollDelay(status, attempt, hasActiveJobs = false) {
  // If jobs are actively running, poll more frequently.
  if (hasActiveJobs || status === 'in_progress') {
    // Start at 5s, gradually increase to 15s max.
    return Math.min(5000 + attempt * 2000, 15_000)
  }

  // If queued or waiting, use longer intervals (30s).
  if (status === 'queued' || status === 'waiting') {
    return 30_000
  }

  // Default: moderate polling for unknown states (10s).
  return 10_000
}

/**
 * Filter CI logs to extract relevant error information.
 */
function filterCILogs(rawLogs) {
  const lines = rawLogs.split('\n')
  const relevantLines = []
  let inErrorSection = false

  for (const line of lines) {
    // Skip runner metadata and setup.
    if (
      line.includes('Current runner version:') ||
      line.includes('Runner Image') ||
      line.includes('Operating System') ||
      line.includes('GITHUB_TOKEN') ||
      line.includes('Prepare workflow') ||
      line.includes('Prepare all required') ||
      line.includes('##[group]') ||
      line.includes('##[endgroup]') ||
      line.includes('Post job cleanup') ||
      line.includes('git config') ||
      line.includes('git submodule') ||
      line.includes('Cleaning up orphan') ||
      line.includes('secret source:') ||
      line.includes('[command]/usr/bin/git')
    ) {
      continue
    }

    // Detect error sections.
    if (
      line.includes('##[error]') ||
      line.includes('Error:') ||
      line.includes('error TS') ||
      line.includes('FAIL') ||
      line.includes('✗') ||
      line.includes('❌') ||
      line.includes('failed') ||
      line.includes('ELIFECYCLE')
    ) {
      inErrorSection = true
      relevantLines.push(line)
    } else if (inErrorSection && line.trim() !== '') {
      relevantLines.push(line)
      // Keep context for 5 lines after error.
      if (relevantLines.length > 100) {
        inErrorSection = false
      }
    }
  }

  // If no errors found, return last 50 lines (might contain useful context).
  if (relevantLines.length === 0) {
    return lines.slice(-50).join('\n')
  }

  return relevantLines.join('\n')
}

/**
 * Priority levels for different CI job types.
 * Higher priority jobs are fixed first since they often block other jobs.
 */
const JOB_PRIORITIES = {
  build: 100,
  compile: 100,
  'type check': 90,
  typecheck: 90,
  typescript: 90,
  tsc: 90,
  lint: 80,
  eslint: 80,
  prettier: 80,
  'unit test': 70,
  test: 70,
  jest: 70,
  vitest: 70,
  integration: 60,
  e2e: 50,
  coverage: 40,
  report: 30,
}

/**
 * Get priority for a CI job based on its name.
 * @param {string} jobName - The name of the CI job
 * @returns {number} Priority level (higher = more important)
 */
function getJobPriority(jobName) {
  const lowerName = jobName.toLowerCase()

  // Check for exact or partial matches.
  for (const [pattern, priority] of Object.entries(JOB_PRIORITIES)) {
    if (lowerName.includes(pattern)) {
      return priority
    }
  }

  // Default priority for unknown job types.
  return 50
}

/**
 * Prepare Claude command arguments for Claude Code.
 */
function prepareClaudeArgs(args = [], options = {}) {
  const opts = { __proto__: null, ...options }
  const claudeArgs = [...args]

  // Add --dangerously-skip-permissions unless --no-darkwing is specified.
  // "Let's get dangerous!" mode for automated CI fixes.
  if (!opts['no-darkwing']) {
    claudeArgs.push('--dangerously-skip-permissions')
  }

  return claudeArgs
}

/**
 * Validate changes before pushing to catch common mistakes.
 * @param {string} cwd - Working directory
 * @returns {Promise<{valid: boolean, warnings: string[]}>} Validation result
 */
async function validateBeforePush(cwd) {
  const warnings = []

  // Check for common issues in staged changes.
  const diffResult = await runCommandWithOutput('git', ['diff', '--cached'], {
    cwd,
  })
  const diff = diffResult.stdout

  // Check 1: No console.log statements.
  if (diff.match(/^\+.*console\.log\(/m)) {
    warnings.push(
      `${colors.yellow('⚠')} Added console.log() statements detected`,
    )
  }

  // Check 2: No .only in tests.
  if (diff.match(/^\+.*\.(only|skip)\(/m)) {
    warnings.push(`${colors.yellow('⚠')} Test .only() or .skip() detected`)
  }

  // Check 3: No debugger statements.
  if (diff.match(/^\+.*debugger[;\s]/m)) {
    warnings.push(`${colors.yellow('⚠')} Debugger statement detected`)
  }

  // Check 4: No TODO/FIXME without issue link.
  const todoMatches = diff.match(/^\+.*\/\/\s*(TODO|FIXME)(?!\s*\(#\d+\))/gim)
  if (todoMatches && todoMatches.length > 0) {
    warnings.push(
      `${colors.yellow('⚠')} ${todoMatches.length} TODO/FIXME comment(s) without issue links`,
    )
  }

  // Check 5: Package.json is valid JSON.
  if (diff.includes('package.json')) {
    try {
      const pkgPath = path.join(cwd, 'package.json')
      const pkgContent = await fs.readFile(pkgPath, 'utf8')
      JSON.parse(pkgContent)
    } catch (e) {
      warnings.push(`${colors.yellow('⚠')} Invalid package.json: ${e.message}`)
    }
  }

  return { valid: warnings.length === 0, warnings }
}

/**
 * Run all checks, push, and monitor CI until green.
 * NOTE: This operates on the current repo by default. Use --cross-repo for all Socket projects.
 * Multi-repo parallel execution would conflict with interactive prompts if fixes fail.
 */
async function runGreen(claudeCmd, rootPath, options = {}) {
  const opts = { __proto__: null, ...options }
  const maxRetries = Number.parseInt(opts['max-retries'] || '3', 10)
  const isDryRun = opts['dry-run']
  const MAX_AUTO_FIX_ATTEMPTS = Number.parseInt(
    opts['max-auto-fixes'] || '10',
    10,
  )
  const useNoVerify = opts['no-verify'] === true

  // Initialize storage and cleanup old data.
  await initStorage()
  await cleanupOldData()

  // Initialize trackers.
  const costTracker = new CostTracker()
  const progress = new ProgressTracker()
  const snapshots = new SnapshotManager()
  let fixCount = 0

  printHeader('Green CI Pipeline')

  // Optional: Run pre-commit scan for proactive detection.
  if (opts['pre-commit-scan']) {
    log.step('Running proactive pre-commit scan')
    const scanResult = await runPreCommitScan(claudeCmd)

    if (scanResult && !scanResult.safe) {
      log.warn('Pre-commit scan detected potential issues:')
      scanResult.issues.forEach(issue => {
        const icon =
          issue.severity === 'high' ? colors.red('✗') : colors.yellow('⚠')
        log.substep(
          `${icon} ${issue.type}: ${issue.description} ${colors.gray(`(${issue.confidence}% confidence)`)}`,
        )
      })

      // Ask if user wants to continue.
      log.info('Continue anyway? (Ctrl+C to abort)')
      await new Promise(resolve => setTimeout(resolve, 3000))
    } else if (scanResult?.safe) {
      log.done('Pre-commit scan passed - no obvious issues detected')
    }
  }

  // Show initial progress.
  progress.showProgress()

  // Track errors to avoid checking same error repeatedly.
  const seenErrors = new Set()
  // Track CI errors by run ID.
  const ciErrorHistory = new Map()

  // Step 1: Run local checks.
  progress.startPhase('local-checks')
  const repoName = path.basename(rootPath)
  log.step(`Running local checks in ${colors.cyan(repoName)}`)
  const localChecks = [
    { name: 'Install dependencies', cmd: 'pnpm', args: ['install'] },
    { name: 'Fix code style', cmd: 'pnpm', args: ['run', 'fix'] },
    { name: 'Run checks', cmd: 'pnpm', args: ['run', 'check'] },
    { name: 'Run coverage', cmd: 'pnpm', args: ['run', 'cover'] },
    { name: 'Run tests', cmd: 'pnpm', args: ['run', 'test', '--', '--update'] },
  ]

  let autoFixAttempts = 0
  let lastAnalysis = null
  let lastErrorHash = null
  let checksPassedWithoutFixes = false

  while (!checksPassedWithoutFixes) {
    let hadFixesThisRound = false

    for (const check of localChecks) {
      log.progress(`[${repoName}] ${check.name}`)

      if (isDryRun) {
        log.done(`[DRY RUN] Would run: ${check.cmd} ${check.args.join(' ')}`)
        continue
      }

      // Add newline after progress indicator before command output.
      console.log('')
      const result = await runCommandWithOutput(check.cmd, check.args, {
        cwd: rootPath,
        stdio: 'inherit',
      })

      if (result.exitCode !== 0) {
        log.failed(`${check.name} failed`)

        // Track error to avoid repeated attempts on same error.
        const errorOutput =
          result.stderr || result.stdout || 'No error output available'
        const errorHash = hashError(errorOutput)

        if (seenErrors.has(errorHash)) {
          log.error(`Detected same error again for "${check.name}"`)
          log.substep('Skipping auto-fix to avoid infinite loop')
          log.substep('Error appears unchanged from previous attempt')
          return false
        }

        seenErrors.add(errorHash)
        autoFixAttempts++

        // Analyze root cause before attempting fix.
        const analysis = await analyzeRootCause(claudeCmd, errorOutput, {
          checkName: check.name,
          repoName,
          attempts: autoFixAttempts,
        })

        // Save for history tracking.
        lastAnalysis = analysis
        lastErrorHash = errorHash

        // Display analysis to user.
        if (analysis) {
          displayAnalysis(analysis)

          // Warn if environmental issue.
          if (analysis.isEnvironmental && analysis.confidence > 70) {
            log.warn(
              'This looks like an environmental issue - fix may not help. Consider checking runner status.',
            )
          }
        }

        // Decide whether to auto-fix or go interactive.
        const isAutoMode = autoFixAttempts <= MAX_AUTO_FIX_ATTEMPTS

        if (isAutoMode) {
          // Create snapshot before fix attempt for potential rollback.
          await snapshots.createSnapshot(`before-fix-${autoFixAttempts}`)
          log.substep(`Snapshot created: before-fix-${autoFixAttempts}`)

          // Attempt automatic fix.
          log.progress(
            `[${repoName}] Auto-fix attempt ${autoFixAttempts}/${MAX_AUTO_FIX_ATTEMPTS}`,
          )

          // Build fix prompt with analysis if available.
          const fixPrompt = `You are fixing a CI/build issue automatically. The command "${check.cmd} ${check.args.join(' ')}" failed in the ${path.basename(rootPath)} project.

Error output:
${errorOutput}

${
  analysis
    ? `
Root Cause Analysis:
- Problem: ${analysis.rootCause}
- Confidence: ${analysis.confidence}%
- Category: ${analysis.category}

Recommended Fix Strategy:
${
  analysis.strategies[0]
    ? `- ${analysis.strategies[0].name} (${analysis.strategies[0].probability}% success probability)
  ${analysis.strategies[0].description}
  Reasoning: ${analysis.strategies[0].reasoning}`
    : 'No specific strategy recommended'
}
`
    : ''
}

Your task:
1. Analyze the error
2. Provide the exact fix needed
3. Use file edits, commands, or both to resolve the issue

IMPORTANT:
- Be direct and specific - don't ask questions
- Provide complete solutions that will fix the error
- If the error is about missing dependencies, install pinned versions
- If it's a type error, fix the code
- If it's a lint error, fix the formatting
- If tests are failing, update snapshots or fix the test
- If a script is missing, check if there's a similar script name (e.g., 'cover' vs 'coverage')

Fix this issue now by making the necessary changes.`

          // Run Claude non-interactively with timeout and progress.
          const startTime = Date.now()
          // 2 minute timeout.
          const timeout = 120_000
          log.substep(`[${repoName}] Analyzing error...`)

          const claudeProcess = spawn(claudeCmd, prepareClaudeArgs([], opts), {
            cwd: rootPath,
            stdio: ['pipe', 'inherit', 'inherit'],
          })

          claudeProcess.stdin.write(fixPrompt)
          claudeProcess.stdin.end()

          // Monitor progress with timeout.
          let isCleared = false
          let progressInterval = null
          const clearProgressInterval = () => {
            if (!isCleared && progressInterval) {
              clearInterval(progressInterval)
              isCleared = true
            }
          }

          progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime
            if (elapsed > timeout) {
              log.warn(
                `[${repoName}] Claude fix timed out after ${Math.round(elapsed / 1000)}s`,
              )
              clearProgressInterval()
              claudeProcess.kill()
            } else {
              log.substep(
                `[${repoName}] Claude working... (${Math.round(elapsed / 1000)}s)`,
              )
            }
          }, 10_000)
          // Update every 10 seconds.

          await new Promise(resolve => {
            claudeProcess.on('close', () => {
              clearProgressInterval()
              const elapsed = Date.now() - startTime
              log.done(
                `[${repoName}] Claude fix completed in ${Math.round(elapsed / 1000)}s`,
              )
              resolve()
            })
          })

          // Give file system a moment to sync.
          await new Promise(resolve => setTimeout(resolve, 1000))

          // Retry the check.
          log.progress(`Retrying ${check.name}`)
          const retryResult = await runCommandWithOutput(
            check.cmd,
            check.args,
            {
              cwd: rootPath,
            },
          )

          if (retryResult.exitCode !== 0) {
            // Auto-fix didn't work - save failure to history.
            if (lastAnalysis) {
              await saveErrorHistory(
                lastErrorHash,
                'failed',
                lastAnalysis.strategies[0]?.name || 'auto-fix',
                lastAnalysis.rootCause,
              )
            }

            // Auto-fix didn't work.
            if (autoFixAttempts >= MAX_AUTO_FIX_ATTEMPTS) {
              // Switch to interactive mode.
              log.warn(
                `Auto-fix failed after ${MAX_AUTO_FIX_ATTEMPTS} attempts`,
              )
              log.info('Switching to interactive mode for manual assistance')

              const interactivePrompt = `The command "${check.cmd} ${check.args.join(' ')}" is still failing after ${MAX_AUTO_FIX_ATTEMPTS} automatic fix attempts.

Latest error output:
${retryResult.stderr || retryResult.stdout || 'No error output'}

Previous automatic fixes were attempted but did not resolve the issue. This appears to be a more complex problem that requires interactive debugging.

Please help me fix this issue. You can:
1. Analyze the error more carefully
2. Try different approaches
3. Ask me questions if needed
4. Suggest manual steps I should take

Let's work through this together to get CI passing.`

              log.progress('Launching interactive Claude session')
              await runCommand(claudeCmd, prepareClaudeArgs([], opts), {
                input: interactivePrompt,
                cwd: rootPath,
                // Interactive mode.
                stdio: 'inherit',
              })

              // Try once more after interactive session.
              log.progress(`Final retry of ${check.name}`)
              const finalResult = await runCommandWithOutput(
                check.cmd,
                check.args,
                {
                  cwd: rootPath,
                },
              )

              if (finalResult.exitCode !== 0) {
                log.error(
                  `${check.name} still failing after manual intervention`,
                )
                log.substep(
                  'Consider running the command manually to debug further',
                )
                return false
              }
            } else {
              log.warn(`Auto-fix attempt ${autoFixAttempts} failed, will retry`)
              // Will try again on next iteration.
              continue
            }
          }

          // Fix succeeded - save success to history.
          if (lastAnalysis) {
            await saveErrorHistory(
              lastErrorHash,
              'success',
              lastAnalysis.strategies[0]?.name || 'auto-fix',
              lastAnalysis.rootCause,
            )
          }

          log.done(`${check.name} passed after fix`)
          hadFixesThisRound = true
          fixCount++

          // Commit the fix immediately (without AI attribution per CLAUDE.md).
          if (!isDryRun) {
            log.progress('Committing fix')
            const statusCheck = await runCommandWithOutput(
              'git',
              ['status', '--porcelain'],
              { cwd: rootPath },
            )

            if (statusCheck.stdout.trim()) {
              await runCommand('git', ['add', '.'], { cwd: rootPath })

              // Generate commit message.
              log.progress('Generating commit message')
              const commitMessage = await generateCommitMessage(
                claudeCmd,
                rootPath,
                opts,
              )
              log.substep(`Commit message: ${commitMessage}`)

              const commitArgs = ['commit', '-m', commitMessage]
              if (useNoVerify) {
                commitArgs.push('--no-verify')
              }
              await runCommand('git', commitArgs, { cwd: rootPath })
              log.done('Fix committed')
            }
          }

          // Break out of check loop to restart all checks from beginning.
          break
        }
        // Already exceeded auto attempts, go straight to interactive.
        log.warn('Maximum auto-fix attempts exceeded')
        log.info('Please fix this issue interactively')
        return false
      }
      log.done(`${check.name} passed`)
    }

    // If we completed all checks without any fixes this round, we're done.
    if (!hadFixesThisRound) {
      checksPassedWithoutFixes = true
      log.success('All local checks passed!')
    } else {
      log.info('Fixes applied - rerunning all checks from the beginning')
      // Reset error tracking for the new round.
      seenErrors.clear()
      autoFixAttempts = 0
    }
  }

  // End local checks phase.
  progress.endPhase()
  progress.showProgress()

  // Step 2: Push changes.
  progress.startPhase('push')

  // Check if local branch is ahead of remote (unpushed commits).
  const revListResult = await runCommandWithOutput(
    'git',
    ['rev-list', '@{upstream}..HEAD', '--count'],
    {
      cwd: rootPath,
    },
  )
  const unpushedCount = Number.parseInt(revListResult.stdout.trim() || '0', 10)

  if (unpushedCount > 0) {
    log.step(`Pushing ${unpushedCount} commit(s) to remote`)

    if (isDryRun) {
      log.done(`[DRY RUN] Would push ${unpushedCount} commit(s)`)
    } else {
      // Validate before pushing.
      const validation = await validateBeforePush(rootPath)
      if (!validation.valid) {
        log.warn('Pre-push validation warnings:')
        validation.warnings.forEach(warning => {
          log.substep(warning)
        })
        log.substep('Continuing with push (warnings are non-blocking)...')
      }

      // Push.
      log.progress('Pushing to remote')
      await runCommand('git', ['push'], { cwd: rootPath })
      log.done('Changes pushed to remote')
    }
  } else {
    log.info('No unpushed commits - already up to date')
  }

  // End commit phase.
  progress.endPhase()
  progress.showProgress()

  // Step 3: Monitor CI workflow.
  progress.startPhase('ci-monitoring')
  log.step('Monitoring CI workflow')

  if (isDryRun) {
    log.done('[DRY RUN] Would monitor CI workflow')
    printFooter('Green CI Pipeline (dry run) complete!')
    return true
  }

  // Check for GitHub CLI.
  const ghCheckCommand = WIN32 ? 'where' : 'which'
  const ghCheck = await runCommandWithOutput(ghCheckCommand, ['gh'])
  if (ghCheck.exitCode !== 0) {
    log.error('GitHub CLI (gh) is required for CI monitoring')
    console.log(`\n${colors.cyan('Installation Instructions:')}`)
    console.log(`  macOS:   ${colors.green('brew install gh')}`)
    console.log(`  Ubuntu:  ${colors.green('sudo apt install gh')}`)
    console.log(`  Fedora:  ${colors.green('sudo dnf install gh')}`)
    console.log(`  Windows: ${colors.green('winget install --id GitHub.cli')}`)
    console.log(
      `  Other:   ${colors.gray('https://github.com/cli/cli/blob/trunk/docs/install_linux.md')}`,
    )
    console.log(`\n${colors.yellow('After installation:')}`)
    console.log(`  1. Run: ${colors.green('gh auth login')}`)
    console.log('  2. Follow the prompts to authenticate')
    console.log(`  3. Try again: ${colors.green('pnpm claude --green')}`)
    return false
  }

  // Ensure GitHub is authenticated (will handle login automatically).
  const isGitHubAuthenticated = await ensureGitHubAuthenticated()
  if (!isGitHubAuthenticated) {
    log.error('Unable to authenticate with GitHub')
    console.log(
      colors.red('\nGitHub authentication is required for CI monitoring.'),
    )
    console.log('Please ensure you can login to GitHub CLI and try again.')
    return false
  }

  // Get current commit SHA.
  const shaResult = await runCommandWithOutput('git', ['rev-parse', 'HEAD'], {
    cwd: rootPath,
  })
  let currentSha = shaResult.stdout.trim()

  // Get repo info.
  const remoteResult = await runCommandWithOutput(
    'git',
    ['remote', 'get-url', 'origin'],
    {
      cwd: rootPath,
    },
  )
  const remoteUrl = remoteResult.stdout.trim()
  const repoMatch = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/)

  if (!repoMatch) {
    log.error('Could not determine GitHub repository from remote URL')
    return false
  }

  const [, owner, repoNameMatch] = repoMatch
  const repo = repoNameMatch.replace('.git', '')

  // Check if commit is part of a PR.
  const prInfo = await checkIfCommitIsPartOfPR(currentSha, owner, repo)
  if (prInfo.isPR) {
    log.info(
      `Commit is part of PR #${prInfo.prNumber}: ${colors.cyan(prInfo.prTitle)}`,
    )
    log.substep(`PR state: ${prInfo.prState}`)
  } else {
    log.info('Commit is a direct push (not part of a PR)')
  }

  // Monitor workflow with retries.
  let retryCount = 0
  let lastRunId = null
  let pushTime = Date.now()
  // Track which jobs we've already fixed (jobName -> true).
  let fixedJobs = new Map()
  // Track if we've made any commits during this workflow run.
  let hasPendingCommits = false
  // Track polling attempts for adaptive delays.
  let pollAttempt = 0

  while (retryCount < maxRetries) {
    // Reset tracking for each new CI run.
    fixedJobs = new Map()
    hasPendingCommits = false
    pollAttempt = 0
    log.progress(`Checking CI status (attempt ${retryCount + 1}/${maxRetries})`)

    // Wait a bit for CI to start.
    if (retryCount === 0) {
      log.substep('Waiting 10 seconds for CI to start...')
      await new Promise(resolve => setTimeout(resolve, 10_000))
    }

    // Check workflow runs using gh CLI with better detection.
    const runsResult = await runCommandWithOutput(
      'gh',
      [
        'run',
        'list',
        '--repo',
        `${owner}/${repo}`,
        '--limit',
        '20',
        '--json',
        'databaseId,status,conclusion,name,headSha,createdAt,headBranch',
      ],
      {
        cwd: rootPath,
      },
    )

    if (runsResult.exitCode !== 0) {
      log.failed('Failed to fetch workflow runs')

      // Provide debugging information.
      if (runsResult.stderr) {
        console.log(colors.red('\nError details:'))
        console.log(runsResult.stderr)
      }

      // Common troubleshooting steps.
      console.log(colors.yellow('\nTroubleshooting:'))
      console.log('1. Check GitHub CLI authentication:')
      console.log(`   ${colors.green('gh auth status')}`)
      console.log('\n2. If not authenticated, login:')
      console.log(`   ${colors.green('gh auth login')}`)
      console.log('\n3. Test repository access:')
      console.log(`   ${colors.green(`gh api repos/${owner}/${repo}`)}`)
      console.log('\n4. Check if workflows exist:')
      console.log(
        `   ${colors.green(`gh workflow list --repo ${owner}/${repo}`)}`,
      )
      console.log('\n5. View recent runs manually:')
      console.log(
        `   ${colors.green(`gh run list --repo ${owner}/${repo} --limit 5`)}`,
      )

      return false
    }

    let runs
    try {
      runs = JSON.parse(runsResult.stdout || '[]')
    } catch {
      log.failed('Failed to parse workflow runs')
      return false
    }

    // Filter runs to find one matching our commit SHA or recent push.
    let matchingRun = null

    // Debug: log current SHA and available runs.
    if (pollAttempt === 0) {
      log.substep(
        `Looking for workflow runs for commit ${currentSha.substring(0, 7)}`,
      )
      if (runs.length > 0) {
        log.substep(`Found ${runs.length} recent runs, checking for matches...`)
      }
    }

    // First, try exact SHA match (both directions for robustness).
    for (const run of runs) {
      if (
        run.headSha === currentSha ||
        run.headSha?.startsWith(currentSha.substring(0, 7)) ||
        currentSha.startsWith(run.headSha?.substring(0, 7) || '')
      ) {
        matchingRun = run
        log.substep(`Found SHA match for commit ${currentSha.substring(0, 7)}`)
        break
      }
    }

    // If no exact match, look for runs created after our push.
    if (!matchingRun && runs.length > 0) {
      for (const run of runs) {
        if (run.createdAt) {
          const runTime = new Date(run.createdAt).getTime()
          // Check if run was created within 2 minutes BEFORE or after push.
          if (runTime >= pushTime - 120_000) {
            matchingRun = run
            log.substep(`Found workflow started around push time: ${run.name}`)
            break
          }
        }
      }
    }

    // Last resort: if still no match on first attempt, monitor the newest run.
    if (!matchingRun && retryCount === 0 && runs.length > 0) {
      const newestRun = runs[0]
      if (newestRun.createdAt) {
        const runTime = new Date(newestRun.createdAt).getTime()
        // Only consider if created within last 10 minutes.
        if (Date.now() - runTime < 10 * 60 * 1000) {
          matchingRun = newestRun
          log.substep(`Monitoring recent workflow: ${newestRun.name}`)
        }
      }
    }

    if (!matchingRun) {
      // Use moderate delay when no run found yet (10s).
      const delay = 10_000
      log.substep(
        `No matching workflow runs found yet, waiting ${delay / 1000}s...`,
      )
      await new Promise(resolve => setTimeout(resolve, delay))
      pollAttempt++
      continue
    }

    const run = matchingRun
    lastRunId = run.databaseId

    log.substep(`Workflow "${run.name}" status: ${run.status}`)

    // Show progress update every 5 polls.
    if (pollAttempt % 5 === 0) {
      progress.showProgress()
    }

    // If workflow is queued, wait before checking again.
    if (run.status === 'queued' || run.status === 'waiting') {
      const delay = calculatePollDelay(run.status, pollAttempt)
      log.substep(`Waiting for workflow to start (${delay / 1000}s)...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      pollAttempt++
      continue
    }

    if (run.status === 'completed') {
      if (run.conclusion === 'success') {
        // End CI monitoring phase.
        progress.endPhase()
        progress.complete()

        // Show final statistics.
        await celebrateSuccess(costTracker, {
          fixCount,
          retries: pollAttempt,
        })

        // Show available snapshots for reference.
        const snapshotList = snapshots.listSnapshots()
        if (snapshotList.length > 0) {
          console.log(colors.cyan('\n📸 Available Snapshots:'))
          snapshotList.slice(0, 5).forEach(snap => {
            console.log(
              `  ${snap.label} ${colors.gray(`(${formatDuration(Date.now() - snap.timestamp)} ago)`)}`,
            )
          })
          if (snapshotList.length > 5) {
            console.log(
              colors.gray(`  ... and ${snapshotList.length - 5} more`),
            )
          }
        }

        printFooter('Green CI Pipeline complete!')
        return true
      }
      log.failed(`CI workflow failed with conclusion: ${run.conclusion}`)

      // If we have pending commits from fixing jobs during execution, push them now.
      if (hasPendingCommits) {
        log.progress('Pushing all fix commits')
        await runCommand('git', ['push'], { cwd: rootPath })
        log.done(`Pushed ${fixedJobs.size} fix commit(s)`)

        // Update SHA and push time for next check.
        const newShaResult = await runCommandWithOutput(
          'git',
          ['rev-parse', 'HEAD'],
          {
            cwd: rootPath,
          },
        )
        currentSha = newShaResult.stdout.trim()
        pushTime = Date.now()

        // Reset retry count for new commit - it deserves its own attempts.
        log.substep(
          `New commit ${currentSha.substring(0, 7)}, resetting retry counter`,
        )
        retryCount = 0

        // Wait for new CI run to start.
        log.substep('Waiting 15 seconds for new CI run to start...')
        await new Promise(resolve => setTimeout(resolve, 15_000))
        continue
      }

      // No fixes were made during execution, handle as traditional completed workflow.
      if (retryCount < maxRetries - 1) {
        // Fetch failure logs.
        log.progress('Fetching failure logs')

        const logsResult = await runCommandWithOutput(
          'gh',
          [
            'run',
            'view',
            lastRunId.toString(),
            '--repo',
            `${owner}/${repo}`,
            '--log-failed',
          ],
          {
            cwd: rootPath,
          },
        )
        // Add newline after progress indicator before next output.
        console.log('')

        // Filter and show summary of logs.
        const rawLogs = logsResult.stdout || 'No logs available'
        const filteredLogs = filterCILogs(rawLogs)

        const logLines = filteredLogs.split('\n').slice(0, 10)
        log.substep('Error summary:')
        for (const line of logLines) {
          if (line.trim()) {
            log.substep(`  ${line.trim().substring(0, 100)}`)
          }
        }
        if (filteredLogs.split('\n').length > 10) {
          log.substep(
            `  ... (${filteredLogs.split('\n').length - 10} more lines)`,
          )
        }

        // Check if we've seen this CI error before.
        const ciErrorHash = hashError(filteredLogs)

        if (ciErrorHistory.has(lastRunId)) {
          log.error(`Already attempted fix for run ${lastRunId}`)
          log.substep('Skipping to avoid repeated attempts on same CI run')
          retryCount++
          continue
        }

        if (seenErrors.has(ciErrorHash)) {
          log.error('Detected same CI error pattern as previous attempt')
          log.substep('Error appears unchanged after push')
          log.substep(
            `View run at: https://github.com/${owner}/${repo}/actions/runs/${lastRunId}`,
          )
          return false
        }

        ciErrorHistory.set(lastRunId, ciErrorHash)
        seenErrors.add(ciErrorHash)

        // Analyze and fix with Claude.
        log.progress('Analyzing CI failure with Claude')

        // Keep logs under 2000 chars to avoid context issues.
        const truncatedLogs =
          filteredLogs.length > 2000
            ? `${filteredLogs.substring(0, 2000)}\n... (truncated)`
            : filteredLogs

        const fixPrompt = `Fix CI failures for commit ${currentSha.substring(0, 7)} in ${owner}/${repo}.

Error logs:
${truncatedLogs}

Fix all issues by making necessary file changes. Be direct, don't ask questions.`

        // Run Claude non-interactively to apply fixes.
        log.substep('Applying CI fixes...')

        // Track progress with timeout.
        const fixStartTime = Date.now()
        // 3 minutes timeout.
        const fixTimeout = 180_000

        // Create progress indicator.
        const progressInterval = setInterval(() => {
          const elapsed = Date.now() - fixStartTime
          if (elapsed > fixTimeout) {
            log.warn('Claude fix timeout, proceeding...')
            clearInterval(progressInterval)
          } else {
            log.progress(
              `Claude analyzing and fixing... (${Math.round(elapsed / 1000)}s)`,
            )
          }
          // Update every 10 seconds.
        }, 10_000)

        try {
          // Write prompt to temp file.
          const tmpFile = path.join(rootPath, `.claude-fix-${Date.now()}.txt`)
          await fs.writeFile(tmpFile, fixPrompt, 'utf8')

          const fixArgs = prepareClaudeArgs([], opts)
          const claudeArgs = fixArgs.join(' ')
          const claudeCommand = claudeArgs
            ? `${claudeCmd} ${claudeArgs}`
            : claudeCmd

          // Use script command to create pseudo-TTY for Ink compatibility.
          // Platform-specific script command syntax.
          let scriptCmd
          if (WIN32) {
            // Try winpty (comes with Git for Windows).
            const winptyCheck = await runCommandWithOutput('where', ['winpty'])
            if (winptyCheck.exitCode === 0) {
              scriptCmd = `winpty ${claudeCommand} < "${tmpFile}"`
            } else {
              // No winpty, try direct (may fail with raw mode error).
              scriptCmd = `${claudeCommand} < "${tmpFile}"`
            }
          } else {
            // Unix/macOS: use script command with quoted command.
            scriptCmd = `script -q /dev/null sh -c '${claudeCommand} < "${tmpFile}"'`
          }

          const exitCode = await new Promise((resolve, _reject) => {
            const child = spawn(scriptCmd, [], {
              stdio: 'inherit',
              cwd: rootPath,
              shell: true,
            })

            // Handle Ctrl+C gracefully.
            const sigintHandler = () => {
              child.kill('SIGINT')
              resolve(130)
            }
            process.on('SIGINT', sigintHandler)

            child.on('exit', code => {
              process.off('SIGINT', sigintHandler)
              resolve(code || 0)
            })

            child.on('error', () => {
              process.off('SIGINT', sigintHandler)
              resolve(1)
            })
          })

          // Clean up temp file.
          try {
            await fs.unlink(tmpFile)
          } catch {}

          if (exitCode !== 0) {
            log.warn(`Claude fix exited with code ${exitCode}`)
          }
        } catch (error) {
          log.warn(`Claude fix error: ${error.message}`)
        } finally {
          clearInterval(progressInterval)
          log.done('Claude fix attempt completed')
        }

        // Give Claude's changes a moment to complete.
        await new Promise(resolve => setTimeout(resolve, 3000))

        // Run local checks again.
        log.progress('Running local checks after fixes')
        // Add newline after progress indicator before command output.
        console.log('')
        for (const check of localChecks) {
          await runCommandWithOutput(check.cmd, check.args, {
            cwd: rootPath,
            stdio: 'inherit',
          })
        }

        // Commit and push fixes.
        const fixStatusResult = await runCommandWithOutput(
          'git',
          ['status', '--porcelain'],
          {
            cwd: rootPath,
          },
        )

        let pushedNewCommit = false

        if (fixStatusResult.stdout.trim()) {
          log.progress('Committing CI fixes')

          // Show what files were changed.
          const changedFiles = fixStatusResult.stdout
            .trim()
            .split('\n')
            .map(line => line.substring(3))
            .join(', ')
          log.substep(`Changed files: ${changedFiles}`)

          // Stage all changes.
          await runCommand('git', ['add', '.'], { cwd: rootPath })

          // Generate commit message using Claude (non-interactive).
          log.progress('Generating CI fix commit message with Claude')
          const commitMessage = await generateCommitMessage(
            claudeCmd,
            rootPath,
            opts,
          )
          log.substep(`Commit message: ${commitMessage}`)

          // Validate before committing.
          const validation = await validateBeforePush(rootPath)
          if (!validation.valid) {
            log.warn('Pre-commit validation warnings:')
            validation.warnings.forEach(warning => {
              log.substep(warning)
            })
          }

          // Commit with generated message.
          const commitArgs = ['commit', '-m', commitMessage]
          if (useNoVerify) {
            commitArgs.push('--no-verify')
          }
          const commitResult = await runCommandWithOutput('git', commitArgs, {
            cwd: rootPath,
          })

          if (commitResult.exitCode === 0) {
            fixCount++
            // Push the commits.
            await runCommand('git', ['push'], { cwd: rootPath })
            log.done('Pushed fix commits')

            // Update SHA and push time for next check.
            const newShaResult = await runCommandWithOutput(
              'git',
              ['rev-parse', 'HEAD'],
              {
                cwd: rootPath,
              },
            )
            currentSha = newShaResult.stdout.trim()
            pushTime = Date.now()
            pushedNewCommit = true

            // Reset retry count for new commit - it deserves its own attempts.
            log.substep(
              `New commit ${currentSha.substring(0, 7)}, resetting retry counter`,
            )
            retryCount = 0

            // Wait for new CI run to start.
            log.substep('Waiting 15 seconds for new CI run to start...')
            await new Promise(resolve => setTimeout(resolve, 15_000))
          } else {
            log.warn(
              `Git commit failed: ${commitResult.stderr || commitResult.stdout}`,
            )
          }
        }

        // Only increment retry count if we didn't push a new commit.
        if (!pushedNewCommit) {
          retryCount++
        }
      } else {
        log.error(`CI still failing after ${maxRetries} attempts`)
        log.substep(
          `View run at: https://github.com/${owner}/${repo}/actions/runs/${lastRunId}`,
        )
        return false
      }
    } else {
      // Workflow still running - check for failed jobs and fix them immediately.
      log.substep('Workflow still running, checking for failed jobs...')

      // Fetch jobs for this workflow run.
      const jobsResult = await runCommandWithOutput(
        'gh',
        [
          'run',
          'view',
          lastRunId.toString(),
          '--repo',
          `${owner}/${repo}`,
          '--json',
          'jobs',
        ],
        {
          cwd: rootPath,
        },
      )

      if (jobsResult.exitCode === 0 && jobsResult.stdout) {
        try {
          const runData = JSON.parse(jobsResult.stdout)
          const jobs = runData.jobs || []

          // Check for any failed or cancelled jobs.
          const failedJobs = jobs.filter(
            job =>
              job.conclusion === 'failure' || job.conclusion === 'cancelled',
          )

          // Find new failures we haven't fixed yet.
          const newFailures = failedJobs.filter(job => !fixedJobs.has(job.name))

          if (newFailures.length > 0) {
            log.failed(`Detected ${newFailures.length} new failed job(s)`)

            // Sort by priority - fix blocking issues first (build, typecheck, lint, tests).
            // Higher priority first.
            const sortedFailures = newFailures.sort((a, b) => {
              const priorityA = getJobPriority(a.name)
              const priorityB = getJobPriority(b.name)
              return priorityB - priorityA
            })

            if (sortedFailures.length > 1) {
              log.substep('Processing in priority order (highest first):')
              sortedFailures.forEach(job => {
                const priority = getJobPriority(job.name)
                log.substep(`  [Priority ${priority}] ${job.name}`)
              })
            }

            // Fix each failed job immediately.
            for (const job of sortedFailures) {
              log.substep(`${colors.red('✗')} ${job.name}: ${job.conclusion}`)

              // Fetch logs for this specific failed job using job ID.
              log.progress(`Fetching logs for ${job.name}`)
              const logsResult = await runCommandWithOutput(
                'gh',
                [
                  'run',
                  'view',
                  '--job',
                  job.databaseId.toString(),
                  '--repo',
                  `${owner}/${repo}`,
                  '--log',
                ],
                {
                  cwd: rootPath,
                },
              )
              console.log('')

              // Filter logs to extract relevant errors.
              const rawLogs = logsResult.stdout || 'No logs available'
              const filteredLogs = filterCILogs(rawLogs)

              // Show summary to user (not full logs).
              const logLines = filteredLogs.split('\n').slice(0, 10)
              log.substep('Error summary:')
              for (const line of logLines) {
                if (line.trim()) {
                  log.substep(`  ${line.trim().substring(0, 100)}`)
                }
              }
              if (filteredLogs.split('\n').length > 10) {
                log.substep(
                  `  ... (${filteredLogs.split('\n').length - 10} more lines)`,
                )
              }

              // Analyze and fix with Claude.
              log.progress(`Analyzing failure in ${job.name}`)

              // Keep logs under 2000 chars to avoid context issues.
              const truncatedLogs =
                filteredLogs.length > 2000
                  ? `${filteredLogs.substring(0, 2000)}\n... (truncated)`
                  : filteredLogs

              const fixPrompt = `Fix CI failure in "${job.name}" (run ${lastRunId}, commit ${currentSha.substring(0, 7)}).

Status: ${job.conclusion}

Error logs:
${truncatedLogs}

Fix the issue by making necessary file changes. Be direct, don't ask questions.`

              // Run Claude non-interactively to apply fixes.
              log.substep(`Applying fix for ${job.name}...`)

              const fixStartTime = Date.now()
              const fixTimeout = 180_000

              const progressInterval = setInterval(() => {
                const elapsed = Date.now() - fixStartTime
                if (elapsed > fixTimeout) {
                  log.warn('Claude fix timeout, proceeding...')
                  clearInterval(progressInterval)
                } else {
                  log.progress(
                    `Claude fixing ${job.name}... (${Math.round(elapsed / 1000)}s)`,
                  )
                }
              }, 10_000)

              try {
                // Write prompt to temp file.
                const tmpFile = path.join(
                  rootPath,
                  `.claude-fix-${Date.now()}.txt`,
                )
                await fs.writeFile(tmpFile, fixPrompt, 'utf8')

                const fixArgs = prepareClaudeArgs([], opts)
                const claudeArgs = fixArgs.join(' ')
                const claudeCommand = claudeArgs
                  ? `${claudeCmd} ${claudeArgs}`
                  : claudeCmd

                // Debug: Show command being run.
                if (claudeArgs) {
                  log.substep(`Running: claude ${claudeArgs}`)
                }

                // Use script command to create pseudo-TTY for Ink compatibility.
                // Platform-specific script command syntax.
                let scriptCmd
                if (WIN32) {
                  // Try winpty (comes with Git for Windows).
                  const winptyCheck = await runCommandWithOutput('where', [
                    'winpty',
                  ])
                  if (winptyCheck.exitCode === 0) {
                    scriptCmd = `winpty ${claudeCommand} < "${tmpFile}"`
                  } else {
                    // No winpty, try direct (may fail with raw mode error).
                    scriptCmd = `${claudeCommand} < "${tmpFile}"`
                  }
                } else {
                  // Unix/macOS: use script command with quoted command.
                  scriptCmd = `script -q /dev/null sh -c '${claudeCommand} < "${tmpFile}"'`
                }

                const exitCode = await new Promise((resolve, _reject) => {
                  const child = spawn(scriptCmd, [], {
                    stdio: 'inherit',
                    cwd: rootPath,
                    shell: true,
                  })

                  // Handle Ctrl+C gracefully.
                  const sigintHandler = () => {
                    child.kill('SIGINT')
                    resolve(130)
                  }
                  process.on('SIGINT', sigintHandler)

                  child.on('exit', code => {
                    process.off('SIGINT', sigintHandler)
                    resolve(code || 0)
                  })

                  child.on('error', () => {
                    process.off('SIGINT', sigintHandler)
                    resolve(1)
                  })
                })

                // Clean up temp file.
                try {
                  await fs.unlink(tmpFile)
                } catch {}

                if (exitCode !== 0) {
                  log.warn(`Claude fix exited with code ${exitCode}`)
                }
              } catch (error) {
                log.warn(`Claude fix error: ${error.message}`)
              } finally {
                clearInterval(progressInterval)
                log.done(`Fix attempt for ${job.name} completed`)
              }

              // Give Claude's changes a moment to complete.
              await new Promise(resolve => setTimeout(resolve, 2000))

              // Run local checks.
              log.progress('Running local checks after fix')
              console.log('')
              for (const check of localChecks) {
                await runCommandWithOutput(check.cmd, check.args, {
                  cwd: rootPath,
                  stdio: 'inherit',
                })
              }

              // Check if there are changes to commit.
              const fixStatusResult = await runCommandWithOutput(
                'git',
                ['status', '--porcelain'],
                {
                  cwd: rootPath,
                },
              )

              if (fixStatusResult.stdout.trim()) {
                log.progress(`Committing fix for ${job.name}`)

                const changedFiles = fixStatusResult.stdout
                  .trim()
                  .split('\n')
                  .map(line => line.substring(3))
                  .join(', ')
                log.substep(`Changed files: ${changedFiles}`)

                // Stage all changes.
                await runCommand('git', ['add', '.'], { cwd: rootPath })

                // Generate commit message using Claude (non-interactive).
                log.progress(
                  `Generating commit message for ${job.name} fix with Claude`,
                )
                const commitMessage = await generateCommitMessage(
                  claudeCmd,
                  rootPath,
                  opts,
                )
                log.substep(`Commit message: ${commitMessage}`)

                // Validate before committing.
                const validation = await validateBeforePush(rootPath)
                if (!validation.valid) {
                  log.warn('Pre-commit validation warnings:')
                  validation.warnings.forEach(warning => {
                    log.substep(warning)
                  })
                }

                // Commit with generated message.
                const commitArgs = ['commit', '-m', commitMessage]
                if (useNoVerify) {
                  commitArgs.push('--no-verify')
                }
                const commitResult = await runCommandWithOutput(
                  'git',
                  commitArgs,
                  {
                    cwd: rootPath,
                  },
                )

                if (commitResult.exitCode === 0) {
                  fixCount++
                  log.done(`Committed fix for ${job.name}`)
                  hasPendingCommits = true
                } else {
                  log.warn(
                    `Git commit failed: ${commitResult.stderr || commitResult.stdout}`,
                  )
                }
              } else {
                log.substep(`No changes to commit for ${job.name}`)
              }

              // Mark this job as fixed.
              fixedJobs.set(job.name, true)
            }
          }

          // Show current status.
          if (fixedJobs.size > 0) {
            log.substep(
              `Fixed ${fixedJobs.size} job(s) so far (commits pending push)`,
            )
          }
        } catch (e) {
          log.warn(`Failed to parse job data: ${e.message}`)
        }
      }

      // Wait and check again with adaptive polling.
      // Jobs are running, so poll more frequently.
      const delay = calculatePollDelay('in_progress', pollAttempt, true)
      log.substep(`Checking again in ${delay / 1000}s...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      pollAttempt++
    }
  }

  log.error(`Exceeded maximum retries (${maxRetries})`)
  return false
}

export { runGreen }
