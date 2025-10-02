/** @fileoverview Clean test cache directories for npm package tests. */

import os from 'node:os'
import path from 'node:path'

import { safeRemove } from './utils/fs.mjs'

/**
 * Remove all test cache directories.
 */
async function cleanTestCache() {
  const dirs = [
    path.join(os.homedir(), '.socket-npm-test-cache'),
    path.join(os.tmpdir(), 'npm-package-tests'),
  ]

  for (const dir of dirs) {
    // eslint-disable-next-line no-await-in-loop
    await safeRemove(dir)
    console.log('Removed:', dir)
  }
}

cleanTestCache().catch(console.error)
