'use strict'

const { PackageURL } = require('packageurl-js')

function getManifestData(eco, regPkgName) {
  const registryManifest = require('./manifest.json')
  let purlObj
  const entry = registryManifest[eco].find(({ 0: purlStr }) => {
    const purlObj_ = PackageURL.fromString(purlStr)
    const found = purlObj_.name === regPkgName
    if (found) {
      purlObj = purlObj_
    }
    return found
  })
  return entry ? { ...entry[1], version: purlObj.version } : undefined
}

module.exports = {
  getManifestData
}
