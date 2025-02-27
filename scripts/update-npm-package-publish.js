'use strict'

const path = require('node:path')
const util = require('node:util')

const constants = require('@socketregistry/scripts/constants')
const { joinAsList } = require('@socketsecurity/registry/lib/arrays')
const { readDirNames } = require('@socketsecurity/registry/lib/fs')
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
  PACKAGE_SCOPE,
  SOCKET_OVERRIDE_SCOPE,
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
  await pEach(packages, 3, async pkg => {
    const overridesPath = path.join(pkg.path, OVERRIDES)
    const overrideNames = await readDirNames(overridesPath)
    for (const overrideName of overrideNames) {
      const overridePkgPath = path.join(overridesPath, overrideName)
      const overridePkgJson = readPackageJsonSync(overridePkgPath)
      const overridePrintName = `${pkg.printName}/${path.relative(pkg.path, overridePkgPath)}`
      if (!overridePkgJson.name?.startsWith(`${SOCKET_OVERRIDE_SCOPE}/`)) {
        state.fails.push(overridePrintName)
        continue
      }
      // Add @socketoverride package data.
      socketOverridePackages.push(
        packageData({
          name: pkg.name,
          bundledDependencies: !!overridePkgJson.bundleDependencies,
          path: overridePkgPath,
          printName: overridePrintName,
          tag: getReleaseTag(overridePkgJson.version)
        })
      )
    }
  })
  return socketOverridePackages
}

async function installBundledDependencies(pkg, state = { fails: [] }) {
  try {
    // Install bundled dependencies, including overrides.
    await execNpm(
      [
        'install',
        // Even though the 'silent' flag is passed npm will still run through
        // code paths for 'audit' and 'fund' unless '--no-audit' and '--no-fund'
        // flags are passed.
        '--silent',
        '--no-audit',
        '--no-fund',
        '--no-progress',
        '--workspaces',
        'false',
        '--install-strategy',
        'hoisted'
      ],
      {
        cwd: pkg.path,
        stdio: 'ignore'
      }
    )
  } catch (e) {
    state.fails.push(pkg.printName)
    console.log(e)
  }
}

function packageData(data) {
  const {
    bundledDependencies = false,
    printName = data.name,
    tag = LATEST
  } = data
  return Object.assign(data, { bundledDependencies, printName, tag })
}

async function publish(pkg, state = { fails: [] }) {
  try {
    const { stdout } = await execNpm(
      ['publish', '--provenance', '--tag', pkg.tag, '--access', 'public'],
      {
        cwd: pkg.path,
        stdio: 'pipe',
        env: {
          __proto__: null,
          ...process.env,
          // Lazily access constants.ENV.
          NODE_AUTH_TOKEN: constants.ENV.NODE_AUTH_TOKEN
        }
      }
    )
    if (stdout) {
      console.log(stdout)
    }
  } catch (e) {
    const stderr = e?.stderr ?? ''
    if (!stderr.includes('cannot publish over')) {
      state.fails.push(pkg.printName)
      console.log(stderr)
    }
  }
}

async function publishPackages(packages, state = { fails: [] }) {
  const okayPackages = packages.filter(
    pkg => !state.fails.includes(pkg.printName)
  )
  // Chunk non-failed package names to process them in parallel 3 at a time.
  await pEach(okayPackages, 3, async pkg => {
    await publish(pkg, state)
  })
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
        name: `${PACKAGE_SCOPE}/${sockRegPkgName}`,
        bundledDependencies: !!pkgJson.bundleDependencies,
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

  const bundledPackages = [...packages, ...socketOverridePackages].filter(
    pkg => pkg.bundledDependencies
  )
  // Chunk bundled package names to process them in parallel 3 at a time.
  await pEach(bundledPackages, 3, async pkg => {
    await installBundledDependencies(pkg, { fails })
  })

  await publishPackages(packages, { fails })

  if (fails.length) {
    const msg = `⚠️ Unable to publish ${fails.length} ${pluralize('package', fails.length)}:`
    const msgList = joinAsList(fails)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    console.warn(`${msg}${separator}${msgList}`)
  }
})()
