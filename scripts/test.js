'use strict'

const constants = require('@socketregistry/scripts/constants')
const { runBin } = require('@socketsecurity/registry/lib/npm')

void (async () => {
  try {
    await runBin(
      // Lazily access constants.tapRunExecPath.
      constants.tapRunExecPath,
      process.argv.slice(2),
      {
        // Lazily access constants.rootPath.
        cwd: constants.rootPath,
        stdio: 'inherit',
        env: {
          __proto__: null,
          ...process.env,
          // Lazily access constants.ENV.
          TAP_RCFILE: constants.ENV.CI
            ? // Lazily access constants.tapCiConfigPath and constants.tapConfigPath.
              constants.tapCiConfigPath
            : constants.tapConfigPath
        }
      }
    )
  } catch {
    // Shallow error here since we're running the bin with stdio: 'inherit' and
    // all stdout and stderr will be logged to the console.
  }
})()
