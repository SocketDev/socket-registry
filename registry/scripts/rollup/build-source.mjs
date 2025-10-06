/**
 * @fileoverview Build registry source using Rollup.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { rollup } from 'rollup'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const scriptsPath = path.join(__dirname, '..')
const rootPath = path.join(scriptsPath, '..')
const configPath = path.join(rootPath, '.config')

const ENV = {
  CI: 'CI' in process.env,
  VERBOSE_BUILD: process.env.VERBOSE_BUILD === 'true',
}
const isDebug = () => !!process.env.DEBUG

const getConfig = await import(
  path.join(configPath, 'rollup.dist.config.mjs')
).then(m => m.default)

void (async () => {
  const configs = await getConfig()
  const configArray = Array.isArray(configs) ? configs : [configs]

  for (const config of configArray) {
    // eslint-disable-next-line no-await-in-loop
    const bundle = await rollup(config)

    for (const outputOptions of Array.isArray(config.output)
      ? config.output
      : [config.output]) {
      // eslint-disable-next-line no-await-in-loop
      await bundle.write(outputOptions)
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
      console.log('✅ Built source with Rollup')
    } else {
      console.log('✅ Built source')
    }
  }
})()
