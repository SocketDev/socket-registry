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
        return [
          { name: regPkgName, path: pkgPath },
          ...(await readDirNames(overridesPath)).map(n => ({
            name: regPkgName,
            path: path.join(overridesPath, n)
          }))
        ]
      }),
      { name: '@socketsecurity/registry', path: registryPkgPath }
    ])
  ).flat()
  // Chunk package names to process them in parallel 3 at a time.
  await pEach(packages, 3, async ({ name: regPkgName, path: pkgPath }) => {
    try {
      const pkgName = regPkgName.startsWith('@socketsecurity/')
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
  if (failures.length) {
    const msg = `⚠️ Unable to set access for ${failures.length} package${failures.length > 1 ? 's' : ''}:`
    const msgList = joinAsList(failures)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    console.log(`${msg}${separator}${msgList}`)
  }
})()
