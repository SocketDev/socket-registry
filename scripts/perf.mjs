'use strict'

import fastGlob from 'fast-glob'

import { execBin } from '@socketsecurity/registry/lib/agent'

import constants from './constants.mjs'

const { perfNpmPath } = constants

void (async () => {
  for (const perfFile of await fastGlob.glob([`*.perf.ts`], {
    cwd: perfNpmPath,
  })) {
    // eslint-disable-next-line no-await-in-loop
    await execBin(constants.tsxExecPath, [perfFile], {
      cwd: perfNpmPath,
      stdio: 'inherit',
    })
  }
})()
