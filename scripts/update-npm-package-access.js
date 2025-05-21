'use strict'

const path = require('node:path')
const util = require('node:util')

const constants = require('@socketregistry/scripts/constants')
const { joinAnd } = require('@socketsecurity/registry/lib/arrays')
const { logger } = require('@socketsecurity/registry/lib/logger')
const { execNpm } = require('@socketsecurity/registry/lib/npm')
const { pEach } = require('@socketsecurity/registry/lib/promises')
const { pluralize } = require('@socketsecurity/registry/lib/words')

const {
  COLUMN_LIMIT,
  SOCKET_REGISTRY_SCOPE,
  npmPackagesPath,
  registryPkgPath
} = constants

const { values: cliArgs } = util.parseArgs(constants.parseArgsConfig)

function packageData(data) {
  const { printName = data.name } = data
  return Object.assign(data, { printName })
}

void (async () => {
  // Exit early if not running in CI or with --force.
  // Lazily access constants.ENV.
  const { ENV } = constants
  if (!(cliArgs.force || ENV.CI)) {
    return
  }

  const fails = []
  const packages = [
    packageData({ name: '@socketsecurity/registry', path: registryPkgPath }),
    // Lazily access constants.npmPackageNames.
    ...constants.npmPackageNames.map(sockRegPkgName =>
      packageData({
        name: `${SOCKET_REGISTRY_SCOPE}/${sockRegPkgName}`,
        path: path.join(npmPackagesPath, sockRegPkgName),
        printName: sockRegPkgName
      })
    )
  ]

  // Chunk package names to process them in parallel 3 at a time.
  await pEach(packages, 3, async pkg => {
    try {
      const stdout = (
        await execNpm(['access', 'set', 'mfa=automation', pkg.name], {
          cwd: pkg.path,
          stdio: 'pipe',
          env: {
            ...process.env,
            // Lazily access constants.ENV.NODE_AUTH_TOKEN.
            NODE_AUTH_TOKEN: ENV.NODE_AUTH_TOKEN
          }
        })
      ).stdout.trim()
      logger.log(stdout)
    } catch (e) {
      const stderr = e?.stderr ?? ''
      fails.push(pkg.printName)
      if (stderr) {
        logger.log(stderr)
      }
    }
  })

  if (fails.length) {
    const msg = `Unable to set access for ${fails.length} ${pluralize('package', fails.length)}:`
    const msgList = joinAnd(fails)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    logger.warn(`${msg}${separator}${msgList}`)
  }
})()
