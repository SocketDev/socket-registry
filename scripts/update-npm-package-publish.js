'use strict'

const path = require('node:path')
const util = require('node:util')

const constants = require('@socketregistry/scripts/constants')
const { joinAnd } = require('@socketsecurity/registry/lib/arrays')
const { readDirNames } = require('@socketsecurity/registry/lib/fs')
const { logger } = require('@socketsecurity/registry/lib/logger')
const { execNpm } = require('@socketsecurity/registry/lib/npm')
const {
  getReleaseTag,
  readPackageJsonSync
} = require('@socketsecurity/registry/lib/packages')
const { pEach } = require('@socketsecurity/registry/lib/promises')
const { pluralize } = require('@socketsecurity/registry/lib/words')

const {
  COLUMN_LIMIT,
  LATEST,
  OVERRIDES,
  SOCKET_OVERRIDE_SCOPE,
  SOCKET_REGISTRY_SCOPE,
  npmPackagesPath,
  registryPkgPath
} = constants

const { values: cliArgs } = util.parseArgs(constants.parseArgsConfig)

async function filterSocketOverrideScopePackages(
  packages,
  state = { fails: [] }
) {
  const socketOverridePackages = []
  // Chunk packages data to process them in parallel 3 at a time.
  await pEach(
    packages,
    async pkg => {
      const overridesPath = path.join(pkg.path, OVERRIDES)
      const overrideNames = await readDirNames(overridesPath)
      for (const overrideName of overrideNames) {
        const overridePkgPath = path.join(overridesPath, overrideName)
        const overridePkgJson = readPackageJsonSync(overridePkgPath)
        const { name: overridePkgName } = overridePkgJson
        if (!overridePkgName.startsWith(`${SOCKET_OVERRIDE_SCOPE}/`)) {
          state.fails.push(overridePkgName)
          continue
        }
        // Add @socketoverride scoped package data.
        socketOverridePackages.push(
          packageData({
            name: overridePkgName,
            path: overridePkgPath,
            tag: getReleaseTag(overridePkgJson.version)
          })
        )
      }
    },
    { concurrency: 3 }
  )
  return socketOverridePackages
}

function packageData(data) {
  const { printName = data.name, tag = LATEST } = data
  return Object.assign(data, { printName, tag })
}

async function publish(pkg, state = { fails: [] }) {
  try {
    const stdout = (
      await execNpm(
        ['publish', '--provenance', '--tag', pkg.tag, '--access', 'public'],
        {
          cwd: pkg.path,
          env: {
            ...process.env,
            // Lazily access constants.ENV.NODE_AUTH_TOKEN.
            NODE_AUTH_TOKEN: constants.ENV.NODE_AUTH_TOKEN
          }
        }
      )
    ).stdout
    if (stdout) {
      logger.log(stdout)
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
  // Lazily access constants.ENV.
  if (!(cliArgs.force || constants.ENV.CI)) {
    return
  }
  const fails = []
  const packages = [
    packageData({ name: '@socketsecurity/registry', path: registryPkgPath }),
    // Lazily access constants.npmPackageNames.
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
  const socketOverridePackages = await filterSocketOverrideScopePackages(
    packages,
    { fails }
  )
  await publishPackages(socketOverridePackages, { fails })
  await publishPackages(packages, { fails })
  if (fails.length) {
    const msg = `Unable to publish ${fails.length} ${pluralize('package', fails.length)}:`
    const msgList = joinAnd(fails)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    logger.warn(`${msg}${separator}${msgList}`)
  }
})()
