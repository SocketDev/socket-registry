/**
 * @fileoverview Biome formatter utility.
 * Formats content using Biome CLI via pnpm exec.
 */

import path from 'node:path'
import process from 'node:process'

import { spawnSync } from '@socketsecurity/lib-stable/spawn'

interface BiomeFormatOptions {
  filepath?: string | undefined
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
  // path.extname handles dotted directory names correctly (e.g. 'dir.with.dots/file'
  // returns '' rather than mis-interpreting the directory dot as an extension).
  const ext = path.extname(filepath)
  const extension = ext ? ext.slice(1) : 'json'
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
