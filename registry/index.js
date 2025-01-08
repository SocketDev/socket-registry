'use strict'

let _PackageURL
function getPackageURL() {
  if (_PackageURL === undefined) {
    const id = 'packageurl-js'
    _PackageURL = require(/* webpackIgnore: true */ id).PackageURL
  }
  return _PackageURL
}

function getManifestData(eco, regPkgName) {
  const registryManifest = require('./manifest.json')
  if (eco) {
    const PackageURL = getPackageURL()
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
