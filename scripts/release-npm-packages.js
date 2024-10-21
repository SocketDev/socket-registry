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
const { runScript } = require('@socketregistry/scripts/utils/npm')
const {
  fetchPackageManifest,
  packPackage,
  readPackageJson
} = require('@socketregistry/scripts/utils/packages')
const { pEach } = require('@socketregistry/scripts/utils/promises')
const { Spinner } = require('@socketregistry/scripts/utils/spinner')

const abortController = new AbortController()
const { signal } = abortController

// Detect ^C, i.e. Ctrl + C.
process.on('SIGINT', () => {
  console.log('SIGINT signal received: Exiting gracefully...')
  abortController.abort()
})
;(async () => {
  const packages = [
    // Lazily access constants.npmPackageNames.
    ...constants.npmPackageNames.map(regPkgName => ({
      name: `${PACKAGE_SCOPE}/${regPkgName}`,
      path: path.join(npmPackagesPath, regPkgName)
    })),
    { name: '@socketsecurity/registry', path: registryPkgPath }
  ]
  const spinner = new Spinner(
    `Bumping ${relNpmPackagesPath} versions (semver patch)...`,
    { signal }
  ).start()
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
            .fromData(await packPackage(name, { signal }))
            .sha512[0].hexDigest() !==
          ssri
            .fromData(await packPackage(pkgPath, { signal }))
            .sha512[0].hexDigest()
        ) {
          const editablePkgJson = await readPackageJson(pkgPath, {
            editable: true
          })
          editablePkgJson.update({
            version: semver.inc(manifest.version, 'patch')
          })
          await editablePkgJson.save()
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
    stdio: 'inherit',
    signal: signal
  }
  await runScript('update:manifest', [], spawnOptions)
  await runScript('update:package-json', [], spawnOptions)
  await runScript(
    'update:longtask:test:npm:package-json',
    ['--', '--quiet', '--force'],
    spawnOptions
  )
})()
