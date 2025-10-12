/**
 * Common flag utilities for Socket CLI applications.
 * Provides consistent flag checking across all Socket projects.
 */

interface FlagValues {
  [key: string]: unknown
  quiet?: boolean
  silent?: boolean
  verbose?: boolean
  help?: boolean
  all?: boolean
  fix?: boolean
  force?: boolean
  'dry-run'?: boolean
  json?: boolean
  debug?: boolean
  watch?: boolean
  coverage?: boolean
  cover?: boolean
  update?: boolean
  staged?: boolean
  changed?: boolean
}

/**
 * Check if quiet/silent mode is enabled.
 */
export function isQuiet(values: FlagValues): boolean {
  return !!(values.quiet || values.silent)
}

/**
 * Check if verbose mode is enabled.
 */
export function isVerbose(values: FlagValues): boolean {
  return !!values.verbose
}

/**
 * Check if help flag is set.
 */
export function isHelp(values: FlagValues): boolean {
  return !!values.help
}

/**
 * Check if all flag is set.
 */
export function isAll(values: FlagValues): boolean {
  return !!values.all
}

/**
 * Check if fix/autofix mode is enabled.
 */
export function isFix(values: FlagValues): boolean {
  return !!values.fix
}

/**
 * Check if force mode is enabled.
 */
export function isForce(values: FlagValues): boolean {
  return !!values.force
}

/**
 * Check if dry-run mode is enabled.
 */
export function isDryRun(values: FlagValues): boolean {
  return !!values['dry-run']
}

/**
 * Check if JSON output is requested.
 */
export function isJson(values: FlagValues): boolean {
  return !!values.json
}

/**
 * Check if debug mode is enabled.
 */
export function isDebug(values: FlagValues): boolean {
  return !!values.debug
}

/**
 * Check if watch mode is enabled.
 */
export function isWatch(values: FlagValues): boolean {
  return !!values.watch
}

/**
 * Check if coverage mode is enabled.
 * Checks both 'coverage' and 'cover' flags.
 */
export function isCoverage(values: FlagValues): boolean {
  return !!(values.coverage || values.cover)
}

/**
 * Check if update mode is enabled (for snapshots, dependencies, etc).
 */
export function isUpdate(values: FlagValues): boolean {
  return !!values.update
}

/**
 * Check if staged files mode is enabled.
 */
export function isStaged(values: FlagValues): boolean {
  return !!values.staged
}

/**
 * Check if changed files mode is enabled.
 */
export function isChanged(values: FlagValues): boolean {
  return !!values.changed
}

/**
 * Get the appropriate log level based on flags.
 * Returns 'silent', 'error', 'warn', 'info', 'verbose', or 'debug'.
 */
export function getLogLevel(values: FlagValues): string {
  if (isQuiet(values)) {
    return 'silent'
  }
  if (isDebug(values)) {
    return 'debug'
  }
  if (isVerbose(values)) {
    return 'verbose'
  }
  return 'info'
}

/**
 * Common flag definitions for parseArgs configuration.
 * Can be spread into parseArgs options for consistency.
 */
export const COMMON_FLAGS = {
  all: {
    type: 'boolean' as const,
    default: false,
    description: 'Target all files',
  },
  changed: {
    type: 'boolean' as const,
    default: false,
    description: 'Target changed files',
  },
  coverage: {
    type: 'boolean' as const,
    default: false,
    description: 'Run with coverage',
  },
  cover: {
    type: 'boolean' as const,
    default: false,
    description: 'Run with coverage (alias)',
  },
  debug: {
    type: 'boolean' as const,
    default: false,
    description: 'Enable debug output',
  },
  'dry-run': {
    type: 'boolean' as const,
    default: false,
    description: 'Perform a dry run',
  },
  fix: {
    type: 'boolean' as const,
    default: false,
    description: 'Automatically fix issues',
  },
  force: {
    type: 'boolean' as const,
    default: false,
    description: 'Force the operation',
  },
  help: {
    type: 'boolean' as const,
    default: false,
    short: 'h',
    description: 'Show help',
  },
  json: {
    type: 'boolean' as const,
    default: false,
    description: 'Output as JSON',
  },
  quiet: {
    type: 'boolean' as const,
    default: false,
    short: 'q',
    description: 'Suppress output',
  },
  silent: {
    type: 'boolean' as const,
    default: false,
    description: 'Suppress all output',
  },
  staged: {
    type: 'boolean' as const,
    default: false,
    description: 'Target staged files',
  },
  update: {
    type: 'boolean' as const,
    default: false,
    short: 'u',
    description: 'Update snapshots/deps',
  },
  verbose: {
    type: 'boolean' as const,
    default: false,
    short: 'v',
    description: 'Verbose output',
  },
  watch: {
    type: 'boolean' as const,
    default: false,
    short: 'w',
    description: 'Watch mode',
  },
}
