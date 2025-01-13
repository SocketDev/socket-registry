'use strict'

const path = require('node:path')
const util = require('node:util')

const semver = require('semver')

const constants = require('@socketregistry/scripts/constants')
const { joinAsList } = require('@socketsecurity/registry/lib/arrays')
const { readDirNames } = require('@socketsecurity/registry/lib/fs')
const { execNpm } = require('@socketsecurity/registry/lib/npm')
const { pEach } = require('@socketsecurity/registry/lib/promises')
const { pluralize } = require('@socketsecurity/registry/lib/words')

const {
  COLUMN_LIMIT,
  LATEST,
  OVERRIDES,
  PACKAGE_JSON,
  PACKAGE_SCOPE,
  npmPackagesPath,
  registryPkgPath
} = constants

const { values: cliArgs } = util.parseArgs(constants.parseArgsConfig)

async function filterPrereleasePackages(packages, state = { fails: [] }) {
  const prereleasePackages = []
  // Chunk packages data to process them in parallel 3 at a time.
  await pEach(packages, 3, async pkg => {
    const overridesPath = path.join(pkg.path, OVERRIDES)
    const overrideNames = await readDirNames(overridesPath)
    for (const overrideName of overrideNames) {
      const overridesPkgPath = path.join(overridesPath, overrideName)
      const overridesPkgJsonPath = path.join(overridesPkgPath, PACKAGE_JSON)
      const overridesPkgJson = require(overridesPkgJsonPath)
      const overridePrintName = `${pkg.printName}/${path.relative(pkg.path, overridesPkgPath)}`
      const tag = semver.prerelease(overridesPkgJson.version) ?? undefined
      if (!tag) {
        state.fails.push(overridePrintName)
        continue
      }
      // Add prerelease override variant data.
      prereleasePackages.push(
        packageData({
          name: pkg.name,
          bundledDependencies: !!overridesPkgJson.bundleDependencies,
          path: overridesPkgPath,
          printName: overridePrintName,
          tag
        })
      )
    }
  })
  return prereleasePackages
}

async function installBundledDependencies(pkg, state = { fails: [] }) {
  try {
    // Install bundled dependencies, including overrides.
    await execNpm(
      [
        'install',
        '--silent',
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
    console.log(stdout)
  } catch (e) {
    const stderr = e?.stderr ?? ''
    const isPublishOverError =
      stderr.includes('code E403') && stderr.includes('cannot publish over')
    if (!isPublishOverError) {
      state.fails.push(pkg.printName)
      console.log(stderr)
    }
  }
}

async function publishPackages(packages, state = { fails: [] }) {
  const okayPackages = packages.filter(pkg => !state.fails.includes(pkg.printName))
  // Chunk non-failed package names to process them in parallel 3 at a time.
  await pEach(okayPackages, 3, publish)
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
    ...constants.npmPackageNames.map(regPkgName => {
      const pkgPath = path.join(npmPackagesPath, regPkgName)
      const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
      const pkgJson = require(pkgJsonPath)
      return packageData({
        name: `${PACKAGE_SCOPE}/${regPkgName}`,
        bundledDependencies: !!pkgJson.bundleDependencies,
        path: pkgPath,
        printName: regPkgName
      })
    })
  ]

  const prereleasePackages = await filterPrereleasePackages(packages, { fails })
  await publishPackages(prereleasePackages, { fails })

  const bundledPackages = [...packages, ...prereleasePackages].filter(
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
