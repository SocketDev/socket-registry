'use strict'

const path = require('node:path')
const util = require('node:util')

const semver = require('semver')

const constants = require('@socketregistry/scripts/constants')
const {
  COLUMN_LIMIT,
  ENV,
  PACKAGE_JSON,
  PACKAGE_SCOPE,
  npmPackagesPath,
  parseArgsConfig,
  registryPkgPath
} = constants
const { joinAsList } = require('@socketsecurity/registry/lib/arrays')
const { readDirNames } = require('@socketsecurity/registry/lib/fs')
const { execNpm } = require('@socketsecurity/registry/lib/npm')
const { pEach } = require('@socketsecurity/registry/lib/promises')
const { pluralize } = require('@socketsecurity/registry/lib/words')

const { values: cliArgs } = util.parseArgs(parseArgsConfig)

function packageData(data) {
  const {
    bundledDependencies = false,
    printName = data.name,
    tag = 'latest'
  } = data
  return Object.assign(data, { bundledDependencies, printName, tag })
}

void (async () => {
  // Exit early if not running in CI or with --force.
  if (!(ENV.CI || cliArgs.force)) {
    return
  }
  const failures = []
  const packages = (
    await Promise.all([
      packageData({ name: '@socketsecurity/registry', path: registryPkgPath }),
      // Lazily access constants.npmPackageNames.
      ...constants.npmPackageNames.map(async regPkgName => {
        const pkgPath = path.join(npmPackagesPath, regPkgName)
        const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
        const pkgJson = require(pkgJsonPath)
        const overridesPath = path.join(pkgPath, 'overrides')
        const name = `${PACKAGE_SCOPE}/${regPkgName}`
        const printName = regPkgName
        return [
          packageData({
            name,
            path: pkgPath,
            printName,
            bundledDependencies: !!pkgJson.bundleDependencies
          }),
          ...(await readDirNames(overridesPath)).flatMap(n => {
            const overridesPkgPath = path.join(overridesPath, n)
            const overridesPkgJsonPath = path.join(
              overridesPkgPath,
              PACKAGE_JSON
            )
            const overridesPkgJson = require(overridesPkgJsonPath)
            const overridePrintName = `${printName}/${path.relative(pkgPath, overridesPkgPath)}`
            const tag = semver.prerelease(overridesPkgJson.version) ?? undefined
            if (!tag) {
              failures.push(overridePrintName)
              return []
            }
            // Add prerelease override variant data.
            return [
              packageData({
                name,
                path: overridesPkgPath,
                bundledDependencies: !!overridesPkgJson.bundleDependencies,
                printName: overridePrintName,
                tag
              })
            ]
          })
        ]
      })
    ])
  ).flat()
  // Chunk bundled package names to process them in parallel 3 at a time.
  await pEach(
    packages.filter(pkg => pkg.bundledDependencies),
    3,
    async pkg => {
      // Install bundled dependencies, including overrides.
      try {
        await execNpm(
          ['install', '--workspaces', 'false', '--install-strategy', 'hoisted'],
          {
            cwd: pkg.path,
            stdio: 'ignore'
          }
        )
      } catch (e) {
        failures.push(pkg.printName)
        console.log(e)
      }
    }
  )
  // Chunk non-failed package names to process them in parallel 3 at a time.
  await pEach(
    packages.filter(pkg => !failures.includes(pkg.printName)),
    3,
    async pkg => {
      try {
        const { stdout } = await execNpm(
          ['publish', '--provenance', '--tag', pkg.tag, '--access', 'public'],
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
        const stderr = e?.stderr ?? ''
        const isPublishOverError =
          stderr.includes('code E403') && stderr.includes('cannot publish over')
        if (!isPublishOverError) {
          failures.push(pkg.printName)
          console.log(stderr)
        }
      }
    }
  )
  if (failures.length) {
    const msg = `⚠️ Unable to publish ${failures.length} ${pluralize('package', failures.length)}:`
    const msgList = joinAsList(failures)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    console.warn(`${msg}${separator}${msgList}`)
  }
})()
