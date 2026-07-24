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
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
import { DEFAULT_CONCURRENCY } from '../constants/core.mts'
import { getNpmPackageNames } from '../constants/testing.mts'
import { isMainModule } from '../fleet/_shared/is-main-module.mts'
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
  ROOT_PATH,
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
  // Accumulates the names of packages the run attempted but could not fully
  // resolve — registry 404s, tarball extraction failures, unreadable
  // package.json files. The dropped-package guard in main() uses this set to
  // tell a transient fetch failure apart from an intentional removal.
  fetchFailures?: Set<string> | undefined
  spinner?: SpinnerInstance | undefined
}

export type ManifestEntry = [string, Record<string, unknown>]

const logger = getDefaultLogger()

const require = createRequire(import.meta.url)

const { values: cliArgs } = parseArgs({
  options: {
    // Acknowledge intentional package deletions — packages the extensions
    // config or packages/npm tree no longer lists. Without this flag any
    // shrink of the manifest's package set aborts the write.
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
        fetchFailures?.add(data.name)
        fetchFailures?.add(data.package)
        return
      }
      let nmPkgJson: PackageJson | undefined
      await extractPackage(nmPkgId, undefined, async nmPkgPath => {
        nmPkgJson = await readPackageJson(nmPkgPath, { normalize: true })
      })
      if (!nmPkgJson) {
        spinner?.warn(`${nmPkgId}: Unable to read package.json`)
        fetchFailures?.add(data.name)
        fetchFailures?.add(data.package)
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
        fetchFailures?.add(origPkgName)
        return
      }
      let nmPkgJson: PackageJson | undefined
      await extractPackage(nmPkgId, undefined, async nmPkgPath => {
        nmPkgJson = await readPackageJson(nmPkgPath, { normalize: true })
      })
      if (!nmPkgJson) {
        spinner?.warn(`${nmPkgId}: Unable to read package.json`)
        fetchFailures?.add(origPkgName)
        return
      }
      const pkgPath = path.join(NPM_PACKAGES_PATH, sockRegPkgName)
      const pkgJson = await readPackageJson(pkgPath, { normalize: true })
      if (!pkgJson) {
        spinner?.warn(`${sockRegPkgName}: Unable to read package.json`)
        fetchFailures?.add(origPkgName)
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
        if (name) {
          fetchFailures?.add(name)
        }
        fetchFailures?.add(origPkgName)
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

export interface ManifestDropReport {
  // Packages present in the previous manifest, absent from the regenerated
  // one, and attributable to a recorded fetch failure — a transient drop that
  // must never be written.
  failedDrops: string[]
  // Packages present before, absent now, with no recorded fetch failure —
  // the extensions/config stopped listing them. Written only under
  // --allow-removals.
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
      // First-ever generation — nothing to guard against.
      return undefined
    }
    throw e
  }
  return JSON.parse(raw) as Record<string, ManifestEntry[]>
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
      const previous = await readCurrentManifest()
      const manifest: Record<string, ManifestEntry[]> = {}
      const fetchFailures = new Set<string>()
      await addNpmManifestData(manifest, { fetchFailures, spinner })
      // Previously-present-package-disappeared guard: a transient registry
      // failure must fail the run loudly instead of silently shrinking the
      // manifest — observed live when @socketregistry/string.prototype.at
      // vanished on one run and reappeared on the next.
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
  // Canonicalize the rewritten manifest with the fleet formatter — the format
  // gate checks oxfmt's output, and the biomeFormat this script used to call
  // was dead code: biome is not installed, so it silently returned its input
  // unformatted.
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
