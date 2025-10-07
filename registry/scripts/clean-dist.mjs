/**
 * @fileoverview Clean dist directory before build.
 * Ensures complete removal of dist directory on all platforms.
 */

import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const REGISTRY_ROOT = resolve(__dirname, '..')
const DIST_DIR = resolve(REGISTRY_ROOT, 'dist')

async function cleanDist() {
  try {
    if (existsSync(DIST_DIR)) {
      console.log('Cleaning dist directory...')
      await rm(DIST_DIR, {
        force: true,
        maxRetries: 3,
        recursive: true,
        retryDelay: 100,
      })
      console.log('✅ Dist directory cleaned')
    }
  } catch (e) {
    console.error('Failed to clean dist directory:', e.message)
    process.exitCode = 1
  }
}

cleanDist().catch(e => {
  console.error(e)
  process.exitCode = 1
})
