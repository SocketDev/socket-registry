'use strict'

const path = require('node:path')
const util = require('node:util')

const semver = require('semver')

const constants = require('@socketregistry/scripts/constants')
const {
  COLUMN_LIMIT,
  ENV,
  PACKAGE_JSON,
  PACKAGE_SCOPE,
  npmPackagesPath,
  parseArgsConfig,
  registryPkgPath
} = constants
const { joinAsList } = require('@socketregistry/scripts/utils/arrays')
const { readDirNames } = require('@socketregistry/scripts/utils/fs')
const { execNpm } = require('@socketregistry/scripts/utils/npm')
const { pEach } = require('@socketregistry/scripts/utils/promises')

const { values: cliArgs } = util.parseArgs(parseArgsConfig)

;(async () => {
  // Exit early if not running in CI or with --force.
  if (!(ENV.CI || cliArgs.force)) {
    return
  }
  const failures = []
  const packages = (
    await Promise.all([
      // Lazily access constants.npmPackageNames.
      ...constants.npmPackageNames.map(async regPkgName => {
        const pkgPath = path.join(npmPackagesPath, regPkgName)
        const overridesPath = path.join(pkgPath, 'overrides')
        const name = `${PACKAGE_SCOPE}/${regPkgName}`
        const shortName = regPkgName
        return [
          { name, path: pkgPath, shortName },
          ...(await readDirNames(overridesPath)).map(n => {
            const overridesPkgPath = path.join(overridesPath, n)
            const overridesPkgJsonPath = path.join(
              overridesPkgPath,
              PACKAGE_JSON
            )
            const tag =
              semver.prerelease(require(overridesPkgJsonPath).version) ??
              undefined
            return { name, path: overridesPkgPath, shortName, tag }
          })
        ]
      }),
      { name: '@socketsecurity/registry', path: registryPkgPath }
    ])
  ).flat()
  // Chunk package names to process them in parallel 3 at a time.
  await pEach(
    packages,
    3,
    async ({ name, path: pkgPath, shortName = name, tag = 'latest' }) => {
      try {
        const { stdout } = await execNpm(
          ['publish', '--provenance', '--tag', tag, '--access', 'public'],
          {
            cwd: pkgPath,
            stdio: 'pipe',
            env: {
              __proto__: null,
              ...process.env,
              NODE_AUTH_TOKEN: ENV.NODE_AUTH_TOKEN
            }
          }
        )
        console.log(stdout)
      } catch (e) {
        const stderr = e?.stderr ?? ''
        const isPublishOverError =
          stderr.includes('code E403') && stderr.includes('cannot publish over')
        if (!isPublishOverError) {
          failures.push(shortName)
          console.log(stderr)
        }
      }
    }
  )
  if (failures.length) {
    const msg = `⚠️ Unable to publish ${failures.length} package${failures.length > 1 ? 's' : ''}:`
    const msgList = joinAsList(failures)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    console.log(`${msg}${separator}${msgList}`)
  }
})()
