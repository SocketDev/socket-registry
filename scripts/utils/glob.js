'use strict'

const { glob: tinyGlob } = require('tinyglobby')

const {
  LICENSE_GLOB_PATTERN,
  kInternalsSymbol,
  [kInternalsSymbol]: { getGlobMatcher }
} = require('@socketregistry/scripts/constants')

const licenseGlobPatterns = [LICENSE_GLOB_PATTERN]

async function globLicenses(dirname) {
  return await tinyGlob(licenseGlobPatterns, {
    absolute: true,
    cwd: dirname,
    expandDirectories: false
  })
}

module.exports = {
  getGlobMatcher,
  globLicenses
}
