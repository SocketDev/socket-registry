import path from 'node:path'
import util from 'node:util'

import { joinAnd } from '@socketsecurity/registry/lib/arrays'
import { logger } from '@socketsecurity/registry/lib/logger'
import { isObjectObject } from '@socketsecurity/registry/lib/objects'
import {
  getReleaseTag,
  readPackageJsonSync,
} from '@socketsecurity/registry/lib/packages'
import { pEach } from '@socketsecurity/registry/lib/promises'
import { spawn } from '@socketsecurity/registry/lib/spawn'
import { pluralize } from '@socketsecurity/registry/lib/words'

import constants from './constants.mjs'

const {
  COLUMN_LIMIT,
  LATEST,
  SOCKET_REGISTRY_SCOPE,
  npmPackagesPath,
  registryPkgPath,
} = constants

const { values: cliArgs } = util.parseArgs(constants.parseArgsConfig)

function packageData(data) {
  const {
    isTrustedPublisher = false,
    printName = data.name,
    tag = LATEST,
  } = data
  return Object.assign(data, { isTrustedPublisher, printName, tag })
}

async function publishTrusted(pkg, state) {
  if (!isObjectObject(state)) {
    throw new TypeError('A state object is required.')
  }
  try {
    // Use npm for trusted publishing with OIDC tokens.
    const result = await spawn('npm', ['publish', '--access', 'public'], {
      cwd: pkg.path,
      // Don't set NODE_AUTH_TOKEN for trusted publishing - uses OIDC.
    })
    if (result.stdout) {
      logger.log(result.stdout)
    }
  } catch (e) {
    const stderr = e?.stderr ?? ''
    if (!stderr.includes('cannot publish over')) {
      state.fails.push(pkg.printName)
      if (stderr) {
        logger.log(stderr)
      }
    }
  }
}

async function publishToken(pkg, state) {
  if (!isObjectObject(state)) {
    throw new TypeError('A state object is required.')
  }
  try {
    // Use pnpm with token-based authentication and provenance.
    const result = await spawn(
      'pnpm',
      [
        'publish',
        '--provenance',
        '--access',
        'public',
        '--no-git-checks',
        '--tag',
        pkg.tag,
      ],
      {
        cwd: pkg.path,
        env: {
          ...process.env,
          NODE_AUTH_TOKEN: constants.ENV.NODE_AUTH_TOKEN,
        },
      },
    )
    if (result.stdout) {
      logger.log(result.stdout)
    }
  } catch (e) {
    const stderr = e?.stderr ?? ''
    if (!stderr.includes('cannot publish over')) {
      state.fails.push(pkg.printName)
      if (stderr) {
        logger.log(stderr)
      }
    }
  }
}

async function publish(pkg, state) {
  if (pkg.isTrustedPublisher) {
    await publishTrusted(pkg, state)
  } else {
    await publishToken(pkg, state)
  }
}

async function publishPackages(packages, state) {
  const okayPackages = packages.filter(
    pkg => !state.fails.includes(pkg.printName),
  )
  // Chunk non-failed package names to process them in parallel 3 at a time.
  await pEach(
    okayPackages,
    async pkg => {
      await publish(pkg, state)
    },
    { concurrency: 3 },
  )
}

void (async () => {
  // Exit early if not running in CI or with --force.
  if (!(cliArgs.force || constants.ENV.CI)) {
    return
  }

  const fails = []
  const packages = [
    packageData({
      name: '@socketsecurity/registry',
      path: registryPkgPath,
      isTrustedPublisher: true,
    }),
    ...constants.npmPackageNames.map(sockRegPkgName => {
      const pkgPath = path.join(npmPackagesPath, sockRegPkgName)
      const pkgJson = readPackageJsonSync(pkgPath)
      return packageData({
        name: `${SOCKET_REGISTRY_SCOPE}/${sockRegPkgName}`,
        path: pkgPath,
        printName: sockRegPkgName,
        tag: getReleaseTag(pkgJson.version),
        isTrustedPublisher: false,
      })
    }),
  ]

  await publishPackages(packages, { fails })

  if (fails.length) {
    const msg = `Unable to publish ${fails.length} ${pluralize('package', fails.length)}:`
    const msgList = joinAnd(fails)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    logger.warn(`${msg}${separator}${msgList}`)
  }
})()
