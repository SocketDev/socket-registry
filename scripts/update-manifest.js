'use strict'

const path = require('node:path')

const fs = require('fs-extra')
const { PackageURL } = require('packageurl-js')
const prettier = require('prettier')

const {
  ecosystems,
  npmPackageNames,
  npmPackagesPath,
  rootManifestJsonPath
} = require('@socketregistry/scripts/constants')
const { readPackageJson } = require('@socketregistry/scripts/utils/packages')
const { localCompare } = require('@socketregistry/scripts/utils/sorts')

;(async () => {
  const manifest = {}
  for (const eco of ecosystems) {
    if (eco === 'npm') {
      const manifestData = []
      for await (const pkgName of npmPackageNames) {
        const pkgPath = path.join(npmPackagesPath, pkgName)
        const {
          engines,
          exports: entryExports,
          name,
          socket,
          version
        } = await readPackageJson(pkgPath)
        const interop = []
        const isEsm = !!(entryExports?.import || entryExports?.module)
        if (isEsm) {
          interop.push('esm')
        }
        const isBrowser = !!entryExports?.node
        if (isBrowser) {
          interop.push('browser')
        }
        const metaEntries = [
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
  const output = await prettier.format(JSON.stringify(manifest), {
    parser: 'json'
  })
  await fs.writeFile(rootManifestJsonPath, output, 'utf8')
})()
