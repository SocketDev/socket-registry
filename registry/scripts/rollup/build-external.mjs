/**
 * @fileoverview Copy external wrapper files to dist.
 * These are simple re-exports that don't need processing.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import fastGlob from 'fast-glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Inline environment checks to avoid circular dependency during build.
const ENV = {
  CI: 'CI' in process.env,
  VERBOSE_BUILD: process.env.VERBOSE_BUILD === 'true',
}
const isDebug = () => !!process.env.DEBUG

const scriptsPath = path.join(__dirname, '..')
const rootPath = path.join(scriptsPath, '..')
const srcPath = path.join(rootPath, 'src')
const srcExternalPath = path.join(srcPath, 'external')
const distPath = path.join(rootPath, 'dist')

void (async () => {
  const filepaths = await fastGlob.glob(['**/*.{js,d.ts}'], {
    absolute: true,
    cwd: srcExternalPath,
  })
  const copiedFiles = []
  await Promise.all(
    filepaths.map(async filepath => {
      const relPath = path.relative(srcPath, filepath)
      const destPath = path.join(distPath, relPath)
      const destDir = path.dirname(destPath)
      // Create directory if it doesn't exist.
      await fs.mkdir(destDir, { recursive: true })
      // Copy file.
      await fs.copyFile(filepath, destPath)
      copiedFiles.push(relPath)
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
      console.log('Copied externals:')
      copiedFiles.forEach(n => console.log(`✅ ${n}`))
    } else if (copiedFiles.length) {
      console.log(`✅ Copied externals (${copiedFiles.length})`)
    }
  }
})()
