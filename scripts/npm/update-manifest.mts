/**
 * @file Registry manifest generation and updating script. Creates and maintains
 *   the Socket registry manifest file with package metadata.
 */

import { promises as fs } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { PackageURL } from '@socketregistry/packageurl-js-stable'
import type { PackageJson } from '@socketsecurity/lib-stable/packages/types'
import type { SpinnerInstance } from '@socketsecurity/lib-stable/spinner/types'
import { parseArgs } from '@socketsecurity/lib-stable/argv/parse'
import { UNLICENSED } from '@socketsecurity/lib-stable/constants/licenses'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { pEach } from '@socketsecurity/lib-stable/promises/iterate'
import { naturalCompare } from '@socketsecurity/lib-stable/sorts/natural'
import { getDefaultSpinner } from '@socketsecurity/lib-stable/spinner/default'
import { withSpinner } from '@socketsecurity/lib-stable/spinner/with'
import { DEFAULT_CONCURRENCY } from '../constants/core.mts'
import { getNpmPackageNames } from '../constants/testing.mts'
import { biomeFormat } from '../repo/util/biome.mts'
import { getModifiedFiles } from '../repo/util/git.mts'
import { fetchPackageManifest } from '@socketsecurity/lib-stable/packages/manifest'
import { resolveOriginalPackageName } from '@socketsecurity/lib-stable/packages/normalize'
import { resolvePackageJsonEntryExports } from '@socketsecurity/lib-stable/packages/exports'
import { readPackageJson } from '@socketsecurity/lib-stable/packages/read'
import { extractPackage } from '@socketsecurity/lib-stable/packages/tarball'
import {
  NPM,
  NPM_PACKAGES_PATH,
  REGISTRY_EXTENSIONS_JSON_PATH,
  REGISTRY_MANIFEST_JSON_PATH,
  REL_REGISTRY_MANIFEST_JSON_PATH,
  ROOT_PACKAGES_PATH,
  TEST_NPM_PATH,
} from '../constants/paths.mts'
import {
  getPackageVersionSpec,
  shouldSkipTests,
} from '../repo/util/packages.mts'
import {
  AT_LATEST,
  getPackageDefaultNodeRange,
} from '@socketsecurity/lib-stable/constants/packages'
import {
  objectEntries,
  toSortedObject,
  toSortedObjectFromEntries,
} from '@socketsecurity/lib-stable/objects/sort'

interface RegistryExtensionData {
  categories?: string[] | undefined
  engines?: Record<string, string> | undefined
  interop?: string[] | undefined
  license?: string | undefined
  name: string
  package: string
  version: string
}

interface PackageManifestInfo {
  deprecated?: boolean | undefined
  engines?: Record<string, string> | undefined
  license?: string | undefined
  version?: string | undefined
}

interface AddNpmManifestDataOptions {
  spinner?: SpinnerInstance | undefined
}

type ManifestEntry = [string, Record<string, unknown>]

const logger = getDefaultLogger()

const require = createRequire(import.meta.url)

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

export async function addNpmManifestData(
  manifest: Record<string, ManifestEntry[]>,
  options?: AddNpmManifestDataOptions,
) {
  const opts = { __proto__: null, ...options } as typeof options
  const spinner = opts?.spinner
  const eco = NPM
  const manifestData: ManifestEntry[] = []
  const registryExtJson = require(REGISTRY_EXTENSIONS_JSON_PATH)
  const registryExt: Array<[string, RegistryExtensionData]> =
    registryExtJson[eco] ?? []

  // Chunk registry ext names to process them in parallel 3 at a time.
  await pEach(
    registryExt,
    async ([, data]) => {
      const nmPkgId = `${data.name}@latest`
      const nmPkgManifest = (await fetchPackageManifest(nmPkgId)) as
        | PackageManifestInfo
        | undefined
      if (!nmPkgManifest) {
        spinner?.warn(`${nmPkgId}: Not found in ${NPM} registry`)
        return
      }
      let nmPkgJson: PackageJson | undefined
      await extractPackage(nmPkgId, undefined, async nmPkgPath => {
        nmPkgJson = await readPackageJson(nmPkgPath, { normalize: true })
      })
      if (!nmPkgJson) {
        spinner?.warn(`${nmPkgId}: Unable to read package.json`)
        return
      }
      // Socket-maintained overrides take engines from the published
      // package.json; third-party extensions keep the manifest's engines.
      // (Inlined from the retired isBlessedPackageName helper.)
      const isSocketOverride = data.name.startsWith('@socketregistry/')
      manifestData.push([
        PackageURL.fromString(
          `pkg:${eco}/${data.name}@${nmPkgJson.version}`,
        ).toString(),
        {
          categories: nmPkgJson.socket?.categories ?? data.categories,
          engines: filterEngines(
            isSocketOverride
              ? (nmPkgJson.engines ?? data.engines)
              : data.engines,
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
    getNpmPackageNames(),
    async sockRegPkgName => {
      const origPkgName = resolveOriginalPackageName(sockRegPkgName)
      const nmPkgSpec =
        getPackageVersionSpec(origPkgName, undefined) || 'latest'
      const nmPkgId = `${origPkgName}@${nmPkgSpec}`
      const nmPkgManifest = (await fetchPackageManifest(nmPkgId)) as
        | PackageManifestInfo
        | undefined
      if (!nmPkgManifest) {
        spinner?.warn(`${nmPkgId}: Not found in ${NPM} registry`)
        return
      }
      let nmPkgJson: PackageJson | undefined
      await extractPackage(nmPkgId, undefined, async nmPkgPath => {
        nmPkgJson = await readPackageJson(nmPkgPath, { normalize: true })
      })
      if (!nmPkgJson) {
        spinner?.warn(`${nmPkgId}: Unable to read package.json`)
        return
      }
      const pkgPath = path.join(NPM_PACKAGES_PATH, sockRegPkgName)
      const pkgJson = await readPackageJson(pkgPath, { normalize: true })
      if (!pkgJson) {
        spinner?.warn(`${sockRegPkgName}: Unable to read package.json`)
        return
      }
      const { engines, name, socket } = pkgJson
      const entryExports = resolvePackageJsonEntryExports(pkgJson.exports) as
        | Record<string, unknown>
        | undefined

      // Use latest published version from npm registry.
      const sockPkgManifest = (await fetchPackageManifest(`${name}@latest`)) as
        | PackageManifestInfo
        | undefined
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
      const dotExport = entryExports?.['.'] as
        | Record<string, unknown>
        | undefined
      const isBrowserify =
        !isEsm &&
        !!(
          (entryExports?.['node'] && entryExports?.['default']) ||
          (dotExport?.['node'] && dotExport?.['default'])
        )
      if (isBrowserify) {
        interop.push('browserify')
      }
      const skipTests = shouldSkipTests(origPkgName, {
        ecosystem: eco,
        testPath: TEST_NPM_PATH,
      })
      const metaEntries: Array<[PropertyKey, unknown]> = [
        ['name', name],
        ['interop', interop.toSorted(naturalCompare)],
        ['license', nmPkgJson.license ?? UNLICENSED],
        ['package', origPkgName],
        ['version', version],
      ]
      if (nmPkgManifest.deprecated) {
        metaEntries.push(['deprecated', true])
      }
      if (engines) {
        metaEntries.push(['engines', toSortedObject(filterEngines(engines))])
      } else {
        metaEntries.push(['engines', { node: getPackageDefaultNodeRange() }])
      }
      if (skipTests) {
        metaEntries.push(['skipTests', true])
      }
      if (socket) {
        metaEntries.push(...objectEntries(socket))
      }
      const purlObj = PackageURL.fromString(`pkg:${eco}/${name}@${version}`)
      manifestData.push([
        purlObj.toString(),
        toSortedObjectFromEntries(metaEntries),
      ])
    },
    { concurrency: DEFAULT_CONCURRENCY },
  )

  const latestIndexes: number[] = []
  for (let i = 0, { length } = manifestData; i < length; i += 1) {
    const entry = manifestData[i]
    if (Array.isArray(entry) && entry[0]?.endsWith?.(AT_LATEST)) {
      latestIndexes.push(i)
    }
  }
  // Chunk lookupLatest to process them in parallel 3 at a time.
  await pEach(
    latestIndexes,
    async index => {
      const entry = manifestData[index]
      if (!entry) {
        return
      }
      const nmPkgId = `${entry[1]['name']}${AT_LATEST}`
      const nmPkgManifest = (await fetchPackageManifest(nmPkgId)) as
        | PackageManifestInfo
        | undefined
      if (!nmPkgManifest) {
        spinner?.warn(`${nmPkgId}: Not found in ${NPM} registry`)
        return
      }
      const { version } = nmPkgManifest
      const key = entry[0].endsWith(AT_LATEST)
        ? entry[0].slice(0, -AT_LATEST.length)
        : entry[0]
      entry[0] = `${key}@${version}`
      entry[1]['version'] = version
    },
    { concurrency: DEFAULT_CONCURRENCY },
  )

  if (manifestData.length) {
    manifest[eco] = manifestData.toSorted((a, b) => naturalCompare(a[0], b[0]))
  }
  return manifest
}

// Helper function to filter out package manager engines from engines object.
export function filterEngines(
  engines: Record<string, string>,
): Record<string, string>
export function filterEngines(engines: undefined): undefined
export function filterEngines(
  engines: Record<string, string> | undefined,
): Record<string, string> | undefined
export function filterEngines(
  engines: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!engines) {
    return engines
  }
  // biome-ignore lint/correctness/noUnusedVariables: Destructuring to exclude keys.
  const { npm, pnpm, yarn, ...filteredEngines } = engines
  return filteredEngines
}

async function main(): Promise<void> {
  // Exit early if no relevant files have been modified and not forced.
  if (!cliArgs['force']) {
    const modifiedFiles = await getModifiedFiles({
      cwd: ROOT_PACKAGES_PATH,
    })
    if (!modifiedFiles.length) {
      return
    }
  }

  const spinner = getDefaultSpinner()
  await withSpinner({
    message: `Updating ${REL_REGISTRY_MANIFEST_JSON_PATH}...`,
    operation: async () => {
      const manifest: Record<string, ManifestEntry[]> = {}
      await addNpmManifestData(manifest, { spinner })
      const output = await biomeFormat(JSON.stringify(manifest, null, 2), {
        filepath: REGISTRY_MANIFEST_JSON_PATH,
      })
      await fs.writeFile(REGISTRY_MANIFEST_JSON_PATH, output, 'utf8')
    },
    spinner,
  })
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
