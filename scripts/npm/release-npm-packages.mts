/**
 * @file Detect package changes and bump versions for npm release.
 */

import crypto from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { execScript } from '@socketsecurity/lib-stable/eco/npm/script'
import { getAbortSignal } from '@socketsecurity/lib-stable/process/abort'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import {
  readPackageJson,
  readPackageJsonSync,
} from '@socketsecurity/lib-stable/packages/read'
import type { EditablePackageJsonInstance } from '@socketsecurity/lib-stable/packages/edit'
import { getReleaseTag } from '@socketsecurity/lib-stable/packages/specs'
import { extractPackage } from '@socketsecurity/lib-stable/packages/tarball'
import { pEach } from '@socketsecurity/lib-stable/promises/iterate'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
import { getDefaultSpinner } from '@socketsecurity/lib-stable/spinner/default'
import type { SpinnerInstance } from '@socketsecurity/lib-stable/spinner/types'
import { withSpinner } from '@socketsecurity/lib-stable/spinner/with'
import { minimatch } from 'minimatch'
// oxlint-disable-next-line socket/prefer-stable-external-semver -- @socketsecurity/lib-stable has no ./external/semver export at the pinned version; semver is a devDependency (scripts/tests only, not bundled).
import semver from 'semver'
import { LATEST, SOCKET_REGISTRY_PACKAGE_NAME } from '../constants/packages.mts'
import {
  NPM_PACKAGES_PATH,
  PACKAGE_JSON,
  REGISTRY_PKG_PATH,
  ROOT_PATH,
  SOCKET_REGISTRY_SCOPE,
} from '../constants/paths.mts'
import { getNpmPackageNames } from '../constants/testing.mts'
import { logSectionHeader } from '../repo/util/logging.mts'
import { fetchPackageManifest } from '@socketsecurity/lib-stable/packages/manifest'
import { isPlainObject as isObjectObject } from '@socketsecurity/lib-stable/objects/predicates'
import { readFileUtf8 } from '@socketsecurity/lib-stable/fs/read-file'
import { toSortedObject } from '@socketsecurity/lib-stable/objects/sort'
import type { NpmManifest as PackageManifest } from '../repo/util/manifest-types.mts'

const logger = getDefaultLogger()

export interface PackageDataInput {
  manifest?: PackageManifest | undefined
  name: string
  path: string
  printName?: string | undefined
  tag?: string | undefined
  version?: string | undefined
}

export interface PkgData extends PackageDataInput {
  printName: string
  tag: string
}

export interface BumpState {
  bumped: PkgData[]
  changed: PkgData[]
  changes: string[]
  warnings: string[]
}

export interface HasPackageChangedOptions {
  state?: BumpState | undefined
}

export interface MaybeBumpPackageOptions {
  spinner?: SpinnerInstance | undefined
  state?: BumpState | undefined
}

function createEmptyBumpState(): BumpState {
  return { bumped: [], changed: [], changes: [], warnings: [] }
}

function settledOrDefault<T>(
  result: PromiseSettledResult<T> | undefined,
  fallback: T,
): T {
  return result?.status === 'fulfilled' ? result.value : fallback
}

function logGroupedMessages(
  header: string,
  emoji: string,
  messages: string[],
): void {
  if (!messages.length) {
    return
  }
  logger.log('')
  logSectionHeader(header, { emoji })
  for (let i = 0, { length } = messages; i < length; i += 1) {
    logger.log(messages[i])
  }
}

const registryPkg = packageData({
  name: SOCKET_REGISTRY_PACKAGE_NAME,
  path: REGISTRY_PKG_PATH,
})

const EXTRACT_PACKAGE_TMP_PREFIX = 'release-npm-'

function memoize<T>(create: () => T): () => T {
  let cached: T | undefined
  return () => {
    if (cached === undefined) {
      cached = create()
    }
    return cached
  }
}

const getCachedAbortSignal = memoize(getAbortSignal)
const getCachedDefaultSpinner = memoize(getDefaultSpinner)

function sha256Hex(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex')
}

function parsePackageJsonContent(
  content: string,
  filePath: string,
): Record<string, unknown> {
  try {
    return JSON.parse(content)
  } catch (e) {
    throw new Error(`Failed to parse package.json at ${filePath}`, {
      cause: e,
    })
  }
}

// Hash only the fields that affect what npm publishes (never the version).
function hashRelevantPackageJson(pkgJson: Record<string, unknown>): string {
  const exportsValue = pkgJson['exports']
  const relevantData = {
    dependencies: toSortedObject(
      (pkgJson['dependencies'] as Record<string, string>) ?? {},
    ),
    exports: isObjectObject(exportsValue)
      ? toSortedObject(exportsValue as Record<string, unknown>)
      : (exportsValue ?? undefined),
    files: pkgJson['files'] ?? undefined,
    sideEffects: pkgJson['sideEffects'] ?? undefined,
    engines: pkgJson['engines'] ?? undefined,
  }
  return sha256Hex(JSON.stringify(relevantData))
}

// Recursively walk `rootDir`, hashing every file `visitFile` accepts.
// `shouldRecurse` gates descent into a directory by its path relative to
// `rootDir`; `visitFile` returns the file's hash, or undefined to skip it.
async function collectFileHashes(
  rootDir: string,
  shouldRecurse: (relativePath: string) => boolean,
  visitFile: (
    fullPath: string,
    relativePath: string,
  ) => Promise<string | undefined>,
): Promise<Record<string, string>> {
  const fileHashes: Record<string, string> = {}
  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (let i = 0, { length } = entries; i < length; i += 1) {
      const entry = entries[i]
      if (!entry) {
        continue
      }
      const fullPath = path.join(dir, entry.name)
      const relativePath = path.relative(rootDir, fullPath)
      if (entry.isDirectory()) {
        if (shouldRecurse(relativePath)) {
          await walk(fullPath)
        }
      } else if (entry.isFile()) {
        const hash = await visitFile(fullPath, relativePath)
        if (hash !== undefined) {
          fileHashes[relativePath] = hash
        }
      }
    }
  }
  await walk(rootDir)
  return fileHashes
}

export async function getLocalPackageFileHashes(
  packagePath: string,
): Promise<Record<string, string>> {
  const pkgJsonPath = path.join(packagePath, PACKAGE_JSON)
  const pkgJsonContent = await readFileUtf8(pkgJsonPath)
  const pkgJson = parsePackageJsonContent(pkgJsonContent, pkgJsonPath)
  const filesPatterns: string[] = (pkgJson['files'] as string[]) ?? []

  const fileHashes = await collectFileHashes(
    packagePath,
    // Always recurse for patterns with ** or when we're at root level.
    relativePath =>
      relativePath === '' ||
      filesPatterns.some(
        pattern =>
          pattern.includes('**') || pattern.startsWith(`${relativePath}/`),
      ),
    async (fullPath, relativePath) => {
      const entryName = path.basename(fullPath)
      if (entryName === PACKAGE_JSON) {
        return undefined
      }
      // npm auto-includes LICENSE/README with any case/extension at root.
      const isRootAutoIncluded =
        relativePath === entryName && isNpmAutoIncluded(entryName)
      const matchesPattern = filesPatterns.some(pattern => {
        // Handle patterns like **/LICENSE{.original,}
        if (pattern.includes('**')) {
          const fileName = path.basename(relativePath)
          const filePattern = pattern.replace('**/', '')
          return (
            minimatch(fileName, filePattern) || minimatch(relativePath, pattern)
          )
        }
        return minimatch(relativePath, pattern)
      })
      return isRootAutoIncluded || matchesPattern
        ? sha256Hex(await readFileUtf8(fullPath))
        : undefined
    },
  )

  fileHashes[PACKAGE_JSON] = hashRelevantPackageJson(pkgJson)
  return toSortedObject(fileHashes)
}

export async function getRemotePackageFileHashes(
  spec: string,
): Promise<Record<string, string>> {
  let fileHashes: Record<string, string> = {}
  await extractPackage(
    spec,
    { tmpPrefix: EXTRACT_PACKAGE_TMP_PREFIX },
    async tmpDir => {
      fileHashes = await collectFileHashes(
        tmpDir,
        () => true,
        async fullPath => {
          const content = await readFileUtf8(fullPath)
          // For package.json, hash only relevant fields (not version).
          return path.basename(fullPath) === PACKAGE_JSON
            ? hashRelevantPackageJson(
                parsePackageJsonContent(content, fullPath),
              )
            : sha256Hex(content)
        },
      )
    },
  )
  return toSortedObject(fileHashes)
}

export async function hasGitChanges(packagePath: string): Promise<boolean> {
  try {
    const relPath = path.relative(ROOT_PATH, packagePath)
    // Check both staged and unstaged changes.
    const { stdout } = await spawn(
      'git',
      ['status', '--porcelain', '--', relPath],
      { cwd: ROOT_PATH, stdioString: true },
    )
    return (stdout as string).trim().length > 0
  } catch {
    // If git fails, fall back to full comparison.
    return false
  }
}

export async function hasPackageChanged(
  pkg: PkgData,
  manifest_: PackageManifest | undefined,
  options: HasPackageChangedOptions,
): Promise<boolean> {
  const { state } = {
    __proto__: null,
    ...options,
  } as HasPackageChangedOptions

  const manifest =
    manifest_ ??
    ((await fetchPackageManifest(`${pkg.name}@${pkg.tag}`)) as
      | PackageManifest
      | undefined)

  if (!manifest) {
    throw new Error(
      `hasPackageChanged: Failed to fetch manifest for ${pkg.name}`,
    )
  }

  let changed = false
  // Compare actual file contents by extracting packages and comparing SHA hashes.
  try {
    const [remoteResult, localResult] = await Promise.allSettled([
      getRemotePackageFileHashes(`${pkg.name}@${manifest.version}`),
      getLocalPackageFileHashes(pkg.path),
    ])
    const remoteHashes = settledOrDefault(remoteResult, {})
    const localHashes = settledOrDefault(localResult, {})

    // Use remote files as source of truth and check if local matches.
    for (const { 0: file, 1: remoteHash } of Object.entries(remoteHashes)) {
      const localHash = localHashes[file]
      if (!localHash) {
        // File exists in remote but not locally - this is a real difference.
        const message = `${pkg.name}: File '${file}' exists in published package but not locally`
        state?.warnings.push(message)
        changed = true
      } else if (remoteHash !== localHash) {
        const message = `${pkg.name}: File '${file}' content differs`
        state?.changes.push(message)
        changed = true
      }
    }
  } catch (e) {
    // If comparison fails, be conservative and assume changes.
    const message = `${pkg.name}: ${errorMessage(e)}`
    state?.warnings.push(message)
    changed = true
  }
  return changed
}

export function isNpmAutoIncluded(fileName: string): boolean {
  const upperName = fileName.toUpperCase()
  // NPM automatically includes LICENSE and README files with any case and extension.
  return upperName.startsWith('LICENSE') || upperName.startsWith('README')
}

export async function maybeBumpPackage(
  pkg: PkgData,
  options: MaybeBumpPackageOptions,
): Promise<void> {
  const { spinner, state = createEmptyBumpState() } = {
    __proto__: null,
    ...options,
  } as MaybeBumpPackageOptions & { state: BumpState }
  if (getCachedAbortSignal().aborted) {
    spinner?.stop()
    return
  }

  spinner?.text(`Checking ${pkg.printName}...`)

  const manifest = (await fetchPackageManifest(`${pkg.name}@${pkg.tag}`)) as
    | PackageManifest
    | undefined
  if (!manifest) {
    return
  }
  pkg.manifest = manifest
  pkg.version = manifest.version

  // Fast path: Check git for uncommitted changes first.
  const hasGitChange = await hasGitChanges(pkg.path)

  let hasChanged = false
  if (hasGitChange) {
    // Git shows changes, skip expensive hash comparison.
    spinner?.text(`Detected git changes in ${pkg.printName}`)
    hasChanged = true
  } else {
    // No git changes, do full hash comparison.
    spinner?.text(`Comparing ${pkg.printName} against published version…`)
    hasChanged = await hasPackageChanged(pkg, manifest, { state })
  }

  if (hasChanged) {
    const editablePkgJson = (await readPackageJson(pkg.path, {
      editable: true,
      normalize: true,
    })) as unknown as EditablePackageJsonInstance | undefined
    if (!editablePkgJson) {
      throw new Error(
        `maybeBumpPackage: Failed to read editable package.json for ${pkg.name}`,
      )
    }
    const localVersion = editablePkgJson.content.version
    // If local version is already ahead, no need to bump.
    if (localVersion && semver.gt(localVersion, manifest.version)) {
      pkg.version = localVersion
      spinner?.log(
        `=${pkg.name}@${localVersion} (already bumped from ${manifest.version})`,
      )
      state.bumped.push(pkg)
    } else {
      let version = semver.inc(manifest.version, 'patch')
      if (!version) {
        throw new Error(
          `maybeBumpPackage: Failed to increment version for ${pkg.name}@${manifest.version}`,
        )
      }
      if (pkg.tag !== LATEST && pkg.tag) {
        const incremented = semver.inc(version, 'patch')
        version = `${incremented}-${pkg.tag}`
      }
      pkg.version = version
      editablePkgJson.update({ version })
      await editablePkgJson.save()
      state.changed.push(pkg)
      spinner?.log(`+${pkg.name}@${manifest.version} -> ${version}`)
      state.bumped.push(pkg)
    }
  }
}

export function packageData(data: PackageDataInput): PkgData {
  const { manifest, printName = data.name, tag = LATEST, version } = data
  return Object.assign(data, {
    manifest,
    printName,
    tag,
    version,
  })
}

async function main(): Promise<void> {
  const npmPackages = Array.from(getNpmPackageNames(), sockRegPkgName => {
    const pkgPath = path.join(NPM_PACKAGES_PATH, sockRegPkgName)
    const pkgJson = readPackageJsonSync(pkgPath)
    const pkgVersion = pkgJson?.version
    if (!pkgVersion) {
      throw new Error(
        `main: package.json for ${sockRegPkgName} is missing a version`,
      )
    }
    return packageData({
      name: `${SOCKET_REGISTRY_SCOPE}/${sockRegPkgName}`,
      path: pkgPath,
      printName: sockRegPkgName,
      tag: getReleaseTag(pkgVersion),
    })
  })

  const state = createEmptyBumpState()

  await withSpinner({
    message: 'Checking for package changes…',
    operation: async () => {
      // Check registry package FIRST before processing npm packages.
      await maybeBumpPackage(registryPkg, {
        spinner: getCachedDefaultSpinner(),
        state,
      })

      // Process npm packages in parallel 3 at a time.
      await pEach(
        npmPackages,
        async pkg => {
          await maybeBumpPackage(pkg, {
            spinner: getCachedDefaultSpinner(),
            state,
          })
        },
        { concurrency: 3 },
      )
    },
    spinner: getCachedDefaultSpinner(),
  })

  if (getCachedAbortSignal().aborted || !state.bumped.length) {
    return
  }

  logGroupedMessages('Warnings', '⚠️', state.warnings)
  logGroupedMessages('Changes', 'ℹ', state.changes)

  await withSpinner({
    message: 'Updating manifest and package.json files…',
    operation: async () => {
      const spawnOptions = { cwd: ROOT_PATH, stdio: 'inherit' as const }
      await execScript('update:package-json', [], spawnOptions)
      await execScript('update:manifest', ['--', '--force'], spawnOptions)
    },
    spinner: getCachedDefaultSpinner(),
  })
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
