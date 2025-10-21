/** @fileoverview Set MFA automation access level for published npm packages. */

import path from 'node:path'
import { execNpm } from '@socketsecurity/lib/agent'
import { parseArgs } from '@socketsecurity/lib/argv/parse'
import { joinAnd } from '@socketsecurity/lib/arrays'
import { logger } from '@socketsecurity/lib/logger'
import { pEach } from '@socketsecurity/lib/promises'
import { pluralize } from '@socketsecurity/lib/words'

import constants from './constants.mjs'
import { extractNpmError } from './utils/errors.mjs'

const { COLUMN_LIMIT, SOCKET_REGISTRY_SCOPE } = constants

const { values: cliArgs } = parseArgs({
  options: {
    force: {
      type: 'boolean',
      short: 'f',
    },
    quiet: {
      type: 'boolean',
    },
  },
  strict: false,
})

/**
 * Create package metadata with defaults.
 */
function packageData(data) {
  const { printName = data.name } = data
  return Object.assign(data, { printName })
}

/**
 * Configure MFA automation for token-based packages.
 */
async function main() {
  // Exit early if not running in CI or with --force.
  const { ENV } = constants
  if (!(cliArgs.force || ENV.CI)) {
    return
  }

  const fails = []
  const trustedPublishingPackages = [
    packageData({
      name: '../registry/dist/index.js',
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
            const errorInfo = extractNpmError(stderr)
            logger.log(`\n${errorInfo}\n`)
          }
        }
      },
      { concurrency: 3 },
    )
  }

  if (fails.length) {
    const msg = `Unable to set access for ${fails.length} ${pluralize('package', { count: fails.length })}:`
    const msgList = joinAnd(fails)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    logger.warn(`${msg}${separator}${msgList}`)
  }
}

main().catch(console.error)
