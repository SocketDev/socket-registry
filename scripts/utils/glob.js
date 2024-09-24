'use strict'

const { glob: tinyGlob } = require('tinyglobby')

const {
  LICENSE_GLOB_PATTERN,
  LICENSE_GLOB_PATTERN_RECURSIVE,
  kInternalsSymbol,
  [kInternalsSymbol]: { getGlobMatcher }
} = require('@socketregistry/scripts/constants')

async function globLicenses(dirname, options) {
  const { recursive, ...otherOptions } = { __proto__: null, ...options }
  return await tinyGlob(
    [recursive ? LICENSE_GLOB_PATTERN_RECURSIVE : LICENSE_GLOB_PATTERN],
    {
      absolute: true,
      cwd: dirname,
      expandDirectories: recursive,
      ...otherOptions
    }
  )
}

module.exports = {
  getGlobMatcher,
  globLicenses
}
