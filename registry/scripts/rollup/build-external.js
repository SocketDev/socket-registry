'use strict'

const path = require('node:path')

const { glob } = require('fast-glob')
const { rollup } = require('rollup')

const { ENV } = require('../../lib/constants')
const { isDebug } = require('../../lib/debug')

const scriptsPath = path.join(__dirname, '..')
const rootPath = path.join(scriptsPath, '..')
const configPath = path.join(rootPath, '.config')
const srcPath = path.join(rootPath, 'src')
const srcExternalPath = path.join(srcPath, 'external')

const getConfig = require(path.join(configPath, 'rollup.base.config.js'))

void (async () => {
  const filepaths = await glob(['**/*.js'], {
    absolute: true,
    cwd: srcExternalPath,
  })
  const builtFiles = []
  await Promise.all(
    filepaths.map(async filepath => {
      const relPath = path.relative(srcPath, filepath)
      const bundle = await rollup(getConfig(filepath))
      await bundle.write({
        // Outputs to ./external in root of package.
        file: path.join(rootPath, relPath),
        format: 'cjs',
        sourcemap: false,
        inlineDynamicImports: true,
      })
      builtFiles.push(relPath)
    }),
  )
  // Show output in CI or when explicitly requested, otherwise be quiet during install-related lifecycle events.
  const lifecycleEvent = process.env.npm_lifecycle_event
  const isQuietLifecycle =
    lifecycleEvent &&
    (lifecycleEvent === 'prepare' || lifecycleEvent.includes('install'))
  const shouldShowOutput = ENV.CI || ENV.VERBOSE_BUILD || !isQuietLifecycle
  if (shouldShowOutput) {
    if (isDebug()) {
      builtFiles.forEach(file => console.log(`✅ Built ${file}`))
    } else {
      console.log(`✅ Built externals`)
    }
  }
})()
