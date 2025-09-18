'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

const semver = require('semver')

const constants = require('@socketregistry/scripts/constants')
const { execScript } = require('@socketsecurity/registry/lib/agent')
const {
  extractPackage,
  fetchPackageManifest,
  getReleaseTag,
  readPackageJson
} = require('@socketsecurity/registry/lib/packages')
const { readPackageJsonSync } = require('@socketsecurity/registry/lib/packages')
const { readFileUtf8 } = require('@socketsecurity/registry/lib/fs')
const { pEach } = require('@socketsecurity/registry/lib/promises')
const { toSortedObject } = require('@socketsecurity/registry/lib/objects')

const {
  LATEST,
  PACKAGE_JSON,
  SOCKET_REGISTRY_PACKAGE_NAME,
  SOCKET_REGISTRY_SCOPE,
  abortSignal,
  npmPackagesPath,
  registryPkgPath,
  relNpmPackagesPath,
  rootPath
} = constants

const registryPkg = packageData({
  name: SOCKET_REGISTRY_PACKAGE_NAME,
  path: registryPkgPath
})

const EXTRACT_PACKAGE_TMP_PREFIX = 'release-npm-'

async function getPackageFileHashes(spec) {
  const fileHashes = {}

  // Extract package to a temp directory and compute hashes.
  await extractPackage(
    spec,
    {
      tmpPrefix: EXTRACT_PACKAGE_TMP_PREFIX
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
          } else if (entry.isFile() && entry.name !== PACKAGE_JSON) {
            // Skip package.json files as they contain version info.
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

      await walkDir(tmpDir)
    }
  )

  return toSortedObject(fileHashes)
}

async function hasPackageChanged(pkg, manifest_) {
  const manifest =
    manifest_ ?? (await fetchPackageManifest(`${pkg.name}@${pkg.tag}`))

  if (!manifest) {
    throw new Error(
      `hasPackageChanged: Failed to fetch manifest for ${pkg.name}`
    )
  }

  // First check if package.json version or dependencies have changed.
  const localPkgJson = readPackageJsonSync(pkg.path)

  // Check if dependencies have changed.
  const localDeps = toSortedObject(localPkgJson.dependencies ?? {})
  const remoteDeps = toSortedObject(manifest.dependencies ?? {})

  const localDepsStr = JSON.stringify(localDeps)
  const remoteDepsStr = JSON.stringify(remoteDeps)

  // If dependencies changed, we need to bump.
  if (localDepsStr !== remoteDepsStr) {
    return true
  }

  // Check if other important fields have changed.
  const fieldsToCheck = ['exports', 'files', 'sideEffects', 'engines']
  for (const field of fieldsToCheck) {
    const localValue = JSON.stringify(localPkgJson[field] ?? null)
    const remoteValue = JSON.stringify(manifest[field] ?? null)
    if (localValue !== remoteValue) {
      return true
    }
  }

  // Compare actual file contents by extracting packages and comparing SHA hashes.
  try {
    const { 0: remoteHashes, 1: localHashes } = await Promise.all([
      getPackageFileHashes(`${pkg.name}@${manifest.version}`),
      getPackageFileHashes(pkg.path, true)
    ])

    // Compare the file hashes.
    const remoteFiles = Object.keys(remoteHashes)
    const localFiles = Object.keys(localHashes)

    // Check if file lists are different.
    if (JSON.stringify(remoteFiles) !== JSON.stringify(localFiles)) {
      return true
    }

    // Check if any file content is different.
    for (const file of remoteFiles) {
      if (remoteHashes[file] !== localHashes[file]) {
        return true
      }
    }

    return false
  } catch (e) {
    // If comparison fails, be conservative and assume changes.
    console.error(`Error comparing packages for ${pkg.name}:`, e?.message)
    return true
  }
}

async function maybeBumpPackage(pkg, options = {}) {
  const {
    spinner,
    state = {
      bumped: [],
      changed: []
    }
  } = {
    __proto__: null,
    ...options
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
  if (await hasPackageChanged(pkg, manifest)) {
    let version = semver.inc(manifest.version, 'patch')
    if (pkg.tag !== LATEST) {
      version = `${semver.inc(version, 'patch')}-${pkg.tag}`
    }
    pkg.version = version
    const editablePkgJson = await readPackageJson(pkg.path, {
      editable: true,
      normalize: true
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
    version
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
        tag: getReleaseTag(pkgJson.version)
      })
    })
  ]

  const state = {
    bumped: [],
    changed: []
  }

  // Chunk packages data to process them in parallel 3 at a time.
  await pEach(
    packages,
    async pkg => {
      await maybeBumpPackage(pkg, { state })
    },
    { concurrency: 3 }
  )

  if (abortSignal.aborted || !state.bumped.length) {
    spinner.stop()
    return
  }

  const spawnOptions = {
    cwd: rootPath,
    stdio: 'inherit'
  }

  await execScript('update:manifest', ['--', '--force'], spawnOptions)

  if (!state.bumped.find(pkg => pkg === registryPkg)) {
    const version = semver.inc(registryPkg.manifest.version, 'patch')
    const editablePkgJson = await readPackageJson(registryPkg.path, {
      editable: true,
      normalize: true
    })
    editablePkgJson.update({ version })
    await editablePkgJson.save()
    spinner.log(
      `+${registryPkg.name}@${registryPkg.manifest.version} -> ${version}`
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
      spawnOptions
    )
  }

  spinner.stop()
})()
