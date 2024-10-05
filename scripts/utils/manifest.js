'use strict'

const { PackageURL } = require('packageurl-js')

const registryManifest = require('@socketsecurity/registry')

function getManifestData(eco, regPkgName) {
  return registryManifest[eco]
    .find(
      ({ 0: purlStr }) => PackageURL.fromString(purlStr).name === regPkgName
    )
    ?.at(1)
}

module.exports = {
  getManifestData
}
