'use strict'

const constants = require('@socketregistry/scripts/constants')
const { rootPath, tapCiConfigPath, tapConfigPath } = constants
const { runBin } = require('@socketsecurity/registry/lib/npm')

void (async () => {
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
        // Lazily access constants.ENV.
        TAP_RCFILE: constants.ENV.CI ? tapCiConfigPath : tapConfigPath
      }
    }
  )
})()
