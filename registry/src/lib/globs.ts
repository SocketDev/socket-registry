/**
 * @fileoverview Glob pattern matching utilities with default ignore patterns.
 * Provides file filtering and glob matcher functions for npm-like behavior.
 */

const { freeze: ObjectFreeze } = Object

// Type definitions
type Pattern = string

interface FastGlobOptions {
  absolute?: boolean
  baseNameMatch?: boolean
  braceExpansion?: boolean
  caseSensitiveMatch?: boolean
  concurrency?: number
  cwd?: string
  deep?: number
  dot?: boolean
  extglob?: boolean
  followSymbolicLinks?: boolean
  fs?: any
  globstar?: boolean
  ignore?: string[]
  ignoreFiles?: string[]
  markDirectories?: boolean
  objectMode?: boolean
  onlyDirectories?: boolean
  onlyFiles?: boolean
  stats?: boolean
  suppressErrors?: boolean
  throwErrorOnBrokenSymbolicLink?: boolean
  unique?: boolean
}

export interface GlobOptions extends FastGlobOptions {
  ignoreOriginals?: boolean
  recursive?: boolean
}

export type { Pattern, FastGlobOptions }

export const defaultIgnore = ObjectFreeze([
  // Most of these ignored files can be included specifically if included in the
  // files globs. Exceptions to this are:
  // https://docs.npmjs.com/cli/v10/configuring-npm/package-json#files
  // These can NOT be included.
  // https://github.com/npm/npm-packlist/blob/v10.0.0/lib/index.js#L280
  '**/.git',
  '**/.npmrc',
  // '**/bun.lockb?',
  '**/node_modules',
  // '**/package-lock.json',
  // '**/pnpm-lock.ya?ml',
  // '**/yarn.lock',
  // Include npm-packlist defaults:
  // https://github.com/npm/npm-packlist/blob/v10.0.0/lib/index.js#L15-L38
  '**/.DS_Store',
  '**/.gitignore',
  '**/.hg',
  '**/.lock-wscript',
  '**/.npmignore',
  '**/.svn',
  '**/.wafpickle-*',
  '**/.*.swp',
  '**/._*/**',
  '**/archived-packages/**',
  '**/build/config.gypi',
  '**/CVS',
  '**/npm-debug.log',
  '**/*.orig',
  // Inline generic socket-registry .gitignore entries.
  '**/.env',
  '**/.eslintcache',
  '**/.nvm',
  '**/.tap',
  '**/.vscode',
  '**/*.tsbuildinfo',
  '**/Thumbs.db',
  // Inline additional ignores.
  '**/bower_components',
])

let _picomatch: typeof import('picomatch') | undefined
/**
 * Lazily load the picomatch module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getPicomatch() {
  if (_picomatch === undefined) {
    // The 'picomatch' package is browser safe.
    _picomatch = /*@__PURE__*/ require('../external/picomatch').default
  }
  return _picomatch!
}

let _fastGlob: typeof import('fast-glob') | undefined
/**
 * Lazily load the fast-glob module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getFastGlob() {
  if (_fastGlob === undefined) {
    _fastGlob = /*@__PURE__*/ require('../external/fast-glob').default
  }
  return _fastGlob!
}

/**
 * Create a stream of license file paths matching glob patterns.
 */
/*@__NO_SIDE_EFFECTS__*/
export function globStreamLicenses(
  dirname: string,
  options?: GlobOptions,
): any {
  const {
    ignore: ignoreOpt,
    ignoreOriginals,
    recursive,
    ...globOptions
  } = { __proto__: null, ...options } as GlobOptions
  const ignore = [
    ...(Array.isArray(ignoreOpt) ? ignoreOpt : defaultIgnore),
    '**/*.{cjs,cts,js,json,mjs,mts,ts}',
  ]
  if (ignoreOriginals) {
    ignore.push(
      /*@__PURE__*/ require('./constants/LICENSE_ORIGINAL_GLOB_RECURSIVE')
        .default,
    )
  }
  const fastGlob = getFastGlob()
  return fastGlob.globStream(
    [
      recursive
        ? /*@__PURE__*/ require('./constants/LICENSE_GLOB_RECURSIVE').default
        : /*@__PURE__*/ require('./constants/LICENSE_GLOB').default,
    ],
    {
      absolute: true,
      caseSensitiveMatch: false,
      cwd: dirname,
      ...globOptions,
      ...(ignore ? { ignore } : {}),
      __proto__: null,
    } as any,
  )
}

const matcherCache = new Map()
/**
 * Get a cached glob matcher function.
 */
/*@__NO_SIDE_EFFECTS__*/
export function getGlobMatcher(
  glob: Pattern | Pattern[],
  options?: any,
): (path: string) => boolean {
  const patterns = Array.isArray(glob) ? glob : [glob]
  const key = JSON.stringify({ patterns, options })
  let matcher = matcherCache.get(key)
  if (matcher) {
    return matcher
  }

  // Separate positive and negative patterns.
  const positivePatterns = patterns.filter(p => !p.startsWith('!'))
  const negativePatterns = patterns
    .filter(p => p.startsWith('!'))
    .map(p => p.slice(1))

  const picomatch = getPicomatch()

  // Use ignore option for negation patterns.
  const matchOptions = {
    dot: true,
    nocase: true,
    ...options,
    ...(negativePatterns.length > 0 ? { ignore: negativePatterns } : {}),
  }

  matcher = picomatch(
    positivePatterns.length > 0 ? positivePatterns : patterns,
    matchOptions,
  )

  matcherCache.set(key, matcher)
  return matcher
}
