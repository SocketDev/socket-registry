/**
 * @fileoverview Coverage script that runs tests with coverage reporting.
 * Masks test output and shows only the coverage summary.
 *
 * Options:
 *   --code-only  Run only code coverage (skip type coverage)
 *   --type-only  Run only type coverage (skip code coverage)
 *   --summary    Show only coverage summary (hide detailed output)
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseArgs } from '@socketsecurity/lib/argv/parse'
import { getDefaultLogger } from '@socketsecurity/lib/logger'
import { spawn } from '@socketsecurity/lib/spawn'
import { printHeader } from '@socketsecurity/lib/stdio/header'

import { runCommandQuiet } from './utils/run-command.mjs'

const logger = getDefaultLogger()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..')

// Prepare environment with memory limits.
const envWithMemoryLimits = {
  ...process.env,
  // Enable coverage detection in vitest configs.
  COVERAGE: 'true',
  // Memory limits: CI gets 8GB, local development gets 2GB to prevent system strain.
  NODE_OPTIONS:
    `${process.env.NODE_OPTIONS || ''} --max-old-space-size=${process.env.CI ? 8192 : 2048} --unhandled-rejections=warn`.trim(),
}

// Parse custom flags
const { values } = parseArgs({
  options: {
    'code-only': { type: 'boolean', default: false },
    'type-only': { type: 'boolean', default: false },
    summary: { type: 'boolean', default: false },
  },
  strict: false,
})

printHeader('Test Coverage')
logger.log('')

// Rebuild with source maps enabled for coverage
logger.info('Building with source maps for coverage...')
const buildResult = await spawn('node', ['scripts/build.mjs'], {
  cwd: rootPath,
  stdio: 'inherit',
  env: envWithMemoryLimits,
})
if (buildResult.code !== 0) {
  logger.error('Build with source maps failed')
  process.exitCode = 1
  process.exit(1)
}
logger.log('')

// Run vitest with coverage enabled, capturing output
// Filter out custom flags that vitest doesn't understand
const customFlags = ['--code-only', '--type-only', '--summary']
const vitestArgs = [
  'exec',
  'vitest',
  'run',
  '--coverage',
  // Exclude packages test - it imports all 200+ npm packages which pollutes coverage
  '--exclude=test/packages.test.mts',
  ...process.argv.slice(2).filter(arg => !customFlags.includes(arg)),
]
const typeCoverageArgs = ['exec', 'type-coverage']

try {
  let exitCode = 0
  let codeCoverageResult
  let typeCoverageResult

  // Handle --type-only flag
  if (values['type-only']) {
    typeCoverageResult = await runCommandQuiet('pnpm', typeCoverageArgs, {
      cwd: rootPath,
      env: envWithMemoryLimits,
    })
    exitCode = typeCoverageResult.exitCode

    // Display type coverage only
    const typeCoverageOutput = (
      typeCoverageResult.stdout + typeCoverageResult.stderr
    ).trim()
    const typeCoverageMatch = typeCoverageOutput.match(
      /\([\d\s/]+\)\s+([\d.]+)%/,
    )

    if (typeCoverageMatch) {
      const typeCoveragePercent = Number.parseFloat(typeCoverageMatch[1])
      logger.log('')
      logger.log(' Coverage Summary')
      logger.log(' ───────────────────────────────')
      logger.log(` Type Coverage: ${typeCoveragePercent.toFixed(2)}%`)
      logger.log('')
    }
  }
  // Handle --code-only flag
  else if (values['code-only']) {
    codeCoverageResult = await runCommandQuiet('pnpm', vitestArgs, {
      cwd: rootPath,
      env: envWithMemoryLimits,
    })
    exitCode = codeCoverageResult.exitCode

    // Process code coverage output only
    // Remove ANSI codes, spinner artifacts, and other control characters.
    const ansiRegex = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')
    const output = (codeCoverageResult.stdout + codeCoverageResult.stderr)
      .replace(ansiRegex, '')
      // Remove common spinner/progress characters using alternation for Unicode safety.
      .replace(/✧|︎|⚡|✓|✗|⋆|✦|⎯/g, '')
      // Remove excessive whitespace left by removed characters.
      .replace(/\s*\n\s*\n/g, '\n')
      .trim()

    // Extract and display test summary - match test file and test counts separately for robustness.
    // Match the LAST occurrence of "Test Files" to get the final summary, not intermediate progress.
    const allTestFilesMatches = output.match(/Test Files\s+[^\n]+/g)
    const testFilesMatch = allTestFilesMatches?.[allTestFilesMatches.length - 1]

    // For other fields, match near the end of output by searching from after the last Test Files.
    const lastTestFilesIdx = output.lastIndexOf('Test Files')
    const endSection =
      lastTestFilesIdx >= 0 ? output.slice(lastTestFilesIdx) : output

    const testsMatch = endSection.match(/^\s*Tests\s+[^\n]+/m)
    const startAtMatch = endSection.match(/^\s*Start at\s+[^\n]+/m)
    const durationMatch = endSection.match(/^\s*Duration\s+[\d.]+[^\n]*/m)
    const testSummaryMatch =
      testFilesMatch && durationMatch
        ? {
            0: [
              testFilesMatch,
              testsMatch?.[0],
              startAtMatch?.[0],
              durationMatch?.[0],
            ]
              .filter(Boolean)
              .map(line => line.trim())
              .join('\n'),
          }
        : null
    if (!values.summary && testSummaryMatch) {
      logger.log('')
      logger.log(testSummaryMatch[0])
      logger.log('')
    }

    // Extract and display coverage summary
    const coverageHeaderMatch = output.match(
      / % Coverage report from v8\n([-|]+)\n([^\n]+)\n\1/,
    )
    const allFilesMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|[^\n]*/)

    if (coverageHeaderMatch && allFilesMatch) {
      if (!values.summary) {
        logger.log(' % Coverage report from v8')
        logger.log(coverageHeaderMatch[1])
        logger.log(coverageHeaderMatch[2])
        logger.log(coverageHeaderMatch[1])
        logger.log(allFilesMatch[0])
        logger.log(coverageHeaderMatch[1])
        logger.log('')
      }

      const codeCoveragePercent = Number.parseFloat(allFilesMatch[1])
      logger.log(' Coverage Summary')
      logger.log(' ───────────────────────────────')
      logger.log(` Code Coverage: ${codeCoveragePercent.toFixed(2)}%`)
      logger.log('')
    } else if (exitCode !== 0) {
      logger.log('\n--- Output ---')
      logger.log(output)
    }
  }
  // Default: run both code and type coverage
  else {
    codeCoverageResult = await runCommandQuiet('pnpm', vitestArgs, {
      cwd: rootPath,
      env: envWithMemoryLimits,
    })
    exitCode = codeCoverageResult.exitCode

    // Run type coverage
    typeCoverageResult = await runCommandQuiet('pnpm', typeCoverageArgs, {
      cwd: rootPath,
      env: envWithMemoryLimits,
    })

    // Combine and clean output - remove ANSI color codes and spinner artifacts.
    const ansiRegex = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')
    const output = (codeCoverageResult.stdout + codeCoverageResult.stderr)
      .replace(ansiRegex, '')
      // Remove common spinner/progress characters using alternation for Unicode safety.
      .replace(/✧|︎|⚡|✓|✗|⋆|✦|⎯/g, '')
      // Remove excessive whitespace left by removed characters.
      .replace(/\s*\n\s*\n/g, '\n')
      .trim()

    // Extract test summary - match test file and test counts separately for robustness.
    // Match the LAST occurrence of "Test Files" to get the final summary, not intermediate progress.
    const allTestFilesMatches = output.match(/Test Files\s+[^\n]+/g)
    const testFilesMatch = allTestFilesMatches?.[allTestFilesMatches.length - 1]

    // For other fields, match near the end of output by searching from after the last Test Files.
    const lastTestFilesIdx = output.lastIndexOf('Test Files')
    const endSection =
      lastTestFilesIdx >= 0 ? output.slice(lastTestFilesIdx) : output

    const testsMatch = endSection.match(/^\s*Tests\s+[^\n]+/m)
    const startAtMatch = endSection.match(/^\s*Start at\s+[^\n]+/m)
    const durationMatch = endSection.match(/^\s*Duration\s+[\d.]+[^\n]*/m)
    const testSummaryMatch =
      testFilesMatch && durationMatch
        ? {
            0: [
              testFilesMatch,
              testsMatch?.[0],
              startAtMatch?.[0],
              durationMatch?.[0],
            ]
              .filter(Boolean)
              .map(line => line.trim())
              .join('\n'),
          }
        : null

    // Extract coverage summary: header + All files row
    // Match from "% Coverage" header through the All files line and closing border
    const coverageHeaderMatch = output.match(
      / % Coverage report from v8\n([-|]+)\n([^\n]+)\n\1/,
    )
    const allFilesMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|[^\n]*/)

    // Extract type coverage percentage
    const typeCoverageOutput = (
      typeCoverageResult.stdout + typeCoverageResult.stderr
    ).trim()
    const typeCoverageMatch = typeCoverageOutput.match(
      /\([\d\s/]+\)\s+([\d.]+)%/,
    )

    // Display clean output
    if (!values.summary && testSummaryMatch) {
      logger.log('')
      logger.log(testSummaryMatch[0])
      logger.log('')
    }

    if (coverageHeaderMatch && allFilesMatch) {
      if (!values.summary) {
        logger.log(' % Coverage report from v8')
        // Top border.
        logger.log(coverageHeaderMatch[1])
        // Header row.
        logger.log(coverageHeaderMatch[2])
        // Middle border.
        logger.log(coverageHeaderMatch[1])
        // All files row.
        logger.log(allFilesMatch[0])
        // Bottom border.
        logger.log(coverageHeaderMatch[1])
        logger.log('')
      }

      // Display type coverage and cumulative summary
      if (typeCoverageMatch) {
        const codeCoveragePercent = Number.parseFloat(allFilesMatch[1])
        const typeCoveragePercent = Number.parseFloat(typeCoverageMatch[1])
        const cumulativePercent = (
          (codeCoveragePercent + typeCoveragePercent) /
          2
        ).toFixed(2)

        logger.log(' Coverage Summary')
        logger.log(' ───────────────────────────────')
        logger.log(` Type Coverage: ${typeCoveragePercent.toFixed(2)}%`)
        logger.log(` Code Coverage: ${codeCoveragePercent.toFixed(2)}%`)
        logger.log(' ───────────────────────────────')
        logger.log(` Cumulative:    ${cumulativePercent}%`)
        logger.log('')
      }
    }
  }

  if (exitCode === 0) {
    logger.success('Coverage completed successfully')
  } else {
    logger.error('Coverage failed')
  }

  process.exitCode = exitCode
} catch (error) {
  logger.error(`Coverage script failed: ${error.message}`)
  process.exitCode = 1
}
