'use strict'

const fs = require('node:fs/promises')
const path = require('node:path')
const util = require('node:util')

const { PackageURL } = require('packageurl-js')

const purlJsPkgJson = require('@socketregistry/packageurl-js/package.json')
const constants = require('@socketregistry/scripts/constants')
const {
  AT_LATEST,
  UNLICENSED,
  npmPackagesPath,
  parseArgsConfig,
  registryExtensionsJsonPath,
  registryManifestJsonPath,
  relRegistryManifestJsonPath,
  rootPackagesPath,
  skipTestsByEcosystem,
  testNpmPkgJsonPath
} = constants
const { getModifiedFiles } = require('@socketregistry/scripts/lib/git')
const { Spinner } = require('@socketregistry/scripts/lib/spinner')
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

const registryExtensionsJson = require(registryExtensionsJsonPath)

const { values: cliArgs } = util.parseArgs(parseArgsConfig)

async function addNpmManifestData(manifest) {
  const eco = 'npm'
  const manifestData = [
    [
      `pkg:npm/%40socketregistry/packageurl-js@${purlJsPkgJson.version}`,
      {
        categories: purlJsPkgJson.socket.categories,
        engines: purlJsPkgJson.engines,
        interop: ['cjs'],
        license: purlJsPkgJson.license,
        name: purlJsPkgJson.name,
        package: 'packageurl-js',
        version: purlJsPkgJson.version
      }
    ],
    ...(registryExtensionsJson[eco] ?? [])
  ]
  // Chunk package names to process them in parallel 3 at a time.
  // Lazily access constants.npmPackageNames.
  await pEach(constants.npmPackageNames, 3, async regPkgName => {
    const origPkgName = resolveOriginalPackageName(regPkgName)
    const testNpmPkgJson = await readPackageJson(testNpmPkgJsonPath)
    const nmPkgSpec = testNpmPkgJson.devDependencies[origPkgName]
    const nmPkgId = `${origPkgName}@${nmPkgSpec}`
    const nmPkgManifest = await fetchPackageManifest(nmPkgId)
    if (!nmPkgManifest) {
      console.warn(`⚠️ ${nmPkgId}: Not found in npm registry`)
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

  const latestIndexes = []
  for (let i = 0, { length } = manifestData; i < length; i += 1) {
    if (manifestData[i][0].endsWith(AT_LATEST)) {
      latestIndexes.push(i)
    }
  }
  // Chunk lookupLatest to process them in parallel 3 at a time.
  await pEach(latestIndexes, 3, async index => {
    const entry = manifestData[index]
    const nmPkgId = `${entry[1].name}${AT_LATEST}`
    const nmPkgManifest = await fetchPackageManifest(nmPkgId)
    if (!nmPkgManifest) {
      console.warn(`⚠️ ${nmPkgId}: Not found in npm registry`)
      return
    }
    const { version } = nmPkgManifest
    entry[0] = `${entry[0].slice(0, -AT_LATEST.length)}@${version}`
    entry[1].version = version
  })

  if (manifestData.length) {
    manifest[eco] = manifestData.sort((a, b) => localeCompare(a[0], b[0]))
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
  const spinner = Spinner({
    text: `Updating ${relRegistryManifestJsonPath}...`
  }).start()
  const manifest = {}
  await addNpmManifestData(manifest)
  const output = await prettierFormat(JSON.stringify(manifest), {
    filepath: registryManifestJsonPath
  })
  await fs.writeFile(registryManifestJsonPath, output, 'utf8')
  spinner.stop()
})()
