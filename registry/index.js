'use strict'

let _PackageURL
function getPackageURL() {
  if (_PackageURL === undefined) {
    // The 'packageurl-js' package is browser safe.
    _PackageURL = require('@socketregistry/packageurl-js').PackageURL
  }
  return _PackageURL
}

function getManifestData(eco, regPkgName) {
  const registryManifest = require('./manifest.json')
  if (eco) {
    const entries = registryManifest[eco]
    return regPkgName
      ? entries?.find(
          ({ 0: purlStr }) =>
            getPackageURL().fromString(purlStr).name === regPkgName
        )?.[1]
      : entries
  }
  return registryManifest
}

module.exports = {
  getManifestData
}
