'use strict'

const path = require('node:path')

const semver = require('semver')
const ssri = require('ssri')

const constants = require('@socketregistry/scripts/constants')
const {
  LATEST,
  OVERRIDES,
  PACKAGE_JSON,
  PACKAGE_SCOPE,
  abortSignal,
  npmPackagesPath,
  registryPkgPath,
  relNpmPackagesPath,
  rootPath
} = constants
const { Spinner } = require('@socketregistry/scripts/lib/spinner')
const { readDirNames } = require('@socketsecurity/registry/lib/fs')
const { execNpm, runScript } = require('@socketsecurity/registry/lib/npm')
const {
  fetchPackageManifest,
  packPackage,
  readPackageJson
} = require('@socketsecurity/registry/lib/packages')
const { pEach } = require('@socketsecurity/registry/lib/promises')

const registryPkg = packageData({
  name: '@socketsecurity/registry',
  path: registryPkgPath
})

function packageData(data) {
  const { printName = data.name, tag = LATEST } = data
  return Object.assign(data, { printName, tag })
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
  const prereleasePackages = []
  // Chunk packages data to process them in parallel 3 at a time.
  await pEach(packages, 3, async pkg => {
    if (abortSignal.aborted) {
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

  if (abortSignal.aborted) {
    spinner.stop()
    return
  }

  packages.push(...prereleasePackages)
  const bundledPackages = packages.filter(pkg => pkg.bundledDependencies)
  // Chunk bundled package names to process them in parallel 3 at a time.
  await pEach(bundledPackages, 3, async pkg => {
    if (abortSignal.aborted) {
      return
    }
    // Install bundled dependencies, including overrides.
    try {
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
  })

  if (abortSignal.aborted) {
    spinner.stop()
    return
  }

  let registryPkgManifest
  const bumpedPackages = []
  // Chunk package names to process them in parallel 3 at a time.
  await pEach(
    packages,
    3,
    async pkg => {
      if (abortSignal.aborted) {
        return
      }
      const manifest = await fetchPackageManifest(`${pkg.name}@${pkg.tag}`)
      if (manifest) {
        if (pkg === registryPkg) {
          registryPkgManifest = manifest
        }
        // Compare the shasum of the @socketregistry the latest package from
        // registry.npmjs.org against the local version. If they are different
        // then bump the local version.
        if (
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
        ) {
          const maybePrerelease = pkg.tag === LATEST ? '' : `-${pkg.tag}`
          const version =
            semver.inc(manifest.version, 'patch') + maybePrerelease
          const editablePkgJson = await readPackageJson(pkg.path, {
            editable: true
          })
          if (editablePkgJson.content.version !== version) {
            editablePkgJson.update({ version })
            await editablePkgJson.save()
          }
          bumpedPackages.push(pkg)
          console.log(`+${pkg.name}@${manifest.version} -> ${version}`)
        }
      }
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

  await runScript('update:manifest', [], spawnOptions)
  if (!bumpedPackages.find(pkg => pkg === registryPkg)) {
    const version = semver.inc(registryPkgManifest.version, 'patch')
    const editablePkgJson = await readPackageJson(registryPkg.path, {
      editable: true
    })
    editablePkgJson.update({ version })
    await editablePkgJson.save()
    console.log(
      `+${registryPkg.name}@${registryPkgManifest.version} -> ${version}`
    )
  }

  if (abortSignal.aborted) {
    return
  }

  await runScript('update:package-json', [], spawnOptions)

  if (abortSignal.aborted) {
    return
  }

  if (
    bumpedPackages.length > 1 ||
    (bumpedPackages.length === 1 && bumpedPackages[0] !== registryPkg)
  ) {
    await runScript(
      'update:longtask:test:npm:package-json',
      ['--', '--quiet', '--force'],
      spawnOptions
    )
  }
})()
