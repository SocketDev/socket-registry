/**
 * @fileoverview Biome formatter utility.
 * Formats content using Biome CLI via pnpm exec.
 */

import process from 'node:process'

import { spawnSync } from '@socketsecurity/lib/spawn'

interface BiomeFormatOptions {
  filepath?: string
}

/**
 * Format content using Biome.
 */
export function biomeFormat(
  content: string,
  options: BiomeFormatOptions = {},
): string {
  const { filepath = 'file.json' } = {
    __proto__: null,
    ...options,
  } as BiomeFormatOptions

  // Use stdin mode to avoid path-based exclusions in biome.json.
  // Guard against filenames without an extension (split('.').pop() returns
  // the whole basename in that case).
  const dotIdx = filepath.lastIndexOf('.')
  const extension = dotIdx === -1 ? 'json' : filepath.slice(dotIdx + 1)
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
