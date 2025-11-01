/**
 * @fileoverview Registry manifest generation and updating script.
 * Creates and maintains the Socket registry manifest file with package metadata.
 */

import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

import { PackageURL } from '@socketregistry/packageurl-js'
import { parseArgs } from '@socketsecurity/lib/argv/parse'
import { UNLICENSED } from '@socketsecurity/lib/constants/licenses'
import { getDefaultLogger } from '@socketsecurity/lib/logger'
import {
  AT_LATEST,
  getPackageDefaultNodeRange,
} from '@socketsecurity/lib/constants/packages'
import { getSpinner } from '@socketsecurity/lib/constants/process'

const logger = getDefaultLogger()
import {
  objectEntries,
  toSortedObject,
  toSortedObjectFromEntries,
} from '@socketsecurity/lib/objects'
import {
  extractPackage,
  fetchPackageManifest,
  isBlessedPackageName,
  readPackageJson,
  resolveOriginalPackageName,
  resolvePackageJsonEntryExports,
} from '@socketsecurity/lib/packages'
import { pEach } from '@socketsecurity/lib/promises'
import { naturalCompare } from '@socketsecurity/lib/sorts'
import { withSpinner } from '@socketsecurity/lib/spinner'

import { DEFAULT_CONCURRENCY } from './constants/core.mjs'
import {
  NPM,
  NPM_PACKAGES_PATH,
  REGISTRY_EXTENSIONS_JSON_PATH,
  REGISTRY_MANIFEST_JSON_PATH,
  REL_REGISTRY_MANIFEST_JSON_PATH,
  ROOT_PACKAGES_PATH,
  TEST_NPM_PATH,
} from './constants/paths.mjs'
import { getNpmPackageNames } from './constants/testing.mjs'
import { biomeFormat } from './utils/biome.mjs'
import { getModifiedFiles } from './utils/git.mjs'
import { getPackageVersionSpec, shouldSkipTests } from './utils/packages.mjs'

const require = createRequire(import.meta.url)

const spinner = getSpinner()
const npmPackageNames = getNpmPackageNames()

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
  // biome-ignore lint/correctness/noUnusedVariables: Destructuring to exclude keys.
  const { npm, pnpm, yarn, ...filteredEngines } = engines
  return filteredEngines
}

async function addNpmManifestData(manifest, options) {
  const { spinner } = { __proto__: null, ...options }
  const eco = NPM
  const manifestData = []
  const registryExtJson = require(REGISTRY_EXTENSIONS_JSON_PATH)
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
    npmPackageNames,
    async sockRegPkgName => {
      const origPkgName = resolveOriginalPackageName(sockRegPkgName)
      const nmPkgSpec = getPackageVersionSpec(origPkgName) || 'latest'
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
      const pkgPath = path.join(NPM_PACKAGES_PATH, sockRegPkgName)
      const pkgJson = await readPackageJson(pkgPath, { normalize: true })
      const { engines, name, socket } = pkgJson
      const entryExports = resolvePackageJsonEntryExports(pkgJson.exports)

      // Use latest published version from npm registry.
      const sockPkgManifest = await fetchPackageManifest(`${name}@latest`)
      if (!sockPkgManifest) {
        spinner?.warn(`${name}: Not found in ${NPM} registry`)
        return
      }
      const version = sockPkgManifest.version

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
      const skipTests = shouldSkipTests(origPkgName, {
        ecosystem: eco,
        testPath: TEST_NPM_PATH,
      })
      const metaEntries = [
        ['name', name],
        ['interop', interop.sort(naturalCompare)],
        ['license', nmPkgJson.license ?? UNLICENSED],
        ['package', origPkgName],
        ['version', version],
        ...(nmPkgManifest.deprecated ? [['deprecated', true]] : []),
        ...(engines
          ? [['engines', toSortedObject(filterEngines(engines))]]
          : [['engines', { node: getPackageDefaultNodeRange() }]]),
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
  // Exit early if no relevant files have been modified and not forced.
  if (!cliArgs.force) {
    const modifiedFiles = await getModifiedFiles({
      cwd: ROOT_PACKAGES_PATH,
    })
    if (modifiedFiles.length === 0) {
      return
    }
  }

  await withSpinner({
    message: `Updating ${REL_REGISTRY_MANIFEST_JSON_PATH}...`,
    operation: async () => {
      const manifest = {}
      await addNpmManifestData(manifest, { spinner })
      const output = await biomeFormat(JSON.stringify(manifest, null, 2), {
        filepath: REGISTRY_MANIFEST_JSON_PATH,
      })
      await fs.writeFile(REGISTRY_MANIFEST_JSON_PATH, output, 'utf8')
    },
    spinner,
  })
}

main().catch(e => logger.error(e))
