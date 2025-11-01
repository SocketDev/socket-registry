/**
 * @fileoverview Error analysis and root cause detection.
 * Provides functions for analyzing errors, learning from history, and suggesting fix strategies.
 */

import crypto from 'node:crypto'
import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'

import colors from 'yoctocolors-cjs'

import { runCommandWithOutput } from './command-execution.mjs'
import { CLAUDE_HOME, log, rootPath, STORAGE_PATHS } from './config.mjs'

/**
 * Analyze error to identify root cause and suggest fix strategies.
 */
async function analyzeRootCause(claudeCmd, error, context = {}) {
  const ctx = { __proto__: null, ...context }
  const errorHash = hashError(error)

  // Check cache first.
  const cachePath = path.join(STORAGE_PATHS.cache, `analysis-${errorHash}.json`)
  try {
    if (existsSync(cachePath)) {
      const cached = JSON.parse(await fs.readFile(cachePath, 'utf8'))
      const age = Date.now() - cached.timestamp
      // Cache valid for 1 hour.
      if (age < 60 * 60 * 1000) {
        log.substep(colors.gray('Using cached analysis'))
        return cached.analysis
      }
    }
  } catch {
    // Ignore cache errors.
  }

  // Load error history for learning.
  const history = await loadErrorHistory()
  const similarErrors = findSimilarErrors(errorHash, history)

  log.progress('Analyzing root cause with Claude')

  const prompt = `You are an expert software engineer analyzing a CI/test failure.

**Error Output:**
\`\`\`
${error}
\`\`\`

**Context:**
- Check name: ${ctx.checkName || 'Unknown'}
- Repository: ${ctx.repoName || 'Unknown'}
- Previous attempts: ${ctx.attempts || 0}

${similarErrors.length > 0 ? `**Similar Past Errors:**\n${similarErrors.map(e => `- ${e.description}: ${e.outcome} (${e.strategy})`).join('\n')}\n` : ''}

**Task:** Analyze this error and provide a structured diagnosis.

**Output Format (JSON):**
{
  "rootCause": "Brief description of the actual problem (not symptoms)",
  "confidence": 85,  // 0-100% how certain you are
  "category": "type-error|lint|test-failure|build-error|env-issue|other",
  "isEnvironmental": false,  // true if likely GitHub runner/network/rate-limit issue
  "strategies": [
    {
      "name": "Fix type assertion",
      "probability": 90,  // 0-100% estimated success probability
      "description": "Add type assertion to resolve type mismatch",
      "reasoning": "Error shows TypeScript expecting string but got number"
    },
    {
      "name": "Update import",
      "probability": 60,
      "description": "Update import path or module resolution",
      "reasoning": "Might be module resolution issue"
    }
  ],
  "environmentalFactors": [
    "Check if GitHub runner has sufficient memory",
    "Verify network connectivity for package downloads"
  ],
  "explanation": "Detailed explanation of what's happening and why"
}

**Rules:**
- Be specific about the root cause, not just symptoms
- Rank strategies by success probability (highest first)
- Include 1-3 strategies maximum
- Mark as environmental if it's likely a runner/network/external issue
- Use confidence scores honestly (50-70% = uncertain, 80-95% = confident, 95-100% = very confident)`

  try {
    const result = await runCommandWithOutput(
      claudeCmd,
      [
        'code',
        '--non-interactive',
        '--output-format',
        'text',
        '--prompt',
        prompt,
      ],
      { cwd: rootPath },
    )

    if (result.exitCode !== 0) {
      log.warn('Analysis failed, proceeding without root cause info')
      return null
    }

    // Parse JSON response.
    const jsonMatch = result.stdout.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      log.warn('Could not parse analysis, proceeding without root cause info')
      return null
    }

    const analysis = JSON.parse(jsonMatch[0])

    // Cache the analysis.
    try {
      await fs.writeFile(
        cachePath,
        JSON.stringify(
          {
            analysis,
            errorHash,
            timestamp: Date.now(),
          },
          null,
          2,
        ),
      )
    } catch {
      // Ignore cache write errors.
    }

    return analysis
  } catch (e) {
    log.warn(`Analysis error: ${e.message}`)
    return null
  }
}

/**
 * Success celebration with stats.
 */
async function celebrateSuccess(costTracker, stats = {}) {
  const messages = [
    "🎉 CI is green! You're a legend!",
    "✨ All tests passed! Claude's got your back!",
    '🚀 Ship it! CI is happy!',
    '💚 Green as a well-tested cucumber!',
    '🏆 Victory! All checks passed!',
    '⚡ Flawless execution! CI approved!',
  ]

  const message = messages[Math.floor(Math.random() * messages.length)]
  log.success(message)

  // Show session stats.
  if (costTracker) {
    costTracker.showSessionSummary()
  }

  // Show fix details if available.
  if (stats.fixCount > 0) {
    console.log(colors.cyan('\n📊 Session Stats:'))
    console.log(`  Fixes applied: ${stats.fixCount}`)
    console.log(`  Retries: ${stats.retries || 0}`)
  }

  // Update success streak.
  try {
    const streakPath = path.join(CLAUDE_HOME, 'streak.json')
    let streak = { best: 0, current: 0, lastSuccess: null }
    if (existsSync(streakPath)) {
      streak = JSON.parse(await fs.readFile(streakPath, 'utf8'))
    }

    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    // Reset streak if last success was more than 24h ago.
    if (streak.lastSuccess && streak.lastSuccess < oneDayAgo) {
      streak.current = 1
    } else {
      streak.current += 1
    }

    streak.best = Math.max(streak.best, streak.current)
    streak.lastSuccess = now

    await fs.writeFile(streakPath, JSON.stringify(streak, null, 2))

    console.log(colors.cyan('\n🔥 Success Streak:'))
    console.log(`  Current: ${streak.current}`)
    console.log(`  Best: ${streak.best}`)
  } catch {
    // Ignore errors.
  }
}

/**
 * Display root cause analysis to user.
 */
function displayAnalysis(analysis) {
  if (!analysis) {
    return
  }

  console.log(colors.cyan('\n🔍 Root Cause Analysis:'))
  console.log(
    `  Cause: ${analysis.rootCause} ${colors.gray(`(${analysis.confidence}% confident)`)}`,
  )
  console.log(`  Category: ${analysis.category}`)

  if (analysis.isEnvironmental) {
    console.log(
      colors.yellow(
        '\n  ⚠ This appears to be an environmental issue (runner/network/external)',
      ),
    )
    if (analysis.environmentalFactors.length > 0) {
      console.log(colors.yellow('  Factors to check:'))
      analysis.environmentalFactors.forEach(factor => {
        console.log(colors.yellow(`    - ${factor}`))
      })
    }
  }

  if (analysis.strategies.length > 0) {
    console.log(
      colors.cyan('\n💡 Fix Strategies (ranked by success probability):'),
    )
    analysis.strategies.forEach((strategy, i) => {
      console.log(
        `  ${i + 1}. ${colors.bold(strategy.name)} ${colors.gray(`(${strategy.probability}%)`)}`,
      )
      console.log(`     ${strategy.description}`)
      console.log(colors.gray(`     ${strategy.reasoning}`))
    })
  }

  if (analysis.explanation) {
    console.log(colors.cyan('\n📖 Explanation:'))
    console.log(colors.gray(`  ${analysis.explanation}`))
  }
}

/**
 * Find similar errors from history.
 */
function findSimilarErrors(errorHash, history) {
  return history
    .filter(e => e.errorHash === errorHash && e.outcome === 'success')
    .slice(-3)
}

/**
 * Create a semantic hash of error output for tracking duplicate errors.
 * Normalizes errors to catch semantically identical issues with different line numbers.
 */
function hashError(errorOutput) {
  // Normalize error for semantic comparison.
  const normalized = errorOutput
    .trim()
    // Remove timestamps.
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^Z\s]*/g, 'TIMESTAMP')
    .replace(/\d{2}:\d{2}:\d{2}/g, 'TIME')
    // Remove line:column numbers (but keep file paths).
    .replace(/:\d+:\d+/g, ':*:*')
    .replace(/line \d+/gi, 'line *')
    .replace(/column \d+/gi, 'column *')
    // Remove specific SHAs and commit hashes.
    .replace(/\b[0-9a-f]{7,40}\b/g, 'SHA')
    // Remove absolute file system paths (keep relative paths).
    .replace(/\/[^\s]*?\/([^/\s]+)/g, '$1')
    // Normalize whitespace.
    .replace(/\s+/g, ' ')
    // Take first 500 chars (increased from 200 for better matching).
    .slice(0, 500)

  // Use proper cryptographic hashing for consistent results.
  return crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')
    .slice(0, 16)
}

/**
 * Load error history from storage.
 */
async function loadErrorHistory() {
  const historyPath = path.join(CLAUDE_HOME, 'error-history.json')
  try {
    if (existsSync(historyPath)) {
      const data = JSON.parse(await fs.readFile(historyPath, 'utf8'))
      // Only return recent history (last 100 errors).
      return data.errors.slice(-100)
    }
  } catch {
    // Ignore errors.
  }
  return []
}

/**
 * Run proactive pre-commit scan to catch likely CI failures.
 */
async function runPreCommitScan(claudeCmd) {
  log.step('Running proactive pre-commit scan')

  const staged = await runCommandWithOutput(
    'git',
    ['diff', '--cached', '--name-only'],
    {
      cwd: rootPath,
    },
  )

  if (!staged.stdout.trim()) {
    log.substep('No staged files to scan')
    return { issues: [], safe: true }
  }

  const files = staged.stdout.trim().split('\n')
  log.substep(`Scanning ${files.length} staged file(s)`)

  const diff = await runCommandWithOutput('git', ['diff', '--cached'], {
    cwd: rootPath,
  })

  const prompt = `You are performing a quick pre-commit scan to catch likely CI failures.

**Staged Changes:**
\`\`\`diff
${diff.stdout}
\`\`\`

**Task:** Analyze these changes for potential CI failures.

**Check for:**
- Type errors
- Lint violations (missing semicolons, unused vars, etc.)
- Breaking API changes
- Missing tests for new functionality
- console.log statements
- debugger statements
- .only() or .skip() in tests

**Output Format (JSON):**
{
  "issues": [
    {
      "severity": "high|medium|low",
      "type": "type-error|lint|test|other",
      "description": "Brief description of the issue",
      "file": "path/to/file.ts",
      "confidence": 85
    }
  ],
  "safe": false
}

**Rules:**
- Only report issues with >60% confidence
- Be specific about file and line if possible
- Mark safe=true if no issues found
- Don't report style issues that auto-fix will handle`

  try {
    const result = await runCommandWithOutput(
      claudeCmd,
      [
        'code',
        '--non-interactive',
        '--output-format',
        'text',
        '--prompt',
        prompt,
      ],
      { cwd: rootPath, timeout: 30_000 },
    )

    if (result.exitCode !== 0) {
      log.substep('Scan completed (no issues detected)')
      return { issues: [], safe: true }
    }

    // Parse JSON response.
    const jsonMatch = result.stdout.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { issues: [], safe: true }
    }

    const scan = JSON.parse(jsonMatch[0])
    return scan
  } catch (e) {
    log.warn(`Scan error: ${e.message}`)
    return { issues: [], safe: true }
  }
}

/**
 * Save error outcome to history for learning.
 */
async function saveErrorHistory(errorHash, outcome, strategy, description) {
  const historyPath = path.join(CLAUDE_HOME, 'error-history.json')
  try {
    let data = { errors: [] }
    if (existsSync(historyPath)) {
      data = JSON.parse(await fs.readFile(historyPath, 'utf8'))
    }

    // 'success' | 'failed'
    data.errors.push({
      description,
      errorHash,
      outcome,
      strategy,
      timestamp: Date.now(),
    })

    // Keep only last 200 errors.
    if (data.errors.length > 200) {
      data.errors = data.errors.slice(-200)
    }

    await fs.writeFile(historyPath, JSON.stringify(data, null, 2))
  } catch {
    // Ignore errors.
  }
}

export {
  analyzeRootCause,
  celebrateSuccess,
  displayAnalysis,
  findSimilarErrors,
  hashError,
  loadErrorHistory,
  runPreCommitScan,
  saveErrorHistory,
}
