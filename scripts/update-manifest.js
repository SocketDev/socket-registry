'use strict'

const fs = require('node:fs/promises')
const path = require('node:path')
const util = require('node:util')

const { PackageURL } = require('@socketregistry/packageurl-js')
const constants = require('@socketregistry/scripts/constants')
const { getModifiedFiles } = require('@socketregistry/scripts/lib/git')
const {
  objectEntries,
  toSortedObject,
  toSortedObjectFromEntries
} = require('@socketsecurity/registry/lib/objects')
const {
  extractPackage,
  fetchPackageManifest,
  isBlessedPackageName,
  readPackageJson,
  resolveOriginalPackageName,
  resolvePackageJsonEntryExports
} = require('@socketsecurity/registry/lib/packages')
const { pEach } = require('@socketsecurity/registry/lib/promises')
const { naturalCompare } = require('@socketsecurity/registry/lib/sorts')
const { biomeFormat } = require('./lib/biome')

const { AT_LATEST, NPM, UNLICENSED } = constants

const { values: cliArgs } = util.parseArgs(constants.parseArgsConfig)

async function addNpmManifestData(manifest, options) {
  const { spinner } = { __proto__: null, ...options }
  const eco = NPM
  const manifestData = []
  // Lazily access constants.registryExtensionsJsonPath.
  const registryExtJson = require(constants.registryExtensionsJsonPath)
  const registryExt = registryExtJson[eco] ?? []

  // Chunk registry ext names to process them in parallel 3 at a time.
  await pEach(registryExt, 3, async ({ 1: data }) => {
    const nmPkgId = `${data.name}@latest`
    const nmPkgManifest = await fetchPackageManifest(nmPkgId)
    if (!nmPkgManifest) {
      spinner?.warn(`${nmPkgId}: Not found in ${NPM} registry`)
      return
    }
    let nmPkgJson
    await extractPackage(nmPkgId, async nmPkgPath => {
      nmPkgJson = await readPackageJson(nmPkgPath, { normalize: true })
    })
    const isBlessed = isBlessedPackageName(data.name)
    manifestData.push([
      PackageURL.fromString(
        `pkg:${eco}/${data.name}@${nmPkgJson.version}`
      ).toString(),
      {
        categories: nmPkgJson.socket?.categories ?? data.categories,
        engines: isBlessed ? (nmPkgJson.engines ?? data.engines) : data.engines,
        interop: data.interop,
        license: nmPkgJson.license ?? data.license,
        name: data.name,
        package: data.package,
        version: nmPkgJson.version
      }
    ])
  })

  // Chunk package names to process them in parallel 3 at a time.
  // Lazily access constants.npmPackageNames.
  await pEach(constants.npmPackageNames, 3, async sockRegPkgName => {
    const origPkgName = resolveOriginalPackageName(sockRegPkgName)
    // Lazily access constants.testNpmPkgJsonPath.
    const testNpmPkgJson = await readPackageJson(constants.testNpmPkgJsonPath, {
      normalize: true
    })
    const nmPkgSpec = testNpmPkgJson.devDependencies[origPkgName]
    const nmPkgId = `${origPkgName}@${nmPkgSpec}`
    const nmPkgManifest = await fetchPackageManifest(nmPkgId)
    if (!nmPkgManifest) {
      spinner?.warn(`${nmPkgId}: Not found in ${NPM} registry`)
      return
    }
    let nmPkgJson
    await extractPackage(nmPkgId, async nmPkgPath => {
      nmPkgJson = await readPackageJson(nmPkgPath, { normalize: true })
    })
    // Lazily access constants.npmPackagesPath.
    const pkgPath = path.join(constants.npmPackagesPath, sockRegPkgName)
    const pkgJson = await readPackageJson(pkgPath, { normalize: true })
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
    // Lazily access constants.skipTestsByEcosystem.
    const skipTests = constants.skipTestsByEcosystem
      .get(eco)
      .has(sockRegPkgName)
    const metaEntries = [
      ['name', name],
      ['interop', interop.sort(naturalCompare)],
      ['license', nmPkgJson.license ?? UNLICENSED],
      ['package', origPkgName],
      ['version', version],
      ...(nmPkgManifest.deprecated ? [['deprecated', true]] : []),
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
      spinner?.warn(`${nmPkgId}: Not found in ${NPM} registry`)
      return
    }
    const { version } = nmPkgManifest
    entry[0] = `${entry[0].slice(0, -AT_LATEST.length)}@${version}`
    entry[1].version = version
  })

  if (manifestData.length) {
    manifest[eco] = manifestData.sort((a, b) => naturalCompare(a[0], b[0]))
  }
  return manifest
}

void (async () => {
  // Exit early if no relevant files have been modified.
  if (
    !cliArgs.force &&
    // Lazily access constants.rootPackagesPath.
    (await getModifiedFiles({ cwd: constants.rootPackagesPath })).length === 0
  ) {
    return
  }
  // Lazily access constants.spinner.
  const { spinner } = constants
  spinner.start(
    // Lazily access constants.relRegistryManifestJsonPath.
    `Updating ${constants.relRegistryManifestJsonPath}...`
  )
  const manifest = {}
  await addNpmManifestData(manifest, { spinner })
  // Lazily access constants.registryManifestJsonPath.
  const { registryManifestJsonPath } = constants
  const output = await biomeFormat(JSON.stringify(manifest, null, 2), {
    filepath: registryManifestJsonPath
  })
  await fs.writeFile(registryManifestJsonPath, output, 'utf8')
  spinner.stop()
})()
