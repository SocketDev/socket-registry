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

const {
  LATEST,
  NODE_MODULES,
  OVERRIDES,
  RESOLUTIONS,
  SOCKET_OVERRIDE_SCOPE,
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
      const { name: overridePkgName } = overridePkgJson
      if (!overridePkgName.startsWith(`${SOCKET_OVERRIDE_SCOPE}/`)) {
        continue
      }
      // Add @socketoverride scoped package data.
      socketOverridePackages.push(
        packageData({
          name: overridePkgName,
          bundledDependencies: !!overridePkgJson.bundleDependencies,
          path: overridePkgPath,
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
      bumpedOverrideScoped: [],
      changed: [],
      changedOverrideScoped: [],
      overrideScoped: []
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
    const isOverrideScoped = state.overrideScoped.includes(pkg)
    let version = semver.inc(manifest.version, 'patch')
    if (pkg.tag !== LATEST) {
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
      if (isOverrideScoped) {
        state.changedOverrideScoped.push(pkg)
      }
      spinner?.log(`+${pkg.name}@${manifest.version} -> ${version}`)
    }
    state.bumped.push(pkg)
    if (isOverrideScoped) {
      state.bumpedOverrideScoped.push(pkg)
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

async function updateOverrideScopedVersionInParent(pkg, version) {
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
  // Lazily access constants.spinner.
  const { spinner } = constants
  spinner.start(`Bumping ${relNpmPackagesPath} versions (semver patch)...`)
  const packages = [
    registryPkg,
    // Lazily access constants.npmPackageNames.
    ...constants.npmPackageNames.map(sockRegPkgName => {
      const pkgPath = path.join(npmPackagesPath, sockRegPkgName)
      const pkgJson = readPackageJsonSync(pkgPath)
      return packageData({
        name: `${SOCKET_REGISTRY_SCOPE}/${sockRegPkgName}`,
        path: pkgPath,
        printName: sockRegPkgName,
        bundledDependencies: !!pkgJson.bundleDependencies,
        tag: getReleaseTag(pkgJson.version)
      })
    })
  ]
  const state = {
    bumped: [],
    bumpedOverrideScoped: [],
    changed: [],
    changedOverrideScoped: [],
    overrideScoped: await filterSocketOverrideScopePackages(packages, {
      signal: abortSignal
    })
  }
  // Chunk @socketoverride scoped packages to process them in parallel 3 at a time.
  await pEach(
    state.overrideScoped,
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

  const bundledPackages = [...packages, ...state.overrideScoped].filter(
    pkg => pkg.bundledDependencies
  )
  // Chunk changed @socketoverride scoped packages to process them in parallel 3 at a time.
  await pEach(state.bumpedOverrideScoped, 3, async pkg => {
    // Reset override version in parent package BEFORE npm install of bundled
    // dependencies.
    await updateOverrideScopedVersionInParent(pkg, pkg.manifest.version)
  })
  // Chunk bundled packages to process them in parallel 3 at a time.
  await pEach(
    bundledPackages,
    3,
    async pkg => await installBundledDependencies(pkg, { spinner })
  )
  // Chunk changed @override scoped packages to process them in parallel 3 at a time.
  await pEach(state.bumpedOverrideScoped, 3, async pkg => {
    // Update override version in parent package AFTER npm install of bundled
    // dependencies.
    await updateOverrideScopedVersionInParent(pkg, pkg.version)
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

  if (abortSignal.aborted || !state.bumped.length) {
    spinner.stop()
    return
  }

  const spawnOptions = {
    cwd: rootPath,
    signal: abortSignal,
    spinner,
    stdio: 'inherit'
  }

  await runScript('update:manifest', ['--', '--force'], spawnOptions)

  if (!state.bumped.find(pkg => pkg === registryPkg)) {
    const version = semver.inc(registryPkg.manifest.version, 'patch')
    const editablePkgJson = await readPackageJson(registryPkg.path, {
      editable: true
    })
    editablePkgJson.update({ version })
    await editablePkgJson.save()
    spinner.log(
      `+${registryPkg.name}@${registryPkg.manifest.version} -> ${version}`
    )
  }

  await runScript('update:package-json', [], spawnOptions)

  if (
    state.changed.length > 1 ||
    (state.changed.length === 1 && state.changed[0] !== registryPkg)
  ) {
    await runScript(
      'update:longtask:test:npm:package-json',
      ['--', '--quiet', '--force'],
      spawnOptions
    )
  }

  spinner.stop()
})()
