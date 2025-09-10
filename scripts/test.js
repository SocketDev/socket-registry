'use strict'

const constants = require('@socketregistry/scripts/constants')
const { runBin } = require('@socketsecurity/registry/lib/npm')

void (async () => {
  try {
    await runBin(constants.tapRunExecPath, process.argv.slice(2), {
      cwd: constants.rootPath,
      stdio: 'inherit',
      env: {
        ...process.env,
        TAP_RCFILE: constants.ENV.CI
          ? constants.tapCiConfigPath
          : constants.tapConfigPath
      }
    })
  } catch {
    // Shallow error here since we're running the bin with stdio: 'inherit' and
    // all stdout and stderr will be logged to the console.
  }
})()
