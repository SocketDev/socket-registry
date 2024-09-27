'use strict'

const path = require('node:path')
const util = require('node:util')

const fs = require('fs-extra')
const { PackageURL } = require('packageurl-js')

const constants = require('@socketregistry/scripts/constants')
const {
  UNLICENSED,
  npmPackagesPath,
  parseArgsConfig,
  rootManifestJsonPath,
  rootPackagesPath,
  testNpmNodeWorkspacesPath
} = constants
const { getModifiedFiles } = require('@socketregistry/scripts/utils/git')
const {
  fetchPackageManifest,
  readPackageJson
} = require('@socketregistry/scripts/utils/packages')
const { localCompare } = require('@socketregistry/scripts/utils/sorts')
const { Spinner } = require('@socketregistry/scripts/utils/spinner')
const { prettierFormat } = require('@socketregistry/scripts/utils/strings')

const { values: cliArgs } = util.parseArgs(parseArgsConfig)

;(async () => {
  // Exit early if no relevant files have been modified.
  if (
    !cliArgs.force &&
    (await getModifiedFiles({ cwd: rootPackagesPath })).length === 0
  ) {
    return
  }
  const spinner = new Spinner('Updating manifest.json...').start()
  const { ecosystems, npmPackageNames } = constants
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
        const { _id: nmPkgId, deprecated: nmPkgDeprecated } = nmPkgManifest
        const { license: nwPkgLicense } = nwPkgJson
        const { namespace: nmScope } = PackageURL.fromString(
          `pkg:${eco}/${nmPkgId}`
        )

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
          ...(engines ? [['engines', engines]] : []),
          ...(interop.length ? [['interop', interop]] : []),
          ...(nmScope ? [['scope', nmScope]] : []),
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
  spinner.stop()
})()
