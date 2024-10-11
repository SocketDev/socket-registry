'use strict'

const { PackageURL } = require('packageurl-js')

function getManifestData(eco, regPkgName) {
  const registryManifest = require('./manifest.json')
  const entries = registryManifest[eco]
  return regPkgName
    ? entries.find(
        ({ 0: purlStr }) => PackageURL.fromString(purlStr).name === regPkgName
      )
    : entries
}

module.exports = {
  getManifestData
}
