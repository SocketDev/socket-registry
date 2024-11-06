'use strict'

const constants = require('@socketregistry/scripts/constants')
const { ENV, rootPath, tapCiConfigPath, tapConfigPath } = constants
const { runBin } = require('@socketsecurity/registry/lib/npm')

;(async () => {
  await runBin(
    // Lazily access constants.tapRunExecPath.
    constants.tapRunExecPath,
    process.argv.slice(2),
    {
      cwd: rootPath,
      stdio: 'inherit',
      env: {
        __proto__: null,
        ...process.env,
        TAP_RCFILE: ENV.CI ? tapCiConfigPath : tapConfigPath
      }
    }
  )
})()
