'use strict'

const { freeze: ObjectFreeze } = Object

const defaultIgnore = ObjectFreeze([
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
  '**/.tapci.yaml',
  '**/.vscode',
  '**/*.tsbuildinfo',
  '**/Thumbs.db',
  // Inline additional ignores.
  '**/bower_components'
])

let _picomatch
/*@__NO_SIDE_EFFECTS__*/
function getPicomatch() {
  if (_picomatch === undefined) {
    // The 'picomatch' package is browser safe.
    _picomatch = /*@__PURE__*/ require('../external/picomatch')
  }
  return _picomatch
}

let _fastGlob
/*@__NO_SIDE_EFFECTS__*/
function getFastGlob() {
  if (_fastGlob === undefined) {
    _fastGlob = /*@__PURE__*/ require('../external/fast-glob')
  }
  return _fastGlob
}

/*@__NO_SIDE_EFFECTS__*/
function globStreamLicenses(dirname, options) {
  const {
    ignore: ignoreOpt,
    ignoreOriginals,
    recursive,
    ...globOptions
  } = { __proto__: null, ...options }
  const ignore = [
    ...(Array.isArray(ignoreOpt) ? ignoreOpt : defaultIgnore),
    '**/*.{cjs,cts,js,json,mjs,mts,ts}'
  ]
  if (ignoreOriginals) {
    ignore.push(
      /*@__PURE__*/ require('./constants/license-original-glob-recursive')
    )
  }
  const fastGlob = getFastGlob()
  return fastGlob.globStream(
    [
      recursive
        ? /*@__PURE__*/ require('./constants/license-glob-recursive')
        : /*@__PURE__*/ require('./constants/license-glob')
    ],
    {
      __proto__: null,
      absolute: true,
      caseSensitiveMatch: false,
      cwd: dirname,
      ...globOptions,
      ...(ignore ? { ignore } : {})
    }
  )
}

const matcherCache = new Map()
/*@__NO_SIDE_EFFECTS__*/
function getGlobMatcher(glob, options) {
  const patterns = Array.isArray(glob) ? glob : [glob]
  const key = JSON.stringify({ patterns, options })
  let matcher = matcherCache.get(key)
  if (matcher) {
    return matcher
  }
  const picomatch = getPicomatch()
  matcher = picomatch(patterns, {
    dot: true,
    nocase: true,
    ...options
  })
  matcherCache.set(key, matcher)
  return matcher
}

module.exports = {
  defaultIgnore,
  getGlobMatcher,
  globStreamLicenses
}
