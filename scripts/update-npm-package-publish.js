'use strict'

const path = require('node:path')
const util = require('node:util')

const constants = require('@socketregistry/scripts/constants')
const { joinAnd } = require('@socketsecurity/registry/lib/arrays')
const { logger } = require('@socketsecurity/registry/lib/logger')
const { spawn } = require('@socketsecurity/registry/lib/spawn')
const {
  getReleaseTag,
  readPackageJsonSync
} = require('@socketsecurity/registry/lib/packages')
const { pEach } = require('@socketsecurity/registry/lib/promises')
const { pluralize } = require('@socketsecurity/registry/lib/words')

const {
  COLUMN_LIMIT,
  LATEST,
  SOCKET_REGISTRY_SCOPE,
  npmPackagesPath,
  registryPkgPath
} = constants

const { values: cliArgs } = util.parseArgs(constants.parseArgsConfig)

function packageData(data) {
  const { printName = data.name, tag = LATEST } = data
  return Object.assign(data, { printName, tag })
}

async function publish(pkg, state = { fails: [] }) {
  try {
    const result = await spawn(
      'pnpm',
      [
        'publish',
        '--provenance',
        '--access',
        'public',
        '--no-git-checks',
        '--tag',
        pkg.tag
      ],
      {
        cwd: pkg.path,
        env: {
          ...process.env,
          NODE_AUTH_TOKEN: constants.ENV.NODE_AUTH_TOKEN
        }
      }
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

async function publishPackages(packages, state = { fails: [] }) {
  const okayPackages = packages.filter(
    pkg => !state.fails.includes(pkg.printName)
  )
  // Chunk non-failed package names to process them in parallel 3 at a time.
  await pEach(
    okayPackages,
    async pkg => {
      await publish(pkg, state)
    },
    { concurrency: 3 }
  )
}

void (async () => {
  // Exit early if not running in CI or with --force.
  if (!(cliArgs.force || constants.ENV.CI)) {
    return
  }

  const fails = []
  const packages = [
    packageData({ name: '@socketsecurity/registry', path: registryPkgPath }),
    ...constants.npmPackageNames.map(sockRegPkgName => {
      const pkgPath = path.join(npmPackagesPath, sockRegPkgName)
      const pkgJson = readPackageJsonSync(pkgPath)
      return packageData({
        name: `${SOCKET_REGISTRY_SCOPE}/${sockRegPkgName}`,
        path: pkgPath,
        printName: sockRegPkgName,
        tag: getReleaseTag(pkgJson.version)
      })
    })
  ]

  await publishPackages(packages, { fails })

  if (fails.length) {
    const msg = `Unable to publish ${fails.length} ${pluralize('package', fails.length)}:`
    const msgList = joinAnd(fails)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    logger.warn(`${msg}${separator}${msgList}`)
  }
})()
