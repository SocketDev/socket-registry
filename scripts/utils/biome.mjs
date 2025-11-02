/**
 * @fileoverview Biome formatter utility.
 * Formats content using Biome CLI via pnpm exec.
 */

import { spawnSync } from '@socketsecurity/lib/spawn'

/**
 * Format content using Biome.
 */
export function biomeFormat(content, options = {}) {
  const { filepath = 'file.json' } = options

  // Use stdin mode to avoid path-based exclusions in biome.json.
  const extension = filepath.split('.').pop() || 'json'
  const result = spawnSync(
    'pnpm',
    ['exec', 'biome', 'format', `--stdin-file-path=temp.${extension}`],
    {
      cwd: process.cwd(),
      input: content,
      encoding: 'utf8',
    },
  )
  // If biome format fails, return original content.
  return result.status === 0 ? result.stdout : content
}
