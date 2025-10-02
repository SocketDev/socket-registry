/** @fileoverview Analyzes CI failure logs and suggests fixes based on known patterns. */

import { promises as fs } from 'node:fs'

import parseArgsModule from '../../registry/dist/lib/parse-args.js'
import loggerModule from '../../registry/dist/lib/logger.js'

const { parseArgs } = parseArgsModule
const { logger } = loggerModule

const { values: cliArgs } = parseArgs({
  options: {
    'log-file': {
      type: 'string',
    },
    'log-url': {
      type: 'string',
    },
    verbose: {
      type: 'boolean',
      default: false,
    },
  },
  strict: false,
})

/**
 * Failure pattern definitions for automated CI log analysis.
 * Each pattern includes:
 * - pattern: Regex to match error in logs
 * - category: Human-readable category for grouping
 * - severity: 'error' or 'warning'
 * - extract: Optional function to extract specific details from match
 * - suggestions: Actionable fixes for this failure type
 */
const FAILURE_PATTERNS = {
  // Module resolution and import errors.
  MODULE_NOT_FOUND: {
    category: 'Module Resolution',
    extract: match => ({ module: match[1] }),
    pattern: /Cannot find module ['"]([^'"]+)['"]/,
    severity: 'error',
    suggestions: [
      'Check if the module path is correct',
      'Verify the module is listed in package.json dependencies',
      'Ensure build artifacts are committed if required',
      'Check for .pnpm directory references (should use regular imports)',
      'Verify entry points in package.json (main/exports) exist',
    ],
  },
  NO_TEST_FILES: {
    pattern: /No test files found/i,
    category: 'Missing Tests',
    severity: 'warning',
    suggestions: [
      'Add test files to test/, tests/, or __tests__ directory',
      'Verify test script in package.json points to correct location',
      'Check if test files have correct extensions (.test.js, .test.mjs)',
      'Ensure test files are not in .gitignore',
    ],
  },
  ESLINT_PLUGIN_FAILED: {
    pattern:
      /Failed to load plugin ['"]([^'"]+)['"] declared in ['"]([^'"]+)['"]/,
    category: 'ESLint Configuration',
    severity: 'error',
    extract: match => ({ plugin: match[1], config: match[2] }),
    suggestions: [
      'Add missing ESLint plugin to devDependencies',
      'Remove plugin from ESLint config if not needed',
      'Consider removing .eslintrc if not essential for package',
      'Verify plugin version compatibility',
    ],
  },
  PARSING_ERROR: {
    pattern: /Parse error|Parsing error|Unexpected token/i,
    category: 'Syntax/Parsing',
    severity: 'error',
    suggestions: [
      'Check JavaScript/TypeScript syntax in the file',
      'Verify file encoding is UTF-8',
      'Check for binary files incorrectly treated as text',
      'Ensure build step completed successfully',
    ],
  },
  PNPM_DEPENDENCY_ERROR: {
    pattern: /\.pnpm\/([^/]+)/,
    category: 'Module Resolution',
    severity: 'error',
    extract: match => ({ pnpmPath: match[1] }),
    suggestions: [
      'Replace direct .pnpm references with regular imports',
      'Use package name instead of .pnpm path',
      'Check if dependency hoisting is causing issues',
      'Verify pnpm workspace configuration',
    ],
  },
  BUILD_ARTIFACT_MISSING: {
    pattern: /build\/([^\s]+).*not found/i,
    category: 'Build Artifacts',
    severity: 'error',
    extract: match => ({ artifact: match[1] }),
    suggestions: [
      'Run build step before testing',
      'Commit required build artifacts to git',
      'Verify build script in package.json',
      "Check .gitignore isn't excluding required files",
    ],
  },
  TIMEOUT: {
    pattern: /Timed? out|timeout|ETIMEDOUT/i,
    category: 'Timeout',
    severity: 'error',
    suggestions: [
      'Increase timeout in test configuration',
      'Check for infinite loops or hanging promises',
      'Verify network-dependent tests have proper mocks',
      'Check if CI resources are constrained',
    ],
  },
  PATH_RESOLUTION: {
    pattern: /ENOENT.*['"]([^'"]+)['"]/,
    category: 'Path Resolution',
    severity: 'error',
    extract: match => ({ path: match[1] }),
    suggestions: [
      'Use path.join() instead of hard-coded path separators',
      'Use os.tmpdir() for temporary directories',
      'Check for POSIX-specific paths (use path.join())',
      'Verify file exists and path is correct',
    ],
  },
}

/**
 * Fetch log content from URL or file.
 */
async function fetchLogContent() {
  if (cliArgs.logFile) {
    return await fs.readFile(cliArgs.logFile, 'utf8')
  }

  if (cliArgs.logUrl) {
    // Use native fetch in Node.js 18+.
    const response = await fetch(cliArgs.logUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch log: ${response.statusText}`)
    }
    return await response.text()
  }

  throw new Error('Must provide --log-file or --log-url')
}

/**
 * Parse package name from log line.
 */
function extractPackageName(line) {
  // Try various patterns to extract package name.
  const patterns = [
    /Testing package: ([^\s]+)/,
    /Package: ([^\s]+)/,
    /npm\/([^/\s]+)/,
    /@socketregistry\/([^\s]+)/,
  ]

  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

/**
 * Analyze log content for failure patterns.
 */
function analyzeLog(logContent) {
  const lines = logContent.split('\n')
  const failures = []
  let currentPackage = null

  for (const line of lines) {
    // Track current package being tested.
    const packageName = extractPackageName(line)
    if (packageName) {
      currentPackage = packageName
    }

    // Check each failure pattern.
    for (const { 0: patternName, 1: patternDef } of Object.entries(
      FAILURE_PATTERNS,
    )) {
      const match = line.match(patternDef.pattern)
      if (match) {
        const failure = {
          type: patternName,
          category: patternDef.category,
          severity: patternDef.severity,
          line,
          package: currentPackage,
          suggestions: patternDef.suggestions,
        }

        if (patternDef.extract) {
          failure.details = patternDef.extract(match)
        }

        failures.push(failure)
      }
    }
  }

  return failures
}

/**
 * Group failures by category and package.
 */
function groupFailures(failures) {
  const byCategory = { __proto__: null }
  const byPackage = { __proto__: null }

  for (const failure of failures) {
    // Group by category.
    if (!byCategory[failure.category]) {
      byCategory[failure.category] = []
    }
    byCategory[failure.category].push(failure)

    // Group by package.
    if (failure.package) {
      if (!byPackage[failure.package]) {
        byPackage[failure.package] = []
      }
      byPackage[failure.package].push(failure)
    }
  }

  return { byCategory, byPackage }
}

/**
 * Generate fix recommendations.
 */
function generateRecommendations(failures, grouped) {
  const recommendations = []

  // Category-level recommendations.
  for (const { 0: category, 1: categoryFailures } of Object.entries(
    grouped.byCategory,
  )) {
    if (categoryFailures.length === 0) {
      continue
    }

    recommendations.push({
      level: 'category',
      category,
      count: categoryFailures.length,
      suggestions: categoryFailures[0].suggestions,
    })
  }

  // Package-level recommendations.
  for (const { 0: packageName, 1: packageFailures } of Object.entries(
    grouped.byPackage,
  )) {
    if (packageFailures.length === 0) {
      continue
    }

    recommendations.push({
      level: 'package',
      package: packageName,
      count: packageFailures.length,
      issues: packageFailures.map(f => ({
        category: f.category,
        details: f.details,
      })),
      actions: [
        `Run: node scripts/validate-package-tests.mjs --package ${packageName} --verbose`,
        `Reproduce: node scripts/reproduce-ci-locally.mjs --package ${packageName}`,
      ],
    })
  }

  return recommendations
}

/**
 * Format analysis results for display.
 */
function formatResults(failures, recommendations) {
  logger.info('=== CI Failure Analysis ===\n')

  if (failures.length === 0) {
    logger.success('No failures detected in log')
    return
  }

  logger.info(`Found ${failures.length} failure(s)\n`)

  // Display category summary.
  logger.info('--- Failures by Category ---')
  const categoryRecs = recommendations.filter(r => r.level === 'category')
  for (const rec of categoryRecs) {
    logger.warn(`${rec.category}: ${rec.count} occurrence(s)`)
  }

  logger.info('\n--- Affected Packages ---')
  const packageRecs = recommendations.filter(r => r.level === 'package')
  for (const rec of packageRecs) {
    logger.error(`${rec.package}: ${rec.count} issue(s)`)
    for (const issue of rec.issues) {
      logger.info(
        `  - ${issue.category}${issue.details ? `: ${JSON.stringify(issue.details)}` : ''}`,
      )
    }
  }

  // Display recommendations.
  logger.info('\n--- Recommended Actions ---')
  for (const rec of packageRecs) {
    logger.info(`\nPackage: ${rec.package}`)
    for (const action of rec.actions) {
      logger.info(`  ${action}`)
    }
  }

  // Display general suggestions.
  logger.info('\n--- General Suggestions ---')
  const uniqueCategories = [...new Set(categoryRecs.map(r => r.category))]
  for (const category of uniqueCategories) {
    const rec = categoryRecs.find(r => r.category === category)
    logger.info(`\n${category}:`)
    for (const suggestion of rec.suggestions) {
      logger.info(`  - ${suggestion}`)
    }
  }

  // Verbose output.
  if (cliArgs.verbose) {
    logger.info('\n--- Detailed Failures ---')
    for (const failure of failures) {
      logger.info(
        `\n[${failure.severity.toUpperCase()}] ${failure.category} (${failure.package || 'unknown'})`,
      )
      logger.info(`  Line: ${failure.line}`)
      if (failure.details) {
        logger.info(`  Details: ${JSON.stringify(failure.details, null, 2)}`)
      }
    }
  }
}

/**
 * Main analysis flow.
 */
async function main() {
  try {
    logger.info('Fetching CI log...')
    const logContent = await fetchLogContent()

    logger.info('Analyzing failures...')
    const failures = analyzeLog(logContent)
    const grouped = groupFailures(failures)
    const recommendations = generateRecommendations(failures, grouped)

    formatResults(failures, recommendations)

    if (failures.some(f => f.severity === 'error')) {
      process.exitCode = 1
    }
  } catch (e) {
    logger.error(`Analysis failed: ${e.message}`)
    if (cliArgs.verbose) {
      logger.error(e.stack)
    }
    process.exitCode = 1
  }
}

main()
