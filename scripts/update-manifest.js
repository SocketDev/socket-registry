'use strict'

const fs = require('node:fs/promises')
const path = require('node:path')
const util = require('node:util')

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
const { getModifiedFiles } = require('@socketregistry/scripts/lib/git')
const yoctoSpinner = require('@socketregistry/yocto-spinner')
const {
  objectEntries,
  toSortedObject,
  toSortedObjectFromEntries
} = require('@socketsecurity/registry/lib/objects')
const {
  extractPackage,
  fetchPackageManifest,
  readPackageJson,
  resolveOriginalPackageName,
  resolvePackageJsonEntryExports
} = require('@socketsecurity/registry/lib/packages')
const { pEach } = require('@socketsecurity/registry/lib/promises')
const { localeCompare } = require('@socketsecurity/registry/lib/sorts')
const { prettierFormat } = require('@socketsecurity/registry/lib/strings')

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
    const isBrowserify =
      !isEsm &&
      !!(
        (entryExports?.node && entryExports?.default) ||
        (entryExports?.['.']?.node && entryExports?.['.']?.default)
      )
    if (isBrowserify) {
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
      // Lazily access constants.PACKAGE_DEFAULT_NODE_RANGE.
      ...(engines
        ? [['engines', toSortedObject(engines)]]
        : [['engines', { node: constants.PACKAGE_DEFAULT_NODE_RANGE }]]),
      ...(skipTests ? [['skipTests', true]] : []),
      ...(socket ? objectEntries(socket) : [])
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

void (async () => {
  // Exit early if no relevant files have been modified.
  if (
    !cliArgs.force &&
    (await getModifiedFiles({ cwd: rootPackagesPath })).length === 0
  ) {
    return
  }
  const spinner = yoctoSpinner({
    text: `Updating ${relManifestJsonPath}...`
  }).start()
  const manifest = {}
  await addNpmManifestData(manifest)
  const output = await prettierFormat(JSON.stringify(manifest), {
    filepath: manifestJsonPath
  })
  await fs.writeFile(manifestJsonPath, output, 'utf8')
  spinner.stop()
})()
