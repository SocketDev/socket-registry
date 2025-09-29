/**
 * @fileoverview Registry manifest generation and updating script.
 * Creates and maintains the Socket registry manifest file with package metadata.
 */

import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import path from 'node:path'

import { parseArgs } from '../registry/dist/lib/parse-args.js'

import { PackageURL } from '@socketregistry/packageurl-js'
import constants from './constants.mjs'
import { getModifiedFiles } from './utils/git.mjs'
import { biomeFormat } from './utils/biome.mjs'

import {
  objectEntries,
  toSortedObject,
  toSortedObjectFromEntries,
} from '../registry/dist/lib/objects.js'
import {
  extractPackage,
  fetchPackageManifest,
  isBlessedPackageName,
  readPackageJson,
  resolveOriginalPackageName,
  resolvePackageJsonEntryExports,
} from '../registry/dist/lib/packages.js'
import { pEach } from '../registry/dist/lib/promises.js'
import { naturalCompare } from '../registry/dist/lib/sorts.js'

const require = createRequire(import.meta.url)

const { AT_LATEST, DEFAULT_CONCURRENCY, NPM, UNLICENSED } = constants

const { values: cliArgs } = parseArgs({
  options: {
    force: {
      type: 'boolean',
      short: 'f',
    },
    quiet: {
      type: 'boolean',
    },
  },
  strict: false,
})

// Helper function to filter out package manager engines from engines object.
function filterEngines(engines) {
  if (!engines) {
    return engines
  }
  const { npm, pnpm, yarn, ...filteredEngines } = engines
  return filteredEngines
}

async function addNpmManifestData(manifest, options) {
  const { spinner } = { __proto__: null, ...options }
  const eco = NPM
  const manifestData = []
  const registryExtJson = require(constants.registryExtensionsJsonPath)
  const registryExt = registryExtJson[eco] ?? []

  // Chunk registry ext names to process them in parallel 3 at a time.
  await pEach(
    registryExt,
    async ({ 1: data }) => {
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
          `pkg:${eco}/${data.name}@${nmPkgJson.version}`,
        ).toString(),
        {
          categories: nmPkgJson.socket?.categories ?? data.categories,
          engines: filterEngines(
            isBlessed ? (nmPkgJson.engines ?? data.engines) : data.engines,
          ),
          interop: data.interop,
          license: nmPkgJson.license ?? data.license,
          name: data.name,
          package: data.package,
          version: nmPkgJson.version,
        },
      ])
    },
    { concurrency: DEFAULT_CONCURRENCY },
  )

  // Chunk package names to process them in parallel 3 at a time.
  await pEach(
    constants.npmPackageNames,
    async sockRegPkgName => {
      const origPkgName = resolveOriginalPackageName(sockRegPkgName)
      const testNpmPkgJson = await readPackageJson(
        constants.testNpmPkgJsonPath,
        {
          normalize: true,
        },
      )
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
        ...(engines
          ? [['engines', toSortedObject(filterEngines(engines))]]
          : [['engines', { node: constants.PACKAGE_DEFAULT_NODE_RANGE }]]),
        ...(skipTests ? [['skipTests', true]] : []),
        ...(socket ? objectEntries(socket) : []),
      ]
      const purlObj = PackageURL.fromString(`pkg:${eco}/${name}@${version}`)
      manifestData.push([
        purlObj.toString(),
        toSortedObjectFromEntries(metaEntries),
      ])
    },
    { concurrency: DEFAULT_CONCURRENCY },
  )

  const latestIndexes = []
  for (let i = 0, { length } = manifestData; i < length; i += 1) {
    if (manifestData[i][0].endsWith(AT_LATEST)) {
      latestIndexes.push(i)
    }
  }
  // Chunk lookupLatest to process them in parallel 3 at a time.
  await pEach(
    latestIndexes,
    async index => {
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
    },
    { concurrency: DEFAULT_CONCURRENCY },
  )

  if (manifestData.length) {
    manifest[eco] = manifestData.sort((a, b) => naturalCompare(a[0], b[0]))
  }
  return manifest
}

async function main() {
  // Exit early if no relevant files have been modified.
  if (
    !cliArgs.force &&
    (await getModifiedFiles({ cwd: constants.rootPackagesPath })).length === 0
  ) {
    return
  }
  const { spinner } = constants
  spinner.start(`Updating ${constants.relRegistryManifestJsonPath}...`)
  const manifest = {}
  await addNpmManifestData(manifest, { spinner })
  const { registryManifestJsonPath } = constants
  const output = await biomeFormat(JSON.stringify(manifest, null, 2), {
    filepath: registryManifestJsonPath,
  })
  await fs.writeFile(registryManifestJsonPath, output, 'utf8')
  spinner.stop()
}

main().catch(console.error)
