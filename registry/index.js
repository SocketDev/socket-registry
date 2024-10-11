'use strict'

const { PackageURL } = require('packageurl-js')

function getManifestData(eco, regPkgName) {
  const registryManifest = require('./manifest.json')
  if (eco) {
    const entries = registryManifest[eco]
    return regPkgName
      ? entries?.find(
          ({ 0: purlStr }) => PackageURL.fromString(purlStr).name === regPkgName
        )?.[1]
      : entries
  }
  return registryManifest
}

module.exports = {
  getManifestData
}
