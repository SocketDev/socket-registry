'use strict'

const { glob } = require('fast-glob')

const constants = require('@socketregistry/scripts/constants')
const { runBin } = require('@socketsecurity/registry/lib/npm')

const { perfNpmPath } = constants

void (async () => {
  for (const perfFile of await glob([`*.perf.ts`], {
    cwd: perfNpmPath
  })) {
    // eslint-disable-next-line no-await-in-loop
    await runBin(
      // Lazily access constants.tsxExecPath.
      constants.tsxExecPath,
      [perfFile],
      {
        cwd: perfNpmPath,
        stdio: 'inherit'
      }
    )
  }
})()
