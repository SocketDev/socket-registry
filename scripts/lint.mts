/**
 * @fileoverview Unified lint runner with flag-based configuration.
 * Provides smart linting that can target affected files or lint everything.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { isQuiet } from '@socketsecurity/lib/argv/flags'
import { parseArgs } from '@socketsecurity/lib/argv/parse'
import { getChangedFiles, getStagedFiles } from '@socketsecurity/lib/git'
import { getDefaultLogger } from '@socketsecurity/lib/logger'
import { printHeader } from '@socketsecurity/lib/stdio/header'
import { minimatch } from 'minimatch'

import { runCommandQuiet } from './utils/run-command.mts'

const logger = getDefaultLogger()

// Glob patterns for changes that trigger a full lint (matched with minimatch).
const FULL_LINT_TRIGGERS = [
  '.config/**',
  'scripts/utils/**',
  'pnpm-lock.yaml',
  'tsconfig*.json',
  '.oxlintrc.json',
  '.oxfmtrc.json',
]

/**
 * Get oxfmt exclude patterns from .oxfmtrc.json.
 */
function getOxfmtExcludePatterns(): string[] {
  try {
    const oxfmtConfigPath = path.join(process.cwd(), '.oxfmtrc.json')
    if (!existsSync(oxfmtConfigPath)) {
      return []
    }

    const oxfmtConfig = JSON.parse(readFileSync(oxfmtConfigPath, 'utf8'))
    return oxfmtConfig['ignorePatterns'] ?? []
  } catch {
    // If we can't read .oxfmtrc.json, return empty array.
    return []
  }
}

/**
 * Check if a file matches any of the exclude patterns.
 */
function isExcludedByOxfmt(file: string, excludePatterns: string[]): boolean {
  for (const pattern of excludePatterns) {
    // Convert glob pattern to regex-like matching.
    // Support **/ for directory wildcards and * for filename wildcards.
    const regexPattern = pattern
      // **/ matches any directory.
      .replace(/\*\*\//g, '.*')
      // * matches any characters except /.
      .replace(/\*/g, '[^/]*')
      // Escape dots.
      .replace(/\./g, '\\.')

    const regex = new RegExp(`^${regexPattern}$`)
    if (regex.test(file)) {
      return true
    }
  }
  return false
}

/**
 * Check if we should run all linters based on changed files.
 */
function shouldRunAllLinters(changedFiles: string[]): {
  runAll: boolean
  reason?: string
} {
  for (const file of changedFiles) {
    for (const pattern of FULL_LINT_TRIGGERS) {
      if (minimatch(file, pattern)) {
        return { runAll: true, reason: 'config files changed' }
      }
    }
  }

  return { runAll: false }
}

/**
 * Filter files to only those that should be linted.
 */
function filterLintableFiles(files: string[]): string[] {
  // Only include extensions actually supported by oxfmt/oxlint
  const lintableExtensions = new Set([
    '.js',
    '.mjs',
    '.cjs',
    '.ts',
    '.cts',
    '.mts',
  ])

  const oxfmtExcludePatterns = getOxfmtExcludePatterns()

  return files.filter(file => {
    const ext = path.extname(file)
    // Only lint files that have lintable extensions AND still exist.
    if (!lintableExtensions.has(ext) || !existsSync(file)) {
      return false
    }

    // Filter out files excluded by .oxfmtrc.json.
    if (isExcludedByOxfmt(file, oxfmtExcludePatterns)) {
      return false
    }

    return true
  })
}

/**
 * Check if an oxfmt result indicates no files were processed (not a real error).
 * Covers exit 2 ("Expected at least one target file" — all files ignored by config)
 * and exit 1 ("No files were processed in the specified paths" — no path matches).
 */
function isOxfmtNoFilesResult(result: { stderr?: string }): boolean {
  const { stderr } = result
  return (
    (stderr?.includes('Expected at least one target file') ||
      stderr?.includes('No files were processed in the specified paths')) ??
    false
  )
}

/**
 * Run linters on specific files.
 */
interface LintOptions {
  fix?: boolean
  quiet?: boolean
}

async function runLintOnFiles(
  files: string[],
  options: LintOptions = {},
): Promise<number> {
  const { fix = false, quiet = false } = options

  if (!files.length) {
    logger.substep('No files to lint')
    return 0
  }

  if (!quiet) {
    logger.progress(`Linting ${files.length} file(s)`)
  }

  // Build the linter configurations.
  const linters = [
    {
      args: ['exec', 'oxfmt', ...(fix ? ['--write'] : ['--check']), ...files],
      name: 'oxfmt',
      enabled: true,
    },
    {
      args: ['exec', 'oxlint', ...(fix ? ['--fix'] : []), ...files],
      name: 'oxlint',
      enabled: true,
    },
  ]

  for (const { args, enabled } of linters) {
    if (!enabled) {
      continue
    }

    const result = await runCommandQuiet('pnpm', args)

    if (result.exitCode !== 0) {
      if (isOxfmtNoFilesResult(result)) {
        // oxfmt had nothing to do - this is fine, continue to next linter.
        continue
      }

      // When fixing, non-zero exit codes are normal if fixes were applied.
      if (!fix || (result.stderr && result.stderr.trim().length > 0)) {
        if (!quiet) {
          logger.error('Linting failed')
        }
        if (result.stderr) {
          logger.error(result.stderr)
        }
        if (result.stdout && !fix) {
          logger.log(result.stdout)
        }
        return result.exitCode
      }
    }
  }

  if (!quiet) {
    logger.clearLine().done('Linting passed')
    // Add newline after message (use error to write to same stream)
    logger.error('')
  }

  return 0
}

/**
 * Run linters on all files.
 */
async function runLintOnAll(options: LintOptions = {}): Promise<number> {
  const { fix = false, quiet = false } = options

  if (!quiet) {
    logger.progress('Linting all files')
  }

  const linters = [
    {
      args: ['exec', 'oxfmt', ...(fix ? ['--write'] : ['--check']), '.'],
      name: 'oxfmt',
    },
    {
      args: ['exec', 'oxlint', ...(fix ? ['--fix'] : []), '.'],
      name: 'oxlint',
    },
  ]

  for (const { args } of linters) {
    const result = await runCommandQuiet('pnpm', args)

    if (result.exitCode !== 0) {
      if (isOxfmtNoFilesResult(result)) {
        // oxfmt had nothing to do - this is fine, continue to next linter.
        continue
      }

      // When fixing, non-zero exit codes are normal if fixes were applied.
      if (!fix || (result.stderr && result.stderr.trim().length > 0)) {
        if (!quiet) {
          logger.error('Linting failed')
        }
        if (result.stderr) {
          logger.error(result.stderr)
        }
        if (result.stdout && !fix) {
          logger.log(result.stdout)
        }
        return result.exitCode
      }
    }
  }

  if (!quiet) {
    logger.clearLine().done('Linting passed')
    // Add newline after message (use error to write to same stream)
    logger.error('')
  }

  return 0
}

/**
 * Get files to lint based on options.
 */
interface GetFilesToLintOptions {
  all?: boolean
  changed?: boolean
  staged?: boolean
}

interface FilesToLintResult {
  files: string[] | 'all' | undefined
  reason?: string
  mode: string
}

async function getFilesToLint(
  options: GetFilesToLintOptions,
): Promise<FilesToLintResult> {
  const { all, changed, staged } = options

  // If --all, return early
  if (all) {
    return { files: 'all', reason: 'all flag specified', mode: 'all' }
  }

  // Get changed files
  let changedFiles = []
  // Track what mode we're in
  let mode = 'changed'

  if (staged) {
    mode = 'staged'
    changedFiles = await getStagedFiles({ absolute: false })
    if (!changedFiles.length) {
      return { files: undefined, reason: 'no staged files', mode }
    }
  } else if (changed) {
    mode = 'changed'
    changedFiles = await getChangedFiles({ absolute: false })
    if (!changedFiles.length) {
      return { files: undefined, reason: 'no changed files', mode }
    }
  } else {
    // Default to changed files if no specific flag
    mode = 'changed'
    changedFiles = await getChangedFiles({ absolute: false })
    if (!changedFiles.length) {
      return { files: undefined, reason: 'no changed files', mode }
    }
  }

  // Check if we should run all based on changed files
  const { reason, runAll } = shouldRunAllLinters(changedFiles)
  if (runAll && reason) {
    return { files: 'all', reason, mode: 'all' }
  }

  // Filter to lintable files
  const lintableFiles = filterLintableFiles(changedFiles)
  if (!lintableFiles.length) {
    return { files: undefined, reason: 'no lintable files changed', mode }
  }

  return { files: lintableFiles, mode }
}

async function main(): Promise<void> {
  try {
    // Parse arguments
    const { positionals, values } = parseArgs({
      options: {
        help: {
          type: 'boolean',
          default: false,
        },
        fix: {
          type: 'boolean',
          default: false,
        },
        all: {
          type: 'boolean',
          default: false,
        },
        changed: {
          type: 'boolean',
          default: false,
        },
        staged: {
          type: 'boolean',
          default: false,
        },
        quiet: {
          type: 'boolean',
          default: false,
        },
        silent: {
          type: 'boolean',
          default: false,
        },
      },
      allowPositionals: true,
      strict: false,
    })

    // Show help if requested
    if (values.help) {
      logger.log('Lint Runner')
      logger.log('\nUsage: pnpm lint [options] [files...]')
      logger.log('\nOptions:')
      logger.log('  --help         Show this help message')
      logger.log('  --fix          Automatically fix problems')
      logger.log('  --all          Lint all files')
      logger.log('  --changed      Lint changed files (default behavior)')
      logger.log('  --staged       Lint staged files')
      logger.log('  --quiet, --silent  Suppress progress messages')
      logger.log('\nExamples:')
      logger.log('  pnpm lint                   # Lint changed files (default)')
      logger.log('  pnpm lint --fix             # Fix issues in changed files')
      logger.log('  pnpm lint --all             # Lint all files')
      logger.log('  pnpm lint --staged --fix    # Fix issues in staged files')
      logger.log('  pnpm lint src/index.ts      # Lint specific file(s)')
      process.exitCode = 0
      return
    }

    const quiet = isQuiet(values)
    const fix = Boolean(values['fix'])

    if (!quiet) {
      printHeader('Lint Runner')
      logger.log('')
    }

    let exitCode = 0

    // Handle positional arguments (specific files)
    if (positionals.length > 0) {
      const files = filterLintableFiles(positionals)
      if (!quiet) {
        logger.step('Linting specified files')
      }
      exitCode = await runLintOnFiles(files, {
        fix,
        quiet,
      })
    } else {
      // Get files to lint based on flags
      const { files, mode, reason } = await getFilesToLint(values)

      if (files === undefined) {
        if (!quiet) {
          logger.step('Skipping lint')
          logger.substep(reason)
        }
        exitCode = 0
      } else if (files === 'all') {
        if (!quiet) {
          logger.step(`Linting all files (${reason})`)
        }
        exitCode = await runLintOnAll({
          fix,
          quiet,
        })
      } else {
        if (!quiet) {
          const modeText = mode === 'staged' ? 'staged' : 'changed'
          logger.step(`Linting ${modeText} files`)
        }
        exitCode = await runLintOnFiles(files, {
          fix,
          quiet,
        })
      }
    }

    if (exitCode !== 0) {
      if (!quiet) {
        logger.error('')
        logger.log('Lint failed')
      }
      process.exitCode = exitCode
    } else {
      if (!quiet) {
        logger.log('')
        logger.success('All lint checks passed!')
      }
    }
  } catch (e) {
    logger.error(`Lint runner failed: ${(e as Error).message}`)
    process.exitCode = 1
  }
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
