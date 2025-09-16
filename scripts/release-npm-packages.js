'use strict'

const path = require('node:path')

const semver = require('semver')
const ssri = require('ssri')

const constants = require('@socketregistry/scripts/constants')
const { runNpmScript } = require('@socketsecurity/registry/lib/agent')
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
      .fromData(await packPackage(`${pkg.name}@${manifest.version}`))
      .sha512[0].hexDigest() !==
    ssri.fromData(await packPackage(pkg.path)).sha512[0].hexDigest()
  )
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

  await runNpmScript('update:manifest', ['--', '--force'], spawnOptions)

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

  await runNpmScript('update:package-json', [], spawnOptions)

  if (
    state.changed.length > 1 ||
    (state.changed.length === 1 && state.changed[0] !== registryPkg)
  ) {
    await runNpmScript(
      'update:longtask:test:npm:package-json',
      ['--', '--quiet', '--force'],
      spawnOptions
    )
  }

  spinner.stop()
})()
