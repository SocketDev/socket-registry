'use strict'

let _tinyGlobby
function getTinyGlobby() {
  if (_tinyGlobby === undefined) {
    _tinyGlobby = require('tinyglobby')
  }
  return _tinyGlobby
}

const {
  LICENSE_GLOB,
  LICENSE_GLOB_RECURSIVE,
  LICENSE_ORIGINAL_GLOB_RECURSIVE,
  kInternalsSymbol,
  [kInternalsSymbol]: { getGlobMatcher }
} = require('./constants')

async function globLicenses(dirname, options) {
  const {
    ignore: ignoreOpt,
    ignoreOriginals,
    recursive,
    ...globOptions
  } = { __proto__: null, ...options }
  let ignore = ignoreOpt
  if (ignoreOriginals) {
    ignore = Array.isArray(ignoreOpt)
      ? ignoreOpt.concat([LICENSE_ORIGINAL_GLOB_RECURSIVE])
      : [LICENSE_ORIGINAL_GLOB_RECURSIVE]
  }
  const tinyGlobby = getTinyGlobby()
  return await tinyGlobby.glob(
    [recursive ? LICENSE_GLOB_RECURSIVE : LICENSE_GLOB],
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

module.exports = {
  getGlobMatcher,
  globLicenses
}
