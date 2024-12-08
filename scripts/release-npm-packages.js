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
  npmPackagesPath,
  registryPkgPath,
  relNpmPackagesPath,
  rootPath
} = constants
const yoctoSpinner = require('@socketregistry/yocto-spinner')
const { readDirNames } = require('@socketsecurity/registry/lib/fs')
const { execNpm, runScript } = require('@socketsecurity/registry/lib/npm')
const {
  fetchPackageManifest,
  packPackage,
  readPackageJson
} = require('@socketsecurity/registry/lib/packages')
const { pEach } = require('@socketsecurity/registry/lib/promises')

const abortController = new AbortController()
const { signal } = abortController

function packageData(data) {
  const { printName = data.name, tag = LATEST } = data
  return Object.assign(data, { printName, tag })
}

// Detect ^C, i.e. Ctrl + C.
process.on('SIGINT', () => {
  console.log('SIGINT signal received: Exiting gracefully...')
  abortController.abort()
})

void (async () => {
  const spinner = yoctoSpinner({
    text: `Bumping ${relNpmPackagesPath} versions (semver patch)...`
  }).start()
  const packages = [
    packageData({ name: '@socketsecurity/registry', path: registryPkgPath }),
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
  packages.push(...prereleasePackages)
  const bundledPackages = packages.filter(pkg => pkg.bundledDependencies)
  // Chunk bundled package names to process them in parallel 3 at a time.
  await pEach(bundledPackages, 3, async pkg => {
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
  // Chunk package names to process them in parallel 3 at a time.
  await pEach(
    packages,
    3,
    async (pkg, { signal }) => {
      const manifest = await fetchPackageManifest(`${pkg.name}@${pkg.tag}`)
      if (manifest) {
        // Compare the shasum of the @socketregistry the latest package from
        // registry.npmjs.org against the local version. If they are different
        // then bump the local version.
        if (
          ssri
            .fromData(
              await packPackage(`${pkg.name}@${manifest.version}`, { signal })
            )
            .sha512[0].hexDigest() !==
          ssri
            .fromData(await packPackage(pkg.path, { signal }))
            .sha512[0].hexDigest()
        ) {
          const maybePrerelease = pkg.tag === LATEST ? '' : `-${pkg.tag}`
          const version =
            semver.inc(manifest.version, 'patch') + maybePrerelease
          const editablePkgJson = await readPackageJson(pkg.path, {
            editable: true
          })
          editablePkgJson.update({ version })
          await editablePkgJson.save()
          console.log(`+${pkg.name}@${manifest.version} -> ${version}`)
        }
      }
    },
    { signal }
  )
  spinner.stop()
  if (signal.aborted) {
    return
  }
  const spawnOptions = {
    cwd: rootPath,
    signal,
    stdio: 'inherit'
  }
  await runScript('update:manifest', [], spawnOptions)
  await runScript('update:package-json', [], spawnOptions)
  await runScript(
    'update:longtask:test:npm:package-json',
    ['--', '--quiet', '--force'],
    spawnOptions
  )
})()
