'use strict'

const { promises: fs } = require('node:fs')
const path = require('node:path')

const semver = require('semver')
const ssri = require('ssri')

const constants = require('@socketregistry/scripts/constants')
const { readDirNames } = require('@socketsecurity/registry/lib/fs')
const { execNpm, runScript } = require('@socketsecurity/registry/lib/npm')
const {
  fetchPackageManifest,
  getReleaseTag,
  packPackage,
  readPackageJson
} = require('@socketsecurity/registry/lib/packages')
const { readPackageJsonSync } = require('@socketsecurity/registry/lib/packages')
const { pEach } = require('@socketsecurity/registry/lib/promises')
const { Spinner } = require('@socketsecurity/registry/lib/spinner')

const {
  LATEST,
  NODE_MODULES,
  OVERRIDES,
  PACKAGE_SCOPE,
  RESOLUTIONS,
  SOCKET_OVERRIDE_SCOPE,
  SOCKET_REGISTRY_PACKAGE_NAME,
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

async function filterSocketOverrideScopePackages(packages, options = {}) {
  const { signal } = { __proto__: null, ...options }
  const socketOverridePackages = []
  // Chunk packages data to process them in parallel 3 at a time.
  await pEach(packages, 3, async pkg => {
    if (signal.aborted) {
      return
    }
    const overridesPath = path.join(pkg.path, OVERRIDES)
    const overrideNames = await readDirNames(overridesPath)
    for (const overrideName of overrideNames) {
      const overridePkgPath = path.join(overridesPath, overrideName)
      const overridePkgJson = readPackageJsonSync(overridePkgPath)
      const overridePrintName = `${pkg.printName}/${path.relative(pkg.path, overridePkgPath)}`
      if (!overridePkgJson.name?.startsWith(`${SOCKET_OVERRIDE_SCOPE}/`)) {
        continue
      }
      // Add @socketoverride package data.
      socketOverridePackages.push(
        packageData({
          name: pkg.name,
          bundledDependencies: !!overridePkgJson.bundleDependencies,
          path: overridePkgPath,
          printName: overridePrintName,
          tag: getReleaseTag(overridePkgJson.version)
        })
      )
    }
  })
  return socketOverridePackages
}

async function hasPackageChanged(pkg, manifest_) {
  const manifest =
    manifest_ ?? (await fetchPackageManifest(`${pkg.name}@${pkg.tag}`))
  if (!manifest) {
    throw new Error(
      `hasPackageChanged: Failed to fetch manifest for ${pkg.name}`
    )
  }
  // Compare the shasum of the latest package from registry.npmjs.org against
  // the local version. If they are different then bump the local version.
  return (
    ssri
      .fromData(
        await packPackage(`${pkg.name}@${manifest.version}`, {
          signal: abortSignal
        })
      )
      .sha512[0].hexDigest() !==
    ssri
      .fromData(await packPackage(pkg.path, { signal: abortSignal }))
      .sha512[0].hexDigest()
  )
}

async function installBundledDependencies(pkg, options) {
  const { spinner } = { __proto__: null, ...options }
  try {
    // Install bundled dependencies, including overrides.
    await execNpm(
      [
        'install',
        // Even though the 'silent' flag is passed npm will still run through
        // code paths for 'audit' and 'fund' unless '--no-audit' and '--no-fund'
        // flags are passed.
        '--silent',
        '--no-audit',
        '--no-fund',
        '--no-progress',
        '--workspaces',
        'false',
        '--install-strategy',
        'hoisted'
      ],
      {
        cwd: pkg.path,
        stdio: 'ignore'
      }
    )
  } catch (e) {
    spinner?.error(e)
  }
}

async function maybeBumpPackage(pkg, options = {}) {
  const {
    signal,
    spinner,
    state = {
      bumped: [],
      bumpedPrerelease: [],
      changed: [],
      changedPrerelease: [],
      prerelease: []
    }
  } = {
    __proto__: null,
    ...options
  }
  if (signal.aborted) {
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
    const isPrerelease = state.prerelease.includes(pkg)
    let version = semver.inc(manifest.version, 'patch')
    if (isPrerelease) {
      version = `${semver.inc(version, 'patch')}-${pkg.tag}`
    }
    pkg.version = version
    const editablePkgJson = await readPackageJson(pkg.path, {
      editable: true
    })
    if (editablePkgJson.content.version !== version) {
      editablePkgJson.update({ version })
      await editablePkgJson.save()
      state.changed.push(pkg)
      if (isPrerelease) {
        state.changedPrerelease.push(pkg)
      }
      spinner?.log(`+${pkg.name}@${manifest.version} -> ${version}`)
    }
    state.bumped.push(pkg)
    if (isPrerelease) {
      state.bumpedPrerelease.push(pkg)
    }
  }
}

function packageData(data) {
  const {
    bundledDependencies = false,
    manifest,
    printName = data.name,
    tag = LATEST,
    version
  } = data
  return Object.assign(data, {
    bundledDependencies,
    manifest,
    printName,
    tag,
    version
  })
}

async function updateOverrideVersionInParent(pkg, version) {
  // Reset prerelease version in parent dependencies.
  const parentPkgPath = path.resolve(pkg.path, '../..')
  const editableParentPkgJson = await readPackageJson(parentPkgPath, {
    editable: true
  })
  const spec = `npm:${pkg.name}@${version}`
  const overrideName = path.basename(pkg.path)
  const { overrides: oldOverrides, resolutions: oldResolutions } =
    editableParentPkgJson.content
  const overrideEntries = [
    [OVERRIDES, oldOverrides],
    [RESOLUTIONS, oldResolutions]
  ]
  for (const { 0: overrideField, 1: overrideObj } of overrideEntries) {
    if (overrideObj) {
      editableParentPkgJson.update({
        [overrideField]: {
          ...overrideObj,
          [overrideName]: spec
        }
      })
    }
  }
  await editableParentPkgJson.save()
}

void (async () => {
  const spinner = Spinner({
    text: `Bumping ${relNpmPackagesPath} versions (semver patch)...`
  }).start()

  const packages = [
    registryPkg,
    // Lazily access constants.npmPackageNames.
    ...constants.npmPackageNames.map(sockRegPkgName => {
      const pkgPath = path.join(npmPackagesPath, sockRegPkgName)
      const pkgJson = readPackageJsonSync(pkgPath)
      return packageData({
        name: `${PACKAGE_SCOPE}/${sockRegPkgName}`,
        path: pkgPath,
        printName: sockRegPkgName,
        bundledDependencies: !!pkgJson.bundleDependencies,
        tag: getReleaseTag(pkgJson.version)
      })
    })
  ]

  const socketOverridePackages = await filterSocketOverrideScopePackages(
    packages,
    {
      signal: abortSignal
    }
  )

  const bumpedPackages = []
  const bumpedSocketOverrideScopePackages = []
  const changedPackages = []
  const changedSocketOverrideScopePackages = []
  const state = {
    bumped: bumpedPackages,
    bumpedPrerelease: bumpedSocketOverrideScopePackages,
    changed: changedPackages,
    changedPrerelease: changedSocketOverrideScopePackages,
    prerelease: socketOverridePackages
  }

  // Chunk prerelease packages to process them in parallel 3 at a time.
  await pEach(
    socketOverridePackages,
    3,
    async pkg => {
      await maybeBumpPackage(pkg, { signal: abortSignal, spinner, state })
    },
    { signal: abortSignal }
  )

  if (abortSignal.aborted) {
    spinner.stop()
    return
  }

  const bundledPackages = [...packages, ...socketOverridePackages].filter(
    pkg => pkg.bundledDependencies
  )
  // Chunk changed prerelease packages to process them in parallel 3 at a time.
  await pEach(bumpedSocketOverrideScopePackages, 3, async pkg => {
    // Reset override version in parent package BEFORE npm install of bundled
    // dependencies.
    await updateOverrideVersionInParent(pkg, pkg.manifest.version)
  })
  // Chunk bundled packages to process them in parallel 3 at a time.
  await pEach(
    bundledPackages,
    3,
    async pkg => await installBundledDependencies(pkg, { spinner })
  )
  // Chunk changed prerelease packages to process them in parallel 3 at a time.
  await pEach(bumpedSocketOverrideScopePackages, 3, async pkg => {
    // Update override version in parent package AFTER npm install of bundled
    // dependencies.
    await updateOverrideVersionInParent(pkg, pkg.version)
    // Copy overrides/<name> to node_modules/<name>.
    const parentPkgPath = path.resolve(pkg.path, '../..')
    const parentPkgNmPath = path.join(parentPkgPath, NODE_MODULES)
    const overrideNmPath = path.join(parentPkgNmPath, pkg.name)
    await fs.cp(pkg.path, overrideNmPath, { recursive: true })
  })

  // Chunk packages data to process them in parallel 3 at a time.
  await pEach(
    packages,
    3,
    async pkg => {
      await maybeBumpPackage(pkg, { signal: abortSignal, state })
    },
    { signal: abortSignal }
  )

  spinner.stop()
  if (abortSignal.aborted || !bumpedPackages.length) {
    return
  }

  const spawnOptions = {
    cwd: rootPath,
    signal: abortSignal,
    stdio: 'inherit'
  }

  await runScript('update:manifest', ['--', '--force'], spawnOptions)

  if (!bumpedPackages.find(pkg => pkg === registryPkg)) {
    spinner.start()
    const version = semver.inc(registryPkg.manifest.version, 'patch')
    const editablePkgJson = await readPackageJson(registryPkg.path, {
      editable: true
    })
    editablePkgJson.update({ version })
    await editablePkgJson.save()
    spinner.stop(
      `+${registryPkg.name}@${registryPkg.manifest.version} -> ${version}`
    )
  }

  await runScript('update:package-json', [], spawnOptions)

  if (
    changedPackages.length > 1 ||
    (changedPackages.length === 1 && changedPackages[0] !== registryPkg)
  ) {
    await runScript(
      'update:longtask:test:npm:package-json',
      ['--', '--quiet', '--force'],
      spawnOptions
    )
  }
})()
