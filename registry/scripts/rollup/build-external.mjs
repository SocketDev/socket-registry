/**
 * @fileoverview Bundle external dependencies using Rollup.
 * Each src/external/<thing>.js re-export is an entry point that gets
 * bundled into a standalone dist/external/<thing>.js file.
 */

import { rollup } from 'rollup'

import getConfig from '../../.config/rollup.external.config.mjs'

const ENV = {
  CI: 'CI' in process.env,
  VERBOSE_BUILD: process.env.VERBOSE_BUILD === 'true',
}
const isDebug = () => !!process.env.DEBUG

void (async () => {
  const configs = await getConfig()
  const configArray = Array.isArray(configs) ? configs : [configs]

  let bundledCount = 0

  for (const config of configArray) {
    // eslint-disable-next-line no-await-in-loop
    const bundle = await rollup(config)

    for (const outputOptions of Array.isArray(config.output)
      ? config.output
      : [config.output]) {
      // eslint-disable-next-line no-await-in-loop
      await bundle.write(outputOptions)
      bundledCount += 1
    }

    // eslint-disable-next-line no-await-in-loop
    await bundle.close()
  }

  const lifecycleEvent = process.env.npm_lifecycle_event
  const isQuietLifecycle =
    lifecycleEvent &&
    (lifecycleEvent === 'prepare' || lifecycleEvent.includes('install'))
  const shouldShowOutput = ENV.CI || ENV.VERBOSE_BUILD || !isQuietLifecycle

  if (shouldShowOutput) {
    if (isDebug()) {
      console.log(
        `✅ Bundled ${bundledCount} external dependencies with Rollup`,
      )
    } else {
      console.log(`✅ Bundled external dependencies (${bundledCount})`)
    }
  }
})()
