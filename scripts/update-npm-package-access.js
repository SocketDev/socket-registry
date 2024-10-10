'use strict'

const util = require('node:util')

const access = require('libnpmaccess')

const constants = require('@socketregistry/scripts/constants')
const { ENV, parseArgsConfig } = constants

const { values: cliArgs } = util.parseArgs(parseArgsConfig)

;(async () => {
  // Exit early if not running in CI or with --force.
  if (!(ENV.CI || cliArgs.force)) {
    return
  }
  await Promise.all(
    // Lazily access constants.npmPackageNames.
    constants.npmPackageNames.map(async regPkgName => {
      await access.setMfa(regPkgName, 'automation', {
        '//registry.npmjs.org/:_authToken': ENV.NODE_AUTH_TOKEN
      })
    })
  )
})()
