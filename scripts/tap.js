'use strict'

const spawn = require('@npmcli/promise-spawn')

const constants = require('@socketregistry/scripts/constants')
const { ENV, ciTapConfigPath, execPath, rootPath, rootTapConfigPath } =
  constants

;(async () => {
  // Lazily access constants.tapRunExecPath.
  await spawn(execPath, [constants.tapRunExecPath, ...process.argv.slice(2)], {
    cwd: rootPath,
    stdio: 'inherit',
    env: {
      __proto__: null,
      ...process.env,
      TAP_RCFILE: ENV.CI ? ciTapConfigPath : rootTapConfigPath
    }
  })
})()
