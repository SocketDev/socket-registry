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
import { parseArgs } from 'node:util'
import { UNLICENSED } from '@socketsecurity/lib-stable/constants/licenses'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { pEach } from '@socketsecurity/lib-stable/promises/iterate'
import { naturalCompare } from '@socketsecurity/lib-stable/sorts/natural'
import { getDefaultSpinner } from '@socketsecurity/lib-stable/spinner/default'
import { withSpinner } from '@socketsecurity/lib-stable/spinner/with'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
import { DEFAULT_CONCURRENCY } from '../constants/core.mts'
import { getNpmPackageNames } from '../constants/testing.mts'
import { isMainModule } from '../../fleet/process/is-main-module.mts'
import { getModifiedFiles } from '../util/git.mts'
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
  ROOT_PATH,
  TEST_NPM_PATH,
} from '../constants/paths.mts'
import { getPackageVersionSpec, shouldSkipTests } from '../util/packages.mts'
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
  fetchFailures?: Set<string> | undefined
  spinner?: SpinnerInstance | undefined
}

export type ManifestEntry = [string, Record<string, unknown>]

const logger = getDefaultLogger()

const require = createRequire(import.meta.url)

const { values: cliArgs } = parseArgs({
  options: {
    'allow-removals': {
      type: 'boolean',
    },
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
  const fetchFailures = opts?.fetchFailures
  const spinner = opts?.spinner
  const eco = NPM
  const manifestData: ManifestEntry[] = []
  const registryExtJson = require(REGISTRY_EXTENSIONS_JSON_PATH)
  const registryExt: Array<[string, RegistryExtensionData]> =
    registryExtJson[eco] ?? []

  await pEach(
    registryExt,
    async ([, data]) => {
      const nmPkgId = `${data.name}@latest`
      const fetched = await fetchManifestPackage(
        nmPkgId,
        [data.name, data.package],
        opts,
      )
      if (!fetched) {
        return
      }
      const { packageJson: nmPkgJson } = fetched
      if (nmPkgJson.version === '0.0.0') {
        spinner?.warn(`${nmPkgId}: 0.0.0 placeholder — skipping manifest entry`)
        return
      }
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

  await pEach(
    getNpmPackageNames(),
    async sockRegPkgName => {
      const origPkgName = resolveOriginalPackageName(sockRegPkgName)
      const nmPkgSpec =
        getPackageVersionSpec(origPkgName, undefined) || 'latest'
      const nmPkgId = `${origPkgName}@${nmPkgSpec}`
      const fetched = await fetchManifestPackage(nmPkgId, [origPkgName], opts)
      if (!fetched) {
        return
      }
      const { manifest: nmPkgManifest, packageJson: nmPkgJson } = fetched
      const pkgPath = path.join(NPM_PACKAGES_PATH, sockRegPkgName)
      const pkgJson = await readPackageJson(pkgPath, { normalize: true })
      if (!pkgJson) {
        spinner?.warn(`${sockRegPkgName}: Unable to read package.json`)
        fetchFailures?.add(origPkgName)
        return
      }
      const { name } = pkgJson

      const sockPkgManifest = (await fetchPackageManifest(`${name}@latest`)) as
        | PackageManifestInfo
        | undefined
      if (!sockPkgManifest) {
        spinner?.warn(`${name}: Not found in ${NPM} registry`)
        if (name) {
          fetchFailures?.add(name)
        }
        fetchFailures?.add(origPkgName)
        return
      }
      const version = sockPkgManifest.version
      if (version === '0.0.0') {
        spinner?.warn(`${name}: 0.0.0 placeholder — skipping manifest entry`)
        return
      }

      const metadata = createPackageMetadata(
        pkgJson,
        nmPkgJson,
        nmPkgManifest,
        origPkgName,
        version,
      )
      const purlObj = PackageURL.fromString(`pkg:${eco}/${name}@${version}`)
      manifestData.push([purlObj.toString(), metadata])
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

async function fetchManifestPackage(
  packageId: string,
  failureNames: string[],
  options?: AddNpmManifestDataOptions,
) {
  const opts = { __proto__: null, ...options } as typeof options
  const manifest = (await fetchPackageManifest(packageId)) as
    | PackageManifestInfo
    | undefined
  if (!manifest) {
    opts?.spinner?.warn(`${packageId}: Not found in ${NPM} registry`)
    recordFetchFailures(failureNames, options)
    return undefined
  }
  let packageJson: PackageJson | undefined
  await extractPackage(packageId, undefined, async packagePath => {
    packageJson = await readPackageJson(packagePath, { normalize: true })
  })
  if (!packageJson) {
    opts?.spinner?.warn(`${packageId}: Unable to read package.json`)
    recordFetchFailures(failureNames, options)
    return undefined
  }
  return { __proto__: null, manifest, packageJson }
}

function recordFetchFailures(
  names: string[],
  options?: AddNpmManifestDataOptions,
) {
  const opts = { __proto__: null, ...options } as typeof options
  for (let i = 0, { length } = names; i < length; i += 1) {
    const name = names[i]!
    opts?.fetchFailures?.add(name)
  }
}

function getPackageInterop(pkgJson: PackageJson) {
  const entryExports = resolvePackageJsonEntryExports(pkgJson.exports) as
    | Record<string, unknown>
    | undefined
  const interop = ['cjs']
  const isEsm = pkgJson.type === 'module'
  if (isEsm) {
    interop.push('esm')
  }
  const dotExport = entryExports?.['.'] as Record<string, unknown> | undefined
  const isBrowserify =
    !isEsm &&
    !!(
      (entryExports?.['node'] && entryExports?.['default']) ||
      (dotExport?.['node'] && dotExport?.['default'])
    )
  if (isBrowserify) {
    interop.push('browserify')
  }
  return interop.toSorted(naturalCompare)
}

function createPackageMetadata(
  pkgJson: PackageJson,
  nmPkgJson: PackageJson,
  nmPkgManifest: PackageManifestInfo,
  origPkgName: string,
  version: string | undefined,
) {
  const { engines, name, socket } = pkgJson
  const skipTests = shouldSkipTests(origPkgName, {
    ecosystem: NPM,
    testPath: TEST_NPM_PATH,
  })
  const metaEntries: Array<[PropertyKey, unknown]> = [
    ['name', name],
    ['interop', getPackageInterop(pkgJson)],
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
  return toSortedObjectFromEntries(metaEntries)
}

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
  const { npm, pnpm, yarn, ...filteredEngines } = engines
  return filteredEngines
}

export interface ManifestDropReport {
  failedDrops: string[]
  removals: string[]
}

/**
 * Diff the package set of the previous on-disk manifest against a freshly
 * regenerated one. A package that vanished is classified by the fetch-failure
 * list the run accumulated: recorded failure → `failedDrops`, otherwise →
 * `removals`. Matching keys off each entry's `name` and `package` meta fields
 * so both the Socket override name and the original npm name resolve.
 */
export function diffDroppedPackages(
  previous: Record<string, ManifestEntry[]> | undefined,
  next: Record<string, ManifestEntry[]>,
  fetchFailures: ReadonlySet<string>,
): ManifestDropReport {
  const failedDrops: string[] = []
  const removals: string[] = []
  if (!previous) {
    return { failedDrops, removals }
  }
  const metaString = (
    entry: ManifestEntry | undefined,
    key: string,
  ): string | undefined => {
    const value = entry?.[1]?.[key]
    return typeof value === 'string' ? value : undefined
  }
  for (const { 0: eco, 1: prevEntries } of Object.entries(previous)) {
    if (!Array.isArray(prevEntries)) {
      continue
    }
    const nextNames = new Set<string>()
    for (const entry of next[eco] ?? []) {
      const name = metaString(entry, 'name')
      if (name) {
        nextNames.add(name)
      }
    }
    for (const entry of prevEntries) {
      const name = metaString(entry, 'name')
      if (!name || nextNames.has(name)) {
        continue
      }
      const origName = metaString(entry, 'package')
      if (
        fetchFailures.has(name) ||
        (origName !== undefined && fetchFailures.has(origName))
      ) {
        failedDrops.push(name)
      } else {
        removals.push(name)
      }
    }
  }
  failedDrops.sort(naturalCompare)
  removals.sort(naturalCompare)
  return { failedDrops, removals }
}

async function readCurrentManifest(): Promise<
  Record<string, ManifestEntry[]> | undefined
> {
  let raw: string
  try {
    raw = await fs.readFile(REGISTRY_MANIFEST_JSON_PATH, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
      return undefined
    }
    throw e
  }
  return JSON.parse(raw) as Record<string, ManifestEntry[]>
}

async function main(): Promise<void> {
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
      const previous = await readCurrentManifest()
      const manifest: Record<string, ManifestEntry[]> = {}
      const fetchFailures = new Set<string>()
      await addNpmManifestData(manifest, { fetchFailures, spinner })
      const { failedDrops, removals } = diffDroppedPackages(
        previous,
        manifest,
        fetchFailures,
      )
      if (failedDrops.length) {
        throw new Error(
          `Refusing to write ${REL_REGISTRY_MANIFEST_JSON_PATH}: ` +
            `${failedDrops.length} previously-present package${failedDrops.length === 1 ? '' : 's'} ` +
            `dropped after registry fetch failures — transient errors must not ` +
            `shrink the manifest; re-run the update: ${failedDrops.join(', ')}`,
        )
      }
      if (removals.length && !cliArgs['allow-removals']) {
        throw new Error(
          `Refusing to write ${REL_REGISTRY_MANIFEST_JSON_PATH}: ` +
            `${removals.length} previously-present package${removals.length === 1 ? '' : 's'} ` +
            `would be removed: ${removals.join(', ')}. If the deletion is ` +
            `intentional, re-run with --allow-removals.`,
        )
      }
      await fs.writeFile(
        REGISTRY_MANIFEST_JSON_PATH,
        `${JSON.stringify(manifest, null, 2)}\n`,
        'utf8',
      )
    },
    spinner,
  })
  await spawn(
    process.execPath,
    [
      path.join(ROOT_PATH, 'scripts', 'fleet', 'format.mts'),
      REGISTRY_MANIFEST_JSON_PATH,
    ],
    { cwd: ROOT_PATH, stdio: 'inherit' },
  )
}

if (isMainModule(import.meta.url)) {
  main().catch((e: unknown) => {
    logger.error(e)
    process.exitCode = 1
  })
}
