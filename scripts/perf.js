'use strict'

const { glob } = require('fast-glob')

const constants = require('@socketregistry/scripts/constants')
const { execBin } = require('@socketsecurity/registry/lib/agent')

const { perfNpmPath } = constants

void (async () => {
  for (const perfFile of await glob([`*.perf.ts`], {
    cwd: perfNpmPath
  })) {
    // eslint-disable-next-line no-await-in-loop
    await execBin(constants.tsxExecPath, [perfFile], {
      cwd: perfNpmPath,
      stdio: 'inherit'
    })
  }
})()
