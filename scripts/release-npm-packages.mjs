/** @fileoverview Detect package changes and bump versions for npm release. */

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { minimatch } from 'minimatch'
import semver from 'semver'

import constants from './constants.mjs'

import { execScript } from '../registry/dist/lib/agent.js'
import {
  extractPackage,
  fetchPackageManifest,
  getReleaseTag,
  readPackageJson,
  readPackageJsonSync,
} from '../registry/dist/lib/packages.js'
import { readFileUtf8 } from '../registry/dist/lib/fs.js'
import { pEach } from '../registry/dist/lib/promises.js'
import { isObjectObject, toSortedObject } from '../registry/dist/lib/objects.js'

import { logSectionHeader } from './utils/logging.mjs'

const {
  LATEST,
  PACKAGE_JSON,
  SOCKET_REGISTRY_PACKAGE_NAME,
  SOCKET_REGISTRY_SCOPE,
  abortSignal,
  npmPackagesPath,
  registryPkgPath,
  relNpmPackagesPath,
  rootPath,
} = constants

const registryPkg = packageData({
  name: SOCKET_REGISTRY_PACKAGE_NAME,
  path: registryPkgPath,
})

const EXTRACT_PACKAGE_TMP_PREFIX = 'release-npm-'

/**
 * Compute SHA256 hashes for all files in a local package directory.
 */
async function getLocalPackageFileHashes(packagePath) {
  const fileHashes = {}

  // Read package.json to get files field.
  const pkgJsonPath = path.join(packagePath, PACKAGE_JSON)
  const pkgJsonContent = await readFileUtf8(pkgJsonPath)
  const pkgJson = JSON.parse(pkgJsonContent)
  const filesPatterns = pkgJson.files || []

  // Always include package.json.
  const pkgJsonRelPath = PACKAGE_JSON
  const exportsValue = pkgJson.exports
  const relevantData = {
    dependencies: toSortedObject(pkgJson.dependencies ?? {}),
    exports: isObjectObject(exportsValue)
      ? toSortedObject(exportsValue)
      : (exportsValue ?? undefined),
    files: pkgJson.files ?? undefined,
    sideEffects: pkgJson.sideEffects ?? undefined,
    engines: pkgJson.engines ?? undefined,
  }
  const pkgJsonHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(relevantData), 'utf8')
    .digest('hex')
  fileHashes[pkgJsonRelPath] = pkgJsonHash

  // Walk and hash files.
  async function walkDir(dir, baseDir = packagePath) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relativePath = path.relative(baseDir, fullPath)

      if (entry.isDirectory()) {
        // Always recurse for patterns with ** or when we're at root level and have patterns.
        const shouldRecurse =
          relativePath === '' ||
          filesPatterns.some(pattern => {
            return (
              pattern.includes('**') || pattern.startsWith(relativePath + '/')
            )
          })

        if (shouldRecurse) {
          // eslint-disable-next-line no-await-in-loop
          await walkDir(fullPath, baseDir)
        }
      } else if (entry.isFile() && entry.name !== PACKAGE_JSON) {
        // Check if file is npm auto-included (LICENSE/README with any case/extension in root).
        const isRootAutoIncluded =
          relativePath === entry.name && isNpmAutoIncluded(entry.name)

        // Check if file matches any of the patterns.
        const matchesPattern = filesPatterns.some(pattern => {
          // Handle patterns like **/LICENSE{.original,}
          if (pattern.includes('**')) {
            const fileName = path.basename(relativePath)
            const filePattern = pattern.replace('**/', '')
            return (
              minimatch(fileName, filePattern) ||
              minimatch(relativePath, pattern)
            )
          }
          return minimatch(relativePath, pattern)
        })

        if (isRootAutoIncluded || matchesPattern) {
          // eslint-disable-next-line no-await-in-loop
          const content = await readFileUtf8(fullPath)
          const hash = crypto
            .createHash('sha256')
            .update(content, 'utf8')
            .digest('hex')
          fileHashes[relativePath] = hash
        }
      }
    }
  }

  await walkDir(packagePath)

  return toSortedObject(fileHashes)
}

/**
 * Compute SHA256 hashes for all files in a remote published package.
 */
async function getRemotePackageFileHashes(spec) {
  const fileHashes = {}

  // Extract remote package and hash files.
  await extractPackage(
    spec,
    {
      tmpPrefix: EXTRACT_PACKAGE_TMP_PREFIX,
    },
    async tmpDir => {
      // Walk the directory and compute hashes for all files.
      async function walkDir(dir, baseDir = tmpDir) {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          const relativePath = path.relative(baseDir, fullPath)

          if (entry.isDirectory()) {
            // Recurse into subdirectories.
            // eslint-disable-next-line no-await-in-loop
            await walkDir(fullPath, baseDir)
          } else if (entry.isFile()) {
            // eslint-disable-next-line no-await-in-loop
            const content = await readFileUtf8(fullPath)

            if (entry.name === PACKAGE_JSON) {
              // For package.json, hash only relevant fields (not version).
              const pkgJson = JSON.parse(content)
              const exportsValue = pkgJson.exports
              const relevantData = {
                dependencies: toSortedObject(pkgJson.dependencies ?? {}),
                exports: isObjectObject(exportsValue)
                  ? toSortedObject(exportsValue)
                  : (exportsValue ?? undefined),
                files: pkgJson.files ?? undefined,
                sideEffects: pkgJson.sideEffects ?? undefined,
                engines: pkgJson.engines ?? undefined,
              }
              const hash = crypto
                .createHash('sha256')
                .update(JSON.stringify(relevantData), 'utf8')
                .digest('hex')
              fileHashes[relativePath] = hash
            } else {
              // For other files, hash the entire content.
              const hash = crypto
                .createHash('sha256')
                .update(content, 'utf8')
                .digest('hex')
              fileHashes[relativePath] = hash
            }
          }
        }
      }

      await walkDir(tmpDir)
    },
  )

  return toSortedObject(fileHashes)
}

/**
 * Compare local and remote package files to detect changes.
 */
async function hasPackageChanged(pkg, manifest_, options) {
  const { state } = { __proto__: null, ...options }

  const manifest =
    manifest_ ?? (await fetchPackageManifest(`${pkg.name}@${pkg.tag}`))

  if (!manifest) {
    throw new Error(
      `hasPackageChanged: Failed to fetch manifest for ${pkg.name}`,
    )
  }

  let changed = false
  // Compare actual file contents by extracting packages and comparing SHA hashes.
  try {
    const { 0: remoteHashes, 1: localHashes } = await Promise.all([
      getRemotePackageFileHashes(`${pkg.name}@${manifest.version}`),
      getLocalPackageFileHashes(pkg.path),
    ])

    // Use remote files as source of truth and check if local matches.
    for (const { 0: file, 1: remoteHash } of Object.entries(remoteHashes)) {
      const localHash = localHashes[file]
      if (!localHash) {
        // File exists in remote but not locally - this is a real difference.
        const message = `${pkg.name}: File '${file}' exists in published package but not locally`
        state?.warnings.push(message)
        changed = true
      }
      if (remoteHash !== localHash) {
        const message = `${pkg.name}: File '${file}' content differs`
        state?.changes.push(message)
        changed = true
      }
    }
  } catch (e) {
    // If comparison fails, be conservative and assume changes.
    const message = `${pkg.name}: ${e?.message}`
    state?.warnings.push(message)
    changed = true
  }
  return changed
}

/**
 * Check if a file is automatically included by npm in published packages.
 */
function isNpmAutoIncluded(fileName) {
  const upperName = fileName.toUpperCase()
  // NPM automatically includes LICENSE and README files with any case and extension.
  return upperName.startsWith('LICENSE') || upperName.startsWith('README')
}

/**
 * Bump package version if changes are detected.
 */
async function maybeBumpPackage(pkg, options) {
  const {
    spinner,
    state = {
      bumped: [],
      changed: [],
      changes: [],
      warnings: [],
    },
  } = {
    __proto__: null,
    ...options,
  }
  if (abortSignal.aborted) {
    spinner?.stop()
    return
  }
  const manifest = await fetchPackageManifest(`${pkg.name}@${pkg.tag}`)
  if (!manifest) {
    return
  }
  pkg.manifest = manifest
  pkg.version = manifest.version
  // Compare the shasum of the @socketregistry the latest package from
  // registry.npmjs.org against the local version. If they are different
  // then bump the local version.
  const hasChanged = await hasPackageChanged(pkg, manifest, { state })
  if (hasChanged) {
    let version = semver.inc(manifest.version, 'patch')
    if (pkg.tag !== LATEST && pkg.tag) {
      version = `${semver.inc(version, 'patch')}-${pkg.tag}`
    }
    pkg.version = version
    const editablePkgJson = await readPackageJson(pkg.path, {
      editable: true,
      normalize: true,
    })
    if (editablePkgJson.content.version !== version) {
      editablePkgJson.update({ version })
      await editablePkgJson.save()
      state.changed.push(pkg)
      spinner?.log(`+${pkg.name}@${manifest.version} -> ${version}`)
    }
    state.bumped.push(pkg)
  }
}

/**
 * Create package metadata with defaults.
 */
function packageData(data) {
  const { manifest, printName = data.name, tag = LATEST, version } = data
  return Object.assign(data, {
    manifest,
    printName,
    tag,
    version,
  })
}

/**
 * Detect changes and bump versions for all packages.
 */
async function main() {
  const { spinner } = constants

  spinner.start(`Bumping ${relNpmPackagesPath} versions (semver patch)...`)

  const npmPackages = Array.from(constants.npmPackageNames, sockRegPkgName => {
    const pkgPath = path.join(npmPackagesPath, sockRegPkgName)
    const pkgJson = readPackageJsonSync(pkgPath)
    return packageData({
      name: `${SOCKET_REGISTRY_SCOPE}/${sockRegPkgName}`,
      path: pkgPath,
      printName: sockRegPkgName,
      tag: getReleaseTag(pkgJson.version),
    })
  })

  const state = {
    bumped: [],
    changed: [],
    changes: [],
    warnings: [],
  }

  // Check registry package FIRST before processing npm packages.
  await maybeBumpPackage(registryPkg, { state })

  // Process npm packages in parallel 3 at a time.
  await pEach(
    npmPackages,
    async pkg => {
      await maybeBumpPackage(pkg, { state })
    },
    { concurrency: 3 },
  )

  if (abortSignal.aborted || !state.bumped.length) {
    spinner.stop()
    return
  }

  // Log grouped warnings and changes.
  spinner.stop()

  if (state.warnings.length) {
    console.log('')
    logSectionHeader('Warnings', { emoji: '⚠️' })
    for (const warning of state.warnings) {
      console.log(warning)
    }
  }

  if (state.changes.length) {
    console.log('')
    logSectionHeader('Changes', { emoji: 'ℹ' })
    for (const change of state.changes) {
      console.log(change)
    }
  }

  spinner.start(`Updating manifest and package.json files...`)

  const spawnOptions = {
    cwd: rootPath,
    stdio: 'inherit',
  }

  await execScript('update:package-json', [], spawnOptions)
  await execScript('update:manifest', ['--', '--force'], spawnOptions)

  spinner.stop()
}

main().catch(console.error)
