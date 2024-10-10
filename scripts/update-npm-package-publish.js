'use strict'

const path = require('node:path')
const util = require('node:util')

const constants = require('@socketregistry/scripts/constants')
const { COLUMN_LIMIT, ENV, npmPackagesPath, parseArgsConfig } = constants
const { joinAsList } = require('@socketregistry/scripts/utils/arrays')
const { execNpm } = require('@socketregistry/scripts/utils/npm')

const { values: cliArgs } = util.parseArgs(parseArgsConfig)

;(async () => {
  // Exit early if not running in CI or with --force.
  if (!(ENV.CI || cliArgs.force)) {
    return
  }
  const failures = []
  await Promise.all(
    // Lazily access constants.npmPackageNames.
    constants.npmPackageNames.map(async regPkgName => {
      const pkgPath = path.join(npmPackagesPath, regPkgName)
      try {
        const { stdout } = await execNpm(
          ['publish', '--provenance', '--access', 'public'],
          {
            cwd: pkgPath,
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
          failures.push(regPkgName)
          console.log(stderr)
        }
      }
    })
  )
  if (failures.length) {
    const msg = `⚠️ Unable to publish ${failures.length} package${failures.length > 1 ? 's' : ''}:`
    const msgList = joinAsList(failures)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    console.log(`${msg}${separator}${msgList}`)
  }
})()
