'use strict'

const constants = require('@socketregistry/scripts/constants')
const { ENV, rootPath, rootTapConfigPath, tapCiConfigPath } = constants
const { runBin } = require('@socketregistry/scripts/utils/npm')

;(async () => {
  await runBin(
    // Lazily access constants.tapExecPath.
    constants.tapExecPath,
    process.argv.slice(2),
    {
      cwd: rootPath,
      stdio: 'inherit',
      env: {
        __proto__: null,
        ...process.env,
        TAP_RCFILE: ENV.CI ? tapCiConfigPath : rootTapConfigPath
      }
    }
  )
})()