/**
 * @fileoverview Biome formatter utility.
 * Formats content using Biome CLI via pnpm exec.
 */

import { execSync } from 'node:child_process'

/**
 * Format content using Biome.
 */
export function biomeFormat(content, options = {}) {
  const { filepath = 'file.json' } = options

  // Use stdin mode to avoid path-based exclusions in biome.json.
  const extension = filepath.split('.').pop() || 'json'
  try {
    const result = execSync(
      `pnpm exec biome format --stdin-file-path="temp.${extension}"`,
      {
        cwd: process.cwd(),
        input: content,
        encoding: 'utf8',
      },
    )
    return result
  } catch {
    // If biome format fails, return original content.
    return content
  }
}
