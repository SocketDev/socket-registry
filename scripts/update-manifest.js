'use strict'

const path = require('node:path')

const fs = require('fs-extra')
const { PackageURL } = require('packageurl-js')

const {
  UNLICENSED,
  ecosystems,
  npmPackageNames,
  npmPackagesPath,
  rootManifestJsonPath,
  testNpmNodeWorkspacesPath
} = require('@socketregistry/scripts/constants')
const {
  fetchPackageManifest,
  readPackageJson
} = require('@socketregistry/scripts/utils/packages')
const { localCompare } = require('@socketregistry/scripts/utils/sorts')
const { prettierFormat } = require('@socketregistry/scripts/utils/strings')

;(async () => {
  const manifest = {}
  for (const eco of ecosystems) {
    if (eco === 'npm') {
      const manifestData = []
      for await (const pkgName of npmPackageNames) {
        const pkgPath = path.join(npmPackagesPath, pkgName)
        const nwPkgPath = path.join(testNpmNodeWorkspacesPath, pkgName)
        const pkgJson = await readPackageJson(pkgPath)
        const nwPkgJson = await readPackageJson(nwPkgPath)
        const nmPkgManifest = await fetchPackageManifest(
          `${pkgName}@${nwPkgJson.version}`
        )
        const {
          engines,
          exports: entryExports,
          name,
          socket,
          version
        } = pkgJson
        const { deprecated: nmPkgDeprecated } = nmPkgManifest
        const { license: nwPkgLicense } = nwPkgJson
        const interop = []
        const isEsm = !!(entryExports?.import || entryExports?.module)
        if (isEsm) {
          interop.push('esm')
        }
        const isBrowser = !!(
          entryExports?.browser ||
          (entryExports?.node && entryExports?.default)
        )
        if (isBrowser) {
          interop.push('browser')
        }
        const metaEntries = [
          ['license', nwPkgLicense ?? UNLICENSED],
          ...(nmPkgDeprecated ? [['deprecated', true]] : []),
          ...(interop.length ? [['interop', interop]] : []),
          ...(engines ? [['engines', engines]] : []),
          ...(socket ? Object.entries(socket) : [])
        ]
        const purlObj = PackageURL.fromString(`pkg:${eco}/${name}@${version}`)
        const data = [purlObj.toString()]
        if (metaEntries.length) {
          data[1] = Object.fromEntries(
            metaEntries.sort((a, b) => localCompare(a[0], b[0]))
          )
        }
        manifestData.push(data.length === 1 ? data[0] : data)
      }
      if (manifestData.length) {
        manifest[eco] = manifestData.sort((a_, b_) => {
          const a = Array.isArray(a_) ? a_[0] : a_
          const b = Array.isArray(b_) ? b_[0] : b_
          return localCompare(a, b)
        })
      }
    }
  }
  const output = await prettierFormat(JSON.stringify(manifest), {
    filepath: rootManifestJsonPath
  })
  await fs.writeFile(rootManifestJsonPath, output, 'utf8')
})()
