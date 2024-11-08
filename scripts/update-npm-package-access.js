'use strict'

const path = require('node:path')
const util = require('node:util')

const constants = require('@socketregistry/scripts/constants')
const { joinAsList } = require('@socketsecurity/registry/lib/arrays')
const { execNpm } = require('@socketsecurity/registry/lib/npm')
const { pEach } = require('@socketsecurity/registry/lib/promises')

const {
  COLUMN_LIMIT,
  ENV,
  PACKAGE_SCOPE,
  npmPackagesPath,
  parseArgsConfig,
  registryPkgPath
} = constants

const { values: cliArgs } = util.parseArgs(parseArgsConfig)

void (async () => {
  // Exit early if not running in CI or with --force.
  if (!(ENV.CI || cliArgs.force)) {
    return
  }
  const failures = []
  const packages = [
    // Lazily access constants.npmPackageNames.
    ...constants.npmPackageNames.map(async regPkgName => ({
      name: `${PACKAGE_SCOPE}/${regPkgName}`,
      path: path.join(npmPackagesPath, regPkgName),
      shortName: regPkgName
    })),
    { name: '@socketsecurity/registry', path: registryPkgPath }
  ]
  // Chunk package names to process them in parallel 3 at a time.
  await pEach(
    packages,
    3,
    async ({ name, path: pkgPath, shortName = name }) => {
      try {
        const { stdout } = await execNpm(
          ['access', 'set', 'mfa=automation', name],
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
        failures.push(shortName)
        console.log(e)
      }
    }
  )
  if (failures.length) {
    const msg = `⚠️ Unable to set access for ${failures.length} package${failures.length > 1 ? 's' : ''}:`
    const msgList = joinAsList(failures)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    console.log(`${msg}${separator}${msgList}`)
  }
})()
