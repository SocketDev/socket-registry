'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

const { minimatch } = require('minimatch')
const semver = require('semver')

const constants = require('@socketregistry/scripts/constants')
const { execScript } = require('@socketsecurity/registry/lib/agent')
const {
  extractPackage,
  fetchPackageManifest,
  getReleaseTag,
  readPackageJson,
} = require('@socketsecurity/registry/lib/packages')
const { readPackageJsonSync } = require('@socketsecurity/registry/lib/packages')
const { readFileUtf8 } = require('@socketsecurity/registry/lib/fs')
const { pEach } = require('@socketsecurity/registry/lib/promises')
const {
  isObjectObject,
  toSortedObject,
} = require('@socketsecurity/registry/lib/objects')

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
      : (exportsValue ?? null),
    files: pkgJson.files ?? null,
    sideEffects: pkgJson.sideEffects ?? null,
    engines: pkgJson.engines ?? null,
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
                  : (exportsValue ?? null),
                files: pkgJson.files ?? null,
                sideEffects: pkgJson.sideEffects ?? null,
                engines: pkgJson.engines ?? null,
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

async function hasPackageChanged(pkg, manifest_) {
  const { spinner } = constants

  const manifest =
    manifest_ ?? (await fetchPackageManifest(`${pkg.name}@${pkg.tag}`))

  if (!manifest) {
    throw new Error(
      `hasPackageChanged: Failed to fetch manifest for ${pkg.name}`,
    )
  }

  // Compare actual file contents by extracting packages and comparing SHA hashes.
  try {
    const { 0: remoteHashes, 1: localHashes } = await Promise.all([
      getRemotePackageFileHashes(`${pkg.name}@${manifest.version}`),
      getLocalPackageFileHashes(pkg.path),
    ])

    // Use remote files as source of truth and check if local matches.
    for (const [file, remoteHash] of Object.entries(remoteHashes)) {
      const localHash = localHashes[file]
      if (!localHash) {
        // File exists in remote but not locally - this is a real difference.
        spinner?.warn(
          `${pkg.name}: File '${file}' exists in published package but not locally`,
        )
        return true
      }
      if (remoteHash !== localHash) {
        spinner?.info(`${pkg.name}: File '${file}' content differs`)
        return true
      }
    }

    return false
  } catch (e) {
    // If comparison fails, be conservative and assume changes.
    spinner?.fail(`${pkg.name}: ${e?.message}`)
    return true
  }
}

function isNpmAutoIncluded(fileName) {
  const upperName = fileName.toUpperCase()
  // NPM automatically includes LICENSE and README files with any case and extension.
  return upperName.startsWith('LICENSE') || upperName.startsWith('README')
}

async function maybeBumpPackage(pkg, options) {
  const {
    spinner,
    state = {
      bumped: [],
      changed: [],
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
  const hasChanged = await hasPackageChanged(pkg, manifest)
  if (hasChanged) {
    let version = semver.inc(manifest.version, 'patch')
    if (pkg.tag !== LATEST) {
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

function packageData(data) {
  const { manifest, printName = data.name, tag = LATEST, version } = data
  return Object.assign(data, {
    manifest,
    printName,
    tag,
    version,
  })
}

void (async () => {
  const { spinner } = constants

  spinner.start(`Bumping ${relNpmPackagesPath} versions (semver patch)...`)

  const packages = [
    registryPkg,
    ...Array.from(constants.npmPackageNames, sockRegPkgName => {
      const pkgPath = path.join(npmPackagesPath, sockRegPkgName)
      const pkgJson = readPackageJsonSync(pkgPath)
      return packageData({
        name: `${SOCKET_REGISTRY_SCOPE}/${sockRegPkgName}`,
        path: pkgPath,
        printName: sockRegPkgName,
        tag: getReleaseTag(pkgJson.version),
      })
    }),
  ]

  const state = {
    bumped: [],
    changed: [],
  }

  // Chunk packages data to process them in parallel 3 at a time.
  await pEach(
    packages,
    async pkg => {
      await maybeBumpPackage(pkg, { state })
    },
    { concurrency: 3 },
  )

  if (abortSignal.aborted || !state.bumped.length) {
    spinner.stop()
    return
  }

  const spawnOptions = {
    cwd: rootPath,
    stdio: 'inherit',
  }

  await execScript('update:manifest', ['--', '--force'], spawnOptions)

  if (!state.bumped.find(pkg => pkg === registryPkg)) {
    const version = semver.inc(registryPkg.manifest.version, 'patch')
    const editablePkgJson = await readPackageJson(registryPkg.path, {
      editable: true,
      normalize: true,
    })
    editablePkgJson.update({ version })
    await editablePkgJson.save()
    spinner.log(
      `+${registryPkg.name}@${registryPkg.manifest.version} -> ${version}`,
    )
  }

  await execScript('update:package-json', [], spawnOptions)

  if (
    state.changed.length > 1 ||
    (state.changed.length === 1 && state.changed[0] !== registryPkg)
  ) {
    await execScript(
      'update:longtask:test:npm:package-json',
      ['--', '--quiet', '--force'],
      spawnOptions,
    )
  }

  spinner.stop()
})()
