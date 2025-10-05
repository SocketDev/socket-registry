/**
 * @fileoverview Clean test cache directories for npm package tests.
 *
 * Note: This script cannot use trash from scripts/utils/fs.mjs because
 * it depends on registry dist files which may not exist during clean operations.
 * Uses direct fs.rm instead to avoid circular dependency issues.
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'

/**
 * Prompt user for confirmation before deletion.
 */
async function confirmDeletion() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return await new Promise(resolve => {
    rl.question(
      'WARNING: This will permanently delete test cache directories. Continue? (y/N): ',
      answer => {
        rl.close()
        resolve(answer.toLowerCase() === 'yes')
      },
    )
  })
}

/**
 * Remove all test cache directories.
 */
async function cleanTestCache() {
  // Skip confirmation in CI environments.
  if (process.env.CI !== 'true') {
    const confirmed = await confirmDeletion()
    if (!confirmed) {
      console.log('Cancelled.')
      return
    }
  }

  const dirs = [
    path.join(os.homedir(), '.socket-npm-test-cache'),
    path.join(os.tmpdir(), 'npm-package-tests'),
  ]

  for (const dir of dirs) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await fs.rm(dir, { force: true, recursive: true })
      console.log('Removed:', dir)
    } catch (e) {
      // Silently ignore errors - directory may not exist.
      if (e.code !== 'ENOENT') {
        console.warn(`Failed to remove ${dir}:`, e.message)
      }
    }
  }
}

cleanTestCache().catch(console.error)
