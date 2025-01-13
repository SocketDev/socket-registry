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
  packPackage,
  readPackageJson
} = require('@socketsecurity/registry/lib/packages')
const { pEach } = require('@socketsecurity/registry/lib/promises')
const { Spinner } = require('@socketsecurity/registry/lib/spinner')

const {
  LATEST,
  NODE_MODULES,
  OVERRIDES,
  PACKAGE_JSON,
  PACKAGE_SCOPE,
  abortSignal,
  npmPackagesPath,
  registryPkgPath,
  relNpmPackagesPath,
  rootPath
} = constants

const registryPkg = packageData({
  name: '@socketsecurity/registry',
  path: registryPkgPath
})

async function filterPrereleasePackages(packages, options = {}) {
  const { signal } = { __proto__: null, ...options }
  const prereleasePackages = []
  // Chunk packages data to process them in parallel 3 at a time.
  await pEach(packages, 3, async pkg => {
    if (signal.aborted) {
      return
    }
    const overridesPath = path.join(pkg.path, OVERRIDES)
    const overrideNames = await readDirNames(overridesPath)
    for (const overrideName of overrideNames) {
      const overridesPkgPath = path.join(overridesPath, overrideName)
      const overridesPkgJsonPath = path.join(overridesPkgPath, PACKAGE_JSON)
      const overridesPkgJson = require(overridesPkgJsonPath)
      const overridePrintName = `${pkg.printName}/${path.relative(pkg.path, overridesPkgPath)}`
      const tag = semver.prerelease(overridesPkgJson.version) ?? undefined
      if (!tag) {
        continue
      }
      // Add prerelease override variant data.
      prereleasePackages.push(
        packageData({
          name: pkg.name,
          bundledDependencies: !!overridesPkgJson.bundleDependencies,
          path: overridesPkgPath,
          printName: overridePrintName,
          tag
        })
      )
    }
  })
  return prereleasePackages
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

async function installBundledDependencies(pkg) {
  try {
    // Install bundled dependencies, including overrides.
    await execNpm(
      [
        'install',
        '--silent',
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
    console.log(e)
  }
}

async function maybeBumpPackage(pkg, options = {}) {
  const {
    signal,
    state = { bumped: [], changed: [], changedPrerelease: [], prerelease: [] }
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
      console.log(`+${pkg.name}@${manifest.version} -> ${version}`)
    }
    state.bumped.push(pkg)
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
    ['overrides', oldOverrides],
    ['resolutions', oldResolutions]
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
    ...constants.npmPackageNames.map(regPkgName => {
      const pkgPath = path.join(npmPackagesPath, regPkgName)
      const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
      const pkgJson = require(pkgJsonPath)
      return packageData({
        name: `${PACKAGE_SCOPE}/${regPkgName}`,
        path: pkgPath,
        printName: regPkgName,
        bundledDependencies: !!pkgJson.bundleDependencies
      })
    })
  ]

  const prereleasePackages = await filterPrereleasePackages(packages, {
    signal: abortSignal
  })

  const bumpedPackages = []
  const changedPackages = []
  const changedPrereleasePackages = []
  const state = {
    bumped: bumpedPackages,
    changed: changedPackages,
    changedPrerelease: changedPrereleasePackages,
    prerelease: prereleasePackages
  }

  // Chunk prerelease packages to process them in parallel 3 at a time.
  await pEach(
    prereleasePackages,
    3,
    async pkg => {
      await maybeBumpPackage(pkg, { signal: abortSignal, state })
    },
    { signal: abortSignal }
  )

  if (abortSignal.aborted) {
    spinner.stop()
    return
  }

  const bundledPackages = [...packages, ...prereleasePackages].filter(
    pkg => pkg.bundledDependencies
  )
  // Chunk changed prerelease packages to process them in parallel 3 at a time.
  await pEach(changedPrereleasePackages, 3, async pkg => {
    // Reset override version in parent package BEFORE npm install of bundled
    // dependencies.
    await updateOverrideVersionInParent(pkg, pkg.manifest.version)
  })
  // Chunk bundled packages to process them in parallel 3 at a time.
  await pEach(bundledPackages, 3, installBundledDependencies)
  // Chunk changed prerelease packages to process them in parallel 3 at a time.
  await pEach(changedPrereleasePackages, 3, async pkg => {
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
    const version = semver.inc(registryPkg.manifest.version, 'patch')
    const editablePkgJson = await readPackageJson(registryPkg.path, {
      editable: true
    })
    editablePkgJson.update({ version })
    await editablePkgJson.save()
    console.log(
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
