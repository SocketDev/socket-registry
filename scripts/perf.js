'use strict'

const { glob: tinyGlob } = require('tinyglobby')

const constants = require('@socketregistry/scripts/constants')
const { perfNpmPath } = constants
const { runBin } = require('@socketregistry/scripts/utils/npm')

;(async () => {
  for (const perfFile of await tinyGlob([`*.perf.ts`], {
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
