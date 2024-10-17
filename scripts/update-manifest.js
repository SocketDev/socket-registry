'use strict'

const path = require('node:path')
const util = require('node:util')

const fs = require('fs-extra')
const { PackageURL } = require('packageurl-js')

const constants = require('@socketregistry/scripts/constants')
const {
  UNLICENSED,
  manifestJsonPath,
  npmPackagesPath,
  parseArgsConfig,
  relManifestJsonPath,
  rootPackagesPath,
  skipTestsByEcosystem,
  testNpmPkgJsonPath
} = constants
const { getModifiedFiles } = require('@socketregistry/scripts/utils/git')
const {
  toSortedObject,
  toSortedObjectFromEntries
} = require('@socketregistry/scripts/utils/objects')
const {
  extractPackage,
  fetchPackageManifest,
  readPackageJson,
  resolveOriginalPackageName,
  resolvePackageJsonEntryExports
} = require('@socketregistry/scripts/utils/packages')
const { pEach } = require('@socketregistry/scripts/utils/promises')
const { localeCompare } = require('@socketregistry/scripts/utils/sorts')
const { Spinner } = require('@socketregistry/scripts/utils/spinner')
const { prettierFormat } = require('@socketregistry/scripts/utils/strings')

const { values: cliArgs } = util.parseArgs(parseArgsConfig)

async function addNpmManifestData(manifest) {
  const eco = 'npm'
  const manifestData = []
  // Chunk package names to process them in parallel 3 at a time.
  // Lazily access constants.npmPackageNames.
  await pEach(constants.npmPackageNames, 3, async regPkgName => {
    const origPkgName = resolveOriginalPackageName(regPkgName)
    const testNpmPkgJson = await readPackageJson(testNpmPkgJsonPath)
    const nmPkgSpec = testNpmPkgJson.devDependencies[origPkgName]
    const nmPkgId = `${origPkgName}@${nmPkgSpec}`
    const nmPkgManifest = await fetchPackageManifest(nmPkgId)
    if (!nmPkgManifest) {
      console.log(`⚠️ ${nmPkgId}: Not found in npm registry`)
      return
    }
    const { deprecated: nmPkgDeprecated } = nmPkgManifest
    let nwPkgLicense
    await extractPackage(nmPkgId, async nmPkgPath => {
      const nmPkgJson = await readPackageJson(nmPkgPath)
      nwPkgLicense = nmPkgJson.license
    })

    const pkgPath = path.join(npmPackagesPath, regPkgName)
    const pkgJson = await readPackageJson(pkgPath)
    const { engines, name, socket, version } = pkgJson
    const entryExports = resolvePackageJsonEntryExports(pkgJson.exports)

    const interop = ['cjs']
    const isEsm = pkgJson.type === 'module'
    if (isEsm) {
      interop.push('esm')
    }
    const isBrowser =
      !isEsm &&
      !!(
        (entryExports?.node && entryExports?.default) ||
        (entryExports?.['.']?.node && entryExports?.['.']?.default)
      )
    if (isBrowser) {
      interop.push('browserify')
    }
    const skipTests = skipTestsByEcosystem[eco].has(regPkgName)
    const metaEntries = [
      ['name', name],
      ['interop', interop.sort(localeCompare)],
      ['license', nwPkgLicense ?? UNLICENSED],
      ['package', origPkgName],
      ['version', version],
      ...(nmPkgDeprecated ? [['deprecated', true]] : []),
      ...(skipTests ? [['skipTests', true]] : []),
      ...(engines ? [['engines', toSortedObject(engines)]] : []),
      ...(socket ? Object.entries(socket) : [])
    ]
    const purlObj = PackageURL.fromString(`pkg:${eco}/${name}@${version}`)
    manifestData.push([
      purlObj.toString(),
      toSortedObjectFromEntries(metaEntries)
    ])
  })
  if (manifestData.length) {
    manifest[eco] = manifestData.sort((a_, b_) => {
      const a = Array.isArray(a_) ? a_[0] : a_
      const b = Array.isArray(b_) ? b_[0] : b_
      return localeCompare(a, b)
    })
  }
  return manifest
}

;(async () => {
  // Exit early if no relevant files have been modified.
  if (
    !cliArgs.force &&
    (await getModifiedFiles({ cwd: rootPackagesPath })).length === 0
  ) {
    return
  }
  const spinner = new Spinner(`Updating ${relManifestJsonPath}...`).start()
  const manifest = {}
  // Lazily access constants.ecosystems.
  for (const eco of constants.ecosystems) {
    if (eco === 'npm') {
      await addNpmManifestData(manifest)
    }
  }
  const output = await prettierFormat(JSON.stringify(manifest), {
    filepath: manifestJsonPath
  })
  await fs.writeFile(manifestJsonPath, output, 'utf8')
  spinner.stop()
})()
