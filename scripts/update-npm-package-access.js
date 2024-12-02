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
const { joinAsList } = require('@socketsecurity/registry/lib/arrays')
const { execNpm } = require('@socketsecurity/registry/lib/npm')
const { pEach } = require('@socketsecurity/registry/lib/promises')
const { pluralize } = require('@socketsecurity/registry/lib/words')

const { values: cliArgs } = util.parseArgs(parseArgsConfig)

function packageData(data) {
  const { printName = data.name } = data
  return Object.assign(data, { printName })
}

void (async () => {
  // Exit early if not running in CI or with --force.
  if (!(ENV.CI || cliArgs.force)) {
    return
  }
  const failures = []
  const packages = [
    packageData({ name: '@socketsecurity/registry', path: registryPkgPath }),
    // Lazily access constants.npmPackageNames.
    ...constants.npmPackageNames.map(regPkgName =>
      packageData({
        name: `${PACKAGE_SCOPE}/${regPkgName}`,
        path: path.join(npmPackagesPath, regPkgName),
        printName: regPkgName
      })
    )
  ]
  // Chunk package names to process them in parallel 3 at a time.
  await pEach(packages, 3, async pkg => {
    try {
      const { stdout } = await execNpm(
        ['access', 'set', 'mfa=automation', pkg.name],
        {
          cwd: pkg.path,
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
      failures.push(pkg.printName)
      console.log(e)
    }
  })
  if (failures.length) {
    const msg = `⚠️ Unable to set access for ${failures.length} ${pluralize('package', failures.length)}:`
    const msgList = joinAsList(failures)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    console.warn(`${msg}${separator}${msgList}`)
  }
})()
