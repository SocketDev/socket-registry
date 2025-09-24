'use strict'

import fs from 'node:fs/promises'
import trash from 'trash'
import constants from '../constants.mjs'
import { pEach } from '@socketsecurity/registry/lib/promises'

const { DEFAULT_CONCURRENCY } = constants

/**
 * Safely remove files/directories using trash, with fallback to fs.rm.
 * @param {string|string[]} paths - Path(s) to remove
 * @param {object} options - Options for fs.rm fallback
 * @returns {Promise<void>}
 */
async function safeRemove(paths, options) {
  const pathArray = Array.isArray(paths) ? paths : [paths]
  if (pathArray.length === 0) {
    return
  }

  try {
    await trash(pathArray)
  } catch {
    // If trash fails, fallback to fs.rm.
    const {
      concurrency = DEFAULT_CONCURRENCY,
      spinner,
      ...rmOptions
    } = { __proto__: null, ...options }
    const defaultRmOptions = { force: true, recursive: true, ...rmOptions }

    await pEach(
      pathArray,
      async p => {
        try {
          await fs.rm(p, defaultRmOptions)
        } catch (rmError) {
          // Only warn about non-ENOENT errors if a spinner is provided.
          if (spinner && rmError.code !== 'ENOENT') {
            spinner.warn(`Failed to remove ${p}: ${rmError.message}`)
          }
        }
      },
      { concurrency },
    )
  }
}

export { safeRemove }
