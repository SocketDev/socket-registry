'use strict'

const path = require('node:path')

const semver = require('semver')
const ssri = require('ssri')

const constants = require('@socketregistry/scripts/constants')
const {
  PACKAGE_SCOPE,
  npmPackagesPath,
  registryPkgPath,
  relNpmPackagesPath,
  rootPath
} = constants
const yoctoSpinner = require('@socketregistry/yocto-spinner')
const { runScript } = require('@socketsecurity/registry/lib/npm')
const {
  fetchPackageManifest,
  packPackage,
  readPackageJson
} = require('@socketsecurity/registry/lib/packages')
const { pEach } = require('@socketsecurity/registry/lib/promises')

const abortController = new AbortController()
const { signal } = abortController

// Detect ^C, i.e. Ctrl + C.
process.on('SIGINT', () => {
  console.log('SIGINT signal received: Exiting gracefully...')
  abortController.abort()
})
void (async () => {
  const packages = [
    // Lazily access constants.npmPackageNames.
    ...constants.npmPackageNames.map(regPkgName => ({
      name: `${PACKAGE_SCOPE}/${regPkgName}`,
      path: path.join(npmPackagesPath, regPkgName)
    })),
    { name: '@socketsecurity/registry', path: registryPkgPath }
  ]
  const spinner = yoctoSpinner({
    text: `Bumping ${relNpmPackagesPath} versions (semver patch)...`
  }).start()
  // Chunk package names to process them in parallel 3 at a time.
  await pEach(
    packages,
    3,
    async ({ name, path: pkgPath }, { signal }) => {
      const manifest = await fetchPackageManifest(name)
      if (manifest) {
        // Compare the shasum of the @socketregistry the latest package from
        // registry.npmjs.org against the local version. If they are different
        // then bump the local version.
        if (
          ssri
            .fromData(
              await packPackage(`${name}@${manifest.version}`, { signal })
            )
            .sha512[0].hexDigest() !==
          ssri
            .fromData(await packPackage(pkgPath, { signal }))
            .sha512[0].hexDigest()
        ) {
          const version = semver.inc(manifest.version, 'patch')
          const editablePkgJson = await readPackageJson(pkgPath, {
            editable: true
          })
          editablePkgJson.update({ version })
          await editablePkgJson.save()
          console.log(`+${name}@${manifest.version} -> ${version}`)
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
