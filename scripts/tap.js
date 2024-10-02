'use strict'

const constants = require('@socketregistry/scripts/constants')
const { ENV, ciTapConfigPath, rootPath, rootTapConfigPath } = constants
const { runBin } = require('@socketregistry/scripts/utils/npm')

;(async () => {
  await runBin(
    // Lazily access constants.tapRunExecPath.
    constants.tapRunExecPath,
    process.argv.slice(2),
    {
      cwd: rootPath,
      shell: true,
      stdio: 'inherit',
      env: {
        __proto__: null,
        ...process.env,
        TAP_RCFILE: ENV.CI ? ciTapConfigPath : rootTapConfigPath
      }
    }
  )
})()
