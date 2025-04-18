'use strict'

let _PackageURL
/*@__NO_SIDE_EFFECTS__*/
function getPackageURL() {
  if (_PackageURL === undefined) {
    // The 'packageurl-js' package is browser safe.
    _PackageURL =
      /*@__PURE__*/ require('./external/@socketregistry/packageurl-js').PackageURL
  }
  return _PackageURL
}

/*@__NO_SIDE_EFFECTS__*/
function getManifestData(eco, sockRegPkgName) {
  const registryManifest = /*@__PURE__*/ require('./manifest.json')
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
