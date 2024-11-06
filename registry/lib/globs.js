'use strict'

const { glob: tinyGlob } = require('tinyglobby')

const {
  LICENSE_GLOB,
  LICENSE_ORIGINAL_GLOB_RECURSIVE,
  LICENSE_GLOB_RECURSIVE,
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
  return await tinyGlob([recursive ? LICENSE_GLOB_RECURSIVE : LICENSE_GLOB], {
    __proto__: null,
    absolute: true,
    caseSensitiveMatch: false,
    cwd: dirname,
    expandDirectories: recursive,
    ...globOptions,
    ...(ignore ? { ignore } : {})
  })
}

module.exports = {
  getGlobMatcher,
  globLicenses
}
