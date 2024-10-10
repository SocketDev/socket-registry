'use strict'

const util = require('node:util')

const access = require('libnpmaccess')

const constants = require('@socketregistry/scripts/constants')
const { COLUMN_LIMIT, ENV, parseArgsConfig } = constants
const { joinAsList } = require('@socketregistry/scripts/utils/arrays')

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
      try {
        await access.setMfa(regPkgName, 'automation', {
          '//registry.npmjs.org/:_authToken': ENV.NODE_AUTH_TOKEN
        })
      } catch {
        failures.push(regPkgName)
      }
    })
  )
  if (failures.length) {
    const msg = `⚠️ Unable to set access for ${failures.length} package${failures.length > 1 ? 's' : ''}:`
    const msgList = joinAsList(failures)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    console.log(`${msg}${separator}${msgList}`)
  }
})()
