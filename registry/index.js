'use strict'

let _PackageURL
function getPackageURL() {
  if (_PackageURL === undefined) {
    // The 'packageurl-js' package is browser safe.
    _PackageURL = require('@socketregistry/packageurl-js').PackageURL
  }
  return _PackageURL
}

function getManifestData(eco, sockRegPkgName) {
  const registryManifest = require('./manifest.json')
  if (eco) {
    const entries = registryManifest[eco]
    return sockRegPkgName
      ? entries?.find(
          ({ 0: purlStr }) =>
            getPackageURL().fromString(purlStr).name === sockRegPkgName
        )?.[1]
      : entries
  }
  return registryManifest
}

module.exports = {
  getManifestData
}
