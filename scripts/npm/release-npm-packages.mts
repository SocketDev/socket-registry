/**
 * @file Detect package changes and bump versions for npm release.
 *   Two states count as "needs publishing" and both are listed LOUDLY: a
 *   package whose shipped bytes changed, and a package npm still holds at the
 *   `0.0.0` name-reservation placeholder. The second one used to vanish — the
 *   manifest lookup asked for an EMPTY dist-tag, resolved nothing, and the
 *   check returned early — which is how nine packages sat at `0.0.0` on npm
 *   with `1.0.0` ready on disk while this script reported nothing and exited 0.
 */

import path from 'node:path'
import process from 'node:process'

import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { getAbortSignal } from '@socketsecurity/lib-stable/process/abort'
import { readPackageJson } from '@socketsecurity/lib-stable/packages/read'
import { readPackageJsonSync } from '@socketsecurity/lib-stable/packages/read'
import type { EditablePackageJsonInstance } from '@socketsecurity/lib-stable/packages/edit'
import { pEach } from '@socketsecurity/lib-stable/promises/iterate'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
import { getDefaultSpinner } from '@socketsecurity/lib-stable/spinner/default'
import type { SpinnerInstance } from '@socketsecurity/lib-stable/spinner/types'
import { withSpinner } from '@socketsecurity/lib-stable/spinner/with'
// oxlint-disable-next-line socket/prefer-stable-external-semver -- @socketsecurity/lib-stable has no ./external/semver export at the pinned version; semver is a devDependency (scripts/tests only, not bundled).
import semver from 'semver'
import { LATEST } from '../constants/packages.mts'
import {
  NPM_PACKAGES_PATH,
  REGISTRY_PKG_PATH,
  ROOT_PATH,
  SOCKET_REGISTRY_SCOPE,
} from '../constants/paths.mts'
import { getNpmPackageNames } from '../constants/testing.mts'
import { isMainModule } from '../fleet/_shared/is-main-module.mts'
import { runMain } from '../fleet/_shared/run-main.mts'
import type { ScriptMeta } from '../fleet/_shared/run-main.mts'
import {
  getLocalPackageFileHashes,
  getRemotePackageFileHashes,
} from './release-npm-packages-hashes.mts'
import {
  isPlaceholderNpmVersion,
  resolveDistTag,
} from './publish-npm-packages-needs.mts'
import { reportReleaseState } from './release-npm-packages-report.mts'
import { fetchPackageManifest } from '@socketsecurity/lib-stable/packages/manifest'
import type { NpmManifest as PackageManifest } from '../repo/util/manifest-types.mts'

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
  /**
   * Packages npm still holds at the `0.0.0` placeholder while a real version
   * waits on disk. Tracked apart from `bumped` because there is nothing to
   * bump — the local version is already right, it has simply never shipped —
   * and because this is the state that went unreported.
   */
  placeholders: PkgData[]
  /**
   * Packages whose state could not be determined at all: npm returned no
   * manifest for the name. Nothing can be staged for these until the lookup
   * works, so they make the run exit non-zero.
   */
  unresolved: PkgData[]
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
  return {
    bumped: [],
    changed: [],
    changes: [],
    placeholders: [],
    unresolved: [],
    warnings: [],
  }
}

function settledOrDefault<T>(
  result: PromiseSettledResult<T> | undefined,
  fallback: T,
): T {
  return result?.status === 'fulfilled' ? result.value : fallback
}

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
    // A silent `return` here is what hid nine unpublished packages. npm having
    // no manifest for the name means either the name is unclaimed (a first
    // publish) or the dist-tag does not resolve — both are things a release
    // run must SAY, and neither is "nothing to do".
    state.unresolved.push(pkg)
    state.warnings.push(
      `${pkg.printName}: npm resolved no manifest for ${pkg.name}@${pkg.tag}. Either the name is unpublished or the dist-tag does not exist.`,
    )
    spinner?.log(`?${pkg.name}@${pkg.tag} (npm resolved nothing)`)
    return
  }
  pkg.manifest = manifest
  pkg.version = manifest.version

  // A name npm still holds at the 0.0.0 reservation placeholder has a
  // resolvable `latest` and a published record, so every "is it on npm?" check
  // answers yes while nothing real has ever shipped. The local version being
  // higher is the whole signal, and it is reported without a bump: the version
  // on disk is already the one to publish.
  const localPkgJson = readPackageJsonSync(pkg.path)
  const onDiskVersion = localPkgJson?.version
  if (
    isPlaceholderNpmVersion(manifest.version) &&
    onDiskVersion &&
    !isPlaceholderNpmVersion(onDiskVersion)
  ) {
    pkg.version = onDiskVersion
    state.placeholders.push(pkg)
    spinner?.log(
      `!${pkg.name}@${onDiskVersion} (npm holds the 0.0.0 placeholder — never published)`,
    )
    return
  }

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

async function main(): Promise<number> {
  const release = process.argv.includes('--release')
  const registryPkgJson = readPackageJsonSync(REGISTRY_PKG_PATH)
  if (!registryPkgJson?.name || !registryPkgJson.version) {
    throw new Error(
      `The registry package.json is missing name/version.\n` +
        `  Where: ${REGISTRY_PKG_PATH}.\n` +
        `  Saw vs wanted: an unreadable or incomplete manifest; wanted both "name" and "version".\n` +
        `  Fix: repair registry/package.json, then re-run.`,
    )
  }
  // Derived from disk, never a constant: a hardcoded registry name drifted once
  // and silently turned the branches that compared against it into dead code.
  const registryPkg = packageData({
    name: registryPkgJson.name,
    path: REGISTRY_PKG_PATH,
    tag: resolveDistTag(registryPkgJson.version),
  })

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
      // resolveDistTag, not getReleaseTag: getReleaseTag parses a SPEC, so a
      // bare version made it return '' and every lookup below asked npm for an
      // empty dist-tag, which resolves nothing.
      tag: resolveDistTag(pkgVersion),
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

  if (getCachedAbortSignal().aborted) {
    return 0
  }

  const exitCode = reportReleaseState(state, { release })

  // Only a CHANGED package needs its manifest and package.json rewritten; a
  // placeholder package's local files are already the ones to publish.
  if (!state.bumped.length) {
    return exitCode
  }

  await withSpinner({
    message: 'Updating manifest and package.json files…',
    operation: async () => {
      // Direct node invocations — the update:package-json / update:manifest
      // root script aliases these once ran through were dropped, which left
      // this call site dead.
      const spawnOptions = { cwd: ROOT_PATH, stdio: 'inherit' as const }
      const update = (args: string[]) =>
        spawn(process.execPath, args, spawnOptions)
      await update(['scripts/npm/update-npm-package-json.mts'])
      await update(['scripts/npm/update-manifest.mts', '--force'])
    },
    spinner: getCachedDefaultSpinner(),
  })

  return exitCode
}

const SCRIPT_META: ScriptMeta = {
  describe:
    'reports which socket-registry packages need publishing and bumps the ones whose shipped bytes changed',
  help: `Usage: node scripts/npm/release-npm-packages.mts [options]

  Compares each package's shipped bytes against what npm has, bumps the ones
  that changed, and lists the ones npm still holds at the 0.0.0 placeholder.
  It never uploads: stage via npm-publish-packages.yml afterwards.

  --release   a release is expected — exit 1 when nothing can be staged`,
}

/* c8 ignore start - entrypoint guard; exercised via subprocess */
if (isMainModule(import.meta.url)) {
  runMain(main, SCRIPT_META)
}
/* c8 ignore stop */
