'use strict'

const path = require('node:path')
const util = require('node:util')

const constants = require('@socketregistry/scripts/constants')
const {
  COLUMN_LIMIT,
  ENV,
  PACKAGE_SCOPE,
  npmPackagesPath,
  parseArgsConfig,
  registryPkgPath
} = constants
const { joinAsList } = require('@socketregistry/scripts/utils/arrays')
const { execNpm } = require('@socketregistry/scripts/utils/npm')

const { values: cliArgs } = util.parseArgs(parseArgsConfig)

;(async () => {
  // Exit early if not running in CI or with --force.
  if (!(ENV.CI || cliArgs.force)) {
    return
  }
  const failures = []
  // Lazily access constants.npmPackageNames.
  const packages = constants.npmPackageNames.map(regPkgName => ({
    name: regPkgName,
    path: path.join(npmPackagesPath, regPkgName)
  }))
  packages.push({ name: '@socketsecurity/registry', path: registryPkgPath })
  await Promise.all(
    packages.map(async ({ name: regPkgName, path: pkgPath }) => {
      try {
        const pkgName =
          regPkgName === '@socketsecurity/registry'
            ? regPkgName
            : `${PACKAGE_SCOPE}/${regPkgName}`
        const { stdout } = await execNpm(
          ['access', 'set', 'mfa=automation', pkgName],
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
        failures.push(regPkgName)
        console.log(e)
      }
    })
  )
  if (failures.length) {
    const msg = `⚠️ Unable to set access for ${failures.length} package${failures.length > 1 ? 's' : ''}:`
    const msgList = joinAsList(failures)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    console.log(`${msg}${separator}${msgList}`)
  }
})()
