import { createRequire } from 'node:module'
import path from 'node:path'
import util from 'node:util'

import constants from './constants.mjs'

const require = createRequire(import.meta.url)
const { joinAnd } = require('@socketsecurity/registry/lib/arrays')
const { logger } = require('@socketsecurity/registry/lib/logger')
const { execNpm } = require('@socketsecurity/registry/lib/agent')
const { pEach } = require('@socketsecurity/registry/lib/promises')
const { pluralize } = require('@socketsecurity/registry/lib/words')

const { COLUMN_LIMIT, SOCKET_REGISTRY_SCOPE } = constants

const { values: cliArgs } = util.parseArgs(constants.parseArgsConfig)

function packageData(data) {
  const { printName = data.name } = data
  return Object.assign(data, { printName })
}

void (async () => {
  // Exit early if not running in CI or with --force.
  const { ENV } = constants
  if (!(cliArgs.force || ENV.CI)) {
    return
  }

  const fails = []
  const trustedPublishingPackages = [
    packageData({
      name: '@socketsecurity/registry',
      path: constants.registryPkgPath,
      isTrustedPublisher: true,
    }),
  ]

  const tokenBasedPackages = constants.npmPackageNames.map(sockRegPkgName =>
    packageData({
      name: `${SOCKET_REGISTRY_SCOPE}/${sockRegPkgName}`,
      path: path.join(constants.npmPackagesPath, sockRegPkgName),
      printName: sockRegPkgName,
      isTrustedPublisher: false,
    }),
  )

  // Process trusted publishing packages (skip MFA automation as it requires npm_token).
  logger.log('Skipping MFA automation for trusted publishing packages:')
  for (const pkg of trustedPublishingPackages) {
    logger.log(
      `  ${pkg.printName}: Trusted publishing uses OIDC tokens which don't support npm access commands. ` +
        'MFA settings should be configured through npm web interface.',
    )
  }

  // Process token-based packages with MFA automation.
  if (tokenBasedPackages.length) {
    logger.log('Setting MFA automation for token-based packages...')
    await pEach(
      tokenBasedPackages,
      async pkg => {
        try {
          const stdout = (
            await execNpm(['access', 'set', 'mfa=automation', pkg.name], {
              cwd: pkg.path,
              env: {
                ...process.env,
                NODE_AUTH_TOKEN: ENV.NODE_AUTH_TOKEN,
              },
            })
          ).stdout
          logger.log(stdout)
        } catch (e) {
          const stderr = e?.stderr ?? ''
          fails.push(pkg.printName)
          if (stderr) {
            logger.log(stderr)
          }
        }
      },
      { concurrency: 3 },
    )
  }

  if (fails.length) {
    const msg = `Unable to set access for ${fails.length} ${pluralize('package', fails.length)}:`
    const msgList = joinAnd(fails)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    logger.warn(`${msg}${separator}${msgList}`)
  }
})()
