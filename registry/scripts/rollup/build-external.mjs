import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

import fastGlob from 'fast-glob'
import { rollup } from 'rollup'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

// Inline environment checks to avoid circular dependency during build.
const ENV = {
  CI: 'CI' in process.env,
  VERBOSE_BUILD: process.env.VERBOSE_BUILD === 'true',
}
const isDebug = () => !!process.env.DEBUG

const scriptsPath = path.join(__dirname, '..')
const rootPath = path.join(scriptsPath, '..')
const configPath = path.join(rootPath, '.config')
const srcPath = path.join(rootPath, 'src')
const srcExternalPath = path.join(srcPath, 'external')
const distPath = path.join(rootPath, 'dist')

const getConfig = require(path.join(configPath, 'rollup.base.config.js'))

void (async () => {
  const filepaths = await fastGlob.glob(['**/*.js'], {
    absolute: true,
    cwd: srcExternalPath,
  })
  const builtFiles = []
  await Promise.all(
    filepaths.map(async filepath => {
      const relPath = path.relative(srcPath, filepath)
      const bundle = await rollup(getConfig(filepath))
      await bundle.write({
        // Outputs to ./dist/external in root of package.
        file: path.join(distPath, relPath),
        format: 'cjs',
        sourcemap: false,
        inlineDynamicImports: true,
      })
      builtFiles.push(relPath)
    }),
  )
  // Show output in CI or when explicitly requested, otherwise be quiet during
  // install-related lifecycle events.
  const lifecycleEvent = process.env.npm_lifecycle_event
  const isQuietLifecycle =
    lifecycleEvent &&
    (lifecycleEvent === 'prepare' || lifecycleEvent.includes('install'))
  const shouldShowOutput = ENV.CI || ENV.VERBOSE_BUILD || !isQuietLifecycle
  if (shouldShowOutput) {
    if (isDebug()) {
      console.log('Built externals:')
      builtFiles.forEach(n => console.log(`✅ ${n}`))
    } else if (builtFiles.length) {
      console.log(`✅ Built externals (${builtFiles.length})`)
    }
  }
})()
