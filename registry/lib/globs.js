'use strict'

let _picomatch
/*@__NO_SIDE_EFFECTS__*/
function getPicomatch() {
  if (_picomatch === undefined) {
    // The 'picomatch' package is browser safe.
    _picomatch = /*@__PURE__*/ require('../external/picomatch')
  }
  return _picomatch
}

let _tinyGlobby
/*@__NO_SIDE_EFFECTS__*/
function getTinyGlobby() {
  if (_tinyGlobby === undefined) {
    _tinyGlobby = /*@__PURE__*/ require('../external/tinyglobby')
  }
  return _tinyGlobby
}

/*@__NO_SIDE_EFFECTS__*/
async function globLicenses(dirname, options) {
  const {
    ignore: ignoreOpt,
    ignoreOriginals,
    recursive,
    ...globOptions
  } = { __proto__: null, ...options }
  const ignore = [
    ...(Array.isArray(ignoreOpt) ? ignoreOpt : []),
    '**/*.{cjs,cts,js,json,mjs,mts,ts}'
  ]
  if (ignoreOriginals) {
    ignore.push(
      /*@__PURE__*/ require('./constants/license-original-glob-recursive')
    )
  }
  const tinyGlobby = getTinyGlobby()
  return await tinyGlobby.glob(
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
      expandDirectories: recursive,
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
  getGlobMatcher,
  globLicenses
}
