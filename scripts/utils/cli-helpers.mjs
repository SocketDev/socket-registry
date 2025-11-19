/**
 * @fileoverview Registry-specific utilities.
 * Common utilities should be imported directly from @socketsecurity/lib.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Get root path - registry-specific utility.
export const getRootPath = importMetaUrl => {
  const __dirname = path.dirname(fileURLToPath(importMetaUrl))
  return path.join(__dirname, '..')
}
