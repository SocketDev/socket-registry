/**
 * @fileoverview Ensures dist directory and external dependencies are built.
 * Used by other scripts to auto-build when needed.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..', '..')
const distPath = path.join(rootPath, 'registry', 'dist')
const externalPath = path.join(
  distPath,
  'external',
  '@socketregistry',
  'yocto-spinner.js',
)

/**
 * Check if the dist directory and external dependencies exist.
 * @returns {boolean} True if everything exists
 */
export function isDistBuilt() {
  // Check if a key external dependency exists as a proxy for all externals
  return existsSync(externalPath)
}

/**
 * Run a minimal build if needed - fast and quiet.
 * @param {object} options - Options
 * @param {boolean} options.silent - Completely suppress output
 * @returns {Promise<number>} Exit code
 */
export async function ensureDistBuilt(options = {}) {
  const { silent = false } = options

  if (isDistBuilt()) {
    return 0
  }

  return new Promise((resolve, reject) => {
    // Use build --fast --needed for quick builds
    const child = spawn('pnpm', ['build', '--fast', '--needed'], {
      stdio: silent ? 'pipe' : 'inherit',
      cwd: rootPath,
    })

    child.on('exit', code => {
      resolve(code || 0)
    })

    child.on('error', error => {
      reject(error)
    })
  })
}
